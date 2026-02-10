import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import Peer from 'peerjs';
import ChatBox from './ChatBox';
import { useDialog } from '../../contexts/DialogContext';

const BroadcastManager = forwardRef(({
    onRemoteInteraction,
    isBroadcasting,
    setIsBroadcasting,
    isMuted,
    setIsMuted,
    chatMessages,
    setChatMessages,
    isRecording,
    setIsRecording,
    isWebcamOn,
    setIsWebcamOn,
    connectedPeers,
    setConnectedPeers
}, ref) => {
    const { showAlert } = useDialog();
    const [peerId, setPeerId] = useState('');
    const [error, setError] = useState(null);

    const peerRef = useRef(null);
    const viewerAudioRefs = useRef({});
    const recorderRef = useRef(null);
    const recordedChunks = useRef([]);
    const canvasMixerRef = useRef(null);
    const webcamStreamRef = useRef(null);
    const screenVideoRef = useRef(null);
    const previewCanvasRef = useRef(null);
    const rafIdRef = useRef(null);

    useImperativeHandle(ref, () => ({
        startBroadcast,
        toggleMute,
        sendChatMessage,
        stopBroadcast,
        toggleWebcam,
        startRecording,
        stopRecording,
        takeScreenshot,
        isRecording,
        isWebcamOn
    }));

    useEffect(() => {
        return () => {
            stopBroadcast();
        };
    }, []);

    const getVideoElement = () => {
        console.log('[BroadcastManager] Checking for video element...');

        // First try to get from global reference (set by VideoWorkspace)
        if (window.__motionVideoElement) {
            console.log('[BroadcastManager] Found video from global reference');
            return window.__motionVideoElement;
        }

        // Fallback: Find the video element in the DOM
        const videos = document.querySelectorAll('video');
        console.log('[BroadcastManager] Found', videos.length, 'video elements in DOM');

        if (videos.length > 0) {
            console.log('[BroadcastManager] Using first video element from DOM');
            return videos[0];
        }

        console.log('[BroadcastManager] No video element found');
        return null;
    };

    const startBroadcast = async () => {
        setError(null);

        try {
            // 1. Get Screen Share Stream
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: "always",
                    frameRate: 30
                },
                audio: false
            });

            // 2. Get Microphone Audio Stream
            let audioStream;
            try {
                audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                console.log('[BroadcastManager] Microphone audio captured');
            } catch (audioErr) {
                console.warn('[BroadcastManager] Microphone access denied or unavailable:', audioErr);
            }

            // 3. Setup Canvas Mixer for Screen + Webcam Overlay
            const canvas = document.createElement('canvas');
            canvas.width = 1280;
            canvas.height = 720;
            canvas.style.position = 'fixed';
            canvas.style.top = '-9999px';
            canvas.style.left = '-9999px';
            document.body.appendChild(canvas);
            canvasMixerRef.current = canvas;
            const ctx = canvas.getContext('2d', { alpha: false });

            // Initial draw to wake up stream
            ctx.fillStyle = '#111';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const screenVideo = document.createElement('video');
            screenVideo.srcObject = screenStream;
            screenVideo.muted = true;
            screenVideo.playsInline = true;
            screenVideo.setAttribute('autoplay', '');
            screenVideo.style.position = 'fixed';
            screenVideo.style.top = '0';
            screenVideo.style.left = '0';
            screenVideo.style.width = '320px';
            screenVideo.style.height = '180px';
            screenVideo.style.opacity = '0.001';
            screenVideo.style.pointerEvents = 'none';
            screenVideo.style.zIndex = '-9999';
            document.body.appendChild(screenVideo);
            screenVideoRef.current = screenVideo;

            try {
                await screenVideo.play();
                console.log('[BroadcastManager] Screen video active');
            } catch (playErr) {
                console.warn('[BroadcastManager] screenVideo.play() failed:', playErr);
            }

            const mixedStream = canvas.captureStream(30);
            const localStream = new MediaStream();

            // Add video track
            const vTracks = mixedStream.getVideoTracks();
            if (vTracks.length > 0) {
                localStream.addTrack(vTracks[0]);
                console.log('[BroadcastManager] Video track added to localStream');
            } else {
                console.error('[BroadcastManager] FAILED to capture video track from canvas');
            }

            // Add audio tracks
            if (audioStream) {
                audioStream.getAudioTracks().forEach(t => {
                    localStream.addTrack(t);
                    console.log('[BroadcastManager] Audio track added to localStream');
                });
            }

            // Ensure screenVideo is slightly visible/active to prevent browser throttling
            screenVideo.style.opacity = '0.01';
            screenVideo.style.width = '16px';
            screenVideo.style.height = '16px';
            screenVideo.style.zIndex = '-1'; // Behind everything but still "in the layout"

            const renderMixer = () => {
                if (!screenStream || !screenStream.active) return;

                // Draw Screen
                if (screenVideo.readyState >= 2) {
                    ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
                } else {
                    ctx.fillStyle = '#1e1e1e';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#fff';
                    ctx.font = '24px Segoe UI, Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Preparing broadcast...', canvas.width / 2, canvas.height / 2);
                }

                // Draw Visual Heartbeat / LIVE Indicator with Timestamp
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(20, 20, 180, 40);

                // Pulsing dot
                const alpha = 0.5 + Math.sin(Date.now() / 200) * 0.5;
                ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
                ctx.beginPath();
                ctx.arc(40, 40, 8, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = 'white';
                ctx.font = 'bold 18px Arial';
                ctx.fillText('LIVE', 60, 46);

                // Running timer to prove the stream is not a still image
                const timeStr = new Date().toLocaleTimeString();
                ctx.font = '14px monospace';
                ctx.fillText(timeStr, 110, 45);
                ctx.restore();

                // Draw Webcam overlay
                if (webcamStreamRef.current && webcamStreamRef.current.active) {
                    const webcamVideo = webcamStreamRef.current._videoElement;
                    if (webcamVideo && webcamVideo.readyState >= 2) {
                        const w = 320;
                        const h = 240;
                        const x = canvas.width - w - 40;
                        const y = canvas.height - h - 40;

                        ctx.save();
                        ctx.shadowColor = 'rgba(0,0,0,0.5)';
                        ctx.shadowBlur = 15;
                        ctx.strokeStyle = '#333';
                        ctx.lineWidth = 4;
                        ctx.strokeRect(x, y, w, h);
                        ctx.drawImage(webcamVideo, x, y, w, h);
                        ctx.restore();
                    }
                }
            };

            // Use setInterval in addition to RAF to ensure frames are generated even if tab is in background
            const mixerInterval = setInterval(renderMixer, 1000 / 30);
            const rafLoop = () => {
                renderMixer();
                if (screenStream.active) requestAnimationFrame(rafLoop);
            };
            requestAnimationFrame(rafLoop);

            // Handle stream stop
            screenStream.getVideoTracks()[0].onended = () => {
                clearInterval(mixerInterval);
                stopBroadcast();
            };

            // 5. Initialize PeerJS
            const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const peer = new Peer(randomId, { debug: 2 });

            peer.on('open', (id) => {
                setPeerId(id);
                setIsBroadcasting(true);
            });

            peer.on('connection', (conn) => {
                setConnectedPeers(prev => [...prev, conn.peer]);
                conn.on('data', (data) => {
                    const { type, sender, timestamp } = data;
                    if (type === 'text' || type === 'file') {
                        const msg = {
                            ...data,
                            sender: sender || `Viewer ${conn.peer.substring(0, 4)}`,
                            timestamp: timestamp || Date.now()
                        };
                        if (type === 'file' && data.file) {
                            msg.url = URL.createObjectURL(new Blob([data.file]));
                        }
                        setChatMessages(prev => [...prev, msg]);

                        // Relay to all other viewers
                        Object.values(peerRef.current.connections).forEach(conns => {
                            conns.forEach(c => {
                                if (c.open && c.peer !== conn.peer) {
                                    c.send(msg);
                                }
                            });
                        });
                    } else if (type === 'request_speak') {
                        // Request speak logic
                    } else {
                        onRemoteInteraction(data, conn.peer);
                    }
                });
                conn.on('close', () => {
                    setConnectedPeers(prev => prev.filter(p => p !== conn.peer));
                });
            });

            peer.on('call', (call) => {
                // Ensure all tracks in localStream are enabled before answering
                localStream.getTracks().forEach(track => {
                    track.enabled = true;
                });

                console.log('[BroadcastManager] Answering call from:', call.peer, 'Tracks being sent:', localStream.getTracks().map(t => `${t.kind}(${t.enabled})`).join(', '));

                call.answer(localStream);

                call.on('stream', (remoteStream) => {
                    console.log('[BroadcastManager] Received remote stream from viewer:', call.peer, 'Tracks:', remoteStream.getTracks().length);
                    playViewerAudio(remoteStream, call.peer);
                });
            });

            peerRef.current = peer;
            window.localStream = localStream;
            window.screenStream = screenStream;
            window.audioStream = audioStream;

        } catch (err) {
            console.error('[BroadcastManager] Failed to start broadcast:', err);
            setError(err.message);
        }
    };

    // Stable Preview Render Loop
    useEffect(() => {
        if (!isBroadcasting || !previewCanvasRef.current) {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
            return;
        }

        const previewCanvas = previewCanvasRef.current;
        const pCtx = previewCanvas.getContext('2d');

        const renderPreview = () => {
            if (!isBroadcasting || !canvasMixerRef.current || !previewCanvas) {
                rafIdRef.current = null;
                return;
            }

            try {
                pCtx.drawImage(canvasMixerRef.current, 0, 0, previewCanvas.width, previewCanvas.height);
            } catch (e) {
                console.warn('[BroadcastManager] Preview frame failed:', e);
            }

            rafIdRef.current = requestAnimationFrame(renderPreview);
        };

        rafIdRef.current = requestAnimationFrame(renderPreview);

        return () => {
            if (rafIdRef.current) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };
    }, [isBroadcasting]);

    const toggleWebcam = async () => {
        if (!isWebcamOn) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                const video = document.createElement('video');
                video.srcObject = stream;
                video.play();
                stream._videoElement = video; // Store for mixer
                webcamStreamRef.current = stream;
                setIsWebcamOn(true);
            } catch (err) {
                await showAlert('Error', 'Webcam access denied: ' + err.message);
            }
        } else {
            if (webcamStreamRef.current) {
                webcamStreamRef.current.getTracks().forEach(t => t.stop());
                webcamStreamRef.current = null;
            }
            setIsWebcamOn(false);
        }
    };

    const startRecording = () => {
        if (!window.localStream) return;
        recordedChunks.current = [];
        const recorder = new MediaRecorder(window.localStream, { mimeType: 'video/webm' });

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.current.push(e.data);
        };

        recorder.onstop = () => {
            const blob = new Blob(recordedChunks.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `broadcast-recording-${Date.now()}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }, 100);
        };

        recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const takeScreenshot = () => {
        if (!canvasMixerRef.current) return;
        const url = canvasMixerRef.current.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = `broadcast-screenshot-${Date.now()}.png`;
        a.click();
    };

    const playViewerAudio = (audioStream, peerId) => {
        if (!viewerAudioRefs.current[peerId]) {
            const audio = new Audio();
            audio.srcObject = audioStream;
            audio.autoplay = true;
            viewerAudioRefs.current[peerId] = audio;
        }
    };

    const toggleMute = () => {
        if (window.audioStream) {
            const audioTracks = window.audioStream.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };



    const stopBroadcast = () => {
        if (isRecording) stopRecording();
        if (isWebcamOn) toggleWebcam();

        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        if (window.screenStream) window.screenStream.getTracks().forEach(t => t.stop());
        if (window.audioStream) window.audioStream.getTracks().forEach(t => t.stop());
        if (screenVideoRef.current) {
            screenVideoRef.current.pause();
            screenVideoRef.current.srcObject = null;
            if (screenVideoRef.current.parentNode) {
                document.body.removeChild(screenVideoRef.current);
            }
            screenVideoRef.current = null;
        }
        if (canvasMixerRef.current && canvasMixerRef.current.parentNode) {
            document.body.removeChild(canvasMixerRef.current);
            canvasMixerRef.current = null;
        }

        setPeerId('');
        setIsBroadcasting(false);
        setConnectedPeers([]);
    };

    const copyLink = async () => {
        const url = `${window.location.origin}/?watch=${peerId}`;
        navigator.clipboard.writeText(url);
        await showAlert('Success', 'Link copied to clipboard!');
    };

    const sendChatMessage = (data) => {
        if (!peerRef.current) return;
        const chatData = {
            ...data,
            timestamp: Date.now(),
            sender: 'Host'
        };

        if (data.type === 'file') {
            chatData.url = URL.createObjectURL(data.file);
        }

        setChatMessages(prev => [...prev, chatData]);

        Object.values(peerRef.current.connections).forEach(conns => {
            conns.forEach(conn => {
                if (conn.open) conn.send(chatData);
            });
        });
    };

    const uiContent = (
        <div style={{
            backgroundColor: '#2d2d2d',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #444',
            color: 'white',
            marginTop: '10px'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1rem' }}>📡 Live Broadcast</h3>

            {!isBroadcasting ? (
                <button
                    onClick={startBroadcast}
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#0078d4',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    Start Broadcast
                </button>
            ) : (
                <div>
                    <div style={{
                        padding: '10px',
                        backgroundColor: '#1e1e1e',
                        borderRadius: '4px',
                        marginBottom: '10px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '0.8rem', color: '#aaa' }}>ROOM ID</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '2px', color: '#00ff00' }}>
                            {peerId}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <button
                            onClick={copyLink}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            📋 Copy Link
                        </button>
                        <button
                            onClick={toggleMute}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: isMuted ? '#c50f1f' : '#107c10',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            {isMuted ? '🔇 Unmute' : '🎤 Mute'}
                        </button>
                        <button
                            onClick={stopBroadcast}
                            style={{
                                flex: 1,
                                padding: '8px',
                                backgroundColor: '#c50f1f',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            ⏹ Stop
                        </button>
                    </div>

                    <div style={{ fontSize: '0.8rem', color: '#aaa', display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px', padding: '10px', backgroundColor: '#1e1e1e', borderRadius: '4px' }}>
                        <div style={{ color: '#00ff00' }}>● LIVE</div>
                        <span>👥 Viewers: {connectedPeers.length}</span>
                        <span>📤 Sending: {window.localStream?.getTracks().map(t => (
                            <span key={t.id} style={{
                                marginLeft: '4px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: t.kind === 'video' ? '#0078d4' : '#107c10',
                                color: 'white',
                                fontSize: '0.7rem'
                            }}>
                                {t.kind.toUpperCase()} {t.enabled ? '✓' : '✗'}
                            </span>
                        ))}</span>
                    </div>
                    {/* Host Preview */}
                    <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '4px' }}>MIXER PREVIEW</div>
                        <canvas
                            ref={previewCanvasRef}
                            width={160}
                            height={90}
                            style={{
                                backgroundColor: '#000',
                                border: '1px solid #444',
                                borderRadius: '4px'
                            }}
                        />
                    </div>
                </div>
            )}

            {error && (
                <div style={{
                    marginTop: '10px',
                    color: '#ff6b6b',
                    fontSize: '0.8rem'
                }}>
                    ⚠️ {error}
                </div>
            )}

            {/* Chat Box removed - using global BroadcastControls */}
        </div>
    );

    const portalTarget = document.getElementById('broadcast-manager-ui-portal');
    if (portalTarget) {
        return ReactDOM.createPortal(uiContent, portalTarget);
    }

    return null;
});

export default BroadcastManager;
