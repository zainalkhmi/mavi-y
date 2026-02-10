import { useState, useRef, useEffect } from 'react';

export function useVideoPlayer(initialMeasurements = []) {
    const videoRef = useRef(null);
    const [videoState, setVideoState] = useState({
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        currentFrame: 0,
        totalFrames: 0,
        zoom: 1,
        isReverse: false,
        measurements: Array.isArray(initialMeasurements) ? initialMeasurements : []
    });

    // Sync measurements when initialMeasurements changes
    useEffect(() => {
        setVideoState(prev => ({
            ...prev,
            measurements: Array.isArray(initialMeasurements) ? initialMeasurements : []
        }));
    }, [initialMeasurements]);

    const fps = 30; // Default FPS, bisa diubah sesuai video

    // Update current time
    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const currentTime = videoRef.current.currentTime;
            const currentFrame = Math.floor(currentTime * fps);
            setVideoState(prev => ({
                ...prev,
                currentTime,
                currentFrame
            }));
        }
    };

    // Load metadata
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            const duration = videoRef.current.duration;
            const totalFrames = Math.floor(duration * fps);
            setVideoState(prev => ({
                ...prev,
                duration,
                totalFrames
            }));
        }
    };

    // Play/Pause
    const togglePlay = () => {
        if (videoRef.current) {
            if (videoState.isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setVideoState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
        }
    };

    // Set playback speed
    const setPlaybackSpeed = (rate) => {
        if (videoRef.current) {
            videoRef.current.playbackRate = rate;
            setVideoState(prev => ({ ...prev, playbackRate: rate }));
        }
    };

    // Frame navigation
    const nextFrame = () => {
        if (videoRef.current) {
            const newTime = videoRef.current.currentTime + (1 / fps);
            videoRef.current.currentTime = Math.min(newTime, videoState.duration);
        }
    };

    const previousFrame = () => {
        if (videoRef.current) {
            const newTime = videoRef.current.currentTime - (1 / fps);
            videoRef.current.currentTime = Math.max(newTime, 0);
        }
    };

    // Seek to specific time
    const seekTo = (time) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
    };

    // Zoom controls
    const setZoom = (zoomLevel) => {
        setVideoState(prev => ({ ...prev, zoom: zoomLevel }));
    };

    // Add measurement
    const addMeasurement = (measurement) => {
        const newMeasurement = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9), // Unique ID
            elementName: measurement.elementName || 'New Element',
            category: measurement.category || 'Non value-added',
            therblig: measurement.therblig || '',
            rating: measurement.rating || 0,
            cycle: measurement.cycle || 1,
            startTime: measurement.startTime,
            endTime: measurement.endTime,
            duration: measurement.duration
        };

        setVideoState(prev => ({
            ...prev,
            measurements: [...prev.measurements, newMeasurement]
        }));
    };

    // Remove measurement
    const removeMeasurement = (id) => {
        setVideoState(prev => ({
            ...prev,
            measurements: prev.measurements.filter(m => m.id !== id)
        }));
    };

    // Update measurements (for edit/reorder)
    const updateMeasurements = (newMeasurements) => {
        setVideoState(prev => ({
            ...prev,
            measurements: newMeasurements
        }));
    };

    // Toggle reverse playback
    const toggleReverse = () => {
        setVideoState(prev => ({ ...prev, isReverse: !prev.isReverse }));
    };



    return {
        videoRef,
        videoState,
        togglePlay,
        setPlaybackSpeed,
        nextFrame,
        previousFrame,
        seekTo,
        setZoom,
        addMeasurement,
        removeMeasurement,
        updateMeasurements,
        toggleReverse,
        handleTimeUpdate,
        handleLoadedMetadata
    };
}
