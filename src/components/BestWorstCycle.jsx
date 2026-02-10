import React, { useState, useEffect, useRef, useMemo } from 'react';
import { getAllProjects } from '../utils/database';
import { useLanguage } from '../i18n/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import {
    FolderOpen,
    Zap,
    Video,
    Link,
    Link2Off,
    Cpu,
    Play,
    Pause,
    RotateCcw,
    Maximize2,
    CheckCircle2,
    ChevronDown,
    Info,
    History,
    Sparkles,
    MonitorPlay,
    LayoutPanelLeft
} from 'lucide-react';
import AIChatOverlay from './features/AIChatOverlay';

function BestWorstCycle({ measurements }) {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const [projects, setProjects] = useState([]);
    const [selectedProjectIds, setSelectedProjectIds] = useState([null, null]); // [Left, Right]
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState(null);
    const [isSyncEnabled, setIsSyncEnabled] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMetricsVisible, setIsMetricsVisible] = useState(false);
    const [showAIChat, setShowAIChat] = useState(false);
    const [aiSystemPrompt, setAiSystemPrompt] = useState('');

    const videoRefLeft = useRef(null);
    const videoRefRight = useRef(null);

    // Global Keyframes and Global Styles for Premium Feel
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @keyframes pulse-glow-blue {
                0% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
                50% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.4); }
                100% { box-shadow: 0 0 5px rgba(59, 130, 246, 0.2); }
            }
            @keyframes pulse-glow-green {
                0% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
                50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
                100% { box-shadow: 0 0 5px rgba(16, 185, 129, 0.2); }
            }
            @keyframes mesh-float {
                0% { transform: translateY(0) scale(1); }
                50% { transform: translateY(-20px) scale(1.05); }
                100% { transform: translateY(0) scale(1); }
            }
            .pro-select-wrapper {
                position: relative;
                transition: all 0.3s ease;
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 12px;
                background: rgba(255, 255, 255, 0.03);
                overflow: hidden;
            }
            .pro-select-wrapper:hover {
                background: rgba(255, 255, 255, 0.06);
                border-color: rgba(255, 255, 255, 0.2);
                transform: translateY(-1px);
            }
            .video-pod {
                transition: all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            }
            .video-pod:hover {
                transform: scale(1.005);
                border-color: rgba(255, 255, 255, 0.2) !important;
            }
            .element-row:hover {
                background: rgba(255, 255, 255, 0.05);
                transform: translateX(4px);
            }
            ::-webkit-scrollbar {
                width: 6px;
            }
            ::-webkit-scrollbar-track {
                background: transparent;
            }
            ::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
            }
            ::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.2);
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    useEffect(() => {
        loadProjects();
    }, []);

    // Sync with global currentProject from File Explorer
    useEffect(() => {
        if (currentProject && currentProject.id && projects.length > 0) {
            // Priority: Fill empty slots
            if (selectedProjectIds[0] === null) {
                setSelectedProjectIds(prev => [currentProject.id, prev[1]]);
            } else if (selectedProjectIds[1] === null && selectedProjectIds[0] !== currentProject.id) {
                setSelectedProjectIds(prev => [prev[0], currentProject.id]);
            }
        }
    }, [currentProject, projects]);

    useEffect(() => {
        if (selectedProjectIds[0] && selectedProjectIds[1]) {
            performAnalysis();
        } else {
            setAnalysis(null);
        }
    }, [selectedProjectIds, projects]);

    // URL Cleanup effect
    useEffect(() => {
        return () => {
            // Cleanup all created object URLs
            projects.forEach(p => {
                if (p.videoUrl) URL.revokeObjectURL(p.videoUrl);
            });
        };
    }, [projects]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            // Filter projects that have video data
            const validProjects = allProjects.filter(p => p.videoBlob);

            // Create object URLs for valid video blobs
            const processedProjects = validProjects.map(p => ({
                ...p,
                videoUrl: URL.createObjectURL(p.videoBlob)
            }));

            processedProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
            setProjects(processedProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectSelect = (side, id) => {
        const numericId = id ? Number(id) : null;
        setSelectedProjectIds(prev => {
            const next = [...prev];
            next[side === 'left' ? 0 : 1] = numericId;
            return next;
        });
    };

    const performAnalysis = () => {
        const [leftId, rightId] = selectedProjectIds;
        const leftProject = projects.find(p => p.id === leftId);
        const rightProject = projects.find(p => p.id === rightId);

        if (!leftProject || !rightProject) return;

        const leftTime = (leftProject.measurements || []).reduce((sum, m) => sum + m.duration, 0);
        const rightTime = (rightProject.measurements || []).reduce((sum, m) => sum + m.duration, 0);

        const leftIsBest = leftTime > 0 && rightTime > 0 ? leftTime <= rightTime : true;
        const bestCycle = leftIsBest ? leftProject : rightProject;
        const worstCycle = leftIsBest ? rightProject : leftProject;

        const elementComparison = [];
        const allElementNames = new Set([
            ...(leftProject.measurements || []).map(m => m.elementName),
            ...(rightProject.measurements || []).map(m => m.elementName)
        ]);

        allElementNames.forEach(name => {
            const mLeft = leftProject.measurements?.find(m => m.elementName === name);
            const mRight = rightProject.measurements?.find(m => m.elementName === name);

            elementComparison.push({
                elementName: name,
                left: {
                    start: mLeft?.startTime || 0,
                    end: (mLeft?.startTime || 0) + (mLeft?.duration || 0),
                    duration: mLeft?.duration || 0,
                    category: mLeft?.category || 'N/A'
                },
                right: {
                    start: mRight?.startTime || 0,
                    end: (mRight?.startTime || 0) + (mRight?.duration || 0),
                    duration: mRight?.duration || 0,
                    category: mRight?.category || 'N/A'
                },
                difference: (mRight?.duration || 0) - (mLeft?.duration || 0)
            });
        });

        setAnalysis({
            leftProject,
            rightProject,
            bestCycle,
            worstCycle,
            elementComparison,
            timeSaved: Math.abs(rightTime - leftTime),
            totalLeft: leftTime,
            totalRight: rightTime
        });
    };

    const togglePlayback = () => {
        const newState = !isPlaying;
        setIsPlaying(newState);
        if (videoRefLeft.current) newState ? videoRefLeft.current.play() : videoRefLeft.current.pause();
        if (videoRefRight.current) newState ? videoRefRight.current.play() : videoRefRight.current.pause();
    };

    const resetPlayback = () => {
        setIsPlaying(false);
        [videoRefLeft, videoRefRight].forEach(ref => {
            if (ref.current) {
                ref.current.pause();
                ref.current.currentTime = 0;
            }
        });
    };

    const toggleSync = () => {
        const newState = !isSyncEnabled;
        setIsSyncEnabled(newState);
        if (newState && videoRefLeft.current && videoRefRight.current) {
            videoRefRight.current.currentTime = videoRefLeft.current.currentTime;
        }
    };

    const handleAIAnalysis = () => {
        if (!analysis) return;

        const systemPrompt = `
            You are a Senior Industrial Engineer analyzing a side-by-side video comparison of two work cycles.
            
            LEFT PROJECT: ${projectLeft?.projectName || 'Cycle A'}
            RIGHT PROJECT: ${projectRight?.projectName || 'Cycle B'}
            
            COMPARISON DATA:
            - Total Left Duration: ${(analysis.totalLeft || 0).toFixed(2)}s
            - Total Right Duration: ${(analysis.totalRight || 0).toFixed(2)}s
            - Potential Savings: ${(analysis.timeSaved || 0).toFixed(2)}s
            
            ELEMENT BREAKDOWN:
            ${analysis.elementComparison.map(item => `- ${item.elementName}: Left ${item.left.duration.toFixed(2)}s (${item.left.category}) vs Right ${item.right.duration.toFixed(2)}s (${item.right.category})`).join('\n')}
            
            INSTRUCTIONS:
            1. Provide a professional forensic comparison of these two cycles in Indonesian.
            2. Identify why one cycle is faster (or slower) than the other.
            3. Highlight specific elements that show the most significant Muda (waste).
            4. Suggest Kaizen improvements to standardize on the "Best" practices seen in either video.
            5. Use the user's language (Indonesian or English).
        `;

        setAiSystemPrompt(systemPrompt);
        setShowAIChat(true);
    };

    const handleSyncSeek = (e) => {
        if (!isSyncEnabled) return;
        const targetTime = e.target.currentTime;
        const otherRef = e.target === videoRefLeft.current ? videoRefRight : videoRefLeft;
        if (otherRef.current && Math.abs(otherRef.current.currentTime - targetTime) > 0.1) {
            otherRef.current.currentTime = targetTime;
        }
    };

    const handleElementClick = (item) => {
        if (videoRefLeft.current) videoRefLeft.current.currentTime = item.left.start;
        if (videoRefRight.current) videoRefRight.current.currentTime = item.right.start;
    };

    const projectLeft = useMemo(() => projects.find(p => Number(p.id) === Number(selectedProjectIds[0])), [projects, selectedProjectIds]);
    const projectRight = useMemo(() => projects.find(p => Number(p.id) === Number(selectedProjectIds[1])), [projects, selectedProjectIds]);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#050508',
            backgroundImage: 'radial-gradient(circle at 50% -20%, #1e1e2d 0%, #050508 60%)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            overflow: 'hidden',
            position: 'relative'
        }}>
            {/* Ambient Background Lights */}
            <div style={{ position: 'absolute', top: '10%', left: '15%', width: '400px', height: '400px', background: 'rgba(59, 130, 246, 0.05)', filter: 'blur(100px)', borderRadius: '50%', animation: 'mesh-float 15s infinite ease-in-out' }} />
            <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', background: 'rgba(16, 185, 129, 0.05)', filter: 'blur(100px)', borderRadius: '50%', animation: 'mesh-float 12s infinite ease-in-out reverse' }} />

            {/* Premium Floating Header */}
            <div style={{
                margin: '20px 24px',
                padding: '12px 24px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                zIndex: 100,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 0 20px rgba(37, 99, 235, 0.4)'
                    }}>
                        <MonitorPlay size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '900', letterSpacing: '-0.03em' }}>
                            {t('bestWorst.videoSideBySide') || 'Video Side-by-Side'}
                        </h1>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Motion AI Analytics Suite
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                        onClick={toggleSync}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            cursor: 'pointer', padding: '10px 16px', borderRadius: '12px',
                            backgroundColor: isSyncEnabled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid',
                            borderColor: isSyncEnabled ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {isSyncEnabled ? <Link size={18} color="#60a5fa" /> : <Link2Off size={18} color="#94a3b8" />}
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', color: isSyncEnabled ? '#60a5fa' : '#94a3b8' }}>
                            {t('bestWorst.syncControls') || 'Synchronized'}
                        </span>
                    </div>

                    <button
                        className="btn-pro"
                        onClick={handleAIAnalysis}
                        style={{
                            height: '44px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Sparkles size={18} color="#fbbf24" /> {t('bestWorst.aiAnalysis') || 'AI Vision'}
                    </button>
                </div>
            </div>

            {/* Workspace Area */}
            <div style={{ flex: 1, padding: '0 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: '24px', zIndex: 1, overflowY: 'auto' }}>

                {/* Pro Dropdowns */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <div className="pro-select-wrapper" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <History size={16} color="#3b82f6" />
                        <select
                            value={selectedProjectIds[0] || ''}
                            onChange={(e) => handleProjectSelect('left', e.target.value)}
                            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '800', padding: '12px 0', width: '100%', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                        >
                            <option value="" disabled>{t('bestWorst.selectLeft') || 'Select Left Project...'}</option>
                            {projects.map(p => <option key={p.id} value={p.id} style={{ backgroundColor: '#1a1a24' }}>{p.projectName}</option>)}
                        </select>
                        <ChevronDown size={16} color="rgba(255,255,255,0.2)" />
                    </div>

                    <div className="pro-select-wrapper" style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <History size={16} color="#10b981" />
                        <select
                            value={selectedProjectIds[1] || ''}
                            onChange={(e) => handleProjectSelect('right', e.target.value)}
                            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '800', padding: '12px 0', width: '100%', outline: 'none', cursor: 'pointer', appearance: 'none' }}
                        >
                            <option value="" disabled>{t('bestWorst.selectRight') || 'Select Right Project...'}</option>
                            {projects.map(p => <option key={p.id} value={p.id} style={{ backgroundColor: '#1a1a24' }}>{p.projectName}</option>)}
                        </select>
                        <ChevronDown size={16} color="rgba(255,255,255,0.2)" />
                    </div>
                </div>

                {/* Video Pods Grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', minHeight: '400px' }}>
                    {/* Left Pod */}
                    <div className="video-pod" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(40px)',
                        borderRadius: '28px',
                        border: '1px solid',
                        borderColor: selectedProjectIds[0] ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.08)',
                        animation: (isPlaying && selectedProjectIds[0]) ? 'pulse-glow-blue 3s infinite ease-in-out' : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                    }}>
                        {analysis?.bestCycle?.id && Number(analysis.bestCycle.id) === Number(selectedProjectIds[0]) && (
                            <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 10, background: '#3b82f6', color: '#fff', padding: '6px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '900', boxShadow: '0 4px 15px rgba(59,130,246,0.4)' }}>{t('bestWorst.best')}</div>
                        )}
                        {projectLeft?.videoUrl ? (
                            <video ref={videoRefLeft} src={projectLeft.videoUrl} onTimeUpdate={handleSyncSeek} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ textAlign: 'center', opacity: 0.1 }}>
                                <Video size={80} style={{ marginBottom: '20px' }} />
                                <div style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.05em' }}>WAITING FOR MEDIA</div>
                            </div>
                        )}
                        {projectLeft && (
                            <div style={{ position: 'absolute', bottom: '24px', left: '24px', padding: '12px 20px', borderRadius: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: '800' }}>
                                <span style={{ color: '#60a5fa' }}>{projectLeft.projectName}</span>
                            </div>
                        )}
                    </div>

                    {/* Right Pod */}
                    <div className="video-pod" style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        backdropFilter: 'blur(40px)',
                        borderRadius: '28px',
                        border: '1px solid',
                        borderColor: selectedProjectIds[1] ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.08)',
                        animation: (isPlaying && selectedProjectIds[1]) ? 'pulse-glow-green 3s infinite ease-in-out' : 'none',
                        position: 'relative',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.4)'
                    }}>
                        {analysis?.worstCycle?.id && Number(analysis.worstCycle.id) === Number(selectedProjectIds[1]) && (
                            <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10, background: '#ef4444', color: '#fff', padding: '6px 16px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '900', boxShadow: '0 4px 15px rgba(239,68,68,0.4)' }}>{t('bestWorst.worst')}</div>
                        )}
                        {projectRight?.videoUrl ? (
                            <video ref={videoRefRight} src={projectRight.videoUrl} onTimeUpdate={handleSyncSeek} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <div style={{ textAlign: 'center', opacity: 0.1 }}>
                                <Video size={80} style={{ marginBottom: '20px' }} />
                                <div style={{ fontWeight: '900', fontSize: '1.2rem', letterSpacing: '0.05em' }}>WAITING FOR MEDIA</div>
                            </div>
                        )}
                        {projectRight && (
                            <div style={{ position: 'absolute', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(15px)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.85rem', fontWeight: '800' }}>
                                <span style={{ color: '#34d399' }}>{projectRight.projectName}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Floating Bottom Control Pill */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '32px', padding: '12px 40px',
                        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.12)', borderRadius: '40px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.6)'
                    }}>
                        <button
                            onClick={resetPlayback}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'rgba(255,255,255,0.5)',
                                transition: 'all 0.3s'
                            }}
                            onMouseEnter={e => e.target.style.color = '#fff'}
                            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.5)'}
                            title="Reset"
                        >
                            <RotateCcw size={22} />
                        </button>

                        <button
                            onClick={togglePlayback}
                            style={{
                                width: '60px', height: '60px', borderRadius: '50%',
                                background: isPlaying ? 'rgba(255,255,255,0.1)' : '#fff',
                                color: isPlaying ? '#fff' : '#000',
                                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.4s cubic-bezier(0.1, 0.9, 0.1, 1)',
                                boxShadow: isPlaying ? 'none' : '0 10px 25px rgba(255,255,255,0.2)'
                            }}
                        >
                            {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: '4px' }} />}
                        </button>

                        <button
                            onClick={() => setIsMetricsVisible(!isMetricsVisible)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: isMetricsVisible ? '#3b82f6' : 'rgba(255,255,255,0.5)',
                                transition: 'all 0.3s'
                            }}
                            title="Process Mode"
                        >
                            <LayoutPanelLeft size={22} />
                        </button>
                    </div>
                </div>

                {/* Integrated Analytics & Process List */}
                {analysis && (
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        backdropFilter: 'blur(40px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '28px',
                        padding: '24px',
                        marginTop: '8px',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <History size={20} color="#f59e0b" />
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', letterSpacing: '-0.01em' }}>Process Comparison</h3>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px 14px', borderRadius: '10px', color: '#60a5fa', fontWeight: '800', fontSize: '0.8rem', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    {analysis.timeSaved.toFixed(2)}s Improvement
                                </div>
                            </div>
                        </div>

                        <div style={{ maxHeight: '350px', overflowY: 'auto', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#0e0e1a' }}>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em' }} rowSpan={2}>Work Element</th>
                                        <th style={{ textAlign: 'center', padding: '12px 20px', borderLeft: '1px solid rgba(255,255,255,0.05)', color: '#60a5fa', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em' }} colSpan={4}>LEFT PROJECT</th>
                                        <th style={{ textAlign: 'center', padding: '12px 20px', borderLeft: '1px solid rgba(255,255,255,0.05)', color: '#34d399', fontSize: '0.7rem', fontWeight: '900', letterSpacing: '0.1em' }} colSpan={4}>RIGHT PROJECT</th>
                                        <th style={{ textAlign: 'right', padding: '12px 20px', borderLeft: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem', textTransform: 'uppercase' }} rowSpan={2}>Delta</th>
                                    </tr>
                                    <tr style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th style={{ padding: '8px 10px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Start</th>
                                        <th style={{ padding: '8px 10px' }}>End</th>
                                        <th style={{ padding: '8px 10px' }}>Duration</th>
                                        <th style={{ padding: '8px 10px' }}>Type</th>
                                        <th style={{ padding: '8px 10px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>Start</th>
                                        <th style={{ padding: '8px 10px' }}>End</th>
                                        <th style={{ padding: '8px 10px' }}>Duration</th>
                                        <th style={{ padding: '8px 10px' }}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analysis.elementComparison.map((item, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => handleElementClick(item)}
                                            className="element-row"
                                            style={{
                                                borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <td style={{ padding: '12px 20px' }}>
                                                <div style={{ fontWeight: '800', fontSize: '0.8rem' }}>{item.elementName}</div>
                                            </td>

                                            {/* Left Data */}
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', borderLeft: '1px solid rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>{item.left.start.toFixed(1)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{item.left.end.toFixed(1)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '800', fontSize: '0.8rem', color: '#fff' }}>{item.left.duration.toFixed(2)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', color: item.left.category === 'Value-added' ? '#3b82f6' : '#ef4444' }}>{item.left.category.charAt(0)}</td>

                                            {/* Right Data */}
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', borderLeft: '1px solid rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)' }}>{item.right.start.toFixed(1)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{item.right.end.toFixed(1)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: '800', fontSize: '0.8rem', color: '#fff' }}>{item.right.duration.toFixed(2)}s</td>
                                            <td style={{ padding: '12px 10px', textAlign: 'center', fontSize: '0.6rem', fontWeight: '900', textTransform: 'uppercase', color: item.right.category === 'Value-added' ? '#3b82f6' : '#ef4444' }}>{item.right.category.charAt(0)}</td>

                                            {/* Delta */}
                                            <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: '900', fontSize: '0.8rem', borderLeft: '1px solid rgba(255,255,255,0.03)', color: item.difference > 0 ? '#ef4444' : '#10b981' }}>
                                                {item.difference > 0 ? '+' : ''}{item.difference.toFixed(2)}s
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            <AIChatOverlay
                visible={showAIChat}
                onClose={() => setShowAIChat(false)}
                systemPrompt={aiSystemPrompt}
                title="Mavi Comparison Analyst"
                subtitle="Side-by-Side Advisor"
            />
        </div>
    );
}

export default BestWorstCycle;
