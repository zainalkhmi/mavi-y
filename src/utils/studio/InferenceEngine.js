/**
 * InferenceEngine.js
 * Runtime engine for executing Studio Motion Models.
 */

import AngleCalculator from '../angleCalculator';
import { getKeypoint } from '../poseDetector';
import PoseNormalizer from './PoseNormalizer';
import RuleScriptParser from './RuleScriptParser';
import { dtwEngine } from './DTWEngine';

class InferenceEngine {
    constructor() {
        this.model = null;
        this.activeTracks = new Map(); // Map<trackId, { state, enterTime, history, ... }>
        this.logs = [];
        this.timelineEvents = []; // Structured events: { trackId, state, start, end }
        this.nextTrackId = 1;
        this.frameCount = 0;
        this.angleCalculator = new AngleCalculator();
    }

    evaluateComparison(val, operator, target, target2 = null) {
        if (val === null || val === undefined) return false;

        switch (operator) {
            case '>': return val > target;
            case '<': return val < target;
            case '>=': return val >= target;
            case '<=': return val <= target;
            case '=': return Math.abs(val - target) < 0.05; // Fuzzy equality
            case '!=': return Math.abs(val - target) >= 0.05;
            case 'BETWEEN': return val >= target && val <= (target2 !== null ? target2 : target);
            default: return false; // Default safe fallthrough
        }
    }

    /**
     * Load a motion model definition
     * @param {Object} model - The model defined in Studio
     */
    loadModel(model) {
        if (!model) return;

        // Handle both 'states' and 'statesList' for flexibility
        const states = model.statesList || model.states || [];
        if (states.length === 0) {
            console.warn("InferenceEngine: Invalid model loaded - no states found");
            return;
        }

        // Standardize internally to statesList if needed
        if (!model.statesList) {
            model.statesList = states;
        }

        this.model = model;
        this.reset();
        console.log(`InferenceEngine: Loaded model "${model.name}" with ${states.length} states`);
    }

    reset() {
        this.activeTracks.clear();
        this.logs = [];
        this.frameCount = 0;
        this.nextTrackId = 1;
    }

    /**
     * Main processing loop for a single frame
     */
    processFrame(data) {
        if (!this.model) return { tracks: [], logs: [] };

        const { poses = [], objects = [], hands = [], timestamp } = data;
        this.frameCount++;

        // --- MULTI-PERSON TRACKING LOGIC ---
        poses.forEach((pose, index) => {
            let trackId = pose.id || pose.trackId || (index + 1);

            if (!this.activeTracks.has(trackId)) {
                this.activeTracks.set(trackId, {
                    id: trackId,
                    currentState: this.model.statesList[0].id,
                    stateEnterTime: timestamp,
                    lastUpdate: timestamp,
                    transitionCandidates: {},
                    poseBuffer: [] // Buffer for DTW sequence matching
                });
                this.addLog(trackId, timestamp, "System", `Operator ${trackId} detected. Starting in ${this.model.statesList[0].name}`);
            }

            const track = this.activeTracks.get(trackId);
            const dt = (timestamp - track.lastUpdate);

            if (dt > 0 && track.prevPose) {
                track.velocities = this.calculateVelocities(track.prevPose, pose, dt);
            } else {
                track.velocities = {};
            }

            track.lastUpdate = timestamp;
            track.prevPose = pose;

            // Update pose buffer (keep last 60 seconds of motion @ ~30fps = 1800 frames)
            if (!track.poseBuffer) track.poseBuffer = [];
            track.poseBuffer.push({ pose, timestamp });
            if (track.poseBuffer.length > 1800) track.poseBuffer.shift();

            this.updateFSM(track, pose, objects, hands, timestamp, this.activeTracks);
        });

        // Cleanup stale tracks (not seen for > 2 seconds)
        for (const [id, track] of this.activeTracks.entries()) {
            if (timestamp - track.lastUpdate > 2.0) {
                this.activeTracks.delete(id);
                this.addLog(id, timestamp, "System", `Operator ${id} lost`);
            }
        }

        return {
            tracks: Array.from(this.activeTracks.values()).map(t => ({
                id: t.id,
                state: this.getStateName(t.currentState),
                duration: ((timestamp - t.stateEnterTime)).toFixed(1) + 's',
                isVA: this.isStateVA(t.currentState)
            })),
            logs: this.logs,
            timelineEvents: this.timelineEvents
        };
    }

    isStateVA(stateId) {
        const state = this.model.statesList.find(s => s.id === stateId);
        return state ? !!state.isVA : false;
    }

