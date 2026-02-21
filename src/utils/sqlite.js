import Database from '@tauri-apps/plugin-sql';

let db = null;
let sqlite3 = null;

const SCHEMA_QUERIES = [
  `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectName TEXT UNIQUE,
        videoBlob BLOB,
        videoName TEXT,
        measurements TEXT,
        createdAt TEXT,
        lastModified TEXT,
        folderId INTEGER,
        swcsData TEXT,
        standardWorkLayoutData TEXT,
        facilityLayoutData TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        videoName TEXT,
        timestamp TEXT,
        measurements TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        section TEXT,
        parentId INTEGER,
        createdAt TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS cameras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        projectId INTEGER,
        config TEXT
    );`,
  `CREATE TABLE IF NOT EXISTS license (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activation_key TEXT,
        activated_at TEXT,
        is_active BOOLEAN
    );`,
  `CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        type TEXT,
        category TEXT,
        industry TEXT,
        cloudId TEXT,
        createdAt TEXT,
        updatedAt TEXT,
        syncStatus TEXT,
        viewCount INTEGER DEFAULT 0,
        usageCount INTEGER DEFAULT 0,
        averageRating REAL DEFAULT 0,
        ratingCount INTEGER DEFAULT 0
    );`,
  `CREATE TABLE IF NOT EXISTS kb_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kbId INTEGER,
        tag TEXT,
        FOREIGN KEY (kbId) REFERENCES knowledge_base (id) ON DELETE CASCADE
    );`,
  `CREATE TABLE IF NOT EXISTS kb_ratings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        kbId INTEGER,
        rating INTEGER,
        feedback TEXT,
        createdAt TEXT,
        FOREIGN KEY (kbId) REFERENCES knowledge_base (id) ON DELETE CASCADE
    );`,
  `CREATE TABLE IF NOT EXISTS datasets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        zipBlob BLOB,
        projectName TEXT,
        clipId TEXT,
        folderId INTEGER,
        createdAt TEXT,
        size INTEGER
    );`,
  `CREATE TABLE IF NOT EXISTS app_installers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        fileBlob BLOB,
        version TEXT,
        uploadedAt TEXT,
        size INTEGER
    );`,
  `CREATE TABLE IF NOT EXISTS vsm_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        data TEXT,
        thumbnail TEXT,
        createdAt TEXT,
        lastModified TEXT,
        folderId INTEGER
    );`,
  `CREATE TABLE IF NOT EXISTS dynamic_translations (
        key TEXT PRIMARY KEY,
        en TEXT,
        id TEXT,
        ja TEXT
    );`
];

// Initialize the database and create tables
let worker = null;
let pendingRequests = new Map();
let requestIdCounter = 0;
let initPromise = null;
let workerStorageMode = 'WASM (Worker)';

export const getSqliteDb = async () => {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    // Environment safety check: Fallback to SQLite WASM for browsers
    if (typeof window !== 'undefined' && !window.__TAURI_INTERNALS__) {
      console.info('Using SQLite WASM (Worker) for persistence');

      return new Promise((resolve, reject) => {
        try {
          if (!worker) {
            worker = new Worker(new URL('./sqlite-worker.js', import.meta.url), { type: 'module' });

            worker.onmessage = (e) => {
              const { id, type, result, error } = e.data;

              if (type === 'ready') {
                console.log('SQLite WASM Worker ready');
                workerStorageMode = e.data?.mode || 'WASM (Worker)';
                if (String(workerStorageMode).toLowerCase().includes('transient')) {
                  console.warn('[SQLite] Running in transient storage mode. Data may not persist after reload.');
                }
                db = {
                  execute: (sql, params = []) => {
                    const id = requestIdCounter++;
                    return new Promise((res, rej) => {
                      pendingRequests.set(id, { resolve: res, reject: rej });
                      worker.postMessage({ id, type: 'execute', sql, params });
                    });
                  },
                  select: (sql, params = []) => {
                    const id = requestIdCounter++;
                    return new Promise((res, rej) => {
                      pendingRequests.set(id, { resolve: res, reject: rej });
                      worker.postMessage({ id, type: 'select', sql, params });
                    });
                  },
                  getStatus: () => ({
                    isConfigured: false,
                    isOnline: navigator.onLine,
                    mode: workerStorageMode
                  }),
                  syncToCloud: async () => ({ success: false, message: 'Cloud sync removed' })
                };
                resolve(db);
              } else if (id !== undefined) {
                const pending = pendingRequests.get(id);
                if (pending) {
                  pendingRequests.delete(id);
                  if (error) pending.reject(new Error(error));
                  else pending.resolve(result);
                }
              } else if (type === 'error') {
                console.error('SQLite Worker initialization error:', error);
                initPromise = null; // Allow retry
                reject(new Error(error));
              }
            };

            worker.onerror = (err) => {
              console.error('SQLite Worker hard error:', err);
              initPromise = null; // Allow retry
              reject(err);
            };

            worker.postMessage({ type: 'init' });
          }
        } catch (e) {
          console.error('Failed to spawn SQLite Worker:', e);
          initPromise = null;
          // Fallback empty DB
          resolve({
            execute: async () => ({ lastInsertId: 0 }),
            select: async () => [],
            getStatus: () => ({ isConfigured: false, isOnline: false, mode: 'Error' })
          });
        }
      });
    }

    try {
      console.info('Using Tauri SQL Plugin for persistence');
      const tauriDb = await Database.load('sqlite:motion.db');

      for (const query of SCHEMA_QUERIES) {
        await tauriDb.execute(query);
      }

      try { await tauriDb.execute(`ALTER TABLE projects ADD COLUMN swcsData TEXT;`); } catch (e) { }
      try { await tauriDb.execute(`ALTER TABLE projects ADD COLUMN standardWorkLayoutData TEXT;`); } catch (e) { }
      try { await tauriDb.execute(`ALTER TABLE projects ADD COLUMN facilityLayoutData TEXT;`); } catch (e) { }
      try { await tauriDb.execute(`ALTER TABLE knowledge_base ADD COLUMN cloudId TEXT;`); } catch (e) { }
      try { await tauriDb.execute(`ALTER TABLE knowledge_base ADD COLUMN syncStatus TEXT;`); } catch (e) { }
      try { await tauriDb.execute(`CREATE TABLE IF NOT EXISTS vsm_data (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, data TEXT, thumbnail TEXT, createdAt TEXT, lastModified TEXT, folderId INTEGER);`); } catch (e) { }

      db = {
        execute: async (sql, params = []) => {
          const result = await tauriDb.execute(sql, params);
          return { lastInsertId: result.lastInsertId };
        },
        select: async (sql, params = []) => await tauriDb.select(sql, params),
        getStatus: () => ({
          isConfigured: false,
          isOnline: navigator.onLine,
          mode: 'Local'
        }),
        syncToCloud: async () => ({ success: false, message: 'Cloud sync removed' })
      };
      return db;

    } catch (error) {
      console.error('Tauri Database initialization failed:', error);
      initPromise = null;
      return {
        execute: async () => ({ lastInsertId: 0 }),
        select: async () => [],
        getStatus: () => ({ isConfigured: false, isOnline: false, mode: 'Local' })
      };
    }
  })();

  return initPromise;
};
