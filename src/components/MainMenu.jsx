import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { getMenuVisibilitySettings } from '../utils/tursoAPI';
import {
    LayoutGrid,
    Cpu,
    TrendingDown,
    Zap,
    GraduationCap,
    Film,
    FolderOpen,
    PencilRuler,
    Cctv,
    GanttChart,
    BarChart3,
    Network,
    Blocks,
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
    Settings,
    Search,
    ChevronRight,
    ArrowRight
} from 'lucide-react';

const MENU_CATEGORIES = {
    CORE: {
        icon: <LayoutGrid size={24} />,
        label: 'Core Features',
        labelId: 'Fitur Utama',
        description: 'Essential video analysis and file management',
        color: '#3b82f6'
    },
    AI: {
        icon: <Cpu size={24} />,
        label: 'AI Studio',
        labelId: 'Studio AI',
        description: 'Intelligent motion analysis with AI',
        color: '#8b5cf6'
    },
    IE: {
        icon: <TrendingDown size={24} />,
        label: 'Industrial Engineering',
        labelId: 'Teknik Industri',
        description: 'Professional IE analysis tools',
        color: '#10b981'
    },
    ADVANCED: {
        icon: <Zap size={24} />,
        label: 'Advanced Tools',
        labelId: 'Fitur Lanjutan',
        description: 'Multi-camera, VR, and advanced features',
        color: '#f59e0b'
    },
    LEARNING: {
        icon: <GraduationCap size={24} />,
        label: 'Learning & Help',
        labelId: 'Pembelajaran & Bantuan',
        description: 'Tutorials, documentation, and support',
        color: '#ec4899'
    }
};

const MENU_ITEMS = [
    // CORE
    {
        path: '/',
        icon: <Film />,
        label: 'Video Analysis',
        labelId: 'Analisis Video',
        description: 'Analyze work motions from video recordings',
        descriptionId: 'Analisis gerakan kerja dari rekaman video',
        category: 'CORE'
    },
    {
        path: '/files',
        icon: <FolderOpen />,
        label: 'File Explorer',
        labelId: 'Penjelajah File',
        description: 'Browse and manage your project files',
        descriptionId: 'Jelajahi dan kelola file proyek Anda',
        category: 'CORE'
    },

    // AI STUDIO
    {
        path: '/studio-model',
        icon: <PencilRuler />,
        label: 'Studio Model',
        labelId: 'Model Studio',
        description: 'Build motion analysis models with rules',
        descriptionId: 'Bangun model analisis gerakan dengan aturan',
        category: 'AI',
        beta: true
    },
    {
        path: '/realtime-compliance',
        icon: <Cctv />,
        label: 'Real-time Compliance',
        labelId: 'Kepatuhan Real-time',
        description: 'Monitor work compliance in real-time',
        descriptionId: 'Pantau kepatuhan kerja secara real-time',
        category: 'AI',
        beta: true
    },


    // INDUSTRIAL ENGINEERING
    {
        path: '/swcs',
        icon: <GanttChart />,
        label: 'SWCS',
        labelId: 'SWCS',
        description: 'Standard Work Combination Sheet',
        descriptionId: 'Lembar Kombinasi Kerja Standar',
        category: 'IE'
    },
    {
        path: '/yamazumi',
        icon: <BarChart3 />,
        label: 'Yamazumi',
        labelId: 'Yamazumi',
        description: 'Yamazumi Chart for workload balancing',
        descriptionId: 'Grafik Yamazumi untuk penyeimbangan beban kerja',
        category: 'IE'
    },
    {
        path: '/value-stream-map',
        icon: <Network />,
        label: 'Value Stream Map',
        labelId: 'Peta Aliran Nilai',
        description: 'Map material and information flow',
        descriptionId: 'Petakan aliran material dan informasi',
        category: 'IE'
    },
    {
        path: '/facility-layout',
        icon: <Blocks />,
        label: 'Facility Layout',
        labelId: 'Tata Letak Fasilitas',
        description: 'visTABLE-style block layout and flow optimization',
        descriptionId: 'Optimasi tata letak blok dan aliran ala visTABLE',
        category: 'IE',
        beta: true
    },
    {
        path: '/statistical-analysis',
        icon: <LineChart />,
        label: 'Statistical Analysis',
        labelId: 'Analisis Statistik',
        description: 'Statistical analysis of time study data',
        descriptionId: 'Analisis statistik data studi waktu',
        category: 'IE'
    },
    {
        path: '/best-worst',
        icon: <Trophy />,
        label: 'Best/Worst Cycle',
        labelId: 'Siklus Terbaik/Terburuk',
        description: 'Compare best and worst cycle performance',
        descriptionId: 'Bandingkan performa siklus terbaik dan terburuk',
        category: 'IE'
    },
    {
        path: '/rearrangement',
        icon: <IterationCcw />,
        label: 'Rearrangement',
        labelId: 'Penyusunan Ulang',
        description: 'Optimize work element sequence',
        descriptionId: 'Optimalkan urutan elemen kerja',
        category: 'IE'
    },
    {
        path: '/waste-elimination',
        icon: <Trash2 />,
        label: 'Waste Elimination',
        labelId: 'Eliminasi Pemborosan',
        description: 'Identify and eliminate waste (Muda)',
        descriptionId: 'Identifikasi dan eliminasi pemborosan (Muda)',
        category: 'IE'
    },
    {
        path: '/manual-creation',
        icon: <BookOpen />,
        label: 'Manual Creation',
        labelId: 'Pembuatan Manual',
        description: 'Create work instruction manuals',
        descriptionId: 'Buat manual instruksi kerja',
        category: 'IE'
    },

    // ADVANCED
    {
        path: '/comparison',
        icon: <Video />,
        label: 'Video Side-by-Side',
        labelId: 'Perbandingan Video',
        description: 'Professional side-by-side motion study dashboard',
        descriptionId: 'Dashboard studi gerakan berdampingan profesional',
        category: 'ADVANCED'
    },
    {
        path: '/vr-training',
        icon: <Glasses />,
        label: 'VR Training',
        labelId: 'Pelatihan VR',
        description: 'Virtual reality training mode',
        descriptionId: 'Mode pelatihan realitas virtual',
        category: 'ADVANCED'
    },
    {
        path: '/multi-axial',
        icon: <GanttChart />,
        label: 'Multi-Axial Analysis',
        labelId: 'Multi-Axial Analysis',
        description: 'Multi-project timeline comparison',
        descriptionId: 'Perbandingan timeline multi-proyek',
        category: 'ADVANCED'
    },

    // LEARNING & COLLABORATION
    {
        path: '/mavi-class',
        icon: <GraduationCap />,
        label: 'MAVi Class',
        labelId: 'Kelas MAVi',
        description: 'Interactive learning center',
        descriptionId: 'Pusat pembelajaran interaktif',
        category: 'LEARNING'
    },
    {
        path: '/knowledge-base',
        icon: <Library />,
        label: 'Knowledge Base',
        labelId: 'Basis Pengetahuan',
        description: 'Documentation and resources library',
        descriptionId: 'Perpustakaan dokumentasi dan sumber daya',
        category: 'LEARNING'
    },
    {
        path: '/broadcast',
        icon: <Radio />,
        label: 'Broadcast',
        labelId: 'Siaran',
        description: 'Stream and share live projects',
        descriptionId: 'Streaming dan berbagi proyek langsung',
        category: 'LEARNING'
    },
];

