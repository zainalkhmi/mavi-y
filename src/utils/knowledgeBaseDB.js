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
import { getSupabaseClient, isSupabaseReady, listManuals, getManualById } from './supabaseManualDB.js';

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
    console.warn('[knowledgeBaseDB] Use supabaseManualDB.upsertManual instead.');
    return { id: null, source: 'stub' };
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

export const updateKnowledgeBaseItem = async () => null;
export const deleteKnowledgeBaseItem = async () => null;

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
