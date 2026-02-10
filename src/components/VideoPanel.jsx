import React, { useEffect, useState, useRef } from 'react';

function VideoPanel({
    project,
    videoRef,
    isPlaying,
    playbackSpeed,
    zoom,
    onPlayPause,
    onSpeedChange,
    onZoomChange,
    onTimeUpdate
}) {
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [columnWidths, setColumnWidths] = useState({
        no: 40,
        cycle: 50,
        proses: 120,
        kategori: 70,
        start: 60,
        finish: 60,
        durasi: 60
    });
    const [resizing, setResizing] = useState(null);
    const tableRef = useRef(null);

    // Update video playback speed when it changes
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed, videoRef]);

    // Handle column resizing
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (resizing) {
                const delta = e.clientX - resizing.startX;
                const newWidth = Math.max(30, resizing.startWidth + delta);
                setColumnWidths(prev => ({
                    ...prev,
                    [resizing.column]: newWidth
                }));
            }
        };

        const handleMouseUp = () => {
            setResizing(null);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        if (resizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizing]);

    const startResize = (column, e) => {
        e.preventDefault();
        setResizing({
            column,
            startX: e.clientX,
            startWidth: columnWidths[column]
        });
    };

    // Handle time update
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (onTimeUpdate) {
                onTimeUpdate(videoRef.current.currentTime);
            }
        }
    };

    // Handle metadata loaded
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    // Seek to time
    const handleSeek = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    // Get category color
    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added':
                return '#3f51b5'; // Blue for Value Added
            case 'Non value-added':
                return '#ffc107'; // Yellow for Non Value Added
            case 'Waste':
                return '#ef4444'; // Red for Waste
            default:
                return '#888';
        }
    };

    // Format time
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!project) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                <p>No video selected</p>
            </div>
        );
    }

    const measurements = project.measurements || [];

    return (
        <div id="video-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'visible' }}>
            {/* Video Display */}
            <div style={{ flexShrink: 0, maxHeight: '300px', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: '4px', position: 'relative', minHeight: '200px' }}>
                {project.videoUrl ? (
                    <div style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.2s',
                        maxWidth: '100%',
                        maxHeight: '100%'
                    }}>
                        <video
                            ref={videoRef}
                            src={project.videoUrl}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            }}
                        />
                    </div>
                ) : (
                    <div style={{ color: '#666' }}>Video not available</div>
                )}

                {/* Current Time Display */}
                {project.videoUrl && duration > 0 && (
                    <div style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.8rem'
                    }}>
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                )}
            </div>

            {/* Timeline */}
            {measurements.length > 0 && duration > 0 && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '4px' }}>Timeline</div>

                    {/* Time Ruler */}
                    <div style={{ position: 'relative', height: '20px', marginBottom: '2px' }}>
                        {(() => {
                            // Calculate appropriate interval based on duration
                            let interval = 1; // default 1 second
                            if (duration > 60) interval = 10;
                            else if (duration > 30) interval = 5;
                            else if (duration > 10) interval = 2;

                            const markers = [];
                            for (let t = 0; t <= duration; t += interval) {
                                const position = (t / duration) * 100;
                                markers.push(
                                    <div
                                        key={t}
                                        style={{
                                            position: 'absolute',
                                            left: `${position}%`,
                                            top: 0,
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <div style={{
                                            width: '1px',
                                            height: '8px',
                                            backgroundColor: '#555'
                                        }} />
                                        <span style={{
                                            fontSize: '0.65rem',
                                            color: '#666',
                                            marginTop: '2px'
                                        }}>
                                            {t}s
                                        </span>
                                    </div>
                                );
                            }
                            return markers;
                        })()}
                    </div>

                    {/* Timeline Bar */}
                    <div
                        style={{
                            position: 'relative',
                            height: '30px',
                            backgroundColor: '#0a0a0a',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            border: '1px solid #333'
                        }}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const percentage = x / rect.width;
                            handleSeek(percentage * duration);
                        }}
                    >
                        {/* Measurement bars */}
                        {measurements.map((m, idx) => {
                            const startPercent = (m.startTime / duration) * 100;
                            const widthPercent = (m.duration / duration) * 100;
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        position: 'absolute',
                                        left: `${startPercent}%`,
                                        width: `${widthPercent}%`,
                                        height: '100%',
                                        backgroundColor: getCategoryColor(m.category),
                                        opacity: 0.7,
                                        borderRight: '1px solid #000'
                                    }}
                                    title={`${m.elementName} (${m.duration.toFixed(2)}s)`}
                                />
                            );
                        })}

                        {/* Current time indicator */}
                        <div
                            style={{
                                position: 'absolute',
                                left: `${(currentTime / duration) * 100}%`,
                                top: 0,
                                bottom: 0,
                                width: '2px',
                                backgroundColor: '#fff',
                                zIndex: 10,
                                boxShadow: '0 0 4px rgba(255,255,255,0.5)'
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Controls */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px', backgroundColor: '#1a1a1a', borderRadius: '4px', flexWrap: 'wrap' }}>
                {/* Play/Pause */}
                <button
                    className="btn"
                    onClick={() => onPlayPause(!isPlaying)}
                    style={{ padding: '5px 10px', fontSize: '0.85rem', minWidth: '60px' }}
                >
                    {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>

                {/* Speed Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Speed:</label>
                    <select
                        value={playbackSpeed}
                        onChange={(e) => onSpeedChange(Number(e.target.value))}
                        style={{ padding: '3px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '3px', fontSize: '0.75rem' }}
                    >
                        <option value={0.25}>0.25x</option>
                        <option value={0.5}>0.5x</option>
                        <option value={0.75}>0.75x</option>
                        <option value={1}>1x</option>
                        <option value={1.25}>1.25x</option>
                        <option value={1.5}>1.5x</option>
                        <option value={2}>2x</option>
                    </select>
                </div>

                {/* Zoom Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#888' }}>Zoom:</label>
                    <select
                        value={zoom}
                        onChange={(e) => onZoomChange(Number(e.target.value))}
                        style={{ padding: '3px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '3px', fontSize: '0.75rem' }}
                    >
                        <option value={0.5}>50%</option>
                        <option value={0.75}>75%</option>
                        <option value={1}>100%</option>
                        <option value={1.25}>125%</option>
                        <option value={1.5}>150%</option>
                        <option value={2}>200%</option>
                    </select>
                </div>
            </div>

            {/* Elements List */}
            {measurements.length > 0 && (
                <div style={{ backgroundColor: '#1a1a1a', padding: '8px', borderRadius: '4px', maxHeight: '120px', overflowY: 'auto', overflowX: 'auto' }}>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '6px', fontWeight: 'bold' }}>
                        Elements ({measurements.length})
                    </div>
                    <table ref={tableRef} style={{ borderCollapse: 'collapse', fontSize: '0.7rem', tableLayout: 'fixed' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#1a1a1a', zIndex: 1 }}>
                            <tr style={{ borderBottom: '1px solid #333' }}>
                                <th style={{ width: `${columnWidths.no}px`, padding: '4px', textAlign: 'center', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    No.
                                    <div
                                        onMouseDown={(e) => startResize('no', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.cycle}px`, padding: '4px', textAlign: 'center', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Cycle
                                    <div
                                        onMouseDown={(e) => startResize('cycle', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.proses}px`, padding: '4px', textAlign: 'left', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Proses
                                    <div
                                        onMouseDown={(e) => startResize('proses', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.kategori}px`, padding: '4px', textAlign: 'center', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Kategori
                                    <div
                                        onMouseDown={(e) => startResize('kategori', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.start}px`, padding: '4px', textAlign: 'right', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Start
                                    <div
                                        onMouseDown={(e) => startResize('start', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.finish}px`, padding: '4px', textAlign: 'right', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Finish
                                    <div
                                        onMouseDown={(e) => startResize('finish', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                                <th style={{ width: `${columnWidths.durasi}px`, padding: '4px', textAlign: 'right', color: '#888', fontWeight: 'bold', position: 'relative' }}>
                                    Durasi
                                    <div
                                        onMouseDown={(e) => startResize('durasi', e)}
                                        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', cursor: 'col-resize', backgroundColor: 'transparent' }}
                                        onMouseEnter={(e) => e.target.style.backgroundColor = '#4da6ff'}
                                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurements.map((m, idx) => {
                                const endTime = m.startTime + m.duration;
                                return (
                                    <tr
                                        key={idx}
                                        style={{
                                            borderBottom: '1px solid #0a0a0a',
                                            backgroundColor: idx % 2 === 0 ? '#0a0a0a' : '#1a1a1a'
                                        }}
                                    >
                                        <td style={{ padding: '4px', textAlign: 'center', color: '#888' }}>
                                            {idx + 1}
                                        </td>
                                        <td style={{ padding: '4px', textAlign: 'center', color: '#ddd' }}>
                                            {m.cycle || '-'}
                                        </td>
                                        <td style={{
                                            padding: '4px',
                                            color: '#ddd',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {m.elementName}
                                        </td>
                                        <td style={{ padding: '4px', textAlign: 'center' }}>
                                            <span style={{
                                                color: getCategoryColor(m.category),
                                                fontSize: '0.65rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {m.category === 'Value-added' ? 'VA' :
                                                    m.category === 'Non value-added' ? 'NVA' :
                                                        m.category === 'Waste' ? 'W' : '-'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '4px', textAlign: 'right', color: '#aaa', fontSize: '0.65rem' }}>
                                            {m.startTime.toFixed(2)}s
                                        </td>
                                        <td style={{ padding: '4px', textAlign: 'right', color: '#aaa', fontSize: '0.65rem' }}>
                                            {endTime.toFixed(2)}s
                                        </td>
                                        <td style={{ padding: '4px', textAlign: 'right', color: '#888', fontWeight: 'bold' }}>
                                            {m.duration.toFixed(2)}s
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default VideoPanel;
