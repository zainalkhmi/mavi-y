import React, { useState, useEffect, useRef } from 'react';
import { Search, Filter, Grid, List, Plus, Star, Eye, TrendingUp, Calendar, Tag, BookOpen, Cloud, RefreshCw, Download, Upload, Loader2 } from 'lucide-react';
import {
    getAllKnowledgeBaseItems,
    searchKnowledgeBase,
    sortKnowledgeBase,
    getAllTags,
    incrementViewCount,
    addKnowledgeBaseItem,
    updateKnowledgeBaseItem,
    getKnowledgeBaseItem
} from '../utils/knowledgeBaseDB';
import KnowledgeBaseDetail from './features/KnowledgeBaseDetail';
import TemplateUpload from './features/TemplateUpload';
import { useDialog } from '../contexts/DialogContext';
import {
    isGoogleDriveEnabled,
    listGoogleDriveKnowledgeBaseFiles,
    uploadKnowledgeBaseBackupToGoogleDrive,
    importKnowledgeBaseBackupFromGoogleDriveFile,
    downloadGoogleDriveFileBlob
} from '../utils/googleDrive';
import { importManualPackageZip, getManualPackageLocal } from '../utils/manualPackage';

const normalizeWorkflowStatus = (status) => {
    const value = String(status || '').trim().toUpperCase();
    if (!value) return 'DRAFT';
    if (['DRAFT', 'REVIEW', 'PUBLISHED'].includes(value)) return value;
    if (['IN REVIEW', 'IN_REVIEW', 'PROPOSED'].includes(value)) return 'REVIEW';
    if (['APPROVED', 'RELEASED'].includes(value)) return 'PUBLISHED';
    return 'DRAFT';
};

const getManualStatusColor = (status) => {
    if (status === 'PUBLISHED') return 'rgba(16,185,129,0.9)';
    if (status === 'REVIEW') return 'rgba(245,158,11,0.9)';
    return 'rgba(59,130,246,0.9)';
};

