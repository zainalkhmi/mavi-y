import React, { useState, useEffect, useRef } from 'react';
import { chatWithAI, getStoredApiKey } from '../../utils/aiGenerator';

function AIChatOverlay({
    visible,
    onClose,
    onOpenSettings,
    contextData,
    systemPrompt = "You are an expert Industrial Engineer assistant.",
    title = "Mavi Engineer",
    subtitle = "AI Assistant"
}) {
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [isChatFullscreen, setIsChatFullscreen] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);

    const messagesEndRef = useRef(null);

    // Check if API key is configured
    useEffect(() => {
        const apiKey = getStoredApiKey();
        setHasApiKey(!!apiKey);
    }, [visible]);

    // Default handler for opening AI settings
    const handleOpenSettings = () => {
        if (onOpenSettings) {
            onOpenSettings();
        } else {
            // Dispatch global event to open AI settings
            window.dispatchEvent(new CustomEvent('open-ai-settings'));
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (visible) {
            scrollToBottom();
        }
    }, [visible, chatHistory]);

    const getGlobalContext = () => {
        const globalContext = { ...contextData };

        // Proactively try to gather context from known places if not already in contextData
        if (!globalContext.elements) {
            try {
                // Try to get from local storage if available
                const storedProject = localStorage.getItem('current_project_data');
                if (storedProject) {
                    const parsed = JSON.parse(storedProject);
                    globalContext.elements = parsed.measurements;
                    globalContext.projectName = parsed.name;
                }
            } catch (e) {
                console.warn('Failed to gather global context from storage', e);
            }
        }

        // Gather metrics if available on window (Custom event or global var)
        if (window.__maviMetrics) {
            globalContext.metrics = window.__maviMetrics;
        }

        if (window.__maviWorkstation) {
            globalContext.workstation = window.__maviWorkstation;
        }

        if (window.__maviErgonomics) {
            globalContext.ergonomics = window.__maviErgonomics;
        }

        if (window.__maviVSM) {
            globalContext.vsm = window.__maviVSM;
        }

        return globalContext;
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;



        const userMessage = chatInput.trim();
        setChatInput('');

        // Add user message to history
        const newHistory = [...chatHistory, { role: 'user', content: userMessage }];
        setChatHistory(newHistory);
        setIsAiThinking(true);

        try {
            // Prepare context
            const context = {
                ...getGlobalContext(),
                systemPrompt
            };

            const aiResponse = await chatWithAI(userMessage, context, newHistory);

            // Add AI response to history
            setChatHistory([...newHistory, { role: 'ai', content: aiResponse }]);
        } catch (error) {
            console.error('Chat error:', error);
            setChatHistory([...newHistory, { role: 'ai', content: `Error: ${error.message}` }]);
        } finally {
            setIsAiThinking(false);
        }
    };

    if (!visible) return null;

    return (
        <div style={{
            position: 'fixed',
            right: isChatFullscreen ? '0' : '20px',
            bottom: isChatFullscreen ? '0' : '20px',
            top: isChatFullscreen ? '0' : 'auto',
            left: isChatFullscreen ? '0' : 'auto',
            width: isChatFullscreen ? '100%' : '400px',
            height: isChatFullscreen ? '100%' : '500px',
            backgroundColor: '#1e1e1e',
            border: '1px solid #444',
            borderRadius: isChatFullscreen ? '0' : '8px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
            {/* Chat Header */}
            <div style={{ padding: '10px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444', borderRadius: isChatFullscreen ? '0' : '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🤖</span>
                    <div>
                        <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>{title}</div>
                        <div style={{ color: '#888', fontSize: '0.7rem' }}>{subtitle}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}
                        title={isChatFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isChatFullscreen ? '⊡' : '⊞'}
                    </button>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                </div>
            </div>

            {/* Chat Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* API Key Warning */}
                {!hasApiKey && (
                    <div style={{
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        border: '1px solid #ff9800',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '10px'
                    }}>
                        <div style={{ color: '#ff9800', fontWeight: 'bold', marginBottom: '8px', fontSize: '0.9rem' }}>
                            ⚠️ AI Belum Terhubung
                        </div>
                        <p style={{ color: '#ccc', fontSize: '0.8rem', margin: '0 0 10px 0' }}>
                            Silakan konfigurasi API Key di AI Settings untuk menggunakan chatbot.
                        </p>
                        <button
                            onClick={handleOpenSettings}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#ff9800',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}
                        >
                            ⚙️ Buka AI Settings
                        </button>
                    </div>
                )}
                {chatHistory.length === 0 ? (
                    <div style={{ color: '#666', textAlign: 'center', marginTop: '20px', fontSize: '0.85rem' }}>
                        <p>👋 Halo! Saya {title}.</p>
                        <p style={{ marginTop: '10px' }}>Saya siap membantu menganalisis data Anda.</p>
                    </div>
                ) : (
                    chatHistory.map((msg, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '8px', backgroundColor: msg.role === 'user' ? '#0078d4' : '#2d2d2d', color: 'white', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                {msg.content}
                            </div>
                        </div>
                    ))
                )}
                {isAiThinking && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#2d2d2d', color: '#888', fontSize: '0.85rem' }}>
                            <span>💭 Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div style={{ padding: '10px', borderTop: '1px solid #444', display: 'flex', gap: '8px' }}>
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAiThinking && handleSendMessage()}
                    placeholder="Tanyakan sesuatu..."
                    disabled={isAiThinking}
                    style={{ flex: 1, padding: '8px', backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isAiThinking || !chatInput.trim()}
                    style={{ padding: '8px 12px', backgroundColor: isAiThinking || !chatInput.trim() ? '#444' : '#0078d4', border: 'none', borderRadius: '4px', color: 'white', cursor: isAiThinking || !chatInput.trim() ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                >
                    {isAiThinking ? '⌛' : '→'}
                </button>
            </div>
        </div>
    );
}

export default AIChatOverlay;
