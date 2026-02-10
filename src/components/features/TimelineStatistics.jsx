import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { PieChart, BarChart2, Clock, TrendingUp, AlertTriangle, ChevronUp } from 'lucide-react';

function TimelineStatistics({ measurements = [], currentCycle, onHide }) {
    const { t } = useLanguage();
    // Calculate statistics
    const calculateStats = () => {
        if (measurements.length === 0) return null;

        const cycleMeasurements = currentCycle
            ? measurements.filter(m => m.cycle === currentCycle)
            : measurements;

        const totalDuration = cycleMeasurements.reduce((sum, m) => sum + m.duration, 0);
        const valueAdded = cycleMeasurements.filter(m => m.category === 'Value-added').reduce((sum, m) => sum + m.duration, 0);
        const nonValueAdded = cycleMeasurements.filter(m => m.category === 'Non value-added').reduce((sum, m) => sum + m.duration, 0);
        const waste = cycleMeasurements.filter(m => m.category === 'Waste').reduce((sum, m) => sum + m.duration, 0);

        const vaRatio = totalDuration > 0 ? (valueAdded / totalDuration) * 100 : 0;
        const nvaRatio = totalDuration > 0 ? (nonValueAdded / totalDuration) * 100 : 0;
        const wasteRatio = totalDuration > 0 ? (waste / totalDuration) * 100 : 0;

        // Find bottleneck (longest element)
        const bottleneck = cycleMeasurements.reduce((max, m) =>
            m.duration > (max?.duration || 0) ? m : max, null);

        return {
            totalDuration,
            valueAdded,
            nonValueAdded,
            waste,
            vaRatio,
            nvaRatio,
            wasteRatio,
            elementCount: cycleMeasurements.length,
            bottleneck
        };
    };

    const stats = calculateStats();

    if (!stats) {
        return (
            <div style={{
                padding: '16px',
                backgroundColor: 'rgba(26, 26, 26, 0.95)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center',
                color: '#888'
            }}>
                {t('timeline.noData')}
            </div>
        );
    }

    const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
        <div style={{
            padding: '12px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '8px',
            border: `1px solid ${color}20`,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                    padding: '6px',
                    backgroundColor: `${color}20`,
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <Icon size={16} color={color} />
                </div>
                <span style={{ fontSize: '0.7rem', color: '#888', textTransform: 'uppercase' }}>
                    {label}
                </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: color }}>
                {value}
            </div>
            {subtitle && (
                <div style={{ fontSize: '0.65rem', color: '#666' }}>
                    {subtitle}
                </div>
            )}
        </div>
    );

    return (
        <div style={{
            padding: '12px',
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                margin: '0 0 12px 0'
            }}>
                <h4 style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <BarChart2 size={16} />
                    {t('timeline.title')} {currentCycle && `(${t('elementEditor.cycle')} ${currentCycle})`}
                </h4>
                {onHide && (
                    <button
                        onClick={onHide}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#ff6b6b',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = '#fff';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#ff6b6b';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
                        }}
                    >
                        <ChevronUp size={14} />
                        {t('elementEditor.hideDashboard')}
                    </button>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px',
                marginBottom: '12px'
            }}>
                <StatCard
                    icon={Clock}
                    label={t('timeline.totalTime')}
                    value={`${stats.totalDuration.toFixed(2)}s`}
                    color="#00a6ff"
                    subtitle={`${stats.elementCount} ${t('common.elements')}`}
                />
                <StatCard
                    icon={TrendingUp}
                    label={t('timeline.vaRatio')}
                    value={`${stats.vaRatio.toFixed(1)}%`}
                    color="#00ff00"
                    subtitle={`${stats.valueAdded.toFixed(2)}s`}
                />
                <StatCard
                    icon={AlertTriangle}
                    label={t('timeline.waste')}
                    value={`${stats.wasteRatio.toFixed(1)}%`}
                    color="#ff4444"
                    subtitle={`${stats.waste.toFixed(2)}s`}
                />
            </div>

            {/* Category Breakdown Bar */}
            <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '6px' }}>
                    {t('timeline.categoryBreakdown')}
                </div>
                <div style={{
                    display: 'flex',
                    height: '24px',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)'
                }}>
                    {stats.vaRatio > 0 && (
                        <div
                            style={{
                                width: `${stats.vaRatio}%`,
                                backgroundColor: '#005a9e',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                color: 'white',
                                fontWeight: 'bold'
                            }}
                            title={`Value-added: ${stats.vaRatio.toFixed(1)}%`}
                        >
                            {stats.vaRatio > 15 && `${stats.vaRatio.toFixed(0)}%`}
                        </div>
                    )}
                    {stats.nvaRatio > 0 && (
                        <div
                            style={{
                                width: `${stats.nvaRatio}%`,
                                backgroundColor: '#bfa900',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                color: 'white',
                                fontWeight: 'bold'
                            }}
                            title={`Non value-added: ${stats.nvaRatio.toFixed(1)}%`}
                        >
                            {stats.nvaRatio > 15 && `${stats.nvaRatio.toFixed(0)}%`}
                        </div>
                    )}
                    {stats.wasteRatio > 0 && (
                        <div
                            style={{
                                width: `${stats.wasteRatio}%`,
                                backgroundColor: '#c50f1f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.65rem',
                                color: 'white',
                                fontWeight: 'bold'
                            }}
                            title={`Waste: ${stats.wasteRatio.toFixed(1)}%`}
                        >
                            {stats.wasteRatio > 15 && `${stats.wasteRatio.toFixed(0)}%`}
                        </div>
                    )}
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '4px',
                    fontSize: '0.65rem',
                    color: '#666'
                }}>
                    <span>🟦 VA: {stats.vaRatio.toFixed(1)}%</span>
                    <span>🟨 NVA: {stats.nvaRatio.toFixed(1)}%</span>
                    <span>🟥 Waste: {stats.wasteRatio.toFixed(1)}%</span>
                </div>
            </div>

            {/* Bottleneck */}
            {stats.bottleneck && (
                <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    backgroundColor: 'rgba(255, 68, 68, 0.1)',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 68, 68, 0.3)'
                }}>
                    <div style={{ fontSize: '0.7rem', color: '#ff4444', marginBottom: '4px' }}>
                        ⚠️ {t('timeline.bottleneck')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fff' }}>
                        <strong>{stats.bottleneck.elementName}</strong>
                        <span style={{ color: '#888', marginLeft: '8px' }}>
                            {stats.bottleneck.duration.toFixed(2)}s
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TimelineStatistics;
