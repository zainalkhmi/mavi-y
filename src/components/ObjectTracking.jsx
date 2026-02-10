import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { Play, Pause, RefreshCw, Download, Eye, EyeOff, Filter, BarChart3, HelpCircle } from 'lucide-react';
import {
    initializeObjectDetector,
    detectObjects,
    filterRelevantObjects,
    trackObjects,
    drawObjectDetections,
    calculateObjectStats,
    getDetectableClasses,
    disposeObjectDetector
} from '../utils/objectDetector';

const ObjectTracking = ({ videoSrc, measurements, onUpdateMeasurements, externalVideoRef }) => {
    const { showAlert } = useDialog();
    const [isDetecting, setIsDetecting] = useState(false);
    const [detector, setDetector] = useState(null);
    const [status, setStatus] = useState('Initializing...');
    const [tracks, setTracks] = useState(new Map());
    const [stats, setStats] = useState(null);
    const [showTrails, setShowTrails] = useState(true);
    const [showStats, setShowStats] = useState(true);
    const [filterClasses, setFilterClasses] = useState([]);
    const [showFilterDialog, setShowFilterDialog] = useState(false);
    const [fps, setFps] = useState(0);
    const [showHelp, setShowHelp] = useState(false);

    const internalRef = useRef(null);
    const videoRef = externalVideoRef || internalRef;
    const canvasRef = useRef(null);
    const requestRef = useRef();
    const tracksRef = useRef(new Map());
    const lastFrameTime = useRef(Date.now());
    const frameCount = useRef(0);

    // Initialize detector
    useEffect(() => {
        const initDetector = async () => {
            try {
                const det = await initializeObjectDetector();
                setDetector(det);
                setStatus('Ready');
            } catch (error) {
                console.error('Failed to initialize detector:', error);
                setStatus('Failed');
            }
        };
        initDetector();

        return () => {
            disposeObjectDetector();
        };
    }, []);

    // Detection loop
    const detectFrame = useCallback(async () => {
        if (!isDetecting || !detector || !videoRef.current) return;

        try {
            // Detect objects
            const detections = await detectObjects(videoRef.current);

            // Filter if needed
            const filtered = filterClasses.length > 0
                ? detections.filter(d => filterClasses.includes(d.class))
                : detections;

            // Track objects
            const newTracks = trackObjects(filtered, tracksRef.current);
            tracksRef.current = newTracks;
            setTracks(new Map(newTracks));

            // Calculate stats
            const newStats = calculateObjectStats(newTracks);
            setStats(newStats);

            // Draw on canvas
            const canvas = canvasRef.current;
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const video = videoRef.current;
                const scaleX = canvas.width / video.videoWidth;
                const scaleY = canvas.height / video.videoHeight;

                drawObjectDetections(ctx, newTracks, scaleX, scaleY, showTrails);
            }

            // Calculate FPS
            frameCount.current++;
            const now = Date.now();
            if (now - lastFrameTime.current >= 1000) {
                setFps(frameCount.current);
                frameCount.current = 0;
                lastFrameTime.current = now;
            }

        } catch (error) {
            console.error('Error in detection loop:', error);
        }

        requestRef.current = requestAnimationFrame(detectFrame);
    }, [isDetecting, detector, filterClasses, showTrails]);

    useEffect(() => {
        if (isDetecting && detector) {
            detectFrame();
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isDetecting, detector, detectFrame]);

    const handleStartDetection = async () => {
        if (!videoRef.current) {
            await showAlert('Info', 'Please load a video first.');
            return;
        }
        if (status !== 'Ready') {
            await showAlert('Info', 'Detector not ready. Please wait.');
            return;
        }

        tracksRef.current = new Map();
        setTracks(new Map());
        frameCount.current = 0;
        lastFrameTime.current = Date.now();
        setIsDetecting(!isDetecting);
    };

    const handleReset = () => {
        setIsDetecting(false);
        tracksRef.current = new Map();
        setTracks(new Map());
        setStats(null);
        setFps(0);

        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const handleExportToMeasurements = async () => {
        if (tracks.size === 0) {
            await showAlert('Info', 'No tracked objects to export.');
            return;
        }

        const newMeasurements = [];

        tracks.forEach((track) => {
            const duration = track.history.length / 30; // Assuming 30 FPS

            newMeasurements.push({
                id: track.id,
                elementName: `${track.class} - ${track.id.substr(-6)}`,
                startTime: (track.firstSeen - Date.now()) / 1000 + videoRef.current.currentTime,
                duration: duration,
                category: 'Value-added',
                description: `Detected ${track.class} with ${Math.round(track.score * 100)}% confidence`,
                therblig: 'Transport',
                color: track.color
            });
        });

        if (onUpdateMeasurements) {
            onUpdateMeasurements([...measurements, ...newMeasurements]);
        }

        await showAlert('Success', `✅ Exported ${newMeasurements.length} object tracks to measurements!`);
    };

    const handleExportData = () => {
        const data = {
            timestamp: new Date().toISOString(),
            videoSrc: videoSrc,
            tracks: Array.from(tracks.values()).map(track => ({
                id: track.id,
                class: track.class,
                score: track.score,
                age: track.age,
                historyLength: track.history.length,
                firstSeen: track.firstSeen
            })),
            stats: stats
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `object_tracking_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleClassFilter = (className) => {
        setFilterClasses(prev => {
            if (prev.includes(className)) {
                return prev.filter(c => c !== className);
            } else {
                return [...prev, className];
            }
        });
    };

    useEffect(() => {
        if (videoSrc && videoRef.current) {
            videoRef.current.src = videoSrc;
        }
    }, [videoSrc]);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 320px',
            gridTemplateRows: 'auto 1fr',
            gap: '15px',
            height: '100%',
            padding: '15px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(45deg, #ff6b6b, #feca57)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📦 Object Detection & Tracking
                    </h1>
                    <p style={{ margin: 0, color: '#888', fontSize: '0.9rem' }}>Real-time tool and material tracking</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        background: status === 'Ready' ? 'rgba(0,255,0,0.1)' : 'rgba(255,165,0,0.1)',
                        border: `1px solid ${status === 'Ready' ? '#0f0' : '#ffa500'}`,
                        color: status === 'Ready' ? '#0f0' : '#ffa500',
                        fontSize: '0.85rem'
                    }}>
                        {status}
                    </div>
                    {isDetecting && (
                        <div style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            background: 'rgba(0,210,255,0.1)',
                            border: '1px solid #00d2ff',
                            color: '#00d2ff',
                            fontSize: '0.85rem'
                        }}>
                            {fps} FPS
                        </div>
                    )}
                    <button
                        onClick={() => setShowHelp(true)}
                        style={{
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid #666',
                            background: 'rgba(255,255,255,0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                    >
                        <HelpCircle size={18} /> Help
                    </button>
                    <button
                        onClick={handleStartDetection}
                        disabled={status !== 'Ready'}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            background: isDetecting ? '#ff4b4b' : '#00d2ff',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: status === 'Ready' ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: status === 'Ready' ? 1 : 0.5
                        }}
                    >
                        {isDetecting ? <Pause size={18} /> : <Play size={18} />}
                        {isDetecting ? 'Stop Detection' : 'Start Detection'}
                    </button>
                </div>
            </div>

            {/* Video Canvas */}
            <div style={{
                position: 'relative',
                background: '#000',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '400px'
            }}>
                {videoSrc ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.7 }}
                            autoPlay
                            loop
                            muted
                        />
                        <canvas
                            ref={canvasRef}
                            width={1280}
                            height={720}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none'
                            }}
                        />
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: isDetecting ? '#00ff00' : '#666',
                            border: `1px solid ${isDetecting ? '#00ff00' : '#666'}`
                        }}>
                            {isDetecting ? 'DETECTING' : 'IDLE'}
                        </div>
                        <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            left: '20px',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => setShowTrails(!showTrails)}
                                style={{
                                    padding: '8px 12px',
                                    background: showTrails ? '#00d2ff' : '#333',
                                    border: '1px solid #555',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {showTrails ? <Eye size={16} /> : <EyeOff size={16} />}
                                Trails
                            </button>
                            <button
                                onClick={() => setShowFilterDialog(true)}
                                style={{
                                    padding: '8px 12px',
                                    background: filterClasses.length > 0 ? '#feca57' : '#333',
                                    border: '1px solid #555',
                                    borderRadius: '6px',
                                    color: filterClasses.length > 0 ? '#000' : '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '0.85rem',
                                    fontWeight: filterClasses.length > 0 ? 'bold' : 'normal'
                                }}
                            >
                                <Filter size={16} />
                                Filter {filterClasses.length > 0 && `(${filterClasses.length})`}
                            </button>
                        </div>
                    </>
                ) : (
                    <div style={{ color: '#555' }}>No Video Source</div>
                )}
            </div>

            {/* Right Panel: Stats & Controls */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
                overflowY: 'auto',
                gridRow: '2'
            }}>
                {/* Statistics */}
                {showStats && stats && (
                    <div style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '20px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#00d2ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} /> Statistics
                        </h3>
                        <div style={{ fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>
                                <div style={{ color: '#888', fontSize: '0.75rem' }}>Total Objects</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{stats.totalObjects}</div>
                            </div>
                            <div>
                                <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '5px' }}>By Class</div>
                                {Object.entries(stats.byClass).map(([className, count]) => (
                                    <div key={className} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                        <span>{className}</span>
                                        <span style={{ fontWeight: 'bold' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div style={{ color: '#888', fontSize: '0.75rem' }}>Avg Confidence</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f0' }}>
                                    {Math.round(stats.avgConfidence * 100)}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tracked Objects List */}
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '20px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    flex: 1,
                    minHeight: '200px',
                    maxHeight: '400px',
                    overflowY: 'auto'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#feca57' }}>
                        Tracked Objects ({tracks.size})
                    </h3>
                    {tracks.size === 0 ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                            No objects detected yet
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {Array.from(tracks.values()).map((track) => (
                                <div
                                    key={track.id}
                                    style={{
                                        background: '#1a1a1a',
                                        padding: '10px',
                                        borderRadius: '8px',
                                        borderLeft: `4px solid ${track.color}`,
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold', marginBottom: '3px' }}>
                                        {track.class}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.75rem' }}>
                                        ID: {track.id.substr(-8)} | Age: {track.age} frames
                                    </div>
                                    <div style={{ color: '#888', fontSize: '0.75rem' }}>
                                        Confidence: {Math.round(track.score * 100)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '12px',
                            background: '#ff4b4b',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <RefreshCw size={18} /> Reset
                    </button>
                    <button
                        onClick={handleExportToMeasurements}
                        disabled={tracks.size === 0}
                        style={{
                            padding: '12px',
                            background: tracks.size > 0 ? '#4caf50' : '#333',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontWeight: 'bold',
                            cursor: tracks.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: tracks.size > 0 ? 1 : 0.5
                        }}
                    >
                        <Download size={18} /> Export to Measurements
                    </button>
                    <button
                        onClick={handleExportData}
                        disabled={tracks.size === 0}
                        style={{
                            padding: '12px',
                            background: tracks.size > 0 ? '#00d2ff' : '#333',
                            border: 'none',
                            borderRadius: '8px',
                            color: tracks.size > 0 ? '#000' : '#666',
                            fontWeight: 'bold',
                            cursor: tracks.size > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            opacity: tracks.size > 0 ? 1 : 0.5
                        }}
                    >
                        <Download size={18} /> Export JSON
                    </button>
                </div>
            </div>

            {/* Filter Dialog */}
            {showFilterDialog && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999
                }} onClick={() => setShowFilterDialog(false)}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        padding: '30px',
                        maxWidth: '600px',
                        maxHeight: '80vh',
                        overflowY: 'auto',
                        color: '#fff'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px 0', color: '#feca57' }}>Filter Object Classes</h2>
                        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '20px' }}>
                            Select which object classes to detect. Leave empty to detect all.
                        </p>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '10px',
                            marginBottom: '20px'
                        }}>
                            {getDetectableClasses().map(className => (
                                <button
                                    key={className}
                                    onClick={() => toggleClassFilter(className)}
                                    style={{
                                        padding: '8px 12px',
                                        background: filterClasses.includes(className) ? '#00d2ff' : '#333',
                                        border: filterClasses.includes(className) ? '2px solid #fff' : '1px solid #555',
                                        borderRadius: '6px',
                                        color: filterClasses.includes(className) ? '#000' : '#fff',
                                        cursor: 'pointer',
                                        fontSize: '0.8rem',
                                        fontWeight: filterClasses.includes(className) ? 'bold' : 'normal'
                                    }}
                                >
                                    {className}
                                </button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setFilterClasses([])}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#ff4b4b',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Clear All
                            </button>
                            <button
                                onClick={() => setShowFilterDialog(false)}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    background: '#00d2ff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help Modal */}
            {showHelp && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 9999,
                    padding: '20px'
                }} onClick={() => setShowHelp(false)}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: '600px',
                        width: '100%',
                        maxHeight: '85vh',
                        color: '#fff',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        {/* Sticky Header */}
                        <div style={{ padding: '20px 30px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ margin: 0, color: '#00d2ff', fontSize: '1.25rem' }}>📦 Object Detection & Tracking - Help</h2>
                            <button
                                onClick={() => setShowHelp(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #333',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    color: '#999',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                            <h3 style={{ color: '#feca57', marginTop: 0 }}>📌 Fungsi</h3>
                            <p style={{ lineHeight: '1.6', color: '#ccc' }}>
                                Deteksi dan tracking otomatis untuk tools, parts, dan materials dalam video motion study menggunakan AI.
                            </p>

                            <h3 style={{ color: '#feca57', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                            <ol style={{ lineHeight: '1.8', color: '#ccc' }}>
                                <li>Load video yang berisi tools/objects</li>
                                <li>Klik <strong>Start Detection</strong></li>
                                <li>Objek akan terdeteksi dengan bounding box berwarna</li>
                                <li>Setiap objek mendapat unique ID dan tracking</li>
                                <li>Monitor statistics di panel kanan</li>
                                <li>Export ke measurements jika perlu</li>
                            </ol>

                            <h3 style={{ color: '#feca57', marginTop: '20px' }}>🎯 Fitur</h3>
                            <ul style={{ lineHeight: '1.8', color: '#ccc' }}>
                                <li><strong>Real-time Detection</strong>: Deteksi 80 jenis objek (COCO dataset)</li>
                                <li><strong>Object Tracking</strong>: Persistent ID across frames</li>
                                <li><strong>Trails</strong>: Visualisasi movement path</li>
                                <li><strong>Filter</strong>: Pilih class yang ingin dideteksi</li>
                                <li><strong>Statistics</strong>: Count, confidence, class distribution</li>
                                <li><strong>Export</strong>: Ke measurements atau JSON</li>
                            </ul>

                            <h3 style={{ color: '#feca57', marginTop: '20px' }}>💡 Tips</h3>
                            <ul style={{ lineHeight: '1.8', color: '#ccc' }}>
                                <li>Gunakan Filter untuk fokus pada objek tertentu</li>
                                <li>Enable Trails untuk melihat movement patterns</li>
                                <li>Performance: ~10-15 FPS (normal untuk object detection)</li>
                                <li>Deteksi lebih akurat dengan pencahayaan baik</li>
                            </ul>
                        </div>

                        {/* Footer Action */}
                        <div style={{ padding: '20px 30px', borderTop: '1px solid #333' }}>
                            <button
                                onClick={() => setShowHelp(false)}
                                style={{
                                    padding: '12px 24px',
                                    background: '#00d2ff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#000',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    width: '100%',
                                    fontSize: '1rem'
                                }}
                            >
                                Tutup Panduan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ObjectTracking;
