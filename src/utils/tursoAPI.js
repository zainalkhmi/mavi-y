// Turso Database API
// CRUD operations for licenses and YouTube links

import { getTursoClient } from './tursoClient.js';

const safeString = (value, fallback = '') => {
    if (value === null || value === undefined) return fallback;
    return String(value).trim();
};

const isMissingBindingColumnError = (error) => {
    const message = String(error?.message || error || '').toLowerCase();
    return (
        message.includes('no such column') && (
            message.includes('bound_machine_id') ||
            message.includes('bound_ip') ||
            message.includes('bound_country') ||
            message.includes('bound_at') ||
            message.includes('last_seen_at') ||
            message.includes('last_seen_ip') ||
            message.includes('last_seen_country') ||
            message.includes('violation_count')
        )
    );
};

let licenseBindingColumnsEnsured = false;

const LICENSE_BINDING_MIGRATIONS = [
    'ALTER TABLE licenses ADD COLUMN bound_machine_id TEXT',
    'ALTER TABLE licenses ADD COLUMN bound_ip TEXT',
    'ALTER TABLE licenses ADD COLUMN bound_country TEXT',
    'ALTER TABLE licenses ADD COLUMN bound_at TEXT',
    'ALTER TABLE licenses ADD COLUMN last_seen_at TEXT',
    'ALTER TABLE licenses ADD COLUMN last_seen_ip TEXT',
    'ALTER TABLE licenses ADD COLUMN last_seen_country TEXT',
    'ALTER TABLE licenses ADD COLUMN violation_count INTEGER NOT NULL DEFAULT 0'
];

const ensureLicenseBindingColumns = async (client) => {
    if (licenseBindingColumnsEnsured) return;

    for (const migration of LICENSE_BINDING_MIGRATIONS) {
        try {
            await client.execute(migration);
        } catch (error) {
            const message = String(error?.message || error || '');
            if (!message.includes('duplicate column name')) {
                console.warn('⚠️ License binding migration notice:', message);
            }
        }
    }

    licenseBindingColumnsEnsured = true;
};

const validateAndBindLicenseLegacy = async (client, keyString, context = {}) => {
    const now = new Date().toISOString();
    const machineId = safeString(context.machineId, 'unknown');

    const result = await client.execute({
        sql: 'SELECT * FROM licenses WHERE key_string = ? LIMIT 1',
        args: [keyString]
    });

    const license = result.rows?.[0];

    if (!license) {
        return { ok: false, status: 'not_found', message: 'License key not found' };
    }

    if (license.status !== 'active') {
        return { ok: false, status: 'inactive', message: 'License is not active', license };
    }

    const existingMachine = safeString(license.machine_id);
    const hasMachineBind = !!existingMachine;

    // Old schema fallback: use machine_id as single binding source.
    if (!hasMachineBind && machineId !== 'unknown') {
        await client.execute({
            sql: `UPDATE licenses
                  SET machine_id = ?,
                      updated_at = ?
                  WHERE id = ?`,
            args: [machineId, now, license.id]
        });

        const updated = await getLicenseById(license.id);
        return {
            ok: true,
            status: 'bound_first_device',
            message: 'License bound to first device successfully (legacy schema)',
            license: updated || license
        };
    }

    const machineMismatch = hasMachineBind && machineId !== 'unknown' && existingMachine !== machineId;

    if (machineMismatch) {
        return {
            ok: false,
            status: 'blocked_new_device',
            message: 'License already bound to another active device/session',
            license
        };
    }

    await client.execute({
        sql: `UPDATE licenses
              SET updated_at = ?
              WHERE id = ?`,
        args: [now, license.id]
    });

    const updated = await getLicenseById(license.id);
    return {
        ok: true,
        status: 'active_bound_device',
        message: 'License validated on bound device (legacy schema)',
        license: updated || license
    };
};

const NETWORK_CONTEXT_CACHE_KEY = 'mavi_network_context_cache_v1';
const NETWORK_CONTEXT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

let networkContextPromise = null;

const getNow = () => Date.now();

