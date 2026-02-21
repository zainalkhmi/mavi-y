// Turso Database Client
// Provides connection and schema initialization for Turso (LibSQL) database

import { createClient } from '@libsql/client';

let tursoClient = null;
let isInitialized = false;
let hasLoggedCredentialSource = false;
let initializationPromise = null;

// Database schema queries
const SCHEMA_QUERIES = [
    // Licenses table
    `CREATE TABLE IF NOT EXISTS licenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_string TEXT UNIQUE NOT NULL,
    email TEXT,
    machine_id TEXT,
    bound_machine_id TEXT,
    bound_ip TEXT,
    bound_country TEXT,
    bound_at TEXT,
    last_seen_at TEXT,
    last_seen_ip TEXT,
    last_seen_country TEXT,
    violation_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

    // YouTube links table
    `CREATE TABLE IF NOT EXISTS youtube_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    category TEXT,
    lesson_id TEXT,
    module_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

    // Public SOP manuals table (for QR cross-device access)
    `CREATE TABLE IF NOT EXISTS manuals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cloud_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    version TEXT DEFAULT '1.0',
    status TEXT DEFAULT 'Draft',
    author TEXT,
    document_number TEXT,
    content_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,

    // Create indexes for better performance
    `CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email)`,
    `CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status)`,
    `CREATE INDEX IF NOT EXISTS idx_licenses_bound_machine_id ON licenses(bound_machine_id)`,
    `CREATE INDEX IF NOT EXISTS idx_licenses_bound_ip ON licenses(bound_ip)`,
    `CREATE INDEX IF NOT EXISTS idx_youtube_category ON youtube_links(category)`,
    `CREATE INDEX IF NOT EXISTS idx_youtube_module ON youtube_links(module_id)`,
    `CREATE INDEX IF NOT EXISTS idx_manuals_cloud_id ON manuals(cloud_id)`,
    `CREATE INDEX IF NOT EXISTS idx_manuals_updated_at ON manuals(updated_at DESC)`,

    `CREATE TABLE IF NOT EXISTS license_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    machine_id TEXT,
    user_id TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
    `CREATE INDEX IF NOT EXISTS idx_requests_email ON license_requests(email)`,
    `CREATE INDEX IF NOT EXISTS idx_requests_status ON license_requests(status)`,

    // Cloud installers table (Renamed to avoid conflict with local schema)
    `CREATE TABLE IF NOT EXISTS cloud_installers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    file_blob BLOB,
    version TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    size INTEGER NOT NULL
  )`,

    // Menu visibility control table
    `CREATE TABLE IF NOT EXISTS menu_visibility (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_path TEXT UNIQUE NOT NULL,
    is_visible INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT,
    updated_at TEXT NOT NULL
  )`,
    `CREATE INDEX IF NOT EXISTS idx_menu_visibility_path ON menu_visibility(menu_path)`
];

/**
 * Get default credentials from environment variables
 */
export const getDefaultCredentials = () => {
    // Current .env values as hardcoded defaults for "Auto-Connect"
    const DEFAULT_URL = 'libsql://mavi-mikadata.aws-ap-northeast-1.turso.io';
    const DEFAULT_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NjkyNzA0ODMsImlkIjoiYWY0MDZjODMtYjJmNC00NDdmLTk0MzYtMzZjMzMyMGVkOTYyIiwicmlkIjoiMTAyYjM2NzAtNzU3Zi00Y2E4LThlOWMtM2YzYzE2ZDA4YmE4In0.A7cHdYvSo5rtnk0SyeXszXwOqBULdY_3LWQjUTmRfmw7uE1yjOD2IlEoqSL8lHAEJCvG7x9e145-EpdRNQB7CA';

    const dbUrl = import.meta.env.VITE_TURSO_DATABASE_URL || DEFAULT_URL;
    const authToken = import.meta.env.VITE_TURSO_AUTH_TOKEN || DEFAULT_TOKEN;

    // Avoid repeating the same info log on every caller invocation
    if (!hasLoggedCredentialSource) {
        if (dbUrl === DEFAULT_URL) {
            console.log('💡 Using built-in default Turso credentials.');
        } else {
            console.log('💡 Using environment-provided Turso credentials.');
        }
        hasLoggedCredentialSource = true;
    }

    return { dbUrl, authToken };
};

