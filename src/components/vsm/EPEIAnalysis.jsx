import React, { useMemo } from 'react';
import { X, Repeat, Settings2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { VSMSymbols } from './vsm-constants';
import { useLanguage } from '../../contexts/LanguageContext';

const EPEIAnalysis = ({ isOpen, onClose, nodes, currentLanguage }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    const data = useMemo(() => {
        const customer = nodes.find(n => n.data.symbolType === VSMSymbols.CUSTOMER);
        const processes = nodes.filter(n => n.type === 'process');

        if (!customer || processes.length === 0) return null;

        const availableTimePerDay = Number(customer.data.availableTime || 480) * 60; // seconds
        const dailyDemand = Number(customer.data.demand || 1000);

        // We calculate EPEI for the Pacemaker (or Bottleneck)
        // For simplicity in VSM, we'll look at the constrained process
        const bottleneck = processes.reduce((prev, curr) => (Number(curr.data.ct) > Number(prev.data.ct) ? curr : prev));

        const ct = Number(bottleneck.data.ct || 1);
        const co = Number(bottleneck.data.co || 0) * 60; // seconds

        const productionTimeNeeded = dailyDemand * ct;
        const spareTime = availableTimePerDay - productionTimeNeeded;

        // EPEI = How many days of demand it takes to "earn" enough spare time for all changeovers
        // For 1 changeover of 1 product family? Usually EPEI = (Sum of all CO) / (Avail - Total Prod)
        // Here we'll simplify: Days = (CO) / (Spare per day)
        const epeiDays = spareTime > 0 ? (co / spareTime) : Infinity;

        return {
            processName: bottleneck.data.name || 'BottleNeck Process',
            avail: availableTimePerDay,
            demand: dailyDemand,
            prodTime: productionTimeNeeded,
            spare: spareTime,
            co: co,
            days: epeiDays.toFixed(2),
            isHealthy: epeiDays <= 1
        };
    }, [nodes]);

    const isPlural = data && Number(data.days) > 1;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: '100%', maxWidth: '600px', backgroundColor: '#1e1e1e',
                borderRadius: '12px', border: '1px solid #444',
                boxShadow: '0 10px 40px rgba(0,0,0,0.9)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '15px 20px', backgroundColor: '#333',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid #444'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', fontWeight: 'bold' }}>
                        <Repeat size={20} color="#ff9900" />
                        {t('vsm.analysis.epeiTitle')}
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '30px', color: 'white' }}>
                    {!data ? (
                        <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                            {t('vsm.analysis.epeiDesc')}
                        </div>
                    ) : (
                        <>
                            <div style={{
                                textAlign: 'center', marginBottom: '30px', padding: '20px',
                                backgroundColor: data.isHealthy ? 'rgba(76, 175, 80, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                                borderRadius: '8px', border: `1px solid ${data.isHealthy ? '#4caf50' : '#d13438'}`
                            }}>
                                <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: '10px' }}>{t('vsm.analysis.epeiResult')}</div>
                                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: data.isHealthy ? '#4caf50' : '#f44336' }}>
                                    {data.days === 'Infinity' ? '∞' : data.days} {Number(data.days) > 1 ? t('vsm.common.days') : t('vsm.common.day')}
                                </div>
                                <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                                    {data.isHealthy ? <CheckCircle2 size={18} color="#4caf50" /> : <AlertTriangle size={18} color="#f44336" />}
                                    <span style={{ fontSize: '0.85rem' }}>
                                        {data.isHealthy
                                            ? t('vsm.analysis.excellent')
                                            : (data.days === 'Infinity'
                                                ? t('vsm.analysis.overload')
                                                : t('vsm.analysis.highCO'))}
                                    </span>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <InfoPanel label="Pacemaker" value={data.processName} icon={<Settings2 size={14} />} />
                                <InfoPanel label={t('vsm.analysis.dailyDemand')} value={`${data.demand} units`} />
                                <InfoPanel label={t('vsm.analysis.availTime')} value={`${(data.avail / 3600).toFixed(1)} ${t('vsm.common.hrs')}`} />
                                <InfoPanel label={t('vsm.analysis.spareCapacity')} value={`${(data.spare / 3600).toFixed(1)} ${t('vsm.common.hrs')}`} color={data.spare < 0 ? '#f44336' : '#4caf50'} />
                                <InfoPanel label={t('vsm.analysis.totalCO')} value={`${(data.co / 60).toFixed(0)} ${t('vsm.common.mins')}`} />
                            </div>

                            <div style={{ marginTop: '25px', padding: '15px', backgroundColor: '#2d2d2d', borderRadius: '8px', fontSize: '0.75rem', color: '#aaa', lineHeight: '1.5' }}>
                                <strong>💡 {t('vsm.analysis.recommendation')}</strong><br />
                                {data.isHealthy
                                    ? t('vsm.analysis.healthyAdvice')
                                    : t('vsm.analysis.smedAdvice')}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const InfoPanel = ({ label, value, icon, color = 'white' }) => (
    <div style={{ padding: '12px', backgroundColor: '#252526', borderRadius: '6px', border: '1px solid #333' }}>
        <div style={{ fontSize: '0.65rem', color: '#888', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {icon} {label}
        </div>
        <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: color }}>{value}</div>
    </div>
);

export default EPEIAnalysis;
