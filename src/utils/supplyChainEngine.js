/**
 * Supply Chain Engine (CTP - Capable to Promise)
 * Implements recursive logic: Demand -> Operation -> Capacity/Material -> Buffer -> Replenishment
 */

import { KanbanEngine } from './kanbanEngine';
import { KanbanRuleEngine } from './kanbanRuleEngine';

// Native Date Helpers (replacing date-fns to avoid dependency)
const addDays = (date, days) => {
    return new Date(new Date(date).getTime() + days * 86400000);
};

const subDays = (date, days) => {
    return new Date(new Date(date).getTime() - days * 86400000);
};

const isBefore = (date1, date2) => {
    return new Date(date1) < new Date(date2);
};

const formatDateTime = (date) => {
    const d = new Date(date);
    return d.toLocaleString('en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    }).replace(',', '');
};

const formatDate = (date) => formatDateTime(date);

export class SupplyChainEngine {
    constructor(nodes, edges) {
        this.nodes = nodes;
        this.edges = edges;
        this.nodeMap = new Map(nodes.map(n => [n.id, n]));
        this.edgeMap = new Map(edges.map(e => [e.id, e]));

        // Simulation State (Tentative bookings)
        this.simulationLog = [];
        this.tentativeStock = new Map(); // nodeId -> remaining stock
        this.tentativeCapacity = new Map(); // nodeId -> date -> used time (seconds)
        this.shortageMap = new Map(); // nodeId -> shortage amount

        // Recursion Guard
        this.activePath = new Set();

        // Cost Tracking
        this.costBreakdown = {
            production: 0,
            inventory: 0,
            transportation: 0,
            taxes: 0,
            duties: 0,
            fees: 0,
            wip: 0,
            foh: 0,
            directMaterial: 0,
            directLabor: 0,
            machine: 0,
            qualityLoss: 0,
            valueAddedCost: 0,
            nonValueAddedCost: 0,
            directCost: 0,
            indirectCost: 0,
            total: 0
        };

        // WIP Tracking
        this.wipLevels = new Map(); // nodeId -> current WIP quantity
        this.wipViolations = []; // Array of {nodeId, limit, actual}

        // Schedule Tracking
        this.schedule = []; // Array of {nodeId, label, start, end, type}

        // Mixed-Model Data
        this.productMix = new Map(); // productId -> weight (0-1)

        // Risk Data
        this.riskNodes = []; // Array of {nodeId, type, severity, message}
    }

    log(message, level = 'info') {
        this.simulationLog.push({ timestamp: new Date(), message, level });
        console.log(`[SCE-${level}] ${message}`);
    }

    /**
     * Start the simulation for a specific demand
     * @param {string} endNodeId - The Customer or End Node
     * @param {number} quantity - Demand quantity
     * @param {Date} dueDate - Requested delivery date
     */
    simulate(endNodeId, quantity, dueDate) {
        this.log(`Starting Simulation: Demand ${quantity} @ ${formatDate(dueDate)} for Node ${endNodeId}`);

        // Initialize tentative state (support both 'inventory' and 'amount' fields)
        this.nodes.forEach(n => {
            if (n.data) {
                const initialStock = parseInt(n.data.inventory) || parseInt(n.data.amount) || 0;
                if (initialStock > 0 || n.type === 'inventory' || n.data.symbolType === 'warehouse_receiving') {
                    this.tentativeStock.set(n.id, initialStock);
                }
            }
        });

        const result = this.checkOperation(endNodeId, quantity, dueDate);

        // Collect Node Status
        const nodeStatus = {};
        this.nodes.forEach(n => {
            const initial = parseInt(n.data?.inventory) || parseInt(n.data?.amount) || 0;
            nodeStatus[n.id] = {
                initial: initial,
                final: this.tentativeStock.get(n.id) !== undefined ? this.tentativeStock.get(n.id) : initial,
                shortage: this.shortageMap.get(n.id) || 0
            };
        });

        // Cost Control (Cost Accounting):
        // Direct Cost = Process/Production + Transportation + Taxes + Duties + Fees
        // Indirect Cost = Inventory + WIP + FOH
        this.costBreakdown.directCost =
            this.costBreakdown.directMaterial +
            this.costBreakdown.directLabor +
            this.costBreakdown.machine +
            this.costBreakdown.transportation +
            this.costBreakdown.taxes +
            this.costBreakdown.duties +
            this.costBreakdown.fees;

        this.costBreakdown.indirectCost =
            this.costBreakdown.inventory +
            this.costBreakdown.wip +
            this.costBreakdown.foh +
            this.costBreakdown.qualityLoss;

        this.costBreakdown.total = this.costBreakdown.directCost + this.costBreakdown.indirectCost;

        // VA vs NVA Cost Calculation
        this.costBreakdown.valueAddedCost = this.costBreakdown.directLabor + this.costBreakdown.machine;
        this.costBreakdown.nonValueAddedCost =
            this.costBreakdown.inventory +
            this.costBreakdown.wip +
            this.costBreakdown.transportation +
            this.costBreakdown.qualityLoss +
            this.costBreakdown.taxes +
            this.costBreakdown.duties +
            this.costBreakdown.fees;

        // BOTTLENECK SHORTAGE ANALYSIS
        // Calculate shortage based on Takt Time vs Cycle Time
        this.nodes.forEach(n => {
            // Only analyze process nodes
            if (n.type === 'process' || n.data?.symbolType === 'process') {
                let cycleTime = 0;
                if (n.data?.ct) cycleTime = parseFloat(n.data.ct);
                else if (n.data?.cycleTime) cycleTime = parseFloat(n.data.cycleTime);

                const taktTime = parseFloat(n.data?.globalTakt) || 0;

                // If cycle time exceeds takt time, this is a bottleneck
                if (cycleTime > 0 && taktTime > 0 && cycleTime > taktTime) {
                    // Calculate how much shortage this bottleneck creates
                    // Capacity ratio: how much can actually be produced vs demanded
                    const capacityRatio = taktTime / cycleTime;
                    const bottleneckShortage = Math.ceil(quantity * (1 - capacityRatio));

                    // Add to existing shortage (if any from material issues)
                    const existingShortage = this.shortageMap.get(n.id) || 0;
                    const totalShortage = existingShortage + bottleneckShortage;

                    this.shortageMap.set(n.id, totalShortage);
                    this.log(`[BOTTLENECK] ${n.data?.label || n.id}: CT=${cycleTime}s > Takt=${taktTime}s. Shortage: ${bottleneckShortage} units`, 'warn');

                    // Update nodeStatus
                    if (nodeStatus[n.id]) {
                        nodeStatus[n.id].shortage = totalShortage;
                    }
                }
            }
        });

        // ENSURE ALL NODES HAVE SCHEDULE ENTRIES
        // Fill in missing schedule entries for nodes that weren't processed
        const processedNodeIds = new Set(this.schedule.map(s => s.nodeId));

        this.nodes.forEach(n => {
            if (!processedNodeIds.has(n.id)) {
                // This node wasn't processed - add a schedule entry based on backward scheduling
                let cycleTime = 0;
                if (n.data?.ct) cycleTime = parseFloat(n.data.ct);
                else if (n.data?.cycleTime) cycleTime = parseFloat(n.data.cycleTime);
                else if (n.data?.time) cycleTime = parseFloat(n.data.time);
                else if (n.data?.processingTime) cycleTime = parseFloat(n.data.processingTime) * 3600;

                const taktTime = parseFloat(n.data?.globalTakt) || 0;

                // Calculate process duration
                let processTimeSeconds = 0;
                if (n.type === 'process' || n.data?.symbolType === 'process') {
                    processTimeSeconds = cycleTime * quantity;
                } else {
                    // For inventory/buffer, use minimal time
                    processTimeSeconds = taktTime * quantity || 3600; // 1 hour default
                }

                const processTimeDays = processTimeSeconds / 86400;
                const processEnd = dueDate;
                const processStart = subDays(dueDate, processTimeDays);

                this.schedule.push({
                    nodeId: n.id,
                    label: n.data?.label || n.data?.name || n.id,
                    start: processStart,
                    end: processEnd,
                    type: n.type === 'supplier' ? 'supplier' : (n.type === 'process' || n.data?.symbolType === 'process' ? 'process' : 'inventory'),
                    quantity,
                    notProcessed: true // Mark as not actually processed in simulation
                });
            }
        });

        const kanbanEngine = new KanbanEngine(this.nodes, this.edges);
        const { kanbanNodeStates, shortagePropagation } = kanbanEngine.evaluate({
            result,
            wipLevels: Object.fromEntries(this.wipLevels)
        });
        const kanbanRuleEngine = new KanbanRuleEngine();
        const alerts = kanbanRuleEngine.evaluate(kanbanNodeStates);
        const vsmSummary = kanbanEngine.buildSummary({
            result,
            kanbanNodeStates,
            alerts,
            shortagePropagation
        });

        const stockoutIncidentNodes = Array.isArray(vsmSummary?.stockout_incident_nodes)
            ? vsmSummary.stockout_incident_nodes
            : [];
        const stockoutIncidentEvents = stockoutIncidentNodes.map((nodeId) => ({
            nodeId,
            mode: vsmSummary?.stockout_incident_mode || 'unique-node-per-evaluation',
            evaluatedAt: new Date().toISOString(),
        }));

        const allKanbanStates = Object.values(kanbanNodeStates || {});
        const adherenceViolations = allKanbanStates.filter((s) => (
            s.production_without_kanban
            || s.wip_cap_exceeded
            || s.fifo_violation
            || s.kanban_overdue
            || s.no_active_kanban_below_rop
        )).length;
        const totalKanbanRelevant = Math.max(1, allKanbanStates.length);
        const overdueStuckCount = allKanbanStates.filter((s) => Boolean(s.kanban_overdue)).length;

        const kanbanAnalytics = {
            kanbanAdherence: Number(vsmSummary?.kanban_adherence ?? 0),
            adherenceNumerator: adherenceViolations,
            adherenceDenominator: totalKanbanRelevant,
            stockoutIncidents: Number(vsmSummary?.stockout_incidents ?? stockoutIncidentNodes.length),
            stockoutIncidentNodes,
            stockoutIncidentEvents,
            stockoutIncidentMode: vsmSummary?.stockout_incident_mode || 'unique-node-per-evaluation',
            overdueStuckCount,
        };

        const qtyRotationIssues = [];
        allKanbanStates.forEach((s) => {
            if (s.fifo_violation) {
                qtyRotationIssues.push({
                    type: 'fifo_violation',
                    nodeId: s.node_id,
                    message: `${s.node_name || s.node_id} has FIFO sequence anomaly.`,
                });
            }
            if (s.wip_cap_exceeded) {
                qtyRotationIssues.push({
                    type: 'wip_cap_exceeded',
                    nodeId: s.node_id,
                    message: `${s.node_name || s.node_id} exceeds WIP cap (${s.current_wip} > ${s.wip_cap}).`,
                });
            }
            if (s.no_active_kanban_below_rop) {
                qtyRotationIssues.push({
                    type: 'no_active_kanban_below_rop',
                    nodeId: s.node_id,
                    message: `${s.node_name || s.node_id} is below ROP without active withdrawal kanban.`,
                });
            }
        });
        const qtyRotationIssuesMeta = {
            enabled: true,
            reason: null,
            analyzer: 'kanban-node-state-heuristics',
        };

        return {
            success: result.feasible,
            fulfilledQuantity: result.fulfilled,
            logs: this.simulationLog,
            schedule: this.schedule, // New: end-to-end schedule
            rootCause: result.reason,
            nodeStatus, // { nodeId: { initial, final, shortage } }
            costBreakdown: this.costBreakdown,
            wipLevels: Object.fromEntries(this.wipLevels),
            wipViolations: this.wipViolations,
            riskNodes: this.riskNodes,
            kanbanNodeStates,
            shortagePropagation,
            alerts,
            vsmSummary,
            kanbanAnalytics,
            qtyRotationIssues,
            qtyRotationIssuesMeta
        };

    }

    /**
     * Mixed-Model: Set the product mix weights
     * @param {Object} mix - { productId: weight }
     */
    setProductMix(mix) {
        this.productMix = new Map(Object.entries(mix));
        this.log(`Product Mix Updated: ${JSON.stringify(mix)}`);
    }

    /**
     * Run Risk Analysis on the network
     */
    runRiskAnalysis() {
        this.nodes.forEach(n => {
            const inputEdges = this.edges.filter(e => e.target === n.id);
            const symbolType = n.data?.symbolType;

            // 1. Single Point of Failure (Single Supplier)
            if ((n.type === 'process' || symbolType === 'process') && inputEdges.length === 1) {
                const source = this.nodeMap.get(inputEdges[0].source);
                if (source && (source.type === 'supplier' || source.data?.symbolType === 'supplier')) {
                    this.riskNodes.push({
                        nodeId: n.id,
                        type: 'Single Supplier',
                        severity: 'medium',
                        message: `${n.data?.label || n.id} depends on a single supplier.`
                    });
                }
            }

            // 2. High Utilization / Bottleneck Potential
            const takt = parseFloat(n.data?.globalTakt) || 0;
            const ct = parseFloat(n.data?.weightedCT || n.data?.ct || n.data?.cycleTime) || 0;
            if (takt > 0 && ct > takt * 0.9) {
                this.riskNodes.push({
                    nodeId: n.id,
                    type: 'Capacity Risk',
                    severity: ct > takt ? 'high' : 'medium',
                    message: `High utilization risk at ${n.data?.label || n.id}. ${ct > takt ? 'Bottleneck detected.' : 'Near capacity limit.'}`
                });
            }

            // 3. Mixed Model Complexity Risk
            const variants = n.data?.variants || [];
            if (variants.length > 5) {
                this.riskNodes.push({
                    nodeId: n.id,
                    type: 'Complexity Risk',
                    severity: 'low',
                    message: `${n.data?.label || n.id} handles ${variants.length} product variants. High changeover risk.`
                });
            }
        });
    }

    /**
     * (*) Operation Check
     * Checks Lead Time, Capacity, and Materials
     */
    checkOperation(nodeId, quantity, dueDate) {
        if (this.activePath.has(nodeId)) {
            const node = this.nodeMap.get(nodeId);
            const nodeName = node?.data?.label || node?.data?.name || nodeId;
            this.log(`Circular Dependency Detected: ${nodeName} is already being processed in this branch!`, 'error');
            return { feasible: false, fulfilled: 0, reason: `Circular Dependency at ${nodeName}` };
        }

        const node = this.nodeMap.get(nodeId);
        if (!node) return { feasible: false, fulfilled: 0, reason: `Node ${nodeId} not found` };

        const nodeName = node.data.label || node.data.name || node.id;
        this.log(`Checking Operation: ${nodeName} (Req: ${quantity} by ${formatDate(dueDate)})`);

        // Add to active path for cycle detection
        this.activePath.add(nodeId);

        try {
            // 1. Lead Time Constraint
            const isTransport = ['truck', 'sea', 'air'].includes(node.data.symbolType);

            // For transport, cycleTime is total trip time. For process, it's time per unit.
            const shiftPattern = parseInt(node.data.shiftPattern) || 1;
            const availableSecPerDay = 28800 * shiftPattern; // 8h * shifts

            // Normalize Cycle Time / Lead Time inputs from different node types
            // Process: data.ct (seconds)
            // Inventory: data.time (seconds)
            // Warehouse: data.processingTime (hours) -> convert to seconds
            // Logistics: data.leadTime (days) or data.cycleTime (seconds)

            let nodeCycleTime = 0;
            const variants = node.data.variants || [];
            if (variants.length > 0) {
                // Weighted Cycle Time for Mixed Model
                const totalRatio = variants.reduce((sum, v) => sum + (parseFloat(v.ratio) || 0), 0) || 1;
                nodeCycleTime = variants.reduce((sum, v) => sum + (Number(v.ct || 0) * (Number(v.ratio || 0) / totalRatio)), 0);
                this.log(`[MIXED MODEL] ${nodeName}: Using weighted CT ${nodeCycleTime.toFixed(2)}s from ${variants.length} variants.`);
            } else {
                if (node.data.mt) nodeCycleTime = parseFloat(node.data.mt);
                else if (node.data.ct) nodeCycleTime = parseFloat(node.data.ct);
                else if (node.data.time) nodeCycleTime = parseFloat(node.data.time);
                else if (node.data.processingTime) nodeCycleTime = parseFloat(node.data.processingTime) * 3600;
                else if (node.data.cycleTime) nodeCycleTime = parseFloat(node.data.cycleTime);
            }

            const nodeLeadTimeSeconds = parseFloat(node.data.leadTime) * 28800; // Lead time in days (work days)

            const leadTimeSeconds = isTransport
                ? (nodeCycleTime || nodeLeadTimeSeconds || 0)
                : (nodeCycleTime || 0) * quantity;

            // Lead Time Days calculation (fractional for time precision)
            const leadTimeFractionalDays = leadTimeSeconds / availableSecPerDay;
            const startDate = new Date(dueDate.getTime() - leadTimeFractionalDays * 86400000);

            if (isBefore(startDate, new Date())) {
                this.log(`Lead Time Violation: Need to start by ${formatDate(startDate)} which is in past!`, 'error');

                // Add to schedule even if failed
                let actualStart = startDate;
                let actualEnd = dueDate;
                if (!isTransport && (node.type === 'process' || node.data?.symbolType === 'process')) {
                    const processTimeSeconds = nodeCycleTime * quantity;
                    const processTimeDays = processTimeSeconds / 86400;
                    actualStart = subDays(dueDate, processTimeDays);
                    actualEnd = dueDate;
                }
                this.schedule.push({
                    nodeId,
                    label: nodeName,
                    start: actualStart,
                    end: actualEnd,
                    type: isTransport ? 'logistic' : (node.type === 'supplier' ? 'supplier' : 'process'),
                    quantity,
                    failed: true
                });

                return { feasible: false, fulfilled: 0, reason: 'Lead Time Constraint Violated' };
            }

            // 2. Capacity Check
            const capacityCheck = this.checkCapacity(node, quantity, startDate);
            if (!capacityCheck.feasible) {
                // Add to schedule even if failed
                let actualStart = startDate;
                let actualEnd = dueDate;
                if (!isTransport && (node.type === 'process' || node.data?.symbolType === 'process')) {
                    const processTimeSeconds = nodeCycleTime * quantity;
                    const processTimeDays = processTimeSeconds / 86400;
                    actualStart = subDays(dueDate, processTimeDays);
                    actualEnd = dueDate;
                }
                this.schedule.push({
                    nodeId,
                    label: nodeName,
                    start: actualStart,
                    end: actualEnd,
                    type: isTransport ? 'logistic' : (node.type === 'supplier' ? 'supplier' : 'process'),
                    quantity,
                    failed: true
                });

                return { feasible: false, fulfilled: 0, reason: `Capacity Shortage at ${nodeName}` };
            }

            // 3. Material Check
            const inputEdges = this.edges.filter(e => e.target === nodeId);
            let feasibleMaterial = true;
            let minFulfilled = quantity;

            if (inputEdges.length === 0) {
                if (node.type === 'supplier' || node.data.type === 'supplier' || node.data.symbolType === 'supplier') {
                    this.log(`Supplier Reached: ${nodeName}. Infinite capacity assumed.`, 'success');

                    // Add to schedule before returning
                    this.schedule.push({
                        nodeId,
                        label: nodeName,
                        start: startDate,
                        end: dueDate,
                        type: 'supplier',
                        quantity
                    });

                    return { feasible: true, fulfilled: quantity };
                }
            }

            for (const edge of inputEdges) {
                const bufferNode = this.nodeMap.get(edge.source);

                // If edge has transport time, subtract it from needed date for the upstream
                const edgeTransportDays = parseFloat(edge.data?.transportTime) || 0;
                const upstreamDueDate = subDays(startDate, edgeTransportDays);

                if (edgeTransportDays > 0) {
                    this.log(`[LOGISTIC] Edge Transport from ${bufferNode?.data?.label || edge.source}: ${edgeTransportDays} days. Upstream Due: ${formatDate(upstreamDueDate)}`);
                    this.schedule.push({
                        nodeId: `edge-${edge.id}`,
                        label: `Transport (${bufferNode?.data?.label || edge.source} -> ${nodeName})`,
                        start: upstreamDueDate,
                        end: startDate,
                        type: 'logistic',
                        quantity
                    });
                }

                const bufferResult = this.checkBuffer(bufferNode, quantity, upstreamDueDate);

                if (!bufferResult || !bufferResult.feasible) {
                    const fulfilled = bufferResult ? bufferResult.fulfilled : 0;
                    const bName = bufferNode?.data?.label || bufferNode?.data?.name || bufferNode?.id || 'Unknown';
                    this.log(`Material Shortage from ${bName}`, 'warn');

                    // Add to schedule even if failed, so timeline shows what was attempted
                    let actualStart = startDate;
                    let actualEnd = dueDate;
                    if (!isTransport && (node.type === 'process' || node.data?.symbolType === 'process')) {
                        const processTimeSeconds = nodeCycleTime * quantity;
                        const processTimeDays = processTimeSeconds / 86400;
                        actualStart = subDays(dueDate, processTimeDays);
                        actualEnd = dueDate;
                    }
                    this.schedule.push({
                        nodeId,
                        label: nodeName,
                        start: actualStart,
                        end: actualEnd,
                        type: isTransport ? 'logistic' : (node.type === 'supplier' ? 'supplier' : 'process'),
                        quantity,
                        failed: true // Mark as failed operation
                    });

                    return { feasible: false, fulfilled: fulfilled, reason: `Material Missing: ${bName}` };
                }
            }

            this.log(`Operation ${nodeName} Feasible! Committing plan.`);
            this.bookCapacity(node, quantity, startDate);

            // --- ADVANCED COSTING (Landed Cost) ---
            let productionCost = 0;

            if (isTransport) {
                // Trip-based and Distance-based Logistics Cost
                const unitPrice = parseFloat(node.data.unitPrice) || 0;
                const distance = parseFloat(node.data.distance) || 0;
                const costPerKm = parseFloat(node.data.costPerKm) || 0;
                const fixedTripCost = parseFloat(node.data.fixedTripCost) || 0;
                const taxRate = parseFloat(node.data.taxes || node.data.taxRate) || 0;
                const dutyRate = parseFloat(node.data.dutyRate || node.data.duties) || 0;
                const insuranceRate = parseFloat(node.data.insuranceRate) || 0;
                const portFees = parseFloat(node.data.portFees) || 0;

                const baseValue = unitPrice * quantity;
                const distanceCost = distance * costPerKm;
                const variableTransportCost = (parseFloat(node.data.costPerUnit) || 0) * quantity;

                const baseTransportCost = variableTransportCost + fixedTripCost + distanceCost;
                const taxes = (baseValue + baseTransportCost) * (taxRate / 100);
                const duties = (baseValue + baseTransportCost) * (dutyRate / 100);
                const insurance = (baseValue + baseTransportCost) * (insuranceRate / 100);

                this.costBreakdown.transportation += baseTransportCost;
                this.costBreakdown.taxes += taxes;
                this.costBreakdown.duties += duties;
                this.costBreakdown.fees += portFees + insurance;

                productionCost = baseTransportCost + taxes + duties + insurance + portFees;
                this.log(`[LANDED COST] ${nodeName}: Base=$${baseTransportCost.toFixed(2)}, Tax=$${taxes.toFixed(2)}, Duty=$${duties.toFixed(2)}, Ins/Fees=$${(insurance + portFees).toFixed(2)}`);
            } else {
                // Process Node Cost
                const unitCost = parseFloat(node.data.costPerUnit || node.data.operatingCost) || 0;

                // Professional Accounting Breakdown
                const materialCost = (parseFloat(node.data.directMaterialCost) || 0) * quantity;
                const laborCost = (parseFloat(node.data.directLaborCost) || 0) * quantity;
                const machineCost = (parseFloat(node.data.machineCost) || 0) * quantity;
                const fohPerUnit = parseFloat(node.data.fohPerUnit) || 0;
                const nodeFoh = fohPerUnit * quantity;

                // If specialized costs are provided, they override the generic production cost
                if (materialCost > 0 || laborCost > 0 || machineCost > 0) {
                    productionCost = materialCost + laborCost + machineCost;
                } else {
                    productionCost = unitCost * quantity;
                    // Fallback to simple labor/machine split if not specified (50/50 for example, but better to keep empty)
                }

                this.costBreakdown.production += productionCost;
                this.costBreakdown.directMaterial += materialCost;
                this.costBreakdown.directLabor += laborCost;
                this.costBreakdown.machine += machineCost;
                this.costBreakdown.foh += nodeFoh;

                // Quality Loss (COPQ) calculation
                const yieldRate = parseFloat(node.data.yield) || 100;
                if (yieldRate < 100) {
                    const scrapQuantity = quantity * ((100 - yieldRate) / 100);
                    const costPerUnit = (materialCost + laborCost + machineCost + nodeFoh) / quantity;
                    const scrapCost = scrapQuantity * costPerUnit;
                    this.costBreakdown.qualityLoss += scrapCost;
                    this.log(`[QUALITY LOSS] ${nodeName}: Yield ${yieldRate}%. Loss cost for ${scrapQuantity.toFixed(2)} units: $${scrapCost.toFixed(2)}`, 'warn');
                }
            }

            if (productionCost > 0) {
                this.log(`[COST] Total node cost at ${nodeName}: $${productionCost.toFixed(2)}`);
            }

            this.trackWIP(nodeId, quantity);

            // Record in schedule with ACTUAL execution times
            let actualStart = startDate;
            let actualEnd = dueDate;

            // For process nodes, calculate actual execution time based on cycle time
            if (!isTransport && (node.type === 'process' || node.data?.symbolType === 'process')) {
                // Process finishes at dueDate, starts based on cycle time
                const processTimeSeconds = nodeCycleTime * quantity;
                const processTimeDays = processTimeSeconds / 86400; // Convert to days
                actualStart = subDays(dueDate, processTimeDays);
                actualEnd = dueDate;
            }

            this.schedule.push({
                nodeId,
                label: nodeName,
                start: actualStart,
                end: actualEnd,
                type: isTransport ? 'logistic' : (node.type === 'supplier' ? 'supplier' : 'process'),
                quantity
            });

            return { feasible: true, fulfilled: quantity };
        } finally {
            // Remove from path when retreating
            this.activePath.delete(nodeId);
        }
    }

    /**
     * Check Capacity (Load -> Resource)
     */
    checkCapacity(node, quantity, date) {
        const nodeName = node.data.label || node.data.name || node.id;
        const shiftPattern = parseInt(node.data.shiftPattern) || 1;
        const baseShiftTime = 28800;
        const availableTime = baseShiftTime * shiftPattern;

        const overtimeAllowed = node.data.overtimeAllowed || false;
        const overtimeCapacity = overtimeAllowed ? baseShiftTime * 0.25 : 0;
        const totalCapacity = availableTime + overtimeCapacity;

        const isTransport = ['truck', 'sea', 'air'].includes(node.data.symbolType);
        const nodeCapacity = parseInt(node.data.capacity) || 0;

        if (isTransport && nodeCapacity > 0) {
            // Quantity-based Capacity for Logistic Nodes
            const frequency = parseInt(node.data.frequency) || 1;
            const totalDailyQtyCapacity = frequency * shiftPattern * nodeCapacity;

            const dateKey = formatDate(date);
            const used = this.tentativeCapacity.get(`${node.id}-${dateKey}-qty`) || 0;

            if ((used + quantity) > totalDailyQtyCapacity) {
                this.log(`[CAPACITY] ${nodeName} Qty Exceeded on ${dateKey}. Need ${quantity}, Available: ${totalDailyQtyCapacity} (Used: ${used})`, 'error');
                return { feasible: false, utilization: (((used + quantity) / totalDailyQtyCapacity) * 100).toFixed(1) };
            }
            return { feasible: true, utilization: (((used + quantity) / totalDailyQtyCapacity) * 100).toFixed(1) };
        }

        // Time-based Capacity for Process Nodes
        let nodeCycleTime = 0;
        if (node.data.ct) nodeCycleTime = parseFloat(node.data.ct);
        else if (node.data.time) nodeCycleTime = parseFloat(node.data.time);
        else if (node.data.processingTime) nodeCycleTime = parseFloat(node.data.processingTime) * 3600;
        else if (node.data.cycleTime) nodeCycleTime = parseFloat(node.data.cycleTime);

        const requiredTime = nodeCycleTime * quantity;
        const dateKey = formatDate(date);
        const used = this.tentativeCapacity.get(`${node.id}-${dateKey}`) || 0;

        if ((used + requiredTime) > totalCapacity) {
            this.log(`[CAPACITY] ${nodeName} Time Exceeded on ${dateKey}. Need ${requiredTime}s, Available: ${totalCapacity}s (Used: ${used}s)`, 'error');
            return { feasible: false, utilization: ((used + requiredTime) / totalCapacity * 100).toFixed(1) };
        }

        const utilization = ((used + requiredTime) / availableTime * 100).toFixed(1);
        this.log(`[CAPACITY] ${nodeName}: ${utilization}% utilization (${shiftPattern} shift${shiftPattern > 1 ? 's' : ''})`);

        return { feasible: true, utilization };
    }

    bookCapacity(node, quantity, date) {
        const isTransport = ['truck', 'sea', 'air'].includes(node.data.symbolType);
        const nodeCapacity = parseInt(node.data.capacity) || 0;
        const dateKey = formatDate(date);

        if (isTransport && nodeCapacity > 0) {
            const used = this.tentativeCapacity.get(`${node.id}-${dateKey}-qty`) || 0;
            this.tentativeCapacity.set(`${node.id}-${dateKey}-qty`, used + quantity);
        } else {
            let nodeCycleTime = 0;
            if (node.data.ct) nodeCycleTime = parseFloat(node.data.ct);
            else if (node.data.time) nodeCycleTime = parseFloat(node.data.time);
            else if (node.data.processingTime) nodeCycleTime = parseFloat(node.data.processingTime) * 3600;
            else if (node.data.cycleTime) nodeCycleTime = parseFloat(node.data.cycleTime);

            const requiredTime = nodeCycleTime * quantity;
            const used = this.tentativeCapacity.get(`${node.id}-${dateKey}`) || 0;
            this.tentativeCapacity.set(`${node.id}-${dateKey}`, used + requiredTime);
        }
    }

    /**
     * Track WIP (Work-in-Progress) levels
     */
    trackWIP(nodeId, quantity) {
        const node = this.nodeMap.get(nodeId);
        if (!node) return;

        const nodeName = node.data.label || node.data.name || node.id;
        const currentWIP = this.wipLevels.get(nodeId) || 0;
        const newWIP = currentWIP + quantity;
        const wipLimit = parseInt(node.data.wipLimit) || Infinity;

        this.wipLevels.set(nodeId, newWIP);

        if (wipLimit < Infinity && newWIP > wipLimit) {
            this.log(`[WIP] Limit exceeded at ${nodeName}: ${newWIP} > ${wipLimit}`, 'warn');
            this.wipViolations.push({
                nodeId,
                nodeName,
                limit: wipLimit,
                actual: newWIP,
                excess: newWIP - wipLimit
            });
        }

        const wipHoldingCost = (parseFloat(node.data.holdingCostPerDay) || 0) * quantity;
        this.costBreakdown.wip += wipHoldingCost;

        if (wipHoldingCost > 0) {
            this.log(`[COST] WIP holding cost: $${wipHoldingCost.toFixed(2)}`);
        }
    }

    /**
     * Check Buffer (Inventory -> Replenishment)
     */
    checkBuffer(node, quantity, neededDate) {
        const nodeName = node.data.label || node.data.name || node.id;
        this.log(`[INVENTORY] Checking Buffer: ${nodeName} for ${quantity}`);

        const safetyStock = parseInt(node.data.safetyStock) || 0;
        const currentStock = this.tentativeStock.get(node.id) || 0;
        const availableStock = Math.max(0, currentStock - safetyStock);

        if (safetyStock > 0) {
            this.log(`[INVENTORY] ${nodeName} Safety Stock: ${safetyStock}, Current: ${currentStock}, Available: ${availableStock}`);
        }

        if (availableStock >= quantity) {
            this.log(`[INVENTORY] ${nodeName} Stock Available: ${availableStock} >= ${quantity}. Deducting.`, 'success');
            this.tentativeStock.set(node.id, currentStock - quantity);

            const holdingCostPerDay = parseFloat(node.data.holdingCostPerDay || node.data.carryingCost) || 0;
            const inventoryCost = holdingCostPerDay * quantity;
            this.costBreakdown.inventory += inventoryCost;

            if (inventoryCost > 0) {
                this.log(`[COST] Inventory holding cost: $${inventoryCost.toFixed(2)}`);
            }

            return { feasible: true, fulfilled: quantity };
        }

        const missingQty = quantity - availableStock;
        this.log(`[INVENTORY] ${nodeName} Stock Low (${availableStock} available). Requesting Replenishment of ${missingQty}`, 'warn');

        const feedEdges = this.edges.filter(e => e.target === node.id);
        if (feedEdges.length === 0) {
            this.log(`[MATERIAL] No upstream replenishment for ${nodeName}. Stockout!`, 'error');
            return { feasible: false, fulfilled: availableStock, reason: `Stockout at ${nodeName}` };
        }

        let totalFulfilled = availableStock;
        let remainingNeed = missingQty;
        const sourceResults = [];

        const sortedFeeders = feedEdges.sort((a, b) => {
            const priorityA = parseInt(a.data?.priority) || 999;
            const priorityB = parseInt(b.data?.priority) || 999;
            return priorityA - priorityB;
        });

        for (const edge of sortedFeeders) {
            if (remainingNeed <= 0) break;

            const feederNode = this.nodeMap.get(edge.source);
            if (!feederNode) {
                this.log(`[MATERIAL] Feeder node ${edge.source} not found`, 'warn');
                continue;
            }

            const fName = feederNode.data.label || feederNode.data.name || feederNode.id;

            // Handle edge transport time
            const edgeTransportDays = parseFloat(edge.data?.transportTime) || 0;
            const upstreamDueDate = subDays(neededDate, edgeTransportDays);

            if (edgeTransportDays > 0) {
                this.schedule.push({
                    nodeId: `edge-${edge.id}`,
                    label: `Transport (${fName} -> ${nodeName})`,
                    start: upstreamDueDate,
                    end: neededDate,
                    type: 'logistic',
                    quantity: remainingNeed
                });
            }

            this.log(`[MATERIAL] Requesting ${remainingNeed} from ${fName} (Due: ${formatDate(upstreamDueDate)})`);
            const replenResult = this.checkOperation(edge.source, remainingNeed, upstreamDueDate);

            if (!replenResult) {
                this.log(`[MATERIAL] Replenishment check failed for ${fName}`, 'warn');
                continue;
            }

            sourceResults.push({
                source: fName,
                requested: remainingNeed,
                fulfilled: replenResult.fulfilled || 0,
                feasible: replenResult.feasible
            });

            if (replenResult.feasible) {
                totalFulfilled += replenResult.fulfilled;
                remainingNeed -= replenResult.fulfilled;
                this.log(`[MATERIAL] ${fName} fulfilled ${replenResult.fulfilled}. Remaining: ${remainingNeed}`, 'success');
            } else {
                const partialFulfilled = replenResult.fulfilled || 0;
                totalFulfilled += partialFulfilled;
                remainingNeed -= partialFulfilled;
                if (partialFulfilled > 0) {
                    this.log(`[MATERIAL] ${fName} partially fulfilled ${partialFulfilled}. Remaining: ${remainingNeed}`, 'warn');
                }
            }
        }

        this.tentativeStock.set(node.id, Math.max(0, currentStock - Math.min(availableStock, quantity)));

        if (totalFulfilled >= quantity) {
            this.log(`[MATERIAL] Multi-source replenishment successful for ${nodeName}!`, 'success');
            return { feasible: true, fulfilled: quantity, sources: sourceResults };
        } else {
            const shortage = quantity - totalFulfilled;
            this.log(`[MATERIAL] Insufficient replenishment for ${nodeName}. Shortage: ${shortage}`, 'error');
            const currentShortage = this.shortageMap.get(node.id) || 0;
            this.shortageMap.set(node.id, currentShortage + shortage);

            return {
                feasible: false,
                fulfilled: totalFulfilled,
                reason: `Material Shortage at ${nodeName}: ${shortage} units`,
                sources: sourceResults
            };
        }
    }
}
