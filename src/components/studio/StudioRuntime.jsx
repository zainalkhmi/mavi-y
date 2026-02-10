import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
// Pastikan file InferenceEngine.js menggunakan: export const inferenceEngine = ...
import { inferenceEngine } from '../../utils/studio/InferenceEngine';
import { initializePoseDetector as loadPoseDetector, detectPose as estimatePose } from '../../utils/poseDetector';

const StudioRuntime = ({ videoRef, isPlaying, currentTime }) => {
    const [models, setModels] = useState([]);
    const [selectedModelId, setSelectedModelId] = useState('');
    const [logs, setLogs] = useState([]);
    const [tracks, setTracks] = useState([]);
    const [isEngineReady, setIsEngineReady] = useState(false);

    const canvasRef = useRef(null);
    const requestRef = useRef();

    useEffect(() => {
        // Load models dari localStorage
        const saved = localStorage.getItem('motionModels');
        if (saved) {
            setModels(JSON.parse(saved));
        }

        // Initialize AI Detectors
        const initAI = async () => {
            try {
                await loadPoseDetector();
                setIsEngineReady(true);
            } catch (err) {
                console.error("Gagal inisialisasi AI:", err);
            }
        };
        initAI();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const handleModelSelect = (id) => {
        setSelectedModelId(id);
        const model = models.find(m => m.id === id);
        if (model && inferenceEngine) {
            inferenceEngine.loadModel(model);
        }
    };

    const detect = async () => {
        // Validasi kesiapan video dan engine
        if (!videoRef.current || videoRef.current.paused || videoRef.current.readyState !== 4 || !inferenceEngine) return;

        const video = videoRef.current;

        // Run Detection
        const poses = await estimatePose(video);
        const objects = []; 

        // Process via Inference Engine
        const result = inferenceEngine.processFrame({
            poses,
            objects,
            timestamp: video.currentTime * 1000
        });

        // Update UI States
        if (result) {
            setLogs(result.logs || []);
            setTracks(result.tracks || []);
            drawOverlay(poses, result.tracks || []);
        }

        if (!video.paused) {
            requestRef.current = requestAnimationFrame(detect);
        }
    };

    const drawOverlay = (poses, tracks) => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx || !videoRef.current) return;

        // Sync canvas size dengan video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (poses && poses.length > 0 && tracks && tracks.length > 0) {
            const pose = poses[0];
            const track = tracks[0]; 

            const keypoints = pose.keypoints;
            const x = Math.min(...keypoints.map(k => k.x));
            const y = Math.min(...keypoints.map(k => k.y));
            
            ctx.fillStyle = '#00ff00';
            ctx.font = '24px Arial';
            ctx.fillText(`${track.state} (${track.duration || ''})`, x, y - 10);
            
            // Opsional: Gambar titik sendi
            keypoints.forEach(kp => {
                if (kp.score > 0.5) {
                    ctx.beginPath();
                    ctx.arc(kp.x, kp.y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }
    };

    useEffect(() => {
        if (isPlaying && selectedModelId && isEngineReady) {
            detect();
        } else {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        }
    }, [isPlaying, selectedModelId, isEngineReady]);

    return (
        <div style={{
            position: 'absolute',
            top: 20,
            right: 20,
            width: '350px',
            backgroundColor: 'rgba(31, 41, 55, 0.95)',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '16px',
            color: 'white',
            zIndex: 100,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Activity color="#60a5fa" />
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Runtime Engine</h3>
            </div>

            <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>
                    Active Model
                </label>
                <select
                    value={selectedModelId}
                    onChange={(e) => handleModelSelect(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: '#111827',
                        border: '1px solid #4b5563',
                        color: 'white',
                        borderRadius: '6px'
                    }}
                >
                    <option value="">Select a model...</option>
                    {models.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>

            <div style={{ marginBottom: '16px', borderTop: '1px solid #4b5563', paddingTop: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Active Operators</div>
                {tracks.length === 0 ? (
                    <div style={{ color: '#6b7280', fontSize: '0.85rem' }}>Waiting for detection...</div>
                ) : (
                    tracks.map(t => (
                        <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between',
                            background: '#064e3b', padding: '8px', borderRadius: '4px',
                            marginBottom: '4px'
                        }}>
                            <span>OP-{t.id}</span>
                            <span style={{ fontWeight: 'bold' }}>{t.state}</span>
                            <span>{t.duration}</span>
                        </div>
                    ))
                )}
            </div>

            <div style={{ flex: 1, minHeight: '150px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px' }}>Event Log</div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    background: '#111827',
                    borderRadius: '6px',
                    padding: '8px',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace'
                }}>
                    {logs.map((log, index) => (
                        <div key={index} style={{ marginBottom: '4px', borderBottom: '1px solid #374151', paddingBottom: '2px' }}>
                            <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span>{' '}
                            <span style={{ color: log.type === 'Transition' ? '#34d399' : '#fff' }}>
                                {log.message}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && <div style={{ color: '#6b7280' }}>System ready.</div>}
                </div>
            </div>

            {/* Canvas sekarang "block" agar visualisasi AI terlihat di layar */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 90,
                    width: '100%',
                    height: '100%',
                    display: 'block' 
                }}
            />
        </div>
    );
};

export default StudioRuntime;
