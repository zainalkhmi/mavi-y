import React, { useState, useEffect, useMemo } from 'react';
import { getKnowledgeBaseItem, getItemByCloudId, updateKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
import { getManualByCloudId, appendManualAcknowledgement } from '../utils/tursoAPI';

const PublicManualViewer = ({ manualId, onClose }) => {
    const [manual, setManual] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [ackName, setAckName] = useState('');
    const [ackRole, setAckRole] = useState('Operator');
    const [isSubmittingAck, setIsSubmittingAck] = useState(false);

    useEffect(() => {
        loadManual();
    }, [manualId]);

    const loadManual = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const numericId = Number(manualId);
            let data = null;

            // 1) Cloud-first (public QR path)
            data = await getManualByCloudId(manualId);

            // 2) Legacy local numeric id
            if (Number.isFinite(numericId)) {
                data = data || await getKnowledgeBaseItem(numericId);
            }

            // 3) Legacy local cloudId lookup
            if (!data) {
                data = await getItemByCloudId(manualId);
            }

            if (data) {
                setManual(data);
            } else {
                setError('Manual not found');
            }
        } catch (err) {
            console.error('Failed to load manual:', err);
            setError('Failed to load manual from cloud');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const query = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search.substring(1));
    const requestedVersion = query.get('v');
    const requestedStepId = query.get('stepId');
    const requestedStepNumber = Number(query.get('step') || '');
    const requestedStation = query.get('station');

    const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
        ? manual.content
        : null;
    const steps = manual?.steps || contentObj?.steps || manual?.content || [];
    const manualStatus = manual?.status || contentObj?.status || contentObj?.workflow?.status || 'Draft';
    const manualVersion = manual?.version || contentObj?.version || '1.0';
    const readAcks = Array.isArray(contentObj?.readAcks) ? contentObj.readAcks : [];

    const focusedStepIndex = useMemo(() => {
        if (!steps.length) return -1;

        if (requestedStepId) {
            const idx = steps.findIndex((s) => String(s?.id || '') === String(requestedStepId));
            if (idx >= 0) return idx;
        }

        if (Number.isFinite(requestedStepNumber) && requestedStepNumber > 0 && requestedStepNumber <= steps.length) {
            return requestedStepNumber - 1;
        }

        if (requestedStation) {
            const target = requestedStation.trim().toLowerCase();
            const idx = steps.findIndex((s) => String(s?.title || '').trim().toLowerCase() === target);
            if (idx >= 0) return idx;
        }

        return -1;
    }, [steps, requestedStepId, requestedStepNumber, requestedStation]);

    useEffect(() => {
        if (focusedStepIndex < 0) return;
        const el = document.getElementById(`public-step-${focusedStepIndex}`);
        if (el) {
            setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    }, [focusedStepIndex]);

    const alreadyAcknowledged = readAcks.some(
        (ack) => ack.version === manualVersion && ack.userName?.trim()?.toLowerCase() === ackName.trim().toLowerCase()
    );

    const handleAcknowledge = async () => {
        if (!manual) return;
        if (!ackName.trim()) {
            alert('Please enter your name before acknowledging.');
            return;
        }
        if (manualStatus !== 'Released') {
            alert('This SOP is not Released yet and cannot be acknowledged.');
            return;
        }

        setIsSubmittingAck(true);
        try {
            const currentContent = contentObj || {};
            const currentAcks = Array.isArray(currentContent.readAcks) ? currentContent.readAcks : [];
            const exists = currentAcks.some(
                (ack) => ack.version === manualVersion && ack.userName?.trim()?.toLowerCase() === ackName.trim().toLowerCase()
            );
            if (exists) {
                alert(`Acknowledgement for version ${manualVersion} already exists for ${ackName}.`);
                return;
            }

            const nextAcks = [
                {
                    id: Math.random().toString(36).slice(2, 10),
                    version: manualVersion,
                    userName: ackName.trim(),
                    role: ackRole,
                    acknowledgedAt: new Date().toISOString(),
                    source: 'qrcode-public-viewer'
                },
                ...currentAcks
            ];

            const cloudId = manual?.cloudId || manualId;
            let savedToCloud = false;

            if (cloudId) {
                try {
                    await appendManualAcknowledgement(cloudId, nextAcks[0]);
                    savedToCloud = true;
                } catch (cloudError) {
                    console.warn('Cloud acknowledgement save failed, fallback to local:', cloudError);
                }
            }

            if (!savedToCloud && manual?.id) {
                await updateKnowledgeBaseItem(manual.id, {
                    content: {
                        ...currentContent,
                        readAcks: nextAcks
                    }
                });
            }

            setManual((prev) => ({
                ...prev,
                content: {
                    ...(currentContent || {}),
                    readAcks: nextAcks
                }
            }));

            alert(`Acknowledgement saved for ${ackName} (v${manualVersion}).`);
        } catch (ackError) {
            console.error('Failed to acknowledge SOP:', ackError);
            alert('Failed to save acknowledgement. Please try again.');
        } finally {
            setIsSubmittingAck(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#525659' }}>
                <div style={{ color: 'white', fontSize: '1.5rem' }}>Loading document...</div>
            </div>
        );
    }

    if (error || !manual) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#525659' }}>
                <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '20px' }}>❌</div>
                    <h2>Document Not Found</h2>
                    <p style={{ color: '#666' }}>{error || 'The requested manual could not be found.'}</p>
                    <button onClick={onClose} style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#0078d4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        );
    }

    // A4 dimensions in pixels (approx 96 DPI): 794px x 1123px
    // Using mm for print accuracy
    const styles = {
        container: {
            backgroundColor: '#525659', // Dark grey background like PDF viewers
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '40px 0',
            fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif'
        },
        page: {
            backgroundColor: 'white',
            width: '210mm',
            minHeight: '297mm', // A4 height
            padding: '20mm',
            boxShadow: '0 0 10px rgba(0,0,0,0.5)',
            marginBottom: '20px',
            position: 'relative',
            boxSizing: 'border-box'
        },
        controls: {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            display: 'flex',
            gap: '15px',
            zIndex: 1000
        },
        controlButton: {
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: '#0078d4',
            color: 'white',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            transition: 'transform 0.2s, background-color 0.2s'
        },
        // Document Header
        docHeader: {
            borderBottom: '2px solid #333',
            paddingBottom: '10px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end'
        },
        title: {
            fontSize: '24pt',
            margin: 0,
            color: '#000',
            fontWeight: 'bold'
        },
        docNumber: {
            fontSize: '12pt',
            color: '#666'
        },
        // Meta Table
        metaTable: {
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '30px',
            fontSize: '10pt'
        },
        metaCell: {
            border: '1px solid #000',
            padding: '6px 10px'
        },
        metaLabel: {
            backgroundColor: '#f0f0f0',
            fontWeight: 'bold',
            width: '15%'
        },
        // Steps
        stepContainer: {
            marginBottom: '20px',
            breakInside: 'avoid', // Prevent breaking inside a step when printing
            pageBreakInside: 'avoid'
        },
        stepTitle: {
            fontSize: '14pt',
            fontWeight: 'bold',
            color: '#0078d4',
            borderBottom: '1px solid #eee',
            paddingBottom: '5px',
            marginBottom: '10px'
        },
        stepContent: {
            display: 'flex',
            gap: '20px'
        },
        stepImage: {
            width: '200px',
            height: 'auto',
            objectFit: 'contain',
            border: '1px solid #ddd'
        },
        bullet: {
            fontSize: '10pt',
            marginBottom: '4px',
            padding: '5px',
            borderRadius: '4px'
        }
    };

    return (
        <div className="pdf-viewer-container" style={styles.container}>
            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        background: none;
                        margin: 0;
                    }
                    .pdf-viewer-container {
                        background: none !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    .pdf-page {
                        box-shadow: none !important;
                        margin: 0 !important;
                        width: 100% !important;
                        min-height: auto !important;
                        page-break-after: always;
                    }
                    .pdf-controls {
                        display: none !important;
                    }
                    /* Hide browser header/footer if possible (standard behavior) */
                    @page {
                        margin: 0;
                        size: A4;
                    }
                }
            `}</style>

            {/* Floating Controls */}
            <div className="pdf-controls" style={styles.controls}>
                <button
                    style={styles.controlButton}
                    onClick={handlePrint}
                    title="Print / Save as PDF"
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                    🖨️
                </button>
                {onClose && (
                    <button
                        style={{ ...styles.controlButton, backgroundColor: '#666' }}
                        onClick={onClose}
                        title="Close Viewer"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* A4 Page(s) */}
            <div className="pdf-page" style={styles.page}>
                {manualStatus !== 'Released' && (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#fff4e5', border: '1px solid #ffcc80', color: '#8a5200', fontSize: '10pt' }}>
                        This SOP is not released yet (status: <strong>{manualStatus}</strong>). Operator access is read-only.
                    </div>
                )}

                {requestedVersion && requestedVersion !== manualVersion && (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#e8f0fe', border: '1px solid #90caf9', color: '#0d47a1', fontSize: '10pt' }}>
                        You scanned version <strong>{requestedVersion}</strong>, but latest available is <strong>{manualVersion}</strong>.
                    </div>
                )}

                {focusedStepIndex >= 0 && (
                    <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', backgroundColor: '#e8f5e9', border: '1px solid #81c784', color: '#1b5e20', fontSize: '10pt' }}>
                        Deep link target: <strong>Step {focusedStepIndex + 1}</strong> ({steps[focusedStepIndex]?.title || 'Station'}).
                    </div>
                )}

                {/* Header */}
                <div style={styles.docHeader}>
                    <div>
                        <h1 style={styles.title}>{manual.title}</h1>
                        <div style={{ fontSize: '10pt', color: '#666', marginTop: '5px' }}>
                            {manual.author ? `Authored by: ${manual.author}` : 'MAVi Motion Study'}
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.docNumber}>Doc #: {manual.documentNumber || 'N/A'}</div>
                        <div style={{ fontSize: '10pt' }}>Rev: {manual.revisionDate || new Date().toLocaleDateString()}</div>
                        <div style={{ fontSize: '10pt', fontWeight: 'bold' }}>ver {manual.version || '1.0'}</div>
                    </div>
                </div>

                {/* Meta Table */}
                <table style={styles.metaTable}>
                    <tbody>
                        <tr>
                            <td style={{ ...styles.metaCell, ...styles.metaLabel }}>Category</td>
                            <td style={styles.metaCell}>{manual.category || 'Standard Work'}</td>
                            <td style={{ ...styles.metaCell, ...styles.metaLabel }}>Status</td>
                            <td style={styles.metaCell}>{manual.status || 'Draft'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.metaCell, ...styles.metaLabel }}>Difficulty</td>
                            <td style={styles.metaCell}>{manual.difficulty || 'Moderate'}</td>
                            <td style={{ ...styles.metaCell, ...styles.metaLabel }}>Time Req.</td>
                            <td style={styles.metaCell}>{manual.timeRequired || '-'}</td>
                        </tr>
                        <tr>
                            <td style={{ ...styles.metaCell, ...styles.metaLabel }}>Summary</td>
                            <td colSpan="3" style={styles.metaCell}>
                                {manual.summary || manual.description || 'No description provided.'}
                            </td>
                        </tr>
                    </tbody>
                </table>

                {/* Steps Content */}
                <div>
                    {steps.map((step, idx) => (
                        <div
                            key={step.id || idx}
                            id={`public-step-${idx}`}
                            style={{
                                ...styles.stepContainer,
                                border: focusedStepIndex === idx ? '2px solid #0078d4' : 'none',
                                borderRadius: focusedStepIndex === idx ? '8px' : '0px',
                                padding: focusedStepIndex === idx ? '8px' : '0px',
                                backgroundColor: focusedStepIndex === idx ? '#f5fbff' : 'transparent'
                            }}
                        >
                            <div style={styles.stepTitle}>Step {idx + 1}: {step.title}</div>
                            <div style={styles.stepContent}>
                                {step.media && step.media.url && (
                                    <div style={{ flexShrink: 0 }}>
                                        <img src={step.media.url} alt="Step Visual" style={styles.stepImage} />
                                    </div>
                                )}
                                <div style={{ flex: 1 }}>
                                    <div
                                        style={{ fontSize: '11pt', lineHeight: '1.4', marginBottom: '10px' }}
                                        dangerouslySetInnerHTML={{ __html: step.instructions || '' }}
                                    />
                                    {step.bullets && step.bullets.length > 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {step.bullets.map((b, i) => (
                                                <div key={i} style={{
                                                    ...styles.bullet,
                                                    borderLeft: `3px solid ${b.type === 'warning' ? '#ff9800' : b.type === 'caution' ? '#d13438' : '#0078d4'}`,
                                                    backgroundColor: '#fafafa'
                                                }}>
                                                    <span style={{
                                                        fontWeight: 'bold',
                                                        color: b.type === 'warning' ? '#ff9800' : b.type === 'caution' ? '#d13438' : '#0078d4'
                                                    }}>
                                                        {b.type.toUpperCase()}:
                                                    </span> {b.text}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed #ccc' }}>
                    <div style={{ fontSize: '11pt', fontWeight: 'bold', marginBottom: '6px' }}>Read & Acknowledge (QR)</div>
                    <div style={{ fontSize: '9pt', color: '#666', marginBottom: '8px' }}>
                        Version: <strong>{manualVersion}</strong> • Current acknowledgements: <strong>{readAcks.filter((ack) => ack.version === manualVersion).length}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="Your name"
                            value={ackName}
                            onChange={(e) => setAckName(e.target.value)}
                            style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '8px', minWidth: '180px' }}
                        />
                        <select value={ackRole} onChange={(e) => setAckRole(e.target.value)} style={{ border: '1px solid #ccc', borderRadius: '6px', padding: '8px' }}>
                            <option value="Operator">Operator</option>
                            <option value="Reviewer">Reviewer</option>
                            <option value="Approver">Approver</option>
                            <option value="Author">Author</option>
                        </select>
                        <button
                            onClick={handleAcknowledge}
                            disabled={isSubmittingAck || manualStatus !== 'Released' || alreadyAcknowledged}
                            style={{
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 14px',
                                backgroundColor: isSubmittingAck || manualStatus !== 'Released' || alreadyAcknowledged ? '#ccc' : '#0078d4',
                                color: '#fff',
                                cursor: isSubmittingAck || manualStatus !== 'Released' || alreadyAcknowledged ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {alreadyAcknowledged ? 'Already Acknowledged' : (isSubmittingAck ? 'Saving...' : 'I Have Read This SOP')}
                        </button>
                    </div>
                </div>

                {/* Footer for Page 1 (simplified, real pagination is complex in HTML/CSS) */}
                <div style={{
                    position: 'absolute',
                    bottom: '10mm',
                    left: '20mm',
                    right: '20mm',
                    borderTop: '1px solid #ddd',
                    paddingTop: '5px',
                    textAlign: 'center',
                    fontSize: '8pt',
                    color: '#888',
                    display: 'flex',
                    justifyContent: 'space-between'
                }}>
                    <span>Generated by MAVi Application</span>
                    <span>{new Date().toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default PublicManualViewer;
