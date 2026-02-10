import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw, Activity, Database, Globe, Camera, Shield, Cpu, Zap, Cloud, User } from 'lucide-react';
import { getAllProjects, initDB } from '../utils/database';

const SystemDiagnostics = () => {
    const [results, setResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [overallStatus, setOverallStatus] = useState('pending'); // pending, success, warning, error
    const [progress, setProgress] = useState(0);

    const runDiagnostics = async () => {
        setIsRunning(true);
        setResults([]);
        setOverallStatus('pending');
        setProgress(0);

        const newResults = [];
        let hasError = false;
        let hasWarning = false;

        const addResult = (category, name, status, message, latency = null) => {
            newResults.push({ category, name, status, message, latency });
            if (status === 'error') hasError = true;
            if (status === 'warning') hasWarning = true;
            setResults([...newResults]);
        };

        const sleep = (ms) => new Promise(r => setTimeout(r, ms));

        // 1. Browser Capabilities
        try {
            await sleep(200);
            const start = performance.now();
            const storage = !!window.localStorage;
            addResult('Browser', 'Local Storage', storage ? 'success' : 'error', storage ? 'Active' : 'Missing', Math.round(performance.now() - start) + 'ms');
            const session = !!window.sessionStorage;
            addResult('Browser', 'Temporary Storage', session ? 'success' : 'error', session ? 'Active' : 'Missing');
            setProgress(20);
        } catch (e) {
            addResult('Browser', 'Storage Check', 'error', e.message);
        }

        // 2. Database (SQLite)
        try {
            await sleep(300);
            const start = performance.now();
            const db = await initDB();
            if (db) {
                addResult('Database', 'SQLite', 'success', 'Operational', Math.round(performance.now() - start) + 'ms');
            } else {
                addResult('Database', 'SQLite', 'error', 'No DB Instance');
            }
            setProgress(60);
        } catch (e) {
            addResult('Database', 'SQLite', 'error', 'Failed: ' + e.message);
        }

        // 3. Cloud (Turso)
        try {
            await sleep(300);
            const { getTursoStatus } = await import('../utils/tursoClient');
            const start = performance.now();
            const status = await getTursoStatus();

            if (status.connected) {
                addResult('Cloud', 'Turso Database', 'success', 'Connected', Math.round(performance.now() - start) + 'ms');
            } else if (status.configured) {
                addResult('Cloud', 'Turso Database', 'warning', 'Offline (Mock Fallback)', Math.round(performance.now() - start) + 'ms');
            } else {
                addResult('Cloud', 'Turso Database', 'error', 'Not Configured');
            }
        } catch (e) {
            addResult('Cloud', 'Turso Database', 'error', 'Check Failed: ' + e.message);
        }

        // 4. Local Activation
        try {
            await sleep(200);
            const isActivated = localStorage.getItem('mavi_license_status') === 'active';
            addResult('Security', 'License', isActivated ? 'success' : 'warning', isActivated ? 'Activated' : 'Trial/Unactivated');
            setProgress(70);
        } catch (e) {
            addResult('Security', 'License', 'error', e.message);
        }

        // 5. Network & API
        try {
            await sleep(200);
            const start = performance.now();
            const online = navigator.onLine;
            addResult('Network', 'Internet', online ? 'success' : 'warning', online ? 'Online' : 'Offline', Math.round(performance.now() - start) + 'ms');
            setProgress(80);
        } catch (e) {
            addResult('Network', 'Internet', 'error', e.message);
        }

        // 5. Hardware Permissions
        try {
            await sleep(400);
            const start = performance.now();
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInput = devices.filter(d => d.kind === 'videoinput');
            const audioInput = devices.filter(d => d.kind === 'audioinput');

            if (videoInput.length > 0) {
                addResult('Hardware', 'Cameras', 'success', `${videoInput.length} Available`, Math.round(performance.now() - start) + 'ms');
            } else {
                addResult('Hardware', 'Cameras', 'warning', 'Not Detected');
            }

            if (audioInput.length > 0) {
                addResult('Hardware', 'Microphones', 'success', `${audioInput.length} Available`);
            } else {
                addResult('Hardware', 'Microphones', 'warning', 'Not Detected');
            }
            setProgress(90);

        } catch (e) {
            addResult('Hardware', 'Devices', 'error', 'Access Denied: ' + e.message);
        }

        // 6. System Integrity
        await sleep(200);
        const isSecure = window.isSecureContext;
        addResult('System', 'Secure Context', isSecure ? 'success' : 'warning', isSecure ? 'Secure (HTTPS)' : 'Insecure (HTTP)');
        setProgress(100);

        setIsRunning(false);
        setOverallStatus(hasError ? 'error' : hasWarning ? 'warning' : 'success');
    };

    useEffect(() => {
        runDiagnostics();
    }, []);

    // Styles
    const styles = {
        container: {
            padding: '2rem',
            backgroundColor: '#0a0a0a',
            color: '#fff',
            minHeight: '100%',
            fontFamily: "'Inter', sans-serif",
            backgroundImage: 'radial-gradient(circle at top right, #1a2332 0%, #0a0a0a 40%)',
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '3rem',
        },
        title: {
            fontSize: '2rem',
            fontWeight: '700',
            background: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
        },
        button: {
            padding: '0.75rem 1.5rem',
            backgroundColor: isRunning ? '#1f2937' : '#4f46e5',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease',
            boxShadow: isRunning ? 'none' : '0 4px 14px 0 rgba(79, 70, 229, 0.39)',
        },
        statusCard: {
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
        },
        statusText: {
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginTop: '1rem',
            letterSpacing: '0.05em',
            color: overallStatus === 'success' ? '#10b981' : overallStatus === 'error' ? '#ef4444' : '#f59e0b',
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
        },
        card: {
            background: '#131313',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid #222',
            transition: 'transform 0.2s',
        },
        cardHeader: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #222',
            color: '#a1a1aa',
            fontWeight: '600',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
        },
        itemRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.75rem 0',
            borderBottom: '1px solid #1a1a1a',
        },
        itemLabel: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem',
            color: '#e4e4e7',
        },
        itemValue: {
            textAlign: 'right',
        },
        statusBadge: (status) => ({
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: '600',
            backgroundColor: status === 'success' ? 'rgba(16, 185, 129, 0.15)' : status === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: status === 'success' ? '#34d399' : status === 'error' ? '#f87171' : '#fbbf24',
            border: `1px solid ${status === 'success' ? 'rgba(16, 185, 129, 0.2)' : status === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`,
        }),
        latency: {
            fontSize: '0.7rem',
            color: '#52525b',
            marginTop: '0.2rem',
        }
    };

    const getIcon = (category) => {
        switch (category) {
            case 'Browser': return <Globe size={18} />;
            case 'Database': return <Database size={18} />;
            case 'Cloud': return <Cloud size={18} />;
            case 'Network': return <Activity size={18} />;
            case 'Hardware': return <Cpu size={18} />;
            case 'System': return <Shield size={18} />;
            default: return <Zap size={18} />;
        }
    };

    return (
        <div style={styles.container}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <h1 style={styles.title}>
                            <Activity size={32} color="#4f46e5" />
                            System Diagnostics
                        </h1>
                        <p style={{ marginTop: '0.5rem', color: '#71717a' }}>Real-time health check and integrity verification.</p>
                    </div>
                    <button
                        onClick={runDiagnostics}
                        disabled={isRunning}
                        style={styles.button}
                    >
                        {isRunning ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                        {isRunning ? 'Running...' : 'Run Diagnostics'}
                    </button>
                </div>

                {/* Overall Status Banner */}
                <div style={styles.statusCard}>
                    {isRunning ? (
                        <>
                            <Loader2 size={48} className="animate-spin text-blue-500" style={{ color: '#4f46e5', animation: 'spin 1s linear infinite' }} />
                            <div style={styles.statusText}>ANALYZING SYSTEM...</div>
                            <div style={{ width: '100%', height: '4px', backgroundColor: '#333', marginTop: '1.5rem', borderRadius: '2px' }}>
                                <div style={{ width: `${progress}%`, height: '100%', backgroundColor: '#4f46e5', borderRadius: '2px', transition: 'width 0.3s ease' }}></div>
                            </div>
                        </>
                    ) : (
                        <>
                            {overallStatus === 'success' && <CheckCircle size={56} color="#10b981" />}
                            {overallStatus === 'warning' && <AlertTriangle size={56} color="#f59e0b" />}
                            {overallStatus === 'error' && <XCircle size={56} color="#ef4444" />}
                            <div style={styles.statusText}>
                                {overallStatus === 'success' && 'ALL SYSTEMS OPERATIONAL'}
                                {overallStatus === 'warning' && 'WARNINGS DETECTED'}
                                {overallStatus === 'error' && 'SYSTEM ERRORS DETECTED'}
                            </div>
                        </>
                    )}
                </div>

                {/* Grid */}
                <div style={styles.grid}>
                    {['Browser', 'Database', 'Cloud', 'Network', 'Hardware', 'System'].map((cat) => (
                        <div key={cat} style={styles.card}>
                            <div style={styles.cardHeader}>
                                {getIcon(cat)}
                                {cat} Module
                            </div>
                            <div>
                                {results.filter(r => r.category === cat).length === 0 ? (
                                    <div style={{ color: '#444', fontStyle: 'italic', fontSize: '0.9rem' }}>Waiting for check...</div>
                                ) : (
                                    results.filter(r => r.category === cat).map((r, idx) => (
                                        <div key={idx} style={styles.itemRow}>
                                            <div style={styles.itemLabel}>
                                                {r.status === 'success' ? <CheckCircle size={14} color="#10b981" /> : r.status === 'error' ? <XCircle size={14} color="#ef4444" /> : <AlertTriangle size={14} color="#f59e0b" />}
                                                {r.name}
                                            </div>
                                            <div style={styles.itemValue}>
                                                <span style={styles.statusBadge(r.status)}>{r.message}</span>
                                                {r.latency && <div style={styles.latency}>{r.latency}</div>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default SystemDiagnostics;
