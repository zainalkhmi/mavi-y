import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { loadImageModelFromURL, predict } from '../utils/teachableMachine';
import { Camera, Upload, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const QualityControlAI = ({ videoRef: propVideoRef, onClose }) => {
    const { showAlert } = useDialog();
    // Fallback to global video element if prop is missing
    const videoRef = propVideoRef || { current: window.__motionVideoElement };

    const [modelUrl, setModelUrl] = useState('');
    const [isModelLoading, setIsModelLoading] = useState(false);
    const [model, setModel] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [prediction, setPrediction] = useState(null); // { bestClass, accuracy, prediction[] }

    const animationFrameRef = useRef(null);

    // Analyze Loop
    const analyzeLoop = async () => {
        if (!isAnalyzing || !model || !videoRef.current) return;

        try {
            const result = await predict(model, videoRef.current);
            setPrediction(result);
        } catch (e) {
            console.error("QC Prediction Error:", e);
        }

        animationFrameRef.current = requestAnimationFrame(analyzeLoop);
    };

    useEffect(() => {
        if (isAnalyzing) {
            analyzeLoop();
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [isAnalyzing, model]);

    const handleLoadModel = async () => {
        if (!modelUrl) return;
        setIsModelLoading(true);
        try {
            const loadedModel = await loadImageModelFromURL(modelUrl);
            setModel(loadedModel);
            // Auto start analysis
            setIsAnalyzing(true);
        } catch (error) {
            await showAlert('Error', 'Failed to load model: ' + error.message);
        } finally {
            setIsModelLoading(false);
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: '350px',
            backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', zIndex: 100
        }}>
            <div style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#252526' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Camera size={20} color="#ffaa00" />
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1rem' }}>Visual QC Inspector</h3>
                </div>
                <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>

            <div style={{ padding: '15px', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>

                {/* Model Loader */}
                <div style={{ backgroundColor: '#2d2d2d', padding: '15px', borderRadius: '6px' }}>
                    <label style={{ display: 'block', color: '#ccc', marginBottom: '8px', fontSize: '0.9rem' }}>Teachable Machine Model URL</label>
                    <input
                        type="text"
                        value={modelUrl}
                        onChange={(e) => setModelUrl(e.target.value)}
                        placeholder="https://teachablemachine.withgoogle.com/..."
                        style={{ width: '100%', padding: '8px', marginBottom: '10px', backgroundColor: '#333', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
                    />
                    <button
                        onClick={handleLoadModel}
                        disabled={isModelLoading || !modelUrl}
                        style={{
                            width: '100%', padding: '8px',
                            backgroundColor: model ? '#107c41' : '#0078d4',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {isModelLoading ? 'Loading...' : model ? 'Model Loaded' : 'Load Model'}
                        {!isModelLoading && <Upload size={16} />}
                    </button>
                    <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#888', fontStyle: 'italic' }}>
                        * Train an "Image Project" on <a href="https://teachablemachine.withgoogle.com/train/pose" target="_blank" rel="noreferrer" style={{ color: '#ffaa00' }}>Teachable Machine</a>, upload it, and paste the URL here.
                    </div>
                </div>

                {/* Status Indicator */}
                {model && (
                    <div style={{
                        flex: 1,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: prediction?.bestClass === 'OK' || prediction?.bestClass === 'Pass' || prediction?.bestClass === 'Good' ? 'rgba(0,255,0,0.1)' : 'rgba(255,0,0,0.1)',
                        border: '1px solid #444', borderRadius: '6px'
                    }}>
                        {prediction ? (
                            <>
                                <div style={{ fontSize: '4rem', marginBottom: '10px' }}>
                                    {(prediction.bestClass === 'OK' || prediction.bestClass === 'Pass' || prediction.bestClass === 'Good')
                                        ? <CheckCircle size={64} color="#00ff00" />
                                        : <XCircle size={64} color="#ff0000" />
                                    }
                                </div>
                                <h2 style={{ color: '#fff', margin: '0 0 5px 0' }}>{prediction.bestClass.toUpperCase()}</h2>
                                <div style={{ color: '#888', fontSize: '1rem' }}>Confidence: {Math.round(prediction.accuracy * 100)}%</div>

                                {/* Full Breakdown */}
                                <div style={{ width: '100%', marginTop: '20px', padding: '0 10px' }}>
                                    {prediction.prediction.map((p, i) => (
                                        <div key={i} style={{ marginBottom: '5px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#ccc', marginBottom: '2px' }}>
                                                <span>{p.className}</span>
                                                <span>{Math.round(p.probability * 100)}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '4px', backgroundColor: '#444', borderRadius: '2px' }}>
                                                <div style={{
                                                    width: `${p.probability * 100}%`, height: '100%',
                                                    backgroundColor: i === 0 ? '#0078d4' : '#666', borderRadius: '2px'
                                                }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div style={{ color: '#888' }}>Waiting for video feed...</div>
                        )}
                    </div>
                )}

                {/* Control */}
                {model && (
                    <button
                        onClick={() => setIsAnalyzing(!isAnalyzing)}
                        style={{
                            padding: '12px', backgroundColor: isAnalyzing ? '#c50f1f' : '#107c41',
                            color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        {isAnalyzing ? 'PAUSE INSPECTION' : 'RESUME INSPECTION'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default QualityControlAI;