    updateFSM(track, pose, objects, hands, timestamp, allTracks, data = {}) {
        const currentStateId = track.currentState;
        const currentState = this.model.statesList.find(s => s.id === currentStateId);

        let complianceMet = true;

        if (currentState && currentState.roi) {
            if (!this.checkROI(currentState.roi, pose)) complianceMet = false;
        }

        if (currentState && currentState.referencePose && complianceMet) {
            const similarity = PoseNormalizer.calculateSimilarity(pose.keypoints, currentState.referencePose);
            if (similarity < 0.75) complianceMet = false;
        }

        if (complianceMet && (currentState.roi || currentState.referencePose)) {
            if (!track.matchStartTime) track.matchStartTime = timestamp;
            const duration = (timestamp - track.matchStartTime);
            const reqDuration = currentState.minDuration || 0.5;

            if (duration >= reqDuration) {
                const currentIndex = this.model.statesList.findIndex(s => s.id === currentStateId);
                const nextState = this.model.statesList[currentIndex + 1];

                if (nextState) {
                    this.transitionTo(track, nextState.id, timestamp, "Sequence Step Complete");
                    return;
                } else {
                    if (track.currentState !== 'complete' && track.currentState !== 's_complete') {
                        this.addLog(track.id, timestamp, "Cycle Complete", `Cycle finished in ${((timestamp - track.stateEnterTime)).toFixed(1)}s`);
                    }
                }
            }
        } else {
            track.matchStartTime = null;
        }

        if (this.model.transitions && this.model.transitions.length > 0) {
            const possibleTransitions = this.model.transitions.filter(t => t.from === currentStateId);
            if (!track.transitionCandidates) track.transitionCandidates = {};

            for (const transition of possibleTransitions) {
                if (this.evaluateCondition(transition.condition, pose, objects, hands, track, allTracks, data)) {
                    const holdTime = (transition.condition.holdTime || 0);

                    if (holdTime > 0) {
                        if (!track.transitionCandidates[transition.id]) {
                            track.transitionCandidates[transition.id] = timestamp;
                        } else {
                            const elapsedTime = timestamp - track.transitionCandidates[transition.id];
                            if (elapsedTime >= holdTime) {
                                this.transitionTo(track, transition.to, timestamp, `Rule Triggered (Held ${elapsedTime.toFixed(1)}s)`);
                                track.transitionCandidates = {};
                                break;
                            }
                        }
                    } else {
                        this.transitionTo(track, transition.to, timestamp, "Rule Triggered");
                        track.transitionCandidates = {};
                        break;
                    }
                } else {
                    if (track.transitionCandidates[transition.id]) {
                        delete track.transitionCandidates[transition.id];
                    }
                }
            }
        }
    }

    transitionTo(track, newStateId, timestamp, reason) {
        const fromStateId = track.currentState;
        const fromState = this.getStateName(fromStateId);
        const toState = this.getStateName(newStateId);

        // SEQUENCE ANOMALY CHECK
        const currentIndex = this.model.statesList.findIndex(s => s.id === fromStateId);
        const expectedNextIndex = currentIndex + 1;
        const actualNextIndex = this.model.statesList.findIndex(s => s.id === newStateId);

        const isAnomaly = (actualNextIndex > expectedNextIndex) || (actualNextIndex < currentIndex && actualNextIndex !== 0);

        if (actualNextIndex > expectedNextIndex) {
            this.addLog(track.id, timestamp, "Anomaly", `Sequence Skip: Jumped from ${fromState} to ${toState}`);
        } else if (actualNextIndex < currentIndex && actualNextIndex !== 0) {
            this.addLog(track.id, timestamp, "Anomaly", `Regression: Reverted from ${fromState} to ${toState}`);
        }

        const event = {
            trackId: track.id,
            state: fromState,
            stateId: fromStateId,
            startTime: track.stateEnterTime,
            endTime: timestamp,
            duration: timestamp - track.stateEnterTime,
            isVA: this.isStateVA(fromStateId),
            type: isAnomaly ? 'Anomaly' : 'Normal'
        };
        this.timelineEvents.push(event);

        this.addLog(track.id, timestamp, "Transition", `${fromState} -> ${toState} (${reason})`);
        track.currentState = newStateId;
        track.stateEnterTime = timestamp;
        track.matchStartTime = null;

        if (newStateId === 's_start' || newStateId === 'complete' || newStateId === 's_complete') {
            const stats = this.getCycleStatistics();
            if (this.onCycleComplete && stats) {
                this.onCycleComplete(stats);
            }
        }

        if (this.onStateChange) {
            this.onStateChange(track.id, newStateId, fromStateId);
        }
    }

