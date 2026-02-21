const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const DEFAULT_ANIMATION_FLAGS = {
    enableKanbanAnimation: true,
    enableAlertAnimation: true,
    enableKanbanSimulationModal: true,
};

export const normalizeSimulationPayload = (result = {}, nodes = [], edges = []) => {
    const nodeIdSet = new Set((nodes || []).map((n) => n.id));
    const edgeIdSet = new Set((edges || []).map((e) => e.id));

    const kanbanEventsRaw = Array.isArray(result.kanbanEvents) ? result.kanbanEvents : [];
    const alertsRaw = Array.isArray(result.alerts) ? result.alerts : [];
    const nodeStatesRaw = Array.isArray(result.nodeStates) ? result.nodeStates : [];
    const qtyRotationIssuesRaw = Array.isArray(result.qtyRotationIssues) ? result.qtyRotationIssues : [];

    const kanbanEvents = kanbanEventsRaw.filter((evt) => {
        const sourceOk = !evt?.sourceNodeId || nodeIdSet.has(evt.sourceNodeId);
        const targetOk = !evt?.targetNodeId || nodeIdSet.has(evt.targetNodeId);
        const edgeOk = !evt?.edgeId || edgeIdSet.has(evt.edgeId);
        return sourceOk && targetOk && edgeOk;
    });

    const alerts = alertsRaw.filter((alert) => {
        const nodeId = alert?.nodeId || alert?.entity_id;
        if (!nodeId) return true;
        return nodeIdSet.has(nodeId);
    });

    const nodeStates = nodeStatesRaw.filter((ns) => {
        if (!ns?.nodeId) return false;
        return nodeIdSet.has(ns.nodeId);
    });

    const now = Date.now();

    const summary = result.vsmSummary || {};
    const kanbanAnalytics = result.kanbanAnalytics || {
        kanbanAdherence: toNumber(summary.kanban_adherence, 0),
        stockoutIncidents: toNumber(summary.stockout_incidents, 0),
        stockoutIncidentNodes: Array.isArray(summary.stockout_incident_nodes) ? summary.stockout_incident_nodes : [],
        stockoutIncidentMode: summary.stockout_incident_mode || 'unique-node-per-evaluation',
    };

    const qtyRotationIssuesMeta = result.qtyRotationIssuesMeta || {
        enabled: qtyRotationIssuesRaw.length > 0,
        reason: qtyRotationIssuesRaw.length > 0 ? null : 'No qty rotation anomalies detected by analyzer.',
        analyzer: 'unknown',
    };

    const fallbackNodeStates = nodes.map((node) => {
        const ks = result.kanbanNodeStates?.[node.id] || {};
        const ns = result.nodeStatus?.[node.id] || {};
        return {
            nodeId: node.id,
            onHandQty: toNumber(ks.on_hand, toNumber(node.data?.inventory ?? node.data?.amount, 0)),
            rop: toNumber(ks.reorder_point, toNumber(node.data?.reorderPoint, 0)),
            safetyStock: toNumber(ks.safety_stock, toNumber(node.data?.safetyStock, 0)),
            wip: toNumber(ks.current_wip, toNumber(ns.final, 0)),
            wipCap: toNumber(ks.wip_cap, toNumber(node.data?.wipCap ?? node.data?.wipLimit, 0)),
            shortageRisk: Boolean(ks.below_rop || ks.below_safety_stock || (toNumber(ks.time_to_stockout, 999) <= 8)),
            processingState: ks.production_without_kanban ? 'blocked' : 'processing',
            fifoViolation: Boolean(ks.fifo_violation),
            belowRop: Boolean(ks.below_rop),
            belowSafety: Boolean(ks.below_safety_stock),
            kanbanTriggered: Boolean(ks.below_rop && (toNumber(ks.active_withdrawal_kanban, 0) > 0)),
        };
    });

    const fallbackKanbanEvents = edges
        .filter((e) => ['kanban_withdrawal', 'signal_kanban'].includes(e.data?.symbolType))
        .map((edge, idx) => ({
            id: `kb-${edge.id}-${idx}`,
            type: edge.data?.symbolType === 'kanban_withdrawal' ? 'withdrawal' : 'production',
            status: 'in_transit',
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            edgeId: edge.id,
            startTs: now,
            endTs: now + 6000,
            overdue: false,
            blocked: false,
        }));

    return {
        kanbanEvents: kanbanEvents.length ? kanbanEvents : fallbackKanbanEvents,
        alerts,
        nodeStates: nodeStates.length ? nodeStates : fallbackNodeStates,
        kanbanAnalytics,
        qtyRotationIssues: qtyRotationIssuesRaw,
        qtyRotationIssuesMeta,
    };
};

