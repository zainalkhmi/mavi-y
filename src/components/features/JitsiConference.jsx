import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getJitsiSettings } from '../../utils/jitsiSettings';

const normalizeJitsiDomain = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return 'meet.jit.si';

    // Accept user input such as:
    // - meet.jit.si
    // - https://meet.jit.si/
    // - meet.jit.si/some/path
    try {
        if (raw.startsWith('http://') || raw.startsWith('https://')) {
            return new URL(raw).hostname || 'meet.jit.si';
        }
    } catch (_) {
        // fallback below
    }

    return raw.replace(/^\/+|\/+$/g, '').split('/')[0] || 'meet.jit.si';
};

const loadJitsiScript = (domain) => {
    if (window.JitsiMeetExternalAPI) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-jitsi-external-api="true"]');
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Failed to load Jitsi API script')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = `https://${domain}/external_api.js`;
        script.async = true;
        script.setAttribute('data-jitsi-external-api', 'true');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Jitsi API script'));
        document.body.appendChild(script);
    });
};

function JitsiConference() {
    const containerRef = useRef(null);
    const apiRef = useRef(null);

    const settings = useMemo(() => getJitsiSettings(), []);
    const [roomName, setRoomName] = useState(`${settings.defaultRoomPrefix}-${Math.random().toString(36).slice(2, 7)}`);
    const [displayName, setDisplayName] = useState(settings.defaultDisplayName || 'Guest');
    const [isJoining, setIsJoining] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreenView, setIsFullscreenView] = useState(false);
    const [error, setError] = useState('');
    const [directEmbedUrl, setDirectEmbedUrl] = useState('');
    const [diagnostics, setDiagnostics] = useState({
        domain: '-',
        scriptUrl: '-',
        crossOriginIsolated: window.crossOriginIsolated,
        iframeDetected: false,
        status: 'idle'
    });

    const leaveConference = () => {
        if (apiRef.current) {
            apiRef.current.dispose();
            apiRef.current = null;
        }
        setDirectEmbedUrl('');
        setIsJoined(false);
    };

    useEffect(() => {
        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }
        };
    }, []);

    const joinConference = async () => {
        const room = roomName.trim();
        if (!room) {
            setError('Room name wajib diisi.');
            return;
        }

        const configuredDomain = normalizeJitsiDomain(settings.domain);
        const roomUrl = `https://${configuredDomain}/${encodeURIComponent(room)}`;

        setError('');
        setIsJoining(true);
        setDirectEmbedUrl('');

        // In some environments, cross-origin isolated pages can break
        // Jitsi External API iframe bootstrapping. Fallback to direct iframe mode.
        if (window.crossOriginIsolated) {
            setDirectEmbedUrl(roomUrl);
            setDiagnostics(prev => ({
                ...prev,
                domain: configuredDomain,
                scriptUrl: '-',
                crossOriginIsolated: true,
                iframeDetected: true,
                status: 'direct-embed-mode'
            }));
            setIsJoined(true);
            setIsJoining(false);
            setError('Mode kompatibilitas aktif (direct embed). Jika video masih blank, klik Copy Meeting Link lalu buka di tab baru.');
            return;
        }

        const initConference = async (domain, isFallback = false) => {
            const scriptUrl = `https://${domain}/external_api.js`;
            setDiagnostics(prev => ({
                ...prev,
                domain,
                scriptUrl,
                crossOriginIsolated: window.crossOriginIsolated,
                iframeDetected: false,
                status: isFallback ? 'retrying-fallback' : 'initializing'
            }));

            await loadJitsiScript(domain);

            if (!containerRef.current) {
                throw new Error('Conference container not available');
            }

            if (apiRef.current) {
                apiRef.current.dispose();
                apiRef.current = null;
            }

            const api = new window.JitsiMeetExternalAPI(domain, {
                roomName: room,
                parentNode: containerRef.current,
                width: '100%',
                height: '100%',
                userInfo: {
                    displayName: displayName || 'Guest'
                },
                configOverwrite: {
                    prejoinPageEnabled: !!settings.enableWelcomePage,
                    startWithAudioMuted: !!settings.startWithAudioMuted,
                    startWithVideoMuted: !!settings.startWithVideoMuted
                },
                interfaceConfigOverwrite: {
                    TOOLBAR_BUTTONS: settings.toolbarButtons || []
                }
            });

            api.addListener('readyToClose', () => {
                setIsJoined(false);
            });

            // Do not hard-fail on `videoConferenceJoined` timeout because in some
            // browser/policy combinations the event can be delayed even though
            // iframe loads correctly. Detect iframe presence instead.
            await new Promise(resolve => setTimeout(resolve, 1200));
            const iframe = containerRef.current.querySelector('iframe');
            const iframeDetected = !!iframe;

            setDiagnostics(prev => ({
                ...prev,
                domain,
                scriptUrl,
                iframeDetected,
                status: iframeDetected ? 'joined' : 'iframe-missing'
            }));

            return api;
        };

        try {
            let api;
            try {
                api = await initConference(configuredDomain, false);
            } catch (primaryError) {
                if (configuredDomain !== 'meet.jit.si') {
                    console.warn('Primary Jitsi domain failed, retrying with meet.jit.si:', primaryError);
                    api = await initConference('meet.jit.si', true);
                } else {
                    throw primaryError;
                }
            }

            apiRef.current = api;
            setIsJoined(true);

            if (!containerRef.current?.querySelector('iframe')) {
                setError(
                    'Iframe Jitsi belum muncul. Coba tunggu beberapa detik atau klik Rejoin. Jika tetap blank, klik tombol Refresh (ikon 🔄) di sidebar lalu join lagi.'
                );
            }
        } catch (err) {
            console.error('Failed to join Jitsi conference:', err);
            const baseMessage = err?.message || 'Gagal memulai Jitsi conference.';
            const isolationHint = window.crossOriginIsolated
                ? ' Browser sedang cross-origin isolated; jika iframe Jitsi blank/refused, coba jalankan tanpa COEP header.'
                : '';
            setError(`${baseMessage}${isolationHint}`);
            setDiagnostics(prev => ({ ...prev, status: 'failed' }));
            setIsJoined(false);
        } finally {
            setIsJoining(false);
        }
    };

    const handleCopyLink = async () => {
        const domain = normalizeJitsiDomain(settings.domain);
        const room = roomName.trim();
        if (!room) return;

        const url = `https://${domain}/${encodeURIComponent(room)}`;
        await navigator.clipboard.writeText(url);
    };

    const handleHidePanel = () => {
        setShowControls(false);
        setIsFullscreenView(true);
    };

    const handleShowPanel = () => {
        setShowControls(true);
        setIsFullscreenView(false);
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: showControls ? '12px' : '0px',
            height: '100%',
            minHeight: 0,
            position: isFullscreenView ? 'fixed' : 'relative',
            inset: isFullscreenView ? 0 : 'auto',
            zIndex: isFullscreenView ? 2500 : 'auto',
            background: isFullscreenView ? '#000' : 'transparent',
            padding: isFullscreenView ? '0' : '0'
        }}>
            {showControls ? (
                <div style={{
                    padding: '14px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    display: 'grid',
                    gap: '10px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>🎥 Jitsi Video Conference</h3>
                        <button
                            onClick={handleHidePanel}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', background: 'transparent' }}
                        >
                            Hide + Fullscreen
                        </button>
                    </div>

                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Domain: <strong>{settings.domain}</strong> • Screen share tersedia via tombol desktop di toolbar.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <input
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            placeholder="Room name"
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Display name"
                            style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={joinConference}
                            disabled={isJoining}
                            style={{ padding: '10px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'white', background: '#0078d4' }}
                        >
                            {isJoining ? 'Joining...' : isJoined ? 'Rejoin Room' : 'Join Room'}
                        </button>
                        <button
                            onClick={leaveConference}
                            disabled={!isJoined}
                            style={{ padding: '10px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'white', background: '#c50f1f' }}
                        >
                            Leave
                        </button>
                        <button
                            onClick={handleCopyLink}
                            style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', background: 'transparent' }}
                        >
                            Copy Meeting Link
                        </button>
                    </div>

                    {error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem' }}>⚠️ {error}</div>}

                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
                        Diagnostics: domain=<strong>{diagnostics.domain}</strong>, iframe={diagnostics.iframeDetected ? 'ok' : 'none'}, isolated={String(diagnostics.crossOriginIsolated)}, status={diagnostics.status}
                    </div>
                </div>
            ) : (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    zIndex: 20,
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                }}>
                    <button
                        onClick={handleShowPanel}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.55)' }}
                    >
                        Exit Fullscreen
                    </button>
                    <button
                        onClick={() => setShowControls(true)}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.55)' }}
                    >
                        Show Panel
                    </button>
                    <button
                        onClick={leaveConference}
                        disabled={!isJoined}
                        style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', color: 'white', background: 'rgba(197,15,31,0.9)' }}
                    >
                        Leave
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                style={{
                    flex: 1,
                    minHeight: showControls ? '520px' : '0',
                    border: '1px solid var(--border-color)',
                    borderRadius: isFullscreenView ? '0' : '8px',
                    overflow: 'hidden',
                    background: '#000'
                }}
            >
                {directEmbedUrl && (
                    <iframe
                        title="Jitsi Conference"
                        src={directEmbedUrl}
                        style={{ width: '100%', height: '100%', minHeight: showControls ? '520px' : '100%', border: 'none' }}
                        allow="camera; microphone; display-capture; autoplay; clipboard-write; fullscreen"
                    />
                )}
            </div>
        </div>
    );
}

export default JitsiConference;