    getCycleStatistics() {
        if (this.timelineEvents.length === 0) return null;

        // Group events into cycles based on sequence
        const cycles = [];
        let currentCycle = [];

        // Find state indices to detect restarts
        const getIndex = (id) => this.model.statesList.findIndex(s => s.id === id);

        this.timelineEvents.forEach((evt, i) => {
            currentCycle.push(evt);

            const nextEvt = this.timelineEvents[i + 1];
            const isLast = !nextEvt;
            const isCycleEnd = evt.stateId === 'complete' || evt.stateId === 's_complete';
            const isRestart = nextEvt && getIndex(nextEvt.stateId) < getIndex(evt.stateId);

            if (isCycleEnd || isRestart || isLast) {
                if (currentCycle.length > 0) {
                    cycles.push([...currentCycle]);
                    currentCycle = [];
                }
            }
        });

        if (cycles.length === 0) return null;

        const cycleData = cycles.map(c => {
            const durationMs = c.reduce((acc, e) => acc + e.duration, 0);
            const vaMs = c.filter(e => e.isVA).reduce((acc, e) => acc + e.duration, 0);
            return {
                duration: durationMs / 1000,
                vaDuration: vaMs / 1000,
                events: c
            };
        });

        const totalTime = cycleData.reduce((acc, c) => acc + c.duration, 0);
        const totalVaTime = cycleData.reduce((acc, c) => acc + c.vaDuration, 0);
        const avgCycleTime = totalTime / cycleData.length;
        const avgVaTime = totalVaTime / cycleData.length;

        return {
            totalCycles: cycleData.length,
            avgCycleTime: avgCycleTime.toFixed(2),
            avgVaTime: avgVaTime.toFixed(2),
            vaRatio: ((totalVaTime / totalTime) * 100 || 0).toFixed(1),
            latestCycle: cycleData[cycleData.length - 1],
            history: cycleData
        };
    }

    checkROI(roi, pose) {
        const rightWrist = getKeypoint(pose.keypoints, 'right_wrist');
        const leftWrist = getKeypoint(pose.keypoints, 'left_wrist');

        const checkPoint = (pt) => {
            if (!pt || pt.score < 0.3) return false;
            return pt.x >= roi.x && pt.x <= (roi.x + roi.width) &&
                pt.y >= roi.y && pt.y <= (roi.y + roi.height);
        };
        return checkPoint(rightWrist) || checkPoint(leftWrist);
    }

    evaluateCondition(condition, pose, objects, hands, track, allTracks, data = {}) {
        if (!condition || !condition.rules || condition.rules.length === 0) return false;
        const operator = condition.operator || 'AND';
        const evaluateItem = (item) => {
            let result = (item.rules && item.rules.length > 0)
                ? this.evaluateCondition(item, pose, objects, hands, track, allTracks, data)
                : this.checkRule(item, pose, objects, hands, track, allTracks, data);
            return item.invert ? !result : result;
        };

        return operator === 'OR' ? condition.rules.some(evaluateItem) : condition.rules.every(evaluateItem);
    }

    checkRule(rule, pose, objects, hands, track, allTracks, data = {}) {
        const { type, params } = rule;

        // --- PREDICTION SENSITIVITY ---
        // If a rule is strict (trustPersistent: false), we check if any relevant keypoint is predicted
        if (params && params.trustPersistent === false) {
            const isAnyJointPredicted = (jointNames) => {
                return jointNames.some(name => {
                    const kp = getKeypoint(pose.keypoints, name);
                    return kp && kp.isPredicted;
                });
            };

            let involvedJoints = [];
            if (params.joint) involvedJoints.push(params.joint);
            if (params.jointA) involvedJoints.push(params.jointA);
            if (params.jointB) involvedJoints.push(params.jointB);
            if (params.jointC) involvedJoints.push(params.jointC);
            if (params.bodyPart) involvedJoints.push(params.bodyPart);

            if (isAnyJointPredicted(involvedJoints)) return false;
        }

        switch (type) {
            case 'POSE_ANGLE': return this.checkPoseAngle(params, pose);
            case 'POSE_RELATION': return this.checkPoseRelation(params, pose, allTracks, track.id);
            case 'POSE_VELOCITY': return this.checkPoseVelocity(params, track);
            case 'POSE_MATCHING': return this.checkPoseMatching(rule, pose);
            case 'HAND_GESTURE': return this.checkHandGesture(params, hands);
            case 'HAND_PROXIMITY': return this.checkHandProximity(params, hands, pose);
            case 'OBJECT_PROXIMITY': return this.checkObjectProximity(params, objects, pose);
            case 'OBJECT_IN_ROI': return this.checkObjectInROI(params, objects);
            case 'OPERATOR_PROXIMITY': return this.checkOperatorProximity(params, pose, allTracks, track.id);
            case 'TEACHABLE_MACHINE': return this.checkTeachableMachine(params, data.teachableMachine);
            case 'ROBOFLOW_DETECTION': return this.checkRoboflow(params, data.roboflow);
            case 'SEQUENCE_MATCH': return this.checkSequenceMatch(params, track);
            case 'ADVANCED_SCRIPT': return RuleScriptParser.evaluate(params.script, { pose, objects, hands, allTracks, tm: data.teachableMachine, roboflow: data.roboflow });
            default: return false;
        }
    }

