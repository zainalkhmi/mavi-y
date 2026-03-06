import React, { useEffect, useState } from 'react';
import { getKnowledgeBaseItem, getItemByCloudId } from '../../utils/knowledgeBaseDB';
import { getManualByCloudId } from '../../utils/supabaseManualDB';
import './mobile-dozuki.css';

const extractYouTubeVideoId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

        if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
        if (host.includes('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
            if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
            if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        }
    } catch {
        // fallback below
    }

    return /^[a-zA-Z0-9_-]{11}$/.test(raw) ? raw : null;
};

const getYouTubeEmbedUrl = (value = '') => {
    const id = extractYouTubeVideoId(value);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};

const MobileDozukiViewer = ({ manualId, onClose }) => {
    const [manual, setManual] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        const loadManual = async () => {
            setIsLoading(true);
            setError('');

            try {
                const numericId = Number(manualId);
                let data = null;

                try {
                    data = await getManualByCloudId(manualId);
                } catch (supabaseError) {
                    console.warn('Supabase unavailable, fallback to local manual source:', supabaseError);
                }

                if (!data && Number.isFinite(numericId)) {
                    data = await getKnowledgeBaseItem(numericId);
                }

                if (!data) {
                    data = await getItemByCloudId(manualId);
                }

                if (!data) {
                    setError('Manual tidak ditemukan');
                    return;
                }

                setManual(data);
            } catch (err) {
                console.error('Failed to load manual in MobileDozukiViewer:', err);
                setError('Gagal memuat manual dari cloud');
            } finally {
                setIsLoading(false);
            }
        };

        loadManual();
    }, [manualId]);

    const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
        ? manual.content
        : null;
    const steps = manual?.steps || contentObj?.steps || manual?.content || [];
    const currentStep = steps[currentStepIndex] || null;
    const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

    const renderMedia = () => {
        if (!currentStep) return <div className="mavi-mobile-media-empty">No step selected</div>;

        const mediaUrl = currentStep?.media?.url || currentStep?.images?.[0];
        const mediaType = String(currentStep?.media?.type || '').toLowerCase();

        if (!mediaUrl) {
            return <div className="mavi-mobile-media-empty">No media</div>;
        }

        if (mediaType === 'video') {
            return <video src={mediaUrl} controls className="mavi-mobile-media-content" />;
        }

        if (mediaType === 'youtube') {
            const embed = getYouTubeEmbedUrl(currentStep?.media?.youtubeUrl || mediaUrl);
            if (embed) {
                return (
                    <iframe
                        src={embed}
                        className="mavi-mobile-media-content"
                        title={`mobile-youtube-${currentStep?.id || currentStepIndex}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                );
            }
        }

        return <img src={mediaUrl} alt={currentStep?.title || 'Step media'} className="mavi-mobile-media-content" />;
    };

    if (isLoading) {
        return (
            <div className="mavi-mobile-page">
                <div className="mavi-mobile-phone mavi-mobile-centered">Loading manual...</div>
            </div>
        );
    }

    if (error || !manual) {
        return (
            <div className="mavi-mobile-page">
                <div className="mavi-mobile-phone mavi-mobile-centered">
                    <h3 style={{ marginTop: 0 }}>Oops</h3>
                    <p>{error || 'Manual tidak ditemukan.'}</p>
                    <button className="mavi-mobile-btn" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="mavi-mobile-page">
            <div className="mavi-mobile-phone">
                <header className="mavi-mobile-header">
                    <button className="mavi-mobile-icon-btn" onClick={onClose}>←</button>
                    <div className="mavi-mobile-head-title">
                        <div className="mavi-mobile-app-name">MAVI SOP</div>
                        <div className="mavi-mobile-manual-title">{manual?.title || 'Manual'}</div>
                    </div>
                    <div className="mavi-mobile-chip">{progress}%</div>
                </header>

                <div className="mavi-mobile-progress-track">
                    <div className="mavi-mobile-progress-fill" style={{ width: `${progress}%` }} />
                </div>

                <main className="mavi-mobile-main">
                    <section className="mavi-mobile-media-card">
                        {renderMedia()}
                    </section>

                    <section className="mavi-mobile-step-card">
                        <div className="mavi-mobile-step-meta">Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} / {Math.max(steps.length, 1)}</div>
                        <h3>{currentStep?.title || 'Untitled Step'}</h3>
                        <div className="mavi-mobile-instruction" dangerouslySetInnerHTML={{ __html: currentStep?.instructions || '<p>No instruction available.</p>' }} />
                    </section>
                </main>

                <div className="mavi-mobile-actions">
                    <button
                        className="mavi-mobile-btn"
                        disabled={currentStepIndex <= 0}
                        onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                    >
                        Back
                    </button>
                    <button
                        className="mavi-mobile-btn mavi-mobile-btn-primary"
                        disabled={currentStepIndex >= steps.length - 1}
                        onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)))}
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MobileDozukiViewer;
