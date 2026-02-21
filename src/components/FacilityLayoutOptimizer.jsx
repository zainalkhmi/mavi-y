import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Plus,
    Save,
    Sparkles,
    Trash2,
    Move,
    MousePointer2,
    Lock,
    Unlock,
    Bot,
    Building2,
    Boxes,
    Route,
    GitBranchPlus,
    Goal,
    ScanLine,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Grid3X3,
    Magnet,
    Timer,
    Ruler,
    HelpCircle,
    X,
} from 'lucide-react';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAllProjects, saveFacilityLayoutData } from '../utils/database';
import { evaluateFacilityLayout, generateFacilityScenarios } from '../utils/layoutOptimizationEngine';
import AIChatOverlay from './features/AIChatOverlay';

const DEFAULT_LAYOUT_PROPERTIES = {
    projectName: 'New Layout',
    dimensionHorizontal: 1080,
    dimensionVertical: 640,
    gridVisible: true,
    gridSpacing: 40,
    units: 'metric',
    metricUnit: 'm',
    automaticMetric: true,
    canvasTheme: 'dark',
    notes: '',
};

const DEFAULT_CONSTRAINTS = {
    minSpacing: 40,
    targetLeadTime: 0,
    minAisleWidth: 60,
    emergencyCorridorWidth: 24,
    enforceBoundaryClearance: false,
    boundaryClearance: 12,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const uid = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const createArea = (index) => ({
    id: `area-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    name: `Area ${index + 1}`,
    x: 80 + (index % 4) * 190,
    y: 80 + Math.floor(index / 4) * 120,
    width: 130,
    height: 80,
    layer: 'block layout',
    locked: false,
    fixedX: null,
    fixedY: null,
});

const createBlockArea = ({ name, x, y, width, height }) => ({
    id: uid('area'),
    name,
    x,
    y,
    width,
    height,
    layer: 'block layout',
    locked: false,
    fixedX: null,
    fixedY: null,
});

const createDimension = ({ type = 'horizontal', from, to, offset = 20, color = '#0f172a' }) => ({
    id: uid('dim'),
    type,
    from,
    to,
    offset,
    color,
});

const normalizeDimension = (dimension = {}) => ({
    id: dimension.id || uid('dim'),
    type: dimension.type || 'horizontal',
    from: dimension.from || null,
    to: dimension.to || null,
    offset: Number.isFinite(dimension.offset) ? dimension.offset : 20,
    color: dimension.color || '#0f172a',
});

const areaAnchor = (area, anchor = 'center') => {
    if (!area) return { x: 0, y: 0 };
    switch (anchor) {
        case 'topLeft': return { x: area.x, y: area.y };
        case 'topRight': return { x: area.x + area.width, y: area.y };
        case 'bottomLeft': return { x: area.x, y: area.y + area.height };
        case 'bottomRight': return { x: area.x + area.width, y: area.y + area.height };
        case 'leftCenter': return { x: area.x, y: area.y + area.height / 2 };
        case 'rightCenter': return { x: area.x + area.width, y: area.y + area.height / 2 };
        case 'topCenter': return { x: area.x + area.width / 2, y: area.y };
        case 'bottomCenter': return { x: area.x + area.width / 2, y: area.y + area.height };
        default: return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
    }
};

const createBlockLayoutCatalog = () => {
    const catalogAreas = [
        createBlockArea({ name: 'AP sawing + periphery', x: 120, y: 90, width: 220, height: 140 }),
        createBlockArea({ name: 'AP turning + periphery', x: 420, y: 90, width: 220, height: 140 }),
        createBlockArea({ name: 'AP grinding + periphery', x: 720, y: 90, width: 220, height: 140 }),
        createBlockArea({ name: 'Packing station', x: 420, y: 310, width: 220, height: 130 }),
        createBlockArea({ name: 'Goods receipt warehouse', x: 120, y: 290, width: 220, height: 170 }),
        createBlockArea({ name: 'Goods issue warehouse', x: 720, y: 290, width: 220, height: 170 }),
    ];

    const [sawing, turning, grinding, packing, goodsReceipt, goodsIssue] = catalogAreas;
    const catalogDimensions = [];

    catalogAreas.forEach((area) => {
        catalogDimensions.push(
            createDimension({
                type: 'horizontal',
                from: { areaId: area.id, anchor: 'topLeft' },
                to: { areaId: area.id, anchor: 'topRight' },
                offset: 24,
            }),
            createDimension({
                type: 'vertical',
                from: { areaId: area.id, anchor: 'topLeft' },
                to: { areaId: area.id, anchor: 'bottomLeft' },
                offset: 24,
            })
        );
    });

    catalogDimensions.push(
        createDimension({
            type: 'aligned',
            from: { areaId: sawing.id, anchor: 'center' },
            to: { areaId: turning.id, anchor: 'center' },
            offset: 34,
            color: '#1d4ed8',
        }),
        createDimension({
            type: 'aligned',
            from: { areaId: turning.id, anchor: 'center' },
            to: { areaId: grinding.id, anchor: 'center' },
            offset: 34,
            color: '#1d4ed8',
        }),
        createDimension({
            type: 'aligned',
            from: { areaId: goodsReceipt.id, anchor: 'center' },
            to: { areaId: packing.id, anchor: 'center' },
            offset: 26,
            color: '#0369a1',
        }),
        createDimension({
            type: 'aligned',
            from: { areaId: packing.id, anchor: 'center' },
            to: { areaId: goodsIssue.id, anchor: 'center' },
            offset: 26,
            color: '#0369a1',
        }),
        createDimension({
            type: 'vertical',
            from: { areaId: turning.id, anchor: 'bottomCenter' },
            to: { areaId: packing.id, anchor: 'topCenter' },
            offset: 46,
            color: '#475569',
        })
    );

    return { catalogAreas, catalogDimensions };
};

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

const CLOSENESS_LEVELS = [
    { value: 'A', label: 'Absolutely Necessary', weight: 8, color: '#16a34a' },
    { value: 'E', label: 'Especially Important', weight: 6, color: '#22c55e' },
    { value: 'I', label: 'Important', weight: 4, color: '#38bdf8' },
    { value: 'O', label: 'Ordinary', weight: 2, color: '#a78bfa' },
    { value: 'U', label: 'Unimportant', weight: 1, color: '#94a3b8' },
    { value: 'X', label: 'Undesirable', weight: -6, color: '#ef4444' },
];

const DEFAULT_CLOSENESS = 'U';
const DEFAULT_SCENARIO_WEIGHTS = {
    totalCost: 40,
    totalDistance: 25,
    averageLeadTime: 20,
    overlapPenalty: 10,
    co2: 5,
};

const getPairKey = (a, b) => {
    const left = String(a || '');
    const right = String(b || '');
    return left < right ? `${left}|${right}` : `${right}|${left}`;
};

const normalizeClosenessMatrix = (matrix = {}) => {
    const allowed = new Set(CLOSENESS_LEVELS.map((item) => item.value));
    return Object.entries(matrix || {}).reduce((acc, [key, value]) => {
        if (!key || typeof key !== 'string') return acc;
        const [a, b] = key.split('|');
        if (!a || !b) return acc;
        const rating = allowed.has(value) ? value : DEFAULT_CLOSENESS;
        acc[getPairKey(a, b)] = rating;
        return acc;
    }, {});
};

const getClosenessWeight = (rating = DEFAULT_CLOSENESS) => (
    CLOSENESS_LEVELS.find((item) => item.value === rating)?.weight ?? 1
);

const getClosenessColor = (rating = DEFAULT_CLOSENESS) => (
    CLOSENESS_LEVELS.find((item) => item.value === rating)?.color ?? '#94a3b8'
);

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
    const [dimensions, setDimensions] = useState([]);
    const [showDimensions, setShowDimensions] = useState(true);
    const [flows, setFlows] = useState([]);
    const [closenessMatrix, setClosenessMatrix] = useState({});
    const [selectedFlowId, setSelectedFlowId] = useState(null);
    const [constraints, setConstraints] = useState(DEFAULT_CONSTRAINTS);

    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState('baseline');
    const [scenarioWeights, setScenarioWeights] = useState(DEFAULT_SCENARIO_WEIGHTS);
    const [optimizationMode, setOptimizationMode] = useState('network');
    const [baselineCost, setBaselineCost] = useState(null);

    const [selectedAreaId, setSelectedAreaId] = useState(null);
    const [selectedAreaIds, setSelectedAreaIds] = useState([]);
    const [interactionMode, setInteractionMode] = useState('select');
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [gridSize, setGridSize] = useState(40);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [layoutProperties, setLayoutProperties] = useState(DEFAULT_LAYOUT_PROPERTIES);

    const [dragState, setDragState] = useState(null);
    const [panState, setPanState] = useState(null);

    const [saving, setSaving] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);

    const canvasRef = useRef(null);

    const selectedArea = useMemo(() => areas.find((a) => a.id === selectedAreaId) || null, [areas, selectedAreaId]);
    const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

    const metrics = useMemo(
        () => evaluateFacilityLayout({ areas, flows, constraints, optimizationMode, bounds: canvasSize }),
        [areas, flows, constraints, optimizationMode, canvasSize]
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

    const closenessSummary = useMemo(
        () => Object.values(closenessMatrix).reduce((acc, rating) => {
            acc[rating] = (acc[rating] || 0) + 1;
            return acc;
        }, {}),
        [closenessMatrix]
    );

    const canvasSize = useMemo(
        () => ({
            width: clamp(Number(layoutProperties.dimensionHorizontal) || 1080, 320, 4000),
            height: clamp(Number(layoutProperties.dimensionVertical) || 640, 240, 3000),
        }),
        [layoutProperties.dimensionHorizontal, layoutProperties.dimensionVertical]
    );

    const objectCounts = useMemo(() => ({
        areas: areas.length,
        dimensions: dimensions.length,
        flows: flows.length,
        nodes: flows.reduce((sum, flow) => sum + ((flow.waypoints || []).length), 0),
    }), [areas.length, dimensions.length, flows]);

    const selectedProject = useMemo(
        () => projects.find((p) => Number(p.id) === Number(selectedProjectId)) || null,
        [projects, selectedProjectId]
    );

    useEffect(() => {
        if (selectedAreaId && selectedAreaIds.includes(selectedAreaId)) return;
        if (selectedAreaIds.length === 0) {
            if (selectedAreaId !== null) setSelectedAreaId(null);
            return;
        }
        setSelectedAreaId(selectedAreaIds[0]);
    }, [selectedAreaIds, selectedAreaId]);

    const scenarioComparison = useMemo(() => {
        if (!Array.isArray(scenarios) || scenarios.length === 0) return [];

        const rows = scenarios.map((scenario) => {
            const kpis = scenario.kpis || {};
            const scenarioAreas = Array.isArray(scenario.areas) ? scenario.areas : [];
            const floorArea = Math.max(1, canvasSize.width * canvasSize.height);
            const usedArea = scenarioAreas.reduce((sum, area) => (
                sum + Math.max(0, (Number(area.width) || 0) * (Number(area.height) || 0))
            ), 0);
            const utilization = (usedArea / floorArea) * 100;
            const co2 = Math.max(0, Number(kpis.totalDistance) || 0) * 0.00018;

            return {
                id: scenario.id,
                name: scenario.name,
                totalCost: Number(kpis.totalCost) || 0,
                totalDistance: Number(kpis.totalDistance) || 0,
                averageLeadTime: Number(kpis.averageLeadTime) || 0,
                overlapPenalty: Number(kpis.overlapPenalty) || 0,
                utilization,
                co2,
            };
        });

        const metricKeys = ['totalCost', 'totalDistance', 'averageLeadTime', 'overlapPenalty', 'co2'];
        const minMax = metricKeys.reduce((acc, key) => {
            const values = rows.map((row) => row[key]);
            acc[key] = {
                min: Math.min(...values),
                max: Math.max(...values),
            };
            return acc;
        }, {});

        const weighted = rows.map((row) => {
            const totalWeight = Object.values(scenarioWeights).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0) || 1;
            let weightedScore = 0;

            metricKeys.forEach((key) => {
                const { min, max } = minMax[key];
                const rawWeight = Math.max(0, Number(scenarioWeights[key]) || 0);
                const normalizedWeight = rawWeight / totalWeight;
                const range = max - min;

                let normalizedBenefit = 1;
                if (range > 0) {
                    // Lower is better for all scored metrics in this model.
                    normalizedBenefit = 1 - ((row[key] - min) / range);
                }

                weightedScore += normalizedBenefit * normalizedWeight * 100;
            });

            return {
                ...row,
                score: weightedScore,
            };
        });

        const sorted = [...weighted].sort((a, b) => b.score - a.score);
        const rankById = new Map(sorted.map((row, index) => [row.id, index + 1]));

        return weighted
            .map((row) => ({ ...row, rank: rankById.get(row.id) || weighted.length }))
            .sort((a, b) => a.rank - b.rank);
    }, [scenarios, scenarioWeights, canvasSize.width, canvasSize.height]);

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

        const nextLayoutProperties = {
            ...DEFAULT_LAYOUT_PROPERTIES,
            ...(data.layoutProperties || {}),
        };

        setAreas(Array.isArray(data.areas) && data.areas.length > 0 ? data.areas : [createArea(0), createArea(1), createArea(2)]);
        setDimensions(Array.isArray(data.dimensions) ? data.dimensions.map(normalizeDimension) : []);
        const nextFlows = Array.isArray(data.flows) ? data.flows.map(normalizeFlow) : [];
        setFlows(nextFlows);
        setClosenessMatrix(normalizeClosenessMatrix(data.closenessMatrix || {}));
        setSelectedFlowId((prev) => (prev && nextFlows.some((flow) => flow.id === prev) ? prev : nextFlows[0]?.id || null));
        setConstraints({ ...DEFAULT_CONSTRAINTS, ...(data.constraints || {}) });
        setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
        setActiveScenarioId(data.activeScenarioId || 'baseline');
        setScenarioWeights({ ...DEFAULT_SCENARIO_WEIGHTS, ...(data.scenarioWeights || {}) });
        setOptimizationMode(data.optimizationMode || 'network');
        setBaselineCost(Number.isFinite(data.baselineCost) ? data.baselineCost : null);
        setZoom(Number.isFinite(data.zoom) ? data.zoom : 1);
        setPan(data.pan || { x: 0, y: 0 });
        setLayoutProperties(nextLayoutProperties);
        setGridSize(Number.isFinite(nextLayoutProperties.gridSpacing)
            ? nextLayoutProperties.gridSpacing
            : (Number.isFinite(data.gridSize) ? data.gridSize : 40));
        setSnapEnabled(typeof data.snapEnabled === 'boolean' ? data.snapEnabled : true);
        setShowDimensions(typeof data.showDimensions === 'boolean' ? data.showDimensions : true);
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
        setAreas((prev) => {
            const next = [...prev, createArea(prev.length)];
            const added = next[next.length - 1];
            if (added) {
                setSelectedAreaId(added.id);
                setSelectedAreaIds([added.id]);
            }
            return next;
        });
    };

    const removeArea = (id) => {
        setAreas((prev) => prev.filter((a) => a.id !== id));
        setDimensions((prev) => prev.filter((dimension) => (
            dimension?.from?.areaId !== id && dimension?.to?.areaId !== id
        )));
        setFlows((prev) => {
            const next = prev.filter((f) => f.from !== id && f.to !== id);
            if (selectedFlowId && !next.some((flow) => flow.id === selectedFlowId)) {
                setSelectedFlowId(next[0]?.id || null);
            }
            return next;
        });
        setSelectedAreaIds((prev) => prev.filter((item) => item !== id));
        if (selectedAreaId === id) setSelectedAreaId(null);
    };

    const selectSingleArea = (id) => {
        setSelectedAreaId(id);
        setSelectedAreaIds(id ? [id] : []);
    };

    const toggleAreaSelection = (id) => {
        setSelectedAreaIds((prev) => {
            if (prev.includes(id)) {
                const next = prev.filter((item) => item !== id);
                if (selectedAreaId === id) {
                    setSelectedAreaId(next[0] || null);
                }
                return next;
            }
            const next = [...prev, id];
            setSelectedAreaId(id);
            return next;
        });
    };

    const alignSelectedAreas = (mode) => {
        const selected = areas.filter((area) => selectedAreaIds.includes(area.id));
        if (selected.length < 2) return;

        const left = Math.min(...selected.map((item) => item.x));
        const right = Math.max(...selected.map((item) => item.x + item.width));
        const top = Math.min(...selected.map((item) => item.y));
        const bottom = Math.max(...selected.map((item) => item.y + item.height));

        setAreas((prev) => prev.map((area) => {
            if (!selectedAreaIds.includes(area.id)) return area;

            let nextX = area.x;
            let nextY = area.y;

            if (mode === 'left') nextX = left;
            if (mode === 'right') nextX = right - area.width;
            if (mode === 'top') nextY = top;
            if (mode === 'bottom') nextY = bottom - area.height;

            return {
                ...area,
                x: clamp(snap(nextX), 0, canvasSize.width - area.width),
                y: clamp(snap(nextY), 0, canvasSize.height - area.height),
            };
        }));
    };

    const distributeSelectedAreas = (axis = 'horizontal') => {
        const selected = areas.filter((area) => selectedAreaIds.includes(area.id));
        if (selected.length < 3) return;

        const ordered = [...selected].sort((a, b) => (
            axis === 'horizontal'
                ? (a.x + a.width / 2) - (b.x + b.width / 2)
                : (a.y + a.height / 2) - (b.y + b.height / 2)
        ));

        const firstCenter = axis === 'horizontal'
            ? ordered[0].x + ordered[0].width / 2
            : ordered[0].y + ordered[0].height / 2;
        const lastCenter = axis === 'horizontal'
            ? ordered[ordered.length - 1].x + ordered[ordered.length - 1].width / 2
            : ordered[ordered.length - 1].y + ordered[ordered.length - 1].height / 2;
        const step = (lastCenter - firstCenter) / (ordered.length - 1);

        const targets = new Map();
        ordered.forEach((area, index) => {
            const center = firstCenter + step * index;
            if (axis === 'horizontal') {
                targets.set(area.id, {
                    x: center - area.width / 2,
                    y: area.y,
                });
            } else {
                targets.set(area.id, {
                    x: area.x,
                    y: center - area.height / 2,
                });
            }
        });

        setAreas((prev) => prev.map((area) => {
            const target = targets.get(area.id);
            if (!target) return area;
            return {
                ...area,
                x: clamp(snap(target.x), 0, canvasSize.width - area.width),
                y: clamp(snap(target.y), 0, canvasSize.height - area.height),
            };
        }));
    };

    const duplicateSelectedAreas = () => {
        const selected = areas.filter((area) => selectedAreaIds.includes(area.id));
        if (selected.length === 0) return;

        const offset = Math.max(24, Number(gridSize) || 40);
        const clones = selected.map((area, index) => ({
            ...area,
            id: uid('area'),
            name: `${area.name} Copy`,
            x: clamp(snap(area.x + offset + index * 4), 0, canvasSize.width - area.width),
            y: clamp(snap(area.y + offset + index * 4), 0, canvasSize.height - area.height),
            locked: false,
            fixedX: null,
            fixedY: null,
        }));

        setAreas((prev) => [...prev, ...clones]);
        setSelectedAreaIds(clones.map((area) => area.id));
        setSelectedAreaId(clones[0]?.id || null);
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

    const addBlockLayoutCatalog = () => {
        const { catalogAreas, catalogDimensions } = createBlockLayoutCatalog();
        setAreas(catalogAreas);
        setDimensions(catalogDimensions.map(normalizeDimension));
        setSelectedAreaId(catalogAreas[0]?.id || null);
        setSelectedAreaIds(catalogAreas[0]?.id ? [catalogAreas[0].id] : []);
        setShowDimensions(true);
    };

    const resolveDimensionPoint = (reference) => {
        if (!reference?.areaId) return null;
        const area = areaById.get(reference.areaId);
        if (!area) return null;
        return areaAnchor(area, reference.anchor || 'center');
    };

    const formatDimensionValue = (distance) => {
        const rawDistance = Number.isFinite(distance) ? Math.max(distance, 0) : 0;
        if (layoutProperties.units === 'imperial') {
            const ft = rawDistance * 3.28084;
            return `${ft.toFixed(2)} ft`;
        }

        if (layoutProperties.metricUnit === 'mm' || (layoutProperties.automaticMetric && rawDistance < 10)) {
            return `${(rawDistance * 1000).toFixed(0)} mm`;
        }
        return `${rawDistance.toFixed(2)} m`;
    };

    const renderDimension = (dimension) => {
        const p1 = resolveDimensionPoint(dimension.from);
        const p2 = resolveDimensionPoint(dimension.to);
        if (!p1 || !p2) return null;

        const stroke = dimension.color || '#0f172a';
        const offset = Number.isFinite(dimension.offset) ? dimension.offset : 20;

        if (dimension.type === 'vertical') {
            const xDim = Math.min(p1.x, p2.x) - offset;
            const y1 = p1.y;
            const y2 = p2.y;
            const length = Math.abs(y2 - y1);
            const textX = xDim - 22;
            const textY = (y1 + y2) / 2;
            return (
                <g key={dimension.id} className="dimension-group">
                    <line x1={p1.x} y1={y1} x2={xDim} y2={y1} stroke={stroke} strokeWidth="1.2" />
                    <line x1={p2.x} y1={y2} x2={xDim} y2={y2} stroke={stroke} strokeWidth="1.2" />
                    <line x1={xDim} y1={y1} x2={xDim} y2={y2} stroke={stroke} strokeWidth="1.6" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
                    <text x={textX} y={textY} transform={`rotate(-90 ${textX} ${textY})`} fill={stroke} style={{ fontSize: 10, fontWeight: 700 }} textAnchor="middle">
                        {formatDimensionValue(length)}
                    </text>
                    <text x={xDim - 42} y={textY + 3} transform={`rotate(-90 ${xDim - 42} ${textY + 3})`} fill="#64748b" style={{ fontSize: 9, fontWeight: 600 }} textAnchor="middle">
                        Type: vertical
                    </text>
                </g>
            );
        }

        if (dimension.type === 'aligned') {
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const distance = Math.hypot(dx, dy);
            if (distance < 0.0001) return null;
            const ux = dx / distance;
            const uy = dy / distance;
            const nx = -uy;
            const ny = ux;
            const a1 = { x: p1.x + nx * offset, y: p1.y + ny * offset };
            const a2 = { x: p2.x + nx * offset, y: p2.y + ny * offset };
            const textX = (a1.x + a2.x) / 2;
            const textY = (a1.y + a2.y) / 2 - 6;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
                <g key={dimension.id} className="dimension-group">
                    <line x1={p1.x} y1={p1.y} x2={a1.x} y2={a1.y} stroke={stroke} strokeWidth="1.2" />
                    <line x1={p2.x} y1={p2.y} x2={a2.x} y2={a2.y} stroke={stroke} strokeWidth="1.2" />
                    <line x1={a1.x} y1={a1.y} x2={a2.x} y2={a2.y} stroke={stroke} strokeWidth="1.6" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
                    <text x={textX} y={textY} fill={stroke} transform={`rotate(${angle} ${textX} ${textY})`} style={{ fontSize: 10, fontWeight: 700 }} textAnchor="middle">
                        {formatDimensionValue(distance)}
                    </text>
                    <text x={textX} y={textY + 14} fill="#64748b" transform={`rotate(${angle} ${textX} ${textY + 14})`} style={{ fontSize: 9, fontWeight: 600 }} textAnchor="middle">
                        Type: aligned
                    </text>
                </g>
            );
        }

        const yDim = Math.min(p1.y, p2.y) - offset;
        const x1 = p1.x;
        const x2 = p2.x;
        const length = Math.abs(x2 - x1);
        const textX = (x1 + x2) / 2;
        const textY = yDim - 8;

        return (
            <g key={dimension.id} className="dimension-group">
                <line x1={x1} y1={p1.y} x2={x1} y2={yDim} stroke={stroke} strokeWidth="1.2" />
                <line x1={x2} y1={p2.y} x2={x2} y2={yDim} stroke={stroke} strokeWidth="1.2" />
                <line x1={x1} y1={yDim} x2={x2} y2={yDim} stroke={stroke} strokeWidth="1.6" markerStart="url(#dim-arrow)" markerEnd="url(#dim-arrow)" />
                <text x={textX} y={textY} fill={stroke} style={{ fontSize: 10, fontWeight: 700 }} textAnchor="middle">
                    {formatDimensionValue(length)}
                </text>
                <text x={textX} y={textY + 14} fill="#64748b" style={{ fontSize: 9, fontWeight: 600 }} textAnchor="middle">
                    Type: horizontal
                </text>
            </g>
        );
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
                dimensions,
                flows,
                closenessMatrix,
                constraints,
                scenarios,
                activeScenarioId,
                scenarioWeights,
                optimizationMode,
                baselineCost,
                layoutProperties: {
                    ...layoutProperties,
                    dimensionHorizontal: canvasSize.width,
                    dimensionVertical: canvasSize.height,
                    gridSpacing: gridSize,
                },
                zoom,
                pan,
                gridSize,
                snapEnabled,
                showDimensions,
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
                bounds: canvasSize,
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

    const getClosenessLevel = (fromId, toId) => {
        if (!fromId || !toId || fromId === toId) return DEFAULT_CLOSENESS;
        return closenessMatrix[getPairKey(fromId, toId)] || DEFAULT_CLOSENESS;
    };

    const setClosenessLevel = (fromId, toId, rating) => {
        if (!fromId || !toId || fromId === toId) return;
        setClosenessMatrix((prev) => ({
            ...prev,
            [getPairKey(fromId, toId)]: rating,
        }));
    };

    const generateFlowsFromRelationshipMatrix = () => {
        if (areas.length < 2) return;

        const profileByRating = {
            A: { frequency: 60, unitCost: 1.2, controlType: 'pull', direction: 'bidirectional' },
            E: { frequency: 42, unitCost: 1.1, controlType: 'pull', direction: 'bidirectional' },
            I: { frequency: 28, unitCost: 1, controlType: 'fifo', direction: 'forward' },
            O: { frequency: 14, unitCost: 1, controlType: 'fifo', direction: 'forward' },
            U: { frequency: 0, unitCost: 1, controlType: 'push', direction: 'forward' },
            X: { frequency: 0, unitCost: 1.2, controlType: 'push', direction: 'forward' },
        };

        const generated = [];
        for (let i = 0; i < areas.length; i++) {
            for (let j = i + 1; j < areas.length; j++) {
                const from = areas[i];
                const to = areas[j];
                const rating = getClosenessLevel(from.id, to.id);
                const profile = profileByRating[rating] || profileByRating.U;
                if ((profile.frequency || 0) <= 0 || rating === 'X') continue;

                generated.push(normalizeFlow({
                    id: `flow-matrix-${Date.now()}-${i}-${j}`,
                    from: from.id,
                    to: to.id,
                    ...DEFAULT_FLOW,
                    frequency: profile.frequency,
                    unitCost: profile.unitCost,
                    controlType: profile.controlType,
                    direction: profile.direction,
                }));
            }
        }

        setFlows(generated);
        setSelectedFlowId(generated[0]?.id || null);
    };

    const generateInitialLayoutFromMatrix = async () => {
        if (areas.length === 0) return;

        const areaByIdLocal = new Map(areas.map((area) => [area.id, area]));
        const totalWeight = new Map(areas.map((area) => [area.id, 0]));

        for (let i = 0; i < areas.length; i++) {
            for (let j = i + 1; j < areas.length; j++) {
                const a = areas[i];
                const b = areas[j];
                const rating = getClosenessLevel(a.id, b.id);
                const weight = getClosenessWeight(rating);
                totalWeight.set(a.id, (totalWeight.get(a.id) || 0) + weight);
                totalWeight.set(b.id, (totalWeight.get(b.id) || 0) + weight);
            }
        }

        const ordered = [...areas].sort((left, right) => (totalWeight.get(right.id) || 0) - (totalWeight.get(left.id) || 0));
        const placed = new Map();
        const safeGrid = clamp(Number(gridSize) || 40, 20, 120);
        const baseStep = Math.max((Number(constraints.minSpacing) || 40) + 40, safeGrid * 2);

        const centerArea = ordered[0];
        if (!centerArea) return;

        placed.set(centerArea.id, {
            ...centerArea,
            x: clamp(snap(canvasSize.width / 2 - centerArea.width / 2), 0, canvasSize.width - centerArea.width),
            y: clamp(snap(canvasSize.height / 2 - centerArea.height / 2), 0, canvasSize.height - centerArea.height),
        });

        const evaluateCandidateScore = (candidate, targetId) => {
            let score = 0;

            placed.forEach((existing, existingId) => {
                const target = areaByIdLocal.get(targetId);
                if (!target) return;

                const dx = (candidate.x + target.width / 2) - (existing.x + existing.width / 2);
                const dy = (candidate.y + target.height / 2) - (existing.y + existing.height / 2);
                const d = Math.hypot(dx, dy);
                const rating = getClosenessLevel(targetId, existingId);
                const w = getClosenessWeight(rating);

                if (w >= 0) {
                    score += d / Math.max(1, w);
                } else {
                    score += (1200 / Math.max(1, d)) * Math.abs(w) * 2;
                }

                const xOverlap = Math.max(0, Math.min(candidate.x + target.width, existing.x + existing.width) - Math.max(candidate.x, existing.x));
                const yOverlap = Math.max(0, Math.min(candidate.y + target.height, existing.y + existing.height) - Math.max(candidate.y, existing.y));
                if (xOverlap > 0 && yOverlap > 0) {
                    score += xOverlap * yOverlap * 1000;
                }
            });

            return score;
        };

        for (let index = 1; index < ordered.length; index++) {
            const target = ordered[index];
            const rings = [1, 2, 3, 4];
            const candidates = [];

            rings.forEach((ring) => {
                const step = baseStep * ring;
                placed.forEach((existing) => {
                    candidates.push(
                        { x: existing.x + step, y: existing.y },
                        { x: existing.x - step, y: existing.y },
                        { x: existing.x, y: existing.y + step },
                        { x: existing.x, y: existing.y - step },
                        { x: existing.x + step, y: existing.y + step },
                        { x: existing.x - step, y: existing.y + step },
                        { x: existing.x + step, y: existing.y - step },
                        { x: existing.x - step, y: existing.y - step },
                    );
                });
            });

            let best = null;
            let bestScore = Infinity;
            candidates.forEach((candidate) => {
                const normalized = {
                    x: clamp(snap(candidate.x), 0, canvasSize.width - target.width),
                    y: clamp(snap(candidate.y), 0, canvasSize.height - target.height),
                };
                const score = evaluateCandidateScore(normalized, target.id);
                if (score < bestScore) {
                    best = normalized;
                    bestScore = score;
                }
            });

            placed.set(target.id, {
                ...target,
                x: best?.x ?? clamp(snap(40 + index * 40), 0, canvasSize.width - target.width),
                y: best?.y ?? clamp(snap(40 + index * 30), 0, canvasSize.height - target.height),
            });
        }

        const nextAreas = areas.map((area) => {
            const mapped = placed.get(area.id);
            return mapped ? { ...area, x: mapped.x, y: mapped.y } : area;
        });

        setAreas(nextAreas);
        await showAlert(
            t('common.success') || 'Success',
            'Initial block layout generated from relationship matrix.'
        );
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

            if (dragState.groupIds?.length > 1) {
                const dxRaw = target.x - dragState.startPointer.x;
                const dyRaw = target.y - dragState.startPointer.y;

                const dxBounds = dragState.groupIds.reduce((acc, id) => {
                    const base = dragState.initialPositions[id];
                    if (!base) return acc;
                    acc.min = Math.max(acc.min, -base.x);
                    acc.max = Math.min(acc.max, canvasSize.width - base.width - base.x);
                    return acc;
                }, { min: -Infinity, max: Infinity });

                const dyBounds = dragState.groupIds.reduce((acc, id) => {
                    const base = dragState.initialPositions[id];
                    if (!base) return acc;
                    acc.min = Math.max(acc.min, -base.y);
                    acc.max = Math.min(acc.max, canvasSize.height - base.height - base.y);
                    return acc;
                }, { min: -Infinity, max: Infinity });

                const dx = clamp(dxRaw, dxBounds.min, dxBounds.max);
                const dy = clamp(dyRaw, dyBounds.min, dyBounds.max);

                setAreas((prev) => prev.map((item) => {
                    const base = dragState.initialPositions[item.id];
                    if (!base) return item;
                    return {
                        ...item,
                        x: clamp(snap(base.x + dx), 0, canvasSize.width - item.width),
                        y: clamp(snap(base.y + dy), 0, canvasSize.height - item.height),
                    };
                }));
                return;
            }

            const base = dragState.initialPositions[dragState.id];
            if (!base) return;
            const x = clamp(snap(base.x + (target.x - dragState.startPointer.x)), 0, canvasSize.width - base.width);
            const y = clamp(snap(base.y + (target.y - dragState.startPointer.y)), 0, canvasSize.height - base.height);

            setAreas((prev) => prev.map((item) => (item.id === dragState.id ? { ...item, x, y } : item)));
            return;
        }

        if (dragState.type === 'waypoint') {
            const target = screenToWorld(sx, sy);
            const x = clamp(snap(target.x - dragState.offsetX), 0, canvasSize.width);
            const y = clamp(snap(target.y - dragState.offsetY), 0, canvasSize.height);

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

        const isMultiSelectAction = event.ctrlKey || event.metaKey || event.shiftKey;
        if (isMultiSelectAction) {
            toggleAreaSelection(area.id);
        } else if (!selectedAreaIds.includes(area.id)) {
            selectSingleArea(area.id);
        }

        if (interactionMode === 'pan' || area.locked) return;

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;

        const worldPointer = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
        const candidateIds = selectedAreaIds.includes(area.id) ? selectedAreaIds : [area.id];
        const draggableIds = candidateIds.filter((id) => {
            const target = areas.find((item) => item.id === id);
            return target && !target.locked;
        });
        const initialPositions = draggableIds.reduce((acc, id) => {
            const target = areas.find((item) => item.id === id);
            if (!target) return acc;
            acc[id] = { x: target.x, y: target.y, width: target.width, height: target.height };
            return acc;
        }, {});

        setDragState({
            type: 'area',
            id: area.id,
            startPointer: worldPointer,
            groupIds: draggableIds,
            initialPositions,
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

    const [showLayoutHelp, setShowLayoutHelp] = useState(false);

    const canvasTheme = layoutProperties.canvasTheme === 'light' ? 'light' : 'dark';

    const layerVisibility = useMemo(() => {
        const base = {
            grid: true,
            flows: true,
            dimensions: true,
            areas: true,
            ...((layoutProperties && layoutProperties.layerVisibility) || {}),
        };

        areas.forEach((area) => {
            const layerName = (area.layer || 'default').trim();
            if (typeof base[layerName] !== 'boolean') {
                base[layerName] = true;
            }
        });

        return base;
    }, [layoutProperties, areas]);

    const setLayerVisibility = (layerName, nextVisible) => {
        setLayoutProperties((prev) => ({
            ...prev,
            layerVisibility: {
                ...(prev.layerVisibility || {}),
                [layerName]: nextVisible,
            },
        }));
    };

    const areaLayers = useMemo(
        () => Array.from(new Set(areas.map((area) => (area.layer || 'default').trim()))),
        [areas]
    );

    const canvasPalette = useMemo(() => (
        canvasTheme === 'light'
            ? {
                background: '#f8fafc',
                grid: 'rgba(15,23,42,0.16)',
                flowLabelBg: 'rgba(241,245,249,0.95)',
                flowLabelText: '#0f172a',
                marker: '#334155',
                markerBi: '#d97706',
                dimArrow: '#1e293b',
            }
            : {
                background: '#0a1120',
                grid: 'rgba(148,163,184,0.2)',
                flowLabelBg: 'rgba(2,6,23,0.9)',
                flowLabelText: '#e2e8f0',
                marker: '#94a3b8',
                markerBi: '#facc15',
                dimArrow: '#0f172a',
            }
    ), [canvasTheme]);

    const visibleAreas = useMemo(
        () => areas.filter((area) => layerVisibility.areas && layerVisibility[(area.layer || 'default').trim()] !== false),
        [areas, layerVisibility]
    );

    return (
        <div className="layout-optimizer modern-shell">
            <main className="panel canvas-panel">
                <div className="topbar">
                    <div className="toolbar-group title-group">
                        <h2>{layoutProperties.projectName || t('facilityLayout.title') || 'Facility Layout Optimizer'}</h2>
                    </div>

                    <div className="toolbar-group project-group">
                        <Building2 size={14} />
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

                    <div className="toolbar-group icon-group">
                        <button title="Add Area" aria-label="Add Area" className="icon-btn" onClick={addArea}><Boxes size={14} /></button>
                        <button title="Insert Block Layout Catalog" aria-label="Insert Block Layout Catalog" className="icon-btn" onClick={addBlockLayoutCatalog}><Building2 size={14} /></button>
                        <button title="Add Flow" aria-label="Add Flow" className="icon-btn" onClick={addFlow}><Route size={14} /></button>
                        <button title="Add Node to Selected Flow" aria-label="Add Node" className="icon-btn" onClick={() => addWaypointToFlow(selectedFlowId)} disabled={!selectedFlowId}><GitBranchPlus size={14} /></button>
                        <button title="Optimize Layout" aria-label="Optimize Layout" className="icon-btn" onClick={runOptimization} disabled={optimizing}><Sparkles size={14} /></button>
                        <button title="Save Layout" aria-label="Save Layout" className="icon-btn" onClick={saveLayout} disabled={saving}><Save size={14} /></button>
                    </div>

                    <div className="toolbar-group icon-group">
                        <button
                            title="Objective: Network"
                            aria-label="Objective Network"
                            className={`icon-btn ${optimizationMode === 'network' ? 'active' : ''}`}
                            onClick={() => setOptimizationMode('network')}
                        >
                            <Goal size={14} />
                        </button>
                        <button
                            title="Objective: Line"
                            aria-label="Objective Line"
                            className={`icon-btn ${optimizationMode === 'line' ? 'active' : ''}`}
                            onClick={() => setOptimizationMode('line')}
                        >
                            <ScanLine size={14} />
                        </button>
                        <button
                            title="Select Mode"
                            aria-label="Select Mode"
                            className={`icon-btn ${interactionMode === 'select' ? 'active' : ''}`}
                            onClick={() => setInteractionMode('select')}
                        >
                            <MousePointer2 size={14} />
                        </button>
                        <button
                            title="Pan Mode"
                            aria-label="Pan Mode"
                            className={`icon-btn ${interactionMode === 'pan' ? 'active' : ''}`}
                            onClick={() => setInteractionMode('pan')}
                        >
                            <Move size={14} />
                        </button>
                    </div>

                    <div className="toolbar-group icon-group">
                        <button title="Zoom In" aria-label="Zoom In" className="icon-btn" onClick={() => setZoom((z) => clamp(z * 1.15, 0.3, 3.5))}><ZoomIn size={14} /></button>
                        <button title="Zoom Out" aria-label="Zoom Out" className="icon-btn" onClick={() => setZoom((z) => clamp(z * 0.85, 0.3, 3.5))}><ZoomOut size={14} /></button>
                        <button title="Reset View" aria-label="Reset View" className="icon-btn" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}><RotateCcw size={14} /></button>
                    </div>

                    <div className="toolbar-group compact-input-group">
                        <Grid3X3 size={13} />
                        <input
                            type="number"
                            value={gridSize}
                            title="Grid Size"
                            aria-label="Grid Size"
                            onChange={(event) => setGridSize(clamp(Number(event.target.value) || 40, 10, 120))}
                        />
                        <button title={`Snap ${snapEnabled ? 'ON' : 'OFF'}`} aria-label="Toggle Snap" className={`icon-btn ${snapEnabled ? 'active' : ''}`} onClick={() => setSnapEnabled((prev) => !prev)}>
                            <Magnet size={13} />
                        </button>
                    </div>

                    <div className="toolbar-group icon-group">
                        <button title={showDimensions ? 'Hide Dimensions' : 'Show Dimensions'} aria-label="Toggle Dimensions" className={`icon-btn ${showDimensions ? 'active' : ''}`} onClick={() => setShowDimensions((prev) => !prev)}>
                            <Ruler size={14} />
                        </button>
                        <button title="Layout Properties Help" aria-label="Layout Properties Help" className="icon-btn" onClick={() => setShowLayoutHelp(true)}>
                            <HelpCircle size={14} />
                        </button>
                    </div>

                    <div className="toolbar-group compact-input-group">
                        <Timer size={13} />
                        <input
                            type="number"
                            step="0.1"
                            title="Lead Time Target"
                            aria-label="Lead Time Target"
                            value={constraints.targetLeadTime || 0}
                            onChange={(event) => setConstraints((prev) => ({
                                ...prev,
                                targetLeadTime: Math.max(0, Number(event.target.value) || 0),
                            }))}
                        />
                    </div>

                    <div className="toolbar-group status-group">
                        <div className="status-pill">Detected: <strong>{detectedStructure}</strong></div>
                        <div className="status-pill">Selected: <strong>{selectedAreaIds.length}</strong></div>
                        <div className="status-pill">Mouse: {mousePos.x}, {mousePos.y}</div>
                        <div className="status-pill">Zoom: {(zoom * 100).toFixed(0)}%</div>
                        <div className="status-pill">Pan: {Math.round(pan.x)}, {Math.round(pan.y)}</div>
                    </div>
                </div>

                <div
                    ref={canvasRef}
                    className={`canvas ${canvasTheme === 'light' ? 'theme-light' : 'theme-dark'}`}
                    onMouseMove={onCanvasMove}
                    onMouseUp={stopInteractions}
                    onMouseLeave={stopInteractions}
                    onMouseDown={beginPan}
                    onWheel={onWheelZoom}
                >
                    <div
                        className="canvas-world"
                        style={{
                            width: canvasSize.width,
                            height: canvasSize.height,
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                        }}
                    >
                        {layoutProperties.gridVisible && layerVisibility.grid && (
                            <div
                                className="grid"
                                style={{
                                    width: canvasSize.width,
                                    height: canvasSize.height,
                                    backgroundSize: `${gridSize}px ${gridSize}px`,
                                    '--grid-line-color': canvasPalette.grid,
                                }}
                            />
                        )}

                        <svg className="flow-layer" width={canvasSize.width} height={canvasSize.height}>
                            <defs>
                                <marker id="arrow-modern" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto">
                                    <path d="M0,0 L0,6 L9,3 z" fill={canvasPalette.marker} />
                                </marker>
                                <marker id="arrow-modern-bi" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto-start-reverse">
                                    <path d="M0,0 L0,6 L9,3 z" fill={canvasPalette.markerBi} />
                                </marker>
                                <marker id="dim-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto-start-reverse">
                                    <path d="M0,0 L0,6 L7,3 z" fill={canvasPalette.dimArrow} />
                                </marker>
                            </defs>
                            {layerVisibility.flows && flows.map((flow) => {
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
                                        <rect x={middlePoint.x - 44} y={middlePoint.y - 11} width="88" height="18" rx="8" fill={canvasPalette.flowLabelBg} />
                                        <text x={middlePoint.x} y={middlePoint.y + 2} textAnchor="middle" fill={canvasPalette.flowLabelText} style={{ fontSize: 9, fontWeight: 700 }}>
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

                            {showDimensions && layerVisibility.dimensions && dimensions.map((dimension) => renderDimension(dimension))}
                        </svg>

                        {visibleAreas.map((area) => (
                            <div
                                key={area.id}
                                className={`area ${selectedAreaIds.includes(area.id) ? 'selected' : ''} ${area.locked ? 'locked' : ''}`}
                                onMouseDown={(event) => areaDragStart(event, area)}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    const isMultiSelectAction = event.ctrlKey || event.metaKey || event.shiftKey;
                                    if (isMultiSelectAction) {
                                        toggleAreaSelection(area.id);
                                    } else {
                                        selectSingleArea(area.id);
                                    }
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
                <h3>Layout Properties</h3>
                <div className="list-card">
                    <label>Project name</label>
                    <input
                        value={layoutProperties.projectName}
                        onChange={(event) => setLayoutProperties((prev) => ({ ...prev, projectName: event.target.value || 'New Layout' }))}
                    />

                    <label>Dimension and grid</label>
                    <div className="grid-two">
                        <input
                            type="number"
                            value={layoutProperties.dimensionHorizontal}
                            onChange={(event) => setLayoutProperties((prev) => ({
                                ...prev,
                                dimensionHorizontal: clamp(Number(event.target.value) || 1080, 320, 4000),
                            }))}
                            placeholder="Dimension horizontally"
                        />
                        <input
                            type="number"
                            value={layoutProperties.dimensionVertical}
                            onChange={(event) => setLayoutProperties((prev) => ({
                                ...prev,
                                dimensionVertical: clamp(Number(event.target.value) || 640, 240, 3000),
                            }))}
                            placeholder="Dimension vertically"
                        />
                    </div>

                    <div className="grid-two">
                        <button
                            className={layoutProperties.gridVisible ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, gridVisible: !prev.gridVisible }))}
                        >
                            Grid {layoutProperties.gridVisible ? 'On' : 'Off'}
                        </button>
                        <input
                            type="number"
                            value={gridSize}
                            onChange={(event) => {
                                const spacing = clamp(Number(event.target.value) || 40, 10, 120);
                                setGridSize(spacing);
                                setLayoutProperties((prev) => ({ ...prev, gridSpacing: spacing }));
                            }}
                            placeholder="Grid spacing"
                        />
                    </div>

                    <label>Units</label>
                    <div className="grid-two">
                        <button
                            className={layoutProperties.units === 'metric' ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, units: 'metric' }))}
                        >
                            Metric
                        </button>
                        <button
                            className={layoutProperties.units === 'imperial' ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, units: 'imperial' }))}
                        >
                            Imperial
                        </button>
                    </div>

                    <label>Canvas theme</label>
                    <div className="grid-two">
                        <button
                            className={canvasTheme === 'light' ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, canvasTheme: 'light' }))}
                        >
                            White
                        </button>
                        <button
                            className={canvasTheme === 'dark' ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, canvasTheme: 'dark' }))}
                        >
                            Black
                        </button>
                    </div>

                    <label>Metric measurements</label>
                    <div className="grid-two">
                        <button
                            className={layoutProperties.automaticMetric ? 'active' : ''}
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, automaticMetric: !prev.automaticMetric }))}
                        >
                            Automatic
                        </button>
                        <button
                            onClick={() => setLayoutProperties((prev) => ({ ...prev, metricUnit: prev.metricUnit === 'm' ? 'mm' : 'm' }))}
                        >
                            {layoutProperties.metricUnit === 'm' ? 'Meter' : 'Millimeter'}
                        </button>
                    </div>

                    <label>Notes</label>
                    <textarea
                        value={layoutProperties.notes}
                        onChange={(event) => setLayoutProperties((prev) => ({ ...prev, notes: event.target.value }))}
                        rows={3}
                        placeholder="Multi-line notes..."
                    />

                    <label>Number of objects</label>
                    <div className="grid-three">
                        <div className="kpi"><span>Areas</span><strong>{objectCounts.areas}</strong></div>
                        <div className="kpi"><span>Dimensions</span><strong>{objectCounts.dimensions}</strong></div>
                        <div className="kpi"><span>Flows</span><strong>{objectCounts.flows}</strong></div>
                    </div>
                    <div className="grid-three" style={{ marginTop: 6 }}>
                        <div className="kpi"><span>Nodes</span><strong>{objectCounts.nodes}</strong></div>
                        <div className="kpi"><span>Dimensions visible</span><strong>{showDimensions ? 'Yes' : 'No'}</strong></div>
                        <div className="kpi"><span>Layer</span><strong>block layout</strong></div>
                    </div>
                </div>

                <h3>Layer Manager</h3>
                <div className="list-card">
                    <div className="grid-two">
                        <button className={layerVisibility.grid ? 'active' : ''} onClick={() => setLayerVisibility('grid', !layerVisibility.grid)}>
                            Grid: {layerVisibility.grid ? 'On' : 'Off'}
                        </button>
                        <button className={layerVisibility.flows ? 'active' : ''} onClick={() => setLayerVisibility('flows', !layerVisibility.flows)}>
                            Flows: {layerVisibility.flows ? 'On' : 'Off'}
                        </button>
                    </div>
                    <div className="grid-two">
                        <button className={layerVisibility.areas ? 'active' : ''} onClick={() => setLayerVisibility('areas', !layerVisibility.areas)}>
                            Areas: {layerVisibility.areas ? 'On' : 'Off'}
                        </button>
                        <button className={layerVisibility.dimensions ? 'active' : ''} onClick={() => setLayerVisibility('dimensions', !layerVisibility.dimensions)}>
                            Dimensions: {layerVisibility.dimensions ? 'On' : 'Off'}
                        </button>
                    </div>

                    {areaLayers.length > 0 && (
                        <>
                            <label style={{ marginTop: 6 }}>Area Layers</label>
                            <div className="badges">
                                {areaLayers.map((layerName) => {
                                    const visible = layerVisibility[layerName] !== false;
                                    return (
                                        <button
                                            key={layerName}
                                            type="button"
                                            className={visible ? 'active' : ''}
                                            onClick={() => setLayerVisibility(layerName, !visible)}
                                            style={{ width: 'auto', minWidth: 0, padding: '5px 10px' }}
                                        >
                                            {layerName}: {visible ? 'On' : 'Off'}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                <h3>Insights</h3>
                <div className="kpi-grid">
                    <div className="kpi"><span>Total Cost</span><strong>{metrics.totalCost.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Flow Cost</span><strong>{metrics.flowCost.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Total Distance</span><strong>{metrics.totalDistance.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Avg Lead Time</span><strong>{(metrics.averageLeadTime || 0).toFixed(2)} h</strong></div>
                    <div className="kpi"><span>Δ vs Baseline</span><strong>{baselineCost === null ? '0.0' : (metrics.totalCost - baselineCost).toFixed(1)}</strong></div>
                    <div className="kpi"><span>Overlap Penalty</span><strong>{metrics.overlapPenalty.toFixed(1)}</strong></div>
                    <div className="kpi"><span>Aisle Penalty</span><strong>{(metrics.aislePenalty || 0).toFixed(1)}</strong></div>
                    <div className="kpi"><span>Emergency Penalty</span><strong>{(metrics.emergencyPenalty || 0).toFixed(1)}</strong></div>
                </div>

                <button onClick={() => setBaselineCost(metrics.totalCost)}>Set Current as Baseline</button>

                <h3>Constraint Rules (P4)</h3>
                <div className="list-card">
                    <label>Hard-rule constraints</label>
                    <div className="grid-two">
                        <input
                            type="number"
                            min="0"
                            value={constraints.minSpacing ?? 0}
                            onChange={(event) => setConstraints((prev) => ({ ...prev, minSpacing: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Min spacing"
                        />
                        <input
                            type="number"
                            min="0"
                            value={constraints.minAisleWidth ?? 0}
                            onChange={(event) => setConstraints((prev) => ({ ...prev, minAisleWidth: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Min aisle width"
                        />
                    </div>

                    <div className="grid-two">
                        <input
                            type="number"
                            min="0"
                            value={constraints.emergencyCorridorWidth ?? 0}
                            onChange={(event) => setConstraints((prev) => ({ ...prev, emergencyCorridorWidth: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Emergency corridor width"
                        />
                        <input
                            type="number"
                            min="0"
                            value={constraints.boundaryClearance ?? 0}
                            onChange={(event) => setConstraints((prev) => ({ ...prev, boundaryClearance: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Boundary clearance"
                        />
                    </div>

                    <button
                        className={constraints.enforceBoundaryClearance ? 'active' : ''}
                        onClick={() => setConstraints((prev) => ({
                            ...prev,
                            enforceBoundaryClearance: !prev.enforceBoundaryClearance,
                        }))}
                    >
                        Boundary clearance: {constraints.enforceBoundaryClearance ? 'On' : 'Off'}
                    </button>

                    <div className="badges">
                        <span className="badge" style={{ borderColor: (metrics.overlapPenalty || 0) <= 0 ? '#22c55e' : '#ef4444', color: (metrics.overlapPenalty || 0) <= 0 ? '#22c55e' : '#ef4444' }}>
                            Overlap: {(metrics.overlapPenalty || 0) <= 0 ? 'PASS' : 'VIOLATION'}
                        </span>
                        <span className="badge" style={{ borderColor: (metrics.aislePenalty || 0) <= 0 ? '#22c55e' : '#f59e0b', color: (metrics.aislePenalty || 0) <= 0 ? '#22c55e' : '#f59e0b' }}>
                            Aisle: {(metrics.aislePenalty || 0) <= 0 ? 'PASS' : 'CHECK'}
                        </span>
                        <span className="badge" style={{ borderColor: (metrics.emergencyPenalty || 0) <= 0 ? '#22c55e' : '#ef4444', color: (metrics.emergencyPenalty || 0) <= 0 ? '#22c55e' : '#ef4444' }}>
                            Emergency: {(metrics.emergencyPenalty || 0) <= 0 ? 'PASS' : 'VIOLATION'}
                        </span>
                        <span className="badge" style={{ borderColor: (metrics.boundaryClearancePenalty || 0) <= 0 ? '#22c55e' : '#f59e0b', color: (metrics.boundaryClearancePenalty || 0) <= 0 ? '#22c55e' : '#f59e0b' }}>
                            Boundary: {(metrics.boundaryClearancePenalty || 0) <= 0 ? 'PASS' : 'CHECK'}
                        </span>
                    </div>
                </div>

                <h3>Flow Types</h3>
                <div className="badges">
                    {FLOW_TYPES.map((item) => (
                        <span key={item.value} className="badge" style={{ borderColor: item.color, color: item.color }}>
                            {item.label}: {flowSummary[item.value] || 0}
                        </span>
                    ))}
                </div>

                <h3>Relationship Matrix (A/E/I/O/U/X)</h3>
                <div className="list-card">
                    <div className="grid-two">
                        <button onClick={generateFlowsFromRelationshipMatrix}>Generate Flows from Matrix</button>
                        <button onClick={generateInitialLayoutFromMatrix}>Generate Initial Block Layout</button>
                    </div>

                    <div className="badges">
                        {CLOSENESS_LEVELS.map((item) => (
                            <span key={item.value} className="badge" style={{ borderColor: item.color, color: item.color }}>
                                {item.value}: {closenessSummary[item.value] || 0}
                            </span>
                        ))}
                    </div>

                    <div className="matrix-wrap">
                        <table className="matrix-table">
                            <thead>
                                <tr>
                                    <th>Area</th>
                                    {areas.map((col) => (
                                        <th key={`mx-head-${col.id}`}>{col.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {areas.map((row, rowIndex) => (
                                    <tr key={`mx-row-${row.id}`}>
                                        <th>{row.name}</th>
                                        {areas.map((col, colIndex) => {
                                            if (row.id === col.id) {
                                                return <td key={`mx-${row.id}-${col.id}`} className="matrix-diagonal">—</td>;
                                            }

                                            const rating = getClosenessLevel(row.id, col.id);
                                            const isEditable = colIndex > rowIndex;
                                            if (!isEditable) {
                                                return (
                                                    <td key={`mx-${row.id}-${col.id}`}>
                                                        <span className="matrix-rating" style={{ borderColor: getClosenessColor(rating), color: getClosenessColor(rating) }}>{rating}</span>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={`mx-${row.id}-${col.id}`}>
                                                    <select
                                                        value={rating}
                                                        onChange={(event) => setClosenessLevel(row.id, col.id, event.target.value)}
                                                    >
                                                        {CLOSENESS_LEVELS.map((item) => (
                                                            <option key={`${row.id}-${col.id}-${item.value}`} value={item.value}>
                                                                {item.value} - {item.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

                <h3>Scenario Compare (Weighted)</h3>
                <div className="list-card">
                    <label>Scoring weights</label>
                    <div className="grid-two">
                        <input
                            type="number"
                            min="0"
                            value={scenarioWeights.totalCost}
                            onChange={(event) => setScenarioWeights((prev) => ({ ...prev, totalCost: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Weight cost"
                        />
                        <input
                            type="number"
                            min="0"
                            value={scenarioWeights.totalDistance}
                            onChange={(event) => setScenarioWeights((prev) => ({ ...prev, totalDistance: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Weight distance"
                        />
                    </div>
                    <div className="grid-two">
                        <input
                            type="number"
                            min="0"
                            value={scenarioWeights.averageLeadTime}
                            onChange={(event) => setScenarioWeights((prev) => ({ ...prev, averageLeadTime: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Weight lead time"
                        />
                        <input
                            type="number"
                            min="0"
                            value={scenarioWeights.overlapPenalty}
                            onChange={(event) => setScenarioWeights((prev) => ({ ...prev, overlapPenalty: Math.max(0, Number(event.target.value) || 0) }))}
                            placeholder="Weight overlap"
                        />
                    </div>
                    <input
                        type="number"
                        min="0"
                        value={scenarioWeights.co2}
                        onChange={(event) => setScenarioWeights((prev) => ({ ...prev, co2: Math.max(0, Number(event.target.value) || 0) }))}
                        placeholder="Weight CO2"
                    />

                    <div className="matrix-wrap">
                        <table className="matrix-table scenario-table">
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Scenario</th>
                                    <th>Score</th>
                                    <th>Total Cost</th>
                                    <th>Distance</th>
                                    <th>Lead Time</th>
                                    <th>Overlap</th>
                                    <th>Utilization</th>
                                    <th>CO2 (est.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {scenarioComparison.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="matrix-diagonal">Run optimization first to compare scenarios.</td>
                                    </tr>
                                )}
                                {scenarioComparison.map((row) => (
                                    <tr key={`scenario-compare-${row.id}`} className={activeScenarioId === row.id ? 'scenario-active-row' : ''}>
                                        <td>{row.rank}</td>
                                        <td>{row.name}</td>
                                        <td><strong>{row.score.toFixed(1)}</strong></td>
                                        <td>{row.totalCost.toFixed(1)}</td>
                                        <td>{row.totalDistance.toFixed(1)}</td>
                                        <td>{row.averageLeadTime.toFixed(2)} h</td>
                                        <td>{row.overlapPenalty.toFixed(1)}</td>
                                        <td>{row.utilization.toFixed(1)}%</td>
                                        <td>{row.co2.toFixed(3)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <h3>Area Properties</h3>
                {!selectedArea && <p className="muted">Select an area on canvas.</p>}

                <div className="list-card">
                    <label>Smart Edit Tools</label>
                    <p className="muted" style={{ marginTop: -2 }}>Multi-select: Ctrl/Cmd/Shift + click area.</p>
                    <div className="grid-two">
                        <button onClick={() => alignSelectedAreas('left')} disabled={selectedAreaIds.length < 2}>Align Left</button>
                        <button onClick={() => alignSelectedAreas('right')} disabled={selectedAreaIds.length < 2}>Align Right</button>
                    </div>
                    <div className="grid-two">
                        <button onClick={() => alignSelectedAreas('top')} disabled={selectedAreaIds.length < 2}>Align Top</button>
                        <button onClick={() => alignSelectedAreas('bottom')} disabled={selectedAreaIds.length < 2}>Align Bottom</button>
                    </div>
                    <div className="grid-two">
                        <button onClick={() => distributeSelectedAreas('horizontal')} disabled={selectedAreaIds.length < 3}>Distribute H</button>
                        <button onClick={() => distributeSelectedAreas('vertical')} disabled={selectedAreaIds.length < 3}>Distribute V</button>
                    </div>
                    <div className="grid-two">
                        <button onClick={duplicateSelectedAreas} disabled={selectedAreaIds.length < 1}>Duplicate</button>
                        <button onClick={() => setSelectedAreaIds([])} disabled={selectedAreaIds.length < 1}>Clear Selection</button>
                    </div>
                </div>

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

                        <input
                            value={selectedArea.layer || 'default'}
                            onChange={(event) => setAreas((prev) => prev.map((area) => (
                                area.id === selectedArea.id
                                    ? { ...area, layer: (event.target.value || 'default').trim() || 'default' }
                                    : area
                            )))}
                            placeholder="Layer name"
                        />

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

            {showLayoutHelp && (
                <div className="help-modal-overlay" onClick={() => setShowLayoutHelp(false)}>
                    <div className="help-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="help-modal-header">
                            <h3>Layout Properties</h3>
                            <button className="icon-btn" onClick={() => setShowLayoutHelp(false)}><X size={14} /></button>
                        </div>
                        <div className="help-modal-body">
                            <p><strong>Project name:</strong> Default is <em>New Layout</em>. You can rename it to identify the layout document topic. The name appears in the title bar and can be used in print/PDF title blocks.</p>
                            <p><strong>Dimension and grid:</strong> Configure layout size, grid visibility, and grid spacing. The origin is fixed at bottom-left (x=0, y=0), so resizing grows/shrinks to the right and upward.</p>
                            <p><strong>Units:</strong> Switch between metric and imperial for dimensions measured from the layout. This applies to measurements, area values, quick measurement, and 3D measurement.</p>
                            <p><strong>Metric measurements:</strong> Choose m or mm. If <em>Automatic</em> is enabled, measurements above 10 m can be displayed in m automatically.</p>
                            <p><strong>Block layout catalog:</strong> Use the catalog button in the top toolbar to insert six predefined blocks (3 AP peripheries, packing station, goods receipt, goods issue) on a shared layer named <em>block layout</em>.</p>
                            <p><strong>Dimensioning:</strong> The ruler button toggles dimensions globally. Horizontal, vertical, and aligned dimensions are associative and update automatically when linked areas are moved or resized.</p>
                            <p><strong>Notes:</strong> Multi-line notes are supported. Press ENTER to create a line break.</p>
                            <p><strong>Number of objects:</strong> Shows the count of area, flow, and node object types in the current layout.</p>
                        </div>
                    </div>
                </div>
            )}

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
                    grid-template-columns:minmax(0,1fr) 340px;
                    background:radial-gradient(circle at top right,#12213d 0%,#060b14 55%);
                    color:var(--text);
                    overflow:hidden;
                }
                .panel{padding:14px;overflow:auto}
                .right-panel{background:rgba(8,13,25,0.88);backdrop-filter:blur(6px)}
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
                .topbar{
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                    border:1px solid var(--stroke);
                    background:rgba(11,19,34,0.88);
                    border-radius:12px;
                    padding:8px;
                }
                .toolbar-group{display:flex;align-items:center;gap:6px}
                .title-group h2{margin:0;font-size:20px;line-height:1}
                .project-group{padding:0 6px;border:1px solid var(--stroke);border-radius:10px;background:rgba(15,23,42,0.9)}
                .project-group select{width:220px;border:none;background:transparent;padding:7px 4px}
                .icon-group,.compact-input-group{padding:2px;border:1px solid var(--stroke);border-radius:10px;background:rgba(2,6,23,0.5)}
                .icon-btn{width:34px;min-width:34px;padding:8px;flex:none}
                .compact-input-group input{width:70px;padding:7px 8px;text-align:center}
                .status-group{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
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
                .canvas.theme-light{background:#f8fafc}
                .canvas.theme-dark{background:#0a1120}
                .canvas-world{position:absolute;left:0;top:0;transform-origin:0 0}
                .grid{
                    position:absolute;
                    left:0;
                    top:0;
                    background-image:
                        linear-gradient(to right, var(--grid-line-color, rgba(148,163,184,0.2)) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--grid-line-color, rgba(148,163,184,0.2)) 1px, transparent 1px);
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
                .matrix-wrap{overflow:auto;border:1px solid var(--stroke);border-radius:10px}
                .matrix-table{width:100%;border-collapse:collapse;min-width:620px}
                .matrix-table th,.matrix-table td{border:1px solid var(--stroke);padding:6px;text-align:center;font-size:11px}
                .matrix-table thead th{position:sticky;top:0;background:rgba(2,6,23,0.95);z-index:1}
                .matrix-table tbody th{background:rgba(2,6,23,0.95);text-align:left;position:sticky;left:0;z-index:1}
                .matrix-diagonal{color:var(--muted);font-weight:700}
                .matrix-rating{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border:1px solid;border-radius:999px;font-weight:700}
                .scenario-table td,.scenario-table th{white-space:nowrap}
                .scenario-active-row{background:rgba(59,130,246,0.12)}
                input,select,button{
                    width:100%;
                    background:rgba(15,23,42,0.95);
                    color:#e2e8f0;
                    border:1px solid var(--stroke);
                    border-radius:9px;
                    padding:8px;
                    font-size:12px;
                }
                textarea{
                    width:100%;
                    resize:vertical;
                    background:rgba(15,23,42,0.95);
                    color:#e2e8f0;
                    border:1px solid var(--stroke);
                    border-radius:9px;
                    padding:8px;
                    font-size:12px;
                    font-family:inherit;
                }
                button{display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
                button:hover{filter:brightness(1.08)}
                button.active{border-color:#60a5fa;background:rgba(59,130,246,0.22)}
                button:disabled{opacity:.65;cursor:not-allowed}
                button.danger{border-color:rgba(239,68,68,0.45);color:#fecaca;background:rgba(127,29,29,0.35)}
                .help-modal-overlay{
                    position:fixed;
                    inset:0;
                    background:rgba(2,6,23,0.6);
                    z-index:1000;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    padding:16px;
                }
                .help-modal{
                    width:min(780px,95vw);
                    max-height:85vh;
                    overflow:auto;
                    border:1px solid var(--stroke);
                    border-radius:12px;
                    background:linear-gradient(180deg,var(--panel),var(--panel-soft));
                }
                .help-modal-header{
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    padding:10px 12px;
                    border-bottom:1px solid var(--stroke);
                }
                .help-modal-body{padding:12px;font-size:13px;line-height:1.55}

                @media (max-width: 1400px){
                    .status-group{width:100%;margin-left:0}
                }
            `}</style>
        </div>
    );
}

export default FacilityLayoutOptimizer;