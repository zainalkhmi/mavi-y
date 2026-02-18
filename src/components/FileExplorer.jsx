import React, { useState, useEffect } from 'react';
import {
    getAllProjects,
    deleteProjectById,
    getProjectById,
    saveProject,
    createFolder,
    getFolders,
    getFolderBreadcrumbs,
    updateProject,
    deleteFolder,
    getDatasets,
    deleteDataset
} from '../utils/database';
import { getAllKnowledgeBaseItems, deleteKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
import { getAllVSMItems, deleteVSM } from '../utils/vsmDB';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import { importProject, generateProjectZip } from '../utils/projectExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
    Folder,
    ArrowLeft,
    FolderPlus,
    FileVideo,
    Search,
    Grid,
    List as ListIcon,
    RefreshCw,
    Upload,
    Download,
    Trash2,
    X,
    Clock,
    Star,
    Book,
    Activity,
    MoreVertical,
    ExternalLink,
    Maximize2,
    ChevronRight,
    Settings,
    Cloud,
    Plus,
    GanttChart,
    BarChart3,
    Network,
    Trophy
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import NewProjectDialog from './NewProjectDialog';
import {
    isGoogleDriveEnabled,
    listGoogleDriveProjectFiles,
    uploadProjectZipToGoogleDrive,
    downloadGoogleDriveFileBlob,
    importProjectFromGoogleDriveFile,
    shareGoogleDriveFileWithEmail,
    createGoogleDriveShareLink
} from '../utils/googleDrive';

const FileExplorer = () => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { openProject, currentProject } = useProject();
    const { showAlert, showConfirm, showPrompt } = useDialog();

    const [activeCategory, setActiveCategory] = useState('projects');
    const [projects, setProjects] = useState([]);
    const [manuals, setManuals] = useState([]);
    const [models, setModels] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [folders, setFolders] = useState([]);
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [breadcrumbs, setBreadcrumbs] = useState([]);

    const [selectedItems, setSelectedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [viewMode, setViewMode] = useState('grid');
    const [isDragging, setIsDragging] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const [showDrivePanel, setShowDrivePanel] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [driveBusy, setDriveBusy] = useState(false);
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
    const [webSaveDirHandle, setWebSaveDirHandle] = useState(null);
    const [webSaveDirName, setWebSaveDirName] = useState('');
    const [isFsApiSupported, setIsFsApiSupported] = useState(false);

    // API Editor States
    const [apis, setApis] = useState([]);
    const [editingApi, setEditingApi] = useState(null);
    const [isApiModalOpen, setIsApiModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentFolderId, activeCategory]);

    useEffect(() => {
        setIsFsApiSupported(typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function');
    }, []);


    const loadData = async () => {
        setIsLoading(true);
        try {
            // Only fetch folders for projects, manuals and datasets
            const isManageableCategory = activeCategory === 'projects' || activeCategory === 'manuals' || activeCategory === 'datasets';
            const isModelsCategory = activeCategory === 'models';
            const section = activeCategory === 'projects' ? 'projects' : 'manuals';

            let currentFolders = [];
            let crumbs = [];

            if (isManageableCategory) {
                const [allProjects, allManuals, fetchedDatasets, fetchedFolders, fetchedCrumbs] = await Promise.all([
                    getAllProjects(),
                    getAllKnowledgeBaseItems(),
                    getDatasets(currentFolderId),
                    getFolders(section, currentFolderId),
                    getFolderBreadcrumbs(currentFolderId)
                ]);

                // Filter projects based on current folder
                console.log('FileExplorerDEBUG: currentFolderId (selected):', currentFolderId, typeof currentFolderId);
                console.log('FileExplorerDEBUG: allProjects count from DB:', allProjects.length);
                if (allProjects.length > 0) console.log('FileExplorerDEBUG: first project sample:', allProjects[0]);

                const filteredByFolder = allProjects.filter(p => {
                    // Normalize comparison
                    const pFolderId = p.folderId ? p.folderId.toString() : null;
                    const cFolderId = currentFolderId ? currentFolderId.toString() : null;

                    if (currentFolderId === null) return !p.folderId;
                    return pFolderId === cFolderId;
                });

                console.log('FileExplorerDEBUG: projects after folder filtering:', filteredByFolder.length);
                setProjects(filteredByFolder || []);
                setManuals(allManuals.filter(m => m.type === 'manual') || []);
                setDatasets(fetchedDatasets || []);
                setFolders(fetchedFolders || []);
                setBreadcrumbs(fetchedCrumbs || []);
            } else if (activeCategory === 'swcs') {
                const allProjects = await getAllProjects();
                const projectsWithSwcs = allProjects.filter(p => p.swcsData !== null);
                setProjects(projectsWithSwcs);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (activeCategory === 'yamazumi') {
                const allProjects = await getAllProjects();
                // Filter projects that have measurements (potential for Yamazumi)
                const projectsWithData = allProjects.filter(p => p.measurements && p.measurements.length > 0);
                setProjects(projectsWithData);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (activeCategory === 'vsm') {
                const vsmItems = await getAllVSMItems();
                setProjects(vsmItems.map(item => ({
                    id: item.id,
                    projectName: item.name,
                    lastModified: item.lastModified,
                    isVsm: true
                })));
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (isModelsCategory) {
                const savedModels = localStorage.getItem('motionModels');
                const parsedModels = savedModels ? JSON.parse(savedModels) : [];
                setModels(parsedModels);
                setProjects([]);
                setManuals([]);
                setFolders([]);
                setBreadcrumbs([]);
            } else if (activeCategory === 'best-worst') {
                const allProjects = await getAllProjects();
                const projectsWithData = allProjects.filter(p => p.measurements && p.measurements.length > 0);
                setProjects(projectsWithData);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (activeCategory === 'rearrangement') {
                const allProjects = await getAllProjects();
                const projectsWithData = allProjects.filter(p => p.measurements && p.measurements.length > 0);
                setProjects(projectsWithData);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (activeCategory === 'waste') {
                const allProjects = await getAllProjects();
                const projectsWithData = allProjects.filter(p => p.measurements && p.measurements.length > 0);
                setProjects(projectsWithData);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
                setManuals([]);
            } else if (activeCategory === 'api') {
                const apiProviders = [
                    { id: 'gemini', name: 'Gemini', provider: 'gemini', key: localStorage.getItem('gemini_api_key_stored') || localStorage.getItem('gemini_api_key') || '', model: localStorage.getItem('gemini_model_stored') || localStorage.getItem('gemini_model') || 'gemini-1.5-flash-latest', baseUrl: '' },
                    { id: 'openai', name: 'OpenAI', provider: 'openai', key: localStorage.getItem('openai_api_key') || '', model: localStorage.getItem('openai_model') || 'gpt-4o', baseUrl: 'https://api.openai.com/v1' },
                    { id: 'grok', name: 'Grok', provider: 'grok', key: localStorage.getItem('xai_api_key') || '', model: localStorage.getItem('xai_model') || 'grok-beta', baseUrl: 'https://api.x.ai/v1' },
                    { id: 'openrouter', name: 'OpenRouter', provider: 'openrouter', key: localStorage.getItem('openrouter_api_key') || '', model: localStorage.getItem('openrouter_model') || 'google/gemini-flash-1.5', baseUrl: 'https://openrouter.ai/api/v1' },
                    { id: 'ollama', name: 'Ollama', provider: 'ollama', key: localStorage.getItem('ollama_api_key') || 'ollama', model: localStorage.getItem('ollama_model') || 'llama3', baseUrl: 'http://localhost:11434/v1' },
                    { id: 'custom', name: 'Custom', provider: 'custom', key: localStorage.getItem('custom_api_key') || '', model: localStorage.getItem('custom_model') || 'qwen2.5:latest', baseUrl: localStorage.getItem('ai_base_url') || 'http://localhost:11434/v1' }
                ];
                setApis(apiProviders);
                setProjects([]);
                setManuals([]);
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
            } else {
                // For Recent/Favorites, we might just want to show a simple list (not implemented here yet)
                const allProjects = await getAllProjects();
                setProjects(allProjects.slice(0, 20)); // Mock recent
                setFolders([]);
                setBreadcrumbs([]);
                setModels([]);
                setApis([]);
            }

        } catch (err) {
            console.error('Failed to load data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateFolder = async () => {
        const promptMsg = t('fileExplorer.newFolder') || 'Enter folder name:';
        const name = await showPrompt(promptMsg, '', t('fileExplorer.folder') || 'New Folder');

        if (!name || name.trim() === '') return;

        try {
            const section = activeCategory === 'projects' ? 'projects' : 'manuals';
            console.log(`Creating folder: ${name} in section: ${section}, parent: ${currentFolderId}`);

            await createFolder(name.trim(), section, currentFolderId);
            await loadData(); // Refresh list

            // Optional: Give feedback if needed, though loadData updates the UI
        } catch (e) {
            console.error('Folder creation failed:', e);
            await showAlert('Error', (t('fileExplorer.createFolderFailed', { defaultValue: 'Failed to create folder: ' })) + e.message);
        }
    };

    const handleNavigateFolder = (folderId) => {
        setCurrentFolderId(folderId);
        setSelectedItems([]);
    };

    const handleNavigateUp = () => {
        if (breadcrumbs.length > 1) {
            const parent = breadcrumbs[breadcrumbs.length - 2];
            setCurrentFolderId(parent.id);
        } else {
            setCurrentFolderId(null);
        }
    };

    const handleDelete = async (type, id) => {
        if (!await showConfirm(t('fileExplorer.deleteConfirm') || 'Are you sure you want to delete this?')) return;

        try {
            if (type === 'project') {
                await deleteProjectById(id);
            } else if (type === 'vsm') {
                await deleteVSM(id);
            } else if (type === 'manual' || type === 'knowledge-base') {
                await deleteKnowledgeBaseItem(id);
            } else if (type === 'folder') {
                await deleteFolder(id);
            } else if (type === 'dataset') {
                await deleteDataset(id);
            } else if (type === 'model') {
                const savedModels = localStorage.getItem('motionModels');
                const parsedModels = savedModels ? JSON.parse(savedModels) : [];
                const updatedModels = parsedModels.filter(m => m.id !== id);
                localStorage.setItem('motionModels', JSON.stringify(updatedModels));
            }
            loadData();
        } catch (err) {
            console.error('Delete failed:', err);
            await showAlert('Error', t('fileExplorer.deleteFailed', { defaultValue: 'Failed to delete item' }));
        }
    };

    const toggleSelect = (type, id) => {
        const key = `${type}-${id}`;
        const exists = selectedItems.find(i => `${i.type}-${i.id}` === key);
        if (exists) {
            setSelectedItems(selectedItems.filter(i => `${i.type}-${i.id}` !== key));
        } else {
            setSelectedItems([...selectedItems, { type, id }]);
        }
    };

    const handleOpenProject = async (project) => {
        await openProject(project.projectName);
    };

    const handleCreateProject = async (projectName, videoFile, folderId = null) => {
        try {
            const selectedFolderId = folderId ?? currentFolderId;
            const videoBlob = new Blob([await videoFile.arrayBuffer()], { type: videoFile.type });

            await saveProject(
                projectName,
                videoBlob,
                videoFile.name,
                [],
                null,
                null,
                selectedFolderId
            );

            setShowNewProjectDialog(false);
            await loadData();
            await showAlert('Success', `Project "${projectName}" created successfully.`);
        } catch (error) {
            console.error('Failed to create project from File Explorer:', error);
            await showAlert('Error', `Failed to create project: ${error.message}`);
        }
    };

    const handleOpenManual = (manual) => {
        // We navigate to manual creation and passing the manual ID
        navigate('/manual-creation', { state: { manualId: manual.id } });
    };

    const handleOpenModel = (model) => {
        navigate('/studio-model');
    };

    const handleOpenSwcs = async (project) => {
        await openProject(project.projectName);
        navigate('/swcs');
    };

    const handleOpenYamazumi = async (project) => {
        await openProject(project.projectName);
        navigate('/yamazumi');
    };

    const handleOpenBestWorst = async (project) => {
        await openProject(project.projectName);
        navigate('/best-worst');
    };

    const handleOpenRearrangement = async (project) => {
        await openProject(project.projectName);
        navigate('/rearrangement');
    };

    const handleOpenWaste = async (project) => {
        await openProject(project.projectName);
        navigate('/waste-elimination');
    };

    const handleOpenVsm = (vsm) => {
        navigate('/value-stream-map', { state: { vsmId: vsm.id, vsmName: vsm.projectName } });
    };

    const handleDownloadDataset = async (dataset) => {
        if (!dataset || !dataset.zipBlob) {
            await showAlert('Error', "Error: Dataset file not found or corrupted.");
            return;
        }
        try {
            saveAs(dataset.zipBlob, `${dataset.name}.zip`);
        } catch (error) {
            console.error("Download failed:", error);
            await showAlert('Error', "Failed to download dataset: " + error.message);
        }
    };

    const handleOpenApi = (api) => {
        setEditingApi({ ...api });
        setIsApiModalOpen(true);
    };

    const loadDriveFiles = async () => {
        if (!isGoogleDriveEnabled()) {
            setDriveFiles([]);
            return;
        }

        setDriveBusy(true);
        try {
            const files = await listGoogleDriveProjectFiles();
            setDriveFiles(files || []);
        } catch (error) {
            console.error('Failed to load Google Drive files:', error);
            await showAlert('Google Drive', error.message || 'Failed to load files from Google Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleUploadProjectToDrive = async (project, e) => {
        e.stopPropagation();
        if (!isGoogleDriveEnabled()) {
            await showAlert('Google Drive', 'Enable Google Drive first in Global Settings > Cloud Storage.');
            return;
        }

        try {
            setDriveBusy(true);
            const zipBlob = await generateProjectZip(project);
            const filename = `${project.projectName}.zip`;
            await uploadProjectZipToGoogleDrive(zipBlob, filename);
            await showAlert('Success', `Project uploaded to Google Drive: ${filename}`);
            await loadDriveFiles();
        } catch (error) {
            console.error('Upload to Drive failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to upload project to Google Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handlePickWebSaveFolder = async () => {
        if (!isFsApiSupported) {
            await showAlert('Folder Access', 'Browser ini belum mendukung akses folder lokal. Gunakan Chrome/Edge terbaru.');
            return;
        }

        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
            setWebSaveDirHandle(dirHandle);
            setWebSaveDirName(dirHandle?.name || 'Selected Folder');
            await showAlert('Folder Connected', `Folder lokal terpilih: ${dirHandle?.name || 'Unknown'}`);
        } catch (error) {
            if (error?.name === 'AbortError') return;
            console.error('Failed to pick web folder:', error);
            await showAlert('Error', error.message || 'Gagal memilih folder lokal.');
        }
    };

    const saveBlobToWebSelectedFolder = async (blob, fileName) => {
        if (!webSaveDirHandle) {
            throw new Error('Folder lokal belum dipilih. Klik tombol "Pilih Folder Lokal" terlebih dahulu.');
        }

        const fileHandle = await webSaveDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    };

    const handleSaveProjectToDocuments = async (project, e) => {
        e.stopPropagation();

        try {
            const zipBlob = await generateProjectZip(project);
            const fileName = `${project.projectName}.zip`;

            // Try native Tauri save to Documents\MAVI_Projects
            try {
                const uint8 = new Uint8Array(await zipBlob.arrayBuffer());
                const savedPath = await invoke('save_project_to_documents', {
                    fileName,
                    data: Array.from(uint8)
                });

                await showAlert('Saved', `Project berhasil disimpan ke:\n${savedPath}`);
                return;
            } catch (nativeErr) {
                // Fallback for web mode/non-Tauri runtime
                console.warn('Native Documents save unavailable, fallback to browser download:', nativeErr);
            }

            if (isFsApiSupported && webSaveDirHandle) {
                await saveBlobToWebSelectedFolder(zipBlob, fileName);
                await showAlert('Saved', `Project berhasil disimpan ke folder lokal: ${webSaveDirName || 'Selected Folder'}\\${fileName}`);
                return;
            }

            saveAs(zipBlob, fileName);
            if (isFsApiSupported) {
                await showAlert('Saved', `Mode web: file diunduh sebagai ${fileName}.\nTip: klik "Pilih Folder Lokal" agar save berikutnya langsung ke folder terpilih.`);
            } else {
                await showAlert('Saved', `Mode web terdeteksi. File diunduh sebagai ${fileName}.`);
            }
        } catch (error) {
            console.error('Save to Documents failed:', error);
            await showAlert('Error', error.message || 'Gagal menyimpan project ke Documents.');
        }
    };

    const handleDownloadFromDrive = async (file, e) => {
        e.stopPropagation();
        try {
            setDriveBusy(true);
            const blob = await downloadGoogleDriveFileBlob(file.id);
            saveAs(blob, file.name || `${file.id}.zip`);
        } catch (error) {
            console.error('Drive download failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to download file from Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleImportFromDrive = async (file, e) => {
        e.stopPropagation();
        try {
            setDriveBusy(true);
            const imported = await importProjectFromGoogleDriveFile(file.id);
            const importedName = `${imported.projectName} (Drive ${new Date().toLocaleString('sv-SE').replace(' ', '_')})`;

            await saveProject(
                importedName,
                imported.videoBlob,
                imported.videoName,
                imported.measurements || [],
                imported.swcsData || null,
                imported.standardWorkLayoutData || null,
                currentFolderId,
                imported.facilityLayoutData || null
            );

            await showAlert('Success', `Project imported from Drive as "${importedName}"`);
            await loadData();
        } catch (error) {
            console.error('Drive import failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to import project from Drive.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleShareDriveFileToEmail = async (file, e) => {
        e.stopPropagation();
        const email = await showPrompt('Share to Email', 'Enter recipient email:', '');
        if (!email || !email.trim()) return;

        try {
            setDriveBusy(true);
            await shareGoogleDriveFileWithEmail(file.id, email.trim(), 'reader');
            await showAlert('Success', `Access granted to ${email}`);
        } catch (error) {
            console.error('Drive share failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to share file.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleCreateDriveLink = async (file, e) => {
        e.stopPropagation();
        try {
            setDriveBusy(true);
            const res = await createGoogleDriveShareLink(file.id, 'reader');
            const link = res.webViewLink || res.webContentLink;
            if (link && navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(link);
            }
            await showAlert('Share Link', link ? `Link copied:\n${link}` : 'Link generated but unavailable.');
        } catch (error) {
            console.error('Drive link failed:', error);
            await showAlert('Google Drive', error.message || 'Failed to create share link.');
        } finally {
            setDriveBusy(false);
        }
    };

    const handleSaveApi = () => {
        if (!editingApi) return;

        const { id, key, model, baseUrl } = editingApi;

        // Store in provider-specific slots
        if (id === 'gemini') {
            localStorage.setItem('gemini_api_key_stored', key);
            localStorage.setItem('gemini_model_stored', model);
        } else if (id === 'openai') {
            localStorage.setItem('openai_api_key', key);
            localStorage.setItem('openai_model', model);
        } else if (id === 'grok') {
            localStorage.setItem('xai_api_key', key);
            localStorage.setItem('xai_model', model);
        } else if (id === 'openrouter') {
            localStorage.setItem('openrouter_api_key', key);
            localStorage.setItem('openrouter_model', model);
        } else if (id === 'custom') {
            localStorage.setItem('custom_api_key', key);
            localStorage.setItem('custom_model', model);
        } else if (id === 'ollama') {
            localStorage.setItem('ollama_api_key', key);
            localStorage.setItem('ollama_model', model);
        }

        // Check if this is the currently active provider
        const activeProvider = localStorage.getItem('ai_provider') || 'gemini';
        if (activeProvider === id) {
            localStorage.setItem('gemini_api_key', key);
            localStorage.setItem('gemini_model', model);
            localStorage.setItem('ai_base_url', baseUrl || '');
        }

        setIsApiModalOpen(false);
        setEditingApi(null);
        loadData();
    };

    const handleActivateApi = async (api) => {
        localStorage.setItem('ai_provider', api.provider);
        localStorage.setItem('gemini_api_key', api.key);
        localStorage.setItem('gemini_model', api.model);
        localStorage.setItem('ai_base_url', api.baseUrl || '');
        loadData();
        await showAlert('AI Activated', `${api.name} AI activated as default provider.`);
    };

    const filteredProjects = projects
        .filter(p =>
            p.projectName &&
            p.projectName.trim() !== '' &&
            !p.projectName.startsWith('{') &&
            p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => {
            if (sortBy === 'name') return (a.projectName || '').localeCompare(b.projectName || '');
            return new Date(b.lastModified || 0) - new Date(a.lastModified || 0);
        });

    const categories = [
        { id: 'projects', label: t('fileExplorer.projects') || 'Projects', icon: <FileVideo size={18} />, color: '#3b82f6' },
        { id: 'datasets', label: t('fileExplorer.datasets', { defaultValue: 'Datasets (JSON/Zip)' }), icon: <Download size={18} />, color: '#10b981' },
        { id: 'swcs', label: t('fileExplorer.swcs') || 'SWCS', icon: <GanttChart size={18} />, color: '#10b981' },
        { id: 'yamazumi', label: t('fileExplorer.yamazumi') || 'Yamazumi', icon: <BarChart3 size={18} />, color: '#f59e0b' },
        { id: 'best-worst', label: t('fileExplorer.bestWorst') || 'Best vs Worst', icon: <Trophy size={18} />, color: '#f59e0b' },
        { id: 'rearrangement', label: t('fileExplorer.rearrangement') || 'Rearrange', icon: <RefreshCw size={18} />, color: '#8b5cf6' },
        { id: 'waste', label: t('fileExplorer.waste') || 'Waste Elimination', icon: <Trash2 size={18} />, color: '#ef4444' },
        { id: 'vsm', label: t('fileExplorer.vsm') || 'VSM', icon: <Network size={18} />, color: '#8b5cf6' },
        { id: 'manuals', label: t('fileExplorer.manuals') || 'Manuals', icon: <Book size={18} />, color: '#ec4899' },
        { id: 'models', label: t('fileExplorer.models') || 'Models', icon: <Activity size={18} />, color: '#10b981' },
        { id: 'api', label: t('fileExplorer.api') || 'API', icon: <Settings size={18} />, color: '#f59e0b' },
        { id: 'recent', label: t('fileExplorer.recent') || 'Recent', icon: <Clock size={18} />, color: '#10b981' },
        { id: 'favorites', label: t('fileExplorer.favorites') || 'Favorites', icon: <Star size={18} />, color: '#f59e0b' },
    ];

    const getFolderName = (name) => {
        if (name === 'Main Workspace') return t('fileExplorer.mainWorkspace');
        if (name === 'TM Studio') return t('fileExplorer.tmStudio');
        return name;
    };

    const styles = {
        mainContainer: {
            display: 'flex',
            height: '100%',
            backgroundColor: '#050505',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden'
        },
        sidebar: {
            width: '240px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            backgroundColor: 'rgba(255,255,255,0.01)'
        },
        contentArea: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        },
        sidebarItem: (active) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginBottom: '4px',
            backgroundColor: active ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
            color: active ? '#3b82f6' : '#888',
            fontWeight: active ? '600' : '400'
        }),
        header: {
            padding: '24px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
        },
        toolbar: {
            padding: '16px 32px',
            display: 'flex',
            gap: '16px',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.01)'
        },
        searchWrapper: {
            position: 'relative',
            flex: 1,
            maxWidth: '500px'
        },
        searchIcon: {
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666'
        },
        searchInput: {
            width: '100%',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            padding: '10px 12px 10px 40px',
            color: '#fff',
            outline: 'none',
            fontSize: '0.9rem'
        },
        scrollArea: {
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px'
        },
        list: {
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        },
        card: (selected, active) => ({
            backgroundColor: active ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? '#3b82f6' : selected ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '16px',
            padding: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        }),
        listItem: (selected, active) => ({
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: active ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${active ? '#3b82f6' : selected ? '#3b82f6' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            gap: '16px'
        }),
        viewToggle: {
            display: 'flex',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '2px'
        },
        viewBtn: (active) => ({
            padding: '6px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: active ? '#333' : 'transparent',
            color: active ? '#fff' : '#666',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }),
        badge: {
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: '#3b82f6',
            padding: '2px 8px',
            borderRadius: '100px',
            fontSize: '0.7rem',
            fontWeight: '600',
            marginLeft: '8px'
        },
        breadcrumb: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            color: '#666',
            marginBottom: '16px'
        }
    };

    return (
        <div style={styles.mainContainer}>
            {/* Sidebar */}
            <div style={styles.sidebar}>
                <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '8px', padding: '0 8px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Grid size={20} color="#fff" />
                    </div>
                    <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{t('fileExplorer.title', { defaultValue: 'Explorer' })}</span>
                </div>

                {categories.map(cat => (
                    <div
                        key={cat.id}
                        style={styles.sidebarItem(activeCategory === cat.id)}
                        onClick={() => { setActiveCategory(cat.id); setCurrentFolderId(null); }}
                    >
                        {cat.icon}
                        {cat.label}
                    </div>
                ))}

                <div style={{ marginTop: 'auto', padding: '16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>{t('fileExplorer.storageUsed', { defaultValue: 'Storage' })}</div>
                    <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '45%', backgroundColor: '#3b82f6', borderRadius: '2px' }}></div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.7rem', color: '#444' }}>
                        <span>{t('fileExplorer.used', { defaultValue: 'Used' })} 1.2 GB</span>
                        <span>{t('fileExplorer.total', { defaultValue: 'Total' })} 5.0 GB</span>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div style={styles.contentArea}>
                <div style={styles.header}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
                        {categories.find(c => c.id === activeCategory)?.label || activeCategory}
                    </h2>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        {activeCategory === 'projects' && (
                            <button
                                onClick={() => setShowNewProjectDialog(true)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <Plus size={18} /> {t('project.newProject') || 'New Project'}
                            </button>
                        )}
                        {activeCategory === 'projects' && (
                            <button
                                onClick={handlePickWebSaveFolder}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: isFsApiSupported ? 'rgba(16,185,129,0.15)' : 'rgba(107,114,128,0.2)', color: isFsApiSupported ? '#86efac' : '#9ca3af', border: `1px solid ${isFsApiSupported ? 'rgba(16,185,129,0.45)' : 'rgba(107,114,128,0.35)'}`, borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                                title={isFsApiSupported ? 'Pilih folder lokal untuk save langsung (Web File System Access API)' : 'Browser tidak mendukung File System Access API'}
                            >
                                <Folder size={18} /> {webSaveDirName ? `Folder: ${webSaveDirName}` : 'Pilih Folder Lokal'}
                            </button>
                        )}
                        {activeCategory === 'projects' && (
                            <button
                                onClick={async () => {
                                    const next = !showDrivePanel;
                                    setShowDrivePanel(next);
                                    if (next) await loadDriveFiles();
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <Cloud size={18} /> {showDrivePanel ? 'Hide Drive' : 'Google Drive'}
                            </button>
                        )}
                        {(activeCategory === 'projects' || activeCategory === 'manuals') && (
                            <button
                                onClick={handleCreateFolder}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#fff', color: '#000', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}
                            >
                                <FolderPlus size={18} /> {t('fileExplorer.newFolder', { defaultValue: 'New Folder' })}
                            </button>
                        )}
                    </div>
                </div>

                <div style={styles.toolbar}>
                    <div style={styles.searchWrapper}>
                        <Search size={18} style={styles.searchIcon} />
                        <input
                            style={styles.searchInput}
                            placeholder={t('fileExplorer.searchPlaceholder')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>



                    <div style={styles.viewToggle}>
                        <button style={styles.viewBtn(viewMode === 'grid')} onClick={() => setViewMode('grid')}><Grid size={18} /></button>
                        <button style={styles.viewBtn(viewMode === 'list')} onClick={() => setViewMode('list')}><ListIcon size={18} /></button>
                    </div>

                    <button
                        onClick={loadData}
                        style={{ ...styles.viewBtn(false), padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)' }}
                    >
                        <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                    </button>
                </div>

                <div style={styles.scrollArea}>
                    {activeCategory === 'projects' && showDrivePanel && (
                        <div style={{ marginBottom: '16px', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '12px', padding: '12px', background: 'rgba(59,130,246,0.06)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ fontWeight: 700, color: '#bfdbfe' }}>Google Drive Files</div>
                                <button
                                    onClick={loadDriveFiles}
                                    disabled={driveBusy}
                                    style={{ ...styles.viewBtn(false), padding: '8px 10px', backgroundColor: 'rgba(255,255,255,0.08)', color: '#fff' }}
                                >
                                    {driveBusy ? '...' : 'Refresh'}
                                </button>
                            </div>

                            {driveFiles.length === 0 ? (
                                <div style={{ color: '#93a4b8', fontSize: '0.85rem' }}>
                                    No project zip files found on Drive (or not connected yet).
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {driveFiles.map(file => (
                                        <div key={file.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px' }}>
                                            <div>
                                                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>{file.name}</div>
                                                <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleString() : '-'}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                <button onClick={(e) => handleImportFromDrive(file, e)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer' }}>Import</button>
                                                <button onClick={(e) => handleDownloadFromDrive(file, e)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#0f766e', color: 'white', cursor: 'pointer' }}>Download</button>
                                                <button onClick={(e) => handleShareDriveFileToEmail(file, e)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#7c3aed', color: 'white', cursor: 'pointer' }}>Share</button>
                                                <button onClick={(e) => handleCreateDriveLink(file, e)} style={{ padding: '6px 10px', borderRadius: '6px', border: 'none', background: '#374151', color: 'white', cursor: 'pointer' }}>Link</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Breadcrumbs */}
                    {(currentFolderId || breadcrumbs.length > 0) && (
                        <div style={styles.breadcrumb}>
                            <span
                                style={{ cursor: 'pointer', color: '#3b82f6' }}
                                onClick={() => setCurrentFolderId(null)}
                            >
                                {t('fileExplorer.root')}
                            </span>
                            {breadcrumbs.map((crumb, idx) => (
                                <React.Fragment key={crumb.id}>
                                    <ChevronRight size={14} color="#333" />
                                    <span
                                        style={{
                                            cursor: 'pointer',
                                            color: idx === breadcrumbs.length - 1 ? '#fff' : '#666'
                                        }}
                                        onClick={() => setCurrentFolderId(crumb.id)}
                                    >
                                        {getFolderName(crumb.name)}
                                    </span>
                                </React.Fragment>
                            ))}
                        </div>
                    )}

                    {isLoading && folders.length === 0 && projects.length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: '#444' }}>
                            <RefreshCw size={48} className="animate-spin" style={{ marginBottom: '16px' }} />
                            <RefreshCw size={48} className="animate-spin" style={{ marginBottom: '16px' }} />
                            <span>{t('fileExplorer.loading')}</span>
                        </div>

                    ) : (
                        <div style={viewMode === 'grid' ? styles.grid : styles.list}>
                            {/* Folders */}
                            {folders.map(folder => (
                                <div
                                    key={`folder-${folder.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    onDoubleClick={() => handleNavigateFolder(folder.id)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '48px' : '32px',
                                        height: viewMode === 'grid' ? '48px' : '32px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#f59e0b'
                                    }}>
                                        <Folder size={viewMode === 'grid' ? 24 : 18} fill="#f59e0b" style={{ opacity: 0.8 }} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{getFolderName(folder.name)}</div>
                                        {viewMode === 'list' && <div style={{ fontSize: '0.8rem', color: '#555' }}>{t('fileExplorer.folder', { defaultValue: 'Folder' })} • {new Date(folder.createdAt).toLocaleDateString()}</div>}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('folder', folder.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Projects */}
                            {activeCategory === 'projects' && filteredProjects.map(project => (
                                <div
                                    key={project.id}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.projectName === project.projectName) : styles.listItem(false, currentProject?.projectName === project.projectName)}
                                    onDoubleClick={() => handleOpenProject(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6',
                                        overflow: 'hidden'
                                    }}>
                                        <FileVideo size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>

                                            {project.projectName}
                                            {currentProject?.projectName === project.projectName && <span style={styles.badge}>{t('fileExplorer.active')}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <FileVideo size={14} /> {project.videoName}
                                            </div>
                                            {project.measurements && project.measurements.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: '500' }}>
                                                    <Activity size={14} /> {project.measurements.length} {t('fileExplorer.measurements')}
                                                    ({project.measurements.reduce((sum, m) => sum + (m.duration || 0), 0).toFixed(1)}s)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => handleSaveProjectToDocuments(project, e)}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#86efac', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                            title="Save project ZIP (Desktop: Documents/MAVI_Projects, Web: folder terpilih/download)"
                                        >
                                            <Download size={14} style={{ display: 'inline', marginRight: '6px' }} />Docs
                                        </button>
                                        <button
                                            onClick={(e) => handleUploadProjectToDrive(project, e)}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(30, 64, 175, 0.35)', color: '#dbeafe', border: '1px solid rgba(59,130,246,0.4)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                            title="Upload project ZIP to Google Drive"
                                        >
                                            <Cloud size={14} style={{ display: 'inline', marginRight: '6px' }} />Drive
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (project.isVsm) handleOpenVsm(project);
                                                else handleOpenProject(project);
                                            }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.open', { defaultValue: 'Open' })}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(project.isVsm ? 'vsm' : 'project', project.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Datasets */}
                            {(activeCategory === 'projects' || activeCategory === 'datasets' || activeCategory === 'recent') && datasets.map(dataset => (
                                <div
                                    key={`dataset-${dataset.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    title={`Created: ${new Date(dataset.createdAt).toLocaleString()}`}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#10b981',
                                        overflow: 'hidden'
                                    }}>
                                        <Download size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                                            {dataset.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            📦 {(dataset.size / 1024).toFixed(1)} KB • {dataset.projectName}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownloadDataset(dataset); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >

                                            {t('fileExplorer.downloadAction')}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('dataset', dataset.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Yamazumi Items */}
                            {activeCategory === 'yamazumi' && projects.filter(p => p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                                <div
                                    key={`yamazumi-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.id === project.id) : styles.listItem(false, currentProject?.id === project.id)}
                                    onDoubleClick={() => handleOpenYamazumi(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#f59e0b',
                                        overflow: 'hidden'
                                    }}>
                                        <BarChart3 size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                            {project.projectName}
                                            {currentProject?.id === project.id && <span style={styles.badge}>{t('fileExplorer.active')}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            📊 {project.measurements?.length || 0} {t('fileExplorer.elements')}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Rearrangement Items */}
                            {activeCategory === 'rearrangement' && projects.filter(p => p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                                <div
                                    key={`rearrangement-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.id === project.id) : styles.listItem(false, currentProject?.id === project.id)}
                                    onDoubleClick={() => handleOpenRearrangement(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#8b5cf6',
                                        overflow: 'hidden'
                                    }}>
                                        <RefreshCw size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>

                                            {project.projectName}
                                            {currentProject?.id === project.id && <span style={styles.badge}>{t('fileExplorer.active')}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            🔄 {project.measurements?.length || 0} {t('fileExplorer.elements')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenRearrangement(project); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.rearrangeAction')}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Waste Elimination Items */}
                            {activeCategory === 'waste' && projects.filter(p => p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                                <div
                                    key={`waste-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.id === project.id) : styles.listItem(false, currentProject?.id === project.id)}
                                    onDoubleClick={() => handleOpenWaste(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#ef4444',
                                        overflow: 'hidden'
                                    }}>
                                        <Trash2 size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>

                                            {project.projectName}
                                            {currentProject?.id === project.id && <span style={styles.badge}>{t('fileExplorer.active')}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            🗑️ {project.measurements?.length || 0} {t('fileExplorer.elements')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenWaste(project); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.eliminateAction')}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Best vs Worst Items */}
                            {activeCategory === 'best-worst' && projects.filter(p => p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                                <div
                                    key={`best-worst-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.id === project.id) : styles.listItem(false, currentProject?.id === project.id)}
                                    onDoubleClick={() => handleOpenBestWorst(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#f59e0b',
                                        overflow: 'hidden'
                                    }}>
                                        <Trophy size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>

                                            {project.projectName}
                                            {currentProject?.id === project.id && <span style={styles.badge}>{t('fileExplorer.active')}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            🏆 {project.measurements?.length || 0} {t('fileExplorer.elements')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenBestWorst(project); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.analyzeAction')}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* VSM Items */}
                            {activeCategory === 'vsm' && projects.map(project => (
                                <div
                                    key={`vsm-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    onDoubleClick={() => handleOpenVsm()}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#8b5cf6',
                                        overflow: 'hidden'
                                    }}>
                                        <Network size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>
                                            {project.projectName}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            🏭 {t('fileExplorer.globalMap')}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenVsm(); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.designAction')}
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* SWCS Items */}
                            {activeCategory === 'swcs' && projects.filter(p => p.projectName?.toLowerCase().includes(searchQuery.toLowerCase())).map(project => (
                                <div
                                    key={`swcs-${project.id}`}
                                    style={viewMode === 'grid' ? styles.card(false, currentProject?.id === project.id) : styles.listItem(false, currentProject?.id === project.id)}
                                    onDoubleClick={() => handleOpenSwcs(project)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#10b981',
                                        overflow: 'hidden'
                                    }}>
                                        <GanttChart size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                            {project.projectName || `SWCS #${project.id}`}
                                            {currentProject?.id === project.id && <span style={styles.badge}>Active</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            📄 {project.videoName || 'No Video'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenSwcs(project); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('project', project.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Manuals */}
                            {activeCategory === 'manuals' && manuals.filter(m => m.title?.toLowerCase().includes(searchQuery.toLowerCase())).map(manual => (
                                <div
                                    key={manual.id}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    onDoubleClick={() => handleOpenManual(manual)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#8b5cf6'
                                    }}>
                                        <Book size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{manual.title}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            {manual.description || 'No description'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenManual(manual); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('manual', manual.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* Models */}
                            {activeCategory === 'models' && models.filter(m => m.name?.toLowerCase().includes(searchQuery.toLowerCase())).map(model => (
                                <div
                                    key={model.id}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    onDoubleClick={() => handleOpenModel(model)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#10b981'
                                    }}>
                                        <Activity size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600' }}>{model.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            {model.states || 0} States • {model.rules || 0} Rules
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenModel(model); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            {t('fileExplorer.openAction')}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete('model', model.id); }}
                                            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '4px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {/* API Providers */}
                            {activeCategory === 'api' && apis.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(api => (
                                <div
                                    key={api.id}
                                    style={viewMode === 'grid' ? styles.card(false, false) : styles.listItem(false, false)}
                                    onDoubleClick={() => handleOpenApi(api)}
                                >
                                    <div style={{
                                        width: viewMode === 'grid' ? '100%' : '32px',
                                        height: viewMode === 'grid' ? '120px' : '32px',
                                        backgroundColor: api.key ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: api.key ? '#3b82f6' : '#ef4444'
                                    }}>
                                        <Settings size={viewMode === 'grid' ? 40 : 18} />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center' }}>
                                            {api.name} AI
                                            {(localStorage.getItem('ai_provider') === api.provider || (api.provider === 'gemini' && !localStorage.getItem('ai_provider'))) && (
                                                <span style={styles.badge}>Active</span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                                            {api.key ? `••••${api.key.slice(-4)}` : 'No Key Set'} • {api.model}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleActivateApi(api); }}
                                            disabled={localStorage.getItem('ai_provider') === api.provider}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: localStorage.getItem('ai_provider') === api.provider ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                color: localStorage.getItem('ai_provider') === api.provider ? '#10b981' : '#fff',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                cursor: localStorage.getItem('ai_provider') === api.provider ? 'default' : 'pointer',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {localStorage.getItem('ai_provider') === api.provider ? 'Activated' : 'Activate'}
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleOpenApi(api); }}
                                            style={{ padding: '6px 12px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                                        >
                                            Configure
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {!isLoading && folders.length === 0 && (
                                activeCategory === 'projects' ? filteredProjects.length === 0 :
                                    activeCategory === 'swcs' ? projects.length === 0 :
                                        activeCategory === 'yamazumi' ? projects.length === 0 :
                                            activeCategory === 'rearrangement' ? projects.length === 0 :
                                                activeCategory === 'waste' ? projects.length === 0 :
                                                    activeCategory === 'vsm' ? projects.length === 0 :
                                                        activeCategory === 'manuals' ? manuals.length === 0 :
                                                            activeCategory === 'models' ? models.length === 0 :
                                                                apis.length === 0
                            ) && (
                                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', color: '#333' }}>
                                        <div style={{ marginBottom: '16px' }}><Folder size={64} style={{ opacity: 0.1 }} /></div>
                                        <h3 style={{ margin: 0 }}>Empty Folder</h3>
                                        <p style={{ margin: '8px 0 0 0', fontSize: '0.9rem' }}>
                                            {activeCategory === 'swcs' ? 'No projects with SWCS data found' :
                                                activeCategory === 'yamazumi' ? 'No projects with measurement data found' :
                                                    activeCategory === 'rearrangement' ? 'No projects with measurement data found' :
                                                        activeCategory === 'waste' ? 'No projects with measurement data found' :
                                                            activeCategory === 'vsm' ? 'No Value Stream Map data found' :
                                                                activeCategory === 'models' ? 'Go to Studio Model to create a new model' :
                                                                    'Upload or create a new project to get started'}
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}
                </div>

                {/* API Editor Modal */}
                {isApiModalOpen && editingApi && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 2000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(8px)'
                    }}>
                        <div style={{
                            backgroundColor: '#111',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '24px',
                            width: '400px',
                            padding: '32px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '24px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Configure {editingApi.name}</h3>
                                <button onClick={() => setIsApiModalOpen(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>API Key</label>
                                    <input
                                        type="password"
                                        value={editingApi.key}
                                        onChange={(e) => setEditingApi({ ...editingApi, key: e.target.value })}
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                        placeholder={`Enter ${editingApi.name} API Key`}
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Default Model</label>
                                    <input
                                        value={editingApi.model}
                                        onChange={(e) => setEditingApi({ ...editingApi, model: e.target.value })}
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                        placeholder="Model ID (e.g. gemini-1.5-flash)"
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#666' }}>Base URL</label>
                                    <input
                                        value={editingApi.baseUrl}
                                        onChange={(e) => setEditingApi({ ...editingApi, baseUrl: e.target.value })}
                                        style={{
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '12px',
                                            padding: '12px',
                                            color: '#fff',
                                            outline: 'none',
                                            fontSize: '0.9rem'
                                        }}
                                        placeholder="https://api.example.com/v1"
                                        disabled={editingApi.id === 'gemini'}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={handleSaveApi}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        backgroundColor: '#3b82f6',
                                        color: '#fff',
                                        border: 'none',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t('common.save') || 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <NewProjectDialog
                    isOpen={showNewProjectDialog}
                    onClose={() => setShowNewProjectDialog(false)}
                    onSubmit={handleCreateProject}
                />
            </div>

            <style>{`
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                button:hover {
                    opacity: 0.8;
                }
            `}</style>
        </div >
    );
};

export default FileExplorer;
