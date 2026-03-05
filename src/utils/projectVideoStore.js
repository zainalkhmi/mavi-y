const DB_NAME = 'mavi_project_videos';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

const openDb = () => new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'projectName' });
        }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open project video DB'));
});

const withStore = async (mode, runner) => {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        runner(store, resolve, reject);
        tx.oncomplete = () => db.close();
        tx.onerror = () => {
            db.close();
            reject(tx.error || new Error('IndexedDB transaction failed'));
        };
    });
};

export const saveProjectVideoBlob = async (projectName, videoBlob) => {
    if (!projectName || !(videoBlob instanceof Blob)) return;
    await withStore('readwrite', (store, resolve) => {
        store.put({ projectName, videoBlob, updatedAt: new Date().toISOString() });
        resolve(true);
    });
};

export const getProjectVideoBlob = async (projectName) => {
    if (!projectName) return null;
    return await withStore('readonly', (store, resolve, reject) => {
        const req = store.get(projectName);
        req.onsuccess = () => resolve(req.result?.videoBlob || null);
        req.onerror = () => reject(req.error || new Error('Failed to load project video blob'));
    });
};

export const deleteProjectVideoBlob = async (projectName) => {
    if (!projectName) return;
    await withStore('readwrite', (store, resolve) => {
        store.delete(projectName);
        resolve(true);
    });
};

export const renameProjectVideoBlob = async (oldProjectName, newProjectName) => {
    if (!oldProjectName || !newProjectName || oldProjectName === newProjectName) return;
    const blob = await getProjectVideoBlob(oldProjectName);
    if (!blob) return;
    await saveProjectVideoBlob(newProjectName, blob);
    await deleteProjectVideoBlob(oldProjectName);
};
