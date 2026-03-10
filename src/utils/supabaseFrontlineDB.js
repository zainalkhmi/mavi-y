import { getSupabaseClient } from './supabaseManualDB.js';

/**
 * supabaseFrontlineDB.js
 * Utility functions for custom frontline apps.
 */

export async function getAllFrontlineApps() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('frontline_apps')
        .select('*')
        .order('name');
    if (error) throw error;
    return data || [];
}

export async function saveFrontlineApp(app) {
    const supabase = getSupabaseClient();
    const payload = {
        name: app.name,
        config: app.config || { components: [] },
        updated_at: new Date().toISOString()
    };

    let result;
    if (app.id) {
        result = await supabase
            .from('frontline_apps')
            .update(payload)
            .eq('id', app.id)
            .select()
            .single();
    } else {
        result = await supabase
            .from('frontline_apps')
            .insert({ ...payload, created_at: new Date().toISOString() })
            .select()
            .single();
    }

    if (result.error) throw result.error;
    return result.data;
}

export async function deleteFrontlineApp(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('frontline_apps')
        .delete()
        .eq('id', id);
    if (error) throw error;
    return true;
}

export async function getProductionQueue() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('production_queue')
        .select('*')
        .eq('status', 'PENDING')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
}
