import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, AlertCircle } from 'lucide-react';
import { getMachineId, validateKeyFormat } from '../../utils/licenseUtils';
import { getClientNetworkContext, validateAndBindLicense } from '../../utils/tursoAPI';
import LandingPage from '../LandingPage';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const LICENSE_STORAGE_KEY = 'mavi_app_license';
const DAILY_USAGE_KEY = 'mavi_daily_usage';
const DAILY_DATE_KEY = 'mavi_last_active_date';
const DAILY_LIMIT_MS = 30 * 60 * 1000; // 30 Minutes per day

const getValidationContext = async () => {
    const machineId = getMachineId();
    const network = await getClientNetworkContext();

    return {
        machineId,
        ip: network.ip,
        country: network.country
    };
};

const LicenseGuard = ({ children }) => {
    const { userRole } = useAuth();
    const { t } = useLanguage();
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        // Quick initialization from localStorage
        const storedKey = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (storedKey) {
            // If we have a key, we assume it's valid for initial render to prevent flashing
            // The useEffect will do a thorough check
            return true;
        }
        return false;
    });
    const [licenseKey, setLicenseKey] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);
    const [showActivation, setShowActivation] = useState(false);
    const [isTrialActive, setIsTrialActive] = useState(false);
    const [trialTimeLeft, setTrialTimeLeft] = useState(0);

    const getLicenseErrorMessage = (status, fallbackMessage = '') => {
        const message = String(fallbackMessage || '').toLowerCase();

        if (status === 'blocked_new_device') return t('license.errors.blockedNewDevice');
        if (status === 'not_found') return t('license.errors.notFound');
        if (status === 'inactive') return t('license.errors.inactive');

        if (message.includes('no such column') && message.includes('bound_machine_id')) {
            return t('license.errors.serverSyncInProgress');
        }

        if (status === 'error') return t('license.errors.genericValidation');

        return fallbackMessage || t('license.errors.notFoundOrInactive');
    };

    const checkLicense = async () => {
        if (userRole === 'admin') {
            setIsAuthenticated(true);
            return true;
        }

        const storedKey = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!storedKey) return false;

        const format = validateKeyFormat(storedKey);

        try {
            const context = await getValidationContext();
            const result = await validateAndBindLicense(storedKey, context);

            if (result.ok) {
                setIsAuthenticated(true);
                return true;
            }

            if (result.status === 'blocked_new_device') {
                setError(getLicenseErrorMessage(result.status, result.message));
                localStorage.removeItem(LICENSE_STORAGE_KEY);
                setIsAuthenticated(false);
                return false;
            }

            if (result.status === 'not_found' || result.status === 'inactive') {
                localStorage.removeItem(LICENSE_STORAGE_KEY);
                setIsAuthenticated(false);
                return false;
            }

            // Unknown API failure case: fallback for hardware-locked local key
            if (format.valid && format.status === 'hardware_locked') {
                setIsAuthenticated(true);
                return true;
            }

            return false;
        } catch (err) {
            // If Turso is unreachable, trust existing local key to avoid lockout while offline.
            console.warn("Turso unreachable, trusting stored key to prevent landing page redirect.");
            setIsAuthenticated(true);
            return true;
        }
    };

    const checkTrial = () => {
        if (userRole === 'admin') return true;

        const today = new Date().toDateString();
        const lastDate = localStorage.getItem(DAILY_DATE_KEY);

        // If new day, reset usage
        if (lastDate !== today) {
            localStorage.setItem(DAILY_DATE_KEY, today);
            localStorage.setItem(DAILY_USAGE_KEY, '0');
            setTrialTimeLeft(DAILY_LIMIT_MS);
            return true;
        }

        // Check existing usage
        const usage = parseInt(localStorage.getItem(DAILY_USAGE_KEY) || '0');
        if (usage < DAILY_LIMIT_MS) {
            setTrialTimeLeft(DAILY_LIMIT_MS - usage);
            return true;
        } else {
            setIsTrialActive(false);
            setTrialTimeLeft(0);
            return false;
        }
    };

    useEffect(() => {
        const init = async () => {
            const licensed = await checkLicense();
            if (!licensed) {
                checkTrial();
            }
            setLoading(false);
        };
        init();

        // Daily Usage Monitor
        const interval = setInterval(() => {
            if (!isAuthenticated && userRole !== 'admin' && isTrialActive) {
                const today = new Date().toDateString();
                const lastDate = localStorage.getItem(DAILY_DATE_KEY);

                // Reset if day changed while running
                if (lastDate !== today) {
                    localStorage.setItem(DAILY_DATE_KEY, today);
                    localStorage.setItem(DAILY_USAGE_KEY, '0');
                    setTrialTimeLeft(DAILY_LIMIT_MS);
                    return;
                }

                // Increment usage
                let currentUsage = parseInt(localStorage.getItem(DAILY_USAGE_KEY) || '0');
                currentUsage += 1000;
                localStorage.setItem(DAILY_USAGE_KEY, currentUsage.toString());

                setTrialTimeLeft(Math.max(0, DAILY_LIMIT_MS - currentUsage));

                if (currentUsage >= DAILY_LIMIT_MS) {
                    setIsTrialActive(false);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated, isTrialActive, userRole]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setVerifying(true);

        const formatResult = validateKeyFormat(licenseKey);

        try {
            const context = await getValidationContext();
            const result = await validateAndBindLicense(licenseKey, context);

            if (result.ok) {
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else if (result.status === 'blocked_new_device') {
                setError(getLicenseErrorMessage(result.status, result.message));
            } else if (result.status === 'error' && formatResult.valid && formatResult.status === 'hardware_locked') {
                // Fallback: cloud unavailable but local hardware lock is valid
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else {
                setError(getLicenseErrorMessage(result.status, result.message));
            }
        } catch (err) {
            console.error("License check error:", err);
            // On error, we rely on local validation ONLY if it matches hardware
            if (formatResult.valid && formatResult.status === 'hardware_locked') {
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else {
                setError(t('license.errors.connectionOfflineOnly'));
            }
        } finally {
            setVerifying(false);
        }
    };

    const formatTimeLeft = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const days = Math.floor(totalSeconds / (3600 * 24));
        const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        }
        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        }
        return `${minutes}m ${seconds}s`;
    };

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505', color: '#fff' }}>
            {t('license.initializing')}
        </div>
    );

    if (isAuthenticated || isTrialActive || userRole === 'admin') {
        return (
            <>
                {isTrialActive && !isAuthenticated && userRole !== 'admin' && (
                    <div style={{
                        position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999,
                        background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '12px',
                        border: '2px solid #00d2ff', display: 'flex', alignItems: 'center', gap: '10px',
                        color: 'white', fontWeight: 'bold', boxShadow: '0 0 20px rgba(0,210,255,0.3)',
                        backdropFilter: 'blur(5px)'
                    }}>
                        <ShieldCheck size={18} color="#00d2ff" />
                        <span style={{ fontFamily: 'monospace' }}>
                            {t('license.trialActive', { time: formatTimeLeft(trialTimeLeft) })}
                        </span>
                    </div>
                )}
                {children}
            </>
        );
    }

    if (showActivation) {
        return (
            <div style={{
                height: '100vh',
                width: '100vw',
                background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Inter', sans-serif"
            }}>
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(20px)',
                    padding: '40px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    width: '100%',
                    maxWidth: '450px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px auto',
                            boxShadow: '0 10px 25px -5px rgba(0, 210, 255, 0.4)'
                        }}>
                            <Key size={32} color="#fff" />
                        </div>
                        <h1 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.8rem' }}>{t('license.productActivationTitle')}</h1>
                        <p style={{ color: '#888', margin: 0 }}>
                            {t('license.activationSubtitle')}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>{t('license.licenseKeyLabel')}</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#666' }}>
                                    <Key size={18} />
                                </div>
                                <input
                                    type="text"
                                    value={licenseKey}
                                    onChange={(e) => {
                                        let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                        if (val.length > 4) val = val.slice(0, 4) + '-' + val.slice(4);
                                        if (val.length > 9) val = val.slice(0, 9) + '-' + val.slice(9);
                                        if (val.length > 14) val = val.slice(0, 14) + '-' + val.slice(14);
                                        if (val.length > 19) val = val.slice(0, 19);
                                        setLicenseKey(val);
                                        setError('');
                                    }}
                                    placeholder="MAVI-XXXX-XXXX-XXXX"
                                    disabled={verifying}
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px 12px 42px',
                                        background: 'rgba(0, 0, 0, 0.3)',
                                        border: `1px solid ${error ? '#ff4444' : 'rgba(255, 255, 255, 0.1)'}`,
                                        borderRadius: '12px',
                                        color: '#fff',
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        letterSpacing: '1px',
                                        outline: 'none',
                                        transition: 'all 0.2s',
                                        opacity: verifying ? 0.5 : 1
                                    }}
                                />
                            </div>
                            {error && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ff4444', fontSize: '0.85rem', marginTop: '8px' }}>
                                    <AlertCircle size={14} />
                                    {error}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={licenseKey.length < 19 || verifying}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: licenseKey.length >= 19 ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)' : '#333',
                                border: 'none',
                                borderRadius: '12px',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: (licenseKey.length >= 19 && !verifying) ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                                marginBottom: '15px'
                            }}
                        >
                            {verifying ? t('license.verifying') : t('license.activateNow')}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowActivation(false)}
                            style={{
                                width: '100%', padding: '10px', background: 'transparent', border: '1px solid #333',
                                color: '#888', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            {t('license.backToLanding')}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <LandingPage
            onActivateTrial={() => setIsTrialActive(true)}
            onShowLicenseInput={() => setShowActivation(true)}
        />
    );
};

export default LicenseGuard;
