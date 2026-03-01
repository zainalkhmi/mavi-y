/**
 * supabaseYouTubeDB.js
 * =====================================================
 * Storage layer for YouTube training links using Supabase.
 * Replaces Turso-based YouTube management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

/**
 * Fetch all YouTube links.
 * @returns {Array}
 */
export async function getAllYouTubeLinks() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('youtube_links')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Search YouTube links by title or description.
 * @param {string} query 
 */
export async function searchYouTubeLinks(query) {
    if (!query) return getAllYouTubeLinks();

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('youtube_links')
        .select('*')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create a new YouTube link.
 * @param {object} link 
 */
export async function createYouTubeLink(link) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('youtube_links')
        .insert({
            title: link.title || 'Untitled Video',
            url: link.url || '',
            description: link.description || '',
            category: link.category || '',
            module_id: link.module_id || '',
            lesson_id: link.lesson_id || '',
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update an existing YouTube link.
 * @param {string} id 
 * @param {object} updates 
 */
export async function updateYouTubeLink(id, updates) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('youtube_links')
        .update({
            ...updates,
            updated_at: now
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Delete a YouTube link.
 * @param {string} id 
 */
export async function deleteYouTubeLink(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('youtube_links')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}
