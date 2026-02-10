import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAllProjects } from '../utils/database';
import { useLanguage } from '../i18n/LanguageContext';
import {
    Activity,
    Layers,
    Search,
    ChevronDown,
    Zap,
    Timer,
    Clock,
    Plus,
    X,
    Check,
    Maximize2,
    Minimize2,
    Layout
} from 'lucide-react';

function MultiAxialAnalysis() {
    const { t } = useLanguage();
    const [projects, setProjects] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]);
    const [measurements, setMeasurements] = useState([]);
    const [zoomLevel, setZoomLevel] = useState(40); // Increased default zoom
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Premium Animations and Global Styles
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes mesh-float {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0, 0) scale(1); }
            }
            .glass-panel {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
            }
            .chart-bar {
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s;
            }
            .chart-bar:hover {
                transform: scaleY(1.1);
                box-shadow: 0 0 15px currentColor;
                z-index: 10;
            }
            .pro-scrollbar::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            .pro-scrollbar::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.02);
            }
            .pro-scrollbar::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
            }
            .pro-scrollbar::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        loadProjects();
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedProjects.length > 0 && projects.length > 0) {
            const combinedMeasurements = [];
            selectedProjects.forEach(projectName => {
                const project = projects.find(p => p.projectName === projectName);
                if (project && project.measurements) {
                    project.measurements.forEach(m => {
                        combinedMeasurements.push({
                            ...m,
                            projectName: projectName,
                            laneId: projectName
                        });
                    });
                }
            });
            setMeasurements(combinedMeasurements);
        } else {
            setMeasurements([]);
        }
    }, [selectedProjects, projects]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const toggleProjectSelection = (projectName) => {
        setSelectedProjects(prev => {
            if (prev.includes(projectName)) {
                return prev.filter(p => p !== projectName);
            } else {
                return [...prev, projectName];
            }
        });
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#3b82f6'; // Bright Blue
            case 'Non value-added': return '#f59e0b'; // Amber
            case 'Waste': return '#ef4444'; // Red
            default: return '#6366f1'; // Indigo
        }
    };

    const maxDuration = useMemo(() => {
        if (measurements.length === 0) return 0;
        return Math.max(...measurements.map(m => m.endTime));
    }, [measurements]);

    const timelineWidth = Math.max(800, maxDuration * zoomLevel + 200);
    const laneHeight = 70;

    const filteredProjects = projects.filter(p =>
        (p.projectName || '').toLowerCase().includes((searchTerm || '').toLowerCase())
    );

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#050508',
            backgroundImage: 'radial-gradient(circle at 50% -20%, #1a1a2e 0%, #050508 70%)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            position: 'relative',
            padding: '24px'
        }}>
            {/* Ambient Lighting Orbs */}
            <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: 'rgba(59, 130, 246, 0.04)', filter: 'blur(100px)', borderRadius: '50%', animation: 'mesh-float 15s infinite ease-in-out' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: 'rgba(139, 92, 246, 0.04)', filter: 'blur(100px)', borderRadius: '50%', animation: 'mesh-float 12s infinite ease-in-out reverse' }} />

            {/* Header Section */}
            <div style={{
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 20,
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 8px 32px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Layers size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900', letterSpacing: '-0.02em' }}>
                            Multi-Axial Timeline
                        </h1>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Process Comparison Engine
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {/* Zoom Controller */}
                    <div className="glass-panel" style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '6px 14px', borderRadius: '12px'
                    }}>
                        <Minimize2 size={14} color="rgba(255,255,255,0.3)" />
                        <input
                            type="range"
                            min="10"
                            max="150"
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                            style={{
                                width: '100px',
                                accentColor: '#3b82f6',
                                background: 'rgba(255,255,255,0.1)',
                                height: '3px',
                                borderRadius: '2px',
                                outline: 'none'
                            }}
                        />
                        <Maximize2 size={14} color="rgba(255,255,255,0.3)" />
                    </div>
                </div>
            </div>

            {/* Layout Body: Sidebar + Main Content */}
            <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
                {/* Left Sidebar: Project List */}
                <div className="glass-panel" style={{
                    width: '300px',
                    borderRadius: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '20px',
                    zIndex: 10,
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                        <Search size={16} color="#3b82f6" />
                        <span style={{ fontWeight: '700', fontSize: '0.9rem', color: '#fff' }}>Select Projects</span>
                        <div style={{
                            marginLeft: 'auto',
                            fontSize: '0.7rem',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            color: '#3b82f6',
                            fontWeight: 'BOLD'
                        }}>
                            {selectedProjects.length}
                        </div>
                    </div>

                    <div style={{ position: 'relative', marginBottom: '16px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.2)' }} />
                        <input
                            type="text"
                            placeholder="Cari proyek..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 12px 8px 34px',
                                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                                borderRadius: '10px', color: '#fff', outline: 'none', fontSize: '0.8rem'
                            }}
                        />
                    </div>

                    <div className="pro-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                        {filteredProjects.map(project => (
                            <div
                                key={project.id}
                                onClick={() => toggleProjectSelection(project.projectName)}
                                style={{
                                    padding: '10px', cursor: 'pointer', display: 'flex',
                                    alignItems: 'center', gap: '10px', borderRadius: '10px',
                                    marginBottom: '4px', transition: 'all 0.2s',
                                    background: selectedProjects.includes(project.projectName)
                                        ? 'rgba(59, 130, 246, 0.15)'
                                        : 'transparent',
                                    border: '1px solid',
                                    borderColor: selectedProjects.includes(project.projectName)
                                        ? 'rgba(59, 130, 246, 0.3)'
                                        : 'transparent'
                                }}
                            >
                                <div style={{
                                    width: '18px', height: '18px', borderRadius: '5px',
                                    border: '2px solid',
                                    borderColor: selectedProjects.includes(project.projectName) ? '#3b82f6' : 'rgba(255,255,255,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: selectedProjects.includes(project.projectName) ? '#3b82f6' : 'transparent',
                                    transition: 'all 0.2s',
                                    flexShrink: 0
                                }}>
                                    {selectedProjects.includes(project.projectName) && <Check size={12} color="white" />}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{
                                        color: '#fff',
                                        fontSize: '0.85rem',
                                        fontWeight: '600',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>{project.projectName}</div>
                                    <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.65rem' }}>
                                        {new Date(project.lastModified).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredProjects.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>
                                No projects found
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="glass-panel pro-scrollbar" style={{
                    flex: 1, borderRadius: '24px', overflow: 'auto', padding: '32px',
                    zIndex: 10, position: 'relative', minWidth: 0
                }}>
                    {selectedProjects.length === 0 ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '24px' }}>
                            <div style={{
                                width: '120px', height: '120px', borderRadius: '35px',
                                background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'rgba(59, 130, 246, 0.2)',
                                boxShadow: 'inset 0 0 20px rgba(59, 130, 246, 0.05)'
                            }}>
                                <Layout size={56} />
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02rem' }}>
                                    Mulai Analisis Multi-Axial
                                </h3>
                                <p style={{ margin: '10px 0 24px 0', fontSize: '0.95rem', color: 'rgba(255,255,255,0.4)', maxWidth: '400px', lineHeight: '1.6' }}>
                                    Pilih proyek di panel kiri untuk membandingkan proses secara sinkron pada lini waktu.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ minWidth: `${timelineWidth}px` }}>
                            {/* Time Ruler */}
                            <div style={{
                                display: 'flex', marginBottom: '32px', position: 'sticky', top: 0,
                                zIndex: 20, background: 'rgba(5, 5, 8, 0.8)', backdropFilter: 'blur(8px)',
                                padding: '12px 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                <div style={{ width: '240px', flexShrink: 0 }}></div>
                                <div style={{ position: 'relative', height: '24px', flex: 1 }}>
                                    {Array.from({ length: Math.ceil(maxDuration) + 5 }).map((_, i) => {
                                        if (i % 5 !== 0 && zoomLevel < 40) return null;
                                        return (
                                            <div key={i} style={{ position: 'absolute', left: `${i * zoomLevel}px`, top: 0 }}>
                                                <div style={{ borderLeft: '1px solid rgba(255,255,255,0.1)', height: '8px' }}></div>
                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', transform: 'translateX(-50%)', marginTop: '6px', fontWeight: '600' }}>
                                                    {i}s
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Lanes Grid */}
                            {selectedProjects.map((laneName, idx) => {
                                const laneMeasurements = measurements.filter(m => m.laneId === laneName);
                                const totalTime = Math.max(...(laneMeasurements.map(m => m.endTime) || [0]), 0);

                                return (
                                    <div key={laneName} style={{ display: 'flex', marginBottom: '16px', alignItems: 'center' }}>
                                        {/* Lane Header */}
                                        <div style={{
                                            width: '240px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px',
                                            paddingRight: '24px'
                                        }}>
                                            <div style={{
                                                width: '4px', height: '36px', borderRadius: '2px',
                                                background: `linear-gradient(to bottom, #3b82f6, #1d4ed8)`
                                            }} />
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <div style={{
                                                    fontWeight: '800', color: '#fff', fontSize: '0.9rem',
                                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                }}>{laneName}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                    <Clock size={10} color="rgba(255,255,255,0.3)" />
                                                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>
                                                        {totalTime.toFixed(2)}s
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lane Timeline */}
                                        <div style={{
                                            flex: 1, height: `${laneHeight}px`, position: 'relative',
                                            background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
                                            border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden'
                                        }}>
                                            {/* Grid Verticals */}
                                            {Array.from({ length: Math.ceil(maxDuration) + 5 }).map((_, i) => (
                                                i % 5 === 0 && (
                                                    <div key={i} style={{
                                                        position: 'absolute', left: `${i * zoomLevel}px`,
                                                        top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.02)'
                                                    }} />
                                                )
                                            ))}

                                            {/* Bars */}
                                            {laneMeasurements.map(m => {
                                                const barColor = getCategoryColor(m.category);
                                                return (
                                                    <div
                                                        key={m.id}
                                                        className="chart-bar"
                                                        style={{
                                                            position: 'absolute',
                                                            left: `${m.startTime * zoomLevel}px`,
                                                            width: `${Math.max(4, m.duration * zoomLevel)}px`,
                                                            top: '12px',
                                                            bottom: '12px',
                                                            background: `linear-gradient(135deg, ${barColor} 0%, ${barColor}cc 100%)`,
                                                            borderRadius: '8px',
                                                            border: '1px solid rgba(255,255,255,0.1)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            padding: '0 8px',
                                                            color: '#fff',
                                                            boxShadow: `0 4px 12px ${barColor}20`
                                                        }}
                                                        title={`${m.elementName}\n${m.duration.toFixed(2)}s | ${m.category}`}
                                                    >
                                                        {m.duration * zoomLevel > 60 && (
                                                            <span style={{
                                                                fontSize: '0.7rem', fontWeight: '800',
                                                                whiteSpace: 'nowrap', overflow: 'hidden',
                                                                textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                                                            }}>
                                                                {m.elementName}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Insight Pill */}
            {selectedProjects.length > 1 && (
                <div style={{
                    position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
                    zIndex: 30
                }}>
                    <div className="glass-panel" style={{
                        padding: '12px 24px', borderRadius: '100px', display: 'flex',
                        alignItems: 'center', gap: '16px', border: '1px solid rgba(59, 130, 246, 0.3)'
                    }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: '#3b82f6', display: 'flex', alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Zap size={16} color="white" />
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
                            {selectedProjects.length} Process Axioms Synchronized
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MultiAxialAnalysis;

