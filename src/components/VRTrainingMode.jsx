import React, { useState, useEffect, useRef } from 'react';
import {
    Play, Pause, SkipBack, SkipForward, Maximize, Minimize,
    ChevronLeft, ChevronRight, PenTool, Eraser, Info,
    Settings, Zap, Sparkles, FolderOpen, Target
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import VideoAnnotation from './features/VideoAnnotation';
import { useProject } from '../contexts/ProjectContext';
import { useLanguage } from '../contexts/LanguageContext';

function VRTrainingMode() {
    const {
        currentProject,
        measurements: projectMeasurements,
        videoSrc: projectVideoSrc
    } = useProject();
    const { t } = useLanguage();
    const navigate = useNavigate();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentStep, setCurrentStep] = useState(null);
    const [nextStep, setNextStep] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [zoom, setZoom] = useState(1);
    const [showDrawingTools, setShowDrawingTools] = useState(false);
    const [currentTool, setCurrentTool] = useState('pen');
    const [drawColor, setDrawColor] = useState('#00d2ff');
    const [lineWidth, setLineWidth] = useState(3);
    const [annotations, setAnnotations] = useState([]);
    const [isHoveringControls, setIsHoveringControls] = useState(false);

    const videoRef = useRef(null);
    const containerRef = useRef(null);

    // Use project measurements if available
    const measurements = projectMeasurements || [];
    const videoSrc = projectVideoSrc;

    // Update current step based on video time
    useEffect(() => {
        if (measurements.length === 0) return;

        const activeStep = measurements.find(
            m => currentTime >= m.startTime && currentTime < (m.startTime + m.duration)
        );

        setCurrentStep(activeStep || null);

        // Find next step
        const currentIndex = measurements.findIndex(m => m === activeStep);
        if (currentIndex !== -1 && currentIndex < measurements.length - 1) {
            setNextStep(measurements[currentIndex + 1]);
            setStepIndex(currentIndex);
        } else if (currentIndex === -1 && measurements.length > 0) {
            // Find first step that hasn't happened yet
            const firstFutureIndex = measurements.findIndex(m => m.startTime > currentTime);
            if (firstFutureIndex !== -1) {
                setNextStep(measurements[firstFutureIndex]);
                setStepIndex(firstFutureIndex - 1);
            } else {
                setNextStep(null);
                setStepIndex(measurements.length - 1);
            }
        } else {
            setNextStep(null);
            setStepIndex(currentIndex);
        }
    }, [currentTime, measurements]);

    // Handle time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    // Handle metadata loaded
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // Play/Pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    // Previous Step
    const previousStep = () => {
        if (stepIndex > 0 && measurements[stepIndex - 1]) {
            const prevStep = measurements[stepIndex - 1];
            if (videoRef.current) {
                videoRef.current.currentTime = prevStep.startTime;
            }
        } else if (measurements.length > 0) {
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
            }
        }
    };

    // Next Step
    const goToNextStep = () => {
        if (stepIndex < measurements.length - 1 && measurements[stepIndex + 1]) {
            const next = measurements[stepIndex + 1];
            if (videoRef.current) {
                videoRef.current.currentTime = next.startTime;
            }
        } else if (nextStep) {
            if (videoRef.current) {
                videoRef.current.currentTime = nextStep.startTime;
            }
        }
    };

    // Toggle Fullscreen
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            if (e.code === 'Space') {
                e.preventDefault();
                togglePlay();
            } else if (e.code === 'ArrowLeft') {
                previousStep();
            } else if (e.code === 'ArrowRight') {
                goToNextStep();
            } else if (e.code === 'KeyF') {
                toggleFullscreen();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [isPlaying, stepIndex, nextStep]);

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const progress = measurements.length > 0 ? ((stepIndex + 1) / measurements.length) * 100 : 0;

    if (!videoSrc) {
        return (
            <div style={{
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#0f172a',
                color: 'white',
                fontFamily: 'Inter, sans-serif'
            }}>
                <div className="glass-panel" style={{
                    padding: '3rem',
                    textAlign: 'center',
                    maxWidth: '500px',
                    borderRadius: '2rem',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 0 20px rgba(0, 210, 255, 0.4)'
                    }}>
                        <Target size={40} color="white" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '1rem' }}>VR Training Hub</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>
                        Ready to level up your skills? Please select a project with a video to begin your VR training session.
                    </p>
                    <button
                        onClick={() => navigate('/files')}
                        style={{
                            padding: '1rem 2rem',
                            background: 'linear-gradient(to right, #00d2ff, #3a7bd5)',
                            border: 'none',
                            borderRadius: '1rem',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.8rem',
                            margin: '0 auto',
                            transition: 'transform 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        <FolderOpen size={20} /> Open Project
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#000',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'Inter, sans-serif'
            }}
            onMouseMove={() => {
                setIsHoveringControls(true);
            }}
        >
            {/* Header Overlay */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '2rem',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                pointerEvents: 'none'
            }}>
                <div style={{ pointerEvents: 'all' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        padding: '10px 20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Target size={18} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.65rem', color: '#00d2ff', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                TRAINING MODE
                            </div>
                            <div style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>
                                {currentProject?.projectName || 'Standard Work'}
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{
                    pointerEvents: 'all',
                    background: 'rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: 'monospace',
                    fontSize: '1.2rem',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <Zap size={18} color="#00d2ff" />
                    {formatTime(currentTime)} <span style={{ color: '#555' }}>/</span> {formatTime(duration)}
                </div>
            </div>

            {/* Main Video Area */}
            <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <video
                    ref={videoRef}
                    src={videoSrc}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `scale(${zoom})`,
                        transition: 'transform 0.2s ease',
                        objectFit: 'contain'
                    }}
                />

                {/* Video Annotation Layer */}
                {showDrawingTools && videoRef.current && (
                    <VideoAnnotation
                        videoRef={videoRef}
                        videoState={{ currentTime }}
                        annotations={annotations}
                        onUpdateAnnotations={setAnnotations}
                        currentTool={currentTool}
                        drawColor={drawColor}
                        lineWidth={lineWidth}
                    />
                )}

                {/* HUD Overlay Displays */}
                {/* Current Step Display */}
                {currentStep && (
                    <div style={{
                        position: 'absolute',
                        bottom: '120px',
                        left: '40px',
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(15px)',
                        padding: '25px',
                        borderRadius: '24px',
                        border: '2px solid #00d2ff',
                        boxShadow: '0 0 30px rgba(0, 210, 255, 0.3)',
                        maxWidth: '450px',
                        animation: 'slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div style={{
                                background: 'rgba(0, 210, 255, 0.2)',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.7rem',
                                color: '#00d2ff',
                                fontWeight: '900'
                            }}>
                                STEP {stepIndex + 1} OF {measurements.length}
                            </div>
                            <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                {currentStep.duration.toFixed(1)}s
                            </div>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', color: '#fff', fontWeight: '800', margin: '0 0 10px 0', lineHeight: 1.2 }}>
                            {currentStep.elementName}
                        </h2>
                        {currentStep.description && (
                            <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                                {currentStep.description}
                            </p>
                        )}
                    </div>
                )}

                {/* Progress Bar Overlay */}
                <div style={{
                    position: 'absolute',
                    bottom: '80px',
                    left: '40px',
                    right: '40px',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        width: `${progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00d2ff 0%, #3a7bd5 100%)',
                        boxShadow: '0 0 15px rgba(0, 210, 255, 0.8)',
                        transition: 'width 0.3s ease'
                    }} />
                </div>

                {/* Next Step Preview */}
                {nextStep && (
                    <div style={{
                        position: 'absolute',
                        bottom: '120px',
                        right: '40px',
                        background: 'rgba(30, 41, 59, 0.6)',
                        backdropFilter: 'blur(10px)',
                        padding: '15px 20px',
                        borderRadius: '20px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        maxWidth: '280px',
                        animation: 'fadeIn 1s ease'
                    }}>
                        <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase' }}>
                            UP NEXT
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {nextStep.elementName} <ChevronRight size={16} color="#00d2ff" />
                        </div>
                    </div>
                )}
            </div>

            {/* Futuristic Control Bar */}
            <div style={{
                padding: '1.5rem 2.5rem',
                background: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(20px)',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 20
            }}>
                {/* Left Side: Navigation */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={previousStep}
                        disabled={stepIndex <= 0}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: stepIndex <= 0 ? '#334155' : '#fff',
                            cursor: stepIndex <= 0 ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <button
                        onClick={goToNextStep}
                        disabled={!nextStep && stepIndex >= measurements.length - 1}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: (!nextStep && stepIndex >= measurements.length - 1) ? '#334155' : '#fff',
                            cursor: (!nextStep && stepIndex >= measurements.length - 1) ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Center: Main Play Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <button
                        onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                        Zoom Out
                    </button>

                    <button
                        onClick={togglePlay}
                        style={{
                            width: '70px',
                            height: '70px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 8px 25px rgba(0, 210, 255, 0.4)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isPlaying ? <Pause size={32} fill="white" /> : <Play size={32} fill="white" style={{ marginLeft: '4px' }} />}
                    </button>

                    <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                        Zoom In ({Math.round(zoom * 100)}%)
                    </button>
                </div>

                {/* Right Side: Extras */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => setShowDrawingTools(!showDrawingTools)}
                        style={{
                            height: '48px',
                            padding: '0 20px',
                            borderRadius: '12px',
                            border: showDrawingTools ? '2px solid #00d2ff' : '1px solid rgba(255, 255, 255, 0.1)',
                            background: showDrawingTools ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            color: showDrawingTools ? '#00d2ff' : '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontWeight: 'bold',
                            transition: 'all 0.2s'
                        }}
                    >
                        <PenTool size={20} /> Annotate
                    </button>

                    <button
                        onClick={toggleFullscreen}
                        style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                    </button>
                </div>
            </div>

            {/* Drawing Toolbar Overlay */}
            {showDrawingTools && (
                <div style={{
                    position: 'absolute',
                    top: '120px',
                    left: '40px',
                    background: 'rgba(15, 23, 42, 0.95)',
                    backdropFilter: 'blur(20px)',
                    padding: '20px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    zIndex: 30,
                    boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: '#00d2ff', fontWeight: 'bold' }}>DRAWING TOOLS</span>
                        <Sparkles size={14} color="#00d2ff" />
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['pen', 'line', 'arrow', 'rectangle', 'circle', 'text'].map(tool => (
                            <button
                                key={tool}
                                onClick={() => setCurrentTool(tool)}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: currentTool === tool ? '#00d2ff' : '#1e293b',
                                    color: currentTool === tool ? '#000' : '#94a3b8',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1rem',
                                    transition: 'all 0.2s'
                                }}
                                title={tool.toUpperCase()}
                            >
                                {tool === 'pen' ? '🖊' : tool === 'line' ? '—' : tool === 'arrow' ? '→' :
                                    tool === 'rectangle' ? '▢' : tool === 'circle' ? '○' : 'T'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                        {['#00d2ff', '#f87171', '#4ade80', '#fbbf24', '#c084fc', '#ffffff'].map(color => (
                            <button
                                key={color}
                                onClick={() => setDrawColor(color)}
                                style={{
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    backgroundColor: color,
                                    border: drawColor === color ? '2px solid #fff' : 'none',
                                    cursor: 'pointer',
                                    boxShadow: drawColor === color ? `0 0 10px ${color}` : 'none'
                                }}
                            />
                        ))}
                    </div>

                    <div style={{ marginTop: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b', marginBottom: '5px' }}>
                            <span>LINE WIDTH</span>
                            <span>{lineWidth}px</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={lineWidth}
                            onChange={(e) => setLineWidth(Number(e.target.value))}
                            style={{
                                width: '100%',
                                accentColor: '#00d2ff'
                            }}
                        />
                    </div>

                    <button
                        onClick={() => setAnnotations([])}
                        style={{
                            width: '100%',
                            padding: '8px',
                            borderRadius: '8px',
                            background: '#ef4444',
                            border: 'none',
                            color: '#fff',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <Eraser size={14} /> Clear Annotations
                    </button>
                </div>
            )}

            <style>
                {`
                    @keyframes slideInLeft {
                        from { transform: translateX(-50px); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    input[type="range"] {
                        -webkit-appearance: none;
                        height: 4px;
                        background: #334155;
                        border-radius: 2px;
                    }
                    input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 12px;
                        height: 12px;
                        background: #00d2ff;
                        border-radius: 50%;
                        cursor: pointer;
                    }
                `}
            </style>
        </div>
    );
}

export default VRTrainingMode;
