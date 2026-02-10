import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { VSMSymbols } from '../vsm-constants';
import { useLanguage } from '../../../i18n/LanguageContext';

const GenericNode = ({ data, selected, showDetails: propShowDetails }) => {
    const { t } = useLanguage();
    const showDetails = propShowDetails !== undefined ? propShowDetails : (data.showDetails !== false);
    let content = null;
    const translateDefaultName = (name) => {
        if (!name) return name;
        const defaultNames = {
            'Supplier': t('vsm.toolbox.supplier'),
            'Customer': t('vsm.toolbox.customer'),
            'Process': t('vsm.toolbox.processBox'),
            'Raw Material': t('vsm.toolbox.rawMat'),
            'FG Warehouse': t('vsm.toolbox.finished'),
            'Milk Run (Truck)': t('vsm.toolbox.truck'),
            'Sea Freight': t('vsm.toolbox.sea'),
            'Air Freight': t('vsm.toolbox.air'),
            'Warehouse / Receiving': t('vsm.nodes.receiving'),
            'Forklift': t('vsm.nodes.forklift'),
            'Trolley': t('vsm.nodes.trolley'),
            'Safety Stock': t('vsm.toolbox.safetyStock'),
            'Supermarket': t('vsm.toolbox.supermarket'),
            'Buffer': t('vsm.toolbox.buffer'),
            'Finished Goods': t('vsm.toolbox.finished'),
            'Production Control': t('vsm.toolbox.productionControl'),
            'Heijunka Box': t('vsm.toolbox.heijunka'),
            'Linked Project': t('vsm.nodes.noteDefault') // Or similar
        };
        return defaultNames[name] || name;
    };

    let label = data.label || translateDefaultName(data.name);

    const isBottleneck = data.symbolType === VSMSymbols.PROJECT && data.globalTakt > 0 && Number(data.ct) > Number(data.globalTakt);
    const isSimulating = data.simulating;
    const progress = data.progress || 0;

    const commonStyle = {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px',
        border: selected ? '2px solid #0078d4' : (isBottleneck ? '2px solid #ff4444' : '2px solid transparent'),
        backgroundColor: isBottleneck ? '#441111' : 'transparent',
        borderRadius: '4px',
        cursor: 'grab',
        position: 'relative',
        transition: 'all 0.3s ease'
    };

    switch (data.symbolType) {
        case VSMSymbols.SUPPLIER:
        case VSMSymbols.CUSTOMER:
            const isCustomer = data.symbolType === VSMSymbols.CUSTOMER;
            const isShortage = data.isShortage;
            content = (
                <div style={{ width: '80px', height: '60px', border: '2px solid white', backgroundColor: data.color || '#1e1e1e', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: '-10px', left: '20px', width: '40px', height: '20px', border: '2px solid white', borderBottom: 'none', backgroundColor: data.color || '#1e1e1e' }}></div>
                    <div style={{ color: 'white', fontSize: '0.8rem', zIndex: 1 }}>{label}</div>

                    {isCustomer && !isShortage && data.simulating && (
                        <div style={{
                            position: 'absolute',
                            top: '-25px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            color: '#00ff00',
                            fontSize: '0.5rem',
                            fontWeight: 'bold',
                            whiteSpace: 'nowrap'
                        }}>
                            {t('vsm.simulation.delivering')}
                        </div>
                    )}
                </div>
            );

            break;
        case VSMSymbols.TRUCK:
        case VSMSymbols.SEA:
        case VSMSymbols.AIR:
            const transportIcon = data.symbolType === VSMSymbols.SEA ? '🚢' : (data.symbolType === VSMSymbols.AIR ? '✈️' : '🚚');
            const shouldFlipTransport = data.symbolType === VSMSymbols.TRUCK;
            const isTransportSimulating = data.simulating;
            const transportProgress = data.progress || 0;
            const transportCapacity = data.capacity || 0;

            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                    {/* Cargo / Capacity Pulsing Icon */}
                    {isTransportSimulating && (
                        <div className="vsm-cargo-float" style={{
                            position: 'absolute',
                            top: '-20px',
                            backgroundColor: '#ff9900',
                            color: 'black',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            border: '1px solid black',
                            zIndex: 2
                        }}>
                            📦{transportCapacity > 999 ? 'k' : ''}
                        </div>
                    )}

                    {/* Main Transport Icon with layered animations */}
                    <div
                        className={isTransportSimulating ? 'vsm-transport-travel' : ''}
                        style={{
                            fontSize: '2.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.5s ease'
                        }}
                    >
                        <div style={{ transform: shouldFlipTransport ? 'scaleX(-1)' : 'none' }}>
                            <span
                                className={isTransportSimulating ? 'vsm-transport-vibrate' : ''}
                                style={{ display: 'inline-block' }}
                            >
                                {transportIcon}
                            </span>
                        </div>
                    </div>

                    {/* Trip Progress Bar */}
                    {isTransportSimulating && (
                        <div style={{
                            width: '60px',
                            height: '4px',
                            backgroundColor: '#333',
                            borderRadius: '2px',
                            overflow: 'hidden',
                            marginTop: '2px'
                        }}>
                            <div style={{
                                width: `${transportProgress}%`,
                                height: '100%',
                                backgroundColor: '#4fc3f7',
                                transition: 'width 0.5s linear'
                            }} />
                        </div>
                    )}

                    <div style={{
                        marginTop: '5px', fontSize: '0.6rem', color: '#4fc3f7',
                        backgroundColor: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px',
                        textAlign: 'center', border: '1px solid #4fc3f7'
                    }}>
                        <b>{data.frequency || 0}x</b> {data.symbolType === VSMSymbols.SEA ? t('vsm.toolbox.perMonth') : t('vsm.toolbox.perShift')}<br />
                        {t('vsm.toolbox.capacity')}: {transportCapacity}
                    </div>
                </div>
            );
            break;
        case VSMSymbols.OPERATOR:
            content = <div style={{ fontSize: '2rem' }}>👤</div>;
            break;
        case VSMSymbols.EYE_OBSERVATION:
            content = <div style={{ fontSize: '2rem' }}>👁️</div>;
            break;
        case VSMSymbols.KANBAN_PRODUCTION:
            content = (
                <div style={{
                    width: '30px', height: '40px',
                    backgroundColor: '#00cc00',
                    clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
                }}>P</div>
            );
            break;
        case VSMSymbols.KANBAN_WITHDRAWAL:
            content = (
                <div style={{
                    width: '30px', height: '40px',
                    backgroundColor: '#ff9900',
                    clipPath: 'polygon(0 0, 100% 0, 100% 80%, 50% 100%, 0 80%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 'bold', fontSize: '1.2rem'
                }}>W</div>
            );
            break;
        case VSMSymbols.SIGNAL_KANBAN:
            content = (
                <div style={{
                    width: '0', height: '0',
                    borderLeft: '20px solid transparent',
                    borderRight: '20px solid transparent',
                    borderBottom: '40px solid #cc0000',
                    position: 'relative',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{ position: 'absolute', top: '15px', color: 'white', fontWeight: 'bold', fontSize: '1rem' }}>S</div>
                </div>
            );
            break;
        case VSMSymbols.RAW_MATERIAL:
            // Just like supplier but often depicted simpler or same
            content = (
                <div style={{ width: '60px', height: '40px', border: '2px solid #aaa', borderStyle: 'dashed', backgroundColor: '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ color: '#aaa', fontSize: '0.6rem' }}>{t('vsm.toolbox.raw')}</div>
                </div>
            );
            break;
        case VSMSymbols.KAIZEN_BURST:
            content = (
                <div style={{
                    width: '90px', height: '70px',
                    background: 'url(\'data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M50 0 L60 20 L80 10 L85 30 L100 40 L85 60 L95 80 L70 85 L60 100 L40 85 L20 95 L15 70 L0 60 L20 40 L10 20 L30 15 Z" fill="%23ffeb3b" stroke="red" stroke-width="2"/></svg>\') no-repeat center/contain',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                    color: 'black', fontWeight: 'bold', fontSize: '0.7rem', padding: '15px'
                }}>
                    {label}
                </div>
            );
            break;
        case VSMSymbols.SUPERMARKET:
            content = (
                <div style={{ width: '60px', height: '40px', border: '2px solid lime', borderLeft: 'none', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '10px', height: '100%', borderRight: '2px solid lime' }}></div>
                    <div style={{ position: 'absolute', top: 0, left: '20px', width: '10px', height: '100%', borderRight: '2px solid lime' }}></div>
                    <div style={{ position: 'absolute', top: '10px', left: 0, width: '100%', height: '2px', backgroundColor: 'lime' }}></div>
                    <div style={{ position: 'absolute', top: '25px', left: 0, width: '100%', height: '2px', backgroundColor: 'lime' }}></div>
                    <div style={{ position: 'absolute', bottom: '-15px', width: '100%', textAlign: 'center', color: 'lime', fontSize: '0.6rem' }}>{t('vsm.toolbox.supermarket')}</div>
                </div>
            );
            break;
        case VSMSymbols.FIFO:
            content = (
                <div style={{ width: '80px', height: '30px', borderBottom: '2px solid white', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: '100%', borderTop: '2px solid white', position: 'absolute', top: 0 }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'white' }}>FIFO</span>
                </div>
            );
            break;
        case VSMSymbols.SAFETY_STOCK:
            content = (
                <div style={{ width: '0', height: '0', borderLeft: '20px solid transparent', borderRight: '20px solid transparent', borderBottom: '35px solid #fff', position: 'relative', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: '15px', width: '0', height: '0', borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '15px solid #1e1e1e' }}></div>
                </div>
            );
            break;
        case VSMSymbols.BUFFER:
            content = (
                <div style={{ position: 'relative', width: '60px', height: '40px', border: '2px solid #ffcc00', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', background: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,204,0,0.2) 5px, rgba(255,204,0,0.2) 10px)' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#ffcc00', fontSize: '0.6rem', fontWeight: 'bold' }}>{t('vsm.toolbox.buffer')}</div>
                </div>
            );
            break;
        case VSMSymbols.HEIJUNKA_BOX:
            content = (
                <div style={{ width: '80px', height: '60px', border: '2px solid #ccc', backgroundColor: '#1e1e1e', overflow: 'hidden' }}>
                    <div style={{ height: '15px', borderBottom: '1px solid #555', backgroundColor: '#333' }}></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gridTemplateRows: 'repeat(2, 1fr)', height: '45px' }}>
                        {[...Array(6)].map((_, i) => <div key={i} style={{ border: '1px solid #444' }}></div>)}
                    </div>
                    <div style={{ position: 'absolute', bottom: '-15px', width: '100%', textAlign: 'center', color: '#ccc', fontSize: '0.6rem' }}>{t('vsm.toolbox.heijunka')}</div>
                </div>
            );
            break;
        case VSMSymbols.KANBAN_POST:
            content = (
                <div style={{ position: 'relative', width: '40px', height: '60px' }}>
                    <div style={{ width: '30px', height: '40px', border: '2px solid #eee', backgroundColor: '#2d2d2d' }}>
                        <div style={{ margin: '5px auto', width: '15px', height: '2px', backgroundColor: '#555' }}></div>
                        <div style={{ margin: '3px auto', width: '15px', height: '2px', backgroundColor: '#555' }}></div>
                        <div style={{ margin: '3px auto', width: '15px', height: '2px', backgroundColor: '#555' }}></div>
                    </div>
                    <div style={{ width: '4px', height: '20px', backgroundColor: '#eee', margin: '0 auto' }}></div>
                    <div style={{ position: 'absolute', bottom: '-12px', width: '100%', textAlign: 'center', color: '#eee', fontSize: '0.5rem' }}>{t('vsm.toolbox.kanbanPost')}</div>
                </div>
            );
            break;
        case VSMSymbols.PUSH_ARROW:
            content = (
                <div style={{ width: '100px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="100" height="40" viewBox="0 0 100 40">
                        <defs>
                            <pattern id="striped-arrow" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                <line x1="0" y1="0" x2="0" y2="10" style={{ stroke: 'white', strokeWidth: 5 }} />
                            </pattern>
                        </defs>
                        <path d="M0 15 H80 V8 L100 20 L80 32 V25 H0 Z" fill="url(#striped-arrow)" stroke="white" strokeWidth="1" />
                    </svg>
                    <div style={{ position: 'absolute', top: '45px', fontSize: '0.6rem', color: '#fff' }}>{t('vsm.toolbox.pushSystem')}</div>
                </div>
            );
            break;
        case VSMSymbols.FINISHED_GOODS:
            content = (
                <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                    <svg width="60" height="40" viewBox="0 0 60 40">
                        <rect x="5" y="5" width="50" height="30" fill="#00cc00" stroke="white" strokeWidth="2" />
                        <path d="M5 5 L20 0 L40 0 L55 5" fill="none" stroke="white" strokeWidth="2" />
                    </svg>
                    <div style={{ textAlign: 'center', color: '#00cc00', fontSize: '0.6rem', fontWeight: 'bold' }}>{t('vsm.toolbox.finishedGoods').toUpperCase()}<br />{data.amount || 0}</div>
                </div>
            );
            break;
        case VSMSymbols.TIMELINE:
            content = (
                <div style={{ width: '200px', padding: '10px', backgroundColor: '#252526', border: '1px solid #555', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '0.6rem', color: '#aaa' }}>{t('vsm.analysis.timelineMetrics')}</span>
                        <span style={{ fontSize: '0.6rem', color: '#00cc00', fontWeight: 'bold' }}>{t('vsm.analysis.va')}/{t('vsm.analysis.nva')}</span>
                    </div>
                    <svg width="180" height="40" viewBox="0 0 180 40">
                        <path d="M0 0 V30 H60 V10 H120 V30 H180 V0" fill="none" stroke="#ddd" strokeWidth="2" />
                        <text x="30" y="38" fontSize="10" fill="#00cc00" textAnchor="middle">{t('vsm.analysis.va')}</text>
                        <text x="90" y="8" fontSize="10" fill="#ff4444" textAnchor="middle">{t('vsm.analysis.nva')}</text>
                        <text x="150" y="38" fontSize="10" fill="#00cc00" textAnchor="middle">{t('vsm.analysis.va')}</text>
                    </svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff', marginTop: '5px', textAlign: 'center' }}>
                        {t('vsm.analysis.plt')}: {data.leadTime || 0}{t('vsm.common.day').substring(0, 1)} | {t('vsm.analysis.va')}: {data.vaTime || 0}{t('vsm.common.sec').substring(0, 1)}
                    </div>
                </div>
            );
            break;
        case VSMSymbols.ELECTRONIC_INFO:
            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width="100" height="30" viewBox="0 0 100 30">
                        <path d="M0 15 L30 5 L50 25 L70 5 L100 15" fill="none" stroke="#00ffff" strokeWidth="2" strokeDasharray="4 2" />
                        <polygon points="95,10 100,15 95,20" fill="#00ffff" />
                    </svg>
                    <div style={{ fontSize: '0.6rem', color: '#00ffff' }}>{t('vsm.analysis.electronicFlow')}</div>
                </div>
            );
            break;
        case VSMSymbols.MANUAL_INFO:
            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <svg width="100" height="20" viewBox="0 0 100 20">
                        <line x1="0" y1="10" x2="100" y2="10" stroke="#fff" strokeWidth="2" />
                        <polygon points="95,5 100,10 95,15" fill="#fff" />
                    </svg>
                    <div style={{ fontSize: '0.6rem', color: '#fff' }}>{t('vsm.analysis.manualFlow')}</div>
                </div>
            );
            break;
        case VSMSymbols.WAREHOUSE_RECEIVING:
            content = (
                <div style={{ position: 'relative', width: '80px', height: '50px', border: '2px solid #4fc3f7', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ position: 'absolute', top: '-10px', left: '10px', width: '20px', height: '10px', border: '2px solid #4fc3f7', borderBottom: 'none', backgroundColor: '#1e1e1e' }}></div>
                    <div style={{ fontSize: '0.6rem', color: '#4fc3f7', fontWeight: 'bold' }}>{t('vsm.nodes.receiving')}</div>
                    <div style={{ fontSize: '0.8rem', color: 'white' }}>{data.amount || 0}</div>
                </div>
            );
            break;
        case VSMSymbols.PROJECT:
            content = (
                <div
                    title={data.projectName ? t('vsm.nodes.openProject', { name: data.projectName }) : t('vsm.nodes.openLinkedProject')}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
                >
                    {isBottleneck && (
                        <div style={{ position: 'absolute', top: '-15px', right: '-10px', color: '#ff4444', fontSize: '0.6rem', fontWeight: 'bold', zIndex: 10 }}>⚠️ {t('vsm.nodes.bottleneck')}</div>
                    )}
                    <div style={{
                        width: '60px',
                        height: '45px',
                        backgroundColor: isBottleneck ? '#441111' : '#1e1e1e',
                        border: isBottleneck ? '2px solid #ff4444' : '2px solid #8a2be2',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        marginBottom: '4px',
                        overflow: 'hidden'
                    }}>
                        {/* Progress Bar for Project Simulation */}
                        {isSimulating && (
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: 0,
                                height: '3px',
                                width: `${progress}%`,
                                backgroundColor: '#00ff00',
                                transition: 'width 0.1s linear',
                                zIndex: 2
                            }} />
                        )}

                        <div style={{
                            position: 'absolute',
                            top: '-8px',
                            left: '5px',
                            width: '20px',
                            height: '10px',
                            backgroundColor: isBottleneck ? '#ff4444' : '#8a2be2',
                            borderRadius: '2px 2px 0 0',
                            zIndex: 1
                        }}></div>
                        <span style={{ fontSize: '1.5rem', zIndex: 1 }}>🎬</span>
                    </div>
                    <div style={{
                        fontSize: '0.65rem',
                        color: isBottleneck ? '#ff4444' : '#8a2be2',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        maxWidth: '80px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}>
                        {data.projectName || label}
                    </div>
                </div>
            );
            break;
        case VSMSymbols.FORKLIFT:
            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', transform: 'scaleX(-1)' }}>🚜</div>
                    <div style={{ fontSize: '0.6rem', color: '#ff9900' }}>{t('vsm.nodes.forklift')}</div>
                </div>
            );
            break;
        case VSMSymbols.TROLLEY:
            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontSize: '2rem', transform: 'scaleX(-1)' }}>🛒</div>
                    <div style={{ fontSize: '0.6rem', color: '#ff9900' }}>{t('vsm.nodes.trolley')}</div>
                </div>
            );
            break;
        case VSMSymbols.CUSTOM:
            content = (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={data.imageUrl} alt="Custom" style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} />
                    {data.description && (
                        <div style={{ fontSize: '0.7rem', backgroundColor: '#333', color: 'white', padding: '2px 4px', borderRadius: '4px', marginTop: '2px', maxWidth: '100px', textAlign: 'center' }}>
                            {data.description}
                        </div>
                    )}
                </div>
            );
            break;
        default:
            content = <div>{label}</div>;
    }

    return (
        <div
            className={`${isSimulating ? 'vsm-node-heartbeat' : ''} ${isBottleneck ? 'vsm-bottleneck-active' : ''}`}
            style={commonStyle}
        >
            {/* Inventory Simulation Result Badge (Global for all Generic Types) */}
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
                    zIndex: 20,
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '4px'
                }}>
                    {data.simulationResult.shortage > 0
                        ? `⚠️ ${t('vsm.nodes.shortageLabel')}: ${data.simulationResult.shortage}`
                        : `📦 ${t('vsm.nodes.invLabel')}: ${data.simulationResult.final}`
                    }
                </div>
            )}

            {/* Top handles */}
            <Handle type="target" position={Position.Top} id="top" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Top} id="top-source" style={{ background: '#555', left: '60%' }} />

            {/* Left handles */}
            <Handle type="target" position={Position.Left} id="left" style={{ background: '#555' }} />
            <Handle type="source" position={Position.Left} id="left-source" style={{ background: '#555', top: '60%' }} />

            {content}

            {/* Detailed Data Box for Project (Matches ProcessNode) */}
            {showDetails && data.symbolType === VSMSymbols.PROJECT && (
                <div style={{
                    width: '180px',
                    border: '1px solid #666',
                    marginTop: '8px',
                    backgroundColor: '#252526',
                    fontSize: '0.6rem',
                    padding: '0',
                    color: '#ddd',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    zIndex: 1
                }}>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.ctShort')}</span><span style={valStyle}>{data.ct}</span></div>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.coShort')}</span><span style={valStyle}>{data.co}</span></div>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.uptimeShort')}</span><span style={valStyle}>{data.uptime}</span></div>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.perfShort')}</span><span style={valStyle}>{data.performance || 100}</span></div>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.yieldShort')}</span><span style={valStyle}>{data.yield || 100}</span></div>
                    <div style={dataRowStyle}><span style={nodeLabelStyle}>{t('vsm.nodes.vaShort')}</span><span style={valStyle}>{data.va || data.ct}</span></div>
                    <div style={dataRowStyle}><span style={{ ...nodeLabelStyle, color: '#4caf50', fontWeight: 'bold' }}>{t('vsm.nodes.oee')}</span><span style={{ ...valStyle, color: '#4caf50' }}>{Math.round((Number(data.uptime || 100) / 100) * (Number(data.performance || 100) / 100) * (Number(data.yield || 100) / 100) * 100)}%</span></div>
                    {data.ct > 0 && (
                        <div style={{ ...dataRowStyle, backgroundColor: '#1a1a1a', borderTop: '1px solid #555' }}>
                            <span style={nodeLabelStyle}>{t('vsm.nodes.capShort')}</span>
                            <span style={{ ...valStyle, color: '#4fc3f7' }}>
                                {Math.floor((3600 * (Number(data.uptime || 100) / 100) * (Number(data.yield || 100) / 100)) / Number(data.ct))}
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Right handles */}
            <Handle type="source" position={Position.Right} id="right" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Right} id="right-target" style={{ background: '#555', top: '60%' }} />

            {/* Bottom handles */}
            <Handle type="source" position={Position.Bottom} id="bottom" style={{ background: '#555' }} />
            <Handle type="target" position={Position.Bottom} id="bottom-target" style={{ background: '#555', left: '60%' }} />
        </div>
    );
};

const dataRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid #444',
    padding: '2px 4px',
    width: '100%'
};
const nodeLabelStyle = { color: '#aaa', flex: 1, textAlign: 'left' };
const valStyle = { fontWeight: 'bold', color: 'white', textAlign: 'right' };

export default memo(GenericNode);
