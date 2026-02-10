import React, { useState, useEffect } from 'react';
import { X, Download, RefreshCw, FileText, Sparkles, Globe } from 'lucide-react';
import { generateKaizenReport } from '../../utils/aiGenerator';
import jsPDF from 'jspdf';

function KaizenReportDialog({ isOpen, onClose, projectData }) {
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportContent, setReportContent] = useState('');
    const [error, setError] = useState(null);
    const [language, setLanguage] = useState('English');

    const languages = [
        { code: 'English', label: '🇺🇸 English' },
        { code: 'Indonesian', label: '🇮🇩 Indonesia' },
        { code: 'Japanese', label: '🇯🇵 日本語 (Japanese)' },
        { code: 'German', label: '🇩🇪 Deutsch' },
        { code: 'Spanish', label: '🇪🇸 Español' },
        { code: 'Chinese', label: '🇨🇳 中文 (Chinese)' }
    ];

    useEffect(() => {
        if (isOpen && !reportContent && !isGenerating) {
            // Auto-generate on open if empty
            handleGenerate();
        }
    }, [isOpen]);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setError(null);
        setReportContent('');

        try {
            const report = await generateKaizenReport(projectData, undefined, null, language);
            setReportContent(report);
        } catch (err) {
            console.error("Report generation failed:", err);
            setError(err.message || "Failed to generate report.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!reportContent) return;

        const doc = new jsPDF();

        // Simple PDF generation (for MVP)
        // In a real app, we might want to use html2canvas or a more robust markdown-to-pdf library
        const splitText = doc.splitTextToSize(reportContent.replace(/[#*`]/g, ''), 180);

        doc.setFontSize(16);
        doc.text(`Kaizen Report: ${projectData.projectName || 'Project'}`, 15, 15);

        doc.setFontSize(11);
        let y = 30;
        splitText.forEach(line => {
            if (y > 280) {
                doc.addPage();
                y = 20;
            }
            doc.text(line, 15, y);
            y += 7;
        });

        doc.save(`Kaizen_Report_${projectData.projectName || 'Project'}.pdf`);
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 2000
        }}>
            <div style={{
                backgroundColor: '#1e1e1e',
                width: '800px',
                maxWidth: '90%',
                height: '80vh',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                border: '1px solid #333'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#252525',
                    borderRadius: '12px 12px 0 0'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={24} color="#00d2ff" />
                        <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>One-Click Kaizen Report</h2>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        {/* Language Selector */}
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <Globe size={16} color="#aaa" style={{ position: 'absolute', left: '10px', zIndex: 1 }} />
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                style={{
                                    padding: '6px 10px 6px 32px',
                                    backgroundColor: '#333',
                                    color: 'white',
                                    border: '1px solid #555',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            >
                                {languages.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.label}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            onClick={onClose}
                            style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer' }}
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '30px',
                    overflowY: 'auto',
                    color: '#ddd',
                    fontFamily: 'Segoe UI, sans-serif',
                    lineHeight: '1.6'
                }}>
                    {error ? (
                        <div style={{
                            padding: '20px',
                            backgroundColor: '#3a1a1a',
                            border: '1px solid #ff4b4b',
                            borderRadius: '8px',
                            color: '#ff9999'
                        }}>
                            <strong>Error:</strong> {error}
                            <br />
                            <button
                                onClick={handleGenerate}
                                style={{
                                    marginTop: '10px',
                                    padding: '8px 16px',
                                    backgroundColor: '#ff4b4b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : isGenerating ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: '#888'
                        }}>
                            <RefreshCw size={48} className="spin" style={{ marginBottom: '20px', animation: 'spin 1s linear infinite' }} />
                            <p>Analyzing process data...</p>
                            <p>Identifying waste...</p>
                            <p>Generating recommendations...</p>
                            <style>{`
                                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                            `}</style>
                        </div>
                    ) : reportContent ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                            {reportContent}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#666', marginTop: '50px' }}>
                            <FileText size={48} style={{ marginBottom: '10px' }} />
                            <p>Ready to generate report.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px',
                    borderTop: '1px solid #333',
                    backgroundColor: '#252525',
                    borderRadius: '0 0 12px 12px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px'
                }}>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#333',
                            color: 'white',
                            border: '1px solid #555',
                            borderRadius: '6px',
                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <RefreshCw size={18} /> Regenerate
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={!reportContent || isGenerating}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: !reportContent || isGenerating ? '#555' : '#00d2ff',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: !reportContent || isGenerating ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: 'bold'
                        }}
                    >
                        <Download size={18} /> Download PDF
                    </button>
                </div>
            </div>
        </div>
    );
}

export default KaizenReportDialog;
