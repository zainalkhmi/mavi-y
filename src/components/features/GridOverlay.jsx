import React, { useState } from 'react';

function GridOverlay({ videoRef }) {
    const [showGrid, setShowGrid] = useState(false);
    const [gridType, setGridType] = useState('thirds'); // 'thirds', 'square', 'golden'
    const [gridColor, setGridColor] = useState('#00ff00');
    const [gridOpacity, setGridOpacity] = useState(0.5);

    if (!showGrid || !videoRef?.current) return null;

    const videoRect = videoRef.current.getBoundingClientRect();
    const width = videoRef.current.offsetWidth;
    const height = videoRef.current.offsetHeight;

    const renderGrid = () => {
        const lines = [];
        const lineStyle = {
            position: 'absolute',
            backgroundColor: gridColor,
            opacity: gridOpacity,
            pointerEvents: 'none'
        };

        switch (gridType) {
            case 'thirds':
                // Rule of thirds - 2 vertical, 2 horizontal lines
                lines.push(
                    // Vertical lines
                    <div key="v1" style={{ ...lineStyle, left: '33.33%', top: 0, width: '1px', height: '100%' }} />,
                    <div key="v2" style={{ ...lineStyle, left: '66.66%', top: 0, width: '1px', height: '100%' }} />,
                    // Horizontal lines
                    <div key="h1" style={{ ...lineStyle, top: '33.33%', left: 0, height: '1px', width: '100%' }} />,
                    <div key="h2" style={{ ...lineStyle, top: '66.66%', left: 0, height: '1px', width: '100%' }} />
                );
                break;

            case 'square':
                // 4x4 grid
                for (let i = 1; i < 4; i++) {
                    lines.push(
                        <div key={`v${i}`} style={{ ...lineStyle, left: `${(i * 25)}%`, top: 0, width: '1px', height: '100%' }} />,
                        <div key={`h${i}`} style={{ ...lineStyle, top: `${(i * 25)}%`, left: 0, height: '1px', width: '100%' }} />
                    );
                }
                break;

            case 'golden':
                // Golden ratio - approximately 1.618
                const goldenRatio = 0.618;
                lines.push(
                    // Vertical lines
                    <div key="v1" style={{ ...lineStyle, left: `${goldenRatio * 100}%`, top: 0, width: '1px', height: '100%' }} />,
                    <div key="v2" style={{ ...lineStyle, left: `${(1 - goldenRatio) * 100}%`, top: 0, width: '1px', height: '100%' }} />,
                    // Horizontal lines
                    <div key="h1" style={{ ...lineStyle, top: `${goldenRatio * 100}%`, left: 0, height: '1px', width: '100%' }} />,
                    <div key="h2" style={{ ...lineStyle, top: `${(1 - goldenRatio) * 100}%`, left: 0, height: '1px', width: '100%' }} />
                );
                break;

            default:
                break;
        }

        return lines;
    };

    return (
        <>
            {/* Control Panel */}
            <div style={{
                position: 'absolute',
                bottom: '80px',
                right: '10px',
                zIndex: 60,
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ marginBottom: '10px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff', fontSize: '0.85rem' }}>
                        <input
                            type="checkbox"
                            checked={showGrid}
                            onChange={(e) => setShowGrid(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        Show Grid
                    </label>
                </div>

                {showGrid && (
                    <>
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>
                                Grid Type
                            </label>
                            <select
                                value={gridType}
                                onChange={(e) => setGridType(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '4px',
                                    backgroundColor: '#2a2a2a',
                                    color: '#fff',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem'
                                }}
                            >
                                <option value="thirds">Rule of Thirds</option>
                                <option value="square">4x4 Grid</option>
                                <option value="golden">Golden Ratio</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>
                                Color
                            </label>
                            <input
                                type="color"
                                value={gridColor}
                                onChange={(e) => setGridColor(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '30px',
                                    cursor: 'pointer',
                                    border: '1px solid #444',
                                    borderRadius: '4px'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#aaa', display: 'block', marginBottom: '4px' }}>
                                Opacity: {(gridOpacity * 100).toFixed(0)}%
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.1"
                                value={gridOpacity}
                                onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                                style={{
                                    width: '100%',
                                    cursor: 'pointer',
                                    accentColor: '#005a9e'
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Grid Overlay */}
            {showGrid && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    {renderGrid()}
                </div>
            )}
        </>
    );
}

export default GridOverlay;
