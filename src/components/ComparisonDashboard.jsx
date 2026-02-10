import React, { useState, useEffect } from 'react';
import { getAllProjects } from '../utils/database';
import { exportComparisonToExcel } from '../utils/excelExport';
import { useDialog } from '../contexts/DialogContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function ComparisonDashboard() {
    const { showAlert } = useDialog();
    const [projects, setProjects] = useState([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            // Sort by last modified (newest first)
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleProjectSelection = async (id) => {
        if (selectedProjectIds.includes(id)) {
            setSelectedProjectIds(prev => prev.filter(projectId => projectId !== id));
        } else {
            if (selectedProjectIds.length >= 5) {
                await showAlert('Info', 'Maksimal 5 proyek untuk perbandingan.');
                return;
            }
            setSelectedProjectIds(prev => [...prev, id]);
        }
    };

    const getSelectedProjectsData = () => {
        return projects.filter(p => selectedProjectIds.includes(p.id));
    };

    const calculateStats = (project) => {
        const measurements = project.measurements || [];
        const totalTime = measurements.reduce((sum, m) => sum + m.duration, 0);
        const valueAdded = measurements
            .filter(m => m.category === 'Value-added')
            .reduce((sum, m) => sum + m.duration, 0);
        const nonValueAdded = measurements
            .filter(m => m.category === 'Non value-added')
            .reduce((sum, m) => sum + m.duration, 0);
        const waste = measurements
            .filter(m => m.category === 'Waste')
            .reduce((sum, m) => sum + m.duration, 0);

        return {
            name: project.projectName || project.videoName || `Project ${project.id}`,
            date: new Date(project.lastModified).toLocaleDateString(),
            totalTime,
            valueAdded,
            nonValueAdded,
            waste,
            vaPercent: totalTime > 0 ? (valueAdded / totalTime) * 100 : 0
        };
    };

    const selectedData = getSelectedProjectsData().map(calculateStats);

    return (
        <div style={{ height: '100%', display: 'flex', gap: '20px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Left Panel: Project Selection */}
            <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '15px', borderRight: '1px solid #444', paddingRight: '20px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem' }}>📂 Pilih Proyek (Max 5)</h2>
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
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>
                                    {project.projectName || project.videoName || 'Untitled'}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#ccc' }}>
                                    {new Date(project.lastModified).toLocaleString()}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Right Panel: Comparison Charts */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📊 Perbandingan Siklus</h2>
                    {selectedData.length > 0 && (
                        <button
                            className="btn"
                            onClick={() => exportComparisonToExcel(selectedData)}
                            style={{ backgroundColor: '#05a', padding: '8px 16px' }}
                        >
                            📥 Export Excel
                        </button>
                    )}
                </div>

                {selectedProjectIds.length === 0 ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '2px dashed #444', borderRadius: '8px' }}>
                        Pilih proyek di sebelah kiri untuk melihat perbandingan.
                    </div>
                ) : (
                    <>
                        {/* Summary Table */}
                        <div style={{ backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>📋 Ringkasan Data</h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#ddd' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Proyek</th>
                                        <th style={{ padding: '8px' }}>Total Waktu</th>
                                        <th style={{ padding: '8px', color: '#4da6ff' }}>Value Added</th>
                                        <th style={{ padding: '8px', color: '#ffd700' }}>Non-VA</th>
                                        <th style={{ padding: '8px', color: '#ff4d4d' }}>Waste</th>
                                        <th style={{ padding: '8px' }}>VA %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedData.map((data, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '8px' }}>{data.name} <br /><span style={{ fontSize: '0.75rem', color: '#888' }}>{data.date}</span></td>
                                            <td style={{ padding: '8px' }}>{data.totalTime.toFixed(2)}s</td>
                                            <td style={{ padding: '8px' }}>{data.valueAdded.toFixed(2)}s</td>
                                            <td style={{ padding: '8px' }}>{data.nonValueAdded.toFixed(2)}s</td>
                                            <td style={{ padding: '8px' }}>{data.waste.toFixed(2)}s</td>
                                            <td style={{ padding: '8px' }}>{data.vaPercent.toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Comparison Chart */}
                        <div style={{ height: '400px', backgroundColor: '#1a1a1a', padding: '15px', borderRadius: '8px', border: '1px solid #333' }}>
                            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: '#fff' }}>📈 Grafik Perbandingan Kategori</h3>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={selectedData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                                    <XAxis dataKey="name" stroke="#888" fontSize={12} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                                    <YAxis stroke="#888" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="valueAdded" name="Value Added" stackId="a" fill="#0078d4" />
                                    <Bar dataKey="nonValueAdded" name="Non Value Added" stackId="a" fill="#ffaa00" />
                                    <Bar dataKey="waste" name="Waste" stackId="a" fill="#d13438" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ComparisonDashboard;
