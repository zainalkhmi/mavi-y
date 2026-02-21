import React, { useMemo, useState } from 'react';
import {
    X,
    Activity,
    ListTree,
    BarChart3,
    LocateFixed,
    SkipForward,
    Workflow,
    AlertTriangle,
    Gauge,
    Boxes,
    Clock3,
    RefreshCcw,
} from 'lucide-react';

const safeNum = (n, fallback = 0) => {
    const v = Number(n);
    return Number.isFinite(v) ? v : fallback;
};

const firstDefined = (...vals) => vals.find((v) => v !== undefined && v !== null);

const statusOrder = ['issued', 'in_transit', 'delivered', 'consumed', 'blocked', 'overdue'];

const KanbanManagementSimulationModal = ({
    isOpen,
    onClose,
    playbackPayload,
    animationFrame,
    lastSimulationResult,
    isSimulating,
    simTime,
    onFocusEvent,
    onJumpToEvent,
}) => {
    const [activeTab, setActiveTab] = useState('live');
    const [filters, setFilters] = useState({ part: '', node: '', type: '', status: '', severity: '' });

    const events = useMemo(() => {
        const base = Array.isArray(playbackPayload?.kanbanEvents) ? playbackPayload.kanbanEvents : [];
        return base.map((evt, idx) => {
            const delayMs = Math.max(0, safeNum(evt.actualEndTs, evt.endTs) - safeNum(evt.endTs));
            return {
                timestamp: safeNum(evt.startTs),
                kanban_id: evt.id || `kb-${idx + 1}`,
                type: evt.type || 'kanban',
                part_no: evt.partNo || evt.part_no || '-',
                qty: safeNum(evt.qty, 0),
                source: evt.sourceNodeId || '-',
                destination: evt.targetNodeId || '-',
                status: evt.status || (evt.blocked ? 'blocked' : evt.overdue ? 'overdue' : 'issued'),
                delayMs,
                severity: evt.severity || (evt.blocked ? 'critical' : evt.overdue ? 'warning' : 'info'),
                raw: evt,
            };
        });
    }, [playbackPayload]);

    const alerts = useMemo(() => {
        if (Array.isArray(animationFrame?.alerts) && animationFrame.alerts.length) return animationFrame.alerts;
        return Array.isArray(playbackPayload?.alerts) ? playbackPayload.alerts : [];
    }, [animationFrame, playbackPayload]);

    const nodeStates = useMemo(() => {
        if (Array.isArray(playbackPayload?.nodeStates) && playbackPayload.nodeStates.length) return playbackPayload.nodeStates;
        return [];
    }, [playbackPayload]);

    const statusCounts = useMemo(() => {
        const map = {};
        statusOrder.forEach((s) => { map[s] = 0; });
        events.forEach((e) => { map[e.status] = safeNum(map[e.status], 0) + 1; });
        return map;
    }, [events]);

    const digitalTwinRoutes = useMemo(() => {
        const active = Array.isArray(animationFrame?.activeKanbanEvents) ? animationFrame.activeKanbanEvents : [];
        const all = active.length ? active : events.map((e) => ({
            id: e.kanban_id,
            sourceNodeId: e.source,
            targetNodeId: e.destination,
            status: e.status,
            progress: e.status === 'delivered' || e.status === 'consumed' ? 1 : 0,
            type: e.type,
            qty: e.qty,
            partNo: e.part_no,
        }));

        const grouped = new Map();
        all.forEach((evt, idx) => {
            const source = evt.sourceNodeId || evt.source || '-';
            const destination = evt.targetNodeId || evt.destination || '-';
            const key = `${source}→${destination}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    key,
                    source,
                    destination,
                    tokens: [],
                    blocked: 0,
                    overdue: 0,
                    inTransit: 0,
                });
            }
            const route = grouped.get(key);
            const status = evt.status || 'in_transit';
            if (status === 'blocked') route.blocked += 1;
            if (status === 'overdue') route.overdue += 1;
            if (status === 'in_transit' || status === 'issued') route.inTransit += 1;
            route.tokens.push({
                id: evt.id || `${key}-${idx}`,
                status,
                progress: Math.max(0, Math.min(1, safeNum(evt.progress, status === 'delivered' ? 1 : 0))),
                type: evt.type || 'kanban',
                qty: safeNum(evt.qty, 0),
                partNo: evt.partNo || evt.part_no || '-',
                severity: evt.severity || (status === 'blocked' ? 'critical' : status === 'overdue' ? 'warning' : 'info'),
                raw: evt,
            });
        });

        return [...grouped.values()].sort((a, b) => b.tokens.length - a.tokens.length);
    }, [animationFrame, events]);

    const filteredEvents = useMemo(() => {
        return events.filter((row) => {
            if (filters.part && !String(row.part_no).toLowerCase().includes(filters.part.toLowerCase())) return false;
            if (filters.node) {
                const nodeText = `${row.source} ${row.destination}`.toLowerCase();
                if (!nodeText.includes(filters.node.toLowerCase())) return false;
            }
            if (filters.type && row.type !== filters.type) return false;
            if (filters.status && row.status !== filters.status) return false;
            if (filters.severity && String(row.severity || '').toLowerCase() !== filters.severity.toLowerCase()) return false;
            return true;
        });
    }, [events, filters]);

    const analysis = useMemo(() => {
        const analytics = playbackPayload?.kanbanAnalytics || {};
        const cycleTimes = events
            .map((e) => Math.max(0, safeNum(e.raw?.endTs) - safeNum(e.raw?.startTs)))
            .filter((n) => n > 0);
        const avgCycleMs = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

        const nowMs = Date.now();
        const overdueByStatus = events.filter((e) => e.status === 'overdue' || e.status === 'blocked').length;
        const overdueByDueAt = events.filter((e) => {
            const dueAt = firstDefined(e.raw?.dueAt, e.raw?.due_at, e.raw?.expectedEndTs);
            if (!dueAt) return false;
            const dueMs = Number.isFinite(Number(dueAt)) ? Number(dueAt) : new Date(dueAt).getTime();
            if (!Number.isFinite(dueMs)) return false;
            const status = String(e.status || '').toLowerCase();
            const done = status === 'delivered' || status === 'consumed' || Boolean(e.raw?.completedAt || e.raw?.completed_at);
            return !done && dueMs < nowMs;
        }).length;
        const overdueByNodeState = nodeStates.filter((n) => {
            if (n.kanban_overdue || n.kanbanOverdue) return true;
            const openAge = firstDefined(n.openKanbanAgeHours, n.open_kanban_age_hours);
            const dueHours = firstDefined(n.kanbanDueHours, n.kanban_due_hours);
            if (openAge === undefined || dueHours === undefined) return false;
            return safeNum(openAge) > safeNum(dueHours);
        }).length;
        const overdueStuck = Math.max(
            firstDefined(analytics.overdueStuckCount, analytics.overdueStuck, null) ?? -1,
            overdueByStatus,
            overdueByDueAt,
            overdueByNodeState
        );

        const delayedRoutes = [...events]
            .sort((a, b) => b.delayMs - a.delayMs)
            .slice(0, 5)
            .map((e) => `${e.source} → ${e.destination}`);
        const stockoutIncidents = safeNum(
            firstDefined(
                analytics.stockoutIncidents,
                lastSimulationResult?.vsmSummary?.stockout_incidents,
                null
            ),
            nodeStates.filter((n) => safeNum(n.onHandQty) <= 0).length
        );
        const qtyRotationIssues = Array.isArray(playbackPayload?.qtyRotationIssues)
            ? playbackPayload.qtyRotationIssues
            : [];
        const qtyRotationIssuesMeta = playbackPayload?.qtyRotationIssuesMeta || null;

        return {
            avgCycleMs,
            overdueStuck,
            delayedRoutes,
            stockoutIncidents,
            qtyRotationIssues,
            qtyRotationIssuesMeta,
            adherence: safeNum(firstDefined(analytics.kanbanAdherence, lastSimulationResult?.vsmSummary?.kanban_adherence), 0),
        };
    }, [events, playbackPayload, lastSimulationResult, nodeStates]);

    if (!isOpen) return null;

    const tabBtn = (id, label, Icon) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                border: 'none',
                cursor: 'pointer',
                color: activeTab === id ? '#111' : '#ddd',
                background: activeTab === id ? '#22d3ee' : '#252a34',
                padding: '8px 12px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600
            }}
        >
            <Icon size={14} /> {label}
        </button>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(2,6,23,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ width: '95vw', height: '88vh', background: '#161a22', border: '1px solid #2f3542', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #2f3542', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(90deg,#141823,#1a2030)' }}>
                    <div>
                        <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                            <Workflow size={16} color="#22d3ee" /> Kanban Management & Digital Twin
                        </div>
                        <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>
                            Playback: {isSimulating ? 'Playing' : 'Stopped'} • Tick: {simTime}s • Active Routes: {digitalTwinRoutes.length}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: '#252a34', color: '#fff', border: '1px solid #444f66', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <X size={14} /> Close
                    </button>
                </div>

                <div style={{ padding: 12, display: 'flex', gap: 8, borderBottom: '1px solid #2f3542', background: '#131722' }}>
                    {tabBtn('live', 'Live Kanban Status', Activity)}
                    {tabBtn('activity', 'Kanban Activity', ListTree)}
                    {tabBtn('analysis', 'Kanban Analysis', BarChart3)}
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: 14 }}>
                    {activeTab === 'live' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
                                {statusOrder.map((s) => (
                                    <div key={s} style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
                                        <div style={{ color: '#9ca3af', fontSize: 12, textTransform: 'capitalize' }}>{s.replace('_', ' ')}</div>
                                        <div style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>{statusCounts[s] || 0}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10 }}>
                                <MetricCard label="Live Alerts" value={alerts.length} icon={AlertTriangle} iconColor="#f59e0b" />
                                <MetricCard label="Avg Cycle" value={`${Math.round(analysis.avgCycleMs / 1000)}s`} icon={Clock3} iconColor="#38bdf8" />
                                <MetricCard label="Stockout" value={analysis.stockoutIncidents} icon={Boxes} iconColor="#ef4444" />
                                <MetricCard label="Adherence" value={`${analysis.adherence.toFixed ? analysis.adherence.toFixed(1) : analysis.adherence}%`} icon={Gauge} iconColor="#22c55e" />
                            </div>

                            <div style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 10, padding: 12 }}>
                                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <RefreshCcw size={14} color="#22d3ee" /> Digital Twin Kanban Flow
                                </div>
                                <div style={{ display: 'grid', gap: 10, maxHeight: 260, overflow: 'auto', paddingRight: 4 }}>
                                    {digitalTwinRoutes.length === 0 && (
                                        <div style={{ color: '#9ca3af', fontSize: 13 }}>No route activity yet. Start simulation to see token movement.</div>
                                    )}
                                    {digitalTwinRoutes.map((route) => (
                                        <div key={route.key} style={{ background: '#181d28', border: '1px solid #2f3542', borderRadius: 8, padding: 10 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div style={{ color: '#e5e7eb', fontSize: 13, fontWeight: 700 }}>{route.source} → {route.destination}</div>
                                                <div style={{ color: '#9ca3af', fontSize: 12 }}>
                                                    {route.tokens.length} token • blocked {route.blocked} • overdue {route.overdue}
                                                </div>
                                            </div>
                                            <div style={{ height: 14, borderRadius: 999, background: '#0f1420', border: '1px solid #2a3140', position: 'relative', overflow: 'hidden' }}>
                                                {route.tokens.slice(0, 8).map((token, idx) => (
                                                    <div
                                                        key={token.id}
                                                        title={`${token.type} • ${token.status} • qty ${token.qty} • ${token.partNo}`}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 1,
                                                            left: `calc(${Math.round(token.progress * 100)}% - 6px)`,
                                                            width: 12,
                                                            height: 12,
                                                            borderRadius: '50%',
                                                            background: token.status === 'blocked'
                                                                ? '#ef4444'
                                                                : token.status === 'overdue'
                                                                    ? '#f59e0b'
                                                                    : token.type === 'withdrawal'
                                                                        ? '#f97316'
                                                                        : '#22d3ee',
                                                            boxShadow: '0 0 8px rgba(0,0,0,0.45)',
                                                            transform: `translateX(${idx % 2 ? 1 : -1}px)`,
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
                                {(nodeStates || []).slice(0, 20).map((ns) => (
                                    <div key={ns.nodeId} style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
                                        <div style={{ color: '#fff', fontWeight: 700, marginBottom: 6 }}>{ns.nodeId}</div>
                                        <div style={{ fontSize: 12, color: '#c7c7c7' }}>
                                            ROP: {safeNum(ns.rop)} • Safety: {safeNum(ns.safetyStock)} • On Hand: {safeNum(ns.onHandQty)} • Usable: {Math.max(0, safeNum(ns.onHandQty) - safeNum(ns.safetyStock))}
                                        </div>
                                        <div style={{ fontSize: 12, color: '#c7c7c7', marginTop: 4 }}>
                                            TTS: {safeNum(ns.timeToStockout, ns.time_to_stockout)} • FIFO Violation: {String(Boolean(ns.fifoViolation || ns.fifo_violation))} • WIP Cap Violation: {String(safeNum(ns.wip) > safeNum(ns.wipCap))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ color: '#ddd', fontSize: 13 }}>
                                Kanban adherence: <b>{analysis.adherence.toFixed ? analysis.adherence.toFixed(1) : analysis.adherence}%</b>
                            </div>
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div style={{ display: 'grid', gap: 10 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(120px,1fr))', gap: 8 }}>
                                <input placeholder="part" value={filters.part} onChange={(e) => setFilters((f) => ({ ...f, part: e.target.value }))} style={{ ...filterInput }} />
                                <input placeholder="process/node" value={filters.node} onChange={(e) => setFilters((f) => ({ ...f, node: e.target.value }))} style={{ ...filterInput }} />
                                <input placeholder="type" value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))} style={{ ...filterInput }} />
                                <input placeholder="status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} style={{ ...filterInput }} />
                                <input placeholder="severity" value={filters.severity} onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value }))} style={{ ...filterInput }} />
                            </div>

                            <div style={{ maxHeight: '58vh', overflow: 'auto', border: '1px solid #333b4b', borderRadius: 8 }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead style={{ position: 'sticky', top: 0, background: '#232a38' }}>
                                        <tr>
                                            {['timestamp', 'kanban_id', 'type', 'part_no', 'qty', 'source', 'destination', 'status', 'delay'].map((h) => (
                                                <th key={h} style={{ color: '#d1d5db', textAlign: 'left', padding: 8, borderBottom: '1px solid #3a3a3a' }}>{h}</th>
                                            ))}
                                            <th style={{ padding: 8 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredEvents.map((row) => (
                                            <tr key={row.kanban_id} style={{ borderBottom: '1px solid #2f3542', background: row.status === 'blocked' ? 'rgba(220,38,38,0.09)' : row.status === 'overdue' ? 'rgba(245,158,11,0.08)' : 'transparent' }}>
                                                <td style={td}>{row.timestamp}</td>
                                                <td style={td}>{row.kanban_id}</td>
                                                <td style={td}>{row.type}</td>
                                                <td style={td}>{row.part_no}</td>
                                                <td style={td}>{row.qty}</td>
                                                <td style={td}>{row.source}</td>
                                                <td style={td}>{row.destination}</td>
                                                <td style={td}>{row.status}</td>
                                                <td style={td}>{Math.round(row.delayMs / 1000)}s</td>
                                                <td style={td}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => onFocusEvent?.(row.raw)} style={smallBtn}><LocateFixed size={12} /> Focus</button>
                                                        <button onClick={() => onJumpToEvent?.(row.raw)} style={smallBtn}><SkipForward size={12} /> Jump</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analysis' && (
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
                                <MetricCard label="Avg Kanban Cycle Time" value={`${Math.round(analysis.avgCycleMs / 1000)}s`} icon={Clock3} iconColor="#38bdf8" />
                                <MetricCard label="Overdue/Stuck Count" value={analysis.overdueStuck} icon={AlertTriangle} iconColor="#f59e0b" />
                                <MetricCard label="Stockout Incidents" value={analysis.stockoutIncidents} icon={Boxes} iconColor="#ef4444" />
                                <MetricCard label="Kanban Adherence" value={`${analysis.adherence.toFixed ? analysis.adherence.toFixed(1) : analysis.adherence}%`} icon={Gauge} iconColor="#22c55e" />
                            </div>

                            <div style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
                                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Top Delayed Routes</div>
                                <ul style={{ margin: 0, paddingLeft: 18, color: '#d1d5db' }}>
                                    {analysis.delayedRoutes.length ? analysis.delayedRoutes.map((r, i) => <li key={`${r}-${i}`}>{r}</li>) : <li>-</li>}
                                </ul>
                            </div>

                            <div style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
                                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Qty Rotation / Circulation Problems</div>
                                <ul style={{ margin: 0, paddingLeft: 18, color: '#d1d5db' }}>
                                    {analysis.qtyRotationIssues.length
                                        ? analysis.qtyRotationIssues.map((q, i) => <li key={i}>{typeof q === 'string' ? q : JSON.stringify(q)}</li>)
                                        : analysis.qtyRotationIssuesMeta?.enabled === false
                                            ? <li>Analyzer disabled: {analysis.qtyRotationIssuesMeta?.reason || 'No reason provided.'}</li>
                                            : <li>No explicit qtyRotationIssues payload.</li>}
                                </ul>
                            </div>

                            <div style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
                                <div style={{ color: '#fff', fontWeight: 700, marginBottom: 8 }}>Suggested Actions</div>
                                <ul style={{ margin: 0, paddingLeft: 18, color: '#d1d5db' }}>
                                    <li>Adjust kanban card count for persistent overdue/blocked routes.</li>
                                    <li>Tune container qty when cycle-time variance is high.</li>
                                    <li>Reduce lead-time bottlenecks on top delayed routes.</li>
                                    <li>Increase replenishment frequency for low usable stock nodes.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const td = { color: '#e5e7eb', padding: 8, whiteSpace: 'nowrap' };
const filterInput = {
    padding: '8px 10px',
    background: '#242a37',
    border: '1px solid #3a4356',
    borderRadius: 6,
    color: '#fff'
};
const smallBtn = {
    background: '#2f2f2f',
    border: '1px solid #444',
    color: '#fff',
    borderRadius: 6,
    padding: '4px 6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
};

const MetricCard = ({ label, value, icon: Icon, iconColor = '#9ca3af' }) => (
    <div style={{ background: '#1f2430', border: '1px solid #333b4b', borderRadius: 8, padding: 10 }}>
        <div style={{ color: '#9ca3af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {Icon ? <Icon size={13} color={iconColor} /> : null}
            {label}
        </div>
        <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
);

export default KanbanManagementSimulationModal;
