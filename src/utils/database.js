// Local database wrapper for Motion Analysis data
// Uses SQLite via Tauri SQL Plugin for true offline desktop storage

import { getSqliteDb } from './sqlite.js';
import { getTursoStatus } from './tursoClient.js';

// Initialize database singleton
let dbInstance = null;
export const initDB = async () => {
    if (dbInstance) return dbInstance;
    try {
        dbInstance = await getSqliteDb();
        await ensureMainWorkspace(); // Ensure default folder exists
        return dbInstance;
    } catch (error) {
        console.error('Database initialization failed in database.js:', error);
        // Fallback to a safe mock if initialization fails
        return {
            execute: async () => ({ lastInsertId: 0 }),
            select: async () => [],
        };
    }
};

export const checkDBStatus = async () => {
    try {
        const tursoStatus = await getTursoStatus();
        const db = await initDB();
        const localStatus = (db && db.getStatus) ? db.getStatus() : { isConfigured: false, isOnline: navigator.onLine, mode: 'Local' };

        // We prioritize Turso status for the "ONLINE/OFFLINE" indicator
        return {
            isConfigured: tursoStatus.configured,
            isOnline: tursoStatus.connected,
            mode: tursoStatus.mode,
            local: localStatus
        };
    } catch (error) {
        console.error('Failed to check DB status:', error);
        return { isConfigured: false, isOnline: false, mode: 'Error' };
    }
};


const ensureMainWorkspace = async () => {
    try {
        const db = await initDB();
        // Ensure Main Workspace
        const existingMain = await db.select('SELECT id FROM folders WHERE name = ? AND section = ?', ['Main Workspace', 'projects']);
        if (existingMain.length === 0) {
            await db.execute(
                'INSERT INTO folders (name, section, parentId, createdAt) VALUES (?, ?, ?, ?)',
                ['Main Workspace', 'projects', null, new Date().toISOString()]
            );
        }

        // Ensure TM Studio Workspace
        const existingTM = await db.select('SELECT id FROM folders WHERE name = ? AND section = ?', ['TM Studio', 'projects']);
        if (existingTM.length === 0) {
            await db.execute(
                'INSERT INTO folders (name, section, parentId, createdAt) VALUES (?, ?, ?, ?)',
                ['TM Studio', 'projects', null, new Date().toISOString()]
            );
        }
    } catch (e) {
        console.warn('Failed to ensure Workspaces:', e);
    }
};

const getSafeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Helper: Convert Blob/File to Uint8Array for SQLite storage
const blobToUint8Array = async (blob) => {
    if (!blob) return null;
    if (blob instanceof Uint8Array || Array.isArray(blob)) return blob; // Already in correct format
    if (blob instanceof Blob) {
        return new Uint8Array(await blob.arrayBuffer());
    }
    return blob; // detailed fallback
};

// Helper: Convert database result (Uint8Array/Array) back to Blob
const dbDataToBlob = (data, type = 'video/mp4') => {
    if (!data) return null;
    if (data instanceof Blob) return data;

    try {
        // Handle cases where data might be wrapped in an object { data: [...] }
        const actualData = data.data !== undefined ? data.data : data;

        // Handle array or array-like objects
        const byteArray = actualData instanceof Uint8Array ? actualData : new Uint8Array(actualData);
        return new Blob([byteArray], { type });
    } catch (e) {
        console.error('Failed to convert DB data to Blob:', e);
        return null;
    }
};

// Normalize legacy project rows where folderId was accidentally saved
// into standardWorkLayoutData (older argument order bug).
const normalizeProjectRow = (row) => {
    const parsedSwcs = row.swcsData ? JSON.parse(row.swcsData) : null;
    const parsedLayout = row.standardWorkLayoutData ? JSON.parse(row.standardWorkLayoutData) : null;

    let normalizedFolderId = row.folderId;
    let normalizedLayout = parsedLayout;

    // Legacy recovery: if folderId is empty but layout is a number,
    // treat that number as folderId.
    if ((normalizedFolderId === null || normalizedFolderId === undefined) && typeof parsedLayout === 'number') {
        normalizedFolderId = parsedLayout;
        normalizedLayout = null;
    }

    return {
        ...row,
        folderId: normalizedFolderId,
        videoBlob: dbDataToBlob(row.videoBlob),
        measurements: JSON.parse(row.measurements || '[]'),
        swcsData: parsedSwcs,
        standardWorkLayoutData: normalizedLayout
    };
};

