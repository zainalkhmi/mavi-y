/**
 * Fusion Calculator for Multi-Camera Ergonomic Analysis
 * Combines angles from Front and Side views to provide high-precision data.
 */

class FusionCalculator {
    constructor() {
        // Weights or confidence thresholds could be added here
    }

    /**
     * Fuses angles from two views based on the "Best View" principle.
     * @param {Object} frontAngles - Angles calculated from the Front View
     * @param {Object} sideAngles - Angles calculated from the Side View
     * @returns {Object} Fused angles ready for RULA/REBA calculation
     */
    fuseAngles(frontAngles, sideAngles) {
        if (!frontAngles || !sideAngles) return frontAngles || sideAngles || {};

        const fused = {};

        // --- TRUNK & NECK (Best View: SIDE) ---
        // Flexion/Extension is best seen from the side (Z-axis depth)
        fused.trunk = sideAngles.trunkFlexion !== undefined ? sideAngles.trunkFlexion : frontAngles.trunkFlexion;
        fused.neck = sideAngles.neckFlexion !== undefined ? sideAngles.neckFlexion : frontAngles.neckFlexion;

        // Side bending/Twisting is best seen from the FRONT
        // We pass these as options or separate keys if RULA/REBA supports them
        fused.trunkTwist = frontAngles.trunkTwist;
        fused.neckTwist = frontAngles.neckTwist;


        // --- ARMS (Best View: MIXED & WORST CASE) ---
        // We calculate for both sides and take the "worst" (highest risk) angle for the final score.
        // RULA/REBA typically assess one side at a time (usually the worst).

        // 1. Fuse Left and Right separately first
        const rightArm = {
            upperArm: sideAngles.upperArmFlexionRight !== undefined ? sideAngles.upperArmFlexionRight : frontAngles.upperArmFlexionRight,
            lowerArm: sideAngles.lowerArmFlexionRight !== undefined ? sideAngles.lowerArmFlexionRight : frontAngles.lowerArmFlexionRight,
            wrist: sideAngles.wristFlexionRight !== undefined ? sideAngles.wristFlexionRight : frontAngles.wristFlexionRight
        };

        const leftArm = {
            upperArm: sideAngles.upperArmFlexionLeft !== undefined ? sideAngles.upperArmFlexionLeft : frontAngles.upperArmFlexionLeft,
            lowerArm: sideAngles.lowerArmFlexionLeft !== undefined ? sideAngles.lowerArmFlexionLeft : frontAngles.lowerArmFlexionLeft,
            wrist: sideAngles.wristFlexionLeft !== undefined ? sideAngles.wristFlexionLeft : frontAngles.wristFlexionLeft
        };

        // 2. Determine "Worst" Side
        // Simple heuristic: Sum of deviations from neutral.
        // Upper Arm neutral = 0, Lower Arm neutral = 90 (but here 0-180, so deviation from 90?), Wrist neutral = 0.
        // Actually, RULA scores increase with angle. So higher angle = higher score (mostly).
        const scoreRight = rightArm.upperArm + Math.abs(rightArm.lowerArm - 90) + rightArm.wrist;
        const scoreLeft = leftArm.upperArm + Math.abs(leftArm.lowerArm - 90) + leftArm.wrist;

        const worstSide = scoreRight > scoreLeft ? rightArm : leftArm;

        fused.upperArm = worstSide.upperArm;
        fused.lowerArm = worstSide.lowerArm;
        fused.wrist = worstSide.wrist;


        // --- LEGS (Best View: SIDE) ---
        // Leg support and balance
        // Taking the worst leg angle
        const legRight = sideAngles.legFlexionRight !== undefined ? sideAngles.legFlexionRight : frontAngles.legFlexionRight;
        const legLeft = sideAngles.legFlexionLeft !== undefined ? sideAngles.legFlexionLeft : frontAngles.legFlexionLeft;

        fused.leg = Math.max(legRight || 0, legLeft || 0);
        fused.legSupport = sideAngles.legSupport;

        return fused;
    }
}

export default FusionCalculator;