    checkSequenceMatch(params, track) {
        const { targetSequence, threshold = 0.4, bufferSize = 60 } = params;
        if (!track.poseBuffer || track.poseBuffer.length < 10) return false;
        if (!targetSequence || targetSequence.length === 0) return false;

        // Take the last N frames from buffer for comparison
        const currentWindow = track.poseBuffer
            .slice(-Math.min(track.poseBuffer.length, bufferSize))
            .map(item => item.pose);

        const result = dtwEngine.compute(currentWindow, targetSequence);
        return result.normalizedDistance < (threshold || 0.4);
    }

    checkTeachableMachine(params, tmData) {
        if (!tmData) return false;

        const { modelId, targetClass, threshold = 0.8 } = params;

        // If no modelId is specified, check all available predictions
        if (!modelId) {
            return Object.values(tmData).some(pred =>
                pred && pred.className === targetClass && pred.probability >= threshold
            );
        }

        const prediction = tmData[modelId];
        if (!prediction) return false;

        return prediction.className?.toLowerCase() === targetClass?.toLowerCase() && prediction.probability >= threshold;
    }

    checkRoboflow(params, roboflowData) {
        if (!roboflowData) return false;

        const { modelId, targetClass, threshold = 0.5 } = params;

        // If no modelId is specified, check all available predictions
        if (!modelId) {
            return Object.values(roboflowData).some(detections =>
                Array.isArray(detections) && detections.some(det =>
                    det.class?.toLowerCase() === targetClass?.toLowerCase() && det.confidence >= threshold
                )
            );
        }

        // Find detections from the specific model
        const detections = roboflowData[modelId];
        if (!detections || detections.length === 0) return false;

        // Check if target class exists with sufficient confidence
        return detections.some(det =>
            det.class?.toLowerCase() === targetClass?.toLowerCase() && det.confidence >= threshold
        );
    }

    checkOperatorProximity(params, pose, allTracks, currentTrackId) {
        const { joint, targetTrackId = 'nearest', distance, operator = '<' } = params;
        if (!pose || !allTracks) return false;

        const myJoint = getKeypoint(pose.keypoints, joint);
        if (!myJoint) return false;

        let otherTracks = Array.from(allTracks.values()).filter(t => t.id !== currentTrackId);
        if (otherTracks.length === 0) return false;

        if (targetTrackId !== 'nearest' && targetTrackId !== 'any') {
            const specificOther = allTracks.get(targetTrackId);
            if (!specificOther || !specificOther.prevPose) return false;
            otherTracks = [specificOther];
        }

        return otherTracks.some(other => {
            if (!other.prevPose) return false;
            const otherJoint = getKeypoint(other.prevPose.keypoints, joint);
            if (!otherJoint) return false;

            const dist = Math.hypot(myJoint.x - otherJoint.x, myJoint.y - otherJoint.y);
            return this.evaluateComparison(dist, operator, distance);
        });
    }

    checkObjectProximity(params, objects, pose) {
        const { objectClass, joint, distance, operator = '<' } = params;
        if (!objects || objects.length === 0 || !pose) return false;

        const targetJoint = getKeypoint(pose.keypoints, joint);
        if (!targetJoint) return false;

        return objects.some(obj => {
            if (obj.class !== objectClass) return false;
            const objX = obj.bbox[0] + obj.bbox[2] / 2;
            const objY = obj.bbox[1] + obj.bbox[3] / 2;
            const dist = Math.hypot(objX - targetJoint.x, objY - targetJoint.y);
            return operator === '<' ? dist < distance : dist > distance;
        });
    }

    checkObjectInROI(params, objects) {
        const { objectClass, roi } = params;
        if (!objects || objects.length === 0 || !roi) return false;

        return objects.some(obj => {
            if (obj.class !== objectClass) return false;
            const objX = obj.bbox[0] + obj.bbox[2] / 2;
            const objY = obj.bbox[1] + obj.bbox[3] / 2;
            return objX >= roi.x && objX <= (roi.x + roi.width) &&
                objY >= roi.y && objY <= (roi.y + roi.height);
        });
    }

