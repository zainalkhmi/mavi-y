import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Video, X, Square, CircleDot } from 'lucide-react';

const readBlobAsDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || null);
    reader.onerror = () => reject(new Error('Failed to convert recording to data URL'));
    reader.readAsDataURL(blob);
});

const CameraCaptureModal = ({
    isOpen,
    mode = 'photo', // 'photo' | 'video'
    onClose,
    onCapturePhoto,
    onCaptureVideo,
    tt
}) => {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const [isLoadingCamera, setIsLoadingCamera] = useState(false);
    const [cameraError, setCameraError] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recordedBlob, setRecordedBlob] = useState(null);

    const canRecordVideo = typeof window !== 'undefined' && typeof window.MediaRecorder !== 'undefined';

    const recordedPreviewUrl = useMemo(() => {
        if (!recordedBlob) return null;
        return URL.createObjectURL(recordedBlob);
    }, [recordedBlob]);

    useEffect(() => {
        return () => {
            if (recordedPreviewUrl) {
                URL.revokeObjectURL(recordedPreviewUrl);
            }
        };
    }, [recordedPreviewUrl]);

    useEffect(() => {
        const stopStream = () => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
                mediaRecorderRef.current.stop();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
                streamRef.current = null;
            }
        };

        const startCamera = async () => {
            if (!isOpen) return;
            setCameraError('');
            setRecordedBlob(null);
            setIsRecording(false);
            setIsLoadingCamera(true);

            if (!navigator?.mediaDevices?.getUserMedia) {
                setCameraError(tt?.('manual.cameraNotSupported', 'Camera API not supported in this browser.') || 'Camera API not supported in this browser.');
                setIsLoadingCamera(false);
                return;
            }

            try {
                const constraints = {
                    video: true,
                    audio: mode === 'video'
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play().catch(() => { });
                }
            } catch (error) {
                console.error('Failed to access camera:', error);
                setCameraError(tt?.('manual.cameraPermissionDenied', 'Unable to access camera/microphone. Please allow permission.') || 'Unable to access camera/microphone. Please allow permission.');
            } finally {
                setIsLoadingCamera(false);
            }
        };

        startCamera();

        return () => {
            stopStream();
        };
    }, [isOpen, mode, tt]);

    if (!isOpen) return null;

    const handleTakePhoto = () => {
        if (!videoRef.current) return;
        const videoEl = videoRef.current;
        if (!videoEl.videoWidth || !videoEl.videoHeight) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapturePhoto && onCapturePhoto(dataUrl);
        onClose && onClose();
    };

    const handleStartRecording = () => {
        if (!streamRef.current || !canRecordVideo) return;
        chunksRef.current = [];
        setRecordedBlob(null);

        const recorder = new MediaRecorder(streamRef.current, {
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
                ? 'video/webm;codecs=vp9,opus'
                : 'video/webm'
        });

        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            if (chunksRef.current.length > 0) {
                const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || 'video/webm' });
                setRecordedBlob(blob);
            }
            setIsRecording(false);
        };

        recorder.start();
        setIsRecording(true);
    };

    const handleStopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
    };

    const handleUseRecording = async () => {
        if (!recordedBlob) return;
        try {
            const dataUrl = await readBlobAsDataUrl(recordedBlob);
            if (dataUrl) {
                onCaptureVideo && onCaptureVideo(dataUrl);
                onClose && onClose();
            }
        } catch (error) {
            console.error('Failed to read recorded video:', error);
            setCameraError(tt?.('manual.videoReadFailed', 'Failed to process recorded video.') || 'Failed to process recorded video.');
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 3000,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                width: 'min(860px, 95vw)',
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.14)',
                background: 'linear-gradient(160deg, rgba(15,23,42,0.95), rgba(2,6,23,0.95))',
                boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                overflow: 'hidden'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e2e8f0', fontWeight: 700 }}>
                        {mode === 'photo' ? <Camera size={16} /> : <Video size={16} />}
                        {mode === 'photo'
                            ? (tt?.('manual.captureFromCamera', 'Capture from Camera') || 'Capture from Camera')
                            : (tt?.('manual.recordFromCamera', 'Record Video from Camera') || 'Record Video from Camera')}
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: 'none',
                            background: 'rgba(255,255,255,0.08)',
                            color: '#e2e8f0',
                            width: '30px',
                            height: '30px',
                            borderRadius: '7px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                        title={tt?.('common.close', 'Close') || 'Close'}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '16px', display: 'grid', gap: '12px' }}>
                    <div style={{
                        width: '100%',
                        aspectRatio: '16/9',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        background: '#000',
                        border: '1px solid rgba(255,255,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {!cameraError && (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted={mode === 'photo'}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        )}
                        {(isLoadingCamera || cameraError) && (
                            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9rem', textAlign: 'center', padding: '14px' }}>
                                {isLoadingCamera
                                    ? (tt?.('manual.openingCamera', 'Opening camera...') || 'Opening camera...')
                                    : cameraError}
                            </div>
                        )}
                    </div>

                    {mode === 'video' && recordedPreviewUrl && (
                        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ padding: '6px 10px', fontSize: '0.72rem', color: '#93c5fd', background: 'rgba(59,130,246,0.08)' }}>
                                {tt?.('manual.recordedPreview', 'Recorded Preview') || 'Recorded Preview'}
                            </div>
                            <video controls src={recordedPreviewUrl} style={{ width: '100%', display: 'block', background: '#000' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {mode === 'photo' ? (
                            <button
                                onClick={handleTakePhoto}
                                disabled={isLoadingCamera || !!cameraError}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(59,130,246,0.4)',
                                    background: 'rgba(59,130,246,0.2)',
                                    color: '#bfdbfe',
                                    fontWeight: 700,
                                    cursor: isLoadingCamera || !!cameraError ? 'not-allowed' : 'pointer',
                                    opacity: isLoadingCamera || !!cameraError ? 0.5 : 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Camera size={15} /> {tt?.('manual.takePhoto', 'Take Photo') || 'Take Photo'}
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleStartRecording}
                                    disabled={!canRecordVideo || isLoadingCamera || !!cameraError || isRecording}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(239,68,68,0.45)',
                                        background: 'rgba(239,68,68,0.18)',
                                        color: '#fca5a5',
                                        fontWeight: 700,
                                        cursor: !canRecordVideo || isLoadingCamera || !!cameraError || isRecording ? 'not-allowed' : 'pointer',
                                        opacity: !canRecordVideo || isLoadingCamera || !!cameraError || isRecording ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <CircleDot size={15} /> {tt?.('manual.startRecording', 'Start Recording') || 'Start Recording'}
                                </button>
                                <button
                                    onClick={handleStopRecording}
                                    disabled={!isRecording}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(251,191,36,0.45)',
                                        background: 'rgba(251,191,36,0.16)',
                                        color: '#fde68a',
                                        fontWeight: 700,
                                        cursor: !isRecording ? 'not-allowed' : 'pointer',
                                        opacity: !isRecording ? 0.5 : 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}
                                >
                                    <Square size={15} /> {tt?.('manual.stopRecording', 'Stop Recording') || 'Stop Recording'}
                                </button>
                                <button
                                    onClick={handleUseRecording}
                                    disabled={!recordedBlob}
                                    style={{
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(34,197,94,0.45)',
                                        background: 'rgba(34,197,94,0.16)',
                                        color: '#86efac',
                                        fontWeight: 700,
                                        cursor: !recordedBlob ? 'not-allowed' : 'pointer',
                                        opacity: !recordedBlob ? 0.5 : 1
                                    }}
                                >
                                    {tt?.('manual.useRecording', 'Use Recording') || 'Use Recording'}
                                </button>
                            </>
                        )}
                    </div>

                    {mode === 'video' && !canRecordVideo && (
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#fca5a5',
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            padding: '8px 10px',
                            borderRadius: '8px'
                        }}>
                            {tt?.('manual.mediaRecorderNotSupported', 'Video recording is not supported in this browser.') || 'Video recording is not supported in this browser.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CameraCaptureModal;
