/**
 * RULA Calculator
 * Rapid Upper Limb Assessment for ergonomic risk evaluation
 * Based on McAtamney & Corlett (1993)
 */

class RULACalculator {
    constructor() {
        // RULA Score Tables
        this.tableA = [
            // Wrist scores (rows) vs Wrist Twist scores (columns)
            [1, 2, 2, 2, 3, 3, 3],
            [2, 2, 2, 2, 3, 3, 3],
            [2, 3, 3, 3, 3, 3, 4],
            [3, 3, 3, 3, 3, 4, 4]
        ];

        this.tableB = [
            // Neck scores (rows) vs Trunk scores (columns)
            [1, 2, 3, 5, 6, 7, 8],
            [2, 2, 3, 5, 6, 7, 8],
            [3, 3, 3, 5, 6, 7, 8],
            [5, 5, 5, 6, 7, 8, 8],
            [7, 7, 7, 7, 7, 8, 8],
            [8, 8, 8, 8, 8, 8, 8]
        ];

        this.tableC = [
            // Score A (rows) vs Score B (columns)
            [1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7, 7],
            [2, 2, 3, 4, 4, 5, 5, 6, 6, 7, 7, 7],
            [3, 3, 3, 4, 4, 5, 6, 6, 7, 7, 7, 8],
            [3, 3, 3, 4, 5, 6, 6, 7, 7, 7, 7, 8],
            [4, 4, 4, 5, 6, 7, 7, 7, 7, 7, 8, 8],
            [4, 4, 5, 6, 7, 7, 7, 7, 7, 8, 8, 9],
            [5, 5, 6, 7, 7, 7, 7, 8, 8, 9, 9, 9],
            [5, 5, 6, 7, 7, 7, 8, 8, 9, 9, 9, 9]
        ];
    }

    /**
     * Score upper arm position
     * @param {number} angle - Upper arm angle in degrees
     * @param {boolean} raised - Shoulder is raised
     * @param {boolean} abducted - Arm is abducted
     * @param {boolean} supported - Arm is supported
     * @returns {number} Score 1-4
     */
    scoreUpperArm(angle, raised = false, abducted = false, supported = false) {
        let score = 1;

        if (angle < 20) {
            score = 1;
        } else if (angle >= 20 && angle <= 45) {
            score = 2;
        } else if (angle > 45 && angle <= 90) {
            score = 3;
        } else {
            score = 4;
        }

        // Adjustments
        if (raised) score += 1;
        if (abducted) score += 1;
        if (supported) score -= 1;

        return Math.max(1, Math.min(6, score));
    }

    /**
     * Score lower arm position
     * @param {number} angle - Lower arm angle in degrees
     * @param {boolean} crossingMidline - Arm crosses body midline
     * @returns {number} Score 1-3
     */
    scoreLowerArm(angle, crossingMidline = false) {
        let score = 2; // Default: 60-100 degrees

        if (angle < 60 || angle > 100) {
            score = 2;
        } else {
            score = 1;
        }

        if (crossingMidline) score += 1;

        return Math.max(1, Math.min(3, score));
    }

    /**
     * Score wrist position
     * @param {number} angle - Wrist angle in degrees from neutral
     * @param {boolean} deviation - Wrist is deviated from midline
     * @returns {number} Score 1-4
     */
    scoreWrist(angle, deviation = false) {
        let score = 1;

        if (angle >= 0 && angle <= 15) {
            score = 1;
        } else {
            score = 2;
        }

        if (deviation) score += 1;

        return Math.max(1, Math.min(4, score));
    }

    /**
     * Score wrist twist
     * @param {boolean} midRange - Wrist is in mid-range of twist
     * @returns {number} Score 1-2
     */
    scoreWristTwist(midRange = true) {
        return midRange ? 1 : 2;
    }

    /**
     * Score neck position
     * @param {number} angle - Neck angle in degrees
     * @param {boolean} twisted - Neck is twisted
     * @param {boolean} sideBent - Neck is side bent
     * @returns {number} Score 1-4
     */
    scoreNeck(angle, twisted = false, sideBent = false) {
        let score = 1;

        if (angle >= 0 && angle <= 10) {
            score = 1;
        } else if (angle > 10 && angle <= 20) {
            score = 2;
        } else if (angle > 20) {
            score = 3;
        } else {
            score = 4; // Extended
        }

        if (twisted || sideBent) score += 1;

        return Math.max(1, Math.min(6, score));
    }

    /**
     * Score trunk position
     * @param {number} angle - Trunk angle in degrees
     * @param {boolean} twisted - Trunk is twisted
     * @param {boolean} sideBent - Trunk is side bent
     * @returns {number} Score 1-4
     */
    scoreTrunk(angle, twisted = false, sideBent = false) {
        let score = 1;

        if (angle >= 0 && angle <= 10) {
            score = 1;
        } else if (angle > 10 && angle <= 20) {
            score = 2;
        } else if (angle > 20 && angle <= 60) {
            score = 3;
        } else {
            score = 4;
        }

        if (twisted || sideBent) score += 1;

        return Math.max(1, Math.min(6, score));
    }

