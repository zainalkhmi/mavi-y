import React, { useState, useRef, useEffect } from 'react';
import ChatBox from './ChatBox';

function BroadcastControls({
    isBroadcasting,
    isMuted,
    onToggleMute,
    chatMessages,
    onSendMessage,
    userName = 'Host',
    onStopBroadcast,
    isRecording,
    onToggleRecording,
    isWebcamOn,
    onToggleWebcam,
    onTakeScreenshot,
    connectedPeers = []
}) {
    const [isVisible, setIsVisible] = useState(true);
    const [showViewerList, setShowViewerList] = useState(false);
    const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
    const [lastMessageCount, setLastMessageCount] = useState(0);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (chatMessages.length > lastMessageCount && !isVisible) {
            setHasUnreadMessages(true);
        }
        setLastMessageCount(chatMessages.length);
    }, [chatMessages.length, lastMessageCount, isVisible]);

    useEffect(() => {
        if (isVisible) setHasUnreadMessages(false);
    }, [isVisible]);

    useEffect(() => {
        if (isRecording) {
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
        } else {
            clearInterval(timerRef.current);
            setRecordingTime(0);
        }
        return () => clearInterval(timerRef.current);
    }, [isRecording]);

    if (!isBroadcasting) return null;

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return [h, m, s].map(v => v < 10 ? '0' + v : v).filter((v, i) => v !== '00' || i > 0).join(':');
    };

    return (
        <>
            {/* Floating Controls Bar */}
            <div style={{
                position: 'fixed', top: '50%', left: '20px', transform: 'translateY(-50%)',
                backgroundColor: 'rgba(30, 30, 30, 0.95)', border: '1px solid #444', borderRadius: '12px',
                padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px',
                alignItems: 'center', zIndex: 1001, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(10px)'
            }}>
                {/* Recording Status Marker */}
                {isRecording && (
                    <div style={{
                        position: 'absolute', top: '-45px', right: 0,
                        backgroundColor: '#c50f1f', color: 'white', padding: '4px 10px',
                        borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap'
                    }}>
                        <div className="record-blink" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'white' }}></div>
                        REC {formatTime(recordingTime)}
                    </div>
                )}

                <ControlButton onClick={onToggleMute} active={!isMuted} activeColor="#107c10" inactiveColor="#c50f1f" title={isMuted ? 'Unmute' : 'Mute'}>
                    {isMuted ? '🔇' : '🎤'}
                </ControlButton>

                <ControlButton onClick={onToggleWebcam} active={isWebcamOn} activeColor="#0078d4" title="Toggle Webcam">
                    📷
                </ControlButton>

                <ControlButton onClick={onToggleRecording} active={isRecording} activeColor="#c50f1f" title={isRecording ? 'Stop Recording' : 'Start Recording'}>
                    ⏺️
                </ControlButton>

                <ControlButton onClick={onTakeScreenshot} title="Take Screenshot">
                    📸
                </ControlButton>

                <ControlButton onClick={() => setShowViewerList(!showViewerList)} active={showViewerList} activeColor="#8a2be2" title="Viewer List">
                    👥
                    {connectedPeers.length > 0 && <Badge count={connectedPeers.length} />}
                </ControlButton>

                <ControlButton onClick={() => setIsVisible(!isVisible)} active={isVisible} activeColor="#0078d4" title="Chat">
                    💬
                    {hasUnreadMessages && <Badge count="!" pulse />}
                </ControlButton>

                <div style={{ width: '100%', height: '1px', backgroundColor: '#444' }} />

                <ControlButton onClick={onStopBroadcast} activeColor="#c50f1f" title="Stop Broadcast">
                    ⏹
                </ControlButton>
            </div>

            {/* Viewer List Panel */}
            {showViewerList && (
                <div style={{
                    position: 'fixed', top: '50%', left: '90px', transform: 'translateY(-50%)',
                    width: '200px', backgroundColor: '#1e1e1e', border: '1px solid #444',
                    borderRadius: '8px', padding: '15px', zIndex: 1000, color: 'white'
                }}>
                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '8px' }}>Viewers ({connectedPeers.length})</h4>
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        {connectedPeers.length === 0 ? (
                            <div style={{ color: '#666', fontSize: '0.85rem' }}>No viewers yet</div>
                        ) : (
                            connectedPeers.map(peerId => (
                                <div key={peerId} style={{ padding: '5px 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#107c10' }}></div>
                                    {peerId.substring(0, 8)}...
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Chat Box */}
            {isVisible && (
                <div style={{ position: 'fixed', top: '100px', left: '90px', zIndex: 1000 }}>
                    <ChatBox messages={chatMessages} onSendMessage={onSendMessage} userName={userName} style={{ bottom: 'auto', right: 'auto' }} />
                </div>
            )}

            <style>{`
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .record-blink { animation: blink 1s infinite; }
            `}</style>
        </>
    );
}

const ControlButton = ({ children, onClick, active, activeColor, inactiveColor, title }) => (
    <button
        onClick={onClick}
        title={title}
        style={{
            width: '45px', height: '45px', borderRadius: '10px', border: 'none',
            backgroundColor: active ? (activeColor || '#333') : (inactiveColor || '#333'),
            color: 'white', cursor: 'pointer', fontSize: '1.2rem', display: 'flex',
            alignItems: 'center', justifyContent: 'center', position: 'relative',
            transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}
    >
        {children}
    </button>
);

const Badge = ({ count, pulse }) => (
    <span style={{
        position: 'absolute', top: '-5px', right: '-5px',
        backgroundColor: '#c50f1f', color: 'white', borderRadius: '50%',
        minWidth: '18px', height: '18px', fontSize: '0.7rem',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px', border: '2px solid #1e1e1e',
        animation: pulse ? 'pulse 1s infinite' : 'none'
    }}>
        {count}
    </span>
);

export default BroadcastControls;
