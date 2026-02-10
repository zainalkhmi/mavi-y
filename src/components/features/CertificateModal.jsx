import React, { useRef } from 'react';
import { X, Printer, Download, Award, Share2 } from 'lucide-react';

const CertificateModal = ({ isOpen, onClose, recipientName, courseName, completedDate, instructorName = "MAVi AI Sensei" }) => {
    const certificateRef = useRef(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        const printContent = certificateRef.current.innerHTML;
        const originalContent = document.body.innerHTML;

        // Create a temporary print frame/window to avoid messing up the main app state
        const printWindow = window.open('', '', 'height=600,width=800');

        printWindow.document.write('<html><head><title>Certificate of Completion</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Great+Vibes&family=Montserrat:wght@400;600&display=swap');
            body { 
                margin: 0; 
                padding: 0; 
                background-color: #f9f9f9;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                font-family: 'Montserrat', sans-serif;
            }
            .certificate-container {
                position: relative;
                width: 100%;
                max-width: 800px;
                height: 600px;
                padding: 40px;
                background-color: #fff;
                border: 20px solid #2c3e50;
                color: #333;
                text-align: center;
                box-sizing: border-box;
                background-image: radial-gradient(circle at center, transparent, rgba(0,0,0,0.03));
            }
            .certificate-border {
                border: 2px solid #daa520;
                height: 100%;
                width: 100%;
                position: relative;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                padding: 20px;
                box-sizing: border-box;
            }
            .certificate-corner {
                position: absolute;
                width: 80px;
                height: 80px;
                border-color: #daa520;
                border-style: solid;
            }
            .top-left { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
            .top-right { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
            .bottom-left { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
            .bottom-right { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }
            
            h1 {
                font-family: 'Cinzel', serif;
                font-size: 48px;
                color: #2c3e50;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 4px;
            }
            .subtitle {
                font-size: 18px;
                color: #7f8c8d;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-bottom: 40px;
            }
            .recipient {
                font-family: 'Great Vibes', cursive;
                font-size: 64px;
                color: #daa520;
                margin: 20px 0;
                border-bottom: 2px solid #ecf0f1;
                padding-bottom: 10px;
                display: inline-block;
                min-width: 400px;
            }
            .course-text {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 30px;
            }
            .course-name {
                font-weight: bold;
                font-size: 24px;
                color: #2c3e50;
                margin: 10px 0;
            }
            .footer {
                display: flex;
                justify-content: space-around;
                width: 80%;
                margin-top: 50px;
            }
            .signature-block {
                text-align: center;
            }
            .signature {
                font-family: 'Great Vibes', cursive;
                font-size: 32px;
                color: #2c3e50;
                border-bottom: 1px solid #7f8c8d;
                padding-bottom: 5px;
                margin-bottom: 5px;
                min-width: 200px;
            }
            .label {
                font-size: 12px;
                color: #95a5a6;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .badge-icon {
                position: absolute;
                bottom: 40px;
                left: 50%;
                transform: translateX(-50%);
                opacity: 0.1;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                }
                .certificate-container {
                     margin: 0;
                     box-shadow: none;
                     border: 10px solid #2c3e50;
                }
            }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();

        // Wait for fonts to load briefly then print
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div style={{
                marginBottom: '20px',
                display: 'flex',
                gap: '16px'
            }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        color: '#fff',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <X size={18} /> Close
                </button>
                <button
                    onClick={handlePrint}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#daa520',
                        border: 'none',
                        color: '#000',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 0 15px rgba(218, 165, 32, 0.4)'
                    }}
                >
                    <Printer size={18} /> Print / Save PDF
                </button>
            </div>

            <div ref={certificateRef} style={{ animation: 'slideUp 0.5s ease-out' }}>
                <div className="certificate-container" style={{
                    width: '800px',
                    height: '600px',
                    padding: '40px',
                    backgroundColor: '#fff',
                    border: '20px solid #2c3e50',
                    textAlign: 'center',
                    position: 'relative',
                    color: '#333',
                    fontFamily: "'Montserrat', sans-serif" // Fallback style for preview
                }}>
                    {/* Inline styles for preview consistency */}
                    <div style={{
                        border: '2px solid #daa520',
                        height: '100%',
                        width: '100%',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '20px',
                        boxSizing: 'border-box'
                    }}>
                        {/* Decorative Corners */}
                        <div style={{ position: 'absolute', top: 10, left: 10, width: 60, height: 60, borderLeft: '2px solid #daa520', borderTop: '2px solid #daa520' }}></div>
                        <div style={{ position: 'absolute', top: 10, right: 10, width: 60, height: 60, borderRight: '2px solid #daa520', borderTop: '2px solid #daa520' }}></div>
                        <div style={{ position: 'absolute', bottom: 10, left: 10, width: 60, height: 60, borderLeft: '2px solid #daa520', borderBottom: '2px solid #daa520' }}></div>
                        <div style={{ position: 'absolute', bottom: 10, right: 10, width: 60, height: 60, borderRight: '2px solid #daa520', borderBottom: '2px solid #daa520' }}></div>

                        <div style={{ marginBottom: '10px' }}>
                            <Award size={48} color="#daa520" />
                        </div>

                        <h1 style={{
                            fontFamily: "serif",
                            fontSize: '48px',
                            color: '#2c3e50',
                            marginBottom: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '4px',
                            margin: '0 0 10px 0'
                        }}>Certificate</h1>
                        <div style={{
                            fontSize: '18px',
                            color: '#7f8c8d',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            marginBottom: '30px'
                        }}>of Completion</div>

                        <div style={{ fontSize: '16px', color: '#555' }}>This certifies that</div>

                        <div style={{
                            fontFamily: "cursive",
                            fontSize: '56px',
                            color: '#daa520',
                            margin: '20px 0',
                            borderBottom: '2px solid #ecf0f1',
                            paddingBottom: '10px',
                            minWidth: '400px',
                            fontStyle: 'italic'
                        }}>{recipientName}</div>

                        <div style={{ fontSize: '16px', color: '#555', marginBottom: '20px' }}>
                            has successfully completed the module
                        </div>

                        <div style={{
                            fontWeight: 'bold',
                            fontSize: '28px',
                            color: '#2c3e50',
                            marginBottom: '40px',
                            maxWidth: '80%'
                        }}>{courseName}</div>

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-around',
                            width: '80%',
                            marginTop: '40px'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontFamily: "cursive",
                                    fontSize: '28px',
                                    color: '#2c3e50',
                                    borderBottom: '1px solid #7f8c8d',
                                    paddingBottom: '5px',
                                    marginBottom: '5px',
                                    minWidth: '200px',
                                    fontStyle: 'italic'
                                }}>{instructorName}</div>
                                <div style={{ fontSize: '12px', color: '#95a5a6', textTransform: 'uppercase', letterSpacing: '1px' }}>Instructor</div>
                            </div>

                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: '20px',
                                    color: '#2c3e50',
                                    borderBottom: '1px solid #7f8c8d',
                                    paddingBottom: '12px',
                                    marginBottom: '8px',
                                    minWidth: '200px',
                                    marginTop: '8px'
                                }}>{completedDate}</div>
                                <div style={{ fontSize: '12px', color: '#95a5a6', textTransform: 'uppercase', letterSpacing: '1px' }}>Date Completed</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default CertificateModal;
