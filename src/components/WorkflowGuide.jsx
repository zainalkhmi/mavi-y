import React, { useState } from 'react';
import { ChevronRight, CheckCircle, Circle } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

const WorkflowGuide = () => {
    const navigate = useNavigate();
    const [completedSteps, setCompletedSteps] = useState([]);
    const [selectedStep, setSelectedStep] = useState(null);

    const workflowSteps = [
        {
            id: 1,
            title: 'Upload Video',
            icon: '📹',
            color: '#4CAF50',
            description: 'Mulai dengan upload video proses kerja',
            details: [
                'Upload video file (MP4, WebM, AVI)',
                'Gunakan IP Camera untuk live stream',
            ],
            features: ['Video Workspace', 'IP Camera Connect']
        },
        {
            id: 2,
            title: 'Element Editor',
            icon: '✏️',
            color: '#2196F3',
            description: 'Breakdown proses menjadi work elements',
            details: [
                'Klik Start/End Measurement',
                'Isi Element Name & Therblig type',
                'Tandai Value Added/Non-Value Added',
                'Analisis Best/Worst Cycle'
            ],
            features: ['Timeline Measurement', 'Best/Worst Cycle']
        },
        {
            id: 3,
            title: 'AI Process Studio',
            icon: '🧠',
            color: '#FF9800',
            description: 'Centralized AI for process breakdown',
            details: [
                'Object Tracking: Lacak pergerakan tools/part',
                'Motion Analysis: Analisis ergonomi & anomali',
                'Video Intelligence: Tanya jawab dengan video'
            ],
            features: ['AI Process Studio', 'Action Recognition', 'ML Data']
        },
        {
            id: 4,
            title: 'Analysis & TPS',
            icon: '📊',
            color: '#9C27B0',
            description: 'Analisis data & improvement berbasis TPS',
            details: [
                'OEE, Efficiency, Productivity metrics',
                'Value Stream Mapping (VSM) Pro',
                'Yamazumi Chart (Work Balancing)',
                'EPEI Analysis (Flexibility Analysis)',
                'Pitch & Takt Time Heartbeat',
                'Waste Elimination (7 Wastes)'
            ],
            features: ['Value Stream Mapping', 'Yamazumi Chart', 'EPEI Analysis', 'Analysis Dashboard']
        },
        {
            id: 5,
            title: 'Manual Creation',
            icon: '📘',
            color: '#F44336',
            description: 'Buat Work Instruction / SOP visual',
            details: [
                'AI Generate instructions otomatis',
                'Markup gambar dengan annotations',
                'Export PDF/Word/PowerPoint'
            ],
            features: ['Manual Creation', 'AI Generate']
        },
        {
            id: 6,
            title: 'Knowledge Base',
            icon: '✅',
            color: '#00BCD4',
            description: 'Simpan dan share best practices',
            details: [
                'Upload manual ke Knowledge Base',
                'Tambahkan tags dan category',
                'Rate dan review manual',
                'Download template untuk project baru'
            ],
            features: ['Knowledge Base', 'Template Upload']
        }
    ];

    const toggleComplete = (stepId) => {
        setCompletedSteps(prev =>
            prev.includes(stepId)
                ? prev.filter(id => id !== stepId)
                : [...prev, stepId]
        );
    };

    const progressPercentage = (completedSteps.length / workflowSteps.length) * 100;

    return (
        <div style={{
            height: '100%',
            backgroundColor: '#0a0a0a',
            color: '#fff',
            overflow: 'auto',
            padding: '40px 60px'
        }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{
                        fontSize: '2.5rem',
                        marginBottom: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: '700'
                    }}>
                        🚀 Project Workflow
                    </h1>
                    <p style={{ fontSize: '1rem', color: '#888', marginBottom: '24px' }}>
                        Panduan end-to-end dari upload video sampai manual creation
                    </p>

                    {/* Progress Bar */}
                    <div style={{ marginBottom: '12px' }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                        }}>
                            <span style={{ fontSize: '0.9rem', color: '#aaa' }}>Progress</span>
                            <span style={{
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                color: progressPercentage === 100 ? '#4CAF50' : '#667eea'
                            }}>
                                {completedSteps.length}/{workflowSteps.length} Complete
                            </span>
                        </div>
                        <div style={{
                            height: '8px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: '1px solid #333'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${progressPercentage}% `,
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                transition: 'width 0.5s ease',
                                boxShadow: progressPercentage > 0 ? '0 0 10px #667eea' : 'none'
                            }} />
                        </div>
                    </div>
                </div>

                {/* Horizontal Workflow Steps */}
                <div style={{
                    display: 'flex',
                    gap: '20px',
                    marginBottom: '40px',
                    overflowX: 'auto',
                    paddingBottom: '20px',
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#667eea #1a1a1a'
                }}>
                    {workflowSteps.map((step, index) => {
                        const isCompleted = completedSteps.includes(step.id);
                        const isSelected = selectedStep === step.id;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step Card */}
                                <div
                                    onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
                                    style={{
                                        minWidth: '200px',
                                        backgroundColor: isSelected ? '#1a1a1a' : '#141414',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        cursor: 'pointer',
                                        border: `2px solid ${isSelected ? step.color : '#222'} `,
                                        transition: 'all 0.3s ease',
                                        position: 'relative',
                                        boxShadow: isSelected ? `0 8px 32px ${step.color} 40` : '0 4px 12px #00000040',
                                        transform: isSelected ? 'translateY(-4px)' : 'translateY(0)',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderColor = step.color + '80';
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.borderColor = '#222';
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }
                                    }}
                                >
                                    {/* Completion Checkbox */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleComplete(step.id);
                                        }}
                                        style={{
                                            position: 'absolute',
                                            top: '12px',
                                            right: '12px',
                                            cursor: 'pointer',
                                            color: isCompleted ? '#4CAF50' : '#555',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                                    </div>

                                    {/* Step Number & Icon */}
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        borderRadius: '50%',
                                        background: `linear - gradient(135deg, ${step.color}40, ${step.color}20)`,
                                        border: `2px solid ${step.color} `,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '2rem',
                                        marginBottom: '16px',
                                        position: 'relative'
                                    }}>
                                        {step.icon}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '-4px',
                                            right: '-4px',
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            backgroundColor: step.color,
                                            color: '#fff',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '2px solid #141414'
                                        }}>
                                            {step.id}
                                        </div>
                                    </div>

                                    {/* Step Title */}
                                    <h3 style={{
                                        margin: 0,
                                        fontSize: '1.1rem',
                                        marginBottom: '8px',
                                        color: step.color,
                                        fontWeight: '600'
                                    }}>
                                        {step.title}
                                    </h3>

                                    {/* Description */}
                                    <p style={{
                                        margin: 0,
                                        fontSize: '0.85rem',
                                        color: '#888',
                                        lineHeight: '1.4'
                                    }}>
                                        {step.description}
                                    </p>
                                </div>

                                {/* Arrow Connector */}
                                {index < workflowSteps.length - 1 && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        minWidth: '40px',
                                        color: '#555',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold'
                                    }}>
                                        →
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* Expanded Details Panel */}
                {selectedStep && (
                    <div style={{
                        backgroundColor: '#141414',
                        borderRadius: '16px',
                        padding: '32px',
                        border: `2px solid ${workflowSteps.find(s => s.id === selectedStep)?.color} `,
                        marginBottom: '40px',
                        animation: 'slideIn 0.3s ease'
                    }}>
                        <style>
                            {`
@keyframes slideIn {
                                    from {
        opacity: 0;
        transform: translateY(-10px);
    }
                                    to {
        opacity: 1;
        transform: translateY(0);
    }
}
`}
                        </style>
                        {(() => {
                            const step = workflowSteps.find(s => s.id === selectedStep);
                            return (
                                <>
                                    <h2 style={{
                                        color: step.color,
                                        marginBottom: '20px',
                                        fontSize: '1.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px'
                                    }}>
                                        <span style={{ fontSize: '2rem' }}>{step.icon}</span>
                                        {step.title}
                                    </h2>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                                        {/* Left: Details */}
                                        <div>
                                            <h3 style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                📋 Langkah-langkah
                                            </h3>
                                            <ul style={{
                                                paddingLeft: '20px',
                                                lineHeight: '1.8',
                                                color: '#ccc'
                                            }}>
                                                {step.details.map((detail, i) => (
                                                    <li key={i} style={{ marginBottom: '8px' }}>{detail}</li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Right: Features */}
                                        <div>
                                            <h3 style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                🎯 Fitur Terkait
                                            </h3>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {step.features.map((feature, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => {
                                                            const viewMap = {
                                                                // Step 1: Upload Video
                                                                'Video Workspace': '/',
                                                                'IP Camera Connect': '/',

                                                                // Step 2: Element Editor
                                                                'Timeline Measurement': '/',
                                                                'Best/Worst Cycle': '/best-worst',

                                                                // Step 3: AI Analysis
                                                                'AI Process Studio': '/ai-process',
                                                                'Action Recognition': '/ai-process',
                                                                'ML Data': '/ai-process',
                                                                'Ergonomic Analysis': '/ai-process',
                                                                'Object Tracking': '/ai-process',

                                                                // Step 4: Analysis
                                                                'Value Stream Mapping': '/vsm',
                                                                'Yamazumi Chart': '/vsm',
                                                                'EPEI Analysis': '/vsm',
                                                                'Analysis Dashboard': '/ai-process',
                                                                'Waste Elimination': '/waste-elimination',
                                                                'Statistical Analysis': '/statistical-analysis',

                                                                // Step 5: Manual Creation
                                                                'Manual Creation': '/manual-creation',
                                                                'AI Generate': '/manual-creation',

                                                                // Step 6: Knowledge Base
                                                                'Knowledge Base': '/knowledge-base',
                                                                'Template Upload': '/knowledge-base'
                                                            };
                                                            const path = viewMap[feature];
                                                            if (path) navigate(path);
                                                        }}
                                                        style={{
                                                            padding: '10px 16px',
                                                            backgroundColor: `${step.color} 15`,
                                                            border: `1px solid ${step.color} `,
                                                            borderRadius: '8px',
                                                            fontSize: '0.9rem',
                                                            color: step.color,
                                                            cursor: 'pointer',
                                                            transition: 'all 0.2s ease',
                                                            fontWeight: '500'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.target.style.backgroundColor = `${step.color} 30`;
                                                            e.target.style.transform = 'translateY(-2px)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.target.style.backgroundColor = `${step.color} 15`;
                                                            e.target.style.transform = 'translateY(0)';
                                                        }}
                                                    >
                                                        {feature} →
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Quick Access Menu - All Features */}
                <div style={{
                    backgroundColor: '#141414',
                    borderRadius: '16px',
                    padding: '32px',
                    border: '1px solid #222',
                    marginBottom: '40px'
                }}>
                    <h3 style={{ marginBottom: '24px', color: '#667eea', fontSize: '1.5rem' }}>
                        📌 Quick Access Menu - Semua Fitur
                    </h3>
                    <p style={{ color: '#888', marginBottom: '24px', fontSize: '0.95rem' }}>
                        Akses cepat ke semua fitur dan menu yang tersedia di aplikasi MAVi
                    </p>

                    {/* Menu Categories */}
                    {[
                        {
                            category: '🎬 Core Workspace',
                            color: '#4CAF50',
                            items: [
                                { icon: '🎬', name: 'Video Workspace', path: '/', desc: 'Upload & analisis video' },
                                { icon: '✏️', name: 'Element Editor', path: '/', desc: 'Breakdown work elements' },
                                { icon: '📂', name: 'File Explorer', path: '/files', desc: 'Kelola file project' },
                            ]
                        },
                        {
                            category: '🧠 AI & Analysis',
                            color: '#2196F3',
                            items: [
                                { icon: '🧠', name: 'AI Process Studio', path: '/ai-process', desc: 'Centralized AI analysis' },
                                { icon: '🤖', name: 'Action Recognition', path: '/action-recognition', desc: 'Deteksi aksi otomatis' },
                                { icon: '🛡️', name: 'Real-time Compliance', path: '/realtime-compliance', desc: 'Monitor kepatuhan SOP' },
                                { icon: '📹', name: 'Multi-Camera Fusion', path: '/multi-camera', desc: 'Analisis 3D multi-kamera' },
                            ]
                        },
                        {
                            category: '📊 TPS Tools',
                            color: '#FF9800',
                            items: [
                                { icon: '🏭', name: 'Value Stream Map', path: '/value-stream-map', desc: 'Pemetaan alur nilai' },
                                { icon: '🏔️', name: 'Yamazumi Chart', path: '/yamazumi', desc: 'Work balancing chart' },
                                { icon: '📋', name: 'SWCS', path: '/swcs', desc: 'Standard Work Combination Sheet' },
                                { icon: '🗑️', name: 'Waste Elimination', path: '/waste-elimination', desc: 'Identifikasi 7 waste' },
                                { icon: '📍', name: 'Therblig Analysis', path: '/therblig', desc: 'Analisis gerakan dasar' },
                            ]
                        },
                        {
                            category: '📉 Statistical & Comparison',
                            color: '#9C27B0',
                            items: [
                                { icon: '📉', name: 'Statistical Analysis', path: '/statistical-analysis', desc: 'Analisis statistik data' },
                                { icon: '🏆', name: 'Best/Worst Cycle', path: '/best-worst', desc: 'Perbandingan cycle terbaik' },
                                { icon: '🎥', name: 'Video Comparison', path: '/comparison', desc: 'Bandingkan 2 video' },
                                { icon: '🔄', name: 'Element Rearrangement', path: '/rearrangement', desc: 'Susun ulang elemen' },
                            ]
                        },
                        {
                            category: '📘 Documentation & Training',
                            color: '#00BCD4',
                            items: [
                                { icon: '📘', name: 'Manual Creation', path: '/manual-creation', desc: 'Buat SOP & Work Instruction' },
                                { icon: '📚', name: 'Knowledge Base', path: '/knowledge-base', desc: 'Repository best practices' },
                                { icon: '🥽', name: 'VR Training', path: '/vr-training', desc: 'Simulasi training VR' },
                                { icon: '📡', name: 'Broadcast', path: '/broadcast', desc: 'Live streaming & sharing' },
                            ]
                        },
                        {
                            category: '⚙️ System & Settings',
                            color: '#607D8B',
                            items: [
                                { icon: '🩺', name: 'System Diagnostics', path: '/diagnostics', desc: 'Cek status sistem' },
                                { icon: '❓', name: 'Help & Documentation', path: '/help', desc: 'Panduan penggunaan' },
                            ]
                        }
                    ].map((menuGroup, groupIdx) => (
                        <div key={groupIdx} style={{ marginBottom: '28px' }}>
                            <h4 style={{
                                color: menuGroup.color,
                                fontSize: '1.1rem',
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                borderBottom: `2px solid ${menuGroup.color} 40`,
                                paddingBottom: '8px'
                            }}>
                                {menuGroup.category}
                            </h4>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                gap: '12px'
                            }}>
                                {menuGroup.items.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => navigate(item.path)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '14px 16px',
                                            backgroundColor: '#1a1a1a',
                                            border: `1px solid ${menuGroup.color} 30`,
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.2s ease',
                                            width: '100%'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = `${menuGroup.color} 20`;
                                            e.currentTarget.style.borderColor = menuGroup.color;
                                            e.currentTarget.style.transform = 'translateY(-2px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = '#1a1a1a';
                                            e.currentTarget.style.borderColor = `${menuGroup.color} 30`;
                                            e.currentTarget.style.transform = 'translateY(0)';
                                        }}
                                    >
                                        <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
                                        <div>
                                            <div style={{ color: '#fff', fontSize: '0.95rem', fontWeight: '500' }}>
                                                {item.name}
                                            </div>
                                            <div style={{ color: '#888', fontSize: '0.75rem', marginTop: '2px' }}>
                                                {item.desc}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Start Guide */}
                <div style={{
                    backgroundColor: '#141414',
                    borderRadius: '16px',
                    padding: '32px',
                    border: '1px solid #222'
                }}>
                    <h3 style={{ marginBottom: '24px', color: '#667eea', fontSize: '1.3rem' }}>
                        🎯 Quick Start Tips
                    </h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '20px'
                    }}>
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '12px',
                            borderLeft: '4px solid #4CAF50'
                        }}>
                            <strong style={{ color: '#4CAF50', fontSize: '1rem' }}>🚀 Untuk Pemula</strong>
                            <p style={{ color: '#aaa', marginTop: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Mulai dari Upload Video → Element Editor → Manual Creation
                            </p>
                        </div>
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '12px',
                            borderLeft: '4px solid #2196F3'
                        }}>
                            <strong style={{ color: '#2196F3', fontSize: '1rem' }}>⚡ Untuk Advanced</strong>
                            <p style={{ color: '#aaa', marginTop: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Gunakan AI Features untuk auto-detection dan analisis mendalam
                            </p>
                        </div>
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#1a1a1a',
                            borderRadius: '12px',
                            borderLeft: '4px solid #FF9800'
                        }}>
                            <strong style={{ color: '#FF9800', fontSize: '1rem' }}>📊 Untuk Improvement</strong>
                            <p style={{ color: '#aaa', marginTop: '8px', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Focus pada Analysis → Waste Elimination → Comparison
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowGuide;
