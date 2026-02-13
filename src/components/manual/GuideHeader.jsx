import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus, ChevronRight, ChevronDown, FileText, Settings2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const SortableItem = ({ id, children, isEditing, onRemove, onLabelChange, label }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div style={{
                position: 'relative',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: isDragging ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: isDragging ? '1px solid rgba(37, 99, 235, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                transition: 'all 0.2s ease',
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : 'none'
            }}>
                {isEditing && (
                    <>
                        <div
                            {...attributes}
                            {...listeners}
                            style={{
                                position: 'absolute',
                                left: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                cursor: 'grab',
                                color: 'rgba(255, 255, 255, 0.3)',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                zIndex: 10
                            }}
                        >
                            <GripVertical size={16} />
                        </div>
                        <button
                            onClick={() => onRemove(id)}
                            style={{
                                position: 'absolute',
                                right: '-10px',
                                top: '-10px',
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 20,
                                boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                            }}
                        >
                            <X size={12} />
                        </button>
                    </>
                )}

                <div style={{ paddingLeft: isEditing ? '24px' : '0' }}>
                    {isEditing ? (
                        <div>
                            <input
                                value={label}
                                onChange={(e) => onLabelChange(id, e.target.value)}
                                style={{
                                    fontSize: '0.65rem',
                                    fontWeight: '900',
                                    color: 'rgba(255, 255, 255, 0.4)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    width: '100%',
                                    marginBottom: '8px',
                                    outline: 'none'
                                }}
                            />
                            {children}
                        </div>
                    ) : (
                        children
                    )}
                </div>
            </div>
        </div>
    );
};

