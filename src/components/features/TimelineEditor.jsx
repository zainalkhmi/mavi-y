import React, { useRef, useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import { THERBLIGS } from '../../constants/therbligs';
import { useLanguage } from '../../i18n/LanguageContext';

function TimelineEditor({ videoState, measurements = [], onSeek, onSelectMeasurement, onAddMeasurement, onUpdateMeasurements, currentCycle, onNextCycle }) {
    const { showAlert } = useDialog();
    const { t } = useLanguage();
    const timelineRef = useRef(null);
    const [hoveredMeasurement, setHoveredMeasurement] = useState(null);
    const [dragState, setDragState] = useState(null); // { type: 'move' | 'resize-left' | 'resize-right', id: string, startX: number, originalStart: number, originalEnd: number }
    const [cuttingMode, setCuttingMode] = useState(false);
    const [autoAddMode, setAutoAddMode] = useState(true); // Auto add element mode
    const [rulerHoverTime, setRulerHoverTime] = useState(null);
    const [textAnnotations, setTextAnnotations] = useState([]);
    const [showTextDialog, setShowTextDialog] = useState(false);
    const [selectedAnnotation, setSelectedAnnotation] = useState(null);

    // Measurement Edit State
    const [editingMeasurement, setEditingMeasurement] = useState(null);
    const [showEditDialog, setShowEditDialog] = useState(false);

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#3f51b5'; // Blue for Value Added
            case 'Non value-added': return '#ffc107'; // Yellow for Non Value Added
            case 'Waste': return '#ef4444'; // Red for Waste
            default: return '#666';
        }
    };

    const handleMouseDown = (e, measurement, type) => {
        e.stopPropagation();
        if (!onUpdateMeasurements) return;

        setDragState({
            type,
            id: measurement.id,
            startX: e.clientX,
            originalStart: measurement.startTime,
            originalEnd: measurement.endTime
        });

        document.body.style.userSelect = 'none';
        document.body.style.cursor = type === 'move' ? 'grabbing' : 'col-resize';
    };

    const handleMouseMove = (e) => {
        if (!dragState || !timelineRef.current || !videoState.duration) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const deltaPixels = e.clientX - dragState.startX;
        const deltaTime = (deltaPixels / rect.width) * videoState.duration;

        let newStart = dragState.originalStart;
        let newEnd = dragState.originalEnd;

        if (dragState.type === 'move') {
            newStart += deltaTime;
            newEnd += deltaTime;
        } else if (dragState.type === 'resize-left') {
            newStart += deltaTime;
        } else if (dragState.type === 'resize-right') {
            newEnd += deltaTime;
        }

        // Constraints
        if (newStart < 0) newStart = 0;
        if (newEnd > videoState.duration) newEnd = videoState.duration;

        // Minimum duration constraint (0.1s)
        if (newEnd - newStart < 0.1) {
            if (dragState.type === 'resize-left') newStart = newEnd - 0.1;
            else if (dragState.type === 'resize-right') newEnd = newStart + 0.1;
        }

        // Update measurements
        const updatedMeasurements = measurements.map(m => {
            if (m.id === dragState.id) {
                return {
                    ...m,
                    startTime: newStart,
                    endTime: newEnd,
                    duration: newEnd - newStart
                };
            }
            return m;
        });

        onUpdateMeasurements(updatedMeasurements);
    };

    const handleMouseUp = () => {
        if (dragState) {
            setDragState(null);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
    };

    React.useEffect(() => {
        if (dragState) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragState, videoState.duration]);

    const handleTimelineClick = (e) => {
        if (!timelineRef.current || !videoState.duration) return;

        // Prevent click if we just finished dragging
        if (dragState) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const clickedTime = percentage * videoState.duration;

        // Check if click was on empty space (not on a measurement block)
        const clickedOnMeasurement = e.target.closest('[data-measurement-id]');

        // If in cutting mode, try to cut the measurement at current time
        if (cuttingMode && clickedOnMeasurement) {
            const measurementId = clickedOnMeasurement.getAttribute('data-measurement-id');
            handleCut(measurementId, videoState.currentTime);
            return;
        }

        // Only auto-add if autoAddMode is enabled
        if (!clickedOnMeasurement && autoAddMode && onAddMeasurement) {
            // Find the last measurement (by end time)
            let startTime = 0;

            if (measurements.length > 0) {
                // Sort measurements by end time and get the last one
                const sortedMeasurements = [...measurements].sort((a, b) => b.endTime - a.endTime);
                const lastMeasurement = sortedMeasurements[0];
                startTime = lastMeasurement.endTime;
            }

            // End time is where user clicked
            let endTime = clickedTime;

            // Make sure end time is after start time
            if (endTime <= startTime) {
                endTime = startTime + 0.5; // Add minimum 0.5 second duration
            }

            // Make sure we don't exceed video duration
            if (endTime > videoState.duration) {
                endTime = videoState.duration;
            }

            const duration = endTime - startTime;

            onAddMeasurement({
                startTime: startTime,
                endTime: endTime,
                duration: duration
            });
        } else if (onSeek) {
            // If clicked on empty space but no auto-add or not in auto-add mode, just seek
            onSeek(clickedTime);
        }
    };

    // Handle cutting measurement
    const handleCut = async (measurementId, cutTime) => {
        if (!onUpdateMeasurements) return;

        const measurement = measurements.find(m => m.id === measurementId);
        if (!measurement) return;

        // Check if cut time is within measurement bounds
        if (cutTime <= measurement.startTime || cutTime >= measurement.endTime) {
            await showAlert('Info', 'Cut time must be within the measurement duration');
            return;
        }

        // Create two new measurements
        const firstPart = {
            ...measurement,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            endTime: cutTime,
            duration: cutTime - measurement.startTime,
            elementName: measurement.elementName + ' (1)'
        };

        const secondPart = {
            ...measurement,
            id: (Date.now() + 1).toString() + Math.random().toString(36).substr(2, 9),
            startTime: cutTime,
            duration: measurement.endTime - cutTime,
            elementName: measurement.elementName + ' (2)'
        };

        // Replace the original measurement with the two parts
        const updatedMeasurements = measurements
            .filter(m => m.id !== measurementId)
            .concat([firstPart, secondPart])
            .sort((a, b) => a.startTime - b.startTime);

        onUpdateMeasurements(updatedMeasurements);
        setCuttingMode(false); // Exit cutting mode after cut
    };

    // Handle text annotation functions
    const addTextAnnotation = () => {
        const newAnnotation = {
            id: Date.now().toString(),
            text: '',
            startTime: videoState.currentTime,
            endTime: videoState.currentTime + 2,
            position: { x: 50, y: 50 }, // percentage
            style: {
                fontSize: 24,
                color: '#ffffff',
                backgroundColor: 'rgba(0,0,0,0.7)',
                fontWeight: 'bold'
            }
        };
        setSelectedAnnotation(newAnnotation);
        setShowTextDialog(true);
    };

    const saveTextAnnotation = (annotation) => {
        if (annotation.id && textAnnotations.find(a => a.id === annotation.id)) {
            // Update existing
            setTextAnnotations(prev => prev.map(a => a.id === annotation.id ? annotation : a));
        } else {
            // Add new
            setTextAnnotations(prev => [...prev, annotation]);
        }
        setShowTextDialog(false);
        setSelectedAnnotation(null);
    };

    const deleteTextAnnotation = (id) => {
        setTextAnnotations(prev => prev.filter(a => a.id !== id));
    };

    const saveEditedMeasurement = async (edited) => {
        const manual = parseFloat(edited.manualTime) || 0;
        const auto = parseFloat(edited.autoTime) || 0;
        const walk = parseFloat(edited.walkTime) || 0;
        const waiting = parseFloat(edited.waitingTime) || 0;
        const startTime = parseFloat(edited.startTime);
        const endTime = parseFloat(edited.endTime);
        const duration = endTime - startTime;

        if (startTime >= endTime) {
            await showAlert('Error', 'Start time must be less than end time.');
            return;
        }

        const updatedMeasurements = measurements.map(m =>
            m.id === edited.id ? {
                ...edited,
                manualTime: manual,
                autoTime: auto,
                walkTime: walk,
                waitingTime: waiting,
                startTime: startTime,
                endTime: endTime,
                duration: duration
            } : m
        );
        onUpdateMeasurements(updatedMeasurements);
        setShowEditDialog(false);
        setEditingMeasurement(null);
    };

    // Handle ruler hover
    const handleRulerMouseMove = (e) => {
        if (!timelineRef.current || !videoState.duration) return;
        const rect = timelineRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        const time = percentage * videoState.duration;
        setRulerHoverTime({ time, x });
    };

    const handleRulerMouseLeave = () => {
        setRulerHoverTime(null);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{
            backgroundColor: '#1a1a1a',
            padding: '4px',
            borderRadius: '4px',
            marginBottom: '2px'
        }}>
            {/* Timeline Header with Toolbar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
                fontSize: '0.75rem',
                color: '#888'
            }}>
                <span>Timeline Editor - {measurements.length} measurements</span>

                {/* Toolbar */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                        onClick={() => setAutoAddMode(!autoAddMode)}
                        style={{
                            backgroundColor: autoAddMode ? '#107c10' : '#333',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                        title={autoAddMode ? "Auto Add ON - Click timeline to add measurement" : "Auto Add OFF - Click timeline to seek only"}
                    >
                        ➕ {autoAddMode ? 'Auto Add ON' : 'Auto Add'}
                    </button>

                    {/* Cycle Controls - Inline */}
                    {currentCycle !== undefined && onNextCycle && (
                        <>
                            <div style={{ width: '1px', height: '20px', backgroundColor: '#555', margin: '0 8px' }} />
                            <span style={{ color: '#aaa', fontSize: '0.75rem' }}>Cycle:</span>
                            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '0.85rem', margin: '0 8px' }}>{currentCycle}</span>
                            <button
                                onClick={onNextCycle}
                                style={{
                                    padding: '4px 10px',
                                    fontSize: '0.7rem',
                                    backgroundColor: 'rgba(0, 90, 158, 0.8)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '4px',
                                    color: 'white',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 120, 212, 1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 90, 158, 0.8)'}
                                title="Next Cycle"
                            >
                                Next ⏭
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Ruler - Enhanced with detailed markers */}
            <div
                style={{
                    position: 'relative',
                    height: '16px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '4px 4px 0 0',
                    border: '1px solid #333',
                    borderBottom: 'none',
                    overflow: 'hidden'
                }}
                onMouseMove={handleRulerMouseMove}
                onMouseLeave={handleRulerMouseLeave}
            >
                {/* Major time markers (every second or adjusted by duration) */}
                {(() => {
                    const duration = videoState.duration || 1;
                    const markerCount = Math.min(Math.floor(duration) + 1, 60); // Max 60 markers
                    const interval = duration / markerCount;

                    return Array.from({ length: markerCount + 1 }, (_, i) => {
                        const time = i * interval;
                        const pos = (time / duration) * 100;
                        const isMajor = i % 5 === 0;

                        return (
                            <div
                                key={i}
                                style={{
                                    position: 'absolute',
                                    left: `${pos}%`,
                                    top: 0,
                                    bottom: 0,
                                    width: '1px',
                                    backgroundColor: isMajor ? '#666' : '#333',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    paddingBottom: '2px'
                                }}
                            >
                                {isMajor && (
                                    <span style={{
                                        fontSize: '0.6rem',
                                        color: '#888',
                                        transform: 'translateX(-50%)',
                                        backgroundColor: '#0a0a0a',
                                        padding: '0 2px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {formatTime(time)}
                                    </span>
                                )}
                            </div>
                        );
                    });
                })()}

                {/* Hover tooltip */}
                {rulerHoverTime && (
                    <div style={{
                        position: 'absolute',
                        left: `${rulerHoverTime.x}px`,
                        top: '-25px',
                        transform: 'translateX(-50%)',
                        backgroundColor: '#005a9e',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        zIndex: 100,
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                    }}>
                        {formatTime(rulerHoverTime.time)}
                    </div>
                )}
            </div>

            {/* Timeline Track */}
            <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                style={{
                    position: 'relative',
                    height: '50px',
                    backgroundColor: '#0a0a0a',
                    borderRadius: '0 0 4px 4px',
                    cursor: cuttingMode ? 'crosshair' : 'pointer',
                    border: '1px solid #333',
                    borderTop: 'none',
                    overflow: 'hidden'
                }}
            >
                {/* Text Annotation Track */}
                {textAnnotations.map((annotation) => {
                    const startPercent = (annotation.startTime / (videoState.duration || 1)) * 100;
                    const widthPercent = ((annotation.endTime - annotation.startTime) / (videoState.duration || 1)) * 100;

                    return (
                        <div
                            key={annotation.id}
                            style={{
                                position: 'absolute',
                                left: `${startPercent}%`,
                                top: '0px',
                                width: `${widthPercent}%`,
                                height: '12px',
                                backgroundColor: 'rgba(0, 90, 158, 0.6)',
                                border: '1px solid #005a9e',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.6rem',
                                color: 'white',
                                overflow: 'hidden',
                                zIndex: 5
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAnnotation(annotation);
                                setShowTextDialog(true);
                            }}
                            title={annotation.text}
                        >
                            📝 {widthPercent > 8 ? annotation.text.substring(0, 20) : ''}
                        </div>
                    );
                })}

                {/* Measurement blocks */}
                {measurements.map((measurement, index) => {
                    const startPercent = (measurement.startTime / (videoState.duration || 1)) * 100;
                    const widthPercent = (measurement.duration / (videoState.duration || 1)) * 100;
                    const isHovered = hoveredMeasurement?.id === measurement.id;

                    return (
                        <div
                            key={measurement.id}
                            data-measurement-id={measurement.id}
                            onMouseEnter={() => setHoveredMeasurement(measurement)}
                            onMouseLeave={() => setHoveredMeasurement(null)}
                            onMouseDown={(e) => handleMouseDown(e, measurement, 'move')}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingMeasurement(measurement);
                                setShowEditDialog(true);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectMeasurement) {
                                    onSelectMeasurement(measurement);
                                }
                                if (onSeek) {
                                    onSeek(measurement.startTime);
                                }
                            }}
                            style={{
                                position: 'absolute',
                                left: `${startPercent}%`,
                                top: '14px',
                                width: `${widthPercent}%`,
                                height: '34px',
                                backgroundColor: getCategoryColor(measurement.category),
                                border: isHovered ? '2px solid white' : '1px solid rgba(0,0,0,0.3)',
                                borderRadius: '2px',
                                cursor: 'grab',
                                transition: dragState?.id === measurement.id ? 'none' : 'all 0.2s',
                                transform: isHovered ? 'scaleY(1.2)' : 'scaleY(1)',
                                zIndex: isHovered || dragState?.id === measurement.id ? 10 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'visible' // Changed to visible for handles
                            }}
                            title={`${measurement.elementName} (${measurement.duration.toFixed(2)}s)`}
                        >
                            <span style={{
                                fontSize: '0.65rem',
                                color: 'white',
                                fontWeight: 'bold',
                                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                padding: '0 4px',
                                pointerEvents: 'none'
                            }}>
                                {widthPercent > 5 ? measurement.elementName : ''}
                            </span>

                            {/* Resize Handles (only visible on hover) */}
                            {isHovered && (
                                <>
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, measurement, 'resize-left')}
                                        style={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '6px',
                                            cursor: 'col-resize',
                                            backgroundColor: 'rgba(255,255,255,0.5)',
                                            zIndex: 20
                                        }}
                                    />
                                    <div
                                        onMouseDown={(e) => handleMouseDown(e, measurement, 'resize-right')}
                                        style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: '6px',
                                            cursor: 'col-resize',
                                            backgroundColor: 'rgba(255,255,255,0.5)',
                                            zIndex: 20
                                        }}
                                    />
                                </>
                            )}
                        </div>
                    );
                })}

                {/* Current time indicator */}
                {videoState.duration > 0 && (
                    <div
                        style={{
                            position: 'absolute',
                            left: `${(videoState.currentTime / videoState.duration) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: '2px',
                            backgroundColor: '#ff0000',
                            pointerEvents: 'none',
                            zIndex: 20,
                            boxShadow: '0 0 4px rgba(255,0,0,0.8)'
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '6px solid transparent',
                            borderRight: '6px solid transparent',
                            borderTop: '8px solid #ff0000'
                        }} />
                    </div>
                )}
            </div>

            {/* Hovered measurement info */}
            {/* Hovered measurement info - Always render to prevent layout shift */}
            <div style={{
                marginTop: '4px',
                padding: '4px 8px',
                backgroundColor: '#222',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                minHeight: '24px', // Fixed height
                visibility: hoveredMeasurement ? 'visible' : 'hidden' // Hide instead of unmount
            }}>
                <span style={{ fontWeight: 'bold' }}>{hoveredMeasurement ? hoveredMeasurement.elementName : '-'}</span>
                <span style={{ color: '#888' }}>
                    {hoveredMeasurement ? (
                        <>
                            {formatTime(hoveredMeasurement.startTime)} - {formatTime(hoveredMeasurement.endTime)}
                            <span style={{ marginLeft: '8px', color: getCategoryColor(hoveredMeasurement.category) }}>
                                ({hoveredMeasurement.duration.toFixed(2)}s)
                            </span>
                        </>
                    ) : '-'}
                </span>
            </div>

            {/* Text Annotation Dialog */}
            {showTextDialog && selectedAnnotation && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                        maxWidth: '90%',
                        border: '1px solid #333'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', color: 'white' }}>Text Annotation</h3>

                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', color: '#888', fontSize: '0.85rem' }}>
                                Text:
                            </label>
                            <input
                                type="text"
                                value={selectedAnnotation.text}
                                onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, text: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#0a0a0a',
                                    border: '1px solid #333',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '0.9rem'
                                }}
                                placeholder="Enter annotation text..."
                                autoFocus
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#888', fontSize: '0.85rem' }}>
                                    Start Time (s):
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={selectedAnnotation.startTime}
                                    onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, startTime: parseFloat(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#888', fontSize: '0.85rem' }}>
                                    End Time (s):
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={selectedAnnotation.endTime}
                                    onChange={(e) => setSelectedAnnotation({ ...selectedAnnotation, endTime: parseFloat(e.target.value) })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#0a0a0a',
                                        border: '1px solid #333',
                                        borderRadius: '4px',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            {textAnnotations.find(a => a.id === selectedAnnotation.id) && (
                                <button
                                    onClick={() => {
                                        deleteTextAnnotation(selectedAnnotation.id);
                                        setShowTextDialog(false);
                                        setSelectedAnnotation(null);
                                    }}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: '#c50f1f',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    Delete
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setShowTextDialog(false);
                                    setSelectedAnnotation(null);
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => saveTextAnnotation(selectedAnnotation)}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#005a9e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem'
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Measurement Dialog */}
            {showEditDialog && editingMeasurement && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        width: '500px',
                        padding: '24px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Edit Element</h3>
                            <button
                                onClick={() => {
                                    setShowEditDialog(false);
                                    setEditingMeasurement(null);
                                }}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}
                            >✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>Element Name</label>
                                <input
                                    type="text"
                                    value={editingMeasurement.elementName}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, elementName: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.category')}</label>
                                <select
                                    value={editingMeasurement.category}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, category: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="Value-added">{t('categories.valueAdded')}</option>
                                    <option value="Non value-added">{t('categories.nonValueAdded')}</option>
                                    <option value="Waste">{t('categories.waste')}</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>Therblig</label>
                                <select
                                    value={editingMeasurement.therblig || ''}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, therblig: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">None</option>
                                    {Object.entries(THERBLIGS).map(([code, { name }]) => (
                                        <option key={code} value={code}>{code} - {name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>Cycle</label>
                                <input
                                    type="number"
                                    value={editingMeasurement.cycle || 1}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, cycle: parseInt(e.target.value) || 1 })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>Rating %</label>
                                <input
                                    type="number"
                                    value={editingMeasurement.rating || 100}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, rating: parseFloat(e.target.value) || 100 })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#00a6ff', outline: 'none' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                            <div>
                                <label style={{ display: 'block', color: '#ffd700', fontSize: '0.8rem', marginBottom: '6px' }}>Manual Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.manualTime || 0}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, manualTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#ffd700', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#00ff00', fontSize: '0.8rem', marginBottom: '6px' }}>Auto Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.autoTime || 0}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, autoTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#00ff00', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '6px' }}>Walk Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.walkTime || 0}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, walkTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#ff4d4d', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#f97316', fontSize: '0.8rem', marginBottom: '6px' }}>Loss / Wait Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.waitingTime || 0}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, waitingTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#f97316', outline: 'none' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>Start Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.startTime}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, startTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>End Time (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingMeasurement.endTime}
                                    onChange={(e) => setEditingMeasurement({ ...editingMeasurement, endTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                                onClick={() => {
                                    setShowEditDialog(false);
                                    setEditingMeasurement(null);
                                }}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #444',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >Cancel</button>
                            <button
                                onClick={async () => await saveEditedMeasurement(editingMeasurement)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#005a9e',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TimelineEditor;
