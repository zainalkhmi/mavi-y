/**
 * database.js
 * =====================================================
 * Main database entry point for MAVi.
 * Project/Video storage now uses local SQLite + IndexedDB (offline-first).
 * Supabase utilities are still used for non-project modules.
 * =====================================================
 */
import { isSupabaseReady } from './supabaseManualDB.js';
import * as supabaseTranslations from './supabaseTranslationDB.js';
import * as supabaseUtility from './supabaseUtilityDB.js';
import * as supabaseSettings from './supabaseSettingsDB.js';
import { getSqliteDb } from './sqlite.js';
import {
    saveProjectVideoBlob,
    getProjectVideoBlob,
    deleteProjectVideoBlob,
    renameProjectVideoBlob
} from './projectVideoStore.js';

// Initialize transient local database (for temporary storage/cache if needed)
let dbInstance = null;
export const initDB = async () => {
    if (dbInstance) return dbInstance;
    try {
        dbInstance = await getSqliteDb();
        return dbInstance;
    } catch (error) {
        console.error('Local SQLite initialization failed:', error);
        return { execute: async () => ({ lastInsertId: 0 }), select: async () => [] };
    }
};

export const checkDBStatus = async () => {
    return {
        isConfigured: true,
        isOnline: navigator.onLine,
        mode: 'Local SQLite + IndexedDB',
        local: { isConfigured: true, isOnline: navigator.onLine, mode: 'Local' }
    };
};

const getSafeUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ===== PROJECT MANAGEMENT FUNCTIONS =====

