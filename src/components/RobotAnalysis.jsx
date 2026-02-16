import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Cpu, Activity, Gauge, Route, Bot, Upload, Play, Pause, SkipBack, SkipForward, Scissors, XCircle } from 'lucide-react';
import { RobotKinematicsTracker } from '../utils/robotKinematics';
import ElementEditor from './ElementEditor';
import { useVideoPlayer } from '../hooks/useVideoPlayer';

const cardStyle = {
    background: 'rgba(22, 28, 45, 0.85)',
    border: '1px solid rgba(90, 120, 255, 0.25)',
    borderRadius: '14px',
    padding: '18px'
};

function RobotAnalysis({
    measurements = [],
    onUpdateMeasurements,
    videoSrc,
    onVideoChange,
    videoName,
    onVideoNameChange,
    onVideoFileChange
}) {
    const preview = useMemo(() => {
        const tracker = new RobotKinematicsTracker();

        tracker.update(
            {
                J1: { angle: 15 },
                J2: { angle: 35 },
                J3: { angle: 22 }
            },
            0
        );

        return tracker.update(
            {
                J1: { angle: 22 },
                J2: { angle: 40 },
                J3: { angle: 28 }
            },
            0.2
        );
    }, []);

    const joints = Object.entries(preview?.metrics || {});

    const robotSummary = useMemo(() => {
        const safeMeasurements = Array.isArray(measurements) ? measurements : [];
        const totalTime = safeMeasurements.reduce((sum, m) => sum + (Number(m.duration) || 0), 0);
        const valueAddedTime = safeMeasurements
            .filter((m) => m.category === 'Value-added')
            .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);

        const nonValueAddedTime = safeMeasurements
            .filter((m) => m.category === 'Non value-added')
            .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);

        const wasteTime = safeMeasurements
            .filter((m) => m.category === 'Waste')
            .reduce((sum, m) => sum + (Number(m.duration) || 0), 0);

        const waitingFromSplit = safeMeasurements.reduce((sum, m) => sum + (Number(m.waitingTime) || 0), 0);
        const walkFromSplit = safeMeasurements.reduce((sum, m) => sum + (Number(m.walkTime) || 0), 0);
        const autoFromSplit = safeMeasurements.reduce((sum, m) => sum + (Number(m.autoTime) || 0), 0);

        const idleTime = waitingFromSplit || wasteTime;

        // Air-cut = robot bergerak tapi tidak menambah nilai (pendekatan praktis dari data editor)
        const airCutTime = walkFromSplit + autoFromSplit + nonValueAddedTime;

        const productiveTime = Math.max(0, valueAddedTime);
        const denominator = productiveTime + airCutTime + idleTime;
        const pathEfficiency = denominator > 0 ? (productiveTime / denominator) * 100 : 0;

        const sorted = [...safeMeasurements]
            .filter((m) => Number.isFinite(m.startTime) && Number.isFinite(m.endTime))
            .sort((a, b) => a.startTime - b.startTime);

        // Heuristik overshoot: elemen sama berulang sangat cepat setelah titik berhenti
        let overshootSignals = 0;
        for (let i = 1; i < sorted.length; i += 1) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const gap = (curr.startTime || 0) - (prev.endTime || 0);
            const shortPrev = (prev.duration || 0) <= 0.35;
            const shortCurr = (curr.duration || 0) <= 0.35;
            const sameName = (prev.elementName || '').trim().toLowerCase() === (curr.elementName || '').trim().toLowerCase();
            if (sameName && gap >= 0 && gap <= 0.2 && shortPrev && shortCurr) {
                overshootSignals += 1;
            }
        }

        // Analisis per cycle
        const byCycle = safeMeasurements.reduce((acc, m) => {
            const c = Number(m.cycle) || 1;
            acc[c] = (acc[c] || 0) + (Number(m.duration) || 0);
            return acc;
        }, {});
        const cycleTimes = Object.values(byCycle);
        const avgCycleTime = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;
        const maxCycleTime = cycleTimes.length ? Math.max(...cycleTimes) : 0;
        const minCycleTime = cycleTimes.length ? Math.min(...cycleTimes) : 0;

        return {
            totalTime,
            productiveTime,
            airCutTime,
            idleTime,
            valueAddedTime,
            nonValueAddedTime,
            wasteTime,
            pathEfficiency,
            overshootSignals,
            avgCycleTime,
            maxCycleTime,
            minCycleTime,
            totalCycles: cycleTimes.length
        };
    }, [measurements]);

    const kinematicsSummary = useMemo(() => {
        const velocityValues = joints
            .map(([, metric]) => metric?.velocity?.angle)
            .filter((v) => Number.isFinite(v));

        const accelerationValues = joints
            .map(([, metric]) => metric?.acceleration?.angle)
            .filter((a) => Number.isFinite(a));

        const maxAbsVelocity = velocityValues.length ? Math.max(...velocityValues.map(Math.abs)) : 0;
        const maxAbsAcceleration = accelerationValues.length ? Math.max(...accelerationValues.map(Math.abs)) : 0;

        // Ambang konservatif untuk early warning jerk/agresif movement
        const jerkRisk = maxAbsAcceleration > 120;

        return {
            maxAbsVelocity,
            maxAbsAcceleration,
            jerkRisk
        };
    }, [joints]);

    const fileInputRef = useRef(null);
    const [leftPanelWidth, setLeftPanelWidth] = useState(36);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedElementId, setSelectedElementId] = useState(null);
    const [measurementStart, setMeasurementStart] = useState(null);
    const [newElementName, setNewElementName] = useState('Robot Move');

    const {
        videoRef,
        videoState,
        togglePlay,
        nextFrame,
        previousFrame,
        handleTimeUpdate,
        handleLoadedMetadata,
        addMeasurement,
        updateMeasurements
    } = useVideoPlayer(measurements);

    useEffect(() => {
        if (onUpdateMeasurements) {
            onUpdateMeasurements(videoState.measurements);
        }
    }, [videoState.measurements, onUpdateMeasurements]);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            const root = document.getElementById('robot-analysis-layout');
            if (!root) return;
            const rect = root.getBoundingClientRect();
            const next = ((e.clientX - rect.left) / rect.width) * 100;
            if (next >= 24 && next <= 70) {
                setLeftPanelWidth(next);
            }
        };

        const handleMouseUp = () => setIsResizing(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        onVideoChange?.(url);
        onVideoNameChange?.(file.name);
        onVideoFileChange?.(file);
    };

    const handleStartMeasurement = () => {
        setMeasurementStart(videoState.currentTime);
    };

    const handleEndMeasurement = () => {
        if (measurementStart === null) return;
        const endTime = Math.max(videoState.currentTime, measurementStart + 0.01);
        addMeasurement({
            startTime: measurementStart,
            endTime,
            duration: endTime - measurementStart,
            elementName: newElementName || 'Robot Move',
            category: 'Value-added',
            rating: 100,
            cycle: 1
        });
        setMeasurementStart(null);
    };

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds)) return '00:00.00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const activeTimeElement = videoState.measurements?.find(
        (m) => videoState.currentTime >= m.startTime && videoState.currentTime <= m.endTime
    );
    const effectiveSelectedId = activeTimeElement ? activeTimeElement.id : selectedElementId;

    return (
        <div style={{ height: '100%', overflow: 'hidden', background: '#060f2a', color: '#e8eeff', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'linear-gradient(135deg, #2b6dff, #7b4dff)'
                }}>
                    <Cpu size={24} />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.55rem' }}>Robot Movement & Kinematics</h2>
                    <p style={{ margin: '2px 0 0 0', color: '#9fb0d6' }}>Video player + element editor khusus analisis gerakan robot.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Route size={16} /> 1) Analisis Trajektori (Path Efficiency)</div>
                    <div style={{ color: '#9fb0d6', fontSize: '0.92rem', display: 'grid', gap: 4 }}>
                        <div>Path efficiency: <strong style={{ color: '#86efac' }}>{robotSummary.pathEfficiency.toFixed(1)}%</strong></div>
                        <div>Air-cut (movement non-value): <strong>{robotSummary.airCutTime.toFixed(2)}s</strong></div>
                        <div>Overshoot signal (heuristik): <strong>{robotSummary.overshootSignals}</strong></div>
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Activity size={16} /> 2) Analisis Siklus Waktu (Cycle Time)</div>
                    <div style={{ color: '#9fb0d6', fontSize: '0.92rem', display: 'grid', gap: 4 }}>
                        <div>Avg cycle: <strong>{robotSummary.avgCycleTime.toFixed(2)}s</strong> ({robotSummary.totalCycles} cycle)</div>
                        <div>Min/Max cycle: <strong>{robotSummary.minCycleTime.toFixed(2)}s / {robotSummary.maxCycleTime.toFixed(2)}s</strong></div>
                        <div>Idle time: <strong>{robotSummary.idleTime.toFixed(2)}s</strong></div>
                    </div>
                </div>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Gauge size={16} /> 3) Kinematika & Dinamika</div>
                    <div style={{ color: '#9fb0d6', fontSize: '0.92rem', display: 'grid', gap: 4 }}>
                        <div>Max |ω|: <strong>{kinematicsSummary.maxAbsVelocity.toFixed(2)} °/s</strong></div>
                        <div>Max |a|: <strong>{kinematicsSummary.maxAbsAcceleration.toFixed(2)} °/s²</strong></div>
                        <div>
                            Jerk risk: <strong style={{ color: kinematicsSummary.jerkRisk ? '#fca5a5' : '#86efac' }}>
                                {kinematicsSummary.jerkRisk ? 'High (cek tuning motion/PID)' : 'Normal'}
                            </strong>
                        </div>
                    </div>
                </div>
            </div>

            <div id="robot-analysis-layout" style={{ height: 'calc(100% - 230px)', display: 'flex', minHeight: 0 }}>
                <div style={{ width: `${leftPanelWidth}%`, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ ...cardStyle, padding: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                style={{ border: '1px solid rgba(90,120,255,0.35)', background: '#1b2a55', color: '#fff', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                <Upload size={16} /> Upload Video
                            </button>
                            <span style={{ color: '#9fb0d6', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {videoName || 'No video selected'}
                            </span>
                            <input ref={fileInputRef} type="file" accept="video/*" onChange={handleFileChange} style={{ display: 'none' }} />
                        </div>

                        <div style={{ background: '#000', borderRadius: 10, minHeight: 220, height: '44vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                            {videoSrc ? (
                                <>
                                    <video
                                        ref={videoRef}
                                        src={videoSrc}
                                        onTimeUpdate={handleTimeUpdate}
                                        onLoadedMetadata={handleLoadedMetadata}
                                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 10 }}
                                    />
                                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', padding: '6px 10px', borderRadius: 8, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}
                                    </div>
                                </>
                            ) : (
                                <div style={{ color: '#8da0cb', textAlign: 'center' }}>
                                    Upload video robot untuk mulai analisis.
                                </div>
                            )}
                        </div>

                        {videoSrc && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, alignItems: 'center' }}>
                                <button onClick={previousFrame} style={{ border: 'none', background: '#152444', color: '#d5e3ff', borderRadius: 8, padding: 8, cursor: 'pointer' }}><SkipBack size={16} /></button>
                                <button onClick={togglePlay} style={{ border: 'none', background: '#2b6dff', color: 'white', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {videoState.isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                    {videoState.isPlaying ? 'Pause' : 'Play'}
                                </button>
                                <button onClick={nextFrame} style={{ border: 'none', background: '#152444', color: '#d5e3ff', borderRadius: 8, padding: 8, cursor: 'pointer' }}><SkipForward size={16} /></button>

                                <input
                                    value={newElementName}
                                    onChange={(e) => setNewElementName(e.target.value)}
                                    placeholder="Nama element"
                                    style={{ background: '#0f1a35', color: '#fff', border: '1px solid rgba(120,150,255,0.3)', borderRadius: 8, padding: '8px 10px', minWidth: 150 }}
                                />
                                {measurementStart === null ? (
                                    <button onClick={handleStartMeasurement} style={{ border: 'none', background: '#159947', color: 'white', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Scissors size={15} /> Mark Start
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleEndMeasurement} style={{ border: 'none', background: '#2b6dff', color: 'white', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Scissors size={15} /> Mark End + Save
                                        </button>
                                        <button onClick={() => setMeasurementStart(null)} style={{ border: 'none', background: '#7a1f28', color: 'white', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <XCircle size={15} /> Cancel
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div
                    onMouseDown={() => setIsResizing(true)}
                    style={{ width: 10, margin: '0 8px', cursor: 'col-resize', background: '#131f3f', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Resize panel"
                >
                    <div style={{ width: 4, height: 24, borderRadius: 3, background: '#4b629e' }} />
                </div>

                <div style={{ flex: 1, minWidth: 0, ...cardStyle, padding: 8, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Bot size={16} /> Kinematics Preview (sample)</div>
                    <div style={{ overflowX: 'auto', marginBottom: 10 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ color: '#aebef0', textAlign: 'left' }}>
                                    <th style={{ padding: '8px 6px' }}>Joint</th>
                                    <th style={{ padding: '8px 6px' }}>Angle (°)</th>
                                    <th style={{ padding: '8px 6px' }}>Velocity (°/s)</th>
                                    <th style={{ padding: '8px 6px' }}>Acceleration (°/s²)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {joints.map(([joint, metric]) => {
                                    const angle = metric?.angle?.angle;
                                    const velocity = metric?.velocity?.angle;
                                    const acceleration = metric?.acceleration?.angle;
                                    return (
                                        <tr key={joint} style={{ borderTop: '1px solid rgba(159,176,214,0.18)' }}>
                                            <td style={{ padding: '8px 6px', fontWeight: 700 }}>{joint}</td>
                                            <td style={{ padding: '8px 6px' }}>{Number.isFinite(angle) ? angle.toFixed(2) : '-'}</td>
                                            <td style={{ padding: '8px 6px' }}>{Number.isFinite(velocity) ? velocity.toFixed(2) : '-'}</td>
                                            <td style={{ padding: '8px 6px' }}>{Number.isFinite(acceleration) ? acceleration.toFixed(2) : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ElementEditor
                            measurements={videoState.measurements}
                            videoName={(videoName || 'Robot Analysis').replace(/\.[^/.]+$/, '')}
                            onUpdateMeasurements={updateMeasurements}
                            videoState={videoState}
                            selectedId={effectiveSelectedId}
                            onSelect={setSelectedElementId}
                            currentCycle={1}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RobotAnalysis;