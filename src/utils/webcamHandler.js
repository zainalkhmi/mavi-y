/**
 * Webcam Handler Utility
 * Handles local camera access using getUserMedia API
 */

class WebcamHandler {
    constructor() {
        this.stream = null;
        this.currentDeviceId = null;
        this.constraints = {
            video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                facingMode: 'user'
            },
            audio: false
        };
    }

    /**
     * Check if getUserMedia is supported
     * @returns {boolean} Support status
     */
    static isSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get list of available video devices
     * @returns {Promise<Array>} Array of video input devices
     */
    async getVideoDevices() {
        try {
            // Request permission first
            await navigator.mediaDevices.getUserMedia({ video: true });

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            return videoDevices.map(device => ({
                deviceId: device.deviceId,
                label: device.label || `Camera ${videoDevices.indexOf(device) + 1}`,
                groupId: device.groupId
            }));
        } catch (error) {
            console.error('Error getting video devices:', error);
            throw error;
        }
    }

    /**
     * Start webcam stream
     * @param {string} deviceId - Optional device ID to use specific camera
     * @param {Object} options - Optional constraints override
     * @returns {Promise<MediaStream>} Camera stream
     */
    async startWebcam(deviceId = null, options = {}) {
        try {
            // Stop existing stream if any
            if (this.stream) {
                this.stopWebcam();
            }

            // Build constraints
            const constraints = {
                video: {
                    ...this.constraints.video,
                    ...options
                },
                audio: false
            };

            // Add device ID if specified
            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
                this.currentDeviceId = deviceId;
            }

            // Get user media
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            return this.stream;
        } catch (error) {
            console.error('Error starting webcam:', error);
            throw this.handleWebcamError(error);
        }
    }

    /**
     * Start screen capture
     * @returns {Promise<MediaStream>} Screen capture stream
     */
    async startScreenCapture() {
        try {
            // Stop existing stream if any
            if (this.stream) {
                this.stopWebcam();
            }

            // Get display media
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always"
                },
                audio: false
            });

            return this.stream;
        } catch (error) {
            console.error('Error starting screen capture:', error);
            throw error;
        }
    }

    /**
     * Stop webcam stream
     */
    stopWebcam() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
            this.currentDeviceId = null;
        }
    }

    /**
     * Switch to different camera
     * @param {string} deviceId - Device ID to switch to
     * @returns {Promise<MediaStream>} New camera stream
     */
    async switchCamera(deviceId) {
        return await this.startWebcam(deviceId);
    }

    /**
     * Set video resolution
     * @param {number} width - Video width
     * @param {number} height - Video height
     * @returns {Promise<MediaStream>} Updated stream
     */
    async setResolution(width, height) {
        this.constraints.video.width = { ideal: width };
        this.constraints.video.height = { ideal: height };

        if (this.stream) {
            return await this.startWebcam(this.currentDeviceId);
        }
    }

    /**
     * Get current stream
     * @returns {MediaStream|null} Current stream
     */
    getStream() {
        return this.stream;
    }

    /**
     * Get stream status
     * @returns {Object} Stream status
     */
    getStatus() {
        return {
            isActive: this.stream !== null,
            deviceId: this.currentDeviceId,
            tracks: this.stream ? this.stream.getTracks().length : 0
        };
    }

    /**
     * Take snapshot from current stream
     * @param {HTMLVideoElement} videoElement - Video element displaying stream
     * @returns {Promise<Blob>} Image blob
     */
    async takeSnapshot(videoElement) {
        return new Promise((resolve, reject) => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = videoElement.videoWidth;
                canvas.height = videoElement.videoHeight;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(videoElement, 0, 0);

                canvas.toBlob(blob => {
                    resolve(blob);
                }, 'image/png');
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Handle webcam errors
     * @param {Error} error - Error object
     * @returns {Error} Formatted error
     */
    handleWebcamError(error) {
        let message = 'Failed to access webcam';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = 'Camera access denied. Please allow camera permission.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message = 'No camera found. Please connect a camera.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message = 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError') {
            message = 'Camera does not support the requested settings.';
        } else if (error.name === 'TypeError') {
            message = 'Camera access is not supported in this browser.';
        }

        const err = new Error(message);
        err.originalError = error;
        return err;
    }

    /**
     * Get supported resolutions (common presets)
     * @returns {Array} Array of resolution presets
     */
    static getSupportedResolutions() {
        return [
            { label: '4K (3840x2160)', width: 3840, height: 2160 },
            { label: 'Full HD (1920x1080)', width: 1920, height: 1080 },
            { label: 'HD (1280x720)', width: 1280, height: 720 },
            { label: 'VGA (640x480)', width: 640, height: 480 },
            { label: 'QVGA (320x240)', width: 320, height: 240 }
        ];
    }
}

export default WebcamHandler;