const loadCachedNetworkContext = () => {
    try {
        const raw = sessionStorage.getItem(NETWORK_CONTEXT_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if (getNow() - Number(parsed.timestamp || 0) > NETWORK_CONTEXT_CACHE_TTL_MS) return null;

        return {
            ip: safeString(parsed.ip, 'unknown'),
            country: safeString(parsed.country, 'unknown')
        };
    } catch {
        return null;
    }
};

const saveCachedNetworkContext = (context) => {
    try {
        sessionStorage.setItem(NETWORK_CONTEXT_CACHE_KEY, JSON.stringify({
            ip: safeString(context.ip, 'unknown'),
            country: safeString(context.country, 'unknown'),
            timestamp: getNow()
        }));
    } catch {
        // ignore sessionStorage quota/privacy mode errors
    }
};

const withTimeout = async (promise, ms = 3500) => {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Network context timeout')), ms);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const lookupFromIpwho = async () => {
    const response = await withTimeout(fetch('https://ipwho.is/', { method: 'GET' }));
    if (!response.ok) {
        throw new Error(`ipwho lookup failed (${response.status})`);
    }

    const data = await response.json();
    if (data?.success === false) {
        throw new Error(safeString(data.message, 'ipwho lookup failed'));
    }

    return {
        ip: safeString(data.ip, 'unknown'),
        country: safeString(data.country, 'unknown')
    };
};

const lookupFromIpify = async () => {
    const response = await withTimeout(fetch('https://api.ipify.org?format=json', { method: 'GET' }));
    if (!response.ok) {
        throw new Error(`ipify lookup failed (${response.status})`);
    }

    const data = await response.json();
    return {
        ip: safeString(data.ip, 'unknown'),
        country: 'unknown'
    };
};

/**
 * Best-effort fetch public IP and country from CORS-friendly endpoints.
 * Uses session cache to avoid repeated requests (helps in React StrictMode/dev).
 */
export const getClientNetworkContext = async () => {
    const cached = loadCachedNetworkContext();
    if (cached) return cached;

    if (networkContextPromise) {
        return networkContextPromise;
    }

    networkContextPromise = (async () => {
        const providers = [lookupFromIpwho, lookupFromIpify];

        for (const provider of providers) {
            try {
                const context = await provider();
                saveCachedNetworkContext(context);
                return context;
            } catch (error) {
                console.warn('⚠️ Network context provider failed:', error?.message || error);
            }
        }

        const fallback = { ip: 'unknown', country: 'unknown' };
        saveCachedNetworkContext(fallback);
        console.warn('⚠️ Failed to detect client IP/country: all providers failed');
        return fallback;
    })();

    try {
        return await networkContextPromise;
    } finally {
        networkContextPromise = null;
    }
};

// ===== LICENSE MANAGEMENT =====

/**
 * Create new license
 * @param {string} keyString - License key
 * @param {string} email - User email
 * @param {string} machineId - Machine ID for hardware lock
 * @returns {Promise<number>} License ID
 */
export const createLicense = async (keyString, email = '', machineId = '') => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        const result = await client.execute({
            sql: `INSERT INTO licenses (key_string, email, machine_id, status, created_at, updated_at) 
            VALUES (?, ?, ?, 'active', ?, ?)`,
            args: [keyString, email, machineId, now, now]
        });

        console.log('✅ License created:', keyString);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Failed to create license:', error);
        throw error;
    }
};

/**
 * Get all licenses
 * @returns {Promise<Array>} Array of licenses
 */
export const getAllLicenses = async () => {
    const client = await getTursoClient();

    try {
        const result = await client.execute('SELECT * FROM licenses ORDER BY created_at DESC');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get licenses:', error);
        return [];
    }
};

/**
 * Get license by Key String
 * @param {string} keyString - License Key
 * @returns {Promise<Object|null>}
 */
export const getLicenseByKey = async (keyString) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM licenses WHERE key_string = ?',
            args: [keyString]
        });

        return result.rows?.[0] || null;
    } catch (error) {
        console.error('❌ Failed to get license by key:', error);
        return null;
    }
};

