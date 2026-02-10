import React, { useState, useEffect } from 'react';
import { simulateLinePerformance } from '../utils/monteCarloSimulation';
import DigitalTwinSimulator from './DigitalTwinSimulator';
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, Plus, Layout, Activity, Save, PlayCircle, StopCircle, RefreshCcw } from 'lucide-react'; // Icons
import { useLanguage } from '../i18n/LanguageContext';

// Sortable Task Item
function SortableTask({ id, task, isStochastic, onUpdate }) {
    const { t } = useLanguage();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isDragging ? '#2a2a2a' : '#333',
        padding: '10px',
        margin: '0 0 8px 0',
        borderRadius: '4px',
        border: '1px solid #444',
        cursor: 'grab',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    };

    // Calculate Operator Time
    const man = parseFloat(task.manualTime) || 0;
    const walk = parseFloat(task.walkTime) || 0;
    const wait = parseFloat(task.waitingTime) || 0;
    const auto = parseFloat(task.autoTime) || 0;

    let operatorTime = man + walk + wait;
    if (operatorTime === 0 && auto === 0 && task.duration > 0) {
        operatorTime = task.duration;
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px', flex: 1 }}>
                <div style={{ color: '#fff', fontSize: '0.9rem' }}>{task.elementName || task.name}</div>
                <div style={{ color: '#888', fontSize: '0.75rem' }}>
                    {(() => {
                        const map = {
                            'Value-added': t('categories.valueAdded'),
                            'Non value-added': t('categories.nonValueAdded'),
                            'Waste': t('categories.waste'),
                            'Other': t('yamazumi.other')
                        };
                        return map[task.category] || task.category;
                    })()}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {operatorTime.toFixed(2)}s
                </div>
                {isStochastic && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ fontSize: '0.7rem', color: '#888' }}>±</span>
                        <input
                            type="number"
                            step="0.1"
                            value={task.stdDev !== undefined ? task.stdDev : (operatorTime * 0.1).toFixed(2)}
                            onChange={(e) => onUpdate && onUpdate(task.id, 'stdDev', parseFloat(e.target.value))}
                            style={{
                                width: '40px',
                                backgroundColor: '#222',
                                border: '1px solid #555',
                                color: '#ccc',
                                fontSize: '0.7rem',
                                padding: '1px 2px'
                            }}
                            onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// Station Container
function StationColumn({ id, title, tasks, totalTime, taktTime, isStochastic, simData, onUpdateTask }) {
    const { t } = useLanguage();
    const { setNodeRef } = useSortable({ id });

    const isOverTakt = totalTime > taktTime;

    // Simulation colors
    let borderColor = isOverTakt ? '#c50f1f' : '#333';
    let bgColor = '#1a1a1a';

    if (isStochastic && simData) {
        if (simData.failRate > 50) {
            borderColor = '#c50f1f';
            bgColor = 'rgba(197, 15, 31, 0.1)';
        } else if (simData.failRate > 10) {
            borderColor = '#ff9800';
            bgColor = 'rgba(255, 152, 0, 0.1)';
        } else {
            borderColor = '#0a5';
            bgColor = 'rgba(0, 170, 85, 0.1)';
        }
    }

    return (
        <div
            ref={setNodeRef}
            style={{
                backgroundColor: bgColor,
                padding: '15px',
                borderRadius: '8px',
                border: `1px solid ${borderColor} `,
                minWidth: '250px',
                width: '250px',
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid #333' }}>
                {title.includes('::') ? (
                    <>
                        <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '2px' }}>
                            {title.split('::')[0]}
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                            {title.split('::')[1]}
                        </h3>
                    </>
                ) : (
                    <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>{title}</h3>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
                    <span style={{ color: '#888', fontSize: '0.85rem' }}>{t('yamazumi.total')}:</span>
                    <span style={{ color: isOverTakt ? '#c50f1f' : '#fff', fontWeight: 'bold' }}>
                        {totalTime.toFixed(2)}s
                    </span>
                </div>

                {isStochastic && simData && (
                    <div style={{ marginTop: '5px', fontSize: '0.8rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#888' }}>{t('yamazumi.failRate')}:</span>
                        <span style={{ color: simData.failRate > 10 ? '#c50f1f' : '#0a5', fontWeight: 'bold' }}>
                            {simData.failRate.toFixed(1)}%
                        </span>
                    </div>
                )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: '100px' }}>
                <SortableContext id={id} items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map((task) => (
                        <SortableTask
                            key={task.id}
                            id={task.id}
                            task={task}
                            isStochastic={isStochastic}
                            onUpdate={onUpdateTask}
                        />
                    ))}
                </SortableContext>
            </div>
        </div>
    );
}

