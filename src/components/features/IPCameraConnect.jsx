import React, { useState, useEffect } from 'react';
import StreamHandler from '../../utils/streamHandler';
import { useLanguage } from '../../contexts/LanguageContext';

function IPCameraConnect({ onStreamConnected, onStreamDisconnected, videoRef }) {
    const { t } = useLanguage();
    const [streamUrl, setStreamUrl] = useState('');
    const [streamType, setStreamType] = useState('http');
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    // eslint-disable-next-line
    const [streamHandler] = useState(() => new StreamHandler());

    // Preset IP camera URLs for quick testing
    const presets = [
        { name: 'Custom URL', url: '' },
        { name: 'Local Camera (HTTP)', url: 'http://192.168.1.100:8080/video' },
        { name: 'Test HLS Stream', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8' }
    ];

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (isConnected) {
                handleDisconnect();
            }
        };
        // eslint-disable-next-line
    }, []);

    const handleConnect = async () => {
        if (!streamUrl.trim()) {
            setError(t('ipCamera.errors.missingUrl'));
            return;
        }

        // Basic validation for webpage URLs
        const isWebpage = !streamUrl.includes('.m3u8') &&
            !streamUrl.includes('.mp4') &&
            !streamUrl.includes(':') && // Port usually indicates stream
            !streamUrl.endsWith('/video'); // Common endpoint

        if (streamType === 'http' && isWebpage && !streamUrl.includes('localhost') && !streamUrl.includes('192.168')) {
            // Show warning but allow proceeding if user insists
        }

        if (!videoRef?.current) {
            setError(t('ipCamera.errors.videoUnavailable'));
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            let success = false;

            if (streamType === 'hls' || streamUrl.includes('.m3u8')) {
                success = await streamHandler.connectHLSStream(streamUrl, videoRef.current);
            } else if (streamType === 'mjpeg') {
                success = await streamHandler.connectMJPEGStream(streamUrl, videoRef.current);
            } else {
                success = await streamHandler.connectHTTPStream(streamUrl, videoRef.current);
            }

            if (success) {
                setIsConnected(true);
                if (onStreamConnected) {
                    onStreamConnected(streamUrl, streamType);
                }
                // Auto-play the stream
                videoRef.current.play().catch(err => {
                    if (err.name !== 'AbortError') {
                        console.warn('Auto-play prevented:', err);
                    }
                });
            }
        } catch (err) {
            console.error('Connection error:', err);

            // Improve error message based on URL
            if (streamUrl.startsWith('http') && !streamUrl.includes('.m3u8') && !streamUrl.includes('.mp4')) {
                setError(t('ipCamera.errors.connectionFailed'));
            } else {
                setError(err.message || t('ipCamera.errors.generic'));
            }
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = () => {
        streamHandler.disconnect();
        setIsConnected(false);
        setError(null);

        if (videoRef?.current) {
            videoRef.current.src = '';
        }

        if (onStreamDisconnected) {
            onStreamDisconnected();
        }
    };

    const handlePresetChange = (e) => {
        const preset = presets.find(p => p.name === e.target.value);
        if (preset) {
            setStreamUrl(preset.url);
        }
    };

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
                <span style={{
                    fontSize: '1.2rem',
                    marginRight: '5px'
                }}>📹</span>
                <h3 style={{
                    margin: 0,
                    color: 'white',
                    fontSize: '1rem',
                    flex: 1
                }}>
                    {t('ipCamera.title')}
                </h3>
                {isConnected && (
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
                        {t('ipCamera.connected')}
                    </div>
                )}
            </div>

            {!isConnected ? (
                <>
                    {/* Preset Selector */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{
                            display: 'block',
                            color: '#aaa',
                            fontSize: '0.85rem',
                            marginBottom: '5px'
                        }}>
                            {t('ipCamera.preset')}:
                        </label>
                        <select
                            onChange={handlePresetChange}
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
                            {presets.map(preset => (
                                <option key={preset.name} value={preset.name}>
                                    {preset.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Stream Type */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{
                            display: 'block',
                            color: '#aaa',
                            fontSize: '0.85rem',
                            marginBottom: '5px'
                        }}>
                            {t('ipCamera.streamType')}:
                        </label>
                        <select
                            value={streamType}
                            onChange={(e) => setStreamType(e.target.value)}
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
                            <option value="http">HTTP/HTTPS</option>
                            <option value="hls">HLS (.m3u8)</option>
                            <option value="mjpeg">MJPEG (IP Camera)</option>
                        </select>
                    </div>

                    {/* Stream URL Input */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{
                            display: 'block',
                            color: '#aaa',
                            fontSize: '0.85rem',
                            marginBottom: '5px'
                        }}>
                            {t('ipCamera.streamUrl')}:
                        </label>
                        <input
                            type="text"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            placeholder="http://192.168.1.100:8080/video atau https://example.com/stream.m3u8"
                            style={{
                                width: '100%',
                                padding: '8px',
                                backgroundColor: '#333',
                                color: 'white',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                fontSize: '0.9rem',
                                boxSizing: 'border-box'
                            }}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleConnect();
                                }
                            }}
                        />
                    </div>

                    {/* Connect Button */}
                    <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: isConnecting ? '#555' : '#0078d4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '0.95rem',
                            fontWeight: 'bold',
                            cursor: isConnecting ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                            if (!isConnecting) e.target.style.backgroundColor = '#005a9e';
                        }}
                        onMouseLeave={(e) => {
                            if (!isConnecting) e.target.style.backgroundColor = '#0078d4';
                        }}
                    >
                        {isConnecting ? t('ipCamera.connecting') : `🔗 ${t('ipCamera.connect')}`}
                    </button>

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
                        💡 <strong>{t('ipCamera.tips.title')}:</strong>
                        <ul style={{ margin: '5px 0 0 15px', padding: 0 }}>
                            <li>{t('ipCamera.tips.tip1')}</li>
                            <li>{t('ipCamera.tips.tip2')}</li>
                            <li>{t('ipCamera.tips.tip3')}</li>
                        </ul>
                    </div>
                </>
            ) : (
                <>
                    {/* Connected Info */}
                    <div style={{
                        padding: '10px',
                        backgroundColor: 'rgba(0, 255, 0, 0.1)',
                        border: '1px solid #0f0',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ color: '#aaa', fontSize: '0.75rem', marginBottom: '5px' }}>
                            {t('ipCamera.streamUrl')}:
                        </div>
                        <div style={{
                            color: 'white',
                            fontSize: '0.85rem',
                            wordBreak: 'break-all'
                        }}>
                            {streamUrl}
                        </div>
                    </div>

                    {/* Disconnect Button */}
                    <button
                        onClick={handleDisconnect}
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
                        🔌 {t('ipCamera.disconnect')}
                    </button>
                </>
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

export default IPCameraConnect;
