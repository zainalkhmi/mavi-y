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
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import html2canvas from 'html2canvas';
import './vsm-animations.css';

import { INITIAL_DATA, PROCESS_TYPES, VSMSymbols } from './vsm-constants';
import ProcessNode from './nodes/ProcessNode';
import InventoryNode from './nodes/InventoryNode';
import ProductionControlNode from './nodes/ProductionControlNode';
import GenericNode from './nodes/GenericNode';
import TextNode from './nodes/TextNode';
import InformationEdge from './edges/InformationEdge';
import MaterialEdge from './edges/MaterialEdge';
import Sidebar from './Sidebar';
import TimelineLadder from './TimelineLadder';
import YamazumiChart from './YamazumiChart';
import EPEIAnalysis from './EPEIAnalysis';
import AIVSMGeneratorModal from './AIVSMGeneratorModal';
import VSMWizard from './VSMWizard';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { useNavigate, useLocation } from 'react-router-dom';
import { analyzeVSM, getStoredApiKey, generateVSMFromPrompt, generateVSMFromImage, validateApiKey } from '../../utils/aiGenerator';
import { saveVSM, getVSMById } from '../../utils/vsmDB';
import ReactMarkdown from 'react-markdown';
import AIChatOverlay from '../features/AIChatOverlay';
import { Brain, Sparkles, X, Wand2, HelpCircle, MessageSquare, ImagePlus, PanelRightClose, PanelRightOpen, Eye, EyeOff, BarChart3, Repeat, Undo, Redo, ArrowLeft, ArrowUp, Save, Folder, Layout, Network, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SupplyChainEngine } from '../../utils/supplyChainEngine';
import TemplateSelectionModal from './TemplateSelectionModal';

import SupplyChainModal from './SupplyChainModal';
import TemplateActionModal from './TemplateActionModal';
import { getAllProjects } from '../../utils/database';
import { useProject } from '../../contexts/ProjectContext';
import { useDialog } from '../../contexts/DialogContext';

// Static types for React Flow performance
const nodeTypes = {
    inventory: InventoryNode,
    productionControl: ProductionControlNode,
    generic: GenericNode,
    process: ProcessNode,
    text_note: TextNode,
};

const edgeTypes = {
    information: InformationEdge,
    material: MaterialEdge,
};

