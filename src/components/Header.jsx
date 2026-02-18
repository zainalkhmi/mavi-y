import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMenuVisibilitySettings } from '../utils/tursoAPI';

import { useLanguage } from '../contexts/LanguageContext';
import GlobalSettingsDialog from './GlobalSettingsDialog';
import { checkDBStatus } from '../utils/database';
import {
    GanttChart,
    BarChart3,
    Network,
    Home,
    Cctv,
    PencilRuler,
    GraduationCap,
    Film,
    FolderOpen,
    Layout,
    LineChart,
    Trophy,
    IterationCcw,
    Trash2,
    BookOpen,
    Video,
    Glasses,
    Spline,
    Library,
    Radio,
    Map,
    Settings,
    Rocket,
    Shield,
    Sparkles,
    Zap
} from 'lucide-react';

const MENU_CATEGORIES = {
    CORE: <Rocket size={16} />,
    AI: <Sparkles size={16} />,
    IE: <BarChart3 size={16} />,
    ADVANCED: <Zap size={16} />,
    LEARNING: <BookOpen size={16} />
};

const MENU_ITEMS = [
    // MAIN MENU
    { path: '/menu', icon: <Home size={20} />, labelKey: 'header.mainMenu', title: 'Main Menu', category: 'CORE' },
    { path: '/mavi-class', icon: <GraduationCap size={20} />, title: 'MAVi Class', labelKey: 'header.maviClass', category: 'CORE' },

    // CORE
    { path: '/', icon: <Film size={20} />, labelKey: 'header.video', exact: true, category: 'CORE' },
    { path: '/files', icon: <FolderOpen size={20} />, labelKey: 'header.files', title: 'File Explorer', category: 'CORE' },

    // AI STUDIO
    { path: '/studio-model', icon: <PencilRuler size={20} />, title: 'Studio Model', labelKey: 'header.studioModel', category: 'AI', beta: true },
    // { path: '/teachable-machine', icon: <Cpu size={20} />, title: 'Teachable Machine Studio', labelKey: 'header.teachableMachine', category: 'AI', beta: true },


    { path: '/realtime-compliance', icon: <Cctv size={20} />, title: 'Real-time Compliance', labelKey: 'header.realtimeCompliance', category: 'AI', beta: true },
    { path: '/ergo-copilot', icon: <Shield size={20} />, title: 'Ergo Copilot', labelKey: 'header.ergoCopilot', category: 'AI', beta: true },

    // INDUSTRIAL ENGINEERING
    { path: '/swcs', icon: <GanttChart size={20} />, labelKey: 'header.swcs', title: 'Standard Work Combination Sheet', category: 'IE' },
    { path: '/yamazumi', icon: <BarChart3 size={20} />, labelKey: 'header.yamazumi', title: 'Yamazumi Chart', category: 'IE' },
    { path: '/value-stream-map', icon: <Network size={20} />, labelKey: 'header.valueStreamMap', title: 'Value Stream Map', category: 'IE' },
    { path: '/facility-layout', icon: <Layout size={20} />, title: 'Facility Layout Optimizer', category: 'IE', beta: true },
    { path: '/statistical-analysis', icon: <LineChart size={20} />, labelKey: 'header.statisticalAnalysis', title: 'Statistical Analysis', category: 'IE' },
    // PMTS Builder item removed as per user request

    { path: '/best-worst', icon: <Trophy size={20} />, labelKey: 'header.bestWorst', category: 'IE' },
    { path: '/rearrangement', icon: <IterationCcw size={20} />, labelKey: 'header.rearrange', category: 'IE' },
    { path: '/waste-elimination', icon: <Trash2 size={20} />, labelKey: 'header.waste', category: 'IE' },
    { path: '/manual-creation', icon: <BookOpen size={20} />, labelKey: 'header.manualCreation', title: 'Manual Creation', category: 'IE' },

    // ADVANCED
    { path: '/comparison', icon: <Video size={20} />, labelKey: 'header.comparison', category: 'ADVANCED' },
    // Multi-Camera item removed as per user request

    { path: '/vr-training', icon: <Glasses size={20} />, labelKey: 'header.vrTraining', title: 'VR Training Mode', category: 'ADVANCED' },
    { path: '/multi-axial', icon: <Spline size={20} />, labelKey: 'header.multiAxial', title: 'Multi-Axial Analysis', category: 'ADVANCED' },

    // LEARNING & COLLABORATION
    { path: '/knowledge-base', icon: <Library size={20} />, labelKey: 'header.knowledgeBase', title: 'Knowledge Base', category: 'LEARNING' },
    { path: '/broadcast', icon: <Radio size={20} />, labelKey: 'header.broadcast', title: 'Broadcast', category: 'LEARNING' },
    // Help item removed as per user request

];

