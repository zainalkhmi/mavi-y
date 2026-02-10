import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

function SaveAsDialog({ isOpen, onClose, onSave, currentProjectName }) {
    const { t } = useLanguage();
    const [newName, setNewName] = useState(currentProjectName ? `${currentProjectName} (Copy)` : '');

    const handleSave = () => {
        if (newName.trim()) {
            onSave(newName.trim());
            setNewName('');
        }
    };

    const handleCancel = () => {
        setNewName(currentProjectName ? `${currentProjectName} (Copy)` : '');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: '#1a1a1a',
                padding: '30px',
                borderRadius: '12px',
                minWidth: '420px',
                maxWidth: '500px',
                border: '1px solid #333',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                fontFamily: "'Inter', sans-serif"
            }}>
                <h2 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>
                    Save Project As
                </h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '0.9rem' }}>
                        New Project Name *
                    </label>
                    <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Enter new project name"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleSave()}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#222',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: 'transparent',
                            color: '#888',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '500'
                        }}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!newName.trim()}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: newName.trim() ? '#3b82f6' : '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: newName.trim() ? 'pointer' : 'not-allowed',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            opacity: newName.trim() ? 1 : 0.5
                        }}
                    >
                        {t('common.save')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SaveAsDialog;
