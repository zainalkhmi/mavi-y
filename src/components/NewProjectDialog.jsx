import React, { useState, useEffect } from 'react';
import { getProjectByName, getFolders } from '../utils/database';
import { useLanguage } from '../contexts/LanguageContext';

function NewProjectDialog({ isOpen, onClose, onSubmit }) {
    const { t } = useLanguage();
    const [projectName, setProjectName] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [folders, setFolders] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadFolders();
        }
    }, [isOpen]);

    const loadFolders = async () => {
        try {
            const hierarchicalFolders = await loadAllFoldersRecursively();
            setFolders(hierarchicalFolders);
        } catch (err) {
            console.error('Failed to load folders:', err);
        }
    };

    const loadAllFoldersRecursively = async () => {
        const allFolders = [];

        const loadChildren = async (parentId, depth = 0) => {
            const children = await getFolders('projects', parentId);
            for (const folder of children) {
                allFolders.push({
                    ...folder,
                    depth,
                    displayName: '  '.repeat(depth) + (depth > 0 ? '→ ' : '') + folder.name
                });
                // Recursively load children
                await loadChildren(folder.id, depth + 1);
            }
        };

        // Start with root folders (parentId = null)
        await loadChildren(null, 0);
        return allFolders;
    };

    const handleVideoSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoFile(file);
            setError('');
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!projectName.trim()) {
            setError(t('project.errors.nameRequired'));
            return;
        }

        if (!videoFile) {
            setError(t('project.errors.videoRequired'));
            return;
        }

        // Check if project name already exists
        const existing = await getProjectByName(projectName.trim());
        if (existing) {
            setError(t('project.errors.nameExists'));
            return;
        }

        // Submit
        onSubmit(projectName.trim(), videoFile, selectedFolderId);

        // Reset
        setProjectName('');
        setVideoFile(null);
        setSelectedFolderId(null);
        setError('');
    };

    const handleCancel = () => {
        setProjectName('');
        setVideoFile(null);
        setSelectedFolderId(null);
        setError('');
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
                <h2 style={{ marginTop: 0, color: 'white', fontSize: '1.5rem', fontWeight: '600' }}>{t('project.newProject')}</h2>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '0.9rem' }}>
                        {t('project.projectName')} *
                    </label>
                    <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder={t('project.enterName')}
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

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '0.9rem' }}>
                        {t('project.folderOptional')}
                    </label>
                    <select
                        value={selectedFolderId || ''}
                        onChange={(e) => setSelectedFolderId(e.target.value ? parseInt(e.target.value) : null)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#222',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '1rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="">{t('project.rootNoFolder')}</option>
                        {folders.map(folder => (
                            <option key={folder.id} value={folder.id}>{folder.displayName}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#888', fontSize: '0.9rem' }}>
                        {t('project.videoFile')} *
                    </label>
                    <input
                        type="file"
                        accept="video/*"
                        onChange={handleVideoSelect}
                        style={{ display: 'none' }}
                        id="video-file-input"
                    />
                    <label
                        htmlFor="video-file-input"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            padding: '12px',
                            backgroundColor: '#222',
                            color: 'white',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            border: '1px solid #333',
                            transition: 'all 0.2s'
                        }}
                    >
                        📹 {videoFile ? t('project.videoSelected') || 'Video Selected' : t('project.selectVideo')}
                    </label>
                    {videoFile && (
                        <div style={{ marginTop: '8px', color: '#3b82f6', fontSize: '0.85rem', textAlign: 'center' }}>
                            ✓ {videoFile.name}
                        </div>
                    )}
                </div>

                {error && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        borderRadius: '8px',
                        marginBottom: '20px',
                        fontSize: '0.9rem',
                        border: '1px solid rgba(239, 68, 68, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

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
                        onClick={handleSubmit}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            fontWeight: '600'
                        }}
                    >
                        {t('project.createProject')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NewProjectDialog;

