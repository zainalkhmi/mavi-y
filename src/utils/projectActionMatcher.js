import { compareWithGoldenCycle, createPoseSequence } from './motionComparator';

/**
 * ProjectActionMatcher
 * Utility to match real-time pose sequences against project-defined work elements.
 */

export class ProjectActionMatcher {
    constructor(project) {
        this.project = project;
        this.referenceElements = this.prepareReferenceElements(project);
        this.scoreHistory = new Map(); // Store history for smoothing
    }

    /**
     * Prepares reference data from project measurements.
     */
    prepareReferenceElements(project) {
        if (!project || !project.measurements) return [];

        return project.measurements.map(m => ({
            id: m.id,
            name: m.elementName,
            therblig: m.therblig,
            standardDuration: m.duration,
            referenceSequence: m.motionSequence || null
        }));
    }

    /**
     * Matches a live sequence of poses against the project elements.
     * @param {Array} liveKeypointsSequence - Recent frames of keypoints
     * @param {number} nextExpectedIndex - The index of the step we expect next
     * @returns {Object} - Match results
     */
    match(liveKeypointsSequence, nextExpectedIndex = 0) {
        if (!liveKeypointsSequence || liveKeypointsSequence.length < 5) return null;

        const liveSeq = createPoseSequence(liveKeypointsSequence);
        const results = [];

        // Scan ALL elements to find the best possible match
        this.referenceElements.forEach((el, index) => {
            if (!el.referenceSequence) return;

            // Basic DTW comparison
            const comparison = compareWithGoldenCycle(liveSeq, el.referenceSequence);
            let score = comparison.score;

            // --- PRECISION REFINEMENT ---
            // 1. Contextual Bias: Give a small boost if this is the step we expect
            if (index === nextExpectedIndex) {
                score += 10;
            }

            // 2. Smoothing: Use a moving average for this element's score
            if (!this.scoreHistory.has(index)) {
                this.scoreHistory.set(index, []);
            }
            const history = this.scoreHistory.get(index);
            history.push(score);
            if (history.length > 5) history.shift();

            const smoothedScore = history.reduce((a, b) => a + b, 0) / history.length;

            results.push({
                elementIndex: index,
                element: el,
                score: smoothedScore,
                rawScore: score,
                isContextMatch: index === nextExpectedIndex
            });
        });

        if (results.length === 0) return null;

        // Sort by smoothed score
        results.sort((a, b) => b.score - a.score);

        // Filter for reasonable confidence (Tuned to 70% for higher precision)
        const bestMatch = results[0];
        if (bestMatch && bestMatch.score > 70) {
            return bestMatch;
        }

        return null;
    }
}

export default ProjectActionMatcher;
