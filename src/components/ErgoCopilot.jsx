import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useDialog } from '../contexts/DialogContext';
import {
    Activity, Play, Pause, Upload, Shield, AlertTriangle, CheckCircle,
    Maximize2, List, Settings, TrendingUp, Info, ChevronRight, CornerDownRight,
    LayoutGrid, Box, User, Wind, BarChart3, Clock, ArrowUpRight, Zap,
    Volume2, VolumeX, RotateCcw, RotateCw, SkipBack, SkipForward
} from 'lucide-react';
import { initializePoseDetector, detectPose, drawPoseSkeleton } from '../utils/poseDetector';
import AngleCalculator from '../utils/angleCalculator';
import RULACalculator from '../utils/rulaCalculator';
import REBACalculator from '../utils/rebaCalculator';
import NIOSHCalculator from '../utils/nioshCalculator';
import { exportErgoReportToExcel } from '../utils/excelExport';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useLanguage } from '../i18n/LanguageContext';

const ErgoCopilot = () => {
    const { showAlert } = useDialog();
    const { t } = useLanguage();
    // --- State ---
    const [videoSrc, setVideoSrc] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentPose, setCurrentPose] = useState(null);
    const [riskScores, setRiskScores] = useState(null);
    const [analysisMode, setAnalysisMode] = useState('REBA'); // REBA, RULA, NIOSH
    const [historyData, setHistoryData] = useState([]); // [{time, score}]
    const [highRiskIntervals, setHighRiskIntervals] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [volume, setVolume] = useState(1);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    // NIOSH Params
    const [nioshParams, setNioshParams] = useState({ H: 30, V: 75, D: 25, A: 0, F: 1, duration: 1, coupling: 'good', weight: 5 });

    // --- Refs ---
    const videoRef = useRef(null);
    const canvas2dRef = useRef(null);
    const canvas3dRef = useRef(null);
    const detectorRef = useRef(null);
    const requestRef = useRef(null);
    const angleCalculator = useMemo(() => new AngleCalculator(), []);
    const rulaCalculator = useMemo(() => new RULACalculator(), []);
    const rebaCalculator = useMemo(() => new REBACalculator(), []);
    const nioshCalculator = useMemo(() => new NIOSHCalculator(), []);

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            detectorRef.current = await initializePoseDetector();
        };
        init();
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // --- Analysis Loop ---
    const runAnalysis = useCallback(async () => {
        if (!isAnalyzing || !videoRef.current || !detectorRef.current) return;

        const video = videoRef.current;
        if (video.paused || video.ended) {
            requestRef.current = requestAnimationFrame(runAnalysis);
            return;
        }

        const poses = await detectPose(video);
        if (poses && poses.length > 0) {
            const pose = poses[0];
            setCurrentPose(pose);
            setCurrentTime(video.currentTime);

            // Calculate Ergonomics
            const angles = angleCalculator.calculateAllAngles(pose.keypoints);
            let result;
            if (analysisMode === 'RULA') {
                result = rulaCalculator.calculate(angles);
            } else if (analysisMode === 'REBA') {
                result = rebaCalculator.calculate(angles);
            } else {
                result = nioshCalculator.calculateRWL(nioshParams, nioshParams.weight);
            }

            setRiskScores(result);

            // Update History
            const currentScore = result.finalScore || result.li;
            setHistoryData(prev => {
                const newData = [...prev, { time: video.currentTime.toFixed(1), score: currentScore }];
                // Find high risk (score > 6 for RULA/REBA, LI > 1.5 for NIOSH)
                if (currentScore > (analysisMode === 'NIOSH' ? 1.5 : 6)) {
                    updateHighRiskIntervals(video.currentTime);
                }
                return newData.length > 200 ? newData.slice(1) : newData;
            });

            // Draw 2D Overlay
            drawOverlay(pose);
            // Draw 3D-ish Projection
            draw3DPose(pose, result);
        }

        requestRef.current = requestAnimationFrame(runAnalysis);
    }, [isAnalyzing, analysisMode, nioshParams]);

    const updateHighRiskIntervals = (time) => {
        setHighRiskIntervals(prev => {
            if (prev.length === 0 || time > prev[prev.length - 1].end + 1) {
                return [...prev, { start: time, end: time }];
            }
            const last = prev[prev.length - 1];
            last.end = time;
            return [...prev];
        });
    };

    useEffect(() => {
        if (isAnalyzing) runAnalysis();
        else if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }, [isAnalyzing, runAnalysis]);

    // --- Drawing Logic ---
    const drawOverlay = (pose) => {
        const ctx = canvas2dRef.current.getContext('2d');
        const video = videoRef.current;
        canvas2dRef.current.width = video.videoWidth;
        canvas2dRef.current.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas2dRef.current.width, canvas2dRef.current.height);
        drawPoseSkeleton(ctx, [pose], video.videoWidth, video.videoHeight);
    };

    const draw3DPose = (pose, scores) => {
        const canvas = canvas3dRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Simple 3D Projection (Isometric-ish)
        // Pose keypoints are 2D (x, y) with z heuristic or sometimes provided by some models
        // Here we project them onto a 3D grid as shown in user image
        const project = (x, y, z = 0) => {
            // Origin at center bottom
            const centerX = w / 2;
            const centerY = h * 0.7;
            const scale = 150;

            // 3D to 2D transformation
            return {
                px: centerX + (x - 0.5) * scale + (z * 0.3 * scale),
                py: centerY + (y - 0.7) * scale - (z * 0.5 * scale)
            };
        };

        // Draw Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i += 0.5) {
            const p1 = project(0.5 + i, 0.7, -1);
            const p2 = project(0.5 + i, 0.7, 1);
            ctx.beginPath(); ctx.moveTo(p1.px, p1.py); ctx.lineTo(p2.px, p2.py); ctx.stroke();
            const p3 = project(0, 0.7, i);
            const p4 = project(1, 0.7, i);
            ctx.beginPath(); ctx.moveTo(p3.px, p3.py); ctx.lineTo(p4.px, p4.py); ctx.stroke();
        }

        // Draw Connections
        const connections = [
            ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
            ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
            ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
            ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
        ];

        connections.forEach(([s, e]) => {
            const k1 = pose.keypoints.find(kp => kp.name === s);
            const k2 = pose.keypoints.find(kp => kp.name === e);
            if (k1 && k2 && k1.score > 0.3 && k2.score > 0.3) {
                const p1 = project(k1.x, k1.y, 0); // Simplified Z=0 for now
                const p2 = project(k2.x, k2.y, 0);

                ctx.beginPath();
                ctx.moveTo(p1.px, p1.py);
                ctx.lineTo(p2.px, p2.py);
                ctx.strokeStyle = getRiskColor(scores?.finalScore || 0);
                ctx.lineWidth = 4;
                ctx.stroke();
            }
        });

        // Draw Joints
        pose.keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                const p = project(kp.x, kp.y, 0);
                ctx.beginPath();
                ctx.arc(p.px, p.py, 5, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = getRiskColor(scores?.finalScore || 0);
                ctx.stroke();
            }
        });
    };

    const getRiskColor = (score) => {
        if (score <= 3) return '#10b981'; // Green
        if (score <= 5) return '#f59e0b'; // Yellow
        if (score <= 7) return '#f97316'; // Orange
        return '#ef4444'; // Red
    };

    // --- UI Handlers ---
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setVideoSrc(URL.createObjectURL(file));
            setHistoryData([]);
            setHighRiskIntervals([]);
            setProgress(0);
        }
    };

    const togglePlayback = () => {
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsAnalyzing(true);
        } else {
            videoRef.current.pause();
            setIsAnalyzing(false);
        }
    };

    const handleSeek = (e) => {
        const time = Number(e.target.value);
        videoRef.current.currentTime = time;
        setCurrentTime(time);
    };

    const handleSkip = (seconds) => {
        videoRef.current.currentTime += seconds;
        setCurrentTime(videoRef.current.currentTime);
    };

    const handleVolumeChange = (e) => {
        const val = Number(e.target.value);
        setVolume(val);
        videoRef.current.volume = val;
        setIsMuted(val === 0);
    };

    const toggleMute = () => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        videoRef.current.muted = newMute;
    };

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleGenerateReport = async () => {
        if (!videoSrc || historyData.length === 0) {
            await showAlert('Info', 'Please upload and analyze a video first before generating a report.');
            return;
        }

        // Prepare report data
        const reportData = {
            analysisMode,
            duration,
            historyData,
            highRiskIntervals,
            nioshParams,
            riskScores
        };

        // Export to Excel
        exportErgoReportToExcel(reportData);
    };

    // --- Render ---
    return (
        <div style={{
            padding: '12px',
            backgroundColor: '#0f172a',
            minHeight: '100vh',
            overflowY: 'auto',
            color: '#f8fafc',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', padding: '6px', borderRadius: '8px' }}>
                            <Shield color="white" size={20} />
                        </div>
                        {t('ergoCopilot.title')} <span style={{ fontSize: '0.65rem', backgroundColor: '#312e81', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>PRO AI</span>
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', backgroundColor: '#1e293b', borderRadius: '10px', p: '4px' }}>
                        {['REBA', 'RULA', 'NIOSH'].map(m => (
                            <button key={m}
                                onClick={() => setAnalysisMode(m)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    backgroundColor: analysisMode === m ? '#6366f1' : 'transparent',
                                    color: analysisMode === m ? 'white' : '#94a3b8',
                                    fontWeight: 'bold', transition: '0.2s'
                                }}>{m}</button>
                        ))}
                    </div>
                    <label className="glass-panel" style={{ cursor: 'pointer', padding: '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#6366f1' }}>
                        <Upload size={18} /> {t('ergoCopilot.uploadVideo')}
                        <input type="file" hidden accept="video/*" onChange={handleFileUpload} />
                    </label>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '8px', flex: 1 }}>
                {/* Main Content: Video and 3D Visualizer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', height: '400px', zIndex: 10, position: 'relative' }}>
                        {/* Video Layer */}
                        <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                            {videoSrc ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        src={videoSrc}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        onLoadedMetadata={(e) => setDuration(e.target.duration)}
                                        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                                        onEnded={() => setIsAnalyzing(false)}
                                    />
                                    <canvas ref={canvas2dRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />

                                    {/* Video Controls Overlay */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '48px',
                                        left: '8px',
                                        right: '8px',
                                        background: 'rgba(15, 23, 42, 0.9)',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                        zIndex: 30,
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }}>
                                        {/* Seek Bar */}
                                        <input
                                            type="range"
                                            min={0}
                                            max={duration || 0}
                                            step={0.1}
                                            value={currentTime}
                                            onChange={handleSeek}
                                            style={{
                                                width: '100%',
                                                accentColor: '#6366f1',
                                                cursor: 'pointer',
                                                height: '4px'
                                            }}
                                        />

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <button onClick={togglePlayback} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex' }}>
                                                    {isAnalyzing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                                                </button>

                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleSkip(-5)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                                        <RotateCcw size={16} />
                                                    </button>
                                                    <button onClick={() => handleSkip(5)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                                        <RotateCw size={16} />
                                                    </button>
                                                </div>

                                                <div style={{ fontSize: '0.85rem', color: '#e2e8f0', fontFamily: 'monospace' }}>
                                                    {formatTime(currentTime)} / {formatTime(duration)}
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                                {/* Speed Selector */}
                                                <select
                                                    value={playbackSpeed}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setPlaybackSpeed(val);
                                                        videoRef.current.playbackRate = val;
                                                    }}
                                                    style={{
                                                        backgroundColor: 'rgba(255,255,255,0.1)',
                                                        border: '1px solid rgba(255,255,255,0.2)',
                                                        color: '#fff',
                                                        borderRadius: '4px',
                                                        fontSize: '0.75rem',
                                                        padding: '2px 4px'
                                                    }}
                                                >
                                                    <option value="0.5">0.5x</option>
                                                    <option value="1">1.0x</option>
                                                    <option value="1.5">1.5x</option>
                                                    <option value="2">2.0x</option>
                                                </select>

                                                {/* Volume Control */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                                                        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                                    </button>
                                                    <input
                                                        type="range"
                                                        min={0}
                                                        max={1}
                                                        step={0.1}
                                                        value={isMuted ? 0 : volume}
                                                        onChange={handleVolumeChange}
                                                        style={{ width: '50px', accentColor: '#6366f1', cursor: 'pointer' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    <Activity size={48} />
                                    <p style={{ marginTop: '16px' }}>{t('ergoCopilot.uploadPrompt')}</p>
                                </div>
                            )}
                        </div>

                        {/* 3D Visualizer Layer */}
                        <div className="glass-panel" style={{ borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Box size={16} /> {t('ergoCopilot.digitalTwinAnalysis')}</h3>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ef4444' }} />
                                </div>
                            </div>
                            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                <canvas ref={canvas3dRef} width={400} height={400} style={{ width: '100%', height: '100%' }} />
                                {riskScores && (
                                    <div style={{ position: 'absolute', top: 0, left: 0, padding: '8px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.riskConfidence')}</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>{(riskScores.finalScore ? (100 - riskScores.finalScore * 10) : 98).toFixed(1)}%</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline and Metrics */}
                    <div className="glass-panel" style={{ borderRadius: '12px', padding: '10px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <h3 style={{ fontSize: '0.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} /> {t('ergoCopilot.ergoStressTimeline')}</h3>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.analysisMode')}: {analysisMode}</span>
                        </div>
                        <div style={{ height: '220px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={historyData}>
                                    <defs>
                                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                    <XAxis dataKey="time" hide />
                                    <YAxis domain={[0, 10]} hide />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                                    <Area type="monotone" dataKey="score" stroke="#6366f1" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                        {/* High Risk Intervals */}
                        <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                            {highRiskIntervals.map((interval, i) => (
                                <div key={i} style={{
                                    padding: '4px 12px', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.8rem', cursor: 'pointer'
                                }} onClick={() => videoRef.current.currentTime = interval.start}>
                                    <AlertTriangle size={12} style={{ marginRight: '4px' }} /> {t('ergoCopilot.highStressAt', { 0: interval.start.toFixed(1) })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Sidebar: Analytics and Recs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Score Card */}
                    <div className="glass-panel" style={{ borderRadius: '12px', padding: '16px', textAlign: 'center', border: `2px solid ${getRiskColor(riskScores?.finalScore || 0)}` }}>
                        <h4 style={{ color: '#94a3b8', fontSize: '0.75rem', marginBottom: '4px' }}>{t('ergoCopilot.finalScore', { 0: analysisMode })}</h4>
                        <div style={{ fontSize: '3rem', fontWeight: '900', color: getRiskColor(riskScores?.finalScore || 0), lineHeight: '1' }}>
                            {riskScores ? (riskScores.finalScore || riskScores.li) : '0'}
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '1rem', fontWeight: 'bold' }}>{riskScores?.riskLevel ? t(`ergoCopilot.${riskScores.riskLevel.toLowerCase()}`, { defaultValue: riskScores.riskLevel }) : t('ergoCopilot.standby')}</div>
                        {riskScores?.li && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.targetRwl')}: {riskScores.rwl}kg</div>}
                    </div>

                    {/* NIOSH Params Calculator (If NIOSH mode) */}
                    {analysisMode === 'NIOSH' && (
                        <div className="glass-panel" style={{ borderRadius: '12px', padding: '12px' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px' }}>{t('ergoCopilot.liftingParameters')}</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.loadWeight')}</label>
                                    <input type="number" value={nioshParams.weight} onChange={e => setNioshParams({ ...nioshParams, weight: Number(e.target.value) })} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', p: '8px', borderRadius: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.frequency')}</label>
                                    <input type="number" value={nioshParams.F} onChange={e => setNioshParams({ ...nioshParams, F: Number(e.target.value) })} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', p: '8px', borderRadius: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.hDistance')}</label>
                                    <input type="number" value={nioshParams.H} onChange={e => setNioshParams({ ...nioshParams, H: Number(e.target.value) })} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', p: '8px', borderRadius: '6px' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{t('ergoCopilot.vDistance')}</label>
                                    <input type="number" value={nioshParams.V} onChange={e => setNioshParams({ ...nioshParams, V: Number(e.target.value) })} style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', color: '#fff', p: '8px', borderRadius: '6px' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recommendations Panel */}
                    <div className="glass-panel" style={{ borderRadius: '12px', padding: '16px', flex: 1 }}>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle size={16} color="#10b981" /> {t('ergoCopilot.improvementPlan')}</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { level: 'P1', text: t('ergoCopilot.recom1'), type: t('ergoCopilot.engineering') },
                                { level: 'P2', text: t('ergoCopilot.recom2'), type: t('ergoCopilot.ergonomic') },
                                { level: 'P3', text: t('ergoCopilot.recom3'), type: t('ergoCopilot.administrative') }
                            ].map((rec, i) => (
                                <div key={i} style={{ padding: '8px 12px', backgroundColor: '#1e293b', borderRadius: '8px', borderLeft: `3px solid ${rec.level === 'P1' ? '#ef4444' : '#f59e0b'}` }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: rec.level === 'P1' ? '#fca5a5' : '#fcd34d' }}>{rec.level}</span>
                                        <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{rec.type}</span>
                                    </div>
                                    <p style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>{rec.text}</p>
                                </div>
                            ))}
                        </div>
                        <button onClick={handleGenerateReport} style={{ width: '100%', marginTop: '16px', padding: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <Zap size={16} /> {t('ergoCopilot.generateReport')}
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .glass-panel {
                    background: rgba(30, 41, 59, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                }
            `}</style>
        </div>
    );
};

export default ErgoCopilot;
