/**
 * supabaseLicenseDB.js
 * =====================================================
 * Storage layer for MAVi Licenses and Requests using Supabase.
 * Replaces Turso-based license management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

// ── Helpers ──────────────────────────────────────────

/**
 * Get basic network context for logging/binding.
 */
export async function getClientNetworkContext() {
    try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        return {
            ip: data.ip || '0.0.0.0',
            country: data.country_name || 'Unknown'
        };
    } catch {
        return { ip: '0.0.0.0', country: 'XX' };
    }
}

// ── Licenses ─────────────────────────────────────────

/**
 * Fetch all licenses.
 */
export async function getAllLicenses() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create a new license key.
 */
export async function createLicense(key, email, machineId = '') {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('licenses')
        .insert({
            key_string: key,
            email: email,
            machine_id: machineId,
            status: 'active',
            type: 'permanent',
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update license status or metadata.
 */
export async function updateLicense(id, updates) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('licenses')
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
 * Delete a license.
 */
export async function deleteLicense(id) {
    const supabase = getSupabaseClient();
    const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', id);

    if (error) throw error;
    return true;
}

/**
 * Validate and bind a license to a machine (LicenseGuard logic).
 */
export async function validateAndBindLicense(key, context) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data: license, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('key_string', key)
        .maybeSingle();

    if (fetchError) return { ok: false, status: 'error', message: fetchError.message };
    if (!license) return { ok: false, status: 'not_found' };
    if (license.status !== 'active') return { ok: false, status: 'inactive' };

    // Check if hardware-locked
    if (license.bound_machine_id && license.bound_machine_id !== context.machineId) {
        return { ok: false, status: 'blocked_new_device', message: 'License is bound to another device.' };
    }

    // Bind if not yet bound
    if (!license.bound_machine_id) {
        const { error: bindError } = await supabase
            .from('licenses')
            .update({
                bound_machine_id: context.machineId,
                bound_ip: context.ip,
                bound_country: context.country,
                last_active_at: now,
                updated_at: now
            })
            .eq('id', license.id);

        if (bindError) return { ok: false, status: 'error', message: bindError.message };
    } else {
        // Just update last active
        await supabase
            .from('licenses')
            .update({ last_active_at: now })
            .eq('id', license.id);
    }

    return { ok: true, status: 'active' };
}

// ── License Requests ─────────────────────────────────

/**
 * Fetch all license requests.
 */
export async function getAllLicenseRequests() {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('license_requests')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Create a new license request (Landing Page).
 */
export async function createLicenseRequest(request) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('license_requests')
        .insert({
            email: request.email,
            machine_id: request.machine_id,
            note: request.note || '',
            status: 'pending',
            created_at: now,
            updated_at: now
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

/**
 * Update request status (Admin Panel).
 */
export async function updateLicenseRequestStatus(id, newStatus) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();

    const { data, error } = await supabase
        .from('license_requests')
        .update({
            status: newStatus,
            updated_at: now
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;
    return data;
}
