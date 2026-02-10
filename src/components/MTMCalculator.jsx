import React, { useState } from 'react';
import {
    REACH_TABLE,
    MOVE_TABLE,
    GRASP_TABLE,
    POSITION_TABLE,
    RELEASE_TABLE,
    TURN_TABLE,
    APPLY_PRESSURE_TABLE,
    getReachTMU,
    getMoveTMU,
    tmuToSeconds,
    tmuToMinutes
} from '../utils/mtmTables';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';

function MTMCalculator() {
    const [motions, setMotions] = useState([]);
    const [currentMotion, setCurrentMotion] = useState({
        type: 'reach',
        caseType: 'A',
        distance: 10,
        code: ''
    });

    const addMotion = () => {
        let tmu = 0;
        let description = '';

        switch (currentMotion.type) {
            case 'reach':
                tmu = getReachTMU(currentMotion.caseType, currentMotion.distance);
                description = `R${currentMotion.distance}${currentMotion.caseType}`;
                break;
            case 'move':
                tmu = getMoveTMU(currentMotion.caseType, currentMotion.distance);
                description = `M${currentMotion.distance}${currentMotion.caseType}`;
                break;
            case 'grasp':
                tmu = GRASP_TABLE[currentMotion.code]?.tmu || 0;
                description = currentMotion.code;
                break;
            case 'position':
                tmu = POSITION_TABLE[currentMotion.code]?.tmu || 0;
                description = currentMotion.code;
                break;
            case 'release':
                tmu = RELEASE_TABLE[currentMotion.code]?.tmu || 0;
                description = currentMotion.code;
                break;
            case 'turn':
                tmu = TURN_TABLE[currentMotion.code]?.tmu || 0;
                description = currentMotion.code;
                break;
            case 'applyPressure':
                tmu = APPLY_PRESSURE_TABLE[currentMotion.code]?.tmu || 0;
                description = currentMotion.code;
                break;
            default:
                break;
        }

        const newMotion = {
            id: Date.now(),
            type: currentMotion.type,
            description,
            tmu,
            seconds: tmuToSeconds(tmu)
        };

        setMotions([...motions, newMotion]);
    };

    const removeMotion = (id) => {
        setMotions(motions.filter(m => m.id !== id));
    };

    const clearAll = () => {
        setMotions([]);
    };

    const totalTMU = motions.reduce((sum, m) => sum + m.tmu, 0);
    const totalSeconds = tmuToSeconds(totalTMU);
    const totalMinutes = tmuToMinutes(totalTMU);

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#00a6ff' }}>MTM-1 Calculator</h2>
                    <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>
                        Methods-Time Measurement (MTM) - Predetermined time system for work measurement
                    </p>
                </div>
                <HelpButton
                    title={helpContent['mtm-calculator'].title}
                    content={helpContent['mtm-calculator'].content}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Input Panel */}
                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
                    <h3 style={{ marginTop: 0 }}>Add Motion</h3>

                    {/* Motion Type */}
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                            Motion Type
                        </label>
                        <select
                            value={currentMotion.type}
                            onChange={(e) => setCurrentMotion({ ...currentMotion, type: e.target.value, caseType: 'A', code: '' })}
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: '#1a1a1a',
                                color: '#fff',
                                border: '1px solid #444',
                                borderRadius: '4px'
                            }}
                        >
                            <option value="reach">Reach (R)</option>
                            <option value="move">Move (M)</option>
                            <option value="grasp">Grasp (G)</option>
                            <option value="position">Position (P)</option>
                            <option value="release">Release (RL)</option>
                            <option value="turn">Turn (T)</option>
                            <option value="applyPressure">Apply Pressure (AP)</option>
                        </select>
                    </div>

                    {/* Reach/Move specific inputs */}
                    {(currentMotion.type === 'reach' || currentMotion.type === 'move') && (
                        <>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                    Case Type
                                </label>
                                <select
                                    value={currentMotion.caseType}
                                    onChange={(e) => setCurrentMotion({ ...currentMotion, caseType: e.target.value })}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#1a1a1a',
                                        color: '#fff',
                                        border: '1px solid #444',
                                        borderRadius: '4px'
                                    }}
                                >
                                    {currentMotion.type === 'reach' ? (
                                        <>
                                            <option value="A">A - Fixed location</option>
                                            <option value="B">B - Variable location</option>
                                            <option value="C">C - Jumbled objects</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="A">A - To other hand/stop</option>
                                            <option value="B">B - Approximate location</option>
                                            <option value="C">C - Exact location</option>
                                        </>
                                    )}
                                </select>
                            </div>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                    Distance (cm): {currentMotion.distance}
                                </label>
                                <input
                                    type="range"
                                    min="2"
                                    max="30"
                                    step="2"
                                    value={currentMotion.distance}
                                    onChange={(e) => setCurrentMotion({ ...currentMotion, distance: parseInt(e.target.value) })}
                                    style={{ width: '100%', accentColor: '#005a9e' }}
                                />
                            </div>
                        </>
                    )}

                    {/* Grasp specific */}
                    {currentMotion.type === 'grasp' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Grasp Type
                            </label>
                            <select
                                value={currentMotion.code}
                                onChange={(e) => setCurrentMotion({ ...currentMotion, code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="">Select...</option>
                                {Object.entries(GRASP_TABLE).map(([code, data]) => (
                                    <option key={code} value={code}>{code} - {data.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Position specific */}
                    {currentMotion.type === 'position' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Position Type
                            </label>
                            <select
                                value={currentMotion.code}
                                onChange={(e) => setCurrentMotion({ ...currentMotion, code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="">Select...</option>
                                {Object.entries(POSITION_TABLE).map(([code, data]) => (
                                    <option key={code} value={code}>{code} - {data.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Release specific */}
                    {currentMotion.type === 'release' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Release Type
                            </label>
                            <select
                                value={currentMotion.code}
                                onChange={(e) => setCurrentMotion({ ...currentMotion, code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="">Select...</option>
                                {Object.entries(RELEASE_TABLE).map(([code, data]) => (
                                    <option key={code} value={code}>{code} - {data.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Turn specific */}
                    {currentMotion.type === 'turn' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Turn Type
                            </label>
                            <select
                                value={currentMotion.code}
                                onChange={(e) => setCurrentMotion({ ...currentMotion, code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="">Select...</option>
                                {Object.entries(TURN_TABLE).map(([code, data]) => (
                                    <option key={code} value={code}>{code} - {data.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Apply Pressure specific */}
                    {currentMotion.type === 'applyPressure' && (
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Pressure Type
                            </label>
                            <select
                                value={currentMotion.code}
                                onChange={(e) => setCurrentMotion({ ...currentMotion, code: e.target.value })}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            >
                                <option value="">Select...</option>
                                {Object.entries(APPLY_PRESSURE_TABLE).map(([code, data]) => (
                                    <option key={code} value={code}>{code} - {data.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button
                        onClick={addMotion}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#005a9e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Add Motion
                    </button>
                </div>

                {/* Results Panel */}
                <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0 }}>Motion Sequence</h3>
                        {motions.length > 0 && (
                            <button
                                onClick={clearAll}
                                style={{
                                    padding: '5px 10px',
                                    backgroundColor: '#444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem'
                                }}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {/* Motion List */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px' }}>
                        {motions.length === 0 ? (
                            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                                No motions added yet
                            </p>
                        ) : (
                            motions.map((motion, index) => (
                                <div
                                    key={motion.id}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '10px',
                                        backgroundColor: '#1a1a1a',
                                        marginBottom: '5px',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <div style={{ flex: 1 }}>
                                        <span style={{ color: '#888', fontSize: '0.75rem', marginRight: '10px' }}>
                                            {index + 1}.
                                        </span>
                                        <span style={{ fontWeight: 'bold', marginRight: '10px' }}>
                                            {motion.description}
                                        </span>
                                        <span style={{ color: '#aaa', fontSize: '0.85rem' }}>
                                            {motion.tmu} TMU ({motion.seconds.toFixed(3)}s)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => removeMotion(motion.id)}
                                        style={{
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: '#ff6b6b',
                                            cursor: 'pointer',
                                            fontSize: '1rem'
                                        }}
                                    >
                                        ✗
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Total */}
                    <div style={{ borderTop: '1px solid #444', paddingTop: '15px' }}>
                        <h4 style={{ margin: '0 0 10px 0' }}>Total Time</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>TMU</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                                    {totalTMU.toFixed(1)}
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Seconds</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                                    {totalSeconds.toFixed(3)}
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#1a1a1a', padding: '10px', borderRadius: '4px', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Minutes</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                                    {totalMinutes.toFixed(4)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reference Info */}
            <div style={{ marginTop: '20px', backgroundColor: '#2a2a2a', padding: '15px', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0 }}>MTM Reference</h4>
                <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '5px 0' }}>
                    <strong>TMU (Time Measurement Unit):</strong> 1 TMU = 0.036 seconds = 0.0006 minutes
                </p>
                <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '5px 0' }}>
                    <strong>Motion Elements:</strong> R (Reach), M (Move), G (Grasp), P (Position), RL (Release), T (Turn), AP (Apply Pressure)
                </p>
            </div>
        </div>
    );
}

export default MTMCalculator;