// ===== PROJECT MANAGEMENT FUNCTIONS =====

// Save new project
export const saveProject = async (projectName, videoBlob, videoName, measurements = [], swcsData = null, standardWorkLayoutData = null, folderId = null) => {
    const db = await initDB();
    const videoData = await blobToUint8Array(videoBlob);

    const result = await db.execute(
        `INSERT INTO projects 
        (projectName, videoBlob, videoName, measurements, createdAt, lastModified, swcsData, standardWorkLayoutData, folderId) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            projectName, videoData, videoName, JSON.stringify(measurements),
            new Date().toISOString(), new Date().toISOString(),
            swcsData ? JSON.stringify(swcsData) : null,
            standardWorkLayoutData ? JSON.stringify(standardWorkLayoutData) : null,
            folderId
        ]
    );
    return result.lastInsertId;
};

// Get all projects
// Get all projects
export const getAllProjects = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM projects ORDER BY lastModified DESC');
    return rows.map(normalizeProjectRow);
};

// Get project by name
export const getProjectByName = async (projectName) => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM projects WHERE projectName = ?', [projectName]);
    if (rows.length === 0) return null;
    return normalizeProjectRow(rows[0]);
};

// Update project
export const updateProject = async (identifier, updates) => {
    const db = await initDB();

    let project;
    if (typeof identifier === 'number') {
        project = await getProjectById(identifier);
    } else {
        project = await getProjectByName(identifier);
    }

    if (!project) throw new Error('Project not found');

    const updatedData = {
        ...project,
        ...updates,
        lastModified: new Date().toISOString()
    };

    // Dynamically build update query
    const setClauses = [
        'projectName = ?',
        'videoName = ?',
        'measurements = ?',
        'lastModified = ?',
        'folderId = ?',
        'swcsData = ?',
        'standardWorkLayoutData = ?'
    ];

    const params = [
        updatedData.projectName,
        updatedData.videoName,
        JSON.stringify(updatedData.measurements || []),
        updatedData.lastModified,
        updatedData.folderId,
        updatedData.swcsData ? JSON.stringify(updatedData.swcsData) : null,
        updatedData.standardWorkLayoutData ? JSON.stringify(updatedData.standardWorkLayoutData) : null
    ];

    if (updates.videoBlob) {
        setClauses.push('videoBlob = ?');
        params.push(await blobToUint8Array(updates.videoBlob));
    }

    params.push(updatedData.id);

    await db.execute(
        `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`,
        params
    );
    return updatedData.id;
};

// Get project by ID
export const getProjectById = async (id) => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM projects WHERE id = ?', [id]);
    if (rows.length === 0) return null;
    return normalizeProjectRow(rows[0]);
};

// Delete project by ID
export const deleteProjectById = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM projects WHERE id = ?', [id]);
};

export const deleteProject = async (identifier) => {
    if (typeof identifier === 'number') {
        return await deleteProjectById(identifier);
    } else {
        const project = await getProjectByName(identifier);
        if (!project) throw new Error('Project not found');
        return await deleteProjectById(project.id);
    }
};

// ===== FOLDER MANAGEMENT FUNCTIONS =====

export const createFolder = async (name, section = 'projects', parentId = null) => {
    const db = await initDB();
    const result = await db.execute(
        'INSERT INTO folders (name, section, parentId, createdAt) VALUES (?, ?, ?, ?)',
        [name, section, parentId, new Date().toISOString()]
    );
    return result.lastInsertId;
};

export const getFolders = async (section = 'projects', parentId = null) => {
    const db = await initDB();
    if (parentId === null) {
        return await db.select('SELECT * FROM folders WHERE section = ? AND parentId IS NULL', [section]);
    }
    return await db.select('SELECT * FROM folders WHERE section = ? AND parentId = ?', [section, parentId]);
};

export const deleteFolder = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM folders WHERE id = ?', [id]);
};

export const getFolderById = async (id) => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM folders WHERE id = ?', [id]);
    return rows[0] || null;
};

export const getFolderBreadcrumbs = async (folderId) => {
    if (!folderId) return [];
    const crumbs = [];
    let currentId = folderId;
    while (currentId) {
        const folder = await getFolderById(currentId);
        if (!folder) break;
        crumbs.unshift({ id: folder.id, name: folder.name, parentId: folder.parentId });
        currentId = folder.parentId;
    }
    return crumbs;
};

// --- Multi-Camera Management ---

export const getAllCameras = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM cameras');
    return rows.map(r => ({ ...r, config: JSON.parse(r.config || '{}') }));
};

export const saveCamera = async (cameraData) => {
    const db = await initDB();
    const config = JSON.stringify(cameraData.config || {});
    if (cameraData.id) {
        await db.execute(
            'UPDATE cameras SET name = ?, projectId = ?, config = ? WHERE id = ?',
            [cameraData.name, cameraData.projectId, config, cameraData.id]
        );
        return cameraData.id;
    } else {
        const result = await db.execute(
            'INSERT INTO cameras (name, projectId, config) VALUES (?, ?, ?)',
            [cameraData.name, cameraData.projectId, config]
        );
        return result.lastInsertId;
    }
};

export const deleteCamera = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM cameras WHERE id = ?', [id]);
};

// ===== SWCS (Standard Work Combination Sheet) FUNCTIONS =====

// Save SWCS data to a project
export const saveSWCSData = async (projectIdentifier, swcsData) => {
    const db = await initDB();
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) throw new Error('Project not found');

    await db.execute(
        'UPDATE projects SET swcsData = ?, lastModified = ? WHERE id = ?',
        [JSON.stringify(swcsData), new Date().toISOString(), project.id]
    );
    return project.id;
};

// Get SWCS data from a project
export const getSWCSData = async (projectIdentifier) => {
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) return null;
    return project.swcsData;
};

// Delete SWCS data from a project
export const deleteSWCSData = async (projectIdentifier) => {
    const db = await initDB();
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) throw new Error('Project not found');

    return project.id;
};

// ===== STANDARD WORK LAYOUT FUNCTIONS =====

// Save Standard Work Layout data to a project
export const saveStandardWorkLayoutData = async (projectIdentifier, layoutData) => {
    const db = await initDB();
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) throw new Error('Project not found');

    await db.execute(
        'UPDATE projects SET standardWorkLayoutData = ?, lastModified = ? WHERE id = ?',
        [JSON.stringify(layoutData), new Date().toISOString(), project.id]
    );
    return project.id;
};

// Get Standard Work Layout data from a project
export const getStandardWorkLayoutData = async (projectIdentifier) => {
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) return null;
    return project.standardWorkLayoutData;
};

// Delete Standard Work Layout data from a project
export const deleteStandardWorkLayoutData = async (projectIdentifier) => {
    const db = await initDB();
    let project;

    if (typeof projectIdentifier === 'number') {
        project = await getProjectById(projectIdentifier);
    } else {
        project = await getProjectByName(projectIdentifier);
    }

    if (!project) throw new Error('Project not found');

    await db.execute(
        'UPDATE projects SET standardWorkLayoutData = NULL, lastModified = ? WHERE id = ?',
        [new Date().toISOString(), project.id]
    );
    return project.id;
};

// Studio Model Helper
export const getAllStudioModels = () => {
    try {
        const models = localStorage.getItem('motionModels');
        return models ? JSON.parse(models) : [];
    } catch (e) {
        console.error("Failed to load studio models", e);
        return [];
    }
};

// ===== DATASET MANAGEMENT FUNCTIONS =====

export const saveDataset = async (name, zipBlob, projectName, clipId, folderId = null) => {
    const db = await initDB();
    const zipData = await blobToUint8Array(zipBlob);

    // If folderId is not provided, try to find the "TM Studio" folder
    let targetFolderId = folderId;
    if (!targetFolderId) {
        const tmFolder = await db.select('SELECT id FROM folders WHERE name = ? AND section = ?', ['TM Studio', 'projects']);
        if (tmFolder.length > 0) {
            targetFolderId = tmFolder[0].id;
        }
    }

    const result = await db.execute(
        `INSERT INTO datasets 
        (name, zipBlob, projectName, clipId, folderId, createdAt, size) 
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            name, zipData, projectName, clipId, targetFolderId,
            new Date().toISOString(), zipBlob.size
        ]
    );
    return result.lastInsertId;
};

