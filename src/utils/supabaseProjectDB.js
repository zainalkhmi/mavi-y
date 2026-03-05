/**
 * supabaseProjectDB.js
 * =====================================================
 * Storage layer for MAVi Projects and Folders using Supabase.
 * Replaces Turso/SQLite project management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

const DEFAULT_SUPABASE_VIDEO_BUCKET = 'mavi_assets';
const PROJECT_VIDEO_BUCKET_STORAGE_KEY = 'supabase_project_video_bucket';
const unsupportedProjectColumns = new Set();
let unavailableVideoBucketName = null;
let hasLoggedVideoBucketConfigurationWarning = false;

const extractMissingColumnFromError = (error) => {
    const message = String(error?.message || '');
    const quotedMatch = message.match(/Could not find the '([^']+)' column/i);
    if (quotedMatch?.[1]) return quotedMatch[1];

    const pgMatch = message.match(/column\s+"([^"]+)"\s+does not exist/i);
    if (pgMatch?.[1]) return pgMatch[1];

    return null;
};

const isBucketNotFoundError = (error) => {
    const message = String(error?.message || '').toLowerCase();
    return message.includes('bucket not found') || (message.includes('bucket') && message.includes('not found'));
};

const getVideoBucketConfig = () => {
    const envBucket = typeof import.meta.env?.VITE_SUPABASE_VIDEO_BUCKET === 'string'
        ? import.meta.env.VITE_SUPABASE_VIDEO_BUCKET.trim()
        : '';

    let localBucket = '';
    try {
        localBucket = String(localStorage.getItem(PROJECT_VIDEO_BUCKET_STORAGE_KEY) || '').trim();
    } catch {
        localBucket = '';
    }

    const explicitBucket = envBucket || localBucket;
    return {
        bucket: explicitBucket || DEFAULT_SUPABASE_VIDEO_BUCKET,
        hasExplicitBucket: Boolean(explicitBucket),
        source: envBucket ? 'env' : (localBucket ? 'global_settings' : 'fallback')
    };
};

const canAttemptVideoUpload = () => {
    const { bucket, hasExplicitBucket } = getVideoBucketConfig();

    if (unavailableVideoBucketName && unavailableVideoBucketName === bucket) {
        return false;
    }

    // Reset unavailable marker if bucket changed.
    if (unavailableVideoBucketName && unavailableVideoBucketName !== bucket) {
        unavailableVideoBucketName = null;
    }

    // If bucket is still using default fallback name, treat storage as not configured
    // and skip remote upload to avoid noisy 400 requests.
    if (!hasExplicitBucket) {
        if (!hasLoggedVideoBucketConfigurationWarning) {
            hasLoggedVideoBucketConfigurationWarning = true;
            console.warn(
                `[supabaseProjectDB] VITE_SUPABASE_VIDEO_BUCKET is not set. ` +
                `Skipping remote video upload (bucket fallback: "${bucket}"). ` +
                'You can set it via .env or Global Settings.'
            );
        }
        return false;
    }

    return true;
};

const normalizeUpdateKeys = (updates = {}) => {
    const normalized = { ...updates };

    if ('projectName' in normalized && !('project_name' in normalized)) {
        normalized.project_name = normalized.projectName;
    }
    if ('videoName' in normalized && !('video_name' in normalized)) {
        normalized.video_name = normalized.videoName;
    }
    if ('folderId' in normalized && !('folder_id' in normalized)) {
        normalized.folder_id = normalized.folderId;
    }
    if ('videoUrl' in normalized && !('video_url' in normalized)) {
        normalized.video_url = normalized.videoUrl;
    }
    if ('swcsData' in normalized && !('swcs_data' in normalized)) {
        normalized.swcs_data = normalized.swcsData;
    }
    if ('standardWorkLayoutData' in normalized && !('standard_work_layout_data' in normalized)) {
        normalized.standard_work_layout_data = normalized.standardWorkLayoutData;
    }
    if ('facilityLayoutData' in normalized && !('facility_layout_data' in normalized)) {
        normalized.facility_layout_data = normalized.facilityLayoutData;
    }
    if ('lastModified' in normalized && !('last_modified' in normalized)) {
        normalized.last_modified = normalized.lastModified;
    }

    delete normalized.projectName;
    delete normalized.videoName;
    delete normalized.folderId;
    delete normalized.videoUrl;
    delete normalized.swcsData;
    delete normalized.standardWorkLayoutData;
    delete normalized.facilityLayoutData;
    delete normalized.lastModified;

    return normalized;
};

const UUID_V4_OR_GENERIC_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const resolveProjectIdentifier = (identifier) => {
    if (identifier == null) return null;

    if (typeof identifier === 'object') {
        const objectId = identifier.id ?? identifier.projectId ?? null;
        if (typeof objectId === 'string' && objectId.trim()) {
            return { type: 'id', value: objectId.trim() };
        }

        const objectName = identifier.projectName ?? identifier.project_name ?? null;
        if (typeof objectName === 'string' && objectName.trim()) {
            return { type: 'project_name', value: objectName.trim() };
        }

        return null;
    }

    if (typeof identifier !== 'string') return null;
    const value = identifier.trim();
    if (!value) return null;

    if (UUID_V4_OR_GENERIC_REGEX.test(value)) {
        return { type: 'id', value };
    }

    return { type: 'project_name', value };
};

const executeProjectWriteWithSchemaFallback = async (writeFn, payload, label = 'projects.write') => {
    const payloadToSend = { ...payload };

    // Skip columns already known to be unsupported in the current Supabase schema.
    for (const column of unsupportedProjectColumns) {
        if (column in payloadToSend) {
            delete payloadToSend[column];
        }
    }

    // Retry when local schema cache / DB schema misses one of the optional columns.
    // This keeps project import/save backward compatible with older deployments.
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const result = await writeFn(payloadToSend);
        if (!result?.error) return result;

        const missingColumn = extractMissingColumnFromError(result.error);
        if (!missingColumn || !(missingColumn in payloadToSend)) {
            return result;
        }

        console.warn(`[supabaseProjectDB] ${label}: dropping unsupported column "${missingColumn}" and retrying.`);
        unsupportedProjectColumns.add(missingColumn);
        delete payloadToSend[missingColumn];
    }

    return { data: null, error: new Error('Project write failed after schema fallback retries.') };
};

// ── Folders ──────────────────────────────────────────

/**
 * Fetch folders in a section/parent.
 */
