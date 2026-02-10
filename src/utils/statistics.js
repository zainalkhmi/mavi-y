/**
 * Statistical utility functions for motion study analysis
 */

/**
 * Calculate mean (average) of an array of numbers
 */
export function calculateMean(values) {
    if (!values || values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
}

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values) {
    if (!values || values.length === 0) return 0;
    const mean = calculateMean(values);
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = calculateMean(squaredDiffs);
    return Math.sqrt(variance);
}

/**
 * Calculate range (max - min)
 */
export function calculateRange(values) {
    if (!values || values.length === 0) return 0;
    return Math.max(...values) - Math.min(...values);
}

/**
 * Calculate confidence interval
 * @param {number[]} values - Array of values
 * @param {number} confidence - Confidence level (e.g., 0.95 for 95%)
 * @returns {object} - {lower, upper, margin}
 */
export function calculateConfidenceInterval(values, confidence = 0.95) {
    if (!values || values.length === 0) return { lower: 0, upper: 0, margin: 0 };

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);
    const n = values.length;

    // Z-scores for common confidence levels
    const zScores = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.576
    };

    const z = zScores[confidence] || 1.96;
    const margin = z * (stdDev / Math.sqrt(n));

    return {
        lower: mean - margin,
        upper: mean + margin,
        margin: margin
    };
}

/**
 * Calculate process capability indices (Cp, Cpk)
 * @param {number[]} values - Process measurements
 * @param {number} lsl - Lower specification limit
 * @param {number} usl - Upper specification limit
 * @returns {object} - {cp, cpk, cpl, cpu}
 */
export function calculateProcessCapability(values, lsl, usl) {
    if (!values || values.length === 0) return { cp: 0, cpk: 0, cpl: 0, cpu: 0 };

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);

    // Cp = (USL - LSL) / (6 * σ)
    const cp = (usl - lsl) / (6 * stdDev);

    // Cpu = (USL - μ) / (3 * σ)
    const cpu = (usl - mean) / (3 * stdDev);

    // Cpl = (μ - LSL) / (3 * σ)
    const cpl = (mean - lsl) / (3 * stdDev);

    // Cpk = min(Cpu, Cpl)
    const cpk = Math.min(cpu, cpl);

    return { cp, cpk, cpl, cpu };
}

/**
 * Calculate control chart limits (X-bar chart)
 * @param {number[]} values - Sample means
 * @returns {object} - {centerLine, ucl, lcl}
 */
export function calculateControlLimits(values) {
    if (!values || values.length === 0) return { centerLine: 0, ucl: 0, lcl: 0 };

    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);

    // Using 3-sigma limits
    const ucl = mean + (3 * stdDev);
    const lcl = mean - (3 * stdDev);

    return {
        centerLine: mean,
        ucl: ucl,
        lcl: Math.max(0, lcl) // Time cannot be negative
    };
}

/**
 * Calculate percentiles
 * @param {number[]} values - Array of values
 * @param {number} percentile - Percentile to calculate (0-100)
 */
export function calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate quartiles (Q1, Q2, Q3)
 */
export function calculateQuartiles(values) {
    return {
        q1: calculatePercentile(values, 25),
        q2: calculatePercentile(values, 50), // median
        q3: calculatePercentile(values, 75)
    };
}

/**
 * Detect outliers using IQR method
 * @param {number[]} values - Array of values
 * @returns {object} - {outliers, lowerBound, upperBound}
 */
export function detectOutliers(values) {
    if (!values || values.length === 0) return { outliers: [], lowerBound: 0, upperBound: 0 };

    const { q1, q3 } = calculateQuartiles(values);
    const iqr = q3 - q1;
    const lowerBound = q1 - (1.5 * iqr);
    const upperBound = q3 + (1.5 * iqr);

    const outliers = values.filter(val => val < lowerBound || val > upperBound);

    return { outliers, lowerBound, upperBound };
}

/**
 * Calculate coefficient of variation (CV)
 * CV = (σ / μ) * 100
 */
export function calculateCV(values) {
    if (!values || values.length === 0) return 0;
    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values);

    if (mean === 0) return 0;
    return (stdDev / mean) * 100;
}

/**
 * Group data into histogram bins
 * @param {number[]} values - Array of values
 * @param {number} binCount - Number of bins (default: auto-calculate)
 */
export function createHistogramBins(values, binCount = null) {
    if (!values || values.length === 0) return [];

    // Use Sturges' formula if binCount not specified
    if (!binCount) {
        binCount = Math.ceil(Math.log2(values.length) + 1);
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / binCount;

    const bins = Array(binCount).fill(0).map((_, i) => ({
        start: min + (i * binWidth),
        end: min + ((i + 1) * binWidth),
        count: 0,
        frequency: 0
    }));

    // Count values in each bin
    values.forEach(val => {
        const binIndex = Math.min(
            Math.floor((val - min) / binWidth),
            binCount - 1
        );
        bins[binIndex].count++;
    });

    // Calculate frequencies
    bins.forEach(bin => {
        bin.frequency = bin.count / values.length;
    });

    return bins;
}

/**
 * Calculate summary statistics for a dataset
 */
export function calculateSummaryStats(values) {
    if (!values || values.length === 0) {
        return {
            count: 0,
            mean: 0,
            median: 0,
            stdDev: 0,
            min: 0,
            max: 0,
            range: 0,
            cv: 0,
            quartiles: { q1: 0, q2: 0, q3: 0 }
        };
    }

    return {
        count: values.length,
        mean: calculateMean(values),
        median: calculateMedian(values),
        stdDev: calculateStdDev(values),
        min: Math.min(...values),
        max: Math.max(...values),
        range: calculateRange(values),
        cv: calculateCV(values),
        quartiles: calculateQuartiles(values)
    };
}
