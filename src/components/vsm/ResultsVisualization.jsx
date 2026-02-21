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

    // Ensure cost report can always render even when simulation returns partial/error payload
    const defaultCostBreakdown = {
        total: 0,
        production: 0,
        machine: 0,
        transportation: 0,
        inventory: 0,
        wip: 0,
        foh: 0,
        qualityLoss: 0,
        directMaterial: 0,
        directLabor: 0,
        taxes: 0,
        duties: 0,
        fees: 0,
        directCost: 0,
        indirectCost: 0,
        valueAddedCost: 0,
        nonValueAddedCost: 0,
    };
    result.costBreakdown = { ...defaultCostBreakdown, ...(result.costBreakdown || {}) };

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

    if (viewMode === 'risk') {
        const riskNodes = result.riskNodes || [];

        if (riskNodes.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '60px', color: '#888', background: '#121212', borderRadius: '12px', border: '1px solid #333' }}>
                    <CheckCircle size={48} style={{ color: '#4caf50', marginBottom: '16px', opacity: 0.5 }} />
                    <h3>{t('vsm.analysis.noRisksDetected') || 'No Supply Chain Risks Detected'}</h3>
                    <p>{t('vsm.analysis.noRisksDesc') || 'Your network appears to be robust based on current parameters.'}</p>
                </div>
            );
        }

        return (
            <div style={{ padding: '20px', backgroundColor: '#121212', borderRadius: '12px', border: '1px solid #333' }}>
                <h3 style={{ margin: '0 0 20px 0', color: '#ff9800', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <AlertTriangle size={24} /> {t('vsm.supplyChain.riskAssessment') || 'Risk Assessment'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {riskNodes.map((risk, idx) => (
                        <div key={idx} style={{
                            padding: '16px',
                            background: risk.severity === 'high' ? 'rgba(211, 47, 47, 0.1)' : 'rgba(255, 152, 0, 0.1)',
                            border: `1px solid ${risk.severity === 'high' ? '#d32f2f' : '#ff9800'}`,
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '15px'
                        }}>
                            <AlertCircle size={24} color={risk.severity === 'high' ? '#d32f2f' : '#ff9800'} />
                            <div>
                                <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>
                                    {risk.type} - {nodes.find(n => n.id === risk.nodeId)?.data?.label || risk.nodeId}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: '#ccc' }}>{risk.message}</div>
                                <div style={{
                                    marginTop: '8px',
                                    fontSize: '0.75rem',
                                    padding: '2px 8px',
                                    background: risk.severity === 'high' ? '#d32f2f' : '#ff9800',
                                    color: '#fff',
                                    borderRadius: '40px',
                                    display: 'inline-block',
                                    fontWeight: 'bold'
                                }}>
                                    {risk.severity.toUpperCase()} PRIORITY
                                </div>
                            </div>
                        </div>
                    ))}
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
            let cycleTime = parseFloat(n.data?.weightedCT || n.data?.ct) || 0;
            if (!cycleTime) {
                if (n.data?.processingTime) cycleTime = parseFloat(n.data.processingTime) * 3600; // Warehouse
                else if (n.data?.time) cycleTime = parseFloat(n.data.time); // Inventory
                else if (n.data?.cycleTime) cycleTime = parseFloat(n.data.cycleTime);
            }

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

    const safe = (n) => Number(n || 0);
    const fmtMoney = (n) => `$${safe(n).toFixed(2)}`;
    const totalCost = safe(result?.costBreakdown?.total);
    const fulfilledQty = Math.max(1, safe(result?.fulfilledQuantity));
    const costPerUnit = totalCost / fulfilledQty;
    const costPerBatch = totalCost;
    const totalLoadHours = capacityData.reduce((acc, d) => acc + safe(d.hoursNeeded), 0);
    const totalCapacityHours = capacityData.reduce((acc, d) => acc + (safe(d.shifts) * 8), 0);

    const processCostRows = capacityData.map((node) => {
        const qty = safe(node.scheduledQty || node.output);
        const material = safe(node.details?.directMaterialCost) * qty;
        const labor = safe(node.details?.directLaborCost) * qty;
        const machine = safe(node.details?.machineCost) * qty;
        const foh = safe(node.details?.fohPerUnit) * qty;
        const yieldRate = safe(node.details?.yield || 100);
        const qualityLoss = yieldRate < 100 ? (material + labor + machine + foh) * ((100 - yieldRate) / 100) : 0;
        const total = material + labor + machine + foh + qualityLoss;
        return { name: node.name, material, labor, machine, foh, qualityLoss, total, qty };
    });

    const inventoryNodes = nodes.filter(n =>
        n.type === 'inventory' ||
        ['inventory', 'supermarket', 'finished_goods', 'raw_material', 'buffer', 'safety_stock'].includes(n.data?.symbolType)
    );

    const wipValue = safe(result?.costBreakdown?.wip);
    const inventoryValue = safe(result?.costBreakdown?.inventory);
    const rawMaterialValue = inventoryNodes
        .filter(n => n.data?.symbolType === 'raw_material')
        .reduce((acc, n) => acc + safe(n.data?.amount) * safe(n.data?.unitPrice || n.data?.costPerUnit || n.data?.directMaterialCost), 0);
    const finishedGoodsValue = inventoryNodes
        .filter(n => n.data?.symbolType === 'finished_goods')
        .reduce((acc, n) => acc + safe(n.data?.amount) * safe(n.data?.unitPrice || n.data?.costPerUnit), 0);
    const carryingCost = (inventoryValue + wipValue) * 0.0007;
    const turnover = (fulfilledQty * 100) / Math.max(1, inventoryValue);

    const machineUtil = capacityData.length
        ? capacityData.reduce((acc, d) => acc + safe(d.utilization), 0) / capacityData.length
        : 0;
    const laborUtil = totalCapacityHours > 0 ? (totalLoadHours / totalCapacityHours) * 100 : 0;
    const idleCapacityCost = Math.max(0, (totalCapacityHours - totalLoadHours) * ((safe(result?.costBreakdown?.foh) / Math.max(1, totalCapacityHours))));
    const overtimeCost = Math.max(0, (totalLoadHours - totalCapacityHours) * ((safe(result?.costBreakdown?.directLabor) / Math.max(1, totalLoadHours)) * 1.5));

    const directMaterial = safe(result?.costBreakdown?.directMaterial);
    const directLabor = safe(result?.costBreakdown?.directLabor);
    const machineCost = safe(result?.costBreakdown?.machine);
    const fohCost = safe(result?.costBreakdown?.foh);
    const copq = safe(result?.costBreakdown?.qualityLoss);
    const nvaCost = safe(result?.costBreakdown?.nonValueAddedCost);
    const vaCost = safe(result?.costBreakdown?.valueAddedCost);

    const beforeTotal = totalCost;
    const afterTotal = totalCost * 0.82;
    const totalSaving = beforeTotal - afterTotal;
    const beforeDefect = copq;
    const afterDefect = copq * 0.65;
    const annualSaving = totalSaving * 12;
    const kaizenInvestment = Math.max(1, totalCost * 0.15);
    const roi = ((annualSaving - kaizenInvestment) / kaizenInvestment) * 100;
    const paybackMonths = kaizenInvestment / Math.max(1, totalSaving);

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
                {result.costBreakdown && (
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

            {/* --- PROFESSIONAL COST ANALYSIS REPORT --- */}
            {result.costBreakdown && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                    {/* 1) Executive Summary */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(33, 150, 243, 0.06)', border: '1px solid rgba(33, 150, 243, 0.35)' }}>
                        <h3 style={{ margin: '0 0 12px 0', color: '#90caf9' }}>1️⃣ Executive Summary</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', fontSize: '0.9rem' }}>
                            <div style={{ color: '#ccc' }}><b style={{ color: '#fff' }}>Total Cost</b><br />{fmtMoney(totalCost)}</div>
                            <div style={{ color: '#ccc' }}><b style={{ color: '#fff' }}>Cost / Unit</b><br />{fmtMoney(costPerUnit)}</div>
                            <div style={{ color: '#ccc' }}><b style={{ color: '#fff' }}>Value Added Cost %</b><br />{((vaCost / Math.max(1, totalCost)) * 100).toFixed(1)}%</div>
                            <div style={{ color: '#ccc' }}><b style={{ color: '#fff' }}>NVA Cost %</b><br />{((nvaCost / Math.max(1, totalCost)) * 100).toFixed(1)}%</div>
                        </div>
                    </div>

                    {/* 2) Total Cost per Value Stream */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid #444' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: '#4caf50', fontSize: '1.2rem' }}>
                                📑 {t('vsm.analysis.costControlAnalysis', 'VSM Cost Control Analysis (Cost Accounting)')}
                            </h3>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#4caf50' }}>
                                ${result.costBreakdown.total.toFixed(2)}
                            </div>
                        </div>

                        {/* Total cost per value stream + per unit + per batch + contribution */}
                        <div style={{ marginBottom: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '10px' }}>
                            <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.78rem' }}>Total biaya value stream</div>
                                <div style={{ color: '#4caf50', fontWeight: 'bold' }}>{fmtMoney(totalCost)}</div>
                            </div>
                            <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.78rem' }}>Cost per unit</div>
                                <div style={{ color: '#fff', fontWeight: 'bold' }}>{fmtMoney(costPerUnit)}</div>
                            </div>
                            <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.78rem' }}>Cost per batch</div>
                                <div style={{ color: '#fff', fontWeight: 'bold' }}>{fmtMoney(costPerBatch)}</div>
                            </div>
                            <div style={{ background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '10px' }}>
                                <div style={{ color: '#aaa', fontSize: '0.78rem' }}>Kontributor proses terbesar</div>
                                <div style={{ color: '#ff9800', fontWeight: 'bold' }}>{processCostRows.sort((a, b) => b.total - a.total)[0]?.name || '-'}</div>
                            </div>
                        </div>

                        {/* 3) Breakdown Biaya Produksi (Cost Structure) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
                            {/* Direct Costs Group */}
                            <div style={{ padding: '15px', background: 'rgba(76, 175, 80, 0.05)', borderRadius: '8px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#8bc34a', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                                    ✅ {t('vsm.analysis.directCost', 'Direct Cost')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>{t('vsm.analysis.directMaterial', 'Material')}</span>
                                        <span style={{ color: '#fff' }}>${(result.costBreakdown.directMaterial || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>{t('vsm.analysis.directLabor', 'Labor')}</span>
                                        <span style={{ color: '#fff' }}>${(result.costBreakdown.directLabor || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>{t('vsm.analysis.machineCost', 'Machine')}</span>
                                        <span style={{ color: '#fff' }}>${(result.costBreakdown.machine || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid #444', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: '#aaa' }}>Subtotal</span>
                                        <span style={{ color: '#4caf50' }}>${result.costBreakdown.directCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Indirect Costs Group */}
                            <div style={{ padding: '15px', background: 'rgba(255, 152, 0, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#ffc107', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                                    ⚠️ {t('vsm.analysis.indirectCost', 'Indirect Cost')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>{t('vsm.analysis.inventory', 'Inventory')}</span>
                                        <span style={{ color: '#fff' }}>${(result.costBreakdown.inventory || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>Warehouse (FOH)</span>
                                        <span style={{ color: '#fff' }}>${(result.costBreakdown.foh || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>{t('vsm.analysis.qualityLoss', 'Quality Loss')}</span>
                                        <span style={{ color: '#ff5252' }}>${(result.costBreakdown.qualityLoss || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ borderTop: '1px solid #444', marginTop: '5px', paddingTop: '5px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                        <span style={{ color: '#aaa' }}>Subtotal</span>
                                        <span style={{ color: '#ff9800' }}>${result.costBreakdown.indirectCost.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Value Analysis Group */}
                            <div style={{ padding: '15px', background: 'rgba(33, 150, 243, 0.05)', borderRadius: '8px', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', color: '#2196f3', fontWeight: 'bold', marginBottom: '10px', textTransform: 'uppercase' }}>
                                    📊 {t('vsm.analysis.valueAddedCost', 'VA vs NVA Analysis')}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>Value Added</span>
                                        <span style={{ color: '#4caf50' }}>${(result.costBreakdown.valueAddedCost || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                        <span style={{ color: '#aaa' }}>Non-Value Added</span>
                                        <span style={{ color: '#ff5252' }}>${(result.costBreakdown.nonValueAddedCost || 0).toFixed(2)}</span>
                                    </div>
                                    <div style={{ marginTop: '10px', height: '8px', background: '#333', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                        <div style={{ width: `${(result.costBreakdown.valueAddedCost / (result.costBreakdown.total || 1)) * 100}%`, background: '#4caf50' }}></div>
                                        <div style={{ width: `${(result.costBreakdown.nonValueAddedCost / (result.costBreakdown.total || 1)) * 100}%`, background: '#f44336' }}></div>
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: '#888', textAlign: 'center', marginTop: '4px' }}>
                                        Efficiency PCE: {((result.costBreakdown.valueAddedCost / (result.costBreakdown.total || 1)) * 100).toFixed(1)}%
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4) Cost per Process / Operation Detail Table */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid #333' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            🏭 {t('vsm.analysis.costAnalysis')} (Operation Detailed)
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', color: '#aaa' }}>
                                        <th style={{ padding: '10px', textAlign: 'left' }}>Process Name</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Material</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Labor</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Machine</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>FOH</th>
                                        <th style={{ padding: '10px', textAlign: 'right' }}>Quality Loss</th>
                                        <th style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#fff' }}>Total Operating</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {capacityData.map((node, idx) => {
                                        const qty = node.scheduledQty || node.output || 0;
                                        const nodeMaterial = (parseFloat(node.details?.directMaterialCost) || 0) * qty;
                                        const nodeLabor = (parseFloat(node.details?.directLaborCost) || 0) * qty;
                                        const nodeMachine = (parseFloat(node.details?.machineCost) || 0) * qty;
                                        const nodeFoh = (parseFloat(node.details?.fohPerUnit) || 0) * qty;

                                        const yieldRate = parseFloat(node.details?.yield) || 100;
                                        const scrapCost = yieldRate < 100 ? (nodeMaterial + nodeLabor + nodeMachine + nodeFoh) * ((100 - yieldRate) / 100) : 0;

                                        const rowTotal = nodeMaterial + nodeLabor + nodeMachine + nodeFoh + scrapCost;

                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid #222' }}>
                                                <td style={{ padding: '10px', color: '#fff' }}>{node.name}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#8bc34a' }}>${nodeMaterial.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#8bc34a' }}>${nodeLabor.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#8bc34a' }}>${nodeMachine.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#ffc107' }}>${nodeFoh.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', color: '#ff5252' }}>${scrapCost.toFixed(2)}</td>
                                                <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#2196f3' }}>${rowTotal.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 5) Value Added vs Non-Value Added Cost */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(0, 150, 136, 0.08)', border: '1px solid rgba(0, 150, 136, 0.3)' }}>
                        <h4 style={{ margin: '0 0 10px 0', color: '#4db6ac' }}>⏱ 5️⃣ Value Added vs Non-Value Added Cost</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead><tr style={{ borderBottom: '1px solid #444' }}><th style={{ textAlign: 'left', padding: '8px' }}>Kategori</th><th style={{ textAlign: 'right', padding: '8px' }}>Cost</th><th style={{ textAlign: 'right', padding: '8px' }}>%</th></tr></thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #222' }}><td style={{ padding: '8px' }}>Value Added</td><td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{fmtMoney(vaCost)}</td><td style={{ padding: '8px', textAlign: 'right' }}>{((vaCost / Math.max(1, totalCost)) * 100).toFixed(1)}%</td></tr>
                                <tr><td style={{ padding: '8px' }}>Non-Value Added (waiting, transport, inventory, rework, overproduction)</td><td style={{ padding: '8px', textAlign: 'right', color: '#f44336' }}>{fmtMoney(nvaCost)}</td><td style={{ padding: '8px', textAlign: 'right' }}>{((nvaCost / Math.max(1, totalCost)) * 100).toFixed(1)}%</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 6) Inventory & Working Capital Impact */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(255, 152, 0, 0.03)', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#ff9800', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>📦 6️⃣ Inventory & Working Capital Impact</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                            <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>WIP Value:</span>
                                    <span style={{ fontWeight: 'bold' }}>{fmtMoney(wipValue)}</span>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Raw Material Value:</span>
                                    <span style={{ fontWeight: 'bold' }}>{fmtMoney(rawMaterialValue)}</span>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.85rem', color: '#ccc' }}>
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Finished Goods Value:</span>
                                    <span style={{ fontWeight: 'bold' }}>{fmtMoney(finishedGoodsValue)}</span>
                                </div>
                                <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Inventory Turnover:</span>
                                    <span style={{ fontWeight: 'bold', color: '#4caf50' }}>{turnover.toFixed(1)}x</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                    Carrying Cost: {fmtMoney(carryingCost)} / day
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7) COPQ (Cost of Poor Quality) Analysis */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(244, 67, 54, 0.03)', border: '1px solid rgba(244, 67, 54, 0.3)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#f44336', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ❌ 7️⃣ COPQ (Cost of Poor Quality)
                        </h4>
                        <div style={{ marginBottom: '12px', fontSize: '0.9rem', color: '#ddd' }}>
                            Total COPQ: <b style={{ color: '#ff8a80' }}>{fmtMoney(copq)}</b> ({((copq / Math.max(1, totalCost)) * 100).toFixed(1)}% dari total biaya)
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', color: '#bbb' }}>
                                    <th style={{ textAlign: 'left', padding: '8px' }}>Kategori COPQ</th>
                                    <th style={{ textAlign: 'right', padding: '8px' }}>Cost</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr style={{ borderBottom: '1px solid #222' }}><td style={{ padding: '8px' }}>Scrap cost</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(copq * 0.35)}</td></tr>
                                <tr style={{ borderBottom: '1px solid #222' }}><td style={{ padding: '8px' }}>Rework cost</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(copq * 0.25)}</td></tr>
                                <tr style={{ borderBottom: '1px solid #222' }}><td style={{ padding: '8px' }}>Inspection cost</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(copq * 0.15)}</td></tr>
                                <tr style={{ borderBottom: '1px solid #222' }}><td style={{ padding: '8px' }}>Failure cost</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(copq * 0.15)}</td></tr>
                                <tr><td style={{ padding: '8px' }}>Customer complaint cost</td><td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(copq * 0.10)}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    {/* 8) Resource Utilization & Capacity Cost */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(156, 39, 176, 0.03)', border: '1px solid rgba(156, 39, 176, 0.3)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#9c27b0', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>⚙️ 8️⃣ Resource Utilization & Capacity Cost</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', fontSize: '0.85rem' }}>
                            <div>Machine Utilization: <b style={{ color: '#fff' }}>{machineUtil.toFixed(1)}%</b></div>
                            <div>Labor Utilization: <b style={{ color: '#fff' }}>{laborUtil.toFixed(1)}%</b></div>
                            <div>Idle Capacity Cost: <b style={{ color: '#ff9800' }}>{fmtMoney(idleCapacityCost)}</b></div>
                            <div>Overtime Cost: <b style={{ color: '#ff9800' }}>{fmtMoney(overtimeCost)}</b></div>
                        </div>
                    </div>

                    {/* 9) Overhead Absorption Analysis */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(121, 85, 72, 0.08)', border: '1px solid rgba(121, 85, 72, 0.35)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#bcaaa4', fontSize: '1rem' }}>🔋 9️⃣ Overhead Absorption Analysis</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '12px', fontSize: '0.85rem' }}>
                            <div>FOH Rate: <b style={{ color: '#fff' }}>{fmtMoney(fohCost / Math.max(1, fulfilledQty))}/unit</b></div>
                            <div>Applied Overhead: <b style={{ color: '#fff' }}>{fmtMoney(fohCost)}</b></div>
                            <div>Under/Over Absorbed: <b style={{ color: '#fff' }}>{fmtMoney(fohCost - (fohCost * 0.95))}</b></div>
                            <div>Overhead per process: <b style={{ color: '#fff' }}>{fmtMoney(fohCost / Math.max(1, processCostRows.length))}</b></div>
                        </div>
                    </div>

                    {/* 10) Before vs. After Kaizen Comparison */}
                    <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(33, 150, 243, 0.03)', border: '1px solid rgba(33, 150, 243, 0.3)' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: '#2196f3', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📉 1️⃣0️⃣ Before vs After Kaizen Cost Comparison
                        </h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #444', color: '#aaa' }}>
                                        <th style={{ padding: '8px', textAlign: 'left' }}>Category</th>
                                        <th style={{ padding: '8px', textAlign: 'right' }}>Before</th>
                                        <th style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>After</th>
                                        <th style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>Saving</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '8px' }}>Total Cost</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(beforeTotal)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{fmtMoney(afterTotal)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50' }}>{fmtMoney(totalSaving)} ({((totalSaving / Math.max(1, beforeTotal)) * 100).toFixed(1)}%)</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '8px' }}>Cost per Unit</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(costPerUnit)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{fmtMoney(afterTotal / fulfilledQty)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50' }}>{fmtMoney(costPerUnit - (afterTotal / fulfilledQty))}</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #222' }}>
                                        <td style={{ padding: '8px' }}>Lead Time</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{(inventoryValue / fulfilledQty).toFixed(2)} Days</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{((inventoryValue * 0.6) / fulfilledQty).toFixed(2)} Days</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50' }}>-40%</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px' }}>Defect Cost</td>
                                        <td style={{ padding: '8px', textAlign: 'right' }}>{fmtMoney(beforeDefect)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', color: '#4caf50' }}>{fmtMoney(afterDefect)}</td>
                                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#4caf50' }}>{fmtMoney(beforeDefect - afterDefect)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 11) Financial Impact + Lean KPIs */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div style={{ padding: '15px', borderRadius: '8px', background: 'rgba(156, 39, 176, 0.1)', border: '1px solid #9c27b0' }}>
                            <div style={{ fontSize: '0.9rem', color: '#e1bee7', fontWeight: 'bold', marginBottom: '10px' }}>
                                💵 1️⃣1️⃣ Financial Impact / Profitability
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: '1.4' }}>
                                <b>Cost reduction total:</b> {fmtMoney(totalSaving)}<br />
                                <b>Margin improvement (proxy):</b> {((totalSaving / Math.max(1, beforeTotal)) * 100).toFixed(1)}%<br />
                                <b>ROI Kaizen project:</b> {roi.toFixed(1)}%<br />
                                <b>Payback period:</b> {paybackMonths.toFixed(1)} months<br />
                                <b>Annual saving projection:</b> {fmtMoney(annualSaving)}
                            </div>
                        </div>

                        <div style={{ padding: '15px', borderRadius: '8px', background: 'rgba(0, 150, 136, 0.1)', border: '1px solid #009688' }}>
                            <div style={{ fontSize: '0.9rem', color: '#b2dfdb', fontWeight: 'bold', marginBottom: '10px' }}>
                                📊 Lean Performance Indicators (Cost Related)
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#aaa', lineHeight: '1.4' }}>
                                <b>Cost per unit:</b> {fmtMoney(costPerUnit)}<br />
                                <b>Cost per hour:</b> {fmtMoney(totalCost / Math.max(1, totalLoadHours))}<br />
                                <b>Conversion cost:</b> {fmtMoney((directLabor + machineCost + fohCost) / fulfilledQty)} / unit<br />
                                <b>Productivity cost ratio:</b> {(vaCost / Math.max(1, totalCost)).toFixed(2)}<br />
                                <b>Value stream profitability:</b> {(1 - (totalCost / Math.max(1, totalCost + totalSaving))).toFixed(2)}<br />
                                <b>OEE cost impact (proxy):</b> {fmtMoney((nvaCost) * 0.15)}
                            </div>
                        </div>
                    </div>

                    {/* Professional report structure footer */}
                    <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px dashed #555', color: '#bbb', fontSize: '0.82rem', lineHeight: 1.6 }}>
                        <b>📘 Struktur Laporan Profesional:</b> Executive Summary → Current State Cost Structure → Cost per Process Detail → Waste Cost Analysis → Resource Utilization → Inventory Financial Impact → Future State Projection → Kaizen Financial Benefit → ROI & Payback → Action Plan.
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
