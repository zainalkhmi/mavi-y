/**
 * tursoClient.js — STUB (DEPRECATED)
 * ====================================
 * This file is kept as a compatibility shim. Turso has been replaced by Supabase
 * for Manual Creation storage. Other features (licenses, YouTube, etc) that reference
 * this file will be migrated in a future update.
 *
 * For new Manual Creation storage, use supabaseManualDB.js instead.
 */

export const isTursoConfigured = () => false;

export const getTursoClient = async () => {
    console.warn('[tursoClient] Turso has been replaced by Supabase. This stub returns a no-op mock.');
    return createMockClient();
};

export const getTursoStatus = async () => ({
    configured: false,
    connected: false,
    mode: 'Supabase (migrated)',
    message: 'Turso has been replaced by Supabase.'
});

export const saveTursoCredentials = () => {
    console.warn('[tursoClient] Turso credentials are no longer used. Configure Supabase in App Settings.');
};

export const clearTursoCredentials = () => { };

export const initTursoClient = async () => {
    console.info('[tursoClient] Stub: Turso replaced by Supabase. No initialization needed.');
    return createMockClient();
};

export const getDefaultCredentials = () => ({ url: '', token: '' });

function createMockClient() {
    const noop = async () => ({ rows: [], rowsAffected: 0, lastInsertRowid: 0 });
    return {
        isMock: true,
        execute: noop,
        batch: async () => [],
        close: () => { }
    };
}

export default {
    initTursoClient,
    getTursoClient,
    isTursoConfigured,
    getTursoStatus,
    saveTursoCredentials,
    clearTursoCredentials,
    getDefaultCredentials
};
