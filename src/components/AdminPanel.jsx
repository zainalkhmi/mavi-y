import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { invoke } from '@tauri-apps/api/core';
import { modules as staticModules } from '../data/maviClassData';
import {
    BookOpen,
    Video,
    FileText,
    Upload,
    Search,
    Youtube,
    Save,
    ExternalLink,
    ChevronRight,
    Loader,
    Key,
    ShieldCheck,
    Mail,
    Monitor,
    LogOut,
    Link as LinkIcon,
    Bug,
    Languages,
    Globe,
    Settings,
    Database,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { generateLicenseKey } from '../utils/licenseUtils';
import {
    saveTursoCredentials,
    clearTursoCredentials,
    getTursoStatus,
    isTursoConfigured,
    getDefaultCredentials
} from '../utils/tursoClient';
import {
    createLicense,
    getAllLicenseRequests,
    updateLicenseRequestStatus,
    saveCloudInstaller,
    getAllCloudInstallers,
    deleteCloudInstaller,
    getMenuVisibilitySettings,
    upsertMenuVisibility,
    bulkUpsertMenuVisibility,
    resetMenuVisibilityToDefault
} from '../utils/tursoAPI';
import AdminLicenseManager from './AdminLicenseManager';
import AdminYouTubeManager from './AdminYouTubeManager';
import AdminLanguageControl from './AdminLanguageControl';
import { useDialog } from '../contexts/DialogContext';


const CONTROLLED_MENU_ITEMS = [
    { path: '/menu', label: 'Main Menu', group: 'Core' },
    { path: '/', label: 'Video Analysis', group: 'Core' },
    { path: '/files', label: 'File Explorer', group: 'Core' },
    { path: '/studio-model', label: 'Studio Model', group: 'AI Studio' },
    { path: '/realtime-compliance', label: 'Real-time Compliance', group: 'AI Studio' },
    { path: '/ergo-copilot', label: 'Ergo Copilot', group: 'AI Studio' },
    { path: '/swcs', label: 'SWCS', group: 'Industrial Engineering' },
    { path: '/yamazumi', label: 'Yamazumi', group: 'Industrial Engineering' },
    { path: '/value-stream-map', label: 'Value Stream Map', group: 'Industrial Engineering' },
    { path: '/statistical-analysis', label: 'Statistical Analysis', group: 'Industrial Engineering' },
    { path: '/best-worst', label: 'Best/Worst Cycle', group: 'Industrial Engineering' },
    { path: '/rearrangement', label: 'Rearrangement', group: 'Industrial Engineering' },
    { path: '/waste-elimination', label: 'Waste Elimination', group: 'Industrial Engineering' },
    { path: '/manual-creation', label: 'Manual Creation', group: 'Industrial Engineering' },
    { path: '/comparison', label: 'Video Side-by-Side', group: 'Advanced' },
    { path: '/vr-training', label: 'VR Training', group: 'Advanced' },
    { path: '/multi-axial', label: 'Multi-Axial Analysis', group: 'Advanced' },
    { path: '/mavi-class', label: 'MAVi Class', group: 'Learning & Help' },
    { path: '/knowledge-base', label: 'Knowledge Base', group: 'Learning & Help' },
    { path: '/broadcast', label: 'Broadcast', group: 'Learning & Help' }
];

const getDefaultMenuVisibilityMap = () =>
    CONTROLLED_MENU_ITEMS.reduce((acc, item) => {
        acc[item.path] = true;
        return acc;
    }, {});



function AdminPanel() {
    const { user, userRole, refreshRole, roleError, authLoading, signOut } = useAuth();
    const { showAlert, showConfirm, showPrompt } = useDialog();
    const [loading, setLoading] = useState(true);

    // MaviClass management state
    const [customContent, setCustomContent] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState(null);
    const [selectedLessonId, setSelectedLessonId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingVideoUrl, setEditingVideoUrl] = useState('');

    // License Requests management state
    const [licenseRequests, setLicenseRequests] = useState([]);
    const [allLicenses, setAllLicenses] = useState([]);
    const [activeTab, setActiveTab] = useState('maviclass'); // 'maviclass', 'licenses', 'generator', 'installers', 'license-manager', 'youtube-manager', 'bug-checker', 'menu-control'
    const [processingRequest, setProcessingRequest] = useState(null);
    const [manualEmail, setManualEmail] = useState('');
    const [isGeneratingManual, setIsGeneratingManual] = useState(false);
    const [generatedKey, setGeneratedKey] = useState('');

    // Installer state
    const [installers, setInstallers] = useState([]);
    const [uploadingInstaller, setUploadingInstaller] = useState(false);

    const [testResults, setTestResults] = useState(null);
    const [runningTests, setRunningTests] = useState(false);
    const [testError, setTestError] = useState(null);
    const [selectedFeatures, setSelectedFeatures] = useState(['smoke']);
    const [menuVisibility, setMenuVisibility] = useState(getDefaultMenuVisibilityMap());
    const [menuVisibilityLoading, setMenuVisibilityLoading] = useState(false);
    const [menuVisibilitySaving, setMenuVisibilitySaving] = useState(false);

    const availableFeatures = [
        { id: 'smoke', label: 'Basic Smoke Test', group: 'General' },
        { id: 'files', label: 'File Explorer', group: 'General' },
        { id: 'analysis', label: 'Analysis Dashboard', group: 'Analytics' },
        { id: 'yamazumi', label: 'Yamazumi Chart', group: 'Analytics' },
        { id: 'statistical', label: 'Statistical Analysis', group: 'Analytics' },
        { id: 'cycle', label: 'Cycle Time Analysis', group: 'Process' },
        { id: 'swcs', label: 'Standard Work Sheet', group: 'Process' },
        { id: 'vsm', label: 'Value Stream Map', group: 'Process' },
        { id: 'rearrangement', label: 'Element Rearrangement', group: 'Process' },
        { id: 'waste', label: 'Waste Elimination', group: 'Process' },
        { id: 'best-worst', label: 'Best/Worst Cycle', group: 'Process' },
        { id: 'comparison', label: 'Video Comparison', group: 'Process' },
        { id: 'mtm', label: 'MTM Calculator', group: 'Calculators' },
        { id: 'studio-model', label: 'Studio Model (AI)', group: 'AI Studio' },
        // { id: 'teachable-machine', label: 'Teachable Machine', group: 'AI Studio' },
        { id: 'compliance', label: 'Real-time Compliance', group: 'AI Studio' },
        { id: 'ergo-copilot', label: 'Ergo Copilot', group: 'AI Studio' },
        { id: 'multi-axial', label: 'Multi-Axial Analysis', group: 'Advanced' },
        { id: 'vr-training', label: 'VR Training Mode', group: 'Advanced' },
        { id: 'knowledge', label: 'Knowledge Base', group: 'Platform' },
        { id: 'maviclass', label: 'MaviClass', group: 'Platform' },
        { id: 'broadcast', label: 'Broadcast', group: 'Platform' },
        { id: 'manual-creation', label: 'Manual Creation', group: 'Platform' },
        { id: 'admin', label: 'Admin Panel Access', group: 'System' }
    ];

    // Database Settings State
    const [showSettings, setShowSettings] = useState(false);
    const [dbUrl, setDbUrl] = useState('');
    const [authToken, setAuthToken] = useState('');
    const [dbStatus, setDbStatus] = useState(null);
    const [checkingDb, setCheckingDb] = useState(false);

    useEffect(() => {
        checkDbStatus();
        // Load saved credentials or defaults into form state
        const storedUrl = localStorage.getItem('turso_db_url');
        const storedToken = localStorage.getItem('turso_auth_token');

        if (storedUrl && storedToken) {
            setDbUrl(storedUrl);
            setAuthToken(storedToken);
        } else {
            // Load defaults from .env
            const defaults = getDefaultCredentials();
            setDbUrl(defaults.dbUrl);
            setAuthToken(defaults.authToken);
        }
    }, []);

    const checkDbStatus = async () => {
        setCheckingDb(true);
        const status = await getTursoStatus();
        setDbStatus(status);
        setCheckingDb(false);
    };

    const handleSaveSettings = async () => {
        if (!dbUrl || !authToken) {
            await showAlert('Warning', 'Please fill in both Database URL and Auth Token');
            return;
        }

        saveTursoCredentials(dbUrl, authToken);
        await showAlert('Success', 'Credentials saved! Testing connection...');
        await checkDbStatus();
        setShowSettings(false);
        // Reload page to ensure fresh start for all components
        if (await showConfirm('App Reload Required', 'App needs to reload to apply database changes. Reload now?')) {
            window.location.reload();
        }
    };

    const handleClearSettings = async () => {
        if (await showConfirm('Clear Credentials', 'Are you sure? This will remove saved credentials and revert to environment variables (if any).')) {
            clearTursoCredentials();

            // Revert UI state to defaults
            const defaults = getDefaultCredentials();
            setDbUrl(defaults.dbUrl);
            setAuthToken(defaults.authToken);

            await showAlert('Info', 'Credentials cleared. Reverting to default values.');
            checkDbStatus();
            setShowSettings(false);
            window.location.reload();
        }
    };

    useEffect(() => {
        // Only load if auth state is resolved
        if (!authLoading) {
            if (userRole === 'admin') {
                loadCustomContent();
                loadLicenseRequests();
                loadAllLicenses();
                loadInstallers();
            } else {
                setLoading(false);
            }
        }
    }, [userRole, authLoading]);

    useEffect(() => {
        if (activeTab === 'licenses' || activeTab === 'generator') {
            loadAllLicenses();
            loadLicenseRequests();
        } else if (activeTab === 'installers') {
            loadInstallers();
        } else if (activeTab === 'menu-control') {
            loadMenuVisibility();
        }
    }, [activeTab]);

    const loadInstallers = async () => {
        try {
            const data = await getAllCloudInstallers();
            setInstallers(data);
        } catch (error) {
            console.error("Failed to load installers:", error);
        }
    };

    const loadMenuVisibility = async () => {
        setMenuVisibilityLoading(true);
        try {
            const defaults = getDefaultMenuVisibilityMap();
            const fromCloud = await getMenuVisibilitySettings();
            setMenuVisibility({ ...defaults, ...fromCloud });
        } catch (error) {
            console.error('Failed to load menu visibility settings:', error);
            setMenuVisibility(getDefaultMenuVisibilityMap());
        } finally {
            setMenuVisibilityLoading(false);
        }
    };

    const handleToggleMenuVisibility = async (menuPath, nextVisible) => {
        const actor = user?.email || user?.id || 'admin';
        const previous = menuVisibility[menuPath] ?? true;
        setMenuVisibility(prev => ({ ...prev, [menuPath]: nextVisible }));

        const ok = await upsertMenuVisibility(menuPath, nextVisible, actor);
        if (!ok) {
            setMenuVisibility(prev => ({ ...prev, [menuPath]: previous }));
            await showAlert('Error', 'Failed to update menu visibility in Turso.');
            return;
        }

        window.dispatchEvent(new Event('menu-visibility-updated'));
    };

    const handleBulkMenuVisibility = async (visible) => {
        setMenuVisibilitySaving(true);
        try {
            const actor = user?.email || user?.id || 'admin';
            const payload = CONTROLLED_MENU_ITEMS.map(item => ({
                menuPath: item.path,
                isVisible: visible
            }));

            const ok = await bulkUpsertMenuVisibility(payload, actor);
            if (!ok) {
                await showAlert('Error', 'Failed to update menu visibility in Turso.');
                return;
            }

            const nextMap = getDefaultMenuVisibilityMap();
            Object.keys(nextMap).forEach(path => {
                nextMap[path] = visible;
            });
            setMenuVisibility(nextMap);
            window.dispatchEvent(new Event('menu-visibility-updated'));
        } finally {
            setMenuVisibilitySaving(false);
        }
    };

    const handleResetMenuVisibility = async () => {
        setMenuVisibilitySaving(true);
        try {
            const actor = user?.email || user?.id || 'admin';
            const ok = await resetMenuVisibilityToDefault(actor);
            if (!ok) {
                await showAlert('Error', 'Failed to reset menu visibility in Turso.');
                return;
            }

            setMenuVisibility(getDefaultMenuVisibilityMap());
            window.dispatchEvent(new Event('menu-visibility-updated'));
            await showAlert('Success', 'Menu visibility reset to default (all visible).');
        } finally {
            setMenuVisibilitySaving(false);
        }
    };

    const handleInstallerUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.exe')) {
            await showAlert('Invalid File', 'Please upload a valid .exe file');
            return;
        }

        setUploadingInstaller(true);
        try {
            const version = await showPrompt("Software Version", "Enter version number (e.g., 1.0.2):", "1.0.0");
            await saveCloudInstaller(file.name, file, version || '1.0.0');
            await loadInstallers();
            await showAlert('Success', 'Installer uploaded successfully to Turso Cloud!');
        } catch (error) {
            console.error('Upload failed:', error);
            await showAlert('Error', 'Failed to upload installer to Cloud.');
        } finally {
            setUploadingInstaller(false);
        }
    };

    const handleDeleteInstaller = async (id) => {
        if (await showConfirm('Delete Installer', 'Are you sure you want to delete this installer from Cloud?')) {
            await deleteCloudInstaller(id);
            await loadInstallers();
        }
    };

    const loadCustomContent = async () => {
        // In offline mode, custom content might be stored in LocalStorage or SQLite
        // For now, we'll mark it as offline-only
        try {
            const saved = localStorage.getItem('mavi_custom_content');
            if (saved) {
                setCustomContent(JSON.parse(saved));
            }
            setLoading(false);
        } catch (error) {
            console.error('Error loading custom content:', error);
            setLoading(false);
        }
    };

    const handleSaveVideoUrl = async (identifier, url) => {
        setIsSaving(true);
        try {
            const updatedContent = [...customContent];
            const index = updatedContent.findIndex(item => item.identifier === identifier);

            const newItem = {
                identifier,
                video_url: url,
                updated_at: new Date().toISOString()
            };

            if (index >= 0) {
                updatedContent[index] = { ...updatedContent[index], ...newItem };
            } else {
                updatedContent.push(newItem);
            }

            setCustomContent(updatedContent);
            localStorage.setItem('mavi_custom_content', JSON.stringify(updatedContent));
            await showAlert('Success', 'Video URL saved locally!');
        } catch (error) {
            console.error('Error saving video URL:', error);
            await showAlert('Error', 'Failed to save to local storage.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (identifier, file) => {
        await showAlert('Offline Mode', 'Cloud file upload is disabled in offline mode. Please use local file paths or URLs.');
    };

    const loadLicenseRequests = async () => {
        try {
            // Try fetching from Turso first
            const requests = await getAllLicenseRequests();
            if (requests && requests.length > 0) {
                setLicenseRequests(requests);
            } else {
                // Fallback to localStorage if Turso empty (migration phase)
                const saved = localStorage.getItem('mavi_license_requests');
                if (saved) {
                    setLicenseRequests(JSON.parse(saved));
                } else {
                    setLicenseRequests([]);
                }
            }
        } catch (error) {
            console.error("Failed to load requests:", error);
        }
    };

    const loadAllLicenses = async () => {
        console.log("Loading licenses from storage...");
        try {
            const saved = localStorage.getItem('mavi_generated_licenses');
            console.log("Raw saved licenses:", saved);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setAllLicenses(parsed);
                    console.log("Licenses loaded:", parsed.length);
                } else {
                    console.error("Saved licenses is not an array:", parsed);
                    setAllLicenses([]);
                }
            } else {
                console.log("No saved licenses found, initializing empty.");
                setAllLicenses([]);
            }
        } catch (error) {
            console.error("Failed to load licenses:", error);
            setAllLicenses([]);
        }
    };

    const [manualMachineId, setManualMachineId] = useState('');

    const handleUpdateRequestStatus = async (requestId, newStatus) => {
        // Optimistic UI update
        const updatedRequests = licenseRequests.map(req =>
            req.id === requestId ? { ...req, status: newStatus } : req
        );
        setLicenseRequests(updatedRequests);

        // Update to Turso
        try {
            await updateLicenseRequestStatus(requestId, newStatus);
            // Also update localStorage for backup
            localStorage.setItem('mavi_license_requests', JSON.stringify(updatedRequests));
        } catch (error) {
            console.error("Failed to update status in Turso:", error);
        }

        if (newStatus === 'approved') {
            const req = updatedRequests.find(r => r.id === requestId);
            const key = generateLicenseKey(req.machineId); // Pass machineId for hardware lock

            // Save to Persistent License History
            const newLicense = {
                id: Date.now(),
                key_string: key,
                email: req.email,
                machineId: req.machineId,
                status: 'active',
                created_at: new Date().toISOString()
            };

            const currentLicenses = [...allLicenses, newLicense];
            setAllLicenses(currentLicenses);
            localStorage.setItem('mavi_generated_licenses', JSON.stringify(currentLicenses));

            await showAlert('Success', `Request Approved for ${req.email}!\n\nGenerated Key: ${key}\n\nTarget Device: ${req.machineId || 'UNIVERSAL'}\n\nPlease send this key to the user.`);

            // NEW: Sync to Turso Database
            try {
                console.log("Syncing new license to Turso:", req.email);
                createLicense(key, req.email, req.machineId)
                    .then(() => console.log("✅ Check: License synced to Turso"))
                    .catch(err => console.error("❌ Failed to sync to Turso:", err));
            } catch (err) {
                console.error("Error initiating Turso sync:", err);
            }
        }
    };

    const handleGenerateManualKey = async () => {
        if (!manualEmail) {
            await showAlert('Warning', 'Please enter an email address');
            return;
        }
        setIsGeneratingManual(true);
        try {
            console.log("Generating manual key for:", manualEmail);
            const newKey = generateLicenseKey(manualMachineId);
            setGeneratedKey(newKey);

            // Save to Persistent License History
            const newLicense = {
                id: Date.now(),
                key_string: newKey,
                email: manualEmail,
                machineId: manualMachineId,
                status: 'active',
                created_at: new Date().toISOString()
            };

            // Get fresh state from storage to avoid easy race conditions
            const saved = localStorage.getItem('mavi_generated_licenses');
            let currentList = [];
            try {
                if (saved) currentList = JSON.parse(saved);
                if (!Array.isArray(currentList)) currentList = [];
            } catch (e) { console.error("Error parsing current licenses during save:", e); }

            const updatedLicenses = [...currentList, newLicense];

            console.log("Saving new license list:", updatedLicenses);
            setAllLicenses(updatedLicenses);
            localStorage.setItem('mavi_generated_licenses', JSON.stringify(updatedLicenses));

            // In offline mode, we just give the key to the admin to give to the user
            await showAlert('Success', `Key generated successfully!\n\nEmail: ${manualEmail}\nDevice Lock: ${manualMachineId || 'NO (Universal)'}\nKey: ${newKey}\n\nPlease provide this key to the user.`);

            // NEW: Sync to Turso Database
            createLicense(newKey, manualEmail, manualMachineId)
                .then(() => console.log("✅ Manual key synced to Turso"))
                .catch(err => console.error("❌ Failed to sync manual key to Turso:", err));
        } catch (error) {
            console.error('Error generating key:', error);
            await showAlert('Error', 'Failed to generate key.');
        } finally {
            setIsGeneratingManual(false);
        }
    };

    const handleRunBugChecker = async () => {
        if (selectedFeatures.length === 0) {
            await showAlert('Selection Required', 'Please select at least one feature to test.');
            return;
        }

        setRunningTests(true);
        setTestResults(null);
        setTestError(null);
        try {
            // Check if running in Tauri environment
            if (!window.__TAURI_INTERNALS__) {
                throw new Error("This feature requires the desktop application (Tauri). It cannot be run in a standard web browser.");
            }
            // Pass selected features as tags (e.g., @smoke @analysis)
            const tags = selectedFeatures.map(f => `@${f}`).join(' ');
            const result = await invoke('run_playwright_tests', { tags });
            setTestResults(result);
        } catch (err) {
            console.error("Test execution failed:", err);
            setTestError(err instanceof Error ? err.message : String(err));
        } finally {
            setRunningTests(false);
        }
    };

    const toggleFeature = (id) => {
        setSelectedFeatures(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    if (userRole !== 'admin') {
        return (
            <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: '#0a0a0a',
                height: '100vh',
                color: 'white',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🔐</div>
                <h1 style={{ fontSize: '2rem', marginBottom: '10px' }}>Access Denied</h1>
                <p style={{ color: '#888', maxWidth: '500px', margin: '0 auto 30px' }}>
                    You need admin privileges to access the management panel.
                </p>

                <div style={{
                    backgroundColor: '#1a1a1a',
                    padding: '24px',
                    borderRadius: '12px',
                    border: '1px solid #333',
                    textAlign: 'left',
                    width: '100%',
                    maxWidth: '600px',
                    marginBottom: '30px',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                }}>
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#0078d4' }}>Account Email:</span> {user?.email}
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#0078d4' }}>Your User ID:</span> <code style={{ backgroundColor: '#222', padding: '2px 6px', borderRadius: '4px' }}>{user?.id}</code>
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                        <span style={{ color: '#0078d4' }}>Current Role:</span> <span style={{ color: '#f44336' }}>{userRole || 'standard_user'}</span>
                    </div>
                    <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #333' }}>
                        Note: MAVi is running in Local Mode. Admin access is managed via internal configuration.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        onClick={() => refreshRole()}
                        style={{
                            padding: '12px 24px',
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
                        🔄 Refresh My Role
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Reload App
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0a' }}>
            {/* Tab Navigation */}
            <div style={{ padding: '20px 30px 0 30px', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setActiveTab('maviclass')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'maviclass' ? '#0078d4' : 'transparent',
                            color: activeTab === 'maviclass' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'maviclass' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s'
                        }}
                    >
                        📚 MaviClass Content
                    </button>
                    <button
                        onClick={() => setActiveTab('licenses')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'licenses' ? '#0078d4' : 'transparent',
                            color: activeTab === 'licenses' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'licenses' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            position: 'relative'
                        }}
                    >
                        🔑 License Requests
                        {licenseRequests.filter(r => r.status === 'pending').length > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                backgroundColor: '#ff4444',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: 'bold'
                            }}>
                                {licenseRequests.filter(r => r.status === 'pending').length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('generator')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'generator' ? '#0078d4' : 'transparent',
                            color: activeTab === 'generator' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'generator' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <ShieldCheck size={18} /> Key Generator
                    </button>
                    <button
                        onClick={() => setActiveTab('installers')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'installers' ? '#0078d4' : 'transparent',
                            color: activeTab === 'installers' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'installers' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Upload size={18} /> Software Updates
                    </button>
                    <button
                        onClick={() => setActiveTab('languages')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'languages' ? '#0078d4' : 'transparent',
                            color: activeTab === 'languages' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'languages' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Globe size={18} /> Language Control
                    </button>

                    <button
                        onClick={() => setActiveTab('license-manager')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'license-manager' ? '#0078d4' : 'transparent',
                            color: activeTab === 'license-manager' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'license-manager' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Key size={18} /> License Manager
                    </button>

                    <button
                        onClick={() => setActiveTab('youtube-manager')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'youtube-manager' ? '#0078d4' : 'transparent',
                            color: activeTab === 'youtube-manager' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'youtube-manager' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <LinkIcon size={18} /> YouTube Manager
                    </button>

                    <button
                        onClick={() => setActiveTab('bug-checker')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'bug-checker' ? '#0078d4' : 'transparent',
                            color: activeTab === 'bug-checker' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'bug-checker' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Bug size={18} /> Bug Checker
                    </button>

                    <button
                        onClick={() => setActiveTab('menu-control')}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: activeTab === 'menu-control' ? '#0078d4' : 'transparent',
                            color: activeTab === 'menu-control' ? 'white' : '#888',
                            border: 'none',
                            borderBottom: activeTab === 'menu-control' ? '3px solid #0078d4' : '3px solid transparent',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        👁️ Menu Control
                    </button>

                    <button
                        onClick={() => setShowSettings(true)}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'transparent',
                            color: '#e0e0e0',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginLeft: '20px'
                        }}
                    >
                        <Settings size={18} /> DB Config
                        {dbStatus && (
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                backgroundColor: dbStatus.connected ? '#4CAF50' : '#f44336',
                                display: 'inline-block',
                                marginLeft: '5px'
                            }}></span>
                        )}
                    </button>

                    <button
                        onClick={async () => {
                            if (await showConfirm('Log Out', 'Are you sure you want to log out from admin panel?')) {
                                await signOut();
                                window.location.href = '/';
                            }
                        }}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: 'transparent',
                            color: '#ff4444',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            marginLeft: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            opacity: 0.8
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                    >
                        <LogOut size={18} /> Log Out
                    </button>
                </div>
            </div>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                {activeTab === 'maviclass' ? (
                    <div style={{ display: 'flex', height: '100%', gap: '30px', padding: '30px' }}>
                        {/* Modules Panel */}
                        <div style={{ flex: 1, backgroundColor: '#1e1e1e', borderRadius: '12px', padding: '24px', overflowY: 'auto', border: '1px solid #333' }}>
                            <h2 style={{ margin: '0 0 24px 0', color: 'white', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <BookOpen size={24} color="#0078d4" /> MaviClass Course
                            </h2>
                            {staticModules.map(module => (
                                <div key={module.id} style={{ marginBottom: '15px' }}>
                                    <div
                                        onClick={() => {
                                            setSelectedModuleId(selectedModuleId === module.id ? null : module.id);
                                            setSelectedLessonId(null);
                                        }}
                                        style={{
                                            padding: '14px 18px',
                                            backgroundColor: selectedModuleId === module.id ? '#2a2a2a' : '#111',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: `1px solid ${selectedModuleId === module.id ? '#0078d4' : '#333'}`,
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: module.color }}></div>
                                            <span style={{ color: 'white', fontWeight: '600' }}>{module.title}</span>
                                        </div>
                                        <ChevronRight size={18} color="#666" style={{ transform: selectedModuleId === module.id ? 'rotate(90deg)' : 'none', transition: '0.2s' }} />
                                    </div>

                                    {selectedModuleId === module.id && (
                                        <div style={{ paddingLeft: '24px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div
                                                onClick={() => setSelectedLessonId('module-settings')}
                                                style={{
                                                    padding: '12px 15px',
                                                    backgroundColor: selectedLessonId === 'module-settings' ? '#0078d420' : 'transparent',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    color: selectedLessonId === 'module-settings' ? '#0078d4' : '#aaa',
                                                    fontSize: '0.95rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    border: `1px solid ${selectedLessonId === 'module-settings' ? '#0078d440' : 'transparent'}`
                                                }}
                                            >
                                                <FileText size={16} /> Module Resources
                                            </div>

                                            {module.lessons.map(lesson => (
                                                <div
                                                    key={lesson.id}
                                                    onClick={() => {
                                                        setSelectedLessonId(lesson.id);
                                                        const custom = customContent.find(c => c.identifier === lesson.id);
                                                        setEditingVideoUrl(custom?.video_url || lesson.content.videoUrl || '');
                                                    }}
                                                    style={{
                                                        padding: '12px 15px',
                                                        backgroundColor: selectedLessonId === lesson.id ? '#0078d420' : 'transparent',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        color: selectedLessonId === lesson.id ? '#0078d4' : '#aaa',
                                                        fontSize: '0.95rem',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        border: `1px solid ${selectedLessonId === lesson.id ? '#0078d440' : 'transparent'}`
                                                    }}
                                                >
                                                    <Video size={16} /> {lesson.title}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Editor Panel */}
                        <div style={{ flex: 2, backgroundColor: '#111', borderRadius: '12px', padding: '40px', border: '1px solid #333', overflowY: 'auto' }}>
                            {selectedLessonId ? (
                                <div style={{ color: 'white', maxWidth: '800px' }}>
                                    {selectedLessonId === 'module-settings' ? (
                                        <>
                                            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>
                                                Resources: <span style={{ color: '#0078d4' }}>{staticModules.find(m => m.id === selectedModuleId)?.title}</span>
                                            </h2>
                                            <p style={{ color: '#888', marginBottom: '40px', lineHeight: '1.6' }}>
                                                Upload reference documents (PDF, Excel, or Word) that will be available for learners to download within this module.
                                            </p>

                                            <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '16px', border: '1px solid #333' }}>
                                                <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                                                    <Upload size={22} color="#0078d4" /> Reference Document
                                                </h4>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    <div style={{
                                                        height: '120px',
                                                        border: '2px dashed #444',
                                                        borderRadius: '12px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '10px',
                                                        backgroundColor: '#0a0a0a',
                                                        position: 'relative'
                                                    }}>
                                                        <Upload size={30} color="#666" />
                                                        <span style={{ color: '#666', fontSize: '0.9rem' }}>Click or drag to upload document</span>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => handleFileUpload(selectedModuleId, e.target.files[0])}
                                                            disabled={uploading}
                                                            style={{
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                opacity: 0,
                                                                cursor: uploading ? 'not-allowed' : 'pointer'
                                                            }}
                                                        />
                                                    </div>

                                                    {uploading && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#0078d4' }}>
                                                            <Loader size={20} style={{ animation: 'spin 2s linear infinite' }} />
                                                            <span>Uploading to Supabase Storage...</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {customContent.find(c => c.identifier === selectedModuleId)?.doc_url && (
                                                    <div style={{
                                                        marginTop: '30px',
                                                        padding: '15px 20px',
                                                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                                        borderRadius: '10px',
                                                        border: '1px solid rgba(76, 175, 80, 0.3)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                            <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'rgba(76, 175, 80, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                <FileText size={20} color="#4CAF50" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '600', color: '#4CAF50', fontSize: '0.95rem' }}>Active Document</div>
                                                                <div style={{ fontSize: '0.8rem', color: '#888' }}>Uploaded on Supabase Storage</div>
                                                            </div>
                                                        </div>
                                                        <a
                                                            href={customContent.find(c => c.identifier === selectedModuleId).doc_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{
                                                                padding: '8px 16px',
                                                                backgroundColor: '#4CAF50',
                                                                borderRadius: '6px',
                                                                color: 'white',
                                                                textDecoration: 'none',
                                                                fontSize: '0.85rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '8px'
                                                            }}
                                                        >
                                                            <ExternalLink size={14} /> View Document
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>
                                                Lesson: <span style={{ color: '#0078d4' }}>{staticModules.find(m => m.id === selectedModuleId)?.lessons.find(l => l.id === selectedLessonId)?.title}</span>
                                            </h2>
                                            <p style={{ color: '#888', marginBottom: '40px', lineHeight: '1.6' }}>
                                                Override the default YouTube video for this lesson by entering a new URL below. This allows you to update course content dynamically without changing the code.
                                            </p>

                                            <div style={{ backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '16px', border: '1px solid #333' }}>
                                                <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.1rem' }}>
                                                    <Youtube size={22} color="#ff0000" /> YouTube Content
                                                </h4>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    <div style={{ display: 'flex', gap: '15px' }}>
                                                        <div style={{ position: 'relative', flex: 1 }}>
                                                            <Youtube size={18} color="#666" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                                            <input
                                                                type="text"
                                                                value={editingVideoUrl}
                                                                onChange={(e) => setEditingVideoUrl(e.target.value)}
                                                                placeholder="Paste YouTube Video URL (e.g., https://youtube.com/watch?v=...)"
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '14px 15px 14px 45px',
                                                                    backgroundColor: '#0a0a0a',
                                                                    border: '1px solid #444',
                                                                    borderRadius: '10px',
                                                                    color: 'white',
                                                                    fontSize: '1rem',
                                                                    outline: 'none',
                                                                    transition: 'border-color 0.2s'
                                                                }}
                                                                onFocus={(e) => e.target.style.borderColor = '#0078d4'}
                                                                onBlur={(e) => e.target.style.borderColor = '#444'}
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={() => handleSaveVideoUrl(selectedLessonId, editingVideoUrl)}
                                                            disabled={isSaving}
                                                            style={{
                                                                padding: '0 25px',
                                                                backgroundColor: '#0078d4',
                                                                border: 'none',
                                                                borderRadius: '10px',
                                                                color: 'white',
                                                                fontWeight: '700',
                                                                cursor: isSaving ? 'not-allowed' : 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                transition: 'all 0.2s ease',
                                                                boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
                                                            }}
                                                            onMouseEnter={(e) => { if (!isSaving) e.currentTarget.style.backgroundColor = '#1088e4'; }}
                                                            onMouseLeave={(e) => { if (!isSaving) e.currentTarget.style.backgroundColor = '#0078d4'; }}
                                                        >
                                                            {isSaving ? <Loader size={20} style={{ animation: 'spin 2s linear infinite' }} /> : <Save size={20} />}
                                                            Save Changes
                                                        </button>
                                                    </div>

                                                    <p style={{ fontSize: '0.85rem', color: '#666', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Search size={14} /> Tip: Make sure the video is public or unlisted for learners to view it.
                                                    </p>
                                                </div>

                                                {editingVideoUrl && (
                                                    <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid #333' }}>
                                                        <h5 style={{ color: '#888', marginBottom: '15px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Video Preview</h5>
                                                        <div style={{
                                                            width: '100%',
                                                            aspectRatio: '16/9',
                                                            backgroundColor: '#000',
                                                            borderRadius: '12px',
                                                            overflow: 'hidden',
                                                            border: '1px solid #333',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            {editingVideoUrl.includes('youtube.com') || editingVideoUrl.includes('youtu.be') ? (
                                                                <iframe
                                                                    width="100%"
                                                                    height="100%"
                                                                    src={`https://www.youtube.com/embed/${editingVideoUrl.split('v=')[1]?.split('&')[0] || editingVideoUrl.split('/').pop()}`}
                                                                    title="Video Preview"
                                                                    frameBorder="0"
                                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                    allowFullScreen
                                                                ></iframe>
                                                            ) : (
                                                                <span style={{ color: '#444' }}>No valid YouTube URL provided</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        backgroundColor: '#1a1a1a',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '24px'
                                    }}>
                                        <BookOpen size={50} color="#333" />
                                    </div>
                                    <h3 style={{ color: '#666', fontSize: '1.2rem', marginBottom: '10px' }}>Content Manager</h3>
                                    <p style={{ maxWidth: '300px', textAlign: 'center', color: '#555', lineHeight: '1.5' }}>
                                        Select a lesson or module from the sidebar to manage its dynamic content and resources.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'licenses' ? (
                    <div style={{ padding: '30px', overflowY: 'auto', height: '100%' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px' }}>License Requests</h2>
                            <p style={{ color: '#888', marginBottom: '30px' }}>
                                Manage user license requests. Approve or reject requests to grant application access.
                            </p>

                            {licenseRequests.length === 0 ? (
                                <div style={{
                                    padding: '60px',
                                    textAlign: 'center',
                                    backgroundColor: '#1e1e1e',
                                    borderRadius: '12px',
                                    border: '1px solid #333'
                                }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                                    <h3 style={{ color: '#666', marginBottom: '8px' }}>No License Requests</h3>
                                    <p style={{ color: '#555', fontSize: '0.9rem' }}>
                                        License requests from users will appear here.
                                    </p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {licenseRequests.map(request => (
                                        <div
                                            key={request.id}
                                            style={{
                                                backgroundColor: '#1e1e1e',
                                                padding: '24px',
                                                borderRadius: '12px',
                                                border: `1px solid ${request.status === 'pending' ? '#FFC107' :
                                                    request.status === 'approved' ? '#4CAF50' :
                                                        '#f44336'
                                                    }`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '50%',
                                                        backgroundColor: request.status === 'pending' ? 'rgba(255, 193, 7, 0.2)' :
                                                            request.status === 'approved' ? 'rgba(76, 175, 80, 0.2)' :
                                                                'rgba(244, 67, 54, 0.2)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem'
                                                    }}>
                                                        {request.status === 'pending' ? '⏳' :
                                                            request.status === 'approved' ? '✅' : '❌'}
                                                    </div>
                                                    <div>
                                                        <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '600', marginBottom: '4px' }}>
                                                            {request.email}
                                                        </div>
                                                        <div style={{ color: '#888', fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                                            User ID: {request.user_id?.substring(0, 8)}...
                                                        </div>
                                                        <div style={{ color: '#00d2ff', fontSize: '0.85rem', fontFamily: 'monospace', marginTop: '4px' }}>
                                                            Device ID: {request.machineId || 'N/A'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '20px', color: '#888', fontSize: '0.85rem' }}>
                                                    <div>
                                                        <strong style={{ color: '#aaa' }}>Status:</strong>{' '}
                                                        <span style={{
                                                            color: request.status === 'pending' ? '#FFC107' :
                                                                request.status === 'approved' ? '#4CAF50' : '#f44336',
                                                            textTransform: 'capitalize',
                                                            fontWeight: '600'
                                                        }}>
                                                            {request.status}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <strong style={{ color: '#aaa' }}>Requested:</strong>{' '}
                                                        {new Date(request.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>

                                            {request.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <button
                                                        onClick={() => handleUpdateRequestStatus(request.id, 'approved')}
                                                        disabled={processingRequest === request.id}
                                                        style={{
                                                            padding: '10px 20px',
                                                            backgroundColor: processingRequest === request.id ? '#444' : '#4CAF50',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            cursor: processingRequest === request.id ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.9rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {processingRequest === request.id ? 'Processing...' : '✓ Approve'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleUpdateRequestStatus(request.id, 'rejected')}
                                                        disabled={processingRequest === request.id}
                                                        style={{
                                                            padding: '10px 20px',
                                                            backgroundColor: processingRequest === request.id ? '#444' : 'transparent',
                                                            color: processingRequest === request.id ? '#888' : '#f44336',
                                                            border: '1px solid #f44336',
                                                            borderRadius: '8px',
                                                            fontWeight: '600',
                                                            cursor: processingRequest === request.id ? 'not-allowed' : 'pointer',
                                                            fontSize: '0.9rem',
                                                            transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        ✗ Reject
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'installers' ? (
                    <div style={{ padding: '30px', overflowY: 'auto', height: '100%' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px' }}>Software Updates</h2>
                            <p style={{ color: '#888', marginBottom: '30px' }}>
                                Upload .exe files here. The latest uploaded file will be available for download on the Landing Page.
                            </p>

                            <div style={{
                                backgroundColor: '#1e1e1e',
                                padding: '30px',
                                borderRadius: '16px',
                                border: '1px solid #333',
                                marginBottom: '40px'
                            }}>
                                <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Upload size={20} color="#0078d4" /> Upload New Version
                                </h3>
                                <div style={{
                                    border: '2px dashed #444',
                                    borderRadius: '12px',
                                    padding: '40px',
                                    textAlign: 'center',
                                    position: 'relative',
                                    backgroundColor: '#0a0a0a'
                                }}>
                                    {uploadingInstaller ? (
                                        <div style={{ color: '#0078d4' }}>
                                            <Loader size={30} className="animate-spin" style={{ marginBottom: '10px' }} />
                                            <p>Uploading and saving to database... This may take a moment.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload size={40} color="#666" style={{ marginBottom: '15px' }} />
                                            <p style={{ color: '#ccc', marginBottom: '5px' }}>Click to upload .exe installer</p>
                                            <p style={{ color: '#666', fontSize: '0.85rem' }}>Max size depends on browser/DB limits</p>
                                            <input
                                                type="file"
                                                accept=".exe"
                                                onChange={handleInstallerUpload}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0, left: 0, width: '100%', height: '100%',
                                                    opacity: 0, cursor: 'pointer'
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>

                            <h3 style={{ color: 'white', marginBottom: '15px' }}>Installer History</h3>
                            <div style={{ backgroundColor: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333', textAlign: 'left' }}>
                                            <th style={{ padding: '16px' }}>Version</th>
                                            <th style={{ padding: '16px' }}>Filename</th>
                                            <th style={{ padding: '16px' }}>Size</th>
                                            <th style={{ padding: '16px' }}>Uploaded At</th>
                                            <th style={{ padding: '16px' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {installers.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#666' }}>No installers found</td>
                                            </tr>
                                        ) : (
                                            installers.map(inst => (
                                                <tr key={inst.id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                                    <td style={{ padding: '16px', color: '#0078d4', fontWeight: 'bold' }}>{inst.version}</td>
                                                    <td style={{ padding: '16px' }}>{inst.name}</td>
                                                    <td style={{ padding: '16px' }}>{(inst.size / (1024 * 1024)).toFixed(2)} MB</td>
                                                    <td style={{ padding: '16px' }}>{new Date(inst.uploadedAt).toLocaleString()}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <button
                                                            onClick={() => handleDeleteInstaller(inst.id)}
                                                            style={{
                                                                padding: '6px 12px',
                                                                backgroundColor: '#f4433620',
                                                                color: '#f44336',
                                                                border: '1px solid #f44336',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'generator' ? (
                    <div style={{ padding: '30px', overflowY: 'auto', height: '100%' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                                <div>
                                    <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px' }}>License Key Generator</h2>
                                    <p style={{ color: '#888' }}>
                                        Issue manual license keys for users and view history of all generated keys.
                                    </p>
                                </div>
                                <button
                                    onClick={() => loadAllLicenses()}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#1a1a1a',
                                        color: '#888',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Loader size={16} /> Refresh Keys
                                </button>
                            </div>

                            {/* Manual Generator Form */}
                            <div style={{
                                backgroundColor: '#1e1e1e',
                                padding: '30px',
                                borderRadius: '16px',
                                border: '1px solid #333',
                                marginBottom: '40px'
                            }}>
                                <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Key size={20} color="#0078d4" /> Generate Manual Key
                                </h3>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Mail size={18} color="#666" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="email"
                                            value={manualEmail}
                                            onChange={(e) => setManualEmail(e.target.value)}
                                            placeholder="Recipient Email Address"
                                            style={{
                                                width: '100%',
                                                padding: '14px 15px 14px 45px',
                                                backgroundColor: '#0a0a0a',
                                                border: '1px solid #444',
                                                borderRadius: '10px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                outline: 'none'
                                            }}
                                        />
                                    </div>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <Monitor size={18} color="#666" style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="text"
                                            value={manualMachineId}
                                            onChange={(e) => setManualMachineId(e.target.value)}
                                            placeholder="Device ID (Optional - for Hardware Lock)"
                                            style={{
                                                width: '100%',
                                                padding: '14px 15px 14px 45px',
                                                backgroundColor: '#0a0a0a',
                                                border: '1px solid #444',
                                                borderRadius: '10px',
                                                color: 'white',
                                                fontSize: '1rem',
                                                outline: 'none',
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerateManualKey}
                                        disabled={isGeneratingManual}
                                        style={{
                                            padding: '0 30px',
                                            backgroundColor: '#0078d4',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            fontWeight: '700',
                                            cursor: isGeneratingManual ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            boxShadow: '0 4px 12px rgba(0, 120, 212, 0.3)'
                                        }}
                                    >
                                        {isGeneratingManual ? (
                                            <Loader size={20} className="animate-spin" />
                                        ) : (
                                            <ShieldCheck size={20} />
                                        )}
                                        Generate & Send Key
                                    </button>
                                </div>
                                <p style={{ color: '#555', fontSize: '0.85rem', marginTop: '15px', fontStyle: 'italic' }}>
                                    Note: Generating a manual key will automatically record it in the database and simulate sending an email to the recipient.
                                </p>
                            </div>

                            {/* License History */}
                            <h3 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '20px' }}>Active Licenses History</h3>
                            <div style={{ backgroundColor: '#1e1e1e', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#ccc' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#111', borderBottom: '1px solid #333', textAlign: 'left' }}>
                                            <th style={{ padding: '16px' }}>Email</th>
                                            <th style={{ padding: '16px' }}>License Key</th>
                                            <th style={{ padding: '16px' }}>Status</th>
                                            <th style={{ padding: '16px' }}>Issued Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allLicenses.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#555' }}>
                                                    No licenses generated yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            allLicenses.map(license => (
                                                <tr key={license.id || license.key_id} style={{ borderBottom: '1px solid #2a2a2a' }}>
                                                    <td style={{ padding: '16px', color: 'white' }}>{license.email || 'N/A'}</td>
                                                    <td style={{ padding: '16px' }}>
                                                        <code style={{
                                                            backgroundColor: '#0a0a0a',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            border: '1px solid #333',
                                                            color: '#0078d4',
                                                            fontSize: '0.9rem'
                                                        }}>
                                                            {license.key_string}
                                                        </code>
                                                    </td>
                                                    <td style={{ padding: '16px' }}>
                                                        <span style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600',
                                                            backgroundColor: license.status === 'active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                                                            color: license.status === 'active' ? '#4CAF50' : '#f44336',
                                                            textTransform: 'uppercase'
                                                        }}>
                                                            {license.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '16px', color: '#666', fontSize: '0.85rem' }}>
                                                        {new Date(license.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'license-manager' ? (
                    <AdminLicenseManager />
                ) : activeTab === 'youtube-manager' ? (
                    <AdminYouTubeManager />
                ) : activeTab === 'languages' ? (
                    <AdminLanguageControl />
                ) : activeTab === 'bug-checker' ? (
                    <div style={{ padding: '30px', overflowY: 'auto', height: '100%' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px' }}>Bug Checker (Playwright)</h2>
                            <p style={{ color: '#888', marginBottom: '30px' }}>
                                Run automated tests to detect bugs in the application. This uses Playwright for end-to-end testing.
                            </p>

                            <div style={{
                                backgroundColor: '#1e1e1e',
                                padding: '30px',
                                borderRadius: '16px',
                                border: '1px solid #333',
                                marginBottom: '40px'
                            }}>
                                <h3 style={{ color: 'white', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Bug size={20} color="#0078d4" /> Selective System Testing
                                </h3>

                                <div style={{
                                    marginBottom: '30px',
                                    backgroundColor: '#0a0a0a',
                                    padding: '20px',
                                    borderRadius: '12px',
                                    border: '1px solid #333'
                                }}>
                                    <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>
                                        Select the menus/features you want to verify:
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        {Object.entries(
                                            availableFeatures.reduce((acc, feature) => {
                                                const group = feature.group || 'Other';
                                                if (!acc[group]) acc[group] = [];
                                                acc[group].push(feature);
                                                return acc;
                                            }, {})
                                        ).map(([groupName, features]) => (
                                            <div key={groupName}>
                                                <h4 style={{
                                                    color: '#0078d4',
                                                    fontSize: '0.8rem',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '1px',
                                                    marginBottom: '10px',
                                                    paddingBottom: '5px',
                                                    borderBottom: '1px solid #333'
                                                }}>
                                                    {groupName}
                                                </h4>
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                                                    gap: '12px'
                                                }}>
                                                    {features.map(feature => (
                                                        <div
                                                            key={feature.id}
                                                            onClick={() => toggleFeature(feature.id)}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '10px',
                                                                padding: '10px 15px',
                                                                backgroundColor: selectedFeatures.includes(feature.id) ? '#0078d420' : '#111',
                                                                borderRadius: '8px',
                                                                border: `1px solid ${selectedFeatures.includes(feature.id) ? '#0078d480' : '#222'}`,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: '18px',
                                                                height: '18px',
                                                                borderRadius: '4px',
                                                                border: `2px solid ${selectedFeatures.includes(feature.id) ? '#0078d4' : '#444'}`,
                                                                backgroundColor: selectedFeatures.includes(feature.id) ? '#0078d4' : 'transparent',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: '12px'
                                                            }}>
                                                                {selectedFeatures.includes(feature.id) && '✓'}
                                                            </div>
                                                            <span style={{
                                                                color: selectedFeatures.includes(feature.id) ? 'white' : '#888',
                                                                fontSize: '0.9rem'
                                                            }}>
                                                                {feature.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                                        <button
                                            onClick={() => setSelectedFeatures(availableFeatures.map(f => f.id))}
                                            style={{ background: 'none', border: 'none', color: '#0078d4', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setSelectedFeatures([])}
                                            style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
                                        >
                                            Clear Selection
                                        </button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
                                    <button
                                        onClick={handleRunBugChecker}
                                        disabled={runningTests || selectedFeatures.length === 0}
                                        style={{
                                            padding: '12px 24px',
                                            backgroundColor: runningTests || selectedFeatures.length === 0 ? '#333' : '#0078d4',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontWeight: '700',
                                            cursor: runningTests || selectedFeatures.length === 0 ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px'
                                        }}
                                    >
                                        {runningTests ? <Loader size={20} className="animate-spin" /> : <Bug size={20} />}
                                        {runningTests ? 'Running Selected Tests...' : `Run ${selectedFeatures.length} Tests`}
                                    </button>
                                </div>

                                <div style={{
                                    backgroundColor: '#0a0a0a',
                                    padding: '20px',
                                    borderRadius: '8px',
                                    border: `1px solid ${testError ? '#f44336' : testResults ? '#4CAF50' : '#333'}`,
                                    fontFamily: 'monospace',
                                    minHeight: '200px',
                                    color: testError ? '#f44336' : testResults ? '#4CAF50' : '#888',
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '0.85rem',
                                    overflowX: 'auto'
                                }}>
                                    {runningTests ? (
                                        <div style={{ color: '#0078d4' }}>
                                            [RUNNING] Executing Playwright smoke tests...
                                            <br />This may take up to 30 seconds.
                                        </div>
                                    ) : testError ? (
                                        <div>
                                            [ERROR] Test execution failed!
                                            <br /><br />
                                            {String(testError)}
                                        </div>
                                    ) : testResults ? (
                                        <div>
                                            [SUCCESS] {String(testResults)}
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ color: '#555' }}>// Test results will appear here...</div>
                                            <div style={{ marginTop: '10px' }}>No tests run yet.</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div style={{ color: '#666', fontSize: '0.9rem' }}>
                                <h4 style={{ color: '#aaa', marginBottom: '10px' }}>What this checks:</h4>
                                <ul style={{ paddingLeft: '20px' }}>
                                    <li>Landing Page availability</li>
                                    <li>Admin Panel access</li>
                                    <li>Core database connectivity (Turso)</li>
                                    <li>MaviClass content loading</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'menu-control' ? (
                    <div style={{ padding: '30px', overflowY: 'auto', height: '100%' }}>
                        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                            <h2 style={{ color: 'white', fontSize: '1.8rem', marginBottom: '10px' }}>Menu Visibility Control</h2>
                            <p style={{ color: '#888', marginBottom: '30px' }}>
                                Hide or unhide app menus from Admin Panel. Settings are stored in Turso Cloud.
                            </p>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                                <button
                                    onClick={() => handleBulkMenuVisibility(true)}
                                    disabled={menuVisibilitySaving}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#1f5f3a',
                                        color: 'white',
                                        border: '1px solid #2f8f54',
                                        borderRadius: '8px',
                                        cursor: menuVisibilitySaving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Show All
                                </button>
                                <button
                                    onClick={() => handleBulkMenuVisibility(false)}
                                    disabled={menuVisibilitySaving}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#5f1f1f',
                                        color: 'white',
                                        border: '1px solid #8f2f2f',
                                        borderRadius: '8px',
                                        cursor: menuVisibilitySaving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Hide All
                                </button>
                                <button
                                    onClick={handleResetMenuVisibility}
                                    disabled={menuVisibilitySaving}
                                    style={{
                                        padding: '10px 16px',
                                        backgroundColor: '#222',
                                        color: '#ddd',
                                        border: '1px solid #555',
                                        borderRadius: '8px',
                                        cursor: menuVisibilitySaving ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Reset Default
                                </button>
                            </div>

                            <div style={{
                                backgroundColor: '#1e1e1e',
                                border: '1px solid #333',
                                borderRadius: '12px',
                                padding: '20px'
                            }}>
                                {menuVisibilityLoading ? (
                                    <div style={{ color: '#888' }}>Loading menu visibility settings...</div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
                                        {CONTROLLED_MENU_ITEMS.map(item => {
                                            const isVisible = menuVisibility[item.path] ?? true;
                                            return (
                                                <div
                                                    key={item.path}
                                                    style={{
                                                        backgroundColor: '#111',
                                                        border: '1px solid #2a2a2a',
                                                        borderRadius: '10px',
                                                        padding: '14px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        gap: '12px'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: 600 }}>{item.label}</div>
                                                        <div style={{ color: '#777', fontSize: '0.8rem' }}>{item.group} • {item.path}</div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleToggleMenuVisibility(item.path, !isVisible)}
                                                        style={{
                                                            minWidth: '92px',
                                                            padding: '8px 10px',
                                                            borderRadius: '20px',
                                                            border: '1px solid',
                                                            borderColor: isVisible ? '#2f8f54' : '#8f2f2f',
                                                            backgroundColor: isVisible ? '#1f5f3a' : '#5f1f1f',
                                                            color: 'white',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {isVisible ? 'Visible' : 'Hidden'}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : null}
            </div>

            {/* Settings Modal */}
            {showSettings && (
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        borderRadius: '16px',
                        border: '1px solid #333',
                        width: '500px',
                        maxWidth: '90%',
                        padding: '30px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h2 style={{ color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Database size={24} color="#0078d4" /> Database Configuration
                            </h2>
                            <button
                                onClick={() => setShowSettings(false)}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        {/* Connection Status Detail */}
                        {dbStatus && (
                            <div style={{
                                padding: '16px',
                                backgroundColor: dbStatus.connected ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                                borderRadius: '8px',
                                border: `1px solid ${dbStatus.connected ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 152, 0, 0.3)'}`,
                                marginBottom: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                {dbStatus.connected ? <CheckCircle size={24} color="#4CAF50" /> : <XCircle size={24} color="#ff9800" />}
                                <div>
                                    <div style={{ color: dbStatus.connected ? '#4CAF50' : '#ff9800', fontWeight: 'bold' }}>
                                        {dbStatus.mode}
                                    </div>
                                    <div style={{ color: '#aaa', fontSize: '0.9rem' }}>
                                        {dbStatus.message}
                                        {dbStatus.source && <span style={{ marginLeft: '8px', fontSize: '0.8rem', opacity: 0.7 }}>({dbStatus.source})</span>}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ color: '#ccc', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Turso Database URL
                            </label>
                            <input
                                type="text"
                                value={dbUrl}
                                onChange={(e) => setDbUrl(e.target.value)}
                                placeholder="libsql://your-db.turso.io"
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #333',
                                    color: 'white',
                                    marginBottom: '4px'
                                }}
                            />
                            <div style={{ color: '#666', fontSize: '0.8rem' }}>The encryption-enabled connection URL</div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ color: '#ccc', display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                                Auth Token
                            </label>
                            <input
                                type="password"
                                value={authToken}
                                onChange={(e) => setAuthToken(e.target.value)}
                                placeholder="ey..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #333',
                                    color: 'white'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={handleClearSettings}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: 'transparent',
                                    color: '#f44336',
                                    border: '1px solid #f44336',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    marginRight: 'auto'
                                }}
                            >
                                Reset to Defaults
                            </button>

                            <button
                                onClick={() => setShowSettings(false)}
                                style={{
                                    padding: '12px 20px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleSaveSettings}
                                disabled={checkingDb}
                                style={{
                                    padding: '12px 24px',
                                    backgroundColor: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: checkingDb ? 'wait' : 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                {checkingDb ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                                Save & Connect
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-spin {
                    animation: spin 2s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div >
    );
}

export default AdminPanel;
