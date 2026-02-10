/**
 * Fatigue Predictor Utility
 * Analyzes cycle time trends to predict operator fatigue and performance drops.
 */

/**
 * Calculate Linear Regression for a set of points (y-values only, x is index)
 * @param {Array<number>} data - Array of numerical values (e.g., cycle times)
 * @returns {Object} { slope, intercept, r2 }
 */
export const calculateLinearRegression = (data) => {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: 0, r2: 0 };

    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;
    let sumYY = 0;

    for (let i = 0; i < n; i++) {
        const x = i;
        const y = data[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumXX += x * x;
        sumYY += y * y;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared (Coefficient of Determination)
    const yMean = sumY / n;
    let ssTot = 0;
    let ssRes = 0;

    for (let i = 0; i < n; i++) {
        const y = data[i];
        const yPred = slope * i + intercept;
        ssTot += Math.pow(y - yMean, 2);
        ssRes += Math.pow(y - yPred, 2);
    }

    const r2 = 1 - (ssRes / ssTot);

    return { slope, intercept, r2 };
};

/**
 * Analyze Fatigue and Performance Trend
 * @param {Array<number>} cycleTimes - Array of cycle times in seconds
 * @param {number} standardTime - Target standard time (optional)
 * @returns {Object} Analysis result
 */
export const analyzeFatigue = (cycleTimes, standardTime = null) => {
    if (!cycleTimes || cycleTimes.length < 3) {
        return {
            status: 'Insufficient Data',
            energyLevel: 100,
            trend: 'Stable',
            prediction: 'Need more cycles',
            variability: 0
        };
    }

    // 1. Calculate Regression (Trend)
    const { slope, intercept, r2 } = calculateLinearRegression(cycleTimes);

    // 2. Variability Analysis (Coefficient of Variation)
    // Use last 10 cycles or all if less
    const recentCycles = cycleTimes.slice(-10);
    const mean = recentCycles.reduce((a, b) => a + b, 0) / recentCycles.length;
    const variance = recentCycles.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / recentCycles.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean; // Coefficient of Variation

    // 3. Determine Energy Level (Inverse of Performance Drop)
    // Baseline is the average of the first 3 cycles (assumed fresh state)
    const baseline = cycleTimes.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const currentPerformance = mean;
    const drop = Math.max(0, (currentPerformance - baseline) / baseline);

    // Energy starts at 100, subtracts percentage drop * factor
    // Factor 2.0: 10% slowdown = 20% energy drop
    let energyLevel = Math.max(0, Math.min(100, 100 - (drop * 200)));

    // Adjust energy by variability (inconsistent = tired)
    // If CV > 0.15 (15% variability), penalize energy
    if (cv > 0.15) {
        energyLevel -= ((cv - 0.15) * 100);
    }
    energyLevel = Math.round(Math.max(0, energyLevel));

    // 4. Determine Trend Status
    let trend = 'Stable';
    // Slope > 0 means time increasing (slowing down)
    if (slope > 0.5) trend = 'Rapid Decline'; // +0.5s per cycle
    else if (slope > 0.1) trend = 'Declining'; // +0.1s per cycle
    else if (slope < -0.1) trend = 'Improving'; // Getting faster
    else trend = 'Stable';

    // 5. Prediction (Time to Failure)
    // Failure defined as 120% of Baseline or Standard Time
    const limit = standardTime ? standardTime * 1.2 : baseline * 1.3; // 30% slowdown limit
    const currentCycleIndex = cycleTimes.length - 1;
    let cyclesToFailure = Infinity;

    if (slope > 0) {
        // limit = slope * x + intercept => x = (limit - intercept) / slope
        const failureIndex = (limit - intercept) / slope;
        cyclesToFailure = Math.round(failureIndex - currentCycleIndex);
    }

    let prediction = 'Stable Performance';
    if (slope > 0 && cyclesToFailure < 20 && cyclesToFailure > 0) {
        prediction = `Risk Critical in ~${cyclesToFailure} cycles`;
    } else if (energyLevel < 40) {
        prediction = 'Fatigue Detected - Take Break';
    } else if (variance > (mean * 0.2)) {
        prediction = 'High Variability - Check Focus';
    }

    return {
        status: energyLevel > 70 ? 'Good' : energyLevel > 40 ? 'Warning' : 'Critical',
        energyLevel,
        trend,
        slope, // for debugging
        prediction,
        variability: cv, // 0-1 scale
        nextCyclePrediction: slope * (cycleTimes.length) + intercept
    };
};

/**
 * Generate chart data including future predictions
 * @param {Array<number>} cycleTimes 
 * @param {number} forecastHorizon - How many future cycles to predict
 */
export const generateTrendData = (cycleTimes, forecastHorizon = 10) => {
    const { slope, intercept } = calculateLinearRegression(cycleTimes);
    const data = [];

    // Historical Data
    cycleTimes.forEach((val, idx) => {
        data.push({
            cycle: idx + 1,
            actual: Number(val.toFixed(2)),
            trend: Number((slope * idx + intercept).toFixed(2)),
            isPrediction: false
        });
    });

    // Forecast Data
    if (cycleTimes.length >= 3) {
        const lastIndex = cycleTimes.length - 1;
        for (let i = 1; i <= forecastHorizon; i++) {
            const idx = lastIndex + i;
            data.push({
                cycle: idx + 1,
                actual: null,
                trend: Number((slope * idx + intercept).toFixed(2)),
                isPrediction: true
            });
        }
    }

    return data;
};
