import JSZip from 'jszip';

const DB_NAME = 'mavi_manual_packages';
const DB_VERSION = 1;
const STORE_NAME = 'packages';

const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open manual package DB'));
});

const withStore = async (mode, runner) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const result = runner(store);
        tx.oncomplete = () => {
            db.close();
            resolve(result);
        };
        tx.onerror = () => {
            db.close();
            reject(tx.error || new Error('IndexedDB transaction failed'));
        };
    });
};

export const extractManualIdFromUri = (value = '') => {
    const raw = decodeURIComponent(String(value || '').trim());
    if (!raw) return null;
    if (raw.startsWith('mavi://manual/')) return raw.replace('mavi://manual/', '').trim() || null;
    return raw;
};

const ensureManualId = (manualId) => String(manualId || `mnl_local_${Date.now()}`).trim();

export const createManualPackageBlob = async ({ manualId, guide, metadata = {} }) => {
    const id = ensureManualId(manualId || guide?.cloudId || guide?.kbId || guide?.id);
    const now = new Date().toISOString();
    const zip = new JSZip();

    const manifest = {
        id,
        title: guide?.title || 'Untitled Manual',
        version: guide?.version || '1.0',
        updatedAt: now,
        offlineUri: `mavi://manual/${id}`,
        ...metadata
    };

    zip.file('manifest.json', JSON.stringify(manifest, null, 2));
    zip.file('manual.json', JSON.stringify(guide || {}, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    return { id, manifest, blob, updatedAt: now };
};

export const saveManualPackageLocal = async ({ manualId, guide, metadata = {} }) => {
    const pkg = await createManualPackageBlob({ manualId, guide, metadata });
    await withStore('readwrite', (store) => {
        store.put({
            id: pkg.id,
            title: pkg.manifest.title,
            version: pkg.manifest.version,
            updatedAt: pkg.updatedAt,
            manifest: pkg.manifest,
            blob: pkg.blob,
            size: pkg.blob.size
        });
    });
    return pkg;
};

export const listManualPackagesLocal = async () => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
            const rows = (req.result || [])
                .map((r) => ({ id: r.id, title: r.title, version: r.version, updatedAt: r.updatedAt, manifest: r.manifest, size: r.size, source: 'local-zip' }))
                .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
            resolve(rows);
        };
        req.onerror = () => reject(req.error || new Error('Failed to list manual packages'));
        tx.oncomplete = () => db.close();
    });
};

export const getManualPackageLocal = async (manualIdOrUri) => {
    const id = extractManualIdFromUri(manualIdOrUri);
    if (!id) return null;
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = async () => {
            const row = req.result;
            if (!row) return resolve(null);
            const zip = await JSZip.loadAsync(row.blob);
            const manualText = await zip.file('manual.json')?.async('string');
            const manual = manualText ? JSON.parse(manualText) : null;
            resolve({ ...row, manual });
        };
        req.onerror = () => reject(req.error || new Error('Failed to get manual package'));
        tx.oncomplete = () => db.close();
    });
};

export const deleteManualPackageLocal = async (manualIdOrUri) => {
    const id = extractManualIdFromUri(manualIdOrUri);
    if (!id) return false;

    await withStore('readwrite', (store) => {
        store.delete(id);
    });

    return true;
};

export const exportManualPackageZip = async (manualIdOrUri) => {
    const row = await getManualPackageLocal(manualIdOrUri);
    if (!row) throw new Error('Manual package not found in local storage');
    return { blob: row.blob, fileName: `${row.title || row.id}.zip` };
};

export const importManualPackageZip = async (zipFile) => {
    const zip = await JSZip.loadAsync(zipFile);
    const manifestText = await zip.file('manifest.json')?.async('string');
    const manualText = await zip.file('manual.json')?.async('string');
    if (!manifestText || !manualText) throw new Error('Invalid manual zip package');
    const manifest = JSON.parse(manifestText);
    const id = ensureManualId(manifest?.id);
    const blob = zipFile instanceof Blob ? zipFile : await zip.generateAsync({ type: 'blob' });

    await withStore('readwrite', (store) => {
        store.put({
            id,
            title: manifest?.title || id,
            version: manifest?.version || '1.0',
            updatedAt: manifest?.updatedAt || new Date().toISOString(),
            manifest: { ...manifest, id },
            blob,
            size: blob.size
        });
    });

    return { id, manifest: { ...manifest, id } };
};
