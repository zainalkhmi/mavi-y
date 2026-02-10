import React, { useState, useEffect, useRef } from 'react';
import Peer from 'peerjs';
import ChatBox from './ChatBox';

function BroadcastViewer({ roomId, onClose }) {
    const [status, setStatus] = useState('Connecting...');
    const [error, setError] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [isMuted, setIsMuted] = useState(true);
    const [drawingMode, setDrawingMode] = useState(false);
    const [tool, setTool] = useState('pen'); // pen, eraser, rect, arrow
    const [color, setColor] = useState('#FF0000');
    const [isPlaying, setIsPlaying] = useState(false);
    const [stats, setStats] = useState({ fps: 0, bitrate: 0 });
    const [isRemoteMuted, setIsRemoteMuted] = useState(true);
    const [trackCount, setTrackCount] = useState(0);
    const [viewerName, setViewerName] = useState('');
    const [nameInput, setNameInput] = useState('');
    const [zoom, setZoom] = useState(1);

    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const connRef = useRef(null);
    const localAudioStreamRef = useRef(null);
    const canvasRef = useRef(null);
    const isDrawing = useRef(false);
    const lastPoint = useRef(null);
    const startPoint = useRef(null);

    useEffect(() => {
        const joinBroadcast = async () => {
            try {
                const peer = new Peer({ debug: 2 });
                peerRef.current = peer;

                peer.on('open', (id) => {
                    setStatus('Joining room...');
                    const conn = peer.connect(roomId, {
                        metadata: { userName: `User_${id.substring(0, 4)}` }
                    });
                    connRef.current = conn;

                    conn.on('open', () => setStatus('Connected to Host'));
                    conn.on('data', (data) => {
                        if (data.type === 'text' || data.type === 'file') {
                            const newMsg = { ...data };
                            if (data.type === 'file' && data.file) {
                                newMsg.url = URL.createObjectURL(new Blob([data.file]));
                            }
                            setChatMessages(prev => [...prev, newMsg]);
                        }
                    });

                    // Helper to create a robust offer stream (V+A) to ensure bidirectional media
                    const createOfferStream = async () => {
                        const tracks = [];

                        // 1. Try to get Audio
                        try {
                            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                            localAudioStreamRef.current = audioStream;
                            tracks.push(...audioStream.getAudioTracks());
                        } catch (err) {
                            console.warn('Mic access denied, using silent audio track', err);
                            // Optional: Create silent audio if needed, but video is more critical
                        }

                        // 2. Always create a dummy Video track for negotiation
                        const canvas = document.createElement('canvas');
                        canvas.width = 2;
                        canvas.height = 2;
                        const ctx = canvas.getContext('2d');
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, 2, 2);
                        const dummyVideoStream = canvas.captureStream(1);
                        tracks.push(...dummyVideoStream.getVideoTracks());

                        return new MediaStream(tracks);
                    };

                    createOfferStream().then(offerStream => {
                        console.log('[BroadcastViewer] Starting call with tracks:', offerStream.getTracks().map(t => t.kind));
                        const call = peer.call(roomId, offerStream);
                        setupCall(call);
                    });
                });

                peer.on('error', (err) => setError('Peer connection error: ' + err.type));
            } catch (err) {
                setError(err.message);
            }
        };

        let statsInterval;

        const setupCall = (call) => {
            call.on('stream', (remoteStream) => {
                console.log('[BroadcastViewer] Received remote stream:', remoteStream.id, 'Tracks:', remoteStream.getTracks().map(t => `${t.kind}:${t.readyState}`).join(', '));
                setTrackCount(remoteStream.getTracks().length);

                setStatus('Receiving stream...');
                if (videoRef.current) {
                    videoRef.current.srcObject = remoteStream;
                    videoRef.current.play()
                        .then(() => {
                            console.log('[BroadcastViewer] Autoplay success');
                            setIsPlaying(true);
                        })
                        .catch((err) => {
                            console.warn('[BroadcastViewer] Autoplay prevented, showing manual join button:', err);
                            setStatus('Broadcast ready. Click Join.');
                            setIsPlaying(false);
                        });
                }

                // Monitor Stats
                const pc = call.peerConnection;
                if (statsInterval) clearInterval(statsInterval);
                statsInterval = setInterval(async () => {
                    if (!pc || pc.connectionState === 'closed') return;
                    try {
                        const stats = await pc.getStats();
                        stats.forEach(report => {
                            if (report.type === 'inbound-rtp' && report.kind === 'video') {
                                setStats({
                                    fps: Math.round(report.framesPerSecond || 0),
                                    bitrate: Math.round((report.bytesReceived * 8) / 2000) || 0
                                });
                            }
                        });
                    } catch (err) {
                        console.warn('Stats error:', err);
                    }
                }, 2000);
            });
        };

        if (roomId) joinBroadcast();
        return () => {
            peerRef.current?.destroy();
            if (statsInterval) clearInterval(statsInterval);
        };
    }, [roomId]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, []);

    const sendDrawData = (action, x, y) => {
        if (connRef.current?.open) {
            connRef.current.send({
                type: 'draw',
                action, x, y, tool, color,
                timestamp: Date.now()
            });
        }
    };

    const handleMouseDown = (e) => {
        if (!drawingMode) return;
        isDrawing.current = true;
        const rect = videoRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        startPoint.current = { x, y };
        lastPoint.current = { x, y };
        sendDrawData('start', x, y);
    };

    const handleMouseMove = (e) => {
        if (!videoRef.current) return;
        const rect = videoRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Send mouse position for cursor sync
        if (connRef.current?.open) {
            connRef.current.send({ type: 'cursor', x, y });
        }

        if (drawingMode && isDrawing.current) {
            const ctx = canvasRef.current.getContext('2d');
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const curX = e.clientX - canvasRect.left;
            const curY = e.clientY - canvasRect.top;

            if (tool === 'pen' || tool === 'eraser') {
                ctx.beginPath();
                ctx.moveTo(lastPoint.current.x * canvasRect.width, lastPoint.current.y * canvasRect.height);
                ctx.lineTo(curX, curY);
                ctx.strokeStyle = tool === 'eraser' ? '#000' : color;
                ctx.lineWidth = tool === 'eraser' ? 20 : 3;
                ctx.stroke();
                sendDrawData('draw', x, y);
                lastPoint.current = { x, y };
            }
        }
    };

    const handleMouseUp = (e) => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        const rect = videoRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        sendDrawData('end', x, y);
    };

    const toggleMute = () => {
        if (localAudioStreamRef.current) {
            localAudioStreamRef.current.getAudioTracks().forEach(t => t.enabled = isMuted);
            setIsMuted(!isMuted);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, backgroundColor: '#000',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        playsInline
                        autoPlay
                        muted={isRemoteMuted}
                    />
                    <canvas
                        ref={canvasRef}
                        style={{ position: 'absolute', inset: 0, pointerEvents: drawingMode ? 'auto' : 'none' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                    />
                </div>

                {/* Status Overlays */}
                <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: '10px', zIndex: 1001 }}>
                    <div style={{ padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}>
                        {status}
                    </div>
                    {stats.fps > 0 && (
                        <div style={{ padding: '6px 12px', backgroundColor: 'rgba(16, 124, 16, 0.6)', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}>
                            🟢 {stats.fps} FPS | {stats.bitrate} KB/s
                        </div>
                    )}
                    <div style={{ padding: '6px 12px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '20px', color: 'white', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        Tracks: {trackCount > 0 ? (
                            videoRef.current?.srcObject?.getTracks().map(t => (
                                <span key={t.id} style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: t.kind === 'video' ? '#0078d4' : '#107c10',
                                    fontSize: '0.6rem',
                                    fontWeight: 'bold'
                                }}>
                                    {t.kind === 'video' ? 'V' : 'A'}
                                </span>
                            ))
                        ) : (
                            <span style={{ color: '#ff6b6b' }}>None</span>
                        )}
                    </div>
                    <div style={{ padding: '6px 12px', backgroundColor: 'rgba(0,120,212,0.6)', borderRadius: '20px', color: 'white', fontSize: '0.8rem' }}>
                        🔍 {Math.round(zoom * 100)}%
                    </div>
                </div>

                <div style={{ position: 'absolute', top: 20, right: 20, display: 'flex', gap: '10px', zIndex: 1002 }}>
                    <button
                        onClick={() => {
                            if (videoRef.current && videoRef.current.srcObject) {
                                videoRef.current.play()
                                    .then(() => setIsPlaying(true))
                                    .catch(e => setStatus('Manual play failed: ' + e.message));
                            }
                        }}
                        style={{ padding: '10px', backgroundColor: '#0078d4', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'white' }}
                        title="Force Video Play"
                    >
                        ▶
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ padding: '10px', backgroundColor: '#444', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'white' }}
                        title="Refresh Connection"
                    >
                        🔄
                    </button>
                    <button
                        onClick={() => setIsRemoteMuted(!isRemoteMuted)}
                        style={{ padding: '10px', backgroundColor: isRemoteMuted ? '#c50f1f' : '#107c10', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'white' }}
                        title={isRemoteMuted ? "Unmute Broadcast" : "Mute Broadcast"}
                    >
                        {isRemoteMuted ? '🔈' : '🔊'}
                    </button>
                    <button onClick={toggleMute} style={{ padding: '10px', backgroundColor: isMuted ? '#c50f1f' : '#107c10', border: 'none', borderRadius: '50%', cursor: 'pointer', color: 'white' }}>
                        {isMuted ? '🔇' : '🎤'}
                    </button>
                    <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#c50f1f', border: 'none', borderRadius: '4px', color: 'white', fontWeight: 'bold' }}>
                        Exit
                    </button>
                </div>

                {/* Toolbar */}
                <div style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '15px', padding: '10px', backgroundColor: 'rgba(30,30,30,0.9)', borderRadius: '12px', border: '1px solid #444', zIndex: 1003 }}>
                    <button onClick={() => setDrawingMode(!drawingMode)} style={{ padding: '8px 15px', backgroundColor: drawingMode ? '#0078d4' : '#444', border: 'none', borderRadius: '4px', color: 'white' }}>
                        ✏️ Annotate
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid #555', paddingLeft: '15px' }}>
                        <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} style={{ width: '30px', height: '30px', backgroundColor: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>-</button>
                        <span style={{ color: 'white', fontSize: '0.8rem', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(3, zoom + 0.1))} style={{ width: '30px', height: '30px', backgroundColor: '#444', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer' }}>+</button>
                        <button onClick={() => setZoom(1)} style={{ padding: '5px 10px', backgroundColor: '#444', border: 'none', borderRadius: '4px', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}>Reset</button>
                    </div>

                    {drawingMode && (
                        <>
                            <select value={tool} onChange={(e) => setTool(e.target.value)} style={{ backgroundColor: '#2d2d2d', color: 'white', border: '1px solid #444', borderRadius: '4px' }}>
                                <option value="pen">Pen</option>
                                <option value="eraser">Eraser</option>
                                <option value="rect">Rectangle</option>
                                <option value="arrow">Arrow</option>
                            </select>
                            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ width: '30px', height: '30px', padding: 0, border: 'none' }} />
                        </>
                    )}
                </div>

                {!isPlaying && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        zIndex: 1005
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'white', marginBottom: '20px', fontSize: '1.2rem' }}>Broadcast ready</p>
                            <button
                                onClick={() => {
                                    if (videoRef.current) {
                                        videoRef.current.play()
                                            .then(() => setIsPlaying(true))
                                            .catch(err => console.error("Manual play failed:", err));
                                    }
                                    setIsPlaying(true);
                                }}
                                style={{
                                    padding: '20px 40px',
                                    fontSize: '1.5rem',
                                    backgroundColor: '#0078d4',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 20px rgba(0,120,212,0.5)'
                                }}
                            >
                                ▶ Join Broadcast
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ChatBox
                messages={chatMessages}
                onSendMessage={(data) => {
                    const chatData = {
                        ...data,
                        timestamp: Date.now(),
                        sender: viewerName || `Viewer ${peerRef.current?.id?.substring(0, 4) || '...'}`
                    };
                    if (data.type === 'file' && data.file) {
                        chatData.url = URL.createObjectURL(new Blob([data.file]));
                    }
                    setChatMessages(prev => [...prev, chatData]);
                    connRef.current?.send(chatData);
                }}
                userName={viewerName || `Viewer ${peerRef.current?.id?.substring(0, 4) || '...'}`}
            />

            {/* Name Entry Overlay */}
            {!viewerName && (
                <div style={{
                    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)',
                    zIndex: 20000, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(5px)'
                }}>
                    <div style={{
                        backgroundColor: '#1e1e1e', padding: '30px', borderRadius: '12px',
                        width: '320px', border: '1px solid #444', textAlign: 'center'
                    }}>
                        <h3 style={{ color: 'white', marginBottom: '20px' }}>Join Broadcast</h3>
                        <p style={{ color: '#aaa', marginBottom: '20px', fontSize: '0.9rem' }}>Please enter your name to join the chat</p>
                        <input
                            type="text"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && nameInput.trim() && setViewerName(nameInput.trim())}
                            placeholder="Your Name"
                            autoFocus
                            style={{
                                width: '100%', padding: '12px', marginBottom: '20px',
                                backgroundColor: '#2d2d2d', border: '1px solid #444',
                                borderRadius: '6px', color: 'white', outline: 'none'
                            }}
                        />
                        <button
                            onClick={() => nameInput.trim() && setViewerName(nameInput.trim())}
                            disabled={!nameInput.trim()}
                            style={{
                                width: '100%', padding: '12px', backgroundColor: '#0078d4',
                                color: 'white', border: 'none', borderRadius: '6px',
                                fontWeight: 'bold', cursor: nameInput.trim() ? 'pointer' : 'not-allowed',
                                opacity: nameInput.trim() ? 1 : 0.6
                            }}
                        >
                            Continue
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BroadcastViewer;
