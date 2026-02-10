/**
 * Object Detector Utility
 * Uses TensorFlow.js COCO-SSD model for object detection
 */

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let detector = null;

/**
 * Initialize COCO-SSD object detector
 * @returns {Promise<cocoSsd.ObjectDetection>}
 */
export const initializeObjectDetector = async () => {
    if (detector) return detector;

    try {
        await tf.ready();
        await tf.setBackend('webgl');
        console.log('✅ TensorFlow Backend:', tf.getBackend());

        // Load COCO-SSD model
        detector = await cocoSsd.load({
            base: 'lite_mobilenet_v2' // Faster, good for real-time
            // Alternative: 'mobilenet_v2' for better accuracy
        });

        console.log('✅ COCO-SSD detector initialized');
        return detector;
    } catch (error) {
        console.error('❌ Failed to initialize object detector:', error);
        throw error;
    }
};

/**
 * Detect objects in video frame
 * @param {HTMLVideoElement} video 
 * @returns {Promise<Array>} Array of detections
 */
export const detectObjects = async (video) => {
    if (!detector) {
        await initializeObjectDetector();
    }

    try {
        const predictions = await detector.detect(video);
        return predictions;
    } catch (error) {
        console.error('Error detecting objects:', error);
        return [];
    }
};

/**
 * Filter detections for relevant objects (manufacturing context)
 * @param {Array} detections 
 * @param {Array} relevantClasses - Optional filter for specific classes
 * @returns {Array}
 */
export const filterRelevantObjects = (detections, relevantClasses = null) => {
    // Default relevant classes for manufacturing/motion study
    const defaultRelevant = [
        'person',
        'bottle',
        'cup',
        'bowl',
        'scissors',
        'cell phone',
        'laptop',
        'mouse',
        'keyboard',
        'book',
        'clock',
        'vase',
        'spoon',
        'fork',
        'knife',
        'chair',
        'dining table',
        'potted plant',
        'backpack',
        'handbag',
        'tie',
        'suitcase'
    ];

    const filterList = relevantClasses || defaultRelevant;

    return detections.filter(det =>
        filterList.includes(det.class.toLowerCase())
    );
};

/**
 * Calculate Intersection over Union (IoU) for tracking
 * @param {Array} box1 - [x, y, width, height]
 * @param {Array} box2 - [x, y, width, height]
 * @returns {number} IoU score 0-1
 */
export const calculateIoU = (box1, box2) => {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    // Calculate intersection
    const xLeft = Math.max(x1, x2);
    const yTop = Math.max(y1, y2);
    const xRight = Math.min(x1 + w1, x2 + w2);
    const yBottom = Math.min(y1 + h1, y2 + h2);

    if (xRight < xLeft || yBottom < yTop) {
        return 0.0;
    }

    const intersectionArea = (xRight - xLeft) * (yBottom - yTop);
    const box1Area = w1 * h1;
    const box2Area = w2 * h2;
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
};

/**
 * Track objects across frames using IoU matching
 * @param {Array} currentDetections - Current frame detections
 * @param {Map} previousTracks - Previous frame tracks
 * @param {number} iouThreshold - Minimum IoU for matching (default 0.3)
 * @returns {Map} Updated tracks with IDs
 */
export const trackObjects = (currentDetections, previousTracks, iouThreshold = 0.3) => {
    const newTracks = new Map();
    const usedTrackIds = new Set();

    currentDetections.forEach(detection => {
        let bestMatch = null;
        let bestIoU = 0;

        // Find best matching previous track
        previousTracks.forEach((track, id) => {
            if (usedTrackIds.has(id)) return;

            // Only match same class
            if (track.class !== detection.class) return;

            const iou = calculateIoU(detection.bbox, track.bbox);
            if (iou > iouThreshold && iou > bestIoU) {
                bestMatch = id;
                bestIoU = iou;
            }
        });

        if (bestMatch !== null) {
            // Update existing track
            const prevTrack = previousTracks.get(bestMatch);
            newTracks.set(bestMatch, {
                ...detection,
                id: bestMatch,
                age: prevTrack.age + 1,
                history: [...prevTrack.history, detection.bbox],
                firstSeen: prevTrack.firstSeen,
                color: prevTrack.color
            });
            usedTrackIds.add(bestMatch);
        } else {
            // Create new track
            const newId = `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            newTracks.set(newId, {
                ...detection,
                id: newId,
                age: 1,
                history: [detection.bbox],
                firstSeen: Date.now(),
                color: generateRandomColor()
            });
        }
    });

    return newTracks;
};

/**
 * Generate random color for object tracking
 * @returns {string} RGB color string
 */
const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 60%)`;
};

/**
 * Draw object detections on canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Map} tracks - Tracked objects
 * @param {number} scaleX - X scale factor
 * @param {number} scaleY - Y scale factor
 * @param {boolean} showTrails - Show object trails
 */
export const drawObjectDetections = (ctx, tracks, scaleX = 1, scaleY = 1, showTrails = false) => {
    tracks.forEach((track) => {
        const [x, y, width, height] = track.bbox;

        // Draw bounding box
        ctx.strokeStyle = track.color || '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);

        // Draw label background
        const label = `${track.class} (${Math.round(track.score * 100)}%)`;
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = track.color || '#00ff00';
        ctx.fillRect(x * scaleX, (y - 25) * scaleY, textWidth + 10, 20);

        // Draw label text
        ctx.fillStyle = '#000';
        ctx.fillText(label, (x + 5) * scaleX, (y - 10) * scaleY);

        // Draw object ID
        ctx.fillStyle = track.color || '#00ff00';
        ctx.font = 'bold 10px Arial';
        ctx.fillText(`ID: ${track.id.substr(-6)}`, (x + 5) * scaleX, (y + height + 15) * scaleY);

        // Draw trails if enabled
        if (showTrails && track.history.length > 1) {
            ctx.strokeStyle = track.color || '#00ff00';
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();

            track.history.forEach((bbox, idx) => {
                const [bx, by, bw, bh] = bbox;
                const centerX = (bx + bw / 2) * scaleX;
                const centerY = (by + bh / 2) * scaleY;

                if (idx === 0) {
                    ctx.moveTo(centerX, centerY);
                } else {
                    ctx.lineTo(centerX, centerY);
                }
            });

            ctx.stroke();
            ctx.globalAlpha = 1.0;
        }
    });
};

/**
 * Calculate object statistics
 * @param {Map} tracks 
 * @returns {Object} Statistics
 */
export const calculateObjectStats = (tracks) => {
    const stats = {
        totalObjects: tracks.size,
        byClass: {},
        avgConfidence: 0,
        oldestTrack: null
    };

    let totalConfidence = 0;
    let oldestAge = 0;

    tracks.forEach((track) => {
        // Count by class
        stats.byClass[track.class] = (stats.byClass[track.class] || 0) + 1;

        // Sum confidence
        totalConfidence += track.score;

        // Find oldest track
        if (track.age > oldestAge) {
            oldestAge = track.age;
            stats.oldestTrack = track;
        }
    });

    stats.avgConfidence = tracks.size > 0 ? totalConfidence / tracks.size : 0;

    return stats;
};

/**
 * Cleanup detector
 */
export const disposeObjectDetector = () => {
    if (detector) {
        detector.dispose();
        detector = null;
        console.log('✅ Object detector disposed');
    }
};

/**
 * Get list of all detectable classes
 * @returns {Array<string>}
 */
export const getDetectableClasses = () => {
    return [
        'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
        'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
        'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
        'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
        'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
        'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
        'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
        'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
        'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
        'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
    ];
};
