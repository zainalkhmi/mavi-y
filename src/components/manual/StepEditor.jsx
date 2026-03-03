import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImageMarkupDialog from './ImageMarkupDialog';
import RichTextEditor from './RichTextEditor';
import CanvasEditor from './CanvasEditor';
import {
    Sparkles, Eye, Zap, Image, Camera, Upload,
    Edit3, X, CheckCircle, Info, AlertTriangle, AlertCircle,
    Plus, MessageSquare, Trash2, Youtube, Bell,
    ChevronLeft, ChevronRight, EyeOff, Mic, Square, Volume2, Type,
    LayoutTemplate
} from 'lucide-react';

const extractYouTubeVideoId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

        if (host === 'youtu.be') {
            return parsed.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (host.includes('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
            if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
            if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        }
    } catch {
        // fallback below
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null;
};

const getYouTubeEmbedUrl = (value = '') => {
    const id = extractYouTubeVideoId(value);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};

const normalizeQuestionType = (value = 'text') => String(value || 'text').trim().toLowerCase();

const normalizeQuestionOptions = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean);
    }
    if (typeof value === 'string') {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    return [];
};

const StepEditor = ({
    step,
    stepListPanel,
    onChange,
    onCaptureImage,
    onAiImprove,
    onAiGenerate,
    onAiGenerateFromVideo,
    onAiChat,
    isAiLoading,
    videoTime,
    activeImageIndex,
    setActiveImageIndex,
    onSave,
    globalVideoSrc // Added to support previewing global video clips per step
}) => {
    const { t, tt } = useLanguage();
    const [showMarkup, setShowMarkup] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [leftTab, setLeftTab] = useState('image'); // 'image' | 'canvas'
    const isCanvasMode = leftTab === 'canvas';
    const mediaRecorderRef = React.useRef(null);
    const audioChunksRef = React.useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64Audio = reader.result;
                    handleStepUpdate({ voiceInstruction: base64Audio });
                };
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (err) {
            console.error('Error starting recording:', err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    if (!step) return (
        <div style={{ flex: 1, color: '#fff', backgroundColor: 'transparent', height: '100%' }}>
            <div style={{ display: 'flex', gap: '24px', height: '100%' }}>
                {stepListPanel && (
                    <div style={{ flex: '1', maxWidth: '420px' }}>
                        <div
                            style={{
                                height: '320px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            {stepListPanel}
                        </div>
                    </div>
                )}

                <div
                    style={{
                        flex: stepListPanel ? '1.2' : 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255, 255, 255, 0.3)',
                        gap: '16px'
                    }}
                >
                    <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <Edit3 size={32} />
                    </div>
                    <span style={{ fontWeight: '500' }}>{t('manual.selectStepToEdit')}</span>
                </div>
            </div>
        </div>
    );

    const images = step.images || [];
    const mainImage = images[activeImageIndex] || (step.media?.type === 'image' ? step.media.url : null);
    const handleChange = (field, update) => {
        onChange(step.id, { ...step, [field]: update });
    };

    const handleStepUpdate = (updates) => {
        onChange(step.id, { ...step, ...updates });
    };

    const handleBulletAdd = (type) => {
        const newBullet = { type, text: '', shape: 'circle' };
        handleStepUpdate({ bullets: [...(step.bullets || []), newBullet] });
    };

    const handleBulletChange = (index, text) => {
        const newBullets = [...(step.bullets || [])];
        newBullets[index].text = text;
        handleStepUpdate({ bullets: newBullets });
    };

    const handleBulletDelete = (index) => {
        const newBullets = [...(step.bullets || [])];
        newBullets.splice(index, 1);
        handleStepUpdate({ bullets: newBullets });
    };

    const handleBulletTypeCycle = (index) => {
        const typeOrder = ['step', 'note', 'warning', 'caution', 'reminder'];
        const bullets = [...(step.bullets || [])];
        const currentType = bullets[index]?.type || 'step';
        const nextType = typeOrder[(typeOrder.indexOf(currentType) + 1) % typeOrder.length];
        bullets[index] = { ...bullets[index], type: nextType };
        handleStepUpdate({ bullets });
    };

    const handleBulletShapeCycle = (index) => {
        const shapeOrder = ['circle', 'square', 'diamond'];
        const bullets = [...(step.bullets || [])];
        const currentShape = bullets[index]?.shape || 'circle';
        const nextShape = shapeOrder[(shapeOrder.indexOf(currentShape) + 1) % shapeOrder.length];
        bullets[index] = { ...bullets[index], shape: nextShape };
        handleStepUpdate({ bullets });
    };

    const handleBulletColorChange = (index, color) => {
        const bullets = [...(step.bullets || [])];
        bullets[index] = { ...bullets[index], color };
        handleStepUpdate({ bullets });
    };

    const getBulletColor = (bullet) => {
        if (bullet?.color) return bullet.color;
        switch (bullet?.type) {
            case 'note': return '#2563eb';
            case 'warning': return '#f59e0b';
            case 'caution': return '#ef4444';
            case 'reminder': return '#8b5cf6';
            default: return '#333';
        }
    };

    const renderShapeDot = (shape) => {
        if (shape === 'square') {
            return <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '2px' }} />;
        }
        if (shape === 'diamond') {
            return <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', transform: 'rotate(45deg)' }} />;
        }
        return <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff' }} />;
    };

    const renderBulletIcon = (bullet) => {
        if (bullet?.type === 'caution' || bullet?.type === 'warning') return <AlertCircle size={14} />;
        if (bullet?.type === 'note') return <Info size={14} />;
        if (bullet?.type === 'reminder') return <Bell size={14} />;
        return renderShapeDot(bullet?.shape || 'circle');
    };

    const handleMarkupSave = (newDataUrl) => {
        const newImages = [...images];
        newImages[activeImageIndex] = newDataUrl;
        handleStepUpdate({ images: newImages, media: { ...step.media, url: newDataUrl } });
    };

    const handleDeleteImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        handleStepUpdate({ images: newImages });
        if (activeImageIndex >= newImages.length) {
            setActiveImageIndex(Math.max(0, newImages.length - 1));
        }
    };

    const dataCaptureFields = Array.isArray(step.questions) ? step.questions : [];

    const handleAddDataCaptureField = () => {
        const newField = {
            id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            label: 'New data field',
            type: 'text',
            required: false,
            options: []
        };
        handleStepUpdate({ questions: [...dataCaptureFields, newField] });
    };

    const handleUpdateDataCaptureField = (index, patch) => {
        const normalizedPatch = { ...patch };
        if (Object.prototype.hasOwnProperty.call(normalizedPatch, 'type')) {
            normalizedPatch.type = normalizeQuestionType(normalizedPatch.type);
        }
        if (Object.prototype.hasOwnProperty.call(normalizedPatch, 'options')) {
            normalizedPatch.options = normalizeQuestionOptions(normalizedPatch.options);
        }

        const next = [...dataCaptureFields];
        next[index] = {
            ...next[index],
            ...normalizedPatch
        };
        handleStepUpdate({ questions: next });
    };

    const handleDeleteDataCaptureField = (index) => {
        const next = dataCaptureFields.filter((_, i) => i !== index);
        handleStepUpdate({ questions: next });
    };

    const toolbarIconButtonStyle = {
        width: '28px',
        height: '28px',
        minWidth: '28px',
        padding: 0,
        borderRadius: '7px',
        border: '1px solid rgba(255,255,255,0.14)',
        background: 'rgba(15, 23, 42, 0.6)',
        color: 'rgba(255,255,255,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer'
    };

    const bulletInputStyle = {
        flex: 1,
        border: 'none',
        borderBottom: '1px dashed rgba(255,255,255,0.35)',
        background: 'transparent',
        padding: '6px 0',
        fontSize: '0.95rem',
        color: 'rgba(255,255,255,0.92)',
        outline: 'none'
    };

    return (
        <div style={{ flex: 1, color: '#fff', backgroundColor: 'transparent' }}>

            {/* Two Column Content */}
            <div style={{ display: 'flex', gap: '24px' }}>
                {/* Left Column: Image Preview */}
                <div style={{ flex: '1', maxWidth: '420px' }}>
                    <div style={{
                        width: '100%',
                        aspectRatio: '4/3',
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        position: 'relative',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
                    }}>
                        {step.media?.type === 'video' ? (
                            <video
                                src={`${step.media.url || globalVideoSrc}#t=${step.startTime || 0}${step.duration ? ',' + (Math.round(((step.startTime || 0) + step.duration) * 10) / 10) : ''}`}
                                controls
                                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
                            />
                        ) : step.media?.type === 'youtube' ? (
                            <iframe
                                src={getYouTubeEmbedUrl(step.media.youtubeUrl || step.media.url) || ''}
                                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#000' }}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title={`step-youtube-${step.id}`}
                            />
                        ) : mainImage ? (
                            <img src={mainImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Step Main" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)', gap: '16px' }}>
                                <Image size={64} />
                                {globalVideoSrc && (
                                    <button
                                        onClick={onCaptureImage}
                                        style={{
                                            padding: '10px 20px',
                                            background: '#2563eb',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            fontSize: '0.9rem',
                                            fontWeight: '600',
                                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
                                        }}
                                    >
                                        <Camera size={18} /> {tt('manual.captureFrame', 'Capture from Video')}
                                    </button>
                                )}
                            </div>
                        )}
                        {mainImage && (
                            <div style={{ position: 'absolute', bottom: 16, right: 16, left: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {globalVideoSrc && (
                                    <button
                                        onClick={onCaptureImage}
                                        title="Capture New Image"
                                        style={{
                                            background: 'rgba(37, 99, 235, 0.85)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            backdropFilter: 'blur(4px)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.78rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                        }}
                                    >
                                        <Camera size={14} />
                                        Capture
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowMarkup(true)}
                                    title="Edit Image / Markup"
                                    style={{
                                        background: 'rgba(15, 23, 42, 0.8)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        borderRadius: '8px',
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        backdropFilter: 'blur(4px)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        fontSize: '0.78rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.8)'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'}
                                >
                                    <Sparkles size={14} style={{ color: '#60a5fa' }} />
                                    Markup
                                </button>
                            </div>
                        )}
                    </div>

                    {stepListPanel && (
                        <div
                            style={{
                                marginTop: '12px',
                                height: '320px',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backgroundColor: 'rgba(255,255,255,0.02)'
                            }}
                        >
                            {stepListPanel}
                        </div>
                    )}
                </div>

                {/* Right Column: Text / Canvas */}
                <div style={{ flex: '1.2' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#333' }} />
                        </div>
                        <div style={{ flex: 1 }}>

                            {/* Teks / Canvas toggle */}
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'rgba(15,23,42,0.5)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)', width: 'fit-content' }}>
                                <button
                                    onClick={() => setLeftTab('text')}
                                    style={{
                                        padding: '4px 14px', borderRadius: '7px',
                                        border: leftTab !== 'canvas' ? '1px solid rgba(59,130,246,0.5)' : '1px solid transparent',
                                        background: leftTab !== 'canvas' ? 'rgba(59,130,246,0.22)' : 'transparent',
                                        color: leftTab !== 'canvas' ? '#93c5fd' : 'rgba(255,255,255,0.45)',
                                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s'
                                    }}
                                >
                                    <Type size={12} /> Teks
                                </button>
                                <button
                                    onClick={() => setLeftTab('canvas')}
                                    style={{
                                        padding: '4px 14px', borderRadius: '7px',
                                        border: leftTab === 'canvas' ? '1px solid rgba(168,85,247,0.5)' : '1px solid transparent',
                                        background: leftTab === 'canvas' ? 'rgba(168,85,247,0.22)' : 'transparent',
                                        color: leftTab === 'canvas' ? '#c084fc' : 'rgba(255,255,255,0.45)',
                                        cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s'
                                    }}
                                >
                                    <LayoutTemplate size={12} /> Canvas
                                </button>
                            </div>

                            {/* ── Canvas mode ── */}
                            {leftTab === 'canvas' && (
                                <div style={{
                                    height: '420px', borderRadius: '12px', overflow: 'hidden',
                                    border: '1px solid rgba(168,85,247,0.25)',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.2)', marginBottom: '12px'
                                }}>
                                    <CanvasEditor step={step} onChange={onChange} />
                                </div>
                            )}

                            {/* ── Text mode: AI toolbar + RichTextEditor ── */}
                            {leftTab !== 'canvas' && (
                                <>
                                    {/* AI Actions Toolbar */}
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                        <button
                                            className="btn-pro"
                                            onClick={onAiGenerate}
                                            disabled={isAiLoading || !step.title}
                                            style={{
                                                padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)'
                                            }}
                                            title="Auto-generate instructions from step title"
                                        >
                                            {isAiLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Zap size={14} />}
                                            Generate
                                        </button>

                                        <button
                                            className="btn-pro"
                                            onClick={onAiImprove}
                                            disabled={isAiLoading || !step.instructions}
                                            style={{
                                                padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)'
                                            }}
                                            title="Improve grammar & clarity of current instructions"
                                        >
                                            {isAiLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Sparkles size={14} />}
                                            AI Improve
                                        </button>

                                        <button
                                            className="btn-pro"
                                            onClick={onAiGenerateFromVideo}
                                            disabled={isAiLoading}
                                            style={{
                                                padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', borderColor: 'rgba(168, 85, 247, 0.3)'
                                            }}
                                            title="Analyze full video and generate all steps"
                                        >
                                            {isAiLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Youtube size={14} />}
                                            Analyze Video
                                        </button>

                                        {onAiChat && (
                                            <button
                                                className="btn-pro"
                                                onClick={onAiChat}
                                                style={{
                                                    padding: '6px 12px', fontSize: '0.75rem', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', borderColor: 'rgba(236, 72, 153, 0.3)'
                                                }}
                                                title="Ask Mavi AI about this manual"
                                            >
                                                <MessageSquare size={14} />
                                                Mavi AI Chat
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                        <RichTextEditor
                                            value={step.instructions}
                                            onChange={(html) => handleStepUpdate({ instructions: html })}
                                            placeholder="Enter instructions..."
                                        />
                                    </div>

                                    {/* Toolbar */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px' }}>
                                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(15, 23, 42, 0.42)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                                            <button className="btn-icon" style={toolbarIconButtonStyle}><ChevronLeft size={14} /></button>
                                            <button className="btn-icon" style={toolbarIconButtonStyle}><ChevronRight size={14} /></button>
                                            <div style={{ width: '1px', height: '18px', background: 'rgba(255,255,255,0.16)', margin: '0 4px' }} />
                                            <button
                                                className="btn-pro-tab"
                                                onClick={() => handleBulletAdd('step')}
                                                title="Add Step Bullet"
                                                style={{
                                                    width: '30px',
                                                    height: '28px',
                                                    minWidth: '30px',
                                                    padding: '0',
                                                    fontSize: '0.7rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    backgroundColor: 'rgba(59, 130, 246, 0.24)',
                                                    border: '1px solid rgba(59, 130, 246, 0.52)',
                                                    color: '#bfdbfe',
                                                    borderRadius: '8px'
                                                }}
                                            >
                                                <Plus size={14} />
                                            </button>
                                            <button className="btn-pro-tab" style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px' }} onClick={() => handleBulletAdd('note')} title="Add Note"><Info size={14} /></button>
                                            <button className="btn-pro-tab" style={{ padding: '4px 8px', fontSize: '0.7rem', borderRadius: '8px' }} onClick={() => handleBulletAdd('caution')} title="Add Caution"><AlertCircle size={14} /></button>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ color: 'rgba(255,255,255,0.58)', fontSize: '0.72rem', fontWeight: '700', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '999px', padding: '4px 10px', background: 'rgba(255,255,255,0.03)' }}>
                                                {(step.instructions || '').replace(/<[^>]*>/g, '').length}/350
                                            </div>
                                            <button
                                                className="btn-pro"
                                                onClick={onSave}
                                                style={{
                                                    padding: '7px 18px',
                                                    fontSize: '0.8rem',
                                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                                    border: '1px solid rgba(147, 197, 253, 0.45)',
                                                    color: '#fff',
                                                    fontWeight: 700,
                                                    borderRadius: '10px',
                                                    boxShadow: '0 8px 20px rgba(37, 99, 235, 0.35)'
                                                }}
                                            >
                                                {tt('common.save', 'Save')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Additional Bullets */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(step.bullets || []).map((bullet, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    gap: '12px',
                                                    alignItems: 'center',
                                                    padding: '8px 10px',
                                                    borderRadius: '10px',
                                                    border: '1px solid rgba(255,255,255,0.08)',
                                                    background: 'rgba(15, 23, 42, 0.28)'
                                                }}
                                            >
                                                <button
                                                    onClick={(e) => {
                                                        if (e.shiftKey) {
                                                            handleBulletShapeCycle(idx);
                                                        } else {
                                                            handleBulletTypeCycle(idx);
                                                        }
                                                    }}
                                                    title="Click: change type | Shift+Click: change shape"
                                                    style={{
                                                        width: '26px',
                                                        height: '26px',
                                                        borderRadius: '7px',
                                                        backgroundColor: getBulletColor(bullet),
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: '#fff',
                                                        border: '1px solid rgba(255,255,255,0.25)',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 10px rgba(0,0,0,0.22)'
                                                    }}>
                                                    {renderBulletIcon(bullet)}
                                                </button>
                                                <input
                                                    value={bullet.text}
                                                    onChange={(e) => handleBulletChange(idx, e.target.value)}
                                                    style={bulletInputStyle}
                                                    placeholder="Enter text..."
                                                />
                                                <input
                                                    type="color"
                                                    value={getBulletColor(bullet)}
                                                    onChange={(e) => handleBulletColorChange(idx, e.target.value)}
                                                    title="Bullet color"
                                                    style={{ width: '28px', height: '24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', background: 'transparent', cursor: 'pointer' }}
                                                />
                                                <button
                                                    onClick={() => handleBulletDelete(idx)}
                                                    style={{
                                                        color: '#f87171',
                                                        border: '1px solid rgba(248, 113, 113, 0.3)',
                                                        background: 'rgba(248, 113, 113, 0.08)',
                                                        borderRadius: '8px',
                                                        width: '28px',
                                                        height: '28px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            {/* Data Capture & Voice Instruction (Shared between Text and Canvas modes) */}
                            <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
                                            Data Capture Fields
                                        </div>
                                        <label style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '0.72rem',
                                            color: step.hideDataCapture ? '#ec4899' : 'rgba(255,255,255,0.45)',
                                            cursor: 'pointer',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            background: step.hideDataCapture ? 'rgba(236, 72, 153, 0.1)' : 'transparent',
                                            transition: 'all 0.2s'
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={!!step.hideDataCapture}
                                                onChange={(e) => handleStepUpdate({ hideDataCapture: e.target.checked })}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            {step.hideDataCapture ? <EyeOff size={12} /> : <Eye size={12} />} Hide
                                        </label>
                                    </div>
                                    <button
                                        onClick={handleAddDataCaptureField}
                                        className="btn-pro-tab"
                                        style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                    >
                                        <Plus size={13} style={{ marginRight: 4 }} /> Add Field
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {dataCaptureFields.length === 0 && (
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                                            No data capture field yet. Add fields for operator input (Dozuki-style).
                                        </div>
                                    )}

                                    {dataCaptureFields.map((field, idx) => {
                                        const fieldType = normalizeQuestionType(field?.type || 'text');
                                        const supportsOptions = fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox';
                                        const normalizedOptions = normalizeQuestionOptions(field?.options);
                                        return (
                                            <div key={field.id || idx} style={{ border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8, padding: 10 }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.9fr auto auto', gap: 8, alignItems: 'center' }}>
                                                    <input
                                                        value={field.label || ''}
                                                        onChange={(e) => handleUpdateDataCaptureField(idx, { label: e.target.value })}
                                                        placeholder="Field label"
                                                        style={{
                                                            width: '100%',
                                                            border: '1px solid rgba(255,255,255,0.14)',
                                                            borderRadius: 6,
                                                            padding: '6px 8px',
                                                            fontSize: '0.78rem',
                                                            background: 'rgba(255,255,255,0.03)',
                                                            color: '#fff'
                                                        }}
                                                    />
                                                    <select
                                                        value={fieldType}
                                                        onChange={(e) => handleUpdateDataCaptureField(idx, { type: e.target.value })}
                                                        style={{
                                                            width: '100%',
                                                            border: '1px solid rgba(255,255,255,0.14)',
                                                            borderRadius: 6,
                                                            padding: '6px 8px',
                                                            fontSize: '0.76rem',
                                                            background: 'rgba(255,255,255,0.03)',
                                                            color: '#fff'
                                                        }}
                                                    >
                                                        <option value="text">Text</option>
                                                        <option value="textarea">Textarea</option>
                                                        <option value="number">Number</option>
                                                        <option value="select">Select</option>
                                                        <option value="radio">Radio</option>
                                                        <option value="checkbox">Checkbox</option>
                                                    </select>

                                                    <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!field.required}
                                                            onChange={(e) => handleUpdateDataCaptureField(idx, { required: e.target.checked })}
                                                        />
                                                        Required
                                                    </label>

                                                    <button
                                                        onClick={() => handleDeleteDataCaptureField(idx)}
                                                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                        title="Delete field"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                {supportsOptions && (
                                                    <input
                                                        value={normalizedOptions.join(', ')}
                                                        onChange={(e) => {
                                                            const options = normalizeQuestionOptions(e.target.value);
                                                            handleUpdateDataCaptureField(idx, { options });
                                                        }}
                                                        placeholder="Options (comma separated)"
                                                        style={{
                                                            marginTop: 8,
                                                            width: '100%',
                                                            border: '1px solid rgba(255,255,255,0.14)',
                                                            borderRadius: 6,
                                                            padding: '6px 8px',
                                                            fontSize: '0.75rem',
                                                            background: 'rgba(255,255,255,0.03)',
                                                            color: '#fff'
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Voice Instruction */}
                            <div style={{ marginTop: isCanvasMode ? '0px' : '20px', borderTop: isCanvasMode ? 'none' : '1px solid rgba(255,255,255,0.08)', paddingTop: isCanvasMode ? '0px' : '14px' }}>
                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', marginBottom: '10px' }}>
                                    Voice Instruction
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {!isRecording ? (
                                        <button
                                            onClick={startRecording}
                                            className="btn-pro"
                                            title="Record Voice Instruction"
                                            style={{
                                                padding: '7px 12px',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '7px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.16)',
                                                color: '#93c5fd',
                                                borderColor: 'rgba(59, 130, 246, 0.4)',
                                                fontWeight: 700
                                            }}
                                        >
                                            <Mic size={15} /> Record Audio
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopRecording}
                                            className="btn-pro"
                                            title="Stop Voice Recording"
                                            style={{
                                                padding: '7px 12px',
                                                fontSize: '0.75rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '7px',
                                                backgroundColor: 'rgba(239, 68, 68, 0.24)',
                                                color: '#fca5a5',
                                                borderColor: 'rgba(239, 68, 68, 0.5)',
                                                fontWeight: 700
                                            }}
                                        >
                                            <Square size={15} /> Stop Recording
                                        </button>
                                    )}

                                    {step.voiceInstruction && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <audio src={step.voiceInstruction} controls style={{ height: '30px', scale: '0.8' }} />
                                            <button
                                                onClick={() => handleStepUpdate({ voiceInstruction: null })}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                                                title="Delete recording"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Markup Dialog */}
                <ImageMarkupDialog
                    isOpen={showMarkup}
                    onClose={() => setShowMarkup(false)}
                    imageSrc={mainImage}
                    onSave={handleMarkupSave}
                />
            </div>
        </div>
    );
};

const bulletButtonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: '600',
    transition: 'all 0.2s'
};

const getBorderColor = (type) => {
    switch (type) {
        case 'note': return '#2563eb';
        case 'warning': return '#eab308';
        case 'caution': return '#ef4444';
        default: return 'rgba(255, 255, 255, 0.4)';
    }
};

export default StepEditor;
