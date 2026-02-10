import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import TimelineEditor from './features/TimelineEditor';
import ElementEditor from './ElementEditor';
import PlaybackControls from './features/PlaybackControls';
import ObjectTracking from './ObjectTracking';
import MachineLearningData from './MachineLearningData';
import VideoIntelligence from './VideoIntelligence';
import StudioRuntime from './studio/StudioRuntime';
// Icons
import { Brain, Box, Activity, Layers, MessageSquare, Upload, Play } from 'lucide-react';

const AIProcessWorkspace = ({
    measurements,
    onUpdateMeasurements,
    videoSrc,
    onVideoChange,
    videoName,
    onVideoNameChange
}) => {
    const [currentMode, setCurrentMode] = useState(null); // object, ml, gemini, studio
    const [leftPanelWidth, setLeftPanelWidth] = useState(65); // Default video width ~65%
    const [currentVideoFile, setCurrentVideoFile] = useState(null); // Store raw file for AI
    const containerRef = useRef(null);
    const isResizing = useRef(false);
    const fileInputRef = useRef(null);

    // Use video player hook - centralized video state
    const {
        videoRef,
        videoState,
        togglePlay,
        setPlaybackSpeed,
        seekTo,
        setZoom,
        addMeasurement,
        removeMeasurement,
        updateMeasurements,
        nextFrame,
        previousFrame,
        toggleReverse,
        handleTimeUpdate,
        handleLoadedMetadata
    } = useVideoPlayer(measurements);

    // Ensure videoRef is available globally (if needed for broadcast/etc similar to VideoWorkspace)
    useEffect(() => {
        if (videoRef.current) {
            window.__motionVideoElement = videoRef.current;
        }
    }, [videoRef.current]);

    // Resizing Logic (Identical to VideoWorkspace)
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

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setCurrentVideoFile(file); // Capture file for AI
            onVideoChange(url);
            onVideoNameChange(file.name);
        }
    };

    // Render active AI overlay or panel
    const renderActiveAI = () => {
        if (!videoSrc) return null;

        switch (currentMode) {
            case 'object':
                // Object Tracking overlays its own canvas on the video
                return (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                            <ObjectTracking
                                videoSrc={videoSrc}
                                measurements={measurements}
                                onUpdateMeasurements={onUpdateMeasurements}
                                externalVideoRef={videoRef}
                            />
                        </div>
                    </div>
                );
            case 'ml':
                // Machine Learning overlays or replaces view
                return (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div style={{ pointerEvents: 'auto', width: '100%', height: '100%' }}>
                            <MachineLearningData
                                videoSrc={videoSrc}
                                measurements={measurements}
                                onUpdateMeasurements={onUpdateMeasurements}
                                externalVideoRef={videoRef}
                            />
                        </div>
                    </div>
                );
            case 'studio':
                return (
                    <StudioRuntime
                        videoRef={videoRef}
                        isPlaying={!videoState.paused}
                        currentTime={videoState.currentTime}
                    />
                );
            case 'gemini':
                return (
                    <div style={{
                        position: 'absolute',
                        top: 20,
                        right: 20,
                        width: '500px',
                        maxWidth: '90%',
                        height: '85%',
                        zIndex: 100,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        border: '1px solid #333'
                    }}>
                        <VideoIntelligence
                            videoRef={videoRef}
                            onUpdateMeasurements={onUpdateMeasurements}
                            isEmbedded={true}
                            videoFile={currentVideoFile}
                            onClose={() => setCurrentMode(null)}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            backgroundColor: '#111',
            fontFamily: 'Inter, sans-serif'
        }}>

            {/* Main Workspace Layout (Video + Sidebar) */}
            <div ref={containerRef} style={{ flex: 1, display: 'flex', minHeight: '0', position: 'relative' }}>

                {/* 1. Video Player Section (Left Panel) */}
                <div style={{
                    width: `${leftPanelWidth}%`,
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#000',
                    position: 'relative'
                }}>
                    {/* Toolbar inside video panel - matching VideoWorkspace style */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px',
                        backgroundColor: '#1e1e1e',
                        borderBottom: '1px solid #333',
                        flexWrap: 'wrap',
                        marginBottom: '0px'
                    }}>
                        {/* Title & File Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '15px' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#00d2ff', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Brain size={20} /> AI Studio
                            </h2>
                            <span style={{ color: '#666' }}>|</span>
                            <span style={{ color: '#aaa', fontSize: '0.9rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {videoName || 'No Video'}
                            </span>
                        </div>

                        {/* Mode Tabs - Integrated into toolbar */}
                        <div style={{ display: 'flex', gap: '5px', background: '#222', padding: '2px', borderRadius: '6px' }}>
                            {[
                                { id: 'object', icon: <Box size={16} />, label: 'Object Tracking' },
                                { id: 'ml', icon: <Layers size={16} />, label: 'Motion Analysis' },
                                { id: 'studio', icon: <Play size={16} />, label: 'Studio Runtime' },
                                { id: 'gemini', icon: <MessageSquare size={16} />, label: 'Video Intelligence' }
                            ].map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setCurrentMode(mode.id)}
                                    style={{
                                        padding: '6px 10px',
                                        background: currentMode === mode.id ? '#333' : 'transparent',
                                        color: currentMode === mode.id ? '#fff' : '#888',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.85rem',
                                        transition: 'all 0.2s',
                                        fontWeight: currentMode === mode.id ? 'bold' : 'normal',
                                        position: 'relative'
                                    }}
                                    title={mode.label}
                                >
                                    {mode.icon} {mode.label}
                                    <span style={{
                                        position: 'absolute',
                                        top: '-4px',
                                        right: '-4px',
                                        background: '#f59e0b',
                                        color: '#000',
                                        fontSize: '0.5rem',
                                        padding: '1px 3px',
                                        borderRadius: '3px',
                                        fontWeight: '800',
                                        pointerEvents: 'none',
                                        opacity: 0.8
                                    }}>
                                        BETA
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Import Button */}
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    padding: '6px 12px',
                                    background: '#0056b3',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Upload size={16} /> Import
                            </button>
                        </div>
                        <input type="file" ref={fileInputRef} accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                    </div>

                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        position: 'relative'
                    }}>
                        {videoSrc ? (
                            <div style={{
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <video
                                    ref={videoRef}
                                    src={videoSrc}
                                    style={{
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        transform: `scale(${videoState.zoom})`,
                                        transformOrigin: 'center center',
                                        transition: 'transform 0.2s'
                                    }}
                                    onTimeUpdate={handleTimeUpdate}
                                    onLoadedMetadata={handleLoadedMetadata}
                                />

                                {/* AI Overlays based on mode */}
                                {renderActiveAI()}

                            </div>
                        ) : (
                            <div style={{ color: '#666', textAlign: 'center' }}>
                                <p>Upload a video to start AI Analysis</p>
                            </div>
                        )}
                    </div>

                    {/* Timeline Editor */}
                    {videoSrc && (
                        <div style={{ backgroundColor: '#1e1e1e', borderTop: '1px solid #333' }}>
                            <TimelineEditor
                                videoState={videoState}
                                measurements={measurements}
                                onUpdateMeasurements={updateMeasurements}
                                onAddMeasurement={addMeasurement}
                                onSeek={seekTo}
                                videoRef={videoRef}
                            />
                        </div>
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
                        />
                    )}
                </div>

                {/* 2. Resizer Handle */}
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
                        borderRight: '1px solid #333'
                    }}
                    title="Drag to resize"
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                        <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                        <div style={{ width: '4px', height: '4px', background: '#666', borderRadius: '50%' }}></div>
                    </div>
                </div>

                {/* 3. Right Panel: Element Editor */}
                <div style={{
                    flex: 1,
                    minWidth: '0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '10px',
                    backgroundColor: '#1e1e1e'
                }}>
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        <ElementEditor
                            measurements={measurements}
                            onUpdateMeasurements={updateMeasurements}
                            currentTime={videoState.currentTime}
                            onSeek={seekTo}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AIProcessWorkspace;
