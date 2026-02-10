/**
 * PoseNormalizer.js
 * Utilities to normalize pose data for comparison.
 * Ensures that camera distance (scale) and position (translation) do not affect matching.
 */

class PoseNormalizer {

    /**
     * Normalize a single pose keypoint set.
     * Strategy:
     * 1. Translation Invariance: Center pose around a root joint (e.g., Mid-Hip or Nose).
     * 2. Scale Invariance: Scale by torso length (distance between shoulders and hips) or bounding box height.
     * @param {Array} keypoints - Array of {name, x, y, score}
     * @returns {Array} Normalized keypoints {name, x, y} (x,y in range -1 to 1 approx)
     */
    static normalize(keypoints) {
        if (!keypoints || keypoints.length === 0) return [];

        // 1. Find Root (Mid-Hip preferred, else Nose)
        const leftHip = keypoints.find(k => k.name === 'left_hip');
        const rightHip = keypoints.find(k => k.name === 'right_hip');

        let rootX = 0, rootY = 0;
        let validRoot = false;

        if (leftHip && rightHip && leftHip.score > 0.3 && rightHip.score > 0.3) {
            rootX = (leftHip.x + rightHip.x) / 2;
            rootY = (leftHip.y + rightHip.y) / 2;
            validRoot = true;
        } else {
            const nose = keypoints.find(k => k.name === 'nose');
            if (nose) {
                rootX = nose.x;
                rootY = nose.y;
                validRoot = true;
            }
        }

        if (!validRoot) return keypoints; // Cannot normalize without root

        // 2. Calculate Scale (Torso Length preferred)
        let scale = 1;
        const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
        const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');

        if (leftShoulder && rightShoulder && validRoot) {
            // Average distance from root to shoulders
            const distL = Math.hypot(leftShoulder.x - rootX, leftShoulder.y - rootY);
            const distR = Math.hypot(rightShoulder.x - rootX, rightShoulder.y - rootY);
            scale = (distL + distR) / 2;
        }

        if (scale === 0) scale = 1; // Prevent divide by zero

        // 3. Transform
        return keypoints.map(kp => ({
            name: kp.name,
            x: (kp.x - rootX) / scale,
            y: (kp.y - rootY) / scale,
            score: kp.score
        }));
    }

    /**
     * Calculate Similarity Score (Cosine Similarity or Euclidean Distance)
     * Lower is better for Distance, Higher is better for Similarity.
     * Here we return a score 0-1 (1 = Identical)
     */
    static calculateSimilarity(poseA, poseB) {
        const normA = this.normalize(poseA);
        const normB = this.normalize(poseB);

        let totalDist = 0;
        let count = 0;

        // Compare common keypoints
        normA.forEach(kpA => {
            const kpB = normB.find(k => k.name === kpA.name);
            if (kpB && kpA.score > 0.3 && kpB.score > 0.3) {
                const dist = Math.hypot(kpA.x - kpB.x, kpA.y - kpB.y);
                totalDist += dist;
                count++;
            }
        });

        if (count === 0) return 0;

        const avgDist = totalDist / count;
        // Convert distance to probability/score.
        // Heuristic: If avgDist is 0, score 1. If avgDist is large (>0.5), score drops.
        const score = Math.max(0, 1 - avgDist * 2);
        return score;
    }
}

export default PoseNormalizer;
