import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useLanguage } from '../../../contexts/LanguageContext';

const InventoryNode = ({ data, selected, showDetails: propShowDetails }) => {
    const { t } = useLanguage();
    const showDetails = propShowDetails !== undefined ? propShowDetails : data.showDetails;
    return (
        <div style={{ position: 'relative', width: '60px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Handle type="target" position={Position.Left} id="left" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ background: '#555', top: '60%' }} />

            <Handle type="target" position={Position.Top} id="top" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Top} id="top-source" style={{ background: '#555', left: '60%' }} />

            {/* Triangle Shape */}
            <div style={{
                width: '60px',
                height: '60px',
                position: 'relative',
                filter: selected ? 'drop-shadow(0 0 2px #0078d4)' : 'none'
            }}>
                {/* Inventory Simulation Result Badge */}
                {data.simulationResult && (
                    <div style={{
                        position: 'absolute',
                        top: '-15px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        backgroundColor: data.simulationResult.shortage > 0 ? '#c50f1f' : '#4caf50',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '0.6rem',
                        fontWeight: 'bold',
                        border: '1px solid white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        zIndex: 10,
                        whiteSpace: 'nowrap'
                    }}>
                        {data.simulationResult.shortage > 0
                            ? `-${data.simulationResult.shortage}`
                            : `+${data.simulationResult.final}`
                        }
                    </div>
                )}

                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Background Triangle */}
                    <polygon points="0,0 100,0 50,100" fill="#333333" />

                    {/* Min Stock Threshold Line (Red) */}
                    {data.minStock && (
                        <line
                            x1="0"
                            y1={100 - (data.minStock || 0)}
                            x2="100"
                            y2={100 - (data.minStock || 0)}
                            stroke="#ff4444"
                            strokeWidth="1"
                            strokeDasharray="3,2"
                        />
                    )}

                    {/* Max Stock Threshold Line (Green) */}
                    {data.maxStock && (
                        <line
                            x1="0"
                            y1={100 - (data.maxStock || 100)}
                            x2="100"
                            y2={100 - (data.maxStock || 100)}
                            stroke="#4caf50"
                            strokeWidth="1"
                            strokeDasharray="3,2"
                        />
                    )}

                    {/* Filling Level (based on data.level) */}
                    <clipPath id={`invClip-${data.id || 'default'}`}>
                        <rect x="0" y={`${100 - (data.level || 100)}`} width="100%" height="100%" />
                    </clipPath>
                    <polygon
                        points="0,0 100,0 50,100"
                        fill="#ff9900"
                        clipPath={`url(#invClip-${data.id || 'default'})`}
                        style={{ transition: 'all 0.5s ease' }}
                    />
                </svg>

                {/* Critical Stock Alert Overlay */}
                {data.minStock && (data.level || 100) < data.minStock && (
                    <div
                        className="vsm-threshold-alert"
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
                        }}
                    />
                )}

                <div style={{
                    position: 'absolute',
                    top: '20%',
                    left: '0',
                    width: '100%',
                    textAlign: 'center',
                    color: (data.level || 100) > 40 ? 'white' : '#ff9900',
                    fontWeight: 'bold',
                    fontSize: '0.8rem',
                    pointerEvents: 'none',
                    textShadow: '0 0 2px black'
                }}>I</div>
            </div>

            {/* Data Label */}
            {showDetails !== false && (
                <div style={{
                    marginTop: '5px',
                    textAlign: 'center',
                    color: '#ff9900',
                    fontSize: '0.7rem',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: '2px 4px',
                    borderRadius: '4px'
                }}>
                    {data.amount} {data.unit}<br />
                    {data.calculatedLT ? `${data.calculatedLT} ${t('common.days') || 'days'}` : (data.time ? `${data.time}s` : '')}
                </div>
            )}

            <Handle type="source" position={Position.Right} id="right" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ background: '#555', top: '60%' }} />

            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ background: '#555', left: '60%' }} />
        </div>
    );
};

export default memo(InventoryNode);
