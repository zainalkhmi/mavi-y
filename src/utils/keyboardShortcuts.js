/**
 * Keyboard shortcuts for video playback and measurement
 */

export function setupKeyboardShortcuts(handlers) {
    const {
        onPlayPause,
        onNextFrame,
        onPrevFrame,
        onSpeedUp,
        onSpeedDown,
        onZoomIn,
        onZoomOut,
        onNextMeasurement,
        onPrevMeasurement,
        onSetInPoint,
        onSetOutPoint
    } = handlers;

    const handleKeyDown = (e) => {
        // Ignore if typing in input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key.toLowerCase()) {
            // Play/Pause
            case ' ':
            case 'k':
                e.preventDefault();
                onPlayPause?.();
                break;

            // Frame navigation
            case 'arrowleft':
                e.preventDefault();
                if (e.shiftKey) {
                    // Jump 10 frames back
                    for (let i = 0; i < 10; i++) onPrevFrame?.();
                } else {
                    onPrevFrame?.();
                }
                break;

            case 'arrowright':
                e.preventDefault();
                if (e.shiftKey) {
                    // Jump 10 frames forward
                    for (let i = 0; i < 10; i++) onNextFrame?.();
                } else {
                    onNextFrame?.();
                }
                break;

            // Speed control
            case 'arrowup':
                e.preventDefault();
                onSpeedUp?.();
                break;

            case 'arrowdown':
                e.preventDefault();
                onSpeedDown?.();
                break;

            // JKL editing
            case 'j':
                e.preventDefault();
                // Rewind (play backwards)
                onSpeedDown?.();
                break;

            case 'l':
                e.preventDefault();
                // Fast forward
                onSpeedUp?.();
                break;

            // Zoom
            case '+':
            case '=':
                e.preventDefault();
                onZoomIn?.();
                break;

            case '-':
            case '_':
                e.preventDefault();
                onZoomOut?.();
                break;

            // Measurement navigation
            case '[':
                e.preventDefault();
                onPrevMeasurement?.();
                break;

            case ']':
                e.preventDefault();
                onNextMeasurement?.();
                break;

            // In/Out points
            case 'i':
                e.preventDefault();
                onSetInPoint?.();
                break;

            case 'o':
                e.preventDefault();
                onSetOutPoint?.();
                break;

            default:
                break;
        }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Return cleanup function
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
    };
}

/**
 * Get keyboard shortcuts help text
 */
export function getKeyboardShortcutsHelp() {
    return {
        'Playback': [
            { key: 'Space / K', description: 'Play/Pause' },
            { key: 'J', description: 'Rewind' },
            { key: 'L', description: 'Fast Forward' },
            { key: '← →', description: 'Previous/Next Frame' },
            { key: 'Shift + ← →', description: 'Jump 10 Frames' },
            { key: '↑ ↓', description: 'Speed Up/Down' }
        ],
        'View': [
            { key: '+ / -', description: 'Zoom In/Out' }
        ],
        'Measurement': [
            { key: '[ ]', description: 'Previous/Next Measurement' },
            { key: 'I', description: 'Set In Point' },
            { key: 'O', description: 'Set Out Point' }
        ]
    };
}
