/**
 * DTWEngine.js
 * Implements Dynamic Time Warping for matching motion sequences.
 */

import PoseNormalizer from './PoseNormalizer.js';

class DTWEngine {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 0.2; // Sakoe-Chiba band as percentage of sequence length
        this.distanceThreshold = options.threshold || 0.4;
    }

    /**
     * Compute the min distance between two sequences of poses.
     * @param {Array} sequenceA - Array of poses [{keypoints: []}, ...]
     * @param {Array} sequenceB - Array of poses [{keypoints: []}, ...]
     * @returns {Object} { distance, normalizedDistance }
     */
    compute(sequenceA, sequenceB) {
        if (!sequenceA || !sequenceB || sequenceA.length === 0 || sequenceB.length === 0) {
            return { distance: Infinity, normalizedDistance: 1.0 };
        }

        const n = sequenceA.length;
        const m = sequenceB.length;

        // Initialize cost matrix
        const dtw = Array.from({ length: n + 1 }, () => Array(m + 1).fill(Infinity));
        dtw[0][0] = 0;

        // Constraint window (Sakoe-Chiba band)
        const window = Math.max(Math.abs(n - m), Math.floor(this.windowSize * Math.max(n, m)));

        for (let i = 1; i <= n; i++) {
            for (let j = Math.max(1, i - window); j <= Math.min(m, i + window); j++) {
                const cost = this.poseDistance(sequenceA[i - 1], sequenceB[j - 1]);
                dtw[i][j] = cost + Math.min(
                    dtw[i - 1][j],    // insertion
                    dtw[i][j - 1],    // deletion
                    dtw[i - 1][j - 1] // match
                );
            }
        }

        const distance = dtw[n][m];
        const normalizedDistance = distance / (n + m); // Rough normalization by path length

        return {
            distance,
            normalizedDistance,
            isMatch: normalizedDistance < this.distanceThreshold
        };
    }

    /**
     * Calculate distance between two poses.
     * Uses normalized euclidean distance between keypoints.
     */
    poseDistance(poseA, poseB) {
        if (!poseA || !poseB) return 1.0;

        const kpsA = poseA.keypoints || poseA;
        const kpsB = poseB.keypoints || poseB;

        // We use PoseNormalizer's logic but return the raw distance
        const normA = PoseNormalizer.normalize(kpsA);
        const normB = PoseNormalizer.normalize(kpsB);

        let totalDist = 0;
        let count = 0;

        normA.forEach(kpA => {
            const kpB = normB.find(k => k.name === kpA.name);
            if (kpB && kpA.score > 0.3 && kpB.score > 0.3) {
                totalDist += Math.hypot(kpA.x - kpB.x, kpA.y - kpB.y);
                count++;
            }
        });

        if (count === 0) return 1.0;
        return totalDist / count;
    }

    /**
     * Helper to prepare/normalize a sequence
     */
    prepareSequence(poses) {
        return poses.map(p => ({
            keypoints: PoseNormalizer.normalize(p.keypoints || p)
        }));
    }
}

export const dtwEngine = new DTWEngine();
export default DTWEngine;
