import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Play, Pause, Square, Layers, Settings, Eye, Plus, Trash2, X, Camera, Box, Video, Activity, Database, PlayCircle, Info, Check, Ruler, Undo, Redo, Copy, RotateCw, Upload, Download, FileJson, Zap, ExternalLink, Sparkles, FlaskConical, CheckCircle, Trophy } from 'lucide-react';
import ObjectTracking from '../ObjectTracking'; // Reuse existing component for video + detection
import RuleEditor from './RuleEditor';
import StateDiagram from './StateDiagram';
import CycleTimeChart from './CycleTimeChart';
import PoseSimulator from './PoseSimulator';
import { generatePDFReport } from '../../utils/studio/PDFReportGenerator';
import { initializePoseDetector, detectPose } from '../../utils/poseDetector';
import PoseNormalizer from '../../utils/studio/PoseNormalizer';
import PoseSmoother from '../../utils/studio/PoseSmoother';
import StudioAssistant from './StudioAssistant';
import { getAllProjects } from '../../utils/database';
import InferenceEngine from '../../utils/studio/InferenceEngine';
import { generateAiRuleFromImage, validateAiRuleScript } from '../../utils/aiGenerator';
import useHistory from '../../hooks/useHistory';
import { MODEL_TEMPLATES } from '../../utils/studio/ModelTemplates';
import tmDetector from '../../utils/teachableMachineDetector';
import roboflowDetector from '../../utils/roboflowDetector';
import { useDialog } from '../../contexts/DialogContext';


