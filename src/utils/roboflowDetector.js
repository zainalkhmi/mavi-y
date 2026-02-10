/**
 * roboflowDetector.js
 * Utility for running inference via the Roboflow Hosted API.
 * Included asynchronous background processing to prevent UI lag.
 */

class RoboflowDetector {
    constructor() {
        this.cache = {}; // Store latest results per modelId
        this.isProcessing = {}; // Tracking if a model is currently in flight
        this.lastProcessTime = {}; // Throttling
    }

    /**
     * Run inference for ALL configured Roboflow models
     * This is non-blocking: it requests new data in background and returns cache immediately.
     */
    async detectAll(video, rfModels, activePose = null) {
        if (!rfModels || rfModels.length === 0) return {};

        const now = Date.now();

        rfModels.forEach(async (model) => {
            const modelId = model.id;

            // Only process if:
            // 1. Model is not already processing
            // 2. Throttling period has passed (min 500ms between API calls)
            if (!this.isProcessing[modelId] && (now - (this.lastProcessTime[modelId] || 0) > 500)) {
                this.isProcessing[modelId] = true;
                this.lastProcessTime[modelId] = now;

                // Create a separate scoped call
                this.detect(model.apiKey, model.projectId, model.version, video, activePose).then(results => {
                    this.cache[modelId] = results;
                    this.isProcessing[modelId] = false;
                }).catch(() => {
                    this.isProcessing[modelId] = false;
                });
            }
        });

        return this.cache;
    }

    /**
     * Internal: Run inference via Roboflow API
     */
    async detect(apiKey, projectUrl, version, element, activePose = null) {
        if (!apiKey || !projectUrl || !version || !element) return [];

        // --- SMART MOCK MODE FOR DEMO ---
        if (apiKey.toUpperCase() === 'DEMO' || apiKey.toUpperCase() === 'MOCK') {
            await new Promise(r => setTimeout(r, 100)); // Faster mock response

            const results = [];
            if (projectUrl.toLowerCase().includes('helm') || projectUrl.toLowerCase().includes('ppe')) {
                // If we have a pose, center the mock box on the head (nose)
                let x = 0.4, y = 0.2;
                if (activePose && activePose.keypoints) {
                    const nose = activePose.keypoints.find(k => k.name === 'nose');
                    if (nose && nose.score > 0.5) {
                        x = nose.x - 0.1; // Offset to center a 0.2 wide box
                        y = nose.y - 0.15; // Offset to sit on head
                    }
                }

                results.push({
                    class: 'helmet',
                    confidence: 0.85 + Math.random() * 0.1,
                    bbox: [x, y, 0.2, 0.25]
                });
            } else if (projectUrl.toLowerCase().includes('part') || projectUrl.toLowerCase().includes('box')) {
                results.push({
                    class: 'part_box',
                    confidence: 0.92,
                    bbox: [0.1, 0.6, 0.3, 0.3]
                });
            } else {
                results.push({
                    class: 'demo_object',
                    confidence: 0.99,
                    bbox: [0.3, 0.3, 0.4, 0.4]
                });
            }
            return results;
        }
        // --------------------------

        try {
            // Create a canvas to extract the image blob
            const canvas = document.createElement('canvas');
            // Use small resolution for API bandwidth efficiency (Roboflow handles resizing)
            canvas.width = 640;
            canvas.height = 480;

            const sourceWidth = element.videoWidth || element.width;
            const sourceHeight = element.videoHeight || element.height;
            if (!sourceWidth || !sourceHeight) return [];

            const ctx = canvas.getContext('2d');
            ctx.drawImage(element, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.7));
            if (!blob) return [];

            const url = `https://detect.roboflow.com/${projectUrl}/${version}?api_key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                body: blob,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if (!response.ok) return this.cache[projectUrl] || [];

            const result = await response.json();
            const detections = result.predictions || [];

            // Map Roboflow response format to MAVi standard [x, y, w, h] (normalized 0-1)
            return detections.map(p => ({
                class: p.class,
                confidence: p.confidence,
                bbox: [
                    (p.x - p.width / 2) / canvas.width,
                    (p.y - p.height / 2) / canvas.height,
                    p.width / canvas.width,
                    p.height / canvas.height
                ]
            }));
        } catch (error) {
            console.error('Roboflow Detection failed:', error);
            return [];
        }
    }
}

const roboflowDetector = new RoboflowDetector();
export default roboflowDetector;
