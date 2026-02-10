import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n, { loadDynamicTranslations } from './i18n';
import { useTranslation } from 'react-i18next';
import { getDynamicTranslations } from '../utils/database';

const LanguageContext = createContext();

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within LanguageProvider');
    }
    return context;
};

export const LanguageProvider = ({ children }) => {
    const { t } = useTranslation();
    const [currentLanguage, setCurrentLanguageState] = useState(i18n.language || 'ja');

    useEffect(() => {
        const initDynamicTranslations = async () => {
            await loadDynamicTranslations(getDynamicTranslations);
            // Trigger a re-render or state update if needed, 
            // though i18n.addResourceBundle usually handles it.
            setCurrentLanguageState(i18n.language);
        };
        initDynamicTranslations();
    }, []);

    const changeLanguage = (langCode) => {
        i18n.changeLanguage(langCode);
        setCurrentLanguageState(langCode);
        localStorage.setItem('appLanguage', langCode);
    };

    const value = {
        currentLanguage,
        changeLanguage,
        t // Expose t directly to support method overloading (e.g., returnObjects: true)
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};
