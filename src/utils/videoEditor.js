/**
 * Cuts a segment from a video file using MediaRecorder API.
 * This process plays the video internally and records the segment.
 * 
 * @param {File|Blob|string} videoSource - The source video file or URL
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {function} onProgress - Callback for progress updates (0-100)
 * @returns {Promise<Blob>} - Resolves with the cut video blob
 */
export const cutVideo = async (videoSource, startTime, endTime, onProgress) => {
    return new Promise((resolve, reject) => {
        // Create offline video element
        const video = document.createElement('video');
        video.muted = true;
        video.volume = 0;
        video.playsInline = true;
        video.preload = "auto";
        // REMOVED: video.crossOrigin = "anonymous"; // Can cause decode issues with local Blobs/Files

        // Hide it out of view but keep it "visible" to the browser to avoid throttling
        video.style.position = 'fixed';
        video.style.bottom = '0';
        video.style.right = '0';
        video.style.width = '480px';
        video.style.height = '270px';
        video.style.opacity = '0.001';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-9999';
        document.body.appendChild(video);

        let objectUrl = null;
        let mediaRecorder = null;
        let chunks = [];
        let stream = null;
        let recordingStarted = false;
        let progressInterval = null;

        const cleanup = () => {
            if (progressInterval) clearInterval(progressInterval);
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            if (video.parentNode) video.parentNode.removeChild(video);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };

        const setupRecorder = () => {
            // Validate times
            if (startTime < 0) startTime = 0;
            if (endTime > video.duration) endTime = video.duration;
            if (startTime >= endTime) {
                cleanup();
                reject(new Error("Invalid start/end time"));
                return;
            }

            try {
                // FF and Chrome support captureStream
                const fullStream = video.captureStream ? video.captureStream() : video.mozCaptureStream();

                // DATASET BUILDER OPTIMIZATION:
                // Strip audio tracks to bypass PIPELINE_ERROR_DECODE (often failing on audio packets).
                // For ML training datasets, audio is typically not required.
                const videoTracks = fullStream.getVideoTracks();
                if (videoTracks.length === 0) {
                    cleanup();
                    reject(new Error("No video tracks found in stream."));
                    return;
                }
                stream = new MediaStream(videoTracks);

                // Determine mime type - prioritize webm for better compatibility with MediaRecorder
                const mimeTypes = [
                    'video/mp4',
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm'
                ];

                let selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

                try {
                    const options = { videoBitsPerSecond: 2500000 };
                    if (selectedMimeType) options.mimeType = selectedMimeType;
                    mediaRecorder = new MediaRecorder(stream, options);
                } catch (err) {
                    mediaRecorder = new MediaRecorder(stream);
                }

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data && e.data.size > 0) chunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    if (chunks.length === 0) {
                        cleanup();
                        reject(new Error("No video data captured. Please try again."));
                        return;
                    }
                    const finalMimeType = mediaRecorder.mimeType || selectedMimeType || 'video/webm';
                    const blob = new Blob(chunks, { type: finalMimeType });
                    cleanup();
                    resolve(blob);
                };

                mediaRecorder.onerror = (e) => {
                    cleanup();
                    reject(e.error || new Error("MediaRecorder error"));
                };

                const onSeeked = () => {
                    video.removeEventListener('seeked', onSeeked);
                    console.log("Video seeked to start time:", video.currentTime);

                    // Start recording - give a tiny bit of time for stream to stabilize
                    setTimeout(() => {
                        try {
                            if (!mediaRecorder || mediaRecorder.state !== 'inactive') return;

                            mediaRecorder.start();
                            video.play().then(() => {
                                recordingStarted = true;

                                // SEEK GUARD: 
                                // Browsers sometimes reset currentTime to 0 when play() is called.
                                // If it resets, force it back to startTime immediately.
                                if (video.currentTime < startTime) {
                                    console.log("Seek Guard Triggered: Forcing return to segment start.");
                                    video.currentTime = startTime;
                                }

                                console.log("Recording started for segment:", startTime, "to", endTime);

                                // Precise monitoring
                                progressInterval = setInterval(() => {
                                    if (!video) {
                                        if (progressInterval) clearInterval(progressInterval);
                                        return;
                                    }
                                    const duration = endTime - startTime;
                                    const elapsed = video.currentTime - startTime;
                                    const percent = Math.min(100, Math.max(0, (elapsed / duration) * 100));

                                    // Periodic logging to track health
                                    if (Math.floor(percent) % 10 === 0) {
                                        console.log(`Cutting progress: ${percent.toFixed(1)}% (Time: ${video.currentTime.toFixed(2)}s)`);
                                    }

                                    if (onProgress) onProgress(percent);

                                    if (video.currentTime >= endTime) {
                                        if (progressInterval) clearInterval(progressInterval);
                                        video.pause();
                                        if (mediaRecorder.state !== 'inactive') mediaRecorder.stop();
                                    }
                                }, 100);
                            }).catch(err => {
                                cleanup();
                                reject(new Error("Playback failed: " + err.message));
                            });
                        } catch (err) {
                            cleanup();
                            reject(new Error("Recording failed to start: " + err.message));
                        }
                    }, 300); // Increased stabilization delay for safer capture
                };

                // Add listener BEFORE setting time to avoid race condition
                video.addEventListener('seeked', onSeeked);

                // If we're already at the start time, trigger manually
                if (Math.abs(video.currentTime - startTime) < 0.1) {
                    onSeeked();
                } else {
                    video.currentTime = startTime;
                }

            } catch (err) {
                cleanup();
                reject(err);
            }
        };

        video.onloadedmetadata = setupRecorder;
        video.onerror = (e) => {
            console.error("Video cutting decode/load error:", {
                code: video.error?.code,
                message: video.error?.message,
                src: video.src.substring(0, 100) + "..."
            });
            cleanup();
            reject(new Error("Error loading video file. Status: " + (video.error?.message || "Internal Decoder Error")));
        };

        // Set source AFTER listeners
        if (typeof videoSource === 'string') {
            video.src = videoSource;
        } else {
            objectUrl = URL.createObjectURL(videoSource);
            video.src = objectUrl;
        }

        // Explicitly load to initialize the pipeline
        video.load();
    });
};