export const getDatasets = async (folderId = null) => {
    const db = await initDB();
    let rows;
    if (folderId === null) {
        rows = await db.select('SELECT * FROM datasets WHERE folderId IS NULL ORDER BY createdAt DESC');
    } else {
        rows = await db.select('SELECT * FROM datasets WHERE folderId = ? ORDER BY createdAt DESC', [folderId]);
    }

    return rows.map(r => ({
        ...r,
        zipBlob: dbDataToBlob(r.zipBlob, 'application/zip')
    }));
};

export const getAllDatasets = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM datasets ORDER BY createdAt DESC');
    return rows.map(r => ({
        ...r,
        zipBlob: dbDataToBlob(r.zipBlob, 'application/zip')
    }));
};

export const deleteDataset = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM datasets WHERE id = ?', [id]);
};


// ===== APP INSTALLER FUNCTIONS =====

export const saveInstaller = async (name, fileBlob, version) => {
    const db = await initDB();
    const fileData = await blobToUint8Array(fileBlob);

    // Optional: Delete older installers to save space?
    // await db.execute('DELETE FROM app_installers');

    const result = await db.execute(
        `INSERT INTO app_installers 
        (name, fileBlob, version, uploadedAt, size) 
        VALUES (?, ?, ?, ?, ?)`,
        [
            name, fileData, version,
            new Date().toISOString(), fileBlob.size
        ]
    );
    return result.lastInsertId;
};

