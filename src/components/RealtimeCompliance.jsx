import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Play, Pause, RefreshCw, AlertTriangle, CheckCircle, Clock, List, Activity,
    Video as VideoIcon, Camera, Settings, Plus, X, Maximize2, Trash2, LayoutGrid, Monitor
} from 'lucide-react';
import { initializePoseDetector, detectPose, drawPoseSkeleton } from '../utils/poseDetector';
import { initializeHandDetector, detectHands, drawHandSkeleton } from '../utils/handDetector';
import { ProjectActionMatcher } from '../utils/projectActionMatcher';
import { ComplianceEngine } from '../utils/complianceEngine';
import { getProjectByName, getAllProjects, getAllCameras, saveCamera, deleteCamera, getAllStudioModels } from '../utils/database'; // Added getAllStudioModels
import InferenceEngine from '../utils/studio/InferenceEngine'; // Import Studio Engine
import { useLanguage } from '../contexts/LanguageContext';

// --- Audio Feedback Utility ---
const playFeedback = (type) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'success') {
        // Ding sound
        osc.frequency.setValueAtTime(880, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    } else if (type === 'error') {
        // Buzzer sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    } else if (type === 'complete') {
        // Happy sequence
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.exponentialRampToValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    }

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
};

const RealtimeCompliance = ({ projectName: initialProjectName }) => {
    const { t } = useLanguage();
    // --- State ---
    const [cameras, setCameras] = useState([]);
    const [activeCameraId, setActiveCameraId] = useState(null);
    const [isManaging, setIsManaging] = useState(false);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [availableStudioModels, setAvailableStudioModels] = useState([]); // New State
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'focus'
    const [showOverlay, setShowOverlay] = useState(true); // Overlay visibility toggle

    // Camera Operational States (Map: cameraId -> state)
    const [cameraStates, setCameraStates] = useState({});
    const poseSequenceRefs = useRef({}); // Map: cameraId -> array
    const requestRefs = useRef({}); // Map: cameraId -> animationFrameId
    const videoRefs = useRef({}); // Map: cameraId -> videoElement
    const canvasRefs = useRef({}); // Map: cameraId -> canvasElement

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                const [allProjects, allCams, studioModels] = await Promise.all([
                    getAllProjects(),
                    getAllCameras(),
                    getAllStudioModels()
                ]);
                setAvailableProjects(allProjects);
                setAvailableStudioModels(studioModels);
                setCameras(allCams);

                // Auto-create default if empty (backward compatibility)
                if (allCams.length === 0 && initialProjectName) {
                    const defaultCam = {
                        name: "Main Station",
                        projectName: initialProjectName,
                        url: "",
                        type: "mjpeg"
                    };
                    const id = await saveCamera(defaultCam);
                    setCameras([{ ...defaultCam, id }]);
                    setActiveCameraId(id);
                } else if (allCams.length > 0) {
                    setActiveCameraId(allCams[0].id);
                }

                await initializePoseDetector();
                await initializeHandDetector();
            } catch (err) {
                console.error("Compliance Init Error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
        return () => {
            // Cleanup all monitoring loops
            Object.values(requestRefs.current).forEach(id => cancelAnimationFrame(id));
        };
    }, []);

    // Sync Engines when cameras change
    useEffect(() => {
        const syncEngines = async () => {
            const newStates = { ...cameraStates };
            for (const cam of cameras) {
                if (!newStates[cam.id] && cam.projectName) {
                    // Try Standard Work Project first
                    const proj = await getProjectByName(cam.projectName);
                    if (proj) {
                        const matcher = new ProjectActionMatcher(proj);
                        const engine = new ComplianceEngine(proj, matcher);
                        newStates[cam.id] = {
                            engine,
                            status: engine.getStatus(0),
                            isMonitoring: false,
                            cycleCount: 0,
                            scoreHistory: [],
                            type: cam.type || 'mjpeg',
                            modelType: 'standard'
                        };
                        poseSequenceRefs.current[cam.id] = [];
                    } else {
                        // Try finding in Studio Models
                        const studioModel = (await getAllStudioModels()).find(m => m.name === cam.projectName);
                        if (studioModel) {
                            const engine = new InferenceEngine();
                            engine.loadModel(studioModel);

                            // Audio Callbacks
                            engine.onStateChange = (trackId, toId, fromId) => {
                                const currentIndex = engine.model.statesList.findIndex(s => s.id === fromId);
                                const nextIndex = engine.model.statesList.findIndex(s => s.id === toId);
                                if (nextIndex > currentIndex + 1 || (nextIndex < currentIndex && nextIndex !== 0)) {
                                    playFeedback('error');
                                } else {
                                    playFeedback('success');
                                }
                            };
                            engine.onCycleComplete = () => {
                                playFeedback('complete');
                                setCameraStates(prev => ({
                                    ...prev,
                                    [cam.id]: { ...prev[cam.id], cycleCount: (prev[cam.id].cycleCount || 0) + 1 }
                                }));
                            };

                            newStates[cam.id] = {
                                engine,
                                status: { currentStep: { elementName: t('complianceDashboard.initializing') }, match: { score: 100 } },
                                isMonitoring: false,
                                cycleCount: 0,
                                type: cam.type || 'mjpeg',
                                modelType: 'studio'
                            };
                        }
                    }
                }
            }
            setCameraStates(newStates);
        };
        if (cameras.length > 0) syncEngines();
    }, [cameras]);

    // --- Monitoring Logic ---
    const monitorCamera = useCallback(async (cameraId) => {
        const camState = cameraStates[cameraId];
        const video = videoRefs.current[cameraId];
        if (!camState || !camState.isMonitoring || !video || !camState.engine) return;

        try {
            // For IP cameras, if streaming via <img>, we might need a different pose detection method
            // but for now we assume they are compatible with detectPose if correctly loaded
            const poses = await detectPose(video);
            const hands = await detectHands(video);

            // Draw overlay if enabled
            if (showOverlay) {
                const canvas = canvasRefs.current[cameraId];
                if (canvas && video) {
                    const ctx = canvas.getContext('2d');
                    canvas.width = video.videoWidth || video.width || 640;
                    canvas.height = video.videoHeight || video.height || 480;
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Draw ROI if present in model
                    const engine = camState.engine;
                    if (engine.model && engine.model.statesList) {
                        const currentS = engine.model.statesList.find(s => s.id === engine.activeTracks.get(1)?.currentState);
                        if (currentS && currentS.roi) {
                            const { x, y, width, height } = currentS.roi;
                            ctx.strokeStyle = '#00d2ff';
                            ctx.lineWidth = 3;
                            ctx.strokeRect(x, y, width, height);

                            // Glowing effect
                            ctx.shadowBlur = 15;
                            ctx.shadowColor = '#00d2ff';
                            ctx.strokeRect(x, y, width, height);
                            ctx.shadowBlur = 0;

                            // ROI Label
                            ctx.fillStyle = '#00d2ff';
                            ctx.font = 'bold 12px Arial';
                            ctx.fillText(`ROI: ${currentS.name}`, x, y - 10);
                        }
                    }

                    // Draw pose skeleton
                    if (poses && poses.length > 0) {
                        poses.forEach(pose => {
                            drawPoseSkeleton(ctx, [pose], canvas.width, canvas.height);
                        });
                    }

                    // Draw hand landmarks
                    if (hands && hands.length > 0) {
                        hands.forEach(hand => {
                            drawHandSkeleton(ctx, hand, canvas.width, canvas.height);
                        });
                    }
                }
            }

            if (poses && poses.length > 0) {
                if (camState.modelType === 'studio') {
                    // --- STUDIO MODEL ENGINE ---
                    // InferenceEngine expects { poses, objects, hands, timestamp }
                    // It returns { tracks, logs, timelineEvents }
                    const result = camState.engine.processFrame({
                        poses: poses,
                        hands: hands,
                        timestamp: Date.now()
                    });

                    // Adapt result for UI (Simplified mapping)
                    const primaryTrack = result.tracks[0];
                    const currentStatusName = primaryTrack ? primaryTrack.state : t('complianceDashboard.standby');

                    setCameraStates(prev => ({
                        ...prev,
                        [cameraId]: {
                            ...prev[cameraId],
                            status: {
                                currentStep: { elementName: currentStatusName },
                                match: { score: primaryTrack ? 100 : 0 },
                                actualCT: primaryTrack ? parseFloat(primaryTrack.duration) : 0,
                                history: result.timelineEvents.map(e => ({
                                    elementName: e.state,
                                    actualCT: (e.duration / 1000).toFixed(1)
                                })).reverse().slice(0, 10), // Show last 10 events
                                isSequenceMismatch: result.timelineEvents.some(e => e.type === 'Anomaly')
                            },
                            timelineEvents: result.timelineEvents || [] // Store full timeline
                        }
                    }));

                } else {
                    // --- STANDARD WORK ENGINE ---
                    const pose = poses[0]; // Fix: Define pose from poses array
                    const seq = poseSequenceRefs.current[cameraId] || [];
                    seq.push(pose);
                    if (seq.length > 60) seq.shift();
                    poseSequenceRefs.current[cameraId] = seq;

                    if (seq.length >= 15) {
                        const engine = camState.engine;
                        const match = engine.matcher.match(seq, engine.currentStepIndex);
                        const currentStatus = engine.update(match);

                        setCameraStates(prev => ({
                            ...prev,
                            [cameraId]: {
                                ...prev[cameraId],
                                status: currentStatus,
                                scoreHistory: [...(prev[cameraId].scoreHistory || []), currentStatus.match?.score || 0].slice(-10)
                            }
                        }));
                    }
                }
            }
        } catch (err) {
            console.error(`Monitor error for cam ${cameraId}:`, err);
        }

        requestRefs.current[cameraId] = requestAnimationFrame(() => monitorCamera(cameraId));
    }, [cameraStates]);

    const handleToggleMonitoring = async (cameraId) => {
        const cam = cameras.find(c => c.id === cameraId);
        if (!cam) return;

        setCameraStates(prev => {
            const isStarting = !prev[cameraId].isMonitoring;
            if (isStarting) {
                prev[cameraId].engine.reset();
                poseSequenceRefs.current[cameraId] = [];
                // Stream starts with a small delay to ensure refs are ready
                setTimeout(() => monitorCamera(cameraId), 1000);
            } else {
                if (requestRefs.current[cameraId]) cancelAnimationFrame(requestRefs.current[cameraId]);
            }
            return {
                ...prev,
                [cameraId]: { ...prev[cameraId], isMonitoring: isStarting }
            };
        });
    };

    // --- Camera Management ---
    const [newCam, setNewCam] = useState({ name: '', url: '', projectName: '', type: 'mjpeg', modelType: 'standard' });

    const handleAddCamera = async () => {
        if (!newCam.name || !newCam.projectName) return;
        const id = await saveCamera(newCam);
        setCameras([...cameras, { ...newCam, id }]);
        setNewCam({ name: '', url: '', projectName: '', type: 'mjpeg', modelType: 'standard' });
        setIsManaging(false);
    };

    const handleDeleteCamera = async (id) => {
        await deleteCamera(id);
        if (requestRefs.current[id]) cancelAnimationFrame(requestRefs.current[id]);
        setCameras(cameras.filter(c => c.id !== id));
        setCameraStates(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
    };

    // --- Render Helpers ---
    if (loading) return <div style={{ color: '#888', padding: '40px', textAlign: 'center' }}>{t('complianceDashboard.loadingEngine')}</div>;

    const renderGrid = () => (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: '24px',
            padding: '24px',
            overflowY: 'auto',
            height: 'calc(100vh - 100px)'
        }}>
            {cameras.map(cam => {
                const state = cameraStates[cam.id];
                const status = state?.status;
                const isMismatch = status?.isSequenceMismatch;

                return (
                    <div key={cam.id} className="glass-card" style={{
                        padding: 0,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                        border: isMismatch ? '1px solid #ff4b4b' : '1px solid rgba(255, 255, 255, 0.1)',
                        position: 'relative'
                    }}
                        onClick={() => { setActiveCameraId(cam.id); setViewMode('focus'); }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-5px)';
                            e.currentTarget.style.boxShadow = '0 15px 30px rgba(0,0,0,0.3)';
                            e.currentTarget.style.borderColor = isMismatch ? '#ff4b4b' : 'rgba(0, 210, 255, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.borderColor = isMismatch ? '#ff4b4b' : 'rgba(255, 255, 255, 0.1)';
                        }}>
                        {/* Video Area */}
                        <div style={{ position: 'relative', height: '220px', backgroundColor: '#000' }}>
                            <img
                                ref={el => videoRefs.current[cam.id] = el}
                                src={cam.url}
                                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }}
                                alt={cam.name}
                                crossOrigin="anonymous"
                            />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 40%)' }} />

                            {/* Canvas Overlay */}
                            <canvas
                                ref={el => canvasRefs.current[cam.id] = el}
                                style={{
                                    position: 'absolute',
                                    top: 0, left: 0,
                                    width: '100%', height: '100%',
                                    pointerEvents: 'none',
                                    display: showOverlay ? 'block' : 'none'
                                }}
                            />

                            <div style={{
                                position: 'absolute', top: '12px', left: '12px',
                                padding: '6px 10px', borderRadius: '8px',
                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px',
                                color: 'white', fontWeight: '500'
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    backgroundColor: state?.isMonitoring ? '#00ff41' : '#999',
                                    boxShadow: state?.isMonitoring ? '0 0 8px #00ff41' : 'none'
                                }} />
                                {cam.name}
                            </div>

                            {status?.isSequenceMismatch && (
                                <div style={{
                                    position: 'absolute', bottom: '12px', left: '12px', right: '12px',
                                    background: 'linear-gradient(90deg, rgba(255, 75, 75, 0.9) 0%, rgba(200, 50, 50, 0.9) 100%)',
                                    padding: '8px', borderRadius: '8px',
                                    fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    boxShadow: '0 4px 12px rgba(255, 75, 75, 0.3)'
                                }}>
                                    <AlertTriangle size={14} /> {t('complianceDashboard.mismatchDetected')}
                                </div>
                            )}
                        </div>

                        {/* Info Header */}
                        <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={12} /> {cam.projectName}
                                </span>
                                <div style={{
                                    fontSize: '1rem', fontWeight: 'bold', color: '#00d2ff',
                                    background: 'rgba(0, 210, 255, 0.1)', padding: '2px 8px', borderRadius: '6px'
                                }}>
                                    {status?.match?.score?.toFixed(0) || 0}%
                                </div>
                            </div>
                            <div style={{ fontSize: '0.95rem', fontWeight: '500', color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {status?.currentStep?.elementName || t('complianceDashboard.standby')}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Add Camera Placeholder */}
            <div
                onClick={() => setIsManaging(true)}
                className="glass-card"
                style={{
                    border: '2px dashed rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '280px',
                    cursor: 'pointer',
                    color: '#888',
                    transition: 'all 0.2s',
                    background: 'transparent'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#00d2ff';
                    e.currentTarget.style.color = '#00d2ff';
                    e.currentTarget.style.background = 'rgba(0, 210, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.color = '#888';
                    e.currentTarget.style.background = 'transparent';
                }}
            >
                <div style={{
                    background: 'rgba(255, 255, 255, 0.05)', padding: '20px', borderRadius: '50%', marginBottom: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Plus size={32} />
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '500' }}>{t('complianceDashboard.addNewStation')}</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px' }}>{t('complianceDashboard.configureCamera')}</div>
            </div>
        </div>
    );

    const renderFocus = () => {
        const cam = cameras.find(c => c.id === activeCameraId);
        const state = cameraStates[activeCameraId];
        const status = state?.status;
        if (!cam || !state) return null;

        return (
            <div style={{
                display: 'grid', gridTemplateColumns: '1fr 400px', gap: '24px', padding: '24px',
                height: 'calc(100vh - 100px)', overflow: 'hidden'
            }}>
                {/* Left: Video */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{
                        position: 'relative', flex: 1, backgroundColor: '#000', borderRadius: '16px',
                        overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                    }}>
                        <img
                            ref={el => videoRefs.current[cam.id] = el}
                            src={cam.url}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            alt={cam.name}
                            crossOrigin="anonymous"
                        />

                        {/* Canvas Overlay */}
                        <canvas
                            ref={el => canvasRefs.current[cam.id] = el}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0,
                                width: '100%', height: '100%',
                                pointerEvents: 'none',
                                display: showOverlay ? 'block' : 'none'
                            }}
                        />
                        <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', gap: '12px' }}>
                            <div className="glass-panel" style={{
                                padding: '8px 16px', borderRadius: '12px',
                                backgroundColor: state.isMonitoring ? 'rgba(16, 124, 65, 0.8)' : 'rgba(0, 0, 0, 0.6)',
                                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold',
                                backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                                <VideoIcon size={18} /> {cam.name.toUpperCase()}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowOverlay(!showOverlay); }}
                                className="glass-panel"
                                style={{
                                    padding: '8px 16px', borderRadius: '12px',
                                    backgroundColor: showOverlay ? 'rgba(0, 210, 255, 0.2)' : 'rgba(0, 0, 0, 0.6)',
                                    border: `1px solid ${showOverlay ? '#00d2ff' : 'rgba(255,255,255,0.1)'}`,
                                    color: '#fff', fontWeight: 'bold', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    backdropFilter: 'blur(8px)'
                                }}
                                title={showOverlay ? t('complianceDashboard.hideOverlay') : t('complianceDashboard.showOverlay')}
                            >
                                <Activity size={18} color={showOverlay ? '#00d2ff' : 'white'} /> {showOverlay ? t('complianceDashboard.overlayOn') : t('complianceDashboard.overlayOff')}
                            </button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <button
                            onClick={() => handleToggleMonitoring(cam.id)}
                            style={{
                                padding: '12px 24px',
                                background: state.isMonitoring
                                    ? 'linear-gradient(135deg, #ff4b4b 0%, #aa0000 100%)'
                                    : 'linear-gradient(135deg, #00d2ff 0%, #0078d4 100%)',
                                color: '#fff', fontWeight: 'bold', border: 'none', borderRadius: '10px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '10px',
                                boxShadow: state.isMonitoring ? '0 4px 15px rgba(255, 75, 75, 0.4)' : '0 4px 15px rgba(0, 210, 255, 0.4)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {state.isMonitoring ? <Pause size={20} /> : <Play size={20} />}
                            {state.isMonitoring ? t('complianceDashboard.stopMonitoring') : t('complianceDashboard.startMonitoring')}
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#ccc', padding: '12px 24px', borderRadius: '10px',
                                cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                        >
                            {t('complianceDashboard.backToGrid')}
                        </button>
                    </div>
                </div>

                {/* Right: Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                    <div className="glass-card" style={{ padding: '24px', cursor: 'default' }}>
                        <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} color="#00d2ff" /> {t('complianceDashboard.currentStep')}
                        </div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 'bold', margin: '12px 0', color: 'white', lineHeight: '1.4' }}>
                            {status?.currentStep?.elementName || '---'}
                        </div>

                        {/* Progress Bar */}
                        {status?.currentStep && (
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', margin: '12px 0' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((status.actualCT / (status.currentStep.duration || 1)) * 100, 100)}%`,
                                    background: status.actualCT > (status.currentStep.duration || 1) ? '#ef4444' : '#00d2ff',
                                    transition: 'width 0.3s ease-out'
                                }} />
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: '#aaa' }}>{t('complianceDashboard.standardTime')}</span>
                                <span style={{ fontWeight: 'bold', color: '#00d2ff' }}>{status?.currentStep?.duration?.toFixed(1) || '0.0'}s</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ color: '#aaa' }}>{t('complianceDashboard.actualTime')}</span>
                                <span style={{ fontWeight: 'bold', color: status?.ctVariance > 0 ? '#ff4b4b' : '#00ff41' }}>
                                    {status?.actualCT?.toFixed(1) || '0.0'}s
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* OK/NG Indicator (Visio/Retrocausal Style) */}
                    <div
                        className={status?.isSequenceMismatch ? 'ng-pulse' : ''}
                        style={{
                            padding: '32px',
                            borderRadius: '16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            background: status?.isSequenceMismatch
                                ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.05) 100%)'
                                : 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.05) 100%)',
                            border: `2px solid ${status?.isSequenceMismatch ? '#ef4444' : '#10b981'}`,
                            boxShadow: status?.isSequenceMismatch ? '0 0 20px rgba(239, 68, 68, 0.2)' : '0 0 20px rgba(16, 185, 129, 0.2)'
                        }}>
                        <div style={{
                            fontSize: '4rem',
                            fontWeight: '900',
                            color: status?.isSequenceMismatch ? '#ef4444' : '#10b981',
                            letterSpacing: '4px'
                        }}>
                            {status?.isSequenceMismatch ? t('complianceDashboard.ng') : t('complianceDashboard.ok')}
                        </div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '1.2rem', textTransform: 'uppercase' }}>
                            {status?.isSequenceMismatch ? t('complianceDashboard.sequenceMismatchLabel') : t('complianceDashboard.processCompliant')}
                        </div>
                    </div>

                    {/* Cycle Counter */}
                    <div className="glass-card" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <RefreshCw size={24} color="#00d2ff" />
                            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{t('complianceDashboard.cycleCount')}</span>
                        </div>
                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#00d2ff' }}>
                            {state.cycleCount || 0}
                        </div>
                    </div>

                    {/* Timeline Events Panel (for Studio Models) */}
                    {state.modelType === 'studio' && state.timelineEvents && state.timelineEvents.length > 0 && (
                        <div className="glass-card" style={{ flex: 1, padding: '24px', cursor: 'default', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                <Clock size={18} color="#00d2ff" /> {t('complianceDashboard.recentEvents')}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', paddingRight: '8px' }}>
                                {state.timelineEvents.slice().reverse().slice(0, 20).map((event, i) => {
                                    const duration = (event.duration / 1000).toFixed(2);
                                    const startTime = new Date(event.startTime).toLocaleTimeString();
                                    return (
                                        <div key={i} style={{
                                            padding: '12px',
                                            backgroundColor: i === 0 ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                                            borderLeft: `3px solid ${i === 0 ? '#00d2ff' : 'rgba(255, 255, 255, 0.1)'}`,
                                            borderRadius: '0 8px 8px 0',
                                            fontSize: '0.9rem'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                <span style={{ fontWeight: '600', color: i === 0 ? '#00d2ff' : '#eee' }}>
                                                    {event.state}
                                                </span>
                                                <span style={{ color: '#666', fontSize: '0.75rem' }}>
                                                    {startTime}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ color: '#888', fontSize: '0.8rem' }}>{t('complianceDashboard.duration')}</span>
                                                <span style={{
                                                    color: parseFloat(duration) > 5 ? '#ff4b4b' : '#00ff41',
                                                    fontWeight: 'bold',
                                                    fontFamily: 'monospace'
                                                }}>
                                                    {duration}s
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Standard Work Sequence (for Standard Models) */}
                    {state.modelType !== 'studio' && (
                        <div className="glass-card" style={{ flex: 1, padding: '24px', cursor: 'default', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                                <List size={18} color="#00d2ff" /> {t('complianceDashboard.workSequence')}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {status?.history?.map((h, i) => (
                                    <div key={i} style={{
                                        padding: '12px', backgroundColor: 'rgba(16, 124, 65, 0.1)',
                                        border: '1px solid rgba(16, 124, 65, 0.3)', borderRadius: '8px',
                                        fontSize: '0.9rem', color: '#ccc', display: 'flex', justifyContent: 'space-between'
                                    }}>
                                        <span><CheckCircle size={14} color="#00ff41" style={{ display: 'inline', marginRight: '8px' }} /> {h.elementName}</span>
                                        <span style={{ fontFamily: 'monospace', color: '#00ff41' }}>{h.actualCT}s</span>
                                    </div>
                                ))}
                                <div style={{
                                    padding: '16px', borderRadius: '8px', fontSize: '0.95rem', fontWeight: 'bold',
                                    background: 'linear-gradient(90deg, rgba(0, 210, 255, 0.1) 0%, transparent 100%)',
                                    borderLeft: '4px solid #00d2ff', color: 'white', display: 'flex', alignItems: 'center', gap: '8px'
                                }}>
                                    <div className="spinner-small" style={{ width: '16px', height: '16px', border: '2px solid rgba(0, 210, 255, 0.3)', borderTopColor: '#00d2ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                                    {status?.currentStep?.elementName}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ padding: 0, height: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div className="glass-panel" style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.2)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '16px', fontWeight: 'bold' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #00d2ff 0%, #0078d4 100%)',
                            padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)'
                        }}>
                            <Monitor color="white" size={24} />
                        </div>
                        <span style={{
                            background: 'linear-gradient(90deg, #fff, #ccc)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>
                            {t('complianceDashboard.title')}
                        </span>
                    </h1>
                    <div style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        padding: '6px 16px', borderRadius: '20px',
                        fontSize: '0.85rem', color: '#ccc', border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#00ff41', boxShadow: '0 0 8px #00ff41' }}></div>
                        {cameras.length} {t('complianceDashboard.activeStations')}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'focus' : 'grid')}
                        className="glass-panel"
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#fff', padding: '12px', borderRadius: '12px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                        title={viewMode === 'grid' ? t('complianceDashboard.switchFocus') : t('complianceDashboard.switchGrid')}
                    >
                        {viewMode === 'grid' ? <Maximize2 size={20} /> : <LayoutGrid size={20} />}
                    </button>
                    <button
                        onClick={() => setIsManaging(true)}
                        style={{
                            background: 'linear-gradient(135deg, #00d2ff 0%, #0078d4 100%)',
                            color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px',
                            fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px',
                            boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)', cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        <Plus size={20} /> {t('complianceDashboard.addCamera')}
                    </button>
                </div>
            </div>

            {viewMode === 'grid' ? renderGrid() : renderFocus()}

            {/* Management Modal */}
            {isManaging && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div className="glass-panel" style={{
                        backgroundColor: '#1e1e1e', padding: '40px', borderRadius: '24px',
                        width: '500px', border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>{t('complianceDashboard.configureStation')}</h2>
                            <button onClick={() => setIsManaging(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', marginLeft: '4px' }}>{t('complianceDashboard.stationName')}</label>
                                <input
                                    value={newCam.name}
                                    onChange={e => setNewCam({ ...newCam, name: e.target.value })}
                                    placeholder={t('complianceDashboard.stationNamePlaceholder')}
                                    style={{
                                        width: '100%', padding: '14px', backgroundColor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px',
                                        fontSize: '1rem', outline: 'none'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', marginLeft: '4px' }}>{t('complianceDashboard.cameraType')}</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={newCam.type}
                                        onChange={e => setNewCam({ ...newCam, type: e.target.value })}
                                        style={{
                                            width: '100%', padding: '14px', backgroundColor: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px',
                                            fontSize: '1rem', outline: 'none', appearance: 'none'
                                        }}
                                    >
                                        <option value="mjpeg">{t('complianceDashboard.mjpegOption')}</option>
                                    </select>
                                    <Camera size={20} style={{ position: 'absolute', right: 14, top: 14, color: '#666', pointerEvents: 'none' }} />
                                </div>
                            </div>
                            {newCam.type === 'mjpeg' && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', marginLeft: '4px' }}>{t('complianceDashboard.streamUrl')}</label>
                                    <input
                                        value={newCam.url}
                                        onChange={e => setNewCam({ ...newCam, url: e.target.value })}
                                        placeholder={t('complianceDashboard.streamUrlPlaceholder')}
                                        style={{
                                            width: '100%', padding: '14px', backgroundColor: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px',
                                            fontSize: '1rem', outline: 'none'
                                        }}
                                    />
                                </div>
                            )}
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#aaa', marginBottom: '8px', marginLeft: '4px' }}>{t('complianceDashboard.complianceModel')}</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={newCam.projectName}
                                        onChange={e => setNewCam({ ...newCam, projectName: e.target.value })}
                                        style={{
                                            width: '100%', padding: '14px', backgroundColor: 'rgba(0,0,0,0.2)',
                                            border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px',
                                            fontSize: '1rem', outline: 'none', appearance: 'none'
                                        }}
                                    >
                                        <option value="">{t('complianceDashboard.selectModel')}</option>
                                        {availableStudioModels.map(m => <option key={'m_' + m.id} value={m.name}>{m.name}</option>)}
                                    </select>
                                    <Settings size={20} style={{ position: 'absolute', right: 14, top: 14, color: '#666', pointerEvents: 'none' }} />
                                </div>
                            </div>
                            <button
                                onClick={handleAddCamera}
                                style={{
                                    backgroundColor: '#00d2ff', background: 'linear-gradient(135deg, #00d2ff 0%, #0078d4 100%)',
                                    color: '#fff', border: 'none', padding: '16px', borderRadius: '12px',
                                    fontWeight: 'bold', marginTop: '16px', fontSize: '1rem', cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)'
                                }}
                            >
                                {t('complianceDashboard.saveConfiguration')}
                            </button>
                        </div>

                        {cameras.length > 0 && (
                            <div style={{ marginTop: '32px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '24px' }}>
                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '16px', fontWeight: '500' }}>{t('complianceDashboard.configuredStations')}</div>
                                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {cameras.map(c => (
                                        <div key={c.id} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <span style={{ fontWeight: '500' }}>{c.name}</span>
                                            <button
                                                onClick={() => handleDeleteCamera(c.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                title={t('complianceDashboard.deleteStation')}
                                            >
                                                <Trash2 size={18} color="#ff4b4b" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                ::-webkit-scrollbar-track { background: transparent; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
                .ng-pulse { animation: pulse 0.8s infinite; }
            `}</style>
        </div>
    );


};

export default RealtimeCompliance;