/**
 * Get license by ID
 * @param {number} id - License ID
 * @returns {Promise<Object|null>}
 */
export const getLicenseById = async (id) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM licenses WHERE id = ?',
            args: [id]
        });

        return result.rows?.[0] || null;
    } catch (error) {
        console.error('❌ Failed to get license:', error);
        return null;
    }
};

/**
 * Update license
 * @param {number} id - License ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>}
 */
export const updateLicense = async (id, updates) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        await ensureLicenseBindingColumns(client);

        const fields = [];
        const values = [];

        if (updates.email !== undefined) {
            fields.push('email = ?');
            values.push(updates.email);
        }
        if (updates.machine_id !== undefined) {
            fields.push('machine_id = ?');
            values.push(updates.machine_id);
        }
        if (updates.status !== undefined) {
            fields.push('status = ?');
            values.push(updates.status);
        }
        if (updates.bound_machine_id !== undefined) {
            fields.push('bound_machine_id = ?');
            values.push(updates.bound_machine_id);
        }
        if (updates.bound_ip !== undefined) {
            fields.push('bound_ip = ?');
            values.push(updates.bound_ip);
        }
        if (updates.bound_country !== undefined) {
            fields.push('bound_country = ?');
            values.push(updates.bound_country);
        }
        if (updates.bound_at !== undefined) {
            fields.push('bound_at = ?');
            values.push(updates.bound_at);
        }
        if (updates.last_seen_at !== undefined) {
            fields.push('last_seen_at = ?');
            values.push(updates.last_seen_at);
        }
        if (updates.last_seen_ip !== undefined) {
            fields.push('last_seen_ip = ?');
            values.push(updates.last_seen_ip);
        }
        if (updates.last_seen_country !== undefined) {
            fields.push('last_seen_country = ?');
            values.push(updates.last_seen_country);
        }
        if (updates.violation_count !== undefined) {
            fields.push('violation_count = ?');
            values.push(updates.violation_count);
        }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await client.execute({
            sql: `UPDATE licenses SET ${fields.join(', ')} WHERE id = ?`,
            args: values
        });

        console.log('✅ License updated:', id);
        return true;
    } catch (error) {
        console.error('❌ Failed to update license:', error);
        return false;
    }
};

/**
 * Validate and enforce single-device license session policy.
 * Policy: first device/ip binds to license. New device/ip is blocked,
 * first device remains active (no revoke).
 *
 * @param {string} keyString
 * @param {object} context
 * @param {string} context.machineId
 * @param {string} context.ip
 * @param {string} context.country
 * @returns {Promise<{ok:boolean,status:string,license?:object,message?:string}>}
 */
