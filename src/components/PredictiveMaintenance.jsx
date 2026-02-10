import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { analyzeFatigue, generateTrendData } from '../utils/fatiguePredictor';

const PredictiveMaintenance = ({ measurements }) => {
    const [analysis, setAnalysis] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [simulationMode, setSimulationMode] = useState(false);

    // Group measurements by cycle and calculate durations
    const cycleData = useMemo(() => {
        if (!measurements || measurements.length === 0) return [];

        const cycles = {};
        measurements.forEach(m => {
            if (!cycles[m.cycleIndex]) cycles[m.cycleIndex] = 0;
            cycles[m.cycleIndex] += m.duration;
        });

        // Convert to array sorted by index
        return Object.keys(cycles)
            .sort((a, b) => parseInt(a) - parseInt(b))
            .map(k => cycles[k]);
    }, [measurements]);

    // Perform analysis when data changes
    useEffect(() => {
        if (cycleData.length > 0) {
            const results = analyzeFatigue(cycleData);
            setAnalysis(results);
            const chartData = generateTrendData(cycleData);
            setTrendData(chartData);
        }
    }, [cycleData]);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Good': return '#4ade80'; // Green
            case 'Warning': return '#facc15'; // Yellow
            case 'Critical': return '#f87171'; // Red
            default: return '#9ca3af'; // Gray
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '20px', gap: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>🔮 Operator Predictive Maintenance</h1>
                <div style={{ padding: '8px 16px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    Cycle Count: <strong>{cycleData.length}</strong>
                </div>
            </div>

            {/* Main Dashboard Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                {/* 1. Energy Gauge */}
                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-secondary)' }}>Operator Energy Level</h3>

                    <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {/* CSS Circle Gauge */}
                        <svg width="180" height="180" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="10" />
                            <circle
                                cx="50" cy="50" r="45" fill="none"
                                stroke={getStatusColor(analysis?.status)}
                                strokeWidth="10"
                                strokeDasharray="283"
                                strokeDashoffset={283 - (283 * (analysis?.energyLevel || 0) / 100)}
                                transform="rotate(-90 50 50)"
                                style={{ transition: 'stroke-dashoffset 1s ease' }}
                            />
                        </svg>
                        <div style={{ position: 'absolute', textAlign: 'center' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 'bold', color: getStatusColor(analysis?.status) }}>
                                {analysis?.energyLevel || 0}%
                            </div>
                            <div style={{ color: 'var(--text-secondary)' }}>Capacity</div>
                        </div>
                    </div>

                    <div style={{ marginTop: '15px', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 500 }}>
                            Status: <span style={{ color: getStatusColor(analysis?.status) }}>{analysis?.status || 'No Data'}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: '#888', marginTop: '5px' }}>
                            {analysis?.prediction}
                        </div>
                    </div>
                </div>

                {/* 2. Key Metrics */}
                <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-secondary)' }}>Fatigue Indicators</h3>

                    <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#333', borderRadius: '8px' }}>
                        <span>Trend Direction</span>
                        <span style={{ fontWeight: 'bold', color: analysis?.slope > 0 ? '#f87171' : '#4ade80' }}>
                            {analysis?.trend || '-'}
                        </span>
                    </div>

                    <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#333', borderRadius: '8px' }}>
                        <span>Cycle Variability</span>
                        <span style={{ fontWeight: 'bold', color: (analysis?.variability || 0) > 0.15 ? '#f87171' : '#4ade80' }}>
                            {((analysis?.variability || 0) * 100).toFixed(1)}%
                        </span>
                    </div>

                    <div className="metric-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#333', borderRadius: '8px' }}>
                        <span>Prediction Horizon</span>
                        <span style={{ fontWeight: 'bold', color: '#60a5fa' }}>
                            +10 Cycles
                        </span>
                    </div>

                    {analysis?.status === 'Warning' || analysis?.status === 'Critical' ? (
                        <div style={{ background: 'rgba(248, 113, 113, 0.2)', padding: '15px', borderRadius: '8px', border: '1px solid #f87171', marginTop: 'auto' }}>
                            <strong>⚠️ Recommendation:</strong><br />
                            Operator shows signs of fatigue (slowing average cycle time). Recommend creating a 10-minute micro-break or rotating tasks.
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(74, 222, 128, 0.2)', padding: '15px', borderRadius: '8px', border: '1px solid #4ade80', marginTop: 'auto' }}>
                            <strong>✅ Recommendation:</strong><br />
                            Performance is stable and consistent. Continue current workflow.
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Trend Chart */}
            <div style={{ flex: 1, minHeight: '300px', background: 'var(--bg-secondary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-secondary)' }}>Cycle Time Trend & Prediction</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                        <XAxis
                            dataKey="cycle"
                            stroke="#888"
                            label={{ value: 'Cycle #', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                            stroke="#888"
                            label={{ value: 'Time (s)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#222', border: '1px solid #555' }}
                            formatter={(value, name) => [value + ' s', name === 'actual' ? 'Actual Time' : 'Trend/Prediction']}
                        />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            fill="url(#colorCycle)"
                            stroke="#82ca9d"
                            strokeWidth={2}
                            isAnimationActive={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="trend"
                            stroke="#f87171"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                        />
                        <defs>
                            <linearGradient id="colorCycle" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {cycleData.length < 3 && (
                <div style={{ textAlign: 'center', color: '#777', fontStyle: 'italic' }}>
                    * Need at least 3 full cycles to begin predictive analysis.
                </div>
            )}
        </div>
    );
};

export default PredictiveMaintenance;
