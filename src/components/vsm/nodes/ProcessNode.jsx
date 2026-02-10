import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { useLanguage } from '../../../i18n/LanguageContext';
import { PROCESS_TYPES } from '../vsm-constants';

const ProcessNode = ({ data, selected, showDetails: propShowDetails }) => {
    const { t } = useLanguage();
    const showDetails = propShowDetails !== undefined ? propShowDetails : (data.showDetails !== false);
    let borderStyle = '2px solid white';
    let bgStyle = data.color || '#1e1e1e';
    let labelExtra = null;

    if (data.processType === PROCESS_TYPES.PACEMAKER) {
        borderStyle = '4px double #ff9900';
        labelExtra = <div style={{ position: 'absolute', top: '-18px', color: '#ff9900', fontSize: '0.6rem', fontWeight: 'bold', width: '100%', textAlign: 'center' }}>{t('vsm.nodes.pacemaker')}</div>;
    } else if (data.processType === PROCESS_TYPES.SHARED) {
        borderStyle = '2px dashed #00ffff';
        labelExtra = <div style={{ position: 'absolute', top: '-18px', color: '#00ffff', fontSize: '0.6rem', width: '100%', textAlign: 'center' }}>{t('vsm.nodes.shared')}</div>;
    } else if (data.processType === PROCESS_TYPES.OUTSIDE) {
        borderStyle = '2px dotted #aaa';
        labelExtra = <div style={{ position: 'absolute', top: '-18px', color: '#aaa', fontSize: '0.6rem', width: '100%', textAlign: 'center' }}>{t('vsm.nodes.outside')}</div>;
    }

    // Bottleneck detection
    const isBottleneck = data.globalTakt > 0 && Number(data.ct) > Number(data.globalTakt);
    if (isBottleneck) {
        borderStyle = '3px solid #ff4444';
        bgStyle = '#441111';
    }

    const isSimulating = data?.simulating;
    const progress = data?.progress || 0;

    return (
        <div style={{ position: 'relative' }}>
            {/* Inventory Simulation Result Badge */}
            {data.simulationResult && (
                <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-10px',
                    backgroundColor: data.simulationResult.shortage > 0 ? '#c50f1f' : '#4caf50',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: 'bold',
                    border: '1px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                }}>
                    {data.simulationResult.shortage > 0
                        ? `⚠️ ${t('vsm.nodes.shortageLabel')}: ${data.simulationResult.shortage}`
                        : `📦 ${t('vsm.nodes.invLabel')}: ${data.simulationResult.final}`
                    }
                </div>
            )}

            {/* Input Handles - All sides can be targets */}
            <Handle type="target" position={Position.Top} id="top" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Top} id="top-source" style={{ background: '#555', left: '60%' }} />

            <Handle type="target" position={Position.Left} id="left" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ background: '#555', top: '60%' }} />

            {labelExtra}
            {isBottleneck && (
                <div style={{ position: 'absolute', top: '-18px', right: '0', color: '#ff4444', fontSize: '0.6rem', fontWeight: 'bold' }}>⚠️ {t('vsm.nodes.bottleneck')}</div>
            )}
            <div
                className={`${isSimulating ? 'vsm-node-heartbeat' : ''} ${isBottleneck ? 'vsm-bottleneck-active' : ''}`}
                style={{
                    width: '200px',
                    height: '60px',
                    border: borderStyle,
                    backgroundColor: bgStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '5px',
                    borderRadius: '4px',
                    boxShadow: selected ? '0 0 0 2px #0078d4' : '0 2px 5px rgba(0,0,0,0.3)',
                    color: '#ffffff',
                    cursor: 'move',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Progress Bar (Visible during simulation) */}
                {isSimulating && (
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        height: '4px',
                        width: `${progress}%`,
                        backgroundColor: '#00ff00',
                        transition: 'width 0.1s linear'
                    }} />
                )}

                <div style={{ zIndex: 1 }}>{data.name}</div>
            </div>

            {/* Detailed Data Box - TPS Standard */}
            {showDetails && (
                <div style={{
                    width: '200px',
                    border: '1px solid #666',
                    marginTop: '-1px',
                    backgroundColor: '#252526',
                    fontSize: '0.6rem',
                    padding: '0',
                    color: '#ddd'
                }}>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.ctShort')}</span><span style={valStyle}>{data.ct}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.coShort')}</span><span style={valStyle}>{data.co}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.uptimeShort')}</span><span style={valStyle}>{data.uptime}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.perfShort')}</span><span style={valStyle}>{data.performance || 100}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.yieldShort')}</span><span style={valStyle}>{data.yield || 100}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.vaShort')}</span><span style={valStyle}>{data.va || data.ct}</span></div>
                    <div style={dataRowStyle}><span style={labelStyle}>{t('vsm.nodes.operators')}</span><span style={valStyle}>{data.operators || 1}</span></div>

                    {/* OEE Calculation */}
                    <div style={{ ...dataRowStyle, backgroundColor: '#1a1a1a', borderTop: '1px solid #555' }}>
                        <span style={{ ...labelStyle, color: '#4caf50', fontWeight: 'bold' }}>{t('vsm.nodes.oee')}</span>
                        <span style={{ ...valStyle, color: '#4caf50' }}>
                            {Math.round((Number(data.uptime || 100) / 100) * (Number(data.performance || 100) / 100) * (Number(data.yield || 100) / 100) * 100)}%
                        </span>
                    </div>

                    {/* DEEP ANALYTICS: Capacity */}
                    {data.ct > 0 && (
                        <div style={{ ...dataRowStyle, backgroundColor: '#1a1a1a', borderTop: '1px solid #555' }}>
                            <span style={labelStyle}>{t('vsm.nodes.capShort')}</span>
                            <span style={{ ...valStyle, color: '#4fc3f7' }}>
                                {Math.floor((3600 * (Number(data.uptime || 100) / 100) * (Number(data.yield || 100) / 100)) / Number(data.ct))}
                            </span>
                        </div>
                    )}

                    {/* DEEP ANALYTICS: Utilization Bar */}
                    {data.globalTakt > 0 && (
                        <div style={{ padding: '4px', borderTop: '1px solid #444' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', marginBottom: '2px' }}>
                                <span>{t('vsm.nodes.utilization')}</span>
                                <span>{Math.round((Number(data.ct) / (Number(data.globalTakt) * Number(data.operators || 1))) * 100)}%</span>
                            </div>
                            <div style={{ height: '4px', width: '100%', backgroundColor: '#333', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min(100, (Number(data.ct) / (Number(data.globalTakt) * Number(data.operators || 1))) * 100)}%`,
                                    backgroundColor: isBottleneck ? '#ff4444' : '#4caf50'
                                }}></div>
                            </div>
                        </div>
                    )}
                    {/* BOM / Parts List */}
                    {data.bom && Object.keys(data.bom).length > 0 && (
                        <div style={{ padding: '4px', borderTop: '1px solid #0078d4', backgroundColor: '#1a1a1a' }}>
                            <div style={{ fontSize: '0.5rem', color: '#0078d4', fontWeight: 'bold', marginBottom: '2px' }}>📦 {t('vsm.nodes.bom')}</div>
                            {Object.entries(data.bom).map(([sid, item]) => (
                                item?.part && (
                                    <div key={sid} style={{ fontSize: '0.55rem', display: 'flex', gap: '4px', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '2px' }}>
                                        <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
                                            <span style={{ color: '#888' }}>•</span>
                                            <span style={{ whiteSpace: 'normal', lineBreak: 'anywhere' }}>{item.part}</span>
                                        </div>
                                        {item.leadTime && (
                                            <span style={{ color: '#ff9900', fontWeight: 'bold', marginLeft: '5px', whiteSpace: 'nowrap' }}>{item.leadTime}d</span>
                                        )}
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Output Handles - All sides can be sources */}
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ background: '#555', left: '60%' }} />

            <Handle type="source" position={Position.Right} id="right" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ background: '#555', top: '60%' }} />
        </div>
    );
};

const dataRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #444',
    padding: '2px 4px'
};
const labelStyle = { color: '#aaa' };
const valStyle = { fontWeight: 'bold', color: 'white' };

export default memo(ProcessNode);
