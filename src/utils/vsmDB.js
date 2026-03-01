/**
 * vsmDB.js
 * =====================================================
 * MAVi VSM Utility redirecting to Supabase.
 * =====================================================
 */
import * as supabaseVSM from './supabaseVSMDB.js';

export const saveVSM = async (name, data, thumbnail = null, folderId = null) => {
    return await supabaseVSM.saveVSM(name, data, thumbnail, folderId);
};

export const getAllVSMItems = async (folderId = null) => {
    const rows = await supabaseVSM.getAllVSMItems(folderId);
    return rows.map(item => ({
        ...item,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
    }));
};

export const getVSMById = async (id) => {
    const item = await supabaseVSM.getVSMById(id);
    if (!item) return null;
    return {
        ...item,
        data: typeof item.data === 'string' ? JSON.parse(item.data) : item.data
    };
};

export const deleteVSM = async (id) => {
    return await supabaseVSM.deleteVSM(id);
};
