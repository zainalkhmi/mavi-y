import React, { useState, useRef, useEffect } from 'react';
import { Upload, MessageSquare, Video, Loader, Send, Trash2, Maximize2, Minimize2, Zap, Sparkles, AlertTriangle, Lightbulb, Shield } from 'lucide-react';
import { uploadFileToGemini, chatWithVideo, generateElementsFromVideo, generateKaizenAnalysis } from '../utils/aiGenerator';
import { getStoredApiKey } from '../utils/aiGenerator';

const VideoIntelligence = ({ videoRef, onClose, onUpdateMeasurements, isEmbedded = false, videoFile }) => {
    const [fileUri, setFileUri] = useState(null);
    const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, ready, error
    const [chatHistory, setChatHistory] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [kaizenResults, setKaizenResults] = useState(null);
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'kaizen'
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Auto-upload when videoFile prop changes
    useEffect(() => {
        if (videoFile && !fileUri) {
            handleFileUpload({ target: { files: [videoFile] } });
        }
    }, [videoFile]);

    // Scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // ... (handlers remain the same) ...

    const handleFileUpload = async (event) => {
        const file = event.target.files ? event.target.files[0] : event; // Handle both event and direct file object
        if (!file) return;

        setUploadStatus('uploading');
        try {
            // Check API Key existence first (implicitly done by upload tool)
            const uri = await uploadFileToGemini(file);
            setFileUri(uri);
            setUploadStatus('ready');
            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `Video "${file.name}" uploaded successfully! You can now ask questions or generate elements.`
            }]);
        } catch (error) {
            console.error("Upload failed:", error);
            setUploadStatus('error');
            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `Error uploading video: ${error.message}. Please check your API Key and try again.`
            }]);
        }
    };

    const handleGenerateElements = async () => {
        if (!fileUri) return;

        setIsGenerating(true);
        setChatHistory(prev => [...prev, { role: 'system', content: '🔄 Analyzing video structure... This may take a minute.' }]);

        try {
            const elements = await generateElementsFromVideo(fileUri, null);

            if (onUpdateMeasurements && Array.isArray(elements) && elements.length > 0) {
                const newMeasurements = elements.map((el, i) => ({
                    id: Date.now() + i,
                    elementName: el.elementName || "Untitled Step",
                    startTime: Number(el.startTime),
                    endTime: Number(el.endTime),
                    duration: Number(el.duration) || (Number(el.endTime) - Number(el.startTime)),
                    category: el.category || "Value-added",
                    therblig: el.therblig || null
                }));

                onUpdateMeasurements(newMeasurements);
                setChatHistory(prev => [...prev, {
                    role: 'system',
                    content: `✅ Successfully generated ${newMeasurements.length} elements! The timeline has been updated.`
                }]);
            } else {
                setChatHistory(prev => [...prev, {
                    role: 'system',
                    content: `⚠️ Analysis complete but no elements were returned or they were in an invalid format.`
                }]);
            }

        } catch (error) {
            console.error("Generation failed:", error);
            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `❌ Error generating elements: ${error.message}`
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleKaizenAnalysis = async () => {
        if (!fileUri) return;

        setIsGenerating(true);
        setActiveTab('kaizen');
        setChatHistory(prev => [...prev, { role: 'system', content: '🧠 Performing Deep Kaizen Analysis... Analyzing workstation layout and motion efficiency.' }]);

        try {
            const results = await generateKaizenAnalysis(fileUri, null);
            setKaizenResults(results);

            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `✅ Kaizen Analysis Complete! Found ${results.wasteSegments?.length || 0} waste segments and ${results.recommendations?.length || 0} recommendations.`
            }]);
        } catch (error) {
            console.error("Kaizen analysis failed:", error);
            setChatHistory(prev => [...prev, {
                role: 'system',
                content: `❌ Error in Kaizen Analysis: ${error.message}`
            }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !fileUri) return;

        const userMsg = inputMessage;
        setInputMessage('');
        setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsTyping(true);

        try {
            const aiResponse = await chatWithVideo(userMsg, fileUri, chatHistory);
            setChatHistory(prev => [...prev, { role: 'ai', content: aiResponse }]);
        } catch (error) {
            console.error("Chat failed:", error);
            setChatHistory(prev => [...prev, { role: 'ai', content: `Error: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    const containerStyle = isEmbedded ? {
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column'
    } : {
        position: 'absolute',
        top: isExpanded ? '10px' : '60px',
        right: isExpanded ? '10px' : '20px',
        bottom: isExpanded ? '10px' : '20px',
        left: isExpanded ? '10px' : 'auto',
        width: isExpanded ? 'auto' : '500px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        transition: 'all 0.3s ease'
    };

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#252526',
                borderRadius: isEmbedded ? '0' : '8px 8px 0 0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={18} color="#A78BFA" />
                    <span style={{ fontWeight: '600', color: '#fff' }}>Gemini Video Intelligence</span>
                </div>
                {(onClose || !isEmbedded) && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {!isEmbedded && (
                            <button
                                onClick={() => setIsExpanded(!isExpanded)}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                title={isExpanded ? "Collapse" : "Expand"}
                            >
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        )}
                        {onClose && (
                            <button
                                onClick={onClose}
                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}
                                title="Close"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Upload Section (if not ready) */}
                {uploadStatus !== 'ready' && (
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px',
                        color: '#888',
                        gap: '15px'
                    }}>
                        <div style={{
                            width: '60px', height: '60px',
                            borderRadius: '50%', backgroundColor: '#2d2d2d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {uploadStatus === 'uploading' ? (
                                <Loader size={24} className="spin" color="#A78BFA" />
                            ) : (
                                <Upload size={24} color="#A78BFA" />
                            )}
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            {uploadStatus === 'uploading' ? (
                                <>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>Uploading Video to Gemini...</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem' }}>This allows the AI to "watch" and understand the content.</p>
                                </>
                            ) : (
                                <>
                                    <h4 style={{ margin: '0 0 5px 0', color: '#fff' }}>Analyze Your Video</h4>
                                    <p style={{ margin: 0, fontSize: '0.85rem', maxWidth: '250px' }}>
                                        Upload a video clip to identify anomalies, count cycles, or check safety compliance.
                                    </p>
                                    <button
                                        onClick={triggerFileUpload}
                                        style={{
                                            marginTop: '15px', padding: '8px 16px',
                                            backgroundColor: '#A78BFA', color: '#000', fontWeight: 'bold',
                                            border: 'none', borderRadius: '4px', cursor: 'pointer'
                                        }}
                                    >
                                        Select Video File
                                    </button>
                                </>
                            )}
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="video/*"
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                {/* Chat Section (if ready) */}
                {uploadStatus === 'ready' && (
                    <>
                        {/* Auto Generate Button Toolbar */}
                        <div style={{
                            padding: '10px 16px',
                            borderBottom: '1px solid #333',
                            backgroundColor: '#202020',
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={handleGenerateElements}
                                disabled={isGenerating || isTyping}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: isGenerating ? '#444' : '#107c41',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {isGenerating ? <Loader size={14} className="spin" /> : <Zap size={14} />}
                                Auto-Generate Elements
                            </button>
                            <button
                                onClick={handleKaizenAnalysis}
                                disabled={isGenerating || isTyping}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: isGenerating ? '#444' : '#8b5cf6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: isGenerating ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    fontWeight: '500',
                                    fontSize: '0.85rem'
                                }}
                            >
                                {isGenerating ? <Loader size={14} className="spin" /> : <Sparkles size={14} />}
                                Generative Kaizen
                            </button>
                        </div>

                        {/* Tabs */}
                        <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
                            <button
                                onClick={() => setActiveTab('chat')}
                                style={{
                                    flex: 1, padding: '10px', background: 'none', border: 'none',
                                    color: activeTab === 'chat' ? '#A78BFA' : '#888',
                                    borderBottom: activeTab === 'chat' ? '2px solid #A78BFA' : 'none',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                                }}
                            >
                                AI Chat
                            </button>
                            <button
                                onClick={() => setActiveTab('kaizen')}
                                style={{
                                    flex: 1, padding: '10px', background: 'none', border: 'none',
                                    color: activeTab === 'kaizen' ? '#A78BFA' : '#888',
                                    borderBottom: activeTab === 'kaizen' ? '2px solid #A78BFA' : 'none',
                                    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold'
                                }}
                            >
                                Kaizen Insights {kaizenResults && `(${kaizenResults.recommendations?.length || 0})`}
                            </button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                            {activeTab === 'chat' ? (
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {chatHistory.map((msg, idx) => (
                                        <div key={idx} style={{
                                            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                            maxWidth: '85%',
                                            backgroundColor: msg.role === 'user' ? '#A78BFA' : '#2d2d2d',
                                            color: msg.role === 'user' ? '#000' : '#e0e0e0',
                                            padding: '10px 14px',
                                            borderRadius: '12px',
                                            fontSize: '0.9rem',
                                            lineHeight: '1.4'
                                        }}>
                                            {msg.content}
                                        </div>
                                    ))}
                                    {(isTyping || isGenerating) && (
                                        <div style={{ alignSelf: 'flex-start', color: '#666', fontSize: '0.8rem', marginLeft: '10px' }}>
                                            Gemini is analyzing video frames...
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                            ) : (
                                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {isGenerating && !kaizenResults && (
                                        <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                                            <Loader size={30} className="spin" style={{ margin: '0 auto 15px' }} />
                                            <p>Analyzing Muda, Mura, Muri...</p>
                                        </div>
                                    )}

                                    {kaizenResults && (
                                        <>
                                            {/* Summary */}
                                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                                                <h4 style={{ margin: '0 0 8px 0', color: '#A78BFA', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Lightbulb size={18} /> Executive Summary
                                                </h4>
                                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#ccc', lineHeight: '1.5' }}>{kaizenResults.summary}</p>
                                            </div>

                                            {/* Waste Segments */}
                                            <div>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#ff4b4b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                                    <AlertTriangle size={18} /> Identified Waste (Muda)
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {kaizenResults.wasteSegments?.map((w, i) => (
                                                        <div key={i} style={{ background: '#2d2d2d', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ff4b4b' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{w.type}</span>
                                                                <button
                                                                    onClick={() => videoRef.current && (videoRef.current.currentTime = w.startTime)}
                                                                    style={{ background: '#444', border: 'none', borderRadius: '4px', color: '#ff4b4b', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                                                                >
                                                                    {w.startTime.toFixed(1)}s - {w.endTime.toFixed(1)}s
                                                                </button>
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>{w.description}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Recommendations */}
                                            <div>
                                                <h4 style={{ margin: '0 0 10px 0', color: '#107c41', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                                    <Zap size={18} /> Kaizen Recommendations
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                    {kaizenResults.recommendations?.map((r, i) => (
                                                        <div key={i} style={{ background: '#2d2d2d', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #107c41' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{r.title}</span>
                                                                {r.timestamp && (
                                                                    <button
                                                                        onClick={() => videoRef.current && (videoRef.current.currentTime = r.timestamp)}
                                                                        style={{ background: '#444', border: 'none', borderRadius: '4px', color: '#107c41', padding: '2px 8px', fontSize: '0.75rem', cursor: 'pointer' }}
                                                                    >
                                                                        @ {r.timestamp.toFixed(1)}s
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa', marginBottom: '5px' }}>{r.description}</p>
                                                            <span style={{ fontSize: '0.7rem', color: '#107c41', background: 'rgba(16, 124, 65, 0.1)', padding: '2px 6px', borderRadius: '10px' }}>
                                                                Impact: {r.impact}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Ergonomics */}
                                            {kaizenResults.ergonomics?.length > 0 && (
                                                <div>
                                                    <h4 style={{ margin: '0 0 10px 0', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                                        <Shield size={18} /> Ergonomic Alerts
                                                    </h4>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {kaizenResults.ergonomics.map((e, i) => (
                                                            <div key={i} style={{ background: '#2d2d2d', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{e.issue}</span>
                                                                    <span style={{ fontSize: '0.75rem', color: e.severity === 'High' ? '#ff4b4b' : '#f59e0b' }}>{e.severity}</span>
                                                                </div>
                                                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#aaa' }}>{e.description}</p>
                                                                {e.timestamp && (
                                                                    <button
                                                                        onClick={() => videoRef.current && (videoRef.current.currentTime = e.timestamp)}
                                                                        style={{ marginTop: '8px', background: 'none', border: '1px solid #444', borderRadius: '4px', color: '#888', padding: '2px 8px', fontSize: '0.7rem', cursor: 'pointer' }}
                                                                    >
                                                                        View Moment ({e.timestamp.toFixed(1)}s)
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: '12px',
                            borderTop: '1px solid #333',
                            backgroundColor: '#1e1e1e',
                            display: 'flex',
                            gap: '8px'
                        }}>
                            <button
                                onClick={() => { setUploadStatus('idle'); setFileUri(null); setChatHistory([]); }}
                                title="Upload New Video"
                                style={{ padding: '8px', backgroundColor: '#333', border: 'none', borderRadius: '4px', color: '#aaa', cursor: 'pointer' }}
                            >
                                <Trash2 size={18} />
                            </button>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask about this video..."
                                disabled={isGenerating}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#2d2d2d',
                                    border: '1px solid #444',
                                    borderRadius: '4px',
                                    color: 'white',
                                    padding: '8px 12px',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isTyping || !inputMessage.trim() || isGenerating}
                                style={{
                                    padding: '8px 12px',
                                    backgroundColor: (isTyping || isGenerating) ? '#444' : '#A78BFA',
                                    color: (isTyping || isGenerating) ? '#777' : '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: (isTyping || isGenerating) ? 'default' : 'pointer'
                                }}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default VideoIntelligence;