const ModelBuilder = ({ model, onClose, onSave, isLaboratory, challenge, videoSrc: initialVideoSrc }) => {
    const { t } = useTranslation();
    const { showAlert, showConfirm, showPrompt } = useDialog();

    const [currentModel, setCurrentModel, undoModel, redoModel, canUndoModel, canRedoModel] = useHistory({
        ...model,
        states: model.statesList || [{ id: 's_start', name: 'Start' }],
        transitions: model.transitions || [],
        tmModels: model.tmModels || (model.tmModelUrl ? [{ id: 'default', name: 'Main Model', url: model.tmModelUrl, type: model.tmModelType || 'image' }] : [])
    });
    const [showHelp, setShowHelp] = useState(false);

    // RESTORED STATES
    const [activeTab, setActiveTab] = useState('rules'); // rules, states, test
    const [videoSrc, setVideoSrc] = useState(initialVideoSrc || null);
    const [isMaximized, setIsMaximized] = useState(false); // Maximize editor area
    const [leftPanelWidth, setLeftPanelWidth] = useState(60); // Percentage
    const [isResizing, setIsResizing] = useState(false);

    // IP Camera Recording States
    const [showIPCameraModal, setShowIPCameraModal] = useState(false);
    const [testModeInput, setTestModeInput] = useState('video'); // 'video', 'simulator'
    const [ipCameraURL, setIpCameraURL] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [recordedChunks, setRecordedChunks] = useState([]);

    const [visOptions, setVisOptions] = useState({
        skeleton: true,
        rules: true,
        roi: true
    });

    // LABORATORY STATE
    const [labTasks, setLabTasks] = useState(challenge?.tasks || []);
    const [showChallengePanel, setShowChallengePanel] = useState(true);

    const toggleTask = (taskId) => {
        setLabTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        ));
    };
    const mediaRecorderRef = useRef(null);
    const ipCameraRef = useRef(null);
    const [isDrawingROI, setIsDrawingROI] = useState(false);
    const [roiStart, setRoiStart] = useState(null);
    const [selectedStateId, setSelectedStateId] = useState(null);
    const [activePose, setActivePose] = useState(null); // Real-time pose data
    const [selectedKeypoints, setSelectedKeypoints] = useState({}); // { name: boolean }

    const KEYPOINT_NAMES = [
        "nose", "left_eye_inner", "left_eye", "left_eye_outer", "right_eye_inner", "right_eye", "right_eye_outer",
        "left_ear", "right_ear", "mouth_left", "mouth_right", "left_shoulder", "right_shoulder",
        "left_elbow", "right_elbow", "left_wrist", "right_wrist", "left_pinky", "right_pinky",
        "left_index", "right_index", "left_thumb", "right_thumb", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle", "left_heel", "right_heel",
        "left_foot_index", "right_foot_index"
    ];

    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const smootherRef = useRef(new PoseSmoother(0.5));
    const engineRef = useRef(null);
    const [testLogs, setTestLogs] = useState([]);
    const [timelineData, setTimelineData] = useState([]);
    const [currentTestState, setCurrentTestState] = useState(null);
    const [cycleStats, setCycleStats] = useState(null);
    const [tmPredictions, setTmPredictions] = useState({}); // { [modelId]: prediction }
    const [rfPredictions, setRfPredictions] = useState({}); // { [modelId]: detections[] }
    const [tmLoadingStates, setTmLoadingStates] = useState({}); // { [modelId]: boolean }
    const [tmFiles, setTmFiles] = useState({}); // { [modelId]: { model, weights, metadata } }
    const [captureBufferStatus, setCaptureBufferStatus] = useState({ current: 0, required: 60 }); // NEW: Track motion buffer for progress bar

    // MEASUREMENT TOOL STATES
    const [measurementMode, setMeasurementMode] = useState(null); // 'distance' | 'angle' | null
    const [selectedMeasurePoints, setSelectedMeasurePoints] = useState([]); // Array of keypoint names
    const [measurementResult, setMeasurementResult] = useState(null); // { type, value, points }
    const [isVideoPaused, setIsVideoPaused] = useState(true);
    const [plcSignals, setPlcSignals] = useState({}); // { [signalId]: 'HIGH' | 'LOW' }

    // HELPER: Calculate distance between two points (normalized)
    const getDistance = (p1, p2) => {
        if (!p1 || !p2) return 0;
        return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    };

    // HELPER: Calculate angle between three points
    const getAngle = (p1, p2, p3) => {
        if (!p1 || !p2 || !p3) return 0;
        const ang1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
        const ang3 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
        let angle = (ang3 - ang1) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return angle > 180 ? 360 - angle : angle;
    };

    const handleCanvasClick = (e) => {
        if (!measurementMode || !activePose || !isVideoPaused) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const clickX = (e.clientX - rect.left) / rect.width;
        const clickY = (e.clientY - rect.top) / rect.height;

        // Find nearest keypoint
        let nearest = null;
        let minDist = 0.05; // Selection radius

        activePose.keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                const d = Math.sqrt(Math.pow(kp.x - clickX, 2) + Math.pow(kp.y - clickY, 2));
                if (d < minDist) {
                    minDist = d;
                    nearest = kp.name;
                }
            }
        });

        if (nearest) {
            // Use functional update to ensure we always have the freshest state
            setSelectedMeasurePoints(prevPoints => {
                let nextPoints = [...prevPoints];

                if (nextPoints.includes(nearest)) {
                    nextPoints = nextPoints.filter(p => p !== nearest);
                } else {
                    nextPoints.push(nearest);
                }

                if (nextPoints.length > 3) {
                    nextPoints.shift();
                }

                // Calculate results for the NEW points immediately
                const results = { distance: null, pixelDistance: null, angle: null };
                const getKP = (name) => activePose.keypoints.find(k => k.name === name);

                if (nextPoints.length >= 2) {
                    const p1 = getKP(nextPoints[0]);
                    const p2 = getKP(nextPoints[1]);
                    if (p1 && p2) {
                        const d = getDistance(p1, p2);
                        results.distance = d * 100;
                        if (videoRef.current) {
                            const vw = videoRef.current.videoWidth || 1;
                            const vh = videoRef.current.videoHeight || 1;
                            results.pixelDistance = Math.sqrt(Math.pow((p2.x - p1.x) * vw, 2) + Math.pow((p2.y - p1.y) * vh, 2));
                        }
                    }
                }

                if (nextPoints.length === 3) {
                    const p1 = getKP(nextPoints[0]);
                    const p2 = getKP(nextPoints[1]);
                    const p3 = getKP(nextPoints[2]);
                    if (p1 && p2 && p3) results.angle = getAngle(p1, p2, p3);
                }

                setMeasurementResult(results);

                // CRITICAL: Draw IMMEDIATELY using the local 'nextPoints' and 'results'
                // to avoid waiting for state update (which would show old points or none)
                drawVisualizations(activePose, nextPoints, results);

                return nextPoints;
            });
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            console.log('File uploaded:', file.name);
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setTestModeInput('video'); // Auto-switch to video mode
            if (smootherRef.current) smootherRef.current.reset(); // Reset smoothing history on new file
        }
        event.target.value = ''; // CRITICAL: Reset value so same file can be uploaded again
    };

    const handleAddRuleFromMeasurement = async () => {
        let targetStateId = selectedStateId;

        // Auto-select if only one transition exists or only one source state exists
        if (!targetStateId) {
            const uniqueFromStates = [...new Set(currentModel.transitions.map(t => t.from))];
            if (uniqueFromStates.length === 1) {
                targetStateId = uniqueFromStates[0];
                setSelectedStateId(targetStateId); // Sync UI
            } else if (currentModel.transitions.length === 1) {
                targetStateId = currentModel.transitions[0].from;
                setSelectedStateId(targetStateId);
            }
        }

        // If still no target state or no transitions, and we have enough states, offer to create a transition
        if (currentModel.transitions.length === 0 || (targetStateId && currentModel.transitions.filter(t => t.from === targetStateId).length === 0)) {
            if (currentModel.states.length >= 2) {
                const defaultFrom = targetStateId || currentModel.states[0].id;
                const defaultTo = currentModel.states.find(s => s.id !== defaultFrom)?.id || currentModel.states[1].id;
                const fromName = currentModel.states.find(s => s.id === defaultFrom)?.name || 'State 1';
                const toName = currentModel.states.find(s => s.id === defaultTo)?.name || 'State 2';

                if (await showConfirm(t('studioModel.modelBuilder.measure.noTransition'), `No transition found ${targetStateId ? 'starting from ' + fromName : 'yet'}. \n\nCreate a new transition from '${fromName}' to '${toName}' and add this rule?`)) {
                    targetStateId = defaultFrom;
                    setSelectedStateId(targetStateId);

                    const newTransition = {
                        id: `t_${Date.now()}`,
                        from: defaultFrom,
                        to: defaultTo,
                        condition: { rules: [] }
                    };

                    const newRule = {
                        id: `rule_meas_${Date.now()}`,
                        type: measurementResult.angle !== null ? 'POSE_ANGLE' : 'POSE_RELATION',
                        params: (measurementResult.angle !== null) ? {
                            jointA: selectedMeasurePoints[0],
                            jointB: selectedMeasurePoints[1],
                            jointC: selectedMeasurePoints[2],
                            operator: '<',
                            value: Math.round(measurementResult.angle)
                        } : {
                            jointA: selectedMeasurePoints[0],
                            targetType: 'POINT',
                            jointB: selectedMeasurePoints[1],
                            operator: '<',
                            value: parseFloat((measurementResult.distance / 100).toFixed(4))
                        }
                    };

                    newTransition.condition.rules.push(newRule);

                    setCurrentModel(prev => ({
                        ...prev,
                        transitions: [...prev.transitions, newTransition]
                    }));

                    await showAlert(t('common.success'), "Successfully created transition and added rule.");
                    return;
                }
            }

            if (!targetStateId) {
                await showAlert(t('common.info'), "No state selected. Please select a transition/state in 'Rules & Logic' tab first.");
            } else {
                await showAlert(t('common.info'), "No transition found starting from the selected state. Please add a transition in 'Rules & Logic' tab first.");
            }
            return;
        }

        const validTransitions = currentModel.transitions.filter(t => t.from === targetStateId);
        // Safety check
        if (validTransitions.length === 0) return;

        const targetTransition = validTransitions[0];

        const newRule = {
            id: `rule_meas_${Date.now()}`,
            type: measurementResult.angle !== null ? 'POSE_ANGLE' : 'POSE_RELATION',
            params: {}
        };

        if (newRule.type === 'POSE_ANGLE') {
            newRule.params = {
                jointA: selectedMeasurePoints[0],
                jointB: selectedMeasurePoints[1],
                jointC: selectedMeasurePoints[2],
                operator: '<',
                value: Math.round(measurementResult.angle)
            };
        } else {
            newRule.params = {
                jointA: selectedMeasurePoints[0],
                targetType: 'POINT',
                jointB: selectedMeasurePoints[1],
                operator: '<',
                value: parseFloat((measurementResult.distance / 100).toFixed(4)) // Convert back from percentage if needed, or check usage
            };
            // Note: measurementResult.distance is multiplied by 100 in handleCanvasClick (line 149), so divide by 100 
            // to store normalized value (0-1) which is standard for logic
        }

        const updatedCondition = {
            ...targetTransition.condition,
            rules: [...targetTransition.condition.rules, newRule]
        };

        handleUpdateTransition(targetTransition.id, { condition: updatedCondition });

        setMeasurementResult(null);
        setSelectedMeasurePoints([]);
        setMeasurementMode(null); // Exit measurement mode

        // Ensure "Rules & Logic" tab is active so they can see it
        setActiveTab('rules');
    };

    // IP Camera Recording Handlers
    const handleStartRecording = async () => {
        if (!ipCameraRef.current) return;

        try {
            // Create canvas to capture frames from img element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = ipCameraRef.current.naturalWidth || 640;
            canvas.height = ipCameraRef.current.naturalHeight || 480;

            // Capture frames at 30fps
            const stream = canvas.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9'
            });

            const chunks = [];
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                setVideoSrc(url);
                setShowIPCameraModal(false);
                setIsRecording(false);
                setRecordingDuration(0);
            };

            // Draw frames from img to canvas
            const drawFrame = () => {
                if (isRecording && ipCameraRef.current) {
                    ctx.drawImage(ipCameraRef.current, 0, 0, canvas.width, canvas.height);
                    requestAnimationFrame(drawFrame);
                }
            };

            mediaRecorder.start();
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
            setRecordedChunks(chunks);
            drawFrame();

            // Auto-stop after duration
            const durationTimer = setInterval(() => {
                setRecordingDuration(prev => {
                    const newDuration = prev + 1;
                    if (newDuration >= 30) { // Max 30 seconds
                        handleStopRecording();
                        clearInterval(durationTimer);
                    }
                    return newDuration;
                });
            }, 1000);
        } catch (error) {
            console.error('Recording error:', error);
            await showAlert(t('common.error'), 'Failed to start recording: ' + error.message);
        }
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    // State for detector loading
    const [detectorReady, setDetectorReady] = useState(false);
    const [loadingDetector, setLoadingDetector] = useState(false);

    // Pre-initialize pose detector when video source changes
    useEffect(() => {
        if (!videoSrc && testModeInput !== 'simulator') return; // Only preload for video/camera

        const preloadDetector = async () => {
            setLoadingDetector(true);
            try {
                await initializePoseDetector();
                setDetectorReady(true);
                console.log('✅ Pose detector pre-loaded for video');
            } catch (error) {
                console.error('Failed to pre-load pose detector:', error);
            }
            setLoadingDetector(false);
        };

        preloadDetector();
    }, [videoSrc, testModeInput]);

    // Multiple Teachable Machine Models Loading
    useEffect(() => {
        const models = currentModel.tmModels || [];
        models.forEach(async (m) => {
            if (m.url || (tmFiles[m.id]?.model && tmFiles[m.id]?.weights && tmFiles[m.id]?.metadata)) {
                setTmLoadingStates(prev => ({ ...prev, [m.id]: true }));
                try {
                    const source = m.url || tmFiles[m.id];
                    await tmDetector.loadModel(m.id, source, m.type || 'image');
                    console.log(`🟢 TM Model [${m.id}] Ready`);
                } catch (e) {
                    console.error(`Failed to load TM model [${m.id}]:`, e);
                } finally {
                    setTmLoadingStates(prev => ({ ...prev, [m.id]: false }));
                }
            }
        });

        // Unload models no longer in the list
        const modelIds = models.map(m => m.id);
        tmDetector.models.forEach((val, key) => {
            if (!modelIds.includes(key)) {
                tmDetector.unloadModel(key);
            }
        });
    }, [currentModel.tmModels, tmFiles]);

    // Detect pose immediately when video metadata is loaded
    useEffect(() => {
        if (!videoSrc || !detectorReady || testModeInput === 'simulator') return;

        const handleLoadedMetadata = async () => {
            if (videoRef.current) {
                console.log('🎬 Video metadata loaded, detecting initial pose...');
                try {
                    const poses = await detectPose(videoRef.current);
                    if (poses && poses.length > 0) {
                        const smoothedKeypoints = smootherRef.current.smooth(poses[0].keypoints);
                        const smoothedPose = { ...poses[0], keypoints: smoothedKeypoints };
                        setActivePose(smoothedPose);
                        drawVisualizations(smoothedPose);
                        console.log('✅ Initial pose detected!');
                    }
                } catch (error) {
                    console.error('Failed to detect initial pose:', error);
                }
            }
        };

        const video = videoRef.current;
        if (video) {
            video.addEventListener('loadeddata', handleLoadedMetadata);
            // Also try immediately if video is already loaded
            if (video.readyState >= 2) {
                handleLoadedMetadata();
            }
        }

        return () => {
            if (video) {
                video.removeEventListener('loadeddata', handleLoadedMetadata);
            }
        };
    }, [videoSrc, detectorReady, testModeInput]);

    // Continuous Detection Loop for UI Visualization
    useEffect(() => {
        let animationFrameId;

        const detectLoop = async () => {
            if (!detectorReady || testModeInput === 'simulator') return; // Skip if detector not ready or in simulator mode
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                const poses = await detectPose(videoRef.current);
                if (poses && poses.length > 0) {
                    // Smooth all detected poses
                    const smoothedPoses = poses.map(p => ({
                        ...p,
                        keypoints: smootherRef.current.smooth(p.keypoints, p.id || 0)
                    }));

                    setActivePose(smoothedPoses[0]);

                    // --- DETECTION PHASE ---
                    let currentTmPredictions = {};
                    if (currentModel.tmModels && currentModel.tmModels.length > 0) {
                        currentTmPredictions = await tmDetector.predictAll(videoRef.current);
                        setTmPredictions(currentTmPredictions);
                    }

                    let currentRfPredictions = {};
                    if (currentModel.rfModels && currentModel.rfModels.length > 0) {
                        currentRfPredictions = await roboflowDetector.detectAll(videoRef.current, currentModel.rfModels, smoothedPoses[0]);
                        setRfPredictions(currentRfPredictions);
                    }

                    // Draw Visualizations with fresh detections
                    drawVisualizations(smoothedPoses[0], null, null, smoothedPoses, currentRfPredictions);

                    // TEST MODE & BACKGROUND INFERENCE EXECUTION
                    if (activeTab === 'test' || activeTab === 'rules') {
                        if (!engineRef.current) {
                            engineRef.current = new InferenceEngine();
                            engineRef.current.loadModel(currentModel);
                            engineRef.current.onCycleComplete = (stats) => {
                                setCycleStats(stats);
                            };
                            engineRef.current.onStateChange = handleStateChange;

                            if (activeTab === 'test') {
                                engineRef.current.addLog(0, videoRef.current.currentTime, "System", "Test Mode Active - Waiting for operator...");
                                setTestLogs([...engineRef.current.getLogs()]);
                            }
                            console.log("Inference Engine Started in Background:", currentModel.name);
                        }

                        // Run Engine with all data and capture result
                        const result = engineRef.current.processFrame({
                            poses: smoothedPoses,
                            objects: [],
                            hands: [],
                            timestamp: videoRef.current.currentTime,
                            teachableMachine: currentTmPredictions,
                            roboflow: currentRfPredictions
                        });

                        // Update buffer status for UI progress bar
                        const activeTracks = engineRef.current.activeTracks;
                        if (activeTracks.size > 0) {
                            const firstTrack = Array.from(activeTracks.values())[0];
                            setCaptureBufferStatus(prev => ({
                                ...prev,
                                current: firstTrack.poseBuffer ? firstTrack.poseBuffer.length : 0,
                                videoTime: videoRef.current ? videoRef.current.currentTime : 0
                            }));
                        } else {
                            setCaptureBufferStatus(prev => ({
                                ...prev,
                                current: 0,
                                videoTime: videoRef.current ? videoRef.current.currentTime : 0
                            }));
                        }

                        // Update UI Logs immediately from result
                        if (activeTab === 'test') {
                            setTestLogs([...result.logs]);

                            // Update Timeline Data
                            if (result.timelineEvents) {
                                const activeEvents = result.tracks.map(t => ({
                                    state: t.state,
                                    startTime: videoRef.current.currentTime - parseFloat(t.duration), // Rough estimate
                                    endTime: videoRef.current.currentTime,
                                    isActive: true
                                }));
                                setTimelineData([...result.timelineEvents, ...activeEvents]);
                            }

                            // Visualize Current State
                            if (result.tracks && result.tracks.length > 0) {
                                setCurrentTestState(result.tracks[0].state);

                                // Sync Predictions back to rules for live UI indicator
                                currentModel.transitions.forEach(t => {
                                    t.condition.rules.forEach(r => {
                                        if (r.type === 'TEACHABLE_MACHINE') {
                                            r.lastValue = r.params.modelId ? currentTmPredictions[r.params.modelId] : Object.values(currentTmPredictions)[0];
                                        } else if (r.type === 'ROBOFLOW_DETECTION') {
                                            if (r.params.modelId) {
                                                r.lastValue = currentRfPredictions[r.params.modelId];
                                            } else {
                                                r.lastValue = Object.values(currentRfPredictions).flat();
                                            }
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
                animationFrameId = requestAnimationFrame(detectLoop);
            }
        };

        if (videoRef.current) {
            const handlePlay = () => {
                setIsVideoPaused(false);
                detectLoop();
            };
            const handlePause = () => {
                setIsVideoPaused(true);
                cancelAnimationFrame(animationFrameId);
            };
            const handleSeeked = async () => {
                const poses = await detectPose(videoRef.current);
                if (poses && poses.length > 0) {
                    const smoothed = smootherRef.current.smooth(poses[0].keypoints);
                    const pose = { ...poses[0], keypoints: smoothed };
                    setActivePose(pose);

                    let rfData = {};
                    if (currentModel.rfModels && currentModel.rfModels.length > 0) {
                        rfData = await roboflowDetector.detectAll(videoRef.current, currentModel.rfModels, pose);
                        setRfPredictions(rfData);
                    }

                    drawVisualizations(pose, null, null, [pose], rfData);

                    if (activeTab === 'test' || activeTab === 'rules') {
                        if (!engineRef.current) {
                            engineRef.current = new InferenceEngine();
                            engineRef.current.loadModel(currentModel);
                        }

                        engineRef.current.processFrame({
                            poses: [pose],
                            objects: [],
                            hands: [],
                            timestamp: videoRef.current.currentTime,
                            roboflow: rfData
                        });

                        const tracks = engineRef.current.activeTracks;
                        if (tracks.size > 0) {
                            const firstTrack = Array.from(tracks.values())[0];
                            setCaptureBufferStatus(prev => ({
                                ...prev,
                                current: firstTrack.poseBuffer ? firstTrack.poseBuffer.length : 0,
                                videoTime: videoRef.current.currentTime
                            }));

                            if (activeTab === 'test') {
                                setCurrentTestState(firstTrack.currentState);
                                setTestLogs([...engineRef.current.getLogs()]);
                            }
                        }
                    }
                }
            };

            videoRef.current.addEventListener('play', handlePlay);
            videoRef.current.addEventListener('pause', handlePause);
            videoRef.current.addEventListener('seeked', handleSeeked);

            // AUTO-START if playing
            if (!videoRef.current.paused) {
                handlePlay();
            }

            return () => {
                if (videoRef.current) {
                    videoRef.current.removeEventListener('play', handlePlay);
                    videoRef.current.removeEventListener('pause', handlePause);
                    videoRef.current.removeEventListener('seeked', handleSeeked);
                }
                cancelAnimationFrame(animationFrameId);
            };
        }
    }, [videoSrc, visOptions, activeTab, currentModel, detectorReady, testModeInput]);

    // Action Execution Logic
    const executeAction = (action) => {
        console.log("⚡ Executing Action:", action);
        if (action.type === 'SOUND') {
            try {
                const audio = new Audio(action.payload);
                audio.play().catch(e => console.error("Audio trigger failed", e));
            } catch (e) {
                console.error("Audio error", e);
            }
        } else if (action.type === 'WEBHOOK') {
            try {
                fetch(action.url, {
                    method: action.method || 'POST',
                    body: action.payload ? action.payload : null,
                    headers: { 'Content-Type': 'application/json' }
                }).then(res => console.log("Webhook sent:", res.status))
                    .catch(e => console.error("Webhook failed", e));
            } catch (e) {
                console.error("Webhook error", e);
            }
        } else if (action.type === 'PLC') {
            try {
                const data = typeof action.payload === 'string' ? JSON.parse(action.payload) : action.payload;
                setPlcSignals(prev => ({ ...prev, [data.signalId]: data.value }));
                console.log(`🔌 PLC Signal ${data.signalId} set to ${data.value}`);
            } catch (e) {
                console.error("Invalid PLC Payload", e);
            }
        }
    };

    const handleStateChange = (trackId, newStateId, fromStateId) => {
        // Execute On Exit actions for fromStateId
        const legacyState = currentModel.states.find(s => s.id === fromStateId);
        if (legacyState && legacyState.actions && legacyState.actions.onExit) {
            legacyState.actions.onExit.forEach(action => executeAction(action));
        }

        // Execute On Enter actions for newStateId
        const newState = currentModel.states.find(s => s.id === newStateId);
        if (newState && newState.actions && newState.actions.onEnter) {
            newState.actions.onEnter.forEach(action => executeAction(action));
        }
    };

    // Handle pose data from PoseSimulator
    const handlePoseDetected = async (poses) => {
        if (!detectorReady || testModeInput !== 'simulator') return;

        if (poses && poses.length > 0) {
            const smoothedPoses = poses.map(p => ({
                ...p,
                keypoints: smootherRef.current.smooth(p.keypoints, p.id || 0)
            }));
            setActivePose(smoothedPoses[0]);
            drawVisualizations(smoothedPoses[0], null, null, smoothedPoses);

            if (activeTab === 'test') {
                if (!engineRef.current) {
                    engineRef.current = new InferenceEngine();
                    engineRef.current.loadModel(currentModel);
                    engineRef.current.onCycleComplete = (stats) => {
                        setCycleStats(stats);
                        console.log("♻️ Cycle Analytics Updated:", stats);
                    };
                    engineRef.current.onStateChange = handleStateChange;
                    console.log("Test Engine Started with Model:", currentModel.name);
                }

                // TM inference not applicable for simulator unless it can simulate images
                // For now, skip TM predictions in simulator mode

                engineRef.current.processFrame({
                    poses: smoothedPoses,
                    objects: [],
                    hands: [],
                    timestamp: performance.now() / 1000, // Use high-res time for simulator
                    teachableMachine: {}
                });

                const logs = engineRef.current.getLogs();
                if (logs.length !== testLogs.length) {
                    setTestLogs([...logs]);
                }

                if (engineRef.current.timelineEvents) {
                    const activeEvents = [];
                    engineRef.current.activeTracks.forEach((track, id) => {
                        activeEvents.push({
                            state: track.currentState,
                            startTime: track.stateEnterTime || track.enterTime,
                            endTime: performance.now() / 1000,
                            isActive: true
                        });
                    });
                    setTimelineData([...engineRef.current.timelineEvents, ...activeEvents]);
                }

                const primaryTrack = engineRef.current.activeTracks.get(1) || engineRef.current.activeTracks.values().next().value;
                if (primaryTrack) {
                    setCurrentTestState(primaryTrack.currentState);
                }
            }
        }
    };

    // Resize Handler
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const percentage = (e.clientX / window.innerWidth) * 100;
            if (percentage > 20 && percentage < 80) {
                setLeftPanelWidth(percentage);
            }
        };

        const handleMouseUp = () => setIsResizing(false);

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    // Reset Engine when switching tabs
    useEffect(() => {
        if (activeTab !== 'test' && activeTab !== 'rules') {
            engineRef.current = null;
            setTestLogs([]);
            setCurrentTestState(null);
        } else {
            // Initialize engine promptly when entering test or rules tab
            if (!engineRef.current) {
                engineRef.current = new InferenceEngine();
                engineRef.current.loadModel(currentModel);
                engineRef.current.onCycleComplete = (stats) => {
                    setCycleStats(stats);
                };
                engineRef.current.onStateChange = handleStateChange;

                // Process a single frame immediately if video is ready to "warm up" the engine
                if (videoRef.current && activePose) {
                    engineRef.current.processFrame({
                        poses: [activePose],
                        objects: [],
                        hands: [],
                        timestamp: videoRef.current.currentTime || 0,
                        teachableMachine: tmPredictions,
                        roboflow: rfPredictions
                    });

                    if (activeTab === 'test') {
                        const logs = engineRef.current.getLogs();
                        setTestLogs([...logs]);
                    }
                } else if (activeTab === 'test') {
                    engineRef.current.addLog(0, 0, "System", "Test Mode Active - Ready for detection...");
                    setTestLogs([...engineRef.current.getLogs()]);
                }
            }
        }
    }, [activeTab, currentModel]);

    const handleSave = () => {
        // Prepare model object with all required fields for the engine
        const modelToSave = {
            ...currentModel,
            statesList: currentModel.states, // Persist full state objects
            states: currentModel.states.length, // Update count for dashboard
            rules: currentModel.transitions.length, // Update count for dashboard
            updated: new Date().toISOString().split('T')[0]
        };
        onSave(modelToSave);
    };

    // State Management
    const handleAddState = () => {
        const newState = {
            id: `s_${Date.now()}`,
            name: `State ${currentModel.states.length + 1}`,
            minDuration: 1.0,
            roi: null,
            referencePose: null
        };
        setCurrentModel(prev => ({
            ...prev,
            states: [...prev.states, newState]
        }));
    };

    const handleDeleteState = async (stateId) => {
        if (currentModel.states.length <= 1) {
            await showAlert(t('common.warning'), "At least one state determines the model.");
            return;
        }
        setCurrentModel(prev => ({
            ...prev,
            states: prev.states.filter(s => s.id !== stateId),
            // Remove transitions connected to this state
            transitions: prev.transitions.filter(t => t.from !== stateId && t.to !== stateId)
        }));
    };

    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [availableProjects, setAvailableProjects] = useState([]);

    const handleOpenProjectPicker = async () => {
        try {
            const projects = await getAllProjects();
            setAvailableProjects(projects);
            setShowProjectPicker(true);
        } catch (error) {
            console.error("Failed to load projects:", error);
            await showAlert(t('common.error'), "Gagal memuat daftar project.");
        }
    };

    const handleSelectProject = async (project) => {
        if (project.videoBlob) {
            const url = URL.createObjectURL(project.videoBlob);
            setVideoSrc(url);

            // IMPORT ELEMENTS AS STATES
            let importedStates = [];
            let importedTransitions = [];

            if (project.measurements && project.measurements.length > 0) {
                // Get unique element names to avoid duplicates, supporting both elementName and task fields
                const uniqueElementNames = [...new Set(project.measurements.map(m => m.elementName || m.task))].filter(Boolean);

                if (uniqueElementNames.length > 0) {
                    // Create States
                    importedStates = uniqueElementNames.map((name, index) => ({
                        id: `s_imp_${index}_${Date.now()}`,
                        name: name,
                        minDuration: 1.0,
                        roi: null,
                        referencePose: null
                    }));

                    // Create Transitions (Sequential)
                    for (let i = 0; i < importedStates.length; i++) {
                        const from = importedStates[i];
                        const to = importedStates[(i + 1) % importedStates.length]; // Loop back to start

                        importedTransitions.push({
                            id: `t_imp_${i}_${Date.now()}`,
                            from: from.id,
                            to: to.id,
                            condition: {
                                rules: [],
                                holdTime: 0.5
                            }
                        });
                    }
                }
            }

            setCurrentModel(prev => ({
                ...prev,
                name: project.projectName + " Model",
                states: importedStates.length > 0 ? importedStates : prev.states,
                transitions: importedTransitions.length > 0 ? importedTransitions : prev.transitions
            }));

            setShowProjectPicker(false);

            if (importedStates.length > 0) {
                await showAlert(t('common.success'), `Project "${project.projectName}" berhasil diimpor dengan ${importedStates.length} elemen sebagai baseline model.`);
            }
        } else {
            await showAlert(t('common.error'), "Project ini tidak memiliki data video.");
        }
    };

    const handleUpdateStateName = (id, newName) => {
        setCurrentModel(prev => ({
            ...prev,
            states: prev.states.map(s => s.id === id ? { ...s, name: newName } : s)
        }));
    };

    const handleUpdateState = (id, field, value) => {
        setCurrentModel(prev => ({
            ...prev,
            states: prev.states.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    };

    // Capture Logic
    const handleCaptureReference = async () => {
        if (!videoRef.current || !selectedStateId) {
            await showAlert(t('common.warning'), "Please select a state and ensure video is loaded.");
            return;
        }

        await initializePoseDetector(); // Ensure loaded
        const poses = await detectPose(videoRef.current);

        if (poses && poses.length > 0) {
            const pose = poses[0];

            // CAPTURE THUMBNAIL
            const canvas = document.createElement('canvas');
            const thumbWidth = 160;
            const thumbHeight = (videoRef.current.videoHeight / videoRef.current.videoWidth) * thumbWidth;
            canvas.width = thumbWidth;
            canvas.height = thumbHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, thumbWidth, thumbHeight);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

            handleUpdateState(selectedStateId, 'referencePose', pose.keypoints);
            handleUpdateState(selectedStateId, 'referenceImage', videoRef.current.currentTime);
            handleUpdateState(selectedStateId, 'thumbnail', thumbnail);
            await showAlert(t('common.success'), "Gerakan berhasil disimpan sebagai referensi!");
        } else {
            await showAlert(t('common.warning'), "Gagal mendeteksi tubuh. Pastikan tubuh terlihat jelas di kamera.");
        }
    };

    const handleCaptureSequence = async (transitionId, ruleId, options = {}) => {
        const { startTime, endTime, bufferSize = 60 } = options;

        if (!engineRef.current) {
            if (activeTab === 'test' || activeTab === 'rules') {
                engineRef.current = new InferenceEngine();
                engineRef.current.loadModel(currentModel);
            } else {
                await showAlert(t('common.info'), "Please switch to 'Rules & Logic' or 'Test Run' tab and play the video briefly.");
                return;
            }
        }

        let tracks = engineRef.current.activeTracks;

        // If no tracks, try to create one from current pose if available
        if (tracks.size === 0 && activePose) {
            console.log("No active tracks found during capture, forcing track creation from current pose...");
            engineRef.current.processFrame({
                poses: [activePose],
                timestamp: videoRef.current.currentTime,
                objects: [],
                hands: []
            });
            tracks = engineRef.current.activeTracks;
        }

        if (tracks.size === 0) {
            await showAlert(t('common.warning'), "No operator detected. Please play the video so the system can identify the operator.");
            return;
        }

        const activeTrack = Array.from(tracks.values())[0];
        if (!activeTrack.poseBuffer || activeTrack.poseBuffer.length === 0) {
            await showAlert(t('common.warning'), "No motion data available in buffer.");
            return;
        }

        let sequence = [];
        if (startTime !== undefined && endTime !== undefined) {
            // Range-based capture
            sequence = activeTrack.poseBuffer
                .filter(item => item.timestamp >= startTime && item.timestamp <= endTime)
                .map(item => item.pose);

            if (sequence.length < 5) {
                await showAlert(t('common.warning'), `Too few frames in selected range (${sequence.length} frames). Please ensure the video was played through the selected range.`);
                return;
            }
        } else {
            // Traditional tail-based capture
            sequence = activeTrack.poseBuffer.slice(-bufferSize).map(item => item.pose);
            if (sequence.length < bufferSize) {
                await showAlert(t('common.warning'), `Insufficient data. Need ${bufferSize} frames, but only have ${sequence.length}.`);
                return;
            }
        }

        // Update the rule in current model
        const transition = currentModel.transitions.find(t => t.id === transitionId);
        if (transition) {
            const updatedRules = transition.condition.rules.map(r =>
                r.id === ruleId ? {
                    ...r,
                    params: {
                        ...r.params,
                        targetSequence: sequence,
                        startTime,
                        endTime
                    }
                } : r
            );

            handleUpdateTransition(transitionId, {
                condition: { ...transition.condition, rules: updatedRules }
            });
            await showAlert(t('common.success'), `Captured ${sequence.length} frames from ${startTime !== undefined ? `range ${startTime.toFixed(1)}s - ${endTime.toFixed(1)}s` : 'recent motion'}.`);
        }
    };

    const captureCurrentFrame = () => {
        if (!videoRef.current || !canvasRef.current) return null;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');

        // Draw video
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        // Draw skeleton if active
        if (activePose) {
            // Need to scale pose to video resolution (not display resolution)
            const scaleX = canvas.width / canvasRef.current.width;
            const scaleY = canvas.height / canvasRef.current.height;

            // Simplified skeleton drawing for AI context
            ctx.fillStyle = '#ff0000';
            activePose.keypoints.forEach(kp => {
                if (kp.score > 0.5) {
                    ctx.beginPath();
                    ctx.arc(kp.x * canvas.width, kp.y * canvas.height, 5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        }

        return canvas.toDataURL('image/jpeg', 0.8);
    };

    const handleAiSuggestRule = async (transitionId) => {
        const imageData = captureCurrentFrame();
        if (!imageData) {
            await showAlert(t('common.error'), "Gagal menangkap frame video.");
            return;
        }

        try {
            const result = await generateAiRuleFromImage(imageData);
            if (result && result.type) {
                // Add the rule to the transition
                const transition = currentModel.transitions.find(t => t.id === transitionId);
                if (!transition) return;

                const newRule = {
                    id: `rule_ai_${Date.now()}`,
                    type: result.type,
                    params: result.params,
                    aiGenerated: true,
                    aiReasoning: result.reasoning
                };

                const updatedCondition = {
                    ...transition.condition,
                    rules: [...transition.condition.rules, newRule]
                };

                handleUpdateTransition(transitionId, { condition: updatedCondition });
                await showAlert(t('studioModel.modelBuilder.indicators.aiSuggestion'), result.reasoning);
            }
        } catch (error) {
            console.error("AI Suggestion Error:", error);
            await showAlert(t('common.error'), "AI gagal memberikan saran rule: " + error.message);
        }
    };

    const handleAiValidateScript = async (transitionId, ruleId, script) => {
        if (!script) {
            await showAlert(t('common.info'), "Script kosong. Silakan tulis logika terlebih dahulu.");
            return;
        }

        // setAiLoading(prev => ({ ...prev, [transitionId]: true })); // aiLoading state is not defined
        try {
            const result = await validateAiRuleScript(script);
            if (result) {
                await showAlert("AI Logic Check", `${result.explanation}\n\n${result.issues.length > 0 ? "Isu: " + result.issues.join(", ") : "Tidak ada isu ditemukan."}\n\nSaran: ${result.suggestion}`);

                if (result.isValid === false && result.suggestion) {
                    if (await showConfirm(t('common.warning'), "AI menemukan potensi kesalahan. Gunakan saran AI?")) {
                        handleUpdateRule(transitionId, ruleId, { params: { script: result.suggestion } });
                    }
                }
            }
        } catch (error) {
            console.error("AI Validation Error:", error);
            await showAlert(t('common.error'), "Gagal memvalidasi script: " + error.message);
        } finally {
            // setAiLoading(prev => ({ ...prev, [transitionId]: false })); // aiLoading state is not defined
        }
    };

    // VISUAL GEOMETRY HELPERS
    const drawMeasurements = (ctx, pose, overridePoints = null, overrideResults = null) => {
        const keypoints = pose.keypoints;
        const canvas = canvasRef.current;
        const pointsToDraw = overridePoints || selectedMeasurePoints;
        const resultsToDraw = overrideResults || measurementResult;

        // Draw selected points
        pointsToDraw.forEach((name, index) => {
            const kp = keypoints.find(k => k.name === name);
            if (kp) {
                // Outer glow shadow
                ctx.shadowBlur = 15;
                ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';

                // Red circle
                ctx.fillStyle = '#ef4444'; // Solid Red-500
                ctx.beginPath();
                ctx.arc(kp.x * canvas.width, kp.y * canvas.height, 12, 0, 2 * Math.PI);
                ctx.fill();

                // White border
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();

                // Reset shadow
                ctx.shadowBlur = 0;

                // Number label
                ctx.fillStyle = 'white';
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(index + 1, kp.x * canvas.width, kp.y * canvas.height);
            }
        });

        // Draw distance lines
        if (pointsToDraw.length >= 2) {
            for (let i = 0; i < pointsToDraw.length - 1; i++) {
                const p1 = keypoints.find(k => k.name === pointsToDraw[i]);
                const p2 = keypoints.find(k => k.name === pointsToDraw[i + 1]);

                if (p1 && p2) {
                    // Line
                    ctx.strokeStyle = '#ef4444';
                    ctx.lineWidth = 3;
                    ctx.setLineDash([5, 5]);
                    ctx.beginPath();
                    ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                    ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                    ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Draw angle arc
        if (pointsToDraw.length === 3) {
            const p1 = keypoints.find(k => k.name === pointsToDraw[0]);
            const p2 = keypoints.find(k => k.name === pointsToDraw[1]);
            const p3 = keypoints.find(k => k.name === pointsToDraw[2]);
            if (p1 && p2 && p3) {
                ctx.strokeStyle = '#f87171';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                ctx.lineTo(p3.x * canvas.width, p3.y * canvas.height);
                ctx.stroke();

                // Arc
                const ang1 = Math.atan2(p1.y - p2.y, p1.x - p2.x);
                const ang3 = Math.atan2(p3.y - p2.y, p3.x - p2.x);
                ctx.beginPath();
                ctx.arc(p2.x * canvas.width, p2.y * canvas.height, 40, ang1, ang3);
                ctx.stroke();
            }
        }
    };

    const drawSkeleton = (ctx, pose) => {
        const keypoints = pose.keypoints;
        const canvas = canvasRef.current;

        const connections = [
            ['nose', 'left_eye_inner'], ['left_eye_inner', 'left_eye'], ['left_eye', 'left_eye_outer'], ['left_eye_outer', 'left_ear'],
            ['nose', 'right_eye_inner'], ['right_eye_inner', 'right_eye'], ['right_eye', 'right_eye_outer'], ['right_eye_outer', 'right_ear'],
            ['mouth_left', 'mouth_right'],
            ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
            ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
            ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
            ['left_wrist', 'left_pinky'], ['left_wrist', 'left_index'], ['left_wrist', 'left_thumb'], ['left_pinky', 'left_index'],
            ['right_wrist', 'right_pinky'], ['right_wrist', 'right_index'], ['right_wrist', 'right_thumb'], ['right_pinky', 'right_index'],
            ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'], ['left_ankle', 'left_heel'], ['left_heel', 'left_foot_index'], ['left_ankle', 'left_foot_index'],
            ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'], ['right_ankle', 'right_heel'], ['right_heel', 'right_foot_index'], ['right_ankle', 'right_foot_index']
        ];

        // Draw connections
        ctx.lineWidth = 2;
        connections.forEach(([start, end]) => {
            const p1 = keypoints.find(k => k.name === start);
            const p2 = keypoints.find(k => k.name === end);
            if (p1 && p2 && p1.score > 0.2 && p2.score > 0.2) {
                const isPredicted = p1.isPredicted || p2.isPredicted;
                ctx.strokeStyle = isPredicted ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)';
                if (isPredicted) ctx.setLineDash([2, 4]); else ctx.setLineDash([]);

                ctx.beginPath();
                ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
                ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
                ctx.stroke();
            }
        });
        ctx.setLineDash([]);

        // Draw keypoints
        keypoints.forEach(kp => {
            if (kp.score > 0.2) {
                const isPred = kp.isPredicted;
                ctx.fillStyle = isPred ? 'rgba(96, 165, 250, 0.4)' : '#60a5fa'; // Faded blue for prediction
                ctx.beginPath();
                ctx.arc(kp.x * canvas.width, kp.y * canvas.height, isPred ? 3 : 4, 0, 2 * Math.PI);
                ctx.fill();

                if (!isPred) {
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        });
    };

    const drawRulesVisuals = (ctx, pose, allPoses = null) => {
        const keypoints = pose.keypoints;
        const canvas = canvasRef.current;
        const relevantTransitions = currentModel.transitions;

        relevantTransitions.forEach(t => {
            t.condition.rules.forEach(rule => {
                const getKP = (p, name) => p.keypoints.find(k => k.name === name);

                if (rule.type === 'POSE_ANGLE') {
                    const a = getKP(pose, rule.params.jointA);
                    const b = getKP(pose, rule.params.jointB);
                    const c = getKP(pose, rule.params.jointC);
                    if (a && b && c) {
                        const isPred = a.isPredicted || b.isPredicted || c.isPredicted;
                        ctx.strokeStyle = isPred ? 'rgba(239, 68, 68, 0.4)' : '#ef4444';
                        ctx.lineWidth = 3;
                        if (isPred) ctx.setLineDash([5, 5]); else ctx.setLineDash([]);

                        ctx.beginPath();
                        ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
                        ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
                        ctx.lineTo(c.x * canvas.width, c.y * canvas.height);
                        ctx.stroke();

                        const ang1 = Math.atan2(a.y - b.y, a.x - b.x);
                        const ang2 = Math.atan2(c.y - b.y, c.x - b.x);
                        ctx.beginPath();
                        ctx.arc(b.x * canvas.width, b.y * canvas.height, 20, ang1, ang2);
                        ctx.stroke();

                        ctx.fillStyle = isPred ? 'rgba(239, 68, 68, 0.6)' : '#ef4444';
                        ctx.font = isPred ? 'italic 12px Inter' : 'bold 12px Inter';
                        const angleDeg = Math.abs((ang2 - ang1) * 180 / Math.PI);
                        const displayAngle = angleDeg > 180 ? 360 - angleDeg : angleDeg;
                        ctx.fillText(`${displayAngle.toFixed(1)}°${isPred ? ' (pred)' : ''}`, b.x * canvas.width + 25, b.y * canvas.height);
                        ctx.setLineDash([]);
                    }
                } else if (rule.type === 'POSE_RELATION' || rule.type === 'OPERATOR_PROXIMITY') {
                    const a = getKP(pose, rule.params.jointA || rule.params.joint);
                    if (!a) return;

                    ctx.lineWidth = 2;
                    ctx.setLineDash([4, 4]);

                    if (rule.type === 'OPERATOR_PROXIMITY' || (rule.type === 'POSE_RELATION' && rule.params.targetType === 'POINT')) {
                        let targetPose = pose;
                        let jointBName = rule.params.jointB || rule.params.joint;

                        // Handle inter-operator targeting
                        const targetTrackId = rule.params.targetTrackId;
                        if (targetTrackId && targetTrackId !== 'self' && allPoses) {
                            const targetIdx = typeof targetTrackId === 'number' ? targetTrackId - 1 : (targetTrackId === 'nearest' ? 1 : 0);
                            if (allPoses[targetIdx]) targetPose = allPoses[targetIdx];
                        }

                        const b = getKP(targetPose, jointBName);
                        if (b) {
                            ctx.strokeStyle = rule.type === 'OPERATOR_PROXIMITY' ? '#a855f7' : '#10b981';
                            ctx.beginPath();
                            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
                            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
                            ctx.stroke();

                            const dist = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
                            ctx.fillStyle = ctx.strokeStyle;
                            ctx.font = '10px Inter';
                            ctx.fillText(`${rule.type === 'OPERATOR_PROXIMITY' ? 'prox' : 'rel'}: ${dist.toFixed(2)}`, (a.x + b.x) / 2 * canvas.width, (a.y + b.y) / 2 * canvas.height - 10);
                        }
                    } else if (rule.type === 'POSE_RELATION' && rule.params.targetType === 'VALUE') {
                        ctx.strokeStyle = '#10b981';
                        ctx.beginPath();
                        if (rule.params.component === 'y') {
                            ctx.moveTo(0, rule.params.value * canvas.height);
                            ctx.lineTo(canvas.width, rule.params.value * canvas.height);
                        } else {
                            ctx.moveTo(rule.params.value * canvas.width, 0);
                            ctx.lineTo(rule.params.value * canvas.width, canvas.height);
                        }
                        ctx.stroke();
                    }
                    ctx.setLineDash([]);
                }
            });
        });
    };

    const drawRoboflowDetections = (ctx, rfPredictions) => {
        if (!rfPredictions || !canvasRef.current) return;
        const canvas = canvasRef.current;

        Object.entries(rfPredictions).forEach(([modelId, detections]) => {
            if (!Array.isArray(detections)) return;

            detections.forEach(det => {
                const [x, y, w, h] = det.bbox;

                // Draw bounding box
                ctx.strokeStyle = '#8b5cf6'; // Violet for Roboflow
                ctx.lineWidth = 2;
                ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height);

                // Draw label
                ctx.fillStyle = '#8b5cf6';
                ctx.font = 'bold 12px Inter';
                const label = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
                const textWidth = ctx.measureText(label).width;

                ctx.fillRect(x * canvas.width, y * canvas.height - 20, textWidth + 10, 20);
                ctx.fillStyle = 'white';
                ctx.fillText(label, x * canvas.width + 5, y * canvas.height - 5);
            });
        });
    };

    const drawVisualizations = (pose, overridePoints = null, overrideResults = null, allPoses = null, currentRfPredictions = null) => {
        if (!canvasRef.current || !pose) return;
        const ctx = canvasRef.current.getContext('2d');
        const vw = videoRef.current ? videoRef.current.videoWidth : 1;
        const vh = videoRef.current ? videoRef.current.videoHeight : 1;

        canvasRef.current.width = vw;
        canvasRef.current.height = vh;

        ctx.clearRect(0, 0, vw, vh);

        if (visOptions.skeleton) drawSkeleton(ctx, pose);
        if (visOptions.rules) drawRulesVisuals(ctx, pose, allPoses);

        // Draw Roboflow Bounding Boxes
        if (visOptions.rules) {
            drawRoboflowDetections(ctx, currentRfPredictions || rfPredictions);
        }

        if (visOptions.roi && selectedStateId) {
            const state = currentModel.states.find(s => s.id === selectedStateId);
            if (state && state.roi) {
                ctx.strokeStyle = '#eab308';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    state.roi.x * canvasRef.current.width,
                    state.roi.y * canvasRef.current.height,
                    state.roi.width * canvasRef.current.width,
                    state.roi.height * canvasRef.current.height
                );
            }
        }

        // Draw Measurements
        if (measurementMode) {
            drawMeasurements(ctx, pose, overridePoints, overrideResults);
        }
    };

    // ROI Logic
    const startDrawingROI = (e) => {
        if (!isDrawingROI || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setRoiStart({ x, y });
    };

    const drawROI = (e) => {
        if (!isDrawingROI || !roiStart || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            roiStart.x * canvasRef.current.width,
            roiStart.y * canvasRef.current.height,
            (currentX - roiStart.x) * canvasRef.current.width,
            (currentY - roiStart.y) * canvasRef.current.height
        );
    };

    const endDrawingROI = (e) => {
        if (!isDrawingROI || !roiStart || !canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / rect.width;
        const currentY = (e.clientY - rect.top) / rect.height;

        const newROI = {
            x: Math.min(roiStart.x, currentX),
            y: Math.min(roiStart.y, currentY),
            width: Math.abs(currentX - roiStart.x),
            height: Math.abs(currentY - roiStart.y)
        };

        handleUpdateState(selectedStateId, 'roi', newROI);
        setRoiStart(null);
        setIsDrawingROI(false);
    };

    // Transition Management
    const handleAddTransition = (fromId, toId) => {
        const newTransition = {
            id: `t_${Date.now()}`,
            from: fromId,
            to: toId,
            condition: {
                rules: [] // Array of rule objects (AND logic)
            }
        };
        setCurrentModel(prev => ({
            ...prev,
            transitions: [...prev.transitions, newTransition]
        }));
    };

    const handleDeleteTransition = (id) => {
        setCurrentModel(prev => ({
            ...prev,
            transitions: prev.transitions.filter(t => t.id !== id)
        }));
    };

    const handleUpdateTransition = (id, updates) => {
        setCurrentModel(prev => ({
            ...prev,
            transitions: prev.transitions.map(t => t.id === id ? { ...t, ...updates } : t)
        }));
    };

    const HelpModal = () => (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#1f2937',
                color: 'white',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #374151',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Sticky Header */}
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '1.5rem' }}>
                        {t('studioModel.helpModal.title')}
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid #374151',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{ padding: '30px', overflowY: 'auto', flex: 1, lineHeight: '1.6', fontSize: '0.95rem' }}>
                    <p dangerouslySetInnerHTML={{ __html: t('studioModel.helpModal.intro') }}></p>

                    <h3 style={{ color: '#60a5fa', marginTop: '20px' }}>{t('studioModel.helpModal.concepts.title')}</h3>
                    <ul style={{ marginLeft: '20px', color: '#d1d5db', listStyle: 'none' }}>
                        <li>• {t('studioModel.helpModal.concepts.state')}</li>
                        <li>• {t('studioModel.helpModal.concepts.transition')}</li>
                        <li>• {t('studioModel.helpModal.concepts.rule')}</li>
                    </ul>

                    <h3 style={{ color: '#60a5fa', marginTop: '20px' }}>{t('studioModel.helpModal.workflow.title')}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                            <strong style={{ color: '#3b82f6' }}>{t('studioModel.helpModal.workflow.step1')}</strong>
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                            <strong style={{ color: '#10b981' }}>{t('studioModel.helpModal.workflow.step2')}</strong>
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                            <strong style={{ color: '#f59e0b' }}>{t('studioModel.helpModal.workflow.step3')}</strong>
                        </div>
                        <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                            <strong style={{ color: '#ef4444' }}>{t('studioModel.helpModal.workflow.step4')}</strong>
                        </div>
                    </div>

                    <h3 style={{ color: '#a855f7', marginTop: '20px' }}>{t('studioModel.helpModal.aiIntegration.title')}</h3>
                    <p>{t('studioModel.helpModal.aiIntegration.desc')}</p>
                    <div style={{ backgroundColor: '#111827', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6' }}>
                        <ul style={{ marginLeft: '20px', color: '#d1d5db', fontSize: '0.9rem' }}>
                            <li>{t('studioModel.helpModal.aiIntegration.config')}</li>
                            <li>{t('studioModel.helpModal.aiIntegration.demo')}</li>
                            <li>{t('studioModel.helpModal.aiIntegration.rule')}</li>
                        </ul>
                    </div>

                    <h3 style={{ color: '#f59e0b', marginTop: '20px' }}>{t('studioModel.helpModal.testRun.title')}</h3>
                    <p style={{ fontSize: '0.9rem', color: '#d1d5db' }}>{t('studioModel.helpModal.testRun.desc')}</p>
                    <ul style={{ marginLeft: '20px', color: '#d1d5db', fontSize: '0.85rem' }}>
                        <li><strong>{t('studioModel.helpModal.navigation.tabTest')}</strong></li>
                        <li>• {t('studioModel.helpModal.testRun.panel')}</li>
                        <li>• {t('studioModel.helpModal.testRun.console')}</li>
                        <li>• {t('studioModel.helpModal.testRun.timeline')}</li>
                        <li>• {t('studioModel.helpModal.testRun.analytics')}</li>
                    </ul>

                    <h3 style={{ color: '#ef4444', marginTop: '20px' }}>{t('studioModel.helpModal.tips.title')}</h3>
                    <ul style={{ marginLeft: '20px', color: '#d1d5db', fontSize: '0.85rem' }}>
                        <li>• {t('studioModel.helpModal.tips.colors')}</li>
                        <li>• {t('studioModel.helpModal.tips.holding')}</li>
                        <li>• {t('studioModel.helpModal.tips.refresh')}</li>
                    </ul>
                </div>

                {/* Footer Action */}
                <div style={{ padding: '20px 30px', borderTop: '1px solid #374151' }}>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            padding: '12px 24px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '1rem'
                        }}
                    >
                        {t('studioModel.helpModal.close')}
                    </button>
                </div>
            </div>
        </div>
    );

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (canUndoModel) undoModel();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                if (canRedoModel) redoModel();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [canUndoModel, undoModel, canRedoModel, redoModel]);

    // DUPLICATE STATE
    const handleDuplicateState = async (stateId) => {
        const originalState = currentModel.states.find(s => s.id === stateId);
        if (!originalState) return;

        const newState = {
            ...originalState,
            id: `s_${Date.now()}`,
            name: `${originalState.name} (Copy)`,
            position: originalState.position ? { x: originalState.position.x + 20, y: originalState.position.y + 20 } : null
        };

        const updatedStates = [...currentModel.states, newState];
        setCurrentModel({ ...currentModel, states: updatedStates });
        await showAlert(t('common.success'), `Duplicated state: ${newState.name}`);
    };

    const handleUpdateStatePosition = (stateId, position) => {
        handleUpdateState(stateId, 'position', position);
    };

    // --- PORTABILITY & TEMPLATES ---

    const handleExportModel = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentModel, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `model_${model.id}_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportModel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonObj = JSON.parse(event.target.result);
                // Simple validation
                if (!jsonObj.states || !jsonObj.transitions) {
                    await showAlert(t('common.error'), "Invalid model file format.");
                    return;
                }
                setCurrentModel({ ...jsonObj, id: model.id }); // Keep original ID to avoid db mismatch
                await showAlert(t('common.success'), "Model imported successfully!");
            } catch (err) {
                console.error(err);
                await showAlert(t('common.error'), "Error parsing JSON file");
            }
        };
        reader.readAsText(file);
    };

    const handleTmFileUpload = (e, modelId, fileType) => {
        const file = e.target.files[0];
        if (file) {
            setTmFiles(prev => ({
                ...prev,
                [modelId]: { ...prev[modelId], [fileType]: file }
            }));
        }
    };

    const handleLoadTmFromFiles = async (modelId) => {
        const files = tmFiles[modelId];
        if (!files || !files.model || !files.weights || !files.metadata) {
            await showAlert(t('common.warning'), "Please upload all 3 required files: model.json, weights.bin, and metadata.json");
            return;
        }

        const modelItem = currentModel.tmModels.find(m => m.id === modelId);
        if (!modelItem) return;

        setTmLoadingStates(prev => ({ ...prev, [modelId]: true }));
        try {
            await tmDetector.loadModel(modelId, files, modelItem.type || 'image');
            await showAlert(t('common.success'), "✅ Local Model Loaded Successfully!");
        } catch (e) {
            console.error("Failed to load local TM model:", e);
            await showAlert(t('common.error'), "❌ Failed to load local model: " + e.message);
        } finally {
            setTmLoadingStates(prev => ({ ...prev, [modelId]: false }));
        }
    };

    const handleAddTmModel = () => {
        const newModel = {
            id: `tm_${Date.now()}`,
            name: `New TM Model ${currentModel.tmModels.length + 1}`,
            url: '',
            type: 'image'
        };
        setCurrentModel(prev => ({
            ...prev,
            tmModels: [...(prev.tmModels || []), newModel]
        }));
    };

    const handleRemoveTmModel = (id) => {
        setCurrentModel(prev => ({
            ...prev,
            tmModels: prev.tmModels.filter(m => m.id !== id)
        }));
        // Clean up from detector
        tmDetector.unloadModel(id);
    };

    const handleUpdateTmModel = (id, updates) => {
        setCurrentModel(prev => ({
            ...prev,
            tmModels: prev.tmModels.map(m => m.id === id ? { ...m, ...updates } : m)
        }));
    };

    const handleLoadTemplate = async (templateId) => {
        const template = MODEL_TEMPLATES.find(t => t.id === templateId);
        if (!template) return;

        if (await showConfirm(t('common.confirm'), `Load "${template.name}"? This will REPLACE your current states.`)) {
            setCurrentModel({
                ...currentModel,
                states: template.states,
                transitions: template.transitions
            });
            setShowTemplateModal(false);
        }
    };

    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const fileImportRef = useRef(null);

    const styles = {
        container: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#111827',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        },
        header: {
            height: '64px',
            borderBottom: '1px solid #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            backgroundColor: '#1f2937'
        },
        headerLeft: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
        },
        backButton: {
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center'
        },
        titleInput: {
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid #374151',
            borderRadius: '6px',
            padding: '4px 12px',
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: 'bold',
            outline: 'none',
            width: '400px',
            transition: 'all 0.2s'
        },
        saveButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            background: '#2563eb',
            borderRadius: '8px',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: '600'
        },
        workspace: {
            flex: 1,
            display: 'grid',
            gridTemplateColumns: isMaximized ? '0px 0px 1fr' : `${leftPanelWidth}% 1px 1fr`,
            gridTemplateRows: '1fr',
            overflow: 'hidden',
            backgroundColor: '#111827',
            transition: isMaximized ? 'grid-template-columns 0.4s' : 'none'
        },
        resizer: {
            width: '10px', // Wider hit area
            marginLeft: '-5px',
            backgroundColor: isResizing ? '#2563eb' : 'transparent',
            cursor: 'col-resize',
            zIndex: 10,
            transition: 'background-color 0.2s',
            position: 'relative'
        },
        resizerHandle: {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '18px', // Slightly larger handle
            height: '60px',
            backgroundColor: isResizing ? '#2563eb' : '#374151',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #4b5563',
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            transition: 'all 0.2s'
        },
        resizerBar: {
            width: '2px',
            height: '12px',
            backgroundColor: '#6b7280',
            borderRadius: '1px'
        },
        leftPanel: {
            borderRight: '1px solid #374151',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            backgroundColor: '#000'
        },
        uploadOverlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: videoSrc ? 'none' : 'flex'
        },
        uploadButton: {
            padding: '12px 24px',
            background: '#374151',
            border: '1px solid #4b5563',
            borderRadius: '8px',
            color: 'white',
            cursor: 'pointer',
            marginTop: '16px'
        },
        rightPanel: {
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1f2937',
            borderLeft: '1px solid #374151',
            position: 'relative',
            height: '100%',
            overflow: 'hidden'
        },
        maximizeBtn: {
            position: 'absolute',
            left: '-20px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '20px',
            height: '60px',
            backgroundColor: '#374151',
            border: '1px solid #4b5563',
            borderRight: 'none',
            borderRadius: '8px 0 0 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#9ca3af',
            cursor: 'pointer',
            zIndex: 100,
            transition: 'all 0.2s'
        },
        tabs: {
            display: 'flex',
            borderBottom: '1px solid #374151',
            backgroundColor: '#111827',
            padding: '0 10px',
            gap: '4px'
        },
        tab: (active) => ({
            padding: '12px 16px',
            cursor: 'pointer',
            color: active ? '#60a5fa' : '#9ca3af',
            borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent',
            fontSize: '0.85rem',
            fontWeight: active ? '600' : '500',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: active ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            flex: 1,
            justifyContent: 'center'
        }),
        emptyState: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px',
            textAlign: 'center',
            color: '#9ca3af',
            background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)'
        },
        emptyIcon: {
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6',
            marginBottom: '24px'
        },
        emptyTitle: {
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '12px'
        },
        emptyDesc: {
            maxWidth: '400px',
            lineHeight: '1.6',
            marginBottom: '32px'
        },
        emptyCard: {
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '600px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
        },
        emptyAction: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            padding: '20px',
            backgroundColor: '#374151',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'transform 0.2s, background 0.2s',
            border: '1px solid transparent'
        },
        content: {
            flex: 1,
            padding: '24px 24px 150px 24px', // Increased bottom padding
            overflowY: 'auto',
            backgroundColor: '#111827' // Matching RuleEditor background
        }
    };

    return (
        <div style={styles.container}>
            <style>
                {`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(0, 0, 0, 0.1);
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: #4b5563;
                        border-radius: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: #6b7280;
                    }
                    .custom-scrollbar {
                        scrollbar-width: thin;
                        scrollbar-color: #4b5563 transparent;
                    }
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
            <StudioAssistant model={currentModel} />
            {showHelp && <HelpModal />}
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.headerLeft}>
                    {/* ... back button and title input ... */}
                    <button
                        style={styles.backButton}
                        onClick={onClose}
                        onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <input
                        value={currentModel.name}
                        onChange={(e) => setCurrentModel({ ...currentModel, name: e.target.value })}
                        style={styles.titleInput}
                        onFocus={(e) => {
                            e.target.style.background = '#111827';
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.2)';
                        }}
                        onBlur={(e) => {
                            e.target.style.background = 'rgba(0,0,0,0.2)';
                            e.target.style.borderColor = '#374151';
                            e.target.style.boxShadow = 'none';
                        }}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginRight: '16px', borderRight: '1px solid #4b5563', paddingRight: '16px' }}>
                        <button
                            onClick={undoModel}
                            disabled={!canUndoModel}
                            style={{ ...styles.iconButton, opacity: canUndoModel ? 1 : 0.5, cursor: canUndoModel ? 'pointer' : 'default' }}
                            title={`${t('studioModel.modelBuilder.buttons.undo')} (Ctrl+Z)`}
                        >
                            <Undo size={18} color="#e5e7eb" />
                        </button>
                        <button
                            onClick={redoModel}
                            disabled={!canRedoModel}
                            style={{ ...styles.iconButton, opacity: canRedoModel ? 1 : 0.5, cursor: canRedoModel ? 'pointer' : 'default' }}
                            title={`${t('studioModel.modelBuilder.buttons.redo')} (Ctrl+Y)`}
                        >
                            <Redo size={18} color="#e5e7eb" />
                        </button>
                    </div>
                    <button
                        style={{ ...styles.saveButton, background: '#4b5563' }}
                        onClick={() => setShowHelp(true)}
                    >
                        ? {t('studioModel.helpButton')}
                    </button>
                    <button style={styles.saveButton} onClick={handleSave}>
                        <Save size={18} />
                        {t('studioModel.modelBuilder.buttons.save')}
                    </button>
                </div>
            </div>

            {/* ... rest of the component ... */}


            {/* Workspace */}
            <div style={styles.workspace}>
                {/* Left Panel: Video & Detection */}
                <div style={styles.leftPanel}>
                    {isMaximized && (
                        <div style={{
                            position: 'absolute',
                            top: 10,
                            right: 10,
                            zIndex: 100,
                            backgroundColor: 'rgba(0,0,0,0.8)',
                            padding: '4px 12px',
                            height: '24px',
                            borderRadius: '10px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            color: 'white',
                            border: '1px solid rgba(255,255,255,0.1)',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center'
                        }}>
                            {t('studioModel.modelBuilder.labels.videoSidebar')}
                        </div>
                    )}
                    {/* Custom Video Player with ROI Canvas */}
                    <div style={{
                        flex: 1,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'black',
                        overflow: 'hidden'
                    }}>
                        {testModeInput === 'simulator' ? (
                            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                                <PoseSimulator onPoseUpdate={handlePoseDetected} />
                                <button
                                    onClick={() => setTestModeInput('video')}
                                    style={{
                                        position: 'absolute',
                                        bottom: '20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 100,
                                        padding: '10px 24px',
                                        background: '#1f2937',
                                        border: '1px solid #3b82f6',
                                        color: 'white',
                                        borderRadius: '30px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                                        fontWeight: '600',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <ArrowLeft size={18} /> {t('studioModel.modelBuilder.buttons.backToVideo')}
                                </button>
                            </div>
                        ) : (testModeInput === 'video' && videoSrc) ? (
                            <>
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        display: 'block'
                                    }}
                                    controls
                                    onLoadedMetadata={() => {
                                        if (canvasRef.current && videoRef.current) {
                                            canvasRef.current.width = videoRef.current.clientWidth;
                                            canvasRef.current.height = videoRef.current.clientHeight;
                                        }
                                    }}
                                />
                                <canvas
                                    ref={canvasRef}
                                    onMouseDown={(e) => {
                                        if (isDrawingROI) startDrawingROI(e);
                                    }}
                                    onMouseMove={(e) => {
                                        if (isDrawingROI) drawROI(e);
                                    }}
                                    onMouseUp={(e) => {
                                        if (isDrawingROI) endDrawingROI(e);
                                    }}
                                    onClick={handleCanvasClick}
                                    style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0, bottom: 0,
                                        width: '100%', height: '100%',
                                        pointerEvents: (isDrawingROI || (measurementMode && isVideoPaused)) ? 'auto' : 'none',
                                        cursor: isDrawingROI ? 'crosshair' : (measurementMode ? 'pointer' : 'default'),
                                        zIndex: 10
                                    }}
                                />
                                {activeTab === 'states' && selectedStateId && (
                                    <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 20 }}>
                                    </div>
                                )}



                                {/* POSE DETECTOR LOADING INDICATOR */}
                                {loadingDetector && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '80px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 50,
                                        backgroundColor: 'rgba(31, 41, 55, 0.95)',
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '12px',
                                        padding: '12px 20px',
                                        border: '1px solid #374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}>
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            border: '2px solid #3b82f6',
                                            borderTopColor: 'transparent',
                                            borderRadius: '50%',
                                            animation: 'spin 1s linear infinite'
                                        }} />
                                        <span style={{ color: 'white', fontSize: '0.875rem' }}>
                                            {t('studioModel.modelBuilder.indicators.loadingPose')}
                                        </span>
                                    </div>
                                )}

                                {/* DETECTOR READY INDICATOR */}
                                {detectorReady && !loadingDetector && !activePose && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '80px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        zIndex: 50,
                                        backgroundColor: 'rgba(16, 185, 129, 0.9)',
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: '12px',
                                        padding: '12px 20px',
                                        border: '1px solid #10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}>
                                        <Check size={18} style={{ color: 'white' }} />
                                        <span style={{ color: 'white', fontSize: '0.875rem' }}>
                                            {t('studioModel.modelBuilder.indicators.detectorReady')}
                                        </span>
                                    </div>
                                )}

                                {/* SKELETON MEASUREMENT TOOLBAR */}
                                {isVideoPaused && (
                                    <div style={{
                                        position: 'absolute',
                                        left: '20px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        zIndex: 50,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '12px'
                                    }}>
                                        <div style={{
                                            backgroundColor: 'rgba(31, 41, 55, 0.4)',
                                            backdropFilter: 'blur(4px)',
                                            borderRadius: '16px',
                                            padding: '8px',
                                            border: '1px solid #374151',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '8px',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                            width: 'fit-content'
                                        }}>
                                            <div style={{
                                                padding: '4px 8px',
                                                fontSize: '0.65rem',
                                                fontWeight: '700',
                                                color: '#60a5fa',
                                                textAlign: 'center',
                                                borderBottom: '1px solid #374151',
                                                marginBottom: '4px'
                                            }}>RULER</div>

                                            <button
                                                onClick={() => setMeasurementMode(measurementMode === 'distance' ? null : 'distance')}
                                                style={{
                                                    backgroundColor: measurementMode === 'distance' ? '#3b82f6' : 'transparent',
                                                    border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                                }}
                                                title={t('studioModel.modelBuilder.measure.measureDistance')}
                                            >
                                                <Ruler size={20} />
                                            </button>
                                            <button
                                                onClick={() => setMeasurementMode(measurementMode === 'angle' ? null : 'angle')}
                                                style={{
                                                    backgroundColor: measurementMode === 'angle' ? '#3b82f6' : 'transparent',
                                                    border: 'none', padding: '10px', borderRadius: '12px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                                                }}
                                                title={t('studioModel.modelBuilder.measure.measureAngle')}
                                            >
                                                <RotateCw size={20} />
                                            </button>

                                            {(measurementMode || selectedMeasurePoints.length > 0) && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedMeasurePoints([]);
                                                        setMeasurementResult(null);
                                                    }}
                                                    style={{
                                                        width: '44px',
                                                        height: '44px',
                                                        borderRadius: '12px',
                                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                        color: '#ef4444',
                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={t('studioModel.modelBuilder.measure.clear')}
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>

                                        {/* RESULT DISPLAY */}
                                        {measurementResult && (
                                            <div style={{
                                                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                                                backdropFilter: 'blur(4px)',
                                                borderRadius: '16px',
                                                padding: '12px',
                                                border: '1px solid #374151',
                                                color: 'white',
                                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                                width: '160px',
                                                animation: 'fadeIn 0.3s ease-out'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{t('studioModel.modelBuilder.measure.result')}</span>
                                                    <button onClick={() => { setMeasurementResult(null); setSelectedMeasurePoints([]); }} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                                                </div>

                                                {measurementResult.distance !== null && (
                                                    <div style={{ marginBottom: '8px' }}>
                                                        <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: '600', marginBottom: '2px' }}>{t('studioModel.modelBuilder.measure.distance')}</div>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                                                            <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{measurementResult.distance.toFixed(1)}<span style={{ fontSize: '0.7rem', color: '#60a5fa', marginLeft: '2px' }}>%</span></div>
                                                            <div style={{ fontSize: '0.9rem', color: '#9ca3af' }}>{measurementResult.pixelDistance?.toFixed(0)}<span style={{ fontSize: '0.6rem', color: '#9ca3af', marginLeft: '2px' }}>px</span></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {measurementResult.angle !== null && (
                                                    <div>
                                                        <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: '600', marginBottom: '2px' }}>{t('studioModel.modelBuilder.measure.angle')}</div>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#3b82f6' }}>
                                                            {measurementResult.angle.toFixed(1)}<span style={{ fontSize: '0.7rem', marginLeft: '2px' }}>°</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={handleAddRuleFromMeasurement}
                                                    style={{
                                                        marginTop: '8px',
                                                        width: '100%',
                                                        padding: '8px',
                                                        backgroundColor: '#2563eb',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <Plus size={14} /> {t('studioModel.modelBuilder.measure.addToRule')}
                                                </button>
                                            </div>
                                        )}

                                        {measurementMode && !measurementResult && (
                                            <div style={{
                                                backgroundColor: 'rgba(31, 41, 55, 0.4)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                color: '#60a5fa',
                                                fontSize: '0.75rem',
                                                fontWeight: '600',
                                                border: '1px solid rgba(96, 165, 250, 0.3)'
                                            }}>
                                                {t('studioModel.modelBuilder.measure.hint')}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={styles.emptyState}>
                                <div style={styles.emptyIcon}>
                                    <Video size={40} />
                                </div>
                                <h2 style={styles.emptyTitle}>{t('studioModel.modelBuilder.title')}</h2>
                                <p style={styles.emptyDesc}>
                                    {t('studioModel.subtitle')}
                                </p>

                                <div style={styles.emptyCard}>
                                    <div style={styles.emptyAction} onClick={() => fileInputRef.current.click()}>
                                        <div style={{ ...styles.emptyIcon, width: '40px', height: '40px', marginBottom: '8px' }}>
                                            <Box size={20} />
                                        </div>
                                        <div style={{ fontWeight: '600', color: 'white' }}>{t('studioModel.modelBuilder.labels.localFile')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>MP4/WebM</div>
                                    </div>

                                    <div style={styles.emptyAction} onClick={handleOpenProjectPicker}>
                                        <div style={{ ...styles.emptyIcon, width: '40px', height: '40px', marginBottom: '8px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                                            <Layers size={20} />
                                        </div>
                                        <div style={{ fontWeight: '600', color: 'white' }}>{t('studioModel.modelBuilder.labels.projectVault')}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('studioModel.modelBuilder.labels.selectFromProject')}</div>
                                    </div>

                                    <div onClick={() => setShowIPCameraModal(true)} style={{ ...styles.emptyAction, gridColumn: 'span 2' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ ...styles.emptyIcon, width: '40px', height: '40px', marginBottom: 0, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
                                                <Activity size={20} />
                                            </div>
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: '600', color: 'white' }}>{t('studioModel.modelBuilder.buttons.liveCamera')}</div>
                                                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>IP Camera / WebRTC / RTSP</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Project Picker Modal */}
                    {showProjectPicker && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                backgroundColor: '#1f2937', padding: '24px', borderRadius: '12px',
                                width: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ color: 'white', margin: 0 }}>{t('studioModel.modelBuilder.projectPicker.title')}</h3>
                                    <button onClick={() => setShowProjectPicker(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {availableProjects.length === 0 ? (
                                        <p style={{ color: '#9ca3af', textAlign: 'center' }}>{t('studioModel.modelBuilder.projectPicker.noProjects')}</p>
                                    ) : (
                                        availableProjects.map(p => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectProject(p)}
                                                style={{
                                                    padding: '12px', borderRadius: '8px', backgroundColor: '#374151',
                                                    cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                                            >
                                                <div>
                                                    <div style={{ color: 'white', fontWeight: 'bold' }}>{p.projectName}</div>
                                                    <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{new Date(p.createdAt).toLocaleDateString()}</div>
                                                </div>
                                                <div style={{ color: '#60a5fa' }}>{t('studioModel.modelBuilder.projectPicker.select')}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* IP Camera Recording Modal */}
                    {showIPCameraModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 2000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                backgroundColor: '#1f2937', padding: '24px', borderRadius: '12px',
                                width: '600px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                                border: '1px solid #374151'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ color: 'white', margin: 0 }}>📹 {t('studioModel.modelBuilder.ipCamera.title')}</h3>
                                    <button
                                        onClick={() => {
                                            setShowIPCameraModal(false);
                                            setIpCameraURL('');
                                            setIsRecording(false);
                                        }}
                                        style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '1.2rem' }}
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* URL Input */}
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px', fontSize: '0.9rem' }}>
                                        {t('studioModel.modelBuilder.ipCamera.streamUrl')}
                                    </label>
                                    <input
                                        type="text"
                                        value={ipCameraURL}
                                        onChange={(e) => setIpCameraURL(e.target.value)}
                                        placeholder="http://192.168.1.100/mjpeg"
                                        style={{
                                            width: '100%', padding: '10px', backgroundColor: '#111827',
                                            border: '1px solid #374151', borderRadius: '6px', color: 'white',
                                            outline: 'none'
                                        }}
                                        disabled={isRecording}
                                    />
                                </div>

                                {/* Live Preview */}
                                <div style={{
                                    backgroundColor: '#000', borderRadius: '8px', marginBottom: '16px',
                                    height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid #374151', position: 'relative', overflow: 'hidden'
                                }}>
                                    {testModeInput === 'simulator' ? (
                                        <div style={{ width: '100%', height: '100%' }}>
                                            <PoseSimulator onPoseUpdate={handlePoseDetected} />
                                        </div>
                                    ) : ipCameraURL ? (
                                        <>
                                            <img
                                                ref={ipCameraRef}
                                                src={ipCameraURL}
                                                alt="IP Camera Feed"
                                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                                crossOrigin="anonymous"
                                            />
                                            {isRecording && (
                                                <div style={{
                                                    position: 'absolute', top: '10px', left: '10px',
                                                    backgroundColor: 'rgba(239, 68, 68, 0.9)', padding: '8px 12px',
                                                    borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '8px',
                                                    color: 'white', fontWeight: 'bold'
                                                }}>
                                                    <div style={{
                                                        width: '12px', height: '12px', borderRadius: '50%',
                                                        backgroundColor: 'white', animation: 'pulse 1s infinite'
                                                    }} />
                                                    {t('studioModel.modelBuilder.ipCamera.recording')} {recordingDuration}s / 30s
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div style={{ color: '#6b7280', textAlign: 'center' }}>
                                            <Camera size={48} style={{ marginBottom: '8px', opacity: 0.5 }} />
                                            <p>{t('studioModel.modelBuilder.ipCamera.previewHint')}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Recording Controls */}
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    {!isRecording ? (
                                        <button
                                            onClick={handleStartRecording}
                                            disabled={!ipCameraURL}
                                            style={{
                                                flex: 1, padding: '12px', backgroundColor: ipCameraURL ? '#10b981' : '#374151',
                                                color: 'white', border: 'none', borderRadius: '8px',
                                                fontWeight: 'bold', cursor: ipCameraURL ? 'pointer' : 'not-allowed',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Play size={18} /> Start Recording
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleStopRecording}
                                            style={{
                                                flex: 1, padding: '12px', backgroundColor: '#ef4444',
                                                color: 'white', border: 'none', borderRadius: '8px',
                                                fontWeight: 'bold', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Square size={18} /> Stop Recording
                                        </button>
                                    )}
                                </div>

                                <p style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '12px', marginBottom: 0 }}>
                                    💡 Tip: Recording will automatically stop after 30 seconds. Make sure the camera URL is accessible.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Resizer */}
                {!isMaximized && (
                    <div
                        style={{ ...styles.resizer, gridColumn: '2' }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsResizing(true);
                        }}
                    >
                        <div style={styles.resizerHandle}>
                            <div style={styles.resizerBar} />
                            <div style={styles.resizerBar} />
                            <div style={styles.resizerBar} />
                        </div>
                    </div>
                )}

                {/* Right Panel: Editor & Statistics */}
                <div style={styles.rightPanel}>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="video/*"
                        onChange={handleFileUpload}
                    />
                    {/* VISUAL TIMELINE (Always at the top of right panel when testing) */}
                    {videoSrc && activeTab === 'test' && (
                        <div style={{
                            height: '60px',
                            backgroundColor: '#111827',
                            borderBottom: '1px solid #374151',
                            padding: '10px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.7rem', color: '#9ca3af', fontWeight: 'bold' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Activity size={12} color="#3b82f6" />
                                    <span>MOTION TIMELINE</span>
                                </div>
                                {videoRef.current && <span>{videoRef.current.currentTime.toFixed(2)}s / {videoRef.current.duration?.toFixed(2)}s</span>}
                            </div>
                            <div style={{
                                height: '28px',
                                backgroundColor: '#1f2937',
                                position: 'relative',
                                borderRadius: '6px',
                                border: '1px solid #374151',
                                overflow: 'hidden',
                                cursor: 'crosshair'
                            }}
                                onClick={(e) => {
                                    if (!videoRef.current) return;
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = e.clientX - rect.left;
                                    const pct = x / rect.width;
                                    videoRef.current.currentTime = pct * videoRef.current.duration;
                                }}
                            >
                                {timelineData.map((event, idx) => {
                                    const duration = videoRef.current ? videoRef.current.duration : 1;
                                    if (!duration) return null;

                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                                    const colorIdx = (typeof event.state === 'string' ? event.state.length : 0) % colors.length;

                                    const left = (event.startTime / duration) * 100;
                                    let width = ((event.endTime - event.startTime) / duration) * 100;
                                    if (width < 0.5) width = 0.5;

                                    return (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'absolute',
                                                left: `${left}%`,
                                                width: `${width}%`,
                                                height: '100%',
                                                backgroundColor: colors[colorIdx],
                                                opacity: event.isActive ? 1 : 0.8,
                                                borderRight: '1px solid rgba(0,0,0,0.2)',
                                                fontSize: '0.65rem',
                                                color: 'white',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                paddingLeft: '4px',
                                                lineHeight: '28px',
                                                fontWeight: '600'
                                            }}
                                            title={`${event.state}: ${event.startTime.toFixed(2)}s - ${event.endTime.toFixed(2)}s`}
                                        >
                                            {width > 8 && event.state}
                                        </div>
                                    );
                                })}
                                <div style={{
                                    position: 'absolute',
                                    left: `${(videoRef.current?.currentTime / (videoRef.current?.duration || 1)) * 100}%`,
                                    top: 0, bottom: 0, width: '2px', backgroundColor: '#fff', zIndex: 10,
                                    boxShadow: '0 0 8px rgba(255,255,255,0.8)'
                                }} />
                            </div>
                        </div>
                    )}
                    {/* Maximize Toggle */}
                    <button
                        style={styles.maximizeBtn}
                        onClick={() => setIsMaximized(!isMaximized)}
                        onMouseOver={e => e.currentTarget.style.color = 'white'}
                        onMouseOut={e => e.currentTarget.style.color = '#9ca3af'}
                        title={isMaximized ? t('studioModel.modelBuilder.tooltips.restoreLayout') : t('studioModel.modelBuilder.tooltips.maximizeEditor')}
                    >
                        {isMaximized ? <Plus size={14} style={{ transform: 'rotate(45deg)' }} /> : <Plus size={14} />}
                    </button>
                    <div style={styles.tabs}>
                        {[
                            { id: 'rules', label: t('studioModel.modelBuilder.tabs.rules'), icon: <Activity size={16} /> },
                            { id: 'states', label: `${t('studioModel.modelBuilder.tabs.steps')} (${currentModel.states.length})`, icon: <Layers size={16} /> },
                            { id: 'extraction', label: t('studioModel.modelBuilder.tabs.data'), icon: <Database size={16} /> },
                            { id: 'test', label: t('studioModel.modelBuilder.tabs.test'), icon: <PlayCircle size={16} /> },
                            { id: 'settings', label: t('studioModel.modelBuilder.tabs.settings'), icon: <Settings size={16} /> }
                        ].map(t => (
                            <div
                                key={t.id}
                                style={styles.tab(activeTab === t.id)}
                                onClick={() => setActiveTab(t.id)}
                            >
                                {t.icon}
                                {t.label}
                            </div>
                        ))}
                    </div>

                    <div style={styles.content} className="custom-scrollbar">
                        {activeTab === 'test' && (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 10px' }}>
                                    <button
                                        onClick={() => fileInputRef.current.click()}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            background: '#111827',
                                            color: '#60a5fa',
                                            border: '1px solid #374151',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            flex: 0.8,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                        title={t('studioModel.modelBuilder.tooltips.changeVideo')}
                                    >
                                        <Upload size={16} /> {videoSrc ? t('studioModel.modelBuilder.buttons.changeVideo') : t('studioModel.modelBuilder.buttons.uploadVideo')}
                                    </button>
                                    {videoSrc && (
                                        <button
                                            onClick={() => setTestModeInput('video')}
                                            style={{
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                background: testModeInput === 'video' ? '#3b82f6' : '#111827',
                                                color: 'white',
                                                border: testModeInput === 'video' ? '1px solid #60a5fa' : '1px solid #374151',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '0.85rem',
                                                flex: 1,
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            <Video size={16} /> Reference Video
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setTestModeInput('camera')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            background: testModeInput === 'camera' ? '#3b82f6' : '#111827',
                                            color: 'white',
                                            border: testModeInput === 'camera' ? '1px solid #60a5fa' : '1px solid #374151',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            flex: 1,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Camera size={16} /> Live Camera
                                    </button>
                                    <button
                                        onClick={() => setTestModeInput('simulator')}
                                        style={{
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            background: testModeInput === 'simulator' ? '#8b5cf6' : '#111827',
                                            color: 'white',
                                            border: testModeInput === 'simulator' ? '1px solid #a78bfa' : '1px solid #374151',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            flex: 1,
                                            justifyContent: 'center',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Activity size={16} /> Simulator
                                    </button>
                                </div>
                                <div style={{
                                    padding: '20px',
                                    backgroundColor: currentTestState ? '#064e3b' : '#374151',
                                    borderRadius: '12px',
                                    marginBottom: '20px',
                                    textAlign: 'center',
                                    border: currentTestState ? '2px solid #10b981' : '1px solid #4b5563',
                                    transition: 'all 0.3s'
                                }}>
                                    <h4 style={{ margin: 0, color: '#9ca3af', fontSize: '0.9rem', uppercase: true }}>{t('studioModel.modelBuilder.labels.currentState')}</h4>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', marginTop: '8px' }}>
                                        {currentTestState || t('studioModel.modelBuilder.indicators.waiting')}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: '#d1d5db', marginTop: '4px' }}>
                                        {currentTestState ? t('studioModel.modelBuilder.indicators.logicMatched') : t('studioModel.modelBuilder.indicators.playToTest')}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                                    {/* Console Logs */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Live Console</h3>
                                            <button
                                                onClick={() => setTestLogs([])}
                                                style={{ background: 'transparent', border: '1px solid #4b5563', color: '#9ca3af', padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', cursor: 'pointer' }}
                                            >
                                                {t('studioModel.modelBuilder.buttons.clearConsole')}
                                            </button>
                                        </div>
                                        <div style={{
                                            flex: 1,
                                            backgroundColor: '#000',
                                            borderRadius: '8px',
                                            padding: '12px',
                                            overflowY: 'auto',
                                            fontFamily: 'monospace',
                                            fontSize: '0.85rem',
                                            border: '1px solid #374151'
                                        }}>
                                            {testLogs.length === 0 && <span style={{ color: '#6b7280' }}>{t('studioModel.modelBuilder.indicators.systemReady')}</span>}
                                            {testLogs.map((log, i) => (
                                                <div key={i} style={{
                                                    color: log.type === 'transition' ? '#10b981' : (log.type === 'Anomaly' ? '#ef4444' : '#d1d5db'),
                                                    backgroundColor: log.type === 'Anomaly' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    borderLeft: log.type === 'Anomaly' ? '4px solid #ef4444' : 'none',
                                                    marginBottom: '4px'
                                                }}>
                                                    <span style={{ color: '#6b7280' }}>[{log.timestamp}]</span> {log.message}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Cycle Statistics Panel */}
                                    <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <h3 style={{ margin: 0, fontSize: '1rem' }}>Cycle Analytics</h3>
                                            <button
                                                onClick={() => generatePDFReport(currentModel, cycleStats, 'cycle-chart-container')}
                                                disabled={!cycleStats}
                                                title="Export PDF Report"
                                                style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', opacity: cycleStats ? 1 : 0.5 }}
                                            >
                                                <FileJson size={18} />
                                            </button>
                                        </div>

                                        <div id="cycle-chart-container">
                                            <CycleTimeChart
                                                timelineData={timelineData}
                                                cycleStats={cycleStats}
                                            />
                                        </div>

                                        <h4 style={{ margin: '16px 0 8px', fontSize: '0.9rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Zap size={14} color="#eab308" /> {t('studioModel.modelBuilder.labels.plcMonitor')}
                                        </h4>
                                        <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151', minHeight: '60px' }}>
                                            {Object.keys(plcSignals).length === 0 ? (
                                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'block', textAlign: 'center' }}>{t('studioModel.modelBuilder.indicators.noSignals')}</span>
                                            ) : (
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                    {Object.entries(plcSignals).map(([id, val]) => (
                                                        <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#374151', padding: '6px 10px', borderRadius: '4px' }}>
                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{id}</span>
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                                backgroundColor: val === 'HIGH' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                color: val === 'HIGH' ? '#10b981' : '#ef4444',
                                                                fontWeight: 'bold', border: val === 'HIGH' ? '1px solid #059669' : '1px solid #b91c1c'
                                                            }}>{val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <h4 style={{ margin: '10px 0 0', fontSize: '0.9rem', color: '#9ca3af' }}>{t('studioModel.modelBuilder.labels.detailedMetrics')}</h4>

                                        {!cycleStats ? (
                                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #374151', borderRadius: '8px', color: '#6b7280', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
                                                {t('studioModel.modelBuilder.indicators.completeCycle')}
                                            </div>
                                        ) : (
                                            <>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                    <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.labels.totalCycles')}</div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{cycleStats.totalCycles}</div>
                                                    </div>
                                                    <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.labels.vaRatio')}</div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{cycleStats.vaRatio}%</div>
                                                    </div>
                                                </div>

                                                <div style={{ backgroundColor: '#1f2937', padding: '16px', borderRadius: '8px', border: '1px solid #374151' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '8px' }}>{t('studioModel.modelBuilder.labels.avgStats')}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                        <span style={{ fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.labels.cycleTime')}</span>
                                                        <span style={{ fontWeight: 'bold' }}>{cycleStats.avgCycleTime}s</span>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <span style={{ fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.labels.vaTime')}</span>
                                                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{cycleStats.avgVaTime}s</span>
                                                    </div>
                                                </div>

                                                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '8px' }}>{t('studioModel.modelBuilder.labels.cycleHistory')}</div>
                                                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }} className="custom-scrollbar">
                                                        {cycleStats.history.slice().reverse().map((c, idx) => (
                                                            <div key={idx} style={{ padding: '8px', backgroundColor: '#111827', borderRadius: '4px', fontSize: '0.8rem', border: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span style={{ color: '#9ca3af' }}>Cycle #{cycleStats.totalCycles - idx}</span>
                                                                <span>{c.duration.toFixed(2)}s <span style={{ color: '#10b981', marginLeft: '4px' }}>({((c.vaDuration / c.duration) * 100).toFixed(0)}% VA)</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'rules' && (
                            <RuleEditor
                                states={currentModel.states}
                                transitions={currentModel.transitions}
                                onAddTransition={handleAddTransition}
                                onDeleteTransition={handleDeleteTransition}
                                onUpdateTransition={handleUpdateTransition}
                                activePose={activePose}
                                onAiSuggest={handleAiSuggestRule}
                                onAiValidateScript={handleAiValidateScript}
                                tmModels={currentModel.tmModels}
                                rfModels={currentModel.rfModels}
                                selectedStateId={selectedStateId}
                                onSelectState={setSelectedStateId}
                                onCaptureSequence={handleCaptureSequence}
                                captureBufferStatus={captureBufferStatus}
                            />
                        )}

                        {activeTab === 'states' && (
                            <div>
                                <h3 style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    {t('studioModel.modelBuilder.labels.definedStates')}
                                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                                        <button
                                            onClick={() => setTestModeInput('camera')}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: testModeInput === 'camera' ? '#3b82f6' : '#374151',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t('studioModel.modelBuilder.labels.camera')}
                                        </button>
                                        <button
                                            onClick={() => setTestModeInput('simulator')}
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                background: testModeInput === 'simulator' ? '#3b82f6' : '#374151',
                                                color: 'white',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {t('studioModel.modelBuilder.labels.simulator')}
                                        </button>
                                        <button
                                            onClick={handleAddState}
                                            style={{
                                                padding: '4px 12px',
                                                borderRadius: '4px',
                                                background: 'rgba(59, 130, 246, 0.1)',
                                                color: '#60a5fa',
                                                border: '1px dashed #3b82f6',
                                                cursor: 'pointer',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            <Plus size={14} /> {t('studioModel.modelBuilder.labels.addState')}
                                        </button>
                                    </div>
                                </h3>

                                <div style={{ marginBottom: '20px' }}>
                                    <StateDiagram
                                        states={currentModel.states}
                                        transitions={currentModel.transitions}
                                        selectedStateId={selectedStateId}
                                        onSelectState={setSelectedStateId}
                                        activeState={activeTab === 'test' ? currentTestState : null}
                                        onUpdateStatePosition={handleUpdateStatePosition}
                                        onAddTransition={handleAddTransition}
                                    />
                                </div>
                                {selectedStateId ? (
                                    // Detailed View for Selected State
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <button onClick={() => setSelectedStateId(null)} style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <ArrowLeft size={14} /> {t('studioModel.modelBuilder.labels.backToList')}
                                        </button>

                                        {/* State Name */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.labels.stateName')}</label>
                                            <input
                                                value={currentModel.states.find(s => s.id === selectedStateId)?.name || ''}
                                                onChange={(e) => handleUpdateStateName(selectedStateId, e.target.value)}
                                                style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #374151', color: 'white', borderRadius: '4px' }}
                                            />
                                        </div>

                                        {/* Duration */}
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.labels.minDuration')}</label>
                                            <input
                                                type="number"
                                                step="0.1"
                                                value={currentModel.states.find(s => s.id === selectedStateId)?.minDuration || 0}
                                                onChange={(e) => handleUpdateState(selectedStateId, 'minDuration', parseFloat(e.target.value))}
                                                style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #374151', color: 'white', borderRadius: '4px' }}
                                            />
                                        </div>


                                        {/* Value Added Toggle */}
                                        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!currentModel.states.find(s => s.id === selectedStateId)?.isVA}
                                                    onChange={(e) => handleUpdateState(selectedStateId, 'isVA', e.target.checked)}
                                                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                                />
                                                <div>
                                                    <div style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem' }}>{t('studioModel.modelBuilder.labels.valueAdded')}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('studioModel.modelBuilder.labels.markEssential')}</div>
                                                </div>
                                            </label>
                                        </div>

                                        {/* ACTION TRIGGERS */}
                                        <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Zap size={16} color="#eab308" /> {t('studioModel.modelBuilder.labels.actionTriggers')}
                                            </h4>

                                            {/* Helper to add action */}
                                            {['onEnter', 'onExit'].map(triggerType => (
                                                <div key={triggerType} style={{ marginBottom: '16px' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '8px', textTransform: 'capitalize' }}>
                                                        {triggerType === 'onEnter' ? `🟢 ${t('studioModel.modelBuilder.buttons.onEnter')}` : `🔴 ${t('studioModel.modelBuilder.buttons.onExit')}`}
                                                    </div>

                                                    {((currentModel.states.find(s => s.id === selectedStateId)?.actions?.[triggerType]) || []).map((action, idx) => (
                                                        <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', background: '#1f2937', padding: '8px', borderRadius: '4px' }}>
                                                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', minWidth: '60px' }}>{action.type}</div>
                                                            <div style={{ flex: 1, fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {action.type === 'SOUND' ? action.payload : action.url}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    const state = currentModel.states.find(s => s.id === selectedStateId);
                                                                    const updatedActions = { ...(state.actions || {}) };
                                                                    updatedActions[triggerType] = updatedActions[triggerType].filter((_, i) => i !== idx);
                                                                    handleUpdateState(selectedStateId, 'actions', updatedActions);
                                                                }}
                                                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    ))}

                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={async () => {
                                                                const url = await showPrompt(t('studioModel.modelBuilder.buttons.addSound'), t('studioModel.modelBuilder.prompts.soundUrl'), "/sounds/beep.mp3");
                                                                if (url) {
                                                                    const state = currentModel.states.find(s => s.id === selectedStateId);
                                                                    const actions = state.actions || { onEnter: [], onExit: [] };
                                                                    const newAction = { type: 'SOUND', payload: url };
                                                                    const updatedActions = {
                                                                        ...actions,
                                                                        [triggerType]: [...(actions[triggerType] || []), newAction]
                                                                    };
                                                                    handleUpdateState(selectedStateId, 'actions', updatedActions);
                                                                }
                                                            }}
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            + {t('studioModel.modelBuilder.buttons.addSound')}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const url = await showPrompt(t('studioModel.modelBuilder.buttons.addWebhook'), t('studioModel.modelBuilder.prompts.webhookUrl'), "https://api.example.com/log");
                                                                if (url) {
                                                                    const state = currentModel.states.find(s => s.id === selectedStateId);
                                                                    const actions = state.actions || { onEnter: [], onExit: [] };
                                                                    const newAction = { type: 'WEBHOOK', url: url, method: 'POST', payload: JSON.stringify({ event: triggerType, state: state.name }) };
                                                                    const updatedActions = {
                                                                        ...actions,
                                                                        [triggerType]: [...(actions[triggerType] || []), newAction]
                                                                    };
                                                                    handleUpdateState(selectedStateId, 'actions', updatedActions);
                                                                }
                                                            }}
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            + {t('studioModel.modelBuilder.buttons.addWebhook')}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const signalId = await showPrompt(t('studioModel.modelBuilder.buttons.addPlc'), t('studioModel.modelBuilder.prompts.plcSignalId'), "DO_01");
                                                                const value = await showPrompt(t('studioModel.modelBuilder.buttons.addPlc'), t('studioModel.modelBuilder.prompts.plcValue'), "HIGH");
                                                                if (signalId && value) {
                                                                    const state = currentModel.states.find(s => s.id === selectedStateId);
                                                                    const actions = state.actions || { onEnter: [], onExit: [] };
                                                                    const newAction = { type: 'PLC', payload: JSON.stringify({ signalId, value }) };
                                                                    const updatedActions = {
                                                                        ...actions,
                                                                        [triggerType]: [...(actions[triggerType] || []), newAction]
                                                                    };
                                                                    handleUpdateState(selectedStateId, 'actions', updatedActions);
                                                                }
                                                            }}
                                                            style={{ fontSize: '0.75rem', padding: '4px 8px', background: '#374151', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', cursor: 'pointer' }}
                                                        >
                                                            + {t('studioModel.modelBuilder.buttons.addPlc')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* ROI Config */}
                                        <div style={{ border: '1px solid #374151', padding: '12px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('studioModel.modelBuilder.labels.roi')}: {currentModel.states.find(s => s.id === selectedStateId)?.roi ? t('studioModel.modelBuilder.labels.defined') : t('studioModel.modelBuilder.labels.none')}</span>
                                                <button
                                                    onClick={() => setIsDrawingROI(!isDrawingROI)}
                                                    style={{
                                                        background: isDrawingROI ? '#eab308' : '#374151',
                                                        color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center'
                                                    }}
                                                >
                                                    <Box size={14} /> {isDrawingROI ? t('studioModel.modelBuilder.indicators.drawing') : t('studioModel.modelBuilder.buttons.drawRoi')}
                                                </button>
                                            </div>
                                            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>
                                                {t('studioModel.modelBuilder.labels.drawRoiHint')}
                                            </p>
                                        </div>

                                        {/* Reference Pose Config */}
                                        <div style={{ border: '1px solid #374151', padding: '12px', borderRadius: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{t('studioModel.modelBuilder.labels.poseRef')}</span>
                                                <button
                                                    onClick={handleCaptureReference}
                                                    style={{
                                                        background: '#059669',
                                                        color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', gap: '5px', alignItems: 'center'
                                                    }}
                                                >
                                                    <Camera size={14} /> {t('studioModel.modelBuilder.buttons.captureFrame')}
                                                </button>
                                            </div>
                                            {currentModel.states.find(s => s.id === selectedStateId)?.referencePose && (
                                                <p style={{ color: '#10b981', fontSize: '0.8rem', margin: 0 }}>{t('studioModel.modelBuilder.indicators.referenceCaptured')}</p>
                                            )}
                                        </div>

                                    </div>
                                ) : (
                                    // List View
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {currentModel.states.map((state, idx) => (
                                            <div key={state.id}
                                                onClick={() => setSelectedStateId(state.id)}
                                                style={{
                                                    padding: '12px',
                                                    background: '#111827',
                                                    borderRadius: '8px',
                                                    border: selectedStateId === state.id ? '1px solid #3b82f6' : '1px solid #374151',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                    boxShadow: selectedStateId === state.id ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none'
                                                }}
                                                onMouseOver={(e) => e.currentTarget.style.background = '#1f2937'}
                                                onMouseOut={(e) => e.currentTarget.style.background = '#111827'}
                                            >
                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                    {/* THUMBNAIL */}
                                                    <div style={{
                                                        width: '48px',
                                                        height: '48px',
                                                        borderRadius: '6px',
                                                        backgroundColor: '#1f2937',
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        border: '1px solid #374151'
                                                    }}>
                                                        {state.thumbnail ? (
                                                            <img src={state.thumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <Video size={20} color="#4b5563" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: 'white', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {state.name}
                                                            {state.isVA && <span style={{ fontSize: '0.65rem', backgroundColor: '#064e3b', color: '#10b981', padding: '1px 6px', borderRadius: '4px', border: '1px solid #065f46' }}>VA</span>}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t('studioModel.modelBuilder.labels.stepCount')} {idx + 1}</div>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    {state.referencePose && <Check size={16} color="#10b981" />}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDuplicateState(state.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: '4px' }}
                                                        title={t('studioModel.modelBuilder.labels.duplicateState')}
                                                    >
                                                        <Copy size={16} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteState(state.id); }}
                                                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                                                        disabled={idx === 0}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddState}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                marginTop: '16px',
                                                background: 'rgba(37, 99, 235, 0.1)',
                                                color: '#60a5fa',
                                                border: '1px dashed #2563eb',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                fontWeight: '500'
                                            }}
                                        >
                                            <Plus size={16} /> {t('studioModel.modelBuilder.labels.addNextStep')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div>
                                <h3 style={{ marginBottom: '16px' }}>Model Settings</h3>

                                {/* VERSION HISTORY */}
                                <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                                    <h4 style={{ margin: '0 0 16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <RotateCw size={18} color="#60a5fa" /> {t('studioModel.modelBuilder.settings.versionHistory')}
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const versionName = await showPrompt(t('studioModel.modelBuilder.settings.saveSnapshot'), t('studioModel.modelBuilder.prompts.versionName'));
                                                if (versionName) {
                                                    const newVersion = {
                                                        id: Date.now(),
                                                        name: versionName,
                                                        timestamp: new Date().toLocaleTimeString(),
                                                        data: JSON.parse(JSON.stringify(currentModel))
                                                    };
                                                    const updatedVersions = [...(currentModel.versions || []), newVersion];
                                                    setCurrentModel({ ...currentModel, versions: updatedVersions });
                                                }
                                            }}
                                            style={{ padding: '6px 12px', background: 'rgba(37, 99, 235, 0.1)', border: '1px solid #2563eb', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                            <Save size={14} /> {t('studioModel.modelBuilder.settings.saveSnapshot')}
                                        </button>
                                    </h4>

                                    {(currentModel.versions || []).length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '0.9rem', border: '1px dashed #374151', borderRadius: '6px' }}>
                                            {t('studioModel.modelBuilder.settings.noVersions')}
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {currentModel.versions.map((ver) => (
                                                <div key={ver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#1f2937', borderRadius: '6px', border: '1px solid #374151' }}>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem' }}>{ver.name}</div>
                                                        <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{ver.timestamp} • {ver.data.states.length} {t('studioModel.modelBuilder.settings.states')}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={async () => {
                                                                if (await showConfirm(t('common.confirm'), t('studioModel.modelBuilder.prompts.restoreVersion', { version: ver.name }))) {
                                                                    setCurrentModel(ver.data);
                                                                }
                                                            }}
                                                            style={{ padding: '4px 8px', background: 'transparent', border: '1px solid #4b5563', color: '#e5e7eb', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                                        >
                                                            {t('studioModel.modelBuilder.settings.restore')}
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                if (await showConfirm(t('common.confirm'), t('studioModel.modelBuilder.prompts.deleteVersion', { version: ver.name }))) {
                                                                    const updatedVersions = currentModel.versions.filter(v => v.id !== ver.id);
                                                                    setCurrentModel({ ...currentModel, versions: updatedVersions });
                                                                }
                                                            }}
                                                            style={{ padding: '4px', background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px', color: 'white' }}>{t('studioModel.modelBuilder.settings.coordinateSystem')}</label>
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="coordSystem"
                                                value="screen"
                                                checked={currentModel.coordinateSystem === 'screen'}
                                                onChange={() => setCurrentModel(m => ({ ...m, coordinateSystem: 'screen' }))}
                                            />
                                            <span>{t('studioModel.modelBuilder.settings.screen')}</span>
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="coordSystem"
                                                value="body"
                                                checked={currentModel.coordinateSystem !== 'screen'} // Default to body if undefined
                                                onChange={() => setCurrentModel(m => ({ ...m, coordinateSystem: 'body' }))}
                                            />
                                            <span>{t('studioModel.modelBuilder.settings.bodyCentric')}</span>
                                        </label>
                                    </div>
                                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginTop: '8px' }}>
                                        {t('studioModel.modelBuilder.settings.bodyCentricHint')}
                                        (0,0) is the center of the hips.
                                    </p>
                                </div>

                                {/* TEACHABLE MACHINE CONFIGURATION */}
                                <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                                    <h4 style={{ margin: '0 0 16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Layers size={18} color="#10b981" /> Teachable Machine Models
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open('https://teachablemachine.withgoogle.com/train/pose', '_blank');
                                                }}
                                                style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, position: 'relative' }}
                                            >
                                                <ExternalLink size={14} /> Go to Site
                                            </button>
                                            <button
                                                onClick={handleAddTmModel}
                                                style={{ padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Plus size={14} /> Add Model
                                            </button>
                                        </div>
                                    </h4>

                                    {(currentModel.tmModels || []).map((m, idx) => (
                                        <div key={m.id} style={{ marginBottom: idx === currentModel.tmModels.length - 1 ? 0 : '16px', padding: '12px', background: '#1f2937', borderRadius: '8px', border: '1px solid #374151' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) => handleUpdateTmModel(m.id, { name: e.target.value })}
                                                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #4b5563', color: 'white', fontSize: '0.9rem', width: '200px', fontWeight: 'bold', outline: 'none' }}
                                                />
                                                <button
                                                    onClick={() => handleRemoveTmModel(m.id)}
                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ marginBottom: '12px' }}>
                                                <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Model URL</label>
                                                <input
                                                    type="text"
                                                    placeholder="https://teachablemachine.../models/[MODEL_ID]/"
                                                    value={m.url || ''}
                                                    onChange={(e) => {
                                                        let url = e.target.value;
                                                        if (url && !url.endsWith('/')) url += '/';
                                                        handleUpdateTmModel(m.id, { url });
                                                    }}
                                                    style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    <input
                                                        type="radio"
                                                        name={`tmType_${m.id}`}
                                                        value="image"
                                                        checked={m.type !== 'pose'}
                                                        onChange={() => handleUpdateTmModel(m.id, { type: 'image' })}
                                                    />
                                                    <span>Image</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                    <input
                                                        type="radio"
                                                        name={`tmType_${m.id}`}
                                                        value="pose"
                                                        checked={m.type === 'pose'}
                                                        onChange={() => handleUpdateTmModel(m.id, { type: 'pose' })}
                                                    />
                                                    <span>Pose</span>
                                                </label>
                                            </div>

                                            {tmLoadingStates[m.id] && (
                                                <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '8px' }}>
                                                    <RotateCw size={12} className="animate-spin" /> Loading Model...
                                                </div>
                                            )}

                                            <div style={{ padding: '10px', background: '#111827', borderRadius: '6px', border: '1px dashed #374151' }}>
                                                <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#6b7280' }}>Offline Mode: Upload Files</p>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                                    <input type="file" accept=".json" onChange={(e) => handleTmFileUpload(e, m.id, 'model')} style={{ fontSize: '0.65rem' }} />
                                                    <input type="file" accept=".bin" onChange={(e) => handleTmFileUpload(e, m.id, 'weights')} style={{ fontSize: '0.65rem' }} />
                                                    <input type="file" accept=".json" onChange={(e) => handleTmFileUpload(e, m.id, 'metadata')} style={{ fontSize: '0.65rem' }} />
                                                </div>
                                                <button
                                                    onClick={() => handleLoadTmFromFiles(m.id)}
                                                    style={{ marginTop: '8px', width: '100%', padding: '4px', fontSize: '0.75rem', background: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                                                >
                                                    Load Files
                                                </button>
                                            </div>

                                            {tmPredictions[m.id] && (
                                                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                                        <span style={{ fontWeight: 'bold', color: '#10b981' }}>{tmPredictions[m.id].className}</span>
                                                        <span style={{ color: '#9ca3af' }}>{(tmPredictions[m.id].probability * 100).toFixed(0)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                </div>

                                {/* ROBOFLOW CONFIGURATION */}
                                <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                                    <h4 style={{ margin: '0 0 16px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Database size={18} color="#a855f7" /> Roboflow Models
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open('https://roboflow.com/', '_blank');
                                                }}
                                                style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, position: 'relative' }}
                                            >
                                                <ExternalLink size={14} /> Go to Site
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const demoModel = {
                                                        id: `rf_demo_${Date.now()}`,
                                                        name: 'PPE Demo (YOLO)',
                                                        apiKey: 'DEMO',
                                                        projectId: 'ppe-detection',
                                                        version: 1
                                                    };
                                                    setCurrentModel(m => ({ ...m, rfModels: [...(m.rfModels || []), demoModel] }));
                                                }}
                                                style={{ padding: '6px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#60a5fa', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Sparkles size={14} /> Try Demo
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newModel = { id: `rf_${Date.now()}`, name: 'Roboflow Model', apiKey: '', projectUrl: '', version: 1 };
                                                    setCurrentModel(m => ({ ...m, rfModels: [...(m.rfModels || []), newModel] }));
                                                }}
                                                style={{ padding: '6px 12px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid #a855f7', color: '#a855f7', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                            >
                                                <Plus size={14} /> Add Model
                                            </button>
                                        </div>
                                    </h4>

                                    {(currentModel.rfModels || []).map((m, idx) => (
                                        <div key={m.id} style={{ marginBottom: idx === currentModel.rfModels.length - 1 ? 0 : '16px', padding: '12px', background: '#1f2937', borderRadius: '8px', border: '1px solid #374151' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) => {
                                                        const updated = currentModel.rfModels.map(rm => rm.id === m.id ? { ...rm, name: e.target.value } : rm);
                                                        setCurrentModel(ms => ({ ...ms, rfModels: updated }));
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #4b5563', color: 'white', fontSize: '0.9rem', width: '200px', fontWeight: 'bold', outline: 'none' }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        const updated = currentModel.rfModels.filter(rm => rm.id !== m.id);
                                                        setCurrentModel(ms => ({ ...ms, rfModels: updated }));
                                                    }}
                                                    style={{ padding: '4px', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 0.5fr', gap: '10px' }}>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>API Key</label>
                                                    <input
                                                        type="password"
                                                        value={m.apiKey || ''}
                                                        onChange={(e) => {
                                                            const updated = currentModel.rfModels.map(rm => rm.id === m.id ? { ...rm, apiKey: e.target.value } : rm);
                                                            setCurrentModel(ms => ({ ...ms, rfModels: updated }));
                                                        }}
                                                        style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Project ID</label>
                                                    <input
                                                        type="text"
                                                        placeholder="helm-safety-xhv2j"
                                                        value={m.projectUrl || ''}
                                                        onChange={(e) => {
                                                            const updated = currentModel.rfModels.map(rm => rm.id === m.id ? { ...rm, projectUrl: e.target.value } : rm);
                                                            setCurrentModel(ms => ({ ...ms, rfModels: updated }));
                                                        }}
                                                        style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#9ca3af', marginBottom: '4px' }}>Ver.</label>
                                                    <input
                                                        type="number"
                                                        value={m.version || 1}
                                                        onChange={(e) => {
                                                            const updated = currentModel.rfModels.map(rm => rm.id === m.id ? { ...rm, version: parseInt(e.target.value) || 1 } : rm);
                                                            setCurrentModel(ms => ({ ...ms, rfModels: updated }));
                                                        }}
                                                        style={{ width: '100%', padding: '8px', background: '#111827', border: '1px solid #4b5563', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {(!currentModel.rfModels || currentModel.rfModels.length === 0) && (
                                        <div style={{ textAlign: 'center', padding: '20px', color: '#6b7280', fontSize: '0.85rem' }}>
                                            No Roboflow models configured.
                                        </div>
                                    )}
                                </div>

                                {/* PORTABILITY SECTION */}
                                <div style={{ marginBottom: '24px', padding: '16px', background: '#111827', borderRadius: '8px', border: '1px solid #374151' }}>
                                    <h4 style={{ margin: '0 0 16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Database size={18} color="#60a5fa" /> Portability & Templates
                                    </h4>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {/* Export */}
                                        <button
                                            onClick={handleExportModel}
                                            style={{
                                                padding: '12px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px',
                                                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Download size={16} /> Export JSON
                                        </button>

                                        {/* Import */}
                                        <button
                                            onClick={() => fileImportRef.current.click()}
                                            style={{
                                                padding: '12px', background: '#374151', border: '1px solid #4b5563', borderRadius: '8px',
                                                color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Upload size={16} /> Import JSON
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileImportRef}
                                            style={{ display: 'none' }}
                                            accept="application/json"
                                            onChange={handleImportModel}
                                        />

                                        {/* Load Template */}
                                        <button
                                            onClick={() => setShowTemplateModal(true)}
                                            style={{
                                                gridColumn: 'span 2',
                                                padding: '12px', background: 'rgba(96, 165, 250, 0.1)', border: '1px dashed #60a5fa', borderRadius: '8px',
                                                color: '#60a5fa', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <FileJson size={16} /> Load from Template Library
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'extraction' && (
                            <div>


                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                    <h3 style={{ margin: 0 }}>Pose Extraction Data</h3>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#9ca3af', border: '1px solid #374151', padding: '2px 6px', borderRadius: '4px' }}>
                                            Mode: {currentModel.coordinateSystem === 'screen' ? 'Screen' : 'Body-Relative'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: activePose ? '#10b981' : '#6b7280' }}>
                                            {activePose ? '● Tracking Live' : '○ No Data'}
                                        </span>
                                    </div>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '30px 1fr 60px 60px 50px',
                                    gap: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: '600',
                                    color: '#9ca3af',
                                    padding: '0 8px 8px 8px',
                                    borderBottom: '1px solid #374151'
                                }}>
                                    <span>#</span>
                                    <span>Keypoint</span>
                                    <span>X</span>
                                    <span>Y</span>
                                    <span>Conf</span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '500px', overflowY: 'auto' }}>
                                    {KEYPOINT_NAMES.map((name, idx) => {
                                        const rawPoint = activePose?.keypoints.find(k => k.name === name);
                                        const isSelected = selectedKeypoints[name];

                                        // Compute display value based on system
                                        let displayPoint = rawPoint;
                                        if (currentModel.coordinateSystem !== 'screen' && activePose) {
                                            // We calculate normalized stats on the fly for visualization
                                            // Optimization: In real app, calculate once per frame outside loop
                                            const normalized = PoseNormalizer.normalize(activePose.keypoints);
                                            displayPoint = normalized.find(k => k.name === name);
                                        }

                                        return (
                                            <div key={name} style={{
                                                display: 'grid',
                                                gridTemplateColumns: '30px 1fr 60px 60px 50px',
                                                gap: '8px',
                                                padding: '8px',
                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                                                alignItems: 'center',
                                                fontSize: '0.85rem'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={!!isSelected}
                                                    onChange={(e) => setSelectedKeypoints(prev => ({ ...prev, [name]: e.target.checked }))}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span style={{ color: isSelected ? 'white' : '#9ca3af' }}>{idx}. {name}</span>
                                                <span style={{ fontFamily: 'monospace', color: displayPoint ? '#60a5fa' : '#4b5563' }}>
                                                    {displayPoint ? displayPoint.x.toFixed(2) : '-'}
                                                </span>
                                                <span style={{ fontFamily: 'monospace', color: displayPoint ? '#60a5fa' : '#4b5563' }}>
                                                    {displayPoint ? displayPoint.y.toFixed(2) : '-'}
                                                </span>
                                                <span style={{
                                                    fontFamily: 'monospace',
                                                    color: rawPoint && rawPoint.score > 0.5 ? '#10b981' : '#ef4444'
                                                }}>
                                                    {rawPoint ? (rawPoint.score * 100).toFixed(0) + '%' : '-'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Template Selection Modal */}
                    {showTemplateModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <div style={{
                                backgroundColor: '#1f2937', padding: '24px', borderRadius: '12px',
                                width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                                border: '1px solid #374151'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h3 style={{ color: 'white', margin: 0 }}>Select Motion Template</h3>
                                    <button onClick={() => setShowTemplateModal(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}>✕</button>
                                </div>

                                <div style={{ overflowY: 'auto', display: 'grid', gap: '12px' }}>
                                    {MODEL_TEMPLATES.map(tpl => (
                                        <div
                                            key={tpl.id}
                                            onClick={() => handleLoadTemplate(tpl.id)}
                                            style={{
                                                padding: '16px',
                                                backgroundColor: '#374151',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                border: '1px solid transparent',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseOver={(e) => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.backgroundColor = '#4b5563'; }}
                                            onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = '#374151'; }}
                                        >
                                            <div style={{ fontWeight: 'bold', color: 'white', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                                {tpl.name}
                                                <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: '#9ca3af', backgroundColor: '#1f2937', padding: '2px 8px', borderRadius: '4px' }}>
                                                    {tpl.states.length} Steps
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#d1d5db' }}>{tpl.description}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LABORATORY OVERLAYS */}
                    {isLaboratory && showChallengePanel && (
                        <div style={{
                            position: 'fixed',
                            right: '24px',
                            top: '80px',
                            width: '320px',
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            backdropFilter: 'blur(12px)',
                            borderRadius: '1.5rem',
                            border: '1px solid rgba(139, 92, 246, 0.5)',
                            padding: '1.5rem',
                            zIndex: 2001,
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            animation: 'slideIn 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FlaskConical size={18} /> Tantangan: {challenge?.name}
                                </h3>
                                <button onClick={() => setShowChallengePanel(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                            </div>

                            <p style={{ fontSize: '0.85rem', color: '#cbd5e1', margin: 0 }}>{challenge?.target}</p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                                {labTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => toggleTask(task.id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            fontSize: '0.85rem',
                                            color: task.completed ? '#4ade80' : '#d1d5db',
                                            cursor: 'pointer',
                                            padding: '8px',
                                            borderRadius: '8px',
                                            backgroundColor: task.completed ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.05)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {task.completed ? <CheckCircle size={16} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #4b5563', flexShrink: 0 }} />}
                                        <span>{task.text}</span>
                                    </div>
                                ))}
                            </div>

                            <button
                                style={{
                                    marginTop: '1rem',
                                    padding: '0.75rem',
                                    borderRadius: '0.75rem',
                                    border: 'none',
                                    background: labTasks.every(t => t.completed) ? 'linear-gradient(to right, #10b981, #059669)' : '#334155',
                                    color: 'white',
                                    fontWeight: '600',
                                    cursor: labTasks.every(t => t.completed) ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s'
                                }}
                                disabled={!labTasks.every(t => t.completed)}
                                onClick={async () => {
                                    await showAlert(t('common.success'), "Selamat! Tantangan berhasil diselesaikan! MAVi Master Badge diperoleh!");
                                    onClose();
                                }}
                            >
                                Submit Solution <Trophy size={16} />
                            </button>
                        </div>
                    )}

                    {isLaboratory && !showChallengePanel && (
                        <button
                            onClick={() => setShowChallengePanel(true)}
                            style={{
                                position: 'fixed',
                                right: '24px',
                                bottom: '24px',
                                width: '56px',
                                height: '56px',
                                borderRadius: '50%',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                zIndex: 2001,
                                boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                animation: 'bounce 2s infinite'
                            }}
                            title="Buka Panel Tantangan"
                        >
                            <FlaskConical size={24} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ModelBuilder;
