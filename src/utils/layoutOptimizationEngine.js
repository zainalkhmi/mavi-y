const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const areaCenter = (area) => ({
    x: (Number(area.x) || 0) + (Number(area.width) || 80) / 2,
    y: (Number(area.y) || 0) + (Number(area.height) || 60) / 2,
});

const distance = (a, b) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

const getFlowPathDistance = (flow = {}, fromArea, toArea) => {
    if (!fromArea || !toArea) return 0;

    const start = areaCenter(fromArea);
    const end = areaCenter(toArea);
    const waypoints = Array.isArray(flow.waypoints)
        ? flow.waypoints.map((point) => ({
            x: Number(point.x) || 0,
            y: Number(point.y) || 0,
        }))
        : [];

    const points = [start, ...waypoints, end];
    const directionalPoints = flow.direction === 'reverse' ? [...points].reverse() : points;

    let total = 0;
    for (let i = 1; i < directionalPoints.length; i++) {
        total += distance(directionalPoints[i - 1], directionalPoints[i]);
    }
    return total;
};

const overlapArea = (a, b) => {
    const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
    const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
    return xOverlap * yOverlap;
};

const getFlowControlPenalty = (flow = {}) => {
    const controlType = flow.controlType || 'push';
    const frequency = Math.max(0, Number(flow.frequency) || 0);
    const unitCost = Math.max(0, Number(flow.unitCost) || 1);
    const bufferLimit = Math.max(0, Number(flow.bufferLimit) || 0);
    const reorderPoint = Math.max(0, Number(flow.reorderPoint) || 0);
    const leadTime = Math.max(0.1, Number(flow.leadTime) || 1);
    const signalQty = Math.max(1, Number(flow.signalQty) || 1);

    if (controlType === 'pull') {
        return Math.max(0, (reorderPoint - bufferLimit)) * 5;
    }

    if (controlType === 'fifo') {
        return bufferLimit > 0 ? Math.max(0, frequency - bufferLimit) * 12 : frequency * 18;
    }

    if (controlType === 'kanban') {
        const requiredCards = Math.ceil((frequency * leadTime) / signalQty);
        const availableCards = Math.max(1, Math.floor(bufferLimit / signalQty));
        return Math.max(0, requiredCards - availableCards) * 20;
    }

    if (controlType === 'conwip') {
        return Math.max(0, frequency - bufferLimit) * 8;
    }

    // Default push control creates higher WIP risk
    return frequency * unitCost * 0.6;
};

const getFlowLeadTime = (flow = {}, travelDistance = 0) => {
    const controlType = flow.controlType || 'push';
    const frequency = Math.max(0, Number(flow.frequency) || 0);
    const bufferLimit = Math.max(0, Number(flow.bufferLimit) || 0);
    const reorderPoint = Math.max(0, Number(flow.reorderPoint) || 0);
    const signalQty = Math.max(1, Number(flow.signalQty) || 1);

    // Lead time base is interpreted as hours for this layout model.
    const baseLeadTime = Math.max(0.1, Number(flow.leadTime) || 1);
    const handlingTime = Math.max(0, Number(flow.handlingTime) || 0.1);
    const travelSpeed = Math.max(1, Number(flow.transportSpeed) || 60); // px / hour
    const travelTime = Math.max(0, travelDistance) / travelSpeed;

    let queueFactor = 1;
    if (controlType === 'pull') {
        queueFactor = 0.8 + Math.max(0, reorderPoint - bufferLimit) / Math.max(10, bufferLimit || 10);
    } else if (controlType === 'fifo') {
        queueFactor = 0.95 + (bufferLimit > 0 ? Math.max(0, frequency - bufferLimit) / Math.max(10, bufferLimit) : 1);
    } else if (controlType === 'kanban') {
        const requiredCards = Math.ceil((frequency * baseLeadTime) / signalQty);
        const availableCards = Math.max(1, Math.floor(bufferLimit / signalQty));
        queueFactor = 0.75 + Math.max(0, requiredCards - availableCards) / Math.max(1, availableCards);
    } else if (controlType === 'conwip') {
        queueFactor = 0.85 + Math.max(0, frequency - bufferLimit) / Math.max(10, bufferLimit || 10);
    } else {
        // Push system tends to have higher waiting time / WIP.
        queueFactor = 1.25;
    }

    return (baseLeadTime + handlingTime + travelTime) * queueFactor;
};

