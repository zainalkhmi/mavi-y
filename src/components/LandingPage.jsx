import React, { useState, useEffect } from 'react';
import { useDialog } from '../contexts/DialogContext';
import {
    Download, ShieldCheck, Zap, Mail,
    Lock, Sparkles, Monitor, ArrowRight,
    CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getMachineId } from '../utils/licenseUtils';
import { createLicenseRequest, getLatestCloudInstaller } from '../utils/tursoAPI';
import { getTursoStatus } from '../utils/tursoClient';

const TRIAL_DURATION_MS = 30 * 60 * 1000;

import { useTranslation } from 'react-i18next';

function LandingPage({ onActivateTrial, onShowLicenseInput }) {
    const { showAlert } = useDialog();
    const { t } = useTranslation();
    const { adminLogin } = useAuth();
    const navigate = useNavigate();

    const [requestEmail, setRequestEmail] = useState('');
    const [requestNote, setRequestNote] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [showAdminLogin, setShowAdminLogin] = useState(false);
    const [requestStatus, setRequestStatus] = useState(null); // 'sending', 'success', 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const [machineId, setMachineId] = useState('');
    const [dbStatus, setDbStatus] = useState({ connected: false, configured: false });

    useEffect(() => {
        setMachineId(getMachineId());

        // Poll DB status
        const fetchStatus = async () => {
            const status = await getTursoStatus();
            setDbStatus(status);
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleRequestLicense = (e) => {
        e.preventDefault();
        if (!requestEmail) return;

        setRequestStatus('sending');

        setRequestStatus('sending');

        createLicenseRequest({
            email: requestEmail,
            machineId: machineId,
            userId: 'guest-' + Date.now() // Simple guest ID
        })
            .then(() => {
                setRequestStatus('success');
                setRequestEmail('');
                setRequestNote('');
            })
            .catch(err => {
                console.error('Failed to submit request:', err);

                if (err.message.includes('not configured')) {
                    setRequestStatus('error');
                    setErrorMsg('Database Cloud belum dikonfigurasi oleh Admin. Silakan hubungi administrator atau masukkan API Key di Admin Panel.');
                    return;
                }

                // Fallback to localStorage if Turso fails for other reasons (optional, but good for offline)
                const requests = JSON.parse(localStorage.getItem('mavi_license_requests') || '[]');
                requests.push({
                    id: Date.now(),
                    email: requestEmail,
                    note: requestNote,
                    machineId: machineId,
                    status: 'pending',
                    created_at: new Date().toISOString()
                });
                localStorage.setItem('mavi_license_requests', JSON.stringify(requests));

                // Show a "partially successful" state
                setRequestStatus('offline_success');
                setRequestEmail('');
                setRequestNote('');
            });
    };

    const handleAdminSubmit = (e) => {
        e.preventDefault();
        const success = adminLogin(adminPassword);
        if (success) {
            navigate('/admin');
        } else {
            setErrorMsg('Invalid Admin Password');
            setTimeout(() => setErrorMsg(''), 3000);
        }
    };

    const handleStartTrial = () => {
        const startTime = Date.now();
        localStorage.setItem('mavi_trial_start', startTime.toString());
        onActivateTrial();
    };

    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            const installer = await getLatestCloudInstaller();
            if (installer && installer.fileBlob) {
                const url = URL.createObjectURL(installer.fileBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = installer.name || 'MAVI_Setup.exe';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                await showAlert('Info', 'No installer available yet on server. Please contact admin.');
            }
        } catch (error) {
            console.error("Download failed:", error);
            await showAlert('Error', 'Failed to download installer from cloud server.');
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            width: '100vw',
            background: '#050505',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflowX: 'hidden',
            position: 'relative'
        }}>
            {/* Background Decorations */}
            <div style={{
                position: 'fixed',
                top: '-10%',
                right: '-5%',
                width: '600px',
                height: '600px',
                background: 'radial-gradient(circle, rgba(0, 210, 255, 0.08) 0%, transparent 70%)',
                zIndex: 0
            }} />
            <div style={{
                position: 'fixed',
                bottom: '-5%',
                left: '-5%',
                width: '500px',
                height: '500px',
                background: 'radial-gradient(circle, rgba(58, 123, 213, 0.08) 0%, transparent 70%)',
                zIndex: 0
            }} />

            {/* Navigation / Header */}
            <header style={{
                padding: '20px 40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 15px rgba(0, 210, 255, 0.4)'
                    }}>
                        <ShieldCheck size={24} color="white" />
                    </div>
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '1px' }}>MAVI <span style={{ color: '#00d2ff', fontSize: '0.8rem', verticalAlign: 'top' }}>PRO</span></span>

                    {/* Status Indicator */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '20px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        marginLeft: '10px'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: dbStatus.connected ? '#4caf50' : '#ff4444',
                            boxShadow: `0 0 8px ${dbStatus.connected ? '#4caf50' : '#ff4444'}`
                        }}></div>
                        <span style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                            {dbStatus.connected ? 'ONLINE' : 'OFFLINE'}
                        </span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                    <button
                        onClick={() => setShowAdminLogin(true)}
                        style={{
                            background: 'transparent',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#888',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Lock size={14} /> {t('landing.nav.admin')}
                    </button>
                    <button
                        onClick={onShowLicenseInput}
                        style={{
                            background: '#fff',
                            color: '#000',
                            border: 'none',
                            padding: '8px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        {t('landing.nav.activate')}
                    </button>
                </div>
            </header>

            {/* Hero Section */}
            <main style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '100px 20px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 1
            }}>
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 16px',
                    background: 'rgba(0, 210, 255, 0.1)',
                    borderRadius: '20px',
                    border: '1px solid rgba(0, 210, 255, 0.2)',
                    color: '#00d2ff',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    marginBottom: '32px'
                }}>
                    <Sparkles size={14} /> Motion Analysis & Vision Intelligence
                </div>

                <h1 style={{
                    fontSize: '4.5rem',
                    fontWeight: '900',
                    lineHeight: '1.1',
                    marginBottom: '24px',
                    background: 'linear-gradient(to bottom, #fff 40%, #888 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    <span dangerouslySetInnerHTML={{ __html: t('landing.hero.title') }}></span>
                </h1>

                <p style={{
                    fontSize: '1.25rem',
                    color: '#94a3b8',
                    maxWidth: '700px',
                    margin: '0 auto 48px',
                    lineHeight: '1.6'
                }}>
                    {t('landing.hero.subtitle')}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
                    <a
                        href="#"
                        onClick={handleDownload}
                        style={{
                            padding: '16px 32px',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            boxShadow: '0 10px 40px rgba(0, 210, 255, 0.4)',
                            transition: 'transform 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <Download size={20} /> {t('landing.hero.ctaDownload')}
                    </a>

                    <button
                        onClick={onShowLicenseInput}
                        style={{
                            padding: '16px 32px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <ShieldCheck size={20} color="#00d2ff" /> {t('landing.hero.ctaCloud')}
                    </button>

                    <button
                        onClick={handleStartTrial}
                        style={{
                            padding: '16px 32px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 210, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(0, 210, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        }}
                    >
                        <Clock size={20} color="#00d2ff" /> {t('landing.hero.ctaTrial')}
                    </button>
                </div>
            </main>

            {/* Form Section */}
            <section style={{
                maxWidth: '900px',
                margin: '0 auto 100px',
                padding: '0 20px',
                zIndex: 1,
                position: 'relative'
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '32px',
                    padding: '60px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '60px'
                }}>
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '16px' }}>{t('landing.request.title')}</h2>
                        <p style={{ color: '#888', marginBottom: '32px', lineHeight: '1.5' }}>
                            {t('landing.request.desc')}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 210, 255, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={18} color="#00d2ff" />
                                </div>
                                <span style={{ color: '#aaa', fontSize: '0.95rem' }}>{t('landing.request.benefit1')}</span>
                            </div>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(0, 210, 255, 0.1)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <CheckCircle2 size={18} color="#00d2ff" />
                                </div>
                                <span style={{ color: '#aaa', fontSize: '0.95rem' }}>{t('landing.request.benefit2')}</span>
                            </div>
                        </div>
                    </div>

                    <div>
                        {(requestStatus === 'success' || requestStatus === 'offline_success') ? (
                            <div style={{
                                height: '100%', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', justifyContent: 'center', textAlign: 'center'
                            }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: requestStatus === 'success' ? '#00d2ff' : '#ff9800',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px'
                                }}>
                                    <CheckCircle2 size={32} color="white" />
                                </div>
                                <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>
                                    {requestStatus === 'success' ? t('landing.request.successTitle') : t('landing.request.offlineTitle')}
                                </h3>
                                <p style={{ color: '#888' }}>
                                    {requestStatus === 'success'
                                        ? t('landing.request.successDesc')
                                        : t('landing.request.offlineDesc')}
                                </p>
                                <button
                                    onClick={() => setRequestStatus(null)}
                                    style={{ marginTop: '24px', background: 'none', border: '1px solid #333', color: '#888', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    {t('landing.request.back')}
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleRequestLicense} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#666', marginBottom: '8px', fontSize: '0.85rem' }}>{t('landing.request.deviceId')}</label>
                                    <input
                                        type="text"
                                        value={machineId}
                                        readOnly
                                        style={{
                                            width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333',
                                            borderRadius: '12px', color: '#00d2ff', outline: 'none', fontFamily: 'monospace'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#666', marginBottom: '8px', fontSize: '0.85rem' }}>{t('landing.request.email')}</label>
                                    <input
                                        type="email"
                                        required
                                        value={requestEmail}
                                        onChange={(e) => setRequestEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        style={{
                                            width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333',
                                            borderRadius: '12px', color: 'white', outline: 'none'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#666', marginBottom: '8px', fontSize: '0.85rem' }}>{t('landing.request.notes')}</label>
                                    <textarea
                                        value={requestNote}
                                        onChange={(e) => setRequestNote(e.target.value)}
                                        placeholder={t('landing.request.notesPlaceholder')}
                                        rows={4}
                                        style={{
                                            width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333',
                                            borderRadius: '12px', color: 'white', outline: 'none', resize: 'none'
                                        }}
                                    />
                                </div>
                                {requestStatus === 'error' && (
                                    <div style={{
                                        padding: '12px',
                                        background: 'rgba(255, 68, 68, 0.1)',
                                        border: '1px solid rgba(255, 68, 68, 0.2)',
                                        borderRadius: '12px',
                                        color: '#ff4444',
                                        fontSize: '0.85rem',
                                        lineHeight: '1.4'
                                    }}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <AlertCircle size={16} style={{ flexShrink: 0 }} />
                                            <span>{errorMsg}</span>
                                        </div>
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={requestStatus === 'sending'}
                                    style={{
                                        padding: '16px', background: '#fff', color: '#000', border: 'none',
                                        borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'
                                    }}
                                >
                                    {requestStatus === 'sending' ? t('landing.request.sending') : <>{t('landing.request.submit')} <ArrowRight size={18} /></>}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </section>

            {/* Admin Login Modal */}
            {showAdminLogin && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
                }}>
                    <div style={{
                        width: '100%', maxWidth: '400px', background: '#111', padding: '40px',
                        borderRadius: '24px', border: '1px solid #222', textAlign: 'center'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px'
                        }}>
                            <Lock size={24} color="#888" />
                        </div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Admin Login</h2>
                        <p style={{ color: '#666', marginBottom: '32px' }}>Enter administrator password to continue.</p>

                        <form onSubmit={handleAdminSubmit}>
                            <input
                                type="password"
                                autoFocus
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%', padding: '14px', background: '#0a0a0a', border: '1px solid #333',
                                    borderRadius: '12px', color: 'white', outline: 'none', textAlign: 'center',
                                    fontSize: '1.2rem', letterSpacing: '4px', marginBottom: '24px'
                                }}
                            />
                            {errorMsg && <div style={{ color: '#ff4444', fontSize: '0.85rem', marginBottom: '16px' }}>{errorMsg}</div>}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowAdminLogin(false)}
                                    style={{ flex: 1, padding: '14px', background: 'none', border: '1px solid #333', color: '#888', borderRadius: '12px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    style={{ flex: 1, padding: '14px', background: '#fff', color: '#000', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                >
                                    Login
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>
                {`
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                `}
            </style>
        </div>
    );
}

export default LandingPage;
