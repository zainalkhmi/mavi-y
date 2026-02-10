/**
 * DTWEngine.test.js
 * Manual verification script for DTW Engine logic.
 */

import DTWEngine from './DTWEngine.js';

// Mock Pose Data
const createPose = (yOffset = 0) => ({
    keypoints: [
        { name: 'nose', x: 0.5, y: 0.2 + yOffset, score: 0.9 },
        { name: 'left_shoulder', x: 0.4, y: 0.3 + yOffset, score: 0.9 },
        { name: 'right_shoulder', x: 0.6, y: 0.3 + yOffset, score: 0.9 }
    ]
});

const dtw = new DTWEngine();

console.log("--- Testing DTW Engine ---");

// 1. Identical Sequences
const seqA = [createPose(0.1), createPose(0.2), createPose(0.3)];
const seqB = [createPose(0.1), createPose(0.2), createPose(0.3)];
const res1 = dtw.compute(seqA, seqB);
console.log("Identical Sequences Distance:", res1.normalizedDistance, "(Expected: 0)");

// 2. Time-stretched Sequence
const seqC = [createPose(0.1), createPose(0.1), createPose(0.2), createPose(0.2), createPose(0.3), createPose(0.3)];
const res2 = dtw.compute(seqA, seqC);
console.log("Time-stretched Distance:", res2.normalizedDistance, "(Expected: Low)");

// 3. Completely Different Sequence (Different Shape)
const seqD = [
    { keypoints: [{ name: 'nose', x: 0.1, y: 0.1, score: 0.9 }, { name: 'left_shoulder', x: 0.1, y: 0.5, score: 0.9 }, { name: 'right_shoulder', x: 0.5, y: 0.5, score: 0.9 }] },
    { keypoints: [{ name: 'nose', x: 0.2, y: 0.2, score: 0.9 }, { name: 'left_shoulder', x: 0.2, y: 0.6, score: 0.9 }, { name: 'right_shoulder', x: 0.6, y: 0.6, score: 0.9 }] }
];
const res3 = dtw.compute(seqA, seqD);
console.log("Different Sequence Distance:", res3.normalizedDistance, "(Expected: High)");

console.log("\nResults Summary:");
console.log("IsMatch (Identical):", res1.isMatch);
console.log("IsMatch (Stretched):", res2.isMatch);
console.log("IsMatch (Different):", res3.isMatch);
