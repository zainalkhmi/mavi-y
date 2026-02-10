/**
 * REBA Calculator
 * Rapid Entire Body Assessment for ergonomic risk evaluation
 * Based on Hignett & McAtamney (2000)
 */

class REBACalculator {
    constructor() {
        // Table A: Neck, Trunk, Legs
        this.tableA = [
            // Trunk Score 1
            [
                [1, 2, 3, 4], // Neck 1, Legs 1-4
                [2, 3, 4, 5], // Neck 2
                [2, 4, 5, 6]  // Neck 3
            ],
            // Trunk Score 2
            [
                [2, 3, 4, 5],
                [3, 4, 5, 6],
                [4, 5, 6, 7]
            ],
            // Trunk Score 3
            [
                [2, 4, 5, 6],
                [4, 5, 6, 7],
                [5, 6, 7, 8]
            ],
            // Trunk Score 4
            [
                [3, 5, 6, 7],
                [5, 6, 7, 8],
                [6, 7, 8, 9]
            ],
            // Trunk Score 5
            [
                [4, 6, 7, 8],
                [6, 7, 8, 9],
                [7, 8, 9, 9]
            ]
        ];

        // Table B: Upper Arm, Lower Arm, Wrist
        this.tableB = [
            // Lower Arm 1
            [
                // Wrist 1
                [1, 2, 2], // Upper Arm 1-6 (simplified mapping, actual table is larger)
                // Wrist 2
                [1, 2, 3],
                // Wrist 3
                [3, 4, 5]
            ],
            // Lower Arm 2
            [
                [2, 3, 4],
                [3, 4, 5],
                [4, 5, 5]
            ]
        ];

        // Table C: Score A vs Score B
        this.tableC = [
            // Score A (rows 1-12) vs Score B (cols 1-12)
            [1, 1, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7],
            [1, 2, 2, 3, 4, 4, 5, 6, 6, 7, 7, 8],
            [2, 3, 3, 3, 4, 5, 6, 7, 7, 8, 8, 8],
            [3, 4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9],
            [4, 4, 4, 5, 6, 7, 8, 8, 9, 9, 9, 9],
            [6, 6, 6, 7, 8, 8, 9, 9, 10, 10, 10, 10],
            [7, 7, 7, 8, 9, 9, 9, 10, 10, 11, 11, 11],
            [8, 8, 8, 9, 10, 10, 10, 10, 10, 11, 11, 11],
            [9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12, 12],
            [10, 10, 10, 11, 11, 11, 11, 12, 12, 12, 12, 12],
            [11, 11, 11, 11, 12, 12, 12, 12, 12, 12, 12, 12],
            [12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12]
        ];
    }

    /**
     * Score Neck
     * @param {number} angle - Neck flexion/extension angle
     * @param {boolean} twisted - Neck twisted
     * @param {boolean} sideBent - Neck side bent
     */
    scoreNeck(angle, twisted = false, sideBent = false) {
        let score = 1;
        if (angle >= 0 && angle <= 20) score = 1;
        else if (angle > 20) score = 2;

        if (twisted || sideBent) score += 1;
        return Math.min(3, score);
    }

    /**
     * Score Trunk
     * @param {number} angle - Trunk flexion/extension angle
     * @param {boolean} twisted - Trunk twisted
     * @param {boolean} sideBent - Trunk side bent
     */
    scoreTrunk(angle, twisted = false, sideBent = false) {
        let score = 1;
        if (angle === 0) score = 1;
        else if (angle > 0 && angle <= 20) score = 2;
        else if (angle > 20 && angle <= 60) score = 3;
        else if (angle > 60) score = 4;

        if (twisted || sideBent) score += 1;
        return Math.min(5, score);
    }

    /**
     * Score Legs
     * @param {boolean} bilateral - Weight on both legs
     * @param {boolean} walking - Walking or sitting
     * @param {number} angle - Knee flexion angle
     */
    scoreLegs(bilateral = true, walking = false, angle = 0) {
        let score = 1;
        if (bilateral && !walking) score = 1;
        else score = 2;

        if (angle > 30 && angle < 60) score += 1;
        if (angle >= 60) score += 2;

        return Math.min(4, score);
    }

