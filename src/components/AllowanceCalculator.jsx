import React, { useState } from 'react';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';

function AllowanceCalculator() {
    const [normalTime, setNormalTime] = useState(0);
    const [allowances, setAllowances] = useState({
        personal: 5,
        basicFatigue: 4,
        variableFatigue: {
            standing: 0,
            abnormalPosition: 0,
            liftingWeight: 0,
            lightIntensity: 0,
            atmosphericConditions: 0,
            closeAttention: 0,
            noise: 0,
            mentalStrain: 0,
            monotony: 0,
            tediousness: 0
        },
        delay: 2,
        special: 0
    });

    // Variable fatigue allowance factors
    const variableFatigueOptions = {
        standing: [
            { value: 0, label: 'Sitting' },
            { value: 2, label: 'Standing' },
            { value: 4, label: 'Standing on hard surface' }
        ],
        abnormalPosition: [
            { value: 0, label: 'Normal' },
            { value: 2, label: 'Slightly awkward' },
            { value: 5, label: 'Awkward' },
            { value: 7, label: 'Very awkward' }
        ],
        liftingWeight: [
            { value: 0, label: 'None or negligible' },
            { value: 3, label: 'Up to 10 kg' },
            { value: 7, label: '10-20 kg' },
            { value: 13, label: '20-30 kg' },
            { value: 22, label: 'Over 30 kg' }
        ],
        lightIntensity: [
            { value: 0, label: 'Good' },
            { value: 2, label: 'Slightly below recommended' },
            { value: 5, label: 'Well below recommended' }
        ],
        atmosphericConditions: [
            { value: 0, label: 'Normal' },
            { value: 5, label: 'Good ventilation but hot/cold' },
            { value: 10, label: 'Poor ventilation' },
            { value: 15, label: 'Very hot/cold, poor ventilation' }
        ],
        closeAttention: [
            { value: 0, label: 'Fairly fine work' },
            { value: 2, label: 'Fine or exacting' },
            { value: 5, label: 'Very fine or very exacting' }
        ],
        noise: [
            { value: 0, label: 'Continuous low level' },
            { value: 2, label: 'Intermittent loud' },
            { value: 5, label: 'Continuous loud' },
            { value: 10, label: 'Very loud' }
        ],
        mentalStrain: [
            { value: 0, label: 'Fairly complex' },
            { value: 1, label: 'Complex or wide span' },
            { value: 4, label: 'Very complex' },
            { value: 8, label: 'Extremely complex' }
        ],
        monotony: [
            { value: 0, label: 'Low' },
            { value: 1, label: 'Medium' },
            { value: 4, label: 'High' }
        ],
        tediousness: [
            { value: 0, label: 'Rather tedious' },
            { value: 2, label: 'Tedious' },
            { value: 5, label: 'Very tedious' }
        ]
    };

    const handleVariableFatigueChange = (factor, value) => {
        setAllowances({
            ...allowances,
            variableFatigue: {
                ...allowances.variableFatigue,
                [factor]: parseFloat(value)
            }
        });
    };

    // Calculate total fatigue allowance
    const totalVariableFatigue = Object.values(allowances.variableFatigue).reduce((sum, val) => sum + val, 0);
    const totalFatigue = allowances.basicFatigue + totalVariableFatigue;

    // Calculate total allowance percentage
    const totalAllowancePercent = allowances.personal + totalFatigue + allowances.delay + allowances.special;

    // Calculate standard time
    const standardTime = normalTime * (1 + totalAllowancePercent / 100);

    return (
        <div style={{ padding: '20px', backgroundColor: '#1e1e1e', minHeight: '100vh', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: '0 0 5px 0', color: '#00a6ff' }}>Allowance Calculator</h2>
                    <p style={{ color: '#aaa', margin: 0, fontSize: '0.9rem' }}>
                        Calculate standard time with personal, fatigue, delay, and special allowances
                    </p>
                </div>
                <HelpButton
                    title={helpContent['allowance-calculator'].title}
                    content={helpContent['allowance-calculator'].content}
                />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {/* Input Panel */}
                <div>
                    {/* Normal Time Input */}
                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ marginTop: 0 }}>Normal Time</h3>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Normal Time (minutes)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                value={normalTime}
                                onChange={(e) => setNormalTime(parseFloat(e.target.value) || 0)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1a1a1a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    fontSize: '1rem'
                                }}
                            />
                        </div>
                    </div>

                    {/* Basic Allowances */}
                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ marginTop: 0 }}>Basic Allowances</h3>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Personal Allowance (%): {allowances.personal}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={allowances.personal}
                                onChange={(e) => setAllowances({ ...allowances, personal: parseFloat(e.target.value) })}
                                style={{ width: '100%', accentColor: '#005a9e' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#666', margin: '5px 0 0 0' }}>
                                Typical: 5-7% (rest breaks, personal needs)
                            </p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Basic Fatigue Allowance (%): {allowances.basicFatigue}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={allowances.basicFatigue}
                                onChange={(e) => setAllowances({ ...allowances, basicFatigue: parseFloat(e.target.value) })}
                                style={{ width: '100%', accentColor: '#005a9e' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#666', margin: '5px 0 0 0' }}>
                                Typical: 4% (basic physical/mental fatigue)
                            </p>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Delay Allowance (%): {allowances.delay}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                step="0.5"
                                value={allowances.delay}
                                onChange={(e) => setAllowances({ ...allowances, delay: parseFloat(e.target.value) })}
                                style={{ width: '100%', accentColor: '#005a9e' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#666', margin: '5px 0 0 0' }}>
                                Typical: 2-5% (unavoidable delays)
                            </p>
                        </div>

                        <div style={{ marginBottom: '0' }}>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa' }}>
                                Special Allowance (%): {allowances.special}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={allowances.special}
                                onChange={(e) => setAllowances({ ...allowances, special: parseFloat(e.target.value) })}
                                style={{ width: '100%', accentColor: '#005a9e' }}
                            />
                            <p style={{ fontSize: '0.75rem', color: '#666', margin: '5px 0 0 0' }}>
                                For special circumstances
                            </p>
                        </div>
                    </div>
                </div>

                {/* Variable Fatigue Allowances */}
                <div>
                    <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                        <h3 style={{ marginTop: 0 }}>Variable Fatigue Allowances</h3>
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {Object.entries(variableFatigueOptions).map(([factor, options]) => (
                                <div key={factor} style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.85rem', color: '#aaa', textTransform: 'capitalize' }}>
                                        {factor.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    <select
                                        value={allowances.variableFatigue[factor]}
                                        onChange={(e) => handleVariableFatigueChange(factor, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            backgroundColor: '#1a1a1a',
                                            color: '#fff',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {options.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label} ({opt.value}%)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div style={{ backgroundColor: '#2a2a2a', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
                <h3 style={{ marginTop: 0 }}>Results</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Normal Time</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>
                            {normalTime.toFixed(2)} min
                        </div>
                    </div>
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Total Fatigue</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                            {totalFatigue.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '3px' }}>
                            Basic: {allowances.basicFatigue}% + Variable: {totalVariableFatigue.toFixed(1)}%
                        </div>
                    </div>
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '4px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Total Allowance</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                            {totalAllowancePercent.toFixed(1)}%
                        </div>
                    </div>
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '4px', border: '2px solid #4ecdc4' }}>
                        <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '5px' }}>Standard Time</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ecdc4' }}>
                            {standardTime.toFixed(2)} min
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '3px' }}>
                            NT × (1 + {totalAllowancePercent.toFixed(1)}%)
                        </div>
                    </div>
                </div>

                {/* Formula */}
                <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '4px', borderLeft: '4px solid #4ecdc4' }}>
                    <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>Formula:</div>
                    <div style={{ fontSize: '1rem', fontFamily: 'monospace', color: '#fff' }}>
                        Standard Time = Normal Time × (1 + Total Allowance %)
                    </div>
                    <div style={{ fontSize: '1rem', fontFamily: 'monospace', color: '#4ecdc4', marginTop: '5px' }}>
                        ST = {normalTime.toFixed(2)} × (1 + {totalAllowancePercent.toFixed(1)}/100) = {standardTime.toFixed(2)} min
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AllowanceCalculator;