/**
 * Get credentials from Storage or Env
 */
const getCredentials = () => {
    // Check localStorage first (user override)
    const storedUrl = localStorage.getItem('turso_db_url');
    const storedToken = localStorage.getItem('turso_auth_token');

    if (storedUrl && storedToken) {
        return { dbUrl: storedUrl, authToken: storedToken, source: 'localStorage' };
    }

    // Fallback to Env
    const defaults = getDefaultCredentials();
    return {
        dbUrl: defaults.dbUrl,
        authToken: defaults.authToken,
        source: 'env'
    };
};

/**
 * Save credentials to localStorage
 */
export const saveTursoCredentials = (url, token) => {
    if (!url || !token) return;
    localStorage.setItem('turso_db_url', url);
    localStorage.setItem('turso_auth_token', token);

    // Force re-init on next call
    tursoClient = null;
    isInitialized = false;
    hasLoggedCredentialSource = false;
    initializationPromise = null;
};

/**
 * Clear credentials from localStorage
 */
export const clearTursoCredentials = () => {
    localStorage.removeItem('turso_db_url');
    localStorage.removeItem('turso_auth_token');

    // Force re-init on next call
    tursoClient = null;
    isInitialized = false;
    hasLoggedCredentialSource = false;
    initializationPromise = null;
};

/**
 * Initialize Turso client connection with retry logic
 * @returns {Promise<Object>} Turso client instance
 */
export const initTursoClient = async (retries = 3, backoff = 1000) => {
    if (tursoClient && isInitialized) {
        return tursoClient;
    }

    // Prevent duplicate initialization from concurrent callers.
    // All callers await the same in-flight promise.
    if (initializationPromise) {
        return initializationPromise;
    }

    initializationPromise = (async () => {
        let lastError = null;
        const { dbUrl, authToken } = getCredentials();

        if (!dbUrl || !authToken) {
            console.warn('Turso credentials not found');
            return createMockClient();
        }

        let currentBackoff = backoff;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                // Create Turso client (if not already created OR if previous attempt failed)
                // Note: createClient itself is synchronous, it's the .execute that fails
                if (!tursoClient) {
                    tursoClient = createClient({
                        url: dbUrl,
                        authToken: authToken,
                    });
                }

                // Test connection
                await tursoClient.execute('SELECT 1');
                console.log(`✅ Turso database connected successfully (attempt ${attempt + 1})`);

                // Initialize schema
                await initializeSchema();
                isInitialized = true;

                return tursoClient;
            } catch (error) {
                lastError = error;
                const isNetworkError = error.message?.includes('Failed to fetch') ||
                    error.message?.includes('network changed') ||
                    error.code === 'ERR_NETWORK_CHANGED';

                if (isNetworkError && attempt < retries) {
                    console.warn(`⚠️ Turso connection attempt ${attempt + 1} failed (Network Error). Retrying in ${currentBackoff}ms...`);
                    await new Promise(res => setTimeout(res, currentBackoff));
                    currentBackoff *= 2; // Exponential backoff
                    continue;
                }

                console.error(`❌ Turso initialization failed after ${attempt + 1} attempts:`, error);
                break; // Non-network error or out of retries
            }
        }

        // Return mock client as fallback if all retries fail
        return createMockClient();
    })().finally(() => {
        initializationPromise = null;
    });

    return initializationPromise;
};

/**
 * Initialize database schema
 */
