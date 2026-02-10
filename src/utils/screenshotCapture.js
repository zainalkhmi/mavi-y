// Screenshot capture utility
export const captureScreenshot = (videoElement, measurements, logoUrl, logoPosition, logoOpacity) => {
    if (!videoElement) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');

    // Draw video frame
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Draw measurements overlay
    if (measurements && measurements.length > 0) {
        const currentTime = videoElement.currentTime;
        const activeMeasurement = measurements.find(
            m => currentTime >= m.startTime && currentTime <= m.endTime
        );

        if (activeMeasurement) {
            // Draw element name overlay
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, canvas.height - 60, canvas.width - 20, 50);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(activeMeasurement.elementName, 20, canvas.height - 30);

            ctx.font = '18px Arial';
            ctx.fillText(
                `${activeMeasurement.category} - ${activeMeasurement.duration.toFixed(2)}s`,
                20,
                canvas.height - 10
            );
        }
    }

    // Draw logo if exists
    if (logoUrl) {
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        logo.onload = () => {
            const logoSize = 100;
            let x, y;

            switch (logoPosition) {
                case 'top-left':
                    x = 10;
                    y = 10;
                    break;
                case 'top-right':
                    x = canvas.width - logoSize - 10;
                    y = 10;
                    break;
                case 'bottom-left':
                    x = 10;
                    y = canvas.height - logoSize - 10;
                    break;
                case 'bottom-right':
                default:
                    x = canvas.width - logoSize - 10;
                    y = canvas.height - logoSize - 10;
                    break;
            }

            ctx.globalAlpha = logoOpacity || 0.7;
            ctx.drawImage(logo, x, y, logoSize, logoSize);
            ctx.globalAlpha = 1.0;

            // Download screenshot
            downloadCanvas(canvas);
        };
        logo.src = logoUrl;
    } else {
        // Download without logo
        downloadCanvas(canvas);
    }
};

const downloadCanvas = (canvas) => {
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `screenshot_${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
};

// Export analysis data as JSON
export const exportAnalysisData = (measurements, videoName) => {
    const data = {
        videoName: videoName || 'Untitled',
        exportDate: new Date().toISOString(),
        measurements: measurements.map(m => ({
            elementName: m.elementName,
            category: m.category,
            startTime: m.startTime,
            endTime: m.endTime,
            duration: m.duration,
            rating: m.rating || 0
        })),
        summary: {
            totalElements: measurements.length,
            totalTime: measurements.reduce((sum, m) => sum + m.duration, 0),
            valueAdded: measurements.filter(m => m.category === 'Value-added').length,
            nonValueAdded: measurements.filter(m => m.category === 'Non value-added').length,
            waste: measurements.filter(m => m.category === 'Waste').length
        }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoName || 'analysis'}_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};
