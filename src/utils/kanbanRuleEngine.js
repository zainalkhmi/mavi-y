const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const dedupeKey = (alert) => `${alert.rule_code}:${alert.entity_id}`;

const createAlert = ({ severity, rule_code, entity_id, message, suggested_actions = [], sla_minutes = 60 }) => ({
    severity,
    rule_code,
    entity_id,
    message,
    suggested_actions,
    sla_minutes,
    timestamp: new Date().toISOString()
});

export class KanbanRuleEngine {
    constructor({ cooldownMs = 120000 } = {}) {
        this.cooldownMs = cooldownMs;
        this.lastAlertMap = new Map();
    }

    evaluate(kanbanNodeStates = {}) {
        const now = Date.now();
        const rawAlerts = [];

        Object.values(kanbanNodeStates).forEach((state) => {
            const name = state.node_name || state.node_id;
            const tts = state.time_to_stockout;

            if (state.below_rop) {
                rawAlerts.push(createAlert({
                    severity: 'warning',
                    rule_code: 'TPS_BELOW_ROP',
                    entity_id: state.node_id,
                    message: `${name} below reorder point (${toNumber(state.available_usable_qty)} < ${toNumber(state.reorder_point)}).`,
                    suggested_actions: ['Issue withdrawal kanban', 'Verify inbound replenishment', 'Review demand spikes'],
                    sla_minutes: 120
                }));
            }

            if (state.below_safety_stock) {
                rawAlerts.push(createAlert({
                    severity: 'critical',
                    rule_code: 'TPS_BELOW_SAFETY_STOCK',
                    entity_id: state.node_id,
                    message: `${name} below safety stock (${toNumber(state.available_usable_qty)} < ${toNumber(state.safety_stock)}).`,
                    suggested_actions: ['Escalate to supervisor', 'Expedite replenishment', 'Activate contingency source'],
                    sla_minutes: 60
                }));
            }

            if (state.no_active_kanban_below_rop) {
                rawAlerts.push(createAlert({
                    severity: 'critical',
                    rule_code: 'TPS_NO_ACTIVE_KANBAN_BELOW_ROP',
                    entity_id: state.node_id,
                    message: `${name} below ROP without active withdrawal kanban.`,
                    suggested_actions: ['Create withdrawal kanban now', 'Validate kanban loop ownership', 'Audit kanban board sync'],
                    sla_minutes: 30
                }));
            }

            if (tts !== null && Number.isFinite(tts)) {
                if (tts <= 2) {
                    rawAlerts.push(createAlert({
                        severity: 'andon',
                        rule_code: 'TPS_STOCKOUT_TIME_ANDON',
                        entity_id: state.node_id,
                        message: `${name} predicted stockout within ${tts.toFixed(2)} time units (ANDON).`,
                        suggested_actions: ['Trigger andon response', 'Freeze non-priority consumption', 'Emergency replenishment'],
                        sla_minutes: 15
                    }));
                } else if (tts <= 8) {
                    rawAlerts.push(createAlert({
                        severity: 'critical',
                        rule_code: 'TPS_STOCKOUT_TIME_CRITICAL',
                        entity_id: state.node_id,
                        message: `${name} predicted stockout within ${tts.toFixed(2)} time units.`,
                        suggested_actions: ['Pull in replenishment', 'Re-prioritize production sequence'],
                        sla_minutes: 30
                    }));
                } else if (tts <= 24) {
                    rawAlerts.push(createAlert({
                        severity: 'warning',
                        rule_code: 'TPS_STOCKOUT_TIME_WARNING',
                        entity_id: state.node_id,
                        message: `${name} predicted stockout within ${tts.toFixed(2)} time units.`,
                        suggested_actions: ['Review incoming pipeline', 'Tune kanban card release'],
                        sla_minutes: 120
                    }));
                }
            }

            if (state.fifo_violation) {
                rawAlerts.push(createAlert({
                    severity: 'warning',
                    rule_code: 'TPS_FIFO_VIOLATION',
                    entity_id: state.node_id,
                    message: `${name} FIFO lane sequence violation detected.`,
                    suggested_actions: ['Re-sequence FIFO lane', 'Block out-of-order withdrawal'],
                    sla_minutes: 90
                }));
            }

            if (state.wip_cap_exceeded) {
                rawAlerts.push(createAlert({
                    severity: 'critical',
                    rule_code: 'TPS_WIP_CAP_EXCEEDED',
                    entity_id: state.node_id,
                    message: `${name} WIP cap exceeded (${toNumber(state.current_wip)} > ${toNumber(state.wip_cap)}).`,
                    suggested_actions: ['Stop upstream feed', 'Clear blocked downstream', 'Re-balance workload'],
                    sla_minutes: 45
                }));
            }

            if (state.kanban_overdue) {
                rawAlerts.push(createAlert({
                    severity: 'warning',
                    rule_code: 'TPS_KANBAN_OVERDUE',
                    entity_id: state.node_id,
                    message: `${name} has overdue/stuck kanban cards.`,
                    suggested_actions: ['Close stale kanban', 'Re-issue card with new ETA', 'Check handoff ownership'],
                    sla_minutes: 120
                }));
            }

            if (state.production_without_kanban) {
                rawAlerts.push(createAlert({
                    severity: 'critical',
                    rule_code: 'TPS_PRODUCTION_WITHOUT_KANBAN',
                    entity_id: state.node_id,
                    message: `${name} output detected without active production kanban.`,
                    suggested_actions: ['Stop unauthorized production', 'Issue production kanban', 'Perform root cause analysis'],
                    sla_minutes: 20
                }));
            }
        });

        const deduped = [];
        const inBatch = new Set();

        rawAlerts.forEach((alert) => {
            const key = dedupeKey(alert);
            if (inBatch.has(key)) return;

            const lastTs = this.lastAlertMap.get(key) || 0;
            if (now - lastTs < this.cooldownMs) return;

            inBatch.add(key);
            this.lastAlertMap.set(key, now);
            deduped.push(alert);
        });

        return deduped;
    }
}
