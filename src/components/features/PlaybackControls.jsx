import React, { useState, useEffect } from 'react';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Rewind,
    RotateCcw,
    Gauge,
    ZoomIn,
    Star,
    ChevronDown
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

function PlaybackControls({
    videoState,
    onTogglePlay,
    onSetSpeed,
    onNextFrame,
    onPreviousFrame,
    onSetZoom,
    onToggleReverse,
    onQuickCategorize,
    selectedId,
    stopwatches,
    currentCycle,
    onNextCycle,
    onPrevCycle,
    measurementStart,
    onStartMeasurement,
    onEndMeasurement,
    onCancelMeasurement
}) {
    const { t } = useLanguage();
    const [useRatingSpeed, setUseRatingSpeed] = useState(false);

    // Calculate average rating from measurements
    const calculateRatingSpeed = () => {
        if (!videoState.measurements || videoState.measurements.length === 0) return 1;

        const measurementsWithRating = videoState.measurements.filter(m => m.rating && m.rating > 0);
        if (measurementsWithRating.length === 0) return 1;

        const avgRating = measurementsWithRating.reduce((sum, m) => sum + m.rating, 0) / measurementsWithRating.length;
        return avgRating / 100; // Convert percentage to decimal
    };

    // Apply rating speed when toggle changes
    useEffect(() => {
        if (useRatingSpeed) {
            const ratingSpeed = calculateRatingSpeed();
            onSetSpeed(ratingSpeed);
        } else {
            onSetSpeed(1); // Reset to normal speed
        }
    }, [useRatingSpeed]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    const ratingSpeed = calculateRatingSpeed();
    const hasRatings = videoState.measurements && videoState.measurements.some(m => m.rating && m.rating > 0);

    const controlButtonStyle = {
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-tertiary)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.2s',
        minWidth: '36px',
        height: '36px'
    };

    const selectStyle = {
        padding: '4px 24px 4px 8px', // Reduced padding
        backgroundColor: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        color: 'var(--text-primary)',
        fontSize: '0.85rem', // Slightly smaller font
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23b0b0b0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right .5em top 50%',
        backgroundSize: '.6em auto',
        minWidth: '70px' // Reduced minWidth
    };

    return (
        <div className="glass-panel" style={{
            padding: '4px 10px', // Even more compact
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            borderRadius: '12px',
            margin: '0 10px 10px 10px',
            border: '1px solid var(--glass-border)'
        }}>
            {/* Consolidated Controls - Single Row */}
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', padding: '2px 0' }}>

                {/* Playback Controls Group */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '2px', borderRadius: '8px' }}>
                    <button
                        className="btn"
                        onClick={onPreviousFrame}
                        title={t('videoWorkspace.prevFrame')}
                        style={{ ...controlButtonStyle, width: '28px', height: '28px', padding: '0' }}
                    >
                        <SkipBack size={14} />
                    </button>

                    <button
                        className="btn"
                        onClick={onTogglePlay}
                        style={{
                            ...controlButtonStyle,
                            backgroundColor: videoState.isPlaying ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                            color: videoState.isPlaying ? 'white' : 'var(--text-primary)',
                            borderColor: videoState.isPlaying ? 'var(--accent-blue)' : 'var(--border-color)',
                            width: '28px',
                            height: '28px',
                            padding: '0'
                        }}
                    >
                        {videoState.isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                    </button>

                    <button
                        className="btn"
                        onClick={onNextFrame}
                        title={t('videoWorkspace.nextFrame')}
                        style={{ ...controlButtonStyle, width: '28px', height: '28px', padding: '0' }}
                    >
                        <SkipForward size={14} />
                    </button>
                </div>

                {/* Measurement Timer Button */}
                <button
                    className={`btn ${measurementStart !== null ? 'active' : ''}`}
                    onClick={() => {
                        if (measurementStart !== null) {
                            if (onCancelMeasurement) onCancelMeasurement();
                        } else {
                            if (onStartMeasurement) onStartMeasurement();
                        }
                    }}
                    style={{
                        ...controlButtonStyle,
                        backgroundColor: measurementStart !== null ? 'rgba(220, 38, 38, 0.2)' : 'var(--bg-tertiary)',
                        borderColor: measurementStart !== null ? 'var(--accent-red)' : 'var(--border-color)',
                        color: measurementStart !== null ? 'var(--accent-red)' : 'var(--text-primary)',
                        width: '28px',
                        height: '28px',
                        padding: '0'
                    }}
                    title={measurementStart !== null ? t('elementEditor.cancelMeasurement') : t('elementEditor.startMeasurement')}
                >
                    {measurementStart !== null ? (
                        <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-red)', borderRadius: '2px' }} />
                    ) : (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid currentColor' }} />
                    )}
                </button>

                {/* Reverse Playback */}
                <button
                    className={`btn ${videoState.isReverse ? 'active' : ''}`}
                    onClick={onToggleReverse}
                    title={videoState.isReverse ? t('videoWorkspace.reverseMode') : t('videoWorkspace.normalMode')}
                    style={{
                        ...controlButtonStyle,
                        color: videoState.isReverse ? 'white' : 'var(--text-secondary)',
                        width: '28px',
                        height: '28px',
                        padding: '0'
                    }}
                >
                    <Rewind size={14} className={videoState.isReverse ? 'animate-pulse' : ''} />
                </button>

                {/* Divider */}
                <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

                {/* Quick Categorize Buttons (M, A, W, L) */}
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[
                        { id: 'manual', label: 'M', name: t('elementEditor.manual'), color: '#ffd700', activeData: stopwatches && selectedId ? stopwatches[selectedId]?.manual : undefined },
                        { id: 'auto', label: 'A', name: t('elementEditor.auto'), color: '#00ff00', activeData: stopwatches && selectedId ? stopwatches[selectedId]?.auto : undefined },
                        { id: 'walk', label: 'W', name: t('elementEditor.walk'), color: '#ff4d4d', activeData: stopwatches && selectedId ? stopwatches[selectedId]?.walk : undefined },
                        { id: 'waiting', label: 'L', name: t('elementEditor.loss'), color: '#f97316', activeData: stopwatches && selectedId ? stopwatches[selectedId]?.waiting : undefined }
                    ].map(btn => (
                        <button
                            key={btn.id}
                            onClick={() => onQuickCategorize && onQuickCategorize(btn.id)}
                            disabled={!selectedId}
                            style={{
                                ...controlButtonStyle,
                                width: '28px',
                                height: '28px',
                                padding: '0',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                color: btn.activeData !== undefined ? '#000' : (selectedId ? btn.color : '#555'),
                                backgroundColor: btn.activeData !== undefined ? btn.color : 'var(--bg-tertiary)',
                                borderColor: btn.activeData !== undefined ? btn.color : (selectedId ? btn.color : 'var(--border-color)'),
                                opacity: selectedId ? 1 : 0.5,
                                cursor: selectedId ? 'pointer' : 'not-allowed',
                                boxShadow: btn.activeData !== undefined ? `0 0 6px ${btn.color}` : 'none'
                            }}
                            title={!selectedId ? t('elementEditor.selectAnElement') : (btn.activeData !== undefined ? t('elementEditor.stopTracking', { type: btn.name }) : t('elementEditor.startTracking', { type: btn.name }))}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

                {/* Cycle Controls */}
                {currentCycle !== undefined && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: 'rgba(0, 90, 158, 0.1)', padding: '2px 4px', borderRadius: '8px', border: '1px solid rgba(0, 90, 158, 0.3)' }}>
                        <button
                            className="btn"
                            onClick={onPrevCycle}
                            disabled={currentCycle <= 1}
                            style={{
                                ...controlButtonStyle,
                                width: '22px',
                                height: '22px',
                                padding: '0',
                                fontSize: '0.7rem',
                                border: 'none',
                                backgroundColor: 'transparent',
                                opacity: currentCycle <= 1 ? 0.3 : 1
                            }}
                            title={t('elementEditor.prevCycle')}
                        >
                            ◀
                        </button>
                        <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#60a5fa', userSelect: 'none', whiteSpace: 'nowrap' }}>
                            {t('elementEditor.cycle')} {currentCycle}
                        </span>
                        <button
                            className="btn"
                            onClick={onNextCycle}
                            style={{
                                ...controlButtonStyle,
                                width: '22px',
                                height: '22px',
                                padding: '0',
                                fontSize: '0.7rem',
                                border: 'none',
                                backgroundColor: 'transparent'
                            }}
                            title={t('elementEditor.nextCycle')}
                        >
                            ▶
                        </button>
                    </div>
                )}

                {/* Divider */}
                <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--border-color)', margin: '0 2px' }} />

                {/* Speed Control */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <Gauge size={12} style={{ position: 'absolute', left: '6px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                        <select
                            value={videoState.playbackRate}
                            onChange={(e) => onSetSpeed(parseFloat(e.target.value))}
                            disabled={useRatingSpeed}
                            style={{
                                ...selectStyle,
                                paddingLeft: '22px',
                                height: '28px',
                                fontSize: '0.75rem',
                                opacity: useRatingSpeed ? 0.5 : 1
                            }}
                            title={t('elementEditor.playbackSpeed')}
                        >
                            <option value="0.1">0.1x</option>
                            <option value="0.25">0.25x</option>
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1">1x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2x</option>
                            <option value="4">4x</option>
                        </select>
                    </div>

                    {/* Rating Speed Toggle */}
                    {hasRatings && (
                        <button
                            onClick={() => setUseRatingSpeed(!useRatingSpeed)}
                            className={`btn ${useRatingSpeed ? 'active' : ''}`}
                            style={{
                                ...controlButtonStyle,
                                padding: '0 6px',
                                gap: '3px',
                                width: 'auto',
                                height: '28px',
                                backgroundColor: useRatingSpeed ? 'rgba(234, 179, 8, 0.1)' : 'var(--bg-tertiary)',
                                color: useRatingSpeed ? 'var(--accent-yellow)' : 'var(--text-secondary)'
                            }}
                            title={t('elementEditor.toggleRatingSpeed')}
                        >
                            <Star size={12} fill={useRatingSpeed ? "currentColor" : "none"} />
                            <span style={{ fontSize: '0.7rem' }}>{t('elementEditor.rating')}</span>
                            {useRatingSpeed && (
                                <span style={{
                                    fontSize: '0.65rem',
                                    backgroundColor: 'rgba(0,0,0,0.2)',
                                    padding: '1px 3px',
                                    borderRadius: '3px',
                                    fontWeight: 'bold',
                                    marginLeft: '1px'
                                }}>
                                    {ratingSpeed.toFixed(2)}x
                                </span>
                            )}
                        </button>
                    )}
                </div>

                {/* Zoom Control */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <ZoomIn size={12} style={{ position: 'absolute', left: '6px', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                        <select
                            value={videoState.zoom}
                            onChange={(e) => onSetZoom(parseFloat(e.target.value))}
                            style={{
                                ...selectStyle,
                                paddingLeft: '22px',
                                height: '28px',
                                fontSize: '0.75rem'
                            }}
                            title={t('elementEditor.zoomLevelTitle')}
                        >
                            <option value="0.5">50%</option>
                            <option value="1">100%</option>
                            <option value="1.5">150%</option>
                            <option value="2">200%</option>
                            <option value="3">300%</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Timeline Slider */}
            <div style={{ position: 'relative', height: '6px', width: '100%', marginTop: '4px' }}>
                <input
                    type="range"
                    min="0"
                    max={videoState.duration || 0}
                    step="0.01"
                    value={videoState.currentTime}
                    onChange={(e) => {
                        const event = new CustomEvent('seek', { detail: parseFloat(e.target.value) });
                        window.dispatchEvent(event);
                    }}
                    style={{
                        width: '100%',
                        cursor: 'pointer',
                        opacity: 0,
                        position: 'absolute',
                        top: '-5px',
                        height: '16px',
                        zIndex: 2,
                        margin: 0
                    }}
                />

                {/* Custom Track */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${(videoState.currentTime / (videoState.duration || 1)) * 100}%`,
                        height: '100%',
                        backgroundColor: 'var(--accent-blue)',
                        transition: 'width 0.1s linear',
                        boxShadow: '0 0 10px var(--accent-blue-glow)'
                    }} />
                </div>

                {/* Thumb Indicator (Visual only, follows progress) */}
                <div style={{
                    position: 'absolute',
                    left: `${(videoState.currentTime / (videoState.duration || 1)) * 100}%`,
                    top: '-3px',
                    width: '12px',
                    height: '12px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 5px rgba(0,0,0,0.5)',
                    pointerEvents: 'none',
                    transition: 'left 0.1s linear',
                    zIndex: 1
                }} />
            </div>
        </div>
    );
}

export default PlaybackControls;
