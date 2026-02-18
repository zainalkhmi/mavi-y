import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Sparkles, Trash2, Move, MousePointer2, Lock, Unlock, Bot } from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAllProjects, saveFacilityLayoutData } from '../utils/database';
import { evaluateFacilityLayout, generateFacilityScenarios } from '../utils/layoutOptimizationEngine';
import AIChatOverlay from './features/AIChatOverlay';

const CANVAS = { width: 1080, height: 640 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createArea = (index) => ({
    id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    name: `Area ${index + 1}`,
    x: 80 + (index % 4) * 190,
    y: 80 + Math.floor(index / 4) * 120,
    width: 130,
    height: 80,
    locked: false,
    fixedX: null,
    fixedY: null,
});

const createWaypoint = (x = 0, y = 0, index = 0) => ({
    id: `wp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    x,
    y,
});

const DEFAULT_FLOW = {
    frequency: 10,
    unitCost: 1,
    controlType: 'fifo',
    bufferLimit: 20,
    reorderPoint: 10,
    leadTime: 1,
    handlingTime: 0.1,
    transportSpeed: 60,
    signalQty: 5,
    direction: 'forward',
    waypoints: [],
};

const FLOW_TYPES = [
    { value: 'push', label: 'Push', color: '#fb923c' },
    { value: 'pull', label: 'Pull', color: '#4ade80' },
    { value: 'fifo', label: 'FIFO', color: '#38bdf8' },
    { value: 'kanban', label: 'Kanban', color: '#a78bfa' },
    { value: 'conwip', label: 'CONWIP', color: '#facc15' },
];

const normalizeFlow = (flow = {}) => ({
    ...DEFAULT_FLOW,
    ...flow,
    direction: flow.direction || 'forward',
    waypoints: Array.isArray(flow.waypoints)
        ? flow.waypoints.map((point, index) => ({
            id: point.id || `wp-legacy-${index}`,
            x: Number(point.x) || 0,
            y: Number(point.y) || 0,
        }))
        : [],
});

const detectLayoutStructure = (areas = [], flows = []) => {
    if (areas.length < 3 || flows.length === 0) return 'network';

    const byId = new Map(areas.map((a) => [a.id, a]));
    let backward = 0;
    let total = 0;

    flows.forEach((flow) => {
        const from = byId.get(flow.from);
        const to = byId.get(flow.to);
        if (!from || !to) return;
        const freq = Math.max(1, Number(flow.frequency) || 1);
        const fromX = from.x + from.width / 2;
        const toX = to.x + to.width / 2;
        if (toX < fromX) backward += freq;
        total += freq;
    });

    return total > 0 && backward / total <= 0.2 ? 'line' : 'network';
};

function FacilityLayoutOptimizer() {
    const { currentProject } = useProject();
    const { showAlert } = useDialog();
    const { t } = useLanguage();

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);

    const [areas, setAreas] = useState([createArea(0), createArea(1), createArea(2)]);
    const [flows, setFlows] = useState([]);
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const [constraints, setConstraints] = useState({ minSpacing: 40, targetLeadTime: 0 });

    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState('baseline');
    const [optimizationMode, setOptimizationMode] = useState('network');
    const [baselineCost, setBaselineCost] = useState(null);

    const [selectedAreaId, setSelectedAreaId] = useState(null);
    const [interactionMode, setInteractionMode] = useState('select');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridSize, setGridSize] = useState(40);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const [dragState, setDragState] = useState(null);
    const [panState, setPanState] = useState(null);

    const [saving, setSaving] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);

    const canvasRef = useRef(null);

    const selectedArea = useMemo(() => areas.find((a) => a.id === selectedAreaId) || null, [areas, selectedAreaId]);
    const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

    const metrics = useMemo(
        () => evaluateFacilityLayout({ areas, flows, constraints, optimizationMode }),
        [areas, flows, constraints, optimizationMode]
    );

    const detectedStructure = useMemo(() => detectLayoutStructure(areas, flows), [areas, flows]);

    const flowSummary = useMemo(
        () => flows.reduce((acc, flow) => {
            const type = flow.controlType || 'push';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {}),
        [flows]
    );

    const selectedProject = useMemo(
        () => projects.find((p) => Number(p.id) === Number(selectedProjectId)) || null,
        [projects, selectedProjectId]
    );

    const screenToWorld = (sx, sy) => ({
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
    });

    const snap = (value) => {
        if (!snapEnabled) return value;
        return Math.round(value / gridSize) * gridSize;
    };

    const hydrateFromData = (data) => {
        if (!data) return;
        setAreas(Array.isArray(data.areas) && data.areas.length > 0 ? data.areas : [createArea(0), createArea(1), createArea(2)]);
        const nextFlows = Array.isArray(data.flows) ? data.flows.map(normalizeFlow) : [];
        setFlows(nextFlows);
        setSelectedFlowId((prev) => (prev && nextFlows.some((flow) => flow.id === prev) ? prev : nextFlows[0]?.id || null));
        setConstraints(data.constraints || { minSpacing: 40, targetLeadTime: 0 });
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
        setActiveScenarioId(data.activeScenarioId || 'baseline');
        setOptimizationMode(data.optimizationMode || 'network');
        setBaselineCost(Number.isFinite(data.baselineCost) ? data.baselineCost : null);
        setZoom(Number.isFinite(data.zoom) ? data.zoom : 1);
        setPan(data.pan || { x: 0, y: 0 });
        setGridSize(Number.isFinite(data.gridSize) ? data.gridSize : 40);
        setSnapEnabled(typeof data.snapEnabled === 'boolean' ? data.snapEnabled : true);
    };

    useEffect(() => {
        const loadProjects = async () => {
            const rows = (await getAllProjects()) || [];
            setProjects(rows);

            const preferred = currentProject
                ? rows.find((item) => Number(item.id) === Number(currentProject.id))
                : rows[0];

            if (!preferred) return;
            setSelectedProjectId(preferred.id);
            hydrateFromData(preferred.facilityLayoutData);
        };

        loadProjects();
    }, [currentProject]);

    useEffect(() => {
        if (!selectedProject) return;
        hydrateFromData(selectedProject.facilityLayoutData);
    }, [selectedProject]);

    useEffect(() => {
        if (baselineCost === null && Number.isFinite(metrics.totalCost)) {
            setBaselineCost(metrics.totalCost);
        }
    }, [metrics.totalCost, baselineCost]);

    const addArea = () => {
        setAreas((prev) => [...prev, createArea(prev.length)]);
    };

    const removeArea = (id) => {
        setAreas((prev) => prev.filter((a) => a.id !== id));
        setFlows((prev) => {
            const next = prev.filter((f) => f.from !== id && f.to !== id);
            if (selectedFlowId && !next.some((flow) => flow.id === selectedFlowId)) {
                setSelectedFlowId(next[0]?.id || null);
            }
            return next;
        });
        if (selectedAreaId === id) setSelectedAreaId(null);
    };

    const addFlow = () => {
        if (areas.length < 2) return;
        const newFlow = normalizeFlow({
            id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            from: areas[0].id,
            to: areas[1].id,
            ...DEFAULT_FLOW,
        });
        setFlows((prev) => [
            ...prev,
            newFlow,
        ]);
        setSelectedFlowId(newFlow.id);
    };

    const updateFlow = (id, patch) => {
        setFlows((prev) => prev.map((flow) => (flow.id === id ? normalizeFlow({ ...flow, ...patch }) : flow)));
    };

    const removeFlow = (id) => {
        setFlows((prev) => {
            const next = prev.filter((flow) => flow.id !== id);
            if (selectedFlowId === id) {
                setSelectedFlowId(next[0]?.id || null);
            }
            return next;
        });
    };

    const addWaypointToFlow = async (flowId = selectedFlowId) => {
        const selectedFlow = flows.find((flow) => flow.id === flowId);
        if (!selectedFlow) {
            await showAlert(
                t('facilityLayout.title') || 'Facility Layout',
                'Pilih flow terlebih dahulu sebelum menambah node.'
            );
            return;
        }

        const from = areaById.get(selectedFlow.from);
        const to = areaById.get(selectedFlow.to);
        if (!from || !to) return;

        const x = snap((from.x + from.width / 2 + to.x + to.width / 2) / 2);
        const y = snap((from.y + from.height / 2 + to.y + to.height / 2) / 2);
        const waypoint = createWaypoint(x, y, selectedFlow.waypoints?.length || 0);

        updateFlow(selectedFlow.id, {
            waypoints: [...(selectedFlow.waypoints || []), waypoint],
        });
    };

    const removeWaypoint = (flowId, waypointId) => {
        const flow = flows.find((item) => item.id === flowId);
        if (!flow) return;
        updateFlow(flowId, {
            waypoints: (flow.waypoints || []).filter((point) => point.id !== waypointId),
        });
    };

    const getFlowDisplayPoints = (flow) => {
        const from = areaById.get(flow.from);
        const to = areaById.get(flow.to);
        if (!from || !to) return null;

        const points = [
            { x: from.x + from.width / 2, y: from.y + from.height / 2 },
            ...(flow.waypoints || []).map((point) => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })),
            { x: to.x + to.width / 2, y: to.y + to.height / 2 },
        ];

        const directionalPoints = flow.direction === 'reverse' ? [...points].reverse() : points;

        const orthogonal = [directionalPoints[0]];
        for (let i = 1; i < directionalPoints.length; i++) {
            const prev = directionalPoints[i - 1];
            const next = directionalPoints[i];
            if (!prev || !next) continue;
            if (prev.x !== next.x && prev.y !== next.y) {
                orthogonal.push({ x: next.x, y: prev.y });
            }
            orthogonal.push(next);
        }

        return orthogonal;
    };

    const saveLayout = async () => {
        if (!selectedProjectId) {
            await showAlert(
                t('facilityLayout.title') || 'Facility Layout',
                t('facilityLayout.messages.selectProjectFirst') || 'Select project first.'
            );
            return;
        }

        setSaving(true);
        try {
            await saveFacilityLayoutData(Number(selectedProjectId), {
                areas,
                flows,
                constraints,
                scenarios,
                activeScenarioId,
                optimizationMode,
                baselineCost,
                zoom,
                pan,
                gridSize,
                snapEnabled,
                updatedAt: new Date().toISOString(),
            });

            await showAlert(
                t('common.success') || 'Success',
                t('facilityLayout.messages.savedSuccessfully') || 'Saved successfully.'
            );
        } catch (error) {
            await showAlert(
                t('common.error') || 'Error',
                `${t('facilityLayout.messages.saveFailed') || 'Save failed'}: ${error.message}`
            );
        } finally {
            setSaving(false);
        }
    };

    const runOptimization = () => {
        setOptimizing(true);
        try {
            const generated = generateFacilityScenarios({
                areas,
                flows,
                constraints,
                optimizationMode,
                bounds: CANVAS,
            });

            setScenarios(generated);

            if (generated[0]) {
                setActiveScenarioId(generated[0].id);
                setAreas(generated[0].areas.map((area) => ({ ...area })));
            }
        } finally {
            setOptimizing(false);
        }
    };

    const applyScenario = (id) => {
        const selected = scenarios.find((item) => item.id === id);
        if (!selected) return;
        setActiveScenarioId(id);
        setAreas(selected.areas.map((area) => ({ ...area })));
    };

    const onCanvasMove = (event) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        const world = screenToWorld(sx, sy);
        setMousePos({ x: Math.round(world.x), y: Math.round(world.y) });

        if (panState) {
            setPan({
                x: panState.originPan.x + (event.clientX - panState.originPointer.x),
                y: panState.originPan.y + (event.clientY - panState.originPointer.y),
            });
            return;
        }

        if (!dragState) return;

        if (dragState.type === 'area') {
            const target = screenToWorld(sx, sy);
            const x = clamp(snap(target.x - dragState.offsetX), 0, CANVAS.width - dragState.width);
            const y = clamp(snap(target.y - dragState.offsetY), 0, CANVAS.height - dragState.height);

            setAreas((prev) => prev.map((item) => (item.id === dragState.id ? { ...item, x, y } : item)));
            return;
        }

        if (dragState.type === 'waypoint') {
            const target = screenToWorld(sx, sy);
            const x = clamp(snap(target.x - dragState.offsetX), 0, CANVAS.width);
            const y = clamp(snap(target.y - dragState.offsetY), 0, CANVAS.height);

            setFlows((prev) => prev.map((flow) => {
                if (flow.id !== dragState.flowId) return flow;
                return {
                    ...flow,
                    waypoints: (flow.waypoints || []).map((point) => (
                        point.id === dragState.waypointId ? { ...point, x, y } : point
                    )),
                };
            }));
        }
    };

    const stopInteractions = () => {
        setDragState(null);
        setPanState(null);
    };

    const onWheelZoom = (event) => {
        event.preventDefault();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const sx = event.clientX - rect.left;
        const sy = event.clientY - rect.top;
        const before = screenToWorld(sx, sy);
        const nextZoom = clamp(zoom * (event.deltaY < 0 ? 1.1 : 0.9), 0.3, 3.5);
        const nextPan = {
            x: sx - before.x * nextZoom,
            y: sy - before.y * nextZoom,
        };

        setZoom(nextZoom);
        setPan(nextPan);
    };

    const areaDragStart = (event, area) => {
        event.stopPropagation();
        setSelectedAreaId(area.id);

        if (interactionMode === 'pan' || area.locked) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const worldPointer = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        setDragState({
            type: 'area',
            id: area.id,
            width: area.width,
            height: area.height,
            offsetX: worldPointer.x - area.x,
            offsetY: worldPointer.y - area.y,
        });
    };

    const waypointDragStart = (event, flowId, waypoint) => {
        event.stopPropagation();
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const worldPointer = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        setSelectedFlowId(flowId);
        setDragState({
            type: 'waypoint',
            flowId,
            waypointId: waypoint.id,
            offsetX: worldPointer.x - waypoint.x,
            offsetY: worldPointer.y - waypoint.y,
        });
    };

    const beginPan = (event) => {
        if (interactionMode !== 'pan') return;
        setPanState({
            originPointer: { x: event.clientX, y: event.clientY },
            originPan: { ...pan },
        });
    };

    return (
        <div className="layout-optimizer modern-shell">
            <aside className="panel left-panel">
                <h2>{t('facilityLayout.title') || 'Facility Layout Optimizer'}</h2>

                <div className="card compact">
                    <label>{t('facilityLayout.project') || 'Project'}</label>
                    <select
                        value={selectedProjectId || ''}
                        onChange={(event) => setSelectedProjectId(event.target.value ? Number(event.target.value) : null)}
                    >
                        <option value="">{t('facilityLayout.selectProject') || 'Select Project'}</option>
                        {projects.map((project) => (
                            <option key={project.id} value={project.id}>{project.projectName}</option>
                        ))}
                    </select>
                </div>

                <div className="card compact">
                    <div className="row">
                        <button onClick={addArea}><Plus size={14} /> Area</button>
                        <button onClick={addFlow}><Plus size={14} /> Flow</button>
                    </div>
                    <div className="row" style={{ marginTop: 8 }}>
                        <button onClick={() => addWaypointToFlow(selectedFlowId)} disabled={!selectedFlowId}>
                            <Plus size={14} /> Node (Flow)
                        </button>
                    </div>
                    <div className="row">
                        <button onClick={runOptimization} disabled={optimizing}>
                            <Sparkles size={14} /> {optimizing ? 'Optimizing...' : 'Optimize'}
                        </button>
                        <button onClick={saveLayout} disabled={saving}>
                            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>

                <div className="card compact">
                    <label>Objective</label>
                    <div className="row">
                        <button
                            className={optimizationMode === 'network' ? 'active' : ''}
                            onClick={() => setOptimizationMode('network')}
                        >
                            Network
                        </button>
                        <button
                            className={optimizationMode === 'line' ? 'active' : ''}
                            onClick={() => setOptimizationMode('line')}
                        >
                            Line
                        </button>
                    </div>
                    <p className="muted">Detected: <strong>{detectedStructure}</strong></p>
                </div>

                <div className="card compact">
                    <label>Canvas</label>
                    <div className="row">
                        <button
                            className={interactionMode === 'select' ? 'active' : ''}
                            onClick={() => setInteractionMode('select')}
                        >
                            <MousePointer2 size={14} /> Select
                        </button>
                        <button
                            className={interactionMode === 'pan' ? 'active' : ''}
                            onClick={() => setInteractionMode('pan')}
                        >
                            <Move size={14} /> Pan
                        </button>
                    </div>

                    <div className="row">
                        <button onClick={() => setZoom((z) => clamp(z * 1.15, 0.3, 3.5))}>Zoom +</button>
                        <button onClick={() => setZoom((z) => clamp(z * 0.85, 0.3, 3.5))}>Zoom -</button>
                        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>Reset</button>
                    </div>

                    <label>Grid</label>
                    <input
                        type="number"
                        value={gridSize}
                        onChange={(event) => setGridSize(clamp(Number(event.target.value) || 40, 10, 120))}
                    />
                    <button onClick={() => setSnapEnabled((prev) => !prev)} className={snapEnabled ? 'active' : ''}>
                        Snap {snapEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>

                <div className="card compact">
                    <label>Lead Time Target (hour)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={constraints.targetLeadTime || 0}
                        onChange={(event) => setConstraints((prev) => ({
                            ...prev,
                            targetLeadTime: Math.max(0, Number(event.target.value) || 0),
                        }))}
                    />
                    <small className="muted">0 = no lead time constraint</small>
                </div>
            </aside>

            <main className="panel canvas-panel">
                <div className="topbar">
                    <div className="status-pill">Mouse: {mousePos.x}, {mousePos.y}</div>
                    <div className="status-pill">Zoom: {(zoom * 100).toFixed(0)}%</div>
                    <div className="status-pill">Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</div>
                </div>

                <div
                    ref={canvasRef}
                    className="canvas"
                    onMouseMove={onCanvasMove}
                    onMouseUp={stopInteractions}
                    onMouseLeave={stopInteractions}
                    onMouseDown={beginPan}
                    onWheel={onWheelZoom}
                >
                    <div
                        className="canvas-world"
                        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
                    >
                        <div
                            className="grid"
                            style={{
                                width: CANVAS.width,
                                height: CANVAS.height,
                                backgroundSize: `${gridSize}px ${gridSize}px`,
                            }}
                        />

                        <svg className="flow-layer" width={CANVAS.width} height={CANVAS.height}>
                            <defs>
                                <marker id="arrow-modern" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                </marker>
                                <marker id="arrow-modern-bi" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto-start-reverse">
                                    <path d="M0,0 L0,6 L9,3 z" fill="#facc15" />
                                </marker>
                            </defs>
                            {flows.map((flow) => {
                                const points = getFlowDisplayPoints(flow);
                                if (!points || points.length < 2) return null;
                                const polylinePoints = points.map((point) => `${point.x},${point.y}`).join(' ');
                                const middlePoint = points[Math.floor(points.length / 2)] || points[0];
                                const flowType = FLOW_TYPES.find((item) => item.value === (flow.controlType || 'push'));
                                const isSelected = selectedFlowId === flow.id;

                                let markerStart = undefined;
                                let markerEnd = 'url(#arrow-modern)';
                                if (flow.direction === 'bidirectional') {
                                    markerStart = 'url(#arrow-modern-bi)';
                                    markerEnd = 'url(#arrow-modern-bi)';
                                }

                                return (
                                    <g key={flow.id} onMouseDown={(event) => { event.stopPropagation(); setSelectedFlowId(flow.id); }}>
                                        <polyline
                                            points={polylinePoints}
                                            fill="none"
                                            stroke={flowType?.color || '#94a3b8'}
                                            strokeWidth={isSelected ? '3.2' : '2.2'}
                                            markerStart={markerStart}
                                            markerEnd={markerEnd}
                                            style={{ cursor: 'pointer' }}
                                        />
                                        <rect x={middlePoint.x - 44} y={middlePoint.y - 11} width="88" height="18" rx="8" fill="rgba(2,6,23,0.9)" />
                                        <text x={middlePoint.x} y={middlePoint.y + 2} textAnchor="middle" fill="#e2e8f0" style={{ fontSize: 9, fontWeight: 700 }}>
                                            {(flow.controlType || 'push').toUpperCase()} {flow.frequency || 0}
                                        </text>
                                        {isSelected && (flow.waypoints || []).map((point, index) => (
                                            <g key={point.id}>
                                                <circle
                                                    cx={point.x}
                                                    cy={point.y}
                                                    r="7"
                                                    fill="#fde047"
                                                    stroke="#111827"
                                                    strokeWidth="2"
                                                    onMouseDown={(event) => waypointDragStart(event, flow.id, point)}
                                                    style={{ cursor: 'move' }}
                                                />
                                                <text x={point.x} y={point.y + 3} textAnchor="middle" fill="#111827" style={{ fontSize: 8, fontWeight: 700 }}>
                                                    {index + 1}
                                                </text>
                                            </g>
                                        ))}
                                    </g>
                                );
                            })}
                        </svg>

                        {areas.map((area) => (
                            <div
                                key={area.id}
                                className={`area ${selectedAreaId === area.id ? 'selected' : ''} ${area.locked ? 'locked' : ''}`}
                                onMouseDown={(event) => areaDragStart(event, area)}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedAreaId(area.id);
                                }}
                                style={{
                                    left: area.x,
                                    top: area.y,
                                    width: area.width,
                                    height: area.height,
                                    cursor: area.locked ? 'not-allowed' : (interactionMode === 'pan' ? 'grab' : 'move'),
                                }}
                            >
                                <span>{area.name}</span>
                                {area.locked && <Lock size={12} />}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            <aside className="panel right-panel">
                <h3>Insights</h3>
                <div className="kpi-grid">
                    <div className="kpi"><span>Total Cost</span><strong>{metrics.totalCost.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Flow Cost</span><strong>{metrics.flowCost.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Total Distance</span><strong>{metrics.totalDistance.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Avg Lead Time</span><strong>{(metrics.averageLeadTime || 0).toFixed(2)} h</strong></div>
                    <div className="kpi"><span>Δ vs Baseline</span><strong>{baselineCost === null ? '0.0' : (metrics.totalCost - baselineCost).toFixed(1)}</strong></div>
                    <div className="kpi"><span>Overlap Penalty</span><strong>{metrics.overlapPenalty.toFixed(1)}</strong></div>
                </div>

                <button onClick={() => setBaselineCost(metrics.totalCost)}>Set Current as Baseline</button>

                <h3>Flow Types</h3>
                <div className="badges">
                    {FLOW_TYPES.map((item) => (
                        <span key={item.value} className="badge" style={{ borderColor: item.color, color: item.color }}>
                            {item.label}: {flowSummary[item.value] || 0}
                        </span>
                    ))}
                </div>

                <h3>Flows</h3>
                <div className="list">
                    {flows.length === 0 && <p className="muted">No flows defined.</p>}
                    {flows.map((flow) => (
                        <div
                            key={flow.id}
                            className={`list-card ${selectedFlowId === flow.id ? 'selected-flow' : ''}`}
                            onClick={() => setSelectedFlowId(flow.id)}
                        >
                            <div className="grid-two">
                                <select value={flow.from || ''} onChange={(event) => updateFlow(flow.id, { from: event.target.value })}>
                                    {areas.map((area) => <option key={`from-${flow.id}-${area.id}`} value={area.id}>{area.name}</option>)}
                                </select>
                                <select value={flow.to || ''} onChange={(event) => updateFlow(flow.id, { to: event.target.value })}>
                                    {areas.map((area) => <option key={`to-${flow.id}-${area.id}`} value={area.id}>{area.name}</option>)}
                                </select>
                            </div>

                            <div className="grid-three">
                                <input
                                    type="number"
                                    value={flow.frequency ?? 0}
                                    onChange={(event) => updateFlow(flow.id, { frequency: Math.max(0, Number(event.target.value) || 0) })}
                                    placeholder="Freq"
                                />
                                <input
                                    type="number"
                                    value={flow.unitCost ?? 1}
                                    onChange={(event) => updateFlow(flow.id, { unitCost: Math.max(0, Number(event.target.value) || 0) })}
                                    placeholder="Cost"
                                />
                                <select value={flow.controlType || 'push'} onChange={(event) => updateFlow(flow.id, { controlType: event.target.value })}>
                                    {FLOW_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                                </select>
                            </div>

                            <div className="grid-two">
                                <select value={flow.direction || 'forward'} onChange={(event) => updateFlow(flow.id, { direction: event.target.value })}>
                                    <option value="forward">Direction: From → To</option>
                                    <option value="reverse">Direction: To → From</option>
                                    <option value="bidirectional">Direction: Two-way</option>
                                </select>
                                <button onClick={(event) => {
                                    event.stopPropagation();
                                    setSelectedFlowId(flow.id);
                                    addWaypointToFlow(flow.id);
                                }}>
                                    <Plus size={14} /> Node
                                </button>
                            </div>

                            {flow.waypoints?.length > 0 && (
                                <div className="waypoint-list">
                                    {flow.waypoints.map((point, index) => (
                                        <button
                                            key={point.id}
                                            className="waypoint-chip"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                removeWaypoint(flow.id, point.id);
                                            }}
                                        >
                                            Node {index + 1} ✕
                                        </button>
                                    ))}
                                </div>
                            )}

                            <button className="danger" onClick={() => removeFlow(flow.id)}><Trash2 size={14} /> Remove</button>
                        </div>
                    ))}
                </div>

                <h3>Scenarios</h3>
                <div className="list">
                    {scenarios.map((scenario) => (
                        <button
                            key={scenario.id}
                            className={`scenario ${scenario.id === activeScenarioId ? 'active' : ''}`}
                            onClick={() => applyScenario(scenario.id)}
                        >
                            <span>{scenario.name}</span>
                            <strong>{scenario.kpis.totalCost.toFixed(1)}</strong>
                        </button>
                    ))}
                </div>

                <h3>Area Properties</h3>
                {!selectedArea && <p className="muted">Select an area on canvas.</p>}
                {selectedArea && (
                    <div className="list-card">
                        <input
                            value={selectedArea.name}
                            onChange={(event) => setAreas((prev) => prev.map((area) => area.id === selectedArea.id ? { ...area, name: event.target.value } : area))}
                        />
                        <div className="grid-two">
                            <input
                                type="number"
                                value={selectedArea.width}
                                onChange={(event) => setAreas((prev) => prev.map((area) => area.id === selectedArea.id ? { ...area, width: Math.max(40, Number(event.target.value) || 40) } : area))}
                            />
                            <input
                                type="number"
                                value={selectedArea.height}
                                onChange={(event) => setAreas((prev) => prev.map((area) => area.id === selectedArea.id ? { ...area, height: Math.max(40, Number(event.target.value) || 40) } : area))}
                            />
                        </div>

                        <div className="row">
                            <button
                                onClick={() => setAreas((prev) => prev.map((area) => {
                                    if (area.id !== selectedArea.id) return area;
                                    const nextLocked = !area.locked;
                                    return {
                                        ...area,
                                        locked: nextLocked,
                                        fixedX: nextLocked ? area.x : null,
                                        fixedY: nextLocked ? area.y : null,
                                    };
                                }))}
                            >
                                {selectedArea.locked ? <Unlock size={14} /> : <Lock size={14} />} {selectedArea.locked ? 'Unlock' : 'Lock'}
                            </button>
                            <button className="danger" onClick={() => removeArea(selectedArea.id)}><Trash2 size={14} /> Delete</button>
                        </div>
                    </div>
                )}

                <button onClick={() => setShowAIChat(true)}><Bot size={14} /> AI Assistant</button>
            </aside>

            <AIChatOverlay
                visible={showAIChat}
                onClose={() => setShowAIChat(false)}
                title={t('facilityLayout.aiChat.title') || 'AI Assistant'}
                subtitle={t('facilityLayout.aiChat.subtitle') || 'Layout optimization copilot'}
                contextData={{ areas, flows, metrics, zoom, pan, gridSize, snapEnabled, optimizationMode }}
                systemPrompt="You are an expert in facility layout optimization. Provide practical suggestions for area arrangement, transport cost reduction, and lead-time improvement."
            />

            <style>{`
                .modern-shell{
                    --bg:#060b14;
                    --panel:#0c1322;
                    --panel-soft:#111a2e;
                    --stroke:#1f2a44;
                    --text:#e2e8f0;
                    --muted:#93a4c3;
                    --primary:#3b82f6;
                    --danger:#ef4444;
                    height:100%;
                    display:grid;
                    grid-template-columns:280px 1fr 340px;
                    background:radial-gradient(circle at top right,#12213d 0%,#060b14 55%);
                    color:var(--text);
                    overflow:hidden;
                }
                .panel{padding:14px;overflow:auto}
                .left-panel,.right-panel{background:rgba(8,13,25,0.88);backdrop-filter:blur(6px)}
                .left-panel{border-right:1px solid var(--stroke)}
                .right-panel{border-left:1px solid var(--stroke)}
                h2,h3{margin:0 0 10px}
                .card{
                    background:linear-gradient(180deg,var(--panel),var(--panel-soft));
                    border:1px solid var(--stroke);
                    border-radius:12px;
                    padding:10px;
                    margin-bottom:10px;
                }
                .compact label{display:block;font-size:11px;color:var(--muted);margin-bottom:6px}
                .muted{font-size:11px;color:var(--muted);margin:4px 0 0}
                .row{display:flex;gap:8px}
                .row > *{flex:1}
                .canvas-panel{display:flex;flex-direction:column;gap:10px}
                .topbar{display:flex;gap:8px;flex-wrap:wrap}
                .status-pill{
                    border:1px solid var(--stroke);
                    background:rgba(11,19,34,0.88);
                    border-radius:999px;
                    padding:4px 10px;
                    font-size:11px;
                }
                .canvas{
                    position:relative;
                    flex:1;
                    min-height:640px;
                    border:1px solid var(--stroke);
                    border-radius:14px;
                    background:#0a1120;
                    overflow:hidden;
                }
                .canvas-world{position:absolute;left:0;top:0;transform-origin:0 0;width:${CANVAS.width}px;height:${CANVAS.height}px}
                .grid{
                    position:absolute;
                    left:0;
                    top:0;
                    background-image:
                        linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px);
                }
                .flow-layer{position:absolute;left:0;top:0;pointer-events:auto}
                .area{
                    position:absolute;
                    border:2px solid rgba(74,222,128,0.95);
                    background:linear-gradient(180deg,rgba(34,197,94,0.25),rgba(34,197,94,0.12));
                    border-radius:12px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    gap:6px;
                    font-weight:700;
                    font-size:12px;
                    color:#f8fafc;
                    user-select:none;
                    box-shadow:0 8px 18px rgba(15,118,110,0.28);
                }
                .area.selected{border-color:#60a5fa;background:linear-gradient(180deg,rgba(59,130,246,0.3),rgba(59,130,246,0.14))}
                .area.locked{border-color:#93c5fd}
                .kpi-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px}
                .kpi{
                    border:1px solid var(--stroke);
                    background:rgba(11,19,34,0.88);
                    border-radius:10px;
                    padding:8px;
                    display:grid;
                    gap:2px;
                }
                .kpi span{font-size:10px;color:var(--muted)}
                .kpi strong{font-size:13px}
                .badges{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
                .badge{font-size:10px;border:1px solid;border-radius:999px;padding:3px 8px;background:rgba(15,23,42,0.8)}
                .list{display:grid;gap:8px;margin-bottom:10px}
                .list-card{
                    border:1px solid var(--stroke);
                    background:rgba(11,19,34,0.88);
                    border-radius:10px;
                    padding:8px;
                    display:grid;
                    gap:8px;
                }
                .list-card.selected-flow{border-color:#facc15;box-shadow:0 0 0 1px rgba(250,204,21,0.35) inset}
                .waypoint-list{display:flex;gap:6px;flex-wrap:wrap}
                .waypoint-chip{width:auto;padding:4px 8px;border-radius:999px;font-size:10px}
                .grid-two{display:grid;grid-template-columns:1fr 1fr;gap:6px}
                .grid-three{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
                .scenario{
                    text-align:left;
                    border-radius:10px;
                    border:1px solid var(--stroke);
                    background:rgba(11,19,34,0.88);
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                }
                .scenario.active{border-color:#60a5fa;box-shadow:0 0 0 1px rgba(96,165,250,0.35) inset}
                input,select,button{
                    width:100%;
                    background:rgba(15,23,42,0.95);
                    color:#e2e8f0;
                    border:1px solid var(--stroke);
                    border-radius:9px;
                    padding:8px;
                    font-size:12px;
                }
                button{display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
                button:hover{filter:brightness(1.08)}
                button.active{border-color:#60a5fa;background:rgba(59,130,246,0.22)}
                button:disabled{opacity:.65;cursor:not-allowed}
                button.danger{border-color:rgba(239,68,68,0.45);color:#fecaca;background:rgba(127,29,29,0.35)}
            `}</style>
        </div>
    );
}

export default FacilityLayoutOptimizer;