export const evaluateFacilityLayout = ({
    areas = [],
    flows = [],
    constraints = {},
    optimizationMode = 'network',
}) => {
    const areaById = new Map(areas.map((a) => [a.id, a]));

    let flowCost = 0;
    let totalDistance = 0;
    let flowControlPenalty = 0;
    let structurePenalty = 0;
    let totalLeadTime = 0;
    let weightedLeadTime = 0;
    let totalFrequency = 0;

    flows.forEach((flow) => {
        const from = areaById.get(flow.from);
        const to = areaById.get(flow.to);
        if (!from || !to) return;

        const d = getFlowPathDistance(flow, from, to);
        const frequency = Number(flow.frequency) || 0;
        const unitCost = Number(flow.unitCost) || 1;
        flowCost += d * frequency * unitCost;
        totalDistance += d * frequency;
        flowControlPenalty += getFlowControlPenalty(flow);

        if (optimizationMode === 'line') {
            const directionalBackflow = Math.max(0, (from.x + from.width / 2) - (to.x + to.width / 2));
            const verticalDrift = Math.abs((from.y + from.height / 2) - (to.y + to.height / 2));
            structurePenalty += (directionalBackflow * 2 + verticalDrift * 0.35) * Math.max(1, frequency);
        }

        const flowLeadTime = getFlowLeadTime(flow, d);
        totalLeadTime += flowLeadTime;
        weightedLeadTime += flowLeadTime * Math.max(1, frequency);
        totalFrequency += Math.max(1, frequency);
    });

    const averageLeadTime = flows.length > 0 ? weightedLeadTime / Math.max(1, totalFrequency) : 0;

    let overlapPenalty = 0;
    let spacingPenalty = 0;
    const minSpacing = Number(constraints.minSpacing) || 20;

    for (let i = 0; i < areas.length; i++) {
        for (let j = i + 1; j < areas.length; j++) {
            const a = areas[i];
            const b = areas[j];
            const overlap = overlapArea(a, b);
            if (overlap > 0) {
                overlapPenalty += overlap * 120;
            }

            const d = distance(areaCenter(a), areaCenter(b));
            if (d < minSpacing) {
                spacingPenalty += (minSpacing - d) * 200;
            }
        }
    }

    const fixedViolation = areas.reduce((sum, area) => {
        if (!area.locked) return sum;
        const dx = Math.abs((Number(area.x) || 0) - (Number(area.fixedX) || Number(area.x) || 0));
        const dy = Math.abs((Number(area.y) || 0) - (Number(area.fixedY) || Number(area.y) || 0));
        return sum + (dx + dy) * 50;
    }, 0);

    const targetLeadTime = Math.max(0, Number(constraints.targetLeadTime) || 0);
    const leadTimePenalty = targetLeadTime > 0 ? Math.max(0, averageLeadTime - targetLeadTime) * 150 : 0;

    if (optimizationMode === 'network') {
        const areaStats = areas.reduce((acc, area) => {
            const center = areaCenter(area);
            acc.minX = Math.min(acc.minX, center.x);
            acc.maxX = Math.max(acc.maxX, center.x);
            acc.minY = Math.min(acc.minY, center.y);
            acc.maxY = Math.max(acc.maxY, center.y);
            return acc;
        }, { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });

        const centerX = Number.isFinite(areaStats.minX) ? (areaStats.minX + areaStats.maxX) / 2 : 0;
        const centerY = Number.isFinite(areaStats.minY) ? (areaStats.minY + areaStats.maxY) / 2 : 0;

        const nodeFlowWeight = new Map();
        flows.forEach((flow) => {
            const freq = Math.max(0, Number(flow.frequency) || 0);
            if (flow.from) nodeFlowWeight.set(flow.from, (nodeFlowWeight.get(flow.from) || 0) + freq);
            if (flow.to) nodeFlowWeight.set(flow.to, (nodeFlowWeight.get(flow.to) || 0) + freq);
        });

        areas.forEach((area) => {
            const w = nodeFlowWeight.get(area.id) || 0;
            if (w <= 0) return;
            const c = areaCenter(area);
            const distToCenter = distance(c, { x: centerX, y: centerY });
            structurePenalty += distToCenter * Math.sqrt(w + 1) * 0.25;
        });
    }

    const totalCost = flowCost + overlapPenalty + spacingPenalty + fixedViolation + flowControlPenalty + structurePenalty + leadTimePenalty;

    return {
        totalCost,
        flowCost,
        totalDistance,
        totalLeadTime,
        averageLeadTime,
        overlapPenalty,
        spacingPenalty,
        fixedViolation,
        flowControlPenalty,
        structurePenalty,
        leadTimePenalty,
    };
};

