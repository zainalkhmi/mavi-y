import React from 'react';
import { Plus, Trash2, List, Pencil, ArrowUp, ArrowDown, GripVertical, Zap } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const StepList = ({ steps, activeStepId, onSelectStep, onAddStep, onDeleteStep, onEditStep, onReorderStep, onImportFromAnalysis, stepStatuses = {}, horizontal = false }) => {
    const { t } = useLanguage();
    const [draggedIndex, setDraggedIndex] = React.useState(null);
    const iconActionButtonStyle = {
        width: '22px',
        height: '22px',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255, 255, 255, 0.58)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'all 0.2s ease'
    };
    const idCounts = React.useMemo(() => {
        const counts = new Map();
        (steps || []).forEach((step) => {
            const id = step?.id;
            if (!id) return;
            counts.set(id, (counts.get(id) || 0) + 1);
        });
        return counts;
    }, [steps]);

    const getStatusMeta = (stepId) => {
        const status = stepStatuses?.[stepId] || 'not_started';
        if (status === 'completed') return { label: 'Done', color: '#10b981' };
        if (status === 'in_progress') return { label: 'Doing', color: '#f59e0b' };
        return { label: 'Todo', color: 'rgba(255,255,255,0.35)' };
    };

    if (horizontal) {
        return (
            <div style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '0 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                height: '54px',
                overflow: 'hidden'
            }}>
                <div style={{
                    flex: 1,
                    minWidth: 0,
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    <div style={{ display: 'flex', gap: '4px', paddingRight: '12px', width: 'max-content' }}>
                        {steps.map((step, index) => {
                            const statusMeta = getStatusMeta(step?.id);
                            return (
                                <div
                                    key={
                                        step?.id && idCounts.get(step.id) === 1
                                            ? `h-step-${step.id}`
                                            : `h-step-${step?.id || 'missing-id'}-${index}`
                                    }
                                    draggable
                                    onDragStart={() => setDraggedIndex(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => {
                                        if (draggedIndex === null || draggedIndex === index) return;
                                        onReorderStep?.(draggedIndex, index);
                                        setDraggedIndex(null);
                                    }}
                                    onDragEnd={() => setDraggedIndex(null)}
                                    onClick={() => onSelectStep(step.id)}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: activeStepId === step.id ? 'rgba(37, 99, 235, 0.2)' : 'transparent',
                                        borderRadius: '8px 8px 0 0',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        border: '1px solid',
                                        borderColor: activeStepId === step.id ? 'rgba(37, 99, 235, 0.4)' : 'transparent',
                                        borderBottom: activeStepId === step.id ? '2px solid #3b82f6' : 'transparent',
                                        transition: 'all 0.2s ease',
                                        whiteSpace: 'nowrap',
                                        minWidth: '100px',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <GripVertical size={12} style={{ color: 'rgba(255,255,255,0.35)' }} />
                                    <div style={{
                                        width: '22px',
                                        height: '22px',
                                        background: activeStepId === step.id ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.7rem',
                                        color: '#fff',
                                        fontWeight: 'bold'
                                    }}>
                                        {index + 1}
                                    </div>
                                    <span style={{
                                        fontWeight: activeStepId === step.id ? '700' : '500',
                                        color: activeStepId === step.id ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '0.8rem'
                                    }}>
                                        {step.title ? (step.title.length > 15 ? step.title.substring(0, 12) + '...' : step.title) : `Step ${index + 1}`}
                                    </span>
                                    <span style={{
                                        fontSize: '0.62rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.03em',
                                        textTransform: 'uppercase',
                                        color: statusMeta.color,
                                        border: `1px solid ${statusMeta.color}`,
                                        borderRadius: '999px',
                                        padding: '1px 6px'
                                    }}>
                                        {statusMeta.label}
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (index > 0) onReorderStep?.(index, index - 1);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255, 255, 255, 0.45)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px'
                                            }}
                                            title="Move Left"
                                        >
                                            <ArrowUp size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (index < steps.length - 1) onReorderStep?.(index, index + 1);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255, 255, 255, 0.45)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px'
                                            }}
                                            title="Move Right"
                                        >
                                            <ArrowDown size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditStep?.(step.id);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255, 255, 255, 0.45)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px'
                                            }}
                                            title={t('common.edit') || 'Edit Step'}
                                        >
                                            <Pencil size={12} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteStep?.(step.id);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'rgba(255, 255, 255, 0.45)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                padding: '2px'
                                            }}
                                            title={t('common.delete') || 'Delete Step'}
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    marginLeft: '6px',
                    padding: '4px 8px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'linear-gradient(90deg, rgba(11,15,25,0.85), rgba(11,15,25,0.95))'
                }}>
                    <button
                        onClick={onAddStep}
                        className="btn-pro"
                        style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(37,99,235,0.2))',
                            color: '#bfdbfe',
                            borderColor: 'rgba(96, 165, 250, 0.45)',
                            padding: '6px',
                            fontSize: '0.75rem',
                            height: '32px',
                            width: '32px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            flexShrink: 0,
                            borderRadius: '8px'
                        }}
                        title={t('manual.addStep') || 'Add Step'}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={onImportFromAnalysis}
                        className="btn-pro"
                        title="Generate from Analysis"
                        style={{
                            background: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(202,138,4,0.16))',
                            color: '#fde68a',
                            borderColor: 'rgba(252, 211, 77, 0.42)',
                            padding: '6px',
                            fontSize: '0.75rem',
                            height: '32px',
                            width: '32px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            flexShrink: 0,
                            borderRadius: '8px'
                        }}
                    >
                        <Zap size={14} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'transparent'
        }}>
            <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <List size={18} style={{ color: '#60a5fa' }} />
                    <span style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem', letterSpacing: '0.02em' }}>{t('common.steps') || 'STEPS'}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                        onClick={onAddStep}
                        className="btn-pro"
                        title={t('manual.addStep') || 'Add Step'}
                        style={{
                            background: 'linear-gradient(135deg, rgba(59,130,246,0.22), rgba(37,99,235,0.2))',
                            color: '#bfdbfe',
                            borderColor: 'rgba(96, 165, 250, 0.42)',
                            padding: '6px',
                            width: '32px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            borderRadius: '8px'
                        }}
                    >
                        <Plus size={14} />
                    </button>
                    <button
                        onClick={onImportFromAnalysis}
                        className="btn-pro"
                        title="Generate from Analysis"
                        style={{
                            background: 'linear-gradient(135deg, rgba(234,179,8,0.18), rgba(202,138,4,0.16))',
                            color: '#fde68a',
                            borderColor: 'rgba(252, 211, 77, 0.42)',
                            padding: '6px',
                            width: '32px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            borderRadius: '8px'
                        }}
                    >
                        <Zap size={14} />
                    </button>
                </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map((step, index) => {
                    const statusMeta = getStatusMeta(step?.id);
                    return (
                        <div
                            key={
                                step?.id && idCounts.get(step.id) === 1
                                    ? `step-${step.id}`
                                    : `step-${step?.id || 'missing-id'}-${index}`
                            }
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                                if (draggedIndex === null || draggedIndex === index) return;
                                onReorderStep?.(draggedIndex, index);
                                setDraggedIndex(null);
                            }}
                            onDragEnd={() => setDraggedIndex(null)}
                            onClick={() => onSelectStep(step.id)}
                            style={{
                                padding: '12px',
                                backgroundColor: activeStepId === step.id ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                border: '1px solid',
                                borderColor: activeStepId === step.id ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <GripVertical size={14} style={{ color: 'rgba(255,255,255,0.35)' }} />
                            <div style={{
                                width: '26px',
                                height: '26px',
                                background: activeStepId === step.id ? '#2563eb' : 'rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                color: '#fff',
                                fontWeight: 'bold',
                                boxShadow: activeStepId === step.id ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none'
                            }}>
                                {index + 1}
                            </div>
                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{
                                    fontWeight: activeStepId === step.id ? '700' : '500',
                                    color: activeStepId === step.id ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                                    fontSize: '0.85rem',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {step.title || t('manual.untitledStep') || 'Untitled Step'}
                                </div>
                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '0.65rem',
                                    color: statusMeta.color,
                                    textTransform: 'uppercase',
                                    fontWeight: 800,
                                    letterSpacing: '0.04em'
                                }}>
                                    {statusMeta.label}
                                </div>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (index > 0) onReorderStep?.(index, index - 1);
                                }}
                                style={iconActionButtonStyle}
                                title="Move Up"
                            >
                                <ArrowUp size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (index < steps.length - 1) onReorderStep?.(index, index + 1);
                                }}
                                style={iconActionButtonStyle}
                                title="Move Down"
                            >
                                <ArrowDown size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEditStep?.(step.id); }}
                                style={iconActionButtonStyle}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#93c5fd';
                                    e.currentTarget.style.borderColor = 'rgba(147, 197, 253, 0.45)';
                                    e.currentTarget.style.background = 'rgba(37,99,235,0.2)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.58)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                }}
                                title={t('common.edit') || 'Edit Step'}
                            >
                                <Pencil size={14} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteStep(step.id); }}
                                style={iconActionButtonStyle}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.color = '#fca5a5';
                                    e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.45)';
                                    e.currentTarget.style.background = 'rgba(239,68,68,0.18)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.58)';
                                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                                }}
                                title={t('common.delete') || 'Delete Step'}
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default StepList;