export const getLatestInstaller = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM app_installers ORDER BY uploadedAt DESC LIMIT 1');
    if (rows.length === 0) return null;

    return {
        ...rows[0],
        fileBlob: dbDataToBlob(rows[0].fileBlob, 'application/vnd.microsoft.portable-executable')
    };
};

export const getAllInstallers = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT id, name, version, uploadedAt, size FROM app_installers ORDER BY uploadedAt DESC');
    return rows;
};

export const deleteInstaller = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM app_installers WHERE id = ?', [id]);
};

// ===== TRANSLATION MANAGEMENT FUNCTIONS =====

export const getDynamicTranslations = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM dynamic_translations');
    return rows;
};

export const updateTranslation = async (key, lang, value) => {
    const db = await initDB();
    // Check if key exists
    const existing = await db.select('SELECT key FROM dynamic_translations WHERE key = ?', [key]);

    if (existing.length > 0) {
        await db.execute(
            `UPDATE dynamic_translations SET ${lang} = ? WHERE key = ?`,
            [value, key]
        );
    } else {
        const columns = { en: null, id: null, ja: null };
        columns[lang] = value;
        await db.execute(
            'INSERT INTO dynamic_translations (key, en, id, ja) VALUES (?, ?, ?, ?)',
            [key, columns.en, columns.id, columns.ja]
        );
    }
};

export const upsertTranslation = async (key, data) => {
    const db = await initDB();
    const existing = await db.select('SELECT key FROM dynamic_translations WHERE key = ?', [key]);

    if (existing.length > 0) {
        await db.execute(
            'UPDATE dynamic_translations SET en = ?, id = ?, ja = ? WHERE key = ?',
            [data.en, data.id, data.ja, key]
        );
    } else {
        await db.execute(
            'INSERT INTO dynamic_translations (key, en, id, ja) VALUES (?, ?, ?, ?)',
            [key, data.en, data.id, data.ja]
        );
    }
};

export const deleteTranslation = async (key) => {
    const db = await initDB();
    await db.execute('DELETE FROM dynamic_translations WHERE key = ?', [key]);
};