export const validateAndBindLicense = async (keyString, context = {}) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    const machineId = safeString(context.machineId, 'unknown');
    const ip = safeString(context.ip, 'unknown');
    const country = safeString(context.country, 'unknown');

    try {
        await ensureLicenseBindingColumns(client);

        const result = await client.execute({
            sql: 'SELECT * FROM licenses WHERE key_string = ? LIMIT 1',
            args: [keyString]
        });

        const license = result.rows?.[0];

        if (!license) {
            return { ok: false, status: 'not_found', message: 'License key not found' };
        }

        if (license.status !== 'active') {
            return { ok: false, status: 'inactive', message: 'License is not active', license };
        }

        const existingBoundMachine = safeString(license.bound_machine_id);
        const existingBoundIp = safeString(license.bound_ip);
        const hasBinding = !!(existingBoundMachine || existingBoundIp);

        // First-time bind
        if (!hasBinding) {
            await client.execute({
                sql: `UPDATE licenses
                      SET bound_machine_id = ?,
                          bound_ip = ?,
                          bound_country = ?,
                          bound_at = ?,
                          last_seen_at = ?,
                          last_seen_ip = ?,
                          last_seen_country = ?,
                          updated_at = ?
                      WHERE id = ?`,
                args: [machineId, ip, country, now, now, ip, country, now, license.id]
            });

            const updated = await getLicenseById(license.id);
            return {
                ok: true,
                status: 'bound_first_device',
                message: 'License bound to first device successfully',
                license: updated || license
            };
        }

        const machineMismatch = existingBoundMachine && machineId !== 'unknown' && existingBoundMachine !== machineId;
        const ipMismatch = existingBoundIp && ip !== 'unknown' && existingBoundIp !== ip;

        // Soft block for new device/IP, keep original active
        if (machineMismatch || ipMismatch) {
            await client.execute({
                sql: `UPDATE licenses
                      SET violation_count = COALESCE(violation_count, 0) + 1,
                          last_seen_at = ?,
                          last_seen_ip = ?,
                          last_seen_country = ?,
                          updated_at = ?
                      WHERE id = ?`,
                args: [now, ip, country, now, license.id]
            });

            const updated = await getLicenseById(license.id);

            return {
                ok: false,
                status: 'blocked_new_device',
                message: 'License already bound to another active device/session',
                license: updated || license
            };
        }

        // Same bound device, refresh heartbeat
        await client.execute({
            sql: `UPDATE licenses
                  SET last_seen_at = ?,
                      last_seen_ip = ?,
                      last_seen_country = ?,
                      updated_at = ?
                  WHERE id = ?`,
            args: [now, ip, country, now, license.id]
        });

        const updated = await getLicenseById(license.id);
        return {
            ok: true,
            status: 'active_bound_device',
            message: 'License validated on bound device',
            license: updated || license
        };
    } catch (error) {
        if (isMissingBindingColumnError(error)) {
            console.warn('⚠️ License binding columns unavailable on remote DB. Falling back to legacy validation.');
            try {
                return await validateAndBindLicenseLegacy(client, keyString, { machineId, ip, country });
            } catch (legacyError) {
                console.error('❌ Legacy validateAndBindLicense fallback failed:', legacyError);
                return {
                    ok: false,
                    status: 'error',
                    message: legacyError.message || 'Validation failed (legacy fallback)'
                };
            }
        }

        console.error('❌ validateAndBindLicense failed:', error);
        return {
            ok: false,
            status: 'error',
            message: error.message || 'Validation failed'
        };
    }
};

/**
 * Delete license
 * @param {number} id - License ID
 * @returns {Promise<boolean>}
 */
export const deleteLicense = async (id) => {
    const client = await getTursoClient();

    try {
        await client.execute({
            sql: 'DELETE FROM licenses WHERE id = ?',
            args: [id]
        });

        console.log('✅ License deleted:', id);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete license:', error);
        return false;
    }
};

/**
 * Search licenses
 * @param {string} query - Search query
 * @returns {Promise<Array>}
 */
export const searchLicenses = async (query) => {
    const client = await getTursoClient();

    try {
        await ensureLicenseBindingColumns(client);

        const result = await client.execute({
            sql: `SELECT * FROM licenses 
            WHERE email LIKE ? OR key_string LIKE ? OR machine_id LIKE ? OR bound_ip LIKE ? OR bound_country LIKE ? OR bound_machine_id LIKE ?
            ORDER BY created_at DESC`,
            args: [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
        });

        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to search licenses:', error);
        return [];
    }
};

/**
 * Get licenses by status
 * @param {string} status - License status (active/inactive)
 * @returns {Promise<Array>}
 */
export const getLicensesByStatus = async (status) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM licenses WHERE status = ? ORDER BY created_at DESC',
            args: [status]
        });

        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get licenses by status:', error);
        return [];
    }
};

// ===== LICENSE REQUESTS MANAGEMENT =====

export const createLicenseRequest = async (data) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    if (client.isMock) {
        throw new Error('Cloud database not configured. Request will not be sent to admin.');
    }

    try {
        const result = await client.execute({
            sql: `INSERT INTO license_requests 
            (email, machine_id, user_id, status, created_at, updated_at) 
            VALUES (?, ?, ?, 'pending', ?, ?)`,
            args: [
                data.email,
                data.machineId || '',
                data.userId || '',
                now,
                now
            ]
        });

        console.log('✅ License request created:', data.email);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Failed to create license request:', error);
        throw error;
    }
};

