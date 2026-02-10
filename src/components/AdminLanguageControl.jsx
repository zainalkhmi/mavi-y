import React, { useState, useEffect } from 'react';
import { Search, Save, Trash2, Globe, Plus, AlertCircle, CheckCircle, X } from 'lucide-react';
import { getDynamicTranslations, updateTranslation, deleteTranslation, upsertTranslation } from '../utils/database';
import { translations as staticTranslations } from '../i18n/translations';
import i18n from '../i18n/i18n';
import { useDialog } from '../contexts/DialogContext.jsx';

const AdminLanguageControl = () => {
    const { showAlert, showConfirm } = useDialog();
    const [translations, setTranslations] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: '' }
    const [newKey, setNewKey] = useState('');
    const [editingItem, setEditingItem] = useState(null);

    useEffect(() => {
        loadTranslations();
    }, []);

    const loadTranslations = async () => {
        setLoading(true);
        try {
            const dynamic = await getDynamicTranslations();

            // Collect all unique keys from static translations as well
            const staticKeys = new Set();
            Object.keys(staticTranslations).forEach(lang => {
                const flatten = (obj, prefix = '') => {
                    Object.keys(obj).forEach(key => {
                        const newPrefix = prefix ? `${prefix}.${key}` : key;
                        if (typeof obj[key] === 'object' && obj[key] !== null) {
                            flatten(obj[key], newPrefix);
                        } else {
                            staticKeys.add(newPrefix);
                        }
                    });
                };
                flatten(staticTranslations[lang]);
            });

            const dynamicMap = new Map();
            dynamic.forEach(item => dynamicMap.set(item.key, item));

            const combined = Array.from(staticKeys).map(key => {
                const dyn = dynamicMap.get(key) || {};
                return {
                    key,
                    en: dyn.en || getNestedValue(staticTranslations.en, key) || '',
                    id: dyn.id || getNestedValue(staticTranslations.id, key) || '',
                    ja: dyn.ja || getNestedValue(staticTranslations.ja, key) || '',
                    isDynamic: !!dynamicMap.has(key)
                };
            });

            // Add keys that are ONLY in dynamic
            dynamic.forEach(item => {
                if (!staticKeys.has(item.key)) {
                    combined.push({
                        key: item.key,
                        en: item.en || '',
                        id: item.id || '',
                        ja: item.ja || '',
                        isDynamic: true
                    });
                }
            });

            setTranslations(combined);
        } catch (error) {
            console.error('Failed to load translations:', error);
            showStatus('error', 'Failed to load translations');
        } finally {
            setLoading(false);
        }
    };

    const getNestedValue = (obj, keyPath) => {
        return keyPath.split('.').reduce((prev, curr) => prev?.[curr], obj);
    };

    const showStatus = (type, message) => {
        setStatus({ type, message });
        setTimeout(() => setStatus(null), 3000);
    };

    const handleUpdate = async (key, lang, value) => {
        try {
            await updateTranslation(key, lang, value);
            // Sync with live i18n instance
            i18n.addResourceBundle(lang, 'translation', { [key]: value }, true, true);

            setTranslations(prev => prev.map(t =>
                t.key === key ? { ...t, [lang]: value, isDynamic: true } : t
            ));
            showStatus('success', `Updated ${lang} for ${key}`);
        } catch (error) {
            console.error('Update failed:', error);
            showStatus('error', 'Update failed');
        }
    };

    const handleDelete = async (key) => {
        if (!await showConfirm('Delete Overrides', `Delete dynamic overrides for ${key}? Static values will still remain.`)) return;
        try {
            await deleteTranslation(key);

            // Sync with live i18n instance (remove from live by re-adding static if it exists)
            const staticEn = getNestedValue(staticTranslations.en, key);
            const staticId = getNestedValue(staticTranslations.id, key);
            const staticJa = getNestedValue(staticTranslations.ja, key);

            if (staticEn) i18n.addResourceBundle('en', 'translation', { [key]: staticEn }, true, true);
            else { /* If no static, we'd need to remove from bundle, but i18next remove is complex, let's just reload static */ }
            if (staticId) i18n.addResourceBundle('id', 'translation', { [key]: staticId }, true, true);
            if (staticJa) i18n.addResourceBundle('ja', 'translation', { [key]: staticJa }, true, true);

            loadTranslations(); // Reload to get back static values
            showStatus('success', `Deleted overrides for ${key}`);
        } catch (error) {
            console.error('Delete failed:', error);
            showStatus('error', 'Delete failed');
        }
    };

    const handleAddKey = async () => {
        if (!newKey) return;
        if (translations.some(t => t.key === newKey)) {
            await showAlert('Duplicate Key', 'Key already exists');
            return;
        }
        const newItem = { key: newKey, en: '', id: '', ja: '', isDynamic: true };
        setTranslations([newItem, ...translations]);
        setNewKey('');
        setEditingItem(newItem); // Open edit form for new key
    };

    const handleSaveEditedItem = async (e) => {
        e.preventDefault();
        try {
            const { key, en, id, ja } = editingItem;
            await upsertTranslation(key, { en, id, ja });

            // Sync with live i18n instance
            if (en) i18n.addResourceBundle('en', 'translation', { [key]: en }, true, true);
            if (id) i18n.addResourceBundle('id', 'translation', { [key]: id }, true, true);
            if (ja) i18n.addResourceBundle('ja', 'translation', { [key]: ja }, true, true);

            setTranslations(prev => prev.map(t =>
                t.key === key ? { ...editingItem, isDynamic: true } : t
            ));
            showStatus('success', `Saved all translations for ${key}`);
            setEditingItem(null);
        } catch (error) {
            console.error('Save failed:', error);
            showStatus('error', 'Failed to save translations');
        }
    };

    const filteredTranslations = translations.filter(t =>
        t.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.en.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.ja.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div style={{ padding: '30px', overflowY: 'auto', height: '100%', color: 'white' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Language Control</h2>
                        <p style={{ color: '#888' }}>Manage application translations (Static & Dynamic overrides).</p>
                    </div>
                    {status && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            backgroundColor: status.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                            color: status.type === 'success' ? '#4CAF50' : '#f44336',
                            border: `1px solid ${status.type === 'success' ? '#4CAF5040' : '#f4433640'}`
                        }}>
                            {status.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                            {status.message}
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                        <input
                            type="text"
                            placeholder="Search translations by key or content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px 12px 12px 40px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="text"
                            placeholder="New translation key..."
                            value={newKey}
                            onChange={(e) => setNewKey(e.target.value)}
                            style={{
                                width: '250px',
                                padding: '12px',
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                color: 'white'
                            }}
                        />
                        <button
                            onClick={handleAddKey}
                            style={{
                                padding: '0 20px',
                                backgroundColor: '#0078d4',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Plus size={18} /> Add Key
                        </button>
                    </div>
                </div>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #333',
                    overflow: 'hidden'
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#111', borderBottom: '1px solid #333' }}>
                            <tr>
                                <th style={{ padding: '15px', color: '#888', width: '20%' }}>Key</th>
                                <th style={{ padding: '15px', color: '#888' }}>English</th>
                                <th style={{ padding: '15px', color: '#888' }}>Indonesian</th>
                                <th style={{ padding: '15px', color: '#888' }}>Japanese</th>
                                <th style={{ padding: '15px', color: '#888', width: '60px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                                        Loading translations...
                                    </td>
                                </tr>
                            ) : filteredTranslations.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                                        No translations found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTranslations.map((item) => (
                                    <tr
                                        key={item.key}
                                        onDoubleClick={() => setEditingItem({ ...item })}
                                        style={{
                                            borderBottom: '1px solid #2a2a2a',
                                            cursor: 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        title="Double click to open edit form"
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#222'}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '10px 15px', fontSize: '0.8rem', fontFamily: 'monospace', color: '#0078d4' }}>
                                            {item.key}
                                            {item.isDynamic && <span style={{ marginLeft: '5px', fontSize: '10px', backgroundColor: '#0078d440', padding: '2px 4px', borderRadius: '4px' }}>DYN</span>}
                                        </td>
                                        <TranslationCell
                                            value={item.en}
                                            onSave={(val) => handleUpdate(item.key, 'en', val)}
                                        />
                                        <TranslationCell
                                            value={item.id}
                                            onSave={(val) => handleUpdate(item.key, 'id', val)}
                                        />
                                        <TranslationCell
                                            value={item.ja}
                                            onSave={(val) => handleUpdate(item.key, 'ja', val)}
                                        />
                                        <td style={{ padding: '10px 15px' }}>
                                            {item.isDynamic && (
                                                <button
                                                    onClick={() => handleDelete(item.key)}
                                                    style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer' }}
                                                    title="Remove Overrides"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {editingItem && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        width: '600px',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '16px',
                        border: '1px solid #333',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            padding: '20px 25px',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Edit Translation</h3>
                            <button
                                onClick={() => setEditingItem(null)}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEditedItem} style={{ padding: '25px' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Key</label>
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: '#111',
                                    border: '1px solid #333',
                                    borderRadius: '8px',
                                    fontFamily: 'monospace',
                                    color: '#0078d4'
                                }}>
                                    {editingItem.key}
                                </div>
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>English</label>
                                <textarea
                                    value={editingItem.en}
                                    onChange={(e) => setEditingItem({ ...editingItem, en: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#111',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: 'white',
                                        resize: 'vertical',
                                        minHeight: '60px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Indonesian</label>
                                <textarea
                                    value={editingItem.id}
                                    onChange={(e) => setEditingItem({ ...editingItem, id: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#111',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: 'white',
                                        resize: 'vertical',
                                        minHeight: '60px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ marginBottom: '30px' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.85rem', marginBottom: '8px' }}>Japanese</label>
                                <textarea
                                    value={editingItem.ja}
                                    onChange={(e) => setEditingItem({ ...editingItem, ja: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: '#111',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        color: 'white',
                                        resize: 'vertical',
                                        minHeight: '60px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setEditingItem(null)}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: 'transparent',
                                        color: '#888',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        padding: '10px 30px',
                                        backgroundColor: '#0078d4',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Save size={18} /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const TranslationCell = ({ value, onSave }) => {
    const [localValue, setLocalValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleBlur = () => {
        setIsEditing(false);
        if (localValue !== value) {
            onSave(localValue);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleBlur();
        }
    };

    return (
        <td style={{ padding: '8px 15px' }}>
            <div style={{ position: 'relative' }}>
                <textarea
                    value={localValue}
                    onChange={(e) => setLocalValue(e.target.value)}
                    onFocus={() => setIsEditing(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    style={{
                        width: '100%',
                        backgroundColor: isEditing ? '#222' : 'transparent',
                        border: isEditing ? '1px solid #0078d4' : '1px solid transparent',
                        borderRadius: '4px',
                        color: 'white',
                        padding: '6px',
                        resize: 'none',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s',
                        outline: 'none'
                    }}
                />
            </div>
        </td>
    );
};

export default AdminLanguageControl;