    /**
     * Score legs position
     * @param {boolean} supported - Legs are well supported
     * @param {boolean} balanced - Weight is balanced
     * @returns {number} Score 1-2
     */
    scoreLegs(supported = true, balanced = true) {
        return (supported && balanced) ? 1 : 2;
    }

    /**
     * Calculate RULA score from angles
     * @param {Object} angles - All joint angles
     * @param {Object} options - Additional scoring options
     * @returns {Object} Complete RULA assessment
     */
    calculate(angles, options = {}) {
        // Group A: Arm and Wrist
        const upperArmScore = this.scoreUpperArm(
            angles.upperArm,
            options.shoulderRaised || false,
            options.armAbducted || false,
            options.armSupported || false
        );

        const lowerArmScore = this.scoreLowerArm(
            angles.lowerArm,
            options.crossingMidline || false
        );

        const wristScore = this.scoreWrist(
            angles.wrist,
            options.wristDeviation || false
        );

        const wristTwistScore = this.scoreWristTwist(
            options.wristMidRange !== false
        );

        // Group B: Neck, Trunk, and Legs
        const neckScore = this.scoreNeck(
            angles.neck,
            options.neckTwisted || false,
            options.neckSideBent || false
        );

        const trunkScore = this.scoreTrunk(
            angles.trunk,
            options.trunkTwisted || false,
            options.trunkSideBent || false
        );

        const legScore = this.scoreLegs(
            options.legsSupported !== false,
            options.weightBalanced !== false
        );

        // Calculate posture scores
        const postureScoreA = this.calculatePostureScoreA(
            upperArmScore,
            lowerArmScore,
            wristScore,
            wristTwistScore
        );

        const postureScoreB = this.calculatePostureScoreB(
            neckScore,
            trunkScore,
            legScore
        );

        // Add muscle use and force scores
        const muscleUseScore = options.muscleUse || 0; // 0 or 1
        const forceScore = options.force || 0; // 0, 1, 2, or 3

        const scoreA = postureScoreA + muscleUseScore + forceScore;
        const scoreB = postureScoreB + muscleUseScore + forceScore;

        // Calculate final RULA score
        const finalScore = this.calculateFinalScore(scoreA, scoreB);
        const riskLevel = this.getRiskLevel(finalScore);

        return {
            scores: {
                upperArm: upperArmScore,
                lowerArm: lowerArmScore,
                wrist: wristScore,
                wristTwist: wristTwistScore,
                neck: neckScore,
                trunk: trunkScore,
                legs: legScore
            },
            postureScores: {
                scoreA: postureScoreA,
                scoreB: postureScoreB
            },
            adjustedScores: {
                scoreA,
                scoreB
            },
            finalScore,
            riskLevel,
            recommendation: this.getRecommendation(finalScore)
        };
    }

    /**
     * Calculate posture score A (arm and wrist)
     */
    calculatePostureScoreA(upperArm, lowerArm, wrist, wristTwist) {
        // Simplified calculation - in real RULA, use lookup table
        return Math.min(8, upperArm + lowerArm + wrist + wristTwist);
    }

    /**
     * Calculate posture score B (neck, trunk, legs)
     */
    calculatePostureScoreB(neck, trunk, legs) {
        // Simplified calculation - in real RULA, use lookup table
        return Math.min(9, neck + trunk + legs);
    }

    /**
     * Calculate final RULA score from score A and B
     */
    calculateFinalScore(scoreA, scoreB) {
        // Simplified - use tableC for accurate scoring
        const row = Math.min(scoreA - 1, 7);
        const col = Math.min(scoreB - 1, 11);

        if (this.tableC[row] && this.tableC[row][col]) {
            return this.tableC[row][col];
        }

        return Math.min(7, Math.ceil((scoreA + scoreB) / 2));
    }

    /**
     * Get risk level from RULA score
     * @param {number} score - Final RULA score (1-7)
     * @returns {string} Risk level
     */
    getRiskLevel(score) {
        if (score <= 2) return 'Acceptable';
        if (score <= 4) return 'Low Risk';
        if (score <= 6) return 'Medium Risk';
        return 'High Risk';
    }

    /**
     * Get recommendation based on RULA score
     * @param {number} score - Final RULA score
     * @returns {string} Recommendation
     */
    getRecommendation(score) {
        if (score <= 2) {
            return 'Posture is acceptable if not maintained for long periods.';
        } else if (score <= 4) {
            return 'Further investigation needed. Changes may be required.';
        } else if (score <= 6) {
            return 'Investigation and changes required soon.';
        } else {
            return 'Investigation and changes required immediately.';
        }
    }
}

export default RULACalculator;