const randomMove = (areas, bounds) => {
    const idx = Math.floor(Math.random() * areas.length);
    const area = areas[idx];
    if (!area || area.locked) return areas;

    const step = 60;
    const nx = clamp((Number(area.x) || 0) + (Math.random() * 2 - 1) * step, 0, bounds.width - area.width);
    const ny = clamp((Number(area.y) || 0) + (Math.random() * 2 - 1) * step, 0, bounds.height - area.height);

    const copy = areas.map((a, i) => (i === idx ? { ...a, x: nx, y: ny } : { ...a }));
    return copy;
};

const randomSwap = (areas) => {
    if (areas.length < 2) return areas;

    const i = Math.floor(Math.random() * areas.length);
    let j = Math.floor(Math.random() * areas.length);
    while (j === i) j = Math.floor(Math.random() * areas.length);

    const a = areas[i];
    const b = areas[j];
    if (!a || !b || a.locked || b.locked) return areas;

    const copy = areas.map((x) => ({ ...x }));
    const ax = copy[i].x;
    const ay = copy[i].y;
    copy[i].x = copy[j].x;
    copy[i].y = copy[j].y;
    copy[j].x = ax;
    copy[j].y = ay;
    return copy;
};

export const optimizeFacilityLayout = ({
    areas = [],
    flows = [],
    constraints = {},
    optimizationMode = 'network',
    bounds = { width: 1000, height: 650 },
    iterations = 600,
}) => {
    let current = areas.map((a) => ({ ...a }));
    let currentScore = evaluateFacilityLayout({ areas: current, flows, constraints, optimizationMode }).totalCost;
    let best = current.map((a) => ({ ...a }));
    let bestScore = currentScore;

    for (let t = 0; t < iterations; t++) {
        const candidate = Math.random() < 0.25 ? randomSwap(current) : randomMove(current, bounds);
        const candidateScore = evaluateFacilityLayout({ areas: candidate, flows, constraints, optimizationMode }).totalCost;
        const temperature = Math.max(0.01, 1 - t / iterations);
        const accept = candidateScore < currentScore || Math.random() < Math.exp((currentScore - candidateScore) / (temperature * 1000));

        if (accept) {
            current = candidate;
            currentScore = candidateScore;
        }

        if (candidateScore < bestScore) {
            best = candidate.map((a) => ({ ...a }));
            bestScore = candidateScore;
        }
    }

    return {
        areas: best,
        kpis: evaluateFacilityLayout({ areas: best, flows, constraints, optimizationMode }),
    };
};

export const generateFacilityScenarios = ({
    areas = [],
    flows = [],
    constraints = {},
    bounds,
    optimizationMode = 'network',
}) => {
    const baselineKpis = evaluateFacilityLayout({ areas, flows, constraints, optimizationMode });
    const baseline = {
        id: 'baseline',
        name: 'Baseline',
        areas: areas.map((a) => ({ ...a })),
        kpis: baselineKpis,
    };

    const alternatives = [1, 2, 3].map((idx) => {
        const optimized = optimizeFacilityLayout({
            areas,
            flows,
            constraints,
            optimizationMode,
            bounds,
            iterations: 400 + idx * 200,
        });
        return {
            id: `opt-${idx}`,
            name: `Optimized ${idx}`,
            areas: optimized.areas,
            kpis: optimized.kpis,
        };
    });

    return [baseline, ...alternatives].sort((a, b) => a.kpis.totalCost - b.kpis.totalCost);
};
