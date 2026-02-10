/**
 * NIOSH Lifting Equation Calculator
 * Based on the Revised NIOSH Lifting Equation (1991)
 * RWL = LC * HM * VM * DM * AM * FM * CM
 */

class NIOSHCalculator {
    constructor() {
        this.LC = 23; // Load Constant in kg
    }

    /**
     * Calculate Recommended Weight Limit (RWL)
     * @param {Object} params - Parameters for calculation
     * @param {number} params.H - Horizontal distance (cm)
     * @param {number} params.V - Vertical distance (cm)
     * @param {number} params.D - Vertical travel distance (cm)
     * @param {number} params.A - Asymmetry angle (degrees)
     * @param {number} params.F - Frequency (lifts/min)
     * @param {number} params.duration - Duration (hours)
     * @param {string} params.coupling - 'good', 'fair', or 'poor'
     * @returns {Object} RWL and Lifting Index (LI)
     */
    calculateRWL(params, actualWeight = 0) {
        const HM = this.getHM(params.H);
        const VM = this.getVM(params.V);
        const DM = this.getDM(params.D);
        const AM = this.getAM(params.A);
        const FM = this.getFM(params.F, params.V, params.duration);
        const CM = this.getCM(params.coupling, params.V);

        const rwl = this.LC * HM * VM * DM * AM * FM * CM;
        const li = actualWeight / rwl;

        return {
            rwl: parseFloat(rwl.toFixed(2)),
            li: parseFloat(li.toFixed(2)),
            multipliers: { HM, VM, DM, AM, FM, CM },
            riskLevel: this.getRiskLevel(li)
        };
    }

    getHM(H) {
        if (H <= 25) return 1.0;
        if (H >= 63) return 0.0;
        return 25 / H;
    }

    getVM(V) {
        const diff = Math.abs(V - 75);
        const multiplier = 1 - (0.003 * diff);
        return Math.max(0, Math.min(1.0, multiplier));
    }

    getDM(D) {
        if (D <= 25) return 1.0;
        const multiplier = 0.82 + (4.5 / D);
        return Math.max(0, Math.min(1.0, multiplier));
    }

    getAM(A) {
        const multiplier = 1 - (0.0032 * A);
        return Math.max(0, Math.min(1.0, multiplier));
    }

    getFM(F, V, duration) {
        // Simplified Frequency Table look-up logic
        // In real app, this should be a large table.
        // For AI analysis, we use a heuristic based on frequency and duration.
        let base = 1.0;
        if (duration > 1) base -= 0.1;
        if (duration > 2) base -= 0.1;
        if (F > 0.2) base -= (F * 0.05);
        return Math.max(0, base);
    }

    getCM(coupling, V) {
        const isLow = V < 75;
        if (coupling === 'good') return 1.0;
        if (coupling === 'fair') return isLow ? 0.95 : 1.0;
        return isLow ? 0.90 : 0.90;
    }

    getRiskLevel(li) {
        if (li <= 1.0) return 'Nominal';
        if (li <= 2.0) return 'Increased';
        if (li <= 3.0) return 'High';
        return 'Very High';
    }
}

export default NIOSHCalculator;
