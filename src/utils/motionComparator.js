/**
 * Motion Comparator Utility
 * Compares pose sequences using Dynamic Time Warping (DTW) algorithm
 * for real-time consistency checking
 */

/**
 * Extract feature vector from pose keypoints
 * @param {Array} keypoints - Pose keypoints from detector
 * @returns {Array} - Normalized feature vector
 */
export const extractPoseFeatures = (keypoints) => {
    if (!keypoints || keypoints.length === 0) return null;

    const features = [];

    // Extract x, y coordinates for key joints (normalized)
    const keyJoints = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; // shoulders to ankles

    keyJoints.forEach(idx => {
        if (keypoints[idx] && keypoints[idx].score > 0.3) {
            features.push(keypoints[idx].x, keypoints[idx].y);
        } else {
            features.push(0, 0); // Missing keypoint
        }
    });

    return features;
};

/**
 * Calculate Euclidean distance between two feature vectors
 * @param {Array} vec1 
 * @param {Array} vec2 
 * @returns {number}
 */
const euclideanDistance = (vec1, vec2) => {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
        const diff = vec1[i] - vec2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
};

/**
 * Dynamic Time Warping algorithm
 * Compares two sequences and returns similarity distance
 * @param {Array} seq1 - First sequence of feature vectors
 * @param {Array} seq2 - Second sequence of feature vectors
 * @returns {number} - DTW distance (lower = more similar)
 */
export const calculateDTW = (seq1, seq2) => {
    if (!seq1 || !seq2 || seq1.length === 0 || seq2.length === 0) {
        return Infinity;
    }

    const n = seq1.length;
    const m = seq2.length;

    // Initialize DTW matrix
    const dtw = Array(n + 1).fill(null).map(() => Array(m + 1).fill(Infinity));
    dtw[0][0] = 0;

    // Fill DTW matrix
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const cost = euclideanDistance(seq1[i - 1], seq2[j - 1]);
            dtw[i][j] = cost + Math.min(
                dtw[i - 1][j],     // insertion
                dtw[i][j - 1],     // deletion
                dtw[i - 1][j - 1]  // match
            );
        }
    }

    return dtw[n][m];
};

/**
 * Convert DTW distance to similarity score (0-100%)
 * @param {number} dtwDistance 
 * @param {number} sequenceLength - Average length of sequences
 * @returns {number} - Similarity score 0-100
 */
export const dtwToSimilarityScore = (dtwDistance, sequenceLength) => {
    if (dtwDistance === Infinity || sequenceLength === 0) return 0;

    // Normalize by sequence length
    const normalizedDistance = dtwDistance / sequenceLength;

    // Convert to percentage (empirically tuned threshold)
    // Lower distance = higher similarity
    const threshold = 50; // Adjust based on testing
    const score = Math.max(0, 100 - (normalizedDistance / threshold) * 100);

    return Math.min(100, Math.round(score));
};

/**
 * Compare current pose with golden sequence
 * Uses sliding window approach for real-time comparison
 * @param {Array} currentSequence - Recent pose sequence (last N frames)
 * @param {Array} goldenSequence - Reference golden cycle sequence
 * @returns {Object} - { score, distance, isAnomaly }
 */
export const compareWithGoldenCycle = (currentSequence, goldenSequence) => {
    if (!currentSequence || !goldenSequence || currentSequence.length === 0 || goldenSequence.length === 0) {
        return { score: 0, distance: Infinity, isAnomaly: true };
    }

    // Use sliding window - compare last N frames with golden cycle
    const windowSize = Math.min(currentSequence.length, goldenSequence.length);
    const currentWindow = currentSequence.slice(-windowSize);
    const goldenWindow = goldenSequence.slice(0, windowSize);

    const distance = calculateDTW(currentWindow, goldenWindow);
    const avgLength = (currentWindow.length + goldenWindow.length) / 2;
    const score = dtwToSimilarityScore(distance, avgLength);

    const threshold = 80; // Consistency threshold
    const isAnomaly = score < threshold;

    return { score, distance, isAnomaly };
};

/**
 * Create pose sequence from keypoints array
 * @param {Array} keypointsArray - Array of pose keypoints over time
 * @returns {Array} - Sequence of feature vectors
 */
export const createPoseSequence = (keypointsArray) => {
    if (!keypointsArray || keypointsArray.length === 0) return [];

    return keypointsArray
        .map(kp => extractPoseFeatures(kp))
        .filter(features => features !== null);
};

/**
 * Detect anomalies in a sequence
 * @param {Array} scores - Array of similarity scores over time
 * @param {number} threshold - Anomaly threshold (default 80)
 * @returns {number} - Count of anomalous frames
 */
export const detectAnomalies = (scores, threshold = 80) => {
    if (!scores || scores.length === 0) return 0;
    return scores.filter(score => score < threshold).length;
};

/**
 * Calculate moving average for smoothing scores
 * @param {Array} scores 
 * @param {number} windowSize 
 * @returns {Array}
 */
export const smoothScores = (scores, windowSize = 5) => {
    if (!scores || scores.length < windowSize) return scores;

    const smoothed = [];
    for (let i = 0; i < scores.length; i++) {
        const start = Math.max(0, i - windowSize + 1);
        const window = scores.slice(start, i + 1);
        const avg = window.reduce((sum, val) => sum + val, 0) / window.length;
        smoothed.push(Math.round(avg));
    }
    return smoothed;
};