/**
 * Get all license requests
 * @returns {Promise<Array>}
 */
export const getAllLicenseRequests = async () => {
    const client = await getTursoClient();

    try {
        const result = await client.execute('SELECT * FROM license_requests ORDER BY created_at DESC');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get license requests:', error);
        return [];
    }
};

/**
 * Update license request status
 * @param {number} id - Request ID
 * @param {string} status - New status (approved/rejected)
 * @returns {Promise<boolean>}
 */
export const updateLicenseRequestStatus = async (id, status) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        await client.execute({
            sql: 'UPDATE license_requests SET status = ?, updated_at = ? WHERE id = ?',
            args: [status, now, id]
        });

        console.log(`✅ License request ${id} updated to ${status}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update license request status:', error);
        return false;
    }
};

// ===== MENU VISIBILITY MANAGEMENT =====

/**
 * Get menu visibility settings as a map: { [menu_path]: boolean }
 * @returns {Promise<Object>}
 */
export const getMenuVisibilitySettings = async () => {
    const client = await getTursoClient();

    try {
        const result = await client.execute('SELECT menu_path, is_visible FROM menu_visibility');
        const rows = result.rows || [];

        return rows.reduce((acc, row) => {
            acc[row.menu_path] = Number(row.is_visible) === 1;
            return acc;
        }, {});
    } catch (error) {
        console.error('❌ Failed to get menu visibility settings:', error);
        return {};
    }
};

/**
 * Upsert one menu visibility rule
 * @param {string} menuPath
 * @param {boolean} isVisible
 * @param {string} updatedBy
 * @returns {Promise<boolean>}
 */
export const upsertMenuVisibility = async (menuPath, isVisible, updatedBy = '') => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        await client.execute({
            sql: `INSERT INTO menu_visibility (menu_path, is_visible, updated_by, updated_at)
                  VALUES (?, ?, ?, ?)
                  ON CONFLICT(menu_path)
                  DO UPDATE SET
                    is_visible = excluded.is_visible,
                    updated_by = excluded.updated_by,
                    updated_at = excluded.updated_at`,
            args: [menuPath, isVisible ? 1 : 0, updatedBy, now]
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to upsert menu visibility:', error);
        return false;
    }
};

/**
 * Bulk upsert menu visibility settings
 * @param {Array<{menuPath:string,isVisible:boolean}>} items
 * @param {string} updatedBy
 * @returns {Promise<boolean>}
 */
export const bulkUpsertMenuVisibility = async (items = [], updatedBy = '') => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    if (!Array.isArray(items) || items.length === 0) return true;

    try {
        for (const item of items) {
            await client.execute({
                sql: `INSERT INTO menu_visibility (menu_path, is_visible, updated_by, updated_at)
                      VALUES (?, ?, ?, ?)
                      ON CONFLICT(menu_path)
                      DO UPDATE SET
                        is_visible = excluded.is_visible,
                        updated_by = excluded.updated_by,
                        updated_at = excluded.updated_at`,
                args: [item.menuPath, item.isVisible ? 1 : 0, updatedBy, now]
            });
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to bulk upsert menu visibility:', error);
        return false;
    }
};

/**
 * Reset all menu visibility rows to visible
 * @param {string} updatedBy
 * @returns {Promise<boolean>}
 */
export const resetMenuVisibilityToDefault = async (updatedBy = '') => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        await client.execute({
            sql: `UPDATE menu_visibility
                  SET is_visible = 1,
                      updated_by = ?,
                      updated_at = ?`,
            args: [updatedBy, now]
        });

        return true;
    } catch (error) {
        console.error('❌ Failed to reset menu visibility settings:', error);
        return false;
    }
};


/**
 * Create new YouTube link
 * @param {Object} data - YouTube link data
 * @returns {Promise<number>} Link ID
 */
export const createYouTubeLink = async (data) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        const result = await client.execute({
            sql: `INSERT INTO youtube_links 
            (title, url, description, category, lesson_id, module_id, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                data.title,
                data.url,
                data.description || '',
                data.category || '',
                data.lesson_id || '',
                data.module_id || '',
                now,
                now
            ]
        });

        console.log('✅ YouTube link created:', data.title);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Failed to create YouTube link:', error);
        throw error;
    }
};

