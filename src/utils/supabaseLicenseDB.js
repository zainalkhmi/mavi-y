/**
 * supabaseLicenseDB.js
 * =====================================================
 * Storage layer for MAVi Licenses and Requests using Supabase.
 * Replaces Turso-based license management.
 * =====================================================
 */
import { getSupabaseClient } from './supabaseManualDB.js';

const isMissingColumnError = (error) => {
    const msg = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return msg.includes('column') && (msg.includes('does not exist') || msg.includes('could not find'));
};

const resolveLicenseIdentifier = (licenseOrId) => {
    if (licenseOrId && typeof licenseOrId === 'object') {
        if (licenseOrId.id !== undefined && licenseOrId.id !== null && String(licenseOrId.id).trim() !== '') {
            return { column: 'id', value: licenseOrId.id };
        }
        if (licenseOrId.key_id !== undefined && licenseOrId.key_id !== null && String(licenseOrId.key_id).trim() !== '') {
            return { column: 'key_id', value: licenseOrId.key_id };
        }
        if (licenseOrId.key_string !== undefined && licenseOrId.key_string !== null && String(licenseOrId.key_string).trim() !== '') {
            return { column: 'key_string', value: licenseOrId.key_string };
        }
        return null;
    }

    if (licenseOrId !== undefined && licenseOrId !== null && String(licenseOrId).trim() !== '') {
        return { column: 'id', value: licenseOrId };
    }

    return null;
};

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

    const fullInsert = await supabase
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

    if (!fullInsert.error) return fullInsert.data;

    // Backward compatibility: older schema may not have email/machine_id/updated_at columns.
    if (isMissingColumnError(fullInsert.error)) {
        const legacyInsert = await supabase
            .from('licenses')
            .insert({
                key_string: key,
                status: 'active',
                type: 'permanent',
                created_at: now
            })
            .select()
            .single();

        if (legacyInsert.error) throw legacyInsert.error;
        return legacyInsert.data;
    }

    throw fullInsert.error;
}

/**
 * Update license status or metadata.
 */
export async function updateLicense(id, updates) {
    const supabase = getSupabaseClient();
    const now = new Date().toISOString();
    const identifier = resolveLicenseIdentifier(id);
    if (!identifier) throw new Error('License identifier is required for updateLicense');

    let query = supabase
        .from('licenses')
        .update({
            ...updates,
            updated_at: now
        });

    query = query.eq(identifier.column, identifier.value);

    const { data, error } = await query.select().single();

    if (error) throw error;
    return data;
}

/**
 * Delete a license.
 */
export async function deleteLicense(id) {
    const supabase = getSupabaseClient();
    const identifier = resolveLicenseIdentifier(id);
    if (!identifier) throw new Error('License identifier is required for deleteLicense');

    const { error } = await supabase
        .from('licenses')
        .delete()
        .eq(identifier.column, identifier.value);

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
        const identifier = resolveLicenseIdentifier(license);
        if (!identifier) return { ok: false, status: 'error', message: 'License identifier missing on bind update.' };

        const { error: bindError } = await supabase
            .from('licenses')
            .update({
                bound_machine_id: context.machineId,
                bound_ip: context.ip,
                bound_country: context.country,
                last_active_at: now,
                updated_at: now
            })
            .eq(identifier.column, identifier.value);

        if (bindError) return { ok: false, status: 'error', message: bindError.message };
    } else {
        // Just update last active
        const identifier = resolveLicenseIdentifier(license);
        if (!identifier) return { ok: false, status: 'error', message: 'License identifier missing on heartbeat update.' };

        await supabase
            .from('licenses')
            .update({ last_active_at: now })
            .eq(identifier.column, identifier.value);
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
    const normalizedMachineId = request.machine_id || request.machineId || '';

    const { data, error } = await supabase
        .from('license_requests')
        .insert({
            email: request.email,
            machine_id: normalizedMachineId,
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
