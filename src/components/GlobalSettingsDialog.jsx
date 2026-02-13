import React, { useState, useEffect } from 'react';
import { useDialog } from '../contexts/DialogContext';
import ReactDOM from 'react-dom';
import { X, Save, CheckCircle, AlertCircle, Key, Cpu, Globe } from 'lucide-react';
import { validateApiKey, validateOpenAICompatibleKey } from '../utils/aiGenerator';
import { useLanguage } from '../contexts/LanguageContext';


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


    useEffect(() => {
        if (isOpen) {
            // Load AI settings
            setProvider(localStorage.getItem('ai_provider') || 'gemini');
            setApiKey(localStorage.getItem('gemini_api_key') || '');
            setModel(localStorage.getItem('gemini_model') || 'gemini-1.5-flash-002');
            setBaseUrl(localStorage.getItem('ai_base_url') || '');
            setTestStatusAI(null);

        }
    }, [isOpen]);

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
                        max_tokens: 5
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
                    // Don't fail the whole test if just model listing fails
                }

                setTestStatusAI('success');
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
                width: '600px',
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
                    ) : activeTab === 'system' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <h3 style={{ color: '#ef4444', marginBottom: '10px', fontSize: '1rem' }}>Danger Zone</h3>
                                <div style={{ padding: '20px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: 'white', marginBottom: '4px' }}>Reset Application</div>
                                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                                Clears all local data, licenses, and cached settings. Application will reload.
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (await showConfirm('Reset Application', 'Are you sure you want to reset the application? This will clear all licenses and local data.')) {
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
                                            Reset App
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                                transition: 'all 0.2s'
                                            }}
                                        >
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
