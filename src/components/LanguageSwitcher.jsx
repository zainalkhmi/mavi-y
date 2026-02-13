import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../i18n/translations';
import { Globe, Check } from 'lucide-react';

const LanguageSwitcher = () => {
    const { currentLanguage, changeLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

    const handleLanguageChange = (langCode) => {
        changeLanguage(langCode);
        localStorage.setItem('mavi_language', langCode);
        setIsOpen(false);
    };

    const toggleMenu = () => {
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setMenuPosition({
                top: rect.top,
                left: rect.right + 10 // 10px gap
            });
        }
        setIsOpen(!isOpen);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Handle scroll or resize to update position or close
    useEffect(() => {
        const handleScroll = () => {
            if (isOpen) setIsOpen(false); // Close on scroll for simplicity
        };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);


    return (
        <>
            <button
                ref={buttonRef}
                className={`btn ${isOpen ? 'active' : ''}`}
                onClick={toggleMenu}
                title="Change Language"
                style={{
                    padding: '0',
                    fontSize: '1.2rem',
                    width: '80%', // Increased to 80% to match sidebar
                    height: '50px', // Increased height
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: '10px'
                }}
            >
                <Globe size={20} />
            </button>

            {isOpen && ReactDOM.createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: menuPosition.top,
                        left: menuPosition.left,
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        zIndex: 9999,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        minWidth: '150px',
                        backdropFilter: 'blur(10px)',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => handleLanguageChange(lang.code)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                background: currentLanguage === lang.code ? 'var(--accent-blue)' : 'transparent',
                                border: 'none',
                                borderRadius: '6px',
                                color: currentLanguage === lang.code ? 'white' : 'var(--text-primary)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '0.9rem',
                                transition: 'all 0.2s'
                            }}
                            className="hover:bg-opacity-80"
                            onMouseEnter={(e) => {
                                if (currentLanguage !== lang.code) e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                            }}
                            onMouseLeave={(e) => {
                                if (currentLanguage !== lang.code) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                            <span style={{ flex: 1 }}>{lang.name}</span>
                            {currentLanguage === lang.code && <Check size={14} />}
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </>
    );
};

export default LanguageSwitcher;
