/**
 * Monte Carlo Simulation for Line Balancing
 * Simulates line performance considering process variability (Normal Distribution)
 */

export const simulateLinePerformance = (stations, taktTime, iterations = 1000) => {
    // stations: { stationId: [tasks] }
    // task: { id, avgTime, stdDev }

    let totalOutput = 0;
    let lineStopCount = 0;
    const stationStats = {}; // { stationId: { failCount, avgTime } }

    // Initialize stats
    Object.keys(stations).forEach(s => {
        stationStats[s] = { failCount: 0, totalTime: 0, maxTime: 0 };
    });

    const results = [];

    // Run Iterations
    for (let i = 0; i < iterations; i++) {
        let maxCycleTime = 0;
        let bottleneckStation = null;
        const iterationData = {};

        // 1. Calculate Cycle Time for each station in this iteration
        Object.keys(stations).forEach(stationId => {
            let stationTime = 0;

            stations[stationId].forEach(task => {
                // Generate random time based on Normal Distribution (Box-Muller transform)
                const u1 = Math.random();
                const u2 = Math.random();
                const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

                // stdDev default to 10% of avgTime if not provided
                const stdDev = task.stdDev !== undefined ? parseFloat(task.stdDev) : (parseFloat(task.time) * 0.1);
                const randomTime = parseFloat(task.time) + (z * stdDev);

                // Time cannot be negative
                stationTime += Math.max(0, randomTime);
            });

            iterationData[stationId] = stationTime;

            // Stats
            stationStats[stationId].totalTime += stationTime;
            if (stationTime > stationStats[stationId].maxTime) {
                stationStats[stationId].maxTime = stationTime;
            }

            // Check Bottleneck
            if (stationTime > maxCycleTime) {
                maxCycleTime = stationTime;
                bottleneckStation = stationId;
            }
        });

        // 2. Determine Line Performance for this iteration
        // If Max Cycle Time > Takt Time, it's a "Fail" (Line Stop / Overcycle)
        if (maxCycleTime > taktTime) {
            lineStopCount++;
            stationStats[bottleneckStation].failCount++;
        }

        // Theoretical Output for this cycle (Shift Sim simplified)
        // We just track the distribution of cycle times
        results.push(maxCycleTime);
    }

    // summary
    const reliability = ((iterations - lineStopCount) / iterations) * 100;
    const avgCycleTime = results.reduce((a, b) => a + b, 0) / iterations;

    // Sort Results to find percentiles
    results.sort((a, b) => a - b);
    const p95 = results[Math.floor(iterations * 0.95)];

    // Station Analysis
    const stationAnalysis = Object.keys(stationStats).map(id => ({
        id,
        avgTime: stationStats[id].totalTime / iterations,
        failRate: (stationStats[id].failCount / iterations) * 100,
        maxTime: stationStats[id].maxTime
    }));

    return {
        reliability,      // % probability of meeting Takt Time
        avgCycleTime,     // Average bottleneck time
        p95CycleTime: p95,// 95th percentile (Risk)
        stationAnalysis   // Detail per station
    };
};
