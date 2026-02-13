import React from 'react';
import { X, BarChart3, Table } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const YamazumiChart = ({ isOpen, onClose, nodes, taktTime, currentLanguage }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    // Process Data
    const processNodes = nodes
        .filter(n => n.type === 'process')
        .map(n => {
            const ct = Number(n.data.ct || 0);
            const va = Number(n.data.va || ct); // Default VA to CT if missing
            const waste = Number(n.data.waste || 0);

            // Calculate NVA (Non-Value Added)
            // Ensure we don't get negative values if user inputs inconsistent data
            let nva = ct - va - waste;
            if (nva < 0) nva = 0;

            return {
                id: n.id,
                name: n.data.name || t('vsm.process'),
                ct,
                va,
                nva,
                waste
            };
        });

    const maxTime = Math.max(taktTime * 1.5, ...processNodes.map(p => p.ct), 10);
    const chartHeight = 350;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            backdropFilter: 'blur(8px)'
        }}>
            <div style={{
                width: '95%', maxWidth: '1200px',
                height: '90%', maxHeight: '900px',
                backgroundColor: 'rgba(20, 20, 25, 0.95)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                animation: 'modalSlideUp 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px', height: '40px',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563eb'
                        }}>
                            <BarChart3 size={22} />
                        </div>
                        <div>
                            <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem', letterSpacing: '-0.02em' }}>
                                {t('vsm.analysis.yamazumiTitle')}
                            </div>
                            <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>{t('vsm.analysis.yamazumiSubtitle')}</div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: '10px',
                            borderRadius: '10px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Scrollable Area */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>

                    {/* 1. CHART AREA */}
                    <div style={{
                        marginBottom: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '100%', height: `${chartHeight}px`,
                            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            position: 'relative', display: 'flex', alignItems: 'flex-end',
                            padding: '0 40px', gap: '30px',
                            marginBottom: '20px'
                        }}>
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map(p => (
                                <div key={p} style={{
                                    position: 'absolute', left: 0, width: '100%',
                                    bottom: `${p * 100}%`,
                                    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
                                    zIndex: 0
                                }}>
                                    <span style={{
                                        position: 'absolute', left: '-35px', top: '-8px',
                                        color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem'
                                    }}>
                                        {Math.round(maxTime * p)}s
                                    </span>
                                </div>
                            ))}

                            {/* Takt Time Line */}
                            {taktTime > 0 && (
                                <div style={{
                                    position: 'absolute', left: 0, width: '100%',
                                    bottom: `${(taktTime / maxTime) * 100}%`,
                                    borderTop: '2px dashed #ef4444',
                                    zIndex: 10
                                }}>
                                    <div style={{
                                        position: 'absolute', right: '0', top: '-24px',
                                        color: '#ef4444', fontSize: '0.75rem', fontWeight: '800',
                                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                        padding: '2px 8px', borderRadius: '4px'
                                    }}>
                                        TAKT: {taktTime}s
                                    </div>
                                </div>
                            )}

                            {/* Process Bars */}
                            {processNodes.map((p) => {
                                const totalHeightPct = (p.ct / maxTime) * 100;
                                const vaPct = (p.va / p.ct) * 100;
                                const nvaPct = (p.nva / p.ct) * 100;
                                const wastePct = (p.waste / p.ct) * 100;

                                return (
                                    <div key={p.id} style={{
                                        flex: 1, display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', minWidth: '60px', maxWidth: '100px',
                                        height: '100%', justifyContent: 'flex-end',
                                        zIndex: 5
                                    }}>
                                        {/* Stacked Bar Container */}
                                        <div style={{
                                            width: '100%',
                                            height: `${totalHeightPct}%`,
                                            display: 'flex',
                                            flexDirection: 'column-reverse', // Stack from bottom up
                                            borderRadius: '6px 6px 0 0',
                                            overflow: 'hidden',
                                            position: 'relative',
                                            backgroundColor: 'rgba(255,255,255,0.05)'
                                        }}>
                                            {/* Total Time Label */}
                                            <div style={{
                                                position: 'absolute', top: '-25px', width: '100%',
                                                textAlign: 'center', color: 'white', fontSize: '0.85rem',
                                                fontWeight: 'bold'
                                            }}>
                                                {p.ct}s
                                            </div>

                                            {/* VA (Green) */}
                                            {p.va > 0 && (
                                                <div style={{
                                                    height: `${vaPct}%`,
                                                    backgroundColor: '#107c10', // Green
                                                    width: '100%',
                                                    transition: 'all 0.3s'
                                                }} title={`VA: ${p.va}s`} />
                                            )}

                                            {/* NVA (Orange) */}
                                            {p.nva > 0 && (
                                                <div style={{
                                                    height: `${nvaPct}%`,
                                                    backgroundColor: '#ff9900', // Orange
                                                    width: '100%',
                                                    transition: 'all 0.3s'
                                                }} title={`NVA: ${p.nva}s`} />
                                            )}

                                            {/* Waste (Red) */}
                                            {p.waste > 0 && (
                                                <div style={{
                                                    height: `${wastePct}%`,
                                                    backgroundColor: '#d13438', // Red
                                                    width: '100%',
                                                    transition: 'all 0.3s'
                                                }} title={`Waste: ${p.waste}s`} />
                                            )}
                                        </div>

                                        {/* X-Axis Label */}
                                        <div style={{
                                            marginTop: '12px', color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.75rem',
                                            textAlign: 'center', fontWeight: '500', width: '100%',
                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                        }}>
                                            {p.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                            <LegendItem color="#107c10" label={t('vsm.analysis.valueAdded')} />
                            <LegendItem color="#ff9900" label={t('vsm.analysis.nva')} />
                            <LegendItem color="#d13438" label={t('vsm.analysis.waste')} />
                            <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                                <div style={{ width: '24px', height: '2px', borderTop: '2px dashed #ef4444' }}></div>
                                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{t('vsm.analysis.taktLine')}</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. DATA TABLE */}
                    <div style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: '16px',
                        padding: '24px',
                        border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                            <Table size={18} color="#4fc3f7" />
                            <h3 style={{ color: 'white', margin: 0, fontSize: '1rem' }}>{t('vsm.analysis.nodeDetails.title') || 'Detailed Data Breakdown'}</h3>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px', color: '#888' }}>{t('vsm.process')}</th>
                                    <th style={{ textAlign: 'right', padding: '12px', color: '#888' }}>{t('vsm.wizard.ct')}</th>
                                    <th style={{ textAlign: 'right', padding: '12px', color: '#107c10' }}>{t('vsm.analysis.valueAdded')}</th>
                                    <th style={{ textAlign: 'right', padding: '12px', color: '#ff9900' }}>{t('vsm.analysis.nva')}</th>
                                    <th style={{ textAlign: 'right', padding: '12px', color: '#d13438' }}>{t('vsm.analysis.waste')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processNodes.map((p, idx) => (
                                    <tr key={p.id} style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                                    }}>
                                        <td style={{ padding: '12px', fontWeight: '500' }}>{p.name}</td>
                                        <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>{p.ct}s</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#4caf50' }}>{p.va}s</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#ffb74d' }}>{p.nva}s</td>
                                        <td style={{ padding: '12px', textAlign: 'right', color: '#ef5350' }}>{p.waste}s</td>
                                    </tr>
                                ))}
                                {processNodes.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
                                            {t('vsm.analysis.noAnalysisData')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* Footer Advice */}
                <div style={{
                    padding: '16px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.8rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ color: '#2563eb' }}>💡</span>
                    <strong>{t('vsm.analysis.heijunkaTip').split(':')[0]}:</strong>
                    {t('vsm.analysis.heijunkaTip').split(':').slice(1).join(':')}
                </div>
            </div>
            <style>{`
                @keyframes modalSlideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

const LegendItem = ({ color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
        <div style={{ width: '12px', height: '12px', backgroundColor: color, borderRadius: '2px' }}></div>
        <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{label}</span>
    </div>
);

export default YamazumiChart;