function Header({ videoName, onUpload, onLogout, sidebarCollapsed }) {
    const { t } = useLanguage();
    const { userRole } = useAuth();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [dbStatus, setDbStatus] = useState({ isConfigured: false, isOnline: true, mode: 'Local' });
    const [menuVisibilityMap, setMenuVisibilityMap] = useState({});

    // Poll DB status
    useEffect(() => {
        const fetchStatus = async () => {
            const status = await checkDBStatus();
            setDbStatus(status);
        };
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000); // Check every 5s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadMenuVisibility = async () => {
            try {
                const settings = await getMenuVisibilitySettings();
                setMenuVisibilityMap(settings || {});
            } catch (error) {
                console.error('Failed to load menu visibility settings:', error);
                setMenuVisibilityMap({});
            }
        };

        loadMenuVisibility();

        const handleVisibilityUpdated = () => {
            loadMenuVisibility();
        };

        window.addEventListener('menu-visibility-updated', handleVisibilityUpdated);
        return () => window.removeEventListener('menu-visibility-updated', handleVisibilityUpdated);
    }, []);

    // Listen for global event to open AI settings
    useEffect(() => {
        const handleOpenAISettings = () => {
            setIsSettingsOpen(true);
        };
        window.addEventListener('open-ai-settings', handleOpenAISettings);
        return () => window.removeEventListener('open-ai-settings', handleOpenAISettings);
    }, []);

    return (
        <header id="sidebar-nav" className="glass-panel" style={{
            height: '100vh',
            width: sidebarCollapsed ? '0px' : '70px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: sidebarCollapsed ? '0' : '20px 0',
            borderRight: '1px solid var(--border-color)',
            justifyContent: 'flex-start',
            gap: '20px',
            transition: 'width 0.3s ease, padding 0.3s ease',
            overflow: 'hidden',
            zIndex: 1000
        }}>

            {!sidebarCollapsed && (
                <div style={{
                    padding: '10px 0',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px'
                }}>
                    <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: dbStatus.isConfigured ? (dbStatus.isOnline ? '#4caf50' : '#ff9800') : '#9e9e9e',
                        boxShadow: `0 0 8px ${dbStatus.isConfigured ? (dbStatus.isOnline ? '#4caf50' : '#ff9800') : '#9e9e9e'}`
                    }}></div>
                    <span style={{ fontSize: '0.6rem', color: '#aaa', fontWeight: 'bold' }}>
                        {dbStatus.isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                </div>
            )}

            <div style={{
                display: sidebarCollapsed ? 'none' : 'flex',
                flexDirection: 'column',
                gap: '8px', // Reduced gap for tighter fit
                alignItems: 'center',
                width: '100%',
                overflowY: 'auto',
                flex: 1,
                padding: '0 12px 20px 12px', // Slightly larger side padding for "inset" look
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
            }}>
                <style>
                    {`
                        header div::-webkit-scrollbar {
                            display: none;
                        }
                    `}
                </style>

                {Object.keys(MENU_CATEGORIES).map((catKey, catIndex) => (
                    <React.Fragment key={catKey}>
                        {catIndex > 0 && <div style={{ width: '32px', height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0', opacity: 0.5 }}></div>}

                        {MENU_ITEMS
                            .filter(item => item.category === catKey)
                            .filter(item => menuVisibilityMap[item.path] !== false)
                            .map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) => `btn ${isActive ? 'active' : ''}`}
                                    style={{
                                        padding: '0',
                                        fontSize: '1.2rem',
                                        width: item.path === '/menu' ? '50px' : '80%', // Home button fixed 50px
                                        height: '50px', // Increased height
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        color: 'white',
                                        textDecoration: 'none',
                                        borderRadius: '10px',
                                        transition: item.path === '/menu' ? 'none' : 'all 0.2s ease', // No transition for Home
                                        position: 'relative',
                                        border: '1px solid transparent'
                                    }}
                                    title={item.labelKey ? t(item.labelKey) : item.title}
                                >
                                    {item.icon}
                                    {item.beta && (
                                        <span style={{
                                            position: 'absolute',
                                            top: '0',
                                            right: '0',
                                            backgroundColor: '#f59e0b', // Amber/Orange for experiment
                                            color: '#000',
                                            fontSize: '0.55rem',
                                            padding: '1px 3px',
                                            borderRadius: '4px',
                                            fontWeight: '900',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em',
                                            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}>
                                            Beta
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                    </React.Fragment>
                ))}



                <div style={{ width: '30px', height: '1px', backgroundColor: '#555', margin: '5px 0' }}></div>

                {/* Action buttons (Palette, Disk, Folder) removed as per user request */}
            </div>

            <GlobalSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />

            {!sidebarCollapsed && (
                <div id="header-tools" style={{ marginTop: 'auto', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center', padding: '0 12px' }}>
                    {/* Admin Panel button removed as per user request */}

                    <button
                        className="btn"
                        onClick={() => setIsSettingsOpen(true)}
                        title="AI Settings"
                        style={{
                            padding: '0',
                            fontSize: '1.2rem',
                            width: '80%', // Updated to 80%
                            height: '50px', // Increased height
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: '#333',
                            border: '1px solid #555',
                            borderRadius: '10px'
                        }}
                    >
                        <Settings size={20} />
                    </button>
                </div>
            )}
        </header>
    );
}

export default Header;
