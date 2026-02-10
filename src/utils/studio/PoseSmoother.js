/**
 * PoseSmoother.js
 * Implements temporal smoothing for Pose Detection keypoints to reduce jitter.
 * Uses Exponential Moving Average (EMA).
 */

class PoseSmoother {
    constructor(alpha = 0.5) {
        this.alpha = alpha;
        this.prevKeypoints = null;
        this.velocities = {}; // Track velocity (dx, dy) for each joint
        this.persistence = {}; // Track missing frames
        this.maxPersistence = 20; // Hold point for ~0.7s at 30fps
        this.decayFactor = 0.92;  // Score decay
        this.friction = 0.8;      // Velocity friction (slow down extrapolation)

        // Anatomical Constraints (Parent -> Child mapping with max length ratios)
        // Values are normalized distance multipliers based on reference frames
        this.topology = {
            'left_elbow': 'left_shoulder',
            'left_wrist': 'left_elbow',
            'right_elbow': 'right_shoulder',
            'right_wrist': 'right_elbow',
            'left_knee': 'left_hip',
            'left_ankle': 'left_knee',
            'right_knee': 'right_hip',
            'right_ankle': 'right_knee'
        };
        this.boneLengths = {}; // Adaptive bone lengths calculated during high-confidence frames
    }

    /**
     * Smooths the incoming keypoints using EMA and handles occlusions with Kinematic Prediction.
     */
    smooth(keypoints) {
        if (!keypoints || keypoints.length === 0) return keypoints;

        if (!this.prevKeypoints) {
            this.prevKeypoints = keypoints.map(k => ({ ...k }));
            return keypoints;
        }

        // 1. Calculate/Update Adaptive Bone Lengths for Constraints
        this.updateAnatomicalFidelity(keypoints);

        const smoothedKeypoints = keypoints.map((currentKp, index) => {
            const name = currentKp.name;
            const prevKp = this.prevKeypoints[index];

            if (this.persistence[name] === undefined) this.persistence[name] = 0;
            if (this.velocities[name] === undefined) this.velocities[name] = { dx: 0, dy: 0 };

            // OCCLUSION LOGIC: Kinematic Prediction
            if (currentKp.score < 0.25 && prevKp) {
                this.persistence[name]++;

                if (this.persistence[name] <= this.maxPersistence) {
                    // PREDICT Position: LastPos + (Velocity * Friction)
                    const vel = this.velocities[name];
                    let nextX = prevKp.x + (vel.dx * this.friction);
                    let nextY = prevKp.y + (vel.dy * this.friction);

                    // Apply Anatomical Leashing (Constraint)
                    const parentName = this.topology[name];
                    if (parentName) {
                        const parent = this.prevKeypoints.find(k => k.name === parentName);
                        const maxLen = this.boneLengths[name];
                        if (parent && maxLen) {
                            const dx = nextX - parent.x;
                            const dy = nextY - parent.y;
                            const dist = Math.sqrt(dx * dx + dy * dy);
                            if (dist > maxLen * 1.2) { // 20% slack
                                const scale = (maxLen * 1.2) / dist;
                                nextX = parent.x + (dx * scale);
                                nextY = parent.y + (dy * scale);
                            }
                        }
                    }

                    // Decay velocity for next frame
                    this.velocities[name] = { dx: vel.dx * this.friction, dy: vel.dy * this.friction };

                    return {
                        ...prevKp,
                        x: nextX,
                        y: nextY,
                        score: prevKp.score * this.decayFactor,
                        isPredicted: true
                    };
                }
                return { ...currentKp };
            }

            // POINT VISIBLE: Update Velocity and Position
            this.persistence[name] = 0;

            const dx = currentKp.x - prevKp.x;
            const dy = currentKp.y - prevKp.y;
            // Smooth velocity too
            this.velocities[name] = {
                dx: this.alpha * dx + (1 - this.alpha) * (this.velocities[name].dx || 0),
                dy: this.alpha * dy + (1 - this.alpha) * (this.velocities[name].dy || 0)
            };

            // Standard EMA Smoothing
            const smoothX = this.alpha * currentKp.x + (1 - this.alpha) * prevKp.x;
            const smoothY = this.alpha * currentKp.y + (1 - this.alpha) * prevKp.y;

            return {
                ...currentKp,
                x: smoothX,
                y: smoothY,
                score: currentKp.score,
                isPredicted: false
            };
        });

        this.prevKeypoints = smoothedKeypoints;
        return smoothedKeypoints;
    }

    /**
     * Updates recorded bone lengths when both parent and child are visible.
     * Used for clamping predictions to realistic distances.
     */
    updateAnatomicalFidelity(keypoints) {
        Object.entries(this.topology).forEach(([child, parent]) => {
            const kpChild = keypoints.find(k => k.name === child);
            const kpParent = keypoints.find(k => k.name === parent);

            if (kpChild && kpParent && kpChild.score > 0.6 && kpParent.score > 0.6) {
                const dist = Math.sqrt(Math.pow(kpChild.x - kpParent.x, 2) + Math.pow(kpChild.y - kpParent.y, 2));
                // EMA for bone length to handle perspective changes
                this.boneLengths[child] = this.boneLengths[child]
                    ? 0.1 * dist + 0.9 * this.boneLengths[child]
                    : dist;
            }
        });
    }

    reset() {
        this.prevKeypoints = null;
        this.velocities = {};
        this.persistence = {};
        this.boneLengths = {};
    }

    /**
     * Adjust smoothing factor dynamically
     * @param {number} newAlpha 
     */
    setAlpha(newAlpha) {
        this.alpha = Math.max(0.1, Math.min(1.0, newAlpha));
    }
}

export default PoseSmoother;
