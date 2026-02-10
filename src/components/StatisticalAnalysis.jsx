import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import {
    calculateSummaryStats,
    calculateConfidenceInterval,
    calculateProcessCapability,
    calculateControlLimits,
    createHistogramBins,
    detectOutliers
} from '../utils/statistics';
import { generatePDFReport, savePDFReport } from '../utils/pdfExport';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';
import { useProject } from '../contexts/ProjectContext';
import { getAllProjects } from '../utils/database';
import {
    TrendingUp,
    Target,
    Activity,
    FileText,
    AlertCircle,
    Info,
    ChevronDown,
    LayoutDashboard,
    ArrowRight,
    Search,
    Clock,
    Check,
    Minimize2,
    Maximize2,
    Database
} from 'lucide-react';

function StatisticalAnalysis({ measurements: initialMeasurements = [] }) {
    const { currentProject: contextProject } = useProject();
    const [allProjects, setAllProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [measurements, setMeasurements] = useState(initialMeasurements);
    const [searchTerm, setSearchTerm] = useState('');

    const [confidenceLevel, setConfidenceLevel] = useState(0.95);
    const [specLimits, setSpecLimits] = useState({ lsl: 0, usl: 10 });
    const [showOutliers, setShowOutliers] = useState(true);

    const loadProjects = async () => {
        try {
            const projects = await getAllProjects();
            projects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setAllProjects(projects);

            // Set initial project if none selected
            if (!selectedProject && contextProject) {
                const found = projects.find(p => p.projectName === contextProject.projectName);
                if (found) {
                    setSelectedProject(found);
                    setMeasurements(found.measurements || []);
                }
            } else if (!selectedProject && projects.length > 0) {
                setSelectedProject(projects[0]);
                setMeasurements(projects[0].measurements || []);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    const handleProjectSelect = (project) => {
        setSelectedProject(project);
        setMeasurements(project.measurements || []);
    };

    // Extract durations for analysis
    const durations = useMemo(() => {
        return measurements.map(m => m.duration).filter(d => d > 0);
    }, [measurements]);

    // Calculate statistics
    const stats = useMemo(() => {
        if (durations.length === 0) return null;
        return calculateSummaryStats(durations);
    }, [durations]);

    const ci = useMemo(() => {
        if (durations.length === 0) return null;
        return calculateConfidenceInterval(durations, confidenceLevel);
    }, [durations, confidenceLevel]);

    const processCapability = useMemo(() => {
        if (durations.length === 0) return null;
        return calculateProcessCapability(durations, specLimits.lsl, specLimits.usl);
    }, [durations, specLimits]);

    const controlLimits = useMemo(() => {
        if (durations.length === 0) return null;
        return calculateControlLimits(durations);
    }, [durations]);

    const histogramData = useMemo(() => {
        if (durations.length === 0) return [];
        const bins = createHistogramBins(durations, 10);
        return bins.map(bin => ({
            range: `${bin.start.toFixed(2)}-${bin.end.toFixed(2)}`,
            count: bin.count,
            frequency: (bin.frequency * 100).toFixed(1)
        }));
    }, [durations]);

    const outlierInfo = useMemo(() => {
        if (durations.length === 0) return null;
        return detectOutliers(durations);
    }, [durations]);

    const controlChartData = useMemo(() => {
        return measurements.map((m, index) => ({
            index: index + 1,
            duration: m.duration,
            elementName: m.elementName
        }));
    }, [measurements]);

    const handleExportPDF = async () => {
        const projectName = selectedProject?.projectName || 'Statistical Analysis';
        const doc = await generatePDFReport(
            { projectName },
            {
                projectName: `Motion Study - ${projectName}`,
                measurements,
                statistics: {
                    ...stats,
                    ci95: ci,
                    processCapability,
                    controlLimits
                },
                includeCharts: false,
                includeTables: true,
                includeStatistics: true
            }
        );
        savePDFReport(doc, `${projectName.replace(/\s+/g, '-').toLowerCase()}-statistical-report.pdf`);
    };

    const filteredProjects = allProjects.filter(p =>
        (p.projectName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            gap: '20px',
            backgroundColor: 'transparent',
            color: 'var(--text-primary)',
            overflow: 'hidden'
        }} className="animate-fade-in">
            {/* Sidebar Project Selection */}
            <div className="glass-card" style={{
                width: '300px',
                borderRadius: '16px',
                display: 'flex',
                flexDirection: 'column',
                padding: '20px',
                flexShrink: 0,
                border: '1px solid var(--border-color)',
                background: 'rgba(255, 255, 255, 0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
                    <Database size={20} color="var(--accent-blue)" />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>Select Project</h3>
                </div>

                <div style={{ position: 'relative', marginBottom: '20px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px',
                            background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)',
                            borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.85rem'
                        }}
                    />
                </div>

                <div className="pro-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                    {filteredProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => handleProjectSelect(project)}
                            style={{
                                padding: '12px', cursor: 'pointer', display: 'flex',
                                alignItems: 'center', gap: '12px', borderRadius: '12px',
                                marginBottom: '6px', transition: 'all 0.2s',
                                background: selectedProject?.projectName === project.projectName
                                    ? 'rgba(59, 130, 246, 0.15)'
                                    : 'transparent',
                                border: '1px solid',
                                borderColor: selectedProject?.projectName === project.projectName
                                    ? 'rgba(59, 130, 246, 0.3)'
                                    : 'transparent'
                            }}
                        >
                            <div style={{
                                width: '10px', height: '10px', borderRadius: '50%',
                                backgroundColor: selectedProject?.projectName === project.projectName ? '#3b82f6' : 'rgba(255,255,255,0.1)',
                                boxShadow: selectedProject?.projectName === project.projectName ? '0 0 8px #3b82f6' : 'none'
                            }} />
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                    color: selectedProject?.projectName === project.projectName ? '#fff' : 'rgba(255,255,255,0.7)',
                                    fontSize: '0.85rem',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>{project.projectName}</div>
                                <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem', marginTop: '2px' }}>
                                    {project.measurements?.length || 0} measurements
                                </div>
                            </div>
                        </div>
                    ))}
                    {filteredProjects.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem' }}>
                            No projects found
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px' }} className="pro-scrollbar">
                {!selectedProject || durations.length === 0 ? (
                    <div className="glass-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px', padding: '40px' }}>
                        <div style={{
                            width: '120px', height: '120px', borderRadius: '35px',
                            background: 'rgba(255,165,0,0.03)', border: '1px solid rgba(255,165,0,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255,165,0,0.2)'
                        }}>
                            <LayoutDashboard size={56} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#fff' }}>No statistical data available</h3>
                            <p style={{ margin: '10px 0 0 0', fontSize: '1rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px' }}>
                                {selectedProject
                                    ? `Project "${selectedProject.projectName}" doesn't have any measurements yet.`
                                    : "Please select a project from the sidebar to view its detailed statistical analysis."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div style={{ padding: '0 0 20px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <TrendingUp size={28} /> Statistical Analysis
                                </h2>
                                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Analysis for <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{selectedProject.projectName}</span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <HelpButton
                                    title={helpContent['statistical-analysis'].title}
                                    content={helpContent['statistical-analysis'].content}
                                />
                                <button
                                    onClick={handleExportPDF}
                                    className="btn"
                                    style={{ backgroundColor: 'var(--accent-blue)', color: 'white' }}
                                >
                                    <FileText size={18} /> Export PDF Report
                                </button>
                            </div>
                        </div>

                        {/* Summary Statistics */}
                        {stats && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                                <StatCard icon={<Info size={16} />} title="Observation Count" value={stats.count} />
                                <StatCard icon={<TrendingUp size={16} />} title="Mean Duration" value={`${stats.mean.toFixed(3)}s`} />
                                <StatCard icon={<Activity size={16} />} title="Median" value={`${stats.median.toFixed(3)}s`} />
                                <StatCard icon={<Activity size={16} />} title="Std Deviation" value={`${stats.stdDev.toFixed(3)}s`} />
                                <StatCard icon={<TrendingUp size={16} />} title="Minimum" value={`${stats.min.toFixed(3)}s`} />
                                <StatCard icon={<TrendingUp size={16} />} title="Maximum" value={`${stats.max.toFixed(3)}s`} />
                                <StatCard icon={<Target size={16} />} title="Range" value={`${stats.range.toFixed(3)}s`} />
                                <StatCard icon={<Activity size={16} />} title="Coefficient of Var" value={`${stats.cv.toFixed(2)}%`} />
                            </div>
                        )}

                        {/* Confidence Interval */}
                        <section className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <Target size={20} color="var(--accent-blue)" /> Confidence Interval
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confidence Level:</span>
                                    <select
                                        value={confidenceLevel}
                                        onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px',
                                            outline: 'none'
                                        }}
                                    >
                                        <option value={0.90}>90% Confidence</option>
                                        <option value={0.95}>95% Confidence</option>
                                        <option value={0.99}>99% Confidence</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center' }}>
                                <StatCard title="Lower Bound" value={`${ci.lower.toFixed(3)}s`} color="#f87171" style={{ border: 'none', background: 'rgba(248, 113, 113, 0.1)' }} />
                                <ArrowRight size={24} color="var(--text-secondary)" />
                                <StatCard title="Upper Bound" value={`${ci.upper.toFixed(3)}s`} color="#f87171" style={{ border: 'none', background: 'rgba(248, 113, 113, 0.1)' }} />
                            </div>
                            <p style={{ marginTop: '15px', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                Margin of Error: <span style={{ color: 'var(--text-primary)' }}>±{ci.margin.toFixed(3)}s</span>
                            </p>
                        </section>

                        {/* Process Capability */}
                        <section className="glass-card" style={{ padding: '25px', marginBottom: '25px' }}>
                            <h3 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Activity size={20} color="var(--accent-blue)" /> Process Capability (Cp/Cpk)
                            </h3>
                            <div style={{ display: 'flex', gap: '30px', marginBottom: '25px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Lower Spec Limit (LSL)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={specLimits.lsl}
                                        onChange={(e) => setSpecLimits({ ...specLimits, lsl: parseFloat(e.target.value) })}
                                        style={{
                                            width: '120px',
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Upper Spec Limit (USL)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={specLimits.usl}
                                        onChange={(e) => setSpecLimits({ ...specLimits, usl: parseFloat(e.target.value) })}
                                        style={{
                                            width: '120px',
                                            padding: '8px 12px',
                                            backgroundColor: 'rgba(0,0,0,0.3)',
                                            color: '#fff',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
                                <StatCard title="Cp Index" value={processCapability.cp.toFixed(3)} color={processCapability.cp >= 1.33 ? '#4ade80' : '#f87171'} />
                                <StatCard title="Cpk Index" value={processCapability.cpk.toFixed(3)} color={processCapability.cpk >= 1.33 ? '#4ade80' : '#f87171'} />
                                <StatCard title="Cpl" value={processCapability.cpl.toFixed(3)} />
                                <StatCard title="Cpu" value={processCapability.cpu.toFixed(3)} />
                            </div>
                            <div style={{
                                marginTop: '15px',
                                padding: '10px 15px',
                                borderRadius: '8px',
                                backgroundColor: processCapability.cpk >= 1.33 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                                color: processCapability.cpk >= 1.33 ? '#4ade80' : '#f87171',
                                fontSize: '0.9rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px'
                            }}>
                                {processCapability.cpk >= 1.33 ? <Activity size={16} /> : <AlertCircle size={16} />}
                                {processCapability.cpk >= 1.33 ? 'Process is statistically capable and centered.' : 'Process variation is too high or not centered relative to specs.'}
                            </div>
                        </section>

                        {/* Distribution and Charts */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '25px' }}>
                            {/* Histogram */}
                            <section className="glass-card" style={{ padding: '25px' }}>
                                <h3 style={{ margin: '0 0 20px 0' }}>Distribution Histogram</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={histogramData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="range" stroke="var(--text-secondary)" fontSize={11} angle={-45} textAnchor="end" height={60} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={11} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--accent-blue)' }}
                                        />
                                        <Bar dataKey="count" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </section>

                            {/* Control Chart */}
                            <section className="glass-card" style={{ padding: '25px' }}>
                                <h3 style={{ margin: '0 0 20px 0' }}>Control Chart (Individual)</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={controlChartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="index" stroke="var(--text-secondary)" fontSize={11} />
                                        <YAxis stroke="var(--text-secondary)" fontSize={11} domain={['auto', 'auto']} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                        <ReferenceLine y={controlLimits.centerLine} stroke="rgba(74, 222, 128, 0.5)" strokeDasharray="3 3" label={{ position: 'right', value: 'CL', fill: '#4ade80', fontSize: 10 }} />
                                        <ReferenceLine y={controlLimits.ucl} stroke="rgba(248, 113, 113, 0.5)" strokeDasharray="3 3" label={{ position: 'right', value: 'UCL', fill: '#f87171', fontSize: 10 }} />
                                        <ReferenceLine y={controlLimits.lcl} stroke="rgba(248, 113, 113, 0.5)" strokeDasharray="3 3" label={{ position: 'right', value: 'LCL', fill: '#f87171', fontSize: 10 }} />
                                        <Line
                                            type="monotone"
                                            dataKey="duration"
                                            stroke="var(--accent-blue)"
                                            strokeWidth={2}
                                            dot={{ r: 4, fill: 'var(--accent-blue)', strokeWidth: 2, stroke: 'var(--bg-primary)' }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </section>
                        </div>

                        {/* Outliers Section */}
                        {showOutliers && outlierInfo.outliers.length > 0 && (
                            <section className="glass-card" style={{ padding: '25px', borderColor: 'rgba(248, 113, 113, 0.3)' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: '#f87171', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <AlertCircle size={20} /> Outliers Detected
                                </h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                    The following {outlierInfo.outliers.length} measurements are statistically significantly different from the rest of the data set (IQR method).
                                </p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {outlierInfo.outliers.map((val, idx) => (
                                        <span key={idx} style={{
                                            padding: '6px 12px',
                                            backgroundColor: 'rgba(248, 113, 113, 0.1)',
                                            border: '1px solid rgba(248, 113, 113, 0.3)',
                                            borderRadius: '8px',
                                            fontSize: '0.9rem',
                                            color: '#f87171',
                                            fontWeight: 'bold'
                                        }}>
                                            {val.toFixed(3)}s
                                        </span>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// Modern Stat Card Component
function StatCard({ icon, title, value, color = 'var(--accent-blue)', style = {} }) {
    return (
        <div
            className="glass-card"
            style={{
                padding: '20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                minWidth: '0',
                ...style
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        </div>
    );
}

export default StatisticalAnalysis;