const VSMCanvasContent = () => {
    const { currentLanguage, t } = useLanguage();
    const { showAlert, showConfirm, showPrompt } = useDialog();
    const { openProject } = useProject();
    const navigate = useNavigate();
    const location = useLocation();
    const [vsmId, setVsmId] = useState(location.state?.vsmId || null);
    const [vsmName, setVsmName] = useState(location.state?.vsmName || t('vsm.newVsm'));
    const reactFlowWrapper = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedEdge, setSelectedEdge] = useState(null);
    const [edgeMenuPosition, setEdgeMenuPosition] = useState(null);
    const [nodeMenuPosition, setNodeMenuPosition] = useState(null); // New Node Context Menu State
    const [contextMenuNode, setContextMenuNode] = useState(null);   // New Node Context Menu State
    const [activeEdgeType, setActiveEdgeType] = useState('material'); // material, information, electronic
    const [isDragging, setIsDragging] = useState(false); // Global drag state for overlay
    const [dragData, setDragData] = useState(null); // SHARED STATE FOR DRAG DATA

    // Global Event Listener Removed (Clean up)
    const [clipboard, setClipboard] = useState(null); // For Copy/Paste
    const [customLibrary, setCustomLibrary] = useState([]);
    const { screenToFlowPosition, getNodes, setNodes: setReactFlowNodes } = useReactFlow();

    // Undo/Redo Hook
    // We store { nodes, edges } in history
    const { state: historyState, set: pushToHistory, undo, redo, canUndo, canRedo } = useUndoRedo({ nodes: [], edges: [] });
    // Flag to prevent loop when strictly setting from history
    const isUndoing = useRef(false);

    // Metrics Logic
    const [metrics, setMetrics] = useState({
        totalCT: 0,
        totalVA: 0,
        totalLT: 0,
        efficiency: 0,
        taktTime: 0,
        calculatedTakt: 0,
        pitch: 0
    });

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // AI VSM Generator State
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [availableModels, setAvailableModels] = useState([]);
    const [allProjects, setAllProjects] = useState([]);

    // Keep React Flow type objects stable across renders
    const stableNodeTypes = useMemo(() => nodeTypes, []);
    const stableEdgeTypes = useMemo(() => edgeTypes, []);

    // UI State
    const [showSidebar, setShowSidebar] = useState(true);
    const [showMetrics, setShowMetrics] = useState(true); // New state for metrics bar visibility
    const [showNodeDetails, setShowNodeDetails] = useState(true);
    const [showYamazumi, setShowYamazumi] = useState(false);
    const [showEPEI, setShowEPEI] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);

    const [showTemplateModal, setShowTemplateModal] = useState(false); // Template Dialog
    const [showSupplyChainModal, setShowSupplyChainModal] = useState(false); // Supply Chain Dialog
    const [showActionModal, setShowActionModal] = useState(false); // Replace/Merge Dialog
    const [pendingTemplateKey, setPendingTemplateKey] = useState(null); // Key waiting for confirmation

    // Simulation State
    const [isSimulating, setIsSimulating] = useState(false);
    const [simTime, setSimTime] = useState(0);
    const simRef = useRef(null);
    const [globalTakt, setGlobalTakt] = useState(60); // Default 60s
    const [lastSimulationResult, setLastSimulationResult] = useState(null); // Store last Sim result for AI

    // Sync showNodeDetails state to all nodes for performance
    useEffect(() => {
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, showDetails: showNodeDetails }
        })));
    }, [showNodeDetails]);
    useEffect(() => {
        const fetchModels = async () => {
            try {
                const apiKey = getStoredApiKey();
                // If we have an API key, try to fetch models
                if (apiKey) {
                    const models = await validateApiKey(apiKey);
                    if (models && models.length > 0) {
                        setAvailableModels(models);

                        // Auto-select a safe default if current selection is not valid or just to be safe
                        // Prefer gemini-1.5-flash variants, then pro, then anything else
                        const preferred = models.find(m => m.includes('1.5-flash')) ||
                            models.find(m => m.includes('flash')) ||
                            models[0];

                        if (preferred) {
                            setSelectedModel(preferred);
                        }
                    }
                }
            } catch (err) {
                console.warn("Failed to fetch models in VSM Canvas", err);
                // Fallback models are already in the UI if we don't overwrite availableModels with empty?
                // Actually if fetch fails, availableModels stays empty.
                // We should initialize availableModels with default list or handle empty list in UI.
            }
        };
        fetchModels();
    }, []);

    useEffect(() => {
        const fetchProjects = async () => {
            try {
                const projects = await getAllProjects();
                setAllProjects(projects);
            } catch (err) {
                console.error("Failed to fetch projects in VSM Canvas", err);
            }
        };
        fetchProjects();
    }, []);

    // --- Simulation Logic ---
    const handleToggleSimulation = () => {
        if (isSimulating) {
            handleStopSimulation();
        } else {
            handleStartSimulation();
        }
    };

    const handleStartSimulation = () => {
        setIsSimulating(true);
        // Initial setup for nodes to have 'simulating' and 'progress' data
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, simulating: true, progress: 0, isShortage: false }
        })));
        setEdges(eds => eds.map(edge => ({
            ...edge,
            data: { ...edge.data, simulating: true, isShortage: false }
        })));
    };

    const handleStopSimulation = () => {
        setIsSimulating(false);
        if (simRef.current) clearInterval(simRef.current);
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, simulating: false }
        })));
        setEdges(eds => eds.map(edge => ({
            ...edge,
            data: { ...edge.data, simulating: false }
        })));
    };

    const handleResetSimulation = () => {
        handleStopSimulation();
        setSimTime(0);
        // Reset node levels and statuses
        setNodes(nds => nds.map(node => ({
            ...node,
            data: { ...node.data, progress: 0, level: 100, isShortage: false }
        })));
    };

    useEffect(() => {
        if (isSimulating) {
            simRef.current = setInterval(() => {
                setSimTime(t => t + 1);

                setNodes(nds => {
                    return nds.map(node => {
                        if (node.type === 'process' || node.data.symbolType === VSMSymbols.PROJECT) {
                            const ct = parseFloat(node.data.ct) || 10;
                            const newProgress = (node.data.progress || 0) + (100 / (ct * 2)); // Adjusted for interval
                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    progress: newProgress >= 100 ? 0 : newProgress
                                }
                            };
                        }

                        if (node.type === 'inventory') {
                            // Inventory level logic (simple fluctuation for visualization)
                            const currentLevel = node.data.level ?? 100;
                            const change = Math.sin(Date.now() / 2000) * 5;
                            const newLevel = Math.max(10, Math.min(100, currentLevel + change));

                            // Kanban Trigger: Check if inventory falls below minStock
                            const minStock = node.data.minStock || 0;
                            const shouldTriggerKanban = minStock > 0 && newLevel < minStock;

                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    level: newLevel,
                                    kanbanTriggered: shouldTriggerKanban
                                }
                            };
                        }

                        if (node.data.symbolType === VSMSymbols.CUSTOMER) {
                            // Shortage detection: If any process before it is bottleneck or simulation detects "empty"
                            // For this simulation demo, we'll trigger shortage if progress is consistently slow
                            const isShortage = Math.random() > 0.95; // Random for demo, but could be logic-based
                            return {
                                ...node,
                                data: { ...node.data, isShortage: isShortage, simulating: true }
                            };
                        }

                        if ([VSMSymbols.TRUCK, VSMSymbols.SEA, VSMSymbols.AIR].includes(node.data.symbolType)) {
                            // Transport simulation based on Lead Time (LT)
                            // LT is usually in days or hours, but for animation we'll treat it as speed factor
                            const lt = parseFloat(node.data.leadTime) || 5;
                            const frequency = parseFloat(node.data.frequency) || 1;

                            // Speed of progress: Lower LT = Faster movement
                            // Base speed adjusted for simulation interval (500ms)
                            const speed = 10 / (lt || 1);
                            const currentProgress = node.data.progress || 0;
                            const newProgress = currentProgress + speed;

                            return {
                                ...node,
                                data: {
                                    ...node.data,
                                    progress: newProgress >= 100 ? 0 : newProgress,
                                    simulating: true
                                }
                            };
                        }

                        return node;
                    });
                });

                // Update edges to show Kanban signals on information flow
                setEdges(eds => {
                    return eds.map(edge => {
                        // Check if this is an information edge (dashed style)
                        const isInfoEdge = edge.style?.strokeDasharray || edge.data?.type === 'information';

                        if (isInfoEdge) {
                            // Find the target node (downstream)
                            const targetNode = nodes.find(n => n.id === edge.target);

                            // If target is inventory and has triggered Kanban, activate edge
                            if (targetNode?.type === 'inventory' && targetNode.data?.kanbanTriggered) {
                                return {
                                    ...edge,
                                    data: { ...edge.data, kanbanActive: true }
                                };
                            }
                        }

                        return {
                            ...edge,
                            data: { ...edge.data, kanbanActive: false }
                        };
                    });
                });
            }, 500);
        } else {
            if (simRef.current) clearInterval(simRef.current);
        }
        return () => { if (simRef.current) clearInterval(simRef.current); };
    }, [isSimulating]);

    // Load by ID from database if provided
    useEffect(() => {
        // --- ⚡ JUMP RESTORE LOGIC ---
        // If we're returning from a project jump, restore the exact session state
        if (location.state?.restoreFromJump) {
            const tempData = localStorage.getItem('vsm_jump_temp_data');
            if (tempData) {
                try {
                    const parsed = JSON.parse(tempData);
                    console.log('🔄 Restoring VSM state from jump data...', parsed.vsmName);

                    if (parsed.nodes) setNodes(parsed.nodes);
                    if (parsed.edges) setEdges(parsed.edges);
                    if (parsed.metrics) setMetrics(parsed.metrics);
                    if (parsed.globalTakt) setGlobalTakt(parsed.globalTakt);
                    if (parsed.vsmId) setVsmId(parsed.vsmId);
                    if (parsed.vsmName) setVsmName(parsed.vsmName);

                    pushToHistory({ nodes: parsed.nodes, edges: parsed.edges });

                    // Clear the jump data to prevent accidental re-loads
                    localStorage.removeItem('vsm_jump_temp_data');

                    // Prevent the standard loadById from overwriting this
                    return;
                } catch (e) {
                    console.error('Failed to parse VSM jump data', e);
                }
            }
        }

        const loadById = async () => {
            if (vsmId) {
                try {
                    const item = await getVSMById(vsmId);
                    if (item && item.data) {
                        if (item.data.globalTakt) {
                            setGlobalTakt(item.data.globalTakt);
                        }
                        setNodes((item.data.nodes || []).map(n => ({
                            ...n,
                            data: { ...n.data, globalTakt: item.data.globalTakt || globalTakt }
                        })));
                        setEdges(item.data.edges || []);
                        setVsmName(item.name);
                        pushToHistory({
                            nodes: (item.data.nodes || []).map(n => ({
                                ...n,
                                data: {
                                    ...n.data,
                                    globalTakt: item.data.globalTakt || globalTakt,
                                    showDetails: showNodeDetails
                                }
                            })),
                            edges: item.data.edges || []
                        });

                        // Set the global localStorage as well for compatibility
                        localStorage.setItem('vsm_flow_data', JSON.stringify({
                            nodes: item.data.nodes,
                            edges: item.data.edges,
                            globalTakt: item.data.globalTakt,
                            timestamp: new Date().toISOString()
                        }));
                    }
                } catch (err) {
                    console.error('Failed to load VSM from database:', err);
                }
            }
        };
        loadById();
    }, [vsmId, location.state]);

    // ... (rest of the component state and effects)

    // ... (rest of the component state and effects)

    const handleUploadImage = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsGenerating(true);
        try {
            const apiKey = getStoredApiKey();
            if (!apiKey) {
                throw new Error("API Key not found");
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const imageData = e.target.result;
                    const language = t('vsm.ai.promptLangName');

                    const result = await generateVSMFromImage(imageData, apiKey, language, selectedModel);

                    // Ask user: replace or merge?
                    const shouldReplace = await showConfirm(
                        t('vsm.ai.title'),
                        t('vsm.ai.loadConfirm', {
                            nodes: result.nodes.length,
                            edges: result.edges.length,
                            replace: t('vsm.ai.modeReplace'),
                            merge: t('vsm.ai.modeMerge')
                        })
                    );

                    if (shouldReplace) {
                        if (result.globalTakt) setGlobalTakt(result.globalTakt);
                        const finalNodes = result.nodes.map(n => ({
                            ...n,
                            data: {
                                ...n.data,
                                globalTakt: result.globalTakt || globalTakt,
                                showDetails: showNodeDetails
                            }
                        }));
                        setNodes(finalNodes);
                        setEdges(result.edges);
                        pushToHistory({ nodes: finalNodes, edges: result.edges });
                    } else {
                        // Merge logic (offset by max X)
                        const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
                        const offsetX = maxX + 400;

                        const offsetNodes = result.nodes.map(node => ({
                            ...node,
                            id: `${node.id}-${Date.now()}`,
                            position: {
                                x: node.position.x + offsetX,
                                y: node.position.y
                            }
                        }));

                        const nodeIdMap = {};
                        result.nodes.forEach((oldNode, idx) => {
                            nodeIdMap[oldNode.id] = offsetNodes[idx].id;
                        });

                        const offsetEdges = result.edges.map(edge => ({
                            ...edge,
                            id: `${edge.id}-${Date.now()}`,
                            source: nodeIdMap[edge.source] || edge.source,
                            target: nodeIdMap[edge.target] || edge.target
                        }));

                        const newNodes = [...nodes, ...offsetNodes];
                        const newEdges = [...edges, ...offsetEdges];
                        setNodes(newNodes);
                        setEdges(newEdges);
                        pushToHistory({ nodes: newNodes, edges: newEdges });
                    }

                    await showAlert(t('vsm.ai.title'), (result.nodes.length > 0 ? '✅' : '❌'));

                } catch (err) {
                    console.error('Image Processing Error:', err);
                    await showAlert(t('vsm.ai.subtitle'), '❌ ' + err.message);
                } finally {
                    setIsGenerating(false);
                    event.target.value = ''; // Reset input
                }
            };
            reader.readAsDataURL(file);

        } catch (error) {
            console.error(error);
            await showAlert('Error', error.message);
            setIsGenerating(false);
        }
    };

    // Load Initial Data
    useEffect(() => {
        const saved = localStorage.getItem('vsm_flow_data');
        const savedCustom = localStorage.getItem('vsm_custom_icons');

        let initialNodes = [];
        let initialEdges = [];

        if (saved) {
            try {
                const flow = JSON.parse(saved);
                if (flow) {
                    initialNodes = flow.nodes || [];
                    initialEdges = flow.edges || [];
                }
            } catch (e) {
                console.error("Failed to parse saved flow", e);
            }
        }

        setNodes(initialNodes);
        setEdges(initialEdges);
        pushToHistory({ nodes: initialNodes, edges: initialEdges }); // Initial history state

        if (savedCustom) {
            setCustomLibrary(JSON.parse(savedCustom));
        }
    }, []);

    // Keyboard Shortcuts: Copy/Paste
    useEffect(() => {
        const handleKeyDown = (event) => {
            // Ignore if active element is input
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

            // COPY: Ctrl+C
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                if (selectedNode) {
                    setClipboard({
                        type: 'node',
                        data: { ...selectedNode }
                    });
                    // Visual feedback could be added here
                }
            }

            // PASTE: Ctrl+V
            if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                if (clipboard && clipboard.type === 'node') {
                    const nodeToPaste = clipboard.data;
                    const newId = `${nodeToPaste.type}-${Date.now()}`;

                    // Offset position slightly to make it visible
                    const offset = 30; // pixels
                    const newPosition = {
                        x: nodeToPaste.position.x + offset,
                        y: nodeToPaste.position.y + offset
                    };

                    const newNode = {
                        ...nodeToPaste,
                        id: newId,
                        position: newPosition,
                        selected: true, // Select the new node
                        data: {
                            ...nodeToPaste.data,
                            showDetails: showNodeDetails,
                            // Ensure unique names/labels if necessary, or keep same
                            name: `${nodeToPaste.data.name} (Copy)`
                        }
                    };

                    setNodes((nds) => {
                        // Deselect all others
                        const deselectedNodes = nds.map(n => ({ ...n, selected: false }));
                        const newNodes = [...deselectedNodes, newNode];
                        pushToHistory({ nodes: newNodes, edges });
                        return newNodes;
                    });

                    // Update selection
                    setSelectedNode(newNode);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedNode, clipboard, setNodes, edges, pushToHistory]);

    // Effect: Sync History -> UI when Undoing/Redoing
    useEffect(() => {
        if (historyState && (historyState.nodes !== nodes || historyState.edges !== edges)) {
            isUndoing.current = true;
            setNodes(historyState.nodes);
            setEdges(historyState.edges);
            setTimeout(() => { isUndoing.current = false; }, 100);
        }
    }, [historyState]);

    // Effect: Metrics & Auto-save
    useEffect(() => {
        if (isUndoing.current) return;

        // Auto Save to LocalStorage
        const flow = { nodes, edges };
        localStorage.setItem('vsm_flow_data', JSON.stringify(flow));

        // 1. Identify Customers for Demand/Takt calculation
        const customerNodes = nodes.filter(n => n.data?.symbolType === VSMSymbols.CUSTOMER);
        let calculatedTakt = 0;
        let avgDailyDemand = 0;

        if (customerNodes.length > 0) {
            // Aggregate demand from ALL customers
            avgDailyDemand = customerNodes.reduce((sum, node) => sum + Number(node.data.demand || 0), 0);

            // Use Available Time from the first customer (assuming standard plant hours)
            // or we could enforce a global setting. For now, first customer source of truth.
            const primaryCustomer = customerNodes[0];
            const availableHours = Number(primaryCustomer.data.availableTime || 8);
            const availableSec = availableHours * 3600;
            const shifts = Number(primaryCustomer.data.shifts || 1);
            const packSize = Number(primaryCustomer.data.packSize || 1);

            if (avgDailyDemand > 0) {
                // Formula: (Available Sec * Shifts) / Total Daily Demand
                calculatedTakt = (availableSec * shifts) / avgDailyDemand;

                // Sync with global takt if significantly different to avoid jitter/loops
                if (Math.abs(calculatedTakt - globalTakt) > 0.01) {
                    setGlobalTakt(calculatedTakt);
                }

                // Add pitch calculation (using first customer's pack size as reference)
                const pitchValue = calculatedTakt * packSize;
                window.__maviVSMPitch = pitchValue;
            }
        }

        // Determine effective Takt for node updates (prefer calculated in this pass, fallback to state)
        const effectiveTakt = calculatedTakt > 0 ? calculatedTakt : globalTakt;

        // Calculate Metrics
        let ct = 0, va = 0, invTime = 0;
        const updatedNodes = nodes.map(node => {
            let newNode = { ...node };
            let hasChanged = false;

            if (node.type === 'process' || node.data?.symbolType === VSMSymbols.PROJECT) {
                const nodeCT = Number(node.data.ct || 0);
                const nodeVA = Number(node.data.va || nodeCT);
                ct += nodeCT;
                va += nodeVA;

                // Sync global takt to process nodes for visual feedback
                if (node.data.globalTakt !== effectiveTakt) {
                    newNode.data = { ...node.data, globalTakt: effectiveTakt };
                    hasChanged = true;
                }
            }

            if (node.type === 'inventory' || node.data?.symbolType === VSMSymbols.FINISHED_GOODS) {
                // Little's Law: LT = Inventory / Demand
                if (avgDailyDemand > 0) {
                    const qty = Number(node.data.amount || 0);
                    const calculatedDays = (qty / (avgDailyDemand || 1)).toFixed(2);
                    if (node.data.calculatedLT !== calculatedDays) {
                        newNode.data = { ...node.data, calculatedLT: calculatedDays };
                        hasChanged = true;
                    }
                    invTime += Number(calculatedDays) * 86400; // Store as seconds for total calculation
                } else {
                    invTime += Number(node.data.time || 0);
                }
            }

            return newNode;
        });

        // Batch update nodes if calculated fields changed
        const anyChanged = updatedNodes.some((n, i) => n.data !== nodes[i].data);
        if (anyChanged) {
            setNodes(updatedNodes);
        }

        const lt = invTime + ct;
        const eff = lt > 0 ? (va / lt) * 100 : 0;
        setMetrics({
            totalCT: ct,
            totalVA: va,
            totalLT: lt,
            efficiency: eff.toFixed(2),
            taktTime: globalTakt.toFixed(1), // Uses the state globalTakt
            calculatedTakt: calculatedTakt.toFixed(1),
            pitch: (window.__maviVSMPitch || 0).toFixed(1)
        });

        // Expose to Mavi Hub
        window.__maviVSM = {
            nodes: updatedNodes,
            edges,
            metrics: {
                totalCT: ct,
                totalVA: va,
                totalLT: lt,
                efficiency: eff.toFixed(2),
                taktTime: globalTakt.toFixed(1),
                calculatedTakt: calculatedTakt.toFixed(1)
            },
            bottleneck: updatedNodes.filter(n => n.type === 'process' || n.data?.symbolType === VSMSymbols.PROJECT)
                .sort((a, b) => Number(b.data.ct) - Number(a.data.ct))[0]?.data.name
        };

        return () => {
            delete window.__maviVSM;
        };
    }, [nodes, edges]);

    // Update edge styling when selected
    useEffect(() => {
        if (selectedEdge) {
            setEdges((eds) =>
                eds.map((edge) => {
                    if (edge.id === selectedEdge.id) {
                        return {
                            ...edge,
                            animated: true,
                            style: { ...edge.style, strokeWidth: 3, stroke: '#0078d4' }
                        };
                    }
                    return {
                        ...edge,
                        animated: false,
                        style: { ...edge.style, strokeWidth: 2, stroke: edge.style?.stroke || '#fff' }
                    };
                })
            );
        } else {
            // Reset all edges to default
            setEdges((eds) =>
                eds.map((edge) => ({
                    ...edge,
                    animated: false,
                    style: { ...edge.style, strokeWidth: 2, stroke: edge.style?.stroke || '#fff' }
                }))
            );
        }
    }, [selectedEdge]);

    const recordHistory = useCallback(() => {
        if (isUndoing.current) return;
        pushToHistory({ nodes, edges });
    }, [nodes, edges, pushToHistory]);

    // --- Interaction Handlers ---

    const onConnect = useCallback((params) => {
        let edgeStyle = { strokeWidth: 2 };
        let edgeType = 'smoothstep';
        let edgeMarkerEnd = { type: MarkerType.ArrowClosed };
        let edgeData = {};
        let animated = false;

        if (activeEdgeType === 'information') {
            edgeStyle = { strokeWidth: 1.5, strokeDasharray: '5 5' };
            edgeMarkerEnd = { type: MarkerType.ArrowOpen };
            edgeData = { type: 'manual' };
        } else if (activeEdgeType === 'electronic') {
            edgeStyle = { strokeWidth: 2, stroke: '#00ffff', strokeDasharray: '5 5' };
            edgeType = 'smoothstep';
            edgeData = { type: 'electronic', infoType: 'electronic' };
            animated = true; // NEW: Animate electronic info flow
        }

        setEdges((eds) => {
            const newEdges = addEdge({
                ...params,
                type: edgeType,
                markerEnd: edgeMarkerEnd,
                style: edgeStyle,
                animated,
                data: edgeData
            }, eds);
            return newEdges;
        });
        setTimeout(() => { }, 100);
    }, [activeEdgeType]);

    // Record history on drag stop
    const onNodeDragStop = useCallback(() => {
        recordHistory();
    }, [recordHistory]);

    // Unified Drop Logic that uses Shared State if available, or falls back to event data
    const handleDropLogic = useCallback(async (event) => {
        let type, symbolType;

        // PRIORITY 1: USE SHARED STATE (Most reliable)
        if (dragData) {
            type = dragData.nodeType;
            symbolType = dragData.symbolType;
            // customDataStr specific handling if needed, usually part of symbolType logic
        } else {
            // PRIORITY 2: USE DATA TRANSFER
            type = event.dataTransfer?.getData('application/reactflow');
            symbolType = event.dataTransfer?.getData('application/vsmsymbol');
        }

        // Special handling for edge mode
        if (type === 'edgeMode') {
            const edgeType = dragData ? dragData.edgeType : event.dataTransfer?.getData('application/vsmEdgeType');
            if (edgeType) {
                setActiveEdgeType(edgeType);
                await showAlert(t('vsm.nodes.noteDefault'), edgeType.toUpperCase());
            }
            setIsDragging(false);
            setDragData(null);
            return;
        }

        if (!type || !symbolType) {
            setIsDragging(false);
            setDragData(null);
            return;
        }

        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

        let data = { ...INITIAL_DATA[symbolType] || {} };
        if (Object.keys(data).length === 0 && INITIAL_DATA[type]) data = { ...INITIAL_DATA[type] };
        if (!data.name) data.name = symbolType;
        data = { ...data, symbolType };

        const newNode = {
            id: `${type}-${Date.now()}`,
            type,
            position,
            data: {
                ...data,
                globalTakt,
                showDetails: showNodeDetails
            },
        };

        setNodes((nds) => {
            const newNodes = nds.concat(newNode);
            pushToHistory({ nodes: newNodes, edges });
            return newNodes;
        });

        setIsDragging(false);
        setDragData(null);

    }, [isDragging, dragData, screenToFlowPosition, pushToHistory, edges, INITIAL_DATA, globalTakt, showNodeDetails]);

    const onDrop = useCallback((event) => {
        event.preventDefault();
        handleDropLogic(event);
    }, [handleDropLogic]);

    const onDragOver = useCallback((event) => {
        event.preventDefault();
    }, []);

    const onNodeClick = (event, node) => {
        setSelectedNode(node);
        setSelectedEdge(null);
        setEdgeMenuPosition(null);
        setNodeMenuPosition(null); // Close node menu
    };

    const onEdgeClick = useCallback((event, edge) => {
        event.stopPropagation();
        setSelectedEdge(edge);
        setSelectedNode(null);
        setEdgeMenuPosition({ x: event.clientX, y: event.clientY });
        setNodeMenuPosition(null); // Close node menu
    }, []);

    const onNodeContextMenu = useCallback(
        (event, node) => {
            event.preventDefault();
            setContextMenuNode(node);
            setNodeMenuPosition({ x: event.clientX, y: event.clientY });
            setEdgeMenuPosition(null); // Close edge menu if open
            setSelectedNode(node); // Also select it
        },
        []
    );

    const onPaneClick = useCallback(() => {
        setSelectedNode(null);
        setSelectedEdge(null);
        setEdgeMenuPosition(null);
        setNodeMenuPosition(null);
    }, []);

    const onNodeDoubleClick = (event, node) => {
        if (node.data?.symbolType === VSMSymbols.PROJECT && node.data?.projectName) {
            // Save current VSM state before jumping to project
            localStorage.setItem('vsm_jump_temp_data', JSON.stringify({
                nodes,
                edges,
                metrics,
                globalTakt,
                vsmId,
                vsmName,
                timestamp: new Date().toISOString()
            }));

            openProject(node.data.projectName);
            navigate('/', {
                state: {
                    fromVSM: true,
                    vsmId: vsmId,
                    vsmName: vsmName
                }
            });
        }
    };



    const deleteEdge = (edgeId) => {
        setEdges((eds) => {
            const newEdges = eds.filter(e => e.id !== edgeId);
            pushToHistory({ nodes, edges: newEdges });
            return newEdges;
        });
        setSelectedEdge(null);
        setEdgeMenuPosition(null);
    };

    const updateNodeData = (id, field, value) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === id) {
                    let newData = { ...node.data, [field]: value };

                    // Bidirectional Sync for CT and Pcs/Hour
                    if (field === 'ct') {
                        const ct = parseFloat(value) || 0;
                        newData.pcsPerHour = ct > 0 ? Math.round(3600 / ct) : 0;
                    }
                    if (field === 'pcsPerHour') {
                        const pph = parseFloat(value) || 0;
                        newData.ct = pph > 0 ? Math.round(3600 / pph) : 0;
                    }

                    if (field === 'color') newData.color = value;

                    // Sync amount and inventory for consistency
                    if (field === 'amount') newData.inventory = value;
                    if (field === 'inventory') newData.amount = value;

                    // Project CT Recalculation based on outputPcs
                    if (field === 'outputPcs' && newData.projectId) {
                        const proj = allProjects.find(p => p.id === newData.projectId);
                        if (proj) {
                            const totalTime = (proj.measurements || []).reduce((sum, m) => sum + (parseFloat(m.duration) || 0), 0);
                            const outPcs = parseFloat(value) || 1;
                            newData.ct = (totalTime / outPcs).toFixed(2);
                            newData.pcsPerHour = newData.ct > 0 ? Math.round(3600 / newData.ct) : 0;
                        }
                    }

                    return { ...node, data: newData };
                }
                return node;
            })
        );
        if (selectedNode && selectedNode.id === id) {
            setSelectedNode(prev => {
                let newData = { ...prev.data, [field]: value };

                if (field === 'ct') {
                    const ct = parseFloat(value) || 0;
                    newData.pcsPerHour = ct > 0 ? Math.round(3600 / ct) : 0;
                }
                if (field === 'pcsPerHour') {
                    const pph = parseFloat(value) || 0;
                    newData.ct = pph > 0 ? Math.round(3600 / pph) : 0;
                }

                if (field === 'amount') newData.inventory = value;
                if (field === 'inventory') newData.amount = value;

                // Project CT Recalculation based on outputPcs
                if (field === 'outputPcs' && newData.projectId) {
                    const proj = allProjects.find(p => p.id === newData.projectId);
                    if (proj) {
                        const totalTime = (proj.measurements || []).reduce((sum, m) => sum + (parseFloat(m.duration) || 0), 0);
                        const outPcs = parseFloat(value) || 1;
                        newData.ct = (totalTime / outPcs).toFixed(2);
                        newData.pcsPerHour = newData.ct > 0 ? Math.round(3600 / newData.ct) : 0;
                    }
                }

                return { ...prev, data: newData };
            });
        }
    };

    const handleProjectLink = (nodeId, projectId) => {
        const projId = parseInt(projectId);
        const proj = allProjects.find(p => p.id === projId);
        if (!proj) return;

        // Calculate CT from measurements
        const measurements = proj.measurements || [];
        let totalTime = 0;
        if (measurements.length > 0) {
            totalTime = measurements.reduce((sum, m) => sum + (parseFloat(m.duration) || 0), 0);
        }

        // Get current node to find its outputPcs
        const targetNode = nodes.find(n => n.id === nodeId) || (selectedNode?.id === nodeId ? selectedNode : null);
        const outputPcs = parseFloat(targetNode?.data?.outputPcs) || 1;

        const calculatedCT = (totalTime / outputPcs).toFixed(2);

        const updates = {
            projectId: projId,
            projectName: proj.projectName,
            ct: calculatedCT,
            pcsPerHour: calculatedCT > 0 ? Math.round(3600 / calculatedCT) : 0
        };

        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            ...updates
                        }
                    };
                }
                return node;
            })
        );

        if (selectedNode && selectedNode.id === nodeId) {
            setSelectedNode(prev => ({
                ...prev,
                data: {
                    ...prev.data,
                    ...updates
                }
            }));
        }
        onPropertyChangeComplete();
    };

    // Save history when user finishes editing a property (onBlur)
    const onPropertyChangeComplete = () => {
        recordHistory();
    };

    const updateEdgeMarker = (edgeId, direction) => {
        setEdges((eds) =>
            eds.map((edge) => {
                if (edge.id === edgeId) {
                    let markerStart = undefined;
                    let markerEnd = undefined;

                    if (direction === 'start') {
                        markerStart = { type: MarkerType.ArrowClosed, color: edge.style?.stroke || '#fff' };
                    } else if (direction === 'end') {
                        markerEnd = { type: MarkerType.ArrowClosed, color: edge.style?.stroke || '#fff' };
                    } else if (direction === 'both') {
                        markerStart = { type: MarkerType.ArrowClosed, color: edge.style?.stroke || '#fff' };
                        markerEnd = { type: MarkerType.ArrowClosed, color: edge.style?.stroke || '#fff' };
                    }
                    // direction 'none' leaves both undefined

                    return { ...edge, markerStart, markerEnd };
                }
                return edge;
            })
        );
        // Force re-render of context menu state if needed, or just let edge update trigger it.
        // We might want to keep selection? Yes.
    };

    const deleteNode = async (id) => {
        if (await showConfirm(t('vsm.clear'), t('vsm.confirmDeleteNode') || 'Delete selected node?')) {
            setNodes((nds) => {
                const newNodes = nds.filter(n => n.id !== id);
                pushToHistory({ nodes: newNodes, edges });
                return newNodes;
            });
            setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
            setSelectedNode(null);
        }
    };

    const addCustomIcon = (icon) => {
        setCustomLibrary(prev => {
            const newLib = [...prev, icon];
            localStorage.setItem('vsm_custom_icons', JSON.stringify(newLib));
            return newLib;
        });
    };

    const removeCustomIcon = (iconId) => {
        setCustomLibrary(prev => {
            const newLib = prev.filter(icon => icon.id !== iconId);
            localStorage.setItem('vsm_custom_icons', JSON.stringify(newLib));
            return newLib;
        });
    };

    // --- Toolbar Actions ---

    const handleExport = async () => {
        if (!reactFlowWrapper.current) return;
        try {
            // Find just the canvas element or use wrapper
            // Note: html2canvas might have issues with transforms. React Flow has native support internally maybe?
            // Using a simple querySelector for the viewport
            const element = reactFlowWrapper.current.querySelector('.react-flow__viewport');
            const canvas = await html2canvas(reactFlowWrapper.current, {
                ignoreElements: (node) => node.classList.contains('react-flow__controls') || node.classList.contains('react-flow__minimap')
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = 'vsm-diagram.png';
            link.href = dataUrl;
            link.click();
        } catch (error) {
            await showAlert(t('vsm.title'), t('vsm.clear') + ' ' + t('vsm.title') + ' Failed');
        }
    };

    const handleAlign = (alignment) => {
        const selectedNodes = getNodes().filter(n => n.selected);
        if (selectedNodes.length < 2) return;

        let targetVal = 0;
        if (alignment === 'left') targetVal = Math.min(...selectedNodes.map(n => n.position.x));
        if (alignment === 'top') targetVal = Math.min(...selectedNodes.map(n => n.position.y));
        if (alignment === 'center_x') {
            const sum = selectedNodes.reduce((acc, n) => acc + n.position.x, 0);
            targetVal = sum / selectedNodes.length;
        }

        setNodes((nds) => {
            const newNodes = nds.map((node) => {
                if (node.selected) {
                    if (alignment === 'left') return { ...node, position: { ...node.position, x: targetVal } };
                    if (alignment === 'top') return { ...node, position: { ...node.position, y: targetVal } };
                    if (alignment === 'center_x') return { ...node, position: { ...node.position, x: targetVal } };
                }
                return node;
            });
            pushToHistory({ nodes: newNodes, edges });
            return newNodes;
        });
    };

    const handleAIAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const apiKey = getStoredApiKey();
            const languageName = t('vsm.ai.promptLangName');
            const result = await analyzeVSM({ nodes, edges, metrics }, apiKey, languageName);
            setAiAnalysis(result);
        } catch (error) {
            console.error('AI Analysis failed', error);
            await showAlert(t('vsm.analysis.epeiTitle'), t('vsm.clear') + ': ' + error.message);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleGenerateFromPrompt = async ({ prompt, language, mode }) => {
        setShowGenerateModal(false);
        setIsGenerating(true);
        try {
            const apiKey = getStoredApiKey();
            if (!apiKey) {
                throw new Error(t('vsm.ai.tip'));
            }

            console.log('Generating VSM from prompt:', { prompt, language, mode });
            const result = await generateVSMFromPrompt(prompt, apiKey, language);

            // Validate result
            if (!result.nodes || !Array.isArray(result.nodes) || result.nodes.length === 0) {
                throw new Error(t('vsm.ai.promptPlaceholder'));
            }
            if (!result.edges || !Array.isArray(result.edges)) {
                throw new Error(t('vsm.ai.tip'));
            }

            // Apply to canvas
            if (mode === 'replace') {
                if (result.globalTakt) setGlobalTakt(result.globalTakt);
                const finalNodes = result.nodes.map(n => ({
                    ...n,
                    data: {
                        ...n.data,
                        globalTakt: result.globalTakt || globalTakt,
                        showDetails: showNodeDetails
                    }
                }));
                setNodes(finalNodes);
                setEdges(result.edges);
                pushToHistory({ nodes: finalNodes, edges: result.edges });
            } else {
                // Merge with existing - offset new nodes to the right
                const maxX = nodes.length > 0
                    ? Math.max(...nodes.map(n => n.position.x))
                    : 0;
                const offsetX = maxX + 300; // 300px spacing

                const offsetNodes = result.nodes.map(node => ({
                    ...node,
                    id: `${node.id}-${Date.now()}`, // Ensure unique IDs
                    position: {
                        x: node.position.x + offsetX,
                        y: node.position.y
                    },
                    data: {
                        ...node.data,
                        showDetails: showNodeDetails
                    }
                }));

                // Update edge IDs to match new node IDs
                const nodeIdMap = {};
                result.nodes.forEach((oldNode, idx) => {
                    nodeIdMap[oldNode.id] = offsetNodes[idx].id;
                });

                const offsetEdges = result.edges.map(edge => ({
                    ...edge,
                    id: `${edge.id}-${Date.now()}`,
                    source: nodeIdMap[edge.source] || edge.source,
                    target: nodeIdMap[edge.target] || edge.target
                }));

                const newNodes = [...nodes, ...offsetNodes];
                const newEdges = [...edges, ...offsetEdges];
                setNodes(newNodes);
                setEdges(newEdges);
                pushToHistory({ nodes: newNodes, edges: newEdges });
            }

            // Show success message
            const successMsg = `${result.nodes.length} nodes & ${result.edges.length} connections added.`;
            await showAlert(t('vsm.ai.title'), successMsg);

        } catch (error) {
            console.error('VSM Generation Error:', error);
            const errorMsg = `❌ ${error.message}\n\nTips:\n${t('vsm.ai.tip')}`;
            await showAlert(t('vsm.ai.subtitle'), errorMsg);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleWizardGenerate = async (wizardData) => {
        const newNodes = [];
        const newEdges = [];
        const { customer, processes, suppliers, logistics, receiving, infoFlow, useHeijunka } = wizardData;

        // 1. Suppliers (Upstream - Left)
        const supplierNodeIds = {};
        const warehouseRMNodeIds = {};

        suppliers.forEach((supp, sIdx) => {
            const sid = `node_supp_${supp.id}`;
            supplierNodeIds[supp.id] = sid;
            let currentSourceId = sid;

            // FIX: Always use SUPPLIER (Factory) icon, transport is secondary
            newNodes.push({
                id: sid,
                type: 'generic',
                position: { x: 50, y: 150 + (sIdx * 250) },
                data: {
                    symbolType: VSMSymbols.SUPPLIER,
                    name: supp.name,
                    frequency: supp.frequency,
                    capacity: logistics.truckCapacity
                }
            });

            // Add transport indicator next to supplier if specified
            if (supp.transportMode) {
                newNodes.push({
                    id: `${sid}_transport`,
                    type: 'generic',
                    position: { x: 120, y: 150 + (sIdx * 250) - 40 },
                    data: { symbolType: supp.transportMode, name: '' }
                });
            }

            // Add WH RM if enabled
            if (supp.hasWarehouse) {
                const whid = `node_wh_rm_${supp.id}`;
                warehouseRMNodeIds[supp.id] = whid;
                currentSourceId = whid;

                newNodes.push({
                    id: whid,
                    type: 'inventory',
                    position: { x: 220, y: 150 + (sIdx * 250) },
                    data: { name: t('vsm.wizard.rawMatWh'), amount: 5000 }
                });

                newEdges.push({
                    id: `edge_supp_to_wh_${supp.id}`,
                    source: sid,
                    target: whid,
                    type: 'smoothstep',
                    style: { strokeWidth: 2 }
                });
            }
            supplierNodeIds[supp.id + '_source'] = currentSourceId;
        });

        const firstSupplierSourceId = supplierNodeIds[suppliers[0]?.id + '_source'];

        // 🎯 RECEIVING WAREHOUSE LOGIC (Multi-Transport Support)
        let productionSourceIds = suppliers.map(s => supplierNodeIds[s.id + '_source']);
        let startXForProduction = 450;
        const receivingTransportNodes = {}; // Map process ID to transport node ID

        if (receiving?.enabled) {
            const whRecId = 'node_wh_receiving';
            startXForProduction = 750;

            newNodes.push({
                id: whRecId,
                type: 'generic',
                position: { x: 400, y: 150 },
                data: { symbolType: VSMSymbols.WAREHOUSE_RECEIVING, name: t('vsm.nodes.receiving'), amount: receiving.amount }
            });

            // Connect all supplier sources to receiving
            productionSourceIds.forEach((srcId, idx) => {
                newEdges.push({
                    id: `edge_supp_to_rec_${idx}`,
                    source: srcId,
                    target: whRecId,
                    type: 'smoothstep',
                    style: { strokeWidth: 2 }
                });
            });

            // Create transport nodes for each process that receives from Receiving
            let transportXOffset = 550; // Start X position (to the right of Receiving)
            const transportY = 150; // Same Y as Receiving warehouse (horizontal alignment)
            let hasAnyTransportNode = false;
            let transportNodeCount = 0;

            processes.forEach((proc, idx) => {
                if (proc.inputSource === 'receiving') {
                    const transRecId = `node_rec_transport_${idx}`;
                    const transportMode = proc.transportFromReceiving || VSMSymbols.TROLLEY;

                    receivingTransportNodes[proc.id] = transRecId;
                    hasAnyTransportNode = true;

                    newNodes.push({
                        id: transRecId,
                        type: 'generic',
                        position: { x: transportXOffset + (transportNodeCount * 150), y: transportY },
                        data: { symbolType: transportMode, name: '' }
                    });

                    newEdges.push({
                        id: `edge_rec_to_trans_${idx}`,
                        source: whRecId,
                        sourceHandle: 'right',
                        target: transRecId,
                        targetHandle: 'left',
                        type: 'smoothstep',
                        style: { strokeWidth: 2 }
                    });

                    transportNodeCount++; // Increment for horizontal spacing
                }
            });

            // If no processes explicitly set inputSource='receiving', create a default transport node
            // This ensures ALL material flows through Receiving when it's enabled
            if (!hasAnyTransportNode) {
                const defaultTransId = 'node_rec_transport_default';
                const defaultTransportMode = receiving.transportMode || VSMSymbols.TROLLEY;

                newNodes.push({
                    id: defaultTransId,
                    type: 'generic',
                    position: { x: 550, y: 150 },
                    data: { symbolType: defaultTransportMode, name: '' }
                });

                newEdges.push({
                    id: 'edge_rec_to_trans_default',
                    source: whRecId,
                    sourceHandle: 'right',
                    target: defaultTransId,
                    targetHandle: 'left',
                    type: 'smoothstep',
                    style: { strokeWidth: 2 }
                });

                productionSourceIds = [defaultTransId];
            } else {
                // Update productionSourceIds to include the first transport node
                const firstTransportId = Object.values(receivingTransportNodes)[0];
                if (firstTransportId) {
                    productionSourceIds = [firstTransportId];
                }
            }
        }

        // 2. Production Control (Top Center)
        const controlId = 'node_control';
        const controlX = (processes.length * 200) + 600;
        newNodes.push({
            id: controlId,
            type: 'productionControl',
            position: { x: controlX, y: -150 },
            data: { name: t('vsm.toolbox.productionControl').toUpperCase() }
        });

        if (useHeijunka) {
            newNodes.push({
                id: 'node_heijunka',
                type: 'generic',
                position: { x: controlX - 100, y: -50 },
                data: { symbolType: VSMSymbols.HEIJUNKA_BOX, name: t('vsm.toolbox.heijunka').toUpperCase() }
            });
        }

        // 3. Customer (Downstream - Right)
        const customerId = 'node_customer';
        const maxProcessX = (processes.length + 1) * 450 + 800;
        const customerX = Math.max(1200, maxProcessX);

        newNodes.push({
            id: customerId,
            type: 'generic',
            position: { x: customerX, y: 350 }, // Lowered y for process alignment
            data: {
                symbolType: VSMSymbols.CUSTOMER,
                name: customer.name,
                demand: customer.demand,
                shifts: customer.shifts,
                availableTime: customer.hoursPerShift * 60,
                packSize: customer.packSize
            }
        });

        // 🎯 FLEXIBLE FLOW LOGIC
        const shipId = 'node_shipping_cust';
        let processChainTargetId = shipId; // Default for production

        newNodes.push({
            id: shipId,
            type: 'generic',
            position: { x: customerX - 220, y: 320 },
            data: { symbolType: customer.transportMode || VSMSymbols.TRUCK, name: t('vsm.wizard.shipping').toUpperCase() }
        });

        newEdges.push({
            id: 'edge_ship_to_cust',
            source: shipId,
            target: customerId,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { strokeWidth: 2 }
        });

        if (customer.source === 'warehouse') {
            const whfgId = 'node_wh_fg';
            processChainTargetId = whfgId;
            newNodes.push({
                id: whfgId,
                type: 'inventory',
                position: { x: customerX - 440, y: 350 },
                data: { name: t('vsm.wizard.fgWh').toUpperCase(), amount: 2000 }
            });
            newEdges.push({
                id: 'edge_whfg_to_ship',
                source: whfgId,
                target: shipId,
                type: 'smoothstep',
                style: { strokeWidth: 2 }
            });
        } else if (customer.source === 'supplier') {
            newEdges.push({
                id: 'edge_supp_direct_to_ship',
                source: productionSourceIds[0],
                target: shipId,
                type: 'smoothstep',
                style: { strokeWidth: 3, stroke: '#4caf50' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' }
            });
            processChainTargetId = customerId;
        }

        // 4. Processes & Buffers (Horizontal Chain with Parallel Support)
        let lastNodeIds = productionSourceIds;
        let currentX = startXForProduction;
        let baseHeight = 350;
        let parallelCount = 0;
        let sourceOfCurrentBranch = productionSourceIds[0];
        const mainSupplierId = suppliers[0]?.id;
        let pacemakerProcId = null;

        processes.forEach((proc, idx) => {
            const procId = `node_proc_${idx + 1}`;
            pacemakerProcId = procId; // Last one will be the pacemaker

            // Map all assigned suppliers to their actual source nodes (Supplier or WH)
            const targetSupplierSourceIds = (proc.supplierIds || [suppliers[0]?.id]).map(sid => supplierNodeIds[sid + '_source'] || firstSupplierSourceId);

            // Adjust coordinates for parallel
            let nodeY = baseHeight;
            let nodeX = currentX;

            if (proc.isParallel) {
                parallelCount++;
                nodeY += (parallelCount * 250);
                nodeX -= 450;
            } else {
                parallelCount = 0;
                sourceOfCurrentBranch = lastNodeIds[0];
            }

            newNodes.push({
                id: procId,
                type: 'process',
                position: { x: nodeX, y: nodeY },
                data: {
                    name: proc.name,
                    ct: proc.ct,
                    va: proc.va || proc.ct,
                    co: proc.coUnit === 'sec' ? (proc.co / 60).toFixed(2) : proc.co,
                    workers: proc.workers,
                    performance: proc.performance,
                    yield: proc.yield || 99,
                    uptime: proc.uptime || 95,
                    bom: proc.bom || {}
                }
            });

            // If Kaizen toggled
            if (proc.hasKaizen) {
                newNodes.push({
                    id: `node_kaizen_${idx + 1}`,
                    type: 'generic',
                    position: { x: nodeX + 50, y: nodeY - 100 },
                    data: { symbolType: VSMSymbols.KAIZEN_BURST, name: t('vsm.toolbox.kaizenBurst').toUpperCase() + '!' }
                });
            }

            // If Go See toggled
            if (proc.needsGoSee) {
                newNodes.push({
                    id: `node_gosee_${idx + 1}`,
                    type: 'generic',
                    position: { x: nodeX + 150, y: nodeY - 100 },
                    data: { symbolType: VSMSymbols.EYE_OBSERVATION, name: t('vsm.toolbox.goSee').toUpperCase() }
                });
            }

            // CONNECTION LOGIC (Multi-Supplier & Multi-Entry aware)
            const isPull = proc.flowType === 'pull';
            const connectorStyle = { strokeWidth: isPull ? 3 : 2, stroke: isPull ? '#ff9900' : '#fff', strokeDasharray: isPull ? '10,5' : '0' };
            const connectorMarker = { type: MarkerType.ArrowClosed, color: isPull ? '#ff9900' : '#fff' };

            if (!proc.isParallel) {
                // LINEAR: Merge branches

                // NEW: Check if this process receives from Receiving
                if (proc.inputSource === 'receiving' && receivingTransportNodes[proc.id]) {
                    // Connect from dedicated transport node
                    newEdges.push({
                        id: `edge_trans_to_proc_${idx}`,
                        source: receivingTransportNodes[proc.id],
                        target: procId,
                        type: 'smoothstep',
                        markerEnd: connectorMarker,
                        style: connectorStyle
                    });
                } else if (idx === 0) {
                    // Start of flow: Connect to Receiving Warehouse if enabled, else to assigned suppliers
                    const sourcesToConnect = receiving?.enabled ? lastNodeIds : targetSupplierSourceIds;

                    sourcesToConnect.forEach((srcId, sIdx) => {
                        newEdges.push({
                            id: `edge_mat_init_${idx}_${sIdx}`,
                            source: srcId,
                            target: procId,
                            type: 'smoothstep',
                            markerEnd: connectorMarker,
                            style: connectorStyle
                        });
                    });
                } else {
                    // Connect from previous process
                    lastNodeIds.forEach((srcId, sIdx) => {
                        newEdges.push({
                            id: `edge_mat_merge_${idx}_${sIdx}`,
                            source: srcId,
                            target: procId,
                            type: 'smoothstep',
                            markerEnd: connectorMarker,
                            style: connectorStyle
                        });
                    });
                }
            } else {
                // PARALLEL: It's either a branch from mid-stream OR a new entry from supplier(s)
                const hasExtraSupplier = proc.supplierIds?.some(sid => sid !== mainSupplierId);

                // NEW: If Receiving is enabled, parallel processes CANNOT connect directly to suppliers
                // They must either connect to Receiving transport or branch from mid-stream
                if (hasExtraSupplier && !receiving?.enabled) {
                    // Only allow direct supplier connection if Receiving is NOT enabled
                    targetSupplierSourceIds.forEach((srcId, sIdx) => {
                        newEdges.push({
                            id: `edge_mat_branch_supp_${idx}_${sIdx}`,
                            source: srcId,
                            target: procId,
                            type: 'smoothstep',
                            markerEnd: connectorMarker,
                            style: connectorStyle
                        });
                    });
                } else {
                    // Pure mid-stream branch
                    newEdges.push({
                        id: `edge_mat_branch_mid_${idx}`,
                        source: sourceOfCurrentBranch,
                        target: procId,
                        type: 'smoothstep',
                        markerEnd: connectorMarker,
                        style: connectorStyle
                    });
                }
            }

            let currentLastId = procId;

            // Buffer after process
            if (proc.buffer !== 'none') {
                const bufferId = `node_buffer_${idx + 1}`;
                let symbType = VSMSymbols.INVENTORY;
                if (proc.buffer === 'supermarket') symbType = VSMSymbols.SUPERMARKET;
                if (proc.buffer === 'fifo') symbType = VSMSymbols.FIFO;
                if (proc.buffer === 'safety') symbType = VSMSymbols.SAFETY_STOCK;

                newNodes.push({
                    id: bufferId,
                    type: proc.buffer === 'inventory' ? 'inventory' : 'generic',
                    position: { x: nodeX + 220, y: nodeY },
                    data: { symbolType: symbType, name: proc.buffer.toUpperCase(), amount: proc.bufferQty }
                });

                newEdges.push({
                    id: `edge_proc_to_buf_${idx}`,
                    source: procId,
                    target: bufferId,
                    type: 'smoothstep',
                    markerEnd: { type: MarkerType.ArrowClosed },
                    style: { strokeWidth: 2 }
                });
                currentLastId = bufferId;
            }

            if (proc.isParallel) {
                lastNodeIds.push(currentLastId);
            } else {
                lastNodeIds = [currentLastId];
                currentX += 450;
            }
        });

        // 5. Final Connections to Customer Target
        lastNodeIds.forEach((lastId, idx) => {
            newEdges.push({
                id: `edge_to_customer_target_${idx}`,
                source: lastId,
                target: processChainTargetId,
                type: 'smoothstep',
                markerEnd: { type: MarkerType.ArrowClosed },
                style: { strokeWidth: 2 }
            });
        });

        const isElec = infoFlow === 'electronic';

        // Customer -> Control (Information Flow)
        newEdges.push({
            id: 'info_c_ctrl', source: customerId, target: controlId, type: 'smoothstep',
            style: { strokeDasharray: isElec ? '0' : '5,5', stroke: '#0078d4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0078d4' }
        });

        // Control -> Pacemaker Process (Last process in chain)
        if (pacemakerProcId) {
            newEdges.push({
                id: 'info_ctrl_to_pacemaker',
                source: controlId,
                target: pacemakerProcId,
                type: 'smoothstep',
                label: t('vsm.wizard.controlTitle').toUpperCase(),
                style: { strokeDasharray: isElec ? '0' : '5,5', stroke: '#0078d4' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#0078d4' }
            });
        }

        // Control -> ALL Suppliers
        suppliers.forEach(supp => {
            newEdges.push({
                id: `info_ctrl_s_${supp.id}`,
                source: controlId,
                target: supplierNodeIds[supp.id],
                type: 'smoothstep',
                style: { strokeDasharray: isElec ? '0' : '5,5', stroke: '#0078d4' },
                markerEnd: { type: MarkerType.ArrowClosed, color: '#0078d4' }
            });
        });

        const nodesWithTakt = newNodes.map(n => ({
            ...n,
            data: { ...n.data, globalTakt: globalTakt }
        }));

        setNodes(nodesWithTakt);
        setEdges(newEdges);
        pushToHistory({ nodes: nodesWithTakt, edges: newEdges });
        await showAlert(t('vsm.title'), t('vsm.ai.title') + '!');
    };

    // --- Save/Load Functions ---

    const handleSaveToDatabase = async () => {
        try {
            let name = vsmName;
            if (!vsmId || vsmName === 'New VSM') {
                const inputName = await showPrompt(
                    t('vsm.title'),
                    t('vsm.nodes.noteDefault') + ':'
                );
                if (!inputName) return;
                name = inputName;
                setVsmName(name);
            }

            const vsmData = {
                id: vsmId,
                nodes,
                edges,
                metrics,
                globalTakt
            };

            const id = await saveVSM(name, vsmData);
            setVsmId(id);

            // Also save to global for backward compatibility
            localStorage.setItem('vsm_flow_data', JSON.stringify({
                nodes,
                edges,
                globalTakt,
                timestamp: new Date().toISOString()
            }));

            const successMsg = `✅ ${t('vsm.nodes.noteDefault')}!`;
            await showAlert(t('vsm.title'), successMsg);
        } catch (error) {
            console.error('Save to database failed:', error);
            const errorMsg = `❌ ` + error.message;
            await showAlert(t('vsm.ai.subtitle'), errorMsg);
        }
    };

    const handleSaveToFile = async () => {
        try {
            const vsmData = {
                version: '1.0',
                timestamp: new Date().toISOString(),
                nodes,
                edges,
                globalTakt,
                customLibrary,
                metadata: {
                    totalNodes: nodes.length,
                    totalEdges: edges.length,
                    metrics
                }
            };

            const dataStr = JSON.stringify(vsmData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `vsm-${new Date().toISOString().split('T')[0]}.mavi-vsm`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            const successMsg = `✅ Saved!`;
            await showAlert(t('vsm.title'), successMsg);
        } catch (error) {
            console.error('Save failed:', error);
            const errorMsg = `❌ ` + error.message;
            await showAlert(t('vsm.ai.subtitle'), errorMsg);
        }
    };

    const handleLoadFromFile = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target?.result;
                if (typeof content !== 'string') {
                    throw new Error('Invalid file content');
                }

                const vsmData = JSON.parse(content);

                // Validate structure
                if (!vsmData.nodes || !Array.isArray(vsmData.nodes)) {
                    throw new Error(t('vsm.templates.invalidNodes'));
                }
                if (!vsmData.edges || !Array.isArray(vsmData.edges)) {
                    throw new Error(t('vsm.templates.invalidEdges'));
                }

                // Ask user: replace or merge?
                const shouldReplace = await showConfirm(
                    t('vsm.title'),
                    t('vsm.ai.loadConfirm', {
                        nodes: vsmData.nodes.length,
                        edges: vsmData.edges.length,
                        replace: t('vsm.ai.modeReplace'),
                        merge: t('vsm.ai.modeMerge')
                    })
                );

                if (shouldReplace) {
                    if (vsmData.globalTakt) setGlobalTakt(vsmData.globalTakt);
                    const finalNodes = vsmData.nodes.map(n => ({
                        ...n,
                        data: { ...n.data, globalTakt: vsmData.globalTakt || globalTakt }
                    }));
                    setNodes(finalNodes);
                    setEdges(vsmData.edges);
                    if (vsmData.customLibrary) {
                        setCustomLibrary(vsmData.customLibrary);
                        localStorage.setItem('vsm_custom_icons', JSON.stringify(vsmData.customLibrary));
                    }
                    pushToHistory({ nodes: finalNodes, edges: vsmData.edges });
                } else {
                    // Merge mode - offset loaded nodes
                    const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
                    const offsetX = maxX + 300;

                    const offsetNodes = vsmData.nodes.map(node => ({
                        ...node,
                        id: `${node.id}-${Date.now()}`,
                        position: {
                            x: node.position.x + offsetX,
                            y: node.position.y
                        }
                    }));

                    const nodeIdMap = {};
                    vsmData.nodes.forEach((oldNode, idx) => {
                        nodeIdMap[oldNode.id] = offsetNodes[idx].id;
                    });

                    const offsetEdges = vsmData.edges.map(edge => ({
                        ...edge,
                        id: `${edge.id}-${Date.now()}`,
                        source: nodeIdMap[edge.source] || edge.source,
                        target: nodeIdMap[edge.target] || edge.target
                    }));

                    const newNodes = [...nodes, ...offsetNodes];
                    const newEdges = [...edges, ...offsetEdges];
                    setNodes(newNodes);
                    setEdges(newEdges);
                    pushToHistory({ nodes: newNodes, edges: newEdges });

                    if (vsmData.customLibrary) {
                        const mergedLibrary = [...customLibrary, ...vsmData.customLibrary];
                        setCustomLibrary(mergedLibrary);
                        localStorage.setItem('vsm_custom_icons', JSON.stringify(mergedLibrary));
                    }
                }

                const successMsg = t('vsm.templates.loadSuccessGeneric');
                await showAlert(t('vsm.title'), successMsg);

            } catch (error) {
                console.error('Load failed:', error);
                const errorMsg = error.message;
                await showAlert(t('vsm.templates.loadError'), errorMsg);
            }
        };

        reader.onerror = async () => {
            await showAlert(t('vsm.ai.subtitle'), '❌');
        };

        reader.readAsText(file);
        // Reset input so same file can be loaded again
        event.target.value = '';
    };

    // VSM Templates Library
    const getVSMTemplates = () => {
        return {
            simple: {
                name: t('vsm.templates.simple'),
                description: t('vsm.templates.descSimple'),
                globalTakt: 60,
                nodes: [
                    { "id": "supplier-simple", "type": "generic", "position": { "x": 100, "y": 200 }, "data": { "symbolType": "supplier", "name": "Material Supplier", "color": "#1e1e1e", "globalTakt": 60 } },
                    { "id": "process-painting", "type": "process", "position": { "x": 400, "y": 200 }, "data": { "name": "Painting", "ct": 45, "cycleTime": 45, "co": 30, "uptime": 90, "yield": 95, "performance": 88, "va": 45, "operators": 2, "shifts": 1, "startTime": "08:00", "endTime": "17:00", "processType": "normal", "globalTakt": 60 } },
                    { "id": "customer-simple", "type": "generic", "position": { "x": 700, "y": 200 }, "data": { "symbolType": "customer", "name": "Customer", "demand": 500, "unit": "pcs", "availableTime": 480, "shifts": 1, "daysPerMonth": 22, "packSize": 10, "taktTime": 60, "globalTakt": 60 } }
                ],
                edges: [
                    { "id": "e-s-p", "source": "supplier-simple", "target": "process-painting", "type": "default", "animated": false, "style": { "stroke": "#4caf50", "strokeWidth": 2 } },
                    { "id": "e-p-c", "source": "process-painting", "target": "customer-simple", "type": "default", "animated": false, "style": { "stroke": "#0078d4", "strokeWidth": 2 } }
                ]
            },
            intermediate: {
                name: t('vsm.templates.intermediate'),
                description: t('vsm.templates.descIntermediate'),
                globalTakt: 45,
                nodes: [
                    { "id": "supplier-1", "type": "generic", "position": { "x": 50, "y": 200 }, "data": { "symbolType": "supplier", "name": "Steel Supplier", "color": "#1e1e1e", "globalTakt": 45 } },
                    { "id": "raw-inventory-1", "type": "inventory", "position": { "x": 200, "y": 200 }, "data": { "name": "Raw Material", "amount": 500, "inventory": 500, "unit": "kg", "time": 172800, "calculatedLT": 2, "level": 65, "minStock": 30, "maxStock": 90, "globalTakt": 45 } },
                    { "id": "truck-1", "type": "generic", "position": { "x": 125, "y": 100 }, "data": { "symbolType": "truck", "name": "Daily Milk Run", "frequency": 2, "capacity": 500, "leadTime": 45, "cycleTime": 3888000, "startTime": "08:00", "endTime": "17:00", "globalTakt": 45 } },
                    { "id": "process-1", "type": "process", "position": { "x": 350, "y": 200 }, "data": { "name": "Stamping", "ct": 35, "cycleTime": 35, "co": 45, "uptime": 92, "yield": 98, "performance": 88, "va": 35, "operators": 2, "shifts": 2, "startTime": "08:00", "endTime": "17:00", "processType": "normal", "globalTakt": 45 } },
                    { "id": "wip-inventory-1", "type": "inventory", "position": { "x": 500, "y": 200 }, "data": { "name": "WIP Buffer", "amount": 200, "inventory": 200, "unit": "pcs", "time": 86400, "calculatedLT": 1, "level": 45, "minStock": 25, "maxStock": 85, "globalTakt": 45 } },
                    { "id": "process-2", "type": "process", "position": { "x": 650, "y": 200 }, "data": { "name": "Welding", "ct": 52, "cycleTime": 52, "co": 30, "uptime": 88, "yield": 96, "performance": 85, "va": 48, "operators": 3, "shifts": 2, "startTime": "08:00", "endTime": "17:00", "processType": "pacemaker", "globalTakt": 45 } },
                    { "id": "wip-inventory-2", "type": "inventory", "position": { "x": 800, "y": 200 }, "data": { "name": "Assembly Queue", "amount": 150, "inventory": 150, "unit": "pcs", "time": 43200, "calculatedLT": 0.5, "level": 55, "minStock": 20, "maxStock": 80, "globalTakt": 45 } },
                    { "id": "process-3", "type": "process", "position": { "x": 950, "y": 200 }, "data": { "name": "Assembly", "ct": 38, "cycleTime": 38, "co": 20, "uptime": 95, "yield": 99, "performance": 92, "va": 38, "operators": 4, "shifts": 2, "startTime": "08:00", "endTime": "17:00", "processType": "normal", "globalTakt": 45 } },
                    { "id": "finished-goods", "type": "generic", "position": { "x": 1100, "y": 200 }, "data": { "symbolType": "finished_goods", "name": "FG Warehouse", "amount": 300, "inventory": 300, "level": 70, "minStock": 40, "maxStock": 95, "globalTakt": 45 } },
                    { "id": "customer-1", "type": "generic", "position": { "x": 1300, "y": 200 }, "data": { "symbolType": "customer", "name": "OEM Customer", "demand": 800, "unit": "pcs", "availableTime": 480, "shifts": 2, "daysPerMonth": 22, "packSize": 10, "taktTime": 45, "globalTakt": 45 } },
                    { "id": "truck-2", "type": "generic", "position": { "x": 1200, "y": 100 }, "data": { "symbolType": "truck", "name": "Delivery Truck", "frequency": 3, "capacity": 300, "leadTime": 30, "cycleTime": 2592000, "startTime": "08:00", "endTime": "17:00", "globalTakt": 45 } },
                    { "id": "production-control", "type": "generic", "position": { "x": 675, "y": 50 }, "data": { "symbolType": "production_control", "name": "Production Planning", "globalTakt": 45 } }
                ],
                edges: [
                    { "id": "e-supplier-truck", "source": "supplier-1", "target": "truck-1", "type": "default", "animated": false, "style": { "stroke": "#4caf50", "strokeWidth": 2 } },
                    { "id": "e-truck-inventory", "source": "truck-1", "target": "raw-inventory-1", "type": "default", "animated": false, "style": { "stroke": "#4caf50", "strokeWidth": 2 } },
                    { "id": "e-inv1-proc1", "source": "raw-inventory-1", "target": "process-1", "type": "default", "animated": false, "style": { "stroke": "#4caf50", "strokeWidth": 2 } },
                    { "id": "e-proc1-wip1", "source": "process-1", "target": "wip-inventory-1", "type": "default", "animated": false, "style": { "stroke": "#ff9900", "strokeWidth": 2 } },
                    { "id": "e-wip1-proc2", "source": "wip-inventory-1", "target": "process-2", "type": "default", "animated": false, "style": { "stroke": "#ff9900", "strokeWidth": 2 } },
                    { "id": "e-proc2-wip2", "source": "process-2", "target": "wip-inventory-2", "type": "default", "animated": false, "style": { "stroke": "#ff9900", "strokeWidth": 2 } },
                    { "id": "e-wip2-proc3", "source": "wip-inventory-2", "target": "process-3", "type": "default", "animated": false, "style": { "stroke": "#ff9900", "strokeWidth": 2 } },
                    { "id": "e-proc3-fg", "source": "process-3", "target": "finished-goods", "type": "default", "animated": false, "style": { "stroke": "#0078d4", "strokeWidth": 2 } },
                    { "id": "e-fg-truck2", "source": "finished-goods", "target": "truck-2", "type": "default", "animated": false, "style": { "stroke": "#0078d4", "strokeWidth": 2 } },
                    { "id": "e-truck2-customer", "source": "truck-2", "target": "customer-1", "type": "default", "animated": false, "style": { "stroke": "#0078d4", "strokeWidth": 2 } }
                ]
            },
            advanced: {
                name: t('vsm.templates.advanced'),
                description: t('vsm.templates.descAdvanced'),
                globalTakt: 50,
                nodes: [
                    { "id": "overseas-supplier", "type": "generic", "position": { "x": 50, "y": 250 }, "data": { "symbolType": "supplier", "name": "Overseas Supplier", "color": "#1e1e1e", "globalTakt": 50 } },
                    { "id": "sea-import", "type": "generic", "position": { "x": 200, "y": 150 }, "data": { "symbolType": "sea", "name": "Sea Import", "frequency": 1, "capacity": 5000, "cycleTime": 2419200, "leadTime": 28, "globalTakt": 50 } },
                    { "id": "import-inventory", "type": "inventory", "position": { "x": 350, "y": 250 }, "data": { "name": "Import Buffer", "amount": 3000, "inventory": 3000, "unit": "kg", "time": 10368000, "calculatedLT": 120, "level": 70, "minStock": 40, "maxStock": 90, "globalTakt": 50 } },
                    { "id": "raw-warehouse", "type": "generic", "position": { "x": 500, "y": 250 }, "data": { "symbolType": "warehouse_receiving", "name": "Raw Warehouse", "amount": 2500, "inventory": 2500, "globalTakt": 50 } },
                    { "id": "process-stamping", "type": "process", "position": { "x": 650, "y": 250 }, "data": { "name": "Stamping", "ct": 40, "cycleTime": 40, "co": 60, "uptime": 90, "yield": 97, "performance": 86, "va": 40, "operators": 3, "shifts": 3, "startTime": "00:00", "endTime": "23:59", "processType": "normal", "globalTakt": 50 } },
                    { "id": "wip-1", "type": "inventory", "position": { "x": 800, "y": 250 }, "data": { "name": "WIP-1", "amount": 400, "inventory": 400, "unit": "pcs", "time": 86400, "calculatedLT": 1, "level": 50, "minStock": 25, "maxStock": 85, "globalTakt": 50 } },
                    { "id": "process-welding", "type": "process", "position": { "x": 950, "y": 250 }, "data": { "name": "Welding", "ct": 55, "cycleTime": 55, "co": 45, "uptime": 85, "yield": 95, "performance": 82, "va": 50, "operators": 4, "shifts": 3, "startTime": "00:00", "endTime": "23:59", "processType": "pacemaker", "globalTakt": 50 } },
                    { "id": "wip-2", "type": "inventory", "position": { "x": 1100, "y": 250 }, "data": { "name": "WIP-2", "amount": 350, "inventory": 350, "unit": "pcs", "time": 86400, "calculatedLT": 1, "level": 45, "minStock": 20, "maxStock": 80, "globalTakt": 50 } },
                    { "id": "process-assembly", "type": "process", "position": { "x": 1250, "y": 250 }, "data": { "name": "Assembly", "ct": 42, "cycleTime": 42, "co": 30, "uptime": 92, "yield": 98, "performance": 90, "va": 42, "operators": 5, "shifts": 3, "startTime": "00:00", "endTime": "23:59", "processType": "normal", "globalTakt": 50 } },
                    { "id": "wip-3", "type": "inventory", "position": { "x": 1400, "y": 250 }, "data": { "name": "WIP-3", "amount": 300, "inventory": 300, "unit": "pcs", "time": 43200, "calculatedLT": 0.5, "level": 55, "minStock": 30, "maxStock": 85, "globalTakt": 50 } },
                    { "id": "process-painting", "type": "process", "position": { "x": 1550, "y": 250 }, "data": { "name": "Painting", "ct": 48, "cycleTime": 48, "co": 40, "uptime": 88, "yield": 96, "performance": 85, "va": 45, "operators": 3, "shifts": 3, "startTime": "00:00", "endTime": "23:59", "processType": "normal", "globalTakt": 50 } },
                    { "id": "fg-inventory", "type": "inventory", "position": { "x": 1700, "y": 250 }, "data": { "name": "Finished Goods", "amount": 800, "inventory": 800, "unit": "pcs", "time": 259200, "calculatedLT": 3, "level": 65, "minStock": 35, "maxStock": 90, "globalTakt": 50 } },
                    { "id": "sea-export", "type": "generic", "position": { "x": 1850, "y": 150 }, "data": { "symbolType": "sea", "name": "Sea Export", "frequency": 1, "capacity": 1000, "cycleTime": 2419200, "leadTime": 28, "globalTakt": 50 } },
                    { "id": "global-customer", "type": "generic", "position": { "x": 2000, "y": 250 }, "data": { "symbolType": "customer", "name": "Global Customer", "demand": 1200, "unit": "pcs", "availableTime": 1440, "shifts": 3, "daysPerMonth": 22, "packSize": 20, "taktTime": 50, "globalTakt": 50 } },
                    { "id": "production-control", "type": "generic", "position": { "x": 1025, "y": 50 }, "data": { "symbolType": "production_control", "name": "MRP System", "globalTakt": 50 } }
                ],
                edges: [
                    { "id": "e-sup-sea", "source": "overseas-supplier", "target": "sea-import", "type": "default" },
                    { "id": "e-sea-inv", "source": "sea-import", "target": "import-inventory", "type": "default" },
                    { "id": "e-inv-wh", "source": "import-inventory", "target": "raw-warehouse", "type": "default" },
                    { "id": "e-wh-stamp", "source": "raw-warehouse", "target": "process-stamping", "type": "default" },
                    { "id": "e-stamp-wip1", "source": "process-stamping", "target": "wip-1", "type": "default" },
                    { "id": "e-wip1-weld", "source": "wip-1", "target": "process-welding", "type": "default" },
                    { "id": "e-weld-wip2", "source": "process-welding", "target": "wip-2", "type": "default" },
                    { "id": "e-wip2-assy", "source": "wip-2", "target": "process-assembly", "type": "default" },
                    { "id": "e-assy-wip3", "source": "process-assembly", "target": "wip-3", "type": "default" },
                    { "id": "e-wip3-paint", "source": "wip-3", "target": "process-painting", "type": "default" },
                    { "id": "e-paint-fg", "source": "process-painting", "target": "fg-inventory", "type": "default" },
                    { "id": "e-fg-seaexp", "source": "fg-inventory", "target": "sea-export", "type": "default" },
                    { "id": "e-seaexp-cust", "source": "sea-export", "target": "global-customer", "type": "default" }
                ]
            },
            integratedSupplyChain: {
                name: t('vsm.templates.integrated'),
                description: t('vsm.templates.descIntegrated'),
                globalTakt: 57.6, // Takt time: 28800s / 500 units = 57.6s/unit
                nodes: [
                    // CUSTOMER (End Point)
                    { "id": "isc-customer", "type": "generic", "position": { "x": 1450, "y": 400 }, "data": { "symbolType": "customer", "name": "High-Priority Client", "demand": 500, "globalTakt": 57.6 } },

                    // DELIVERY PROCESS
                    { "id": "isc-shipping", "type": "generic", "position": { "x": 1250, "y": 400 }, "data": { "symbolType": "warehouse_shipping", "name": "Express Delivery", "processingTime": 0.25, "globalTakt": 57.6 } }, // 0.25 days = 6 hours

                    // FINISHED GOODS INVENTORY
                    { "id": "isc-fg-inv", "type": "inventory", "position": { "x": 1050, "y": 400 }, "data": { "name": "Finished Goods", "amount": 500, "inventory": 500, "safetyStock": 100, "holdingCostPerDay": 2.0, "globalTakt": 57.6 } },

                    // QUALITY INSPECTION PROCESS
                    { "id": "isc-proc-qc", "type": "process", "position": { "x": 850, "y": 400 }, "data": { "name": "Quality Inspection", "cycleTime": 60, "ct": 60, "shiftPattern": 1, "costPerUnit": 5, "globalTakt": 57.6 } },

                    // WIP BUFFER
                    { "id": "isc-wip-inv", "type": "inventory", "position": { "x": 650, "y": 400 }, "data": { "name": "WIP Buffer", "amount": 150, "inventory": 150, "safetyStock": 50, "holdingCostPerDay": 1.0, "globalTakt": 57.6 } },

                    // MAIN MANUFACTURING PROCESS (Bottleneck)
                    { "id": "isc-proc-mfg", "type": "process", "position": { "x": 450, "y": 400 }, "data": { "name": "Main Manufacturing", "cycleTime": 120, "ct": 120, "shiftPattern": 2, "overtimeAllowed": true, "costPerUnit": 15, "wipLimit": 200, "globalTakt": 57.6 } },

                    // RAW MATERIALS INVENTORY
                    { "id": "isc-raw-inv", "type": "inventory", "position": { "x": 250, "y": 400 }, "data": { "name": "Raw Materials", "amount": 1000, "inventory": 1000, "safetyStock": 200, "holdingCostPerDay": 0.5, "globalTakt": 57.6 } },

                    // SUPPLIERS
                    { "id": "isc-sup-1", "type": "generic", "position": { "x": 50, "y": 350 }, "data": { "symbolType": "supplier", "name": "Steel Supplier A", "costPerUnit": 10, "leadTime": 0.5, "globalTakt": 57.6 } }, // 0.5 days lead time
                    { "id": "isc-sup-2", "type": "generic", "position": { "x": 50, "y": 450 }, "data": { "symbolType": "supplier", "name": "Backup Supplier B", "costPerUnit": 12, "priority": 2, "leadTime": 1.0, "globalTakt": 57.6 } } // 1 day lead time
                ],
                edges: [
                    // Material Flow (Right to Left in planning, Left to Right in execution)
                    { "id": "isc-e1", "source": "isc-sup-1", "target": "isc-raw-inv", "type": "default", "data": { "transportTime": 0.5 } },
                    { "id": "isc-e2", "source": "isc-sup-2", "target": "isc-raw-inv", "type": "default", "data": { "transportTime": 1.0, "priority": 2 } },
                    { "id": "isc-e3", "source": "isc-raw-inv", "target": "isc-proc-mfg", "type": "default" },
                    { "id": "isc-e4", "source": "isc-proc-mfg", "target": "isc-wip-inv", "type": "default" },
                    { "id": "isc-e5", "source": "isc-wip-inv", "target": "isc-proc-qc", "type": "default" },
                    { "id": "isc-e6", "source": "isc-proc-qc", "target": "isc-fg-inv", "type": "default" },
                    { "id": "isc-e7", "source": "isc-fg-inv", "target": "isc-shipping", "type": "default" },
                    { "id": "isc-e8", "source": "isc-shipping", "target": "isc-customer", "type": "default" }
                ]
            },
            pullSystem: {
                name: t('vsm.templates.pull'),
                description: t('vsm.templates.descPull'),
                globalTakt: 40,
                nodes: [
                    { "id": "pc-node", "type": "productionControl", "position": { "x": 400, "y": 50 }, "data": { "symbolType": "production_control", "name": "Production Control", "globalTakt": 40 } },
                    { "id": "heijunka-node", "type": "generic", "position": { "x": 400, "y": 150 }, "data": { "symbolType": "heijunka_box", "name": "Heijunka Box", "globalTakt": 40 } },
                    { "id": "supplier-pull", "type": "generic", "position": { "x": 50, "y": 300 }, "data": { "symbolType": "supplier", "name": "Parts Supplier", "globalTakt": 40 } },
                    { "id": "process-mfg", "type": "process", "position": { "x": 400, "y": 300 }, "data": { "name": "Manufacturing", "ct": 38, "co": 15, "uptime": 98, "operators": 2, "processType": "pacemaker", "globalTakt": 40 } },
                    { "id": "supermarket-finish", "type": "generic", "position": { "x": 650, "y": 300 }, "data": { "symbolType": "supermarket", "name": "FG Supermarket", "minStock": 50, "maxStock": 200, "globalTakt": 40 } },
                    { "id": "customer-pull", "type": "generic", "position": { "x": 900, "y": 300 }, "data": { "symbolType": "customer", "name": "Customer", "demand": 800, "globalTakt": 40 } }
                ],
                edges: [
                    // Info Flows
                    { "id": "e-info-pc-heijunka", "source": "pc-node", "target": "heijunka-node", "type": "smoothstep", "animated": true, "style": { "stroke": "#00ffff", "strokeWidth": 2, "strokeDasharray": "5 5" }, "markerEnd": { "type": "arrow" } },
                    { "id": "e-kanban-heijunka-proc", "source": "heijunka-node", "target": "process-mfg", "type": "smoothstep", "animated": true, "style": { "stroke": "#ff9900", "strokeWidth": 2, "strokeDasharray": "5 5" } },

                    // Physical Flows
                    { "id": "e-sup-proc", "source": "supplier-pull", "target": "process-mfg", "type": "default" },
                    { "id": "e-proc-super", "source": "process-mfg", "target": "supermarket-finish", "type": "default" },

                    // Withdrawal Kanban
                    { "id": "e-withdrawal", "source": "customer-pull", "target": "supermarket-finish", "type": "smoothstep", "animated": true, "style": { "stroke": "#ff9900", "strokeWidth": 2, "strokeDasharray": "5 5" }, "markerEnd": { "type": "arrow" }, "data": { "symbolType": "kanban_withdrawal" } },

                    // Shipment
                    { "id": "e-shipment", "source": "supermarket-finish", "target": "customer-pull", "type": "default" }
                ]
            },
            expert: {
                name: t('vsm.templates.expert', 'Expert VSM Future State'),
                description: t('vsm.templates.descExpert', 'Comprehensive template with Logistics, Push/Pull mix, and QC.'),
                globalTakt: 55,
                nodes: [
                    // INFORMATION FLOW
                    { "id": "exp-erp", "type": "generic", "position": { "x": 800, "y": 50 }, "data": { "symbolType": "production_control", "name": "ERP / MRP System", "planningFreq": "Weekly", "globalTakt": 55 } },
                    { "id": "exp-heijunka", "type": "generic", "position": { "x": 1200, "y": 150 }, "data": { "symbolType": "heijunka_box", "name": "Heijunka Box", "interval": 20, "pitch": 20, "globalTakt": 55 } },

                    // SUPPLY SIDE
                    { "id": "exp-supplier", "type": "generic", "position": { "x": 50, "y": 300 }, "data": { "symbolType": "supplier", "name": "Global Supplier", "leadTime": 45, "globalTakt": 55 } },
                    { "id": "exp-sea", "type": "generic", "position": { "x": 200, "y": 200 }, "data": { "symbolType": "sea", "name": "Sea Freight", "leadTime": 30, "globalTakt": 55 } },
                    { "id": "exp-wh", "type": "generic", "position": { "x": 350, "y": 300 }, "data": { "symbolType": "warehouse_receiving", "name": "Raw Warehouse", "amount": 5000, "globalTakt": 55 } },

                    // INTERNAL LOGISTICS - TROLLEY (USER REQUEST)
                    { "id": "exp-trolley", "type": "generic", "position": { "x": 480, "y": 350 }, "data": { "symbolType": "trolley", "name": "Milk Run Trolley", "distance": 150, "speed": 60, "globalTakt": 55 } },

                    // PUSH PROCESSING
                    { "id": "exp-stamping", "type": "process", "position": { "x": 600, "y": 300 }, "data": { "name": "Stamping (Push)", "ct": 40, "co": 60, "uptime": 90, "shifts": 2, "processType": "normal", "globalTakt": 55 } },

                    // QC INSPECTION (USER REQUEST)
                    { "id": "exp-qc", "type": "process", "position": { "x": 800, "y": 300 }, "data": { "name": "QC Inspection", "ct": 25, "uptime": 99, "shifts": 2, "processType": "normal", "color": "#c50f1f", "globalTakt": 55 } },

                    { "id": "exp-wip-1", "type": "inventory", "position": { "x": 950, "y": 300 }, "data": { "name": "WIP Buffer", "amount": 100, "globalTakt": 55 } },
                    { "id": "exp-welding", "type": "process", "position": { "x": 1050, "y": 300 }, "data": { "name": "Robotic Welding", "ct": 50, "co": 15, "uptime": 95, "shifts": 2, "processType": "normal", "globalTakt": 55 } },

                    // PULL INTERFACE
                    { "id": "exp-supermarket", "type": "generic", "position": { "x": 1250, "y": 300 }, "data": { "symbolType": "supermarket", "name": "Weldment Supermarket", "minStock": 20, "maxStock": 100, "globalTakt": 55 } },

                    // PACEMAKER LOOP
                    { "id": "exp-assembly", "type": "process", "position": { "x": 1450, "y": 300 }, "data": { "name": "Final Assembly", "ct": 54, "uptime": 98, "shifts": 2, "processType": "pacemaker", "globalTakt": 55 } },
                    { "id": "exp-fg", "type": "generic", "position": { "x": 1650, "y": 300 }, "data": { "symbolType": "finished_goods", "name": "Finished Goods", "amount": 200, "globalTakt": 55 } },

                    // CUSTOMER SIDE
                    { "id": "exp-truck", "type": "generic", "position": { "x": 1800, "y": 200 }, "data": { "symbolType": "truck", "name": "Customer Delivery", "frequency": 4, "globalTakt": 55 } },
                    { "id": "exp-customer", "type": "generic", "position": { "x": 1950, "y": 300 }, "data": { "symbolType": "customer", "name": "Key Customer", "demand": 1200, "taktTime": 55, "globalTakt": 55 } }
                ],
                edges: [
                    // INFO EDGES
                    { "id": "exp-i1", "source": "exp-erp", "target": "exp-supplier", "type": "smoothstep", "style": { "stroke": "#00ffff", "strokeDasharray": "5 5" }, "data": { "type": "electronic" } },
                    { "id": "exp-i2", "source": "exp-erp", "target": "exp-heijunka", "type": "smoothstep", "style": { "stroke": "#00ffff", "strokeDasharray": "5 5" }, "data": { "type": "electronic" } },
                    { "id": "exp-i3", "source": "exp-heijunka", "target": "exp-assembly", "type": "smoothstep", "style": { "stroke": "#ff9900", "strokeDasharray": "5 5" }, "markerEnd": { "type": "arrow" } }, // Scheduling Signal
                    { "id": "exp-i4", "source": "exp-supermarket", "target": "exp-welding", "type": "smoothstep", "style": { "stroke": "#ff9900", "strokeDasharray": "5 5" }, "data": { "symbolType": "signal_kanban" }, "label": "production kanban" },

                    // MATERIAL FLOW
                    { "id": "exp-m1", "source": "exp-supplier", "target": "exp-sea", "type": "default" },
                    { "id": "exp-m2", "source": "exp-sea", "target": "exp-wh", "type": "default" },
                    { "id": "exp-m3", "source": "exp-wh", "target": "exp-trolley", "type": "default" },
                    { "id": "exp-m4", "source": "exp-trolley", "target": "exp-stamping", "type": "default" },

                    // Push Arrow: Stamping -> QC
                    { "id": "exp-m5", "source": "exp-stamping", "target": "exp-qc", "type": "default", "data": { "symbolType": "push_arrow" }, "style": { "strokeDasharray": "5 5", "stroke": "white" }, "markerEnd": { "type": "arrow" } },

                    // Push Arrow: QC -> Welding
                    { "id": "exp-m6", "source": "exp-qc", "target": "exp-welding", "type": "default", "data": { "symbolType": "push_arrow" }, "style": { "strokeDasharray": "5 5", "stroke": "white" }, "markerEnd": { "type": "arrow" } },

                    { "id": "exp-m7", "source": "exp-welding", "target": "exp-supermarket", "type": "default" },

                    // Withdrawal: Assembly pulls from Supermarket
                    { "id": "exp-m8", "source": "exp-assembly", "target": "exp-supermarket", "type": "smoothstep", "style": { "stroke": "#ff9900", "strokeDasharray": "5 5" }, "data": { "symbolType": "kanban_withdrawal" }, "markerEnd": { "type": "arrow" } },

                    // Physical Part Transfer (Simplified)
                    { "id": "exp-m9", "source": "exp-supermarket", "target": "exp-assembly", "type": "default" },

                    { "id": "exp-m10", "source": "exp-assembly", "target": "exp-fg", "type": "default" },
                    { "id": "exp-m11", "source": "exp-fg", "target": "exp-truck", "type": "default" },
                    { "id": "exp-m12", "source": "exp-truck", "target": "exp-customer", "type": "default" }
                ]
            }
        };
    };

    // Load Template with Selection (New Dialog Flow)
    const handleLoadTemplate = () => {
        // Just open the modal
        setShowTemplateModal(true);
    };

    // Callback when template is selected from Selection Modal
    const handleTemplateSelect = (templateKey) => {
        setShowTemplateModal(false); // Close selection modal
        setPendingTemplateKey(templateKey);
        setShowActionModal(true); // Open action/confirmation modal
    };

    // Actual Load Logic triggered by Action Modal
    const handleConfirmLoad = async (mode) => {
        setShowActionModal(false);
        const templateKey = pendingTemplateKey;
        if (!templateKey) return;

        try {
            const templates = getVSMTemplates();
            const template = templates[templateKey];

            if (!template) {
                console.error("Template not found:", templateKey);
                await showAlert(t('vsm.title'), t('vsm.templates.notFound'));
                return;
            }

            if (mode === 'replace') {
                setGlobalTakt(template.globalTakt);
                const finalNodes = template.nodes.map(n => ({
                    ...n,
                    data: { ...n.data, globalTakt: template.globalTakt }
                }));
                setNodes(finalNodes);
                setEdges(template.edges);
                pushToHistory({ nodes: finalNodes, edges: template.edges });
            } else { // Merge mode
                const maxX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
                const offsetX = maxX + 300;

                const offsetNodes = template.nodes.map(node => ({
                    ...node,
                    id: `${node.id}-${Date.now()}`,
                    position: {
                        x: node.position.x + offsetX,
                        y: node.position.y
                    },
                    data: { ...node.data, globalTakt: template.globalTakt }
                }));

                const nodeIdMap = {};
                template.nodes.forEach((oldNode, idx) => {
                    nodeIdMap[oldNode.id] = offsetNodes[idx].id;
                });

                const offsetEdges = template.edges.map(edge => ({
                    ...edge,
                    id: `${edge.id}-${Date.now()}`,
                    source: nodeIdMap[edge.source] || edge.source,
                    target: nodeIdMap[edge.target] || edge.target
                }));

                const newNodes = [...nodes, ...offsetNodes];
                const newEdges = [...edges, ...offsetEdges];
                setNodes(newNodes);
                setEdges(newEdges);
                pushToHistory({ nodes: newNodes, edges: newEdges });
            }

            const successMsg = t('vsm.templates.loadSuccess', { name: template.name });
            await showAlert(t('vsm.title'), successMsg);

        } catch (error) {
            console.error('Template load failed:', error);
            const errorMsg = error.message;
            await showAlert(t('vsm.templates.loadError'), errorMsg);
        }
    };

    // Handle Supply Chain Simulation (CTP) - New Logic opens Modal
    const handleSupplyChainSim = () => {
        setShowSupplyChainModal(true);
    };

    const handleSimulationResult = (result) => {
        if (!result) return;
        setLastSimulationResult(result); // Save for AI Context

        if (!result.nodeStatus) return;

        setNodes(nds => nds.map(node => {
            const status = result.nodeStatus[node.id];
            // Only update if status exists
            if (status) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        simulationResult: status
                    }
                };
            }
            // Clear previous result if not in current run? Or keep it?
            // Let's keep distinct update. If status is undefined, maybe clear it?
            // For now, only update if status matches.
            return node;
        }));
    };

    // --- Render Helpers ---
    const Separator = () => <div style={{ width: '1px', height: '20px', backgroundColor: '#555', margin: '0 5px' }} />;


    // DERIVED CONTEXT FOR AI (Robust Fallback)
    // Even if 'lastSimulationResult' state is null, we can check node data
    const hasSimData = lastSimulationResult || nodes.some(n => n.data?.simulationResult);
    const shortageNodes = nodes.filter(n => n.data?.simulationResult?.shortage > 0);
    const shortageSummary = shortageNodes.length > 0
        ? shortageNodes.map(n => `- ${n.data.label || n.data.name}: SHORTAGE of ${n.data.simulationResult.shortage} units`).join('\n')
        : (hasSimData ? "No Shortages. Demand Met." : "No Simulation Run.");

    // Determine root cause from object or fallback
    const rootCause = lastSimulationResult?.rootCause
        ? lastSimulationResult.rootCause
        : (shortageNodes.length > 0 ? "Material Shortage / Capacity Constraint" : "Unknown");

    // Calculate Bottlenecks for Context
    const bottlenecks = nodes.filter(n => (parseInt(n.data?.ct) || 0) > globalTakt);
    const bottleneckSummary = bottlenecks.length > 0
        ? bottlenecks.map(n => `- ${n.data.label || n.data.name}: Cycle Time ${n.data.ct}s (Exceeds Takt ${globalTakt}s)`).join('\n')
        : "No Bottlenecks detected. All processes are under Takt Time.";

    return (
        <div style={{ display: 'flex', height: '100vh', width: '100%', flexDirection: 'column' }}>
            {/* ... Rest of Toolbar ... */}
            <div style={{
                height: '42px', backgroundColor: '#333', borderBottom: '1px solid #555',
                display: 'flex', alignItems: 'center', padding: '0 15px', gap: '10px', color: 'white',
                overflowX: 'auto', flexShrink: 0
            }}>
                <div style={{
                    fontWeight: '900',
                    fontSize: '1rem',
                    letterSpacing: '0.5px',
                    color: '#0078d4',
                    marginRight: '10px',
                    fontFamily: "'Segoe UI', Roboto, sans-serif"
                }}>MAVi<span style={{ color: 'white', marginLeft: '4px' }}>VSM</span></div>

                <div style={{ display: 'flex', gap: '3px', marginRight: '10px' }}>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#444' }}
                        onClick={() => setShowSidebar(!showSidebar)}
                        title={showSidebar ? t('vsm.toolbox.desc') : t('vsm.toolbox.title')}
                    >
                        {showSidebar ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
                    </button>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#444' }}
                        onClick={() => setShowNodeDetails(!showNodeDetails)}
                        title={showNodeDetails ? t('vsm.analysis.noAnalysisData') : t('vsm.nodes.noteDefault')}
                    >
                        {showNodeDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                </div>

                <div style={toolbarGroupStyle}>
                    <button style={btnStyle} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
                        <Undo size={14} />
                    </button>
                    <button style={btnStyle} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
                        <Redo size={14} />
                    </button>
                </div>

                <Separator />

                <div style={toolbarGroupStyle}>
                    <button style={btnStyle} onClick={() => handleAlign('left')} title={t('common.alignLeft') || 'Align Left'}>
                        <ArrowLeft size={14} />
                    </button>
                    <button style={btnStyle} onClick={() => handleAlign('top')} title={t('common.alignTop') || 'Align Top'}>
                        <ArrowUp size={14} />
                    </button>
                </div>

                <Separator />

                <div style={toolbarGroupStyle}>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#0078d4' }}
                        onClick={handleSaveToDatabase}
                        title={t('vsm.calculate') + ' ' + t('vsm.nodes.noteDefault')}
                    >
                        <Save size={14} />
                    </button>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#107c10' }}
                        onClick={() => fileInputRef.current?.click()}
                        title={t('vsm.addProcess') + ' ' + t('vsm.nodes.noteDefault')}
                    >
                        <Folder size={14} />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".mavi-vsm,.json"
                        onChange={handleLoadFromFile}
                        style={{ display: 'none' }}
                    />
                    <button
                        style={{ ...btnStyle, backgroundColor: '#8a2be2' }}
                        onClick={() => handleLoadTemplate()}
                        title={t('vsm.templates.title')}
                    >
                        <Layout size={14} />
                    </button>
                </div>

                <Separator />

                <div style={toolbarGroupStyle}>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#ff6b35' }}
                        onClick={() => setShowGenerateModal(true)}
                        disabled={isGenerating}
                        title={t('vsm.ai.title')}
                    >
                        {isGenerating ? '⌛' : <Wand2 size={14} />}
                    </button>

                    <button
                        style={{ ...btnStyle, backgroundColor: '#2196f3' }}
                        onClick={handleSupplyChainSim}
                        title={t('vsm.simulation.title')}
                    >
                        <Network size={14} />
                    </button>

                    <button
                        style={{ ...btnStyle, backgroundColor: '#0288d1' }}
                        onClick={() => setShowWizard(true)}
                        title={t('vsm.wizard.title')}
                    >
                        <Layout size={14} />
                    </button>

                    <button
                        style={{ ...btnStyle, backgroundColor: '#d13438' }}
                        onClick={() => imageInputRef.current?.click()}
                        disabled={isGenerating}
                        title={t('vsm.toolbox.uploadIcon')}
                    >
                        {isGenerating ? '⌛' : <ImagePlus size={14} />}
                    </button>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleUploadImage}
                        style={{ display: 'none' }}
                    />

                    <button
                        style={{ ...btnStyle, backgroundColor: '#0078d4' }}
                        onClick={() => setShowAIChat(true)}
                        title={t('vsm.ai.chatTitle') || 'AI Consultant'}
                    >
                        <Sparkles size={14} />
                    </button>

                    <button
                        style={{ ...btnStyle, backgroundColor: '#8a2be2' }}
                        onClick={handleAIAnalysis}
                        disabled={isAnalyzing}
                        title={t('vsm.calculate')}
                    >
                        {isAnalyzing ? '⌛' : <Brain size={14} />}
                    </button>
                    <Separator />

                    <button
                        style={{ ...btnStyle, backgroundColor: '#4b0082' }}
                        onClick={() => setShowYamazumi(true)}
                        title={t('vsm.analysis.yamazumiTitle')}
                    >
                        <BarChart3 size={14} />
                    </button>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#ed7d31' }}
                        onClick={() => setShowEPEI(true)}
                        title={t('vsm.analysis.epeiTitle')}
                    >
                        <Repeat size={14} />
                    </button>
                    <Separator />

                    {/* Simulation Controls */}
                    <div style={{ ...toolbarGroupStyle, backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px 5px', borderRadius: '4px' }}>
                        <button
                            style={{
                                ...btnStyle,
                                backgroundColor: isSimulating ? '#d13438' : '#107c10',
                                fontWeight: 'bold'
                            }}
                            onClick={handleToggleSimulation}
                            title={isSimulating ? t('vsm.simulation.stop') : t('vsm.simulation.start')}
                        >
                            {isSimulating ? '⏹️' : '▶️'}
                        </button>
                        <button
                            style={{ ...btnStyle, backgroundColor: '#444' }}
                            onClick={handleResetSimulation}
                            title={t('vsm.simulation.reset')}
                        >
                            🔄
                        </button>
                    </div>

                    <Separator />

                    {/* Takt Time Manual Setting */}
                    <div style={{ ...toolbarGroupStyle, backgroundColor: 'rgba(0,120,212,0.1)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#0078d4', fontWeight: 'bold' }}>TAKT:</span>
                        <input
                            type="number"
                            value={globalTakt}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                setGlobalTakt(val);
                                // Immediately update all nodes with new global takt
                                setNodes(nds => nds.map(node => ({
                                    ...node,
                                    data: { ...node.data, globalTakt: val }
                                })));
                            }}
                            style={{
                                width: '60px',
                                background: '#1e1e1e',
                                color: 'white',
                                border: '1px solid #0078d4',
                                borderRadius: '3px',
                                fontSize: '0.8rem',
                                padding: '2px 4px'
                            }}
                        />
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>sec</span>
                    </div>

                    <Separator />
                    <button style={btnStyle} onClick={handleExport} title={t('common.exportAsPng') || 'Export as PNG'}>📷</button>
                    <button style={{ ...btnStyle, backgroundColor: '#c50f1f' }} onClick={async () => { if (await showConfirm(t('vsm.clear'), t('vsm.confirmReset'))) { setNodes([]); setEdges([]); pushToHistory({ nodes: [], edges: [] }); } }} title={t('vsm.clear')}>🗑️</button>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
                        {nodes.length} Nodes | {edges.length} Connections
                    </div>
                    <button
                        style={{ ...btnStyle, backgroundColor: '#0078d4' }}
                        onClick={() => setShowHelpModal(true)}
                        title={t('vsm.nodes.noteDefault')}
                    >
                        <HelpCircle size={14} />
                    </button>
                </div>
            </div>



            <div
                style={{ display: 'flex', flex: 1, overflow: 'hidden' }}
                onDragOver={(e) => { e.preventDefault(); }}
            >

                <div
                    className="reactflow-wrapper"
                    ref={reactFlowWrapper}
                    style={{
                        flex: 1,
                        height: '100%',
                        position: 'relative',
                        backgroundColor: '#1e1e1e',
                        border: isDragging ? '1px solid #0078d4' : 'none', // Subtle blue border when dragging
                        zIndex: 1
                    }}
                >
                    {/* DROP OVERLAY - Transparent capture layer */}
                    {isDragging && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                zIndex: 9999, // Super high z-index
                                backgroundColor: 'transparent', // Invisible
                                display: 'block'
                            }}
                            onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                e.dataTransfer.dropEffect = 'move';
                            }}
                            onDrop={(e) => {
                                e.preventDefault();
                                handleDropLogic(e);
                            }}
                            // ALTERNATIVE: Handle MouseUp as Drop (if standard Drop fails)
                            onMouseUp={(e) => {
                                handleDropLogic(e);
                            }}
                        />
                    )}
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeDragStop={onNodeDragStop}
                        onNodeClick={onNodeClick}
                        onNodeContextMenu={onNodeContextMenu} // Add Handler
                        onNodeDoubleClick={onNodeDoubleClick}
                        onEdgeClick={onEdgeClick}
                        onPaneClick={onPaneClick}
                        nodeTypes={stableNodeTypes}
                        edgeTypes={stableEdgeTypes}
                        connectionMode="loose"
                        fitView
                        snapToGrid={true}
                        snapGrid={[15, 15]}
                        edgesUpdatable={true}
                        edgesFocusable={true}
                        elementsSelectable={true}
                        deleteKeyCode="Delete"
                        defaultEdgeOptions={{
                            type: 'smoothstep',
                            animated: false,
                            style: { strokeWidth: 2, stroke: '#fff' },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#fff' }
                        }}
                    >
                        <Controls />
                        <MiniMap style={{ backgroundColor: '#333' }} nodeColor="#555" maskColor="rgba(0, 0, 0, 0.7)" />
                        <Background color="#555" gap={15} size={1} variant="dots" />
                    </ReactFlow>

                    <TimelineLadder nodes={nodes} metrics={metrics} />


                    {/* Bottom Metrics Bar */}
                    <div id="vsm-metrics-bar" style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '60px',
                        backgroundColor: 'rgba(45, 45, 45, 0.95)',
                        borderTop: '1px solid #666',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        padding: '0 20px',
                        zIndex: 5,
                        color: 'white',
                        backdropFilter: 'blur(5px)',
                        transition: 'transform 0.3s ease-in-out',
                        transform: showMetrics ? 'translateY(0)' : 'translateY(100%)'
                    }}>
                        {/* Toggle Button attached to the bar */}
                        <button
                            onClick={() => setShowMetrics(!showMetrics)}
                            style={{
                                position: 'absolute',
                                top: '-24px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: 'rgba(45, 45, 45, 0.95)',
                                border: '1px solid #666',
                                borderBottom: 'none',
                                borderRadius: '8px 8px 0 0',
                                width: '40px',
                                height: '24px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'white',
                                zIndex: 6
                            }}
                            title={showMetrics ? "Hide Metrics" : "Show Metrics"}
                        >
                            {showMetrics ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>

                        <MetricBox label={t('vsm.processTime')} value={`${metrics.totalCT}s`} />
                        <MetricBox label={t('vsm.valueAdded')} value={`${metrics.totalVA}s`} color="#4caf50" />
                        <MetricBox label={t('vsm.leadTime')} value={`${metrics.totalLT}s`} color="#ff9900" />
                        <MetricBox label={t('vsm.analysis.taktTime')} value={`${metrics.taktTime}s`} color="#ff4444" />
                        <MetricBox label={t('vsm.analysis.pitch')} value={`${metrics.pitch}s`} color="#ff9900" title="Pitch = Takt Time × Pack Size" />
                        <MetricBox label={t('vsm.nodes.utilization')} value={`${metrics.efficiency}%`} color="#00bfff" />
                    </div>

                    {/* Properties Panel */}
                    {selectedNode && (
                        <div style={{
                            position: 'absolute', right: 20, top: 20, width: '280px', maxHeight: 'calc(100% - 140px)',
                            backgroundColor: '#252526', padding: '15px', borderRadius: '8px',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.5)', border: '1px solid #444',
                            zIndex: 10, overflowY: 'auto'
                        }}>
                            <h3 style={{ color: 'white', marginTop: 0, fontSize: '1rem', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                                {t('vsm.nodes.noteDefault')}s
                            </h3>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>
                                    {selectedNode.type === 'text_note' ? t('vsm.nodes.notePlaceholder') : (t('vsm.nodes.noteDefault') + ' / ' + t('vsm.wizard.processName'))}
                                </label>
                                <input
                                    value={selectedNode.type === 'text_note'
                                        ? (selectedNode.data.text || '')
                                        : (selectedNode.data.label || selectedNode.data.name || '')
                                    }
                                    onChange={(e) => updateNodeData(
                                        selectedNode.id,
                                        selectedNode.type === 'text_note' ? 'text' : 'name',
                                        e.target.value
                                    )}
                                    onBlur={onPropertyChangeComplete}
                                    style={inputStyle}
                                />
                            </div>

                            {/* Color Coding (Visual Polish) */}
                            <div style={{ marginBottom: '15px' }}>
                                <label style={labelStyle}>{t('vsm.nodes.noteDefault')} {t('common.color') || 'Color'}</label>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    {(selectedNode.type === 'text_note'
                                        ? ['#ffff88', '#e0f7fa', '#f8bbd0', '#ccff90', '#ffffff', '#ffcc80']
                                        : ['#1e1e1e', '#c50f1f', '#0078d4', '#107c10', '#d13438', '#881798']
                                    ).map(color => (
                                        <div
                                            key={color}
                                            onClick={() => { updateNodeData(selectedNode.id, 'color', color); onPropertyChangeComplete(); }}
                                            style={{
                                                width: '20px', height: '20px', backgroundColor: color,
                                                border: selectedNode.data.color === color ? '2px solid white' : '1px solid #555',
                                                cursor: 'pointer', borderRadius: '4px'
                                            }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>

                            {selectedNode.type === 'process' && (
                                <>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>{t('vsm.analysis.processType')}</label>
                                        <select
                                            value={selectedNode.data.processType || PROCESS_TYPES.NORMAL}
                                            onChange={(e) => { updateNodeData(selectedNode.id, 'processType', e.target.value); onPropertyChangeComplete(); }}
                                            style={inputStyle}
                                        >
                                            <option value={PROCESS_TYPES.NORMAL}>{t('vsm.analysis.normal')}</option>
                                            <option value={PROCESS_TYPES.PACEMAKER}>{t('vsm.analysis.pacemaker')}</option>
                                            <option value={PROCESS_TYPES.SHARED}>{t('vsm.analysis.shared')}</option>
                                            <option value={PROCESS_TYPES.OUTSIDE}>{t('vsm.analysis.outside')}</option>
                                        </select>
                                    </div>
                                    <PropertyField label={t('vsm.wizard.ct')} field="ct" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField
                                        label={t('vsm.wizard.pcsPerHour')}
                                        field="pcsPerHour"
                                        node={{
                                            ...selectedNode,
                                            data: {
                                                ...selectedNode.data,
                                                pcsPerHour: selectedNode.data.pcsPerHour !== undefined
                                                    ? selectedNode.data.pcsPerHour
                                                    : (selectedNode.data.ct > 0 ? Math.round(3600 / selectedNode.data.ct) : 0)
                                            }
                                        }}
                                        update={updateNodeData}
                                        commit={onPropertyChangeComplete}
                                    />
                                    <PropertyField label={t('vsm.wizard.co')} field="co" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.wizard.uptime')} field="uptime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodes.oee')} field="performance" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.analysis.yield')} field="yield" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.processTime')} field="va" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.analysis.waste')} field="waste" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    {/* Calculated NVA Display */}
                                    <div style={{ padding: '8px', backgroundColor: 'rgba(255, 153, 0, 0.1)', borderRadius: '4px', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#ff9900' }}>{t('vsm.analysis.nva')}:</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ffcc80' }}>
                                            {(
                                                (parseFloat(selectedNode.data.ct) || 0) -
                                                (parseFloat(selectedNode.data.va) || (parseFloat(selectedNode.data.ct) || 0)) -
                                                (parseFloat(selectedNode.data.waste) || 0)
                                            ).toFixed(2)}s
                                        </div>
                                    </div>

                                    <PropertyField label={t('vsm.wizard.shifts')} field="operators" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    {/* Supply Chain Configuration */}
                                    <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '15px' }}>
                                        <h4 style={{ color: '#4fc3f7', fontSize: '0.85rem', marginBottom: '10px' }}>⚙️ {t('vsm.analysis.supplyChainConfig')}</h4>

                                        {/* Shift Pattern */}
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={labelStyle}>{t('vsm.analysis.shiftPattern')}</label>
                                            <select
                                                value={selectedNode.data.shiftPattern || 1}
                                                onChange={(e) => { updateNodeData(selectedNode.id, 'shiftPattern', parseInt(e.target.value)); onPropertyChangeComplete(); }}
                                                style={inputStyle}
                                            >
                                                <option value={1}>{t('vsm.analysis.shift1')}</option>
                                                <option value={2}>{t('vsm.analysis.shift2')}</option>
                                                <option value={3}>{t('vsm.analysis.shift3')}</option>
                                            </select>
                                        </div>

                                        {/* Overtime Toggle */}
                                        <div style={{ marginBottom: '15px' }}>
                                            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNode.data.overtimeAllowed || false}
                                                    onChange={(e) => { updateNodeData(selectedNode.id, 'overtimeAllowed', e.target.checked); onPropertyChangeComplete(); }}
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span>{t('vsm.analysis.allowOvertime')}</span>
                                            </label>
                                        </div>

                                        {/* Capacity Preview */}
                                        {selectedNode.data.shiftPattern && (
                                            <div style={{
                                                padding: '8px',
                                                backgroundColor: 'rgba(79, 195, 247, 0.1)',
                                                borderRadius: '4px',
                                                marginBottom: '15px',
                                                fontSize: '0.75rem',
                                                color: '#4fc3f7'
                                            }}>
                                                📊 {t('vsm.analysis.capacity')}: {28800 * (selectedNode.data.shiftPattern || 1)}s/{t('vsm.analysis.day')}
                                                {selectedNode.data.overtimeAllowed && ' + 7200s OT'}
                                            </div>
                                        )}

                                        {/* Cost Fields */}
                                        <PropertyField label={t('vsm.analysis.costPerUnit') || 'Cost per Unit ($)'} field="costPerUnit" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.analysis.holdingCost') || 'Holding Cost/Day ($)'} field="holdingCostPerDay" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                        {/* WIP Limit */}
                                        <PropertyField label={t('vsm.analysis.wipLimit') || 'WIP Limit (units)'} field="wipLimit" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    </div>
                                </>
                            )}

                            {selectedNode.type === 'inventory' && (
                                <>
                                    <PropertyField label={t('vsm.wizard.initialStock')} field="amount" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.wizard.packSize')} field="unit" type="text" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.processTime')} field="time" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            {/* SUPPLY CHAIN & INVENTORY MGMT - MOVED OUTSIDE 'inventory' TYPE CHECK */}
                            {(selectedNode.type === 'inventory' ||
                                selectedNode.data.symbolType === VSMSymbols.FINISHED_GOODS ||
                                selectedNode.data.symbolType === VSMSymbols.WAREHOUSE_RECEIVING ||
                                selectedNode.data.symbolType === VSMSymbols.SAFETY_STOCK ||
                                selectedNode.data.symbolType === VSMSymbols.BUFFER ||
                                selectedNode.data.symbolType === VSMSymbols.SUPERMARKET
                            ) && (
                                    <>
                                        <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '15px' }}>
                                            <h4 style={{ color: '#4fc3f7', fontSize: '0.85rem', marginBottom: '10px' }}>📦 Inventory Control</h4>

                                            {/* Common Field */}
                                            {selectedNode.type !== 'inventory' && (
                                                <PropertyField label="Amount (pcs)" field="amount" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                            )}

                                            {selectedNode.data.symbolType === VSMSymbols.SAFETY_STOCK && (
                                                <>
                                                    <PropertyField label="Service Level (%)" field="serviceLevel" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Demand Std Dev" field="demandStdDev" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Lead Time Var (days)" field="leadTimeVar" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                </>
                                            )}

                                            {selectedNode.data.symbolType === VSMSymbols.SUPERMARKET && (
                                                <>
                                                    <PropertyField label="Min Stock (Reorder)" field="minStock" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Max Stock (Cap)" field="maxStock" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Replenish Time (hrs)" field="replenishTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                </>
                                            )}

                                            {selectedNode.data.symbolType === VSMSymbols.BUFFER && (
                                                <>
                                                    <PropertyField label="Max Capacity" field="maxCapacity" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Throughput (pcs/hr)" field="throughputRate" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                </>
                                            )}

                                            {/* Defaults for standard inventory */}
                                            {selectedNode.type === 'inventory' && (
                                                <>
                                                    <PropertyField label="Safety Stock (units)" field="safetyStock" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                    <PropertyField label="Holding Cost/Day ($)" field="holdingCostPerDay" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                                </>
                                            )}
                                        </div>
                                    </>
                                )}

                            {selectedNode.data.symbolType === VSMSymbols.SUPPLIER && (
                                <>
                                    <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '15px' }}>
                                        <h4 style={{ color: '#4caf50', fontSize: '0.85rem', marginBottom: '10px' }}>🏭 Supplier Performance</h4>
                                        <PropertyField label="Reliability (%)" field="reliability" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label="Lead Time (days)" field="leadTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label="MOQ (units)" field="moq" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    </div>
                                </>
                            )}

                            {selectedNode.data.symbolType === VSMSymbols.CUSTOMER && (
                                <>
                                    <PropertyField label={t('vsm.wizard.hoursPerShift')} field="availableTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.wizard.demandPerDay')} field="demand" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.wizard.shifts')} field="shifts" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.wizard.packSize')} field="packSize" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <div style={{ marginTop: '10px', borderTop: '1px solid #444', paddingTop: '10px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div style={{ padding: '8px', backgroundColor: '#333', borderRadius: '4px' }}>
                                                <div style={{ fontSize: '0.6rem', color: '#aaa' }}>{t('yamazumi.taktTime')}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ff4444' }}>{metrics.taktTime}s</div>
                                            </div>
                                            <div style={{ padding: '8px', backgroundColor: '#333', borderRadius: '4px' }}>
                                                <div style={{ fontSize: '0.6rem', color: '#aaa' }}>Pitch</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ff9900' }}>{metrics.pitch}s</div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '8px', fontStyle: 'italic' }}>
                                            Formula: ({selectedNode.data.availableTime || 8}h × 3600s × {selectedNode.data.shifts || 1}) / {selectedNode.data.demand || 0}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedNode.data.symbolType === VSMSymbols.TRUCK && (
                                <>
                                    <PropertyField label={t('vsm.toolbox.truck')} field="frequency" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.vehicleCount') || 'Vehicle Count'} field="vehicleCount" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.ritase') || 'Ritase (Trips)'} field="ritase" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.loadPerTrip') || 'Load per Trip'} field="loadPerTrip" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    {/* Calculated Metrics for Truck */}
                                    <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '6px' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#4fc3f7', marginBottom: '5px', fontWeight: 'bold' }}>📊 Performance Metrics</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Total Output</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    {((selectedNode.data.vehicleCount || 1) * (selectedNode.data.ritase || 1) * (selectedNode.data.loadPerTrip || 1000)).toLocaleString()}
                                                </div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>{t('vsm.nodeDetails.pcsPerHour') || 'Pcs/Hour'}</div>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    {Math.round(((selectedNode.data.vehicleCount || 1) * (selectedNode.data.ritase || 1) * (selectedNode.data.loadPerTrip || 1000)) / 8).toLocaleString()}
                                                </div>
                                            </div>
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <div style={{ fontSize: '0.65rem', color: '#aaa' }}>Est. Cycle Time (sec/pc)</div>
                                                <div style={{ fontSize: '0.9rem', color: '#ffd700' }}>
                                                    {(((8 * 3600) / ((selectedNode.data.vehicleCount || 1) * (selectedNode.data.ritase || 1) * (selectedNode.data.loadPerTrip || 1000))) || 0).toFixed(2)}s
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <PropertyField label={t('vsm.leadTime') + ' (min)'} field="leadTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            {(selectedNode.data.symbolType === VSMSymbols.FORKLIFT || selectedNode.data.symbolType === VSMSymbols.TROLLEY) && (
                                <>
                                    <h4 style={{ color: '#ff9900', fontSize: '0.85rem', marginBottom: '10px' }}>🚜 Internal Transport</h4>
                                    <PropertyField label="Distance (m)" field="distance" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label="Speed (m/min)" field="speed" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.loadPerTrip') || 'Load/Trip (pcs)'} field="loadPerTrip" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.ritase') || 'Trips/Shift'} field="ritase" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(255, 153, 0, 0.1)', borderRadius: '4px', fontSize: '0.75rem', color: '#ffcc80' }}>
                                        <div>Output/Shift: <b>{((selectedNode.data.ritase || 1) * (selectedNode.data.loadPerTrip || 100)).toLocaleString()}</b> pcs</div>
                                        <div>Cycle Time: <b>{((28800) / ((selectedNode.data.ritase || 1) * (selectedNode.data.loadPerTrip || 100))).toFixed(2)}</b> s/pc</div>
                                    </div>

                                    <PropertyField label="Load Time (min)" field="loadTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label="Unload Time (min)" field="unloadTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            {(selectedNode.data.symbolType === VSMSymbols.SEA || selectedNode.data.symbolType === VSMSymbols.AIR) && (
                                <>
                                    <h4 style={{ color: '#4fc3f7', fontSize: '0.85rem', marginBottom: '10px' }}>⚓ Logistics / Freight</h4>
                                    <PropertyField label="Frequency (/month)" field="frequency" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.vehicleCount') || 'Vessel/Plane Count'} field="vehicleCount" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label={t('vsm.nodeDetails.loadPerTrip') || 'Load/Shipment (pcs)'} field="loadPerTrip" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: 'rgba(79, 195, 247, 0.1)', borderRadius: '4px', fontSize: '0.75rem', color: '#b3e5fc' }}>
                                        <div>Monthly Capacity: <b>{((selectedNode.data.frequency || 1) * (selectedNode.data.vehicleCount || 1) * (selectedNode.data.loadPerTrip || 1000)).toLocaleString()}</b> pcs</div>
                                    </div>

                                    <PropertyField label="Lead Time (days)" field="leadTime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label="Cost per Shipment ($)" field="costPerShipment" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            {selectedNode.data.symbolType === VSMSymbols.HEIJUNKA_BOX && (
                                <>
                                    <h4 style={{ color: '#8a2be2', fontSize: '0.85rem', marginBottom: '10px' }}>⚖️ Leveling</h4>
                                    <PropertyField label="Interval (mins)" field="interval" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label="Pitch (mins)" field="pitch" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            {selectedNode.data.symbolType === VSMSymbols.PROJECT && (
                                <>
                                    <h4 style={{ color: '#8a2be2', fontSize: '0.85rem', marginBottom: '10px' }}>🎬 {t('vsm.projectLink.title', 'Video Project Link')}</h4>
                                    <div style={{ marginBottom: '15px' }}>
                                        <label style={labelStyle}>{t('vsm.projectLink.select', 'Select Project')}</label>
                                        <select
                                            value={selectedNode.data.projectId || ''}
                                            onChange={(e) => handleProjectLink(selectedNode.id, e.target.value)}
                                            style={inputStyle}
                                        >
                                            <option value="">-- {t('vsm.projectLink.choose', 'Choose Project')} --</option>
                                            {allProjects.map(proj => (
                                                <option key={proj.id} value={proj.id}>{proj.projectName}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Division Logic Fields */}
                                    <PropertyField label={t('vsm.projectLink.outputPcs', 'Output Pcs (Project)')} field="outputPcs" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />

                                    <div style={{ borderTop: '1px solid #444', marginTop: '15px', paddingTop: '15px' }}>
                                        <h4 style={{ color: '#4fc3f7', fontSize: '0.85rem', marginBottom: '10px' }}>⚙️ {t('vsm.analysis.processProperties', 'Process Properties')}</h4>

                                        <PropertyField label={t('vsm.wizard.ct')} field="ct" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField
                                            label={t('vsm.wizard.pcsPerHour')}
                                            field="pcsPerHour"
                                            node={{
                                                ...selectedNode,
                                                data: {
                                                    ...selectedNode.data,
                                                    pcsPerHour: selectedNode.data.pcsPerHour !== undefined
                                                        ? selectedNode.data.pcsPerHour
                                                        : (selectedNode.data.ct > 0 ? Math.round(3600 / selectedNode.data.ct) : 0)
                                                }
                                            }}
                                            update={updateNodeData}
                                            commit={onPropertyChangeComplete}
                                        />
                                        <PropertyField label={t('vsm.wizard.co')} field="co" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.wizard.uptime')} field="uptime" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.nodes.oee')} field="performance" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.analysis.yield')} field="yield" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.processTime')} field="va" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                        <PropertyField label={t('vsm.wizard.shifts')} field="operators" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    </div>

                                    <div style={{
                                        padding: '10px',
                                        backgroundColor: 'rgba(138, 43, 226, 0.1)',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        color: '#b388ff',
                                        marginTop: '15px'
                                    }}>
                                        <div>{t('vsm.projectLink.linked', 'Cycle Time Calculation')}:</div>
                                        <div style={{ fontWeight: 'bold' }}>Sum(Video) / Output Pcs = {selectedNode.data.ct || 0}s</div>
                                        <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '4px' }}>
                                            {t('vsm.projectLink.hint', 'Total video duration is divided by output pieces to get CT per unit.')}
                                        </div>
                                    </div>
                                </>
                            )}

                            {selectedNode.data.symbolType === VSMSymbols.PRODUCTION_CONTROL && (
                                <>
                                    <h4 style={{ color: '#c50f1f', fontSize: '0.85rem', marginBottom: '10px' }}>📅 Production Planning</h4>
                                    <PropertyField label="Freq (Daily/Weekly)" field="planningFreq" type="text" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                    <PropertyField label="Horizon (days)" field="horizon" node={selectedNode} update={updateNodeData} commit={onPropertyChangeComplete} />
                                </>
                            )}

                            <button onClick={() => deleteNode(selectedNode.id)} style={{ width: '100%', padding: '8px', backgroundColor: '#333', color: '#c50f1f', border: '1px solid #c50f1f', borderRadius: '4px', cursor: 'pointer', marginTop: '20px' }}>{t('vsm.clear')} {t('vsm.nodes.noteDefault')}</button>
                        </div>
                    )}

                    {/* Edge Context Menu */}
                    {selectedEdge && edgeMenuPosition && (
                        <div style={{
                            position: 'absolute',
                            left: edgeMenuPosition.x,
                            top: edgeMenuPosition.y,
                            backgroundColor: '#252526',
                            border: '1px solid #0078d4',
                            borderRadius: '8px',
                            padding: '10px',
                            zIndex: 1000,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            minWidth: '120px'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px' }}>
                                {t('vsm.edgeOptions')}
                            </div>

                            <button
                                onClick={() => setEdgeMenuPosition(null)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#333',
                                    color: '#4fc3f7',
                                    border: '1px solid #4fc3f7',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <span>↔️</span> {t('vsm.nodes.noteDefault')}
                            </button>

                            <button
                                onClick={() => deleteEdge(selectedEdge.id)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#333',
                                    color: '#ff4444',
                                    border: '1px solid #ff4444',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                <span>🗑️</span> {t('vsm.clear')}
                            </button>

                            {/* Transportation Properties */}
                            <div style={{ fontSize: '0.7rem', color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px', marginTop: '10px' }}>
                                🚚 Transportation
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '3px', color: '#aaa', fontSize: '0.75rem' }}>Transport Time (days)</label>
                                <input
                                    type="number"
                                    value={selectedEdge.data?.transportTime || 0}
                                    onChange={(e) => {
                                        setEdges(eds => eds.map(edge =>
                                            edge.id === selectedEdge.id
                                                ? { ...edge, data: { ...edge.data, transportTime: parseFloat(e.target.value) || 0 } }
                                                : edge
                                        ));
                                    }}
                                    style={{ width: '100%', padding: '6px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ display: 'block', marginBottom: '3px', color: '#aaa', fontSize: '0.75rem' }}>Transport Cost ($)</label>
                                <input
                                    type="number"
                                    value={selectedEdge.data?.transportCost || 0}
                                    onChange={(e) => {
                                        setEdges(eds => eds.map(edge =>
                                            edge.id === selectedEdge.id
                                                ? { ...edge, data: { ...edge.data, transportCost: parseFloat(e.target.value) || 0 } }
                                                : edge
                                        ));
                                    }}
                                    style={{ width: '100%', padding: '6px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ fontSize: '0.7rem', color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px', marginTop: '10px' }}>
                                {t('vsm.arrowDirection')}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                                <button onClick={() => updateEdgeMarker(selectedEdge.id, 'end')} title="Forward" style={{ padding: '5px', cursor: 'pointer', backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}>➡️</button>
                                <button onClick={() => updateEdgeMarker(selectedEdge.id, 'start')} title="Backward" style={{ padding: '5px', cursor: 'pointer', backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}>⬅️</button>
                                <button onClick={() => updateEdgeMarker(selectedEdge.id, 'both')} title="Both" style={{ padding: '5px', cursor: 'pointer', backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}>↔️</button>
                                <button onClick={() => updateEdgeMarker(selectedEdge.id, 'none')} title="None" style={{ padding: '5px', cursor: 'pointer', backgroundColor: '#333', border: '1px solid #555', color: '#fff' }}>➖</button>
                            </div>

                            <div style={{ fontSize: '0.6rem', color: '#888', fontStyle: 'italic', marginTop: '5px' }}>
                                * {t('vsm.toolbox.desc')}
                            </div>
                        </div>
                    )}

                    {/* EDGE Context Menu END */}

                    {/* NODE Context Menu */}
                    {nodeMenuPosition && contextMenuNode && (
                        <div style={{
                            position: 'absolute',
                            left: nodeMenuPosition.x,
                            top: nodeMenuPosition.y,
                            backgroundColor: '#252526',
                            border: '1px solid #0078d4',
                            borderRadius: '8px',
                            padding: '10px',
                            zIndex: 1000,
                            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            minWidth: '150px'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '5px', marginBottom: '5px' }}>
                                {contextMenuNode.data.label || contextMenuNode.data.name || t('vsm.nodes.noteDefault')}
                            </div>

                            <button
                                onClick={() => {
                                    const newNode = {
                                        ...contextMenuNode,
                                        id: `${contextMenuNode.id}-copy-${Date.now()}`,
                                        position: {
                                            x: contextMenuNode.position.x + 50,
                                            y: contextMenuNode.position.y + 50,
                                        },
                                        data: {
                                            ...contextMenuNode.data,
                                            label: contextMenuNode.data.label ? `${contextMenuNode.data.label} (Copy)` : undefined,
                                            name: contextMenuNode.data.name ? `${contextMenuNode.data.name} (Copy)` : undefined,
                                        },
                                        selected: true,
                                    };
                                    const newNodes = [...nodes, newNode];
                                    setNodes(newNodes);
                                    pushToHistory({ nodes: newNodes, edges });
                                    setNodeMenuPosition(null);
                                    setContextMenuNode(null);
                                }}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Repeat size={14} /> {t('common.duplicate') || 'Duplicate'}
                            </button>

                            <button
                                onClick={() => {
                                    deleteNode(contextMenuNode.id);
                                    setNodeMenuPosition(null);
                                    setContextMenuNode(null);
                                }}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#333',
                                    color: '#ff4444',
                                    border: '1px solid #ff4444',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <X size={14} /> {t('common.delete') || 'Delete'}
                            </button>
                        </div>
                    )}
                    {/* NODE Context Menu END */}

                    {/* AI Analysis Modal/Overlay */}
                    {aiAnalysis && (
                        <div style={{
                            position: 'absolute', top: '70px', left: '50%', transform: 'translateX(-50%)',
                            width: '450px', maxHeight: 'calc(100% - 150px)', backgroundColor: '#1e1e1e',
                            color: 'white', borderRadius: '12px', border: '1px solid #8a2be2',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.8)', zIndex: 100, overflow: 'hidden',
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div style={{
                                padding: '15px', backgroundColor: '#8a2be2', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold' }}>
                                    <Sparkles size={20} /> MAVi AI VSM Insights
                                </div>
                                <button onClick={() => setAiAnalysis(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                    <X size={20} />
                                </button>
                            </div>
                            <div style={{ padding: '20px', overflowY: 'auto', fontSize: '0.9rem', lineHeight: '1.5' }} className="markdown-container">
                                <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                                <style>{`
                                    .markdown-container h1, .markdown-container h2, .markdown-container h3 { color: #8a2be2; margin-top: 20px; }
                                    .markdown-container ul { padding-left: 20px; }
                                    .markdown-container li { margin-bottom: 8px; }
                                `}</style>
                            </div>
                            <div style={{ padding: '15px', borderTop: '1px solid #333', textAlign: 'right' }}>
                                <button onClick={() => setAiAnalysis(null)} style={{ padding: '6px 15px', backgroundColor: '#444', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer' }}>
                                    {t('vsm.ai.cancelButton')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI VSM Generator Modal */}
                    <AIVSMGeneratorModal
                        isOpen={showGenerateModal}
                        onClose={() => setShowGenerateModal(false)}
                        onGenerate={handleGenerateFromPrompt}
                        currentLanguage={currentLanguage}
                        existingNodesCount={nodes.length}
                    />

                    <YamazumiChart
                        isOpen={showYamazumi}
                        onClose={() => setShowYamazumi(false)}
                        nodes={nodes}
                        taktTime={metrics.taktTime}
                        currentLanguage={currentLanguage}
                    />

                    <EPEIAnalysis
                        isOpen={showEPEI}
                        onClose={() => setShowEPEI(false)}
                        nodes={nodes}
                        currentLanguage={currentLanguage}
                    />

                    <VSMWizard
                        isOpen={showWizard}
                        onClose={() => setShowWizard(false)}
                        onGenerate={handleWizardGenerate}
                        currentLanguage={currentLanguage}
                    />

                    {/* Template Selection Modal */}
                    <TemplateSelectionModal
                        isOpen={showTemplateModal}
                        onClose={() => setShowTemplateModal(false)}
                        onSelect={handleTemplateSelect}
                        templates={getVSMTemplates()}
                        currentLanguage={currentLanguage}
                    />

                    <SupplyChainModal
                        isOpen={showSupplyChainModal}
                        onClose={() => setShowSupplyChainModal(false)}
                        nodes={nodes}
                        edges={edges}
                        currentLanguage={currentLanguage}
                        onSimulationResult={handleSimulationResult}
                        vsmId={vsmId}
                    />

                    {/* Template Action (Confirm) Modal */}
                    <TemplateActionModal
                        isOpen={showActionModal}
                        onClose={() => setShowActionModal(false)}
                        onAction={handleConfirmLoad}
                        templateName={pendingTemplateKey ? getVSMTemplates()[pendingTemplateKey]?.name : ''}
                        currentLanguage={currentLanguage}
                    />

                    {/* Help Modal */}
                    {showHelpModal && (
                        <div style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 200,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px'
                        }}>
                            <div style={{
                                width: '90%', maxWidth: '900px', maxHeight: '90vh',
                                backgroundColor: '#1e1e1e', borderRadius: '12px',
                                border: '1px solid #0078d4', boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                                display: 'flex', flexDirection: 'column', overflow: 'hidden'
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: '20px', backgroundColor: '#0078d4',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1.2rem', color: 'white' }}>
                                        <HelpCircle size={24} />
                                        {t('vsm.nodes.noteDefault')}s
                                    </div>
                                    <button onClick={() => setShowHelpModal(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                                        <X size={24} />
                                    </button>
                                </div>

                                {/* Content */}
                                <div style={{ padding: '30px', overflowY: 'auto', color: 'white', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    <h2 style={{ color: '#0078d4', marginTop: 0 }}>🎯 {t('vsm.help.mainTitle') || 'Value Stream Mapping'}</h2>

                                    <h3 style={{ color: '#4fc3f7', marginTop: '25px' }}>1. {t('vsm.help.addingSymbols') || 'Adding Symbols'}</h3>
                                    <ul>
                                        <li>{t('vsm.help.dragDrop') || 'Drag symbols from VSM Toolbox (left sidebar)'}</li>
                                        <li>{t('vsm.help.dropCanvas') || 'Drop onto canvas to add'}</li>
                                        <li>{t('vsm.help.editProps') || 'Click symbol to edit properties'}</li>
                                    </ul>

                                    <h3 style={{ color: '#4fc3f7' }}>2. {t('vsm.help.connectingHeading') || 'Connecting Processes'}</h3>
                                    <ul>
                                        <li>{t('vsm.help.connectDesc') || 'Drag from connection point of one node to another'}</li>
                                        <li>{t('vsm.help.autoArrow') || 'Automatically creates arrow connection'}</li>
                                    </ul>

                                    <h3 style={{ color: '#4fc3f7' }}>3. {t('vsm.help.keyboardShortcuts') || 'Keyboard Shortcuts'}</h3>
                                    <ul>
                                        <li><kbd>Ctrl + Z</kbd> - {t('common.undo') || 'Undo'}</li>
                                        <li><kbd>Ctrl + Y</kbd> - {t('common.redo') || 'Redo'}</li>
                                        <li><kbd>Delete</kbd> - {t('common.delete') || 'Delete selected node'}</li>
                                        <li><kbd>Mouse Wheel</kbd> - {t('vsm.toolbox.scrollZoom') || 'Zoom in/out'}</li>
                                        <li><kbd>Space + Drag</kbd> - {t('common.pan') || 'Pan canvas'}</li>
                                    </ul>

                                    <h3 style={{ color: '#00b4d8' }}>4. {t('vsm.help.nodesTitle')}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <strong style={{ color: '#ffd700', fontSize: '1.1em' }}>🏭 {t('vsm.help.processNodeTitle')}</strong>
                                            <p style={{ margin: '5px 0 10px 0', fontSize: '0.9em', color: '#ccc' }}>{t('vsm.help.processNodeDesc')}</p>
                                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em' }}>
                                                <li>{t('vsm.help.paramCT')}</li>
                                                <li>{t('vsm.help.paramCO')}</li>
                                                <li>{t('vsm.help.paramUptime')}</li>
                                                <li>{t('vsm.help.paramYield')}</li>
                                            </ul>
                                        </div>
                                        <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                            <strong style={{ color: '#ffd700', fontSize: '1.1em' }}>⚠️ {t('vsm.help.inventoryNodeTitle')}</strong>
                                            <p style={{ margin: '5px 0 10px 0', fontSize: '0.9em', color: '#ccc' }}>{t('vsm.help.inventoryNodeDesc')}</p>
                                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.9em' }}>
                                                <li>{t('vsm.help.paramAmount')}</li>
                                                <li>{t('vsm.help.paramTime')}</li>
                                            </ul>
                                        </div>
                                    </div>
                                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginTop: '15px' }}>
                                        <strong style={{ color: '#ffd700', fontSize: '1.1em' }}>🏢 {t('vsm.help.customerTitle')}</strong>
                                        <ul style={{ margin: '10px 0 0 0', paddingLeft: '20px', fontSize: '0.9em' }}>
                                            <li>{t('vsm.help.paramDemand')}</li>
                                            <li>{t('vsm.help.paramTakt')}</li>
                                        </ul>
                                    </div>

                                    <h3 style={{ color: '#4fc3f7' }}>5. {t('vsm.help.saveLoadHeading') || 'Save/Load Features'}</h3>
                                    <ul>
                                        <li><strong>💾 {t('common.save') || 'Save'}</strong> - {t('vsm.help.saveDesc') || 'Download VSM as .mavi-vsm file'}</li>
                                        <li><strong>📂 {t('common.open') || 'Load'}</strong> - {t('vsm.help.loadDesc') || 'Load VSM from file'}</li>
                                        <li>{t('vsm.help.mergeReplace') || 'Choose mode: Replace (clear all) or Merge (combine)'}</li>
                                    </ul>

                                    <h3 style={{ color: '#ff9900' }}>6. {t('vsm.help.advancedHeading') || 'Advanced TPS Features'}</h3>
                                    <ul>
                                        <li><strong>📊 {t('vsm.analysis.yamazumiTitle')}</strong> - {t('vsm.help.yamazumiDesc') || 'Visualize work balance vs Takt Time.'}</li>
                                        <li><strong>🔄 {t('vsm.analysis.epeiTitle')}</strong> - {t('vsm.help.epeiDesc') || 'Analyze production flexibility.'}</li>
                                        <li><strong>🕒 {t('vsm.analysis.timelineMetrics')}</strong> - {t('vsm.help.timelineDesc') || 'Automatic ladder shows Lead Time vs VA Time steps.'}</li>
                                    </ul>
                                </div>

                                {/* Footer */}
                                <div style={{ padding: '15px 30px', borderTop: '1px solid #333', textAlign: 'right', backgroundColor: '#252526' }}>
                                    <button
                                        onClick={() => setShowHelpModal(false)}
                                        style={{
                                            padding: '8px 20px', backgroundColor: '#0078d4', border: 'none',
                                            color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                                        }}
                                    >
                                        {t('vsm.ai.cancelButton')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <AIChatOverlay
                        visible={showAIChat}
                        onClose={() => setShowAIChat(false)}
                        title="VSM Assistant"
                        subtitle="Lean AI Expert"
                        contextData={{ nodes, edges, metrics, simulation: lastSimulationResult }}
                        systemPrompt={`You are the VSM Assistant for the current visible canvas.
STRICT RULE: YOU MUST ONLY ANSWER based on the nodes, edges, and data VISIBLE IN THE CURRENT CANVAS context provided.

REAL-TIME SIMULATION STATUS:
- Status: ${hasSimData ? 'Run Completed' : 'Not Run'}
- Critical Shortages Detected:
${shortageSummary}
- Root Cause: ${rootCause}

BOTTLENECK ANALYSIS:
- Global Takt Time: ${globalTakt}s
- Detected Bottlenecks:
${bottleneckSummary}

CONTEXT DATA Summary:
- Nodes: ${nodes.length} (Visible items)
- Edges: ${edges.length} (Connections)

INSTRUCTIONS:
1. **LANGUAGE RULE**: ALWAYS reply in the SAME LANGUAGE as the user's input.
2. "Show me the process" -> List nodes from the summary.
3. "Where is the bottleneck?" -> READ the "Detected Bottlenecks" section above.
4. "Why is there a shortage?" -> READ the "Critical Shortages Detected" section above.
5. If the user asks about something unrelated (e.g. "Write a poem"), REFUSE politely. BUT if they ask about VSM, standard work, or the graph, ANSWER IT.

Be helpful, precise, and stuck to the data. Match the user's language style.`}
                    />

                    {/* AI Fly Button (Floating Action Button) */}
                    <button
                        onClick={() => setShowAIChat(true)}
                        style={{
                            position: 'absolute',
                            bottom: showMetrics ? '80px' : '30px', // Adjust position based on metrics bar
                            right: '30px',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: '#0078d4',
                            border: 'none',
                            boxShadow: '0 4px 15px rgba(0,120,212,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 999,
                            transition: 'transform 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title={t('vsm.ai.chatTitle') || 'AI Consultant'}
                    >
                        <Sparkles size={28} color="white" />
                    </button>
                </div>

                {showSidebar && <Sidebar
                    customLibrary={customLibrary}
                    onAddCustom={addCustomIcon}
                    onRemoveCustom={removeCustomIcon}
                    activeEdgeType={activeEdgeType}
                    onEdgeTypeSelect={setActiveEdgeType}
                    setIsDragging={setIsDragging}
                    setDragData={setDragData} // Pass setter to Sidebar
                    onDragEnd={(e) => {
                        // Force drop logic using the drag end coordinates
                        handleDropLogic(e);
                    }}
                />}
            </div>
        </div>
    );
};

// Helper for Property Fields
const PropertyField = ({ label, field, node, update, commit, type = 'number' }) => (
    <div style={{ marginBottom: '10px' }}>
        <label style={labelStyle}>{label}</label>
        <input
            type={type}
            value={node.data[field]}
            onChange={(e) => update(node.id, field, e.target.value)}
            onBlur={commit}
            style={inputStyle}
        />
    </div>
);

const ToolbarButton = ({ children, onClick, title, disabled, color }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        style={{ ...btnStyle, backgroundColor: color || '#444', opacity: disabled ? 0.5 : 1 }}
    >
        {children}
    </button>
);

const VSMCanvas = () => (
    <ReactFlowProvider>
        <VSMCanvasContent />
    </ReactFlowProvider>
);

const MetricBox = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '0.7rem', color: '#aaa', marginBottom: '2px' }}>{label}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: color || 'white' }}>{value}</div>
    </div>
);

const toolbarGroupStyle = { display: 'flex', gap: '3px', borderRight: '1px solid #555', paddingRight: '10px' };
const btnStyle = { padding: '4px 8px', backgroundColor: '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' };
const labelStyle = { display: 'block', marginBottom: '3px', color: '#aaa', fontSize: '0.75rem' };
const inputStyle = { width: '100%', padding: '6px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' };

export default VSMCanvas;
