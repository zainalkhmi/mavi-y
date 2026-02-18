import React, { useState, useEffect } from 'react';
import { useDialog } from '../contexts/DialogContext';
import ReactDOM from 'react-dom';
import { X, Save, CheckCircle, AlertCircle, Key, Cpu, Globe, Cloud, Radio } from 'lucide-react';
import { validateApiKey, validateOpenAICompatibleKey } from '../utils/aiGenerator';
import { useLanguage } from '../contexts/LanguageContext';
import { getJitsiSettings, saveJitsiSettings } from '../utils/jitsiSettings';
import {
    getGoogleDriveSettings,
    saveGoogleDriveSettings,
    signInGoogleDrive,
    signOutGoogleDrive,
    listGoogleDriveProjectFiles,
    getStoredGoogleToken
} from '../utils/googleDrive';


function GlobalSettingsDialog({ isOpen, onClose }) {
    const { showAlert, showConfirm } = useDialog();
    const { t, currentLanguage, changeLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('ai');

    // AI Settings State
    const [provider, setProvider] = useState('gemini');
    const [apiKey, setApiKey] = useState('');
    const [model, setModel] = useState('');
    const [baseUrl, setBaseUrl] = useState('');
    const [availableModels, setAvailableModels] = useState([]);
    const [isTestingAI, setIsTestingAI] = useState(false);
    const [testStatusAI, setTestStatusAI] = useState(null);

    // Google Drive Settings State
    const [driveSettings, setDriveSettings] = useState(getGoogleDriveSettings());
    const [isDriveSigning, setIsDriveSigning] = useState(false);
    const [isDriveTesting, setIsDriveTesting] = useState(false);
    const [driveConnectionStatus, setDriveConnectionStatus] = useState(null);

    // Jitsi Settings State
    const [jitsiSettings, setJitsiSettings] = useState(getJitsiSettings());

    const toolbarOptions = [
        'microphone',
        'camera',
        'desktop',
        'chat',
        'participants-pane',
        'tileview',
        'fullscreen',
        'hangup'
    ];


    useEffect(() => {
        if (isOpen) {
            // Load AI settings
            setProvider(localStorage.getItem('ai_provider') || 'gemini');
            setApiKey(localStorage.getItem('gemini_api_key') || '');
            setModel(localStorage.getItem('gemini_model') || 'gemini-1.5-flash-002');
            setBaseUrl(localStorage.getItem('ai_base_url') || '');
            setTestStatusAI(null);
            setDriveSettings(getGoogleDriveSettings());
            setDriveConnectionStatus(null);
            setJitsiSettings(getJitsiSettings());

        }
    }, [isOpen]);

    const handleDriveSettingChange = (key, value) => {
        setDriveSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleJitsiSettingChange = (key, value) => {
        setJitsiSettings(prev => ({ ...prev, [key]: value }));
    };

    const toggleToolbarButton = (button) => {
        setJitsiSettings(prev => {
            const current = Array.isArray(prev.toolbarButtons) ? prev.toolbarButtons : [];
            const exists = current.includes(button);
            return {
                ...prev,
                toolbarButtons: exists ? current.filter(b => b !== button) : [...current, button]
            };
        });
    };

    const handleDriveSignIn = async () => {
        setIsDriveSigning(true);
        try {
            await signInGoogleDrive();
            setDriveConnectionStatus('success');
            await showAlert('Success', 'Google Drive sign-in successful.');
        } catch (error) {
            console.error('Google Drive sign-in failed:', error);
            setDriveConnectionStatus('error');
            await showAlert('Connection Failed', error.message || 'Failed to sign in to Google Drive.');
        } finally {
            setIsDriveSigning(false);
        }
    };

    const handleDriveSignOut = async () => {
        signOutGoogleDrive();
        setDriveConnectionStatus(null);
        await showAlert('Info', 'Google Drive token removed from this device.');
    };

    const handleTestDriveConnection = async () => {
        setIsDriveTesting(true);
        setDriveConnectionStatus(null);
        try {
            const files = await listGoogleDriveProjectFiles();
            setDriveConnectionStatus('success');
            await showAlert('Success', `Google Drive connected. Found ${files.length} project zip file(s).`);
        } catch (error) {
            console.error('Google Drive test failed:', error);
            setDriveConnectionStatus('error');
            await showAlert('Connection Failed', error.message || 'Failed to connect to Google Drive.');
        } finally {
            setIsDriveTesting(false);
        }
    };

    // AI Handlers
    const handleProviderChange = (newProvider) => {
        setProvider(newProvider);
        setTestStatusAI(null);

        if (newProvider === 'gemini') {
            setBaseUrl('');
            setApiKey(localStorage.getItem('gemini_api_key_stored') || localStorage.getItem('gemini_api_key') || '');
            setModel(localStorage.getItem('gemini_model_stored') || localStorage.getItem('gemini_model') || 'gemini-1.5-flash-002');
        } else if (newProvider === 'openai') {
            setBaseUrl('https://api.openai.com/v1');
            setApiKey(localStorage.getItem('openai_api_key') || '');
            setModel(localStorage.getItem('openai_model') || 'gpt-3.5-turbo');
        } else if (newProvider === 'grok') {
            setBaseUrl('https://api.x.ai/v1');
            setApiKey(localStorage.getItem('xai_api_key') || '');
            setModel(localStorage.getItem('xai_model') || 'grok-beta');
        } else if (newProvider === 'openrouter') {
            setBaseUrl('https://openrouter.ai/api/v1');
            setApiKey(localStorage.getItem('openrouter_api_key') || '');
            setModel(localStorage.getItem('openrouter_model') || 'openai/gpt-3.5-turbo');
        } else if (newProvider === 'custom') {
            setBaseUrl(localStorage.getItem('ai_base_url') || 'http://localhost:11434/v1');
            setApiKey(localStorage.getItem('custom_api_key') || '');
            setModel(localStorage.getItem('custom_model') || 'qwen2.5:latest');
        } else if (newProvider === 'ollama') {
            setBaseUrl('http://localhost:11434/v1');
            setApiKey(localStorage.getItem('ollama_api_key') || 'ollama');
            setModel(localStorage.getItem('ollama_model') || 'llama3');
        }
    };

    const handleTestAIConnection = async () => {
        setIsTestingAI(true);
        setTestStatusAI(null);

        try {
            if (provider === 'gemini') {
                const models = await validateApiKey(apiKey.trim());
                setAvailableModels(models);
                setTestStatusAI('success');
            } else {
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

                if (baseUrl.includes('openrouter.ai')) {
                    headers['HTTP-Referer'] = 'https://motion-study-app.com';
                    headers['X-Title'] = 'Motion Study Application';
                }

                // 1. Test connection with a small completion
                const response = await fetch(`${baseUrl}/chat/completions`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_completion_tokens: 10
                    })
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || response.statusText);
                }

                // 2. Try to fetch models for the dropdown
                try {
                    const models = await validateOpenAICompatibleKey(apiKey, baseUrl);
                    setAvailableModels(models);
                } catch (e) {
                    console.warn("Could not fetch model list:", e);
                    setAvailableModels([]);
                    await showAlert('Connection Success, but...', `Connected to ${baseUrl}, but could not list models. You can enter a model name manually.`);
                }

                if (availableModels.length === 0) {
                    // If no models found, maybe show a toast or just let them enter manually
                }

                setTestStatusAI('success');
                await showAlert('Success', 'AI Connection Successful!');


            }
        } catch (error) {
            console.error("AI Connection Test Failed:", error);
            setTestStatusAI('error');
            await showAlert('Connection Failed', error.message);
        } finally {
            setIsTestingAI(false);
        }
    };


    const handleSave = () => {
        // Save to active slots (used by aiGenerator.js)
        localStorage.setItem('ai_provider', provider);
        localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.setItem('gemini_model', model.trim());
        localStorage.setItem('ai_base_url', baseUrl.trim());

        // Save to provider-specific slots (for persistence and FileExplorer sync)
        if (provider === 'gemini') {
            localStorage.setItem('gemini_api_key_stored', apiKey.trim());
            localStorage.setItem('gemini_model_stored', model.trim());
        } else if (provider === 'openai') {
            localStorage.setItem('openai_api_key', apiKey.trim());
            localStorage.setItem('openai_model', model.trim());
        } else if (provider === 'grok') {
            localStorage.setItem('xai_api_key', apiKey.trim());
            localStorage.setItem('xai_model', model.trim());
        } else if (provider === 'openrouter') {
            localStorage.setItem('openrouter_api_key', apiKey.trim());
            localStorage.setItem('openrouter_model', model.trim());
        } else if (provider === 'custom') {
            localStorage.setItem('custom_api_key', apiKey.trim());
            localStorage.setItem('custom_model', model.trim());
        } else if (provider === 'ollama') {
            localStorage.setItem('ollama_api_key', apiKey.trim());
            localStorage.setItem('ollama_model', model.trim());
        }

        saveGoogleDriveSettings(driveSettings);
        saveJitsiSettings(jitsiSettings);


        onClose();
    };

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999 // Increased z-index
        }}>
            <div style={{
                backgroundColor: '#1e1e1e',
                width: '750px',
                maxWidth: '95%',
                height: '70vh',
                borderRadius: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <h2 style={{ margin: 0, color: 'white', fontSize: '1.4rem', fontWeight: '600' }}>
                        {t('settings.title')}
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'rgba(255, 255, 255, 0.05)', border: 'none', color: '#aaa', cursor: 'pointer', padding: '8px', borderRadius: '12px' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'rgba(255, 255, 255, 0.01)'
                }}>
                    <button
                        onClick={() => setActiveTab('ai')}
                        style={{
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'ai' ? '#0078d4' : 'transparent'}`,
                            color: activeTab === 'ai' ? 'white' : '#aaa',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <Cpu size={18} /> {t('settings.ai')}
                    </button>
                    <button
                        onClick={() => setActiveTab('language')}
                        style={{
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'language' ? '#0078d4' : 'transparent'}`,
                            color: activeTab === 'language' ? 'white' : '#aaa',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <Globe size={18} /> {t('settings.language')}
                    </button>
                    <button
                        onClick={() => setActiveTab('cloud')}
                        style={{
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'cloud' ? '#0078d4' : 'transparent'}`,
                            color: activeTab === 'cloud' ? 'white' : '#aaa',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <Cloud size={18} /> {t('settings.cloud')}
                    </button>
                    <button
                        onClick={() => setActiveTab('conference')}
                        style={{
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'conference' ? '#0078d4' : 'transparent'}`,
                            color: activeTab === 'conference' ? 'white' : '#aaa',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <Radio size={18} /> {t('settings.conference')}
                    </button>
                    <button
                        onClick={() => setActiveTab('system')}
                        style={{
                            padding: '16px 24px',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: `2px solid ${activeTab === 'system' ? '#0078d4' : 'transparent'}`,
                            color: activeTab === 'system' ? 'white' : '#aaa',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        <AlertCircle size={18} /> {t('settings.system') || 'System'}
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {activeTab === 'language' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '500' }}>{t('settings.language')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                    {[
                                        { code: 'en', label: 'English', flag: '🇺🇸' },
                                        { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
                                        { code: 'ja', label: 'Japanese', flag: '🇯🇵' }
                                    ].map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => changeLanguage(lang.code)}
                                            style={{
                                                padding: '20px',
                                                backgroundColor: currentLanguage === lang.code ? '#0078d4' : 'rgba(255, 255, 255, 0.03)',
                                                color: 'white',
                                                border: `1px solid ${currentLanguage === lang.code ? '#0078d4' : 'rgba(255, 255, 255, 0.1)'}`,
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <span style={{ fontSize: '2rem' }}>{lang.flag}</span>
                                            <span style={{ fontWeight: currentLanguage === lang.code ? '600' : '400' }}>{lang.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'conference' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{
                                padding: '14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ color: 'white', fontWeight: 600, marginBottom: '6px' }}>{t('settings.jitsiSettingsTitle')}</div>
                                <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                    {t('settings.jitsiSettingsDesc')}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Jitsi Domain</label>
                                <input
                                    type="text"
                                    value={jitsiSettings.domain || ''}
                                    onChange={(e) => handleJitsiSettingChange('domain', e.target.value)}
                                    placeholder="meet.jit.si"
                                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Default Room Prefix</label>
                                    <input
                                        type="text"
                                        value={jitsiSettings.defaultRoomPrefix || ''}
                                        onChange={(e) => handleJitsiSettingChange('defaultRoomPrefix', e.target.value)}
                                        placeholder="mavi-room"
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Default Display Name</label>
                                    <input
                                        type="text"
                                        value={jitsiSettings.defaultDisplayName || ''}
                                        onChange={(e) => handleJitsiSettingChange('defaultDisplayName', e.target.value)}
                                        placeholder="Guest"
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gap: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!jitsiSettings.enableWelcomePage}
                                        onChange={(e) => handleJitsiSettingChange('enableWelcomePage', e.target.checked)}
                                    />
                                    Enable welcome / prejoin page
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!jitsiSettings.startWithAudioMuted}
                                        onChange={(e) => handleJitsiSettingChange('startWithAudioMuted', e.target.checked)}
                                    />
                                    Start with audio muted
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!jitsiSettings.startWithVideoMuted}
                                        onChange={(e) => handleJitsiSettingChange('startWithVideoMuted', e.target.checked)}
                                    />
                                    Start with video muted
                                </label>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '10px', fontSize: '0.9rem' }}>
                                    Toolbar Buttons
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
                                    {toolbarOptions.map(btn => (
                                        <label key={btn} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', cursor: 'pointer', fontSize: '0.85rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={(jitsiSettings.toolbarButtons || []).includes(btn)}
                                                onChange={() => toggleToolbarButton(btn)}
                                            />
                                            {btn}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'system' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '1rem' }}>{t('settings.dangerZone')}</h3>
                                <div style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>{t('settings.resetApp')}</div>
                                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                                {t('settings.resetAppDesc')}
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (await showConfirm(t('settings.resetConfirmTitle'), t('settings.resetConfirmMsg'))) {
                                                    localStorage.removeItem('mavi_app_license');
                                                    localStorage.removeItem('mavi_trial_start');
                                                    localStorage.removeItem('mavi_user_role');
                                                    localStorage.removeItem('mavi_license_requests');
                                                    window.location.reload();
                                                }
                                            }}
                                            style={{
                                                padding: '10px 20px',
                                                backgroundColor: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {t('settings.resetApp')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'cloud' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div style={{
                                padding: '14px',
                                borderRadius: '10px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                background: 'rgba(255,255,255,0.02)'
                            }}>
                                <div style={{ color: 'white', fontWeight: 600, marginBottom: '6px' }}>{t('settings.googleDriveBackup')}</div>
                                <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                    {t('settings.googleDriveDesc')}
                                </div>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={!!driveSettings.enabled}
                                    onChange={(e) => handleDriveSettingChange('enabled', e.target.checked)}
                                />
                                Enable Google Drive Integration
                            </label>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Mode</label>
                                <select
                                    value={driveSettings.mode || 'auto'}
                                    onChange={(e) => handleDriveSettingChange('mode', e.target.value)}
                                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                >
                                    <option value="auto">Auto (OAuth first, fallback Service Account)</option>
                                    <option value="oauth">OAuth User Login</option>
                                    <option value="service_account">Service Account</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Google OAuth Client ID</label>
                                <input
                                    type="text"
                                    value={driveSettings.clientId || ''}
                                    onChange={(e) => handleDriveSettingChange('clientId', e.target.value)}
                                    placeholder="xxxxxx-xxxxx.apps.googleusercontent.com"
                                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Default Drive Folder ID</label>
                                <input
                                    type="text"
                                    value={driveSettings.defaultFolderId || ''}
                                    onChange={(e) => handleDriveSettingChange('defaultFolderId', e.target.value)}
                                    placeholder="Optional: folder id for project uploads"
                                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Service Token Endpoint (fallback)</label>
                                <input
                                    type="text"
                                    value={driveSettings.serviceTokenEndpoint || ''}
                                    onChange={(e) => handleDriveSettingChange('serviceTokenEndpoint', e.target.value)}
                                    placeholder="https://your-backend.example.com/google-drive/token"
                                    style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '12px' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={handleDriveSignIn}
                                    disabled={isDriveSigning || !driveSettings.clientId}
                                    style={{ padding: '10px 14px', backgroundColor: '#0078d4', border: 'none', color: 'white', borderRadius: '10px', cursor: 'pointer' }}
                                >
                                    {isDriveSigning ? 'Signing in...' : 'Sign In Google'}
                                </button>
                                <button
                                    onClick={handleDriveSignOut}
                                    style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', borderRadius: '10px', cursor: 'pointer' }}
                                >
                                    Sign Out
                                </button>
                                <button
                                    onClick={handleTestDriveConnection}
                                    disabled={isDriveTesting || !driveSettings.enabled}
                                    style={{
                                        padding: '10px 14px',
                                        backgroundColor: driveConnectionStatus === 'success' ? '#16a34a' : 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.15)',
                                        color: 'white',
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isDriveTesting ? 'Testing...' : 'Test Drive Connection'}
                                </button>
                            </div>

                            <div style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                OAuth token: {getStoredGoogleToken().token ? 'Connected' : 'Not connected'}
                                {driveConnectionStatus === 'success' && <span style={{ color: '#16a34a', marginLeft: '8px' }}>✓ OK</span>}
                                {driveConnectionStatus === 'error' && <span style={{ color: '#ef4444', marginLeft: '8px' }}>✗ Failed</span>}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Active Configuration Status Card */}
                            <div style={{
                                padding: '16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px'
                            }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#3b82f6',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    color: 'white'
                                }}>
                                    <Cpu size={24} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#93c5fd', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {t('settings.activeSystem') || 'ACTIVE SYSTEM'}
                                    </div>
                                    <div style={{ fontSize: '1.1rem', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ textTransform: 'capitalize' }}>{provider === 'ollama' ? 'Local AI (Ollama)' : provider}</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>/</span>
                                        <span>{model || 'No Model Selected'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Provider Selector */}
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '500' }}>{t('settings.provider')}</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '8px' }}>
                                    {['gemini', 'openai', 'grok', 'openrouter', 'ollama', 'custom'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => handleProviderChange(p)}
                                            style={{
                                                padding: '12px',
                                                backgroundColor: provider === p ? '#0078d4' : 'rgba(255, 255, 255, 0.03)',
                                                color: 'white',
                                                border: `1px solid ${provider === p ? '#0078d4' : 'rgba(255, 255, 255, 0.1)'}`,
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                textTransform: 'capitalize',
                                                fontWeight: provider === p ? '600' : '400',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            {/* Icon placeholder or just text */}
                                            {p === 'ollama' ? t('settings.ollama') : (p === 'custom' ? 'Custom API' : p)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Base URL */}
                            {provider !== 'gemini' && (
                                <div>
                                    <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>Base URL</label>
                                    <input
                                        type="text"
                                        value={baseUrl}
                                        onChange={(e) => setBaseUrl(e.target.value)}
                                        placeholder="https://api.openai.com/v1"
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '12px', outline: 'none' }}
                                    />
                                </div>
                            )}

                            {/* API Key */}
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>{t('settings.apiKey')}</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        placeholder={`Enter ${provider} API Key`}
                                        style={{ flex: 1, padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '12px', outline: 'none' }}
                                    />
                                    <button
                                        onClick={handleTestAIConnection}
                                        disabled={isTestingAI || !apiKey}
                                        style={{
                                            padding: '0 20px',
                                            backgroundColor: testStatusAI === 'success' ? '#4caf50' : 'rgba(255, 255, 255, 0.05)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            fontWeight: '600'
                                        }}
                                    >
                                        {isTestingAI ? '...' : testStatusAI === 'success' ? t('settings.testSuccess') : t('settings.testConnection')}
                                    </button>
                                </div>
                            </div>

                            {/* Model Selector */}
                            <div>
                                <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem' }}>{t('settings.model')}</label>
                                {availableModels.length > 0 ? (
                                    <div style={{ position: 'relative' }}>
                                        <select
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '12px', outline: 'none', appearance: 'none' }}
                                        >
                                            <option value="">{t('elementEditor.selectOption')}</option>
                                            {availableModels.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                        <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setAvailableModels([]); // Manual switch back to text input
                                                }}
                                                style={{ background: 'transparent', border: 'none', color: '#0078d4', fontSize: '0.75rem', cursor: 'pointer', pointerEvents: 'auto' }}
                                            >
                                                Edit Manual
                                            </button>
                                            ▼
                                        </div>
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={model}
                                        onChange={(e) => setModel(e.target.value)}
                                        placeholder="e.g., gpt-4, claude-3, qwen2.5"
                                        style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: '12px', outline: 'none' }}
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '24px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{ padding: '12px 24px', background: 'transparent', color: '#aaa', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', cursor: 'pointer' }}
                    >
                        {t('settings.cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        style={{ padding: '12px 24px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {t('settings.save')}
                    </button>
                </div>
            </div>
        </div >,
        document.body
    );
}

export default GlobalSettingsDialog;