export const saveProject = async (projectName, videoBlob, videoName, measurements = [], swcsData = null, standardWorkLayoutData = null, folderId = null, facilityLayoutData = null) => {
    const db = await initDB();
    const now = new Date().toISOString();
    const existing = await getProjectByName(projectName);

    if (videoBlob instanceof Blob) {
        await saveProjectVideoBlob(projectName, videoBlob);
    }

    if (existing) {
        await db.execute(
            `UPDATE projects
             SET videoName = ?, measurements = ?, lastModified = ?, folderId = ?, swcsData = ?, standardWorkLayoutData = ?, facilityLayoutData = ?
             WHERE projectName = ?`,
            [
                videoName || existing.videoName || '',
                JSON.stringify(measurements || []),
                now,
                folderId ?? existing.folderId ?? null,
                swcsData != null ? JSON.stringify(swcsData) : existing.swcsData != null ? JSON.stringify(existing.swcsData) : null,
                standardWorkLayoutData != null ? JSON.stringify(standardWorkLayoutData) : existing.standardWorkLayoutData != null ? JSON.stringify(existing.standardWorkLayoutData) : null,
                facilityLayoutData != null ? JSON.stringify(facilityLayoutData) : existing.facilityLayoutData != null ? JSON.stringify(existing.facilityLayoutData) : null,
                projectName
            ]
        );
        return existing.id;
    }

    const result = await db.execute(
        `INSERT INTO projects (projectName, videoBlob, videoName, measurements, createdAt, lastModified, folderId, swcsData, standardWorkLayoutData, facilityLayoutData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            projectName,
            null,
            videoName || '',
            JSON.stringify(measurements || []),
            now,
            now,
            folderId,
            swcsData != null ? JSON.stringify(swcsData) : null,
            standardWorkLayoutData != null ? JSON.stringify(standardWorkLayoutData) : null,
            facilityLayoutData != null ? JSON.stringify(facilityLayoutData) : null
        ]
    );

    return result?.lastInsertId || 0;
};

export const getAllProjects = async () => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM projects ORDER BY lastModified DESC');

    return await Promise.all((rows || []).map(async (row) => ({
        ...row,
        measurements: row.measurements ? JSON.parse(row.measurements) : [],
        swcsData: row.swcsData ? JSON.parse(row.swcsData) : null,
        standardWorkLayoutData: row.standardWorkLayoutData ? JSON.parse(row.standardWorkLayoutData) : null,
        facilityLayoutData: row.facilityLayoutData ? JSON.parse(row.facilityLayoutData) : null,
        videoBlob: await getProjectVideoBlob(row.projectName),
        videoUrl: null
    })));
};

export const getProjectByName = async (projectName) => {
    const db = await initDB();
    const rows = await db.select('SELECT * FROM projects WHERE projectName = ? LIMIT 1', [projectName]);
    const row = rows?.[0];
    if (!row) return null;

    return {
        ...row,
        measurements: row.measurements ? JSON.parse(row.measurements) : [],
        swcsData: row.swcsData ? JSON.parse(row.swcsData) : null,
        standardWorkLayoutData: row.standardWorkLayoutData ? JSON.parse(row.standardWorkLayoutData) : null,
        facilityLayoutData: row.facilityLayoutData ? JSON.parse(row.facilityLayoutData) : null,
        videoBlob: await getProjectVideoBlob(row.projectName),
        videoUrl: null
    };
};

export const updateProject = async (identifier, updates) => {
    const db = await initDB();
    const isId = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
    const whereField = isId ? 'id' : 'projectName';
    const whereValue = isId ? Number(identifier) : String(identifier);

    const rows = await db.select(`SELECT * FROM projects WHERE ${whereField} = ? LIMIT 1`, [whereValue]);
    const existing = rows?.[0];
    if (!existing) throw new Error('Project not found');

    const nextProjectName = updates.projectName ?? existing.projectName;
    const nextVideoName = updates.videoName ?? existing.videoName;
    const nextMeasurements = updates.measurements !== undefined
        ? JSON.stringify(updates.measurements || [])
        : existing.measurements;
    const nextFolderId = updates.folderId !== undefined ? updates.folderId : existing.folderId;
    const nextSwcsData = updates.swcsData !== undefined
        ? (updates.swcsData != null ? JSON.stringify(updates.swcsData) : null)
        : existing.swcsData;
    const nextStandardWorkLayoutData = updates.standardWorkLayoutData !== undefined
        ? (updates.standardWorkLayoutData != null ? JSON.stringify(updates.standardWorkLayoutData) : null)
        : existing.standardWorkLayoutData;
    const nextFacilityLayoutData = updates.facilityLayoutData !== undefined
        ? (updates.facilityLayoutData != null ? JSON.stringify(updates.facilityLayoutData) : null)
        : existing.facilityLayoutData;
    const nextLastModified = updates.lastModified || new Date().toISOString();

    if (updates.videoBlob instanceof Blob) {
        await saveProjectVideoBlob(nextProjectName, updates.videoBlob);
    }

    if (existing.projectName !== nextProjectName) {
        await renameProjectVideoBlob(existing.projectName, nextProjectName);
    }

    await db.execute(
        `UPDATE projects
         SET projectName = ?, videoName = ?, measurements = ?, folderId = ?, swcsData = ?, standardWorkLayoutData = ?, facilityLayoutData = ?, lastModified = ?
         WHERE ${whereField} = ?`,
        [
            nextProjectName,
            nextVideoName,
            nextMeasurements,
            nextFolderId,
            nextSwcsData,
            nextStandardWorkLayoutData,
            nextFacilityLayoutData,
            nextLastModified,
            whereValue
        ]
    );

    const updated = await getProjectByName(nextProjectName);
    return updated?.id;
};

export const getProjectById = async (id) => {
    const data = await getAllProjects(); // Simplification: filter from all for now or add direct ID fetch
    return data.find(p => p.id === id) || null;
};

export const deleteProject = async (identifier) => {
    const db = await initDB();
    const isId = typeof identifier === 'number' || /^\d+$/.test(String(identifier));
    const whereField = isId ? 'id' : 'projectName';
    const whereValue = isId ? Number(identifier) : String(identifier);

    const rows = await db.select(`SELECT projectName FROM projects WHERE ${whereField} = ? LIMIT 1`, [whereValue]);
    const projectName = rows?.[0]?.projectName;

    await db.execute(`DELETE FROM projects WHERE ${whereField} = ?`, [whereValue]);

    if (projectName) {
        await deleteProjectVideoBlob(projectName);
    }

    return true;
};

export const deleteProjectById = deleteProject;

// ===== FOLDER MANAGEMENT FUNCTIONS =====

export const createFolder = async (name, section = 'projects', parentId = null) => {
    const db = await initDB();
    const now = new Date().toISOString();
    const result = await db.execute(
        'INSERT INTO folders (name, section, parentId, createdAt) VALUES (?, ?, ?, ?)',
        [name, section, parentId, now]
    );
    return result?.lastInsertId || 0;
};

export const getFolders = async (section = 'projects', parentId = null) => {
    const db = await initDB();
    const rows = parentId == null
        ? await db.select(
            'SELECT * FROM folders WHERE section = ? AND parentId IS NULL ORDER BY name ASC',
            [section]
        )
        : await db.select(
            'SELECT * FROM folders WHERE section = ? AND parentId = ? ORDER BY name ASC',
            [section, parentId]
        );
    return rows || [];
};

export const deleteFolder = async (id) => {
    const db = await initDB();
    await db.execute('DELETE FROM folders WHERE id = ?', [id]);
    return true;
};

export const getFolderById = async (id) => {
    const folders = await getFolders();
    return folders.find(f => f.id === id) || null;
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
    const data = await supabaseUtility.getAllCameras();
    return data.map(c => ({ ...c, config: c.settings || {} }));
};

export const saveCamera = async (cameraData) => {
    const camera = {
        ...cameraData,
        settings: cameraData.config || {}
    };
    const saved = await supabaseUtility.saveCamera(camera);
    return saved.id;
};

export const deleteCamera = async (id) => {
    return await supabaseUtility.deleteCamera(id);
};

// ===== SWCS, LAYOUT, FACILITY HELPERS =====
// Redirect to updateProject

export const saveSWCSData = async (id, data) => updateProject(id, { swcsData: data });
export const getSWCSData = async (id) => (await getProjectById(id))?.swcsData;

export const saveStandardWorkLayoutData = async (id, data) => updateProject(id, { standardWorkLayoutData: data });
export const getStandardWorkLayoutData = async (id) => (await getProjectById(id))?.standardWorkLayoutData;

export const saveFacilityLayoutData = async (id, data) => updateProject(id, { facilityLayoutData: data });
export const getFacilityLayoutData = async (id) => (await getProjectById(id))?.facilityLayoutData;

// ===== DATASET MANAGEMENT FUNCTIONS =====

export const saveDataset = async (name, zipBlob, projectName, clipId, folderId = null) => {
    // Metadata only for now, binaries would need Supabase Storage
    const dataset = { name, projectName, clipId, folderId };
    const saved = await supabaseUtility.saveDataset(dataset);
    return saved.id;
};

export const getDatasets = async (folderId = null) => {
    const data = await supabaseUtility.getAllDatasets();
    return folderId ? data.filter(d => d.folder_id === folderId) : data;
};

export const getAllDatasets = async () => supabaseUtility.getAllDatasets();
export const deleteDataset = async (id) => supabaseUtility.deleteDataset(id);

// ===== TRANSLATION MANAGEMENT FUNCTIONS =====

export const getDynamicTranslations = async () => {
    const data = await supabaseTranslations.getDynamicTranslations();
    // database.js signature returns rows as array [{ key, en, id, ja }]
    return Object.entries(data).map(([key, t]) => ({
        key,
        en: t.en,
        id: t.id,
        ja: t.ja,
        ...t
    }));
};

export const updateTranslation = async (key, lang, value) => {
    return await supabaseTranslations.updateTranslation(key, lang, value);
};

export const upsertTranslation = async (key, data) => {
    return await supabaseTranslations.upsertTranslation(key, data);
};

export const deleteTranslation = async (key) => {
    return await supabaseTranslations.deleteTranslation(key);
};

// ===== STUDIO MODEL HELPERS =====

export const getAllStudioModels = () => {
    try {
        const models = localStorage.getItem('motionModels');
        return models ? JSON.parse(models) : [];
    } catch (e) {
        console.error("Failed to load studio models", e);
        return [];
    }
};

// ===== APP INSTALLER FUNCTIONS =====

export const saveInstaller = async (name, fileBlob, version) => {
    // This previously saved to SQLite. Now redirecting to Supabase Cloud Installers.
    // Note: This expects an object with a URL, but legacy passed a blob.
    // For now, we'll log a warning and use the name/version.
    console.warn('saveInstaller redirected to Supabase. Requires external URL for cloud storage integration.');
    return await supabaseSettings.saveCloudInstaller({ name, version, url: '#' });
};

export const getLatestInstaller = async () => {
    return await supabaseSettings.getLatestCloudInstaller();
};

export const getAllInstallers = async () => {
    return await supabaseSettings.getAllCloudInstallers();
};

export const deleteInstaller = async (id) => {
    return await supabaseSettings.deleteCloudInstaller(id);
};
