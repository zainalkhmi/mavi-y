import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, TrendingUp, BarChart3, CheckCircle2, XCircle } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabaseManualDB';

/**
 * QualityDashboard
 * =====================================================
 * Premium analytics view for Quality Governance.
 * Visualizes Defect Rates, First Pass Yield (FPY), and Audit Trails.
 * =====================================================
 */
const QualityDashboard = () => {
    const [stats, setStats] = useState({
        fpy: 98.2,
        totalInspections: 0,
        defects: 0,
        topDefects: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchQualityData = async () => {
            const supabase = getSupabaseClient();
            try {
                // Fetch recent audit logs for quality events
                const { data: auditData, error: auditError } = await supabase
                    .from('audit_logs')
                    .select('*')
                    .or('event_type.eq.QUALITY_PASS,event_type.eq.QUALITY_FAIL')
                    .order('created_at', { ascending: false })
                    .limit(100);

                if (!auditError && auditData) {
                    const total = auditData.length;
                    const fails = auditData.filter(e => e.event_type === 'QUALITY_FAIL').length;
                    const yieldRate = total > 0 ? ((total - fails) / total) * 100 : 100;

                    // Group top defects by reason if available
                    const defectReasons = auditData
                        .filter(e => e.event_type === 'QUALITY_FAIL' && e.payload?.reason)
                        .reduce((acc, e) => {
                            const reason = e.payload.reason;
                            acc[reason] = (acc[reason] || 0) + 1;
                            return acc;
                        }, {});

                    const topDefects = Object.entries(defectReasons)
                        .map(([reason, count]) => ({ reason, count }))
                        .sort((a, b) => b.count - a.count);

                    setStats({
                        fpy: yieldRate.toFixed(1),
                        totalInspections: total,
                        defects: fails,
                        topDefects
                    });
                }
            } catch (err) {
                console.error('Failed to fetch quality analytics:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchQualityData();
    }, []);

    const KPI_CARDS = [
        { label: 'First Pass Yield', value: `${stats.fpy}%`, icon: TrendingUp, color: '#4CAF50', subtext: 'Target: >95%' },
        { label: 'Total Inspections', value: stats.totalInspections, icon: ShieldCheck, color: '#3b82f6', subtext: 'Last 30 Days' },
        { label: 'Detected Defects', value: stats.defects, icon: AlertTriangle, color: '#f44336', subtext: 'Requires Rework' },
    ];

    return (
        <div style={{ padding: '40px', backgroundColor: '#030305', minHeight: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900 }}>Quality Governance</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '5px 0 0 0' }}>Real-time compliance and inspection performance tracking.</p>
                </div>
                <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Reporting Period:</span> <b>Last 30 Days</b>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '40px' }}>
                {KPI_CARDS.map((kpi, idx) => (
                    <div key={idx} className="glass-panel" style={{ padding: '30px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '16px', backgroundColor: `${kpi.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: kpi.color }}>
                            <kpi.icon size={32} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{kpi.label}</div>
                            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{kpi.value}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>{kpi.subtext}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
                {/* Defect Pareto */}
                <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px' }}>
                    <h3 style={{ margin: '0 0 25px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={20} color="#3b82f6" /> Top Defect Reasons (Pareto)
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {stats.topDefects.length > 0 ? stats.topDefects.map((d, idx) => (
                            <div key={idx}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '8px' }}>
                                    <span>{d.reason}</span>
                                    <span style={{ fontWeight: 'bold' }}>{d.count} events</span>
                                </div>
                                <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(d.count / stats.defects) * 100}%`, height: '100%', backgroundColor: '#f44336' }} />
                                </div>
                            </div>
                        )) : (
                            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.1)' }}>
                                No defects detected in the current period. Workmanship is within spec.
                            </div>
                        )}
                    </div>
                </div>

                {/* Audit Activity Feed */}
                <div className="glass-panel" style={{ padding: '30px', borderRadius: '24px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 25px 0' }}>Live Quality Feed</h3>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
                        {/* Placeholder for real feed */}
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '20px' }}>
                            Recent quality inspection logs will appear here.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualityDashboard;