    /**
     * Score Upper Arm
     * @param {number} angle - Flexion/extension angle
     * @param {boolean} abducted - Arm abducted
     * @param {boolean} raised - Shoulder raised
     * @param {boolean} supported - Arm supported (leaning)
     */
    scoreUpperArm(angle, abducted = false, raised = false, supported = false) {
        let score = 1;
        if (angle >= 0 && angle <= 20) score = 1;
        else if (angle > 20 && angle <= 45) score = 2;
        else if (angle > 45 && angle <= 90) score = 3;
        else score = 4;

        if (abducted) score += 1;
        if (raised) score += 1;
        if (supported) score -= 1;

        return Math.max(1, Math.min(6, score));
    }

    /**
     * Score Lower Arm
     * @param {number} angle - Flexion angle
     */
    scoreLowerArm(angle) {
        if (angle >= 60 && angle <= 100) return 1;
        return 2;
    }

    /**
     * Score Wrist
     * @param {number} angle - Flexion/extension angle
     * @param {boolean} deviated - Wrist deviated
     * @param {boolean} twisted - Wrist twisted
     */
    scoreWrist(angle, deviated = false, twisted = false) {
        let score = 1;
        if (angle >= 0 && angle <= 15) score = 1;
        else score = 2;

        if (deviated || twisted) score += 1;
        return Math.min(3, score);
    }

    /**
     * Calculate REBA Score
     * @param {Object} angles - Calculated angles
     * @param {Object} options - Additional observations
     */
    calculate(angles, options = {}) {
        // Group A: Neck, Trunk, Legs
        const neckScore = this.scoreNeck(angles.neck, options.neckTwisted, options.neckSideBent);
        const trunkScore = this.scoreTrunk(angles.trunk, options.trunkTwisted, options.trunkSideBent);
        const legScore = this.scoreLegs(options.legsBilateral, options.walking, angles.leg);

        // Calculate Score A (Simplified lookup)
        const scoreA = Math.min(12, neckScore + trunkScore + legScore);

        // Add Load/Force Score
        const loadScore = options.load || 0; // 0, 1, 2
        const scoreA_Total = scoreA + loadScore;

        // Group B: Arms & Wrists
        const upperArmScore = this.scoreUpperArm(angles.upperArm, options.armAbducted, options.shoulderRaised, options.armSupported);
        const lowerArmScore = this.scoreLowerArm(angles.lowerArm);
        const wristScore = this.scoreWrist(angles.wrist, options.wristDeviated, options.wristTwisted);

        // Calculate Score B (Simplified lookup)
        const scoreB = Math.min(12, upperArmScore + lowerArmScore + wristScore);

        // Add Coupling Score
        const couplingScore = options.coupling || 0; // 0 (Good), 1 (Fair), 2 (Poor), 3 (Unacceptable)
        const scoreB_Total = scoreB + couplingScore;

        // Table C: Final Score
        const row = Math.min(scoreA_Total - 1, 11);
        const col = Math.min(scoreB_Total - 1, 11);
        let scoreC = 1;

        if (this.tableC[row] && this.tableC[row][col]) {
            scoreC = this.tableC[row][col];
        } else {
            scoreC = Math.min(12, Math.ceil((scoreA_Total + scoreB_Total) / 2));
        }

        // Activity Score
        const activityScore = options.activity || 0; // +1 if static >1min, +1 if repeated >4x/min, +1 if rapid change

        const finalScore = scoreC + activityScore;
        const riskLevel = this.getRiskLevel(finalScore);

        return {
            scores: {
                neck: neckScore,
                trunk: trunkScore,
                legs: legScore,
                upperArm: upperArmScore,
                lowerArm: lowerArmScore,
                wrist: wristScore
            },
            groupScores: {
                scoreA: scoreA_Total,
                scoreB: scoreB_Total,
                scoreC
            },
            finalScore,
            riskLevel,
            recommendation: this.getRecommendation(finalScore)
        };
    }

    getRiskLevel(score) {
        if (score === 1) return 'Negligible';
        if (score <= 3) return 'Low Risk';
        if (score <= 7) return 'Medium Risk';
        if (score <= 10) return 'High Risk';
        return 'Very High Risk';
    }

    getRecommendation(score) {
        if (score === 1) return 'None necessary';
        if (score <= 3) return 'May be necessary';
        if (score <= 7) return 'Necessary';
        if (score <= 10) return 'Necessary soon';
        return 'Necessary NOW';
    }
}

export default REBACalculator;
