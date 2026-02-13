import React from 'react';
import { X, Layout, Package, Truck, Network, FileText } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

const TemplateSelectionModal = ({ isOpen, onClose, onSelect, templates }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    const getIcon = (key) => {
        if (key.includes('simple')) return <Layout size={24} color="#4fc3f7" />;
        if (key.includes('intermediate')) return <Truck size={24} color="#ff9900" />;
        if (key.includes('advanced')) return <Package size={24} color="#4caf50" />;
        if (key.includes('supplyChain')) return <Network size={24} color="#8a2be2" />;
        return <FileText size={24} color="#ccc" />;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                backgroundColor: '#1e1e1e', borderRadius: '12px',
                width: '90%', maxWidth: '600px', maxHeight: '90vh',
                border: '1px solid #0078d4', boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', backgroundColor: '#0078d4',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Layout size={24} color="white" />
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
                                {t('vsm.templates.selectTitle')}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: 'white',
                        cursor: 'pointer', padding: '5px'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '25px', overflowY: 'auto', display: 'grid', gap: '15px' }}>
                    {Object.entries(templates).map(([key, template]) => (
                        <div
                            key={key}
                            onClick={() => onSelect(key)}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: '15px',
                                padding: '15px', borderRadius: '8px',
                                backgroundColor: '#2d2d2d', border: '1px solid #444',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#383838';
                                e.currentTarget.style.borderColor = '#0078d4';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#2d2d2d';
                                e.currentTarget.style.borderColor = '#444';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            <div style={{
                                padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                {getIcon(key)}
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', color: 'white', fontSize: '1rem' }}>{template.name}</h3>
                                <p style={{ margin: 0, color: '#aaa', fontSize: '0.85rem', lineHeight: '1.4' }}>
                                    {template.description}
                                </p>
                                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px',
                                        backgroundColor: '#333', color: '#888'
                                    }}>
                                        {template.nodes.length} Nodes
                                    </span>
                                    <span style={{
                                        fontSize: '0.75rem', padding: '2px 8px', borderRadius: '10px',
                                        backgroundColor: '#333', color: '#888'
                                    }}>
                                        Takt: {template.globalTakt}s
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '15px 25px', borderTop: '1px solid #333',
                    display: 'flex', justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 20px', backgroundColor: '#444',
                            border: 'none', borderRadius: '6px', color: 'white',
                            cursor: 'pointer', fontSize: '0.9rem'
                        }}
                    >
                        {t('common.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TemplateSelectionModal;
