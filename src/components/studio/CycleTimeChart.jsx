import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

/**
 * Cycle Time Distribution Chart Component
 * Displays histogram of cycle times with statistical metrics
 */
const CycleTimeChart = ({
    timelineData = [],
    cycleStats = null,
    targetCycleTime = null
}) => {
    // Calculate cycle times from timeline events
    const cycleTimes = useMemo(() => {
        const times = [];
        const cycles = timelineData.filter(e => e.state === 'Start' || e.isCycleStart);

        for (let i = 1; i < cycles.length; i++) {
            const duration = cycles[i].startTime - cycles[i - 1].startTime;
            if (duration > 0 && duration < 300) { // Filter unrealistic values
                times.push(duration);
            }
        }

        // Also use cycleStats if available
        if (cycleStats?.cycleTimes) {
            return cycleStats.cycleTimes;
        }

        return times;
    }, [timelineData, cycleStats]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (cycleTimes.length === 0) return null;

        const sorted = [...cycleTimes].sort((a, b) => a - b);
        const sum = cycleTimes.reduce((a, b) => a + b, 0);
        const mean = sum / cycleTimes.length;
        const variance = cycleTimes.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / cycleTimes.length;
        const std = Math.sqrt(variance);
        const min = sorted[0];
        const max = sorted[sorted.length - 1];
        const median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];

        // Calculate histogram bins
        const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(cycleTimes.length))));
        const binWidth = (max - min) / binCount || 1;
        const bins = Array(binCount).fill(0);

        cycleTimes.forEach(t => {
            const binIndex = Math.min(binCount - 1, Math.floor((t - min) / binWidth));
            bins[binIndex]++;
        });

        const maxBinCount = Math.max(...bins);

        return {
            count: cycleTimes.length,
            mean,
            std,
            min,
            max,
            median,
            bins,
            binWidth,
            binStart: min,
            maxBinCount,
            cv: (std / mean) * 100 // Coefficient of variation
        };
    }, [cycleTimes]);

    if (!stats || stats.count < 2) {
        return (
            <div style={{
                backgroundColor: '#111827',
                borderRadius: '8px',
                padding: '20px',
                border: '1px solid #374151',
                textAlign: 'center',
                color: '#6b7280'
            }}>
                <BarChart3 size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <p style={{ margin: 0 }}>Not enough cycle data yet</p>
                <p style={{ margin: '5px 0 0', fontSize: '0.8rem' }}>Complete at least 2 cycles to see distribution</p>
            </div>
        );
    }

    const isHighVariability = stats.cv > 20;
    const isBelowTarget = targetCycleTime && stats.mean > targetCycleTime;

    return (
        <div style={{
            backgroundColor: '#111827',
            borderRadius: '8px',
            padding: '15px',
            border: '1px solid #374151'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                paddingBottom: '10px',
                borderBottom: '1px solid #374151'
            }}>
                <h3 style={{ margin: 0, fontSize: '1rem', color: '#e5e7eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart3 size={18} />
                    Cycle Time Distribution
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                    n = {stats.count} cycles
                </span>
            </div>

            {/* Histogram */}
            <div style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: '120px',
                marginBottom: '15px',
                padding: '0 5px'
            }}>
                {stats.bins.map((count, i) => {
                    const height = (count / stats.maxBinCount) * 100;
                    const binStart = stats.binStart + i * stats.binWidth;
                    const binEnd = binStart + stats.binWidth;
                    const isTargetBin = targetCycleTime && targetCycleTime >= binStart && targetCycleTime < binEnd;
                    const isMeanBin = stats.mean >= binStart && stats.mean < binEnd;

                    return (
                        <div
                            key={i}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <div
                                style={{
                                    width: '100%',
                                    height: `${height}%`,
                                    minHeight: count > 0 ? '4px' : '0',
                                    backgroundColor: isMeanBin ? '#3b82f6' : (isTargetBin ? '#22c55e' : '#6366f1'),
                                    borderRadius: '2px 2px 0 0',
                                    transition: 'height 0.3s ease',
                                    position: 'relative'
                                }}
                                title={`${binStart.toFixed(1)}s - ${binEnd.toFixed(1)}s: ${count} cycles`}
                            >
                                {count > 0 && (
                                    <span style={{
                                        position: 'absolute',
                                        top: '-18px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.65rem',
                                        color: '#9ca3af'
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* X-axis labels */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.7rem',
                color: '#6b7280',
                marginBottom: '15px'
            }}>
                <span>{stats.min.toFixed(1)}s</span>
                <span>{((stats.min + stats.max) / 2).toFixed(1)}s</span>
                <span>{stats.max.toFixed(1)}s</span>
            </div>

            {/* Statistics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '10px',
                marginBottom: '10px'
            }}>
                <StatBox
                    label="Mean"
                    value={`${stats.mean.toFixed(2)}s`}
                    icon={<TrendingUp size={14} />}
                    highlight={isBelowTarget}
                />
                <StatBox
                    label="Std Dev"
                    value={`±${stats.std.toFixed(2)}s`}
                    warning={isHighVariability}
                />
                <StatBox
                    label="Min"
                    value={`${stats.min.toFixed(2)}s`}
                    icon={<Clock size={14} />}
                />
                <StatBox
                    label="Max"
                    value={`${stats.max.toFixed(2)}s`}
                />
            </div>

            {/* Additional Stats Row */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px'
            }}>
                <StatBox
                    label="Median"
                    value={`${stats.median.toFixed(2)}s`}
                />
                <StatBox
                    label="CV"
                    value={`${stats.cv.toFixed(1)}%`}
                    warning={isHighVariability}
                    tooltip="Coefficient of Variation - lower is more consistent"
                />
                <StatBox
                    label="Range"
                    value={`${(stats.max - stats.min).toFixed(2)}s`}
                />
            </div>

            {/* Warnings */}
            {(isHighVariability || isBelowTarget) && (
                <div style={{
                    marginTop: '15px',
                    padding: '10px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontSize: '0.8rem',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <AlertTriangle size={16} />
                    <div>
                        {isHighVariability && <div>High variability detected (CV &gt; 20%). Consider standardizing the process.</div>}
                        {isBelowTarget && <div>Average cycle time exceeds target ({targetCycleTime}s).</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper component for stat boxes
const StatBox = ({ label, value, icon, highlight, warning, tooltip }) => (
    <div
        style={{
            backgroundColor: '#1f2937',
            padding: '10px',
            borderRadius: '6px',
            textAlign: 'center',
            border: warning ? '1px solid #f59e0b' : (highlight ? '1px solid #ef4444' : '1px solid #374151')
        }}
        title={tooltip}
    >
        <div style={{
            fontSize: '0.7rem',
            color: '#9ca3af',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
        }}>
            {icon}
            {label}
        </div>
        <div style={{
            fontSize: '1rem',
            fontWeight: 600,
            color: warning ? '#f59e0b' : (highlight ? '#ef4444' : '#e5e7eb')
        }}>
            {value}
        </div>
    </div>
);

export default CycleTimeChart;
