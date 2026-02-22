// VSM Database Utilities
import { getSqliteDb } from './sqlite.js';
import { getTursoClient, isTursoConfigured } from './tursoClient.js';

export const saveVSM = async (name, data, thumbnail = null, folderId = null) => {
    const now = new Date().toISOString();

    if (isTursoConfigured()) {
        const client = await getTursoClient();
        try {
            if (data.id && typeof data.id === 'number') {
                await client.execute({
                    sql: `UPDATE vsm_data SET name = ?, data = ?, thumbnail = ?, lastModified = ?, folderId = ? WHERE id = ?`,
                    args: [name, JSON.stringify(data), thumbnail, now, folderId, data.id]
                });
                return data.id;
            } else {
                const result = await client.execute({
                    sql: `INSERT INTO vsm_data (name, data, thumbnail, createdAt, lastModified, folderId) VALUES (?, ?, ?, ?, ?, ?)`,
                    args: [name, JSON.stringify(data), thumbnail, now, now, folderId]
                });
                return Number(result.lastInsertRowid);
            }
        } catch (e) {
            console.error('Failed to save VSM to Turso, falling back to local:', e);
        }
    }

    const db = await getSqliteDb();
    // Check if it's an update (data has id) or new
    if (data.id && typeof data.id === 'number') {
        await db.execute(
            `UPDATE vsm_data SET name = ?, data = ?, thumbnail = ?, lastModified = ?, folderId = ? WHERE id = ?`,
            [name, JSON.stringify(data), thumbnail, now, folderId, data.id]
        );
        return data.id;
    } else {
        const result = await db.execute(
            `INSERT INTO vsm_data (name, data, thumbnail, createdAt, lastModified, folderId) VALUES (?, ?, ?, ?, ?, ?)`,
            [name, JSON.stringify(data), thumbnail, now, now, folderId]
        );
        return result.lastInsertId;
    }
};

export const getAllVSMItems = async (folderId = null) => {
    if (isTursoConfigured()) {
        const client = await getTursoClient();
        try {
            let sql = 'SELECT * FROM vsm_data';
            let params = [];
            if (folderId === null) { sql += ' WHERE folderId IS NULL'; }
            else { sql += ' WHERE folderId = ?'; params.push(folderId); }
            sql += ' ORDER BY lastModified DESC';

            const res = await client.execute({ sql, args: params });
            return (res.rows || []).map(item => ({
                ...item,
                id: Number(item.id),
                data: item.data ? JSON.parse(item.data) : null
            }));
        } catch (e) {
            console.warn('Failed to fetch VSM items from Turso:', e);
        }
    }

    const db = await getSqliteDb();
    let sql = 'SELECT * FROM vsm_data';
    let params = [];
    if (folderId === null) { sql += ' WHERE folderId IS NULL'; }
    else { sql += ' WHERE folderId = ?'; params.push(folderId); }
    sql += ' ORDER BY lastModified DESC';

    const rows = await db.select(sql, params);
    return rows.map(item => ({
        ...item,
        data: item.data ? JSON.parse(item.data) : null
    }));
};

export const getVSMById = async (id) => {
    if (isTursoConfigured()) {
        const client = await getTursoClient();
        try {
            const res = await client.execute({
                sql: 'SELECT * FROM vsm_data WHERE id = ?',
                args: [id]
            });
            const item = res.rows?.[0];
            if (item) return { ...item, id: Number(item.id), data: item.data ? JSON.parse(item.data) : null };
        } catch (e) {
            console.warn('Failed to fetch VSM by ID from Turso:', e);
        }
    }

    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM vsm_data WHERE id = ?', [id]);
    const item = rows[0] || null;
    if (item && item.data) {
        return { ...item, data: JSON.parse(item.data) };
    }
    return item;
};

export const deleteVSM = async (id) => {
    if (isTursoConfigured()) {
        const client = await getTursoClient();
        try {
            await client.execute({
                sql: 'DELETE FROM vsm_data WHERE id = ?',
                args: [id]
            });
            return;
        } catch (e) {
            console.error('Failed to delete VSM from Turso:', e);
        }
    }
    const db = await getSqliteDb();
    await db.execute('DELETE FROM vsm_data WHERE id = ?', [id]);
};
