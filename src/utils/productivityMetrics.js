// Productivity Metrics Utilities
// Provides calculations for OEE, takt time, value-added ratio, efficiency, productivity index, and related stats.

/**
 * Calculate Overall Equipment Effectiveness (OEE)
 * OEE = Availability × Performance × Quality
 * @param {Object} params
 * @param {number} params.plannedProductionTime - Total planned production time (minutes)
 * @param {number} params.actualProductionTime - Actual production time (minutes)
 * @param {number} params.idealCycleTime - Ideal cycle time per unit (minutes)
 * @param {number} params.totalUnitsProduced - Total units produced
 * @param {number} params.goodUnitsProduced - Good quality units produced
 * @returns {Object} OEE metrics
 */
export function calculateOEE({ plannedProductionTime, actualProductionTime, idealCycleTime, totalUnitsProduced, goodUnitsProduced }) {
    const availability = (actualProductionTime / plannedProductionTime) * 100;
    const performance = ((idealCycleTime * totalUnitsProduced) / actualProductionTime) * 100;
    const quality = (goodUnitsProduced / totalUnitsProduced) * 100;
    const oee = (availability / 100) * (performance / 100) * (quality / 100) * 100;
    return {
        oee: Math.min(oee, 100),
        availability: Math.min(availability, 100),
        performance: Math.min(performance, 100),
        quality: Math.min(quality, 100),
        classification: classifyOEE(oee)
    };
}

function classifyOEE(oee) {
    if (oee >= 85) return 'World Class';
    if (oee >= 60) return 'Good';
    if (oee >= 40) return 'Fair';
    return 'Poor';
}

/**
 * Calculate Takt Time
 * @param {number} availableTime - Available production time (minutes)
 * @param {number} customerDemand - Required units to produce
 * @returns {number} Takt time (minutes per unit)
 */
export function calculateTaktTime(availableTime, customerDemand) {
    if (customerDemand === 0) return 0;
    return availableTime / customerDemand;
}

/**
 * Calculate Value-Added Ratio and related times
 * @param {Array} measurements - Measurement objects with `duration` and `category`
 * @returns {Object}
 */
export function calculateValueAddedRatio(measurements) {
    if (!measurements || measurements.length === 0) {
        return { vaRatio: 0, vaTime: 0, nvaTime: 0, wasteTime: 0, totalTime: 0 };
    }
    let vaTime = 0, nvaTime = 0, wasteTime = 0;
    measurements.forEach(m => {
        const d = m.duration || 0;
        switch (m.category) {
            case 'Value-added':
                vaTime += d; break;
            case 'Non value-added':
                nvaTime += d; break;
            case 'Waste':
                wasteTime += d; break;
            default:
                break;
        }
    });
    const totalTime = vaTime + nvaTime + wasteTime;
    const vaRatio = totalTime > 0 ? (vaTime / totalTime) * 100 : 0;
    return { vaRatio, vaTime, nvaTime, wasteTime, totalTime };
}

/**
 * Calculate Efficiency Score
 * @param {number} standardTime
 * @param {number} actualTime
 * @returns {Object}
 */
export function calculateEfficiency(standardTime, actualTime) {
    if (actualTime === 0) return { efficiency: 0, classification: 'N/A' };
    const efficiency = (standardTime / actualTime) * 100;
    return {
        efficiency,
        classification: classifyEfficiency(efficiency),
        variance: actualTime - standardTime,
        variancePercentage: ((actualTime - standardTime) / standardTime) * 100
    };
}

function classifyEfficiency(efficiency) {
    if (efficiency >= 100) return 'Excellent';
    if (efficiency >= 90) return 'Good';
    if (efficiency >= 80) return 'Fair';
    return 'Poor';
}

/**
 * Calculate Productivity Index
 * @param {number} output - Units produced
 * @param {number} input - Resources used (e.g., total time)
 * @returns {number}
 */
export function calculateProductivityIndex(output, input) {
    if (input === 0) return 0;
    return (output / input) * 100;
}

/**
 * Calculate Cycle Time Statistics
 * @param {Array} measurements - Must contain `duration` and optional `cycle`
 * @returns {Object}
 */
export function calculateCycleTimeStats(measurements) {
    if (!measurements || measurements.length === 0) {
        return { averageCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, stdDeviation: 0, variance: 0, totalCycles: 0 };
    }
    const cycles = {};
    measurements.forEach(m => {
        const cycle = m.cycle || 1;
        cycles[cycle] = (cycles[cycle] || 0) + (m.duration || 0);
    });
    const cycleTimes = Object.values(cycles);
    const totalCycles = cycleTimes.length;
    if (totalCycles === 0) {
        return { averageCycleTime: 0, minCycleTime: 0, maxCycleTime: 0, stdDeviation: 0, variance: 0, totalCycles: 0 };
    }
    const sum = cycleTimes.reduce((a, b) => a + b, 0);
    const average = sum / totalCycles;
    const min = Math.min(...cycleTimes);
    const max = Math.max(...cycleTimes);
    const squaredDiffs = cycleTimes.map(t => Math.pow(t - average, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / totalCycles;
    const stdDeviation = Math.sqrt(variance);
    return { averageCycleTime: average, minCycleTime: min, maxCycleTime: max, stdDeviation, variance, totalCycles, cycleTimes };
}

/**
 * Analyze Takt vs Cycle Time
 * @param {number} taktTime
 * @param {number} actualCycleTime
 * @returns {Object}
 */
export function analyzeTaktVsCycle(taktTime, actualCycleTime) {
    const difference = actualCycleTime - taktTime;
    const percentageDiff = taktTime > 0 ? (difference / taktTime) * 100 : 0;
    let status = 'On Target';
    if (actualCycleTime > taktTime) status = 'Behind Takt';
    else if (actualCycleTime < taktTime * 0.9) status = 'Ahead of Takt';
    return { taktTime, actualCycleTime, difference, percentageDiff, status, isOnTarget: Math.abs(percentageDiff) <= 10 };
}

/**
 * Calculate all productivity metrics in one call
 * @param {Object} data
 * @returns {Object}
 */
export function calculateAllProductivityMetrics(data) {
    const {
        measurements = [],
        plannedTime = 0,
        actualTime = 0,
        standardTime = 0,
        taktTime = 0,
        totalUnits = 0,
        goodUnits = 0
    } = data;
    const vaMetrics = calculateValueAddedRatio(measurements);
    const cycleStats = calculateCycleTimeStats(measurements);
    const efficiency = calculateEfficiency(standardTime, actualTime);
    const taktAnalysis = analyzeTaktVsCycle(taktTime, cycleStats.averageCycleTime);
    const oee = calculateOEE({
        plannedProductionTime: plannedTime,
        actualProductionTime: actualTime,
        idealCycleTime: standardTime / (totalUnits || 1),
        totalUnitsProduced: totalUnits,
        goodUnitsProduced: goodUnits
    });
    return {
        oee,
        valueAdded: vaMetrics,
        cycleTime: cycleStats,
        efficiency,
        taktAnalysis,
        summary: {
            vaRatio: vaMetrics.vaRatio,
            efficiency: efficiency.efficiency,
            avgCycleTime: cycleStats.averageCycleTime,
            taktCompliance: taktAnalysis.isOnTarget,
            productivityIndex: calculateProductivityIndex(totalUnits, vaMetrics.totalTime)
        }
    };
}
