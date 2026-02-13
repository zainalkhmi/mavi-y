import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../i18n/translations';

function LanguageSelector() {
    const { currentLanguage, changeLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const visibleLanguages = languages.filter(lang => lang.code !== 'id');
    const currentLang = languages.find(lang => lang.code === currentLanguage);

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="btn"
                onClick={() => setIsOpen(!isOpen)}
                title="Change Language"
                style={{
                    padding: '8px',
                    fontSize: '1.2rem',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                }}
            >
                {currentLang?.flag || '🌐'}
            </button>

            {isOpen && (
                <>
                    {/* Backdrop to close dropdown */}
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999
                        }}
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown menu */}
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: '5px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #444',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        zIndex: 1000,
                        minWidth: '180px',
                        overflow: 'hidden'
                    }}>
                        {visibleLanguages.map(lang => (
                            <div
                                key={lang.code}
                                onClick={() => {
                                    changeLanguage(lang.code);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: '10px 15px',
                                    cursor: 'pointer',
                                    backgroundColor: currentLanguage === lang.code ? 'var(--accent-blue)' : 'transparent',
                                    color: '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'background-color 0.2s',
                                    fontSize: '0.9rem'
                                }}
                                onMouseEnter={(e) => {
                                    if (currentLanguage !== lang.code) {
                                        e.target.style.backgroundColor = '#333';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (currentLanguage !== lang.code) {
                                        e.target.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                                <span>{lang.name}</span>
                                {currentLanguage === lang.code && (
                                    <span style={{ marginLeft: 'auto', color: '#fff' }}>✓</span>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default LanguageSelector;
