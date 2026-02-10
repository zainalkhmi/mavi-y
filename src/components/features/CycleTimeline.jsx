import React from 'react';

/**
 * Cycle Timeline Component
 * Displays detected cycles in a visual timeline format
 */
const CycleTimeline = ({ cycles, onSelectCycle, selectedCycles = [] }) => {
    if (!cycles || cycles.length === 0) {
        return (
            <div style={{
                padding: '30px',
                textAlign: 'center',
                backgroundColor: '#252526',
                borderRadius: '12px',
                border: '1px solid #333',
                color: '#666'
            }}>
                <p>Tidak ada siklus terdeteksi</p>
            </div>
        );
    }

    // Find min and max times for timeline scaling
    const minTime = Math.min(...cycles.map(c => c.startTime));
    const maxTime = Math.max(...cycles.map(c => c.endTime));
    const totalDuration = maxTime - minTime;

    return (
        <div style={{
            backgroundColor: '#252526',
            padding: '20px',
            borderRadius: '12px',
            border: '1px solid #333'
        }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📊</span>
                Cycle Timeline ({cycles.length} cycles)
            </h3>

            {/* Timeline */}
            <div style={{
                width: '100%',
                height: '150px',
                position: 'relative',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                overflow: 'hidden',
                marginBottom: '20px'
            }}>
                {/* Time markers */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.7rem',
                    color: '#666',
                    padding: '0 10px'
                }}>
                    <span>0s</span>
                    <span>{(totalDuration / 4).toFixed(1)}s</span>
                    <span>{(totalDuration / 2).toFixed(1)}s</span>
                    <span>{(totalDuration * 3 / 4).toFixed(1)}s</span>
                    <span>{totalDuration.toFixed(1)}s</span>
                </div>

                {/* Cycle bars */}
                <div style={{
                    position: 'absolute',
                    top: '30px',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                    padding: '10px'
                }}>
                    {cycles.map((cycle, index) => {
                        const startPercent = ((cycle.startTime - minTime) / totalDuration) * 100;
                        const widthPercent = (cycle.duration / totalDuration) * 100;

                        const isSelected = selectedCycles.some(sc => sc.cycleNumber === cycle.cycleNumber);

                        // Color based on similarity score
                        let color = '#00d2ff';
                        if (cycle.similarityScore !== undefined) {
                            if (cycle.similarityScore >= 90) color = '#4caf50';
                            else if (cycle.similarityScore >= 70) color = '#00d2ff';
                            else if (cycle.similarityScore >= 50) color = '#ffa500';
                            else color = '#ff4b4b';
                        }

                        return (
                            <div
                                key={index}
                                onClick={() => onSelectCycle && onSelectCycle(cycle)}
                                style={{
                                    position: 'absolute',
                                    left: `${startPercent}%`,
                                    width: `${widthPercent}%`,
                                    height: '25px',
                                    top: `${30 + (index % 3) * 30}px`,
                                    backgroundColor: color,
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    border: isSelected ? '2px solid #fff' : 'none',
                                    boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                                    transition: 'all 0.2s',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title={`Cycle ${cycle.cycleNumber}: ${cycle.duration.toFixed(2)}s${cycle.similarityScore !== undefined ? ` (${cycle.similarityScore}% similarity)` : ''}`}
                            >
                                <span style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 'bold',
                                    color: '#000',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: '0 5px'
                                }}>
                                    C{cycle.cycleNumber}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Cycle List */}
            <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '10px'
            }}>
                {cycles.map((cycle, index) => {
                    const isSelected = selectedCycles.some(sc => sc.cycleNumber === cycle.cycleNumber);

                    // Color based on similarity score
                    let scoreColor = '#00d2ff';
                    if (cycle.similarityScore !== undefined) {
                        if (cycle.similarityScore >= 90) scoreColor = '#4caf50';
                        else if (cycle.similarityScore >= 70) scoreColor = '#00d2ff';
                        else if (cycle.similarityScore >= 50) scoreColor = '#ffa500';
                        else scoreColor = '#ff4b4b';
                    }

                    return (
                        <div
                            key={index}
                            onClick={() => onSelectCycle && onSelectCycle(cycle)}
                            style={{
                                padding: '15px',
                                backgroundColor: isSelected ? '#37373d' : '#1a1a1a',
                                borderRadius: '8px',
                                border: `2px solid ${isSelected ? scoreColor : '#333'}`,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '10px'
                            }}>
                                <span style={{ fontWeight: 'bold', color: '#fff' }}>
                                    Cycle {cycle.cycleNumber}
                                </span>
                                {cycle.similarityScore !== undefined && (
                                    <span style={{
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        color: scoreColor
                                    }}>
                                        {cycle.similarityScore}%
                                    </span>
                                )}
                            </div>

                            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
                                <div style={{ marginBottom: '5px' }}>
                                    ⏱️ Duration: <span style={{ color: '#fff' }}>{cycle.duration.toFixed(2)}s</span>
                                </div>
                                <div style={{ marginBottom: '5px' }}>
                                    📍 Time: <span style={{ color: '#fff' }}>{cycle.startTime.toFixed(2)}s - {cycle.endTime.toFixed(2)}s</span>
                                </div>
                                <div>
                                    📊 Avg Motion: <span style={{ color: '#fff' }}>{cycle.avgMotion}</span>
                                </div>
                            </div>

                            {cycle.actions && cycle.actions.length > 0 && (
                                <div style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                                    <div style={{ color: '#888', marginBottom: '5px' }}>Actions:</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                        {cycle.actions.slice(0, 3).map((action, i) => (
                                            <span
                                                key={i}
                                                style={{
                                                    padding: '3px 8px',
                                                    backgroundColor: '#333',
                                                    borderRadius: '12px',
                                                    color: '#ccc'
                                                }}
                                            >
                                                {action.action}
                                            </span>
                                        ))}
                                        {cycle.actions.length > 3 && (
                                            <span style={{ color: '#666' }}>+{cycle.actions.length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {cycle.deviations && (
                                <div style={{ marginTop: '10px', fontSize: '0.75rem' }}>
                                    <div style={{ color: '#888', marginBottom: '5px' }}>Deviations:</div>
                                    {cycle.deviations.durationDiff !== undefined && (
                                        <div style={{ color: '#ccc' }}>
                                            ⏱️ Time: ±{cycle.deviations.durationDiff.toFixed(2)}s
                                        </div>
                                    )}
                                    {cycle.deviations.poseDeviation !== undefined && (
                                        <div style={{ color: '#ccc' }}>
                                            🧍 Pose: {cycle.deviations.poseDeviation.toFixed(1)}%
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#1a1a1a',
                borderRadius: '8px',
                fontSize: '0.85rem'
            }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px', color: '#ccc' }}>
                    Similarity Score Legend:
                </div>
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: '#4caf50', borderRadius: '4px' }} />
                        <span style={{ color: '#ccc' }}>90-100% (Excellent)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: '#00d2ff', borderRadius: '4px' }} />
                        <span style={{ color: '#ccc' }}>70-89% (Good)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: '#ffa500', borderRadius: '4px' }} />
                        <span style={{ color: '#ccc' }}>50-69% (Fair)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '20px', height: '20px', backgroundColor: '#ff4b4b', borderRadius: '4px' }} />
                        <span style={{ color: '#ccc' }}>0-49% (Poor)</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CycleTimeline;
