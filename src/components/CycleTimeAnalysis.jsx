import React, { useState, useEffect } from 'react';
import { getAllProjects } from '../utils/database';
import { exportCycleTimeAnalysisToExcel } from '../utils/excelExport';

function CycleTimeAnalysis() {
    const [projects, setProjects] = useState([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aggregatedData, setAggregatedData] = useState([]);
    const [exportProgress, setExportProgress] = useState(0);

    const [maxCycles, setMaxCycles] = useState(0);

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        aggregateData();
    }, [selectedProjectIds, projects]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            // Sort by last modified (newest first)
            if (Array.isArray(allProjects)) {
                allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                setProjects(allProjects);
            } else {
                setProjects([]);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            setProjects([]);
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

    const aggregateData = () => {
        if (selectedProjectIds.length === 0) {
            setAggregatedData([]);
            setMaxCycles(0);
            return;
        }

        const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
        const elementMap = new Map();
        let maxCycleNum = 0;

        selectedProjects.forEach(project => {
            const measurements = project.measurements || [];
            measurements.forEach(m => {
                const key = m.elementName; // Group by element name
                if (!elementMap.has(key)) {
                    elementMap.set(key, {
                        elementName: m.elementName,
                        category: m.category,
                        durations: [],
                        cycleValues: {} // Store duration by cycle number
                    });
                }
                const entry = elementMap.get(key);
                entry.durations.push(m.duration);

                // Track cycle values
                // Assuming m.cycle is 1-based index. If not present, default to 1.
                const cycleNum = m.cycle || 1;
                entry.cycleValues[cycleNum] = m.duration;

                if (cycleNum > maxCycleNum) {
                    maxCycleNum = cycleNum;
                }
            });
        });

        setMaxCycles(maxCycleNum);

        const result = Array.from(elementMap.values()).map(entry => {
            const count = entry.durations.length;
            const sum = entry.durations.reduce((a, b) => a + b, 0);
            const min = Math.min(...entry.durations);
            const max = Math.max(...entry.durations);
            const avg = count > 0 ? sum / count : 0;

            return {
                elementName: entry.elementName,
                category: entry.category,
                cycleValues: entry.cycleValues,
                min: min,
                max: max,
                average: avg
            };
        });

        setAggregatedData(result);
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#005a9e';
            case 'Non value-added': return '#bfa900';
            case 'Waste': return '#c50f1f';
            default: return 'transparent';
        }
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Left Panel: Project Selection */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '15px', borderRight: '1px solid #444', paddingRight: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>📂 Pilih Proyek</h2>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {loading ? (
                        <div style={{ color: '#888' }}>Loading...</div>
                    ) : projects.length === 0 ? (
                        <div style={{ color: '#888' }}>Belum ada proyek tersimpan.</div>
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
                                        {project.projectName || project.videoName || 'Untitled'}
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

            {/* Right Panel: Aggregation Table */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📈 Cycle Time Analysis</h2>
                    {aggregatedData.length > 0 && (
                        <button
                            className="btn"
                            onClick={() => {
                                setExportProgress(1);
                                exportCycleTimeAnalysisToExcel(aggregatedData, maxCycles, (progress) => {
                                    setExportProgress(progress);
                                    if (progress === 100 || progress === -1) {
                                        setTimeout(() => setExportProgress(0), 3000);
                                    }
                                });
                            }}
                            style={{ backgroundColor: '#05a', padding: '8px 16px', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            📥 Export Excel
                        </button>
                    )}
                </div>

                {exportProgress !== 0 && (
                    <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px', border: `1px solid ${exportProgress === -1 ? '#f00' : '#444'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem', color: '#fff' }}>
                            <span>{exportProgress === -1 ? '❌ Export Gagal' : exportProgress === 100 ? '✅ Export Selesai!' : '🔄 Sedang mengekspor...'}</span>
                            {exportProgress > 0 && <span>{exportProgress}%</span>}
                        </div>
                        {exportProgress > 0 && (
                            <div style={{ width: '100%', height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${exportProgress}%`, height: '100%', backgroundColor: exportProgress === 100 ? '#4caf50' : '#0078d4', transition: 'width 0.3s' }} />
                            </div>
                        )}
                    </div>
                )}

                {selectedProjectIds.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '2px dashed #444', borderRadius: '8px' }}>
                        Pilih proyek di sebelah kiri untuk melihat analisis.
                    </div>
                ) : (
                    <div style={{ backgroundColor: '#1a1a1a', borderRadius: '8px', border: '1px solid #333', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#ddd' }}>
                            <thead style={{ backgroundColor: '#333' }}>
                                <tr>
                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Element Name</th>
                                    <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #555' }}>Category</th>
                                    {/* Dynamic Cycle Columns */}
                                    {Array.from({ length: maxCycles }, (_, i) => i + 1).map(cycleNum => (
                                        <th key={cycleNum} style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #555' }}>
                                            Cycle {cycleNum}
                                        </th>
                                    ))}
                                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #555' }}>Min (s)</th>
                                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #555' }}>Max (s)</th>
                                    <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #555' }}>Average (s)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aggregatedData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #333', backgroundColor: idx % 2 === 0 ? '#1a1a1a' : '#222' }}>
                                        <td style={{ padding: '10px' }}>{row.elementName}</td>
                                        <td style={{ padding: '10px' }}>
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                backgroundColor: getCategoryColor(row.category),
                                                fontSize: '0.8rem',
                                                color: 'white'
                                            }}>
                                                {row.category}
                                            </span>
                                        </td>
                                        {/* Dynamic Cycle Values */}
                                        {Array.from({ length: maxCycles }, (_, i) => i + 1).map(cycleNum => (
                                            <td key={cycleNum} style={{ padding: '10px', textAlign: 'center' }}>
                                                {row.cycleValues[cycleNum] ? row.cycleValues[cycleNum].toFixed(2) : '-'}
                                            </td>
                                        ))}
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#4da6ff' }}>{row.min.toFixed(2)}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#ff4d4d' }}>{row.max.toFixed(2)}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#ffd700', fontWeight: 'bold' }}>{row.average.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default CycleTimeAnalysis;