export async function getFolders(section = 'projects', parentId = null) {
    const supabase = getSupabaseClient();
    let query = supabase
        .from('folders')
        .select('*')
        .eq('section', section);

    if (parentId) {
        query = query.eq('parent_id', parentId);
    } else {
        query = query.is('parent_id', null);
    }

    const { data, error } = await query.order('name');
    if (error) throw error;
    return data || [];
}

/**
 * Create a folder.
 */
export async function createFolder(name, section = 'projects', parentId = null) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('folders')
        .insert({ name, section, parent_id: parentId })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a folder.
 */
export async function deleteFolder(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// ── Projects ─────────────────────────────────────────

/**
 * Fetch all projects (optionally filtered by folder).
 */
export async function getAllProjects(folderId = null) {
    const supabase = getSupabaseClient();
    let query = supabase.from('projects').select('*');

    if (folderId) {
        query = query.eq('folder_id', folderId);
    }

    const { data, error } = await query.order('last_modified', { ascending: false });
    if (error) throw error;
    return data || [];
}

/**
 * Get project by name (for legacy support).
 */
export async function getProjectByName(name) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('project_name', name)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Save or Update a project.
 */
export async function saveProject(project) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const payload = {
        project_name: project.projectName,
        video_name: project.videoName,
        folder_id: project.folderId,
        measurements: project.measurements || [],
        narration: project.narration || '',
        video_url: project.videoUrl || null,
        last_modified: now
    };

    // Only include optional columns when value exists,
    // so older DB schemas don't trigger avoidable 400 retries.
    if (project.swcsData != null) payload.swcs_data = project.swcsData;
    if (project.standardWorkLayoutData != null) payload.standard_work_layout_data = project.standardWorkLayoutData;
    if (project.facilityLayoutData != null) payload.facility_layout_data = project.facilityLayoutData;

    const result = project.id
        ? await executeProjectWriteWithSchemaFallback(
            (safePayload) => supabase
                .from('projects')
                .update(safePayload)
                .eq('id', project.id)
                .select()
                .single(),
            payload,
            'saveProject.update'
        )
        : await executeProjectWriteWithSchemaFallback(
            (safePayload) => supabase
                .from('projects')
                .insert({ ...safePayload, created_at: now })
                .select()
                .single(),
            payload,
            'saveProject.insert'
        );

    if (result.error) throw result.error;
    return result.data;
}

/**
 * Update specific project fields.
 */
export async function updateProject(identifier, updates) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const resolvedIdentifier = resolveProjectIdentifier(identifier);

    if (!resolvedIdentifier) {
        throw new Error('updateProject requires a valid project identifier (id or project name).');
    }

    const normalizedUpdates = normalizeUpdateKeys(updates);

    const result = await executeProjectWriteWithSchemaFallback(
        (safeUpdates) => {
            let safeQuery = supabase
                .from('projects')
                .update({ ...safeUpdates, last_modified: safeUpdates.last_modified || now });

            if (resolvedIdentifier.type === 'id') {
                safeQuery = safeQuery.eq('id', resolvedIdentifier.value);
            } else {
                safeQuery = safeQuery.eq('project_name', resolvedIdentifier.value);
            }

            return safeQuery.select().single();
        },
        normalizedUpdates,
        'updateProject'
    );

    if (result.error) throw result.error;
    return result.data;
}

/**
 * Delete a project.
 */
export async function deleteProject(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// ── Storage (Video/Files) ────────────────────────────

/**
 * Upload a video blob to Supabase storage.
 */
export async function uploadVideo(blob, fileName) {
    if (!canAttemptVideoUpload()) {
        return null;
    }

    const { bucket: videoBucket } = getVideoBucketConfig();
    const supabase = getSupabaseClient();
    const filePath = `videos/${Date.now()}_${fileName}`;

    const { error } = await supabase.storage
        .from(videoBucket)
        .upload(filePath, blob);

    if (error) {
        if (isBucketNotFoundError(error)) {
            unavailableVideoBucketName = videoBucket;
            console.warn(
                `[supabaseProjectDB] Storage bucket "${videoBucket}" not found. ` +
                'Skipping video upload and continuing without a remote video URL.'
            );
            return null;
        }

        console.error('Storage Upload Error:', error);
        throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(videoBucket)
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}
