/**
 * supabaseProjectDB.js
 * =====================================================
 * Storage layer for MAVi Projects and Folders using Supabase.
 * Replaces Turso/SQLite project management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

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
        swcs_data: project.swcsData || null,
        standard_work_layout_data: project.standardWorkLayoutData || null,
        facility_layout_data: project.facilityLayoutData || null,
        video_url: project.videoUrl || null,
        last_modified: now
    };

    let result;
    if (project.id) {
        result = await supabase
            .from('projects')
            .update(payload)
            .eq('id', project.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from('projects')
            .insert({ ...payload, created_at: now })
            .select()
            .single();
    }

    if (result.error) throw result.error;
    return result.data;
}

/**
 * Update specific project fields.
 */
export async function updateProject(identifier, updates) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // Support either ID or Name as identifier
    let query = supabase.from('projects').update({ ...updates, last_modified: now });

    if (identifier.includes('-')) { // Likely a UUID
        query = query.eq('id', identifier);
    } else {
        query = query.eq('project_name', identifier);
    }

    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
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
    const supabase = getSupabaseClient();
    const filePath = `videos/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
        .from('mavi_assets')
        .upload(filePath, blob);

    if (error) {
        // If bucket doesn't exist, this will fail. 
        // We'll warn but maybe fallback to local or generic error
        console.error('Storage Upload Error:', error);
        throw error;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('mavi_assets')
        .getPublicUrl(filePath);

    return urlData.publicUrl;
}
