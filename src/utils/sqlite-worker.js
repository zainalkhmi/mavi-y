let sqlite3InitModule = null;

async function loadSqliteModule() {
    if (sqlite3InitModule) return sqlite3InitModule;
    // We use eval to hide this from Vite's static analysis which blocks imports from /public
    const mod = await eval(`import('/sqlite-wasm/index.mjs')`);
    sqlite3InitModule = mod.default;
    return sqlite3InitModule;
}

let db = null;

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

async function init() {
    try {
        const initFn = await loadSqliteModule();
        const sqlite3 = await initFn({
            print: console.log,
            printErr: console.error,
        });

        const OPFS_CHECK = 'opfs' in sqlite3;
        console.log('SQLite WASM Bootstrapped. OPFS support:', OPFS_CHECK);

        if (OPFS_CHECK) {
            try {
                db = new sqlite3.oo1.OpfsDb('/motion_study.sqlite', 'c');
                console.log('Using OPFS for persistent storage in worker');
            } catch (opfsErr) {
                console.error('Failed to create OPFS DB, falling back to transient:', opfsErr);
                db = new sqlite3.oo1.DB('/motion_study.sqlite', 'c');
            }
        } else {
            db = new sqlite3.oo1.DB('/motion_study.sqlite', 'c');
            console.warn('OPFS not available in worker, using transient storage');
        }

        // Initialize schema
        for (const query of SCHEMA_QUERIES) {
            db.exec(query);
        }

        // Migrations
        try { db.exec(`ALTER TABLE projects ADD COLUMN swcsData TEXT;`); } catch (e) { }
        try { db.exec(`ALTER TABLE projects ADD COLUMN standardWorkLayoutData TEXT;`); } catch (e) { }
        try { db.exec(`ALTER TABLE projects ADD COLUMN facilityLayoutData TEXT;`); } catch (e) { }
        try { db.exec(`ALTER TABLE knowledge_base ADD COLUMN cloudId TEXT;`); } catch (e) { }
        try { db.exec(`ALTER TABLE knowledge_base ADD COLUMN syncStatus TEXT;`); } catch (e) { }
        try { db.exec(`CREATE TABLE IF NOT EXISTS vsm_data (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, data TEXT, thumbnail TEXT, createdAt TEXT, lastModified TEXT, folderId INTEGER);`); } catch (e) { }

        self.postMessage({ type: 'ready' });
    } catch (err) {
        console.error('Worker initialization failed:', err);
        self.postMessage({ type: 'error', error: err.message });
    }
}

self.onmessage = async (e) => {
    const { id, type, sql, params } = e.data;

    if (type === 'init') {
        await init();
        return;
    }

    if (!db) {
        self.postMessage({ id, error: 'Database not initialized' });
        return;
    }

    try {
        if (type === 'execute') {
            db.exec({
                sql: sql,
                bind: params
            });
            let lastInsertId = 0;
            try {
                const res = db.exec("SELECT last_insert_rowid()", { returnValue: "resultRows" });
                if (res && res.length > 0 && res[0].length > 0) {
                    lastInsertId = res[0][0];
                }
            } catch (e) {
                console.warn('Failed to get lastInsertId:', e);
            }
            self.postMessage({ id, result: { lastInsertId } });
        } else if (type === 'select') {
            const rows = [];
            db.exec({
                sql: sql,
                bind: params,
                rowMode: 'object',
                callback: (row) => rows.push(row)
            });
            self.postMessage({ id, result: rows });
        }
    } catch (err) {
        const errMsg = err ? (err.message || String(err)) : 'Unknown error';
        console.error(`Worker ${type} error:`, err, sql);
        self.postMessage({ id, error: errMsg });
    }
};

self.onerror = (err) => {
    console.error('SQLite Worker global error:', err);
};
