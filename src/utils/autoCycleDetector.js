/**
 * Auto-Cycle Detector
 * Analyzes video motion patterns to automatically detect repetitive work cycles
 */

class AutoCycleDetector {
    constructor() {
        this.previousFrameData = null;
        this.motionHistory = [];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    /**
     * Analyze a single frame and calculate motion intensity
     * @param {HTMLVideoElement} videoElement - The video element to analyze
     * @returns {number} Motion score (0-100)
     */
    analyzeFrame(videoElement) {
        if (!videoElement || videoElement.readyState < 2) {
            return 0;
        }

        // Set canvas size to match video (scaled down for performance)
        const scale = 0.25; // Analyze at 25% resolution for speed
        this.canvas.width = videoElement.videoWidth * scale;
        this.canvas.height = videoElement.videoHeight * scale;

        // Draw current frame
        this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
        const currentFrameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        if (!this.previousFrameData) {
            this.previousFrameData = currentFrameData;
            return 0;
        }

        // Calculate pixel differences
        let totalDiff = 0;
        const pixels = currentFrameData.data.length;

        for (let i = 0; i < pixels; i += 4) {
            const rDiff = Math.abs(currentFrameData.data[i] - this.previousFrameData.data[i]);
            const gDiff = Math.abs(currentFrameData.data[i + 1] - this.previousFrameData.data[i + 1]);
            const bDiff = Math.abs(currentFrameData.data[i + 2] - this.previousFrameData.data[i + 2]);
            totalDiff += (rDiff + gDiff + bDiff) / 3;
        }

        this.previousFrameData = currentFrameData;

        // Normalize to 0-100 scale
        const avgDiff = totalDiff / (pixels / 4);
        const motionScore = Math.min(100, (avgDiff / 255) * 100 * 10); // Scale up for visibility

        return motionScore;
    }

    /**
     * Analyze entire video and collect motion data
     * @param {HTMLVideoElement} videoElement - The video element
     * @param {Function} progressCallback - Called with progress (0-1)
     * @returns {Promise<Array>} Array of {time, motion} objects
     */
    async analyzeVideo(videoElement, progressCallback = null) {
        return new Promise((resolve, reject) => {
            if (!videoElement || !videoElement.duration) {
                reject(new Error('Invalid video element'));
                return;
            }

            this.motionHistory = [];
            this.previousFrameData = null;

            const duration = videoElement.duration;
            const sampleRate = 0.1; // Sample every 0.1 seconds
            let currentTime = 0;

            const originalTime = videoElement.currentTime;
            const wasPaused = videoElement.paused;

            // Timeout safety - reject after 30 seconds of inactivity
            let timeoutId = null;
            const resetTimeout = () => {
                if (timeoutId) clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    cleanup();
                    reject(new Error('Analysis timed out. The video player may have frozen.'));
                }, 30000);
            };

            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                videoElement.removeEventListener('seeked', onSeeked);
            };

            const processFrame = () => {
                if (currentTime >= duration) {
                    cleanup();
                    // Restore original state
                    videoElement.currentTime = originalTime;
                    if (!wasPaused) {
                        videoElement.play();
                    }
                    resolve(this.motionHistory);
                    return;
                }

                resetTimeout();
                videoElement.currentTime = currentTime;
            };

            const onSeeked = () => {
                const motionScore = this.analyzeFrame(videoElement);
                this.motionHistory.push({
                    time: currentTime,
                    motion: motionScore
                });

                if (progressCallback) {
                    progressCallback(currentTime / duration);
                }

                currentTime += sampleRate;
                processFrame();
            };

            videoElement.addEventListener('seeked', onSeeked);
            videoElement.pause();
            processFrame();
        });
    }

    /**
     * Detect cycles from motion data using peak detection
     * @param {Array} motionData - Array of {time, motion} objects
     * @param {number} threshold - Minimum motion intensity to consider (0-100)
     * @param {number} minCycleDuration - Minimum cycle duration in seconds
     * @returns {Array} Array of detected cycles {startTime, endTime, duration, avgMotion}
     */
    detectCycles(motionData, threshold = 20, minCycleDuration = 1) {
        if (!motionData || motionData.length < 10) {
            return [];
        }

        // Smooth the data using moving average
        const smoothed = this.smoothData(motionData, 3);

        // Find peaks (local maxima above threshold)
        const peaks = [];
        for (let i = 1; i < smoothed.length - 1; i++) {
            const prev = smoothed[i - 1].motion;
            const curr = smoothed[i].motion;
            const next = smoothed[i + 1].motion;

            if (curr > prev && curr > next && curr > threshold) {
                peaks.push(smoothed[i]);
            }
        }

        // Group peaks into cycles
        const cycles = [];
        for (let i = 0; i < peaks.length - 1; i++) {
            const startTime = peaks[i].time;
            const endTime = peaks[i + 1].time;
            const duration = endTime - startTime;

            if (duration >= minCycleDuration) {
                // Calculate average motion in this cycle
                const cycleData = motionData.filter(d => d.time >= startTime && d.time <= endTime);
                const avgMotion = cycleData.reduce((sum, d) => sum + d.motion, 0) / cycleData.length;

                cycles.push({
                    startTime,
                    endTime,
                    duration,
                    avgMotion: avgMotion.toFixed(2),
                    peakMotion: Math.max(...cycleData.map(d => d.motion)).toFixed(2)
                });
            }
        }

        return cycles;
    }

    /**
     * Smooth motion data using moving average
     * @param {Array} data - Motion data
     * @param {number} windowSize - Window size for averaging
     * @returns {Array} Smoothed data
     */
    smoothData(data, windowSize = 3) {
        const smoothed = [];
        for (let i = 0; i < data.length; i++) {
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
            const window = data.slice(start, end);
            const avgMotion = window.reduce((sum, d) => sum + d.motion, 0) / window.length;

            smoothed.push({
                time: data[i].time,
                motion: avgMotion
            });
        }
        return smoothed;
    }

    /**
     * Calculate statistics for detected cycles
     * @param {Array} cycles - Array of cycle objects
     * @returns {Object} Statistics
     */
    calculateStats(cycles) {
        if (!cycles || cycles.length === 0) {
            return null;
        }

        const durations = cycles.map(c => c.duration);
        const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
        const minDuration = Math.min(...durations);
        const maxDuration = Math.max(...durations);

        // Calculate standard deviation
        const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);

        return {
            totalCycles: cycles.length,
            avgDuration: avgDuration.toFixed(2),
            minDuration: minDuration.toFixed(2),
            maxDuration: maxDuration.toFixed(2),
            stdDev: stdDev.toFixed(2),
            consistency: ((1 - (stdDev / avgDuration)) * 100).toFixed(1) // Higher is more consistent
        };
    }

    /**
     * Reset the detector state
     */
    reset() {
        this.previousFrameData = null;
        this.motionHistory = [];
    }
}

export default AutoCycleDetector;
