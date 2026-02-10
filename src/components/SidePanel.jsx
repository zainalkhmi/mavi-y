import React from 'react';

function SidePanel() {
    const menuItems = [
        "Mainkan dengan Gerakan Tidak Valid",
        "Mainkan Video Mentah",
        "Mainkan dengan Gerakan Tidak Valid",
        "Mainkan tanpa Gerakan Tidak Valid",
        "Mainkan dengan Peringkat"
    ];

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)' }}>
            <div style={{
                backgroundColor: '#4a6fa5',
                color: 'white',
                padding: '10px',
                fontWeight: 'bold',
                fontSize: '0.9rem'
            }}>
                Fitur Pemutaran Simulasi
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ backgroundColor: '#333', padding: '10px', borderRadius: '4px' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {menuItems.map((item, index) => (
                            <li key={index} style={{
                                padding: '10px',
                                borderBottom: '1px solid #444',
                                cursor: 'pointer',
                                color: index === 0 ? 'white' : '#aaa',
                                backgroundColor: index === 0 ? '#444' : 'transparent'
                            }}>
                                {item} {index === 0 && '▼'}
                            </li>
                        ))}
                    </ul>
                </div>

                <div style={{ marginTop: 'auto', color: '#4a6fa5', textAlign: 'center', fontSize: '0.9rem' }}>
                    Tersedia pemutaran empat tahap
                </div>
            </div>
        </div>
    );
}

export default SidePanel;
