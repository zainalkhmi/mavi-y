// Knowledge Base Database Utilities
// Uses SQLite for professional desktop offline storage

import { getSqliteDb } from './sqlite.js';

const KB_FALLBACK_KEY = 'mavi_kb_fallback_v1';

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readFallbackItems = () => {
    if (!isBrowser()) return [];
    try {
        const raw = window.localStorage.getItem(KB_FALLBACK_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeFallbackItems = (items) => {
    if (!isBrowser()) return;
    try {
        window.localStorage.setItem(KB_FALLBACK_KEY, JSON.stringify(items));
    } catch {
        // ignore storage quota / serialization errors
    }
};

const upsertFallbackItem = (item) => {
    const items = readFallbackItems();
    const idx = items.findIndex(i => Number(i.id) === Number(item.id));
    if (idx >= 0) items[idx] = { ...items[idx], ...item };
    else items.push(item);
    writeFallbackItems(items);
};

const removeFallbackItem = (id) => {
    const items = readFallbackItems().filter(i => Number(i.id) !== Number(id));
    writeFallbackItems(items);
};

const parseContentIfNeeded = (item) => {
    if (item?.content && typeof item.content === 'string' && (item.content.startsWith('[') || item.content.startsWith('{'))) {
        try {
            return { ...item, content: JSON.parse(item.content) };
        } catch {
            return item;
        }
    }
    return item;
};

// CRUD Operations for Knowledge Base Items

export const addKnowledgeBaseItem = async (item) => {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    const result = await db.execute(
        `INSERT INTO knowledge_base 
        (title, description, content, type, category, industry, cloudId, createdAt, updatedAt, syncStatus) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            item.title,
            item.description,
            typeof item.content === 'object' ? JSON.stringify(item.content) : item.content,
            item.type,
            item.category,
            item.industry,
            item.cloudId,
            now,
            now,
            'local'
        ]
    );

    const kbId = result.lastInsertId;

    // Handle tags if present
    if (item.tags && item.tags.length > 0) {
        await addTagsToItem(kbId, item.tags);
    }

    // Browser fallback persistence for environments that can run in transient WASM mode
    upsertFallbackItem({
        id: kbId,
        title: item.title,
        description: item.description,
        content: item.content,
        type: item.type,
        category: item.category,
        industry: item.industry,
        cloudId: item.cloudId,
        createdAt: now,
        updatedAt: now,
        syncStatus: 'local'
    });

    return { id: kbId };
};

export const getAllKnowledgeBaseItems = async () => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM knowledge_base ORDER BY createdAt DESC');
    if (!rows || rows.length === 0) {
        return readFallbackItems()
            .map(parseContentIfNeeded)
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
    return rows.map(item => {
        const parsed = parseContentIfNeeded(item);
        // Keep fallback up to date when real DB has data
        upsertFallbackItem(parsed);
        return parsed;
    });
};

export const getKnowledgeBaseItem = async (id) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM knowledge_base WHERE id = ?', [id]);
    const item = rows[0] || null;
    if (item) {
        const parsed = parseContentIfNeeded(item);
        upsertFallbackItem(parsed);
        return parsed;
    }
    const fallback = readFallbackItems().find(i => Number(i.id) === Number(id)) || null;
    return parseContentIfNeeded(fallback);
};

export const updateKnowledgeBaseItem = async (id, updates) => {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    const existing = await getKnowledgeBaseItem(id);
    if (!existing) throw new Error(`Item with id ${id} not found`);

    const fields = [];
    const values = [];

    const ALLOWED_COLUMNS = new Set([
        'title',
        'description',
        'content',
        'type',
        'category',
        'industry',
        'cloudId',
        'createdAt',
        'updatedAt',
        'syncStatus',
        'viewCount',
        'usageCount',
        'averageRating',
        'ratingCount'
    ]);

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'id') continue;
        if (!ALLOWED_COLUMNS.has(key)) continue;
        fields.push(`${key} = ?`);
        values.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
    }

    fields.push(`updatedAt = ?`);
    values.push(now);

    values.push(id);

    await db.execute(
        `UPDATE knowledge_base SET ${fields.join(', ')} WHERE id = ?`,
        values
    );

    const mergedForFallback = {
        ...(existing || {}),
        ...updates,
        id,
        updatedAt: now
    };
    upsertFallbackItem(mergedForFallback);

    return id;
};

export const deleteKnowledgeBaseItem = async (id) => {
    const db = await getSqliteDb();
    // Foreign key with ON DELETE CASCADE handles tags and ratings
    await db.execute('DELETE FROM knowledge_base WHERE id = ?', [id]);
    removeFallbackItem(id);
};

// Tags Operations

export const addTagsToItem = async (kbId, tags) => {
    const db = await getSqliteDb();
    for (const tag of tags) {
        await db.execute(
            'INSERT INTO kb_tags (kbId, tag) VALUES (?, ?)',
            [kbId, tag.toLowerCase()]
        );
    }
};

export const getTagsForItem = async (kbId) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT tag FROM kb_tags WHERE kbId = ?', [kbId]);
    return rows.map(r => r.tag);
};

export const getAllTags = async () => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT DISTINCT tag FROM kb_tags ORDER BY tag ASC');
    return rows.map(r => r.tag);
};

// Ratings Operations

export const addRating = async (kbId, rating, feedback = '') => {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    await db.execute(
        'INSERT INTO kb_ratings (kbId, rating, feedback, createdAt) VALUES (?, ?, ?, ?)',
        [kbId, rating, feedback, now]
    );

    // Update average rating and count in the main table
    const ratings = await getRatingsForItem(kbId);
    const count = ratings.length;
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / count;

    await db.execute(
        'UPDATE knowledge_base SET averageRating = ?, ratingCount = ? WHERE id = ?',
        [avg, count, kbId]
    );
};

export const getRatingsForItem = async (kbId) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM kb_ratings WHERE kbId = ?', [kbId]);
    return rows;
};

// Increment view/usage count

export const incrementViewCount = async (id) => {
    const db = await getSqliteDb();
    await db.execute('UPDATE knowledge_base SET viewCount = viewCount + 1 WHERE id = ?', [id]);
};

export const incrementUsageCount = async (id) => {
    const db = await getSqliteDb();
    await db.execute('UPDATE knowledge_base SET usageCount = usageCount + 1 WHERE id = ?', [id]);
};

// Compatibility mocks

export const getItemFromCloud = async () => null;
export const getItemByCloudId = async (cloudId) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM knowledge_base WHERE cloudId = ?', [cloudId]);
    const item = rows[0] || null;
    if (item && item.content && typeof item.content === 'string' && (item.content.startsWith('[') || item.content.startsWith('{'))) {
        try {
            return { ...item, content: JSON.parse(item.content) };
        } catch (e) {
            return item;
        }
    }
    return item;
};

// Search and Filter

export const searchKnowledgeBase = async (query, filters = {}) => {
    const db = await getSqliteDb();
    let sql = 'SELECT * FROM knowledge_base WHERE 1=1';
    const params = [];

    if (query) {
        sql += ' AND (title LIKE ? OR description LIKE ?)';
        params.push(`%${query}%`, `%${query}%`);
    }

    if (filters.type) {
        sql += ' AND type = ?';
        params.push(filters.type);
    }

    if (filters.category) {
        sql += ' AND category = ?';
        params.push(filters.category);
    }

    if (filters.industry) {
        sql += ' AND industry = ?';
        params.push(filters.industry);
    }

    const rows = await db.select(sql, params);
    if (!rows || rows.length === 0) {
        const fallback = readFallbackItems().map(parseContentIfNeeded);
        return fallback.filter(item => {
            if (query) {
                const q = String(query).toLowerCase();
                const inTitle = String(item.title || '').toLowerCase().includes(q);
                const inDesc = String(item.description || '').toLowerCase().includes(q);
                if (!inTitle && !inDesc) return false;
            }
            if (filters.type && item.type !== filters.type) return false;
            if (filters.category && item.category !== filters.category) return false;
            if (filters.industry && item.industry !== filters.industry) return false;
            return true;
        });
    }
    return rows.map(item => {
        const parsed = parseContentIfNeeded(item);
        upsertFallbackItem(parsed);
        return parsed;
    });
};

// Sort functions (in memory for complex logic, or SQL for simple ones)
export const sortKnowledgeBase = (items, sortBy) => {
    const sorted = [...items];
    switch (sortBy) {
        case 'mostUsed':
            return sorted.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        case 'highestRated':
            return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
        case 'newest':
            return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'title':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return sorted;
    }
};
