import React, { useEffect, useMemo, useState } from 'react';
import { getKnowledgeBaseItem, getItemByCloudId, updateKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
import { getManualByCloudId, appendManualAcknowledgement, appendManualDataCapture } from '../utils/tursoAPI';

const normalizeReferenceUrl = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        if (!['http:', 'https:'].includes(parsed.protocol)) return null;
        return parsed.href;
    } catch {
        return null;
    }
};

const extractReferenceLinks = (rawValue = '') => {
    return String(rawValue || '')
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({
            label: item,
            url: normalizeReferenceUrl(item)
        }))
        .filter((item) => !!item.url);
};

const PublicManualViewer = ({ manualId, onClose }) => {
    const [manual, setManual] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [stepAnswers, setStepAnswers] = useState({});

    const [ackName, setAckName] = useState('');
    const [ackRole, setAckRole] = useState('Operator');
    const [isSubmittingAck, setIsSubmittingAck] = useState(false);
    const [isSubmittingCapture, setIsSubmittingCapture] = useState(false);

    const query = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search.substring(1));
    const requestedVersion = query.get('v');
    const requestedStepId = query.get('stepId');
    const requestedStepNumber = Number(query.get('step') || '');
    const requestedStation = query.get('station');

    useEffect(() => {
        const loadManual = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const numericId = Number(manualId);
                let data = await getManualByCloudId(manualId);

                if (!data && Number.isFinite(numericId)) {
                    data = await getKnowledgeBaseItem(numericId);
                }

                if (!data) {
                    data = await getItemByCloudId(manualId);
                }

                if (!data) {
                    setError('Manual not found');
                    return;
                }

                setManual(data);
            } catch (err) {
                console.error('Failed to load manual:', err);
                setError('Failed to load manual from cloud');
            } finally {
                setIsLoading(false);
            }
        };

        loadManual();
    }, [manualId]);

    const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
        ? manual.content
        : null;
    const steps = manual?.steps || contentObj?.steps || manual?.content || [];
    const manualStatus = manual?.status || contentObj?.status || contentObj?.workflow?.status || 'Draft';
    const manualVersion = manual?.version || contentObj?.version || '1.0';
    const documentReferenceRaw = manual?.documentNumber || contentObj?.documentNumber || '';
    const referenceLinks = useMemo(() => extractReferenceLinks(documentReferenceRaw), [documentReferenceRaw]);
    const readAcks = Array.isArray(contentObj?.readAcks) ? contentObj.readAcks : [];
    const dataCaptures = Array.isArray(contentObj?.dataCaptures) ? contentObj.dataCaptures : [];

    const deepLinkedStepIndex = useMemo(() => {
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
        if (!steps.length) {
            setCurrentStepIndex(0);
            return;
        }

        if (deepLinkedStepIndex >= 0 && deepLinkedStepIndex < steps.length) {
            setCurrentStepIndex(deepLinkedStepIndex);
        } else {
            setCurrentStepIndex(0);
        }
    }, [deepLinkedStepIndex, steps.length]);

    const currentStep = steps[currentStepIndex] || null;

    const getStepQuestions = (step) => {
        if (step?.hideDataCapture) return [];
        if (Array.isArray(step?.questions) && step.questions.length > 0) return step.questions;
        return [
            {
                id: 'inspection_result',
                type: 'select',
                label: 'What is the inspection result?',
                required: true,
                options: ['OK', 'Rework', 'Need Review']
            },
            {
                id: 'standard_check',
                type: 'radio',
                label: 'Is this step compliant with standard?',
                required: true,
                options: ['Yes', 'No']
            },
            {
                id: 'operator_note',
                type: 'textarea',
                label: 'Operator note'
            }
        ];
    };

    const currentQuestions = currentStep ? getStepQuestions(currentStep) : [];
    const currentAnswer = stepAnswers[currentStep?.id || currentStepIndex] || {};
    const currentStepCaptureCount = dataCaptures.filter(
        (capture) => String(capture?.stepId || '') === String(currentStep?.id || '')
    ).length;

    const isQuestionAnswered = (question) => {
        const value = currentAnswer[question.id];
        if (question.type === 'checkbox') {
            return Array.isArray(value) ? value.length > 0 : !!value;
        }
        return String(value ?? '').trim().length > 0;
    };

    const allRequiredAnswered = currentQuestions.every((q) => !q.required || isQuestionAnswered(q));
    const isReleased = manualStatus === 'Released';
    const isVersionMatch = !requestedVersion || requestedVersion === manualVersion;
    const ackBlockedReason = !isReleased
        ? `SOP status saat ini ${manualStatus}. Acknowledge hanya aktif saat Released.`
        : !isVersionMatch
            ? `Versi yang dipindai (${requestedVersion}) berbeda dari versi terbaru (${manualVersion}).`
            : '';
    const captureBlockedReason = !isReleased
        ? `Data capture dibatasi saat status ${manualStatus}. Rilis SOP terlebih dahulu.`
        : !isVersionMatch
            ? `Data capture untuk versi ${requestedVersion} tidak diizinkan. Gunakan versi terbaru ${manualVersion}.`
            : '';

    const setAnswer = (questionId, value) => {
        const key = currentStep?.id || currentStepIndex;
        setStepAnswers((prev) => ({
            ...prev,
            [key]: {
                ...(prev[key] || {}),
                [questionId]: value
            }
        }));
    };

    const toggleCheckboxAnswer = (questionId, optionValue) => {
        const existing = Array.isArray(currentAnswer[questionId]) ? currentAnswer[questionId] : [];
        const next = existing.includes(optionValue)
            ? existing.filter((val) => val !== optionValue)
            : [...existing, optionValue];
        setAnswer(questionId, next);
    };

    const alreadyAcknowledged = readAcks.some(
        (ack) => ack.version === manualVersion && ack.userName?.trim()?.toLowerCase() === ackName.trim().toLowerCase()
    );

    const handleAcknowledge = async () => {
        if (!manual) return;
        if (!ackName.trim()) {
            alert('Please enter your name before acknowledging.');
            return;
        }
        if (ackName.trim().length < 3) {
            alert('Name must be at least 3 characters.');
            return;
        }
        if (!['Operator', 'Reviewer', 'Approver', 'Author'].includes(ackRole)) {
            alert('Invalid role selected for acknowledgement.');
            return;
        }
        if (!isReleased) {
            alert('This SOP is not Released yet and cannot be acknowledged.');
            return;
        }
        if (!isVersionMatch) {
            alert(`Acknowledgement blocked: scanned version ${requestedVersion} is different from latest version ${manualVersion}.`);
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

            const newAck = {
                id: Math.random().toString(36).slice(2, 10),
                version: manualVersion,
                userName: ackName.trim(),
                role: ackRole,
                acknowledgedAt: new Date().toISOString(),
                source: 'qrcode-public-viewer'
            };

            const cloudId = manual?.cloudId || manualId;
            let savedToCloud = false;

            if (cloudId) {
                try {
                    await appendManualAcknowledgement(cloudId, newAck);
                    savedToCloud = true;
                } catch (cloudError) {
                    console.warn('Cloud acknowledgement save failed, fallback to local:', cloudError);
                }
            }

            const nextAcks = [newAck, ...currentAcks];
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

    const handleSubmitDataCapture = async () => {
        if (!manual || !currentStep) return;
        if (!allRequiredAnswered) {
            alert('Please fill all required data capture fields before submitting.');
            return;
        }
        if (!isReleased) {
            alert(`Data capture is only allowed when SOP is Released. Current status: ${manualStatus}.`);
            return;
        }
        if (!isVersionMatch) {
            alert(`Data capture blocked for scanned version ${requestedVersion}. Please use latest version ${manualVersion}.`);
            return;
        }

        const payload = {
            id: Math.random().toString(36).slice(2, 10),
            manualVersion,
            stepId: currentStep.id || null,
            stepIndex: currentStepIndex,
            stepTitle: currentStep.title || `Step ${currentStepIndex + 1}`,
            operatorName: ackName.trim() || 'Anonymous',
            role: ackRole,
            answers: currentAnswer,
            capturedAt: new Date().toISOString(),
            source: 'qrcode-public-viewer'
        };

        setIsSubmittingCapture(true);
        try {
            const currentContent = contentObj || {};
            const currentCaptures = Array.isArray(currentContent.dataCaptures) ? currentContent.dataCaptures : [];
            const nextCaptures = [payload, ...currentCaptures];

            const cloudId = manual?.cloudId || manualId;
            let savedToCloud = false;
            if (cloudId) {
                try {
                    await appendManualDataCapture(cloudId, payload);
                    savedToCloud = true;
                } catch (cloudError) {
                    console.warn('Cloud data capture save failed, fallback to local:', cloudError);
                }
            }

            if (!savedToCloud && manual?.id) {
                await updateKnowledgeBaseItem(manual.id, {
                    content: {
                        ...currentContent,
                        dataCaptures: nextCaptures
                    }
                });
            }

            setManual((prev) => ({
                ...prev,
                content: {
                    ...(currentContent || {}),
                    dataCaptures: nextCaptures
                }
            }));

            alert('Data capture submitted successfully.');
        } catch (captureError) {
            console.error('Failed to submit data capture:', captureError);
            alert('Failed to submit data capture. Please try again.');
        } finally {
            setIsSubmittingCapture(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#101827', color: 'white' }}>
                <div style={{ fontSize: '1.2rem' }}>Loading manual...</div>
            </div>
        );
    }

    if (error || !manual) {
        return (
            <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#101827' }}>
                <div style={{ background: 'white', borderRadius: '10px', padding: '28px', width: 'min(420px, 92vw)', textAlign: 'center' }}>
                    <h2 style={{ marginTop: 0 }}>Document Not Found</h2>
                    <p style={{ color: '#666' }}>{error || 'The requested manual could not be found.'}</p>
                    <button onClick={onClose} style={{ marginTop: '12px', padding: '8px 14px', borderRadius: '6px', border: 'none', background: '#1674ea', color: 'white', cursor: 'pointer' }}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="dozuki-shell-wrap" style={{ minHeight: '100vh', background: 'radial-gradient(circle at top, #192235 0%, #0f1726 45%, #0a1120 100%)', display: 'grid', placeItems: 'center', padding: '24px' }}>
            <style>{`
                .dozuki-shell {
                    width: min(1260px, 96vw);
                    height: min(760px, 90vh);
                    background: #eef1f5;
                    border-radius: 14px;
                    box-shadow: 0 28px 80px rgba(0,0,0,0.45);
                    overflow: hidden;
                    border: 1px solid rgba(255,255,255,0.18);
                    display: grid;
                    grid-template-rows: 72px 1fr;
                }
                .dozuki-topbar {
                    border-bottom: 1px solid #d5dbe6;
                    background: #f9fafc;
                    padding: 0 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .dozuki-body {
                    display: grid;
                    grid-template-columns: 1.1fr 0.9fr;
                    min-height: 0;
                }
                .dozuki-left {
                    border-right: 1px solid #d5dbe6;
                    padding: 18px;
                    display: grid;
                    grid-template-rows: 1fr auto;
                    gap: 14px;
                    min-height: 0;
                }
                .dozuki-media-main {
                    border: 1px solid #cdd4df;
                    border-radius: 10px;
                    background: #d6dde8;
                    overflow: hidden;
                    min-height: 280px;
                    display: grid;
                    place-items: center;
                }
                .dozuki-media-main img,
                .dozuki-media-main video {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .dozuki-thumbs {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
                    gap: 8px;
                }
                .dozuki-thumb {
                    position: relative;
                    height: 58px;
                    border-radius: 8px;
                    border: 1px solid #c7cfdb;
                    overflow: hidden;
                    cursor: pointer;
                    background: #d6dde8;
                }
                .dozuki-thumb.active {
                    border: 2px solid #1674ea;
                }
                .dozuki-thumb img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .dozuki-thumb-index {
                    position: absolute;
                    right: 4px;
                    bottom: 4px;
                    background: rgba(0,0,0,0.45);
                    color: #fff;
                    border-radius: 99px;
                    padding: 1px 5px;
                    font-size: 10px;
                    font-weight: 700;
                }
                .dozuki-right {
                    padding: 22px 24px;
                    display: grid;
                    grid-template-rows: auto auto 1fr auto;
                    gap: 10px;
                    min-height: 0;
                }
                .dozuki-step-count {
                    font-size: 28px;
                    font-weight: 800;
                    color: #222f41;
                    margin-bottom: 2px;
                }
                .dozuki-step-title {
                    font-size: 16px;
                    font-weight: 700;
                    color: #233247;
                    line-height: 1.4;
                    margin-bottom: 8px;
                }
                .dozuki-instructions {
                    font-size: 13px;
                    color: #334155;
                    line-height: 1.55;
                    max-height: 140px;
                    overflow-y: auto;
                    padding-right: 4px;
                }
                .dozuki-q-panel {
                    border: 1px solid #d0d8e4;
                    border-radius: 10px;
                    background: #fff;
                    padding: 12px;
                    overflow-y: auto;
                }
                .dozuki-q-label {
                    display: block;
                    font-size: 12px;
                    font-weight: 600;
                    color: #2f3a49;
                    margin-bottom: 5px;
                }
                .dozuki-input,
                .dozuki-select,
                .dozuki-textarea {
                    width: 100%;
                    border: 1px solid #c9d1de;
                    border-radius: 4px;
                    padding: 8px;
                    font-size: 12px;
                    box-sizing: border-box;
                }
                .dozuki-radio-row {
                    display: grid;
                    gap: 4px;
                }
                .dozuki-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    flex-wrap: wrap;
                }
                .dozuki-btn {
                    border: 1px solid #c7cfdb;
                    border-radius: 6px;
                    background: #f1f5f9;
                    color: #425466;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 10px 16px;
                    min-width: 105px;
                }
                .dozuki-ref-link {
                    border: 1px solid #16a34a;
                    border-radius: 8px;
                    background: #f0fdf4;
                    color: #166534;
                    font-weight: 700;
                    cursor: pointer;
                    padding: 8px 12px;
                    font-size: 12px;
                }
                .dozuki-btn.primary {
                    border-color: #1674ea;
                    background: #1674ea;
                    color: #fff;
                }
                .dozuki-status-note {
                    margin-top: 8px;
                    font-size: 12px;
                    border-radius: 6px;
                    padding: 8px;
                }
                .dozuki-status-note.warning {
                    color: #92400e;
                    background: #fff7ed;
                    border: 1px solid #fed7aa;
                }
                .dozuki-status-note.info {
                    color: #1d4ed8;
                    background: #eff6ff;
                    border: 1px solid #bfdbfe;
                }
                .dozuki-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }
                @media (max-width: 980px) {
                    .dozuki-shell {
                        width: min(96vw, 760px);
                        height: auto;
                        min-height: 88vh;
                    }
                    .dozuki-body {
                        grid-template-columns: 1fr;
                        grid-template-rows: auto auto;
                    }
                    .dozuki-left {
                        border-right: none;
                        border-bottom: 1px solid #d5dbe6;
                    }
                }
            `}</style>

            <div className="dozuki-shell">
                <div className="dozuki-topbar">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ width: 220, height: 8, borderRadius: 999, background: '#d6dbe4' }} />
                        <div style={{ width: 150, height: 8, borderRadius: 999, background: '#dde2ea' }} />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="dozuki-btn" onClick={() => window.print()}>Print</button>
                        {onClose && <button className="dozuki-btn" onClick={onClose}>Close</button>}
                    </div>
                </div>

                <div className="dozuki-body">
                    <div className="dozuki-left">
                        <div className="dozuki-media-main">
                            {currentStep?.media && (
                                <div style={{ width: '100%', height: '100%' }}>
                                    {(!currentStep.media.type || currentStep.media.type === 'image') && currentStep.media.url && (
                                        <img src={currentStep.media.url} alt={currentStep.title || 'Step media'} />
                                    )}
                                    {currentStep.media.type === 'video' && currentStep.media.url && (
                                        <video
                                            src={`${currentStep.media.url}#t=${currentStep.startTime || 0}${currentStep.duration ? ',' + (Math.round(((currentStep.startTime || 0) + currentStep.duration) * 10) / 10) : ''}`}
                                            controls
                                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                        />
                                    )}
                                    {currentStep.media.type === 'youtube' && currentStep.media.youtubeUrl && (
                                        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
                                            <iframe
                                                src={currentStep.media.youtubeUrl.replace('watch?v=', 'embed/').split('&')[0]}
                                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                allowFullScreen
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                            {!currentStep?.media && (
                                <div style={{ color: '#5f6f83', fontWeight: 700 }}>No media for this step</div>
                            )}
                        </div>

                        <div className="dozuki-thumbs">
                            {steps.map((step, idx) => (
                                <div
                                    key={step.id || idx}
                                    className={`dozuki-thumb ${idx === currentStepIndex ? 'active' : ''}`}
                                    onClick={() => setCurrentStepIndex(idx)}
                                >
                                    {step?.media?.url ? (
                                        <img src={step.media.url} alt={step.title || `Step ${idx + 1}`} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#617489', fontWeight: 700, fontSize: 12 }}>
                                            Step {idx + 1}
                                        </div>
                                    )}
                                    <div className="dozuki-thumb-index">{idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="dozuki-right">
                        <div>
                            <div className="dozuki-step-count">Step {Math.min(currentStepIndex + 1, Math.max(steps.length, 1))} of {Math.max(steps.length, 1)}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                                {manual.title || 'Manual'} • v{manualVersion}
                            </div>
                            {referenceLinks.length > 0 && (
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                                    {referenceLinks.slice(0, 3).map((ref, idx) => (
                                        <button
                                            key={`${ref.url}-${idx}`}
                                            className="dozuki-ref-link"
                                            onClick={() => window.open(ref.url, '_blank', 'noopener,noreferrer')}
                                            title={ref.url}
                                        >
                                            Open Ref {idx + 1}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="dozuki-step-title">{currentStep?.title || 'Untitled Step'}</div>
                        </div>

                        <div className="dozuki-instructions" dangerouslySetInnerHTML={{ __html: currentStep?.instructions || '<p>No instruction available.</p>' }} />

                        {currentQuestions.length > 0 && (
                            <div className="dozuki-q-panel">
                                {currentQuestions.map((q) => (
                                    <div key={q.id} style={{ marginBottom: 12 }}>
                                        <label className="dozuki-q-label">{q.label}</label>
                                        {q.type === 'select' && (
                                            <select className="dozuki-select" value={currentAnswer[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)}>
                                                <option value="">Select option...</option>
                                                {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                        )}
                                        {q.type === 'radio' && (
                                            <div className="dozuki-radio-row">
                                                {(q.options || []).map(opt => (
                                                    <label key={opt} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <input
                                                            type="radio"
                                                            name={`${currentStepIndex}-${q.id}`}
                                                            checked={currentAnswer[q.id] === opt}
                                                            onChange={() => setAnswer(q.id, opt)}
                                                        />
                                                        {opt}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                        {q.type === 'textarea' && (
                                            <textarea className="dozuki-textarea" rows={4} value={currentAnswer[q.id] || ''} onChange={(e) => setAnswer(q.id, e.target.value)} />
                                        )}
                                        {(q.type === 'text' || q.type === 'number') && (
                                            <input
                                                className="dozuki-input"
                                                type={q.type === 'number' ? 'number' : 'text'}
                                                value={currentAnswer[q.id] || ''}
                                                onChange={(e) => setAnswer(q.id, e.target.value)}
                                            />
                                        )}
                                        {q.type === 'checkbox' && (
                                            <div className="dozuki-radio-row">
                                                {(q.options || []).map(opt => {
                                                    const selected = Array.isArray(currentAnswer[q.id]) && currentAnswer[q.id].includes(opt);
                                                    return (
                                                        <label key={opt} style={{ fontSize: 12, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={selected}
                                                                onChange={() => toggleCheckboxAnswer(q.id, opt)}
                                                            />
                                                            {opt}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {q.required && (
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>* Required</div>
                                        )}
                                    </div>
                                ))}

                                {!!captureBlockedReason && (
                                    <div className="dozuki-status-note warning">
                                        {captureBlockedReason}
                                    </div>
                                )}
                                {requestedVersion && requestedVersion !== manualVersion && (
                                    <div className="dozuki-status-note info">
                                        Anda scan versi <strong>{requestedVersion}</strong>, versi terbaru <strong>{manualVersion}</strong>.
                                    </div>
                                )}
                                <div style={{ marginTop: 8, fontSize: 12, color: '#475569' }}>
                                    Captured records for this step: <strong>{currentStepCaptureCount}</strong>
                                </div>
                                <button
                                    className="dozuki-btn primary"
                                    style={{ marginTop: 10, width: '100%' }}
                                    disabled={isSubmittingCapture || !allRequiredAnswered || !!captureBlockedReason}
                                    onClick={handleSubmitDataCapture}
                                >
                                    {isSubmittingCapture ? 'Submitting data...' : 'Submit Data Capture'}
                                </button>
                            </div>
                        )}

                        <div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                                <input className="dozuki-input" style={{ width: '170px' }} placeholder="Nama operator" value={ackName} onChange={(e) => setAckName(e.target.value)} />
                                <select className="dozuki-select" style={{ width: '140px' }} value={ackRole} onChange={(e) => setAckRole(e.target.value)}>
                                    <option value="Operator">Operator</option>
                                    <option value="Reviewer">Reviewer</option>
                                    <option value="Approver">Approver</option>
                                    <option value="Author">Author</option>
                                </select>
                                <button
                                    className="dozuki-btn primary"
                                    disabled={isSubmittingAck || !!ackBlockedReason || alreadyAcknowledged}
                                    onClick={handleAcknowledge}
                                >
                                    {alreadyAcknowledged ? 'Already Acknowledged' : (isSubmittingAck ? 'Saving...' : 'Acknowledge')}
                                </button>
                            </div>
                            {!!ackBlockedReason && (
                                <div className="dozuki-status-note warning" style={{ marginBottom: 10 }}>
                                    {ackBlockedReason}
                                </div>
                            )}

                            <div className="dozuki-actions">
                                <button
                                    className="dozuki-btn"
                                    disabled={currentStepIndex <= 0}
                                    onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
                                >
                                    Back
                                </button>
                                <button
                                    className="dozuki-btn primary"
                                    disabled={currentStepIndex >= steps.length - 1}
                                    onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, Math.max(steps.length - 1, 0)))}
                                >
                                    Next Step
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicManualViewer;
