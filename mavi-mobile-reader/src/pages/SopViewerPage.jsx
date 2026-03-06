import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { extractSteps, getPublishedManualById } from '../lib/manualApi';

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

const SopViewerPage = () => {
    const { manualId } = useParams();
    const [manual, setManual] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!manualId) {
                setError('manualId tidak tersedia.');
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError('');
            try {
                const data = await getPublishedManualById(manualId);
                if (!cancelled) {
                    if (!data) {
                        setError('SOP tidak ditemukan atau belum PUBLISHED.');
                    } else {
                        setManual(data);
                        setCurrentStepIndex(0);
                    }
                }
            } catch (err) {
                if (!cancelled) setError('Gagal memuat SOP dari server.');
                // eslint-disable-next-line no-console
                console.error('Load SOP error:', err);
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [manualId]);

    const steps = useMemo(() => extractSteps(manual), [manual]);
    const currentStep = steps[currentStepIndex] || null;
    const progress = steps.length ? Math.round(((currentStepIndex + 1) / steps.length) * 100) : 0;

    const renderMedia = () => {
        if (!currentStep) return <div className="media-empty">No step selected</div>;
        const mediaUrl = currentStep?.media?.url || currentStep?.images?.[0];
        const mediaType = String(currentStep?.media?.type || '').toLowerCase();

        if (!mediaUrl) return <div className="media-empty">No media</div>;

        if (mediaType === 'video') {
            return <video src={mediaUrl} controls className="media-content" />;
        }

        if (mediaType === 'youtube') {
            const embed = getYouTubeEmbedUrl(currentStep?.media?.youtubeUrl || mediaUrl);
            if (embed) {
                return (
                    <iframe
                        src={embed}
                        className="media-content"
                        title={`youtube-${currentStep?.id || currentStepIndex}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                    />
                );
            }
        }

        return <img src={mediaUrl} alt={currentStep?.title || 'Step media'} className="media-content" />;
    };

    return (
        <div className="page shell">
            <header className="topbar">
                <h1>{manual?.title || 'SOP Viewer'}</h1>
                <p>{manual?.documentNumber || '-'} • v{manual?.version || '1.0'}</p>
            </header>

            {isLoading ? <div className="panel">Memuat SOP...</div> : null}
            {!isLoading && error ? <div className="panel error-text">{error}</div> : null}

            {!isLoading && !error ? (
                <>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                    </div>

                    <section className="media-card">
                        {renderMedia()}
                    </section>

                    <section className="panel step-panel">
                        <div className="step-meta">Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} / {Math.max(steps.length, 1)} • {progress}%</div>
                        <h3>{currentStep?.title || 'Untitled Step'}</h3>
                        <div
                            className="instruction"
                            dangerouslySetInnerHTML={{ __html: currentStep?.instructions || '<p>No instruction available.</p>' }}
                        />
                    </section>

                    <div className="footer-actions">
                        <button
                            className="btn"
                            disabled={currentStepIndex <= 0}
                            onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                        >
                            Back
                        </button>
                        <button
                            className="btn primary"
                            disabled={currentStepIndex >= steps.length - 1}
                            onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)))}
                        >
                            Next
                        </button>
                    </div>
                </>
            ) : null}

            <div className="footer-actions">
                <Link to="/" className="btn ghost">Home</Link>
                <Link to="/sop" className="btn ghost">List SOP</Link>
            </div>
        </div>
    );
};

export default SopViewerPage;
