import React from 'react';

function MainFunctionFlow() {
    const steps = [
        { title: "Pengambilan Video", color: "#004d99" }, // Video Shooting
        { title: "Pemecahan Elemen", color: "#004d99" }, // Element Breakdown
        { title: "Analisis Gerakan / Eliminasi Pemborosan", color: "#007399" }, // Motion Analysis / Waste Elimination
        { title: "Pembuatan Kerja Standar", color: "#008080" }, // Creation of Standardized Work
        { title: "Pelatihan Kerja Standar", color: "#1a906b" }, // Training of Standardized Work
        { title: "Pengukuran Efek", color: "#1a906b" } // Effect Measurement
    ];

    return (
        <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f5f5f0', // Light background like image
            padding: '50px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '100%', maxWidth: '1200px' }}>

                {/* Arrow Loop Line */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '-50px',
                    width: 'calc(100% + 100px)',
                    height: '200px',
                    border: '15px solid #005a9e',
                    borderTop: 'none',
                    borderRight: '15px solid #1a906b', // Gradient effect simulated
                    zIndex: 0,
                    transform: 'translateY(-20px)'
                }}></div>

                {/* Steps */}
                <div style={{ display: 'flex', width: '100%', zIndex: 1 }}>
                    {steps.map((step, index) => (
                        <div key={index} style={{
                            flex: 1,
                            height: '150px',
                            backgroundColor: step.color,
                            marginRight: '-20px', // Overlap for chevron effect
                            clipPath: 'polygon(0% 0%, 85% 0%, 100% 50%, 85% 100%, 0% 100%, 15% 50%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 30px 0 40px', // Adjust padding for shape
                            color: 'white',
                            fontWeight: 'bold',
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            position: 'relative',
                            filter: 'drop-shadow(2px 4px 6px black)'
                        }}>
                            {step.title}
                        </div>
                    ))}
                </div>

                {/* Start Arrow */}
                <div style={{
                    position: 'absolute',
                    left: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '0',
                    height: '0',
                    borderTop: '30px solid transparent',
                    borderBottom: '30px solid transparent',
                    borderLeft: '40px solid #005a9e',
                    zIndex: 2
                }}></div>

            </div>
        </div>
    );
}

export default MainFunctionFlow;
