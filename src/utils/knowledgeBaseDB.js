/**
 * knowledgeBaseDB.js — STUB (DEPRECATED)
 * ==========================================
 * This file is kept as a compatibility shim.
 * Knowledge Base storage has been replaced by Supabase.
 *
 * Components still importing from here (KnowledgeBase.jsx, FileExplorer.jsx,
 * TemplateUpload.jsx, PublicManualViewer.jsx, etc.) return empty/no-op results
 * so they do not crash. Those components should be migrated in future updates.
 *
 * For Manual Creation storage, use supabaseManualDB.js.
 */
import { getSupabaseClient, isSupabaseReady, listManuals, getManualById, upsertManual, deleteManual } from './supabaseManualDB.js';

// ── Fallback localStorage key (kept for backwards compat) ───────────
const KB_FALLBACK_KEY = 'mavi_kb_fallback_v1';

const readFallbackItems = () => {
    try {
        const raw = window.localStorage.getItem(KB_FALLBACK_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
};

// ── CRUD operations (now delegated to Supabase) ─────────────────────

export const addKnowledgeBaseItem = async (item) => {
    if (isSupabaseReady()) {
        try {
            return await upsertManual(item);
        } catch (e) {
            console.error('[knowledgeBaseDB] addKnowledgeBaseItem failed:', e);
        }
    }
    console.warn('[knowledgeBaseDB] Supabase not ready, using local fallback.');
    const items = readFallbackItems();
    const newItem = { ...item, id: `local_${Date.now()}` };
    items.push(newItem);
    window.localStorage.setItem(KB_FALLBACK_KEY, JSON.stringify(items));
    return newItem;
};

export const getAllKnowledgeBaseItems = async () => {
    if (isSupabaseReady()) {
        try {
            // Delegate to Supabase manuals table
            return await listManuals();
        } catch (e) {
            console.warn('[knowledgeBaseDB] Supabase list failed, using localStorage fallback:', e);
        }
    }
    return readFallbackItems();
};

export const getKnowledgeBaseItem = async (id) => {
    if (isSupabaseReady()) {
        try {
            return await getManualById(id);
        } catch (e) {
            console.warn('[knowledgeBaseDB] Supabase getById failed:', e);
        }
    }
    return readFallbackItems().find(i => String(i.id) === String(id)) || null;
};

export const updateKnowledgeBaseItem = async (id, item) => {
    if (isSupabaseReady()) {
        try {
            return await upsertManual({ ...item, id });
        } catch (e) {
            console.error('[knowledgeBaseDB] updateKnowledgeBaseItem failed:', e);
        }
    }
    const items = readFallbackItems();
    const idx = items.findIndex(i => String(i.id) === String(id));
    if (idx !== -1) {
        items[idx] = { ...items[idx], ...item };
        window.localStorage.setItem(KB_FALLBACK_KEY, JSON.stringify(items));
    }
    return null;
};

export const deleteKnowledgeBaseItem = async (id) => {
    if (isSupabaseReady()) {
        try {
            return await deleteManual(id);
        } catch (e) {
            console.error('[knowledgeBaseDB] deleteKnowledgeBaseItem failed:', e);
        }
    }
    const items = readFallbackItems();
    const filtered = items.filter(i => String(i.id) !== String(id));
    window.localStorage.setItem(KB_FALLBACK_KEY, JSON.stringify(filtered));
    return true;
};

// ── Tags ────────────────────────────────────────────────────────────
export const addTagsToItem = async () => { };
export const getTagsForItem = async () => [];
export const getAllTags = async () => [];

// ── Ratings ─────────────────────────────────────────────────────────
export const addRating = async () => null;
export const getRatingsForItem = async () => [];

// ── View/usage counts ────────────────────────────────────────────────
export const incrementViewCount = async () => { };
export const incrementUsageCount = async () => { };

// ── Compat mocks ────────────────────────────────────────────────────
export const getItemFromCloud = async () => null;
export const getItemByCloudId = async (cloudId) => {
    return getKnowledgeBaseItem(cloudId);
};

// ── Search ──────────────────────────────────────────────────────────
export const searchKnowledgeBase = async (query) => {
    const all = await getAllKnowledgeBaseItems();
    if (!query) return all;
    const q = query.toLowerCase();
    return all.filter(i =>
        String(i.title || '').toLowerCase().includes(q) ||
        String(i.description || '').toLowerCase().includes(q)
    );
};

export const sortKnowledgeBase = (items, sortBy) => {
    if (!Array.isArray(items)) return [];
    if (sortBy === 'title') return [...items].sort((a, b) => String(a.title).localeCompare(String(b.title)));
    return [...items].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
};
