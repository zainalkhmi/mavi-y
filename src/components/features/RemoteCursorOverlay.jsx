import React from 'react';

function RemoteCursorOverlay({ x, y, label }) {
    if (x === null || y === null) return null;

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none', // Pass clicks through
            zIndex: 99999
        }}>
            <div style={{
                position: 'absolute',
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                transform: 'translate(-50%, -50%)',
                transition: 'all 0.1s ease-out'
            }}>
                {/* Cursor Icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19177L17.9169 12.3673H5.65376Z" fill="#FF0000" stroke="white" strokeWidth="1" />
                </svg>

                {/* Label */}
                <div style={{
                    backgroundColor: '#FF0000',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '10px',
                    whiteSpace: 'nowrap',
                    marginLeft: '12px',
                    marginTop: '0px'
                }}>
                    {label || 'Remote Viewer'}
                </div>
            </div>
        </div>
    );
}

export default RemoteCursorOverlay;
