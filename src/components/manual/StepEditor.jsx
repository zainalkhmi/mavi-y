import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImageMarkupDialog from './ImageMarkupDialog';
import RichTextEditor from './RichTextEditor';
import {
    Sparkles, Eye, Zap, Image, Camera, Upload,
    Edit3, X, CheckCircle, Info, AlertTriangle, AlertCircle,
    Plus, MessageSquare, Trash2, Youtube, Bell,
    ChevronLeft, ChevronRight, EyeOff
} from 'lucide-react';

const StepEditor = ({
    step,
    onChange,
    onCaptureImage,
    onAiImprove,
    onAiGenerate,
    onAiGenerateFromVideo,
    isAiLoading,
    videoTime,
    activeImageIndex,
    setActiveImageIndex,
    onSave,
    globalVideoSrc // Added to support previewing global video clips per step
}) => {
    const { t, tt } = useLanguage();
    const [showMarkup, setShowMarkup] = useState(false);

    if (!step) return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.3)', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Edit3 size={32} />
            </div>
            <span style={{ fontWeight: '500' }}>{t('manual.selectStepToEdit')}</span>
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
        const next = [...dataCaptureFields];
        next[index] = {
            ...next[index],
            ...patch
        };
        handleStepUpdate({ questions: next });
    };

    const handleDeleteDataCaptureField = (index) => {
        const next = dataCaptureFields.filter((_, i) => i !== index);
        handleStepUpdate({ questions: next });
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
                        ) : mainImage ? (
                            <img src={mainImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Step Main" />
                        ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
                                <Image size={64} />
                            </div>
                        )}
                        {mainImage && (
                            <button
                                onClick={() => setShowMarkup(true)}
                                title="Edit Image / Markup"
                                style={{
                                    position: 'absolute',
                                    bottom: 16,
                                    right: 16,
                                    background: 'rgba(15, 23, 42, 0.8)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '8px',
                                    cursor: 'pointer',
                                    backdropFilter: 'blur(4px)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.8rem',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.8)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'}
                            >
                                <Sparkles size={14} style={{ color: '#60a5fa' }} />
                                Markup
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Column: Text & Instructions */}
                <div style={{ flex: '1.2' }}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                        <div style={{ marginTop: '8px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#333' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '12px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                                <RichTextEditor
                                    value={step.instructions}
                                    onChange={(html) => handleStepUpdate({ instructions: html })}
                                    placeholder="Enter instructions..."
                                />
                            </div>

                            {/* Toolbar */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', gap: '2px', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <button className="btn-icon" style={{ color: 'rgba(255,255,255,0.6)', padding: '4px' }}><ChevronLeft size={14} /></button>
                                    <button className="btn-icon" style={{ color: 'rgba(255,255,255,0.6)', padding: '4px' }}><ChevronRight size={14} /></button>
                                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
                                    <button className="btn-pro-tab" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleBulletAdd('step')}><Plus size={14} style={{ marginRight: '4px' }} />Step</button>
                                    <button className="btn-pro-tab" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleBulletAdd('note')} title="Add Note"><Info size={14} /></button>
                                    <button className="btn-pro-tab" style={{ padding: '4px 8px', fontSize: '0.7rem' }} onClick={() => handleBulletAdd('caution')} title="Add Caution"><AlertCircle size={14} /></button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', fontWeight: '600' }}>
                                        {(step.instructions || '').replace(/<[^>]*>/g, '').length}/350
                                    </div>
                                    <button
                                        className="btn-pro"
                                        onClick={onSave}
                                        style={{ padding: '6px 16px', fontSize: '0.8rem', backgroundColor: '#2563eb' }}
                                    >
                                        {tt('common.save', 'Save')}
                                    </button>
                                </div>
                            </div>

                            {/* Additional Bullets */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {(step.bullets || []).map((bullet, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                backgroundColor: getBulletColor(bullet),
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#fff',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}>
                                            {renderBulletIcon(bullet)}
                                        </button>
                                        <input
                                            value={bullet.text}
                                            onChange={(e) => handleBulletChange(idx, e.target.value)}
                                            style={{
                                                flex: 1,
                                                border: 'none',
                                                borderBottom: '1px dashed #ddd',
                                                background: 'transparent',
                                                padding: '4px 0',
                                                fontSize: '1rem',
                                                color: '#333'
                                            }}
                                            placeholder="Enter text..."
                                        />
                                        <input
                                            type="color"
                                            value={getBulletColor(bullet)}
                                            onChange={(e) => handleBulletColorChange(idx, e.target.value)}
                                            title="Bullet color"
                                            style={{ width: '28px', height: '24px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                                        />
                                        <button onClick={() => handleBulletDelete(idx)} style={{ color: '#ef4444', border: 'none', background: 'none' }}><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>

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
                                                onChange={(e) => onChange({ ...step, hideDataCapture: e.target.checked })}
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
                                        const fieldType = field?.type || 'text';
                                        const supportsOptions = fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox';
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
                                                        value={Array.isArray(field.options) ? field.options.join(', ') : ''}
                                                        onChange={(e) => {
                                                            const options = e.target.value
                                                                .split(',')
                                                                .map(opt => opt.trim())
                                                                .filter(Boolean);
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
        </div >
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
