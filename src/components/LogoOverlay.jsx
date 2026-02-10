import React, { useState } from 'react';

function LogoOverlay({ onLogoChange, onPositionChange, onOpacityChange }) {
    const [logoUrl, setLogoUrl] = useState(null);
    const [position, setPosition] = useState('bottom-right');
    const [opacity, setOpacity] = useState(0.7);
    const [size, setSize] = useState(100);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setLogoUrl(url);
            if (onLogoChange) onLogoChange(url);
        }
    };

    const handlePositionChange = (newPosition) => {
        setPosition(newPosition);
        if (onPositionChange) onPositionChange(newPosition);
    };

    const handleOpacityChange = (newOpacity) => {
        setOpacity(newOpacity);
        if (onOpacityChange) onOpacityChange(newOpacity);
    };

    const handleSizeChange = (newSize) => {
        setSize(newSize);
    };

    const removeLogo = () => {
        setLogoUrl(null);
        if (onLogoChange) onLogoChange(null);
    };

    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '10px'
        }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                🎨 Logo/Watermark Overlay
            </h3>

            {!logoUrl ? (
                <div>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        id="logo-upload"
                    />
                    <label
                        htmlFor="logo-upload"
                        className="btn"
                        style={{
                            display: 'inline-block',
                            padding: '8px 16px',
                            backgroundColor: 'var(--accent-blue)',
                            cursor: 'pointer'
                        }}
                    >
                        📁 Upload Logo
                    </label>
                    <p style={{ fontSize: '0.8rem', color: '#888', marginTop: '8px' }}>
                        Upload gambar logo/watermark (PNG, JPG, SVG)
                    </p>
                </div>
            ) : (
                <div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                        <img
                            src={logoUrl}
                            alt="Logo preview"
                            style={{
                                maxWidth: '100px',
                                maxHeight: '60px',
                                backgroundColor: '#333',
                                padding: '5px',
                                borderRadius: '4px'
                            }}
                        />
                        <button
                            className="btn"
                            onClick={removeLogo}
                            style={{ backgroundColor: '#a00', padding: '6px 12px' }}
                        >
                            🗑 Remove
                        </button>
                    </div>

                    {/* Position Control */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>
                            Position:
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
                            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(pos => (
                                <button
                                    key={pos}
                                    className="btn"
                                    onClick={() => handlePositionChange(pos)}
                                    style={{
                                        padding: '6px',
                                        fontSize: '0.75rem',
                                        backgroundColor: position === pos ? 'var(--accent-blue)' : '#555'
                                    }}
                                >
                                    {pos.replace('-', ' ').toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Opacity Control */}
                    <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>
                            Opacity: {Math.round(opacity * 100)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={opacity}
                            onChange={(e) => handleOpacityChange(parseFloat(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>

                    {/* Size Control */}
                    <div>
                        <label style={{ fontSize: '0.85rem', color: '#aaa', display: 'block', marginBottom: '5px' }}>
                            Size: {size}px
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="300"
                            step="10"
                            value={size}
                            onChange={(e) => handleSizeChange(parseInt(e.target.value))}
                            style={{ width: '100%' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default LogoOverlay;
