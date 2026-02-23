import React from 'react';
import {
    Video, Upload,
    VideoOff, Play
} from 'lucide-react';

const SourceVideo = ({
    videoSrc,
    videoRef,
    onUpload,
    activeStep,
    onMarkIn,
    onMarkOut,
    onSeekTo,
    tt // Translation function from ManualCreation
}) => {
    return (
        <div className="glass-panel" style={{
            width: '320px',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            height: 'fit-content',
            position: 'sticky',
            top: '20px'
        }}>
            <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                fontWeight: '800',
                color: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                fontSize: '0.85rem',
                letterSpacing: '0.02em',
                textTransform: 'uppercase'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Video size={16} style={{ color: '#60a5fa' }} />
                    {tt('manual.sourceVideo', 'Source Video')}
                </div>
                <label style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: '#60a5fa',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    transition: 'all 0.2s'
                }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.2)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'}
                >
                    <Upload size={14} />
                    {tt('manual.uploadVideo', 'Upload Video')}
                    <input
                        type="file"
                        accept="video/*"
                        style={{ display: 'none' }}
                        onChange={onUpload}
                    />
                </label>
            </div>

            <div style={{ height: '12px' }} />

            <div style={{ padding: '0 20px 20px 20px' }}>
                {videoSrc ? (
                    <div className="glass-panel" style={{ overflow: 'hidden', backgroundColor: '#000', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
                        <video
                            ref={videoRef}
                            src={videoSrc}
                            controls
                            style={{ width: '100%', display: 'block' }}
                        />
                        <div style={{
                            padding: '8px',
                            display: 'flex',
                            gap: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            borderTop: '1px solid rgba(255,255,255,0.08)'
                        }}>
                            <button
                                onClick={onMarkIn}
                                className="btn-pro"
                                style={{
                                    flex: 1,
                                    fontSize: '0.7rem',
                                    padding: '6px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Mark Clip In Point"
                            >
                                Mulai: {activeStep?.startTime || 0}s
                            </button>
                            <button
                                onClick={onMarkOut}
                                className="btn-pro"
                                style={{
                                    flex: 1,
                                    fontSize: '0.7rem',
                                    padding: '6px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                                title="Mark Clip Out Point"
                            >
                                Selesai: {Math.round(((activeStep?.startTime || 0) + (activeStep?.duration || 0)) * 10) / 10}s
                            </button>
                            {activeStep?.startTime !== undefined && (
                                <button
                                    onClick={() => onSeekTo(activeStep.startTime)}
                                    className="btn-pro"
                                    style={{
                                        width: '32px',
                                        padding: '6px',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    title="Seek to In"
                                >
                                    <Play size={12} fill="currentColor" />
                                </button>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="glass-panel" style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        borderStyle: 'dashed',
                        borderWidth: '1px',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px'
                    }}>
                        <div style={{
                            width: '48px', height: '48px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'rgba(255, 255, 255, 0.2)'
                        }}>
                            <VideoOff size={24} />
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>
                            {tt('manual.noVideoLoaded', 'No video loaded')}
                        </div>
                        <label className="btn-pro" style={{
                            padding: '8px 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            color: 'white',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            <Upload size={14} />
                            {tt('manual.uploadVideo', 'Upload Video')}
                            <input
                                type="file"
                                accept="video/*"
                                style={{ display: 'none' }}
                                onChange={onUpload}
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SourceVideo;
