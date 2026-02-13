import React, { useState, useRef, useEffect } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { useProject } from '../contexts/ProjectContext';
import { getAllProjects } from '../utils/database';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Folder,
    Save,
    Play,
    Square,
    Info,
    Link as LinkIcon,
    ArrowUp,
    ArrowDown,
    Clock,
    Tag,
    GripVertical,
    CheckCircle2,
    LayoutGrid,
    RefreshCw,
    X,
    ChevronRight,
    MonitorPlay
} from 'lucide-react';

function ElementRearrangement({ measurements, videoSrc, onUpdateMeasurements }) {
    const { showAlert } = useDialog();
    const { openProject, currentProject } = useProject();
    const { t } = useLanguage();
    const [elements, setElements] = useState([]);
    const [draggedItem, setDraggedItem] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [currentSimulatingIndex, setCurrentSimulatingIndex] = useState(-1);
    const [showInfo, setShowInfo] = useState(true);
    const [selectedElements, setSelectedElements] = useState([]);
    const [showJointOptions, setShowJointOptions] = useState(false);
    const [showProjectPicker, setShowProjectPicker] = useState(false);
    const [availableProjects, setAvailableProjects] = useState([]);
    const videoRef = useRef(null);
    const simulationTimeoutRef = useRef(null);

    const loadAvailableProjects = async () => {
        try {
            const projects = await getAllProjects();
            // Only show projects that have measurements
            setAvailableProjects(projects.filter(p => p.measurements && p.measurements.length > 0));
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const handleProjectSelect = async (projectName) => {
        await openProject(projectName, null); // Load project but stay on current page
        setShowProjectPicker(false);
    };

    useEffect(() => {
        setElements([...measurements]);
    }, [measurements]);

    const handleDragStart = (e, index) => {
        setDraggedItem(elements[index]);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
        const draggedOverItem = elements[index];

        if (draggedItem === draggedOverItem) {
            return;
        }

        let items = elements.filter(item => item !== draggedItem);
        items.splice(index, 0, draggedItem);
        setElements(items);
    };

    const handleDragEnd = () => {
        setDraggedItem(null);
    };

    const handleSaveChanges = async () => {
        onUpdateMeasurements(elements);
        await showAlert(t('common.success') || 'Success', t('rearrangement.saveOrder'));
    };

    const handleAutoArrange = (order) => {
        let sorted = [...elements];
        if (order === 'asc') {
            sorted.sort((a, b) => a.duration - b.duration);
        } else if (order === 'desc') {
            sorted.sort((a, b) => b.duration - a.duration);
        }
        setElements(sorted);
    };

    const toggleSelection = (index) => {
        setSelectedElements(prev => {
            if (prev.includes(index)) {
                return prev.filter(i => i !== index);
            } else {
                if (prev.length >= 2) {
                    // Keep only the most recently selected and the new one, or just prevent?
                    // Let's prevent selecting more than 2 for clarity, or just replace the first one.
                    // User requirement implies selecting 2 specific elements.
                    // Let's allow max 2.
                    return [...prev, index].slice(-2);
                }
                return [...prev, index];
            }
        });
    };

    const handleJointClick = async () => {
        if (selectedElements.length !== 2) {
            await showAlert('Info', t('rearrangement.jointSelection') + ': ' + (t('common.selectTwo') || 'Select exactly 2 elements.'));
            return;
        }
        setShowJointOptions(true);
    };

    const handleJointConfirm = (position) => {
        const [firstIndex, secondIndex] = selectedElements;
        // Ensure indices are valid and sorted to handle removal correctly if needed,
        // but here we are moving one relative to another.

        // We need to identify the actual elements because indices might shift if we remove one.
        const firstElement = elements[firstIndex];
        const secondElement = elements[secondIndex];

        let newElements = elements.filter((_, idx) => idx !== firstIndex);

        // Find the new index of the second element
        let newSecondIndex = newElements.indexOf(secondElement);

        if (position === 'front') {
            // Insert before the second element
            newElements.splice(newSecondIndex, 0, firstElement);
        } else {
            // Insert after the second element
            newElements.splice(newSecondIndex + 1, 0, firstElement);
        }

        setElements(newElements);
        setSelectedElements([]);
        setShowJointOptions(false);
    };

    const startSimulation = async () => {
        console.log('startSimulation called');

        if (!videoSrc) {
            await showAlert(t('common.error') || 'Error', t('common.noVideo') || 'No video loaded!');
            return;
        }

        if (elements.length === 0) {
            await showAlert(t('common.error') || 'Error', t('common.noElements') || 'No elements to simulate!');
            return;
        }

        if (!videoRef.current) {
            console.warn('Video ref missing despite videoSrc present');
            return;
        }

        setIsSimulating(true);
        setCurrentSimulatingIndex(0);
    };

    const stopSimulation = () => {
        console.log('stopSimulation called');
        setIsSimulating(false);
        setCurrentSimulatingIndex(-1);
        if (videoRef.current) {
            videoRef.current.pause();
        }
        if (simulationTimeoutRef.current) {
            clearTimeout(simulationTimeoutRef.current);
        }
    };

    useEffect(() => {
        if (isSimulating && currentSimulatingIndex >= 0) {
            if (currentSimulatingIndex >= elements.length) {
                stopSimulation();
                return;
            }

            const element = elements[currentSimulatingIndex];
            console.log('Simulating element:', currentSimulatingIndex, element);

            if (videoRef.current) {
                const startTime = Number(element.startTime);
                if (!isNaN(startTime)) {
                    videoRef.current.currentTime = startTime;
                    videoRef.current.play().catch(err => {
                        console.error("Video play error:", err);
                        // Try playing muted if autoplay blocked
                        if (err.name === 'NotAllowedError') {
                            videoRef.current.muted = true;
                            videoRef.current.play().catch(e => console.error("Muted play also failed:", e));
                        }
                    });

                    const durationMs = element.duration * 1000;
                    simulationTimeoutRef.current = setTimeout(() => {
                        setCurrentSimulatingIndex(prev => prev + 1);
                    }, durationMs);
                } else {
                    console.warn('Invalid startTime for element:', element);
                    // Skip to next if invalid
                    setCurrentSimulatingIndex(prev => prev + 1);
                }
            }
        }

        return () => {
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
            }
        };
    }, [isSimulating, currentSimulatingIndex, elements]);

    useEffect(() => {
        if (!isSimulating && videoRef.current) {
            videoRef.current.pause();
            if (simulationTimeoutRef.current) {
                clearTimeout(simulationTimeoutRef.current);
            }
        }
    }, [isSimulating]);

    const styles = {
        container: {
            height: '100%',
            width: '100%',
            display: 'flex',
            gap: '20px',
            padding: '24px',
            backgroundColor: '#0a0a0c',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            boxSizing: 'border-box',
            overflow: 'hidden'
        },
        sidebar: {
            width: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            flexShrink: 0,
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(10px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        },
        mainStage: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        },
        headerSection: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '10px'
        },
        titleGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
        },
        toolboxTitle: {
            fontSize: '1.5rem',
            fontWeight: '800',
            margin: 0,
            background: 'linear-gradient(135deg, #fff 0%, #888 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        buttonGroup: {
            display: 'flex',
            gap: '8px'
        },
        toolCard: {
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
        },
        elementList: {
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            paddingRight: '4px'
        },
        elementCard: (isDragging, isActive, isSelected) => ({
            padding: '14px',
            backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' :
                isSelected ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
            border: isActive ? '1px solid #3b82f6' :
                isSelected ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            cursor: isSimulating ? 'default' : 'grab',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            opacity: isDragging ? 0.4 : 1,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: isDragging ? 'scale(0.98)' : 'scale(1)',
            boxShadow: isActive ? '0 0 20px rgba(59, 130, 246, 0.2)' : 'none'
        }),
        categoryBadge: (category) => ({
            fontSize: '0.7rem',
            padding: '4px 8px',
            borderRadius: '20px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            backgroundColor: category === 'Value-added' ? 'rgba(59, 130, 246, 0.1)' :
                category === 'Non value-added' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: category === 'Value-added' ? '#60a5fa' :
                category === 'Non value-added' ? '#fbbf24' : '#f87171',
            border: `1px solid ${category === 'Value-added' ? 'rgba(59, 130, 246, 0.2)' :
                category === 'Non value-added' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
        }),
        videoContainer: {
            position: 'relative',
            flex: 1,
            background: '#000',
            borderRadius: '24px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        }
    };

    return (
        <div style={styles.container}>
            {/* Left Panel: Toolbox */}
            <div style={styles.sidebar}>
                <div style={styles.headerSection}>
                    <div style={styles.titleGroup}>
                        <h2 style={styles.toolboxTitle}>
                            <RefreshCw size={28} className={isSimulating ? "spin" : ""} />
                            {t('rearrangement.title')}
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: '#666', fontWeight: '500' }}>{t('rearrangement.subtitle')}</span>
                    </div>
                    <div style={styles.buttonGroup}>
                        <button
                            className="btn-icon secondary"
                            title={t('rearrangement.projects')}
                            onClick={() => { loadAvailableProjects(); setShowProjectPicker(true); }}
                        >
                            <Folder size={18} />
                        </button>
                        <button
                            className="btn-icon primary"
                            title={t('rearrangement.saveOrder')}
                            onClick={handleSaveChanges}
                        >
                            <Save size={18} />
                        </button>
                    </div>
                </div>

                <div style={styles.toolCard}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#888' }}>
                        <LayoutGrid size={14} />
                        <span>{t('rearrangement.autoArrange')}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-segmented" onClick={() => handleAutoArrange('asc')}>
                            <ArrowUp size={14} /> {t('rearrangement.shortest')}
                        </button>
                        <button className="btn-segmented" onClick={() => handleAutoArrange('desc')}>
                            <ArrowDown size={14} /> {t('rearrangement.longest')}
                        </button>
                    </div>
                    <button
                        className={`btn-joint ${selectedElements.length === 2 ? 'active' : ''}`}
                        onClick={handleJointClick}
                        disabled={selectedElements.length !== 2}
                    >
                        <LinkIcon size={16} />
                        {t('rearrangement.jointSelection')} ({selectedElements.length}/2)
                    </button>
                </div>

                {showJointOptions && (
                    <div className="glass-panel joint-options scale-in">
                        <div style={{ fontSize: '0.85rem', marginBottom: '12px', textAlign: 'center' }}>
                            {t('rearrangement.mergeHud').replace('#{0}', `#${selectedElements[0] + 1}`).replace('#{1}', `#${selectedElements[1] + 1}`)}
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-choice front" onClick={() => handleJointConfirm('front')}>{t('common.front') || 'Front'}</button>
                            <button className="btn-choice back" onClick={() => handleJointConfirm('back')}>{t('common.back') || 'Back'}</button>
                            <button className="btn-icon-small" onClick={() => setShowJointOptions(false)}><X size={14} /></button>
                        </div>
                    </div>
                )}

                <div style={styles.elementList}>
                    {elements.map((element, index) => (
                        <div
                            key={element.id}
                            draggable={!isSimulating}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            style={styles.elementCard(draggedItem === element, currentSimulatingIndex === index, selectedElements.includes(index))}
                            className="element-card"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                <div style={{ cursor: 'pointer', display: 'flex' }} onClick={() => toggleSelection(index)}>
                                    {selectedElements.includes(index) ?
                                        <CheckCircle2 size={18} color="#3b82f6" /> :
                                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} />
                                    }
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#fff' }}>
                                        {element.elementName}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '600' }}>#{index + 1}</span>
                                        <span style={styles.categoryBadge(element.category)}>{element.category}</span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700' }}>
                                    <Clock size={12} />
                                    {element.duration.toFixed(2)}s
                                </div>
                                {!isSimulating && <GripVertical size={14} color="rgba(255,255,255,0.2)" className="drag-handle" />}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Panel: Simulation Preview */}
            <div style={styles.mainStage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                            <MonitorPlay size={24} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{t('rearrangement.simulationPreview')}</h3>
                            <span style={{ fontSize: '0.75rem', color: '#666' }}>
                                {currentProject ? currentProject.projectName : (t('common.noActiveProject') || 'No Active Project')}
                            </span>
                        </div>
                    </div>

                    <button
                        className={`pill-toggle ${showInfo ? 'active' : ''}`}
                        onClick={() => setShowInfo(!showInfo)}
                    >
                        <Info size={14} />
                        {showInfo ? t('rearrangement.hudOn') : t('rearrangement.hudOff')}
                    </button>
                </div>

                <div style={styles.videoContainer}>
                    {videoSrc ? (
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            controls={false}
                        />
                    ) : (
                        <div className="empty-video-state">
                            <MonitorPlay size={64} style={{ opacity: 0.1, marginBottom: '16px' }} />
                            <p style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#444' }}>{t('rearrangement.noReadyVideo')}</p>
                            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#333' }}>{t('rearrangement.loadInstruction')}</p>
                        </div>
                    )}

                    {isSimulating && showInfo && elements[currentSimulatingIndex] && (
                        <div className="simulation-overlay">
                            <div className="overlay-content">
                                <div className="overlay-badge">
                                    <RefreshCw size={14} className="spin" />
                                    {t('rearrangement.liveSimulation')}
                                </div>
                                <div className="overlay-title">
                                    <span className="index">#{currentSimulatingIndex + 1}</span>
                                    {elements[currentSimulatingIndex].elementName}
                                </div>
                                <div className="overlay-stats">
                                    <div className="stat">
                                        <Clock size={14} />
                                        <span>{elements[currentSimulatingIndex].duration.toFixed(2)}s</span>
                                    </div>
                                    <div className="stat-divider" />
                                    <div className="stat">
                                        <Tag size={14} />
                                        <span>{elements[currentSimulatingIndex].category}</span>
                                    </div>
                                </div>
                                <div className="progress-bar-container">
                                    <div className="progress-bar-fill" style={{ width: `${((currentSimulatingIndex + 1) / elements.length) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', padding: '10px 0 24px 0', flexShrink: 0 }}>
                    {!isSimulating ? (
                        <button
                            className="btn-playback start"
                            onClick={startSimulation}
                            disabled={!videoSrc || elements.length === 0}
                        >
                            <Play size={20} fill="currentColor" />
                            {t('rearrangement.startPreview')}
                        </button>
                    ) : (
                        <button
                            className="btn-playback stop"
                            onClick={stopSimulation}
                        >
                            <Square size={20} fill="currentColor" />
                            {t('rearrangement.stopSimulation')}
                        </button>
                    )}
                </div>
            </div>

            {/* Project Picker Modal */}
            {showProjectPicker && (
                <div className="modal-backdrop">
                    <div className="modal-content glass-panel scale-in">
                        <div className="modal-header">
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{t('rearrangement.selectProject')}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>{t('rearrangement.selectProjectSub')}</p>
                            </div>
                            <button className="btn-icon-small secondary" onClick={() => setShowProjectPicker(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            {availableProjects.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                                    <Folder size={48} style={{ marginBottom: '16px' }} />
                                    <p>{t('rearrangement.noProjects')}</p>
                                </div>
                            ) : (
                                availableProjects.map(p => (
                                    <button
                                        key={p.id}
                                        className={`project-item ${currentProject?.projectName === p.projectName ? 'active' : ''}`}
                                        onClick={() => handleProjectSelect(p.projectName)}
                                    >
                                        <div className="item-icon">
                                            <LayoutGrid size={20} />
                                        </div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{p.projectName}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>
                                                {p.measurements?.length || 0} Elements • {p.videoName}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="chevron" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

                .btn-icon {
                    width: 42px;
                    height: 42px;
                    border: none;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon.primary { background: #3b82f6; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
                .btn-icon.secondary { background: rgba(255, 255, 255, 0.05); color: #888; border: 1px solid rgba(255, 255, 255, 0.05); }
                .btn-icon:hover { transform: translateY(-2px); }
                .btn-icon.primary:hover { background: #2563eb; }
                .btn-icon.secondary:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }

                .btn-segmented {
                    flex: 1;
                    padding: 10px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    background: rgba(255, 255, 255, 0.03);
                    color: #fff;
                    border-radius: 10px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    transition: all 0.2s;
                }
                .btn-segmented:hover { background: rgba(255, 255, 255, 0.08); }

                .btn-joint {
                    width: 100%;
                    padding: 12px;
                    border: 1px dashed rgba(59, 130, 246, 0.3);
                    background: rgba(59, 130, 246, 0.05);
                    color: #3b82f6;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-joint.active { border-style: solid; background: #3b82f6; color: white; }
                .btn-joint:disabled { opacity: 0.5; cursor: not-allowed; border-color: rgba(255,255,255,0.1); color: #444; background: transparent; }

                .element-card:hover:not(:active) {
                    transform: translateX(4px);
                    background-color: rgba(255, 255, 255, 0.06);
                }
                .element-card:active { cursor: grabbing; }

                .glass-panel {
                    background: rgba(20, 20, 24, 0.9);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                }

                .joint-options {
                    padding: 16px;
                    margin-bottom: 4px;
                }

                .btn-choice {
                    flex: 1;
                    padding: 8px;
                    border: none;
                    border-radius: 8px;
                    color: white;
                    font-weight: 600;
                    font-size: 0.8rem;
                    cursor: pointer;
                }
                .btn-choice.front { background: #10b981; }
                .btn-choice.back { background: #3b82f6; }

                .pill-toggle {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 6px 12px;
                    border-radius: 20px;
                    color: #666;
                    font-size: 0.75rem;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .pill-toggle.active { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); color: #3b82f6; }

                .empty-video-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }

                .btn-playback {
                    padding: 14px 40px;
                    border-radius: 30px;
                    border: none;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    box-shadow: 0 10px 20px rgba(0,0,0,0.3);
                }
                .btn-playback:hover:not(:disabled) { transform: scale(1.05) translateY(-2px); }
                .btn-playback:disabled { opacity: 0.3; cursor: not-allowed; }
                .btn-playback.start { background: #3b82f6; color: white; }
                .btn-playback.stop { background: #ef4444; color: white; }

                .simulation-overlay {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(0deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0) 50%);
                    pointer-events: none;
                    display: flex;
                    align-items: flex-end;
                    padding: 40px;
                }
                
                .overlay-content {
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .overlay-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: #3b82f6;
                    color: white;
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-size: 0.65rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    margin-bottom: 12px;
                }

                .overlay-title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    color: white;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .overlay-title .index {
                    opacity: 0.3;
                    font-style: italic;
                }

                .overlay-stats {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-bottom: 24px;
                }

                .stat {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 0.9rem;
                    color: #aaa;
                    font-weight: 500;
                }

                .stat-divider {
                    width: 4px;
                    height: 4px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                }

                .progress-bar-container {
                    width: 100%;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                    overflow: hidden;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: #3b82f6;
                    transition: width 0.3s ease;
                }

                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0,0,0,0.8);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(8px);
                }

                .modal-content {
                    width: 440px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }

                .modal-body {
                    flex: 1;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                .project-item {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 14px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 16px;
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .project-item:hover { background: rgba(255, 255, 255, 0.06); transform: translateX(4px); }
                .project-item.active { background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.3); }
                .project-item .item-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); display: flex; align-items: center; justify-content: center; color: #666; transition: all 0.2s; }
                .project-item:hover .item-icon { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .project-item .chevron { opacity: 0; transform: translateX(-10px); transition: all 0.2s; }
                .project-item:hover .chevron { opacity: 1; transform: translateX(0); color: #3b82f6; }

                .spin { animation: spin 2s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                
                .scale-in { animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
            `}</style>
        </div>
    );
}

export default ElementRearrangement;
