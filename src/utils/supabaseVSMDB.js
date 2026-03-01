/**
 * supabaseVSMDB.js
 * =====================================================
 * Storage layer for MAVi VSM Data using Supabase.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

export async function saveVSM(name, data, thumbnail = null, folderId = null) {
    const supabase = getSupabaseClient();
    const payload = {
        name,
        data: data,
        thumbnail,
        folder_id: folderId,
        updated_at: new Date().toISOString()
    };

    let result;
    if (data.id && typeof data.id === 'string' && data.id.includes('-')) {
        result = await supabase.from('vsm_data').update(payload).eq('id', data.id).select().single();
    } else {
        result = await supabase.from('vsm_data').insert({ ...payload, created_at: new Date().toISOString() }).select().single();
    }

    if (result.error) throw result.error;
    return result.data;
}

export async function getAllVSMItems(folderId = null) {
    const supabase = getSupabaseClient();
    let query = supabase.from('vsm_data').select('*');
    if (folderId) {
        query = query.eq('folder_id', folderId);
    } else {
        query = query.is('folder_id', null);
    }

    const { data: rows, error } = await query.order('updated_at', { ascending: false });
    if (error) throw error;
    return rows || [];
}

export async function getVSMById(id) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.from('vsm_data').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
}

export async function deleteVSM(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('vsm_data').delete().eq('id', id);
    if (error) throw error;
    return true;
}
