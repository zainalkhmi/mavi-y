import React, { useState, useEffect } from 'react';
import {
    BarChart3,
    Clock,
    CheckCircle2,
    AlertCircle,
    History,
    TrendingUp,
    Search,
    ChevronRight,
    UserCheck
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabaseManualDB';

const FrontlineDashboard = () => {
    const [measurements, setMeasurements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetchMeasurements();
    }, []);

    const fetchMeasurements = async () => {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('measurements')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setMeasurements(data || []);
        } catch (err) {
            console.error('Failed to fetch measurements:', err);
        } finally {
            setLoading(false);
        }
    };

    // Metrics Calculation
    const totalCycles = measurements.length;
    const avgCycleTime = totalCycles > 0
        ? (measurements.reduce((acc, m) => acc + (m.measurements?.total_time || 0), 0) / totalCycles).toFixed(1)
        : 0;

    const filteredData = measurements.filter(m =>
        m.narration?.toLowerCase().includes(filter.toLowerCase()) ||
        m.measurements?.manual_title?.toLowerCase().includes(filter.toLowerCase()) ||
        m.measurements?.operator_id?.toLowerCase().includes(filter.toLowerCase())
    );

    // Calculate daily trends for last 7 days
    const getDailyTrends = () => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        const counts = last7Days.map(date => measurements.filter(m => m.created_at.startsWith(date)).length);
        const maxCount = Math.max(...counts, 1);

        return last7Days.map((date, i) => ({
            date,
            count: counts[i],
            height: (counts[i] / maxCount) * 100
        }));
    };

    const dailyTrends = getDailyTrends();

    if (loading) {
        return (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#030305', color: '#3b82f6' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Loading Analytics...</div>
                    <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', marginTop: '10px' }}>Connecting to Genba Database</div>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            height: '100%',
            backgroundColor: '#030305',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            padding: '40px',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900' }}>Frontline Dashboard</h1>
                <p style={{ color: 'rgba(255,255,255,0.4)' }}>Real-time production analytics and governance logs</p>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {[
                    { label: 'Total Cycles', value: totalCycles, icon: CheckCircle2, color: '#3b82f6' },
                    { label: 'Avg Cycle Time', value: `${avgCycleTime}s`, icon: Clock, color: '#10b981' },
                    { label: 'Production Yield', value: measurements.length > 0 ? '99.1%' : 'N/A', icon: TrendingUp, color: '#8b5cf6' },
                    { label: 'Governance Rate', value: measurements.length > 0 ? `${((measurements.filter(m => m.measurements?.operator_id).length / measurements.length) * 100).toFixed(0)}%` : 'N/A', icon: UserCheck, color: '#f59e0b' }
                ].map((stat, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '24px', borderRadius: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '50px', height: '50px', backgroundColor: `${stat.color}15`, borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>{stat.label}</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{stat.value}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', minHeight: 0 }}>
                {/* Production Logs */}
                <div className="glass-panel" style={{ borderRadius: '32px', padding: '30px', display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <History size={20} color="#3b82f6" /> Production Cycle Logs
                        </h4>
                        <div style={{ position: 'relative' }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={16} />
                            <input
                                placeholder="Search logs..."
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                style={{ padding: '10px 10px 10px 40px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.9rem', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>TIMESTAMP</th>
                                    <th style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>OPERATION / SOP</th>
                                    <th style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>DURATION</th>
                                    <th style={{ padding: '15px 10px', color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>GOVERNANCE</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No production data found.</td>
                                    </tr>
                                ) : (
                                    filteredData.map((m) => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="hover-row">
                                            <td style={{ padding: '15px 10px', fontSize: '0.9rem' }}>
                                                {new Date(m.created_at).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '15px 10px' }}>
                                                <div style={{ fontWeight: 'bold' }}>{m.measurements?.manual_title || 'General Operation'}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>WS-01</div>
                                            </td>
                                            <td style={{ padding: '15px 10px' }}>
                                                <span style={{ padding: '4px 10px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                    {m.measurements?.total_time || 0}s
                                                </span>
                                            </td>
                                            <td style={{ padding: '15px 10px' }}>
                                                {m.measurements?.operator_id ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem' }}>
                                                        <UserCheck size={14} /> {m.measurements.operator_id}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: '#ef4444', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        <AlertCircle size={14} /> Missing Sign
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar: Insights & Alerts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div className="glass-panel" style={{ borderRadius: '32px', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <TrendingUp size={18} color="#3b82f6" /> Production Trend
                        </h4>
                        <div style={{ height: '150px', display: 'flex', alignItems: 'flex-end', gap: '10px', padding: '20px 0' }}>
                            {dailyTrends.map((day, i) => (
                                <div
                                    key={i}
                                    title={`${day.date}: ${day.count} cycles`}
                                    style={{
                                        flex: 1,
                                        backgroundColor: '#3b82f6',
                                        height: `${Math.max(day.height, 5)}%`,
                                        borderRadius: '4px 4px 0 0',
                                        opacity: 0.3 + (i * 0.1),
                                        transition: 'height 0.5s ease'
                                    }}
                                />
                            ))}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>
                            <span>7 Days Ago</span>
                            <span>Today</span>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ borderRadius: '32px', padding: '24px' }}>
                        <h4 style={{ margin: '0 0 20px 0' }}>Quality Alerts</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {measurements.filter(m => !m.measurements?.operator_id).length > 0 ? (
                                <div style={{ padding: '20px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px', borderLeft: '4px solid #ef4444', display: 'flex', gap: '15px' }}>
                                    <AlertCircle size={24} color="#ef4444" />
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#ef4444' }}>Governance Warning</div>
                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                                            {measurements.filter(m => !m.measurements?.operator_id).length} production cycles were completed without required operator sign-off.
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center' }}>
                                    <CheckCircle2 size={32} color="#10b981" style={{ marginBottom: '15px' }} />
                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>All Compliant</div>
                                    <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: '5px 0 0 0' }}>All tracked cycles have valid signatures.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FrontlineDashboard;