    checkPoseVelocity(params, track) {
        const { joint, operator, value } = params;
        if (!track || !track.velocities || typeof track.velocities[joint] === 'undefined') return false;
        const speed = track.velocities[joint];
        const { value2 } = params;
        return this.evaluateComparison(speed, operator, value, value2);
    }

    calculateVelocities(prevPose, currPose, dt) {
        if (dt <= 0) return {};
        const vels = {};
        currPose.keypoints.forEach(curr => {
            const prev = prevPose.keypoints.find(k => k.name === curr.name);
            if (prev) {
                const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                vels[curr.name] = dist / dt;
            }
        });
        return vels;
    }

    checkPoseRelation(params, pose, allTracks = null, currentTrackId = null) {
        const { jointA, jointB, component, operator, targetType, targetTrackId, value } = params;
        let keypointsToUse = (this.model && this.model.coordinateSystem !== 'screen')
            ? PoseNormalizer.normalize(pose.keypoints)
            : pose.keypoints;

        const pA = getKeypoint(keypointsToUse, jointA);
        if (!pA) return false;

        let valA = pA[component || 'y'];
        let valB = value;

        if (targetType === 'POINT' && jointB) {
            let pB;
            if (targetTrackId && targetTrackId !== 'self' && allTracks) {
                const otherTrack = allTracks.get(targetTrackId);
                if (otherTrack && otherTrack.prevPose) {
                    pB = getKeypoint(otherTrack.prevPose.keypoints, jointB);
                }
            } else {
                pB = getKeypoint(keypointsToUse, jointB);
            }
            if (!pB) return false;
            valB = pB[component || 'y'];
        }

        switch (operator) {
            case '>': return valA > valB;
            case '<': return valA < valB;
            case '=': return Math.abs(valA - valB) < 0.05;
            case '>=': return valA >= valB;
            case '<=': return valA <= valB;
            case '!=': return Math.abs(valA - valB) >= 0.05;
            case 'BETWEEN':
                const maxVal = params.value2 !== undefined ? params.value2 : valB;
                return valA >= valB && valA <= maxVal;
            default: return false;
        }
    }

    checkPoseMatching(rule, currentPose) {
        const { targetStateId, threshold = 0.8 } = rule.params;
        const targetState = this.model.statesList.find(s => s.id === targetStateId);
        if (!targetState || !targetState.referencePose) return false;
        return PoseNormalizer.calculateSimilarity(currentPose.keypoints, targetState.referencePose) >= threshold;
    }

    checkPoseAngle(params, pose) {
        const { jointA, jointB, jointC, operator, value } = params;
        const pA = getKeypoint(pose.keypoints, jointA);
        const pB = getKeypoint(pose.keypoints, jointB);
        const pC = getKeypoint(pose.keypoints, jointC);

        if (!pA || !pB || !pC) return false;
        const angle = this.angleCalculator.calculateAngle(pA, pB, pC);
        const { value2 } = params;
        return this.evaluateComparison(angle, operator, value, value2);
    }

    checkHandGesture(params, hands) {
        const { gesture } = params;
        if (!hands || hands.length === 0) return false;
        return hands.some(hand => {
            const isIndexUp = hand[8].y < hand[5].y;
            const detected = isIndexUp ? 'pointing' : 'fist';
            return detected === gesture;
        });
    }

    checkHandProximity(params, hands, pose) {
        const { landmark, bodyPart, distance, operator = '<' } = params;
        if (!hands || hands.length === 0 || !pose) return false;
        const bodyKeypoint = getKeypoint(pose.keypoints, bodyPart);
        if (!bodyKeypoint) return false;

        return hands.some(hand => {
            const handLandmark = hand[landmark] || hand[0];
            const dist = Math.hypot(handLandmark.x - bodyKeypoint.x, handLandmark.y - bodyKeypoint.y);
            return this.evaluateComparison(dist, operator, distance);
        });
    }

    getStateName(id) {
        const state = this.model.statesList.find(s => s.id === id);
        return state ? state.name : id;
    }

    addLog(trackId, timestamp, type, message) {
        this.logs.unshift({
            id: `log_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toLocaleTimeString(),
            trackId, type, message
        });
        if (this.logs.length > 50) this.logs.pop();
    }

    getLogs() {
        return this.logs;
    }
}

// Export instance for runtime usage
export const inferenceEngine = new InferenceEngine();

// Export class if needed
export default InferenceEngine;
