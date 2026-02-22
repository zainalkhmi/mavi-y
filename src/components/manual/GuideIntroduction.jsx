import React from 'react';
import {
    BookOpen, Tag, Flag, Shield, Lock, Trash2,
    ChevronDown, Info, AlertTriangle, Users, Eye, EyeOff
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const GuideIntroduction = ({ guide, onChange, onDelete }) => {
    const { t } = useLanguage();

    const handleChange = (field, value) => {
        onChange({ ...guide, [field]: value });
    };

    const handleAccessControl = (field, value) => {
        const currentAccess = guide.accessControl || { isPublic: true, teams: [], individuals: [] };
        handleChange('accessControl', { ...currentAccess, [field]: value });
    };

    const sectionStyle = {
        marginBottom: '24px',
        padding: '24px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    };

    const labelStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.75rem',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#60a5fa',
        marginBottom: '12px'
    };

    const inputStyle = {
        width: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '10px',
        padding: '12px 16px',
        fontSize: '0.95rem',
        outline: 'none',
        transition: 'all 0.2s',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
    };

    const GUIDE_TYPES = ['Replacement', 'Disassembly', 'Teardown', 'Technique'];
    const FLAG_OPTIONS = ['In Progress', 'Peer Review', 'Technician Review', 'Released'];

    return (
        <div style={{ padding: '0 0 40px 0', width: '100%', animation: 'fadeIn 0.4s ease' }}>
            <div style={{ marginBottom: '32px', textAlign: 'left', borderLeft: '4px solid #3b82f6', paddingLeft: '20px' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: '900', marginBottom: '8px', color: '#fff', letterSpacing: '-0.02em' }}>Guide Introduction</h1>
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', margin: 0, fontSize: '1rem', lineHeight: '1.5' }}>
                    Configure the foundational details of your guide, including its type, visibility, and organizational tags.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                {/* Left Column: Basic Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={sectionStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}><BookOpen size={14} /> Guide Type</label>
                                <div style={{ position: 'relative' }}>
                                    <select
                                        value={guide.guideType || 'Replacement'}
                                        onChange={(e) => handleChange('guideType', e.target.value)}
                                        style={inputStyle}
                                    >
                                        {GUIDE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                                </div>
                            </div>
                            <div>
                                <label style={labelStyle}><Tag size={14} /> Category</label>
                                <input
                                    value={guide.category || ''}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    placeholder="e.g. Razor Scooter"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <label style={labelStyle}><Info size={14} /> Summary</label>
                        <textarea
                            value={guide.summary || ''}
                            onChange={(e) => handleChange('summary', e.target.value)}
                            placeholder="Briefly describe your guide for search results."
                            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: '1.6' }}
                        />
                        <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.35)', fontStyle: 'italic', display: 'flex', gap: '6px' }}>
                            <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                            <span>Keep it succinct! This text appears as a quick blurb in search previews.</span>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <label style={labelStyle}><BookOpen size={14} /> Full Introduction</label>
                        <textarea
                            value={guide.introductionText || ''}
                            onChange={(e) => handleChange('introductionText', e.target.value)}
                            placeholder="Advice, anecdotes, and important safety protocols..."
                            style={{ ...inputStyle, minHeight: '200px', resize: 'vertical', lineHeight: '1.6' }}
                        />
                    </div>
                </div>

                {/* Right Column: Settings & Access */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={sectionStyle}>
                        <label style={labelStyle}><Flag size={14} /> Progress Status</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            {FLAG_OPTIONS.map(flag => {
                                const isActive = (guide.flags || ['In Progress']).includes(flag);
                                return (
                                    <button
                                        key={flag}
                                        onClick={() => {
                                            const currentFlags = guide.flags || ['In Progress'];
                                            const newFlags = isActive
                                                ? currentFlags.filter(f => f !== flag)
                                                : [...currentFlags, flag];
                                            handleChange('flags', newFlags);
                                        }}
                                        style={{
                                            padding: '12px',
                                            borderRadius: '12px',
                                            fontSize: '0.85rem',
                                            fontWeight: '700',
                                            backgroundColor: isActive ? 'rgba(96, 165, 250, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                            color: isActive ? '#60a5fa' : 'rgba(255, 255, 255, 0.4)',
                                            border: `1px solid ${isActive ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {flag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <label style={labelStyle}><Lock size={14} /> Permissions & Access</label>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <button
                                onClick={() => handleAccessControl('isPublic', true)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: (guide.accessControl?.isPublic !== false) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    color: (guide.accessControl?.isPublic !== false) ? '#10b981' : 'rgba(255, 255, 255, 0.4)',
                                    border: `1px solid ${(guide.accessControl?.isPublic !== false) ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <Eye size={20} />
                                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Public</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.6, textAlign: 'center' }}>Visible to everyone once published</span>
                            </button>
                            <button
                                onClick={() => handleAccessControl('isPublic', false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '8px',
                                    backgroundColor: guide.accessControl?.isPublic === false ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                    color: guide.accessControl?.isPublic === false ? '#ef4444' : 'rgba(255, 255, 255, 0.4)',
                                    border: `1px solid ${guide.accessControl?.isPublic === false ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <EyeOff size={20} />
                                <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>Private</span>
                                <span style={{ fontSize: '0.65rem', opacity: 0.6, textAlign: 'center' }}>Restricted to AUTHORS & ADMINS</span>
                            </button>
                        </div>
                    </div>

                    <div style={sectionStyle}>
                        <label style={labelStyle}><Tag size={14} /> Keywords & Tags</label>
                        <input
                            placeholder="Add search tags (press Enter)"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const val = e.target.value.trim();
                                    if (val) {
                                        const currentTags = guide.tags || [];
                                        if (!currentTags.includes(val)) {
                                            handleChange('tags', [...currentTags, val]);
                                        }
                                        e.target.value = '';
                                    }
                                }
                            }}
                            style={inputStyle}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                            {(guide.tags || []).map(tag => (
                                <div key={tag} style={{
                                    padding: '6px 12px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: 'rgba(255, 255, 255, 0.8)',
                                    fontSize: '0.8rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontWeight: '600'
                                }}>
                                    {tag}
                                    <X size={14} style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => handleChange('tags', guide.tags.filter(t => t !== tag))} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div style={{
                        ...sectionStyle,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        backgroundColor: 'rgba(239, 68, 68, 0.05)',
                        marginTop: 'auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                                <Trash2 size={24} />
                            </div>
                            <div>
                                <h4 style={{ color: '#ef4444', margin: '0 0 2px 0', fontSize: '1.1rem', fontWeight: '900' }}>Delete Guide</h4>
                                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem', margin: 0 }}>This action is permanent and cannot be undone.</p>
                            </div>
                        </div>
                        <button
                            onClick={onDelete}
                            className="btn-pro"
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#fca5a5',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                padding: '14px',
                                borderRadius: '12px',
                                fontWeight: '900',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            Confirm Deletion
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuideIntroduction;
