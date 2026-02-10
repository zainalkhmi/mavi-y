import React, { useMemo } from 'react';
import { VSMSymbols } from './vsm-constants';
import { useLanguage } from '../../i18n/LanguageContext';

const TimelineLadder = ({ nodes, metrics }) => {
    const { t } = useLanguage();
    const ladderNodes = useMemo(() => {
        // Filter and sort nodes by X position
        return nodes
            .filter(n => n.type === 'process' || n.type === 'inventory' || n.data?.symbolType === VSMSymbols.FINISHED_GOODS)
            .sort((a, b) => a.position.x - b.position.x)
            .map(n => ({
                id: n.id,
                type: n.type,
                symbolType: n.data?.symbolType,
                name: n.data?.name || 'Item',
                va: n.type === 'process' ? Number(n.data.va || n.data.ct || 0) : 0,
                nva: n.type === 'inventory' || n.data?.symbolType === VSMSymbols.FINISHED_GOODS ? Number(n.data.calculatedLT || 0) * 86400 : 0 // days to seconds
            }));
    }, [nodes]);

    if (ladderNodes.length === 0) return null;

    const width = 100; // % per segment
    const stepHeight = 20;

    return (
        <div style={{
            padding: '10px 20px',
            backgroundColor: 'rgba(30, 30, 30, 0.9)',
            borderTop: '2px solid #555',
            color: 'white',
            fontSize: '0.7rem',
            overflowX: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', minWidth: 'min-content' }}>
                {ladderNodes.map((node, i) => {
                    const isVA = node.type === 'process';
                    return (
                        <div key={node.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {/* Ladder Line */}
                            <div style={{
                                width: '120px',
                                height: isVA ? '0' : `${stepHeight}px`,
                                borderLeft: i > 0 && isVA === (ladderNodes[i - 1].type === 'process') ? 'none' : '1px solid #aaa',
                                borderBottom: '1px solid #aaa',
                                position: 'relative'
                            }}>
                                <div style={{
                                    position: 'absolute',
                                    bottom: isVA ? '-15px' : '5px',
                                    width: '100%',
                                    textAlign: 'center',
                                    color: isVA ? '#3f51b5' : '#ffc107', // Blue for VA, Yellow for NVA
                                    fontWeight: 'bold'
                                }}>
                                    {isVA ? `${node.va}${t('vsm.common.sec').substring(0, 1)}` : `${Number(node.nva / 86400).toFixed(1)}${t('vsm.common.day').substring(0, 1)}`}
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', color: '#666', fontSize: '0.5rem', whiteSpace: 'nowrap' }}>
                                {node.name.substring(0, 15)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{
                marginTop: '10px',
                borderTop: '1px solid #444',
                paddingTop: '5px',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 'bold'
            }}>
                <span>{t('vsm.common.total')}:</span>
                <span style={{ color: '#ffc107' }}>{t('vsm.analysis.plt')}: {(metrics.totalLT / 86400).toFixed(2)} {t('vsm.common.days')}</span>
                <span style={{ color: '#3f51b5' }}>{t('vsm.analysis.va')}: {metrics.totalVA} {t('vsm.common.sec')}</span>
                <span style={{ color: '#00bfff' }}>{t('vsm.analysis.pce')}: {metrics.efficiency}%</span>
            </div>
        </div>
    );
};

export default TimelineLadder;
