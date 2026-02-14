import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
    ReactFlowProvider,
    addEdge,
    useNodesState,
    useEdgesState,
    Controls,
    Background,
    MiniMap,
    MarkerType,
    useReactFlow,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import { getAllProjects, saveStandardWorkLayoutData } from '../utils/database';
import { distance, pixelsToMeters, calculateEfficiencyScore } from '../utils/workstationSimulator';
import {
    Layout,
    Trash2,
    Save,
    Info,
    Play,
    RotateCcw,
    Zap,
    Move,
    Clock,
    Activity,
    RefreshCw,
    User,
    Package,
    Settings,
    CheckCircle,
    Archive,
    HelpCircle,
    MessageSquare,
    X,
    Diamond,
    Circle,
    Square,
    MousePointer2,
    GitCommit,
    Triangle,
    FileText,
    FileStack,
    Keyboard,
    StickyNote,
    Type,
    Eraser,
    Search,
    ChevronLeft,
    ChevronRight,
    Type as TextIcon,
    Database,
    Box,
    Grid,
    Layers,
    Share2,
    ArrowRight,
    Shuffle,
    Wind,
} from 'lucide-react';
import AIChatOverlay from './features/AIChatOverlay';

const iconMap = {
    User, Package, Settings, CheckCircle, Archive,
    Square, Circle, Diamond, Database, Box,
    Triangle, FileText, FileStack, Keyboard, StickyNote, Type, Layout,
    Share2, ArrowRight, Shuffle, Wind, MousePointer2, GitCommit, TextIcon
};

const CONNECTOR_TYPES = [
    { id: 'smoothstep', label: 'Dynamic Connector', icon: Share2, description: 'Bezier with rounded corners' },
    { id: 'step', label: 'Step Connector', icon: Shuffle, description: 'Orthogonal fixed style' },
    { id: 'straight', label: 'Straight Connector', icon: ArrowRight, description: 'Direct point-to-point' },
    { id: 'default', label: 'Bezier Connector', icon: Wind, description: 'Standard curved Bezier' },
];

// --- Custom Nodes ---

