import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

const HelpButton = ({ title, content }) => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <>
            <button
                onClick={() => setShowHelp(true)}
                style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #666',
                    background: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)';
                    e.target.style.borderColor = '#00d2ff';
                }}
                onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.1)';
                    e.target.style.borderColor = '#666';
                }}
                title={`Help - ${title}`}
            >
                <HelpCircle size={18} /> Help
            </button>

            {showHelp && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999,
                        padding: '20px'
                    }}
                    onClick={() => setShowHelp(false)}
                >
                    <div
                        style={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            maxWidth: '700px',
                            width: '90%',
                            maxHeight: '85vh',
                            color: '#fff',
                            position: 'relative',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            overflow: 'hidden'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sticky Header */}
                        <div style={{
                            padding: '20px 30px',
                            borderBottom: '1px solid #333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#1a1a1a',
                            zIndex: 10
                        }}>
                            <h2 style={{ margin: 0, color: '#00d2ff', fontSize: '1.5rem' }}>
                                {title}
                            </h2>
                            <button
                                onClick={() => setShowHelp(false)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid #444',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    color: '#fff',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.borderColor = '#ef4444';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.borderColor = '#444';
                                }}
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Content */}
                        <div style={{
                            padding: '30px',
                            overflowY: 'auto',
                            lineHeight: '1.8',
                            color: '#ccc',
                            flex: 1
                        }}>
                            {content}
                        </div>

                        {/* Footer Action */}
                        <div style={{ padding: '20px 30px', borderTop: '1px solid #333' }}>
                            <button
                                onClick={() => setShowHelp(false)}
                                style={{
                                    padding: '12px 24px',
                                    background: 'linear-gradient(45deg, #00d2ff, #3a7bd5)',
                                    border: 'none',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    width: '100%',
                                    fontSize: '1rem',
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                                onMouseLeave={(e) => e.target.style.opacity = '1'}
                            >
                                Tutup Panduan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default HelpButton;
