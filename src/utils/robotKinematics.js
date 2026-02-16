/**
 * robotKinematics.js
 * Utility to normalize robot joint telemetry and compute
 * angle / velocity / acceleration per joint-axis.
 */

export const ROBOT_AXES = ['angle', 'x', 'y', 'z', 'roll', 'pitch', 'yaw', 'rx', 'ry', 'rz'];

const toNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
};

const normalizeDeltaSeconds = (delta) => {
    if (!Number.isFinite(delta) || delta <= 0) return 0;
    // Some callers send ms timestamps, while others send seconds.
    return delta > 10 ? delta / 1000 : delta;
};

/**
 * Normalize robot joint payload into:
 * {
 *   J1: { angle: 10, z: 5 },
 *   J2: { angle: 20 }
 * }
 */
export const normalizeRobotJoints = (robotJoints) => {
    if (!robotJoints) return {};

    // [10, 20, 30] => J1..Jn angle values
    if (Array.isArray(robotJoints) && robotJoints.every(v => typeof v === 'number')) {
        return robotJoints.reduce((acc, angle, idx) => {
            acc[`J${idx + 1}`] = { angle };
            return acc;
        }, {});
    }

    // [{name:'J1',angle:10}, ...]
    if (Array.isArray(robotJoints) && robotJoints.every(v => typeof v === 'object')) {
        return robotJoints.reduce((acc, item, idx) => {
            const jointName = item?.name || item?.id || `J${idx + 1}`;
            const payload = {};
            ROBOT_AXES.forEach(axis => {
                const val = toNumber(item?.[axis]);
                if (val !== null) payload[axis] = val;
            });
            if (Object.keys(payload).length === 0) {
                const fallback = toNumber(item?.value);
                if (fallback !== null) payload.angle = fallback;
            }
            if (Object.keys(payload).length > 0) acc[jointName] = payload;
            return acc;
        }, {});
    }

    // {J1: 10, J2: {angle:20, z:5}}
    if (typeof robotJoints === 'object') {
        return Object.entries(robotJoints).reduce((acc, [jointName, value]) => {
            if (typeof value === 'number') {
                acc[jointName] = { angle: value };
                return acc;
            }

            if (value && typeof value === 'object') {
                const payload = {};
                ROBOT_AXES.forEach(axis => {
                    const v = toNumber(value[axis]);
                    if (v !== null) payload[axis] = v;
                });
                if (Object.keys(payload).length > 0) acc[jointName] = payload;
            }
            return acc;
        }, {});
    }

    return {};
};

export class RobotKinematicsTracker {
    constructor() {
        this.prevTimestamp = null;
        this.prevJoints = {};
        this.prevVelocity = {}; // { joint: { axis: value } }
    }

    reset() {
        this.prevTimestamp = null;
        this.prevJoints = {};
        this.prevVelocity = {};
    }

    update(rawRobotJoints, timestamp) {
        const joints = normalizeRobotJoints(rawRobotJoints);
        const metrics = {};

        const delta = this.prevTimestamp === null ? 0 : normalizeDeltaSeconds(timestamp - this.prevTimestamp);

        Object.entries(joints).forEach(([jointName, axes]) => {
            metrics[jointName] = {
                angle: { ...axes },
                velocity: {},
                acceleration: {}
            };

            Object.entries(axes).forEach(([axis, currentValue]) => {
                const prevValue = this.prevJoints?.[jointName]?.[axis];

                if (delta > 0 && Number.isFinite(prevValue)) {
                    const velocity = (currentValue - prevValue) / delta;
                    metrics[jointName].velocity[axis] = velocity;

                    const prevVel = this.prevVelocity?.[jointName]?.[axis];
                    if (Number.isFinite(prevVel)) {
                        metrics[jointName].acceleration[axis] = (velocity - prevVel) / delta;
                    }
                }
            });
        });

        // Persist for next frame
        this.prevTimestamp = timestamp;
        this.prevJoints = joints;
        this.prevVelocity = Object.entries(metrics).reduce((acc, [jointName, m]) => {
            acc[jointName] = { ...(m.velocity || {}) };
            return acc;
        }, {});

        return {
            joints,
            metrics,
            deltaSeconds: delta
        };
    }
}
