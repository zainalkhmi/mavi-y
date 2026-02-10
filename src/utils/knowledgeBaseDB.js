// Knowledge Base Database Utilities
// Uses SQLite for professional desktop offline storage

import { getSqliteDb } from './sqlite.js';

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

    return { id: kbId };
};

export const getAllKnowledgeBaseItems = async () => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM knowledge_base ORDER BY createdAt DESC');
    return rows.map(item => {
        if (item.content && typeof item.content === 'string' && (item.content.startsWith('[') || item.content.startsWith('{'))) {
            try {
                return { ...item, content: JSON.parse(item.content) };
            } catch (e) {
                return item;
            }
        }
        return item;
    });
};

export const getKnowledgeBaseItem = async (id) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM knowledge_base WHERE id = ?', [id]);
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

export const updateKnowledgeBaseItem = async (id, updates) => {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    const existing = await getKnowledgeBaseItem(id);
    if (!existing) throw new Error(`Item with id ${id} not found`);

    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
        if (key === 'id') continue;
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

    return id;
};

export const deleteKnowledgeBaseItem = async (id) => {
    const db = await getSqliteDb();
    // Foreign key with ON DELETE CASCADE handles tags and ratings
    await db.execute('DELETE FROM knowledge_base WHERE id = ?', [id]);
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
    return rows.map(item => {
        if (item.content && typeof item.content === 'string' && (item.content.startsWith('[') || item.content.startsWith('{'))) {
            try {
                return { ...item, content: JSON.parse(item.content) };
            } catch (e) {
                return item;
            }
        }
        return item;
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
