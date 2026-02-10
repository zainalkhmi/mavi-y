import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializePoseDetector, detectPose, disposeDetector } from '../utils/poseDetector';
import AngleCalculator from '../utils/angleCalculator';
import RULACalculator from '../utils/rulaCalculator';
import REBACalculator from '../utils/rebaCalculator';


function ErgonomicAnalysis({ videoRef, onClose, onUpdate }) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [status, setStatus] = useState('Initializing...');
    const [pose, setPose] = useState(null);
    const [scores, setScores] = useState(null);
    const [analysisMode, setAnalysisMode] = useState('RULA'); // 'RULA' or 'REBA'
    const [viewMode, setViewMode] = useState('2D'); // '2D' or '3D'

    // Utilities refs
    const detectorRef = useRef(null);
    const angleCalculatorRef = useRef(new AngleCalculator());
    const rulaCalculatorRef = useRef(new RULACalculator());
    const rebaCalculatorRef = useRef(new REBACalculator());
    const animationFrameRef = useRef(null);

    // Initialize detector
    useEffect(() => {
        const initDetector = async () => {
            try {
                const detector = await initializePoseDetector();
                detectorRef.current = detector;
                setStatus('Ready');
            } catch (error) {
                console.error('Failed to initialize pose detector:', error);
                setStatus('Failed to load model');
            }
        };

        initDetector();

        return () => {
            disposeDetector();
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    // Analysis loop
    const analyzeFrame = useCallback(async () => {
        if (!videoRef.current || !detectorRef.current || !isAnalyzing) return;

        const video = videoRef.current;
        if (video.paused || video.ended) {
            animationFrameRef.current = requestAnimationFrame(analyzeFrame);
            return;
        }

        // Detect pose
        const poses = await detectPose(video);

        if (poses && poses.length > 0) {
            const detectedPose = poses[0];
            setPose(detectedPose);

            // Calculate angles
            const keypoints = detectedPose.keypoints;
            const angles = angleCalculatorRef.current.calculateAllAngles(keypoints);

            // Calculate scores
            let result;
            if (analysisMode === 'RULA') {
                result = rulaCalculatorRef.current.calculate(angles);
            } else {
                result = rebaCalculatorRef.current.calculate(angles);
            }

            setScores(result);
        }

        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }, [isAnalyzing, analysisMode, videoRef]);

    // Start/Stop analysis
    useEffect(() => {
        if (isAnalyzing) {
            analyzeFrame();
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [isAnalyzing, analyzeFrame]);

    // Expose ergonomic data to Mavi AI
    useEffect(() => {
        if (scores) {
            window.__maviErgonomics = {
                mode: analysisMode,
                scores: scores.scores,
                finalScore: scores.finalScore,
                riskLevel: scores.riskLevel,
                recommendation: scores.recommendation
            };
        }
        return () => {
            delete window.__maviErgonomics;
        };
    }, [scores, analysisMode]);

    // Update parent with analysis data
    useEffect(() => {
        if (onUpdate) {
            onUpdate({
                pose,
                scores: scores ? scores.scores : {},
                isAnalyzing,
                viewMode
            });
        }
    }, [pose, scores, isAnalyzing, viewMode, onUpdate]);

    const toggleAnalysis = () => {
        setIsAnalyzing(!isAnalyzing);
    };

    const getRiskColor = (level) => {
        if (level.includes('High')) return '#ff0000';
        if (level.includes('Medium')) return '#ff9900';
        if (level.includes('Low')) return '#ffff00';
        return '#00ff00';
    };

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            width: '350px',
            backgroundColor: '#1e1e1e',
            borderLeft: '1px solid #333',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 100
        }}>
            {/* Header */}
            <div style={{
                padding: '15px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#252526'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🧘‍♂️</span>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>Ergonomic Analysis</h3>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#888',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}
                >
                    ×
                </button>
            </div>

            {/* Controls */}
            <div style={{ padding: '15px', borderBottom: '1px solid #333' }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <button
                        onClick={() => setAnalysisMode('RULA')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: analysisMode === 'RULA' ? '#0078d4' : '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        RULA
                    </button>
                    <button
                        onClick={() => setAnalysisMode('REBA')}
                        style={{
                            flex: 1,
                            padding: '8px',
                            backgroundColor: analysisMode === 'REBA' ? '#0078d4' : '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        REBA
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#888' }}>Visualization Mode</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={() => setViewMode('2D')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: viewMode === '2D' ? '#0078d4' : '#333',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            2D Overlay
                        </button>
                        <button
                            onClick={() => setViewMode('3D')}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: viewMode === '3D' ? '#8b5cf6' : '#333',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            3D Visual
                        </button>
                    </div>
                </div>

                <button
                    onClick={toggleAnalysis}
                    disabled={status !== 'Ready'}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: isAnalyzing ? '#c50f1f' : '#0a5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: status !== 'Ready' ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    {status !== 'Ready' ? (
                        <span>⏳ {status}</span>
                    ) : isAnalyzing ? (
                        <>⏹ Stop Analysis</>
                    ) : (
                        <>▶ Start Analysis</>
                    )}
                </button>
            </div>

            {/* Results */}
            <div style={{ flex: 1, overflow: 'auto', padding: '15px' }}>
                {scores ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {/* Final Score Card */}
                        <div style={{
                            backgroundColor: '#2d2d2d',
                            padding: '15px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            border: `2px solid ${getRiskColor(scores.riskLevel)}`
                        }}>
                            <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '5px' }}>
                                {analysisMode} Score
                            </div>
                            <div style={{
                                fontSize: '3rem',
                                fontWeight: 'bold',
                                color: getRiskColor(scores.riskLevel),
                                lineHeight: 1
                            }}>
                                {scores.finalScore}
                            </div>
                            <div style={{
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                color: 'white',
                                marginTop: '5px'
                            }}>
                                {scores.riskLevel}
                            </div>
                        </div>

                        {/* Recommendation */}
                        <div style={{
                            backgroundColor: '#252526',
                            padding: '12px',
                            borderRadius: '6px',
                            borderLeft: '4px solid #0078d4'
                        }}>
                            <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Recommendation</div>
                            <div style={{ fontSize: '0.9rem', color: 'white' }}>
                                {scores.recommendation}
                            </div>
                        </div>

                        {/* Breakdown */}
                        <div>
                            <h4 style={{ color: '#ccc', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Score Breakdown</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {Object.entries(scores.scores).map(([part, score]) => (
                                    <div key={part} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        backgroundColor: '#333',
                                        padding: '8px 12px',
                                        borderRadius: '4px'
                                    }}>
                                        <span style={{ color: '#ccc', textTransform: 'capitalize' }}>
                                            {part.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: score > 2 ? '#ff9900' : '#0a5'
                                        }}>
                                            {score}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: '#666',
                        textAlign: 'center',
                        gap: '10px'
                    }}>
                        <span style={{ fontSize: '2rem' }}>🧘‍♂️</span>
                        <div>
                            Start analysis to see<br />ergonomic risk scores
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ErgonomicAnalysis;
