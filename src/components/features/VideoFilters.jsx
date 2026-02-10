import React, { useState } from 'react';

function VideoFilters({ onFiltersChange, onReset }) {
    const [filters, setFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        hue: 0,
        blur: 0,
        grayscale: 0
    });

    const [showPanel, setShowPanel] = useState(false);

    const handleFilterChange = (filterName, value) => {
        const newFilters = { ...filters, [filterName]: value };
        setFilters(newFilters);

        // Build CSS filter string
        const filterString = `
            brightness(${newFilters.brightness}%)
            contrast(${newFilters.contrast}%)
            saturate(${newFilters.saturate}%)
            hue-rotate(${newFilters.hue}deg)
            blur(${newFilters.blur}px)
            grayscale(${newFilters.grayscale}%)
        `.trim();

        onFiltersChange(filterString);
    };

    const handleReset = () => {
        const defaultFilters = {
            brightness: 100,
            contrast: 100,
            saturate: 100,
            hue: 0,
            blur: 0,
            grayscale: 0
        };
        setFilters(defaultFilters);
        onReset();
    };

    return (
        <div style={{ position: 'relative' }}>
            {/* Toggle Button */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                style={{
                    position: 'absolute',
                    top: '60px',
                    right: '10px',
                    zIndex: 50,
                    backgroundColor: showPanel ? '#005a9e' : '#333',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s'
                }}
                title="Video Filters"
            >
                🎨 Filters
            </button>

            {/* Filters Panel */}
            {showPanel && (
                <div style={{
                    position: 'absolute',
                    top: '100px',
                    right: '10px',
                    zIndex: 50,
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: '8px',
                    padding: '15px',
                    minWidth: '250px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '0.9rem' }}>Video Filters</h4>
                        <button
                            onClick={handleReset}
                            style={{
                                backgroundColor: '#444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '0.75rem'
                            }}
                        >
                            Reset
                        </button>
                    </div>

                    {/* Brightness */}
                    <FilterSlider
                        label="Brightness"
                        value={filters.brightness}
                        min={0}
                        max={200}
                        defaultValue={100}
                        unit="%"
                        onChange={(val) => handleFilterChange('brightness', val)}
                    />

                    {/* Contrast */}
                    <FilterSlider
                        label="Contrast"
                        value={filters.contrast}
                        min={0}
                        max={200}
                        defaultValue={100}
                        unit="%"
                        onChange={(val) => handleFilterChange('contrast', val)}
                    />

                    {/* Saturation */}
                    <FilterSlider
                        label="Saturation"
                        value={filters.saturate}
                        min={0}
                        max={200}
                        defaultValue={100}
                        unit="%"
                        onChange={(val) => handleFilterChange('saturate', val)}
                    />

                    {/* Hue */}
                    <FilterSlider
                        label="Hue"
                        value={filters.hue}
                        min={0}
                        max={360}
                        defaultValue={0}
                        unit="°"
                        onChange={(val) => handleFilterChange('hue', val)}
                    />

                    {/* Blur */}
                    <FilterSlider
                        label="Blur"
                        value={filters.blur}
                        min={0}
                        max={10}
                        defaultValue={0}
                        unit="px"
                        step={0.5}
                        onChange={(val) => handleFilterChange('blur', val)}
                    />

                    {/* Grayscale */}
                    <FilterSlider
                        label="Grayscale"
                        value={filters.grayscale}
                        min={0}
                        max={100}
                        defaultValue={0}
                        unit="%"
                        onChange={(val) => handleFilterChange('grayscale', val)}
                    />
                </div>
            )}
        </div>
    );
}

// Filter Slider Component
function FilterSlider({ label, value, min, max, defaultValue, unit, step = 1, onChange }) {
    return (
        <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: '#aaa' }}>{label}</label>
                <span style={{ fontSize: '0.75rem', color: '#fff' }}>
                    {value}{unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                style={{
                    width: '100%',
                    cursor: 'pointer',
                    accentColor: '#005a9e'
                }}
            />
        </div>
    );
}

export default VideoFilters;
