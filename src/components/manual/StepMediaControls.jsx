import React, { useState } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Video } from 'lucide-react';

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || null);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
});

const decodeHtmlEntities = (value = '') => String(value || '').replace(/&amp;/g, '&');

const probeImageUrl = (url, timeoutMs = 8000) => new Promise((resolve) => {
    let done = false;
    const ImgCtor = typeof window !== 'undefined' ? window.Image : null;
    if (!ImgCtor) {
        resolve(false);
        return;
    }
    const img = new ImgCtor();

    const cleanup = (result) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        img.onload = null;
        img.onerror = null;
        resolve(result);
    };

    const timer = setTimeout(() => cleanup(false), timeoutMs);
    img.onload = () => cleanup(true);
    img.onerror = () => cleanup(false);
    img.src = url;
});

const IMGUR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

const resolveWorkingImgurUrl = async (imgurId) => {
    const normalizedId = String(imgurId || '').trim();
    if (!normalizedId) return null;

    for (const ext of IMGUR_EXTENSIONS) {
        const candidate = `https://i.imgur.com/${normalizedId}.${ext}`;
        // eslint-disable-next-line no-await-in-loop
        const ok = await probeImageUrl(candidate);
        if (ok) return candidate;
    }

    return null;
};

const extractYouTubeVideoId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    try {
        const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

        if (host === 'youtu.be') {
            return parsed.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (host.includes('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
            if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
            if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        }
    } catch {
        // fallback below
    }

    return null;
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'];

const isLikelyImagePath = (pathname = '') => {
    const ext = pathname.split('.').pop()?.toLowerCase();
    return IMAGE_EXTENSIONS.includes(ext);
};

const extractImgurId = (pathname = '') => {
    const parts = String(pathname || '').split('/').filter(Boolean);
    if (!parts.length) return null;

    if (parts[0] === 'a' || parts[0] === 'gallery') {
        return parts[1] || null;
    }
    return parts[0] || null;
};

const resolveMediaLink = async (rawValue) => {
    const raw = String(rawValue || '').trim();
    if (!raw) {
        return { ok: false, error: 'Link kosong. Masukkan URL terlebih dahulu.' };
    }

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    let parsed;
    try {
        parsed = new URL(withProtocol);
    } catch {
        return { ok: false, error: 'Format URL tidak valid.' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'URL harus menggunakan http atau https.' };
    }

    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    // YouTube URL / Video ID
    const youtubeId = extractYouTubeVideoId(raw);
    if (youtubeId) {
        return {
            ok: true,
            mediaType: 'youtube',
            youtubeUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
            sourceUrl: withProtocol
        };
    }

    // Generic image URL (accept any http/https URL, then verify it can be rendered)
    if (!host.includes('imgur.com')) {
        const ok = await probeImageUrl(parsed.href);
        if (!ok) {
            return {
                ok: false,
                error: 'Link gambar tidak bisa diakses. Pastikan URL mengarah langsung ke file image yang masih aktif.'
            };
        }
        return { ok: true, mediaType: 'image', directUrl: parsed.href, sourceUrl: parsed.href };
    }

    // i.imgur.com direct link
    if (host === 'i.imgur.com') {
        if (isLikelyImagePath(parsed.pathname)) {
            const ok = await probeImageUrl(parsed.href);
            if (ok) {
                return { ok: true, mediaType: 'image', directUrl: parsed.href, sourceUrl: parsed.href };
            }
        }

        const fallbackId = extractImgurId(parsed.pathname);
        if (fallbackId) {
            const workingDirectUrl = await resolveWorkingImgurUrl(fallbackId);
            if (!workingDirectUrl) {
                return {
                    ok: false,
                    error: 'Link Imgur tidak bisa diakses atau gambar sudah dihapus.'
                };
            }
            return {
                ok: true,
                mediaType: 'image',
                directUrl: workingDirectUrl,
                sourceUrl: parsed.href
            };
        }

        return { ok: false, error: 'Link Imgur tidak dikenali.' };
    }

    // imgur.com page/album/gallery
    const imgurId = extractImgurId(parsed.pathname);
    if (!imgurId) {
        return { ok: false, error: 'Link Imgur tidak dikenali.' };
    }

    const isAlbumLikePath = parsed.pathname.startsWith('/a/') || parsed.pathname.startsWith('/gallery/');

    // Try oEmbed first (works for page + album in many cases)
    if (!isAlbumLikePath) {
        try {
            const endpoint = `https://api.imgur.com/oembed.json?url=${encodeURIComponent(parsed.href)}`;
            const response = await fetch(endpoint);
            if (response.ok) {
                const payload = await response.json();
                const thumbnail = decodeHtmlEntities(payload?.thumbnail_url || '');
                if (thumbnail) {
                    return {
                        ok: true,
                        mediaType: 'image',
                        directUrl: thumbnail,
                        sourceUrl: parsed.href
                    };
                }
            }
        } catch {
            // silent fallback below
        }
    }

    // Fallback conversion from page id to direct image URL with extension probing
    const workingDirectUrl = await resolveWorkingImgurUrl(imgurId);
    if (!workingDirectUrl) {
        if (isAlbumLikePath) {
            return {
                ok: false,
                error: 'Link Imgur album tidak bisa dipakai langsung. Buka gambar lalu gunakan direct link i.imgur.com/... (jpg/png/webp).'
            };
        }
        return {
            ok: false,
            error: 'Link Imgur tidak bisa diakses atau gambar sudah dihapus.'
        };
    }

    return {
        ok: true,
        mediaType: 'image',
        directUrl: workingDirectUrl,
        sourceUrl: parsed.href
    };
};

const StepMediaControls = ({
    step,
    onCaptureImage,
    handleStepUpdate,
    activeImageIndex,
    setActiveImageIndex,
    tt,
    globalVideoSrc
}) => {
    if (!step) return null;

    const images = step.images || [];
    const [imgurLinkInput, setImgurLinkInput] = useState('');
    const [imgurLinkError, setImgurLinkError] = useState('');
    const [isResolvingImgur, setIsResolvingImgur] = useState(false);

    const handleDeleteImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        handleStepUpdate(step.id, { ...step, images: newImages });
        if (activeImageIndex >= newImages.length) {
            setActiveImageIndex(Math.max(0, newImages.length - 1));
        }
    };

    const handleAddImgurLink = async () => {
        setImgurLinkError('');
        setIsResolvingImgur(true);

        try {
            const resolved = await resolveMediaLink(imgurLinkInput);
            if (!resolved.ok) {
                setImgurLinkError(resolved.error || 'Link tidak dapat diproses.');
                return;
            }

            if (resolved.mediaType === 'youtube' && resolved.youtubeUrl) {
                handleStepUpdate(step.id, {
                    ...step,
                    media: {
                        ...(step.media || {}),
                        type: 'youtube',
                        youtubeUrl: resolved.youtubeUrl,
                        url: resolved.youtubeUrl,
                        sourceUrl: resolved.sourceUrl || resolved.youtubeUrl
                    }
                });
            } else {
                const nextImages = [...images, resolved.directUrl];
                handleStepUpdate(step.id, {
                    ...step,
                    images: nextImages,
                    media: {
                        ...(step.media || {}),
                        type: 'image',
                        url: resolved.directUrl,
                        sourceUrl: resolved.sourceUrl || resolved.directUrl
                    }
                });
                setActiveImageIndex(Math.max(nextImages.length - 1, 0));
            }

            setImgurLinkInput('');
            setImgurLinkError('');
        } finally {
            setIsResolvingImgur(false);
        }
    };

    return (
        <div className="glass-panel" style={{
            marginTop: '12px',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '12px'
        }}>
            <div style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.4)',
                textTransform: 'uppercase',
                fontWeight: '800',
                marginBottom: '8px',
                letterSpacing: '0.05em'
            }}>
                Step Media
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <button
                    onClick={onCaptureImage}
                    className="btn-pro"
                    disabled={!globalVideoSrc}
                    style={{
                        flex: '1 1 45%',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: globalVideoSrc ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.05)',
                        color: globalVideoSrc ? '#93c5fd' : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${globalVideoSrc ? 'rgba(59, 130, 246, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '8px',
                        cursor: globalVideoSrc ? 'pointer' : 'not-allowed',
                        opacity: globalVideoSrc ? 1 : 0.6
                    }}
                >
                    <Camera size={14} />
                    <span>Capture</span>
                </button>

                <label className="btn-pro" style={{
                    flex: '1 1 45%',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.8)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255,255,255,0.05)'
                }}>
                    <ImageIcon size={14} />
                    <span>Image</span>
                    <input type="file" hidden accept="image/*" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                                const newImages = [...images, ev.target.result];
                                handleStepUpdate(step.id, { ...step, images: newImages });
                            };
                            reader.readAsDataURL(file);
                        }
                    }} />
                </label>

                <label className="btn-pro" style={{
                    flex: '1 1 100%',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#60a5fa',
                    border: '1px solid rgba(37, 99, 235, 0.25)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(37, 99, 235, 0.05)',
                    marginTop: '4px'
                }}>
                    <Video size={14} />
                    <span>Upload Video Clip</span>
                    <input type="file" hidden accept="video/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;

                        try {
                            const dataUrl = await readFileAsDataUrl(file);
                            if (!dataUrl) return;

                            handleStepUpdate(step.id, {
                                ...step,
                                media: { type: 'video', url: dataUrl }
                            });
                        } catch (error) {
                            console.error('Failed to read uploaded video as data URL:', error);
                        }
                    }} />
                </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px', marginBottom: '10px' }}>
                <input
                    value={imgurLinkInput}
                    onChange={(e) => setImgurLinkInput(e.target.value)}
                    placeholder="Paste image/Imgur/YouTube link..."
                    style={{
                        width: '100%',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.14)',
                        background: 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        padding: '8px 10px',
                        fontSize: '0.75rem'
                    }}
                />
                <button
                    onClick={handleAddImgurLink}
                    disabled={isResolvingImgur || !imgurLinkInput.trim()}
                    className="btn-pro"
                    style={{
                        padding: '8px 10px',
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(16,185,129,0.16)',
                        color: '#6ee7b7',
                        borderColor: 'rgba(16,185,129,0.35)',
                        opacity: (isResolvingImgur || !imgurLinkInput.trim()) ? 0.6 : 1,
                        cursor: (isResolvingImgur || !imgurLinkInput.trim()) ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isResolvingImgur ? 'Adding...' : 'Add Link'}
                </button>
            </div>

            {imgurLinkError && (
                <div style={{
                    marginBottom: '10px',
                    fontSize: '0.7rem',
                    color: '#fca5a5',
                    background: 'rgba(239,68,68,0.12)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: '8px',
                    padding: '6px 8px'
                }}>
                    {imgurLinkError}
                </div>
            )}

            {/* Thumbnails */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
                gap: '8px',
                overflowY: 'auto',
                maxHeight: '140px',
                padding: '2px'
            }}>
                {images.map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', width: '100%', aspectRatio: '4/3' }}>
                        <img
                            src={img}
                            onClick={() => setActiveImageIndex(idx)}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                cursor: 'pointer',
                                borderRadius: '6px',
                                border: activeImageIndex === idx ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                transition: 'all 0.2s'
                            }}
                            alt={`Thumb ${idx}`}
                        />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteImage(idx);
                            }}
                            style={{
                                position: 'absolute',
                                top: -6,
                                right: -6,
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 2
                            }}
                        >
                            <X size={10} color="#fff" />
                        </button>
                    </div>
                ))}
                {images.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        height: '60px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.2)',
                        border: '1px dashed rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        fontSize: '0.75rem'
                    }}>
                        No images captured
                    </div>
                )}
            </div>

            <div style={{
                color: 'rgba(255,255,255,0.25)',
                fontSize: '0.6rem',
                textAlign: 'center',
                marginTop: '8px',
                fontStyle: 'italic'
            }}>
                Drag to rearrange
            </div>
        </div >
    );
};

export default StepMediaControls;