const GuideHeader = ({ headerInfo, onChange }) => {
    const { t } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditingLayout, setIsEditingLayout] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleChange = (field, value) => {
        onChange({ ...headerInfo, [field]: value });
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = headerInfo.headerOrder.findIndex(item => item.id === active.id);
            const newIndex = headerInfo.headerOrder.findIndex(item => item.id === over.id);

            const newOrder = arrayMove(headerInfo.headerOrder, oldIndex, newIndex);
            onChange({ ...headerInfo, headerOrder: newOrder });
        }
    };

    const handleRemoveField = (id) => {
        const newOrder = headerInfo.headerOrder.filter(item => item.id !== id);
        onChange({ ...headerInfo, headerOrder: newOrder });
    };

    const handleLabelChange = (id, newLabel) => {
        const newOrder = headerInfo.headerOrder.map(item =>
            item.id === id ? { ...item, label: newLabel } : item
        );
        onChange({ ...headerInfo, headerOrder: newOrder });
    };

    const handleAddField = () => {
        const newId = `custom_${Math.random().toString(36).substr(2, 5)}`;
        const newOrder = [...headerInfo.headerOrder, { id: newId, label: t('manual.newField') }];
        onChange({ ...headerInfo, headerOrder: newOrder });
    };

    const renderInput = (field) => {
        const { id, label } = field;

        switch (id) {
            case 'documentNumber':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            value={headerInfo.documentNumber || ''}
                            onChange={(e) => handleChange('documentNumber', e.target.value)}
                            placeholder="DOC-001"
                            style={inputStyle}
                        />
                    </div>
                );
            case 'version':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            value={headerInfo.version || '1.0'}
                            onChange={(e) => handleChange('version', e.target.value)}
                            placeholder="1.0"
                            style={inputStyle}
                        />
                    </div>
                );
            case 'status':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <select
                            value={headerInfo.status || 'Draft'}
                            onChange={(e) => handleChange('status', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="Draft">{t('manual.statuses.draft') || 'Draft'}</option>
                            <option value="Proposed">{t('manual.statuses.proposed') || 'Proposed'}</option>
                            <option value="In Review">{t('manual.statuses.review') || 'In Review'}</option>
                            <option value="Approved">{t('manual.statuses.approved') || 'Approved'}</option>
                            <option value="Released">{t('manual.statuses.released') || 'Released'}</option>
                        </select>
                    </div>
                );
            case 'author':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            value={headerInfo.author || ''}
                            onChange={(e) => handleChange('author', e.target.value)}
                            placeholder={t('manual.author') || "Author Name"}
                            style={inputStyle}
                        />
                    </div>
                );
            case 'revisionDate':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            type="date"
                            value={headerInfo.revisionDate || ''}
                            onChange={(e) => handleChange('revisionDate', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                );
            case 'effectiveDate':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            type="date"
                            value={headerInfo.effectiveDate || ''}
                            onChange={(e) => handleChange('effectiveDate', e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                );
            case 'difficulty':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <select
                            value={headerInfo.difficulty}
                            onChange={(e) => handleChange('difficulty', e.target.value)}
                            style={inputStyle}
                        >
                            <option value="Very Easy">{t('manual.difficulties.veryEasy') || 'Very Easy'}</option>
                            <option value="Easy">{t('manual.difficulties.easy') || 'Easy'}</option>
                            <option value="Moderate">{t('manual.difficulties.moderate') || 'Moderate'}</option>
                            <option value="Difficult">{t('manual.difficulties.difficult') || 'Difficult'}</option>
                            <option value="Very Difficult">{t('manual.difficulties.veryDifficult') || 'Very Difficult'}</option>
                        </select>
                    </div>
                );
            case 'timeRequired':
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            value={headerInfo.timeRequired}
                            onChange={(e) => handleChange('timeRequired', e.target.value)}
                            placeholder="e.g. 10 - 20 minutes"
                            style={inputStyle}
                        />
                    </div>
                );
            default:
                // Handle custom fields
                return (
                    <div>
                        {!isEditingLayout && <label style={labelStyle}>{label}</label>}
                        <input
                            value={headerInfo[id] || ''}
                            onChange={(e) => handleChange(id, e.target.value)}
                            placeholder={t('manual.enterValue')}
                            style={inputStyle}
                        />
                    </div>
                );
        }
    };

    return (
        <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Collapsible Header Bar */}
            <div
                style={{
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    borderRadius: '12px 12px 0 0',
                    transition: 'all 0.2s'
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </div>
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#60a5fa'
                    }}>
                        <FileText size={18} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700', color: '#fff', fontSize: '1rem', letterSpacing: '-0.01em' }}>
                            {t('manual.documentInfo') || 'Document Information'}
                        </span>
                        {!isExpanded && (
                            <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.75rem' }}>
                                {headerInfo.documentNumber || (t('manual.noDocNumber') || 'No Doc Number')} • {headerInfo.status || 'Draft'}
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {isExpanded && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingLayout(!isEditingLayout);
                            }}
                            className="btn-pro"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: isEditingLayout ? 'rgba(37, 99, 235, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                color: isEditingLayout ? '#60a5fa' : 'white',
                                borderColor: isEditingLayout ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                padding: '6px 14px',
                                fontSize: '0.75rem',
                                lineHeight: '1'
                            }}
                        >
                            {isEditingLayout ? <><CheckCircle2 size={14} /> <span>{t('manual.finish')}</span></> : <><Settings2 size={14} /> <span>{t('manual.layout')}</span></>}
                        </button>
                    )}
                </div>
            </div>

            {/* Expandable Content */}
            {isExpanded && (
                <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
                    {/* Main Title */}
                    <div style={{ marginBottom: '24px' }}>
                        <input
                            value={headerInfo.title}
                            onChange={(e) => handleChange('title', e.target.value)}
                            placeholder={t('manual.workInstructionsTitle')}
                            style={{
                                width: '100%',
                                fontSize: '2rem',
                                fontWeight: '900',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: '2px solid rgba(255, 255, 255, 0.1)',
                                color: '#fff',
                                padding: '8px 0',
                                outline: 'none',
                                letterSpacing: '-0.02em'
                            }}
                        />
                    </div>

                    {/* Document Metadata Grid - Now Sortable */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={headerInfo.headerOrder.map(item => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                                gap: '16px',
                                marginBottom: '24px'
                            }}>
                                {headerInfo.headerOrder.map((field) => (
                                    <SortableItem
                                        key={field.id}
                                        id={field.id}
                                        isEditing={isEditingLayout}
                                        label={field.label}
                                        onRemove={handleRemoveField}
                                        onLabelChange={handleLabelChange}
                                    >
                                        {renderInput(field)}
                                    </SortableItem>
                                ))}

                                {isEditingLayout && (
                                    <div
                                        onClick={handleAddField}
                                        style={{
                                            border: '2px dashed rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '24px',
                                            cursor: 'pointer',
                                            color: 'rgba(255, 255, 255, 0.3)',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.5)';
                                            e.currentTarget.style.color = '#60a5fa';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                                        }}
                                    >
                                        <Plus size={24} />
                                        <span style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: '700' }}>{t('manual.addField')}</span>
                                    </div>
                                )}
                            </div>
                        </SortableContext>
                    </DndContext>

                    {/* Description/Summary */}
                    <div className="glass-panel" style={{ padding: '20px', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <FileText size={14} style={{ color: '#60a5fa' }} />
                            <label style={labelStyle}>{t('manual.description') || 'Description / Summary'}</label>
                        </div>
                        <textarea
                            value={headerInfo.summary}
                            onChange={(e) => handleChange('summary', e.target.value)}
                            placeholder={t('manual.summaryPlaceholder')}
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                padding: '16px',
                                fontSize: '0.95rem',
                                resize: 'vertical',
                                minHeight: '80px',
                                outline: 'none',
                                lineHeight: '1.6'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const labelStyle = {
    display: 'block',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.7rem',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
};

const inputStyle = {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#fff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s'
};

export default GuideHeader;
