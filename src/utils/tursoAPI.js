// Turso Database API
// CRUD operations for licenses and YouTube links

import { getTursoClient } from './tursoClient.js';

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
        const result = await client.execute({
            sql: `SELECT * FROM licenses 
            WHERE email LIKE ? OR key_string LIKE ? OR machine_id LIKE ?
            ORDER BY created_at DESC`,
            args: [`%${query}%`, `%${query}%`, `%${query}%`]
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

    // Installer functions
    saveCloudInstaller,
    getLatestCloudInstaller,
    getAllCloudInstallers,
    deleteCloudInstaller
};
