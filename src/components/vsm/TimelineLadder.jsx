import React, { useMemo } from 'react';
import { VSMSymbols } from './vsm-constants';
import { useLanguage } from '../../contexts/LanguageContext';

const TimelineLadder = ({
    nodes,
    metrics,
    leadPathNodeIds = [],
    leadTimeViewActive = false,
    waitTimeMethod = 'takt',
    waitTimeMinutes = 10,
    globalTakt = 0,
}) => {
    const { t } = useLanguage();

    const leadTimeViewData = useMemo(() => {
        if (!leadTimeViewActive || leadPathNodeIds.length === 0) return null;

        const pathProcesses = nodes
            .filter((n) => leadPathNodeIds.includes(n.id) && n.type === 'process')
            .sort((a, b) => a.position.x - b.position.x)
            .map((n) => ({
                id: n.id,
                name: n.data?.name || 'Process',
                va: Number(n.data?.va || n.data?.ct || 0),
                ct: Number(n.data?.ct || 0),
            }));

        if (pathProcesses.length === 0) return null;

        const baseWaitSec = Math.max(0, Number(waitTimeMinutes) || 0) * 60;
        const segments = [];
        let totalVA = 0;
        let totalNVA = 0;

        pathProcesses.forEach((proc, idx) => {
            const vaSec = Math.max(0, proc.va);
            totalVA += vaSec;
            segments.push({
                id: `${proc.id}-va`,
                type: 'va',
                name: proc.name,
                seconds: vaSec,
            });

            if (idx < pathProcesses.length - 1) {
                const next = pathProcesses[idx + 1];
                const waitSec = waitTimeMethod === 'cycle'
                    ? Math.max(baseWaitSec, (Math.max(0, proc.ct) + Math.max(0, next.ct)) / 2)
                    : Math.max(baseWaitSec, Math.max(0, Number(globalTakt) || 0));

                totalNVA += waitSec;
                segments.push({
                    id: `${proc.id}-wait-${next.id}`,
                    type: 'nva',
                    name: `${proc.name} → ${next.name}`,
                    seconds: waitSec,
                });
            }
        });

        const leadTime = totalVA + totalNVA;
        const pce = leadTime > 0 ? (totalVA / leadTime) * 100 : 0;

        return { segments, totalVA, totalNVA, leadTime, pce };
    }, [nodes, leadPathNodeIds, leadTimeViewActive, waitTimeMethod, waitTimeMinutes, globalTakt]);

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

    if (leadTimeViewData) {
        return (
            <div style={{
                padding: '10px 20px',
                backgroundColor: 'rgba(30, 30, 30, 0.95)',
                borderTop: '2px solid #16a34a',
                color: 'white',
                fontSize: '0.72rem',
                overflowX: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                <div style={{ color: '#86efac', fontWeight: 'bold' }}>
                    Lead Time Timeline (Mountain = NVA, Valley = VA)
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', minWidth: 'min-content', gap: '2px' }}>
                    {leadTimeViewData.segments.map((segment) => {
                        const isNVA = segment.type === 'nva';
                        return (
                            <div key={segment.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    width: '90px',
                                    height: isNVA ? '36px' : '12px',
                                    backgroundColor: isNVA ? 'rgba(245, 158, 11, 0.25)' : 'rgba(56, 189, 248, 0.25)',
                                    border: `1px solid ${isNVA ? '#f59e0b' : '#38bdf8'}`,
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: isNVA ? '#fbbf24' : '#7dd3fc',
                                    fontWeight: 'bold',
                                    fontSize: '0.65rem'
                                }}>
                                    {isNVA ? `${(segment.seconds / 60).toFixed(1)}m` : `${segment.seconds.toFixed(1)}s`}
                                </div>
                                <div style={{ marginTop: '4px', color: '#888', fontSize: '0.55rem', maxWidth: '90px', textAlign: 'center' }}>
                                    {segment.name}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{
                    marginTop: '4px',
                    borderTop: '1px solid #444',
                    paddingTop: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 'bold'
                }}>
                    <span style={{ color: '#22c55e' }}>PCE: {leadTimeViewData.pce.toFixed(2)}%</span>
                    <span style={{ color: '#38bdf8' }}>VA: {leadTimeViewData.totalVA.toFixed(2)} s</span>
                    <span style={{ color: '#f59e0b' }}>NVA: {(leadTimeViewData.totalNVA / 60).toFixed(2)} min</span>
                    <span style={{ color: '#f97316' }}>Lead Time: {(leadTimeViewData.leadTime / 60).toFixed(2)} min</span>
                </div>
            </div>
        );
    }

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
