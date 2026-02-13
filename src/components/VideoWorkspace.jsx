import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ElementEditor from './ElementEditor';
import PlaybackControls from './features/PlaybackControls';
import TimelineMeasurement from './features/TimelineMeasurement';
import TimelineEditor from './features/TimelineEditor';
import VideoAnnotation from './features/VideoAnnotation';
import { validateMeasurement } from '../utils/smartSuggestions';
import IPCameraConnect from './features/IPCameraConnect';
import ErgonomicAnalysis from './ErgonomicAnalysis';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { captureScreenshot, exportAnalysisData } from '../utils/screenshotCapture';
import PoseVisualizer from './features/PoseVisualizer';
import PoseVisualizer3D from './features/PoseVisualizer3D';
import VideoIntelligence from './VideoIntelligence';
import { useLanguage } from '../contexts/LanguageContext';
import { useDialog } from '../contexts/DialogContext';
import {
    FolderRoot,
    Palette,
    Video,
    Accessibility,
    Sparkles,
    Maximize,
    Minimize,
    Plus,
    ChevronRight,
    Settings,
    Layout,
    Pencil,
    Ruler,
    Square,
    Circle,
    Type,
    Download,
    Upload,
    ArrowLeft,
    Type as ArrowRightIcon
} from 'lucide-react';

