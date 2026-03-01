/**
 * tursoAPI.js — STUB (DEPRECATED)
 * ====================================
 * This file is kept as a compatibility shim.
 * Turso has been fully replaced by Supabase for Manual Creation storage.
 *
 * Functions in this stub return empty/no-op results so that dependent
 * components (AdminPanel, KnowledgeBase, MainMenu, etc.) do not crash.
 * Those components should be migrated to Supabase in future updates.
 *
 * For Manual Creation storage, use supabaseManualDB.js.
 */
import { getTursoClient } from './tursoClient.js';

// ── Helpers ──────────────────────────────────────────
const noop = async () => null;
const noopList = async () => [];
const noopBool = async () => false;

// ── Manuals (now handled by supabaseManualDB.js) ─────
export const upsertManual = async () => {
    console.warn('[tursoAPI] upsertManual: Use supabaseManualDB.upsertManual instead.');
    return { id: null, cloudId: null };
};

export const listManuals = async () => {
    console.warn('[tursoAPI] listManuals: Use supabaseManualDB.listManuals instead.');
    return [];
};

export const getManualByCloudId = async () => null;
export const getManualById = async () => null;
export const appendManualAcknowledgement = noop;
export const appendManualDataCapture = noop;

// ── Licenses ─────────────────────────────────────────
export const createLicense = noop;
export const getAllLicenses = noopList;
export const getLicenseByKey = async () => null;
export const getLicenseById = async () => null;
export const updateLicense = noopBool;
export const deleteLicense = noopBool;
export const searchLicenses = noopList;
export const getLicensesByStatus = noopList;
export const validateAndBindLicense = async () => ({
    ok: false,
    status: 'error',
    message: 'Turso license validation is not available (Migrated to Supabase/Deprecated).'
});
export const validateAndBindLicenseLegacy = validateAndBindLicense;

// ── License Requests ───────────────────────────────
export const createLicenseRequest = noop;
export const getAllLicenseRequests = noopList;
export const updateLicenseRequestStatus = noop;
export const getLicenseRequestByEmail = async () => null;

// ── YouTube Links ─────────────────────────────────
export const getAllYouTubeLinks = noopList;
export const createYouTubeLink = noop; // Match AdminYouTubeManager import
export const addYouTubeLink = noop;
export const updateYouTubeLink = noop;
export const deleteYouTubeLink = noop;
export const searchYouTubeLinks = noopList;

// ── Cloud Installers ──────────────────────────────
export const getLatestCloudInstaller = async () => null;
export const getAllCloudInstallers = noopList;
export const saveCloudInstaller = noop;
export const deleteCloudInstaller = noop;

// ── Menu Visibility ───────────────────────────────
export const getMenuVisibilitySettings = async () => ({});
export const setMenuVisibility = noop;
export const batchSetMenuVisibility = noop;
export const upsertMenuVisibility = noop;       // Match AdminPanel import
export const bulkUpsertMenuVisibility = noop;    // Match AdminPanel import
export const resetMenuVisibilityToDefault = noop; // Match AdminPanel import

// ── Network / Misc ────────────────────────────────
export const getClientNetworkContext = async () => ({ ip: '0.0.0.0', country: 'XX' });

