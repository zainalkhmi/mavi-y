/**
 * Stream Handler Utility
 * Handles various video stream protocols (HTTP, HTTPS, HLS)
 */

import Hls from 'hls.js';

class StreamHandler {
    constructor() {
        this.currentStream = null;
        this.streamType = null;
        this.hlsInstance = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;
    }

    /**
     * Connect to HTTP/HTTPS stream
     * @param {string} url - Stream URL
     * @param {HTMLVideoElement} videoElement - Video element to attach stream
     * @returns {Promise<boolean>} Success status
     */
    async connectHTTPStream(url, videoElement) {
        try {
            this.streamType = 'http';
            this.currentStream = url;

            videoElement.src = url;

            return new Promise((resolve, reject) => {
                videoElement.onloadedmetadata = () => {
                    this.reconnectAttempts = 0;
                    resolve(true);
                };

                videoElement.onerror = (event) => {
                    // Extract detailed error information from MediaError
                    const mediaError = videoElement.error;
                    let errorMessage = 'Failed to load video stream';

                    if (mediaError) {
                        // Include the browser's error message if available
                        if (mediaError.message) {
                            errorMessage = mediaError.message;
                        }

                        // Log detailed error info for debugging
                        console.error('HTTP Stream error:', {
                            code: mediaError.code,
                            message: mediaError.message,
                            url: url
                        });
                    } else {
                        console.error('HTTP Stream error:', event);
                    }

                    const error = new Error(errorMessage);
                    error.mediaError = mediaError;

                    this.handleStreamError(url, videoElement);
                    reject(error);
                };
            });
        } catch (error) {
            console.error('Failed to connect HTTP stream:', error);
            throw error;
        }
    }

    /**
     * Connect to MJPEG stream (IP Camera)
     * @param {string} url - Stream URL
     * @param {HTMLVideoElement} videoElement - Video element to attach stream
     * @returns {Promise<boolean>} Success status
     */
    async connectMJPEGStream(url, videoElement) {
        try {
            this.streamType = 'mjpeg';
            this.currentStream = url;

            // For MJPEG, we don't wait for loadedmetadata as it might not fire consistently
            // and we want to avoid the "Connecting..." hang.
            videoElement.src = url;

            // Reset reconnect attempts
            this.reconnectAttempts = 0;

            return Promise.resolve(true);
        } catch (error) {
            console.error('Failed to connect MJPEG stream:', error);
            throw error;
        }
    }

    /**
     * Connect to HLS stream
     * @param {string} url - HLS stream URL (.m3u8)
     * @param {HTMLVideoElement} videoElement - Video element to attach stream
     * @returns {Promise<boolean>} Success status
     */
    async connectHLSStream(url, videoElement) {
        try {
            this.streamType = 'hls';
            this.currentStream = url;

            // Check if HLS is natively supported (Safari)
            if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
                videoElement.src = url;
                this.reconnectAttempts = 0;
                return true;
            }
            // Use HLS.js for other browsers
            else if (Hls.isSupported()) {
                if (this.hlsInstance) {
                    this.hlsInstance.destroy();
                }

                this.hlsInstance = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });

                this.hlsInstance.loadSource(url);
                this.hlsInstance.attachMedia(videoElement);

                return new Promise((resolve, reject) => {
                    this.hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                        this.reconnectAttempts = 0;
                        resolve(true);
                    });

                    this.hlsInstance.on(Hls.Events.ERROR, (event, data) => {
                        console.error('HLS error:', data);
                        if (data.fatal) {
                            this.handleHLSError(data, url, videoElement);
                            reject(data);
                        }
                    });
                });
            } else {
                throw new Error('HLS is not supported in this browser');
            }
        } catch (error) {
            console.error('Failed to connect HLS stream:', error);
            throw error;
        }
    }

    /**
     * Handle HLS errors and attempt recovery
     */
    handleHLSError(data, url, videoElement) {
        if (!this.hlsInstance) return;

        switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('Network error, attempting to recover...');
                this.hlsInstance.startLoad();
                break;
            case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('Media error, attempting to recover...');
                this.hlsInstance.recoverMediaError();
                break;
            default:
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                    setTimeout(() => {
                        this.connectHLSStream(url, videoElement);
                    }, this.reconnectDelay);
                } else {
                    console.error('Max reconnection attempts reached');
                    this.disconnect();
                }
                break;
        }
    }

    /**
     * Handle HTTP stream errors
     */
    handleStreamError(url, videoElement) {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting HTTP stream... Attempt ${this.reconnectAttempts}`);
            setTimeout(() => {
                this.connectHTTPStream(url, videoElement);
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached for HTTP stream');
        }
    }

    /**
     * Disconnect current stream
     */
    disconnect() {
        if (this.hlsInstance) {
            this.hlsInstance.destroy();
            this.hlsInstance = null;
        }
        this.currentStream = null;
        this.streamType = null;
        this.reconnectAttempts = 0;
    }

    /**
     * Get current stream status
     * @returns {Object} Stream status information
     */
    getStreamStatus() {
        return {
            isConnected: this.currentStream !== null,
            streamType: this.streamType,
            streamUrl: this.currentStream,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    /**
     * Get MediaStream from video element for recording
     * @param {HTMLVideoElement} videoElement
     * @returns {MediaStream}
     */
    getMediaStream(videoElement) {
        if (!videoElement) {
            throw new Error('Video element is required');
        }

        // Capture stream from video element
        return videoElement.captureStream ? videoElement.captureStream() : videoElement.mozCaptureStream();
    }
}

export default StreamHandler;
