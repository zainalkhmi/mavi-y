// VSM Database Utilities
import { getSqliteDb } from './sqlite.js';

export const saveVSM = async (name, data, thumbnail = null, folderId = null) => {
    const db = await getSqliteDb();
    const now = new Date().toISOString();

    // Check if it's an update (data has id) or new
    if (data.id && typeof data.id === 'number') {
        const result = await db.execute(
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
    const db = await getSqliteDb();
    let sql = 'SELECT * FROM vsm_data';
    let params = [];

    if (folderId === null) {
        sql += ' WHERE folderId IS NULL';
    } else {
        sql += ' WHERE folderId = ?';
        params.push(folderId);
    }

    sql += ' ORDER BY lastModified DESC';

    const rows = await db.select(sql, params);
    return rows.map(item => ({
        ...item,
        data: item.data ? JSON.parse(item.data) : null
    }));
};

export const getVSMById = async (id) => {
    const db = await getSqliteDb();
    const rows = await db.select('SELECT * FROM vsm_data WHERE id = ?', [id]);
    const item = rows[0] || null;

    if (item && item.data) {
        return {
            ...item,
            data: JSON.parse(item.data)
        };
    }
    return item;
};

export const deleteVSM = async (id) => {
    const db = await getSqliteDb();
    await db.execute('DELETE FROM vsm_data WHERE id = ?', [id]);
};
