import React from 'react';
import { Camera, Upload, X, Image } from 'lucide-react';

const StepMediaControls = ({
    step,
    onCaptureImage,
    handleStepUpdate,
    activeImageIndex,
    setActiveImageIndex,
    tt
}) => {
    if (!step) return null;

    const images = step.images || [];

    const handleDeleteImage = (index) => {
        const newImages = images.filter((_, i) => i !== index);
        handleStepUpdate(step.id, { ...step, images: newImages });
        if (activeImageIndex >= newImages.length) {
            setActiveImageIndex(Math.max(0, newImages.length - 1));
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

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                    onClick={onCaptureImage}
                    className="btn-pro"
                    style={{
                        flex: 1,
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '8px'
                    }}
                >
                    <Camera size={14} />
                    <span>Capture</span>
                </button>

                <label className="btn-pro" style={{
                    flex: 1,
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
                    <Upload size={14} />
                    <span>Upload</span>
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
            </div>

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
        </div>
    );
};

export default StepMediaControls;
