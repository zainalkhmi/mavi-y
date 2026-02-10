/**
 * Angle Calculator
 * Calculate joint angles from pose keypoints for ergonomic analysis
 */

class AngleCalculator {
    /**
     * Calculate angle between three points (in degrees)
     * @param {Object} point1 - First point {x, y}
     * @param {Object} point2 - Vertex point {x, y}
     * @param {Object} point3 - Third point {x, y}
     * @returns {number} Angle in degrees (0-180)
     */
    calculateAngle(point1, point2, point3) {
        if (!point1 || !point2 || !point3) return 0;

        // Calculate vectors
        const vector1 = {
            x: point1.x - point2.x,
            y: point1.y - point2.y
        };

        const vector2 = {
            x: point3.x - point2.x,
            y: point3.y - point2.y
        };

        // Calculate dot product and magnitudes
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x ** 2 + vector1.y ** 2);
        const magnitude2 = Math.sqrt(vector2.x ** 2 + vector2.y ** 2);

        // Calculate angle in radians then convert to degrees
        const angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));
        const angleDeg = (angleRad * 180) / Math.PI;

        return isNaN(angleDeg) ? 0 : angleDeg;
    }

    /**
     * Calculate upper arm angle (shoulder flexion/extension)
     * @param {Object} keypoints - All keypoints
     * @param {string} side - 'left' or 'right'
     * @returns {number} Angle in degrees
     */
    calculateUpperArmAngle(keypoints, side = 'right') {
        const shoulder = keypoints[`${side}_shoulder`];
        const elbow = keypoints[`${side}_elbow`];
        const hip = keypoints[`${side}_hip`];

        if (!shoulder || !elbow || !hip) return 0;

        // Angle between vertical (hip-shoulder) and upper arm (shoulder-elbow)
        const angle = this.calculateAngle(hip, shoulder, elbow);

        // Convert to flexion angle (0 = arm down, 90 = arm forward)
        return 180 - angle;
    }

    /**
     * Calculate lower arm angle (elbow flexion)
     * @param {Object} keypoints - All keypoints
     * @param {string} side - 'left' or 'right'
     * @returns {number} Angle in degrees
     */
    calculateLowerArmAngle(keypoints, side = 'right') {
        const shoulder = keypoints[`${side}_shoulder`];
        const elbow = keypoints[`${side}_elbow`];
        const wrist = keypoints[`${side}_wrist`];

        if (!shoulder || !elbow || !wrist) return 0;

        return this.calculateAngle(shoulder, elbow, wrist);
    }

    /**
     * Calculate wrist angle (wrist flexion/extension)
     * @param {Object} keypoints - All keypoints
     * @param {string} side - 'left' or 'right'
     * @returns {number} Angle in degrees
     */
    calculateWristAngle(keypoints, side = 'right') {
        const elbow = keypoints[`${side}_elbow`];
        const wrist = keypoints[`${side}_wrist`];

        if (!elbow || !wrist) return 0;

        // Calculate deviation from neutral (straight line)
        const deltaY = Math.abs(wrist.y - elbow.y);
        const deltaX = Math.abs(wrist.x - elbow.x);

        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        return angle;
    }

    /**
     * Calculate neck angle (neck flexion)
     * @param {Object} keypoints - All keypoints
     * @returns {number} Angle in degrees
     */
    calculateNeckAngle(keypoints) {
        const nose = keypoints.nose;
        const leftShoulder = keypoints.left_shoulder;
        const rightShoulder = keypoints.right_shoulder;

        if (!nose || !leftShoulder || !rightShoulder) return 0;

        // Calculate midpoint between shoulders
        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        // Calculate neck angle from vertical
        const deltaY = nose.y - shoulderMid.y;
        const deltaX = Math.abs(nose.x - shoulderMid.x);

        const angle = Math.atan2(deltaX, Math.abs(deltaY)) * (180 / Math.PI);
        return angle;
    }

    /**
     * Calculate trunk angle (trunk flexion)
     * @param {Object} keypoints - All keypoints
     * @returns {number} Angle in degrees
     */
    calculateTrunkAngle(keypoints) {
        const leftShoulder = keypoints.left_shoulder;
        const rightShoulder = keypoints.right_shoulder;
        const leftHip = keypoints.left_hip;
        const rightHip = keypoints.right_hip;

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0;

        // Calculate midpoints
        const shoulderMid = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };

        const hipMid = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };

        // Calculate trunk angle from vertical
        const deltaY = Math.abs(shoulderMid.y - hipMid.y);
        const deltaX = Math.abs(shoulderMid.x - hipMid.x);

        const angle = Math.atan2(deltaX, deltaY) * (180 / Math.PI);
        return angle;
    }

    /**
     * Calculate leg angle (knee flexion)
     * @param {Object} keypoints - All keypoints
     * @param {string} side - 'left' or 'right'
     * @returns {number} Angle in degrees
     */
    calculateLegAngle(keypoints, side = 'right') {
        const hip = keypoints[`${side}_hip`];
        const knee = keypoints[`${side}_knee`];
        const ankle = keypoints[`${side}_ankle`];

        if (!hip || !knee || !ankle) return 0;

        return this.calculateAngle(hip, knee, ankle);
    }

    /**
     * Calculate trunk twist (rotation)
     * @param {Object} keypoints - All keypoints
     * @returns {number} Angle in degrees (approximate)
     */
    calculateTrunkTwist(keypoints) {
        const leftShoulder = keypoints.left_shoulder;
        const rightShoulder = keypoints.right_shoulder;
        const leftHip = keypoints.left_hip;
        const rightHip = keypoints.right_hip;

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0;

        // Calculate shoulder width and hip width
        const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
        const hipWidth = Math.abs(leftHip.x - rightHip.x);

        // Simple heuristic: if shoulders are much narrower than expected relative to hips (or vice versa),
        // it implies rotation. However, without depth, this is just a guess.
        // A better 2D proxy is the difference in slope or the relative offset of midpoints.

        // We will return 0 for now as 2D twist is unreliable without temporal tracking or 3D lifting.
        // Placeholder for future logic.
        return 0;
    }

    /**
     * Calculate neck twist (rotation)
     * @param {Object} keypoints - All keypoints
     * @returns {number} Angle in degrees
     */
    calculateNeckTwist(keypoints) {
        // Similar to trunk twist, difficult in 2D.
        return 0;
    }

    /**
     * Calculate all angles for ergonomic analysis (Both sides + Generic fallback)
     * @param {Object} keypoints - All keypoints
     * @param {string} side - 'left' or 'right' (default for generic keys)
     * @returns {Object} All calculated angles
     */
    calculateAllAngles(keypoints, side = 'right') {
        const angles = {
            // Trunk & Neck (Central)
            trunkFlexion: this.calculateTrunkAngle(keypoints),
            neckFlexion: this.calculateNeckAngle(keypoints),
            trunkTwist: this.calculateTrunkTwist(keypoints),
            neckTwist: this.calculateNeckTwist(keypoints),

            // Arms (Right)
            upperArmFlexionRight: this.calculateUpperArmAngle(keypoints, 'right'),
            lowerArmFlexionRight: this.calculateLowerArmAngle(keypoints, 'right'),
            wristFlexionRight: this.calculateWristAngle(keypoints, 'right'),

            // Arms (Left)
            upperArmFlexionLeft: this.calculateUpperArmAngle(keypoints, 'left'),
            lowerArmFlexionLeft: this.calculateLowerArmAngle(keypoints, 'left'),
            wristFlexionLeft: this.calculateWristAngle(keypoints, 'left'),

            // Legs
            legFlexionRight: this.calculateLegAngle(keypoints, 'right'),
            legFlexionLeft: this.calculateLegAngle(keypoints, 'left'),

            // Support
            legSupport: 1
        };

        // Add generic keys for backward compatibility (RULA/REBA expect these)
        // Maps to the requested 'side'
        angles.upperArm = side === 'left' ? angles.upperArmFlexionLeft : angles.upperArmFlexionRight;
        angles.lowerArm = side === 'left' ? angles.lowerArmFlexionLeft : angles.lowerArmFlexionRight;
        angles.wrist = side === 'left' ? angles.wristFlexionLeft : angles.wristFlexionRight;
        angles.neck = angles.neckFlexion;
        angles.trunk = angles.trunkFlexion;
        angles.leg = side === 'left' ? angles.legFlexionLeft : angles.legFlexionRight;

        return angles;
    }

    /**
     * Smooth angles using moving average
     * @param {Array} angleHistory - Array of previous angle values
     * @param {number} newAngle - New angle value
     * @param {number} windowSize - Size of moving average window
     * @returns {number} Smoothed angle
     */
    smoothAngle(angleHistory, newAngle, windowSize = 5) {
        angleHistory.push(newAngle);

        if (angleHistory.length > windowSize) {
            angleHistory.shift();
        }

        const sum = angleHistory.reduce((a, b) => a + b, 0);
        return sum / angleHistory.length;
    }
}

export default AngleCalculator;
