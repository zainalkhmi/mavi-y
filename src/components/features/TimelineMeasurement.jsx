import React, { useState, useEffect, useRef } from 'react';
import { THERBLIGS } from '../../constants/therbligs.jsx';
import {
    getAutoCompleteSuggestions,
    validateMeasurement,
    detectDuplicates
} from '../../utils/smartSuggestions';
import { useLanguage } from '../../contexts/LanguageContext';
import { useDialog } from "../../contexts/DialogContext";
import TimelineControls from './TimelineControls.jsx';
import TimelineStatistics from './TimelineStatistics.jsx';

function TimelineMeasurement({
    videoState,
    onAddMeasurement,
    onRemoveMeasurement,
    currentCycle,
    measurementStart,
    setMeasurementStart,
    newElementName,
    setNewElementName,
    quickMode,
    autoCounter,
    setAutoCounter,
    validationWarnings,
    setValidationWarnings,
    onStartMeasurement,
    onEndMeasurement,
    onCancelMeasurement,
    showStats,
    setShowStats,
    onUpdateMeasurements
}) {
    const { showAlert } = useDialog();
    const { t } = useLanguage();
    const [selectedCategory, setSelectedCategory] = useState('Value-added');
    const [selectedTherblig, setSelectedTherblig] = useState('');

    // Local state for UI only
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef(null);

    // Timeline view states
    const [zoomLevel, setZoomLevel] = useState(1);
    const [viewMode, setViewMode] = useState('standard'); // 'standard', 'vsm', 'compact'
    const [showGrid, setShowGrid] = useState(true);
    const [collapsedCycles, setCollapsedCycles] = useState(new Set());

    // Edit Modal State
    const [editingElement, setEditingElement] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);

    const categoryOptions = [
        { key: 'Value-added', label: t('categories.valueAdded') },
        { key: 'Non value-added', label: t('categories.nonValueAdded') },
        { key: 'Waste', label: t('categories.waste') }
    ];

    const getCategoryColor = (category) => {
        switch (category) {
            case 'Value-added': return '#3f51b5'; // Blue for Value Added
            case 'Non value-added': return '#ffc107'; // Yellow for Non Value Added
            case 'Waste': return '#ef4444'; // Red for Waste
            default: return '#666';
        }
    };

    const handleEnd = () => {
        onEndMeasurement(newElementName, selectedCategory, selectedTherblig);
    };

    const handleCancel = () => {
        onCancelMeasurement();
    };

    const handleStartEdit = (element) => {
        setEditingElement({ ...element });
        setShowEditModal(true);
    };

    const handleSaveEdit = async () => {
        if (!editingElement) return;

        const manual = parseFloat(editingElement.manualTime) || 0;
        const auto = parseFloat(editingElement.autoTime) || 0;
        const walk = parseFloat(editingElement.walkTime) || 0;
        const waiting = parseFloat(editingElement.waitingTime) || 0;
        const startTime = parseFloat(editingElement.startTime);
        const endTime = parseFloat(editingElement.endTime);
        const duration = endTime - startTime;

        if (startTime >= endTime) {
            await showAlert('Error', t('elementEditor.errors.startLessFinish'));
            return;
        }

        const updatedMeasurements = videoState.measurements.map(m =>
            m.id === editingElement.id ? {
                ...editingElement,
                manualTime: manual,
                autoTime: auto,
                walkTime: walk,
                waitingTime: waiting,
                startTime: startTime,
                endTime: endTime,
                duration: duration
            } : m
        );

        onUpdateMeasurements(updatedMeasurements);
        setShowEditModal(false);
        setEditingElement(null);
    };


    const handleExportTimeline = async () => {
        // TODO: Implement timeline export
        await showAlert('Info', t('common.comingSoon'));
    };

    const toggleCycleCollapse = (cycle) => {
        setCollapsedCycles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cycle)) {
                newSet.delete(cycle);
            } else {
                newSet.add(cycle);
            }
            return newSet;
        });
    };

    // Group measurements by cycle
    const groupedByCycle = videoState.measurements.reduce((acc, m) => {
        const cycle = m.cycle || 1;
        if (!acc[cycle]) acc[cycle] = [];
        acc[cycle].push(m);
        return acc;
    }, {});

    const cycles = Object.keys(groupedByCycle).sort((a, b) => parseInt(a) - parseInt(b));

    // Keyboard shortcut for quick measurement
    useEffect(() => {
        const handleKeyPress = (e) => {
            // M key for quick mark
            if (e.key === 'm' || e.key === 'M') {
                if (!e.target.matches('input, textarea, select')) {
                    e.preventDefault();
                    if (measurementStart === null) {
                        onStartMeasurement();
                    } else {
                        handleEnd();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [measurementStart, newElementName, selectedCategory, selectedTherblig, quickMode, autoCounter, currentCycle, onStartMeasurement, handleEnd]);

    const renderModernTimeline = () => {
        if (!showStats || videoState.measurements.length === 0) return null;

        const totalDuration = Math.max(...videoState.measurements.map(m => m.endTime), videoState.duration || 1);
        const effectiveZoom = zoomLevel === 'fit' ? 1 : zoomLevel;

        return (
            <div style={{ marginTop: '8px' }}>
                {/* Compact Timeline Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '6px 8px',
                    backgroundColor: 'rgba(26, 26, 26, 0.5)',
                    borderRadius: '6px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '0.7rem',
                        color: '#aaa'
                    }}>
                        <span>{videoState.measurements.length} {t('elementEditor.elements')}</span>
                        <span>•</span>
                        <span>{cycles.length} {t('elementEditor.cycles')}</span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <TimelineControls
                            zoomLevel={zoomLevel}
                            onZoomChange={setZoomLevel}
                            viewMode={viewMode}
                            onViewModeChange={setViewMode}
                            onExport={handleExportTimeline}
                            showGrid={showGrid}
                            onToggleGrid={() => setShowGrid(!showGrid)}
                        />
                    </div>
                </div>

                {/* Statistics Panel */}
                <div style={{ marginBottom: '8px' }}>
                    <TimelineStatistics
                        measurements={videoState.measurements}
                        currentCycle={null}
                        onHide={() => setShowStats(false)}
                    />
                </div>

                {/* Timeline Visualization */}
                <div style={{
                    backgroundColor: 'rgba(26, 26, 26, 0.95)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px',
                    maxHeight: viewMode === 'compact' ? '200px' : '400px',
                    overflowY: 'auto',
                    overflowX: 'auto'
                }}>
                    {cycles.map(cycle => {
                        const cycleMeasurements = groupedByCycle[cycle];
                        const isCollapsed = collapsedCycles.has(parseInt(cycle));
                        const cycleTotal = cycleMeasurements.reduce((sum, m) => sum + m.duration, 0);

                        return (
                            <div key={cycle} style={{ marginBottom: '16px' }}>
                                {/* Cycle Header */}
                                <div
                                    onClick={() => toggleCycleCollapse(parseInt(cycle))}
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '8px 12px',
                                        backgroundColor: 'rgba(0, 90, 158, 0.2)',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        marginBottom: isCollapsed ? 0 : '8px',
                                        border: '1px solid rgba(0, 90, 158, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                                            {isCollapsed ? '▶' : '▼'} {t('elementEditor.cycle')} {cycle}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: '#888' }}>
                                            {cycleMeasurements.length} {t('elementEditor.elements').toLowerCase()}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#00a6ff', fontWeight: 'bold' }}>
                                        {cycleTotal.toFixed(2)}s
                                    </span>
                                </div>

                                {/* Cycle Timeline */}
                                {!isCollapsed && (
                                    <div style={{ paddingLeft: '12px' }}>
                                        {/* Time Ruler */}
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            marginBottom: '8px',
                                            fontSize: '0.7rem'
                                        }}>
                                            <div style={{ width: '140px', marginRight: '10px' }}></div>
                                            <div style={{
                                                flex: 1,
                                                position: 'relative',
                                                height: '24px',
                                                borderBottom: '2px solid rgba(255, 255, 255, 0.2)'
                                            }}>
                                                {Array.from({ length: 11 }).map((_, i) => {
                                                    const time = (totalDuration / 10) * i;
                                                    const pos = (time / totalDuration) * 100;
                                                    return (
                                                        <div key={i} style={{
                                                            position: 'absolute',
                                                            left: `${pos}%`,
                                                            top: 0,
                                                            height: '100%',
                                                            borderLeft: showGrid ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                                                            display: 'flex',
                                                            alignItems: 'flex-end',
                                                            paddingBottom: '2px'
                                                        }}>
                                                            <span style={{
                                                                fontSize: '0.65rem',
                                                                color: '#888',
                                                                transform: 'translateX(-50%)',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {time.toFixed(1)}s
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                                {/* Playhead */}
                                                {videoState.currentTime > 0 && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        left: `${(videoState.currentTime / totalDuration) * 100}%`,
                                                        top: '-5px',
                                                        bottom: '-5px',
                                                        width: '2px',
                                                        backgroundColor: '#ff0000',
                                                        pointerEvents: 'none',
                                                        zIndex: 100,
                                                        boxShadow: '0 0 8px rgba(255, 0, 0, 0.8)'
                                                    }}>
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: '-8px',
                                                            left: '50%',
                                                            transform: 'translateX(-50%)',
                                                            width: 0,
                                                            height: 0,
                                                            borderLeft: '6px solid transparent',
                                                            borderRight: '6px solid transparent',
                                                            borderTop: '8px solid #ff0000'
                                                        }} />
                                                    </div>
                                                )}
                                            </div>
                                            <div style={{ width: '60px', marginLeft: '8px' }}></div>
                                        </div>

                                        {/* Timeline Bars */}
                                        {cycleMeasurements.map((m, index) => {
                                            const startPercent = (m.startTime / totalDuration) * 100;
                                            const widthPercent = (m.duration / totalDuration) * 100;
                                            const color = getCategoryColor(m.category);

                                            return (
                                                <div key={m.id} style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    marginBottom: viewMode === 'compact' ? '6px' : '8px',
                                                    fontSize: '0.75rem'
                                                }}>
                                                    <div style={{
                                                        width: '140px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        marginRight: '10px',
                                                        color: '#ccc',
                                                        fontSize: '0.75rem'
                                                    }} title={m.elementName}>
                                                        {m.elementName}
                                                    </div>
                                                    <div style={{
                                                        flex: 1,
                                                        position: 'relative',
                                                        height: viewMode === 'compact' ? '20px' : '28px',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                        borderRadius: '6px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        {/* Grid lines */}
                                                        {showGrid && Array.from({ length: 11 }).map((_, i) => {
                                                            const pos = (i / 10) * 100;
                                                            return (
                                                                <div key={i} style={{
                                                                    position: 'absolute',
                                                                    left: `${pos}%`,
                                                                    top: 0,
                                                                    bottom: 0,
                                                                    borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
                                                                    pointerEvents: 'none'
                                                                }} />
                                                            );
                                                        })}
                                                        {/* Bar */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            left: `${startPercent}%`,
                                                            width: `${Math.max(widthPercent, 0.5)}%`,
                                                            height: '100%',
                                                            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                                                            borderRadius: '4px',
                                                            minWidth: '3px',
                                                            zIndex: 1,
                                                            boxShadow: `0 2px 8px ${color}40`,
                                                            transition: 'all 0.2s',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            paddingLeft: '6px',
                                                            color: 'white',
                                                            fontSize: '0.7rem',
                                                            fontWeight: 'bold'
                                                        }}
                                                            title={`${m.elementName}: ${m.duration.toFixed(2)}s (${m.category})`}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.transform = 'scaleY(1.1)';
                                                                e.currentTarget.style.zIndex = '10';
                                                                e.currentTarget.style.boxShadow = `0 4px 12px ${color}80`;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.transform = 'scaleY(1)';
                                                                e.currentTarget.style.zIndex = '1';
                                                                e.currentTarget.style.boxShadow = `0 2px 8px ${color}40`;
                                                            }}
                                                            onDoubleClick={(e) => {
                                                                e.stopPropagation();
                                                                handleStartEdit(m);
                                                            }}
                                                        >
                                                            {widthPercent > 8 && m.duration.toFixed(1)}
                                                        </div>
                                                    </div>
                                                    <div style={{
                                                        width: '60px',
                                                        textAlign: 'right',
                                                        marginLeft: '8px',
                                                        color: '#888',
                                                        fontSize: '0.7rem',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {m.duration.toFixed(2)}s
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{
            backgroundColor: showStats ? 'var(--bg-secondary)' : 'transparent',
            padding: showStats ? '12px' : '4px 0',
            borderRadius: '8px',
            marginTop: 0, // Handled by VideoWorkspace wrapper
            transition: 'all 0.3s ease'
        }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                {/* Left side: Hide/Show Dashboard + Recording controls */}
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flex: 1 }}>
                    <button
                        onClick={() => setShowStats(!showStats)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: showStats ? 'rgba(0, 90, 158, 0.8)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '4px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginRight: '10px'
                        }}
                        title={showStats ? t('elementEditor.hideDashboard') : t('elementEditor.showDashboard')}
                    >
                        {showStats ? '📊' : '📈'}
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>{showStats ? t('common.close') : t('elementEditor.showDashboard')}</span>
                    </button>

                    {measurementStart !== null && (
                        <>
                            <div style={{
                                padding: '4px 10px',
                                backgroundColor: '#1a1a1a',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                color: '#0f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                border: '1px solid #0a0',
                                flexShrink: 0
                            }}>
                                🔴 {measurementStart.toFixed(2)}s
                            </div>
                            <button
                                className="btn"
                                onClick={handleEnd}
                                style={{
                                    backgroundColor: '#0a0',
                                    padding: '6px 12px',
                                    fontSize: '1rem',
                                    minWidth: '36px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                }}
                                title={`${t('elementEditor.endMeasurement')} (E)`}
                            >
                                ✓
                            </button>
                            <button
                                className="btn"
                                onClick={handleCancel}
                                style={{
                                    backgroundColor: '#a00',
                                    padding: '6px 12px',
                                    fontSize: '1rem',
                                    minWidth: '36px',
                                    borderRadius: '4px',
                                    flexShrink: 0
                                }}
                                title={t('common.cancel')}
                            >
                                ✗
                            </button>
                            {!quickMode && (
                                <div style={{ position: 'relative', flex: 1, minWidth: '120px' }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder={t('elementEditor.elementName')}
                                        value={newElementName}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setNewElementName(value);

                                            // Get suggestions
                                            if (value.length >= 2) {
                                                const autoSuggestions = getAutoCompleteSuggestions(
                                                    value,
                                                    videoState.measurements,
                                                    selectedCategory
                                                );
                                                setSuggestions(autoSuggestions.elementNames);
                                                setShowSuggestions(true);

                                                // Auto-suggest category and therblig
                                                if (autoSuggestions.category && !selectedCategory) {
                                                    setSelectedCategory(autoSuggestions.category);
                                                }
                                                if (autoSuggestions.therblig && !selectedTherblig) {
                                                    setSelectedTherblig(autoSuggestions.therblig);
                                                }
                                            } else {
                                                setSuggestions([]);
                                                setShowSuggestions(false);
                                            }
                                        }}
                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                        onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                        autoFocus
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#333',
                                            border: '1px solid #555',
                                            color: 'white',
                                            borderRadius: '4px',
                                            fontSize: '0.8rem',
                                            width: '100%'
                                        }}
                                    />
                                    {/* Auto-complete dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: '#2a2a2a',
                                            border: '1px solid #555',
                                            borderRadius: '4px',
                                            marginTop: '2px',
                                            maxHeight: '150px',
                                            overflowY: 'auto',
                                            zIndex: 1000,
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
                                        }}>
                                            {suggestions.map((suggestion, index) => (
                                                <div
                                                    key={index}
                                                    onClick={() => {
                                                        setNewElementName(suggestion);
                                                        setShowSuggestions(false);
                                                        inputRef.current?.focus();
                                                    }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        color: '#fff',
                                                        borderBottom: index < suggestions.length - 1 ? '1px solid #444' : 'none'
                                                    }}
                                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#005a9e'}
                                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                                >
                                                    💡 {suggestion}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {/* Validation warnings */}
                                    {validationWarnings.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            backgroundColor: '#3a2a00',
                                            border: '1px solid #ff9800',
                                            borderRadius: '4px',
                                            marginTop: '2px',
                                            padding: '6px 10px',
                                            fontSize: '0.75rem',
                                            color: '#ffa726',
                                            zIndex: 999
                                        }}>
                                            {validationWarnings.map((warning, index) => (
                                                <div key={index}>⚠️ {warning.message}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {quickMode && (
                                <div style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#222',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem',
                                    color: '#0ff',
                                    border: '1px solid #555',
                                    flexShrink: 0
                                }}>
                                    {newElementName}
                                </div>
                            )}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#333',
                                    border: '1px solid #555',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    flexShrink: 0
                                }}
                            >
                                {categoryOptions.map(cat => (
                                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                                ))}
                            </select>
                            <select
                                value={selectedTherblig}
                                onChange={(e) => setSelectedTherblig(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#333',
                                    border: '1px solid #555',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    flexShrink: 0,
                                    maxWidth: '100px'
                                }}
                            >
                                <option value="">{t('elementEditor.therbligType')}</option>
                                {Object.entries(THERBLIGS).map(([code, { name }]) => (
                                    <option key={code} value={code}>{code}</option>
                                ))}
                            </select>
                        </>
                    )}
                </div>


            </div>

            {/* Quick Mode Info */}
            <div style={{
                padding: '8px',
                backgroundColor: '#1a3a1a',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: '#0f0',
                marginBottom: '10px',
                border: '1px solid #0a0'
            }}>
                💡 {t('elementEditor.quickModeHint').split('<kbd>')[0]}
                <kbd style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '3px' }}>
                    {t('elementEditor.quickModeHint').includes('<kbd>') ? t('elementEditor.quickModeHint').split('<kbd>')[1].split('</kbd>')[0] : 'M'}
                </kbd>
                {t('elementEditor.quickModeHint').includes('</kbd>') ? t('elementEditor.quickModeHint').split('</kbd>')[1] : ''}
            </div>

            {/* Modern Timeline Visualization */}
            {renderModernTimeline()}

            {/* Edit Modal */}
            {showEditModal && editingElement && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        borderRadius: '12px',
                        width: '500px', // Wider modal for more fields
                        padding: '24px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        maxHeight: '90vh',
                        overflowY: 'auto'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{t('elementEditor.editElement')}</h3>
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}
                            >✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ gridColumn: 'span 2' }}>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.elementName')}</label>
                                <input
                                    type="text"
                                    value={editingElement.elementName}
                                    onChange={(e) => setEditingElement({ ...editingElement, elementName: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.category')}</label>
                                <select
                                    value={editingElement.category}
                                    onChange={(e) => setEditingElement({ ...editingElement, category: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                >
                                    {categoryOptions.map(cat => (
                                        <option key={cat.key} value={cat.key}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.therbligType')}</label>
                                <select
                                    value={editingElement.therblig || ''}
                                    onChange={(e) => setEditingElement({ ...editingElement, therblig: e.target.value })}
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2a2a2a',
                                        border: '1px solid #444',
                                        borderRadius: '6px',
                                        padding: '10px',
                                        color: 'white',
                                        outline: 'none'
                                    }}
                                >
                                    <option value="">{t('common.none')}</option>
                                    {Object.entries(THERBLIGS).map(([code, { name }]) => (
                                        <option key={code} value={code}>{code} - {name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.cycle')}</label>
                                <input
                                    type="number"
                                    value={editingElement.cycle || 1}
                                    onChange={(e) => setEditingElement({ ...editingElement, cycle: parseInt(e.target.value) || 1 })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.rating')}</label>
                                <input
                                    type="number"
                                    value={editingElement.rating || 100}
                                    onChange={(e) => setEditingElement({ ...editingElement, rating: parseFloat(e.target.value) || 100 })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#00a6ff', outline: 'none' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                            <div>
                                <label style={{ display: 'block', color: '#ffd700', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.manual')} (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.manualTime || 0}
                                    onChange={(e) => setEditingElement({ ...editingElement, manualTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#ffd700', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#00ff00', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.auto')} (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.autoTime || 0}
                                    onChange={(e) => setEditingElement({ ...editingElement, autoTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#00ff00', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.walk')} (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.walkTime || 0}
                                    onChange={(e) => setEditingElement({ ...editingElement, walkTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#ff4d4d', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#f97316', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.loss')}</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.waitingTime || 0}
                                    onChange={(e) => setEditingElement({ ...editingElement, waitingTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: '#f97316', outline: 'none' }}
                                />
                            </div>

                            <div style={{ gridColumn: 'span 2', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.startTime')} (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.startTime}
                                    onChange={(e) => setEditingElement({ ...editingElement, startTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#888', fontSize: '0.8rem', marginBottom: '6px' }}>{t('elementEditor.endTime')} (s)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={editingElement.endTime}
                                    onChange={(e) => setEditingElement({ ...editingElement, endTime: e.target.value })}
                                    style={{ width: '100%', backgroundColor: '#2a2a2a', border: '1px solid #444', borderRadius: '6px', padding: '10px', color: 'white', outline: 'none' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                            <button
                                onClick={() => setShowEditModal(false)}
                                style={{
                                    padding: '10px 16px',
                                    borderRadius: '6px',
                                    border: '1px solid #444',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    cursor: 'pointer'
                                }}
                            >{t('common.cancel')}</button>
                            <button
                                onClick={handleSaveEdit}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    backgroundColor: '#005a9e',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >{t('common.save')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TimelineMeasurement;
