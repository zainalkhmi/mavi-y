import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import ImageMarkupDialog from './ImageMarkupDialog';
import RichTextEditor from './RichTextEditor';
import {
    Sparkles, Eye, Zap, Image, Camera, Upload,
    Edit3, X, CheckCircle, Info, AlertTriangle, AlertCircle,
    Plus, Type, MessageSquare, Trash2, Video, Youtube
} from 'lucide-react';

const StepEditor = ({ step, onChange, onCaptureImage, onAiImprove, onAiGenerate, onAiGenerateFromVideo, isAiLoading, videoTime }) => {
    const { t } = useLanguage();
    const [showMarkup, setShowMarkup] = useState(false);

    if (!step) return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255, 255, 255, 0.3)', gap: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'rgba(255, 255, 255, 0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <Edit3 size={32} />
            </div>
            <span style={{ fontWeight: '500' }}>{t('manual.selectStepToEdit')}</span>
        </div>
    );

    const handleChange = (field, value) => {
        onChange(step.id, { ...step, [field]: value });
    };

    const handleBulletAdd = (type) => {
        const newBullet = { type, text: '' };
        handleChange('bullets', [...(step.bullets || []), newBullet]);
    };

    const handleBulletChange = (index, text) => {
        const newBullets = [...(step.bullets || [])];
        newBullets[index].text = text;
        handleChange('bullets', newBullets);
    };

    const handleBulletDelete = (index) => {
        const newBullets = [...(step.bullets || [])];
        newBullets.splice(index, 1);
        handleChange('bullets', newBullets);
    };

    const handleMarkupSave = (newDataUrl) => {
        handleChange('media', { ...step.media, url: newDataUrl });
    };

    return (
        <div style={{ flex: 1, padding: '0', overflowY: 'visible', backgroundColor: 'transparent', color: '#fff' }}>
            {/* Step Header */}
            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Type size={14} style={{ color: '#60a5fa' }} />
                    <label style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('manual.stepTitle') || 'Step Title'}
                    </label>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                    <input
                        value={step.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        className="pro-select"
                        style={{ flex: 1, padding: '12px 16px', fontSize: '1.25rem', fontWeight: '700', height: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}
                        placeholder={t('manual.enterTitle') || "Enter step title..."}
                    />
                    {onAiGenerateFromVideo && (
                        <button
                            onClick={() => onAiGenerateFromVideo(step.id, step.title)}
                            disabled={isAiLoading}
                            className="btn-pro"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                                color: 'white',
                                border: 'none',
                                padding: '0 20px',
                                opacity: isAiLoading ? 0.6 : 1,
                                height: 'auto',
                                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.2)'
                            }}
                            title={t('manual.generateFromVideo')}
                        >
                            {isAiLoading ? '...' : <><Eye size={18} /> <span>{t('manual.maviLook')}</span></>}
                        </button>
                    )}
                    {onAiGenerate && (
                        <button
                            onClick={() => onAiGenerate(step.id, step.title)}
                            disabled={isAiLoading || !step.title}
                            className="btn-pro"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                                color: 'white',
                                border: 'none',
                                padding: '0 20px',
                                opacity: (isAiLoading || !step.title) ? 0.6 : 1,
                                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                            }}
                            title={t('manual.generateFromTitle')}
                        >
                            {isAiLoading ? '...' : <><Zap size={18} /> <span>{t('manual.generateAI')}</span></>}
                        </button>
                    )}
                </div>
            </div>

            {/* Media Area */}
            <div style={{
                marginBottom: '32px',
                padding: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                textAlign: 'center',
                transition: 'all 0.3s ease'
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                    {[
                        { id: 'image', label: 'Image', icon: Image },
                        { id: 'video', label: 'Video Clip', icon: Video },
                        { id: 'youtube', label: 'YouTube', icon: Youtube }
                    ].map(type => (
                        <button
                            key={type.id}
                            onClick={() => handleChange('media', { ...step.media, type: type.id })}
                            className="btn-pro"
                            style={{
                                padding: '6px 16px',
                                fontSize: '0.75rem',
                                backgroundColor: step.media?.type === type.id || (!step.media?.type && type.id === 'image') ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.05)',
                                color: step.media?.type === type.id || (!step.media?.type && type.id === 'image') ? '#60a5fa' : 'rgba(255,255,255,0.6)',
                                borderColor: step.media?.type === type.id || (!step.media?.type && type.id === 'image') ? 'rgba(37, 99, 235, 0.3)' : 'transparent'
                            }}
                        >
                            <type.icon size={14} />
                            {type.label}
                        </button>
                    ))}
                </div>

                {(!step.media?.type || step.media.type === 'image') && (
                    <div style={{ padding: '20px', border: '2px dashed rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
                        {step.media && step.media.url ? (
                            <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
                                <img src={step.media.url} alt="Step Media" style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }} />
                                <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setShowMarkup(true)}
                                        className="btn-pro"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', padding: '6px 12px', fontSize: '0.75rem' }}
                                    >
                                        <Edit3 size={14} /> {t('manual.markup')}
                                    </button>
                                    <button
                                        onClick={() => handleChange('media', null)}
                                        className="btn-pro"
                                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.8)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', padding: '6px 12px' }}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px 0' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '16px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    margin: '0 auto 12px auto',
                                    color: 'rgba(255, 255, 255, 0.2)'
                                }}>
                                    <Image size={24} />
                                </div>
                                <p style={{ color: 'rgba(255, 255, 255, 0.4)', marginBottom: '16px', fontSize: '0.8rem' }}>{t('manual.dragDropMedia')}</p>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                    <button
                                        onClick={onCaptureImage}
                                        className="btn-pro"
                                        style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', fontSize: '0.8rem' }}
                                    >
                                        <Camera size={16} /> {t('manual.captureFrame')}
                                    </button>
                                    <label className="btn-pro" style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'white', display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                                        <Upload size={16} /> {t('common.upload') || 'Upload'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        handleChange('media', { type: 'image', url: event.target.result });
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step.media?.type === 'video' && (
                    <div style={{ padding: '20px', border: '2px dashed rgba(59, 130, 246, 0.2)', borderRadius: '12px', background: 'rgba(37, 99, 235, 0.02)' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px auto',
                            color: '#60a5fa'
                        }}>
                            <Video size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>Main Video Segment</h4>
                        <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', marginBottom: '16px' }}>
                            Uses the defined In/Out range from the source video player.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '1rem', fontWeight: '800', color: '#60a5fa' }}>
                            <div>In: {step.startTime || 0}s</div>
                            <div>Out: {Math.round(((step.startTime || 0) + (step.duration || 0)) * 10) / 10}s</div>
                        </div>
                    </div>
                )}

                {step.media?.type === 'youtube' && (
                    <div style={{ padding: '20px', border: '2px dashed rgba(239, 68, 68, 0.2)', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.02)' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 12px auto',
                            color: '#f87171'
                        }}>
                            <Youtube size={24} />
                        </div>
                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem' }}>YouTube Video</h4>
                        <input
                            value={step.media?.youtubeUrl || ''}
                            onChange={(e) => handleChange('media', { ...step.media, type: 'youtube', youtubeUrl: e.target.value })}
                            className="pro-select"
                            style={{ width: '100%', marginTop: '8px', padding: '10px', fontSize: '0.85rem' }}
                            placeholder="Enter YouTube URL (e.g., https://youtube.com/watch?v=...)"
                        />
                        {step.media?.youtubeUrl && (
                            <div style={{ marginTop: '16px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                Video will be embedded in preview mode.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Markup Dialog */}
            <ImageMarkupDialog
                isOpen={showMarkup}
                onClose={() => setShowMarkup(false)}
                imageSrc={step.media?.url}
                onSave={handleMarkupSave}
            />

            <div style={{ marginBottom: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <MessageSquare size={14} style={{ color: '#60a5fa' }} />
                        <label style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {t('manual.instructions') || 'Instructions'}
                        </label>
                    </div>
                    <div>
                        {onAiImprove && step.instructions && (
                            <button
                                onClick={() => onAiImprove(step.id, step)}
                                disabled={isAiLoading}
                                className="btn-pro"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                    color: '#60a5fa',
                                    borderColor: 'rgba(96, 165, 250, 0.2)',
                                    padding: '6px 14px',
                                    fontSize: '0.75rem',
                                    opacity: isAiLoading ? 0.6 : 1,
                                    lineHeight: '1'
                                }}
                            >
                                {isAiLoading ? t('manual.improving') : <><Sparkles size={14} /> <span>{t('manual.aiImprove')}</span></>}
                            </button>
                        )}
                    </div>
                </div>
                <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <RichTextEditor
                        value={step.instructions}
                        onChange={(html) => handleChange('instructions', html)}
                        placeholder={t('manual.instructionsPlaceholder')}
                    />
                </div>
            </div>

            {/* Bullets / Alerts */}
            <div style={{ paddingBottom: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Plus size={14} style={{ color: '#60a5fa' }} />
                    <label style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {t('manual.pointsAlerts') || 'Points & Alerts'}
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                    <button onClick={() => handleBulletAdd('step')} style={{ ...bulletButtonStyle, borderLeft: '4px solid rgba(255, 255, 255, 0.3)' }}><Plus size={14} /> {t('manual.step')}</button>
                    <button onClick={() => handleBulletAdd('note')} style={{ ...bulletButtonStyle, borderLeft: '4px solid #2563eb' }}><Info size={14} /> {t('manual.note')}</button>
                    <button onClick={() => handleBulletAdd('warning')} style={{ ...bulletButtonStyle, borderLeft: '4px solid #eab308' }}><AlertTriangle size={14} /> {t('manual.warning')}</button>
                    <button onClick={() => handleBulletAdd('caution')} style={{ ...bulletButtonStyle, borderLeft: '4px solid #ef4444' }}><AlertCircle size={14} /> {t('manual.caution')}</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(step.bullets || []).map((bullet, index) => (
                        <div key={index} style={{ display: 'flex', gap: '12px', alignItems: 'center', animation: 'fadeIn 0.4s ease' }}>
                            <div style={{
                                flex: 1,
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                borderLeft: `6px solid ${getBorderColor(bullet.type)}`,
                                transition: 'all 0.2s ease'
                            }}>
                                <div style={{ padding: '0 12px', color: getBorderColor(bullet.type), textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: '900', letterSpacing: '0.05em' }}>
                                    {bullet.type}
                                </div>
                                <input
                                    value={bullet.text}
                                    onChange={(e) => handleBulletChange(index, e.target.value)}
                                    style={{ flex: 1, padding: '12px', backgroundColor: 'transparent', border: 'none', color: '#fff', outline: 'none', fontSize: '0.9rem' }}
                                    placeholder={t('manual.enterBulletText', { type: bullet.type })}
                                />
                            </div>
                            <button
                                onClick={() => handleBulletDelete(index)}
                                style={{
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.2)'}
                                onMouseLeave={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
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
