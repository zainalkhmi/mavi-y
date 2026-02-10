import React from 'react';
import { Plus, Trash2, List } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

const StepList = ({ steps, activeStepId, onSelectStep, onAddStep, onDeleteStep, onReorderStep }) => {
    const { t } = useLanguage();
    return (
        <div style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: 'transparent'
        }}>
            <div style={{
                padding: '16px',
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
                <button
                    onClick={onAddStep}
                    className="btn-pro"
                    style={{
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        color: '#60a5fa',
                        borderColor: 'rgba(37, 99, 235, 0.3)',
                        padding: '6px 12px',
                        fontSize: '0.75rem'
                    }}
                >
                    <Plus size={14} />
                    {t('common.add') || 'Add'}
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {steps.map((step, index) => (
                    <div
                        key={step.id}
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
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDeleteStep(step.id); }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'rgba(255, 255, 255, 0.3)',
                                cursor: 'pointer',
                                transition: 'color 0.2s',
                                padding: '4px'
                            }}
                            onMouseEnter={(e) => e.target.style.color = '#ef4444'}
                            onMouseLeave={(e) => e.target.style.color = 'rgba(255, 255, 255, 0.3)'}
                            title={t('common.delete') || 'Delete Step'}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StepList;
