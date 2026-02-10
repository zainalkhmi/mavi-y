import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { BarChart3, ZoomIn, ZoomOut, Maximize2, Filter, Download, Eye, Grid3x3, TrendingUp } from 'lucide-react';

function TimelineControls({
    zoomLevel,
    onZoomChange,
    viewMode,
    onViewModeChange,
    onExport,
    showGrid,
    onToggleGrid,
    filters,
    onFilterChange
}) {
    const { t } = useLanguage();
    const [showFilters, setShowFilters] = useState(false);

    const zoomPresets = [
        { label: '50%', value: 0.5 },
        { label: '100%', value: 1 },
        { label: '150%', value: 1.5 },
        { label: '200%', value: 2 },
        { label: 'Fit', value: 'fit' }
    ];

    const viewModes = [
        { id: 'standard', label: t('timeline.standard'), icon: BarChart3 },
        { id: 'vsm', label: t('timeline.vsm'), icon: TrendingUp },
        { id: 'compact', label: t('timeline.compact'), icon: Grid3x3 }
    ];

    return (
        <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            alignItems: 'center',
            flexWrap: 'wrap'
        }}>
            {/* Zoom Controls */}
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                    onClick={() => onZoomChange(Math.max(0.25, zoomLevel - 0.25))}
                    style={{
                        padding: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                    }}
                    title={t('timeline.zoomOut')}
                >
                    <ZoomOut size={16} />
                </button>

                <select
                    value={zoomLevel}
                    onChange={(e) => onZoomChange(e.target.value === 'fit' ? 'fit' : parseFloat(e.target.value))}
                    style={{
                        padding: '6px 8px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        fontSize: '0.75rem',
                        cursor: 'pointer'
                    }}
                >
                    {zoomPresets.map(preset => (
                        <option key={preset.label} value={preset.value}>
                            {preset.label}
                        </option>
                    ))}
                </select>

                <button
                    onClick={() => onZoomChange(Math.min(4, zoomLevel + 0.25))}
                    style={{
                        padding: '6px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '4px',
                        color: 'white',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'all 0.2s'
                    }}
                    title={t('timeline.zoomIn')}
                >
                    <ZoomIn size={16} />
                </button>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '6px', padding: '2px' }}>
                {viewModes.map(mode => {
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            onClick={() => onViewModeChange(mode.id)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: viewMode === mode.id ? 'rgba(0, 90, 158, 0.8)' : 'transparent',
                                border: 'none',
                                borderRadius: '4px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.75rem',
                                transition: 'all 0.2s',
                                fontWeight: viewMode === mode.id ? 'bold' : 'normal'
                            }}
                            title={mode.label}
                        >
                            <Icon size={14} />
                            {mode.label}
                        </button>
                    );
                })}
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

            {/* Grid Toggle */}
            <button
                onClick={onToggleGrid}
                style={{
                    padding: '6px 12px',
                    backgroundColor: showGrid ? 'rgba(0, 90, 158, 0.8)' : 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    transition: 'all 0.2s'
                }}
                title={t('timeline.toggleGrid')}
            >
                <Grid3x3 size={14} />
                {t('timeline.grid')}
            </button>


        </div>
    );
}

export default TimelineControls;
