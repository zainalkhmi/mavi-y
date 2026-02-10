import React, { useState, useEffect } from 'react';
import { getAllProjects } from '../utils/database';
import { exportAggregationToExcel } from '../utils/excelExport';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function CycleAggregation() {
    // State
    const [projects, setProjects] = useState([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aggregatedData, setAggregatedData] = useState([]);
    const [exportProgress, setExportProgress] = useState(0);

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    // Re‑calculate aggregation when selection changes
    useEffect(() => {
        if (selectedProjectIds.length > 0) {
            calculateAggregation();
        } else {
            setAggregatedData([]);
        }
    }, [selectedProjectIds, projects]);

    // Fetch all projects from DB
    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            // Sort newest first based on lastModified
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    // Toggle project selection
    const toggleProjectSelection = (id) => {
        setSelectedProjectIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(projectId => projectId !== id);
            }
            return [...prev, id];
        });
    };

    // Aggregate measurements across selected projects
    const calculateAggregation = () => {
        const selectedProjects = projects.filter(p => selectedProjectIds.includes(p.id));
        if (selectedProjects.length === 0) return;

        const elementGroups = {};
        selectedProjects.forEach(project => {
            const measurements = project.measurements || [];
            measurements.forEach(m => {
                if (!elementGroups[m.elementName]) {
                    elementGroups[m.elementName] = {
                        name: m.elementName,
                        category: m.category,
                        durations: []
                    };
                }
                elementGroups[m.elementName].durations.push(m.duration);
            });
        });

        const stats = Object.values(elementGroups).map(group => {
            const count = group.durations.length;
            const sum = group.durations.reduce((a, b) => a + b, 0);
            const min = Math.min(...group.durations);
            const max = Math.max(...group.durations);
            const avg = sum / count;
            const squareDiffs = group.durations.map(v => Math.pow(v - avg, 2));
            const stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / count);
            return {
                name: group.name,
                category: group.category,
                count,
                min,
                max,
                avg,
                stdDev,
                total: sum
            };
        });
        setAggregatedData(stats);
    };

    return (
        <div style={{ height: '100%', display: 'flex', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Left panel – project selection */}
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
                <div style={{ padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '6px', fontSize: '0.9rem', color: '#ccc' }}>
                    <p style={{ margin: 0 }}>Pilih beberapa proyek untuk melihat rata-rata waktu per elemen.</p>
                </div>
            </div>

            {/* Right panel – aggregation results */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Agregasi Waktu Proyek</h2>
                    {aggregatedData.length > 0 && (
                        <button
                            className="btn"
                            onClick={() => {
                                setExportProgress(1);
                                exportAggregationToExcel(aggregatedData, (progress) => {
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
                        Pilih proyek di sebelah kiri untuk melihat hasil agregasi.
                    </div>
                ) : (
                    <>
                        {/* Summary table */}
                        <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: '#fff' }}>📋 Tabel Agregasi ({selectedProjectIds.length} Proyek Dipilih)</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#ddd' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #444', textAlign: 'left', backgroundColor: '#252525' }}>
                                            <th style={{ padding: '10px' }}>Proses</th>
                                            <th style={{ padding: '10px' }}>Kategori</th>
                                            <th style={{ padding: '10px', textAlign: 'center' }}>Count</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Min (s)</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Max (s)</th>
                                            <th style={{ padding: '10px', textAlign: 'right', color: '#4da6ff' }}>Avg (s)</th>
                                            <th style={{ padding: '10px', textAlign: 'right' }}>Std Dev</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aggregatedData.map((data, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                                <td style={{ padding: '10px' }}>{data.name}</td>
                                                <td style={{ padding: '10px' }}>
                                                    <span style={{
                                                        color: data.category === 'Value-added' ? '#4da6ff' :
                                                            data.category === 'Non value-added' ? '#ffd700' : '#ff4d4d'
                                                    }}>
                                                        {data.category}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px', textAlign: 'center' }}>{data.count}</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{data.min.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right' }}>{data.max.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#4da6ff' }}>{data.avg.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#888' }}>{data.stdDev.toFixed(3)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Chart */}
                        <div style={{ height: '400px', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>📈 Grafik Variasi Waktu (Min - Avg - Max)</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={aggregatedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickFormatter={val => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                                    <YAxis stroke="#888" />
                                    <Tooltip contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                                    <Legend />
                                    <Bar dataKey="min" name="Min Time" fill="#0078d4" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="avg" name="Avg Time" fill="#00b7c3" radius={[0, 0, 0, 0]} />
                                    <Bar dataKey="max" name="Max Time" fill="#ffaa00" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default CycleAggregation;
