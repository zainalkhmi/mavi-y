import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Bot, Sparkles } from 'lucide-react';
import { chatWithAI } from '../../utils/aiGenerator';

const StudioAssistant = ({ model }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Halo! Saya asisten khusus Studio Model. Bingung cara bikin Rule atau State? Tanya saya saja!' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Prepare context from current model
            const modelContext = {
                modelName: model.name,
                states: model.states.map(s => s.name).join(', '),
                transitions: model.transitions.map(t => {
                    const from = model.states.find(s => s.id === t.from)?.name || 'Unknown';
                    const to = model.states.find(s => s.id === t.to)?.name || 'Unknown';
                    const rules = t.condition.rules.map(r => `${r.type}`).join(', ');
                    return `${from} -> ${to} [${rules}]`;
                }).join('\n')
            };

            const systemPrompt = `
            [SYSTEM INSTRUCTION]
            You are a dedicated "Studio Model Assistant". 
            Your SOLE purpose is to help the user build "Motion Rules" (FSM) using this specific "Studio Model" tool.
            
            CRITICAL CONTEXT BOUNDARIES:
            1. **DO NOT** mention "Teachable Machine", "Golden Cycle", "Standard Detection", or "Therblig Analysis". Those are external modules.
            2. **ONLY** discuss:
                - Creating States (Langkah Kerja).
                - Creating Transitions and Rules (Logic).
                - Rule Types: POSE_RELATION, POSE_VELOCITY, POSE_ANGLE, OBJECT_PROXIMITY.
                - Features of Studio: Body-Centric Mode (Ref. Tubuh), Hysteresis (Buffer), Smoothing.
            3. **YOUR KNOWLEDGE**: You only know the FSM logic defined below. You do not know about machine learning training.
            
            [CONTEXT - CURRENT MODEL STRUCTURE]
            Name: ${modelContext.modelName}
            States: ${modelContext.states}
            Logic: ${modelContext.transitions}
            
            [INSTRUCTION]
            Answer the user's question specifically about building/improving THIS model structure.
            If the user asks for "AI Training" or "Machine Learning", explain that Studio Model uses *Rule-Based Logic* (FSM), not training.
            `;

            // Pass systemPrompt via context to override default Mavi persona
            const replyText = await chatWithAI(input, { systemPrompt }, messages, '', null);

            setMessages(prev => [...prev, { role: 'assistant', content: replyText }]);
        } catch (error) {
            console.error("Assistant Error:", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "Maaf, saya sedang pusing. Coba lagi nanti ya (Error koneksi/API)." }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Trigger Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        right: '24px',
                        width: '60px',
                        height: '60px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, #2563eb, #9333ea)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 4px 15px rgba(37, 99, 235, 0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50,
                        transition: 'transform 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MessageSquare size={28} />
                    <div style={{ position: 'absolute', top: -5, right: -5, background: '#ef4444', height: '12px', width: '12px', borderRadius: '50%' }} />
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    width: '380px',
                    height: '550px',
                    backgroundColor: '#1f2937',
                    borderRadius: '16px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 100,
                    border: '1px solid #374151',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '16px',
                        background: 'linear-gradient(to right, #1e3a8a, #581c87)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #374151'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '8px' }}>
                                <Bot size={20} color="#60a5fa" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', color: 'white' }}>Studio AI Assistant</h3>
                                <span style={{ fontSize: '0.75rem', color: '#93c5fd' }}>Expert in Motion Logic</span>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div style={{
                        flex: 1,
                        padding: '20px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        backgroundColor: '#111827'
                    }}>
                        {messages.map((msg, idx) => (
                            <div key={idx} style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '12px',
                                    backgroundColor: msg.role === 'user' ? '#2563eb' : '#374151',
                                    color: msg.role === 'user' ? 'white' : '#e5e7eb',
                                    borderBottomRightRadius: msg.role === 'user' ? '2px' : '12px',
                                    borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                    fontSize: '0.9rem',
                                    lineHeight: '1.5',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                }}>
                                    {msg.content}
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: '#6b7280',
                                    marginTop: '4px',
                                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    {msg.role === 'user' ? 'You' : 'AI Assistant'}
                                </span>
                            </div>
                        ))}
                        {isLoading && (
                            <div style={{ alignSelf: 'flex-start', padding: '12px', backgroundColor: '#374151', borderRadius: '12px', display: 'flex', gap: '4px' }}>
                                <div className="dot" style={{ width: 6, height: 6, background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite' }} />
                                <div className="dot" style={{ width: 6, height: 6, background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.2s' }} />
                                <div className="dot" style={{ width: 6, height: 6, background: '#9ca3af', borderRadius: '50%', animation: 'bounce 1s infinite 0.4s' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div style={{
                        padding: '16px',
                        backgroundColor: '#1f2937',
                        borderTop: '1px solid #374151',
                        display: 'flex',
                        gap: '10px'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Tanya tentang Rule / Logic..."
                            style={{
                                flex: 1,
                                backgroundColor: '#374151',
                                border: '1px solid #4b5563',
                                borderRadius: '8px',
                                padding: '10px 16px',
                                color: 'white',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading}
                            style={{
                                backgroundColor: isLoading ? '#4b5563' : '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                width: '44px',
                                height: '44px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
            `}</style>
        </>
    );
};

export default StudioAssistant;