const BaseNode = ({ label, icon: Icon, color, selected, children, onLabelChange, onDelete, shape = 'rect' }) => {
    const getShapeStyles = () => {
        const base = {
            minWidth: '160px',
            minHeight: '80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative'
        };

        switch (shape) {
            case 'diamond':
                return {
                    ...base,
                    transform: 'rotate(45deg)',
                    width: '120px',
                    height: '120px',
                    minWidth: '120px',
                    borderRadius: '8px',
                };
            case 'ellipse':
                return {
                    ...base,
                    borderRadius: '50px',
                    minWidth: '140px',
                    padding: '16px 24px',
                };
            case 'parallelogram':
                return {
                    ...base,
                    transform: 'skew(-15deg)',
                    borderRadius: '4px',
                };
            case 'triangle':
                return {
                    ...base,
                    clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
                    height: '130px',
                };
            case 'pentagon':
                return {
                    ...base,
                    clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                    height: '130px',
                };
            case 'manual-input':
                return {
                    ...base,
                    clipPath: 'polygon(0% 25%, 100% 0%, 100% 100%, 0% 100%)',
                };
            case 'document':
                return {
                    ...base,
                    borderRadius: '2px 2px 24px 2px',
                };
            case 'predefined-process':
                return {
                    ...base,
                    borderRadius: '4px',
                };
            case 'text':
                return {
                    ...base,
                    background: 'transparent',
                    border: 'none',
                    backdropFilter: 'none',
                    minHeight: 'auto'
                };
            default: // rect
                return {
                    ...base,
                    borderRadius: '12px',
                };
        }
    };

    const shapeStyle = getShapeStyles();
    const isRotated = shape === 'diamond' || shape === 'parallelogram';
    const isDiamond = shape === 'diamond';
    const isParallelogram = shape === 'parallelogram';
    const isSpecialForm = ['triangle', 'pentagon', 'manual-input'].includes(shape);

    return (
        <div style={{
            ...shapeStyle,
            padding: isRotated ? '0' : '12px',
            background: shape === 'text' ? 'transparent' : 'rgba(23, 23, 26, 0.85)',
            backdropFilter: shape === 'text' ? 'none' : 'blur(12px)',
            border: shape === 'text'
                ? `2px dashed ${selected ? '#3b82f6' : 'transparent'}`
                : `2px solid ${selected ? '#3b82f6' : 'rgba(255, 255, 255, 0.1)'}`,
            boxShadow: (selected && shape !== 'text') ? '0 0 25px rgba(59, 130, 246, 0.5)' : (shape !== 'text' ? '0 8px 32px rgba(0, 0, 0, 0.3)' : 'none'),
            color: '#fff',
            cursor: 'move',
        }}>
            {shape === 'predefined-process' && (
                <>
                    <div style={{ position: 'absolute', left: '15px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ position: 'absolute', right: '15px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.15)' }} />
                </>
            )}

            {shape === 'document' && iconMap['FileStack'] === Icon && (
                <>
                    <div style={{ position: 'absolute', top: '-4px', left: '4px', right: '-4px', bottom: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '2px 2px 24px 2px', zIndex: -1 }} />
                    <div style={{ position: 'absolute', top: '-8px', left: '8px', right: '-8px', bottom: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '2px 2px 24px 2px', zIndex: -2 }} />
                </>
            )}
            {/* Inner content wrapper to reverse rotation/skew for text/icons */}
            <div style={{
                transform: isDiamond ? 'rotate(-45deg)' : isParallelogram ? 'skew(15deg)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: isDiamond ? '20px' : '0'
            }}>
                {selected && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        style={{
                            position: 'absolute',
                            top: isDiamond ? '-20px' : '-10px',
                            right: isDiamond ? '-20px' : '-10px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#ef4444',
                            border: '2px solid #fff',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 10,
                            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                )}

                {/* Connection Handles (Target) */}
                <Handle type="target" position={Position.Top} id="t" style={{ background: '#3b82f6', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', left: '40%' }} />
                <Handle type="target" position={Position.Bottom} id="b_t" style={{ background: '#3b82f6', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', left: '40%' }} />
                <Handle type="target" position={Position.Left} id="l_t" style={{ background: '#3b82f6', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', top: '40%' }} />
                <Handle type="target" position={Position.Right} id="r_t" style={{ background: '#3b82f6', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', top: '40%' }} />

                <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '8px', justifyContent: isDiamond ? 'center' : 'flex-start' }}>
                    <div style={{
                        width: isDiamond ? '24px' : '32px',
                        height: isDiamond ? '24px' : '32px',
                        borderRadius: '8px',
                        background: `${color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: color,
                        flexShrink: 0
                    }}>
                        <Icon size={isDiamond ? 14 : 18} />
                    </div>
                    {!isDiamond && (
                        <input
                            value={label}
                            onChange={(e) => onLabelChange(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                borderBottom: selected ? `1px solid ${color}` : '1px solid transparent',
                                color: '#fff',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                width: '100%',
                                outline: 'none',
                                padding: '2px 0'
                            }}
                            placeholder="Name..."
                        />
                    )}
                </div>

                {isDiamond && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', textAlign: 'center' }}>{label}</span>
                )}


                {children}

                {/* Connection Handles (Source) */}
                <Handle type="source" position={Position.Top} id="t_s" style={{ background: '#10b981', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', left: '60%' }} />
                <Handle type="source" position={Position.Bottom} id="b" style={{ background: '#10b981', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', left: '60%' }} />
                <Handle type="source" position={Position.Left} id="l" style={{ background: '#10b981', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', top: '60%' }} />
                <Handle type="source" position={Position.Right} id="r" style={{ background: '#10b981', width: '10px', height: '10px', zIndex: 10, visibility: activeTool === 'connector' ? 'visible' : 'hidden', top: '60%' }} />
            </div>
        </div>
    );
};

const LayoutNode = ({ data, selected }) => {
    const Icon = data.icon || Box;
    return (
        <BaseNode
            label={data.label}
            icon={Icon}
            color={data.color || '#3b82f6'}
            selected={selected}
            onLabelChange={data.onLabelChange}
            onDelete={data.onDelete}
            shape={data.shape}
        >
            {data.description && (
                <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.5)', textAlign: 'center' }}>
                    {data.description}
                </div>
            )}

            {/* Waste Indicator */}
            {data.hasWaste && (
                <div style={{
                    marginTop: '4px',
                    padding: '2px 8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    animation: 'pulse 2s infinite'
                }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>Waste Detected</span>
                </div>
            )}

            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.6; transform: scale(0.98); }
                    50% { opacity: 1; transform: scale(1.02); }
                    100% { opacity: 0.6; transform: scale(0.98); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </BaseNode>
    );
};

const nodeTypes = {
    layoutItem: LayoutNode
};

// --- Main Component ---

const SpaghettiChartContent = () => {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const reactFlowWrapper = useRef(null);
    const { screenToFlowPosition, getViewport } = useReactFlow();
    const { showAlert, showConfirm, showPrompt } = useDialog();

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);

    // AI & Help State
    const [isSimulating, setIsSimulating] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isApplyingUShape, setIsApplyingUShape] = useState(false);
    const [isHelpVisible, setIsHelpVisible] = useState(false);
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [chatHistory, setChatHistory] = useState([]); // Added chat history state
    const [scanPosition, setScanPosition] = useState(-20);
    const [agentPos, setAgentPos] = useState(null);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [taktTime, setTaktTime] = useState(60); // Default 60s
    const [activeRibbonTab, setActiveRibbonTab] = useState('home'); // home, process, design
    const [activeTool, setActiveTool] = useState('pointer'); // pointer, connector, text
    const [connectorType, setConnectorType] = useState('smoothstep');
    const [isConnectorMenuOpen, setIsConnectorMenuOpen] = useState(false);
    const [isStencilCollapsed, setIsStencilCollapsed] = useState(false);
    const [stencilSearch, setStencilSearch] = useState('');
    const [isPropertiesCollapsed, setIsPropertiesCollapsed] = useState(false);
    const [selectedNodeData, setSelectedNodeData] = useState(null);
    const [analytics, setAnalytics] = useState({
        totalDistance: 0,
        efficiency: 0,
        cycleTime: 0,
        manualTime: 0,
        machineTime: 0,
        walkingTime: 0,
        isTaktViolated: false
    });

    const [headerInfo, setHeaderInfo] = useState({
        partName: '',
        partNo: '',
        machine: '',
        author: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const load = async () => {
            const allProjects = await getAllProjects();
            setProjects(allProjects);

            if (currentProject) {
                const project = allProjects.find(p => p.id === currentProject.id);
                if (project) {
                    setSelectedProjectId(project.id.toString());
                    setSelectedProject(project);
                }
            }
        };
        load();
    }, [currentProject]);

    useEffect(() => {
        if (selectedProjectId) {
            const project = projects.find(p => p.id.toString() === selectedProjectId);
            if (project) {
                setSelectedProject(project);
                if (project.standardWorkLayoutData) {
                    const data = project.standardWorkLayoutData;
                    if (data.headerInfo) setHeaderInfo(data.headerInfo);
                    if (data.nodes) setNodes(data.nodes || []);
                    if (data.edges) setEdges(data.edges || []);
                } else {
                    setNodes([]);
                    setEdges([]);
                }
            }
        }
    }, [selectedProjectId, projects, setNodes, setEdges]);

    // Calculate Analytics
    useEffect(() => {
        if (nodes.length < 2 || edges.length === 0) {
            setAnalytics({ totalDistance: 0, efficiency: 0, cycleTime: 0 });
            return;
        }
        let totalDist = 0;
        edges.forEach(edge => {
            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);
            if (source && target) {
                totalDist += distance(source.position, target.position);
            }
        });

        const distInMeters = pixelsToMeters(totalDist);
        const walkingTime = distInMeters / 1.1; // 1.1 m/s average speed
        const cycleTime = walkingTime;
        const efficiency = calculateEfficiencyScore(nodes.map(n => ({ ...n.position, width: 100, height: 60, id: n.id, type: 'item' })), []);

        setAnalytics({
            totalDistance: distInMeters.toFixed(1),
            efficiency: Math.round(efficiency),
            cycleTime: cycleTime.toFixed(1),
            walkingTime: walkingTime.toFixed(1),
            isTaktViolated: cycleTime > taktTime
        });

        // Mark nodes with waste if they are very far apart - only update if changed
        setNodes(nds => {
            let changed = false;
            const updatedNodes = nds.map(node => {
                const nodeEdges = edges.filter(e => e.source === node.id || e.target === node.id);
                let tooFar = false;
                nodeEdges.forEach(edge => {
                    const otherId = edge.source === node.id ? edge.target : edge.source;
                    const other = nds.find(n => n.id === otherId);
                    if (other && distance(node.position, other.position) > 400) tooFar = true;
                });

                if (node.data.hasWaste !== tooFar) {
                    changed = true;
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            hasWaste: tooFar
                        }
                    };
                }
                return node;
            });
            return changed ? updatedNodes : nds;
        });
    }, [nodes, edges, taktTime]);

    const runAIUpdate = useCallback(() => {
        if (nodes.length < 2) return;
        setIsOptimizing(true);
        setScanPosition(-10);

        let scanStart = null;
        const scanDuration = 2000;

        const animateScan = (time) => {
            if (!scanStart) scanStart = time;
            const progress = (time - scanStart) / scanDuration;

            if (progress < 1) {
                setScanPosition(progress * 120);
                requestAnimationFrame(animateScan);
            } else {
                setScanPosition(-10);
                setIsOptimizing(false);

                setNodes((nds) => {
                    const newNodes = [...nds];
                    const K = 200;
                    const iterations = 50;

                    for (let i = 0; i < iterations; i++) {
                        newNodes.forEach((n1, i1) => {
                            newNodes.forEach((n2, i2) => {
                                if (i1 === i2) return;
                                const dx = n1.position.x - n2.position.x;
                                const dy = n1.position.y - n2.position.y;
                                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                                if (dist < 150) {
                                    const force = (K * K) / dist;
                                    n1.position.x += (dx / dist) * force * 0.1;
                                    n1.position.y += (dy / dist) * force * 0.1;
                                }
                            });
                        });

                        edges.forEach(edge => {
                            const sourceIdx = newNodes.findIndex(n => n.id === edge.source);
                            const targetIdx = newNodes.findIndex(n => n.id === edge.target);
                            if (sourceIdx !== -1 && targetIdx !== -1) {
                                const n1 = newNodes[sourceIdx];
                                const n2 = newNodes[targetIdx];
                                const dx = n2.position.x - n1.position.x;
                                const dy = n2.position.y - n1.position.y;
                                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                                const force = (dist * dist) / K;
                                n1.position.x += (dx / dist) * force * 0.05;
                                n1.position.y += (dy / dist) * force * 0.05;
                                n2.position.x -= (dx / dist) * force * 0.05;
                                n2.position.y -= (dy / dist) * force * 0.05;
                            }
                        });
                    }
                    return [...newNodes];
                });
            }
        };
        requestAnimationFrame(animateScan);
    }, [nodes, edges, setNodes]);

    const runUShapeUpdate = useCallback(() => {
        if (nodes.length < 2) return;
        setIsApplyingUShape(true);

        const centerX = 500;
        const centerY = 350;
        const width = 600;
        const height = 400;

        // Sort nodes based on flow if possible
        const sequence = [];
        if (edges.length > 0) {
            let current = nodes.find(n => !edges.some(e => e.target === n.id)) || nodes[0];
            while (current && sequence.length < nodes.length) {
                sequence.push(current);
                const nextEdge = edges.find(e => e.source === current.id);
                current = nextEdge ? nodes.find(n => n.id === nextEdge.target) : null;
            }
        }

        // Fill remaining nodes if sequence is incomplete
        nodes.forEach(n => { if (!sequence.includes(n)) sequence.push(n); });

        const nodeCount = sequence.length;
        const targetPositions = sequence.map((node, i) => {
            // U-shape logic: Go down, then across, then up
            const t = i / (nodeCount - 1);
            let x, y;

            if (t <= 0.4) { // Left leg going down
                const segmentT = t / 0.4;
                x = centerX - width / 2;
                y = centerY - height / 2 + segmentT * height;
            } else if (t <= 0.6) { // Bottom curve/horizontal
                const segmentT = (t - 0.4) / 0.2;
                x = centerX - width / 2 + segmentT * width;
                y = centerY + height / 2;
            } else { // Right leg going up
                const segmentT = (t - 0.6) / 0.4;
                x = centerX + width / 2;
                y = centerY + height / 2 - segmentT * height;
            }

            return { id: node.id, x, y };
        });

        // Animate nodes to target positions
        let start = null;
        const duration = 1000;
        const initialNodes = [...nodes];

        const animate = (time) => {
            if (!start) start = time;
            const progress = Math.min((time - start) / duration, 1);
            const ease = progress * (2 - progress);

            setNodes(nds => nds.map(node => {
                const initial = initialNodes.find(n => n.id === node.id);
                const target = targetPositions.find(tp => tp.id === node.id);
                if (initial && target) {
                    return {
                        ...node,
                        position: {
                            x: initial.position.x + (target.x - initial.position.x) * ease,
                            y: initial.position.y + (target.y - initial.position.y) * ease
                        }
                    };
                }
                return node;
            }));

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setIsApplyingUShape(false);
            }
        };

        requestAnimationFrame(animate);
    }, [nodes, edges, setNodes]);

    const runSimulation = () => {
        if (edges.length === 0) return;
        setIsSimulating(true);
        setSimulationProgress(0);

        let startTime = null;
        const duration = 2000 * edges.length; // 2 seconds per edge

        const animate = (time) => {
            if (!startTime) startTime = time;
            const progress = (time - startTime) / duration;

            if (progress >= 1) {
                setIsSimulating(false);
                setAgentPos(null);
                return;
            }

            setSimulationProgress(progress);

            // Calculate current edge and position
            const edgeIndex = Math.floor(progress * edges.length);
            const edgeProgress = (progress * edges.length) % 1;
            const edge = edges[edgeIndex];

            const source = nodes.find(n => n.id === edge.source);
            const target = nodes.find(n => n.id === edge.target);

            if (source && target) {
                const x = source.position.x + (target.position.x - source.position.x) * edgeProgress;
                const y = source.position.y + (target.position.y - source.position.y) * edgeProgress;
                setAgentPos({ x, y });
            }

            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    };


    const onConnect = useCallback((params) => {
        setEdges((eds) => addEdge({
            ...params,
            type: connectorType,
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
            style: { stroke: '#3b82f6', strokeWidth: 3 }
        }, eds));
    }, [setEdges, connectorType]);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);


    const onLabelChange = useCallback((id, label) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            label,
                        },
                    };
                }
                return node;
            })
        );
    }, [setNodes]);

    const onDeleteNode = useCallback((id) => {
        setNodes((nds) => nds.filter((node) => node.id !== id));
        setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    }, [setNodes, setEdges]);

    // Update nodes with handlers when they are loaded or created
    useEffect(() => {
        setNodes((nds) => {
            let changed = false;
            const updated = nds.map((node) => {
                // Check if handlers are already attached to avoid unnecessary updates
                if (node.data.onLabelChange && node.data.onDelete) return node;

                changed = true;
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onLabelChange: (label) => onLabelChange(node.id, label),
                        onDelete: () => onDeleteNode(node.id)
                    },
                };
            });
            return changed ? updated : nds;
        });
    }, [onLabelChange, onDeleteNode, setNodes]);

    const onDrop = useCallback((event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData('application/reactflow');
        const itemDataStr = event.dataTransfer.getData('application/layoutitem');

        if (!type || !itemDataStr) return;
        const itemData = JSON.parse(itemDataStr);

        if (itemData.isConnector) {
            setConnectorType(itemData.connectorType);
            setActiveTool('connector');
            return;
        }

        const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
        });

        const id = `${itemData.id}-${Date.now()}`;
        const newNode = {
            id,
            type: 'layoutItem',
            position,
            data: {
                label: itemData.label,
                icon: iconMap[itemData.iconRef] || Box,
                iconRef: itemData.iconRef,
                color: itemData.color,
                shape: itemData.shape,
                description: itemData.description,
                onLabelChange: (label) => onLabelChange(id, label),
                onDelete: () => onDeleteNode(id)
            },
        };

        setNodes((nds) => nds.concat(newNode));
    }, [screenToFlowPosition, setNodes, iconMap, onLabelChange, onDeleteNode, setConnectorType, setActiveTool]);

    const handleSave = async () => {
        if (!selectedProject) return;
        setSaveStatus('saving');
        try {
            const layoutData = {
                headerInfo,
                nodes,
                edges,
                updatedAt: new Date().toISOString()
            };
            await saveStandardWorkLayoutData(selectedProject.id, layoutData);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
        }
    };

    const clearCanvas = async () => {
        if (await showConfirm(t('spaghettiChart.toolbox.clear') + '?')) {
            setNodes([]);
            setEdges([]);
        }
    };

    const HelpDialog = () => (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
        }}>
            <div style={{
                width: '600px',
                background: '#1a1a1e',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{t('spaghettiChart.helpGuide.title')}</h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.4)' }}>{t('spaghettiChart.helpGuide.subtitle')}</p>
                    </div>
                    <button onClick={() => setIsHelpVisible(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>
                <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {[1, 2, 3, 4, 5].map(step => (
                        <div key={step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', fontWeight: 'bold', flexShrink: 0 }}>
                                {step}
                            </div>
                            <p style={{ margin: 0, fontSize: '0.95rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.5' }}>
                                {t(`spaghettiChart.helpGuide.step${step}`)}
                            </p>
                        </div>
                    ))}
                </div>
                <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', textAlign: 'right' }}>
                    <button
                        onClick={() => setIsHelpVisible(false)}
                        style={{ padding: '10px 24px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );

    const toolboxItems = [
        {
            category: 'Connectors',
            items: CONNECTOR_TYPES.map(c => ({
                id: `conn-${c.id}`,
                label: c.label,
                icon: c.icon,
                color: '#3b82f6',
                isConnector: true,
                connectorType: c.id
            }))
        },
        {
            category: 'General Shapes',
            items: [
                { id: 'plain-text', label: 'Plain Text', icon: Type, iconRef: 'Type', color: '#94a3b8', shape: 'text' },
                { id: 'rectangle', label: 'Rectangle', icon: Square, iconRef: 'Square', color: '#3b82f6', shape: 'rect' },
                { id: 'oval', label: 'Oval', icon: Circle, iconRef: 'Circle', color: '#10b981', shape: 'ellipse' },
                { id: 'triangle', label: 'Triangle', icon: Triangle, iconRef: 'Triangle', color: '#f59e0b', shape: 'triangle' },
                { id: 'pentagon', label: 'Pentagon', icon: GitCommit, iconRef: 'GitCommit', color: '#ec4899', shape: 'pentagon' },
            ]
        },
        {
            category: 'Flowchart',
            items: [
                { id: 'process', label: 'Process', icon: Square, iconRef: 'Square', color: '#3b82f6', shape: 'rect' },
                { id: 'predefined', label: 'Predefined Process', icon: Layout, iconRef: 'Layout', color: '#6366f1', shape: 'predefined-process' },
                { id: 'decision', label: 'Decision', icon: Diamond, iconRef: 'Diamond', color: '#f59e0b', shape: 'diamond' },
                { id: 'terminator', label: 'Terminator', icon: Circle, iconRef: 'Circle', color: '#10b981', shape: 'ellipse' },
                { id: 'document', label: 'Document', icon: FileText, iconRef: 'FileText', color: '#8b5cf6', shape: 'document' },
                { id: 'multi-document', label: 'Multi-Document', icon: FileStack, iconRef: 'FileStack', color: '#a855f7', shape: 'document' },
                { id: 'manual-input', label: 'Manual Input', icon: Keyboard, iconRef: 'Keyboard', color: '#64748b', shape: 'manual-input' },
                { id: 'data', label: 'Data', icon: Database, iconRef: 'Database', color: '#8b5cf6', shape: 'parallelogram' },
            ]
        },
        {
            category: 'Industry',
            items: [
                { id: 'station', label: t('spaghettiChart.toolbox.station'), icon: User, iconRef: 'User', color: '#3b82f6', shape: 'rect', description: 'Human-Centric Worker' },
                { id: 'material', label: t('spaghettiChart.toolbox.material'), icon: Package, iconRef: 'Package', color: '#10b981', shape: 'rect', description: 'Logistics Unit' },
                { id: 'machine', label: t('spaghettiChart.toolbox.machine'), icon: Settings, iconRef: 'Settings', color: '#f59e0b', shape: 'rect', description: 'Value-Add Equipment' },
                { id: 'qc', label: t('spaghettiChart.toolbox.qc'), icon: CheckCircle, iconRef: 'CheckCircle', color: '#ef4444', shape: 'rect', description: 'Zero-Defect Quality' },
            ]
        }
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a0c', color: '#fff', overflow: 'hidden' }}>
            {/* --- VISIO RIBBON --- */}
            <div style={{ padding: '8px 24px', background: 'rgba(23, 23, 26, 0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', zIndex: 100 }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '32px', marginBottom: '8px' }}>
                    {['home', 'insert', 'design', 'process'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveRibbonTab(tab)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: activeRibbonTab === tab ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                fontSize: '0.85rem',
                                fontWeight: '700',
                                textTransform: 'capitalize',
                                cursor: 'pointer',
                                padding: '4px 0',
                                borderBottom: activeRibbonTab === tab ? '2px solid #3b82f6' : '2px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', height: '64px' }}>
                    {activeRibbonTab === 'home' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
                                    <button onClick={() => setActiveTool('pointer')} style={{ p: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: activeTool === 'pointer' ? 'rgba(59, 130, 246, 0.4)' : 'transparent', border: activeTool === 'pointer' ? '1px solid #3b82f6' : 'none', color: '#fff', cursor: 'pointer' }} title="Pointer Tool"><MousePointer2 size={20} /></button>

                                    <div style={{ position: 'relative' }}>
                                        <button
                                            onClick={() => {
                                                if (activeTool !== 'connector') setActiveTool('connector');
                                                setIsConnectorMenuOpen(!isConnectorMenuOpen);
                                            }}
                                            style={{ p: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: activeTool === 'connector' ? 'rgba(59, 130, 246, 0.4)' : 'transparent', border: activeTool === 'connector' ? '1px solid #3b82f6' : 'none', color: '#fff', cursor: 'pointer' }}
                                            title="Connector Tool"
                                        >
                                            <GitCommit size={20} />
                                        </button>

                                        {isConnectorMenuOpen && (
                                            <div style={{ position: 'absolute', top: '44px', left: '0', background: '#1a1a1e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '8px', zIndex: 1000, minWidth: '180px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
                                                {CONNECTOR_TYPES.map(type => (
                                                    <button
                                                        key={type.id}
                                                        onClick={() => {
                                                            setConnectorType(type.id);
                                                            setIsConnectorMenuOpen(false);
                                                            setActiveTool('connector');
                                                        }}
                                                        style={{
                                                            width: '100%',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            padding: '8px 12px',
                                                            borderRadius: '8px',
                                                            background: connectorType === type.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                                                            border: 'none',
                                                            color: '#fff',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            transition: 'background 0.2s'
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                        onMouseLeave={e => e.currentTarget.style.background = connectorType === type.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent'}
                                                    >
                                                        <type.icon size={16} color={connectorType === type.id ? '#3b82f6' : '#94a3b8'} />
                                                        <span style={{ fontSize: '0.8rem' }}>{type.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <button onClick={() => setActiveTool('text')} style={{ p: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '8px', background: activeTool === 'text' ? 'rgba(59, 130, 246, 0.4)' : 'transparent', border: activeTool === 'text' ? '1px solid #3b82f6' : 'none', color: '#fff', cursor: 'pointer' }} title="Text Tool"><TextIcon size={20} /></button>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Tools</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleSave} style={{ p: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}><Save size={20} /></button>
                                    <button onClick={clearCanvas} style={{ p: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}><Trash2 size={20} /></button>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>File</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Takt Time (s)</span>
                                        <input
                                            type="number"
                                            value={taktTime}
                                            onChange={(e) => setTaktTime(parseFloat(e.target.value) || 0)}
                                            style={{ width: '40px', background: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', outline: 'none' }}
                                        />
                                    </div>
                                    <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Efficiency</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: analytics.efficiency > 70 ? '#10b981' : '#f59e0b' }}>{analytics.efficiency}%</span>
                                    </div>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Analysis</span>
                            </div>
                        </>
                    )}

                    {activeRibbonTab === 'process' && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={runSimulation} disabled={isSimulating} style={{ padding: '8px 16px', borderRadius: '8px', background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <Zap size={16} fill="currentColor" /> {isSimulating ? 'Running...' : 'Run Simulation'}
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Workflow</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={runAIUpdate} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#10b981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <Zap size={16} /> AI Optimize
                                    </button>
                                    <button onClick={runUShapeUpdate} style={{ padding: '8px 16px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', color: '#8b5cf6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        <RefreshCw size={16} /> U-Shape
                                    </button>
                                </div>
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Optimization</span>
                            </div>
                        </>
                    )}

                    {activeRibbonTab === 'design' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={() => setIsHelpVisible(true)} style={{ p: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', cursor: 'pointer' }}><HelpCircle size={20} /></button>
                                <button onClick={() => setIsChatVisible(true)} style={{ p: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><MessageSquare size={20} /></button>
                            </div>
                            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Help & Design</span>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, display: 'flex', minHeight: 0, background: '#0a0a0c' }}>
                {/* --- PERSISTENT NAV RAIL (VISIO STYLE) --- */}
                <div style={{
                    width: '72px',
                    background: 'rgba(23, 23, 26, 0.4)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '24px 0',
                    gap: '16px',
                    zIndex: 20,
                    backdropFilter: 'blur(30px)'
                }}>
                    {/* Brand Icon */}
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '20px',
                        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                    }}>
                        <Layout size={20} color="#fff" />
                    </div>

                    {[
                        { id: 'shapes', icon: Grid, label: 'Shapes' },
                        { id: 'layers', icon: Layers, label: 'Layers' },
                        { id: 'search', icon: Search, label: 'Find' },
                        { id: 'help', icon: HelpCircle, label: 'Help' },
                        { id: 'settings', icon: Settings, label: 'Config' }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => {
                                if (btn.id === 'shapes') setIsStencilCollapsed(!isStencilCollapsed);
                            }}
                            style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '14px',
                                background: (!isStencilCollapsed && btn.id === 'shapes') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)',
                                border: (!isStencilCollapsed && btn.id === 'shapes') ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                color: (!isStencilCollapsed && btn.id === 'shapes') ? '#3b82f6' : 'rgba(255,255,255,0.4)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                position: 'relative'
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = (!isStencilCollapsed && btn.id === 'shapes') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = (!isStencilCollapsed && btn.id === 'shapes') ? '#3b82f6' : 'rgba(255,255,255,0.4)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                            title={btn.label}
                        >
                            <btn.icon size={20} />
                            {btn.id === 'shapes' && !isStencilCollapsed && (
                                <div style={{ position: 'absolute', right: '-8px', top: '50%', transform: 'translateY(-50%)', width: '4px', height: '16px', background: '#3b82f6', borderRadius: '2px' }} />
                            )}
                        </button>
                    ))}

                    <div style={{ flex: 1 }} />

                    {/* Bottom Utility */}
                    <button
                        onClick={() => setIsPropertiesCollapsed(!isPropertiesCollapsed)}
                        style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '14px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        {isPropertiesCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                {/* --- LEFT STENCIL SIDEBAR --- */}
                <div style={{
                    width: isStencilCollapsed ? '0' : '280px',
                    background: 'rgba(23, 23, 26, 0.6)',
                    borderRight: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                }}>
                    {!isStencilCollapsed && (
                        <>
                            <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: '700', letterSpacing: '0.5px' }}>Shapes (Stencil)</span>
                            </div>

                            <div style={{ padding: '12px' }}>
                                <div style={{ position: 'relative' }}>
                                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                                    <input
                                        placeholder="Search shapes..."
                                        value={stencilSearch}
                                        onChange={e => setStencilSearch(e.target.value)}
                                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '8px 8px 8px 32px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                    />
                                </div>
                            </div>

                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                                {toolboxItems.map(group => (
                                    <div key={group.category} style={{ marginBottom: '24px' }}>
                                        <h4 style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', paddingLeft: '4px' }}>{group.category}</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                            {group.items.filter(item => item.label.toLowerCase().includes(stencilSearch.toLowerCase())).map(item => (
                                                <div
                                                    key={item.id}
                                                    draggable
                                                    onDragStart={(e) => {
                                                        e.dataTransfer.setData('application/reactflow', 'layoutItem');
                                                        e.dataTransfer.setData('application/layoutitem', JSON.stringify(item));
                                                        e.dataTransfer.effectAllowed = 'move';
                                                    }}
                                                    style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '12px 8px',
                                                        background: 'rgba(255, 255, 255, 0.02)',
                                                        borderRadius: '12px',
                                                        cursor: 'grab',
                                                        border: '1px solid rgba(255, 255, 255, 0.05)',
                                                        transition: 'all 0.2s',
                                                        textAlign: 'center'
                                                    }}
                                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; e.currentTarget.style.borderColor = item.color; }}
                                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'; e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}
                                                >
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: `${item.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                                                        <item.icon size={18} />
                                                    </div>
                                                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{item.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* --- MAIN CANVAS --- */}
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div
                        ref={reactFlowWrapper}
                        style={{ flex: 1, background: '#0a0a0c', position: 'relative', overflow: 'hidden' }}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                    >
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onNodeClick={(_, node) => setSelectedNodeData(node)}
                            onPaneClick={() => setSelectedNodeData(null)}
                            nodeTypes={nodeTypes}
                            fitView
                            defaultEdgeOptions={{
                                type: connectorType,
                                style: { stroke: '#3b82f6', strokeWidth: 3, filter: 'url(#glow)' },
                                markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
                            }}
                        >
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
                                <defs>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                            </svg>

                            <Background color="#1a1a1e" variant="lines" gap={40} size={1} />
                            <Controls style={{ background: 'rgba(23, 23, 26, 0.9)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', overflow: 'hidden' }} />

                            {/* Scanning Overlay */}
                            {isOptimizing && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: `${scanPosition}%`,
                                    width: '2px',
                                    height: '100%',
                                    background: 'linear-gradient(to bottom, transparent, #10b981, transparent)',
                                    boxShadow: '0 0 20px #10b981, 0 0 40px rgba(16, 185, 129, 0.4)',
                                    zIndex: 1000,
                                    pointerEvents: 'none',
                                    transition: 'left 0.05s linear'
                                }}>
                                    <div style={{ position: 'absolute', top: '20px', right: '10px', background: 'rgba(16, 185, 129, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                        AI Scanning Layout...
                                    </div>
                                </div>
                            )}

                            <MiniMap
                                style={{ background: '#1a1a1e', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', bottom: 20, right: 20 }}
                                maskColor="rgba(0, 0, 0, 0.7)"
                                nodeColor={n => n.data?.color || '#3b82f6'}
                                nodeStrokeWidth={3}
                                nodeBorderRadius={8}
                            />

                            {/* Simulation Marker */}
                            {isSimulating && agentPos && (
                                <div style={{
                                    position: 'absolute',
                                    left: agentPos.x,
                                    top: agentPos.y,
                                    width: '24px',
                                    height: '24px',
                                    background: '#3b82f6',
                                    borderRadius: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: 100,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 20px #3b82f6, 0 0 40px rgba(59, 130, 246, 0.4)',
                                    border: '3px solid #fff',
                                    pointerEvents: 'none'
                                }}>
                                    <Zap size={12} fill="#fff" color="#fff" />
                                </div>
                            )}
                        </ReactFlow>
                    </div>
                </div>

                {/* --- RIGHT PROPERTIES PANEL --- */}
                <div style={{
                    width: (isPropertiesCollapsed || !selectedNodeData) ? '0' : '320px',
                    background: 'rgba(23, 23, 26, 0.6)',
                    borderLeft: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'hidden',
                    backdropFilter: 'blur(20px)'
                }}>
                    {selectedNodeData && (
                        <>
                            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '1rem', fontWeight: '800', color: '#60a5fa' }}>Format Shape</span>
                                <button onClick={() => setSelectedNodeData(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}><X size={18} /></button>
                            </div>

                            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                {/* Data Section */}
                                <div>
                                    <h4 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Data & Behavior</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>Label</label>
                                            <input
                                                value={selectedNodeData.data.label}
                                                onChange={e => onLabelChange(selectedNodeData.id, e.target.value)}
                                                style={{ width: '100%', background: '#111827', border: '1px solid #374151', borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Style Section */}
                                <div>
                                    <h4 style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Design & Style</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Theme Color</label>
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => setNodes(nds => nds.map(n => n.id === selectedNodeData.id ? { ...n, data: { ...n.data, color: c } } : n))}
                                                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: c, border: selectedNodeData.data.color === c ? '2px solid #fff' : 'none', cursor: 'pointer' }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '8px' }}>Shape Type</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                {['rect', 'diamond', 'ellipse', 'parallelogram'].map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setNodes(nds => nds.map(n => n.id === selectedNodeData.id ? { ...n, data: { ...n.data, shape: s } } : n))}
                                                        style={{ padding: '8px', borderRadius: '6px', background: selectedNodeData.data.shape === s ? '#3b82f6' : '#111827', border: '1px solid #374151', color: '#fff', fontSize: '0.75rem', textTransform: 'capitalize', cursor: 'pointer' }}
                                                    >
                                                        {s}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* AI and Help Dialogs */}
            {isHelpVisible && <HelpDialog />}
            {/* AI and Help Dialogs */}
            {isHelpVisible && <HelpDialog />}
            <AIChatOverlay
                visible={isChatVisible}
                onClose={() => setIsChatVisible(false)}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                context={{
                    type: 'standard_work',
                    data: {
                        projectName: selectedProject?.name,
                        analytics,
                        nodes: nodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.shape, position: n.position })),
                        edges: edges.map(e => ({ source: e.source, target: e.target })),
                        taktTime
                    }
                }}
                title={t('spaghettiChart.aiChat.title') || "Standard Work Chat"}
            />
        </div>
    );
};

const StandardWorkLayout = () => (
    <ReactFlowProvider>
        <SpaghettiChartContent />
    </ReactFlowProvider>
);

export default StandardWorkLayout;