function MainMenu() {
    const navigate = useNavigate();
    const { currentLanguage } = useLanguage();
    const { userRole } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [menuVisibilityMap, setMenuVisibilityMap] = useState({});
    const isId = currentLanguage === 'id';

    const loadMenuVisibility = async () => {
        try {
            const settings = await getMenuVisibilitySettings();
            setMenuVisibilityMap(settings || {});
        } catch (error) {
            console.error('Failed to load menu visibility settings:', error);
            setMenuVisibilityMap({});
        }
    };

    useEffect(() => {
        loadMenuVisibility();

        const handleVisibilityUpdated = () => {
            loadMenuVisibility();
        };

        window.addEventListener('menu-visibility-updated', handleVisibilityUpdated);
        return () => window.removeEventListener('menu-visibility-updated', handleVisibilityUpdated);
    }, []);

    // Premium Animations and Dynamic Styles
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes slideUpFade {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes orbFloat {
                0% { transform: translate(0, 0) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0, 0) scale(1); }
            }
            .menu-stagger-item {
                animation: slideUpFade 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                opacity: 0;
            }
            .glass-card {
                background: rgba(255, 255, 255, 0.03);
                backdrop-filter: blur(24px);
                border: 1px solid rgba(255, 255, 255, 0.08);
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .glass-card:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-6px);
                box-shadow: 0 20px 40px rgba(0,0,0,0.5);
            }
            .pro-input {
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                backdrop-filter: blur(10px);
                transition: all 0.3s ease;
            }
            .pro-input:focus {
                background: rgba(255,255,255,0.08);
                border-color: #3b82f6;
                box-shadow: 0 0 0 4px rgba(59,130,246,0.15);
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    const menuItemsWithAdmin = useMemo(() => {
        return MENU_ITEMS.filter(item => menuVisibilityMap[item.path] !== false);
    }, [menuVisibilityMap]);

    const filteredItems = useMemo(() => {
        if (!searchQuery.trim()) return menuItemsWithAdmin;
        const query = searchQuery.toLowerCase();
        return menuItemsWithAdmin.filter(item => {
            const label = isId ? item.labelId : item.label;
            const description = isId ? item.descriptionId : item.description;
            return label.toLowerCase().includes(query) ||
                description.toLowerCase().includes(query);
        });
    }, [searchQuery, isId, menuItemsWithAdmin]);

    const groupedItems = useMemo(() => {
        const groups = {};
        filteredItems.forEach(item => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });
        return groups;
    }, [filteredItems]);

    return (
        <div style={{
            height: '100%',
            overflow: 'auto',
            backgroundColor: '#030305',
            backgroundImage: 'radial-gradient(circle at 50% -20%, #151525 0%, #030305 70%)',
            padding: '40px 60px',
            position: 'relative'
        }}>
            {/* Ambient Background Orbs */}
            <div style={{ position: 'absolute', top: '-100px', left: '10%', width: '500px', height: '500px', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(120px)', borderRadius: '50%', animation: 'orbFloat 20s infinite ease-in-out' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: '400px', height: '400px', background: 'rgba(139, 92, 246, 0.05)', filter: 'blur(100px)', borderRadius: '50%', animation: 'orbFloat 18s infinite ease-in-out reverse' }} />

            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '50px',
                position: 'relative',
                zIndex: 10
            }}>
                <div className="menu-stagger-item" style={{ animationDelay: '0s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '18px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)'
                        }}>
                            <LayoutGrid size={32} color="white" />
                        </div>
                        <div>
                            <h1 style={{
                                margin: 0, fontSize: '2.4rem', fontWeight: '900', color: '#fff',
                                letterSpacing: '-0.04em'
                            }}>
                                {isId ? 'Menu Utama MAVi' : 'MAVi Main Menu'}
                            </h1>
                            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '1rem', fontWeight: '500' }}>
                                {isId ? 'Sistem analisis gerakan & visualisasi terintegrasi' : 'Integrated motion analysis & visualization system'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="menu-stagger-item" style={{ animationDelay: '0.1s' }}>
                    <div style={{ position: 'relative', width: '320px' }}>
                        <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                        <input
                            type="text"
                            placeholder={isId ? 'Cari fitur...' : 'Search features...'}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pro-input"
                            style={{
                                width: '100%', padding: '14px 20px 14px 48px', fontSize: '0.95rem',
                                borderRadius: '14px', color: '#fff', outline: 'none'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Content Grid */}
            <div style={{ position: 'relative', zIndex: 10 }}>
                {Object.keys(MENU_CATEGORIES).map((catKey, categoryIndex) => {
                    const items = groupedItems[catKey];
                    if (!items || items.length === 0) return null;
                    const cat = MENU_CATEGORIES[catKey];

                    return (
                        <div key={catKey} className="menu-stagger-item" style={{ marginBottom: '50px', animationDelay: `${0.2 + categoryIndex * 0.1}s` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                <div style={{ color: cat.color }}>{cat.icon}</div>
                                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em' }}>
                                    {isId ? cat.labelId : cat.label}
                                </h2>
                                <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.1), transparent)' }} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                                {items.map((item, itemIdx) => (
                                    <div
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className="glass-card"
                                        style={{
                                            borderRadius: '24px', padding: '28px', cursor: 'pointer',
                                            position: 'relative', overflow: 'hidden'
                                        }}
                                    >
                                        <div style={{ color: cat.color, marginBottom: '20px' }}>
                                            {React.cloneElement(item.icon, { size: 28 })}
                                        </div>
                                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: '700', color: '#fff' }}>
                                            {isId ? item.labelId : item.label}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)', lineHeight: '1.5', fontWeight: '500' }}>
                                            {isId ? item.descriptionId : item.description}
                                        </p>

                                        <div style={{
                                            position: 'absolute', bottom: '24px', right: '24px',
                                            padding: '8px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                                            color: 'rgba(255,255,255,0.2)', transition: 'all 0.3s'
                                        }} className="go-arrow">
                                            <ArrowRight size={18} />
                                        </div>

                                        {item.beta && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '20px',
                                                right: '20px',
                                                backgroundColor: '#f59e0b',
                                                color: '#000',
                                                padding: '4px 8px',
                                                borderRadius: '8px',
                                                fontSize: '0.7rem',
                                                fontWeight: '900',
                                                textTransform: 'uppercase',
                                                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                                            }}>
                                                Beta
                                            </div>
                                        )}

                                        <style>{`
                                            .glass-card:hover .go-arrow {
                                                background: ${cat.color}20;
                                                color: ${cat.color};
                                                transform: translateX(4px);
                                            }
                                        `}</style>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Floating Quick Navigation or Tips */}
            <div className="menu-stagger-item" style={{
                marginTop: '60px', padding: '30px', borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
                border: '1px solid rgba(59, 130, 246, 0.2)', animationDelay: '0.8s'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Zap size={20} color="#3b82f6" />
                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>
                        {isId ? 'Eksplorasi Cepat' : 'Pro Experience'}
                    </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem' }}>
                    <div>
                        <div style={{ color: '#fff', fontWeight: '700', marginBottom: '4px' }}>{isId ? 'Navigasi' : 'Navigation'}</div>
                        {isId ? 'Gunakan Sidebar (Ctrl+B) untuk berpindah antar mode.' : 'Use Sidebar (Ctrl+B) for quick context switching.'}
                    </div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: '700', marginBottom: '4px' }}>{isId ? 'Efisiensi' : 'Efficiency'}</div>
                        {isId ? 'Gunakan MAVi Class 🎓 untuk memperdalam skill IE Anda.' : 'Level up your IE skills with integrated MAVi Class 🎓.'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MainMenu;
