/**
 * ComplianceEngine
 * Manages the state of real-time standard work execution.
 */
export class ComplianceEngine {
    constructor(project, matcher) {
        this.project = project;
        this.matcher = matcher;
        this.elements = project.measurements || [];

        // State
        this.currentStepIndex = 0;
        this.actualStartTime = null;
        this.stepStartTime = null;
        this.history = []; // Record of completed steps
        this.anomalies = []; // Record of non-compliant events
        this.isSequenceMismatch = false;
        this.mismatchCount = 0;
    }

    /**
     * Resets the engine state.
     */
    reset() {
        this.currentStepIndex = 0;
        this.actualStartTime = Date.now();
        this.stepStartTime = Date.now();
        this.history = [];
        this.anomalies = [];
        this.isSequenceMismatch = false;
        this.mismatchCount = 0;
    }

    /**
     * Processes a new match result from the matcher.
     * @param {Object} matchResult - From ProjectActionMatcher.match()
     * @returns {Object} - Updated status
     */
    update(matchResult) {
        const expected = this.elements[this.currentStepIndex];
        const now = Date.now();

        if (!this.actualStartTime) this.actualStartTime = now;
        if (!this.stepStartTime) this.stepStartTime = now;

        const currentCT = (now - this.stepStartTime) / 1000;

        if (!matchResult) {
            return this.getStatus(currentCT);
        }

        // Check for sequence compliance
        if (matchResult.elementIndex === this.currentStepIndex) {
            // Operator is performing the CORRECT step
            this.isSequenceMismatch = false;
        } else {
            // Operator is performing a WRONG step (Sequence Mismatch)
            if (!this.isSequenceMismatch) {
                // Log the start of a mismatch
                this.anomalies.push({
                    timestamp: new Date().toISOString(),
                    type: 'SEQUENCE_MISMATCH',
                    expectedStep: expected?.elementName,
                    detectedStep: matchResult.element?.name,
                    score: matchResult.score
                });
            }
            this.isSequenceMismatch = true;
            this.mismatchCount++;
        }

        // Log High CT Variance as anomaly
        if (expected && currentCT > expected.duration * 1.5) {
            const lastAnomaly = this.anomalies[this.anomalies.length - 1];
            // Log if no recent CT anomaly (debounce 5s)
            if (!lastAnomaly || lastAnomaly.type !== 'CT_OVERRUN' || (now - new Date(lastAnomaly.timestamp).getTime()) > 5000) {
                this.anomalies.push({
                    timestamp: new Date().toISOString(),
                    type: 'CT_OVERRUN',
                    step: expected.elementName,
                    actual: Math.round(currentCT * 10) / 10,
                    standard: expected.duration
                });
            }
        }

        return this.getStatus(currentCT, matchResult);
    }

    /**
     * Manually advance to the next step.
     */
    advance() {
        if (this.currentStepIndex < this.elements.length - 1) {
            const completedStep = {
                ...this.elements[this.currentStepIndex],
                actualDuration: (Date.now() - this.stepStartTime) / 1000
            };
            this.history.push(completedStep);

            this.currentStepIndex++;
            this.stepStartTime = Date.now();
            this.isSequenceMismatch = false;
            return true;
        }
        return false;
    }

    getStatus(currentCT, matchResult = null) {
        const expected = this.elements[this.currentStepIndex];
        const roundedCT = Math.round(currentCT * 10) / 10;
        const variance = expected ? (roundedCT - expected.duration) : 0;

        return {
            currentStep: expected,
            stepIndex: this.currentStepIndex,
            totalSteps: this.elements.length,
            actualCT: roundedCT,
            ctVariance: Math.round(variance * 10) / 10,
            isSequenceMismatch: this.isSequenceMismatch,
            match: matchResult,
            history: this.history,
            anomalies: this.anomalies
        };
    }
}

export default ComplianceEngine;
