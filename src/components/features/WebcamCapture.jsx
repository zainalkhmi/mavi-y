import React, { useState, useEffect } from 'react';
import WebcamHandler from '../../utils/webcamHandler';

function WebcamCapture({ onWebcamStarted, onWebcamStopped, videoRef, onStartRecording }) {
    const [webcamHandler] = useState(() => new WebcamHandler());
    const [isActive, setIsActive] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [error, setError] = useState(null);
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [selectedResolution, setSelectedResolution] = useState('1920x1080');
    const [permissionGranted, setPermissionGranted] = useState(false);

    const resolutions = WebcamHandler.getSupportedResolutions();

    useEffect(() => {
        // Check if getUserMedia is supported
        if (!WebcamHandler.isSupported()) {
            setError('Webcam tidak didukung di browser ini');
        }

        return () => {
            // Cleanup on unmount
            if (isActive) {
                handleStop();
            }
        };
    }, []);

    const loadDevices = async () => {
        try {
            const videoDevices = await webcamHandler.getVideoDevices();
            setDevices(videoDevices);
            setPermissionGranted(true);

            if (videoDevices.length > 0 && !selectedDevice) {
                setSelectedDevice(videoDevices[0].deviceId);
            }
        } catch (err) {
            setError(err.message || 'Gagal mengakses daftar kamera');
            console.error('Error loading devices:', err);
        }
    };

    const handleStart = async () => {
        console.log('WebcamCapture - handleStart called');

        if (!videoRef) {
            setError('Video reference tidak tersedia');
            return;
        }

        // Wait for video element to be ready
        let retries = 0;
        const maxRetries = 10;
        while (!videoRef.current && retries < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }

        if (!videoRef.current) {
            setError('Video element belum siap.');
            return;
        }

        setIsStarting(true);
        setError(null);

        try {
            // Parse resolution
            const [width, height] = selectedResolution.split('x').map(Number);

            // Start webcam
            const stream = await webcamHandler.startWebcam(
                selectedDevice || null,
                { width: { ideal: width }, height: { ideal: height } }
            );

            // Attach stream to video element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error('Play failed:', e));
            }

            setIsActive(true);

            if (onWebcamStarted) {
                onWebcamStarted(stream);
            }

            // Load devices after permission granted
            if (!permissionGranted) {
                await loadDevices();
            }
        } catch (err) {
            console.error('Webcam start error:', err);
            setError(err.message || 'Gagal memulai webcam');
        } finally {
            setIsStarting(false);
        }
    };

    const handleStartScreenShare = async () => {
        if (!videoRef?.current) {
            setError('Video element tidak tersedia');
            return;
        }

        setIsStarting(true);
        setError(null);

        try {
            const stream = await webcamHandler.startScreenCapture();

            // Attach stream to video element
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(e => console.error('Play failed:', e));
            }

            setIsActive(true);

            // Listen for stream end (user clicks "Stop Sharing" in browser UI)
            stream.getVideoTracks()[0].onended = () => {
                handleStop();
            };

            if (onWebcamStarted) {
                onWebcamStarted(stream);
            }
        } catch (err) {
            console.error('Screen share error:', err);
            if (err.name !== 'NotAllowedError') { // Ignore if user cancelled
                setError(err.message || 'Gagal memulai screen share');
            }
        } finally {
            setIsStarting(false);
        }
    };

    const handleStop = () => {
        webcamHandler.stopWebcam();

        if (videoRef?.current) {
            videoRef.current.srcObject = null;
        }

        setIsActive(false);

        if (onWebcamStopped) {
            onWebcamStopped();
        }
    };

    const handleDeviceChange = async (deviceId) => {
        setSelectedDevice(deviceId);

        if (isActive) {
            // Switch camera if already active
            try {
                const stream = await webcamHandler.switchCamera(deviceId);
                videoRef.current.srcObject = stream;
            } catch (err) {
                setError(err.message || 'Gagal mengganti kamera');
            }
        }
    };

    const handleResolutionChange = async (resolution) => {
        setSelectedResolution(resolution);

        if (isActive) {
            // Restart with new resolution
            const [width, height] = resolution.split('x').map(Number);
            try {
                const stream = await webcamHandler.setResolution(width, height);
                videoRef.current.srcObject = stream;
            } catch (err) {
                setError(err.message || 'Gagal mengubah resolusi');
            }
        }
    };

    const handleRequestPermission = async () => {
        await loadDevices();
    };

    if (!WebcamHandler.isSupported()) {
        return (
            <div style={{
                backgroundColor: 'rgba(197, 15, 31, 0.2)',
                padding: '15px',
                borderRadius: '8px',
                border: '1px solid #c50f1f',
                color: '#ff6b6b'
            }}>
                ⚠️ Webcam tidak didukung di browser ini
            </div>
        );
    }

    return (
        <div style={{
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #444',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            marginBottom: '10px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '10px'
            }}>
                <span style={{ fontSize: '1.2rem' }}>📷</span>
                <h3 style={{
                    margin: 0,
                    color: 'white',
                    fontSize: '1rem',
                    flex: 1
                }}>
                    Webcam / USB Camera
                </h3>
                {isActive && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        color: '#0f0',
                        fontSize: '0.85rem'
                    }}>
                        <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#0f0',
                            animation: 'pulse 2s infinite'
                        }} />
                        Active
                    </div>
                )}
            </div>

            {!isActive ? (
                <>
                    {!permissionGranted ? (
                        <>
                            <div style={{
                                padding: '15px',
                                backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                border: '1px solid #0078d4',
                                borderRadius: '4px',
                                marginBottom: '10px',
                                color: '#4cc9f0',
                                fontSize: '0.85rem'
                            }}>
                                ℹ️ Aplikasi memerlukan izin untuk mengakses kamera Anda
                            </div>

                            <button
                                onClick={handleRequestPermission}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#005a9e'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = '#0078d4'}
                            >
                                🔓 Request Camera Permission
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Camera Selection */}
                            {devices.length > 0 && (
                                <div style={{ marginBottom: '10px' }}>
                                    <label style={{
                                        display: 'block',
                                        color: '#aaa',
                                        fontSize: '0.85rem',
                                        marginBottom: '5px'
                                    }}>
                                        Camera:
                                    </label>
                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <select
                                            value={selectedDevice}
                                            onChange={(e) => handleDeviceChange(e.target.value)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                backgroundColor: '#333',
                                                color: 'white',
                                                border: '1px solid #555',
                                                borderRadius: '4px',
                                                fontSize: '0.9rem'
                                            }}
                                        >
                                            {devices.map(device => (
                                                <option key={device.deviceId} value={device.deviceId}>
                                                    {device.label}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={loadDevices}
                                            title="Refresh Camera List"
                                            style={{
                                                padding: '8px',
                                                backgroundColor: '#444',
                                                color: 'white',
                                                border: '1px solid #555',
                                                borderRadius: '4px',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🔄
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Resolution Selection */}
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{
                                    display: 'block',
                                    color: '#aaa',
                                    fontSize: '0.85rem',
                                    marginBottom: '5px'
                                }}>
                                    Resolution:
                                </label>
                                <select
                                    value={selectedResolution}
                                    onChange={(e) => handleResolutionChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#333',
                                        color: 'white',
                                        border: '1px solid #555',
                                        borderRadius: '4px',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    {resolutions.map(res => (
                                        <option key={res.label} value={`${res.width}x${res.height}`}>
                                            {res.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start Button */}
                            <button
                                onClick={handleStart}
                                disabled={isStarting}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: isStarting ? '#555' : '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    cursor: isStarting ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s',
                                    marginBottom: '10px'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isStarting) e.target.style.backgroundColor = '#005a9e';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isStarting) e.target.style.backgroundColor = '#0078d4';
                                }}
                            >
                                {isStarting ? '🔄 Starting...' : '📷 Start Webcam'}
                            </button>

                            {/* Share Screen Button */}
                            <button
                                onClick={handleStartScreenShare}
                                disabled={isStarting}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    backgroundColor: isStarting ? '#555' : '#5c2d91',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.95rem',
                                    fontWeight: 'bold',
                                    cursor: isStarting ? 'not-allowed' : 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isStarting) e.target.style.backgroundColor = '#4c2579';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isStarting) e.target.style.backgroundColor = '#5c2d91';
                                }}
                            >
                                🖥️ Share Screen / Webpage
                            </button>

                            {/* Info */}
                            <div style={{
                                marginTop: '10px',
                                padding: '8px',
                                backgroundColor: 'rgba(0, 120, 212, 0.1)',
                                border: '1px solid #0078d4',
                                borderRadius: '4px',
                                color: '#4cc9f0',
                                fontSize: '0.75rem'
                            }}>
                                💡 <strong>Tips:</strong> Pastikan kamera tidak digunakan oleh aplikasi lain
                            </div>
                        </>
                    )}
                </>
            ) : (
                <>
                    {/* Active Info */}
                    <div style={{
                        padding: '10px',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        border: '1px solid #0f0',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '5px' }}>
                            Active Camera:
                        </div>
                        <div style={{ color: 'white', fontSize: '0.85rem' }}>
                            {devices.find(d => d.deviceId === selectedDevice)?.label || 'Default Camera'}
                        </div>
                        <div style={{ color: '#aaa', fontSize: '0.75rem', marginTop: '5px' }}>
                            Resolution: {selectedResolution}
                        </div>
                    </div>

                    {/* Camera Switch (if multiple cameras) */}
                    {devices.length > 1 && (
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{
                                display: 'block',
                                color: '#aaa',
                                fontSize: '0.85rem',
                                marginBottom: '5px'
                            }}>
                                Switch Camera:
                            </label>
                            <select
                                value={selectedDevice}
                                onChange={(e) => handleDeviceChange(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem'
                                }}
                            >
                                {devices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Stop Button */}
                    <button
                        onClick={handleStop}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: '#c50f1f',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.95rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#a00f1a'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#c50f1f'}
                    >
                        ⏹️ Stop Webcam
                    </button>

                    {/* Start Recording Button */}
                    <button
                        onClick={onStartRecording}
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '10px',
                            backgroundColor: '#2d7d46',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.95rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#1e5c32'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2d7d46'}
                    >
                        ⏺️ Start Recording
                    </button>
                </>
            )}

            {/* Error Message */}
            {error && (
                <div style={{
                    marginTop: '10px',
                    padding: '8px',
                    backgroundColor: 'rgba(197, 15, 31, 0.2)',
                    border: '1px solid #c50f1f',
                    borderRadius: '4px',
                    color: '#ff6b6b',
                    fontSize: '0.85rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.5; }
                    }
                `}
            </style>
        </div>
    );
}

export default WebcamCapture;
