import React from 'react';
import {
    Plus, Trash2, Wrench, Package, ShieldAlert,
    Clock, Gauge, Link as LinkIcon, FileCheck,
    AlertTriangle, Camera, CheckSquare
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const GuideDetails = ({ guide, onChange }) => {
    const { t } = useLanguage();

    const handleChange = (field, value) => {
        onChange({ ...guide, [field]: value });
    };

    const handleTemplateFieldChange = (key, index, field, value) => {
        const newList = [...(guide.templateFields?.[key] || [])];
        newList[index] = { ...newList[index], [field]: value };
        onChange({
            ...guide,
            templateFields: { ...guide.templateFields, [key]: newList }
        });
    };

    const addItem = (key, defaultObj) => {
        const newList = [...(guide.templateFields?.[key] || []), defaultObj];
        onChange({
            ...guide,
            templateFields: { ...guide.templateFields, [key]: newList }
        });
    };

    const removeItem = (key, index) => {
        const newList = (guide.templateFields?.[key] || []).filter((_, i) => i !== index);
        onChange({
            ...guide,
            templateFields: { ...guide.templateFields, [key]: newList }
        });
    };

    const sectionStyle = {
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: '16px',
        padding: '28px',
        marginBottom: '24px'
    };

    const labelStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.72rem',
        fontWeight: '900',
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '16px'
    };

    const inputStyle = {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '12px 16px',
        color: '#fff',
        fontSize: '0.9rem',
        outline: 'none',
        width: '100%',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
    };

    const itemRowStyle = {
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '12px',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
    };

    const PPE_OPTIONS = [
        { id: 'safety_glasses', label: 'Safety Glasses', icon: '🕶️' },
        { id: 'gloves', label: 'Gloves', icon: '🧤' },
        { id: 'ear_protection', label: 'Ear Protection', icon: '🎧' },
        { id: 'mask', label: 'Face Mask', icon: '😷' },
        { id: 'boots', label: 'Safety Boots', icon: '🥾' },
    ];

    const togglePpe = (id) => {
        const currentPpe = guide.templateFields?.ppe || [];
        const newList = currentPpe.includes(id)
            ? currentPpe.filter(item => item !== id)
            : [...currentPpe, id];

        onChange({
            ...guide,
            templateFields: { ...guide.templateFields, ppe: newList }
        });
    };

    return (
        <div style={{ width: '100%', animation: 'fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '32px' }}>

                {/* Left Column: Tools & Parts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Tools Section */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ ...labelStyle, marginBottom: 0 }}><Wrench size={16} color="#3b82f6" /> Required Tools</div>
                            <button
                                onClick={() => addItem('tools', { name: '', notes: '', image: null })}
                                className="btn-pro"
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: '#60a5fa',
                                    border: '1px solid rgba(59, 130, 246, 0.2)'
                                }}
                            >
                                <Plus size={14} /> Add Tool
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(guide.templateFields?.tools || []).map((tool, idx) => (
                                <div key={idx} style={itemRowStyle}>
                                    <div style={{ flex: 1.5 }}>
                                        <input
                                            value={tool.name}
                                            onChange={(e) => handleTemplateFieldChange('tools', idx, 'name', e.target.value)}
                                            placeholder="Tool Name"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ flex: 2 }}>
                                        <input
                                            value={tool.notes}
                                            onChange={(e) => handleTemplateFieldChange('tools', idx, 'notes', e.target.value)}
                                            placeholder="Notes (optional)"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <button
                                        onClick={() => removeItem('tools', idx)}
                                        style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#f87171', cursor: 'pointer', padding: '12px', borderRadius: '12px' }}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                            {(guide.templateFields?.tools || []).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                    No tools listed. Click "Add Tool" to begin.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Parts Section */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ ...labelStyle, marginBottom: 0 }}><Package size={16} color="#10b981" /> Required Parts</div>
                            <button
                                onClick={() => addItem('parts', { name: '', quantity: 1, partNumber: '', notes: '' })}
                                className="btn-pro"
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    color: '#34d399',
                                    border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}
                            >
                                <Plus size={14} /> Add Part
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {(guide.templateFields?.parts || []).map((part, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    padding: '16px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                        <div style={{ flex: 3 }}>
                                            <input
                                                value={part.name}
                                                onChange={(e) => handleTemplateFieldChange('parts', idx, 'name', e.target.value)}
                                                placeholder="Part Name"
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                type="number"
                                                value={part.quantity}
                                                onChange={(e) => handleTemplateFieldChange('parts', idx, 'quantity', e.target.value)}
                                                placeholder="Qty"
                                                style={{ ...inputStyle, textAlign: 'center' }}
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeItem('parts', idx)}
                                            style={{ background: 'rgba(239, 68, 68, 0.05)', border: 'none', color: '#f87171', cursor: 'pointer', padding: '12px', borderRadius: '12px' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <input
                                                value={part.partNumber}
                                                onChange={(e) => handleTemplateFieldChange('parts', idx, 'partNumber', e.target.value)}
                                                placeholder="Part Number"
                                                style={{ ...inputStyle, fontSize: '0.8rem', opacity: 0.8 }}
                                            />
                                        </div>
                                        <div style={{ flex: 2 }}>
                                            <input
                                                value={part.notes}
                                                onChange={(e) => handleTemplateFieldChange('parts', idx, 'notes', e.target.value)}
                                                placeholder="Part Notes"
                                                style={{ ...inputStyle, fontSize: '0.8rem', opacity: 0.8 }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(guide.templateFields?.parts || []).length === 0 && (
                                <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.2)', fontSize: '0.85rem', border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                                    No parts listed. Click "Add Part" to begin.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: PPE, Difficulty, Time */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* PPE Section */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}><ShieldAlert size={16} color="#f59e0b" /> Required Safety Gear (PPE)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                            {PPE_OPTIONS.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => togglePpe(opt.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 20px',
                                        borderRadius: '14px',
                                        border: '1px solid',
                                        borderColor: (guide.templateFields?.ppe || []).includes(opt.id) ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.08)',
                                        background: (guide.templateFields?.ppe || []).includes(opt.id) ? 'rgba(245, 158, 11, 0.08)' : 'rgba(255,255,255,0.02)',
                                        color: (guide.templateFields?.ppe || []).includes(opt.id) ? '#fbbf24' : 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                        fontSize: '0.85rem',
                                        fontWeight: '700'
                                    }}
                                >
                                    <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Difficulty & Time Section */}
                    <div style={sectionStyle}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                            <div>
                                <div style={labelStyle}><Gauge size={16} color="#8b5cf6" /> Difficulty</div>
                                <select
                                    value={guide.difficulty || 'Moderate'}
                                    onChange={(e) => handleChange('difficulty', e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="Very Easy">Very Easy</option>
                                    <option value="Easy">Easy</option>
                                    <option value="Moderate">Moderate</option>
                                    <option value="Difficult">Difficult</option>
                                    <option value="Very Difficult">Very Difficult</option>
                                </select>
                            </div>
                            <div>
                                <div style={labelStyle}><Clock size={16} color="#ec4899" /> Time Required</div>
                                <input
                                    value={guide.timeRequired || ''}
                                    onChange={(e) => handleChange('timeRequired', e.target.value)}
                                    placeholder="e.g. 25 minutes"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Prerequisites & External Links */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}><LinkIcon size={16} color="#06b6d4" /> Prerequisites</div>
                        <textarea
                            value={guide.prerequisites || ''}
                            onChange={(e) => handleChange('prerequisites', e.target.value)}
                            placeholder="List any guides or knowledge needed before starting..."
                            style={{ ...inputStyle, minHeight: '100px', resize: 'vertical', lineHeight: '1.6' }}
                        />
                    </div>

                    {/* Document References */}
                    <div style={sectionStyle}>
                        <div style={labelStyle}><FileCheck size={16} color="#22c55e" /> Document References</div>
                        <div style={{ position: 'relative' }}>
                            <input
                                value={guide.documentNumber || ''}
                                onChange={(e) => handleChange('documentNumber', e.target.value)}
                                placeholder="Link to external PDF or Reference #"
                                style={{ ...inputStyle, paddingLeft: '44px' }}
                            />
                            <AlertTriangle size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3, color: '#f59e0b' }} />
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default GuideDetails;
