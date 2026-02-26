const SUPABASE_STORAGE_KEY = 'supabase_storage_settings';

const DEFAULT_SETTINGS = {
    enabled: false,
    url: '',
    anonKey: '',
    bucket: 'manual-media',
    folder: 'manuals'
};

const normalizeBaseUrl = (value = '') => String(value || '').trim().replace(/\/+$/, '');

export const getSupabaseSettings = () => {
    try {
        const raw = localStorage.getItem(SUPABASE_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        const parsed = JSON.parse(raw);
        return {
            ...DEFAULT_SETTINGS,
            ...parsed,
            url: normalizeBaseUrl(parsed?.url || ''),
            bucket: String(parsed?.bucket || DEFAULT_SETTINGS.bucket).trim() || DEFAULT_SETTINGS.bucket,
            folder: String(parsed?.folder || DEFAULT_SETTINGS.folder).trim() || DEFAULT_SETTINGS.folder
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
};

export const saveSupabaseSettings = (settings = {}) => {
    const next = {
        ...DEFAULT_SETTINGS,
        ...settings,
        url: normalizeBaseUrl(settings?.url || ''),
        bucket: String(settings?.bucket || DEFAULT_SETTINGS.bucket).trim() || DEFAULT_SETTINGS.bucket,
        folder: String(settings?.folder || DEFAULT_SETTINGS.folder).trim() || DEFAULT_SETTINGS.folder
    };
    localStorage.setItem(SUPABASE_STORAGE_KEY, JSON.stringify(next));
    return next;
};

export const isSupabaseConfigured = () => {
    const cfg = getSupabaseSettings();
    return Boolean(cfg.enabled && cfg.url && cfg.anonKey && cfg.bucket);
};

const parseDataUrl = (dataUrl) => {
    const raw = String(dataUrl || '');
    const match = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error('Invalid data URL format');
    const [, mimeType, base64] = match;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return { mimeType, bytes };
};

const buildStoragePath = (path = '') => String(path || '').replace(/^\/+/, '');

export const uploadDataUrlToSupabase = async (path, dataUrl, overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey || !cfg.bucket) {
        throw new Error('Supabase settings incomplete');
    }

    const cleanPath = buildStoragePath(path);
    const { mimeType, bytes } = parseDataUrl(dataUrl);
    const endpoint = `${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
            'Content-Type': mimeType,
            'x-upsert': 'true'
        },
        body: bytes
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Supabase upload failed (${response.status})`);
    }

    return `${cfg.url}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
};

export const uploadBlobToSupabase = async (path, blob, contentType = null, overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey || !cfg.bucket) {
        throw new Error('Supabase settings incomplete');
    }

    const cleanPath = buildStoragePath(path);
    const endpoint = `${cfg.url}/storage/v1/object/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`,
            'Content-Type': contentType || blob?.type || 'application/octet-stream',
            'x-upsert': 'true'
        },
        body: blob
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Supabase upload failed (${response.status})`);
    }

    return `${cfg.url}/storage/v1/object/public/${encodeURIComponent(cfg.bucket)}/${cleanPath}`;
};

export const testSupabaseConnection = async (overrideSettings = null) => {
    const cfg = overrideSettings || getSupabaseSettings();
    if (!cfg.url || !cfg.anonKey) throw new Error('Supabase URL / Anon Key is required');

    const response = await fetch(`${cfg.url}/storage/v1/bucket`, {
        headers: {
            apikey: cfg.anonKey,
            Authorization: `Bearer ${cfg.anonKey}`
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Connection failed (${response.status})`);
    }

    return true;
};
