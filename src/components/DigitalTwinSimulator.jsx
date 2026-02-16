import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const DigitalTwinSimulator = ({ stationsData, isRunning, onStop }) => {
    const { t } = useLanguage();

    const getStationNumber = (value) => {
        if (!value) return Number.POSITIVE_INFINITY;
        const match = String(value).match(/station\s*(\d+)/i);
        return match ? parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
    };

    const sortByStationNumber = (a, b) => {
        const stationA = getStationNumber(a);
        const stationB = getStationNumber(b);

        if (stationA !== stationB) {
            return stationA - stationB;
        }

        return String(a).localeCompare(String(b), undefined, {
            numeric: true,
            sensitivity: 'base'
        });
    };

    // Simulation State
    const [simState, setSimState] = useState({
        stations: [],
        buffers: [],
        stats: { output: 0, timeElapsed: 0 },
        tick: 0
    });

    const [speed, setSpeed] = useState(1); // Simulation speed multiplier
    const requestRef = useRef();
    const lastTimeRef = useRef();

    // Initialize Simulation
    useEffect(() => {
        // Transform incoming data to simulation model
        const initStations = Object.keys(stationsData).sort(sortByStationNumber).map((id, index) => {
            const tasks = stationsData[id];
            const avgTime = tasks.reduce((sum, t) => {
                let tTime = parseFloat(t.manualTime) || 0;
                if (tTime === 0 && t.duration) tTime = t.duration;
                return sum + tTime;
            }, 0);

            return {
                id,
                name: id,
                avgTime: avgTime,
                stdDev: avgTime * 0.1, // Default 10% variance
                status: 'IDLE', // IDLE, BUSY, BLOCKED, STARVED
                progress: 0,
                processingItem: null,
                totalProcessed: 0
            };
        });

        // Buffers are between stations (N stations => N-1 buffers, plus Input and Output "infinite" buffers)
        // For simplicity: Buffer[i] provides input to Station[i]
        const initBuffers = initStations.map((_, i) => ({
            id: `buffer-${i}`,
            count: i === 0 ? 1000 : 0, // Infinite input for first station
            capacity: 5 // Max buffer capacity
        }));

        setSimState({
            stations: initStations,
            buffers: initBuffers,
            stats: { output: 0, timeElapsed: 0 },
            tick: 0
        });
    }, [stationsData]);

    // Simulation Loop
    const animate = (time) => {
        if (lastTimeRef.current === undefined) lastTimeRef.current = time;
        const deltaTime = time - lastTimeRef.current; // ms

        // Only update if enough real time passed based on speed
        // 1 tick = 100ms simulation time
        if (deltaTime > (100 / speed)) {
            updateSimulation();
            lastTimeRef.current = time;
        }

        if (isRunning) {
            requestRef.current = requestAnimationFrame(animate);
        }
    };

    useEffect(() => {
        if (isRunning) {
            requestRef.current = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(requestRef.current);
            lastTimeRef.current = undefined;
        }
        return () => cancelAnimationFrame(requestRef.current);
    }, [isRunning, speed]);

    const updateSimulation = () => {
        setSimState(prev => {
            const nextStations = [...prev.stations];
            const nextBuffers = [...prev.buffers]; // buffer[i] is input for station[i]
            let nextOutput = prev.stats.output;

            // Process each station (Reverse order to handle pulling correctly)
            for (let i = 0; i < nextStations.length; i++) {
                const station = { ...nextStations[i] };
                const inputBuffer = nextBuffers[i];
                // Output buffer for station[i] is input buffer for station[i+1], or "Final"
                const outputBuffer = (i === nextStations.length - 1) ? null : nextBuffers[i + 1];

                // Logic
                if (station.status === 'BUSY') {
                    // Work on item
                    station.progress += 0.1; // 0.1s per tick

                    if (station.progress >= station.requiredTime) {
                        // Finished
                        if (!outputBuffer || outputBuffer.count < outputBuffer.capacity) {
                            // Push to next
                            if (outputBuffer) outputBuffer.count++;
                            else nextOutput++; // Final output

                            station.status = 'IDLE';
                            station.processingItem = null;
                            station.progress = 0;
                            station.totalProcessed++;
                        } else {
                            station.status = 'BLOCKED';
                        }
                    }
                } else if (station.status === 'BLOCKED') {
                    // Try to unblock
                    if (!outputBuffer || outputBuffer.count < outputBuffer.capacity) {
                        if (outputBuffer) outputBuffer.count++;
                        else nextOutput++;

                        station.status = 'IDLE';
                        station.processingItem = null;
                        station.progress = 0;
                        station.totalProcessed++;
                    }
                } else if (station.status === 'IDLE' || station.status === 'STARVED') {
                    // Try to pull
                    if (inputBuffer.count > 0) {
                        inputBuffer.count--;
                        station.status = 'BUSY';
                        // Generate random time
                        // const z = ... (skipped box-muller for perf, simplified random)
                        const variance = (Math.random() - 0.5) * 2 * station.stdDev;
                        station.requiredTime = Math.max(0.1, station.avgTime + variance);
                        station.processingItem = { id: Date.now() };
                        station.progress = 0;
                    } else {
                        station.status = 'STARVED';
                    }
                }

                nextStations[i] = station;
            }

            return {
                stations: nextStations,
                buffers: nextBuffers,
                stats: { output: nextOutput, timeElapsed: prev.stats.timeElapsed + 0.1 },
                tick: prev.tick + 1
            };
        });
    };

    return (
        <div style={{ backgroundColor: '#111', padding: '20px', borderRadius: '12px', color: 'white' }}>
            {/* Header / Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>🏭 {t('yamazumi.digitalTwin.title')}</div>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <button onClick={() => setSpeed(1)} style={{ opacity: speed === 1 ? 1 : 0.5, background: 'none', border: '1px solid #555', color: 'white', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}>1x</button>
                        <button onClick={() => setSpeed(5)} style={{ opacity: speed === 5 ? 1 : 0.5, background: 'none', border: '1px solid #555', color: 'white', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}>5x</button>
                        <button onClick={() => setSpeed(20)} style={{ opacity: speed === 20 ? 1 : 0.5, background: 'none', border: '1px solid #555', color: 'white', borderRadius: '4px', padding: '2px 5px', cursor: 'pointer' }}>20x</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem' }}>
                    <div>⏱ {t('yamazumi.digitalTwin.time')}: {(simState.stats.timeElapsed / 60).toFixed(0)}m</div>
                    <div>📦 {t('yamazumi.digitalTwin.output')}: {simState.stats.output} units</div>
                    <div>⚡ {t('yamazumi.digitalTwin.efficiency')}: {simState.stats.timeElapsed > 0 ? ((simState.stats.output * simState.stations[0]?.avgTime) / (simState.stats.timeElapsed * simState.stations.length) * 100).toFixed(1) : 0}%</div>
                </div>
            </div>

            {/* Visualization Area */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', padding: '20px 0', minHeight: '150px' }}>
                {simState.stations.map((station, idx) => (
                    <React.Fragment key={station.id}>
                        {/* Buffer (Queue) */}
                        <div style={{
                            width: '40px',
                            height: '100px',
                            borderBottom: '2px solid #555',
                            display: 'flex',
                            flexDirection: 'column-reverse',
                            alignItems: 'center',
                            gap: '2px',
                            paddingBottom: '5px',
                            position: 'relative'
                        }}>
                            <div style={{ position: 'absolute', top: '-20px', fontSize: '0.7rem', color: '#888' }}>
                                {idx === 0 ? 'INPUT' : `WIP: ${simState.buffers[idx].count}`}
                            </div>
                            {/* Render items in buffer (limit 5 visuals) */}
                            {Array.from({ length: Math.min(5, simState.buffers[idx].count) }).map((_, i) => (
                                <div key={i} style={{ width: '20px', height: '10px', backgroundColor: '#0078d4', borderRadius: '2px' }} />
                            ))}
                            {simState.buffers[idx].count > 5 && <div style={{ fontSize: '0.7rem', color: '#0078d4' }}>+{simState.buffers[idx].count - 5}</div>}
                        </div>

                        {/* Station Node */}
                        <div style={{
                            width: '120px',
                            height: '120px',
                            backgroundColor: '#252526',
                            borderRadius: '50%', // Circular node
                            border: `4px solid ${station.status === 'BUSY' ? '#0a5' :
                                station.status === 'BLOCKED' ? '#c50f1f' :
                                    station.status === 'STARVED' ? '#ff9800' : '#555'
                                }`,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                        }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '5px' }}>{station.name}</div>

                            {/* Status Indicator */}
                            <div style={{
                                fontSize: '0.7rem',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: station.status === 'BUSY' ? 'rgba(0,170,85,0.2)' :
                                    station.status === 'BLOCKED' ? 'rgba(197,15,31,0.2)' :
                                        station.status === 'STARVED' ? 'rgba(255,152,0,0.2)' : '#333',
                                color: station.status === 'BUSY' ? '#0a5' :
                                    station.status === 'BLOCKED' ? '#c50f1f' :
                                        station.status === 'STARVED' ? '#ff9800' : '#888'
                            }}>
                                {station.status === 'BUSY' ? t('yamazumi.digitalTwin.busy') :
                                    station.status === 'BLOCKED' ? t('yamazumi.digitalTwin.blocked') :
                                        station.status === 'STARVED' ? t('yamazumi.digitalTwin.starved').split(' ')[0] : station.status}
                            </div>

                            {/* Progress Ring or Bar */}
                            {station.status === 'BUSY' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '8px' }}>
                                    <div style={{ fontSize: '0.85rem', color: '#0a5', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        {station.progress.toFixed(1)}s
                                    </div>
                                    <div style={{ width: '60px', height: '4px', backgroundColor: '#333', borderRadius: '2px', marginTop: '4px' }}>
                                        <div style={{
                                            width: `${Math.min(100, (station.progress / station.requiredTime) * 100)}%`,
                                            height: '100%',
                                            backgroundColor: '#0a5',
                                            borderRadius: '2px',
                                            transition: 'width 0.1s linear'
                                        }} />
                                    </div>
                                    <div style={{ fontSize: '0.6rem', color: '#444', marginTop: '2px' }}>
                                        {t('yamazumi.digitalTwin.target')}: {station.requiredTime.toFixed(1)}s
                                    </div>
                                </div>
                            )}

                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '5px' }}>
                                Total: {station.totalProcessed}
                            </div>
                        </div>

                        {/* Arrows */}
                        <div style={{ color: '#444' }}>➜</div>
                    </React.Fragment>
                ))}

                {/* Final Output */}
                <div style={{
                    width: '60px',
                    height: '60px',
                    border: '2px dashed #0a5',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column'
                }}>
                    <span style={{ fontSize: '1.5rem' }}>📦</span>
                    <span style={{ fontSize: '0.8rem', color: '#0a5', fontWeight: 'bold' }}>{simState.stats.output}</span>
                </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', borderTop: '1px solid #333', paddingTop: '10px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#0a5', borderRadius: '50%' }} /> {t('yamazumi.digitalTwin.busy')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#ff9800', borderRadius: '50%' }} /> {t('yamazumi.digitalTwin.starved')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><div style={{ width: '10px', height: '10px', backgroundColor: '#c50f1f', borderRadius: '50%' }} /> {t('yamazumi.digitalTwin.blocked')}</div>
            </div>
        </div>
    );
};

export default DigitalTwinSimulator;