/**
 * Get all YouTube links
 * @returns {Promise<Array>}
 */
export const getAllYouTubeLinks = async () => {
    const client = await getTursoClient();

    try {
        const result = await client.execute('SELECT * FROM youtube_links ORDER BY created_at DESC');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get YouTube links:', error);
        return [];
    }
};

/**
 * Get YouTube link by ID
 * @param {number} id - Link ID
 * @returns {Promise<Object|null>}
 */
export const getYouTubeLinkById = async (id) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM youtube_links WHERE id = ?',
            args: [id]
        });

        return result.rows?.[0] || null;
    } catch (error) {
        console.error('❌ Failed to get YouTube link:', error);
        return null;
    }
};

/**
 * Update YouTube link
 * @param {number} id - Link ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>}
 */
export const updateYouTubeLink = async (id, updates) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    try {
        const fields = [];
        const values = [];

        if (updates.title !== undefined) {
            fields.push('title = ?');
            values.push(updates.title);
        }
        if (updates.url !== undefined) {
            fields.push('url = ?');
            values.push(updates.url);
        }
        if (updates.description !== undefined) {
            fields.push('description = ?');
            values.push(updates.description);
        }
        if (updates.category !== undefined) {
            fields.push('category = ?');
            values.push(updates.category);
        }
        if (updates.lesson_id !== undefined) {
            fields.push('lesson_id = ?');
            values.push(updates.lesson_id);
        }
        if (updates.module_id !== undefined) {
            fields.push('module_id = ?');
            values.push(updates.module_id);
        }

        fields.push('updated_at = ?');
        values.push(now);
        values.push(id);

        await client.execute({
            sql: `UPDATE youtube_links SET ${fields.join(', ')} WHERE id = ?`,
            args: values
        });

        console.log('✅ YouTube link updated:', id);
        return true;
    } catch (error) {
        console.error('❌ Failed to update YouTube link:', error);
        return false;
    }
};

/**
 * Delete YouTube link
 * @param {number} id - Link ID
 * @returns {Promise<boolean>}
 */
export const deleteYouTubeLink = async (id) => {
    const client = await getTursoClient();

    try {
        await client.execute({
            sql: 'DELETE FROM youtube_links WHERE id = ?',
            args: [id]
        });

        console.log('✅ YouTube link deleted:', id);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete YouTube link:', error);
        return false;
    }
};

/**
 * Get YouTube links by category
 * @param {string} category - Category name
 * @returns {Promise<Array>}
 */
export const getYouTubeLinksByCategory = async (category) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM youtube_links WHERE category = ? ORDER BY created_at DESC',
            args: [category]
        });

        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get YouTube links by category:', error);
        return [];
    }
};

/**
 * Get YouTube links by module
 * @param {string} moduleId - Module ID
 * @returns {Promise<Array>}
 */
export const getYouTubeLinksByModule = async (moduleId) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: 'SELECT * FROM youtube_links WHERE module_id = ? ORDER BY created_at DESC',
            args: [moduleId]
        });

        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get YouTube links by module:', error);
        return [];
    }
};

/**
 * Search YouTube links
 * @param {string} query - Search query
 * @returns {Promise<Array>}
 */
export const searchYouTubeLinks = async (query) => {
    const client = await getTursoClient();

    try {
        const result = await client.execute({
            sql: `SELECT * FROM youtube_links 
            WHERE title LIKE ? OR description LIKE ? OR category LIKE ?
            ORDER BY created_at DESC`,
            args: [`%${query}%`, `%${query}%`, `%${query}%`]
        });

        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to search YouTube links:', error);
        return [];
    }
};

