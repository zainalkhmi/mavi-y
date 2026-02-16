import { importProject } from './projectExport';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata https://www.googleapis.com/auth/drive';
const GSI_SRC = 'https://accounts.google.com/gsi/client';

const STORAGE_KEYS = {
    settings: 'google_drive_settings',
    oauthToken: 'google_drive_oauth_token',
    oauthExpiry: 'google_drive_oauth_expiry'
};

const DEFAULT_SETTINGS = {
    enabled: false,
    mode: 'auto', // auto | oauth | service_account
    clientId: '',
    defaultFolderId: '',
    serviceTokenEndpoint: ''
};

const readJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};

const writeJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

export const getGoogleDriveSettings = () => {
    const saved = readJson(STORAGE_KEYS.settings, {});
    return { ...DEFAULT_SETTINGS, ...saved };
};

export const saveGoogleDriveSettings = (nextSettings) => {
    const merged = { ...DEFAULT_SETTINGS, ...nextSettings };
    writeJson(STORAGE_KEYS.settings, merged);
    return merged;
};

export const isGoogleDriveEnabled = () => {
    const settings = getGoogleDriveSettings();
    return !!settings.enabled;
};

export const signOutGoogleDrive = () => {
    localStorage.removeItem(STORAGE_KEYS.oauthToken);
    localStorage.removeItem(STORAGE_KEYS.oauthExpiry);
};

export const getStoredGoogleToken = () => {
    const token = localStorage.getItem(STORAGE_KEYS.oauthToken);
    const expiry = Number(localStorage.getItem(STORAGE_KEYS.oauthExpiry) || 0);
    return { token, expiry };
};

const ensureGoogleIdentityScript = async () => {
    if (window.google?.accounts?.oauth2) return;

    await new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
        if (existing) {
            existing.addEventListener('load', resolve, { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = GSI_SRC;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google Identity script'));
        document.head.appendChild(script);
    });

    if (!window.google?.accounts?.oauth2) {
        throw new Error('Google Identity SDK not available');
    }
};

const getServiceAccountToken = async () => {
    const settings = getGoogleDriveSettings();
    if (!settings.serviceTokenEndpoint) {
        throw new Error('Service Account token endpoint is not configured');
    }

    const response = await fetch(settings.serviceTokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: DRIVE_SCOPE })
    });

    if (!response.ok) {
        throw new Error(`Service token request failed: ${response.status}`);
    }

    const data = await response.json();
    const token = data.access_token || data.token;
    if (!token) {
        throw new Error('Service endpoint did not return access_token');
    }
    return token;
};

export const signInGoogleDrive = async () => {
    const settings = getGoogleDriveSettings();
    if (!settings.clientId) {
        throw new Error('Google Client ID belum diisi di Settings');
    }

    await ensureGoogleIdentityScript();

    const tokenResponse = await new Promise((resolve, reject) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: settings.clientId,
            scope: DRIVE_SCOPE,
            callback: (resp) => {
                if (resp?.error) {
                    reject(new Error(resp.error_description || resp.error));
                    return;
                }
                resolve(resp);
            }
        });

        tokenClient.requestAccessToken({ prompt: 'consent' });
    });

    const expiresAt = Date.now() + ((tokenResponse.expires_in || 3600) * 1000);
    localStorage.setItem(STORAGE_KEYS.oauthToken, tokenResponse.access_token);
    localStorage.setItem(STORAGE_KEYS.oauthExpiry, String(expiresAt));
    return tokenResponse.access_token;
};

export const getGoogleDriveAccessToken = async ({ interactive = false } = {}) => {
    const settings = getGoogleDriveSettings();

    if (!settings.enabled) {
        throw new Error('Google Drive integration is disabled');
    }

    const { token, expiry } = getStoredGoogleToken();
    const hasValidToken = token && Date.now() < (expiry - 15000);

    if (settings.mode !== 'service_account') {
        if (hasValidToken) return token;
        if (interactive) {
            return await signInGoogleDrive();
        }
    }

    if (settings.mode === 'oauth') {
        throw new Error('OAuth token is missing/expired. Please Sign In first.');
    }

    return await getServiceAccountToken();
};

const driveApi = async (path, options = {}) => {
    const token = await getGoogleDriveAccessToken({ interactive: options.interactive || false });
    const response = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Google Drive API error ${response.status}: ${errText}`);
    }

    return response;
};

export const listGoogleDriveProjectFiles = async () => {
    const settings = getGoogleDriveSettings();
    const folderFilter = settings.defaultFolderId
        ? ` and '${settings.defaultFolderId}' in parents`
        : '';

    const q = encodeURIComponent(`mimeType='application/zip' and trashed=false${folderFilter}`);
    const fields = encodeURIComponent('files(id,name,createdTime,modifiedTime,size,webViewLink,owners(displayName,emailAddress))');

    const resp = await driveApi(`/files?q=${q}&fields=${fields}&orderBy=modifiedTime desc`, {
        interactive: false
    });
    const data = await resp.json();
    return data.files || [];
};

export const uploadProjectZipToGoogleDrive = async (zipBlob, filename, folderId = null) => {
    const settings = getGoogleDriveSettings();
    const parentId = folderId || settings.defaultFolderId || null;

    const metadata = {
        name: filename,
        mimeType: 'application/zip',
        appProperties: {
            source: 'mavi-y',
            type: 'project-zip'
        }
    };

    if (parentId) metadata.parents = [parentId];

    const boundary = 'mavi_boundary_' + Date.now();
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const filePartHeader = `${delimiter}Content-Type: application/zip\r\n\r\n`;

    const body = new Blob([metadataPart, filePartHeader, zipBlob, closeDelimiter], {
        type: `multipart/related; boundary=${boundary}`
    });

    const token = await getGoogleDriveAccessToken({ interactive: true });
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,modifiedTime,size', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
    });

    if (!uploadResponse.ok) {
        const errText = await uploadResponse.text().catch(() => 'Unknown error');
        throw new Error(`Upload failed (${uploadResponse.status}): ${errText}`);
    }

    return await uploadResponse.json();
};

export const downloadGoogleDriveFileBlob = async (fileId) => {
    const token = await getGoogleDriveAccessToken({ interactive: false });
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Download failed (${response.status}): ${errText}`);
    }

    return await response.blob();
};

export const importProjectFromGoogleDriveFile = async (fileId) => {
    const blob = await downloadGoogleDriveFileBlob(fileId);
    const file = new File([blob], `drive_${fileId}.zip`, { type: 'application/zip' });
    return await importProject(file);
};

export const shareGoogleDriveFileWithEmail = async (fileId, emailAddress, role = 'reader') => {
    const resp = await driveApi(`/files/${fileId}/permissions`, {
        method: 'POST',
        interactive: true,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'user',
            role,
            emailAddress
        })
    });

    return await resp.json();
};

export const createGoogleDriveShareLink = async (fileId, role = 'reader') => {
    await driveApi(`/files/${fileId}/permissions`, {
        method: 'POST',
        interactive: true,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            type: 'anyone',
            role
        })
    });

    const fileResp = await driveApi(`/files/${fileId}?fields=id,name,webViewLink,webContentLink`, {
        interactive: false
    });
    return await fileResp.json();
};
