import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getAllProjects, saveFacilityLayoutData } from '../utils/database';
import { evaluateFacilityLayout, generateFacilityScenarios } from '../utils/layoutOptimizationEngine';
import { Save, Sparkles, Plus, Trash2, RefreshCw, Lock, Unlock, Move, MousePointer2, Image as ImageIcon, FileCog } from 'lucide-react';
import AIChatOverlay from './features/AIChatOverlay';

const DEFAULT_CANVAS = { width: 980, height: 620 };
const RULER_TOP = 20;
const RULER_LEFT = 30;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const detectLayoutStructure = (areas = [], flows = []) => {
    if (areas.length < 3 || flows.length === 0) return 'network';

    const areaById = new Map(areas.map((a) => [a.id, a]));
    let backflowScore = 0;
    let totalScore = 0;

    flows.forEach((flow) => {
        const from = areaById.get(flow.from);
        const to = areaById.get(flow.to);
        if (!from || !to) return;
        const freq = Math.max(1, Number(flow.frequency) || 1);
        const fromCx = from.x + from.width / 2;
        const toCx = to.x + to.width / 2;
        if (toCx < fromCx) backflowScore += freq;
        totalScore += freq;
    });

    const backflowRatio = totalScore > 0 ? backflowScore / totalScore : 0;
    return backflowRatio <= 0.2 ? 'line' : 'network';
};

const FLOW_CONTROL_TYPES = [
    { value: 'push', label: 'Push' },
    { value: 'pull', label: 'Pull / Supermarket' },
    { value: 'fifo', label: 'FIFO Lane' },
    { value: 'kanban', label: 'Kanban Signal' },
    { value: 'conwip', label: 'CONWIP' },
];

const FLOW_CONTROL_COLOR = {
    push: '#f97316',
    pull: '#22c55e',
    fifo: '#38bdf8',
    kanban: '#a78bfa',
    conwip: '#facc15',
};

const createDefaultArea = (index) => ({
    id: `area-${Date.now()}-${index}`,
    name: `Area ${index + 1}`,
    x: 60 + (index % 5) * 170,
    y: 60 + Math.floor(index / 5) * 110,
    width: 120,
    height: 70,
    locked: false,
    fixedX: null,
    fixedY: null,
    priority: null,
});