// ===== APP INSTALLER MANAGEMENT =====

/**
 * Save new installer to Turso
 * @param {string} name - Installer filename
 * @param {Blob|Uint8Array} fileBlob - File data
 * @param {string} version - Version string
 * @returns {Promise<number>}
 */
export const saveCloudInstaller = async (name, fileBlob, version) => {
    const client = await getTursoClient();
    const now = new Date().toISOString();

    // Helper: Convert Blob/File to Uint8Array
    const dataToUint8Array = async (data) => {
        if (data instanceof Uint8Array) return data;
        if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
        return data;
    };

    const fileData = await dataToUint8Array(fileBlob);

    try {
        const result = await client.execute({
            sql: `INSERT INTO cloud_installers (name, file_blob, version, uploaded_at, size) 
            VALUES (?, ?, ?, ?, ?)`,
            args: [name, fileData, version, now, fileData.byteLength]
        });

        console.log('✅ Cloud Installer saved:', name, version);
        return result.lastInsertRowid;
    } catch (error) {
        console.error('❌ Failed to save cloud installer:', error);
        throw error;
    }
};

/**
 * Get latest installer from Turso
 * @returns {Promise<Object|null>}
 */
export const getLatestCloudInstaller = async () => {
    const client = await getTursoClient();

    try {
        const result = await client.execute('SELECT * FROM cloud_installers ORDER BY uploaded_at DESC LIMIT 1');
        const row = result.rows?.[0];

        if (!row) return null;

        // Convert binary data back to Blob if needed
        let fileBlob = row.file_blob;
        if (fileBlob && !(fileBlob instanceof Blob)) {
            // Turso returns buffer as Uint8Array
            fileBlob = new Blob([fileBlob], { type: 'application/vnd.microsoft.portable-executable' });
        }

        return {
            ...row,
            fileBlob: fileBlob
        };
    } catch (error) {
        console.error('❌ Failed to get latest cloud installer:', error);
        return null;
    }
};

/**
 * Get all installers from Turso (metadata only for list)
 * @returns {Promise<Array>}
 */
export const getAllCloudInstallers = async () => {
    const client = await getTursoClient();

    try {
        // We omit file_blob to save bandwidth in the list
        const result = await client.execute('SELECT id, name, version, uploaded_at, size FROM cloud_installers ORDER BY uploaded_at DESC');
        return result.rows || [];
    } catch (error) {
        console.error('❌ Failed to get all cloud installers:', error);
        return [];
    }
};

/**
 * Delete installer from Turso
 * @param {number} id - Installer ID
 * @returns {Promise<boolean>}
 */
export const deleteCloudInstaller = async (id) => {
    const client = await getTursoClient();

    try {
        await client.execute({
            sql: 'DELETE FROM cloud_installers WHERE id = ?',
            args: [id]
        });

        console.log('✅ Cloud Installer deleted:', id);
        return true;
    } catch (error) {
        console.error('❌ Failed to delete cloud installer:', error);
        return false;
    }
};

export default {
    // License functions
    createLicense,
    getAllLicenses,
    getLicenseByKey,
    getLicenseById,
    validateAndBindLicense,
    getClientNetworkContext,
    updateLicense,
    deleteLicense,
    searchLicenses,
    getLicensesByStatus,

    // YouTube links functions
    createYouTubeLink,
    getAllYouTubeLinks,
    getYouTubeLinkById,
    updateYouTubeLink,
    deleteYouTubeLink,
    getYouTubeLinksByCategory,
    getYouTubeLinksByModule,
    searchYouTubeLinks,

    // License Request functions
    createLicenseRequest,
    getAllLicenseRequests,
    updateLicenseRequestStatus,

    // Menu visibility functions
    getMenuVisibilitySettings,
    upsertMenuVisibility,
    bulkUpsertMenuVisibility,
    resetMenuVisibilityToDefault,

    // Installer functions
    saveCloudInstaller,
    getLatestCloudInstaller,
    getAllCloudInstallers,
    deleteCloudInstaller
};
