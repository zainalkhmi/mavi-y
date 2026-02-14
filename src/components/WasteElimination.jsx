import React, { useState, useEffect } from 'react';
import { getAllProjects } from '../utils/database';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
    Trash2,
    BarChart3,
    Zap,
    CheckCircle,
    TrendingUp,
    FolderOpen,
    Clock,
    Calendar,
    Target,
    Activity,
    ClipboardList,
    Bot
} from 'lucide-react';
import AIChatOverlay from './features/AIChatOverlay';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';

function WasteElimination() {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analysisData, setAnalysisData] = useState(null);

    // AI Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);

    // AI Context
    const aiContext = {
        type: 'waste_elimination',
        data: {
            projectName: analysisData?.projectName,
            before: analysisData?.before,
            after: analysisData?.after,
            savings: analysisData?.savings,
            wasteElements: analysisData?.wasteElements
        }
    };

    useEffect(() => {
        loadProjects();
    }, []);

    // Sync with global currentProject from File Explorer
    useEffect(() => {
        if (currentProject && projects.length > 0 && !selectedProjectId) {
            const project = projects.find(p => p.projectName === currentProject.projectName);
            if (project) {
                setSelectedProjectId(project.id);
            }
        }
    }, [currentProject, projects]);

    useEffect(() => {
        if (selectedProjectId) {
            calculateWasteElimination();
        } else {
            setAnalysisData(null);
        }
    }, [selectedProjectId, projects]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            const validProjects = allProjects.filter(p => p.measurements && p.measurements.length > 0);
            validProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(validProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateWasteElimination = () => {
        const project = projects.find(p => p.id === selectedProjectId);
        if (!project || !project.measurements || project.measurements.length === 0) return;

        const measurements = project.measurements;

        const totalTime = measurements.reduce((sum, m) => sum + m.duration, 0);
        const vaTime = measurements.filter(m => m.category === 'Value-added').reduce((sum, m) => sum + m.duration, 0);
        const nvaTime = measurements.filter(m => m.category === 'Non value-added').reduce((sum, m) => sum + m.duration, 0);
        const wasteTime = measurements.filter(m => m.category === 'Waste').reduce((sum, m) => sum + m.duration, 0);

        const afterTime = totalTime - wasteTime;
        const vaPercent = totalTime > 0 ? (vaTime / totalTime) * 100 : 0;
        const vaPercentAfter = afterTime > 0 ? (vaTime / afterTime) * 100 : 0;

        const wasteElements = measurements.filter(m => m.category === 'Waste');

        const timeSaved = wasteTime;
        const percentSaved = totalTime > 0 ? (wasteTime / totalTime) * 100 : 0;
        const vaImprovement = vaPercentAfter - vaPercent;

        setAnalysisData({
            projectName: project.projectName,
            before: {
                total: totalTime,
                va: vaTime,
                nva: nvaTime,
                waste: wasteTime,
                vaPercent: vaPercent
            },
            after: {
                total: afterTime,
                va: vaTime,
                nva: nvaTime,
                waste: 0,
                vaPercent: vaPercentAfter
            },
            savings: {
                time: timeSaved,
                percent: percentSaved,
                vaImprovement: vaImprovement
            },
            wasteElements: wasteElements
        });
    };

    const chartData = analysisData ? [
        {
            name: 'Before',
            'Value Added': analysisData.before.va,
            'Non Value Added': analysisData.before.nva,
            'Waste': analysisData.before.waste
        },
        {
            name: 'After',
            'Value Added': analysisData.after.va,
            'Non Value Added': analysisData.after.nva,
            'Waste': 0
        }
    ] : [];

    const glassPanelStyles = {
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        padding: '20px'
    };

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            gap: '24px',
            padding: '24px',
            backgroundColor: '#0a0a0c',
            color: '#fff',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Left Panel: Project Selection */}
            <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <FolderOpen size={20} color="#3b82f6" />
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.3px' }}>
                        {t('bestWorst.selectProject')}
                    </h2>
                </div>

                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    paddingRight: '8px'
                }}>
                    {loading ? (
                        <div style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>{t('common.loading')}</div>
                    ) : projects.length === 0 ? (
                        <div style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center', marginTop: '20px' }}>{t('bestWorst.noProjects')}</div>
                    ) : (
                        projects.map(project => {
                            const isSelected = selectedProjectId === project.id;
                            return (
                                <div
                                    key={project.id}
                                    onClick={() => setSelectedProjectId(project.id)}
                                    style={{
                                        padding: '16px',
                                        backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        border: isSelected ? '1px solid #2563eb' : '1px solid rgba(255, 255, 255, 0.05)',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {isSelected && (
                                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: '#2563eb' }} />
                                    )}
                                    <div style={{ fontWeight: '700', color: isSelected ? '#fff' : '#e2e8f0', fontSize: '0.95rem', marginBottom: '8px' }}>
                                        {project.projectName}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: isSelected ? '#3b82f6' : '#94a3b8' }}>
                                            <Activity size={12} />
                                            {project.measurements?.length || 0} Elements
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                                            <Calendar size={12} />
                                            {new Date(project.lastModified).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel: Analysis Results */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Trash2 size={24} color="#ef4444" />
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px' }}>
                        Waste Elimination Simulation
                    </h2>
                </div>

                {!analysisData ? (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '2px dashed rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        color: '#475569'
                    }}>
                        <Target size={64} strokeWidth={1} style={{ opacity: 0.3 }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#94a3b8', marginBottom: '8px' }}>
                                Simulation Ready
                            </div>
                            <div style={{ fontSize: '0.9rem' }}>
                                Pilih project di sebelah kiri untuk melihat simulasi eliminasi waste.
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Efficiency Monitors */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                            <div style={{
                                ...glassPanelStyles,
                                borderLeft: '4px solid #ef4444',
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <Zap size={16} color="#ef4444" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' }}>Time Freed</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', marginBottom: '4px', letterSpacing: '-1px' }}>
                                    {analysisData.savings.time.toFixed(2)}<span style={{ fontSize: '1rem', color: '#64748b' }}>s</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                    ({analysisData.savings.percent.toFixed(1)}% optimization)
                                </div>
                            </div>

                            <div style={{
                                ...glassPanelStyles,
                                borderLeft: '4px solid #3b82f6',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <TrendingUp size={16} color="#3b82f6" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#3b82f6', textTransform: 'uppercase' }}>VA% Improvement</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', marginBottom: '4px', letterSpacing: '-1px' }}>
                                    +{analysisData.savings.vaImprovement.toFixed(1)}<span style={{ fontSize: '1rem', color: '#64748b' }}>%</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                    {analysisData.before.vaPercent.toFixed(1)}% → {analysisData.after.vaPercent.toFixed(1)}%
                                </div>
                            </div>

                            <div style={{
                                ...glassPanelStyles,
                                borderLeft: '4px solid #22c55e',
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                    <CheckCircle size={16} color="#22c55e" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#22c55e', textTransform: 'uppercase' }}>Target Cycle Time</span>
                                </div>
                                <div style={{ fontSize: '2rem', fontWeight: '900', color: '#fff', marginBottom: '4px', letterSpacing: '-1px' }}>
                                    {analysisData.after.total.toFixed(2)}<span style={{ fontSize: '1rem', color: '#64748b' }}>s</span>
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>
                                    from {analysisData.before.total.toFixed(2)}s
                                </div>
                            </div>
                        </div>

                        {/* Chart and Table Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                            {/* Comparison Chart */}
                            <div style={{ ...glassPanelStyles, height: '400px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
                                    <BarChart3 size={16} color="#94a3b8" />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Before vs After Comparison</h3>
                                </div>
                                <ResponsiveContainer width="100%" height="80%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                                        barSize={40}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                                        <XAxis
                                            dataKey="name"
                                            stroke="#64748b"
                                            fontSize={12}
                                            fontWeight={700}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis
                                            stroke="#64748b"
                                            fontSize={11}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={(value) => `${value}s`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                                            contentStyle={{
                                                backgroundColor: '#111114',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '8px',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                                            }}
                                        />
                                        <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                                        <Bar dataKey="Value Added" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Non Value Added" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="Waste" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Waste Elements Table */}
                            <div style={{ ...glassPanelStyles, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <ClipboardList size={16} color="#ef4444" />
                                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Waste to Eliminate</h3>
                                </div>
                                <div style={{ flex: 1, overflowY: 'auto' }}>
                                    {analysisData.wasteElements.length === 0 ? (
                                        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '40px', textAlign: 'center' }}>
                                            <CheckCircle size={48} color="#22c55e" strokeWidth={1.5} />
                                            <div style={{ color: '#22c55e', fontWeight: '700', fontSize: '0.9rem' }}>Zero Waste Detected</div>
                                            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>This process is already highly optimized.</div>
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                            <thead>
                                                <tr style={{ position: 'sticky', top: 0, backgroundColor: '#111114', zIndex: 10 }}>
                                                    <th style={{ padding: '12px 20px', textAlign: 'left', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem' }}>Element Name</th>
                                                    <th style={{ padding: '12px 20px', textAlign: 'right', color: '#ef4444', fontWeight: '800', textTransform: 'uppercase', fontSize: '0.7rem' }}>Reduction</th>
                                                </tr>
                                            </thead>
                                            <tbody style={{ color: '#cbd5e1' }}>
                                                {analysisData.wasteElements.map((element, idx) => (
                                                    <tr key={idx} style={{
                                                        borderBottom: '1px solid rgba(255, 255, 255, 0.02)',
                                                        backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.01)' : 'transparent'
                                                    }}>
                                                        <td style={{ padding: '14px 20px' }}>
                                                            <div style={{ fontWeight: '700', color: '#f1f5f9' }}>{element.elementName}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: '800', marginTop: '2px' }}>WASTE ELEMENT</div>
                                                        </td>
                                                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                                                            <div style={{ fontWeight: '900', color: '#ef4444' }}>
                                                                -{element.duration.toFixed(2)}s
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                                at {element.startTime.toFixed(2)}s
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* AI Toggle Button (Floating) */}
            <button
                onClick={() => setShowChat(!showChat)}
                style={{
                    position: 'absolute',
                    bottom: '30px',
                    right: '30px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(118, 75, 162, 0.5)',
                    zIndex: 100
                }}
                title="MAVi Waste Analyst"
            >
                <Bot size={32} />
            </button>

            {/* AI CHAT OVERLAY */}
            <AIChatOverlay
                visible={showChat}
                onClose={() => setShowChat(false)}
                context={aiContext}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                title="MAVi Waste Elimination Expert"
            />
        </div>
    );
}

export default WasteElimination;