function FacilityLayoutOptimizer() {
    const { currentProject } = useProject();
    const { showAlert } = useDialog();
    const { t } = useLanguage();

    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [areas, setAreas] = useState([createDefaultArea(0), createDefaultArea(1), createDefaultArea(2)]);
    const [flows, setFlows] = useState([]);
    const [constraints, setConstraints] = useState({ minSpacing: 40, targetLeadTime: 0 });
    const [selectedAreaId, setSelectedAreaId] = useState(null);
    const [dragState, setDragState] = useState(null);
    const [saving, setSaving] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [scenarios, setScenarios] = useState([]);
    const [activeScenarioId, setActiveScenarioId] = useState('baseline');
    const [detectedStructure, setDetectedStructure] = useState('network');
    const [optimizationMode, setOptimizationMode] = useState('network');
    const [baselineCost, setBaselineCost] = useState(null);
    const [showGrid, setShowGrid] = useState(true);
    const [gridSize, setGridSize] = useState(50);
    const [scaleUnit, setScaleUnit] = useState('m');
    const [unitsPerGrid, setUnitsPerGrid] = useState(1);
    const [snapEnabled, setSnapEnabled] = useState(true);
    const [canvasWidth, setCanvasWidth] = useState(DEFAULT_CANVAS.width);
    const [canvasHeight, setCanvasHeight] = useState(DEFAULT_CANVAS.height);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [interactionMode, setInteractionMode] = useState('select');
    const [panning, setPanning] = useState(null);
    const [backgroundImage, setBackgroundImage] = useState(null);
    const [backgroundOpacity, setBackgroundOpacity] = useState(0.35);
    const [cadImportInfo, setCadImportInfo] = useState(null);
    const [showAIChat, setShowAIChat] = useState(false);

    const imageInputRef = useRef(null);
    const cadInputRef = useRef(null);

    const selectedArea = useMemo(() => areas.find((a) => a.id === selectedAreaId) || null, [areas, selectedAreaId]);
    const metrics = useMemo(
        () => evaluateFacilityLayout({ areas, flows, constraints, optimizationMode }),
        [areas, flows, constraints, optimizationMode]
    );
    const areaById = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);

    const flowControlSummary = useMemo(() => {
        return flows.reduce((acc, flow) => {
            const type = flow.controlType || 'push';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});
    }, [flows]);

    const pxToWorld = (sx, sy) => ({
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
    });

    const worldToUnits = (value) => ((value / Math.max(gridSize, 1)) * unitsPerGrid).toFixed(2);

    const snapValue = (value) => (snapEnabled ? Math.round(value / gridSize) * gridSize : value);

    useEffect(() => {
        const loadProjects = async () => {
            const rows = await getAllProjects();
            setProjects(rows || []);
            const preferred = currentProject ? rows.find((p) => p.id === currentProject.id) : rows[0];
            if (!preferred) return;
            setSelectedProjectId(preferred.id);
            const data = preferred.facilityLayoutData;
            if (!data) return;

            setAreas(data.areas || []);
            setFlows(data.flows || []);
            setConstraints(data.constraints || { minSpacing: 40, targetLeadTime: 0 });
            setScenarios(data.scenarios || []);
            setActiveScenarioId(data.activeScenarioId || 'baseline');
            setDetectedStructure(data.detectedStructure || 'network');
            setOptimizationMode(data.optimizationMode || 'network');
            setBaselineCost(data.baselineCost ?? null);
            if (data.canvasWidth) setCanvasWidth(data.canvasWidth);
            if (data.canvasHeight) setCanvasHeight(data.canvasHeight);
            if (data.zoom) setZoom(data.zoom);
            if (data.pan) setPan(data.pan);
            if (data.gridSize) setGridSize(data.gridSize);
            if (data.scaleUnit) setScaleUnit(data.scaleUnit);
            if (data.unitsPerGrid) setUnitsPerGrid(data.unitsPerGrid);
            if (typeof data.snapEnabled === 'boolean') setSnapEnabled(data.snapEnabled);
            if (data.backgroundImage) setBackgroundImage(data.backgroundImage);
            if (data.backgroundOpacity) setBackgroundOpacity(data.backgroundOpacity);
            if (data.cadImportInfo) setCadImportInfo(data.cadImportInfo);
        };

        loadProjects();
    }, [currentProject]);

    useEffect(() => {
        const structure = detectLayoutStructure(areas, flows);
        setDetectedStructure(structure);
    }, [areas, flows]);

    useEffect(() => {
        if (baselineCost === null && Number.isFinite(metrics.totalCost)) {
            setBaselineCost(metrics.totalCost);
        }
    }, [metrics.totalCost, baselineCost]);

    const saveLayout = async () => {
        if (!selectedProjectId) {
            await showAlert(t('facilityLayout.title') || 'Facility Layout', t('facilityLayout.messages.selectProjectFirst') || 'Select project first.');
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
                detectedStructure,
                optimizationMode,
                baselineCost,
                canvasWidth,
                canvasHeight,
                zoom,
                pan,
                gridSize,
                scaleUnit,
                unitsPerGrid,
                snapEnabled,
                backgroundImage,
                backgroundOpacity,
                cadImportInfo,
                updatedAt: new Date().toISOString(),
            });
            await showAlert(t('common.success') || 'Success', t('facilityLayout.messages.savedSuccessfully') || 'Saved successfully.');
        } catch (error) {
            await showAlert(t('common.error') || 'Error', `${t('facilityLayout.messages.saveFailed') || 'Save failed'}: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const runOptimization = async () => {
        setOptimizing(true);
        try {
            const generated = generateFacilityScenarios({
                areas,
                flows,
                constraints,
                optimizationMode,
                bounds: { width: canvasWidth, height: canvasHeight },
            });
            setScenarios(generated);
            if (generated[0]) {
                setActiveScenarioId(generated[0].id);
                setAreas(generated[0].areas);
            }
        } finally {
            setOptimizing(false);
        }
    };

    const applyScenario = (id) => {
        const found = scenarios.find((s) => s.id === id);
        if (!found) return;
        setActiveScenarioId(id);
        setAreas(found.areas.map((a) => ({ ...a })));
    };

    const onMouseMoveCanvas = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = clamp(e.clientX - rect.left - RULER_LEFT, 0, canvasWidth);
        const localY = clamp(e.clientY - rect.top - RULER_TOP, 0, canvasHeight);
        const world = pxToWorld(localX, localY);
        setMousePos({ x: Number(worldToUnits(world.x)), y: Number(worldToUnits(world.y)) });

        if (panning) {
            setPan({
                x: panning.startPanX + (e.clientX - panning.startX),
                y: panning.startPanY + (e.clientY - panning.startY),
            });
            return;
        }

        if (dragState) {
            const target = pxToWorld(localX, localY);
            const x = clamp(snapValue(target.x - dragState.offsetX), 0, canvasWidth - dragState.width);
            const y = clamp(snapValue(target.y - dragState.offsetY), 0, canvasHeight - dragState.height);
            setAreas((prev) => prev.map((a) => (a.id === dragState.id ? { ...a, x, y } : a)));
        }
    };

    const stopInteractions = () => {
        setDragState(null);
        setPanning(null);
    };

    const handleWheelZoom = (e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const sx = e.clientX - rect.left - RULER_LEFT;
        const sy = e.clientY - rect.top - RULER_TOP;
        const before = pxToWorld(sx, sy);
        const nextZoom = clamp(zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.2, 4);
        const nextPan = {
            x: sx - before.x * nextZoom,
            y: sy - before.y * nextZoom,
        };
        setZoom(nextZoom);
        setPan(nextPan);
    };

    const addArea = () => setAreas((prev) => [...prev, createDefaultArea(prev.length)]);
    const addFlow = () => {
        if (areas.length < 2) return;
        setFlows((prev) => [...prev, {
            id: `flow-${Date.now()}`,
            from: areas[0].id,
            to: areas[1].id,
            frequency: 10,
            unitCost: 1,
            controlType: 'fifo',
            bufferLimit: 20,
            reorderPoint: 10,
            leadTime: 1,
            signalQty: 5,
        }]);
    };

    const updateFlow = (id, patch) => {
        setFlows((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    };

    const removeFlow = (id) => {
        setFlows((prev) => prev.filter((f) => f.id !== id));
    };

    const removeArea = (id) => {
        setAreas((prev) => prev.filter((a) => a.id !== id));
        setFlows((prev) => prev.filter((f) => f.from !== id && f.to !== id));
        if (selectedAreaId === id) setSelectedAreaId(null);
    };

    const onImportImage = (file) => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => setBackgroundImage(reader.result);
        reader.readAsDataURL(file);
    };

    const onImportCad = async (file) => {
        if (!file) return;
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['dwg', 'dxf'].includes(ext)) {
            await showAlert('CAD Import', 'Format didukung: DWG / DXF');
            return;
        }

        setCadImportInfo({
            name: file.name,
            sizeKb: (file.size / 1024).toFixed(1),
            importedAt: new Date().toISOString(),
            status: 'loaded-as-reference',
        });
        await showAlert('CAD Import', `${file.name} berhasil diimport sebagai referensi metadata. Parser geometri DWG bisa ditambahkan pada tahap berikutnya.`);
    };

    return (
        <div style={{ height: '100%', display: 'grid', gridTemplateColumns: '300px 1fr 320px', background: '#0a0a0c', color: '#fff' }}>
            <div style={{ borderRight: '1px solid rgba(255,255,255,0.08)', padding: 16, overflow: 'auto' }}>
                <h3 style={{ marginTop: 0 }}>{t('facilityLayout.title') || 'Facility Layout Optimizer'}</h3>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 12, background: '#0b1220' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        {t('facilityLayout.effortsIndicator.title') || 'Efforts Indicator'}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 4 }}>
                        {(t('facilityLayout.effortsIndicator.absoluteValue') || 'Absolute Transport Cost')}: <strong>{metrics.totalCost.toFixed(1)}</strong>
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                        {(t('facilityLayout.effortsIndicator.difference') || 'Difference')}: <strong>{baselineCost !== null ? (metrics.totalCost - baselineCost).toFixed(1) : '0.0'}</strong>
                    </div>
                    <button onClick={() => setBaselineCost(metrics.totalCost)} style={{ width: '100%' }}>
                        {t('facilityLayout.effortsIndicator.reset') || 'Reset'}
                    </button>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        {t('facilityLayout.proceduralNotes.title') || 'Optimization Objective'}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                        {t('facilityLayout.proceduralNotes.networkStructure') || 'Network objective'}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {t('facilityLayout.proceduralNotes.lineStructure') || 'Line objective'}
                    </div>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
                        {t('facilityLayout.options.title') || 'Options'}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>
                        {(t('facilityLayout.options.detectedStructure') || 'Detected Structure')}: <strong>{detectedStructure === 'line' ? (t('facilityLayout.options.lineDetected') || 'Line structure detected.') : (t('facilityLayout.options.networkDetected') || 'Network structure detected.')}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={() => setOptimizationMode('network')}
                            style={{ flex: 1, background: optimizationMode === 'network' ? '#1d4ed8' : '#1f2937' }}
                        >
                            {t('facilityLayout.options.calculateForNetwork') || 'Calculate for Network Structure'}
                        </button>
                        <button
                            onClick={() => setOptimizationMode('line')}
                            style={{ flex: 1, background: optimizationMode === 'line' ? '#1d4ed8' : '#1f2937' }}
                        >
                            {t('facilityLayout.options.calculateForLine') || 'Calculate for Line Structure'}
                        </button>
                    </div>
                    {optimizationMode === 'line' && detectedStructure === 'network' && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#fbbf24' }}>
                            {t('facilityLayout.options.warningLinearization') || 'Line optimization may not fit detected network structure.'}
                        </div>
                    )}
                    {optimizationMode === 'network' && detectedStructure === 'line' && (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#fbbf24' }}>
                            {t('facilityLayout.options.warningNetworkForLine') || 'Network optimization may not fit detected line structure.'}
                        </div>
                    )}
                </div>

                <label style={{ fontSize: 12, color: '#9ca3af' }}>{t('facilityLayout.project') || 'Project'}</label>
                <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)} style={{ width: '100%', marginTop: 6, marginBottom: 16 }}>
                    <option value="">{t('facilityLayout.selectProject') || 'Select Project'}</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.projectName}</option>)}
                </select>

                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <button onClick={addArea} style={{ flex: 1 }}><Plus size={14} /> {t('facilityLayout.toolbar.addArea') || 'Add Area'}</button>
                    <button onClick={addFlow} style={{ flex: 1 }}><Plus size={14} /> {t('facilityLayout.toolbar.addFlow') || 'Add Flow'}</button>
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                    <button onClick={runOptimization} disabled={optimizing} style={{ flex: 1 }}>
                        {optimizing ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />} {optimizing ? (t('facilityLayout.toolbar.optimizing') || 'Optimizing...') : (t('facilityLayout.toolbar.optimize') || 'Optimize')}
                    </button>
                    <button onClick={saveLayout} disabled={saving} style={{ flex: 1 }}><Save size={14} /> {saving ? (t('facilityLayout.toolbar.saving') || 'Saving...') : (t('facilityLayout.toolbar.save') || 'Save')}</button>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>Mode</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setInteractionMode('select')} style={{ flex: 1, background: interactionMode === 'select' ? '#1d4ed8' : '#1f2937' }}><MousePointer2 size={14} /> Select</button>
                        <button onClick={() => setInteractionMode('pan')} style={{ flex: 1, background: interactionMode === 'pan' ? '#1d4ed8' : '#1f2937' }}><Move size={14} /> Pan</button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => setZoom((z) => clamp(z * 1.15, 0.2, 4))} style={{ flex: 1 }}>Zoom +</button>
                        <button onClick={() => setZoom((z) => clamp(z * 0.85, 0.2, 4))} style={{ flex: 1 }}>Zoom -</button>
                        <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} style={{ flex: 1 }}>Reset</button>
                    </div>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>Scale & Snap</div>
                    <label style={{ fontSize: 11 }}>Grid (px)</label>
                    <input type="number" value={gridSize} onChange={(e) => setGridSize(clamp(Number(e.target.value) || 10, 5, 200))} style={{ width: '100%', marginBottom: 6 }} />
                    <label style={{ fontSize: 11 }}>Unit/Grid</label>
                    <input type="number" step="0.1" value={unitsPerGrid} onChange={(e) => setUnitsPerGrid(Math.max(0.01, Number(e.target.value) || 1))} style={{ width: '100%', marginBottom: 6 }} />
                    <select value={scaleUnit} onChange={(e) => setScaleUnit(e.target.value)} style={{ width: '100%', marginBottom: 8 }}>
                        <option value="m">Meter (m)</option>
                        <option value="ft">Feet (ft)</option>
                        <option value="px">Pixel (px)</option>
                    </select>
                    <button onClick={() => setSnapEnabled((s) => !s)} style={{ width: '100%', background: snapEnabled ? '#1d4ed8' : '#1f2937' }}>
                        {snapEnabled ? 'Snap ON' : 'Snap OFF'}
                    </button>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>Lead Time Constraint</div>
                    <label style={{ fontSize: 11 }}>Target Lead Time (hour)</label>
                    <input
                        type="number"
                        step="0.1"
                        value={constraints.targetLeadTime ?? 0}
                        onChange={(e) => setConstraints((prev) => ({ ...prev, targetLeadTime: Math.max(0, Number(e.target.value) || 0) }))}
                        style={{ width: '100%', marginTop: 6 }}
                    />
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 6 }}>
                        0 = no constraint. If average lead time exceeds target, optimization penalty is applied.
                    </div>
                </div>

                <div style={{ border: '1px solid #374151', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>Import</div>
                    <input ref={imageInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => onImportImage(e.target.files?.[0])} />
                    <input ref={cadInputRef} type="file" accept=".dwg,.dxf" style={{ display: 'none' }} onChange={(e) => onImportCad(e.target.files?.[0])} />
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => imageInputRef.current?.click()} style={{ flex: 1 }}><ImageIcon size={14} /> Image</button>
                        <button onClick={() => cadInputRef.current?.click()} style={{ flex: 1 }}><FileCog size={14} /> DWG/DXF</button>
                    </div>
                    {cadImportInfo && <div style={{ marginTop: 8, fontSize: 11, color: '#9ca3af' }}>CAD: {cadImportInfo.name} ({cadImportInfo.sizeKb} KB)</div>}
                </div>
            </div>

            <div style={{ padding: 12, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: '#9ca3af' }}>
                    <div>Mouse: {mousePos.x}, {mousePos.y} {scaleUnit}</div>
                    <div>Zoom: {(zoom * 100).toFixed(0)}% | Pan: {pan.x.toFixed(0)}, {pan.y.toFixed(0)}</div>
                </div>

                <div
                    style={{ width: canvasWidth + RULER_LEFT, height: canvasHeight + RULER_TOP, border: '1px solid #334155', borderRadius: 12, overflow: 'hidden', position: 'relative', margin: '0 auto', background: '#0f172a' }}
                    onMouseMove={onMouseMoveCanvas}
                    onMouseUp={stopInteractions}
                    onMouseLeave={stopInteractions}
                    onWheel={handleWheelZoom}
                    onMouseDown={(e) => {
                        if (interactionMode !== 'pan') return;
                        setPanning({ startX: e.clientX, startY: e.clientY, startPanX: pan.x, startPanY: pan.y });
                    }}
                >
                    <div style={{ position: 'absolute', left: RULER_LEFT, top: 0, right: 0, height: RULER_TOP, borderBottom: '1px solid #334155', background: 'rgba(15,23,42,0.95)' }}>
                        {Array.from({ length: Math.ceil(canvasWidth / gridSize) + 1 }).map((_, i) => {
                            const xWorld = i * gridSize;
                            const x = xWorld * zoom + pan.x;
                            return (
                                <div key={`rx-${i}`} style={{ position: 'absolute', left: x, fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>
                                    {i % 2 === 0 ? `${worldToUnits(xWorld)} ${scaleUnit}` : ''}
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ position: 'absolute', left: 0, top: RULER_TOP, bottom: 0, width: RULER_LEFT, borderRight: '1px solid #334155', background: 'rgba(15,23,42,0.95)' }}>
                        {Array.from({ length: Math.ceil(canvasHeight / gridSize) + 1 }).map((_, i) => {
                            const yWorld = i * gridSize;
                            const y = yWorld * zoom + pan.y;
                            return (
                                <div key={`ry-${i}`} style={{ position: 'absolute', top: y, fontSize: 9, color: '#64748b', fontFamily: 'monospace', paddingLeft: 2 }}>
                                    {i % 2 === 0 ? `${worldToUnits(yWorld)}` : ''}
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ position: 'absolute', left: RULER_LEFT, top: RULER_TOP, width: canvasWidth, height: canvasHeight, overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', inset: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
                            {backgroundImage && (
                                <img src={backgroundImage} alt="layout reference" style={{ position: 'absolute', inset: 0, width: canvasWidth, height: canvasHeight, objectFit: 'cover', opacity: backgroundOpacity, pointerEvents: 'none' }} />
                            )}

                            {showGrid && (
                                <svg width={canvasWidth} height={canvasHeight} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                    <defs>
                                        <pattern id="grid-small" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
                                            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="rgba(100,116,139,0.22)" strokeWidth="0.5" />
                                        </pattern>
                                        <pattern id="grid-major" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
                                            <rect width={gridSize * 5} height={gridSize * 5} fill="url(#grid-small)" />
                                            <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="rgba(100,116,139,0.45)" strokeWidth="1" />
                                        </pattern>
                                    </defs>
                                    <rect width="100%" height="100%" fill="url(#grid-major)" />
                                </svg>
                            )}

                            {areas.map((a) => (
                                <div
                                    key={a.id}
                                    onMouseDown={(e) => {
                                        e.stopPropagation();
                                        if (interactionMode === 'pan' || a.locked) return;
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const canvasRect = e.currentTarget.parentElement.getBoundingClientRect();
                                        const sx = rect.left - canvasRect.left;
                                        const sy = rect.top - canvasRect.top;
                                        const world = pxToWorld(sx, sy);
                                        const pointerWorld = pxToWorld(e.clientX - canvasRect.left, e.clientY - canvasRect.top);
                                        setDragState({ id: a.id, width: a.width, height: a.height, offsetX: pointerWorld.x - world.x, offsetY: pointerWorld.y - world.y });
                                    }}
                                    onClick={(e) => { e.stopPropagation(); setSelectedAreaId(a.id); }}
                                    style={{
                                        position: 'absolute',
                                        left: a.x,
                                        top: a.y,
                                        width: a.width,
                                        height: a.height,
                                        borderRadius: 10,
                                        border: selectedAreaId === a.id ? '3px solid #60a5fa' : '2px solid #22c55e',
                                        background: a.locked ? 'rgba(59,130,246,0.2)' : 'rgba(34,197,94,0.18)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 700,
                                        cursor: a.locked ? 'not-allowed' : (interactionMode === 'pan' ? 'grab' : 'move'),
                                        color: '#fff',
                                        fontSize: 12,
                                        textAlign: 'center',
                                        padding: 4,
                                    }}
                                >
                                    {a.locked && <div style={{ position: 'absolute', top: 4, right: 4 }}><Lock size={12} color="#3b82f6" /></div>}
                                    <div>{a.name}</div>
                                    <div style={{ position: 'absolute', bottom: 3, right: 6, fontSize: 9, opacity: 0.9 }}>
                                        {worldToUnits(a.width)}×{worldToUnits(a.height)} {scaleUnit}
                                    </div>
                                </div>
                            ))}

                            <svg width={canvasWidth} height={canvasHeight} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                                <defs>
                                    <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                                        <path d="M0,0 L0,6 L9,3 z" fill="#94a3b8" />
                                    </marker>
                                </defs>
                                {flows.map((flow) => {
                                    const from = areaById.get(flow.from);
                                    const to = areaById.get(flow.to);
                                    if (!from || !to) return null;

                                    const x1 = from.x + from.width / 2;
                                    const y1 = from.y + from.height / 2;
                                    const x2 = to.x + to.width / 2;
                                    const y2 = to.y + to.height / 2;
                                    const mx = (x1 + x2) / 2;
                                    const my = (y1 + y2) / 2;
                                    const color = FLOW_CONTROL_COLOR[flow.controlType || 'push'] || '#94a3b8';

                                    return (
                                        <g key={flow.id}>
                                            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2.2" markerEnd="url(#flow-arrow)" />
                                            <rect x={mx - 42} y={my - 12} width="84" height="18" rx="8" fill="rgba(15,23,42,0.9)" stroke={color} strokeWidth="1" />
                                            <text x={mx} y={my + 1} textAnchor="middle" fill="#e5e7eb" style={{ fontSize: 9, fontWeight: 700 }}>
                                                {(flow.controlType || 'push').toUpperCase()} | {flow.frequency || 0}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ borderLeft: '1px solid rgba(255,255,255,0.08)', padding: 16, overflow: 'auto' }}>
                <h4 style={{ marginTop: 0 }}>{t('facilityLayout.kpis.title') || 'KPIs'}</h4>
                <div style={{ display: 'grid', gap: 6, marginBottom: 14, fontSize: 12 }}>
                    <div>{t('facilityLayout.kpis.totalCost') || 'Total Cost'}: <strong>{metrics.totalCost.toFixed(1)}</strong></div>
                    <div>{t('facilityLayout.kpis.flowCost') || 'Flow Cost'}: <strong>{metrics.flowCost.toFixed(1)}</strong></div>
                    <div>{t('facilityLayout.kpis.totalDistance') || 'Total Distance'}: <strong>{metrics.totalDistance.toFixed(1)}</strong></div>
                    <div>Average Lead Time: <strong>{(metrics.averageLeadTime || 0).toFixed(2)} h</strong></div>
                    <div>Total Lead Time: <strong>{(metrics.totalLeadTime || 0).toFixed(2)} h</strong></div>
                    <div>{t('facilityLayout.kpis.overlapPenalty') || 'Overlap Penalty'}: <strong>{metrics.overlapPenalty.toFixed(1)}</strong></div>
                    <div>{t('facilityLayout.kpis.spacingPenalty') || 'Spacing Penalty'}: <strong>{metrics.spacingPenalty.toFixed(1)}</strong></div>
                    <div>{t('facilityLayout.kpis.flowControlPenalty') || 'Flow Control Penalty'}: <strong>{(metrics.flowControlPenalty || 0).toFixed(1)}</strong></div>
                    <div>Structure Penalty: <strong>{(metrics.structurePenalty || 0).toFixed(1)}</strong></div>
                    <div>Lead Time Penalty: <strong>{(metrics.leadTimePenalty || 0).toFixed(1)}</strong></div>
                </div>

                <h4>{t('facilityLayout.flowControl.title') || 'Flow Control'}</h4>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                    {FLOW_CONTROL_TYPES.map((item) => (
                        <span key={item.value} style={{ fontSize: 10, border: `1px solid ${FLOW_CONTROL_COLOR[item.value]}`, color: FLOW_CONTROL_COLOR[item.value], borderRadius: 999, padding: '2px 8px' }}>
                            {item.label}: {flowControlSummary[item.value] || 0}
                        </span>
                    ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                    {flows.length === 0 && (
                        <div style={{ color: '#9ca3af', fontSize: 12 }}>{t('facilityLayout.flowMatrix.noFlows') || 'No flows defined'}</div>
                    )}
                    {flows.map((flow) => (
                        <div key={flow.id} style={{ border: '1px solid #374151', borderRadius: 10, padding: 8, display: 'grid', gap: 6, background: '#0f172a' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <select value={flow.from || ''} onChange={(e) => updateFlow(flow.id, { from: e.target.value })}>
                                    {areas.map((a) => <option key={`from-${flow.id}-${a.id}`} value={a.id}>{a.name}</option>)}
                                </select>
                                <select value={flow.to || ''} onChange={(e) => updateFlow(flow.id, { to: e.target.value })}>
                                    {areas.map((a) => <option key={`to-${flow.id}-${a.id}`} value={a.id}>{a.name}</option>)}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <input type="number" value={flow.frequency ?? 0} onChange={(e) => updateFlow(flow.id, { frequency: Math.max(0, Number(e.target.value) || 0) })} placeholder="Frequency" />
                                <input type="number" value={flow.unitCost ?? 1} onChange={(e) => updateFlow(flow.id, { unitCost: Math.max(0, Number(e.target.value) || 0) })} placeholder="Unit cost" />
                            </div>

                            <select value={flow.controlType || 'push'} onChange={(e) => updateFlow(flow.id, { controlType: e.target.value })}>
                                {FLOW_CONTROL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                            </select>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <input type="number" value={flow.bufferLimit ?? 0} onChange={(e) => updateFlow(flow.id, { bufferLimit: Math.max(0, Number(e.target.value) || 0) })} placeholder="Buffer limit" />
                                <input type="number" value={flow.reorderPoint ?? 0} onChange={(e) => updateFlow(flow.id, { reorderPoint: Math.max(0, Number(e.target.value) || 0) })} placeholder="Reorder point" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <input type="number" step="0.1" value={flow.leadTime ?? 1} onChange={(e) => updateFlow(flow.id, { leadTime: Math.max(0.1, Number(e.target.value) || 1) })} placeholder="Base lead time (h)" />
                                <input type="number" step="0.1" value={flow.handlingTime ?? 0.1} onChange={(e) => updateFlow(flow.id, { handlingTime: Math.max(0, Number(e.target.value) || 0) })} placeholder="Handling time (h)" />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                <input type="number" step="1" value={flow.transportSpeed ?? 60} onChange={(e) => updateFlow(flow.id, { transportSpeed: Math.max(1, Number(e.target.value) || 1) })} placeholder="Transport speed (px/h)" />
                                <input type="number" value={flow.signalQty ?? 1} onChange={(e) => updateFlow(flow.id, { signalQty: Math.max(1, Number(e.target.value) || 1) })} placeholder="Signal qty" />
                            </div>

                            <button onClick={() => removeFlow(flow.id)} style={{ background: '#7f1d1d' }}><Trash2 size={14} /> Remove Flow</button>
                        </div>
                    ))}
                </div>

                <h4>{t('facilityLayout.scenarios.title') || 'Scenarios'}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                    {scenarios.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => applyScenario(s.id)}
                            style={{ textAlign: 'left', borderRadius: 8, border: s.id === activeScenarioId ? '2px solid #60a5fa' : '1px solid #374151', padding: 8, background: '#111827', color: '#fff' }}
                        >
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>Cost: {s.kpis.totalCost.toFixed(1)}</div>
                        </button>
                    ))}
                </div>

                <h4>{t('facilityLayout.areaProperties.title') || 'Area Properties'}</h4>
                {!selectedArea && <div style={{ color: '#9ca3af', fontSize: 12 }}>{t('facilityLayout.areaProperties.selectArea') || 'Select area on canvas.'}</div>}
                {selectedArea && (
                    <div style={{ display: 'grid', gap: 8 }}>
                        <input value={selectedArea.name} onChange={(e) => setAreas((prev) => prev.map((a) => a.id === selectedArea.id ? { ...a, name: e.target.value } : a))} />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input type="number" value={selectedArea.width} onChange={(e) => setAreas((prev) => prev.map((a) => a.id === selectedArea.id ? { ...a, width: Math.max(20, Number(e.target.value) || 20) } : a))} />
                            <input type="number" value={selectedArea.height} onChange={(e) => setAreas((prev) => prev.map((a) => a.id === selectedArea.id ? { ...a, height: Math.max(20, Number(e.target.value) || 20) } : a))} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <button onClick={() => setAreas((prev) => prev.map((a) => a.id === selectedArea.id ? { ...a, locked: !a.locked, fixedX: a.x, fixedY: a.y } : a))}>
                                {selectedArea.locked ? <Unlock size={14} /> : <Lock size={14} />} {selectedArea.locked ? 'Unlock' : 'Lock'}
                            </button>
                            <button onClick={() => removeArea(selectedArea.id)} style={{ background: '#7f1d1d' }}><Trash2 size={14} /> Delete</button>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>
                            W: {worldToUnits(selectedArea.width)} {scaleUnit} | H: {worldToUnits(selectedArea.height)} {scaleUnit}
                        </div>
                    </div>
                )}

                <h4 style={{ borderTop: '1px solid #374151', paddingTop: 16 }}>Canvas</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="number" value={canvasWidth} onChange={(e) => setCanvasWidth(Math.max(100, Number(e.target.value) || 100))} />
                    <input type="number" value={canvasHeight} onChange={(e) => setCanvasHeight(Math.max(100, Number(e.target.value) || 100))} />
                </div>
                <div style={{ marginTop: 8 }}>
                    <label style={{ fontSize: 11, color: '#9ca3af' }}>Background Opacity</label>
                    <input type="range" min="0" max="1" step="0.05" value={backgroundOpacity} onChange={(e) => setBackgroundOpacity(Number(e.target.value))} style={{ width: '100%' }} />
                </div>
                <button onClick={() => setShowAIChat(true)} style={{ marginTop: 12, width: '100%' }}>AI Assistant</button>
            </div>

            <AIChatOverlay
                visible={showAIChat}
                onClose={() => setShowAIChat(false)}
                title={t('facilityLayout.aiChat.title') || 'AI Assistant'}
                subtitle={t('facilityLayout.aiChat.subtitle') || 'Layout optimization copilot'}
                contextData={{ areas, flows, metrics, zoom, pan, gridSize, unitsPerGrid, scaleUnit, snapEnabled, cadImportInfo }}
                systemPrompt="You are an expert in facility layout optimization and CAD-like canvas interaction. Give practical recommendations for arrangement, scale, and flow efficiency."
            />

            <style>{`
                .spin{animation:spin 1s linear infinite}
                @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
                input,select{background:#0f172a;color:#fff;border:1px solid #374151;border-radius:6px;padding:6px}
                button{background:#1f2937;color:#fff;border:1px solid #374151;border-radius:8px;padding:8px;display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer}
                button:hover{filter:brightness(1.08)}
            `}</style>
        </div>
    );
}

export default FacilityLayoutOptimizer;
