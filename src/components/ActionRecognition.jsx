import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, RefreshCw, AlertCircle } from 'lucide-react';
import { initializePoseDetector, detectPose, drawPoseSkeleton, disposeDetector } from '../utils/poseDetector';
import { classifyAction, smoothActionSequence, actionsToMeasurements, THERBLIG_ACTIONS } from '../utils/actionClassifier';
import { loadModelFromURL, loadModelFromFiles, predict } from '../utils/teachableMachine';
import HelpButton from './HelpButton';
import { useDialog } from '../contexts/DialogContext';

function ActionRecognition({ videoSrc, onActionsDetected }) {
    const { showAlert } = useDialog();
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [detectedActions, setDetectedActions] = useState([]);
    const [currentAction, setCurrentAction] = useState(null);
    const [showPoseSkeleton, setShowPoseSkeleton] = useState(true);
    const [error, setError] = useState(null);

    // Teachable Machine State
    const [useTeachableMachine, setUseTeachableMachine] = useState(false);
    const [tmModel, setTmModel] = useState(null);
    const [tmModelURL, setTmModelURL] = useState('');
    const [tmLoading, setTmLoading] = useState(false);
    const [tmModelType, setTmModelType] = useState('online');

    const modelFileRef = useRef(null);
    const weightsFileRef = useRef(null);
    const metadataFileRef = useRef(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationRef = useRef(null);
    const actionSequenceRef = useRef([]);

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            disposeDetector();
        };
    }, []);

    const processVideo = async () => {
        if (!videoRef.current) return;

        setIsProcessing(true);
        setError(null);
        setProgress(0);
        actionSequenceRef.current = [];

        try {
            if (useTeachableMachine && !tmModel) {
                throw new Error("Teachable Machine Model not loaded!");
            }

            // Initialize detector (only if not using TM, TM has its own internal stuff but we might want skeleton)
            // Actually TM Pose uses MoveNet/PoseNet internally. logic in teachableMachine.js handles it.
            // But if we want to draw skeleton, we might need our own detector if TM doesn't return one easily usable by our draw function.
            // However, our `predict` util returns `pose` object which is compatible?
            // Let's assume we still use our detector for skeleton if not using TM, or rely on TM's return.
            // For simplicity, if using TM, we rely on TM's prediction loop.

            if (!useTeachableMachine) {
                await initializePoseDetector();
            }

            const video = videoRef.current;
            const duration = video.duration;
            const fps = 30; // Assumption or read from file
            const totalFrames = Math.floor(duration * fps);

            let previousPose = null;
            let previousAction = 'Idle';
            let frameCount = 0;

            // Process video frame by frame
            const processFrame = async () => {
                if (frameCount >= totalFrames) {
                    finishProcessing();
                    return;
                }

                const currentTime = frameCount / fps;
                video.currentTime = currentTime;

                // Wait for video to seek
                await new Promise(resolve => {
                    video.onseeked = resolve;
                });

                let actionResult = null;
                let pose = null;

                if (useTeachableMachine && tmModel) {
                    const result = await predict(tmModel, video);

                    // Confidence Threshold (Default 0.6)
                    const TM_THRESHOLD = 0.6;

                    if (result && result.accuracy >= TM_THRESHOLD) {
                        pose = result.pose;

                        // Map TM class to code if it matches standard Therbligs
                        let mappedCode = 'TM';
                        const bestClassLower = result.bestClass.toLowerCase();

                        Object.entries(THERBLIG_ACTIONS).forEach(([key, value]) => {
                            if (bestClassLower.includes(key.toLowerCase()) || bestClassLower === value.code.toLowerCase()) {
                                mappedCode = value.code;
                            }
                        });

                        // Map TM class to Action Result format
                        actionResult = {
                            action: result.bestClass,
                            therblig: mappedCode,
                            confidence: result.accuracy,
                            color: mappedCode !== 'TM' ? THERBLIG_ACTIONS[Object.keys(THERBLIG_ACTIONS).find(k => THERBLIG_ACTIONS[k].code === mappedCode)].color : '#00d2ff'
                        };
                    } else {
                        // Fallback to Idle if low confidence
                        actionResult = {
                            action: 'Idle',
                            therblig: 'ID',
                            confidence: result ? result.accuracy : 0,
                            color: '#808080'
                        };
                    }
                } else {
                    // Standard Logic
                    const poses = await detectPose(video);
                    if (poses && poses.length > 0) {
                        pose = poses[0];
                        actionResult = classifyAction(pose, previousPose, previousAction);
                    }
                }

                if (actionResult && pose) {
                    actionSequenceRef.current.push({
                        frame: frameCount,
                        time: currentTime,
                        ...actionResult,
                        pose
                    });

                    setCurrentAction(actionResult);
                    previousPose = pose;
                    previousAction = actionResult.action;

                    // Draw skeleton
                    if (showPoseSkeleton && canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        // TM pose might need array wrapper
                        drawPoseSkeleton(ctx, [pose]);
                    }
                }

                frameCount++;
                setProgress((frameCount / totalFrames) * 100);

                // Process next frame
                setTimeout(processFrame, 0);
            };

            processFrame();

        } catch (err) {
            console.error('Error processing video:', err);
            setError(err.message);
            setIsProcessing(false);
        }
    };

    const finishProcessing = () => {
        // Smooth action sequence
        const smoothed = smoothActionSequence(actionSequenceRef.current, 5);
        setDetectedActions(smoothed);
        setIsProcessing(false);
        setProgress(100);
        console.log('✅ Action recognition complete:', smoothed);
    };

    const exportToMeasurements = async () => {
        if (detectedActions.length === 0) return;
        const measurements = actionsToMeasurements(detectedActions, 30);
        if (onActionsDetected) {
            onActionsDetected(measurements);
        }
        await showAlert('Success', `✅ ${measurements.length} actions exported to measurements!`);
    };

    const handleLoadTmModel = async () => {
        setTmLoading(true);
        try {
            let model;
            if (tmModelType === 'online') {
                if (!tmModelURL) {
                    await showAlert('Warning', "Please enter a Model URL");
                    setTmLoading(false);
                    return;
                }
                model = await loadModelFromURL(tmModelURL);
            } else {
                if (!modelFileRef.current || !weightsFileRef.current || !metadataFileRef.current) {
                    await showAlert('Warning', "Please upload all 3 files: model.json, metadata.json, weights.bin");
                    setTmLoading(false);
                    return;
                }
                model = await loadModelFromFiles(
                    modelFileRef.current,
                    weightsFileRef.current,
                    metadataFileRef.current
                );
            }

            setTmModel(model);
            await showAlert('Success', "Teachable Machine Model Loaded Successfully!");
        } catch (error) {
            console.error(error);
            await showAlert('Error', "Failed to load model: " + error.message);
        } finally {
            setTmLoading(false);
        }
    };

    const handleFileChange = (e, type) => {
        const file = e.target.files[0];
        if (type === 'model') modelFileRef.current = file;
        if (type === 'weights') weightsFileRef.current = file;
        if (type === 'metadata') metadataFileRef.current = file;
    };

    const resetDetection = () => {
        setDetectedActions([]);
        setCurrentAction(null);
        setProgress(0);
        actionSequenceRef.current = [];
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const helpContent = (
        <>
            <h3 style={{ color: '#ffd700', marginTop: '20px' }}>📌 Fungsi</h3>
            <p>Deteksi otomatis gerakan operator menggunakan AI dan klasifikasi ke dalam Therblig elements.</p>

            <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
            <ol>
                <li>Upload atau pilih video</li>
                <li>Klik <strong>Start Detection</strong></li>
                <li>Tunggu proses selesai (progress bar)</li>
                <li>Review detected actions</li>
                <li>Klik <strong>Export to Measurements</strong></li>
            </ol>

            <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🎯 Actions Detected</h3>
            <ul>
                <li><strong>Reach (R)</strong>: Gerakan tangan menuju objek</li>
                <li><strong>Grasp (G)</strong>: Menggenggam objek</li>
                <li><strong>Move (M)</strong>: Memindahkan objek</li>
                <li><strong>Position (P)</strong>: Memposisikan objek</li>
                <li><strong>Release (RL)</strong>: Melepas objek</li>
            </ul>
            <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🤖 Teachable Machine</h3>
            <p>Gunakan model kustom Anda sendiri untuk klasifikasi aksi.</p>
            <ul>
                <li>Klik tombol <strong>Use Teachable Machine</strong></li>
                <li>Pilih <strong>Online</strong> (URL) atau <strong>Offline</strong> (File Upload)</li>
                <li>Klik <strong>Load Model</strong> sebelum memulai deteksi</li>
                <li>Sistem akan menggunakan kelas dari model Anda sebagai nama aksi.</li>
            </ul>
        </>
    );

    return (
        <div style={{
            padding: '20px',
            backgroundColor: '#1e1e1e',
            minHeight: '100vh',
            color: '#fff'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#00d2ff' }}>🤖 Action Recognition</h2>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                        AI-powered automatic action detection and classification
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <HelpButton title="🤖 Action Recognition - Help" content={helpContent} />
                    {!isProcessing && detectedActions.length === 0 && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setUseTeachableMachine(!useTeachableMachine)}
                                style={{
                                    padding: '10px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    border: '1px solid #555',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                {useTeachableMachine ? 'Use Standard' : 'Use Teachable Machine'}
                            </button>
                            <button
                                onClick={processVideo}
                                disabled={!videoSrc || (useTeachableMachine && !tmModel)}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: (videoSrc && (!useTeachableMachine || tmModel)) ? '#00d2ff' : '#555',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (videoSrc && (!useTeachableMachine || tmModel)) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <Play size={18} /> Start Detection
                            </button>
                        </div>
                    )}
                    {detectedActions.length > 0 && (
                        <>
                            <button
                                onClick={exportToMeasurements}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#4caf50',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: 'bold'
                                }}
                            >
                                <Download size={18} /> Export to Measurements
                            </button>
                            <button
                                onClick={resetDetection}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#ff4b4b',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <RefreshCw size={18} /> Reset
                            </button>
                        </>
                    )}
                </div>
            </div>

            {useTeachableMachine && !isProcessing && detectedActions.length === 0 && (
                <div style={{ padding: '15px', backgroundColor: '#2a2a2a', borderRadius: '8px', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#00d2ff' }}>Teachable Machine Configuration</h4>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                            <label><input type="radio" checked={tmModelType === 'online'} onChange={() => setTmModelType('online')} /> Online (URL)</label>
                            <label><input type="radio" checked={tmModelType === 'offline'} onChange={() => setTmModelType('offline')} /> Offline (Files)</label>
                        </div>

                        {tmModelType === 'online' ? (
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <input
                                    placeholder="Paste Teachable Machine model URL..."
                                    style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #555', backgroundColor: '#1a1a1a', color: 'white' }}
                                    value={tmModelURL}
                                    onChange={(e) => setTmModelURL(e.target.value)}
                                />
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.8rem' }}>
                                <div>Model (.json)<br /><input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'model')} /></div>
                                <div>Weights (.bin)<br /><input type="file" accept=".bin" onChange={(e) => handleFileChange(e, 'weights')} /></div>
                                <div>Metadata (.json)<br /><input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'metadata')} /></div>
                            </div>
                        )}

                        <div style={{ marginTop: '10px' }}>
                            <button
                                onClick={handleLoadTmModel}
                                disabled={tmLoading}
                                style={{ padding: '8px 16px', backgroundColor: tmModel ? '#4caf50' : '#2196f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                {tmLoading ? 'Loading...' : (tmModel ? '✅ Model Loaded' : 'Load Model')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    padding: '15px',
                    backgroundColor: '#3a1a1a',
                    border: '1px solid #ff4b4b',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <AlertCircle size={20} color="#ff4b4b" />
                    <span>{error}</span>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '20px' }}>
                {/* Left: Video + Canvas */}
                <div>
                    <div style={{
                        position: 'relative',
                        backgroundColor: '#000',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '15px'
                    }}>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            style={{ width: '100%', display: 'block' }}
                            onLoadedMetadata={(e) => {
                                if (canvasRef.current) {
                                    canvasRef.current.width = e.target.videoWidth;
                                    canvasRef.current.height = e.target.videoHeight;
                                }
                            }}
                        />
                        {showPoseSkeleton && (
                            <canvas
                                ref={canvasRef}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    pointerEvents: 'none'
                                }}
                            />
                        )}
                    </div>

                    {/* Progress Bar */}
                    {isProcessing && (
                        <div style={{
                            backgroundColor: '#2a2a2a',
                            borderRadius: '8px',
                            padding: '15px',
                            marginBottom: '15px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <span>Processing...</span>
                                <span>{progress.toFixed(0)}%</span>
                            </div>
                            <div style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: '#1a1a1a',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    backgroundColor: '#00d2ff',
                                    transition: 'width 0.3s'
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Current Action */}
                    {currentAction && isProcessing && (
                        <div style={{
                            backgroundColor: '#2a2a2a',
                            borderRadius: '8px',
                            padding: '15px'
                        }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>Current Action</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: currentAction.color,
                                    borderRadius: '8px'
                                }} />
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                                        {currentAction.action}
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                        Confidence: {(currentAction.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Detected Actions List */}
                <div style={{
                    backgroundColor: '#2a2a2a',
                    borderRadius: '8px',
                    padding: '20px',
                    maxHeight: '600px',
                    overflowY: 'auto'
                }}>
                    <h3 style={{ margin: '0 0 15px 0' }}>
                        Detected Actions ({detectedActions.length})
                    </h3>

                    {detectedActions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
                            <p>No actions detected yet.</p>
                            <p style={{ fontSize: '0.85rem' }}>
                                Click "Start Detection" to begin analyzing the video.
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {detectedActions.map((action, index) => (
                                <div
                                    key={index}
                                    style={{
                                        backgroundColor: '#1a1a1a',
                                        padding: '12px',
                                        borderRadius: '6px',
                                        borderLeft: `4px solid ${action.color}`
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                        <span style={{ fontWeight: 'bold' }}>
                                            {index + 1}. {action.action}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                            {action.therblig}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                        Duration: {(action.duration / 30).toFixed(2)}s
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                        Confidence: {(action.confidence * 100).toFixed(0)}%
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ActionRecognition;
