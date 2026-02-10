import JSZip from 'jszip';

/**
 * Extracts frames from a video blob at a specific interval and packages them into a ZIP file.
 * @param {Blob} videoBlob - The video file blob.
 * @param {number} fps - Number of frames to extract per second of video.
 * @param {string} fileNamePrefix - Prefix for the image filenames.
 * @returns {Promise<Blob>} - A promise that resolves to a ZIP blob.
 */
export const extractFramesToZip = async (videoBlob, fps = 5, fileNamePrefix = 'frame', startTime = 0, endTime = null, maxWidth = 640) => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const zip = new JSZip();
        const url = URL.createObjectURL(videoBlob);

        video.src = url;
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            const actualEndTime = endTime || video.duration;
            const interval = 1 / fps;
            let currentTime = startTime;
            let frameCount = 0;

            // Calculate resized dimensions
            let targetWidth = video.videoWidth;
            let targetHeight = video.videoHeight;

            if (maxWidth && video.videoWidth > maxWidth) {
                const ratio = maxWidth / video.videoWidth;
                targetWidth = maxWidth;
                targetHeight = video.videoHeight * ratio;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            try {
                while (currentTime <= actualEndTime) {
                    video.currentTime = currentTime;

                    // Wait for the video to seek
                    await new Promise((res) => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            res();
                        };
                        video.addEventListener('seeked', onSeeked);
                    });

                    // Draw frame to canvas with resizing
                    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

                    // Convert to JPG
                    const imageData = canvas.toDataURL('image/jpeg', 0.8);
                    const base64Data = imageData.split(',')[1];

                    // Add to ZIP
                    const fileName = `${fileNamePrefix}_${String(frameCount).padStart(4, '0')}.jpg`;
                    zip.file(fileName, base64Data, { base64: true });

                    currentTime += interval;
                    frameCount++;

                    // Safety break if it exceeds duration somehow
                    if (currentTime > video.duration) break;
                }

                const content = await zip.generateAsync({ type: 'blob' });
                URL.revokeObjectURL(url);
                resolve(content);
            } catch (err) {
                URL.revokeObjectURL(url);
                reject(err);
            }
        };

        video.onerror = (err) => {
            URL.revokeObjectURL(url);
            reject(err);
        };
    });
};