function KnowledgeBase({ onLoadVideo }) {
    const { showAlert, showConfirm } = useDialog();
    const [items, setItems] = useState([]);
    const [filteredItems, setFilteredItems] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedIndustry, setSelectedIndustry] = useState('');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState('grid'); // grid or list
    const [showFilters, setShowFilters] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [allTags, setAllTags] = useState([]);
    const [showDrivePanel, setShowDrivePanel] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [driveBusy, setDriveBusy] = useState(false);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const importZipInputRef = useRef(null);

    const getTauriInvoke = () => {
        const internalInvoke = window.__TAURI_INTERNALS__?.invoke;
        return typeof internalInvoke === 'function' ? internalInvoke : null;
    };

    // Load items on mount
    useEffect(() => {
        loadItems();
        loadTags();
    }, []);

    const loadItems = async ({ showLoader = true } = {}) => {
        if (showLoader) {
            setIsLoadingItems(true);
            setLoadingProgress(10);
            setLoadingMessage('Mengakses data manual creation dari database...');
        }

        try {
            const allItems = await getAllKnowledgeBaseItems();
            if (showLoader) {
                setLoadingProgress(60);
                setLoadingMessage('Menyiapkan data Knowledge Base...');
            }

            // Create Blob URLs for video items
            const itemsWithUrls = allItems.map(item => {
                const manualStatus = normalizeWorkflowStatus(
                    item?.status || item?.content?.status || item?.content?.workflow?.status || 'DRAFT'
                );
                if (item.videoBlob && item.videoBlob instanceof Blob) {
                    return {
                        ...item,
                        status: item?.type === 'manual' ? manualStatus : item?.status,
                        contentUrl: URL.createObjectURL(item.videoBlob)
                    };
                }
                return {
                    ...item,
                    status: item?.type === 'manual' ? manualStatus : item?.status
                };
            });

            if (showLoader) {
                setLoadingProgress(85);
                setLoadingMessage('Menyelesaikan tampilan data...');
            }

            setItems(itemsWithUrls);
            setFilteredItems(sortKnowledgeBase(itemsWithUrls, sortBy));

            if (showLoader) {
                setLoadingProgress(100);
                setLoadingMessage('Data berhasil dimuat.');
            }
        } catch (error) {
            console.error('Failed to load Knowledge Base items:', error);
            setItems([]);
            setFilteredItems([]);
            if (showLoader) {
                setLoadingMessage('Gagal memuat data dari database.');
            }
        } finally {
            if (showLoader) {
                setTimeout(() => {
                    setIsLoadingItems(false);
                    setLoadingProgress(0);
                    setLoadingMessage('');
                }, 250);
            }
        }
    };

    const loadTags = async () => {
        const tags = await getAllTags();
        setAllTags(tags);
    };

    // Search and filter
    useEffect(() => {
        const performSearch = async () => {
            setIsSearching(true);
            try {
                const results = await searchKnowledgeBase(searchQuery, {
                    type: selectedType,
                    category: selectedCategory,
                    industry: selectedIndustry
                });
                setFilteredItems(sortKnowledgeBase(results, sortBy));
            } finally {
                setIsSearching(false);
            }
        };
        performSearch();
    }, [searchQuery, selectedType, selectedCategory, selectedIndustry, sortBy, items]);

    const handleItemClick = async (item) => {
        await incrementViewCount(item.id);
        setSelectedItem(item);
        loadItems({ showLoader: false }); // Refresh to update view count
    };

    const handleUploadComplete = () => {
        setShowUploadForm(false);
        loadItems();
        loadTags();
    };

    const loadDriveFiles = async () => {
        if (!isGoogleDriveEnabled()) {
            setDriveFiles([]);
            return;
        }

        setDriveBusy(true);
        try {
            const files = await listGoogleDriveKnowledgeBaseFiles();
            setDriveFiles(files || []);
        } catch (error) {
            console.error('Failed to load KB backups from Drive:', error);
            await showAlert('Google Drive', error.message || 'Failed to load backup files from Google Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleUploadBackupToDrive = async () => {
        if (!isGoogleDriveEnabled()) {
            await showAlert('Google Drive', 'Enable Google Drive first in Global Settings > Cloud Storage.');
            return;
        }

        setDriveBusy(true);
        try {
            const kbItems = await getAllKnowledgeBaseItems();
            const cleanItems = kbItems.map(({ contentUrl, ...rest }) => rest);
            const payload = {
                exportedAt: new Date().toISOString(),
                source: 'mavi-y',
                type: 'knowledge-base-backup',
                count: cleanItems.length,
                items: cleanItems
            };

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `knowledge-base-backup-${stamp}.json`;
            await uploadKnowledgeBaseBackupToGoogleDrive(payload, filename);
            await showAlert('Success', `Knowledge Base backup uploaded: ${filename}`);
            await loadDriveFiles();
        } catch (error) {
            console.error('KB backup upload failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to upload backup to Google Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleImportBackupFromDrive = async (file) => {
        if (!await showConfirm('Import Backup', `Import backup file "${file.name}"?`)) return;

        setDriveBusy(true);
        try {
            const payload = await importKnowledgeBaseBackupFromGoogleDriveFile(file.id);
            const backupItems = Array.isArray(payload?.items) ? payload.items : [];

            let importedCount = 0;
            for (const item of backupItems) {
                const existing = item?.id ? await getKnowledgeBaseItem(item.id) : null;
                const nextData = {
                    title: item.title || 'Untitled',
                    description: item.description || '',
                    content: item.content || '',
                    type: item.type || 'document',
                    category: item.category || '',
                    industry: item.industry || '',
                    cloudId: item.cloudId || null,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                    syncStatus: item.syncStatus || 'local'
                };

                if (existing && item?.id) {
                    await updateKnowledgeBaseItem(item.id, nextData);
                } else {
                    await addKnowledgeBaseItem(nextData);
                }
                importedCount += 1;
            }

            await loadItems();
            await showAlert('Success', `Backup imported successfully (${importedCount} item).`);
        } catch (error) {
            console.error('KB backup import failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to import backup from Google Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleDownloadBackupFromDrive = async (file) => {
        setDriveBusy(true);
        try {
            const blob = await downloadGoogleDriveFileBlob(file.id);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name || `${file.id}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('KB backup download failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to download backup file.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleImportManualZip = async (file) => {
        if (!file) return;

        try {
            const imported = await importManualPackageZip(file);
            const localPackage = await getManualPackageLocal(imported?.id);
            const manual = localPackage?.manual;

            if (!manual) {
                throw new Error('Manual data not found in ZIP package.');
            }

            const localManualId = imported?.id || manual.localManualId || manual.cloudId || manual.kbId || manual.id;
            const nextData = {
                title: manual.title || imported?.manifest?.title || file.name.replace(/\.zip$/i, ''),
                description: manual.summary || manual.description || '',
                content: manual,
                type: 'manual',
                category: 'Work Instruction',
                industry: manual.category || '',
                cloudId: localManualId,
                version: manual.version || imported?.manifest?.version || '1.0',
                status: normalizeWorkflowStatus(manual.workflow?.status || manual.status || 'DRAFT'),
                author: manual.author || '',
                documentNumber: manual.documentNumber || '',
                localManualId,
                createdAt: manual.createdAt,
                updatedAt: new Date().toISOString(),
                syncStatus: 'local'
            };

            const existingItems = await getAllKnowledgeBaseItems();
            const existing = existingItems.find((item) => {
                const contentObj = item?.content && typeof item.content === 'object' ? item.content : null;
                return String(item?.cloudId || '') === String(localManualId)
                    || String(item?.localManualId || '') === String(localManualId)
                    || String(contentObj?.localManualId || '') === String(localManualId)
                    || String(contentObj?.cloudId || '') === String(localManualId);
            });

            if (existing?.id) {
                await updateKnowledgeBaseItem(existing.id, nextData);
            } else {
                await addKnowledgeBaseItem(nextData);
            }

            await loadItems();
            await loadTags();
            await showAlert('Import Success', 'Manual ZIP imported and saved to Knowledge Base successfully.');
        } catch (error) {
            console.error('Manual ZIP import failed:', error);
            await showAlert('Import ZIP Failed', error.message || 'Failed to import manual ZIP package.');
        } finally {
            if (importZipInputRef.current) importZipInputRef.current.value = '';
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'template': return '📋';
            case 'video': return '🎥';
            case 'document': return '📄';
            case 'manual': return '📖';
            case 'best_practice': return '⭐';
            default: return '📚';
        }
    };

    const renderStars = (rating) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={14}
                    fill={i <= rating ? '#ffd700' : 'none'}
                    stroke={i <= rating ? '#ffd700' : '#666'}
                />
            );
        }
        return stars;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }} className="glass-panel">
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes kb-search-bar {
                    0% { transform: translateX(-120%); }
                    100% { transform: translateX(360%); }
                }
            `}</style>
            {/* Header */}
            <div style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ margin: 0, color: 'white', fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ background: 'linear-gradient(135deg, #0078d4 0%, #00b4d8 100%)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
                                <BookOpen size={24} color="white" />
                            </div>
                            Knowledge Base & Best Practices
                        </h1>
                        <p style={{ margin: '8px 0 0 0', color: '#aaa', fontSize: '0.95rem' }}>
                            Access templates, guides, and community insights to optimize your workflow.
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => importZipInputRef.current?.click()}
                            style={{
                                padding: '12px 18px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Upload size={18} /> Import ZIP
                        </button>
                        <button
                            onClick={async () => {
                                const next = !showDrivePanel;
                                setShowDrivePanel(next);
                                if (next) await loadDriveFiles();
                            }}
                            style={{
                                padding: '12px 18px',
                                background: showDrivePanel ? 'rgba(0,120,212,0.2)' : 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <Cloud size={18} /> Google Drive
                        </button>
                        <button
                            onClick={() => setShowUploadForm(true)}
                            style={{
                                padding: '12px 24px',
                                background: 'linear-gradient(135deg, #0078d4 0%, #00b4d8 100%)',
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: '0 4px 15px rgba(0, 120, 212, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Plus size={20} /> Add New Item
                        </button>
                    </div>
                </div>

                <input
                    ref={importZipInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    style={{ display: 'none' }}
                    onChange={(e) => handleImportManualZip(e.target.files?.[0])}
                />

                {showDrivePanel && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '14px',
                        backgroundColor: 'rgba(0, 120, 212, 0.08)',
                        border: '1px solid rgba(0, 120, 212, 0.25)',
                        borderRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div style={{ fontWeight: 700, color: '#9dd7ff' }}>Knowledge Base Backups</div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleUploadBackupToDrive}
                                    disabled={driveBusy}
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: '#0078d4', color: 'white' }}
                                >
                                    Upload Backup
                                </button>
                                <button
                                    onClick={loadDriveFiles}
                                    disabled={driveBusy}
                                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <RefreshCw size={14} /> {driveBusy ? 'Loading...' : 'Refresh'}
                                </button>
                            </div>
                        </div>

                        {driveFiles.length === 0 ? (
                            <div style={{ color: '#9aa8b6', fontSize: '0.85rem' }}>
                                No backup files found in Google Drive.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {driveFiles.map(file => (
                                    <div key={file.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                                        <div>
                                            <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{file.name}</div>
                                            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : '-'}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleImportBackupFromDrive(file)}
                                                disabled={driveBusy}
                                                style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}
                                            >
                                                Import
                                            </button>
                                            <button
                                                onClick={() => handleDownloadBackupFromDrive(file)}
                                                disabled={driveBusy}
                                                style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <Download size={14} /> Download
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Search and Controls */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search Bar */}
                    <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Search templates, videos, best practices..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '14px 14px 14px 48px',
                                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '0.95rem',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            padding: '14px 20px',
                            backgroundColor: showFilters ? 'rgba(0, 120, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: `1px solid ${showFilters ? '#0078d4' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            color: showFilters ? '#0078d4' : '#ccc',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            fontWeight: '500'
                        }}
                    >
                        <Filter size={18} /> Filters
                    </button>

                    {/* Sort */}
                    <div style={{ position: 'relative' }}>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            style={{
                                appearance: 'none',
                                padding: '14px 40px 14px 20px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: '#ccc',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                outline: 'none',
                                minWidth: '160px'
                            }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="mostUsed">Most Used</option>
                            <option value="highestRated">Highest Rated</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                        <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                        </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '10px',
                                backgroundColor: viewMode === 'grid' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: viewMode === 'grid' ? 'white' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Grid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            style={{
                                padding: '10px',
                                backgroundColor: viewMode === 'list' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                color: viewMode === 'list' ? 'white' : '#888',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div style={{
                        marginTop: '16px',
                        padding: '20px',
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        gap: '20px',
                        flexWrap: 'wrap',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {[
                            {
                                label: 'Type', value: selectedType, setter: setSelectedType, options: [
                                    { val: '', txt: 'All Types' },
                                    { val: 'template', txt: 'Templates' },
                                    { val: 'video', txt: 'Videos' },
                                    { val: 'manual', txt: 'Manuals' },
                                    { val: 'document', txt: 'Documents' },
                                    { val: 'best_practice', txt: 'Best Practices' }
                                ]
                            },
                            {
                                label: 'Category', value: selectedCategory, setter: setSelectedCategory, options: [
                                    { val: '', txt: 'All Categories' },
                                    { val: 'Work Instruction', txt: 'Work Instructions' },
                                    { val: 'Manufacturing', txt: 'Manufacturing' },
                                    { val: 'Assembly', txt: 'Assembly' },
                                    { val: 'Logistics', txt: 'Logistics' },
                                    { val: 'Quality Control', txt: 'Quality Control' },
                                    { val: 'Maintenance', txt: 'Maintenance' }
                                ]
                            },
                            {
                                label: 'Industry', value: selectedIndustry, setter: setSelectedIndustry, options: [
                                    { val: '', txt: 'All Industries' },
                                    { val: 'Automotive', txt: 'Automotive' },
                                    { val: 'Electronics', txt: 'Electronics' },
                                    { val: 'Food & Beverage', txt: 'Food & Beverage' },
                                    { val: 'Pharmaceutical', txt: 'Pharmaceutical' },
                                    { val: 'Textile', txt: 'Textile' }
                                ]
                            }
                        ].map((filter, i) => (
                            <div key={i} style={{ flex: 1, minWidth: '200px' }}>
                                <label style={{ display: 'block', color: '#aaa', fontSize: '0.85rem', marginBottom: '8px', fontWeight: '500' }}>{filter.label}</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={filter.value}
                                        onChange={(e) => filter.setter(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            appearance: 'none',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                    >
                                        {filter.options.map(opt => (
                                            <option key={opt.val} value={opt.val}>{opt.txt}</option>
                                        ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666' }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {isSearching && !isLoadingItems && (
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{
                            height: '4px',
                            width: '100%',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: '35%',
                                background: 'linear-gradient(90deg, #0078d4 0%, #00b4d8 100%)',
                                animation: 'kb-search-bar 1s ease-in-out infinite'
                            }} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#8fa8bf', marginTop: '6px' }}>
                            Memperbarui hasil pencarian...
                        </div>
                    </div>
                )}

                {isLoadingItems ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '60%',
                        color: '#9fb3c8',
                        textAlign: 'center'
                    }}>
                        <Loader2 size={34} style={{ color: '#4db2ff', marginBottom: '14px', animation: 'spin 1s linear infinite' }} />
                        <div style={{ fontWeight: 600, color: 'white', marginBottom: '10px' }}>
                            {loadingMessage || 'Memuat data...'}
                        </div>
                        <div style={{ width: 'min(440px, 85%)' }}>
                            <div style={{
                                height: '10px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(255,255,255,0.08)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.max(0, Math.min(100, loadingProgress))}%`,
                                    background: 'linear-gradient(90deg, #0078d4 0%, #00b4d8 100%)',
                                    transition: 'width 0.25s ease'
                                }} />
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#8fa8bf', marginTop: '8px' }}>
                                {Math.max(0, Math.min(100, Math.round(loadingProgress)))}%
                            </div>
                        </div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '60%',
                        color: '#666',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '20px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <Search size={40} color="#444" />
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', color: 'white', fontSize: '1.2rem' }}>No items found</h3>
                        <p style={{ maxWidth: '400px', lineHeight: '1.5', margin: 0 }}>
                            Try adjusting your search or filters to find what you're looking for, or add a new item to get started.
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                marginTop: '20px',
                                background: 'transparent',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#0078d4',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}
                        >
                            Clear Search
                        </button>
                    </div>
                ) : (
                    <div style={{
                        display: viewMode === 'grid' ? 'grid' : 'flex',
                        gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : '1fr',
                        flexDirection: viewMode === 'list' ? 'column' : undefined,
                        gap: '24px'
                    }}>
                        {filteredItems.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item)}
                                className="glass-card"
                                style={{
                                    padding: '0',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: viewMode === 'list' ? 'row' : 'column',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-4px)';
                                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                                    const overlay = e.currentTarget.querySelector('.card-overlay');
                                    if (overlay) overlay.style.opacity = '1';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    const overlay = e.currentTarget.querySelector('.card-overlay');
                                    if (overlay) overlay.style.opacity = '0';
                                }}
                            >
                                {/* Type Badge */}
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    padding: '4px 10px',
                                    borderRadius: '20px',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    backdropFilter: 'blur(4px)',
                                    fontSize: '0.75rem',
                                    color: 'white',
                                    zIndex: 2,
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {item.type === 'best_practice' ? 'Best Practice' : item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                </div>

                                {item.type === 'manual' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: item.syncStatus === 'local-file' ? '42px' : '12px',
                                        left: '12px',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        backgroundColor: getManualStatusColor(normalizeWorkflowStatus(item.status)),
                                        backdropFilter: 'blur(4px)',
                                        fontSize: '0.70rem',
                                        fontWeight: '800',
                                        letterSpacing: '0.04em',
                                        color: 'white',
                                        zIndex: 2,
                                        border: '1px solid rgba(255,255,255,0.25)'
                                    }}>
                                        {normalizeWorkflowStatus(item.status)}
                                    </div>
                                )}

                                {item.syncStatus === 'local-file' && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '12px',
                                        left: '12px',
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        backgroundColor: 'rgba(255,165,0,0.8)',
                                        backdropFilter: 'blur(4px)',
                                        fontSize: '0.70rem',
                                        fontWeight: 'bold',
                                        color: 'white',
                                        zIndex: 2,
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        Local File
                                    </div>
                                )}

                                {/* Icon/Thumbnail Area */}
                                <div style={{
                                    height: viewMode === 'list' ? 'auto' : '160px',
                                    width: viewMode === 'list' ? '200px' : '100%',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderBottom: viewMode === 'list' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRight: viewMode === 'list' ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                    position: 'relative'
                                }}>
                                    <div style={{ fontSize: '4rem', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))', transform: 'scale(1)', transition: 'transform 0.3s' }}>
                                        {getTypeIcon(item.type)}
                                    </div>
                                    <div className="card-overlay" style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        background: 'rgba(0,0,0,0.2)',
                                        opacity: 0,
                                        transition: 'opacity 0.3s'
                                    }} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                        <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.3' }}>{item.title}</h3>
                                    </div>

                                    <p style={{ margin: '0 0 16px 0', color: '#aaa', fontSize: '0.9rem', lineHeight: '1.5', flex: 1 }}>
                                        {item.description?.substring(0, 100)}{item.description?.length > 100 ? '...' : ''}
                                    </p>

                                    {/* Tags */}
                                    {item.tags && item.tags.length > 0 && (
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                                            {item.tags.slice(0, 3).map((tag, idx) => (
                                                <span
                                                    key={idx}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                                        border: '1px solid rgba(0, 120, 212, 0.2)',
                                                        borderRadius: '12px',
                                                        fontSize: '0.75rem',
                                                        color: '#4db2ff'
                                                    }}
                                                >
                                                    #{tag}
                                                </span>
                                            ))}
                                            {item.tags.length > 3 && (
                                                <span style={{ fontSize: '0.75rem', color: '#666', padding: '4px' }}>+{item.tags.length - 3}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats Footer */}
                                    <div style={{
                                        display: 'flex',
                                        gap: '16px',
                                        fontSize: '0.85rem',
                                        color: '#888',
                                        paddingTop: '16px',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                        marginTop: 'auto'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ display: 'flex' }}>
                                                {renderStars(Math.round(item.averageRating || 0))}
                                            </div>
                                            <span style={{ color: '#666' }}>({item.ratingCount || 0})</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                                            <Eye size={14} />
                                            <span>{item.viewCount || 0}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <TrendingUp size={14} />
                                            <span>{item.usageCount || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <KnowledgeBaseDetail
                    item={selectedItem}
                    onClose={() => {
                        setSelectedItem(null);
                        loadItems();
                    }}
                    onLoadVideo={onLoadVideo}
                />
            )}

            {/* Upload Form Modal */}
            {showUploadForm && (
                <TemplateUpload
                    onClose={() => setShowUploadForm(false)}
                    onComplete={handleUploadComplete}
                />
            )}
        </div>
    );
}

export default KnowledgeBase;
