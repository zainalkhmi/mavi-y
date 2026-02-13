import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Play, Pause, RefreshCw, CheckCircle, AlertTriangle, Save, Upload, Camera, HelpCircle, Brain, X, Scissors, Download, Film, Image, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, ExternalLink } from 'lucide-react';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';
import { initializePoseDetector, detectPose, drawPoseSkeleton } from '../utils/poseDetector';
import {
    extractPoseFeatures,
    createPoseSequence,
    compareWithGoldenCycle,
    detectAnomalies
} from '../utils/motionComparator';
import { loadModelFromURL, loadModelFromFiles, predict } from '../utils/teachableMachine';
import { THERBLIG_ACTIONS } from '../utils/actionClassifier';
import { extractFramesToZip } from '../utils/videoToImages';
import { useLanguage } from '../contexts/LanguageContext';
import { saveDataset } from '../utils/database';
import { cutVideo } from '../utils/videoEditor';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';


const MachineLearningData = ({ videoSrc, videoFile, measurements, onUpdateMeasurements, externalVideoRef }) => {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const { showAlert, showConfirm, showPrompt } = useDialog();
    const { videoName, setVideoSrc, setVideoName, setVideoFile, currentProject, newProject } = useProject();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [consistencyScore, setConsistencyScore] = useState(0);
    const [goldenCycle, setGoldenCycle] = useState(null);
    const [dataPoints, setDataPoints] = useState([]);
    const [anomalies, setAnomalies] = useState(0);
    const [anomalyHistory, setAnomalyHistory] = useState([]);
    const [showHelp, setShowHelp] = useState(false);

    // Real ML states
    const [detector, setDetector] = useState(null);
    const [status, setStatus] = useState('Initializing AI...');
    const [isRecording, setIsRecording] = useState(false);
    const [recordingProgress, setRecordingProgress] = useState(0);
    const [currentPose, setCurrentPose] = useState(null);
    const [currentSequence, setCurrentSequence] = useState([]);
    const [allScores, setAllScores] = useState([]);

    // Teachable Machine State
    const [useTeachableMachine, setUseTeachableMachine] = useState(false);
    const [tmModel, setTmModel] = useState(null);
    const [tmModelURL, setTmModelURL] = useState('');
    const [tmPrediction, setTmPrediction] = useState(null);
    const [tmLoading, setTmLoading] = useState(false);
    const [tmModelType, setTmModelType] = useState('online'); // 'online' or 'offline'

    // Video Slicer State
    const [slicerStart, setSlicerStart] = useState(0);
    const [slicerEnd, setSlicerEnd] = useState(10);
    const [capturedClips, setCapturedClips] = useState([]);
    const [isExtracting, setIsExtracting] = useState(null); // ID of clip being extracted
    const [cuttingProgress, setCuttingProgress] = useState(null); // { id: clipId, percent: 0-100 }
    const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' or 'slicer'
    const [clipLabel, setClipLabel] = useState('');
    const [clipCategory, setClipCategory] = useState('Normal Activity');
    const [clipNotes, setClipNotes] = useState('');
    const [filmstrip, setFilmstrip] = useState([]);
    const [hoverThumbnail, setHoverThumbnail] = useState(null);
    const [previewPos, setPreviewPos] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [zoomStart, setZoomStart] = useState(0);
    const [zoomEnd, setZoomEnd] = useState(0); // Will be set to duration on load
    const [isZoomInitialized, setIsZoomInitialized] = useState(false);
    const [isSavingProject, setIsSavingProject] = useState(false);
    const [localCurrentTime, setLocalCurrentTime] = useState(0);

    const LABEL_CATEGORIES = [
        'Normal Activity',
        'Anomaly/Waste',
        'Setup/Changeover',
        'Transition',
        'Safety/Ergo Issue',
        'Other'
    ];

    // File refs for offline upload
    const modelFileRef = useRef(null);
    const weightsFileRef = useRef(null);
    const metadataFileRef = useRef(null);

    const canvasRef = useRef(null);
    const internalVideoRef = useRef(null);
    const videoRef = externalVideoRef || internalVideoRef;
    const requestRef = useRef();
    const fileInputRef = useRef(null);
    const mainVideoInputRef = useRef(null);
    const recordingDataRef = useRef([]);
    const recordingStartTime = useRef(null);

    const handleLoadedMetadata = () => {
        if (videoRef.current && !isZoomInitialized) {
            setZoomEnd(videoRef.current.duration);
            setSlicerEnd(Math.min(10, videoRef.current.duration));
            setIsZoomInitialized(true);
        }
    };

    const handleZoomIn = () => {
        const center = (zoomStart + zoomEnd) / 2;
        const halfRange = (zoomEnd - zoomStart) / 4;
        setZoomStart(Math.max(0, center - halfRange));
        setZoomEnd(Math.min(videoRef.current?.duration || 100, center + halfRange));
    };

    const handleZoomOut = () => {
        const center = (zoomStart + zoomEnd) / 2;
        const range = (zoomEnd - zoomStart);
        setZoomStart(Math.max(0, center - range));
        setZoomEnd(Math.min(videoRef.current?.duration || 100, center + range));
    };

    const handleResetZoom = () => {
        setZoomStart(0);
        setZoomEnd(videoRef.current?.duration || 100);
    };

    // Initialize pose detector
    useEffect(() => {
        const initDetector = async () => {
            try {
                const det = await initializePoseDetector();
                setDetector(det);
                setStatus('Ready');
            } catch (error) {
                console.error('Failed to initialize detector:', error);
                setStatus('AI Failed');
            }
        };
        initDetector();
        if (videoSrc && videoRef.current) {
            setIsZoomInitialized(false);
        }
    }, [videoSrc]);

    // Floating Preview Generation
    const updateHoverThumbnail = useCallback(async (time) => {
        if (!videoSrc) return;
        const tempVideo = document.createElement('video');
        tempVideo.src = videoSrc;
        tempVideo.crossOrigin = 'anonymous';
        tempVideo.currentTime = time;

        await new Promise(r => tempVideo.onloadedmetadata = r);
        await new Promise(r => tempVideo.onseeked = r);

        const canvas = document.createElement('canvas');
        canvas.width = 120;
        canvas.height = 68;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
        setHoverThumbnail(canvas.toDataURL('image/jpeg', 0.6));
    }, [videoSrc]);

    // Generate Filmstrip when video changes
    useEffect(() => {
        if (!videoSrc) return;

        const generateFilmstrip = async () => {
            const frames = 10;
            const newFilmstrip = [];
            const tempVideo = document.createElement('video');
            tempVideo.src = videoSrc;
            tempVideo.crossOrigin = 'anonymous';

            await new Promise(r => tempVideo.onloadedmetadata = r);
            const duration = tempVideo.duration;
            if (!duration || duration === Infinity) return;

            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 56;
            const ctx = canvas.getContext('2d');

            for (let i = 0; i < frames; i++) {
                const time = (duration / frames) * i;
                tempVideo.currentTime = time;
                await new Promise(r => tempVideo.onseeked = r);
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                newFilmstrip.push(canvas.toDataURL('image/jpeg', 0.5));
            }
            setFilmstrip(newFilmstrip);
        };

        generateFilmstrip();
    }, [videoSrc]);

    // Real-time analysis loop
    const analyzeFrame = useCallback(async () => {
        if (!isAnalyzing || !videoRef.current) return;

        if (useTeachableMachine && tmModel) {
            // Teachable Machine Logic
            try {
                const result = await predict(tmModel, videoRef.current);
                if (result) {
                    setTmPrediction(result);

                    const score = (result.accuracy * 100);

                    // Update graph with accuracy of best class
                    const newPoint = {
                        time: new Date().toLocaleTimeString(),
                        score: score.toFixed(1),
                        threshold: 80
                    };

                    setDataPoints(prev => {
                        const newData = [...prev, newPoint];
                        if (newData.length > 20) newData.shift();
                        return newData;
                    });
                    setConsistencyScore(score.toFixed(0));

                    // Anomaly detection for TM (score < 80%)
                    if (score < 80) {
                        setAnomalies(prev => prev + 1);
                        setAnomalyHistory(prev => [...prev, {
                            time: videoRef.current.currentTime,
                            score: score.toFixed(1)
                        }]);
                    }

                    // Draw TM pose
                    const canvas = canvasRef.current;
                    if (canvas && result.pose) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        const video = videoRef.current;
                        const scaleX = canvas.width / video.videoWidth;
                        const scaleY = canvas.height / video.videoHeight;

                        ctx.save();
                        ctx.scale(scaleX, scaleY);
                        // TM Pose usually returns keypoints, standard draw function might work if structure matches
                        // Or use TM's own drawing, but let's try our util first since it expects {keypoints}
                        if (result.pose.keypoints) {
                            drawPoseSkeleton(ctx, [result.pose]);
                        }
                        ctx.restore();
                    }
                }
            } catch (error) {
                console.error("TM Prediction Error:", error);
            }
        } else if (!useTeachableMachine && detector) {
            // Original Golden Cycle Logic
            try {
                // Detect pose from video
                const poses = await detectPose(videoRef.current);

                if (poses && poses.length > 0) {
                    const pose = poses[0];
                    setCurrentPose(pose);

                    // Extract features
                    const features = extractPoseFeatures(pose.keypoints);

                    if (features && goldenCycle && goldenCycle.sequence) {
                        // Add to current sequence (keep last 30 frames for comparison)
                        setCurrentSequence(prev => {
                            const newSeq = [...prev, features];
                            if (newSeq.length > 30) newSeq.shift();
                            return newSeq;
                        });

                        // Compare with golden cycle
                        const currentSeqArray = [...currentSequence, features];
                        const comparison = compareWithGoldenCycle(
                            currentSeqArray,
                            goldenCycle.sequence
                        );

                        // Update score and data points
                        setConsistencyScore(comparison.score);

                        const newPoint = {
                            time: new Date().toLocaleTimeString(),
                            score: comparison.score,
                            threshold: 80
                        };

                        setDataPoints(prev => {
                            const newData = [...prev, newPoint];
                            if (newData.length > 20) newData.shift();
                            return newData;
                        });

                        setAllScores(prev => [...prev, comparison.score]);

                        if (comparison.isAnomaly) {
                            setAnomalies(prev => prev + 1);
                            setAnomalyHistory(prev => [...prev, {
                                time: videoRef.current.currentTime,
                                score: comparison.score
                            }]);
                        }
                    }

                    // Draw pose on canvas
                    const canvas = canvasRef.current;
                    if (canvas) {
                        const ctx = canvas.getContext('2d');
                        ctx.clearRect(0, 0, canvas.width, canvas.height);

                        // Scale coordinates to canvas size
                        const video = videoRef.current;
                        const scaleX = canvas.width / video.videoWidth;
                        const scaleY = canvas.height / video.videoHeight;

                        ctx.save();
                        ctx.scale(scaleX, scaleY);
                        drawPoseSkeleton(ctx, poses);
                        ctx.restore();
                    }
                }
            } catch (error) {
                console.error('Error in analysis loop:', error);
            }
        }

        requestRef.current = requestAnimationFrame(analyzeFrame);
    }, [isAnalyzing, detector, goldenCycle, currentSequence, useTeachableMachine, tmModel]);

    useEffect(() => {
        if (isAnalyzing && detector) {
            analyzeFrame();
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
    }, [isAnalyzing, detector, analyzeFrame]);

    // Recording loop for Golden Cycle
    const recordFrame = useCallback(async () => {
        if (!isRecording || !detector || !videoRef.current) return;

        try {
            const poses = await detectPose(videoRef.current);

            if (poses && poses.length > 0) {
                const pose = poses[0];
                recordingDataRef.current.push(pose.keypoints);

                // Update progress (record for 5 seconds at ~30fps = 150 frames)
                const elapsed = Date.now() - recordingStartTime.current;
                const progress = Math.min(100, (elapsed / 5000) * 100);
                setRecordingProgress(progress);

                // Draw pose on canvas
                const canvas = canvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    const video = videoRef.current;
                    const scaleX = canvas.width / video.videoWidth;
                    const scaleY = canvas.height / video.videoHeight;

                    ctx.save();
                    ctx.scale(scaleX, scaleY);
                    drawPoseSkeleton(ctx, poses);
                    ctx.restore();

                    // Draw recording indicator
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.beginPath();
                    ctx.arc(20, 20, 8, 0, Math.PI * 2);
                    ctx.fill();
                }

                if (progress >= 100) {
                    // Finish recording
                    finishRecording();
                    return;
                }
            }
        } catch (error) {
            console.error('Error in recording loop:', error);
        }

        requestRef.current = requestAnimationFrame(recordFrame);
    }, [isRecording, detector]);

    useEffect(() => {
        if (isRecording && detector) {
            recordFrame();
        }
        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isRecording, detector, recordFrame]);

    const handleCaptureGoldenCycle = async () => {
        if (!videoRef.current || !detector) {
            await showAlert('AI Ready', 'Please ensure video is loaded and AI is ready.');
            return;
        }

        setIsRecording(true);
        recordingDataRef.current = [];
        recordingStartTime.current = Date.now();
        setRecordingProgress(0);
    };

    const finishRecording = () => {
        setIsRecording(false);

        // Create pose sequence from recorded data
        const sequence = createPoseSequence(recordingDataRef.current);

        if (sequence.length > 0) {
            setGoldenCycle({
                timestamp: new Date().toISOString(),
                duration: `${(recordingDataRef.current.length / 30).toFixed(1)}s`,
                score: '100%',
                source: 'captured',
                sequence: sequence,
                frameCount: recordingDataRef.current.length
            });
            showAlert('Success', `Golden Cycle Captured! ${recordingDataRef.current.length} frames recorded.`);
        } else {
            showAlert('Error', 'Failed to capture Golden Cycle. No valid poses detected.');
        }

        recordingDataRef.current = [];
        setRecordingProgress(0);
    };

    const handleUploadGoldenCycle = async (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('video/')) {
            const videoURL = URL.createObjectURL(file);
            // Note: For uploaded video, we would need to process it frame by frame
            // For now, just show a message
            await showAlert('Video Uploaded', 'Video uploaded. Please play the video and use "Capture Current" to set Golden Cycle.');
        } else {
            await showAlert('Invalid File', 'Please upload a valid video file.');
        }
    };

    const handleStartAnalysis = async () => {
        if (!goldenCycle) {
            await showAlert('Golden Cycle Required', 'Please set a Golden Cycle first by capturing or uploading a reference video.');
            return;
        }
        if (!videoRef.current) {
            await showAlert('Video Required', 'Please ensure video is loaded.');
            return;
        }

        // Reset analysis state
        setDataPoints([]);
        setAnomalies(0);
        setAllScores([]);
        setCurrentSequence([]);

        setIsAnalyzing(!isAnalyzing);
    };

    // Set video ref when videoSrc changes
    useEffect(() => {
        if (videoSrc && videoRef.current) {
            videoRef.current.src = videoSrc;
        }
    }, [videoSrc]);

    const handleLoadTmModel = async () => {
        setTmLoading(true);
        setStatus("Loading TM Model...");
        try {
            let model;
            if (tmModelType === 'online') {
                if (!tmModelURL) {
                    await showAlert('URL Required', "Please enter a Model URL");
                    setTmLoading(false);
                    setStatus("Ready"); // Revert status
                    return;
                }
                model = await loadModelFromURL(tmModelURL);
            } else {
                if (!modelFileRef.current || !weightsFileRef.current || !metadataFileRef.current) {
                    await showAlert('Files Required', "Please upload all 3 files: model.json, metadata.json, weights.bin");
                    setTmLoading(false);
                    setStatus("Ready");
                    return;
                }
                model = await loadModelFromFiles(
                    modelFileRef.current,
                    weightsFileRef.current,
                    metadataFileRef.current
                );
            }

            setTmModel(model);
            setStatus("TM Model Ready");
            await showAlert('Success', "Teachable Machine Model Loaded Successfully!");
        } catch (error) {
            console.error(error);
            await showAlert('Load Failed', "Failed to load model: " + error.message);
            setStatus("AI Failed");
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

    const handleExportAnomalies = async () => {
        if (!anomalyHistory.length || !onUpdateMeasurements) {
            await showAlert('No Anomalies', "Tidak ada anomali yang terdeteksi untuk diekspor.");
            return;
        }

        // Sort by time just in case
        const sortedHistory = [...anomalyHistory].sort((a, b) => a.time - b.time);

        const clusters = [];
        let currentCluster = null;
        const GAP_THRESHOLD = 2000; // 2 seconds gap between detections to form a new cluster

        sortedHistory.forEach(anomaly => {
            if (!currentCluster) {
                currentCluster = {
                    startTime: anomaly.time,
                    endTime: anomaly.time,
                    minScore: parseFloat(anomaly.score),
                    count: 1,
                    videoTimestamp: anomaly.time // anomalyHistory[i].time is already the video current time per analyzeFrame
                };
            } else if (anomaly.time - currentCluster.endTime < 2.0) { // Using 2 seconds as gap
                currentCluster.endTime = anomaly.time;
                currentCluster.minScore = Math.min(currentCluster.minScore, parseFloat(anomaly.score));
                currentCluster.count++;
            } else {
                clusters.push(currentCluster);
                currentCluster = {
                    startTime: anomaly.time,
                    endTime: anomaly.time,
                    minScore: parseFloat(anomaly.score),
                    count: 1,
                    videoTimestamp: anomaly.time
                };
            }
        });

        if (currentCluster) clusters.push(currentCluster);

        // Convert clusters to measurements
        const newMeasurements = clusters.map((cluster, idx) => {
            const startStr = new Date().toLocaleTimeString(); // Approximation for label
            const duration = Math.max(1.0, cluster.endTime - cluster.startTime);

            return {
                id: `anomaly-${Date.now()}-${idx}`,
                elementName: `Anomaly Detected (${(cluster.minScore).toFixed(0)}% consistency)`,
                category: 'Waste',
                rating: 0,
                cycle: 1,
                startTime: cluster.startTime, // This is video time
                endTime: cluster.startTime + duration,
                duration: duration,
                note: `Detected group of ${cluster.count} low-consistency frames.`
            };
        });

        onUpdateMeasurements([...measurements, ...newMeasurements]);
        await showAlert('Success', `${newMeasurements.length} anomali telah ditambahkan ke timeline sebagai kategori 'Waste'.`);
        setAnomalyHistory([]); // Reset history after export
    };

    const handleCaptureClip = async () => {
        if (!videoRef.current || !videoSrc) return;

        // Capture Thumbnail
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);

        const newClip = {
            id: `clip-${Date.now()}`,
            label: clipLabel.trim() || `Clip ${capturedClips.length + 1}`,
            category: clipCategory,
            notes: clipNotes,
            startTime: slicerStart,
            endTime: slicerEnd,
            duration: slicerEnd - slicerStart,
            timestamp: new Date().toLocaleTimeString(),
            thumbnail: thumbnail
        };

        setCapturedClips(prev => [newClip, ...prev]);
        setClipLabel('');
        setClipNotes('');
        await showAlert('Clip Captured', `Clip Captured: ${newClip.label} (${newClip.category})`);
    };

    const handleExportMetadata = async () => {
        if (capturedClips.length === 0) {
            await showAlert('No Clips', "No clips to export.");
            return;
        }

        const metadata = {
            project: videoName || 'Untitled Project',
            exportDate: new Date().toISOString(),
            totalClips: capturedClips.length,
            clips: capturedClips.map(({ id, label, category, notes, startTime, endTime, duration, timestamp }) => ({
                id, label, category, notes, startTime, endTime, duration, timestamp
            }))
        };

        const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dataset_metadata_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleExtractImages = async (clip) => {
        if (!videoFile) {
            await showAlert('Video Required', t('machineLearning.originalVideoRequired'));
            return;
        }

        setIsExtracting(clip.id);
        try {
            // In a real implementation, we would slice the video file first.
            // But since extractFramesToZip takes a blob, we'll extract from the whole video 
            // but we might need to modify the util to take start/end times.
            // For now, let's assume we extract from the segment.

            // Optimization: If the util doesn't support start/end, we'd need to modify it.
            // Let's check if the util can be improved or if we can slice the blob.

            const zipBlob = await extractFramesToZip(
                videoFile,
                5,
                `clip_${clip.id}`,
                clip.startTime,
                clip.endTime,
                640 // Resize to 640px for faster processing
            );

            // Save to database/File Explorer
            const datasetName = `Dataset_${new Date().getTime()}_${clip.id.substring(0, 5)}`;
            await saveDataset(
                datasetName,
                zipBlob,
                videoFile.name,
                clip.id
            );

            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${datasetName}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            await showAlert('Success', t('machineLearning.datasetSaved') || `Dataset saved and stored in File Explorer -> TM Studio folder.`);
        } catch (error) {
            console.error("Extraction error:", error);
            await showAlert('Error', "Failed to extract images: " + error.message);
        } finally {
            setIsExtracting(null);
        }
    };

    const handleDownloadClip = async (clip) => {
        const source = videoFile || videoSrc;

        if (!source) {
            await showAlert('Video Required', t('machineLearning.originalVideoRequired'));
            return;
        }

        setCuttingProgress({ id: clip.id, percent: 0 });
        try {
            console.log(`Starting download for clip: ${clip.label}`, { startTime: clip.startTime, endTime: clip.endTime });

            const blob = await cutVideo(
                source,
                clip.startTime,
                clip.endTime,
                (percent) => setCuttingProgress({ id: clip.id, percent })
            );

            // Trigger download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Clean filename
            const safeLabel = (clip.label || 'clip').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            const timestamp = new Date().getTime();

            // Determine extension from MIME type
            const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
            a.download = `${safeLabel}_${timestamp}.${extension}`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setCuttingProgress(null);
            console.log("Download triggered successfully.");
        } catch (error) {
            console.error("Cutting error:", error);
            await showAlert('Error', "Failed to cut video: " + error.message);
            setCuttingProgress(null);
        }
    };

    const handlePreviewSlice = () => {
        if (!videoRef.current) {
            console.error("Preview failed: Video element not found.");
            return;
        }

        console.log(`Previewing slice: ${slicerStart}s to ${slicerEnd}s`);

        // Remove any existing preview animation first
        if (videoRef.current._previewRAF) {
            cancelAnimationFrame(videoRef.current._previewRAF);
        }

        // Force a pause and seek
        videoRef.current.pause();
        videoRef.current.currentTime = slicerStart;

        const startPlayback = () => {
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => console.error("Playback prevented:", error));
            }

            const checkTime = () => {
                if (videoRef.current) {
                    if (videoRef.current.currentTime >= slicerEnd) {
                        videoRef.current.pause();
                        videoRef.current._previewRAF = null;
                        console.log("Preview reached end point.");
                    } else {
                        videoRef.current._previewRAF = requestAnimationFrame(checkTime);
                    }
                }
            };
            videoRef.current._previewRAF = requestAnimationFrame(checkTime);
        };

        // Handle seeked event to ensure we start at the right frame
        const onSeeked = () => {
            videoRef.current.removeEventListener('seeked', onSeeked);
            startPlayback();
        };

        // If very close to start, just play. Otherwise wait for seek.
        if (Math.abs(videoRef.current.currentTime - slicerStart) < 0.1) {
            startPlayback();
        } else {
            videoRef.current.addEventListener('seeked', onSeeked);
        }
    };

    const handleVideoTimeUpdate = () => {
        if (videoRef.current) {
            setLocalCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleRemoveClip = (id) => {
        setCapturedClips(prev => prev.filter(c => c.id !== id));
    };

    const handleMainVideoUpload = async (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('video/')) {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoName(file.name);
            setVideoFile(file);
        } else {
            await showAlert('Invalid File', 'Please select a valid video file.');
        }
    };

    const handleSaveAsProject = async () => {
        if (!videoFile) {
            await showAlert('Video Required', t('machineLearning.originalVideoRequired'));
            return;
        }

        const name = await showPrompt(t('workspace.newProjectPrompt'), '', videoName.replace(/\.[^/.]+$/, "") + "_trimmed");
        if (!name) return;

        setIsSavingProject(true);
        try {
            // Cut the video for the current slicer range
            const trimmedBlob = await cutVideo(
                videoFile,
                slicerStart,
                slicerEnd,
                (percent) => setCuttingProgress({ id: 'header-save', percent })
            );

            const trimmedFile = new File([trimmedBlob], `${name}.webm`, { type: 'video/webm' });

            // Convert captured clips to measurements for the main workspace
            // Adjust times relative to the new trimmed start
            const initialMeasurements = capturedClips
                .filter(clip => clip.startTime >= slicerStart && clip.endTime <= slicerEnd)
                .map(clip => ({
                    id: clip.id,
                    elementName: clip.label,
                    category: clip.category,
                    therbligType: 'Other',
                    startTime: clip.startTime - slicerStart,
                    endTime: clip.endTime - slicerStart,
                    duration: clip.endTime - clip.startTime,
                    notes: clip.notes,
                    timestamp: clip.timestamp
                }));

            await newProject(name, trimmedFile, initialMeasurements);
            await showAlert('Success', t('common.success'));
        } catch (error) {
            console.error("Error saving trimmed project:", error);
            await showAlert('Error', "Failed to save project: " + error.message);
        } finally {
            setIsSavingProject(false);
            setCuttingProgress(null);
        }
    };

    const handleSaveClipAsProject = async (clip) => {
        if (!videoFile) {
            await showAlert('Video Required', t('machineLearning.originalVideoRequired'));
            return;
        }

        const name = await showPrompt(t('workspace.newProjectPrompt'), '', clip.label);
        if (!name) return;

        setIsSavingProject(true);
        try {
            const trimmedBlob = await cutVideo(
                videoFile,
                clip.startTime,
                clip.endTime,
                (percent) => setCuttingProgress({ id: clip.id, percent })
            );

            const trimmedFile = new File([trimmedBlob], `${name}.webm`, { type: 'video/webm' });

            // This specific clip becomes the video, and we can add it as the first measurement
            const firstMeasurement = [{
                id: `element-${Date.now()}`,
                elementName: clip.label,
                category: clip.category,
                therbligType: 'Other',
                startTime: 0,
                endTime: clip.duration,
                duration: clip.duration,
                notes: clip.notes,
                timestamp: new Date().toLocaleTimeString()
            }];

            await newProject(name, trimmedFile, firstMeasurement);
            await showAlert('Success', t('common.success'));
        } catch (error) {
            console.error("Error saving clip project:", error);
            await showAlert('Error', "Failed to save project: " + error.message);
        } finally {
            setIsSavingProject(false);
            setCuttingProgress(null);
        }
    };

    const handleOpenWorkspace = () => {
        navigate('/');
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: isSidebarOpen ? '280px 1fr' : '0px 1fr',
            gridTemplateRows: 'auto 1fr',
            gap: isSidebarOpen ? '15px' : '0px',
            height: '100%',
            padding: '15px',
            backgroundColor: '#1a1a1a',
            color: '#fff',
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden',
            transition: 'grid-template-columns 0.3s ease, gap 0.3s ease',
            position: 'relative'
        }}>
            {/* Header */}
            <div style={{
                gridColumn: '1 / -1',
                paddingBottom: '15px',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
            }}>
                <div>
                    <h2 style={{ margin: 0, color: '#ffd700', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.5rem' }}>
                        <Brain size={28} /> {t('machineLearning.title')}
                    </h2>
                    <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>
                        {t('machineLearning.subtitle')}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: activeTab === 'analysis' ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)' : 'transparent',
                                color: activeTab === 'analysis' ? '#fff' : '#888',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === 'analysis' ? 'bold' : 'normal',
                                transition: 'all 0.2s'
                            }}
                        >
                            Analysis
                        </button>
                        <button
                            onClick={() => setActiveTab('slicer')}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: activeTab === 'slicer' ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)' : 'transparent',
                                color: activeTab === 'slicer' ? '#fff' : '#888',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === 'slicer' ? 'bold' : 'normal',
                                transition: 'all 0.2s'
                            }}
                        >
                            {t('machineLearning.videoSlicer')}
                        </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {videoSrc && (
                            <>
                                <button
                                    onClick={handleSaveAsProject}
                                    disabled={isSavingProject}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid rgba(0, 210, 255, 0.4)',
                                        borderRadius: '10px',
                                        background: isSavingProject ? 'rgba(0, 210, 255, 0.05)' : 'rgba(0, 210, 255, 0.1)',
                                        color: '#00d2ff',
                                        cursor: isSavingProject ? 'not-allowed' : 'pointer',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: 'bold',
                                        opacity: isSavingProject ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                    title="Save trimmed segment as Workspace Project"
                                >
                                    {isSavingProject ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            {cuttingProgress?.id === 'header-save' ? `${cuttingProgress.percent}%` : t('workspace.cuttingVideo')}
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} /> {t('workspace.saveAsProject')}
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleOpenWorkspace}
                                    style={{
                                        padding: '8px 16px',
                                        border: '1px solid rgba(255, 215, 0, 0.4)',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 215, 0, 0.1)',
                                        color: '#ffd700',
                                        cursor: 'pointer',
                                        fontSize: '0.9rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontWeight: 'bold'
                                    }}
                                    title="Open in Video Workspace"
                                >
                                    <ExternalLink size={18} /> {t('workspace.openInWorkspace') || 'Open in Workspace'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => mainVideoInputRef.current?.click()}
                            style={{
                                padding: '8px 16px',
                                border: 'none',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            <Upload size={18} /> {t('common.upload') || 'Upload Video'}
                        </button>
                        <input
                            type="file"
                            ref={mainVideoInputRef}
                            accept="video/*"
                            onChange={handleMainVideoUpload}
                            style={{ display: 'none' }}
                        />
                        <HelpButton title="🤖 Teachable Machine Studio - Help" content={helpContent['teachable-machine'].content} />
                    </div>
                </div>
            </div>

            {/* Left Panel: Controls & Stats */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                padding: isSidebarOpen ? '20px' : '0px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                border: isSidebarOpen ? '1px solid rgba(255,255,255,0.1)' : 'none',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                opacity: isSidebarOpen ? 1 : 0,
                pointerEvents: isSidebarOpen ? 'all' : 'none'
            }}>
                {/* Model Source Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

                    {/* Mode Toggle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px'
                    }}>
                        <span style={{ color: '#ccc' }}>{t('machineLearning.useTeachableMachine')}</span>
                        <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                            <input
                                type="checkbox"
                                checked={useTeachableMachine}
                                onChange={(e) => setUseTeachableMachine(e.target.checked)}
                                style={{ opacity: 0, width: 0, height: 0 }}
                            />
                            <span style={{
                                position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                backgroundColor: useTeachableMachine ? '#00d2ff' : '#555',
                                borderRadius: '34px',
                                transition: '.4s'
                            }}>
                                <span style={{
                                    position: 'absolute', content: '""', height: '14px', width: '14px', left: '3px', bottom: '3px',
                                    backgroundColor: 'white', borderRadius: '50%', transition: '.4s',
                                    transform: useTeachableMachine ? 'translateX(20px)' : 'translateX(0)'
                                }}></span>
                            </span>
                        </label>
                    </div>

                    {useTeachableMachine && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', animation: 'fadeIn 0.3s ease' }}>
                            {/* Model Type Selection */}
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setTmModelType('online')}
                                    style={{
                                        flex: 1, padding: '8px',
                                        background: tmModelType === 'online' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                                        border: `1px solid ${tmModelType === 'online' ? '#00d2ff' : '#555'}`,
                                        color: tmModelType === 'online' ? '#00d2ff' : '#888',
                                        borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >Online (URL)</button>
                                <button
                                    onClick={() => setTmModelType('offline')}
                                    style={{
                                        flex: 1, padding: '8px',
                                        background: tmModelType === 'offline' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                                        border: `1px solid ${tmModelType === 'offline' ? '#00d2ff' : '#555'}`,
                                        color: tmModelType === 'offline' ? '#00d2ff' : '#888',
                                        borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >Offline (Files)</button>
                            </div>

                            {/* Inputs */}
                            {tmModelType === 'online' ? (
                                <input
                                    type="text"
                                    placeholder="Paste Teachable Machine URL..."
                                    value={tmModelURL}
                                    onChange={(e) => setTmModelURL(e.target.value)}
                                    style={{
                                        padding: '10px', background: '#222', border: '1px solid #444',
                                        borderRadius: '6px', color: 'white', outline: 'none'
                                    }}
                                />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <small style={{ color: '#888' }}>model.json</small>
                                    <input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'model')} style={{ fontSize: '0.8rem' }} />
                                    <small style={{ color: '#888' }}>metadata.json</small>
                                    <input type="file" accept=".json" onChange={(e) => handleFileChange(e, 'metadata')} style={{ fontSize: '0.8rem' }} />
                                    <small style={{ color: '#888' }}>weights.bin</small>
                                    <input type="file" accept=".bin" onChange={(e) => handleFileChange(e, 'weights')} style={{ fontSize: '0.8rem' }} />
                                </div>
                            )}

                            {/* Load Button */}
                            <button
                                onClick={handleLoadTmModel}
                                disabled={tmLoading}
                                style={{
                                    padding: '10px',
                                    background: 'var(--accent-blue)',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: tmLoading ? 'wait' : 'pointer',
                                    marginTop: '5px'
                                }}
                            >
                                {tmLoading ? 'Loading Model...' : 'Load Model'}
                            </button>

                            <div style={{ fontSize: '0.8rem', color: status.includes('Failed') ? '#ff4b4b' : '#00d2ff', marginTop: '5px' }}>
                                Status: {status}
                            </div>
                        </div>
                    )}



                    <button
                        onClick={handleStartAnalysis}
                        style={{
                            padding: '15px',
                            background: isAnalyzing ? '#ff4b4b' : '#00d2ff',
                            color: isAnalyzing ? 'white' : 'black',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            marginTop: '10px',
                            fontSize: '1rem'
                        }}
                    >
                        {isAnalyzing ? <Pause size={20} /> : <Play size={20} />}
                        {isAnalyzing ? 'Stop Analysis' : 'Start Analysis'}
                    </button>

                    {!useTeachableMachine && (
                        <button
                            onClick={handleCaptureGoldenCycle}
                            disabled={isAnalyzing || isRecording}
                            style={{
                                padding: '12px',
                                background: isRecording ? '#ff4b4b' : '#333',
                                border: '1px solid #555',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
                        >
                            {isRecording ? (
                                <>Recording... {Math.round(recordingProgress)}%</>
                            ) : (
                                <><Camera size={18} /> Capture Current</>
                            )}
                        </button>
                    )}
                </div>

                {/* Anomaly Counter & Export */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '15px',
                    background: 'rgba(255, 0, 0, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 0, 0, 0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4b4b' }}>
                            <AlertTriangle size={18} /> Anomalies
                        </span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4b4b' }}>{anomalies}</span>
                    </div>
                    <button
                        onClick={handleExportAnomalies}
                        disabled={anomalies === 0}
                        style={{
                            padding: '8px',
                            backgroundColor: anomalies > 0 ? '#ff4b4b' : '#555',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: anomalies > 0 ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Save size={14} /> Export to Timeline
                    </button>
                </div>
            </div>

            {/* Toggle Button Strip */}
            <div
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                style={{
                    position: 'absolute',
                    left: isSidebarOpen ? '287px' : '7px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '24px',
                    height: '48px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '0 12px 12px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 100,
                    transition: 'left 0.3s ease',
                    color: isSidebarOpen ? '#aaa' : '#00d2ff'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            >
                {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
            </div>

            {/* Right Panel: Visualization & Graphs */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: activeTab === 'analysis' ? '1fr' : '1fr 380px',
                gridTemplateRows: '1fr auto',
                gap: '12px',
                minHeight: 0,
                height: '100%',
                overflow: 'hidden'
            }}>
                {/* Unified Video Player Area (Always Mounted for Ref) */}
                <div style={{
                    position: 'relative',
                    background: '#000',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    gridColumn: activeTab === 'analysis' ? 'auto' : '1',
                    gridRow: activeTab === 'analysis' ? 'auto' : '1',
                    transition: 'height 0.3s ease',
                    flexShrink: 0
                }}>
                    {videoSrc ? (
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            onLoadedMetadata={handleLoadedMetadata}
                            onTimeUpdate={handleVideoTimeUpdate}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                opacity: activeTab === 'analysis' ? 0.6 : 1
                            }}
                            autoPlay={activeTab === 'analysis'}
                            loop={activeTab === 'analysis'}
                            muted={activeTab === 'analysis'}
                            controls={activeTab === 'slicer'}
                        />
                    ) : (
                        <div style={{ color: '#555' }}>No Video Source</div>
                    )}

                    {/* Only show Skeleton overlay in Analysis tab */}
                    {activeTab === 'analysis' && (
                        <canvas
                            ref={canvasRef}
                            width={800}
                            height={450}
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

                    {activeTab === 'analysis' && (
                        <div style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            color: isAnalyzing || isRecording ? '#00ff00' : '#666',
                            border: `1px solid ${isAnalyzing || isRecording ? '#00ff00' : '#666'} `
                        }}>
                            {isRecording ? 'RECORDING' : isAnalyzing ? 'LIVE INFERENCE' : 'IDLE'}
                        </div>
                    )}
                </div>

                {/* Tab Specific Content */}
                {activeTab === 'analysis' && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '15px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        gridColumn: '1',
                        gridRow: '2',
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: '200px'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#ccc' }}>{t('machineLearning.consistencyTrend')}</h3>
                        {dataPoints.length === 0 ? (
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#666',
                                fontSize: '0.9rem'
                            }}>
                                Press "Start Analysis" to see the graph
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: '280px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dataPoints}>
                                        <defs>
                                            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#00d2ff" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#00d2ff" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                        <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10, fill: '#999' }} />
                                        <YAxis domain={[0, 100]} stroke="#666" tick={{ fontSize: 10, fill: '#999' }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}
                                            itemStyle={{ color: '#00d2ff' }}
                                        />
                                        <Area type="monotone" dataKey="score" stroke="#00d2ff" strokeWidth={2} fillOpacity={1} fill="url(#colorScore)" />
                                        <Line type="monotone" dataKey="threshold" stroke="#ff4b4b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                )}

                {/* Left Column (Main Area for Slicer) */}
                {activeTab === 'slicer' && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: '16px',
                        padding: '15px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        height: '300px',
                        gridColumn: '1',
                        gridRow: '2',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', color: '#ffd700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Scissors size={18} /> {t('machineLearning.videoSlicer')}
                            </h3>
                            <p style={{ margin: 0, color: '#888', fontSize: '0.75rem' }}>{t('machineLearning.videoSlicerDesc')}</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Control Panel */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '12px', border: '1px solid #333' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{t('machineLearning.selectSegment')}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#888' }}>
                                                Total: <b style={{ color: '#00d2ff' }}>{(slicerEnd - slicerStart).toFixed(1)}s</b>
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <button
                                                        onClick={() => setSlicerStart(Math.max(0, slicerStart - 0.1))}
                                                        style={{ background: '#222', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                    >-0.1s</button>
                                                    <input
                                                        type="number"
                                                        value={slicerStart.toFixed(1)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val)) setSlicerStart(Math.min(Math.max(0, val), slicerEnd - 0.1));
                                                        }}
                                                        style={{ width: '60px', background: 'transparent', border: '1px solid #333', color: '#00d2ff', textAlign: 'center', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                    />
                                                    <button
                                                        onClick={() => setSlicerStart(Math.min(slicerEnd - 0.1, slicerStart + 0.1))}
                                                        style={{ background: '#222', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                    >+0.1s</button>
                                                </div>
                                                <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>Start Time</small>
                                            </div>

                                            <span style={{ color: '#444' }}>|</span>

                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <button
                                                        onClick={() => setSlicerEnd(Math.max(slicerStart + 0.1, slicerEnd - 0.1))}
                                                        style={{ background: '#222', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                    >-0.1s</button>
                                                    <input
                                                        type="number"
                                                        value={slicerEnd.toFixed(1)}
                                                        onChange={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (!isNaN(val)) setSlicerEnd(Math.max(Math.min(val, videoRef.current?.duration || 100), slicerStart + 0.1));
                                                        }}
                                                        style={{ width: '60px', background: 'transparent', border: '1px solid #333', color: '#ff4b4b', textAlign: 'center', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}
                                                    />
                                                    <button
                                                        onClick={() => setSlicerEnd(Math.min(videoRef.current?.duration || 100, slicerEnd + 0.1))}
                                                        style={{ background: '#222', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem' }}
                                                    >+0.1s</button>
                                                </div>
                                                <small style={{ fontSize: '0.7rem', color: '#666', marginTop: '2px' }}>End Time</small>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline Overview / Minimap */}
                                    <div style={{ marginBottom: '15px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '0.75rem', color: '#888', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Maximize size={12} /> Timeline Overview
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={handleResetZoom} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer' }}>Reset</button>
                                                <button onClick={handleZoomOut} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}><ZoomOut size={14} /></button>
                                                <button onClick={handleZoomIn} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid #444', color: '#aaa', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}><ZoomIn size={14} /></button>
                                            </div>
                                        </div>
                                        <div
                                            style={{
                                                position: 'relative',
                                                height: '24px',
                                                background: '#111',
                                                borderRadius: '4px',
                                                overflow: 'hidden',
                                                border: '1px solid #333'
                                            }}
                                            onClick={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const pct = x / rect.width;
                                                const duration = videoRef.current?.duration || 100;
                                                const center = pct * duration;
                                                const range = zoomEnd - zoomStart;
                                                setZoomStart(Math.max(0, center - range / 2));
                                                setZoomEnd(Math.min(duration, center + range / 2));
                                            }}
                                        >
                                            {/* Overview Filmstrip (Static) */}
                                            <div style={{ display: 'flex', height: '100%', opacity: 0.3 }}>
                                                {filmstrip.map((thumb, i) => (
                                                    <img key={i} src={thumb} style={{ height: '100%', flex: 1, objectFit: 'cover' }} alt="mini" />
                                                ))}
                                            </div>
                                            {/* Zoom Window Indicator */}
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                height: '100%',
                                                left: `${(zoomStart / (videoRef.current?.duration || 100)) * 100}%`,
                                                width: `${((zoomEnd - zoomStart) / (videoRef.current?.duration || 100)) * 100}%`,
                                                background: 'rgba(0, 210, 255, 0.3)',
                                                border: '1px solid #00d2ff',
                                                boxSizing: 'border-box'
                                            }} />
                                        </div>
                                    </div>

                                    <div style={{ position: 'relative', height: '60px', marginTop: '10px', display: 'flex', alignItems: 'center' }}>
                                        {/* Floating Preview Thumbnail */}
                                        {(hoverThumbnail) && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: '70px',
                                                left: `${previewPos}%`,
                                                transform: 'translateX(-50%)',
                                                width: '120px',
                                                height: '68px',
                                                borderRadius: '8px',
                                                border: '2px solid #fff',
                                                boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
                                                overflow: 'hidden',
                                                zIndex: 10,
                                                pointerEvents: 'none',
                                                background: '#000'
                                            }}>
                                                <img src={hoverThumbnail} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Preview" />
                                            </div>
                                        )}

                                        {/* Background Track with Filmstrip (Zoomed) */}
                                        <div style={{
                                            position: 'absolute',
                                            height: '40px',
                                            width: '100%',
                                            background: '#1a1a1a',
                                            borderRadius: '8px',
                                            overflow: 'hidden',
                                            opacity: 0.6,
                                            border: '1px solid #333'
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                height: '100%',
                                                width: `${((videoRef.current?.duration || 100) / (zoomEnd - zoomStart)) * 100}%`,
                                                marginLeft: `-${(zoomStart / (zoomEnd - zoomStart)) * 100}%`,
                                                transition: 'all 0.2s ease'
                                            }}>
                                                {filmstrip.length > 0 ? filmstrip.map((thumb, i) => (
                                                    <img key={i} src={thumb} style={{ height: '100%', flex: 1, objectFit: 'cover' }} alt="Filmstrip" />
                                                )) : (
                                                    <div style={{ width: '100%', height: '100%', background: '#111' }} />
                                                )}
                                            </div>
                                        </div>

                                        {/* Progress Track Overlay */}
                                        <div style={{
                                            position: 'absolute',
                                            height: '40px',
                                            width: '100%',
                                            pointerEvents: 'none',
                                            zIndex: 1
                                        }}>
                                            {/* Highlighted Range Area */}
                                            <div style={{
                                                position: 'absolute',
                                                height: '100%',
                                                left: `${((slicerStart - zoomStart) / (zoomEnd - zoomStart)) * 100}%`,
                                                width: `${((slicerEnd - slicerStart) / (zoomEnd - zoomStart)) * 100}%`,
                                                background: 'rgba(0, 210, 255, 0.2)',
                                                borderLeft: '2px solid #00d2ff',
                                                borderRight: '2px solid #ff4b4b',
                                                boxSizing: 'border-box'
                                            }} />
                                            {/* Progress Indicator */}
                                            <div style={{
                                                position: 'absolute',
                                                height: '100%',
                                                left: `${((localCurrentTime - zoomStart) / (zoomEnd - zoomStart)) * 100}%`,
                                                width: '2px',
                                                background: '#fff',
                                                boxShadow: '0 0 10px #fff',
                                                zIndex: 3
                                            }} />
                                        </div>

                                        {/* Real Inputs for Handles */}
                                        <input
                                            type="range"
                                            min={zoomStart}
                                            max={zoomEnd || 100}
                                            step="0.01"
                                            value={slicerStart}
                                            onMouseDown={() => videoRef.current?.pause()}
                                            onMouseLeave={() => setHoverThumbnail(null)}
                                            onMouseMove={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                                                const time = zoomStart + (pct / 100) * (zoomEnd - zoomStart);
                                                setPreviewPos(pct);
                                                updateHoverThumbnail(time);
                                            }}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setSlicerStart(Math.min(val, slicerEnd - 0.1));
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = val;
                                                }
                                            }}
                                            style={{
                                                position: 'absolute',
                                                width: '100%',
                                                background: 'transparent',
                                                appearance: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 5,
                                                margin: 0,
                                                height: '40px'
                                            }}
                                            className="dual-range-input-large"
                                        />
                                        <input
                                            type="range"
                                            min={zoomStart}
                                            max={zoomEnd || 100}
                                            step="0.01"
                                            value={slicerEnd}
                                            onMouseDown={() => videoRef.current?.pause()}
                                            onMouseLeave={() => setHoverThumbnail(null)}
                                            onMouseMove={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const x = e.clientX - rect.left;
                                                const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
                                                const time = zoomStart + (pct / 100) * (zoomEnd - zoomStart);
                                                setPreviewPos(pct);
                                                updateHoverThumbnail(time);
                                            }}
                                            onChange={(e) => {
                                                const val = parseFloat(e.target.value);
                                                setSlicerEnd(Math.max(val, slicerStart + 0.1));
                                                if (videoRef.current) {
                                                    videoRef.current.currentTime = val;
                                                }
                                            }}
                                            style={{
                                                position: 'absolute',
                                                width: '100%',
                                                background: 'transparent',
                                                appearance: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 5,
                                                margin: 0,
                                                height: '40px'
                                            }}
                                            className="dual-range-input-large"
                                        />

                                        <style>{`
                                            .dual-range-input-large::-webkit-slider-thumb {
                                                appearance: none;
                                                pointer-events: auto;
                                                width: 12px;
                                                height: 48px;
                                                background: #fff;
                                                cursor: ew-resize;
                                                border: 2px solid #00d2ff;
                                                border-radius: 4px;
                                                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                                            }
                                            .dual-range-input-large:last-of-type::-webkit-slider-thumb {
                                                border-color: #ff4b4b;
                                            }
                                        `}</style>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                        <button
                                            onClick={handlePreviewSlice}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                background: 'rgba(0, 210, 255, 0.2)',
                                                border: '1px solid #00d2ff',
                                                color: '#00d2ff',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                fontWeight: 'bold',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Play size={16} fill="#00d2ff" /> {t('machineLearning.previewSlice', 'Preview Slice')}
                                        </button>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button
                                                onClick={() => { if (videoRef.current) videoRef.current.currentTime = slicerStart; }}
                                                style={{ flex: 1, padding: '6px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >{t('machineLearning.previewStart')}</button>
                                            <button
                                                onClick={() => { if (videoRef.current) videoRef.current.currentTime = slicerEnd; }}
                                                style={{ flex: 1, padding: '6px', background: '#333', border: '1px solid #444', color: 'white', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            >{t('machineLearning.previewEnd')}</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Right Column (Sidebar for Slicer Only) */}
                {activeTab === 'slicer' && (
                    <div style={{
                        gridColumn: '2',
                        gridRow: '1 / span 2',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        height: '100%',
                        overflow: 'hidden',
                        paddingTop: '5px'
                    }}>
                        {/* Meta Panel */}
                        <div style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '15px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#00d2ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Save size={16} /> {t('machineLearning.clipRecording') || 'Clip Metadata'}
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Clip Name (e.g. Activity_A)"
                                    value={clipLabel}
                                    onChange={(e) => setClipLabel(e.target.value)}
                                    style={{
                                        padding: '10px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '0.85rem'
                                    }}
                                />
                                <select
                                    value={clipCategory}
                                    onChange={(e) => setClipCategory(e.target.value)}
                                    style={{
                                        padding: '8px',
                                        background: '#222',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '0.8rem',
                                        outline: 'none'
                                    }}
                                >
                                    {LABEL_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <textarea
                                    placeholder="Add notes for this clip..."
                                    value={clipNotes}
                                    onChange={(e) => setClipNotes(e.target.value)}
                                    style={{
                                        padding: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid #444',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        outline: 'none',
                                        fontSize: '0.8rem',
                                        minHeight: '50px',
                                        resize: 'none'
                                    }}
                                />
                                <button
                                    onClick={handleCaptureClip}
                                    style={{
                                        padding: '10px',
                                        background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    <Film size={16} /> {t('machineLearning.captureClip')}
                                </button>
                                <button
                                    onClick={handleExportMetadata}
                                    disabled={capturedClips.length === 0}
                                    style={{
                                        padding: '6px',
                                        background: 'transparent',
                                        border: '1px solid rgba(0, 210, 255, 0.4)',
                                        color: '#00d2ff',
                                        borderRadius: '8px',
                                        fontSize: '0.75rem',
                                        cursor: capturedClips.length === 0 ? 'not-allowed' : 'pointer',
                                        opacity: capturedClips.length === 0 ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <Download size={12} /> {t('common.export') || 'Export Metadata'}
                                </button>
                            </div>
                        </div>

                        {/* Gallery Section */}
                        <div style={{
                            flex: 1,
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            borderRadius: '16px',
                            padding: '15px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '5px' }}>{t('machineLearning.datasetGallery')} ({capturedClips.length})</div>
                            <div style={{
                                flex: 1,
                                minHeight: '200px',
                                maxHeight: '400px',
                                overflowY: 'auto',
                                background: 'rgba(0,0,0,0.2)',
                                borderRadius: '12px',
                                border: '1px solid #333',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}>
                                {capturedClips.length === 0 ? (
                                    <div style={{
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#555',
                                        fontSize: '0.85rem',
                                        gap: '15px',
                                        padding: '40px 20px',
                                        textAlign: 'center'
                                    }}>
                                        <Film size={48} strokeWidth={1} style={{ opacity: 0.3 }} />
                                        <div>
                                            <div style={{ color: '#888', fontWeight: 'bold', marginBottom: '4px' }}>{t('machineLearning.noClips', 'Dataset Gallery Empty')}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{t('machineLearning.galleryDescription', 'Capture clips from the video to build your specialized dataset.')}</div>
                                        </div>
                                    </div>
                                ) : (
                                    capturedClips.map(clip => (
                                        <div key={clip.id} style={{
                                            padding: '8px 12px',
                                            background: '#2a2a2a',
                                            borderRadius: '8px',
                                            border: '1px solid #444',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div
                                                onClick={() => { if (videoRef.current) videoRef.current.currentTime = clip.startTime; }}
                                                style={{ display: 'flex', gap: '15px', alignItems: 'center', flex: 1, minWidth: 0, cursor: 'pointer' }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.label}</span>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            padding: '3px 8px',
                                                            background: clip.category === 'Anomaly/Waste' ? 'rgba(255, 75, 75, 0.2)' : 'rgba(0, 210, 255, 0.2)',
                                                            color: clip.category === 'Anomaly/Waste' ? '#ff4b4b' : '#00d2ff',
                                                            borderRadius: '6px',
                                                            border: `1px solid ${clip.category === 'Anomaly/Waste' ? 'rgba(255, 75, 75, 0.4)' : 'rgba(0, 210, 255, 0.4)'}`,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {clip.category}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <div style={{ fontSize: '0.8rem', color: '#999', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <Scissors size={14} style={{ opacity: 0.7 }} /> {clip.startTime.toFixed(1)}s - {clip.endTime.toFixed(1)}s
                                                        </div>
                                                        {clip.notes && (
                                                            <div
                                                                title={clip.notes}
                                                                style={{ fontSize: '0.75rem', color: '#bbb', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                                                            >
                                                                "{clip.notes}"
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {/* Extract Images Button */}
                                                <button
                                                    onClick={() => handleExtractImages(clip)}
                                                    disabled={isExtracting === clip.id}
                                                    title={t('machineLearning.extractToZip')}
                                                    style={{
                                                        background: 'rgba(0, 255, 0, 0.1)',
                                                        border: '2px solid #00ff00',
                                                        color: '#00ff00',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 10px rgba(0,255,0,0.2)'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0, 255, 0, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0, 255, 0, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    {isExtracting === clip.id ? <RefreshCw size={18} className="animate-spin" /> : <Image size={18} />}
                                                </button>

                                                {/* Download Button */}
                                                <button
                                                    onClick={() => handleDownloadClip(clip)}
                                                    disabled={!!cuttingProgress}
                                                    title={t('machineLearning.downloadClip', 'Download Video Clip')}
                                                    style={{
                                                        background: 'rgba(68, 68, 255, 0.1)',
                                                        border: '2px solid #44f',
                                                        color: '#44f',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        minWidth: '34px',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 10px rgba(68,68,255,0.2)'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(68, 68, 255, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(68, 68, 255, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    {cuttingProgress?.id === clip.id ? (
                                                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{Math.round(cuttingProgress.percent)}%</span>
                                                    ) : (
                                                        <Download size={18} />
                                                    )}
                                                </button>

                                                {/* Save as Project Button */}
                                                <button
                                                    onClick={() => handleSaveClipAsProject(clip)}
                                                    disabled={isSavingProject}
                                                    title={t('workspace.saveClipAsProject')}
                                                    style={{
                                                        background: 'rgba(255, 215, 0, 0.1)',
                                                        border: '2px solid #ffd700',
                                                        color: '#ffd700',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        cursor: isSavingProject ? 'not-allowed' : 'pointer',
                                                        opacity: isSavingProject ? 0.5 : 1,
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 10px rgba(255,215,0,0.2)'
                                                    }}
                                                    onMouseOver={(e) => { if (!isSavingProject) { e.currentTarget.style.background = 'rgba(255, 215, 0, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; } }}
                                                    onMouseOut={(e) => { if (!isSavingProject) { e.currentTarget.style.background = 'rgba(255, 215, 0, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; } }}
                                                >
                                                    {isSavingProject && cuttingProgress?.id === clip.id ? (
                                                        <RefreshCw size={18} className="animate-spin" />
                                                    ) : (
                                                        <ExternalLink size={18} />
                                                    )}
                                                </button>

                                                {/* Delete Button */}
                                                <button
                                                    onClick={() => handleRemoveClip(clip.id)}
                                                    title={t('machineLearning.deleteClip')}
                                                    style={{
                                                        background: 'rgba(255, 68, 68, 0.1)',
                                                        border: '2px solid #f44',
                                                        color: '#f44',
                                                        padding: '6px',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        boxShadow: '0 0 10px rgba(255,68,68,0.2)'
                                                    }}
                                                    onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 68, 68, 0.1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Help Modal */}
            {
                showHelp && (
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
                                <h2 style={{ margin: 0, color: '#ffd700', fontSize: '1.25rem' }}>🤖 Teachable Machine Studio - Help</h2>
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
                                <h3 style={{ color: '#ffd700', marginTop: 0 }}>📌 Fungsi</h3>
                                <p style={{ lineHeight: '1.6', color: '#ccc' }}>
                                    Analisis konsistensi gerakan operator menggunakan AI Pose Detection dengan Golden Cycle sebagai referensi standar.
                                </p>

                                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>🚀 Cara Pakai</h3>
                                <ol style={{ lineHeight: '1.8', color: '#ccc' }}>
                                    <li><strong>Set Golden Cycle</strong> (Gerakan Referensi):
                                        <ul>
                                            <li>📹 <strong>Capture Current</strong>: Rekam gerakan standar selama 5 detik</li>
                                            <li>Pastikan video menampilkan gerakan yang konsisten</li>
                                        </ul>
                                    </li>
                                    <li>Klik <strong>Start Analysis</strong> untuk mulai deteksi real-time</li>
                                    <li>Monitor:
                                        <ul>
                                            <li><strong>Consistency Score</strong>: % kecocokan dengan Golden Cycle (menggunakan DTW algorithm)</li>
                                            <li><strong>Anomaly Graph</strong>: Tren deviasi dari waktu ke waktu</li>
                                            <li><strong>Live Skeleton Feed</strong>: Visualisasi pose detection real-time</li>
                                        </ul>
                                    </li>
                                </ol>

                                <h3 style={{ color: '#ffd700', marginTop: '20px' }}>💡 Tips</h3>
                                <ul style={{ lineHeight: '1.8', color: '#ccc' }}>
                                    <li>Rekam gerakan terbaik sebagai Golden Cycle</li>
                                    <li>Threshold 80% = batas minimum konsistensi</li>
                                    <li>Anomaly tinggi = perlu retraining operator</li>
                                    <li>Pastikan pencahayaan cukup untuk deteksi pose yang akurat</li>
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
                )
            }
        </div >
    );
};

export default MachineLearningData;