function VideoWorkspace({
    measurements,
    onUpdateMeasurements,
    videoSrc,
    onVideoChange,
    videoName,
    onVideoNameChange,
    currentProject,
    onNewProject,
    onOpenProject,
    onSaveProject,
    onSaveProjectAs,
    onExportProject,
    onImportProject,
    onLogout,
    videoFile,
    onVideoFileChange
}) {
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const { showAlert } = useDialog();
    const fromVSM = location.state?.fromVSM;

    const fileInputRef = useRef(null);
    const [logoUrl, setLogoUrl] = useState(null);
    const [logoPosition, setLogoPosition] = useState('bottom-right');
    const [logoOpacity, setLogoOpacity] = useState(0.7);
    const [leftPanelWidth, setLeftPanelWidth] = useState(35); // Initial width in percentage
    const [drawingAnnotations, setDrawingAnnotations] = useState([]);
    const [showAnnotationTool, setShowAnnotationTool] = useState(false);
    const [fullScreenMode, setFullScreenMode] = useState('none'); // 'none', 'video', 'editor'
    const [projectMenuOpen, setProjectMenuOpen] = useState(false);
    const [currentCycle, setCurrentCycle] = useState(1);
    const [showStats, setShowStats] = useState(true);

    const formatTime = (seconds) => {
        if (isNaN(seconds)) return '00:00.00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const handleNextCycle = () => {
        setCurrentCycle(prev => prev + 1);
    };

    const handlePrevCycle = () => {
        setCurrentCycle(prev => Math.max(1, prev - 1));
    };


    // Drawing State
    const [currentTool, setCurrentTool] = useState('pen'); // pen, line, arrow, rectangle, circle, text, eraser
    const [drawColor, setDrawColor] = useState('#ff0000');
    const [lineWidth, setLineWidth] = useState(3);

    // IP Camera & Recording State
    const [videoSourceType, setVideoSourceType] = useState('file'); // 'file', 'stream', 'webcam'
    const [showCameraPanel, setShowCameraPanel] = useState(false);
    const [isStreamConnected, setIsStreamConnected] = useState(false);
    const [isMJPEG, setIsMJPEG] = useState(false);

    const [showErgonomicAnalysis, setShowErgonomicAnalysis] = useState(false);
    const [ergonomicData, setErgonomicData] = useState(null);
    const [showVideoIntelligence, setShowVideoIntelligence] = useState(false);

    // Stopwatch and Selection State (Lifted from ElementEditor)
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [stopwatches, setStopwatches] = useState({}); // { [elementId]: { manual: startTime, auto: startTime, ... } }

    const containerRef = useRef(null);
    const videoContainerRef = useRef(null);
    const isResizing = useRef(false);



    // Use video player hook
    const {
        videoRef,
        videoState,
        togglePlay,
        setPlaybackSpeed,
        nextFrame,
        previousFrame,
        seekTo,
        setZoom,
        addMeasurement,
        removeMeasurement,
        updateMeasurements,
        toggleReverse,
        handleTimeUpdate,
        handleLoadedMetadata
    } = useVideoPlayer(measurements);

    const handleAddMeasurement = (measurement) => {
        addMeasurement({
            ...measurement,
            cycle: measurement.cycle || currentCycle
        });
    };

    // Measurement State (Lifted from TimelineMeasurement)
    const [measurementStart, setMeasurementStart] = useState(null);
    const [newElementName, setNewElementName] = useState('');
    const [quickMode, setQuickMode] = useState(false);
    const [autoCounter, setAutoCounter] = useState(1);
    const [validationWarnings, setValidationWarnings] = useState([]);

    const handleStartMeasurement = () => {
        // Find previous end time for gap filling, or 0 if no measurements
        let startTime = 0;
        if (measurements && measurements.length > 0) {
            const latestEndTime = Math.max(...measurements.map(m => m.endTime));
            startTime = latestEndTime;
        }

        setMeasurementStart(startTime);

        console.log('🎬 Measurement Started:', {
            requestedStartTime: startTime,
            videoCurrentTime: videoState.currentTime
        });

        if (quickMode) {
            setNewElementName(`Element ${autoCounter}`);
        } else {
            setValidationWarnings([]);
        }
    };

    const handleEndMeasurement = (name = newElementName, category = 'Value-added', therblig = '') => {
        if (measurementStart !== null && name.trim()) {
            const measurement = {
                id: Date.now().toString(),
                startTime: measurementStart,
                endTime: videoState.currentTime,
                elementName: name,
                category: category,
                therblig: therblig,
                duration: videoState.currentTime - measurementStart,
                rating: 0,
                cycle: currentCycle
            };

            const { warnings } = validateMeasurement(measurement, videoState.measurements);
            if (warnings.length > 0) {
                setValidationWarnings(warnings);
            }

            handleAddMeasurement(measurement);
            setMeasurementStart(null);
            setNewElementName('');
            setValidationWarnings([]);
            if (quickMode) {
                setAutoCounter(prev => prev + 1);
            }
        }
    };

    const handleCancelMeasurement = () => {
        setMeasurementStart(null);
        setNewElementName('');
    };

    const handleQuickCategorize = async (type) => {
        const currentTime = videoState.currentTime;
        // Check active element at timestamp first
        const activeElement = videoState.measurements.find(
            m => currentTime >= m.startTime && currentTime <= m.endTime
        );

        const id = activeElement ? activeElement.id : selectedElementId;

        if (!id) {
            await showAlert('No Active Element', 'Tidak ada elemen aktif pada waktu ini. Silakan pilih elemen atau play video di area elemen.');
            return;
        }

        if (!videoState || !videoState.currentTime) {
            await showAlert('Info', 'Playback video required for stopwatch.');
            return;
        }


        const currentStopwatches = stopwatches[id] || {};
        const isAlreadyRunning = currentStopwatches[type] !== undefined;
        const measurements = videoState.measurements;

        if (isAlreadyRunning) {
            // STOPPING: Calculate delta and add to element
            const startTime = currentStopwatches[type];
            const delta = Math.max(0, currentTime - startTime);

            updateMeasurements(measurements.map(m => {
                if (m.id === id) {
                    const newValue = (m[`${type}Time`] || 0) + delta;

                    return {
                        ...m,
                        [`${type}Time`]: newValue,
                        waitingTime: type === 'waiting' ? newValue : (m.waitingTime || 0)
                    };
                }
                return m;
            }));

            // Clear this specific stopwatch
            const nextStopwatches = { ...currentStopwatches };
            delete nextStopwatches[type];

            setStopwatches({
                ...stopwatches,
                [id]: nextStopwatches
            });
        } else {
            // STARTING: Record start time
            // Ensure video is playing? Optional, but good practice.
            if (!videoState.isPlaying) {
                togglePlay();
            }

            const nextStopwatches = {
                ...currentStopwatches,
                [type]: currentTime
            };

            setStopwatches({
                ...stopwatches,
                [id]: nextStopwatches
            });
        }
    };

    // Store video ref globally for broadcast feature
    // Update continuously, not just on mount
    useEffect(() => {
        const updateGlobalRef = () => {
            if (videoRef.current) {
                window.__motionVideoElement = videoRef.current;
            }
        };
        updateGlobalRef();
        const interval = setInterval(updateGlobalRef, 1000);
        return () => {
            clearInterval(interval);
            window.__motionVideoElement = null;
        };
    }, [videoRef, videoSrc, isStreamConnected]);

    // Keyboard shortcuts for quick measurement and playback
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.target.matches('input, textarea, select')) return;

            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();

                // Get current video time
                const currentTime = videoState.currentTime;

                // Find previous end time
                let startTime = 0;
                if (measurements && measurements.length > 0) {
                    const sortedMeasurements = [...measurements].sort((a, b) => b.endTime - a.endTime);
                    startTime = sortedMeasurements[0].endTime;
                }

                let endTime = currentTime;

                // Enforce minimum duration if current time is not past previous end
                if (endTime <= startTime) {
                    endTime = Math.min(videoState.duration || Infinity, startTime + 0.5);
                }

                // Bound by video duration
                if (videoState.duration && endTime > videoState.duration) {
                    endTime = videoState.duration;
                }

                const duration = endTime - startTime;

                const newMeasurement = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    startTime: startTime,
                    endTime: endTime,
                    duration: duration,
                    elementName: `Element ${autoCounter}`,
                    category: 'Value-added',
                    therblig: '',
                    rating: 100,
                    cycle: currentCycle
                };

                console.log('🟢 Quick Add (O):', {
                    previousEndTime: startTime,
                    currentTime: currentTime,
                    newStartTime: startTime,
                    newEndTime: endTime,
                    duration: duration
                });

                onUpdateMeasurements([...measurements, newMeasurement]);
                setAutoCounter(prev => prev + 1);
            } else if (e.key === 'Control') {
                e.preventDefault();
                togglePlay();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                nextFrame();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                previousFrame();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [videoState.currentTime, videoState.duration, videoState.isPlaying, measurements, autoCounter, currentCycle, onUpdateMeasurements, togglePlay, nextFrame, previousFrame]);





    const startResizing = useCallback(() => {
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }, []);

    const stopResizing = useCallback(() => {
        isResizing.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (!isResizing.current || !containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
        if (newWidth > 15 && newWidth < 85) { // Min/Max constraints
            setLeftPanelWidth(newWidth);
        }
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            onVideoChange(url);
            onVideoNameChange(file.name);
            if (onVideoFileChange) {
                onVideoFileChange(file);
            }
        }
    };

    const handleScreenshot = () => {
        captureScreenshot(videoRef.current, videoState.measurements, logoUrl, logoPosition, logoOpacity);
    };

    const handleExportData = () => {
        const videoName = videoSrc ? videoSrc.split('/').pop().split('.')[0] : 'Untitled';
        exportAnalysisData(videoState.measurements, videoName);
    };

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                onImportProject(file);
            }
        };
        input.click();
    };


    // Handle seek from timeline
    useEffect(() => {
        const handleSeek = (e) => {
            seekTo(e.detail);
        };
        window.addEventListener('seek', handleSeek);
        return () => window.removeEventListener('seek', handleSeek);
    }, [seekTo]);

    // Sync measurements with parent
    useEffect(() => {
        onUpdateMeasurements(videoState.measurements);
    }, [videoState.measurements, onUpdateMeasurements]);

    // Handle logo upload from header
    useEffect(() => {
        const input = document.getElementById('header-logo-upload');
        const handleLogoChange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                setLogoUrl(url);
            }
        };

        if (input) {
            input.addEventListener('change', handleLogoChange);
            return () => input.removeEventListener('change', handleLogoChange);
        }
    }, []);

    // Handle screenshot from header
    useEffect(() => {
        const handleScreenshotEvent = () => {
            if (videoRef.current && videoSrc) {
                handleScreenshot();
            }
        };
        window.addEventListener('screenshot', handleScreenshotEvent);
        return () => window.removeEventListener('screenshot', handleScreenshotEvent);
    }, [videoRef, videoSrc, logoUrl, logoPosition, logoOpacity, videoState.measurements]);

    // Handle export from header
    useEffect(() => {
        const handleExportEvent = () => {
            if (videoState.measurements.length > 0) {
                handleExportData();
            }
        };
        window.addEventListener('export-json', handleExportEvent);
        return () => window.removeEventListener('export-json', handleExportEvent);
    }, [videoState.measurements, videoSrc]);

    const getLogoStyle = () => {
        const base = {
            position: 'absolute',
            opacity: logoOpacity,
            width: '100px',
            height: 'auto',
            zIndex: 5,
            pointerEvents: 'none'
        };

        switch (logoPosition) {
            case 'top-left':
                return { ...base, top: '10px', left: '10px' };
            case 'top-right':
                return { ...base, top: '10px', right: '10px' };
            case 'bottom-left':
                return { ...base, bottom: '60px', left: '10px' };
            case 'bottom-right':
            default:
                return { ...base, bottom: '60px', right: '10px' };
        }
    };

    const tools = [
        { id: 'pen', icon: <Pencil size={18} />, label: t('videoWorkspace.pen') },
        { id: 'line', icon: <Ruler size={18} />, label: t('videoWorkspace.line') },
        { id: 'arrow', icon: <ChevronRight size={18} />, label: t('videoWorkspace.arrow') },
        { id: 'rectangle', icon: <Square size={18} />, label: t('videoWorkspace.rectangle') },
        { id: 'circle', icon: <Circle size={18} />, label: t('videoWorkspace.circle') },
        { id: 'text', icon: <Type size={18} />, label: t('videoWorkspace.text') }
    ];

    const toolbarButtonStyle = {
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        color: 'white',
        backgroundColor: 'var(--bg-tertiary)'
    };


    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'];

    // Resolve effective selected ID (Time-based > Manual)
    const activeTimeElement = videoState.measurements?.find(
        m => videoState.currentTime >= m.startTime && videoState.currentTime <= m.endTime
    );
    const effectiveSelectedId = activeTimeElement ? activeTimeElement.id : selectedElementId;

    return (
        <div ref={containerRef} style={{ flex: 2, display: 'flex', minHeight: '0', position: 'relative' }}>
            {/* ... (rest of the component until PlaybackControls) ... */}
            {/* Video Player Section */}
            <div style={{
                width: fullScreenMode === 'video' ? '100%' : fullScreenMode === 'editor' ? '0%' : `${leftPanelWidth}%`,
                display: fullScreenMode === 'editor' ? 'none' : 'flex',
                flexDirection: 'column',
                backgroundColor: '#000',
                position: 'relative'
            }}>
                {/* Main Toolbar Container */}
                <div className="glass-panel" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 20px',
                    margin: '10px',
                    borderRadius: '16px',
                    flexWrap: 'wrap',
                    zIndex: 10
                }}>
                    {/* Project Management Group */}
                    <div style={{ display: 'flex', gap: '8px', marginRight: '10px', position: 'relative' }}>
                        <button
                            onClick={() => setProjectMenuOpen(!projectMenuOpen)}
                            className="btn"
                            style={{
                                ...toolbarButtonStyle,
                                backgroundColor: 'var(--accent-blue)',
                                borderColor: 'var(--accent-blue)',
                                color: 'white'
                            }}
                            title={t('header.mainMenu')}
                        >
                            <FolderRoot size={26} />
                        </button>

                        {/* Project Flyout Menu */}
                        {projectMenuOpen && (
                            <>
                                <div
                                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }}
                                    onClick={() => setProjectMenuOpen(false)}
                                />
                                <div className="glass-panel" style={{
                                    position: 'absolute',
                                    top: '55px',
                                    left: '0',
                                    borderRadius: '12px',
                                    padding: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    zIndex: 1001,
                                    minWidth: '200px'
                                }}>
                                    <button
                                        onClick={() => { onNewProject(); setProjectMenuOpen(false); }}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                                    >
                                        <Plus size={18} /> {t('workspace.newProject')}
                                    </button>
                                    <button
                                        onClick={() => { onOpenProject(); setProjectMenuOpen(false); }}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                                    >
                                        <FolderRoot size={18} /> {t('workspace.loadProject')}
                                    </button>
                                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                                    <button
                                        onClick={() => { onSaveProject(); setProjectMenuOpen(false); }}
                                        disabled={!currentProject}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', opacity: currentProject ? 1 : 0.5 }}
                                    >
                                        <Settings size={18} /> {t('common.save')}
                                    </button>
                                    <button
                                        onClick={() => { onSaveProjectAs(); setProjectMenuOpen(false); }}
                                        disabled={!currentProject}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', opacity: currentProject ? 1 : 0.5 }}
                                    >
                                        <Layout size={18} /> {t('common.saveAs')}
                                    </button>
                                    <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />
                                    <button
                                        onClick={() => { onExportProject(); setProjectMenuOpen(false); }}
                                        disabled={!currentProject}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent', opacity: currentProject ? 1 : 0.5 }}
                                    >
                                        <Download size={18} /> {t('common.exportZip')}
                                    </button>
                                    <button
                                        onClick={() => { handleImportClick(); setProjectMenuOpen(false); }}
                                        className="btn"
                                        style={{ justifyContent: 'flex-start', border: 'none', background: 'transparent' }}
                                    >
                                        <Upload size={18} /> {t('common.importZip')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }} />


                    {/* Annotation Toggle */}
                    {videoSrc && (
                        <button
                            onClick={() => setShowAnnotationTool(!showAnnotationTool)}
                            className={`btn ${showAnnotationTool ? 'active' : ''}`}
                            style={toolbarButtonStyle}
                            title={showAnnotationTool ? t('videoWorkspace.hideDrawingTools') : t('videoWorkspace.showDrawingTools')}
                        >
                            <Palette size={26} />
                        </button>
                    )}

                    {/* Camera Panel Toggle */}
                    <button
                        onClick={() => setShowCameraPanel(!showCameraPanel)}
                        className={`btn ${showCameraPanel ? 'active' : ''}`}
                        style={{
                            ...toolbarButtonStyle,
                            backgroundColor: showCameraPanel ? 'var(--accent-red)' : 'var(--bg-tertiary)',
                            borderColor: showCameraPanel ? 'var(--accent-red)' : 'var(--border-color)'
                        }}
                        title={showCameraPanel ? t('videoWorkspace.hideCameraPanel') : t('videoWorkspace.showCameraPanel')}
                    >
                        <Video size={26} />
                    </button>


                    {/* Video Specific Tools */}
                    {videoSrc && (
                        <>
                            {/* Divider */}
                            <div style={{ width: '1px', height: '28px', backgroundColor: 'var(--border-color)' }} />



                            {/* Ergonomic Analysis */}
                            <button
                                onClick={() => setShowErgonomicAnalysis(true)}
                                className="btn"
                                style={toolbarButtonStyle}
                                title={t('videoWorkspace.ergonomicAnalysis')}
                            >
                                <Accessibility size={26} />
                            </button>

                            {/* AI Video Intelligence / Auto Element */}
                            <button
                                onClick={() => setShowVideoIntelligence(true)}
                                className="btn"
                                style={{
                                    ...toolbarButtonStyle,
                                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                    borderColor: 'rgba(139, 92, 246, 0.5)',
                                    color: '#8b5cf6'
                                }}
                                title={t('videoWorkspace.aiAnalysis')}
                            >
                                <Sparkles size={26} />
                            </button>

                            {/* Full Screen */}
                            <button
                                onClick={() => setFullScreenMode(fullScreenMode === 'video' ? 'none' : 'video')}
                                className={`btn ${fullScreenMode === 'video' ? 'active' : ''}`}
                                style={{ ...toolbarButtonStyle, marginLeft: 'auto' }}
                                title={fullScreenMode === 'video' ? t('videoWorkspace.exitFullscreen') : t('videoWorkspace.fullscreen')}
                            >
                                {fullScreenMode === 'video' ? <Minimize size={26} /> : <Maximize size={26} />}
                            </button>
                        </>
                    )}
                </div>
                <div
                    ref={videoContainerRef}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                    {/* Video element - always rendered for webcam/stream support */}
                    <div style={{
                        transform: `scale(${videoState.zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s',
                        position: 'relative',
                        display: (videoSrc || isStreamConnected) ? 'block' : 'none'
                    }}>
                        <video
                            ref={videoRef}
                            src={isMJPEG ? '' : videoSrc}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            crossOrigin={videoSourceType === 'stream' ? null : "anonymous"}
                            style={{
                                width: '100%',
                                maxHeight: '100%',
                                display: isMJPEG ? 'none' : 'block'
                            }}
                        />

                        {/* MJPEG Stream Fallback */}
                        {isMJPEG && (
                            <img
                                src={videoSrc}
                                alt="MJPEG Stream"
                                style={{
                                    width: '100%',
                                    maxHeight: '100%',
                                    display: 'block',
                                    objectFit: 'contain'
                                }}
                            />
                        )}

                        {/* Video Annotation Overlay */}
                        {showAnnotationTool && (
                            <VideoAnnotation
                                videoRef={videoRef}
                                videoState={videoState}
                                annotations={drawingAnnotations}
                                onUpdateAnnotations={setDrawingAnnotations}
                                currentTool={currentTool}
                                drawColor={drawColor}
                                lineWidth={lineWidth}
                            />
                        )}



                        {/* Pose Visualizer Overlay (Ergonomic Analysis) */}
                        {ergonomicData && ergonomicData.isAnalyzing && ergonomicData.pose && ergonomicData.viewMode === '2D' && (
                            <PoseVisualizer
                                pose={ergonomicData.pose}
                                videoElement={videoRef.current}
                                riskScores={ergonomicData.scores}
                                width={videoRef.current?.clientWidth}
                                height={videoRef.current?.clientHeight}
                            />
                        )}
                    </div>

                    {/* 3D Visualizer Overlay */}
                    {ergonomicData && ergonomicData.isAnalyzing && ergonomicData.pose && ergonomicData.viewMode === '3D' && (
                        <div style={{
                            position: 'absolute',
                            inset: '10px',
                            zIndex: 20,
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)'
                        }}>
                            <PoseVisualizer3D
                                pose={ergonomicData.pose}
                                riskScores={ergonomicData.scores}
                            />
                            {/* Exit 3D View Button */}
                            <button
                                onClick={() => setErgonomicData(prev => ({ ...prev, viewMode: '2D' }))}
                                style={{
                                    position: 'absolute',
                                    top: '15px',
                                    right: '15px',
                                    backgroundColor: 'rgba(0,0,0,0.6)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    cursor: 'pointer',
                                    zIndex: 21,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    {/* Placeholder when no video */}
                    {!videoSrc && !isStreamConnected && (
                        <div style={{ color: '#666', textAlign: 'center' }}>
                            <p>{t('videoWorkspace.uploadOrIP')}</p>
                            <button
                                className="btn"
                                onClick={() => fileInputRef.current.click()}
                            >
                                {t('videoWorkspace.uploadVideo')}
                            </button>
                        </div>
                    )}
                    <input
                        type="file"
                        accept="video/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    {/* Zoom Level Indicator */}
                    {videoSrc && videoState.zoom !== 1 && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            right: '10px',
                            backgroundColor: 'rgba(0,0,0,0.7)',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                        }}>
                            {t('elementEditor.zoomLevel')}: {videoState.zoom}x
                        </div>
                    )}

                    {/* Playback Mode Indicator */}
                    {videoSrc && videoState.isReverse && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            backgroundColor: 'rgba(255,0,0,0.7)',
                            color: 'white',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                        }}>
                            ◀ {t('videoWorkspace.reverseMode')}
                        </div>
                    )}



                    {/* Back to VSM Floating Button */}
                    {fromVSM && (
                        <button
                            onClick={() => navigate('/value-stream-map', {
                                state: {
                                    vsmId: location.state?.vsmId,
                                    vsmName: location.state?.vsmName,
                                    restoreFromJump: true
                                }
                            })}
                            className="vsm-flyback-button"
                            style={{
                                position: 'absolute',
                                bottom: '20px',
                                right: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 20px',
                                backgroundColor: '#8a2be2',
                                color: 'white',
                                borderRadius: '30px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 15px rgba(138, 43, 226, 0.4)',
                                zIndex: 100,
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px) scale(1.05)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(138, 43, 226, 0.6)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 15px rgba(138, 43, 226, 0.4)';
                            }}
                        >
                            <ArrowLeft size={18} />
                            {t('vsm.backToCanvas', 'Back to VSM')}
                        </button>
                    )}

                    {/* Time Display Overlay (Top-Left) */}
                    {videoSrc && (
                        <div style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            zIndex: 10,
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(4px)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                fontFamily: 'monospace',
                                color: '#60a5fa',
                                fontWeight: 'bold',
                                fontSize: '1.1rem',
                                letterSpacing: '0.05em'
                            }}>
                                {formatTime(videoState.currentTime)}
                                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', marginLeft: '6px' }}>
                                    / {formatTime(videoState.duration)}
                                </span>
                            </div>
                            <div style={{
                                fontSize: '0.85rem',
                                color: 'rgba(255,255,255,0.8)',
                                fontFamily: 'var(--font-mono, monospace)',
                                display: 'flex',
                                justifyContent: 'space-between'
                            }}>
                                <span>{t('videoWorkspace.frame')}: <span style={{ color: 'white' }}>{videoState.currentFrame}</span></span>
                                <span style={{ opacity: 0.6, marginLeft: '12px' }}>/ {videoState.totalFrames}</span>
                            </div>
                        </div>
                    )}

                    {/* Logo Overlay */}
                    {videoSrc && logoUrl && (
                        <img
                            src={logoUrl}
                            alt="Logo"
                            style={getLogoStyle()}
                        />
                    )}
                </div>
                {/* Timeline Editor */}
                {videoSrc && (
                    <TimelineEditor
                        videoState={videoState}
                        measurements={videoState.measurements}
                        onSeek={seekTo}
                        onAddMeasurement={handleAddMeasurement}
                        onUpdateMeasurements={updateMeasurements}
                        currentCycle={currentCycle}
                        onNextCycle={handleNextCycle}
                    />
                )}

                {/* Playback Controls */}
                {videoSrc && (
                    <PlaybackControls
                        videoState={videoState}
                        onTogglePlay={togglePlay}
                        onSetSpeed={setPlaybackSpeed}
                        onNextFrame={nextFrame}
                        onPreviousFrame={previousFrame}
                        onSetZoom={setZoom}
                        onToggleReverse={toggleReverse}
                        onQuickCategorize={handleQuickCategorize}
                        selectedId={effectiveSelectedId}
                        stopwatches={stopwatches}
                        currentCycle={currentCycle}
                        onNextCycle={handleNextCycle}
                        onPrevCycle={handlePrevCycle}
                        measurementStart={measurementStart}
                        onStartMeasurement={handleStartMeasurement}
                        onEndMeasurement={handleEndMeasurement}
                        onCancelMeasurement={handleCancelMeasurement}
                    />
                )}
            </div>

            {/* Drawing Toolbar - Rendered OUTSIDE the video container to avoid scaling and z-index issues */}
            {
                showAnnotationTool && (
                    <div style={{
                        position: 'absolute',
                        top: '60px', // Below the top buttons
                        left: '10px',
                        backgroundColor: 'rgba(26, 26, 26, 0.95)',
                        padding: '10px',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        zIndex: 1000, // Very high z-index
                        border: '1px solid #444',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        width: '40px', // Compact vertical toolbar
                        alignItems: 'center'
                    }}>
                        {/* Tools */}
                        {tools.map(tool => (
                            <button
                                key={tool.id}
                                onClick={() => setCurrentTool(tool.id)}
                                style={{
                                    padding: '6px',
                                    backgroundColor: currentTool === tool.id ? '#005a9e' : 'transparent',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '1.2rem',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                title={tool.label}
                            >
                                {tool.icon}
                            </button>
                        ))}

                        <div style={{ width: '100%', height: '1px', backgroundColor: '#444', margin: '4px 0' }} />

                        {/* Colors - Compact Color Picker */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {colors.slice(0, 5).map(color => ( // Show first 5 colors
                                <button
                                    key={color}
                                    onClick={() => setDrawColor(color)}
                                    style={{
                                        width: '24px',
                                        height: '24px',
                                        backgroundColor: color,
                                        border: drawColor === color ? '2px solid white' : '1px solid #666',
                                        borderRadius: '50%',
                                        cursor: 'pointer',
                                        padding: 0
                                    }}
                                />
                            ))}
                        </div>

                        <div style={{ width: '100%', height: '1px', backgroundColor: '#444', margin: '4px 0' }} />

                        {/* Line Width */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <span style={{ color: '#aaa', fontSize: '0.6rem' }}>{t('videoWorkspace.size')}</span>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={lineWidth}
                                onChange={(e) => setLineWidth(parseInt(e.target.value))}
                                style={{ width: '60px', transform: 'rotate(-90deg)', margin: '20px 0' }}
                            />
                        </div>

                        <div style={{ width: '100%', height: '1px', backgroundColor: '#444', margin: '4px 0' }} />

                        {/* Clear Action */}
                        <button
                            onClick={() => setDrawingAnnotations([])}
                            style={{
                                padding: '6px',
                                backgroundColor: 'transparent',
                                color: '#c50f1f',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '1.2rem',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={t('videoWorkspace.clearDrawings')}
                        >
                            🗑️
                        </button>
                    </div>
                )
            }

            {/* Resizer Handle - Hidden in full screen mode */}
            {
                fullScreenMode === 'none' && (
                    <div
                        onMouseDown={startResizing}
                        style={{
                            width: '12px',
                            background: '#1a1a1a',
                            cursor: 'col-resize',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10,
                            borderLeft: '1px solid #333',
                            borderRight: '1px solid #333',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#333'}
                        onMouseLeave={(e) => e.target.style.background = '#1a1a1a'}
                        title={t('videoWorkspace.dragToResize')}
                    >
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                        }}>
                            <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                            <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                            <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                        </div>
                    </div>
                )
            }

            {/* Right Panel: Element Editor + Timeline */}
            <div style={{
                flex: 1,
                minWidth: '0',
                display: fullScreenMode === 'video' ? 'none' : 'flex',
                gap: '10px',
                paddingLeft: fullScreenMode === 'editor' ? '0' : '10px',
                width: fullScreenMode === 'editor' ? '100%' : 'auto',
                position: 'relative',
                flexDirection: 'column'
            }}>
                {/* IP Camera Panel */}
                {showCameraPanel && (
                    <IPCameraConnect
                        videoRef={videoRef}
                        onStreamConnected={(url, type) => {
                            setVideoSourceType('stream');
                            setIsStreamConnected(true);
                            setIsMJPEG(type === 'mjpeg');
                            onVideoChange(url);
                            onVideoNameChange(`Stream: ${url}`);
                        }}
                        onStreamDisconnected={() => {
                            setVideoSourceType('file');
                            setIsStreamConnected(false);
                            setIsMJPEG(false);
                            onVideoChange(null);
                        }}
                    />
                )}

                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0 // Crucial for nested flex scrolling
                }}>
                    <ElementEditor
                        measurements={videoState.measurements}
                        videoName={videoSrc ? videoSrc.split('/').pop().split('.')[0] : t('elementEditor.untitled')}
                        onUpdateMeasurements={updateMeasurements}
                        videoState={videoState}
                        selectedId={effectiveSelectedId}
                        onSelect={setSelectedElementId}
                        stopwatches={stopwatches}
                        fullScreenMode={fullScreenMode}
                        onToggleFullScreen={() => setFullScreenMode(fullScreenMode === 'editor' ? 'none' : 'editor')}
                        currentCycle={currentCycle}
                    />
                </div>


                {videoSrc && (
                    <div style={{
                        flex: 'none',
                        marginTop: showStats ? '10px' : '0',
                        transition: 'margin 0.3s ease'
                    }}>
                        <TimelineMeasurement
                            videoState={videoState}
                            onAddMeasurement={handleAddMeasurement}
                            onRemoveMeasurement={removeMeasurement}
                            currentCycle={currentCycle}
                            measurementStart={measurementStart}
                            setMeasurementStart={setMeasurementStart}
                            newElementName={newElementName}
                            setNewElementName={setNewElementName}
                            quickMode={quickMode}
                            autoCounter={autoCounter}
                            setAutoCounter={setAutoCounter}
                            validationWarnings={validationWarnings}
                            setValidationWarnings={setValidationWarnings}
                            onStartMeasurement={handleStartMeasurement}
                            onEndMeasurement={handleEndMeasurement}
                            onCancelMeasurement={handleCancelMeasurement}
                            showStats={showStats}
                            setShowStats={setShowStats}
                            onUpdateMeasurements={updateMeasurements}
                        />
                    </div>
                )}
            </div>



            {/* Ergonomic Analysis Panel */}
            {
                showErgonomicAnalysis && (
                    <ErgonomicAnalysis
                        videoRef={videoRef}
                        onClose={() => {
                            setShowErgonomicAnalysis(false);
                            setErgonomicData(null);
                        }}
                        onUpdate={setErgonomicData}
                    />
                )
            }

            {/* AI Video Intelligence Overlay */}
            {showVideoIntelligence && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        width: '90%',
                        height: '90%',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '12px',
                        border: '1px solid #333',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        position: 'relative',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{
                            padding: '12px 20px',
                            backgroundColor: '#242424',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ color: '#a78bfa' }}>✨</span> {t('videoWorkspace.aiIntelligence')}
                            </h3>
                            <button
                                onClick={() => setShowVideoIntelligence(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#888',
                                    cursor: 'pointer',
                                    fontSize: '1.5rem'
                                }}
                                onMouseEnter={(e) => e.target.style.color = 'white'}
                                onMouseLeave={(e) => e.target.style.color = '#888'}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <VideoIntelligence
                                videoFile={videoFile}
                                videoRef={videoRef}
                                isEmbedded={true}
                                onUpdateMeasurements={(newMeasurements) => {
                                    onUpdateMeasurements(newMeasurements);
                                    // Also sync with internal video player state if needed
                                    updateMeasurements(newMeasurements);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default VideoWorkspace;
