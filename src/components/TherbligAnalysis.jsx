import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../contexts/DialogContext';

import { THERBLIGS } from '../constants/therbligs.jsx';
import { getAllProjects } from '../utils/database';
import { WORKSTATION_OBJECTS, checkCollision, calculatePath, calculateTotalDistance, analyzeReachZones, calculateEfficiencyScore, snapToGrid } from '../utils/workstationSimulator';
import AIChatOverlay from './features/AIChatOverlay';
import { Bot, PlayCircle, StopCircle } from 'lucide-react';

function TherbligAnalysis({ measurements = [] }) {
    const { t } = useTranslation();
    const { showAlert, showConfirm } = useDialog();

    const [icons, setIcons] = useState([]);
    const [selectedTherblig, setSelectedTherblig] = useState(null);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projects, setProjects] = useState([]);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [draggingId, setDraggingId] = useState(null);

    // Digital Twin State
    const [workstationObjects, setWorkstationObjects] = useState([]);
    const [selectedObject, setSelectedObject] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [animationProgress, setAnimationProgress] = useState(0);
    const [showGrid, setShowGrid] = useState(true);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [efficiencyMetrics, setEfficiencyMetrics] = useState(null);

    // AI Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);

    // AI Context
    const aiContext = {
        type: 'therblig_analysis',
        data: {
            icons, // Placed Therbligs
            workstationObjects, // Layout objects
            efficiencyMetrics,
            isAnimating
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setBackgroundImage(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleCanvasClick = (e) => {
        if (!selectedTherblig) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newIcon = {
            id: Date.now(),
            code: selectedTherblig,
            x,
            y,
        };

        setIcons([...icons, newIcon]);
    };

    const handleIconMouseDown = (id, e) => {
        e.stopPropagation();
        setDraggingId(id);
    };

    const handleCanvasMouseMove = (e) => {
        if (draggingId) {
            const rect = containerRef.current.getBoundingClientRect();
            let x = e.clientX - rect.left;
            let y = e.clientY - rect.top;

            // Apply snap to grid if enabled
            if (snapEnabled) {
                x = snapToGrid(x);
                y = snapToGrid(y);
            }

            // Check if dragging a Therblig icon
            const iconIndex = icons.findIndex(icon => icon.id === draggingId);
            if (iconIndex !== -1) {
                setIcons(icons.map(icon =>
                    icon.id === draggingId ? { ...icon, x, y } : icon
                ));
            }

            // Check if dragging a workstation object
            const objIndex = workstationObjects.findIndex(obj => obj.id === draggingId);
            if (objIndex !== -1) {
                const updatedObj = { ...workstationObjects[objIndex], x, y };
                setWorkstationObjects(workstationObjects.map(obj =>
                    obj.id === draggingId ? updatedObj : obj
                ));
            }
        }
    };

    const handleCanvasMouseUp = () => {
        setDraggingId(null);
    };

    const handleRemoveIcon = (id, e) => {
        e.stopPropagation();
        setIcons(icons.filter(icon => icon.id !== id));
    };

    const handleClearAll = async () => {
        if (await showConfirm(t('common.confirm'), 'Are you sure you want to clear all icons?')) {
            setIcons([]);
        }
    };

    const handleOpenGenerateModal = async () => {
        try {
            const allProjects = await getAllProjects();
            // Sort by last modified
            allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

            const mappedProjects = allProjects.map(p => ({
                id: p.id,
                videoName: p.videoName || p.projectName,
                timestamp: p.lastModified,
                measurements: p.measurements || []
            }));

            setProjects(mappedProjects);
            setShowProjectModal(true);
        } catch (error) {
            console.error('Error fetching projects:', error);
            await showAlert(t('common.error'), 'Failed to fetch saved projects. Using current measurements only.');
            generateFlowFromMeasurements(measurements);
        }
    };

    const generateFlowFromMeasurements = async (targetMeasurements) => {
        if (!targetMeasurements || targetMeasurements.length === 0) {
            await showAlert(t('common.info'), 'No measurements available to generate flow.');
            return;
        }

        if (await showConfirm(t('common.confirm'), 'This will clear current icons and generate a new flow. Continue?')) {
            const newIcons = [];
            const containerWidth = containerRef.current ? containerRef.current.clientWidth : 800;
            const startX = 50;
            const startY = 50;
            const gapX = 60;
            const gapY = 80;

            let currentX = startX;
            let currentY = startY;
            let direction = 1; // 1 for right, -1 for left

            targetMeasurements.forEach((m, index) => {
                if (m.therblig && THERBLIGS[m.therblig]) {
                    newIcons.push({
                        id: Date.now() + index,
                        code: m.therblig,
                        x: currentX,
                        y: currentY,
                        sequence: index + 1,
                        elementName: m.elementName,
                        category: m.category
                    });

                    // Calculate next position
                    if ((direction === 1 && currentX + gapX > containerWidth - 50) ||
                        (direction === -1 && currentX - gapX < 50)) {
                        currentY += gapY;
                        direction *= -1;
                    } else {
                        currentX += gapX * direction;
                    }
                }
            });

            if (newIcons.length === 0) {
                await showAlert(t('common.warning'), 'No measurements have valid Therblig codes assigned. Please edit your measurements in the Dashboard to assign Therblig codes before generating a flow.');
            }

            setIcons(newIcons);
            setShowProjectModal(false);
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#005a9e';
            case 'Non value-added': return '#bfa900';
            case 'Waste': return '#c50f1f';
            default: return '#555';
        }
    };

    // Expose workstation data to Mavi AI
    useEffect(() => {
        const metrics = calculateEfficiencyScore(icons, workstationObjects);
        const distance = calculateTotalDistance(icons);
        const reach = analyzeReachZones(icons, workstationObjects);

        window.__maviWorkstation = {
            objects: workstationObjects,
            icons: icons,
            metrics: {
                efficiencyScore: metrics,
                totalDistance: distance,
                reachAnalysis: reach
            }
        };

        return () => {
            delete window.__maviWorkstation;
        };
    }, [icons, workstationObjects]);

    // Animation effect

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '10px', gap: '10px', backgroundColor: 'var(--bg-primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>🏗️ Digital Twin Workstation</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                        id="layout-upload"
                    />
                    <button
                        className="btn"
                        onClick={handleOpenGenerateModal}
                        style={{ backgroundColor: '#0a5', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                        title="Generate flow from measurements"
                    >
                        Generate Flow
                    </button>
                    <button
                        className="btn"
                        onClick={() => document.getElementById('layout-upload').click()}
                        style={{ backgroundColor: 'var(--accent-blue)', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                    >
                        Upload Layout
                    </button>
                    <button
                        className="btn"
                        onClick={handleClearAll}
                        style={{ backgroundColor: '#c50f1f', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
                    >
                        Clear All
                    </button>
                    <button
                        className="btn"
                        onClick={() => setIsAnimating(!isAnimating)}
                        disabled={icons.length === 0}
                        style={{
                            backgroundColor: isAnimating ? '#c50f1f' : '#0a5',
                            color: 'white',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: icons.length === 0 ? 'not-allowed' : 'pointer',
                            opacity: icons.length === 0 ? 0.5 : 1
                        }}
                    >
                        {isAnimating ? '⏸️ Stop' : '▶️ Animate'}
                    </button>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                        />
                        Grid
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)' }}>
                        <input
                            type="checkbox"
                            checked={snapEnabled}
                            onChange={(e) => setSnapEnabled(e.target.checked)}
                        />
                        Snap
                    </label>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            boxShadow: '0 4px 12px rgba(118, 75, 162, 0.3)',
                            marginLeft: '10px'
                        }}
                    >
                        <Bot size={18} />
                        AI Analyst
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '10px', overflow: 'hidden' }}>
                {/* Left Sidebar - Therbligs */}
                <div style={{ width: '200px', backgroundColor: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Therbligs Section Removed as per user request */}


                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem', color: 'var(--text-secondary)' }}>Workstation Objects</h3>
                    {Object.entries(WORKSTATION_OBJECTS).map(([key, obj]) => (
                        <div
                            key={key}
                            onClick={() => {
                                const newObj = {
                                    id: Date.now(),
                                    ...obj,
                                    x: 100,
                                    y: 100
                                };
                                setWorkstationObjects([...workstationObjects, newObj]);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                backgroundColor: 'transparent',
                                border: '1px solid transparent'
                            }}
                        >
                            <div style={{ fontSize: '1.2rem' }}>{obj.icon}</div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{obj.label}</span>
                        </div>
                    ))}
                </div>

                {/* Canvas Area */}
                <div
                    ref={containerRef}
                    onClick={handleCanvasClick}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    style={{
                        flex: 1,
                        backgroundColor: '#1a1a1a',
                        borderRadius: '8px',
                        position: 'relative',
                        overflow: 'hidden',
                        cursor: selectedTherblig ? 'crosshair' : (draggingId ? 'grabbing' : 'default'),
                        backgroundRepeat: 'no-repeat, repeat', // repeat untuk grid
                        backgroundPosition: 'center',
                        // GABUNGKAN backgroundImage di sini:
                        backgroundImage: `
        ${showGrid ? `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), 
          linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)` : 'none'},
        ${backgroundImage ? `url(${backgroundImage})` : 'none'}
    `,
                        // GABUNGKAN backgroundSize di sini:
                        backgroundSize: `${showGrid ? '20px 20px' : 'auto'}, contain`
                    }}
                >
                    {!backgroundImage && icons.length === 0 && (
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#555', textAlign: 'center', pointerEvents: 'none' }}>
                            <p>Upload a layout image to start placing Therbligs</p>
                            <p style={{ fontSize: '0.8rem' }}>Or click "Generate Flow" to visualize measurements</p>
                        </div>
                    )}

                    {/* Connection Lines */}
                    <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {icons.map((icon, index) => {
                            if (index === icons.length - 1) return null;
                            const nextIcon = icons[index + 1];
                            return (
                                <line
                                    key={`line-${icon.id}`}
                                    x1={icon.x}
                                    y1={icon.y}
                                    x2={nextIcon.x}
                                    y2={nextIcon.y}
                                    stroke={getCategoryColor(icon.category)}
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                />
                            );
                        })}
                    </svg>

                    {icons.map((icon, index) => {
                        const therblig = THERBLIGS[icon.code];
                        return (
                            <div
                                key={icon.id}
                                style={{
                                    position: 'absolute',
                                    left: icon.x,
                                    top: icon.y,
                                    transform: 'translate(-50%, -50%)',
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `2px solid ${therblig.color}`,
                                    color: therblig.color,
                                    cursor: 'grab',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                                    zIndex: 1
                                }}
                                title={`${index + 1}. ${therblig.name} (Drag to move, Shift+Click to remove)`}
                                onMouseDown={(e) => handleIconMouseDown(icon.id, e)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (e.shiftKey) {
                                        handleRemoveIcon(icon.id, e);
                                    }
                                }}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ pointerEvents: 'none' }}>
                                    {therblig.icon}
                                </svg>
                                <span style={{
                                    position: 'absolute',
                                    top: '-15px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontSize: '0.7rem',
                                    color: '#fff',
                                    backgroundColor: '#333',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none'
                                }}>
                                    {index + 1}
                                </span>
                                {icon.elementName && (
                                    <span style={{
                                        position: 'absolute',
                                        bottom: '-20px',
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        fontSize: '0.7rem',
                                        color: '#fff',
                                        textShadow: '0 1px 2px black',
                                        whiteSpace: 'nowrap',
                                        pointerEvents: 'none'
                                    }}>
                                        {icon.elementName}
                                    </span>
                                )}
                            </div>
                        );
                    })}

                    {/* Workstation Objects */}
                    {workstationObjects.map((obj) => (
                        <div
                            key={obj.id}
                            style={{
                                position: 'absolute',
                                left: obj.x,
                                top: obj.y,
                                width: obj.width,
                                height: obj.height,
                                backgroundColor: obj.color,
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '2rem',
                                cursor: 'move',
                                border: selectedObject === obj.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                                zIndex: 2
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setSelectedObject(obj.id);
                                setDraggingId(obj.id);
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (e.shiftKey) {
                                    setWorkstationObjects(workstationObjects.filter(o => o.id !== obj.id));
                                }
                            }}
                            title={`${obj.label} (Shift+Click to remove)`}
                        >
                            {obj.icon}
                        </div>
                    ))}

                    {/* Animated Worker Position (during flow animation) */}
                    {isAnimating && icons.length > 1 && (() => {
                        const currentIndex = Math.floor(animationProgress * icons.length);
                        const nextIndex = (currentIndex + 1) % icons.length;
                        const localProgress = (animationProgress * icons.length) % 1;

                        const current = icons[currentIndex];
                        const next = icons[nextIndex];

                        const x = current.x + (next.x - current.x) * localProgress;
                        const y = current.y + (next.y - current.y) * localProgress;

                        return (
                            <div
                                style={{
                                    position: 'absolute',
                                    left: x,
                                    top: y,
                                    transform: 'translate(-50%, -50%)',
                                    width: '40px',
                                    height: '40px',
                                    backgroundColor: 'rgba(50, 205, 50, 0.8)',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.5rem',
                                    zIndex: 10,
                                    boxShadow: '0 0 20px rgba(50, 205, 50, 0.6)',
                                    pointerEvents: 'none',
                                    animation: 'pulse 1s infinite'
                                }}
                            >
                                🚶
                            </div>
                        );
                    })()}
                </div>

                {/* Right Sidebar - Metrics */}
                {(icons.length > 0 || workstationObjects.length > 0) && (
                    <div style={{ width: '250px', backgroundColor: 'var(--bg-secondary)', padding: '15px', borderRadius: '8px', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: 'var(--text-primary)' }}>📊 Metrics</h3>

                        {icons.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Therblig Flow</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                    <div>Total Steps: {icons.length}</div>
                                    {animationProgress > 0 && (
                                        <div>Progress: {Math.round(animationProgress * 100)}%</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {workstationObjects.length > 0 && (
                            <div>
                                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Layout</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div>Objects: {workstationObjects.length}</div>
                                    {workstationObjects.find(o => o.type === 'worker') && (
                                        <div style={{ color: '#0a5' }}>✓ Worker Positioned</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Project Selection Modal */}
            {showProjectModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: '#2a2a2a',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '400px',
                        maxHeight: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '15px',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select Data Source</h3>

                        <button
                            onClick={() => generateFlowFromMeasurements(measurements)}
                            style={{
                                padding: '12px',
                                backgroundColor: '#005a9e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span>Current Active Project</span>
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{measurements.length} items</span>
                        </button>

                        <div style={{ height: '1px', backgroundColor: '#444' }}></div>

                        <div style={{ overflowY: 'auto', maxHeight: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <h4 style={{ margin: '0 0 5px 0', fontSize: '0.9rem', color: '#aaa' }}>Saved Projects</h4>
                            {projects.length === 0 ? (
                                <div style={{ color: '#666', fontStyle: 'italic', padding: '10px', textAlign: 'center' }}>No saved projects found</div>
                            ) : (
                                projects.map(project => (
                                    <button
                                        key={project.id}
                                        onClick={() => generateFlowFromMeasurements(project.measurements)}
                                        style={{
                                            padding: '10px',
                                            backgroundColor: '#333',
                                            color: 'var(--text-primary)',
                                            border: '1px solid #444',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}
                                    >
                                        <span style={{ fontWeight: 'bold' }}>{project.videoName || 'Untitled'}</span>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888' }}>
                                            <span>{new Date(project.timestamp).toLocaleDateString()}</span>
                                            <span>{project.measurements ? project.measurements.length : 0} items</span>
                                        </div>
                                    </button>
                                ))
                            )}

                            <div style={{ height: '1px', backgroundColor: '#444', margin: '5px 0' }}></div>

                            <button
                                onClick={() => {
                                    // Generate demo measurements
                                    const demoMeasurements = [
                                        { elementName: 'Reach for Part', therblig: 'TE', category: 'Non value-added' },
                                        { elementName: 'Grasp Part', therblig: 'G', category: 'Value-added' },
                                        { elementName: 'Move to Fixture', therblig: 'TL', category: 'Value-added' },
                                        { elementName: 'Position Part', therblig: 'P', category: 'Value-added' },
                                        { elementName: 'Assemble 1', therblig: 'A', category: 'Value-added' },
                                        { elementName: 'Move Hands', therblig: 'TE', category: 'Non value-added' },
                                        { elementName: 'Grasp Screw', therblig: 'G', category: 'Value-added' },
                                        { elementName: 'Move to Hole', therblig: 'TL', category: 'Value-added' },
                                        { elementName: 'Assemble Screw', therblig: 'A', category: 'Value-added' },
                                        { elementName: 'Release Tool', therblig: 'RL', category: 'Value-added' }
                                    ];
                                    generateFlowFromMeasurements(demoMeasurements);
                                }}
                                style={{
                                    padding: '10px',
                                    backgroundColor: '#2b5d2b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontWeight: 'bold',
                                    marginTop: '5px'
                                }}
                            >
                                🧪 Use Demo Data
                            </button>
                        </div>

                        <button
                            onClick={() => setShowProjectModal(false)}
                            style={{
                                padding: '8px',
                                backgroundColor: 'transparent',
                                color: '#aaa',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                marginTop: '10px'
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* AI CHAT OVERLAY */}
            <AIChatOverlay
                visible={showChat}
                onClose={() => setShowChat(false)}
                context={aiContext}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                title="MAVi Therblig Analyst"
            />
        </div>
    );
}

export default TherbligAnalysis;
