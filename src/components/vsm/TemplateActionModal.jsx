import React from 'react';
import { X, RefreshCcw, GitMerge, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const TemplateActionModal = ({ isOpen, onClose, onAction, templateName }) => {
    const { t } = useLanguage();
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1100, // Higher than selection modal if needed, or sequential
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                backgroundColor: '#1e1e1e', borderRadius: '12px',
                width: '90%', maxWidth: '450px',
                border: '1px solid #ff9900', boxShadow: '0 20px 60px rgba(255, 153, 0, 0.3)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', backgroundColor: '#ff990033', borderBottom: '1px solid #ff9900',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <AlertTriangle size={24} color="#ff9900" />
                        <div>
                            <h2 style={{ margin: 0, color: '#ff9900', fontSize: '1.2rem' }}>
                                {t('vsm.templates.confirmTitle')}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: '#ccc',
                        cursor: 'pointer', padding: '5px'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '25px', color: '#eee' }}>
                    <p style={{ marginTop: 0, lineHeight: '1.5', fontSize: '1rem' }}>
                        {t('vsm.templates.loadQuestion', { name: templateName })}
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                        {/* Replace Button */}
                        <button
                            onClick={() => onAction('replace')}
                            style={{
                                padding: '15px', backgroundColor: '#2d2d2d',
                                border: '1px solid #c50f1f', borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '10px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#c50f1f22';
                                e.currentTarget.style.borderColor = '#c50f1f';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2d2d2d';
                                e.currentTarget.style.borderColor = '#c50f1f';
                            }}
                        >
                            <RefreshCcw size={28} color="#c50f1f" />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#ffaaaa', fontWeight: 'bold', marginBottom: '4px' }}>
                                    {t('vsm.templates.replace')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                    {t('vsm.templates.replaceDesc')}
                                </div>
                            </div>
                        </button>

                        {/* Merge Button */}
                        <button
                            onClick={() => onAction('merge')}
                            style={{
                                padding: '15px', backgroundColor: '#2d2d2d',
                                border: '1px solid #4caf50', borderRadius: '8px',
                                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: '10px', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#4caf5022';
                                e.currentTarget.style.borderColor = '#4caf50';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2d2d2d';
                                e.currentTarget.style.borderColor = '#4caf50';
                            }}
                        >
                            <GitMerge size={28} color="#4caf50" />
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#aaffaa', fontWeight: 'bold', marginBottom: '4px' }}>
                                    {t('vsm.templates.merge')}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                                    {t('vsm.templates.mergeDesc')}
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TemplateActionModal;