export const computeAnimationFrame = ({
    payload,
    elapsedMs,
    dedupAlertMap = new Map(),
}) => {
    const normalized = payload || { kanbanEvents: [], alerts: [], nodeStates: [] };

    const activeKanbanEvents = (normalized.kanbanEvents || []).map((evt) => {
        const start = toNumber(evt.startTs, 0);
        const end = Math.max(start + 1, toNumber(evt.endTs, start + 5000));
        const progress = clamp((elapsedMs - start) / (end - start), 0, 1);

        let status = evt.status || 'issued';
        if (evt.blocked) status = 'blocked';
        else if (evt.overdue) status = 'overdue';
        else if (progress >= 1) status = 'delivered';
        else if (progress > 0) status = 'in_transit';

        return {
            ...evt,
            progress,
            status,
            active: status !== 'consumed',
        };
    }).filter((e) => e.active);

    const nodeStateMap = {};
    (normalized.nodeStates || []).forEach((ns) => {
        const onHand = toNumber(ns.onHandQty, 0);
        const rop = toNumber(ns.rop, 0);
        const safety = toNumber(ns.safetyStock, 0);
        const maxReference = Math.max(onHand, rop, safety, 1);
        nodeStateMap[ns.nodeId] = {
            ...ns,
            onHandPercent: clamp((onHand / maxReference) * 100, 0, 100),
            ropPercent: clamp((rop / maxReference) * 100, 0, 100),
            safetyPercent: clamp((safety / maxReference) * 100, 0, 100),
        };
    });

    const mergedAlerts = [];
    for (const alert of (normalized.alerts || [])) {
        const key = `${alert.alertId || alert.ruleCode || alert.rule_code}:${alert.nodeId || alert.entity_id || 'global'}`;
        const existing = dedupAlertMap.get(key);
        if (existing) {
            existing.count = toNumber(existing.count, 1) + 1;
            existing.updatedAt = elapsedMs;
            existing.message = alert.message || existing.message;
            mergedAlerts.push(existing);
            continue;
        }

        const createdAt = toNumber(alert.createdAt || alert.timestamp, elapsedMs);
        const acknowledgedAt = toNumber(alert.acknowledgedAt, null);
        const resolvedAt = toNumber(alert.resolvedAt, null);
        const status = alert.status || (resolvedAt ? 'resolved' : (acknowledgedAt ? 'acknowledged' : 'active'));

        const item = {
            ...alert,
            nodeId: alert.nodeId || alert.entity_id,
            severity: (alert.severity || 'info').toLowerCase(),
            ruleCode: alert.ruleCode || alert.rule_code,
            count: toNumber(alert.count, 1),
            createdAt,
            acknowledgedAt,
            resolvedAt,
            status,
            updatedAt: elapsedMs,
        };
        dedupAlertMap.set(key, item);
        mergedAlerts.push(item);
    }

    const visibleAlerts = Array.from(dedupAlertMap.values())
        .filter((a) => {
            if (a.status === 'resolved') {
                return elapsedMs - (toNumber(a.resolvedAt, elapsedMs)) <= 1200;
            }
            return true;
        })
        .sort((a, b) => toNumber(b.updatedAt, 0) - toNumber(a.updatedAt, 0));

    return {
        activeKanbanEvents,
        nodeStateMap,
        alerts: visibleAlerts,
    };
};
