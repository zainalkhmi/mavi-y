const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const ceilSafe = (value) => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.ceil(value);
};

const INVENTORY_SYMBOLS = new Set([
    'inventory',
    'buffer',
    'supermarket',
    'finished_goods',
    'raw_material',
    'safety_stock',
    'warehouse_receiving'
]);

const PROCESS_SYMBOLS = new Set(['process', 'project']);

const isInventoryNode = (node) => {
    if (!node) return false;
    if (node.type === 'inventory') return true;
    return INVENTORY_SYMBOLS.has(node.data?.symbolType);
};

const isProcessNode = (node) => {
    if (!node) return false;
    if (node.type === 'process') return true;
    return PROCESS_SYMBOLS.has(node.data?.symbolType);
};

const computeLeadTimeSeconds = (schedule = []) => {
    if (!Array.isArray(schedule) || schedule.length === 0) return 0;
    const starts = schedule.map((s) => new Date(s.start).getTime()).filter(Number.isFinite);
    const ends = schedule.map((s) => new Date(s.end).getTime()).filter(Number.isFinite);
    if (!starts.length || !ends.length) return 0;
    return Math.max(0, (Math.max(...ends) - Math.min(...starts)) / 1000);
};

export class KanbanEngine {
    constructor(nodes = [], edges = []) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeMap = new Map(nodes.map((n) => [n.id, n]));
    }

    evaluate(context = {}) {
        const now = new Date();
        const result = context.result || {};
        const wipLevels = context.wipLevels || {};

        const incomingByNode = new Map();
        const downstreamByNode = new Map();

        this.edges.forEach((edge) => {
            const transitQty = toNumber(edge?.data?.transitQty, 0);
            incomingByNode.set(edge.target, (incomingByNode.get(edge.target) || 0) + transitQty);
            if (!downstreamByNode.has(edge.source)) downstreamByNode.set(edge.source, []);
            downstreamByNode.get(edge.source).push(edge.target);
        });

        const kanbanNodeStates = {};

        this.nodes.forEach((node) => {
            const data = node.data || {};
            const onHand = toNumber(data.inventory ?? data.amount, 0);
            const incoming = toNumber(data.incomingQty, 0) + toNumber(incomingByNode.get(node.id), 0);
            const reserved = toNumber(data.reservedQty, 0);
            const blockedQc = toNumber(data.blockedQcQty, 0);
            const availableUsableQty = onHand + incoming - reserved - blockedQc;

            const consumptionRate = Math.max(0, toNumber(data.consumptionRate, toNumber(data.demandRate, 0)));
            const timeToStockout = consumptionRate > 0 ? availableUsableQty / consumptionRate : null;

            const safetyStock = Math.max(0, toNumber(data.safetyStock, 0));
            const demandForKanban = Math.max(0.0001, toNumber(data.dailyDemand, consumptionRate));
            const leadTimeDays = Math.max(0.0001, toNumber(data.kanbanLeadTime, toNumber(data.leadTime, 1)));
            const safetyFactor = Math.max(0, toNumber(data.kanbanSafetyFactor, 0.1));
            const cardCapacity = Math.max(1, toNumber(data.kanbanCardCapacity, toNumber(data.packSize, 1)));
            const yieldFactor = Math.max(0.01, toNumber(data.yield, 100) / 100);

            const reorderPoint = (demandForKanban * leadTimeDays) + safetyStock;
            const kanbanCount = ceilSafe((demandForKanban * leadTimeDays * (1 + safetyFactor)) / (cardCapacity * yieldFactor));

            const activeProductionKanban = Math.max(0, toNumber(data.activeProductionKanban, toNumber(data.productionKanbanActive, 0)));
            const activeWithdrawalKanban = Math.max(0, toNumber(data.activeWithdrawalKanban, toNumber(data.withdrawalKanbanActive, 0)));

            const fifoEnabled = Boolean(data.fifoEnabled || data.symbolType === 'fifo');
            const fifoQueueAges = Array.isArray(data.fifoQueueAges) ? data.fifoQueueAges.map((v) => toNumber(v, 0)) : [];
            const fifoViolation = fifoEnabled && fifoQueueAges.some((age, idx) => idx > 0 && age > fifoQueueAges[idx - 1]);

            const wipCap = toNumber(data.wipCap, toNumber(data.wipLimit, toNumber(data.maxCapacity, Infinity)));
            const currentWip = toNumber(wipLevels[node.id], toNumber(data.currentWip, onHand));
            const wipCapExceeded = Number.isFinite(wipCap) && currentWip > wipCap;

            const belowRop = isInventoryNode(node) && availableUsableQty < reorderPoint;
            const belowSafetyStock = isInventoryNode(node) && availableUsableQty < safetyStock;

            const openKanbanAgeHours = toNumber(data.openKanbanAgeHours, 0);
            const kanbanDueHours = Math.max(1, leadTimeDays * 24);
            const kanbanOverdue = openKanbanAgeHours > kanbanDueHours;

            const requiresActiveKanban = Boolean(data.requiresActiveKanban || data.kanbanRequired);
            const productionWithoutKanban = isProcessNode(node) && (requiresActiveKanban || activeProductionKanban >= 0) && activeProductionKanban <= 0;

            let processOutput = 0;
            if (isProcessNode(node)) {
                const capacity = Math.max(0, toNumber(data.capacity, data.ct > 0 ? (3600 / toNumber(data.ct, 1)) * Math.max(1, toNumber(data.shiftPattern, 1)) * 8 : 0));
                const upstreamInputs = this.edges
                    .filter((e) => e.target === node.id)
                    .map((e) => {
                        const srcNode = this.nodeMap.get(e.source);
                        const srcData = srcNode?.data || {};
                        return toNumber(srcData.inventory ?? srcData.amount, Infinity);
                    });
                const availableInput = upstreamInputs.length ? Math.min(...upstreamInputs) : capacity;

                const downstreamSpaces = (downstreamByNode.get(node.id) || []).map((targetId) => {
                    const target = this.nodeMap.get(targetId);
                    if (!target) return Infinity;
                    const tData = target.data || {};
                    const tMax = toNumber(tData.maxStock, toNumber(tData.maxCapacity, Infinity));
                    const tCurrent = toNumber(tData.inventory ?? tData.amount, 0);
                    return Number.isFinite(tMax) ? Math.max(0, tMax - tCurrent) : Infinity;
                });
                const downstreamSpace = downstreamSpaces.length ? Math.min(...downstreamSpaces) : Infinity;

                const kanbanLimit = activeProductionKanban > 0
                    ? activeProductionKanban * cardCapacity
                    : toNumber(data.kanbanLimit, Infinity);

                processOutput = Math.max(0, Math.min(capacity, availableInput, downstreamSpace, kanbanLimit)) * yieldFactor;
            }

            kanbanNodeStates[node.id] = {
                node_id: node.id,
                node_name: data.label || data.name || node.id,
                node_type: node.type,
                symbol_type: data.symbolType,
                available_usable_qty: availableUsableQty,
                on_hand: onHand,
                incoming,
                reserved,
                blocked_qc: blockedQc,
                consumption_rate: consumptionRate,
                time_to_stockout: timeToStockout,
                reorder_point: reorderPoint,
                safety_stock: safetyStock,
                kanban_count: kanbanCount,
                active_production_kanban: activeProductionKanban,
                active_withdrawal_kanban: activeWithdrawalKanban,
                below_rop: belowRop,
                below_safety_stock: belowSafetyStock,
                fifo_violation: fifoViolation,
                fifo_enabled: fifoEnabled,
                wip_cap: Number.isFinite(wipCap) ? wipCap : null,
                current_wip: currentWip,
                wip_cap_exceeded: wipCapExceeded,
                kanban_overdue: kanbanOverdue,
                production_without_kanban: productionWithoutKanban,
                process_output: processOutput,
                no_active_kanban_below_rop: belowRop && activeWithdrawalKanban <= 0,
                evaluated_at: now.toISOString()
            };
        });

        const shortagePropagation = this.propagateShortageRisk(kanbanNodeStates, downstreamByNode);
        return { kanbanNodeStates, shortagePropagation };
    }

    propagateShortageRisk(kanbanNodeStates, downstreamByNode) {
        const riskMap = {};
        const queue = [];

        Object.values(kanbanNodeStates).forEach((state) => {
            const risky = state.below_rop || state.below_safety_stock || (state.time_to_stockout !== null && state.time_to_stockout <= 0);
            if (risky) {
                riskMap[state.node_id] = { shortage_risk: true, source: state.node_id, depth: 0 };
                queue.push({ nodeId: state.node_id, source: state.node_id, depth: 0 });
            }
        });

        while (queue.length > 0) {
            const current = queue.shift();
            const downstream = downstreamByNode.get(current.nodeId) || [];
            downstream.forEach((nextId) => {
                if (riskMap[nextId]) return;
                riskMap[nextId] = { shortage_risk: true, source: current.source, depth: current.depth + 1 };
                queue.push({ nodeId: nextId, source: current.source, depth: current.depth + 1 });
            });
        }

        return riskMap;
    }

    buildSummary({ result = {}, kanbanNodeStates = {}, alerts = [], shortagePropagation = {} } = {}) {
        const processStates = Object.values(kanbanNodeStates).filter((s) => s.node_type === 'process' || s.symbol_type === 'process' || s.symbol_type === 'project');
        const bottleneck = processStates.sort((a, b) => (b.current_wip - (b.wip_cap || Infinity)) - (a.current_wip - (a.wip_cap || Infinity)))[0];
        const throughput = processStates.length
            ? Math.min(...processStates.map((p) => toNumber(p.process_output, Infinity)).filter(Number.isFinite))
            : toNumber(result.fulfilledQuantity, 0);

        const stockoutIncidentNodes = Object.values(kanbanNodeStates)
            .filter((s) => s.time_to_stockout !== null && s.time_to_stockout <= 0)
            .map((s) => s.node_id);
        const stockoutIncidents = stockoutIncidentNodes.length;
        const adherenceViolations = Object.values(kanbanNodeStates).filter((s) => s.production_without_kanban || s.wip_cap_exceeded || s.fifo_violation || s.kanban_overdue || s.no_active_kanban_below_rop).length;
        const totalKanbanRelevant = Math.max(1, Object.keys(kanbanNodeStates).length);
        const kanbanAdherence = Math.max(0, 100 - ((adherenceViolations / totalKanbanRelevant) * 100));

        return {
            bottleneck: bottleneck ? bottleneck.node_name : null,
            throughput,
            lead_time_seconds: computeLeadTimeSeconds(result.schedule || []),
            stockout_incidents: stockoutIncidents,
            stockout_incident_nodes: stockoutIncidentNodes,
            stockout_incident_mode: 'unique-node-per-evaluation',
            shortage_propagation_nodes: Object.keys(shortagePropagation).length,
            kanban_adherence: Number(kanbanAdherence.toFixed(2)),
            alert_count: alerts.length
        };
    }
}