export default function LineBalancingBoard({ measurements, onUpdateMeasurements, taktTime }) {
    const { t } = useLanguage();
    const [activeId, setActiveId] = useState(null);
    const [items, setItems] = useState({});
    const [viewMode, setViewMode] = useState('board'); // 'board' or 'twin'

    // Simulation State
    const [isStochasticMode, setIsStochasticMode] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simResults, setSimResults] = useState(null);
    const [isDigitalTwinRunning, setIsDigitalTwinRunning] = useState(false);

    // Initialize items from measurements
    useEffect(() => {
        const grouped = measurements.reduce((acc, m) => {
            const station = m.operator || m.station || 'Station 1';
            if (!acc[station]) acc[station] = [];
            acc[station].push({ ...m, id: m.id.toString() }); // Ensure ID is string for dnd-kit
            return acc;
        }, {});
        setItems(grouped);
        setSimResults(null); // Reset sim on data change
    }, [measurements]);

    const runSimulation = async () => {
        setIsSimulating(true);

        // Prepare data for simulation
        const stations = {};
        Object.keys(items).forEach(stationId => {
            stations[stationId] = items[stationId].map(t => {
                const man = parseFloat(t.manualTime) || 0;
                const walk = parseFloat(t.walkTime) || 0;
                const wait = parseFloat(t.waitingTime) || 0;
                const auto = parseFloat(t.autoTime) || 0;
                let opTime = man + walk + wait;
                if (opTime === 0 && auto === 0 && t.duration > 0) opTime = t.duration;

                return {
                    id: t.id,
                    time: opTime,
                    stdDev: t.stdDev // will use default if undefined in util
                };
            });
        });

        // Run async to not block UI
        setTimeout(() => {
            const results = simulateLinePerformance(stations, taktTime);
            setSimResults(results);
            setIsSimulating(false);
        }, 100);
    };

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const findContainer = (id) => {
        if (id in items) return id;
        return Object.keys(items).find((key) => items[key].find((item) => item.id === id));
    };

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event) => {
        const { active, over } = event;
        const overId = over?.id;

        if (!overId || active.id === overId) return;

        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(overId);

        if (!activeContainer || !overContainer || activeContainer === overContainer) return;

        setItems((prev) => {
            const activeItems = prev[activeContainer];
            const overItems = prev[overContainer];
            const activeIndex = activeItems.findIndex((item) => item.id === active.id);
            const overIndex = overItems.findIndex((item) => item.id === overId);

            let newIndex;
            if (overId in prev) {
                newIndex = overItems.length + 1;
            } else {
                const isBelowOverItem =
                    over &&
                    active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;
                newIndex = overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
            }

            return {
                ...prev,
                [activeContainer]: [
                    ...prev[activeContainer].filter((item) => item.id !== active.id),
                ],
                [overContainer]: [
                    ...prev[overContainer].slice(0, newIndex),
                    activeItems[activeIndex],
                    ...prev[overContainer].slice(newIndex, prev[overContainer].length),
                ],
            };
        });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        const activeContainer = findContainer(active.id);
        const overContainer = findContainer(over?.id);

        if (activeContainer && overContainer && activeContainer !== overContainer) {
            // Update the measurements with new station
            const newMeasurements = [];
            Object.entries(items).forEach(([station, tasks]) => {
                tasks.forEach(task => {
                    newMeasurements.push({
                        ...task,
                        station: station,
                        operator: station // Update both for consistency
                    });
                });
            });
            onUpdateMeasurements(newMeasurements);
        } else if (activeContainer === overContainer) {
            // Reorder within same station (optional, but good for UX)
            const activeIndex = items[activeContainer].findIndex((item) => item.id === active.id);
            const overIndex = items[overContainer].findIndex((item) => item.id === over.id);

            if (activeIndex !== overIndex) {
                const newItems = {
                    ...items,
                    [activeContainer]: arrayMove(items[activeContainer], activeIndex, overIndex),
                };
                setItems(newItems);

                // Update measurements order
                const newMeasurements = [];
                Object.entries(newItems).forEach(([station, tasks]) => {
                    tasks.forEach(task => {
                        newMeasurements.push({
                            ...task,
                            station: station,
                            operator: station
                        });
                    });
                });
                onUpdateMeasurements(newMeasurements);
            }
        }

        setActiveId(null);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '10px 20px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <h3 style={{ margin: 0, color: 'white' }}>{t('yamazumi.lineBalancing')}</h3>

                    {/* View Switcher */}
                    <div style={{ display: 'flex', backgroundColor: '#333', borderRadius: '4px', padding: '2px' }}>
                        <button
                            onClick={() => setViewMode('board')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                border: 'none', background: viewMode === 'board' ? '#444' : 'transparent',
                                color: viewMode === 'board' ? 'white' : '#888',
                                padding: '4px 10px', borderRadius: '4px', cursor: 'pointer'
                            }}
                        >
                            <Layout size={14} /> {t('yamazumi.viewBoard')}
                        </button>
                        <button
                            onClick={() => setViewMode('twin')}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                border: 'none', background: viewMode === 'twin' ? '#444' : 'transparent',
                                color: viewMode === 'twin' ? 'white' : '#888',
                                padding: '4px 10px', borderRadius: '4px', cursor: 'pointer'
                            }}
                        >
                            <Activity size={14} /> {t('yamazumi.viewDigitalTwin')}
                        </button>
                    </div>

                    {viewMode === 'board' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#333', padding: '5px 10px', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#ccc' }}>{t('yamazumi.stochasticMode')}</span>
                            <input
                                type="checkbox"
                                checked={isStochasticMode}
                                onChange={(e) => setIsStochasticMode(e.target.checked)}
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                    )}
                </div>

                {viewMode === 'board' && isStochasticMode && (
                    <button
                        onClick={runSimulation}
                        style={{
                            backgroundColor: '#0078d4',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            opacity: isSimulating ? 0.7 : 1
                        }}
                        disabled={isSimulating}
                    >
                        {isSimulating ? t('common.loading') : `🎲 ${t('yamazumi.runMonteCarlo')}`}
                    </button>
                )}

                {viewMode === 'twin' && (
                    <button
                        onClick={() => setIsDigitalTwinRunning(!isDigitalTwinRunning)}
                        style={{
                            backgroundColor: isDigitalTwinRunning ? '#c50f1f' : '#0a5',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        {isDigitalTwinRunning ? <StopCircle size={18} /> : <PlayCircle size={18} />}
                        {isDigitalTwinRunning ? t('yamazumi.stopSimulation') : t('yamazumi.startSimulation')}
                    </button>
                )}
            </div>

            {/* CONTENT AREA */}
            {viewMode === 'twin' ? (
                <DigitalTwinSimulator
                    stationsData={items}
                    isRunning={isDigitalTwinRunning}
                    onStop={() => setIsDigitalTwinRunning(false)}
                />
            ) : (
                <>
                    {/* Simulation Results (Static) */}
                    {simResults && isStochasticMode && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '10px' }}>
                            <div style={{ backgroundColor: simResults.reliability > 90 ? 'rgba(0, 170, 85, 0.2)' : 'rgba(197, 15, 31, 0.2)', padding: '15px', borderRadius: '8px', border: `1px solid ${simResults.reliability > 90 ? '#0a5' : '#c50f1f'} ` }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>{t('yamazumi.reliability')}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: simResults.reliability > 90 ? '#0a5' : '#c50f1f' }}>
                                    {simResults.reliability.toFixed(1)}%
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#252526', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>{t('yamazumi.avgCycleTime')}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                                    {simResults.avgCycleTime.toFixed(2)}s
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#252526', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>{t('yamazumi.risk')}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                                    {simResults.p95CycleTime.toFixed(2)}s
                                </div>
                            </div>
                            <div style={{ backgroundColor: '#252526', padding: '15px', borderRadius: '8px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '5px' }}>{t('yamazumi.criticalStation')}</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {simResults.stationAnalysis.sort((a, b) => b.failRate - a.failRate)[0]?.id || t('common.none')}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DRAG AND DROP BOARD */}
                    <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '0 0 20px 0', minHeight: '400px' }}>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCorners}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                        >
                            {Object.keys(items).sort().map((station) => (
                                <StationColumn
                                    key={station}
                                    id={station}
                                    title={station}
                                    tasks={items[station]}
                                    totalTime={items[station].reduce((sum, t) => {
                                        const man = parseFloat(t.manualTime) || 0;
                                        const walk = parseFloat(t.walkTime) || 0;
                                        const wait = parseFloat(t.waitingTime) || 0;
                                        const auto = parseFloat(t.autoTime) || 0;
                                        let opTime = man + walk + wait;
                                        if (opTime === 0 && auto === 0 && t.duration > 0) opTime = t.duration;
                                        return sum + opTime;
                                    }, 0)}
                                    taktTime={taktTime}
                                    isStochastic={isStochasticMode}
                                    simData={simResults?.stationAnalysis?.find(s => s.id === station)}
                                    onUpdateTask={(taskId, field, value) => {
                                        const newItems = { ...items };
                                        const task = newItems[station].find(t => t.id === taskId);
                                        if (task) {
                                            task[field] = value;
                                            setItems(newItems);
                                        }
                                    }}
                                />
                            ))}
                            <DragOverlay>
                                {activeId ? (
                                    <div style={{
                                        padding: '10px',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '4px',
                                        color: '#3b82f6',
                                        fontSize: '0.8rem',
                                        boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
                                    }}>
                                        {t('yamazumi.draggingTask')}
                                    </div>
                                ) : null}
                            </DragOverlay>
                        </DndContext>
                    </div>
                </>
            )}
        </div>
    );
}
