import React, { useState, useEffect } from 'react';
import {
    LayoutGrid,
    Activity,
    AlertTriangle,
    CheckCircle,
    Clock,
    Monitor,
    RefreshCcw,
    ChevronRight,
    Users
} from 'lucide-react';
import { getSupabaseClient } from '../utils/supabaseManualDB';

const StationMonitor = () => {
    const [stations, setStations] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => {
        fetchStationData();
        const interval = setInterval(fetchStationData, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchStationData = async () => {
        const supabase = getSupabaseClient();
        try {
            // Fetch latest measurements to derive station status
            const { data, error } = await supabase
                .from('measurements')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // Group by workstation (mocking workstation extraction from metadata)
            const stationMap = {};
            data.forEach(m => {
                const wsId = m.measurements?.workstation || 'WS-Generic';
                if (!stationMap[wsId]) {
                    stationMap[wsId] = {
                        id: wsId,
                        lastSeen: m.created_at,
                        currentApp: m.measurements?.manual_title || 'N/A',
                        status: 'Running',
                        efficiency: Math.floor(Math.random() * (100 - 85 + 1) + 85), // Mock efficiency
                        operator: m.measurements?.operator_id || 'Unknown',
                        alerts: m.measurements?.operator_id ? 0 : 1
                    };
                }
            });

            setStations(Object.values(stationMap));

            // Fetch live alerts from audit_logs
            const { data: alertData } = await supabase
                .from('audit_logs')
                .select('*')
                .in('type', ['QUALITY_FAIL', 'DOWNTIME_TRIGGERED'])
                .order('created_at', { ascending: false })
                .limit(10);

            setAlerts(alertData || []);
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Failed to fetch station monitor data:', err);
        } finally {
            setLoading(false);
        }
    };

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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '900' }}>Station Monitor</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)' }}>Real-time shop floor supervisor oversight</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>
                        Last updated: {lastRefresh.toLocaleTimeString()}
                    </div>
                    <button
                        onClick={fetchStationData}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: '12px',
                            color: '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            cursor: 'pointer'
                        }}
                    >
                        <RefreshCcw size={16} /> Refresh
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                {[
                    { label: 'Active Stations', value: stations.length, icon: Monitor, color: '#3b82f6' },
                    { label: 'Overall OEE', value: '92.4%', icon: Activity, color: '#10b981' },
                    { label: 'Pending Sign-offs', value: stations.reduce((acc, s) => acc + s.alerts, 0), icon: AlertTriangle, color: '#ef4444' },
                    { label: 'Logged Operators', value: new Set(stations.map(s => s.operator)).size, icon: Users, color: '#8b5cf6' }
                ].map((stat, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '24px', borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 'bold' }}>{stat.label}</div>
                            <stat.icon size={20} color={stat.color} />
                        </div>
                        <div style={{ fontSize: '1.8rem', fontWeight: '900' }}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Main Section: Stations and Alerts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 350px', gap: '30px', flex: 1, minHeight: 0 }}>
                {/* Station Grid */}
                <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                        {stations.map(station => (
                            <div key={station.id} className="glass-panel" style={{
                                borderRadius: '28px',
                                padding: '24px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: station.status === 'Running' ? '#10b981' : '#f59e0b', boxShadow: station.status === 'Running' ? '0 0 10px #10b981' : 'none' }} />
                                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900' }}>{station.id}</h3>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(station.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                <div style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>CURRENT OPERATION</div>
                                    <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{station.currentApp}</div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>EFFICIENCY</div>
                                        <div style={{ fontSize: '1.2rem', fontWeight: '900', color: station.efficiency > 90 ? '#10b981' : '#fff' }}>{station.efficiency}%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)' }}>OPERATOR</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{station.operator}</div>
                                    </div>
                                </div>

                                {station.alerts > 0 && (
                                    <div style={{ padding: '10px 15px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <AlertTriangle size={14} /> Governance Required
                                    </div>
                                )}

                                <button style={{
                                    marginTop: 'auto',
                                    width: '100%',
                                    padding: '12px',
                                    backgroundColor: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '10px',
                                    cursor: 'pointer'
                                }}>
                                    View Station Details <ChevronRight size={16} />
                                </button>
                            </div>
                        ))}

                        {stations.length === 0 && !loading && (
                            <div style={{ gridColumn: '1 / -1', padding: '100px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                <Monitor size={48} style={{ marginBottom: '20px' }} />
                                <p>No active stations detected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Supervisor Alerts Sidebar */}
                <div className="glass-panel" style={{ borderRadius: '28px', padding: '24px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <AlertTriangle size={20} color="#ef4444" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Active Alerts</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', overflowY: 'auto' }}>
                        {alerts.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.1)', padding: '20px' }}>No recent alerts</div>
                        ) : (
                            alerts.map(alert => (
                                <div key={alert.id} style={{ padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: 900, color: '#ef4444' }}>{alert.type}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '5px' }}>{alert.workstation || 'WS-01'}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
                                        {alert.details?.reason || alert.details?.label || 'General Alert'}
                                    </div>
                                    {alert.workOrder && (
                                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#3b82f6' }}>
                                            WO: {alert.workOrder}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StationMonitor;
