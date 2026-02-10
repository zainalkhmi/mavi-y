import React, { useState, useEffect, useRef } from 'react';
import { getAllProjects } from '../utils/database';
import VideoPanel from './VideoPanel';
import AIChatOverlay from './features/AIChatOverlay';

function VideoComparison() {
    const [projects, setProjects] = useState([]);
    const [leftProjectId, setLeftProjectId] = useState(null);
    const [rightProjectId, setRightProjectId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncEnabled, setSyncEnabled] = useState(true);
    const [showChat, setShowChat] = useState(false);

    // Independent states
    const [leftPlaying, setLeftPlaying] = useState(false);
    const [rightPlaying, setRightPlaying] = useState(false);
    const [leftSpeed, setLeftSpeed] = useState(1);
    const [rightSpeed, setRightSpeed] = useState(1);
    const [leftZoom, setLeftZoom] = useState(1);
    const [rightZoom, setRightZoom] = useState(1);

    const leftVideoRef = useRef(null);
    const rightVideoRef = useRef(null);
    const objectUrls = useRef([]);

    useEffect(() => {
        loadProjects();
        return () => {
            objectUrls.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

            const mappedProjects = allProjects
                .filter(p => p.videoBlob || p.videoName)
                .map(p => {
                    let videoUrl = null;
                    if (p.videoBlob) {
                        videoUrl = URL.createObjectURL(p.videoBlob);
                        objectUrls.current.push(videoUrl);
                    }
                    return {
                        id: p.id,
                        videoName: p.videoName || p.projectName,
                        timestamp: p.lastModified,
                        videoUrl: videoUrl,
                        measurements: p.measurements || []
                    };
                });

            setProjects(mappedProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const leftProject = projects.find(p => p.id === leftProjectId);
    const rightProject = projects.find(p => p.id === rightProjectId);

    // Handlers
    const handlePlayPause = (side, isPlaying) => {
        if (syncEnabled) {
            setLeftPlaying(isPlaying);
            setRightPlaying(isPlaying);
            if (leftVideoRef.current) isPlaying ? leftVideoRef.current.play() : leftVideoRef.current.pause();
            if (rightVideoRef.current) isPlaying ? rightVideoRef.current.play() : rightVideoRef.current.pause();
        } else {
            if (side === 'left') {
                setLeftPlaying(isPlaying);
                if (leftVideoRef.current) isPlaying ? leftVideoRef.current.play() : leftVideoRef.current.pause();
            } else {
                setRightPlaying(isPlaying);
                if (rightVideoRef.current) isPlaying ? rightVideoRef.current.play() : rightVideoRef.current.pause();
            }
        }
    };

    const handleSpeedChange = (side, speed) => {
        if (syncEnabled) {
            setLeftSpeed(speed);
            setRightSpeed(speed);
        } else {
            if (side === 'left') setLeftSpeed(speed);
            else setRightSpeed(speed);
        }
    };

    const handleZoomChange = (side, zoom) => {
        if (syncEnabled) {
            setLeftZoom(zoom);
            setRightZoom(zoom);
        } else {
            if (side === 'left') setLeftZoom(zoom);
            else setRightZoom(zoom);
        }
    };

    const handleTimeUpdate = (side, time) => {
        if (syncEnabled) {
            // Sync time only if difference is significant to avoid loops
            const otherRef = side === 'left' ? rightVideoRef : leftVideoRef;
            if (otherRef.current && Math.abs(otherRef.current.currentTime - time) > 0.5) {
                otherRef.current.currentTime = time;
            }
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', backgroundColor: 'var(--bg-secondary)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>🎬 Video Side-by-Side Comparison</h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#ccc', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        checked={syncEnabled}
                        onChange={(e) => setSyncEnabled(e.target.checked)}
                    />
                    🔗 Synchronized Controls
                </label>

                <button
                    onClick={() => setShowChat(!showChat)}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: showChat ? 'var(--accent-blue)' : '#333',
                        color: 'white',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        marginLeft: '10px'
                    }}
                    title="AI Assistant"
                >
                    🤖 AI
                </button>
            </div>

            {/* Selection Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <select
                    value={leftProjectId || ''}
                    onChange={(e) => setLeftProjectId(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #4da6ff', color: '#fff', borderRadius: '4px' }}
                >
                    <option value="">Select Left Project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.videoName}</option>)}
                </select>
                <select
                    value={rightProjectId || ''}
                    onChange={(e) => setRightProjectId(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #0a5', color: '#fff', borderRadius: '4px' }}
                >
                    <option value="">Select Right Project...</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.videoName}</option>)}
                </select>
            </div>

            {/* Panels */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', overflow: 'auto' }}>
                <div style={{ border: '2px solid #4da6ff', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                    <VideoPanel
                        project={leftProject}
                        videoRef={leftVideoRef}
                        isPlaying={leftPlaying}
                        playbackSpeed={leftSpeed}
                        zoom={leftZoom}
                        onPlayPause={(isPlaying) => handlePlayPause('left', isPlaying)}
                        onSpeedChange={(speed) => handleSpeedChange('left', speed)}
                        onZoomChange={(zoom) => handleZoomChange('left', zoom)}
                        onTimeUpdate={(time) => handleTimeUpdate('left', time)}
                    />
                </div>
                <div style={{ border: '2px solid #0a5', borderRadius: '8px', padding: '10px', display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
                    <VideoPanel
                        project={rightProject}
                        videoRef={rightVideoRef}
                        isPlaying={rightPlaying}
                        playbackSpeed={rightSpeed}
                        zoom={rightZoom}
                        onPlayPause={(isPlaying) => handlePlayPause('right', isPlaying)}
                        onSpeedChange={(speed) => handleSpeedChange('right', speed)}
                        onZoomChange={(zoom) => handleZoomChange('right', zoom)}
                        onTimeUpdate={(time) => handleTimeUpdate('right', time)}
                    />
                </div>
            </div>


            <AIChatOverlay
                visible={showChat}
                onClose={() => setShowChat(false)}
                contextData={{
                    leftProject: leftProject,
                    rightProject: rightProject,
                    syncEnabled: syncEnabled
                }}
                title="Mavi Engineer (Comparison)"
                subtitle="Comparing Videos"
            />
        </div >
    );
}

export default VideoComparison;
