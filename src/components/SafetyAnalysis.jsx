import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeObjectDetector, detectObjects, trackObjects, drawObjectDetections, disposeObjectDetector } from '../utils/objectDetector';
import { generateManualContent } from '../utils/aiGenerator';
import { Shield, Activity, Eye, AlertTriangle, CheckCircle } from 'lucide-react';

function SafetyAnalysis({ videoRef: propVideoRef, onClose, onUpdate }) {
    // Use prop ref or fallback to global video element
    const videoRef = propVideoRef || { current: window.__motionVideoElement };

    // States
    const [isDetectorReady, setIsDetectorReady] = useState(false);
    const [status, setStatus] = useState('Initializing Object Detector...');
    const [tracks, setTracks] = useState(new Map());
    const [showSpaghetti, setShowSpaghetti] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [ppeStatus, setPpeStatus] = useState(null); // null, 'scanning', 'safe', 'unsafe'
    const [ppeReport, setPpeReport] = useState(null);

    // Refs
    const animationFrameRef = useRef(null);
    const canvasRef = useRef(null);
    const previousTracksRef = useRef(new Map());
    const detectorRef = useRef(null);


    // Initialize detector
    useEffect(() => {
        // Initialize detector
        initializeObjectDetector().then(net => {
            detectorRef.current = net;
            setIsDetectorReady(true);
            setStatus('Ready');
        }).catch(error => {
            console.error("Failed to load object detector:", error);
            setStatus('Error: Model Failed');
        });

        return () => {
            // Cleanup
            disposeObjectDetector();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    // Analysis Loop
    const analyzeFrame = useCallback(async () => {
        if (!isAnalyzing || !detectorRef.current || !videoRef?.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Match canvas to video size
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;

        // Detect
        const detections = await detectObjects(video);

        // Track
        const currentTracks = trackObjects(detections, previousTracksRef.current);
        previousTracksRef.current = currentTracks;
        setTracks(new Map(currentTracks)); // Trigger re-render or just use refs for efficiency? 

        // For drawing, we do it immediately here to sync with frame
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawObjectDetections(ctx, currentTracks, 1, 1, showSpaghetti);

        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }, [isAnalyzing, showSpaghetti, videoRef]);

    useEffect(() => {
        if (isAnalyzing) {
            analyzeFrame();
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    }, [isAnalyzing, analyzeFrame]);

    const handlePPEScan = async () => {
        if (!videoRef.current) return;
        setPpeStatus('scanning');
        setPpeReport(null);

        try {
            // Capture frame
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Send to Gemini Vision
            // We reuse generateManualContent but we interpret the result as PPE report 
            const result = await generateManualContent(
                "PPE Safety Inspection",
                undefined,
                null,
                dataUrl,
                "English" // Or user language
            );

            // Result has { description, keyPoints, safety }
            // We map this to our report
            setPpeReport({
                summary: result.description,
                violations: result.safety,
                passed: !result.safety.toLowerCase().includes('missing') && !result.safety.toLowerCase().includes('warning')
            });

            setPpeStatus(!result.safety.toLowerCase().includes('missing') ? 'safe' : 'unsafe');

        } catch (error) {
            console.error("PPE Scan failed:", error);
            setPpeStatus('error');
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '350px',
            backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', zIndex: 100
        }}>
            {/* Overlay Canvas for Spaghetti/Boxes */}
            <canvas
                ref={canvasRef}
                style={{
                    position: 'fixed',
                    top: '110px', left: '20px', // Adjusted to likely video position
                    width: 'calc(100% - 400px)', height: 'calc(100% - 150px)',
                    pointerEvents: 'none',
                    zIndex: 90,
                    opacity: isAnalyzing ? 1 : 0
                }}
            />

            <div style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252526' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={20} color="#00d2ff" />
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>Safety & Motion AI</h3>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Spaghetti Toggle */}
                <div style={{ padding: '10px', backgroundColor: '#2d2d2d', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{ color: '#ccc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Activity size={16} /> Spaghetti Chart
                        </span>
                        <label className="switch">
                            <input type="checkbox" checked={showSpaghetti} onChange={(e) => setShowSpaghetti(e.target.checked)} />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                {/* PPE Scan */}
                <div style={{ padding: '15px', backgroundColor: '#2d2d2d', borderRadius: '6px', border: '1px solid #444' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Eye size={16} /> PPE Compliance Scan
                    </h4>

                    <button
                        onClick={handlePPEScan}
                        disabled={!videoRef.current || ppeStatus === 'scanning'}
                        style={{
                            width: '100%', padding: '8px',
                            backgroundColor: ppeStatus === 'scanning' ? '#444' : '#0078d4',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {ppeStatus === 'scanning' ? 'Analyzing...' : '📸 Scan Now'}
                    </button>

                    {ppeReport && (
                        (() => {
                            const isPassed = ppeReport.passed;
                            const bgColor = isPassed ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
                            const mainColor = isPassed ? '#00b341' : '#ff4444';

                            return (
                                <div style={{
                                    marginTop: '15px',
                                    padding: '10px',
                                    backgroundColor: bgColor,
                                    borderRadius: '4px',
                                    border: `1px solid ${mainColor}`
                                }}>
                                    <div style={{ fontWeight: 'bold', color: mainColor, marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        {isPassed ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                        {isPassed ? 'SAFE / COMPLIANT' : 'SAFETY VIOLATION DETECTED'}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#ccc', marginBottom: '8px' }}>{ppeReport.summary}</div>
                                    <div style={{ fontSize: '0.8rem', color: '#ff8888' }}>
                                        <strong>Issues:</strong> {ppeReport.violations}
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>

                {/* Object Tracking Stats */}
                <div style={{ flex: 1, backgroundColor: '#2d2d2d', borderRadius: '6px', padding: '10px' }}>
                    <h4 style={{ margin: '0 0 10px 0', color: '#ccc', fontSize: '0.9rem' }}>Detected Objects</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                        {Array.from(tracks.values()).map(track => {
                            const borderColor = track.color;
                            return (
                                <span key={track.id} style={{
                                    padding: '4px 8px', backgroundColor: '#333', borderRadius: '12px', fontSize: '0.75rem',
                                    border: `1px solid ${borderColor}`, color: '#fff'
                                }}>
                                    {track.class}
                                </span>
                            );
                        })}
                        {tracks.size === 0 && <span style={{ color: '#666', fontSize: '0.8rem' }}>No objects detected...</span>}
                    </div>
                </div>

                {/* Main Control */}
                <button
                    onClick={() => setIsAnalyzing(!isAnalyzing)}
                    disabled={status !== 'Ready'}
                    style={{
                        padding: '12px', backgroundColor: isAnalyzing ? '#c50f1f' : '#107c41',
                        color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}
                >
                    {isAnalyzing ? 'STOP TRACKING' : 'START TRACKING'}
                </button>
                <div style={{ textAlign: 'center', color: '#666', fontSize: '0.8rem' }}>{status}</div>
            </div>

            {/* CSS for Toggle Switch */}
            <style>{`
                .switch { position: relative; display: inline-block; width: 40px; height: 20px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: #00d2ff; }
                input:checked + .slider:before { transform: translateX(20px); }
            `}</style>
        </div>
    );
}

export default SafetyAnalysis;
