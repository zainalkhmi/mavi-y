import React, { useState, useRef, useMemo } from 'react';

function ProjectGanttChart({ measurements = [] }) {
    const [zoomLevel, setZoomLevel] = useState(100); // pixels per second
    const containerRef = useRef(null);

    // Memoize stats calculation and cleanup measurements
    const stats = useMemo(() => {
        if (!measurements || measurements.length === 0) {
            return { totalDuration: 0, byCategory: {}, validMeasurements: [] };
        }

        // Ensure all numeric values are valid to avoid NaN crashes
        const validMeasurements = measurements.map(m => {
            const startTime = Number(m.startTime) || 0;
            const duration = Number(m.duration) || 0;
            const endTime = Number(m.endTime) || (startTime + duration);

            return {
                ...m,
                startTime: Math.max(0, startTime),
                endTime: Math.max(startTime, endTime),
                duration: Math.max(0, duration)
            };
        });

        const totalDuration = validMeasurements.length > 0
            ? Math.max(...validMeasurements.map(m => m.endTime), 10)
            : 10;

        const byCategory = validMeasurements.reduce((acc, m) => {
            acc[m.category] = (acc[m.category] || 0) + m.duration;
            return acc;
        }, {});

        return { totalDuration, byCategory, validMeasurements };
    }, [measurements]);

    if (!measurements || measurements.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                No measurements available to display.
            </div>
        );
    }

    const { totalDuration, validMeasurements } = stats;
    const timelineWidth = totalDuration * zoomLevel + 100; // Extra space

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#005a9e';
            case 'Non value-added': return '#bfa900';
            case 'Waste': return '#c50f1f';
            default: return '#666';
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '500px', backgroundColor: '#1e1e1e', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
            {/* Toolbar */}
            <div style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: '#252526', zIndex: 10 }}>
                <span style={{ color: '#ccc', fontSize: '0.9rem' }}>Zoom:</span>
                <button
                    onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
                    style={{ padding: '2px 8px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                >
                    -
                </button>
                <span style={{ color: '#fff', fontSize: '0.9rem', minWidth: '40px', textAlign: 'center' }}>{zoomLevel}%</span>
                <button
                    onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                    style={{ padding: '2px 8px', cursor: 'pointer', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                >
                    +
                </button>
            </div>

            {/* Main Scrollable Container */}
            <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                <div style={{ minWidth: `${660 + timelineWidth}px`, position: 'relative' }}>

                    {/* Header Row */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #444', backgroundColor: '#2d2d2d', color: '#ccc', fontSize: '0.85rem', fontWeight: 'bold', position: 'sticky', top: 0, zIndex: 5, height: '40px' }}>
                        <div style={{ width: '40px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: 0, backgroundColor: '#2d2d2d', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>#</div>
                        <div style={{ width: '200px', padding: '8px', borderRight: '1px solid #444', position: 'sticky', left: '40px', backgroundColor: '#2d2d2d', zIndex: 6, display: 'flex', alignItems: 'center' }}>Proses</div>
                        <div style={{ width: '80px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '240px', backgroundColor: '#2d2d2d', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Therblig</div>
                        <div style={{ width: '60px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '320px', backgroundColor: '#2d2d2d', zIndex: 6, color: '#ffd700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Manual</div>
                        <div style={{ width: '60px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '380px', backgroundColor: '#2d2d2d', zIndex: 6, color: '#00ff00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Auto</div>
                        <div style={{ width: '60px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '440px', backgroundColor: '#2d2d2d', zIndex: 6, color: '#ff4d4d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Walk</div>
                        <div style={{ width: '80px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '500px', backgroundColor: '#2d2d2d', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Start</div>
                        <div style={{ width: '80px', padding: '8px', borderRight: '1px solid #444', textAlign: 'center', position: 'sticky', left: '580px', backgroundColor: '#2d2d2d', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Finish</div>

                        {/* Time Ruler Header */}
                        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                            {Array.from({ length: Math.ceil(totalDuration) + 2 }).map((_, i) => {
                                const step = zoomLevel < 40 ? 5 : 1;
                                if (i % step !== 0) return null;
                                return (
                                    <div key={i} style={{ position: 'absolute', left: `${i * zoomLevel}px`, top: 0, bottom: 0, borderLeft: '1px solid #555' }}>
                                        <span style={{ position: 'absolute', top: '2px', left: '4px', fontSize: '0.75rem', color: '#aaa' }}>{i}s</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Data Rows */}
                    {validMeasurements.map((m, index) => {
                        const manualW = (m.manualTime || 0) * zoomLevel;
                        const autoW = (m.autoTime || 0) * zoomLevel;
                        const walkW = (m.walkTime || 0) * zoomLevel;
                        const hasBreakdown = (m.manualTime || 0) + (m.autoTime || 0) + (m.walkTime || 0) > 0.01;

                        return (
                            <div key={m.id || index} style={{ display: 'flex', borderBottom: '1px solid #333', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', height: '36px', alignItems: 'center' }}>
                                {/* Sticky Columns */}
                                <div style={{ width: '40px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#888', fontSize: '0.8rem', position: 'sticky', left: 0, backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {index + 1}
                                </div>
                                <div style={{ width: '200px', padding: '0 8px', borderRight: '1px solid #333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff', fontSize: '0.85rem', position: 'sticky', left: '40px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }} title={m.elementName}>
                                    {m.elementName}
                                </div>
                                <div style={{ width: '80px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#aaa', fontSize: '0.8rem', position: 'sticky', left: '240px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.therblig || '-'}
                                </div>
                                <div style={{ width: '60px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#ffd700', fontSize: '0.8rem', position: 'sticky', left: '320px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.manualTime ? m.manualTime.toFixed(2) : '-'}
                                </div>
                                <div style={{ width: '60px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#00ff00', fontSize: '0.8rem', position: 'sticky', left: '380px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.autoTime ? m.autoTime.toFixed(2) : '-'}
                                </div>
                                <div style={{ width: '60px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#ff4d4d', fontSize: '0.8rem', position: 'sticky', left: '440px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.walkTime ? m.walkTime.toFixed(2) : '-'}
                                </div>
                                <div style={{ width: '80px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#aaa', fontSize: '0.8rem', position: 'sticky', left: '500px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.startTime.toFixed(2)}s
                                </div>
                                <div style={{ width: '80px', padding: '0 8px', borderRight: '1px solid #333', textAlign: 'center', color: '#aaa', fontSize: '0.8rem', position: 'sticky', left: '580px', backgroundColor: index % 2 === 0 ? '#1e1e1e' : '#252526', zIndex: 2 }}>
                                    {m.endTime.toFixed(2)}s
                                </div>

                                {/* Timeline Area */}
                                <div style={{ flex: 1, position: 'relative', height: '100%' }}>
                                    {/* Timeline Bar */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: `${m.startTime * zoomLevel}px`,
                                            width: `${Math.max(2, m.duration * zoomLevel)}px`,
                                            height: '20px',
                                            top: '8px',
                                            backgroundColor: hasBreakdown ? 'transparent' : getCategoryColor(m.category),
                                            borderRadius: '4px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                                            cursor: 'pointer',
                                            transition: 'opacity 0.2s',
                                            zIndex: 1,
                                            display: 'flex',
                                            overflow: 'hidden'
                                        }}
                                        title={`${m.elementName}\nDuration: ${m.duration.toFixed(2)}s\nCategory: ${m.category}`}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                    >
                                        {hasBreakdown ? (
                                            <>
                                                {m.manualTime > 0 && <div style={{ width: `${manualW}px`, height: '100%', backgroundColor: '#ffd700' }} title={`Manual: ${m.manualTime.toFixed(2)}s`} />}
                                                {m.autoTime > 0 && <div style={{ width: `${autoW}px`, height: '100%', backgroundColor: '#00ff00' }} title={`Auto: ${m.autoTime.toFixed(2)}s`} />}
                                                {m.walkTime > 0 && <div style={{ width: `${walkW}px`, height: '100%', backgroundColor: '#ff4d4d' }} title={`Walk: ${m.walkTime.toFixed(2)}s`} />}
                                            </>
                                        ) : (
                                            /* Label inside bar if wide enough */
                                            m.duration * zoomLevel > 50 && (
                                                <div style={{ fontSize: '0.7rem', color: 'white', padding: '0 4px', overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: '20px', width: '100%', textAlign: 'center' }}>
                                                    {m.duration.toFixed(1)}s
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Time Scale Overlay (Grid lines only) */}
                    <div style={{ position: 'absolute', top: '40px', left: '660px', width: `${timelineWidth}px`, height: '100%', pointerEvents: 'none', zIndex: 0 }}>
                        {Array.from({ length: Math.ceil(totalDuration) + 2 }).map((_, i) => {
                            const step = zoomLevel < 40 ? 5 : 1;
                            if (i % step !== 0) return null;
                            return (
                                <div key={i} style={{ position: 'absolute', left: `${i * zoomLevel}px`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ProjectGanttChart;