const initializeSchema = async () => {
    if (!tursoClient) {
        throw new Error('Turso client not initialized');
    }

    try {
        console.log('Initializing Turso database schema...');

        for (const query of SCHEMA_QUERIES) {
            await tursoClient.execute(query);
        }

        // --- MIGRATIONS ---
        // Handle cases where tables were created in older versions without newer columns
        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN bound_machine_id TEXT');
            console.log('✅ Migration: Added bound_machine_id to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.bound_machine_id):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN bound_ip TEXT');
            console.log('✅ Migration: Added bound_ip to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.bound_ip):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN bound_country TEXT');
            console.log('✅ Migration: Added bound_country to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.bound_country):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN bound_at TEXT');
            console.log('✅ Migration: Added bound_at to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.bound_at):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN last_seen_at TEXT');
            console.log('✅ Migration: Added last_seen_at to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.last_seen_at):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN last_seen_ip TEXT');
            console.log('✅ Migration: Added last_seen_ip to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.last_seen_ip):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN last_seen_country TEXT');
            console.log('✅ Migration: Added last_seen_country to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.last_seen_country):', e.message);
            }
        }

        try {
            await tursoClient.execute('ALTER TABLE licenses ADD COLUMN violation_count INTEGER NOT NULL DEFAULT 0');
            console.log('✅ Migration: Added violation_count to licenses');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (licenses.violation_count):', e.message);
            }
        }

        try {
            // Add uploaded_at to cloud_installers if missing
            await tursoClient.execute('ALTER TABLE cloud_installers ADD COLUMN uploaded_at TEXT NOT NULL DEFAULT ""');
            console.log('✅ Migration: Added uploaded_at to cloud_installers');
        } catch (e) {
            // Ignore if column already exists
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (cloud_installers.uploaded_at):', e.message);
            }
        }

        try {
            // Add size to cloud_installers if missing
            await tursoClient.execute('ALTER TABLE cloud_installers ADD COLUMN size INTEGER NOT NULL DEFAULT 0');
            console.log('✅ Migration: Added size to cloud_installers');
        } catch (e) {
            if (!e.message.includes('duplicate column name')) {
                console.warn('⚠️ Migration notice (cloud_installers.size):', e.message);
            }
        }

        console.log('✅ Database schema initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize schema:', error);
        throw error;
    }
};

/**
 * Create mock client for development/fallback
 */
const createMockClient = () => {
    console.warn('⚠️ Using mock Turso client (data will not persist)');

    return {
        execute: async (query, params = []) => {
            const sql = typeof query === 'string' ? query : query.sql;
            console.log('Mock execute:', sql, params);

            // If it's a write operation, we should ideally know it didn't persist
            const isWrite = /INSERT|UPDATE|DELETE|CREATE/i.test(sql);
            if (isWrite) {
                console.warn('⚠️ Mock client: Write operation skipped.');
                // For now we still return success structure but with a flag
                return { rows: [], rowsAffected: 0, _mock: true };
            }

            return { rows: [], rowsAffected: 0, _mock: true };
        },
        batch: async (queries) => {
            console.log('Mock batch:', queries);
            return queries.map(() => ({ rows: [], rowsAffected: 0, _mock: true }));
        },
        close: async () => {
            console.log('Mock client closed');
        },
        isMock: true
    };
};

/**
 * Get Turso client instance
 * @returns {Promise<Object>} Turso client
 */
export const getTursoClient = async () => {
    if (!tursoClient) {
        return await initTursoClient();
    }
    return tursoClient;
};

/**
 * Check if Turso is properly configured
 * @returns {boolean}
 */
export const isTursoConfigured = () => {
    const { dbUrl, authToken } = getCredentials();
    return !!(dbUrl && authToken && dbUrl !== 'libsql://your-database-name.turso.io');
};

/**
 * Get connection status
 * @returns {Promise<Object>}
 */
export const getTursoStatus = async () => {
    try {
        const client = await getTursoClient();
        const { source } = getCredentials();
        const configured = isTursoConfigured();

        if (client.isMock) {
            return {
                connected: false,
                configured: configured,
                mode: configured ? 'Offline Fallback' : 'Mock (Development)',
                message: configured ? 'Failed to connect to Turso cloud' : 'Turso credentials not configured',
                source: source
            };
        }

        // Test connection
        await client.execute('SELECT 1');

        return {
            connected: true,
            configured: true,
            mode: 'Turso Cloud',
            message: 'Connected to Turso database',
            source: source
        };
    } catch (error) {
        return {
            connected: false,
            configured: isTursoConfigured(),
            mode: 'Error',
            message: error.message
        };
    }
};

export default {
    initTursoClient,
    getTursoClient,
    isTursoConfigured,
    getTursoStatus,
    saveTursoCredentials,
    clearTursoCredentials,
    getDefaultCredentials
};
