import React, { useState, useEffect } from 'react';
import { getAllProjects } from '../utils/database';
import { exportStandardTimeToExcel } from '../utils/excelExport';

function StandardTime() {
    const [projects, setProjects] = useState([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [elementData, setElementData] = useState([]);
    const [globalAllowance, setGlobalAllowance] = useState(15); // Default 15%
    const [globalRating, setGlobalRating] = useState(100); // Default 100%

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        if (selectedProjectIds.length > 0) {
            calculateBaseData();
        } else {
            setElementData([]);
        }
    }, [selectedProjectIds, projects]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleProjectSelection = (id) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(projectId => projectId !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const calculateBaseData = () => {
        const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
        if (selectedProjects.length === 0) return;

        const elementGroups = {};

        selectedProjects.forEach(project => {
            if (project.measurements && project.measurements.length > 0) {
                project.measurements.forEach(m => {
                    if (!elementGroups[m.elementName]) {
                        elementGroups[m.elementName] = {
                            name: m.elementName,
                            category: m.category,
                            durations: [],
                            rating: globalRating // Initialize with global rating
                        };
                    }
                    elementGroups[m.elementName].durations.push(m.duration);
                });
            }
        });

        const data = Object.values(elementGroups).map(group => {
            const sum = group.durations.reduce((a, b) => a + b, 0);
            const avg = sum / group.durations.length;

            // Preserve existing rating if updating (to avoid reset on project change if possible, 
            // but here we re-calc on project change. Ideally we'd cache edits, but for now simple reset is okay 
            // or we could try to match by name from previous state)
            const existingItem = elementData.find(e => e.name === group.name);
            const rating = existingItem ? existingItem.rating : globalRating;

            return {
                name: group.name,
                category: group.category,
                avgTime: avg,
                rating: rating,
                count: group.durations.length
            };
        });

        setElementData(data);
    };

    const handleRatingChange = (name, value) => {
        setElementData(prev => prev.map(item =>
            item.name === name ? { ...item, rating: parseFloat(value) || 0 } : item
        ));
    };

    const applyGlobalRating = () => {
        setElementData(prev => prev.map(item => ({ ...item, rating: globalRating })));
    };

    // Calculations
    const calculateTotalStandardTime = () => {
        return elementData.reduce((total, item) => {
            const normalTime = item.avgTime * (item.rating / 100);
            const standardTime = normalTime * (1 + globalAllowance / 100);
            return total + standardTime;
        }, 0);
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Left Panel: Settings & Selection */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px', borderRight: '1px solid #444', paddingRight: '20px' }}>

                {/* Global Settings */}
                <div style={{ padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent-blue)', fontSize: '1rem' }}>⚙️ Parameter Global</h3>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.9rem' }}>Allowance / Kelonggaran (%)</label>
                        <input
                            type="number"
                            value={globalAllowance}
                            onChange={(e) => setGlobalAllowance(parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                        />
                    </div>

                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.9rem' }}>Default Rating (%)</label>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="number"
                                value={globalRating}
                                onChange={(e) => setGlobalRating(parseFloat(e.target.value) || 0)}
                                style={{ flex: 1, padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: '#fff', borderRadius: '4px' }}
                            />
                            <button
                                onClick={applyGlobalRating}
                                className="btn"
                                style={{ backgroundColor: '#444', fontSize: '0.8rem' }}
                                title="Apply to all elements"
                            >
                                Apply All
                            </button>
                        </div>
                    </div>
                </div>

                {/* Project Selection */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>📂 Pilih Project (Sumber Data)</h3>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {loading ? (
                            <div style={{ color: '#888' }}>Loading...</div>
                        ) : projects.length === 0 ? (
                            <div style={{ color: '#888' }}>Belum ada project tersimpan.</div>
                        ) : (
                            projects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => toggleProjectSelection(project.id)}
                                    style={{
                                        padding: '10px',
                                        backgroundColor: selectedProjectIds.includes(project.id) ? 'var(--accent-blue)' : '#333',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        border: '1px solid #555',
                                        transition: 'background-color 0.2s',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                                            {project.projectName}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                            {new Date(project.lastModified).toLocaleString()}
                                        </div>
                                    </div>
                                    {selectedProjectIds.includes(project.id) && <span style={{ color: '#fff' }}>✓</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Right Panel: Calculation Table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>⏱️ Perhitungan Waktu Baku (Standard Time)</h2>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {elementData.length > 0 && (
                            <>
                                <button
                                    className="btn"
                                    onClick={() => exportStandardTimeToExcel(elementData, globalAllowance)}
                                    style={{ backgroundColor: '#05a', padding: '8px 16px' }}
                                >
                                    📥 Export Excel
                                </button>
                                <div style={{ padding: '10px 20px', backgroundColor: 'var(--accent-blue)', borderRadius: '8px', fontWeight: 'bold', color: '#fff' }}>
                                    Total Standard Time: {calculateTotalStandardTime().toFixed(2)}s
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {selectedProjectIds.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '2px dashed #444', borderRadius: '8px' }}>
                        Pilih project di sebelah kiri untuk memulai perhitungan.
                    </div>
                ) : (
                    <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#ddd' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', textAlign: 'left', backgroundColor: '#252525' }}>
                                    <th style={{ padding: '12px' }}>Proses</th>
                                    <th style={{ padding: '12px' }}>Kategori</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Avg Time (s)</th>
                                    <th style={{ padding: '12px', textAlign: 'center', width: '120px' }}>Rating (%)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>Normal Time (s)</th>
                                    <th style={{ padding: '12px', textAlign: 'right' }}>+ Allow {globalAllowance}% (s)</th>
                                    <th style={{ padding: '12px', textAlign: 'right', color: '#4da6ff' }}>Std Time (s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {elementData.map((item, idx) => {
                                    const normalTime = item.avgTime * (item.rating / 100);
                                    const standardTime = normalTime * (1 + globalAllowance / 100);

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px' }}>{item.name}</td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{
                                                    color: item.category === 'Value-added' ? '#4da6ff' :
                                                        item.category === 'Non value-added' ? '#ffd700' : '#ff4d4d'
                                                }}>
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{item.avgTime.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'center' }}>
                                                <input
                                                    type="number"
                                                    value={item.rating}
                                                    onChange={(e) => handleRatingChange(item.name, e.target.value)}
                                                    style={{
                                                        width: '60px',
                                                        padding: '5px',
                                                        backgroundColor: '#333',
                                                        border: '1px solid #555',
                                                        color: '#fff',
                                                        borderRadius: '4px',
                                                        textAlign: 'center'
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>{normalTime.toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', color: '#aaa' }}>{(standardTime - normalTime).toFixed(2)}</td>
                                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#4da6ff', fontSize: '1rem' }}>
                                                {standardTime.toFixed(2)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StandardTime;
