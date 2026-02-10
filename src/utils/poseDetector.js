import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let detector = null;

let failedInitialization = false;

/**
 * Initialize pose detector with MoveNet
 * @returns {Promise<poseDetection.PoseDetector>}
 */
export const initializePoseDetector = async () => {
    if (detector) return detector;
    if (failedInitialization) return null; // Prevent retry loop if already failed

    // Check online status before trying to fetch model
    if (!navigator.onLine) {
        console.warn('⚠️ Offline mode: Skipping Pose Detector initialization');
        failedInitialization = true;
        return null;
    }

    try {
        await tf.ready();
        // Force WebGL backend to avoid WebGPU initialization issues
        await tf.setBackend('webgl');
        console.log('✅ TensorFlow Backend:', tf.getBackend());

        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.25
        };

        detector = await poseDetection.createDetector(model, detectorConfig);
        console.log('✅ Pose detector initialized');
        return detector;
    } catch (error) {
        console.error('❌ Failed to initialize pose detector:', error);
        failedInitialization = true; // Mark as failed so we don't keep trying
        // Don't throw, just return null so app continues gracefully
        return null;
    }
};

/**
 * Detect poses from video element
 * @param {HTMLVideoElement} video 
 * @returns {Promise<Array>}
 */
export const detectPose = async (video) => {
    if (!detector) {
        await initializePoseDetector();
    }

    // If still no detector (e.g. initialization failed), return empty
    if (!detector) return [];

    try {
        const poses = await detector.estimatePoses(video);

        // Normalize keypoint coordinates to 0-1 range
        if (poses && poses.length > 0) {
            const videoWidth = video.videoWidth || video.width || 640;
            const videoHeight = video.videoHeight || video.height || 480;

            return poses.map(pose => ({
                ...pose,
                keypoints: pose.keypoints.map(kp => ({
                    ...kp,
                    x: kp.x / videoWidth,
                    y: kp.y / videoHeight
                }))
            }));
        }

        return poses;
    } catch (error) {
        console.error('Error detecting pose:', error);
        return [];
    }
};

/**
 * Draw pose skeleton on canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array} poses 
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export const drawPoseSkeleton = (ctx, poses, width, height) => {
    if (!poses || poses.length === 0) return;

    const pose = poses[0];
    if (!pose || !pose.keypoints) return;

    const keypoints = pose.keypoints;
    const canvasWidth = width || ctx.canvas.width;
    const canvasHeight = height || ctx.canvas.height;

    // Draw connections
    const connections = [
        // Face
        [0, 1], [0, 2], [1, 3], [2, 4],
        // Torso
        [5, 6], [5, 11], [6, 12], [11, 12],
        // Left arm
        [5, 7], [7, 9],
        // Right arm
        [6, 8], [8, 10],
        // Left leg
        [11, 13], [13, 15],
        // Right leg
        [12, 14], [14, 16]
    ];

    // Draw lines
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    connections.forEach(([i, j]) => {
        const kp1 = keypoints[i];
        const kp2 = keypoints[j];
        if (kp1.score > 0.3 && kp2.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(kp1.x * canvasWidth, kp1.y * canvasHeight);
            ctx.lineTo(kp2.x * canvasWidth, kp2.y * canvasHeight);
            ctx.stroke();
        }
    });

    // Draw keypoints
    keypoints.forEach((kp) => {
        if (kp.score > 0.3) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(kp.x * canvasWidth, kp.y * canvasHeight, 4, 0, 2 * Math.PI);
            ctx.fill();
        }
    });
};

/**
 * Get specific keypoint by name
 * @param {Array} keypoints 
 * @param {string} name 
 * @returns {Object|null}
 */
export const getKeypoint = (keypoints, name) => {
    const keypointMap = {
        'nose': 0,
        'left_eye': 1,
        'right_eye': 2,
        'left_ear': 3,
        'right_ear': 4,
        'left_shoulder': 5,
        'right_shoulder': 6,
        'left_elbow': 7,
        'right_elbow': 8,
        'left_wrist': 9,
        'right_wrist': 10,
        'left_hip': 11,
        'right_hip': 12,
        'left_knee': 13,
        'right_knee': 14,
        'left_ankle': 15,
        'right_ankle': 16
    };

    const index = keypointMap[name];
    if (index !== undefined && keypoints[index]) {
        return keypoints[index];
    }
    return null;
};

/**
 * Calculate distance between two keypoints
 * @param {Object} kp1 
 * @param {Object} kp2 
 * @returns {number}
 */
export const calculateDistance = (kp1, kp2) => {
    if (!kp1 || !kp2) return 0;
    const dx = kp2.x - kp1.x;
    const dy = kp2.y - kp1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate angle between three keypoints
 * @param {Object} kp1 
 * @param {Object} kp2 (vertex)
 * @param {Object} kp3 
 * @returns {number} angle in degrees
 */
export const calculateAngle = (kp1, kp2, kp3) => {
    if (!kp1 || !kp2 || !kp3) return 0;

    const radians = Math.atan2(kp3.y - kp2.y, kp3.x - kp2.x) -
        Math.atan2(kp1.y - kp2.y, kp1.x - kp2.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);

    if (angle > 180.0) {
        angle = 360 - angle;
    }

    return angle;
};

/**
 * Cleanup detector
 */
export const disposeDetector = () => {
    if (detector) {
        detector.dispose();
        detector = null;
        console.log('✅ Pose detector disposed');
    }
};
