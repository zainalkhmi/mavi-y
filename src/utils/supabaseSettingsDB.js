/**
 * supabaseSettingsDB.js
 * =====================================================
 * Storage layer for MAVi Admin Settings (Installers, Menu Visibility) using Supabase.
 * Replaces Turso-based admin management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

// ── Cloud Installers ─────────────────────────────────

/**
 * Fetch all cloud installers.
 */
export async function getAllCloudInstallers() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('cloud_installers')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Get the latest installer (Landing Page).
 */
export async function getLatestCloudInstaller() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('cloud_installers')
        .select('*')
        .eq('is_latest', true)
        .maybeSingle();

    if (error) throw error;
    return data;
}

/**
 * Save/Update an installer.
 */
export async function saveCloudInstaller(installer) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    // If marked as latest, unmark others
    if (installer.is_latest) {
        await supabase
            .from('cloud_installers')
            .update({ is_latest: false })
            .neq('id', installer.id || '00000000-0000-0000-0000-000000000000');
    }

    const payload = {
        name: installer.name,
        version: installer.version || '',
        platform: installer.platform || 'windows',
        url: installer.url,
        is_latest: !!installer.is_latest,
        updated_at: now
    };

    let result;
    if (installer.id) {
        result = await supabase
            .from('cloud_installers')
            .update(payload)
            .eq('id', installer.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from('cloud_installers')
            .insert({ ...payload, created_at: now })
            .select()
            .single();
    }

    if (result.error) throw result.error;
    return result.data;
}

/**
 * Delete an installer.
 */
export async function deleteCloudInstaller(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('cloud_installers')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

// ── Menu Visibility ──────────────────────────────────

/**
 * Fetch all menu visibility settings.
 */
export async function getMenuVisibilitySettings() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('menu_visibility')
        .select('*');

    if (error) throw error;
    // Format into map { [path]: visible }
    return (data || []).reduce((acc, item) => {
        acc[item.path] = item.visible;
        return acc;
    }, {});
}

/**
 * Update visibility for a specific path.
 */
export async function upsertMenuVisibility(path, visible) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('menu_visibility')
        .upsert({ path, visible, updated_at: new Date().toISOString() })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Bulk update visibility.
 */
export async function bulkUpsertMenuVisibility(visibilityMap) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const rows = Object.entries(visibilityMap).map(([path, visible]) => ({
        path,
        visible,
        updated_at: now
    }));

    const { error } = await supabase
        .from('menu_visibility')
        .upsert(rows);

    if (error) throw error;
    return true;
}

/**
 * Reset all visibility to visible.
 */
export async function resetMenuVisibilityToDefault(paths) {
    const visibilityMap = paths.reduce((acc, path) => {
        acc[path] = true;
        return acc;
    }, {});
    return bulkUpsertMenuVisibility(visibilityMap);
}
