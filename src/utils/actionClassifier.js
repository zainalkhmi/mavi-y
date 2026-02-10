import { getKeypoint, calculateDistance, calculateAngle } from './poseDetector';

/**
 * Therblig action definitions
 */
export const THERBLIG_ACTIONS = {
    'Reach': {
        code: 'R',
        color: '#00ff00',
        description: 'Moving hand to object location'
    },
    'Grasp': {
        code: 'G',
        color: '#0000ff',
        description: 'Closing hand around object'
    },
    'Move': {
        code: 'M',
        color: '#ff0000',
        description: 'Moving object to new location'
    },
    'Position': {
        code: 'P',
        color: '#ffff00',
        description: 'Aligning or orienting object'
    },
    'Release': {
        code: 'RL',
        color: '#ff00ff',
        description: 'Letting go of object'
    },
    'Hold': {
        code: 'H',
        color: '#00ffff',
        description: 'Holding object in place'
    },
    'Inspect': {
        code: 'I',
        color: '#ffa500',
        description: 'Examining object'
    },
    'Idle': {
        code: 'ID',
        color: '#808080',
        description: 'No action detected'
    }
};

/**
 * Calculate velocity between two poses
 * @param {Object} currentPose 
 * @param {Object} previousPose 
 * @returns {number}
 */
const calculateVelocity = (currentPose, previousPose) => {
    if (!currentPose || !previousPose) return 0;

    const currentWrist = getKeypoint(currentPose.keypoints, 'right_wrist');
    const previousWrist = getKeypoint(previousPose.keypoints, 'right_wrist');

    if (!currentWrist || !previousWrist) return 0;

    return calculateDistance(previousWrist, currentWrist);
};

/**
 * Detect if hand is near an object location
 * @param {Object} pose 
 * @param {Object} targetLocation 
 * @returns {boolean}
 */
const isHandNearTarget = (pose, targetLocation = null) => {
    const wrist = getKeypoint(pose.keypoints, 'right_wrist');
    const elbow = getKeypoint(pose.keypoints, 'right_elbow');

    if (!wrist || !elbow) return false;

    // If no target specified, check if arm is extended
    const armExtension = calculateDistance(wrist, elbow);
    return armExtension > 100; // threshold for extended arm
};

/**
 * Detect if hand is in grasping position
 * @param {Object} pose 
 * @returns {boolean}
 */
const isGraspingPosition = (pose) => {
    const wrist = getKeypoint(pose.keypoints, 'right_wrist');
    const elbow = getKeypoint(pose.keypoints, 'right_elbow');
    const shoulder = getKeypoint(pose.keypoints, 'right_shoulder');

    if (!wrist || !elbow || !shoulder) return false;

    // Check if arm is bent (elbow angle < 120 degrees)
    const elbowAngle = calculateAngle(shoulder, elbow, wrist);
    return elbowAngle < 120;
};

/**
 * Detect if object is being positioned
 * @param {Object} pose 
 * @param {number} velocity 
 * @returns {boolean}
 */
const isPositioning = (pose, velocity) => {
    const wrist = getKeypoint(pose.keypoints, 'right_wrist');
    const elbow = getKeypoint(pose.keypoints, 'right_elbow');

    if (!wrist || !elbow) return false;

    // Low velocity + specific arm angle indicates positioning
    return velocity < 5 && wrist.y < elbow.y; // hand above elbow
};

/**
 * Main action classifier
 * @param {Object} currentPose 
 * @param {Object} previousPose 
 * @param {string} previousAction 
 * @returns {Object} { action: string, confidence: number, therblig: string }
 */
export const classifyAction = (currentPose, previousPose, previousAction = 'Idle') => {
    if (!currentPose || !currentPose.keypoints) {
        return {
            action: 'Idle',
            confidence: 1.0,
            therblig: THERBLIG_ACTIONS['Idle'].code,
            color: THERBLIG_ACTIONS['Idle'].color
        };
    }

    const velocity = calculateVelocity(currentPose, previousPose);
    const wrist = getKeypoint(currentPose.keypoints, 'right_wrist');

    if (!wrist || wrist.score < 0.3) {
        return {
            action: 'Idle',
            confidence: 0.5,
            therblig: THERBLIG_ACTIONS['Idle'].code,
            color: THERBLIG_ACTIONS['Idle'].color
        };
    }

    // Rule-based classification
    let action = 'Idle';
    let confidence = 0.5;

    // REACH: High velocity, arm extending
    if (velocity > 10 && isHandNearTarget(currentPose)) {
        action = 'Reach';
        confidence = Math.min(0.95, 0.7 + (velocity / 100));
    }
    // GRASP: Low velocity, hand in grasping position
    else if (velocity < 5 && isGraspingPosition(currentPose)) {
        action = 'Grasp';
        confidence = 0.85;
    }
    // MOVE: Medium-high velocity after grasp
    else if (velocity > 8 && (previousAction === 'Grasp' || previousAction === 'Move')) {
        action = 'Move';
        confidence = Math.min(0.92, 0.75 + (velocity / 80));
    }
    // POSITION: Low velocity, precise movement
    else if (isPositioning(currentPose, velocity)) {
        action = 'Position';
        confidence = 0.82;
    }
    // RELEASE: After position/move, sudden velocity drop
    else if (velocity < 3 && (previousAction === 'Position' || previousAction === 'Move')) {
        action = 'Release';
        confidence = 0.88;
    }
    // HOLD: Very low velocity after grasp
    else if (velocity < 2 && previousAction === 'Grasp') {
        action = 'Hold';
        confidence = 0.80;
    }

    const actionData = THERBLIG_ACTIONS[action];

    return {
        action,
        confidence,
        therblig: actionData.code,
        color: actionData.color,
        description: actionData.description
    };
};

/**
 * Smooth action sequence by removing noise
 * @param {Array} actionSequence 
 * @param {number} minDuration minimum frames for valid action
 * @returns {Array}
 */
export const smoothActionSequence = (actionSequence, minDuration = 5) => {
    if (!actionSequence || actionSequence.length === 0) return [];

    const smoothed = [];
    let currentAction = actionSequence[0];
    let actionStart = 0;
    let actionCount = 1;

    for (let i = 1; i < actionSequence.length; i++) {
        if (actionSequence[i].action === currentAction.action) {
            actionCount++;
        } else {
            // Save previous action if it meets minimum duration
            if (actionCount >= minDuration) {
                smoothed.push({
                    ...currentAction,
                    startFrame: actionStart,
                    endFrame: i - 1,
                    duration: actionCount
                });
            }
            currentAction = actionSequence[i];
            actionStart = i;
            actionCount = 1;
        }
    }

    // Add last action
    if (actionCount >= minDuration) {
        smoothed.push({
            ...currentAction,
            startFrame: actionStart,
            endFrame: actionSequence.length - 1,
            duration: actionCount
        });
    }

    return smoothed;
};

/**
 * Convert action sequence to measurements format
 * @param {Array} actionSequence 
 * @param {number} fps frames per second
 * @returns {Array}
 */
export const actionsToMeasurements = (actionSequence, fps = 30) => {
    return actionSequence.map((action, index) => ({
        id: Date.now() + index,
        elementName: action.action,
        category: action.action === 'Idle' ? 'Waste' : 'Value-added',
        startTime: action.startFrame / fps,
        endTime: action.endFrame / fps,
        duration: action.duration / fps,
        rating: null,
        therblig: action.therblig,
        confidence: action.confidence,
        autoDetected: true
    }));
};
