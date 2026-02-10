import React, { useState, useRef, useEffect } from 'react';

function ChatBox({ messages, onSendMessage, userName = 'You', style = {} }) {
    const [inputMessage, setInputMessage] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (!isCollapsed) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isCollapsed]);

    const handleSend = () => {
        if (inputMessage.trim()) {
            onSendMessage({ type: 'text', message: inputMessage.trim() });
            setInputMessage('');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSendMessage({ type: 'file', file, name: file.name, size: file.size });
        }
    };

    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', width: '320px',
            backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex',
            flexDirection: 'column', maxHeight: isCollapsed ? '50px' : '400px',
            transition: 'max-height 0.3s ease', ...style
        }}>
            <div onClick={() => setIsCollapsed(!isCollapsed)} style={{
                padding: '12px', backgroundColor: '#2d2d2d', borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px', cursor: 'pointer', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', borderBottom: isCollapsed ? 'none' : '1px solid #444'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>💬</span>
                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>Chat</span>
                </div>
            </div>

            {!isCollapsed && (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '200px', maxHeight: '280px' }}>
                        {messages.length === 0 ? (
                            <div style={{ color: '#666', textAlign: 'center', padding: '20px', fontSize: '0.85rem' }}>No messages yet</div>
                        ) : (
                            messages.map((msg, index) => (
                                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                                        <span style={{ color: msg.sender === userName ? '#0078d4' : '#4ec9b0', fontWeight: 'bold' }}>{msg.sender}</span>
                                        <span style={{ color: '#666' }}>{formatTime(msg.timestamp)}</span>
                                    </div>
                                    <div style={{ backgroundColor: msg.sender === userName ? '#0078d420' : '#2d2d2d', color: 'white', padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem', wordWrap: 'break-word' }}>
                                        {msg.type === 'file' ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '1.2rem' }}>📄</span>
                                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                                    <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{msg.name}</div>
                                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>{formatSize(msg.size)}</div>
                                                </div>
                                                <a href={msg.url || '#'} download={msg.name} style={{ color: '#0078d4', textDecoration: 'none', fontSize: '0.8rem' }}>⇓</a>
                                            </div>
                                        ) : (
                                            msg.message
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div style={{ padding: '10px', borderTop: '1px solid #444', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ cursor: 'pointer', padding: '5px', borderRadius: '4px', backgroundColor: '#333' }}>
                            📎
                            <input type="file" onChange={handleFileChange} style={{ display: 'none' }} />
                        </label>
                        <input
                            type="text" value={inputMessage} onChange={(e) => setInputMessage(e.target.value)}
                            onKeyPress={handleKeyPress} placeholder="Ketik pesan..."
                            style={{ flex: 1, padding: '8px', backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', color: 'white', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <button onClick={handleSend} disabled={!inputMessage.trim()} style={{ padding: '8px 12px', backgroundColor: inputMessage.trim() ? '#0078d4' : '#444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            Kirim
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default ChatBox;
