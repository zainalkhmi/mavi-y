import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ComposedChart, Line, ReferenceLine } from 'recharts';
import { CheckCircle, AlertCircle, TrendingUp, Package, Clock, AlertTriangle, FileDown, Download, Factory, Truck, Warehouse, Box, Users } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '../../utils/exportReports';
import { useLanguage } from '../../contexts/LanguageContext';

const ResultsVisualization = ({ result, nodes, viewMode = 'results' }) => {
    const { t, currentLanguage } = useLanguage();
    // const currentLanguage = i18n.language;   <-- Removing this line as currentLanguage is now from hook
    const locale = currentLanguage === 'id' ? 'id-ID' : (currentLanguage === 'ja' ? 'ja-JP' : 'en-GB');

    // Style for blinking animation
    const blinkStyle = `
        @keyframes blink {
            0% { opacity: 1; }
            50% { opacity: 0.3; }
            100% { opacity: 1; }
        }
    `;

    if (!result) return null;

    if (viewMode === 'timeline') {
        const schedule = result.schedule || [];

        // FILTER: Only show Process and Logistics (transport) entries
        const filteredSchedule = schedule.filter(item => {
            return item.type === 'process' || item.type === 'logistic';
        });

        if (filteredSchedule.length === 0) {
            return <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>{t('vsm.analysis.noTimelineData')}</div>;
        }

        // Sort schedule by start date
        const sortedSchedule = [...filteredSchedule].sort((a, b) => new Date(a.start) - new Date(b.start));

        const minDate = new Date(Math.min(...sortedSchedule.map(s => new Date(s.start))));
        const maxDate = new Date(Math.max(...sortedSchedule.map(s => new Date(s.end))));
        const totalMs = Math.max(1, maxDate - minDate);

        const formatFull = (d) => new Date(d).toLocaleString(locale, {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const formatTimeOnly = (d) => new Date(d).toLocaleTimeString(locale, {
            hour: '2-digit', minute: '2-digit'
        });

        return (
            <div style={{ padding: '0px', backgroundColor: '#121212', borderRadius: '12px', border: '1px solid #333', overflow: 'hidden' }}>
                {/* Header Section */}
                <div style={{
                    padding: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #222',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)'
                }}>
                    <h3 style={{ margin: 0, color: '#2196f3', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.25rem', fontWeight: '700' }}>
                        <Clock size={24} style={{ color: '#2196f3' }} /> {t('vsm.analysis.timelineTitle')}
                    </h3>
                    <div style={{
                        padding: '10px 20px',
                        background: 'rgba(239, 68, 68, 0.05)',
                        border: '1px solid rgba(239, 68, 68, 0.5)',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                    }}>
                        <span style={{ color: '#ccc' }}>{t('vsm.analysis.mustStartNoLater')}:</span>
                        <strong style={{ color: '#ef4444', fontSize: '1rem' }}>{formatFull(minDate)}</strong>
                    </div>
                </div>

                <div style={{ padding: '25px', overflowX: 'auto' }}>
                    <div style={{ minWidth: '700px', position: 'relative' }}>
                        {/* Date Scale */}
                        <div style={{ display: 'flex', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid #333' }}>
                            <div style={{ width: '220px', flexShrink: 0 }}></div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#888' }}>
                                <span>{formatFull(minDate)}</span>
                                <span>{formatFull(maxDate)}</span>
                            </div>
                        </div>

                        {/* Timeline Grid (Subtle vertical lines) */}
                        <div style={{ position: 'absolute', top: '40px', left: '220px', right: 0, bottom: '60px', pointerEvents: 'none', display: 'flex', justifyContent: 'space-between' }}>
                            {[0, 25, 50, 75, 100].map(p => (
                                <div key={p} style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.05)', height: '100%' }}></div>
                            ))}
                        </div>

                        {/* Activities */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
                            {sortedSchedule.map((item, idx) => {
                                const startOffset = Math.max(0, new Date(item.start) - minDate);
                                const durationMs = Math.max(1800000, new Date(item.end) - new Date(item.start));

                                const leftPercent = (startOffset / totalMs) * 100;
                                const widthPercent = (durationMs / totalMs) * 100;

                                // Determine color based on node status (matching legend)
                                // Blue = Healthy, Yellow = Bottleneck, Red = Shortage
                                let barColor = '#3f51b5'; // Default: Healthy (Blue)

                                // Check if this node has a shortage or bottleneck status
                                const nodeStatus = result.nodeStatus && result.nodeStatus[item.nodeId];
                                if (nodeStatus) {
                                    if (nodeStatus.shortage < 0) {
                                        barColor = '#d32f2f'; // Shortage (Red)
                                    } else if (item.isBottleneck || (nodeStatus.shortage > 0 && nodeStatus.shortage < 10)) {
                                        barColor = '#ff9800'; // Bottleneck (Yellow/Orange)
                                    }
                                }

                                // Override for logistics (keep gray)
                                if (item.type === 'logistic') {
                                    barColor = '#6b7280';
                                }

                                // Determine icon
                                let IconComp = Factory;
                                if (item.type === 'logistic') IconComp = Truck;
                                if (item.type === 'supplier') IconComp = Warehouse;
                                if (item.label.toLowerCase().includes('customer')) IconComp = Users;
                                if (item.label.toLowerCase().includes('material') || item.label.toLowerCase().includes('stock')) IconComp = Box;

                                return (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', minHeight: '44px' }}>
                                        <div style={{
                                            width: '220px',
                                            flexShrink: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            paddingRight: '15px'
                                        }}>
                                            <IconComp size={16} style={{ color: '#888' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#eee', fontWeight: '500' }}>{item.label}</span>
                                                <span style={{ fontSize: '0.7rem', color: '#666' }}>
                                                    {formatTimeOnly(item.start)} - {formatTimeOnly(item.end)}
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{ flex: 1, height: '24px', position: 'relative', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                            <div style={{
                                                position: 'absolute',
                                                left: `${leftPercent}%`,
                                                width: `${widthPercent}%`,
                                                height: '100%',
                                                backgroundColor: barColor,
                                                borderRadius: '12px',
                                                boxShadow: `0 0 10px ${barColor}44`,
                                                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                cursor: 'help'
                                            }} title={`${item.label}: ${formatFull(item.start)} -> ${formatFull(item.end)}`}>
                                                <div style={{
                                                    width: '100%', height: '100%',
                                                    background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
                                                    borderRadius: '12px'
                                                }}></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend Section */}
                        <div style={{
                            display: 'flex',
                            gap: '30px',
                            marginTop: '30px',
                            paddingTop: '20px',
                            borderTop: '1px solid #222',
                            fontSize: '0.85rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '14px', height: '14px', background: '#4caf50', borderRadius: '4px' }}></div>
                                <span style={{ color: '#aaa' }}>{t('vsm.analysis.supplier')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '14px', height: '14px', background: '#6b7280', borderRadius: '4px' }}></div>
                                <span style={{ color: '#aaa' }}>{t('vsm.analysis.logistic')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '14px', height: '14px', background: '#2196f3', borderRadius: '4px' }}></div>
                                <span style={{ color: '#aaa' }}>{t('vsm.analysis.process')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default Results View
    // Prepare capacity utilization data
    const capacityData = nodes
        .filter(n => result.nodeStatus && result.nodeStatus[n.id])
        // FILTER: Only show Operation (Process) nodes
        .filter(n => {
            const isProcess = n.type === 'process' || n.data?.symbolType === 'process' || n.data?.symbolType === 'project';
            return isProcess;
        })
        .map(n => {
            const status = result.nodeStatus[n.id];
            let cycleTime = parseFloat(n.data?.cycleTime) || 0;
            if (n.data?.processingTime) cycleTime = parseFloat(n.data.processingTime) * 3600; // Warehouse
            if (n.data?.time) cycleTime = parseFloat(n.data.time); // Inventory
            if (n.data?.ct) cycleTime = parseFloat(n.data.ct); // Process CT

            const availableTime = 28800; // 8 hours
            const utilization = cycleTime > 0 ? Math.min(100, (cycleTime / availableTime) * 100) : 0;

            const scheduleItem = result.schedule ? result.schedule.find(s => s.nodeId === n.id) : null;

            // Calculate output: quantity processed by this node (Scheduled)
            const scheduledQuantity = scheduleItem ? scheduleItem.quantity : 0;

            // Metrics Calculation
            const shifts = parseInt(n.data?.shifts || n.data?.shiftPattern) || 1;
            const pcsPerHour = cycleTime > 0 ? Math.round(3600 / cycleTime) : 0;

            // Calculate available hours based on shifts (1=8h, 2=16h, 3=24h)
            const hoursAvailable = shifts * 8;

            // Output = hoursAvailable * pcsPerHour (Capacity)
            const outputCapacity = hoursAvailable * pcsPerHour;

            // Hours Needed based on Scheduled Quantity (Load)
            // FIX: Use actual demand or output capacity if scheduledQuantity is 0
            const actualQuantity = scheduledQuantity > 0 ? scheduledQuantity : (status.shortage < 0 ? Math.abs(status.shortage) : outputCapacity);
            const hoursNeeded = cycleTime > 0 && actualQuantity > 0 ? (actualQuantity * cycleTime) / 3600 : 0;

            // Shortage = Output - Demand
            const shortageQty = outputCapacity - scheduledQuantity;

            // detailed parameters
            const details = {
                ...n.data,
                // exclude already shown or internal fields
                label: undefined, name: undefined, symbolType: undefined,
                cycleTime: undefined, processingTime: undefined, time: undefined, ct: undefined,
                shifts: undefined, shiftPattern: undefined
            };

            return {
                name: n.data?.label || n.data?.name || n.id,
                utilization: Math.round(utilization),
                output: outputCapacity, // Shows Calculated Capacity as per request
                scheduledQty: scheduledQuantity, // Keep actual qty processing for ref if needed
                hoursNeeded: hoursNeeded.toFixed(2), // Calculated duration based on demand
                ct: cycleTime,
                pcsPerHour: pcsPerHour,
                shifts: shifts,
                shortage: shortageQty, // New shortage formula
                isBottleneck: utilization > 90,
                startTime: scheduleItem ? scheduleItem.start : null,
                endTime: scheduleItem ? scheduleItem.end : null,
                nodeType: n.type,
                symbolType: n.data?.symbolType,
                details: details // Add all other parameters
            };
        });

    const bottlenecks = capacityData.filter(d => d.isBottleneck);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Export Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                padding: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid #444'
            }}>
                <span style={{ marginRight: 'auto', alignSelf: 'center', fontSize: '0.9rem', color: '#aaa', fontWeight: 'bold' }}>
                    📥 {t('vsm.analysis.exportReport')}
                </span>

                <button
                    onClick={() => exportToPDF(result, nodes, t('Laporan_Simulasi', 'Simulation_Report'))}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#d32f2f',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    <FileDown size={16} /> PDF
                </button>

                <button
                    onClick={() => exportToExcel(result, nodes, t('Laporan_Simulasi', 'Simulation_Report'))}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#2e7d32',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    <FileDown size={16} /> Excel
                </button>

                <button
                    onClick={() => exportToCSV(result, nodes, t('Laporan_Simulasi', 'Simulation_Report'))}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: '#455a64',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                    <Download size={16} /> CSV
                </button>
            </div>
            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                {/* Success Card */}
                <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: result.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(197, 15, 31, 0.1)',
                    border: `1px solid ${result.success ? '#4caf50' : '#c50f1f'}`,
                    transition: 'all 0.3s ease',
                    boxShadow: result.success ? '0 0 15px rgba(76, 175, 80, 0.1)' : '0 0 15px rgba(197, 15, 31, 0.1)'
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = result.success ? '0 8px 25px rgba(76, 175, 80, 0.2)' : '0 8px 25px rgba(197, 15, 31, 0.2)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = result.success ? '0 0 15px rgba(76, 175, 80, 0.1)' : '0 0 15px rgba(197, 15, 31, 0.1)';
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        {result.success ?
                            <CheckCircle size={20} color="#4caf50" /> :
                            <AlertCircle size={20} color="#c50f1f" />
                        }
                        <span style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase' }}>
                            {t('vsm.analysis.status')}
                        </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: result.success ? '#4caf50' : '#c50f1f' }}>
                        {result.success ? t('vsm.analysis.feasible') : t('vsm.analysis.impossible')}
                    </div>
                </div>

                {/* Fulfilled Quantity Card */}
                <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'rgba(33, 150, 243, 0.1)',
                    border: '1px solid #2196f3',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 15px rgba(33, 150, 243, 0.1)'
                }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(33, 150, 243, 0.2)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(33, 150, 243, 0.1)';
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <Package size={20} color="#2196f3" />
                        <span style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase' }}>
                            {t('vsm.analysis.fulfilledQty')}
                        </span>
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#2196f3' }}>
                        {result.fulfilledQuantity || 0}
                    </div>
                </div>

                {/* Bottlenecks Card */}
                {bottlenecks.length > 0 && (
                    <div style={{
                        padding: '15px',
                        borderRadius: '8px',
                        background: 'rgba(255, 152, 0, 0.1)',
                        border: '1px solid #ff9800'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <AlertTriangle size={20} color="#ff9800" />
                            <span style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase' }}>
                                {t('vsm.analysis.bottleneckQty')}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#ff9800' }}>
                            {bottlenecks.length}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#ccc', marginTop: '4px' }}>
                            {bottlenecks.map(b => b.name).join(', ')}
                        </div>
                    </div>
                )}

                {/* Total Cost Card */}
                {result.costBreakdown && result.costBreakdown.total > 0 && (
                    <div style={{
                        padding: '15px',
                        borderRadius: '8px',
                        background: 'rgba(76, 175, 80, 0.1)',
                        border: '1px solid #4caf50'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <TrendingUp size={20} color="#4caf50" />
                            <span style={{ fontSize: '0.85rem', color: '#aaa', textTransform: 'uppercase' }}>
                                {t('vsm.analysis.totalCost')}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#4caf50' }}>
                            ${result.costBreakdown.total.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>

            {/* Cost Breakdown */}
            {result.costBreakdown && result.costBreakdown.total > 0 && (
                <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid #333'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>
                        💰 {t('vsm.analysis.costBreakdown')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                        <div style={{ padding: '12px', background: 'rgba(33, 150, 243, 0.1)', borderRadius: '6px', border: '1px solid #2196f3' }}>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>{t('vsm.analysis.process')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#2196f3' }}>
                                ${result.costBreakdown.production.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(255, 152, 0, 0.1)', borderRadius: '6px', border: '1px solid #ff9800' }}>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>{t('vsm.analysis.inventory')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#ff9800' }}>
                                ${result.costBreakdown.inventory.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(156, 39, 176, 0.1)', borderRadius: '6px', border: '1px solid #9c27b0' }}>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>{t('vsm.toolbox.logistics')}</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#9c27b0' }}>
                                ${result.costBreakdown.transportation.toFixed(2)}
                            </div>
                        </div>
                        <div style={{ padding: '12px', background: 'rgba(244, 67, 54, 0.1)', borderRadius: '6px', border: '1px solid #f44336' }}>
                            <div style={{ fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>WIP</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#f44336' }}>
                                ${result.costBreakdown.wip.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* WIP Violations */}
            {result.wipViolations && result.wipViolations.length > 0 && (
                <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid #ffc107'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <AlertTriangle size={20} color="#ffc107" />
                        <strong style={{ color: '#ffc107' }}>⚠️ {t('vsm.analysis.wipViolations')}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {result.wipViolations.map((violation, idx) => (
                            <div key={idx} style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                <span style={{ color: '#fff' }}>{violation.nodeName}</span>
                                <span style={{ color: '#ffc107', marginLeft: '10px' }}>
                                    {t('common.actual') || 'Actual'}: {violation.actual} / {t('common.limit') || 'Limit'}: {violation.limit}
                                    <span style={{ color: '#ff5722', marginLeft: '5px' }}>
                                        (+{violation.excess} {t('common.excess') || 'excess'})
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Root Cause if Failed */}
            {!result.success && result.rootCause && (
                <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'rgba(197, 15, 31, 0.1)',
                    border: '1px solid #c50f1f'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={18} color="#c50f1f" />
                        <strong style={{ color: '#c50f1f' }}>{t('vsm.analysis.rootCause')}</strong>
                        <span style={{ color: '#ff9900' }}>{result.rootCause}</span>
                    </div>
                </div>
            )}

            {/* Capacity vs Demand (Yamazumi Chart) */}
            {capacityData.length > 0 && (
                <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid #333',
                    marginBottom: '20px'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>
                        📊 {t('vsm.analysis.capacityDemandTitle')}
                    </h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart
                                data={capacityData}
                                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                                <XAxis dataKey="name" stroke="#888" style={{ fontSize: '0.8rem' }} />
                                <YAxis type="number" stroke="#888" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e1e', border: '1px solid #555', color: '#fff' }}
                                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                                />
                                <style>{blinkStyle}</style>
                                <Legend />
                                <Bar
                                    dataKey="output"
                                    name={t('vsm.analysis.outputCapacity')}
                                    barSize={40}
                                    radius={[4, 4, 0, 0]}
                                    label={(props) => {
                                        const { x, y, width, payload } = props;
                                        if (payload && payload.output < payload.scheduledQty) {
                                            return (
                                                <g transform={`translate(${x + width / 2 - 12},${y - 30})`}>
                                                    <foreignObject width="24" height="24">
                                                        <div style={{ animation: 'blink 1s infinite' }}>
                                                            <AlertTriangle size={24} color="#ff5722" fill="#333" />
                                                        </div>
                                                    </foreignObject>
                                                </g>
                                            );
                                        }
                                        return null;
                                    }}
                                >
                                    {capacityData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.output < entry.scheduledQty ? '#d32f2f' : '#4caf50'}
                                        />
                                    ))}
                                </Bar>
                                <Line
                                    dataKey="scheduledQty"
                                    name={t('vsm.analysis.targetDemand')}
                                    stroke="#ff9800"
                                    strokeWidth={3}
                                    dot={{ r: 4, fill: '#ff9800' }}
                                    type="monotone"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Node Status Table */}
            {capacityData.length > 0 && (
                <div style={{
                    padding: '20px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid #333'
                }}>
                    <h3 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem' }}>
                        {t('vsm.analysis.nodeInventoryStatus')}
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #444' }}>
                                    <th style={{ padding: '10px', textAlign: 'left', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableName')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableCt')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tablePcsHr')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableShift')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableOutput')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableLoadHours')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'right', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableBalance')}
                                    </th>
                                    <th style={{ padding: '10px', textAlign: 'left', color: '#aaa', fontSize: '0.85rem' }}>
                                        {t('vsm.analysis.tableStatus')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {capacityData.map((node, idx) => (
                                    <tr
                                        key={idx}
                                        style={{
                                            borderBottom: '1px solid #333',
                                            background: node.isBottleneck ? 'rgba(255, 152, 0, 0.05)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ padding: '10px', color: '#fff' }}>
                                            {node.name}
                                            {node.isBottleneck && (
                                                <span style={{
                                                    marginLeft: '8px',
                                                    fontSize: '0.75rem',
                                                    color: '#ff9800',
                                                    background: 'rgba(255, 152, 0, 0.2)',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px'
                                                }}>
                                                    {t('vsm.nodes.bottleneck') || 'BOTTLENECK'}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#fff' }}>
                                            {node.ct || '-'}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#fff' }}>
                                            {node.pcsPerHour || '-'}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#fff' }}>
                                            {node.shifts}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#2196f3' }}>
                                            {node.output}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#e91e63' }}>
                                            {node.hoursNeeded > 0 ? `${node.hoursNeeded}h` : '-'}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: node.shortage > 0 ? '#4caf50' : '#c50f1f' }}>
                                            {node.shortage || 0}
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'left', color: node.shortage < 0 ? '#ff5722' : '#4caf50' }}>
                                            {node.shortage < 0 ? t('vsm.analysis.shortage') : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ResultsVisualization;
