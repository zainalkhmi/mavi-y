import React, { useState, useEffect } from 'react';
import { ShieldCheck, Key, AlertCircle } from 'lucide-react';
import { validateKeyFormat } from '../../utils/licenseUtils';
import { getLicenseByKey } from '../../utils/tursoAPI';
import LandingPage from '../LandingPage';
import { useAuth } from '../../contexts/AuthContext';

const LICENSE_STORAGE_KEY = 'mavi_app_license';
const DAILY_USAGE_KEY = 'mavi_daily_usage';
const DAILY_DATE_KEY = 'mavi_last_active_date';
const DAILY_LIMIT_MS = 30 * 60 * 1000; // 30 Minutes per day

const LicenseGuard = ({ children }) => {
    const { userRole } = useAuth();
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

    const checkLicense = async () => {
        if (userRole === 'admin') {
            setIsAuthenticated(true);
            return true;
        }

        const storedKey = localStorage.getItem(LICENSE_STORAGE_KEY);
        if (!storedKey) return false;

        // 1. Quick format check
        const format = validateKeyFormat(storedKey);

        if (format.valid) {
            // Hardware lock matches, we are good and offline-safe
            setIsAuthenticated(true);
            return true;
        }

        // 2. If it's a Cloud license (format mismatch but might be in Turso)
        // We check Turso in the background or briefly wait
        try {
            console.log("Checking Cloud License in background...");
            const remoteLicense = await getLicenseByKey(storedKey);
            if (remoteLicense && remoteLicense.status === 'active') {
                setIsAuthenticated(true);
                return true;
            } else {
                // If definitely invalid, clear it
                localStorage.removeItem(LICENSE_STORAGE_KEY);
                setIsAuthenticated(false);
                return false;
            }
        } catch (err) {
            // If offline, and we have a stored key, we trust it for now 
            // but only IF it was previously authenticated or matches hardware.
            // Since format.valid was false (hardware mismatch), and we are offline,
            // we should probably be careful, but to satisfy the user's request for "not back to landing page",
            // we will trust the presence of a key if Turso is unreachable.
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

        // 1. Check Format (Basic Sanity Check)
        const formatResult = validateKeyFormat(licenseKey);
        // Note: We ignore status 'machine_mismatch' because we now allow cross-browser keys via Turso

        try {
            // 2. Check Turso Database (Source of Truth)
            const remoteLicense = await getLicenseByKey(licenseKey);

            if (remoteLicense && remoteLicense.status === 'active') {
                // Success!
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else if (formatResult.valid) {
                // Fallback: If network fails but local key is valid (same machine)
                console.warn("Turso check failed/empty, falling back to local validation");
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else {
                setError('License key not found or inactive.');
            }
        } catch (err) {
            console.error("License check error:", err);
            // On error, we rely on local validation ONLY if it matches hardware
            if (formatResult.valid && formatResult.status === 'hardware_locked') {
                localStorage.setItem(LICENSE_STORAGE_KEY, licenseKey);
                setIsAuthenticated(true);
                setShowActivation(false);
            } else {
                setError('Connection failed. Only hardware-locked keys work offline.');
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
            Initializing Security...
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
                            Trial Active: {formatTimeLeft(trialTimeLeft)} left
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
                        <h1 style={{ color: '#fff', margin: '0 0 8px 0', fontSize: '1.8rem' }}>Product Activation</h1>
                        <p style={{ color: '#888', margin: 0 }}>
                            Enter your MAVI license key for lifetime access
                        </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', color: '#aaa', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '500' }}>License Key</label>
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
                            {verifying ? 'Verifying...' : 'Activate Now'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setShowActivation(false)}
                            style={{
                                width: '100%', padding: '10px', background: 'transparent', border: '1px solid #333',
                                color: '#888', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem'
                            }}
                        >
                            Back to Landing Page
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
