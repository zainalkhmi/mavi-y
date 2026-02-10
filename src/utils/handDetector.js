import { Hands } from '@mediapipe/hands';

let handDetector = null;

/**
 * Initialize MediaPipe Hands detector
 * @returns {Promise<Hands>}
 */
export const initializeHandDetector = async () => {
    if (handDetector) return handDetector;

    try {
        handDetector = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        handDetector.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        console.log('✅ Hand detector initialized');
        return handDetector;
    } catch (error) {
        console.error('❌ Failed to initialize hand detector:', error);
        throw error;
    }
};

/**
 * Detect hands from video element
 * @param {HTMLVideoElement} video 
 * @returns {Promise<Array>}
 */
export const detectHands = async (video) => {
    if (!handDetector) {
        await initializeHandDetector();
    }

    return new Promise((resolve) => {
        handDetector.onResults((results) => {
            resolve(results.multiHandLandmarks || []);
        });

        handDetector.send({ image: video });
    });
};

/**
 * Draw hand skeleton on canvas
 * @param {CanvasRenderingContext2D} ctx 
 * @param {Array} hands 
 */
export const drawHandSkeleton = (ctx, hands) => {
    if (!hands || hands.length === 0) return;

    const connections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index finger
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle finger
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring finger
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm
        [5, 9], [9, 13], [13, 17]
    ];

    hands.forEach((hand) => {
        // Draw connections
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2;
        connections.forEach(([i, j]) => {
            const kp1 = hand[i];
            const kp2 = hand[j];
            if (kp1 && kp2) {
                ctx.beginPath();
                ctx.moveTo(kp1.x * ctx.canvas.width, kp1.y * ctx.canvas.height);
                ctx.lineTo(kp2.x * ctx.canvas.width, kp2.y * ctx.canvas.height);
                ctx.stroke();
            }
        });

        // Draw keypoints
        hand.forEach((kp) => {
            ctx.fillStyle = '#ff4b4b';
            ctx.beginPath();
            ctx.arc(kp.x * ctx.canvas.width, kp.y * ctx.canvas.height, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    });
};

/**
 * Get specific landmark by index
 * @param {Array} landmarks 
 * @param {number} index 
 * @returns {Object|null}
 */
export const getLandmark = (landmarks, index) => {
    if (!landmarks || index < 0 || index >= landmarks.length) return null;
    return landmarks[index];
};

/**
 * Detect hand gesture
 * @param {Array} landmarks - Hand landmarks
 * @returns {string} - Gesture name
 */
export const detectGesture = (landmarks) => {
    if (!landmarks || landmarks.length !== 21) return 'unknown';

    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    const wrist = landmarks[0];
    const indexMCP = landmarks[5];
    const middleMCP = landmarks[9];
    const ringMCP = landmarks[13];
    const pinkyMCP = landmarks[17];

    // Simple gesture detection
    const isIndexUp = indexTip.y < indexMCP.y;
    const isMiddleUp = middleTip.y < middleMCP.y;
    const isRingUp = ringTip.y < ringMCP.y;
    const isPinkyUp = pinkyTip.y < pinkyMCP.y;

    if (isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return 'pointing';
    if (isIndexUp && isMiddleUp && !isRingUp && !isPinkyUp) return 'peace';
    if (isIndexUp && isMiddleUp && isRingUp && isPinkyUp) return 'open_palm';
    if (!isIndexUp && !isMiddleUp && !isRingUp && !isPinkyUp) return 'fist';

    return 'unknown';
};

/**
 * Cleanup detector
 */
export const disposeHandDetector = () => {
    if (handDetector) {
        handDetector.close();
        handDetector = null;
        console.log('✅ Hand detector disposed');
    }
};
