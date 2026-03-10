import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, GripVertical, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabaseManualDB';

/**
 * ProductionScheduler
 * =====================================================
 * Supervisor view for sequencing Work Orders.
 * Allows assigning jobs to stations and setting priority.
 * =====================================================
 */
const ProductionScheduler = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newJob, setNewJob] = useState({ work_order: '', app_id: '', priority: 'P2', target_qty: 100 });
    const [availableApps, setAvailableApps] = useState([]);

    useEffect(() => {
        fetchSchedule();
        fetchApps();
    }, []);

    const fetchSchedule = async () => {
        const supabase = getSupabaseClient();
        try {
            const { data, error } = await supabase
                .from('production_queue')
                .select('*')
                .order('priority', { ascending: true })
                .order('created_at', { ascending: true });

            if (error) throw error;
            setJobs(data || []);
        } catch (err) {
            console.error('Failed to fetch production queue:', err);
            // Fallback for demo if table doesn't exist yet
            setJobs([
                { id: 1, work_order: 'WO-9912', app_id: 'APP-01', priority: 'P1', target_qty: 50, status: 'PENDING' },
                { id: 2, work_order: 'WO-9913', app_id: 'APP-02', priority: 'P2', target_qty: 120, status: 'PENDING' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchApps = async () => {
        const supabase = getSupabaseClient();
        const { data } = await supabase.from('frontline_apps').select('id, name');
        setAvailableApps(data || []);
    };

    const handleAddJob = async () => {
        const supabase = getSupabaseClient();
        try {
            const { error } = await supabase.from('production_queue').insert([
                { ...newJob, status: 'PENDING' }
            ]);
            if (error) throw error;
            fetchSchedule();
            setShowAddModal(false);
            setNewJob({ work_order: '', app_id: '', priority: 'P2', target_qty: 100 });
        } catch (err) {
            alert('Failed to add job. Ensure production_queue table exists in Supabase.');
            // Add to local state for simulation
            setJobs([...jobs, { ...newJob, id: Date.now(), status: 'PENDING' }]);
            setShowAddModal(false);
        }
    };

    const handleDelete = async (id) => {
        const supabase = getSupabaseClient();
        await supabase.from('production_queue').delete().eq('id', id);
        setJobs(jobs.filter(j => j.id !== id));
    };

    return (
        <div style={{ padding: '40px', backgroundColor: '#030305', minHeight: '100%', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 900 }}>Production Schedule</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '5px 0 0 0' }}>Assign and sequence work orders for frontline workstations.</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                    <Plus size={20} /> Create Work Order
                </button>
            </div>

            <div className="glass-panel" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <th style={{ padding: '20px' }}>Priority</th>
                            <th>Work Order</th>
                            <th>Target App</th>
                            <th>Target Qty</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right', paddingRight: '20px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job) => (
                            <tr key={job.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', transition: 'background 0.2s' }}>
                                <td style={{ padding: '20px' }}>
                                    <span style={{
                                        padding: '4px 12px',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        backgroundColor: job.priority === 'P1' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: job.priority === 'P1' ? '#ef4444' : '#3b82f6'
                                    }}>
                                        {job.priority}
                                    </span>
                                </td>
                                <td style={{ fontWeight: 'bold' }}>{job.work_order}</td>
                                <td style={{ color: 'rgba(255,255,255,0.6)' }}>{job.app_id}</td>
                                <td>{job.target_qty}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                                        {job.status === 'PENDING' ? <Clock size={14} color="#f59e0b" /> : <CheckCircle2 size={14} color="#22c55e" />}
                                        {job.status}
                                    </div>
                                </td>
                                <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                    <button
                                        onClick={() => handleDelete(job.id)}
                                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: '8px' }}
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '30px', borderRadius: '32px' }}>
                        <h2 style={{ marginBottom: '20px' }}>New Work Order</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>WORK ORDER ID</label>
                                <input
                                    value={newJob.work_order}
                                    onChange={e => setNewJob({ ...newJob, work_order: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>SELECT APP</label>
                                <select
                                    value={newJob.app_id}
                                    onChange={e => setNewJob({ ...newJob, app_id: e.target.value })}
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                                >
                                    <option value="">Select an App...</option>
                                    {availableApps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>PRIORITY</label>
                                    <select
                                        value={newJob.priority}
                                        onChange={e => setNewJob({ ...newJob, priority: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                                    >
                                        <option value="P1">P1 (Urgent)</option>
                                        <option value="P2">P2 (Normal)</option>
                                        <option value="P3">P3 (Backlog)</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: '5px' }}>TARGET QTY</label>
                                    <input
                                        type="number"
                                        value={newJob.target_qty}
                                        onChange={e => setNewJob({ ...newJob, target_qty: e.target.value })}
                                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', color: '#fff' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                                <button onClick={handleAddJob} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#3b82f6', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Create Job</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductionScheduler;
