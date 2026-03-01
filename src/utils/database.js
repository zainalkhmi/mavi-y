/**
 * database.js
 * =====================================================
 * Main database entry point for MAVi.
 * REFACTORED: Now redirects to Supabase utilities.
 * Legacy SQLite logic is maintained for transient-only fallbacks.
 * =====================================================
 */
import { isSupabaseReady } from './supabaseManualDB.js';
import * as supabaseProjects from './supabaseProjectDB.js';
import * as supabaseTranslations from './supabaseTranslationDB.js';
import * as supabaseUtility from './supabaseUtilityDB.js';
import * as supabaseSettings from './supabaseSettingsDB.js';
import { getSqliteDb } from './sqlite.js';

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
    const ready = isSupabaseReady();
    return {
        isConfigured: ready,
        isOnline: ready,
        mode: ready ? 'Supabase' : 'Offline',
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
    // 1. Upload video if provided (and we have a blob)
    let videoUrl = null;
    if (videoBlob) {
        try {
            videoUrl = await supabaseProjects.uploadVideo(videoBlob, videoName);
        } catch (e) {
            console.warn('Supabase Storage upload failed, project will save without video URL:', e);
        }
    }

    // 2. Save metadata to Supabase DB
    const project = {
        projectName,
        videoName,
        videoUrl,
        measurements,
        swcsData,
        standardWorkLayoutData,
        folderId,
        facilityLayoutData
    };

    const saved = await supabaseProjects.saveProject(project);
    return saved.id;
};

export const getAllProjects = async () => {
    const data = await supabaseProjects.getAllProjects();
    return data.map(row => ({
        ...row,
        projectName: row.project_name,
        videoName: row.video_name,
        videoBlob: null, // Blobs are no longer stored in DB
        videoUrl: row.video_url,
        measurements: row.measurements || [],
        swcsData: row.swcs_data,
        standardWorkLayoutData: row.standard_work_layout_data,
        facilityLayoutData: row.facility_layout_data,
        folderId: row.folder_id,
        lastModified: row.last_modified
    }));
};

export const getProjectByName = async (projectName) => {
    const row = await supabaseProjects.getProjectByName(projectName);
    if (!row) return null;
    return {
        ...row,
        projectName: row.project_name,
        videoName: row.video_name,
        videoUrl: row.video_url,
        measurements: row.measurements || [],
        swcsData: row.swcs_data,
        standardWorkLayoutData: row.standard_work_layout_data,
        facilityLayoutData: row.facility_layout_data,
        folderId: row.folder_id,
        lastModified: row.last_modified
    };
};

export const updateProject = async (identifier, updates) => {
    // Map UI-friendly keys to DB keys if needed
    const dbUpdates = { ...updates };
    if (updates.projectName) dbUpdates.project_name = updates.projectName;
    if (updates.videoName) dbUpdates.video_name = updates.videoName;
    if (updates.folderId) dbUpdates.folder_id = updates.folderId;
    if (updates.swcsData) dbUpdates.swcs_data = updates.swcsData;
    if (updates.standardWorkLayoutData) dbUpdates.standard_work_layout_data = updates.standardWorkLayoutData;
    if (updates.facilityLayoutData) dbUpdates.facility_layout_data = updates.facilityLayoutData;
    if (updates.videoUrl) dbUpdates.video_url = updates.videoUrl;

    const result = await supabaseProjects.updateProject(identifier, dbUpdates);
    return result.id;
};

export const getProjectById = async (id) => {
    const data = await getAllProjects(); // Simplification: filter from all for now or add direct ID fetch
    return data.find(p => p.id === id) || null;
};

export const deleteProject = async (identifier) => {
    let id = identifier;
    if (typeof identifier === 'string' && !identifier.includes('-')) {
        const p = await getProjectByName(identifier);
        if (!p) return;
        id = p.id;
    }
    return await supabaseProjects.deleteProject(id);
};

export const deleteProjectById = deleteProject;

// ===== FOLDER MANAGEMENT FUNCTIONS =====

export const createFolder = async (name, section = 'projects', parentId = null) => {
    const data = await supabaseProjects.createFolder(name, section, parentId);
    return data.id;
};

export const getFolders = async (section = 'projects', parentId = null) => {
    const data = await supabaseProjects.getFolders(section, parentId);
    return data.map(f => ({ ...f, parentId: f.parent_id }));
};

export const deleteFolder = async (id) => {
    return await supabaseProjects.deleteFolder(id);
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
