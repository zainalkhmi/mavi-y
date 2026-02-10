import React, { createContext, useContext, useState, useCallback } from 'react';

const DialogContext = createContext();

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState(null);

    const showAlert = useCallback((title, message) => {
        return new Promise((resolve) => {
            setDialog({
                type: 'alert',
                title,
                message,
                onConfirm: () => {
                    setDialog(null);
                    resolve();
                }
            });
        });
    }, []);

    const showConfirm = useCallback((title, message) => {
        return new Promise((resolve) => {
            setDialog({
                type: 'confirm',
                title,
                message,
                onConfirm: () => {
                    setDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    const showPrompt = useCallback((title, message, defaultValue = '') => {
        return new Promise((resolve) => {
            setDialog({
                type: 'prompt',
                title,
                message,
                defaultValue,
                onConfirm: (value) => {
                    setDialog(null);
                    resolve(value);
                },
                onCancel: () => {
                    setDialog(null);
                    resolve(null);
                }
            });
        });
    }, []);

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
            {children}
            {dialog && <ModernDialog {...dialog} />}
        </DialogContext.Provider>
    );
};

// Internal component for the dialog UI
const ModernDialog = ({ type, title, message, defaultValue, onConfirm, onCancel }) => {
    const [inputValue, setInputValue] = useState(defaultValue || '');

    const handleConfirm = () => {
        if (type === 'prompt') {
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                backgroundColor: 'rgba(30, 30, 30, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                padding: '30px',
                width: '90%',
                maxWidth: '450px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                color: 'white',
                fontFamily: "'Inter', system-ui, sans-serif",
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background Glow */}
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '150px',
                    height: '150px',
                    background: 'radial-gradient(circle, rgba(0, 210, 255, 0.15) 0%, transparent 70%)',
                    zIndex: 0
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <h3 style={{
                        margin: '0 0 10px 0',
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        background: 'linear-gradient(to right, #fff, #aaa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>{title}</h3>

                    <p style={{
                        margin: '0 0 25px 0',
                        color: '#ccc',
                        fontSize: '0.95rem',
                        lineHeight: '1.5'
                    }}>{message}</p>

                    {type === 'prompt' && (
                        <input
                            autoFocus
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleConfirm();
                                if (e.key === 'Escape') onCancel();
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '1rem',
                                marginBottom: '25px',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'rgba(0, 210, 255, 0.5)'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                        />
                    )}

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        {(type === 'confirm' || type === 'prompt') && (
                            <button
                                onClick={onCancel}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    background: 'transparent',
                                    color: '#aaa',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = '#fff';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#aaa';
                                }}
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            style={{
                                padding: '10px 24px',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                boxShadow: '0 4px 15px rgba(0, 210, 255, 0.3)',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            {type === 'confirm' || type === 'prompt' ? 'Confirm' : 'OK'}
                        </button>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
};
