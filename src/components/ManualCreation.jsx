import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getAllProjects } from '../utils/database';
import {
    upsertManual,
    listManuals,
    getManualById,
    deleteManual,
    isSupabaseReady
} from '../utils/supabaseManualDB';
import {
    getSupabaseSettings,
    isSupabaseConfigured,
    uploadBlobToSupabase,
    uploadDataUrlToSupabase
} from '../utils/supabaseClient';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';
import GuideHeader from './manual/GuideHeader';
import GuideIntroduction from './manual/GuideIntroduction';
import GuideDetails from './manual/GuideDetails';
import SourceVideo from './manual/SourceVideo';
import StepList from './manual/StepList';
import StepEditor from './manual/StepEditor';
import StepMediaControls from './manual/StepMediaControls';
import {
    generateManualContent,
    improveManualContent,
    uploadFileToGemini,
    generateFullManualFromVideo,
    getStoredApiKey
} from '../utils/aiGenerator';
import AIChatOverlay from './features/AIChatOverlay';
import jsPDF from 'jspdf';
import { QRCodeCanvas } from 'qrcode.react';
import {
    FileSpreadsheet, FileText, Upload, Sparkles, MessageSquare,
    Cpu, Loader2, BarChart3, Settings, Book, Layout, List,
    Eye, Save, FolderOpen, FileDown, Layers,
    ChevronDown, Trash2, Plus, Info, Video, CheckCircle,
    Activity, Shield, Play, VideoOff, X, BookOpen, Sun, Moon, Palette,
    Code, Copy, ExternalLink, Printer, Box, AlertTriangle, AlertOctagon,
    Clock, Edit3, Send, XCircle,
    QrCode, Download
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';

const generateId = () => Math.random().toString(36).substr(2, 9);

const ensureUniqueStepIds = (steps = []) => {
    if (!Array.isArray(steps)) return [];

    const used = new Set();
    return steps.map((step) => {
        let nextId = typeof step?.id === 'string' && step.id.trim() ? step.id.trim() : generateId();
        while (used.has(nextId)) {
            nextId = generateId();
        }
        used.add(nextId);

        // Ensure steps have an images array
        const images = step.images || [];
        if (images.length === 0 && step.media?.type === 'image' && step.media?.url) {
            images.push(step.media.url);
        }

        return { ...step, id: nextId, images };
    });
};

const isBlobUrl = (value) => typeof value === 'string' && value.startsWith('blob:');

const readBlobAsDataUrl = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve(ev.target?.result || null);
    reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
    reader.readAsDataURL(blob);
});

const toPersistableSteps = async (manualId, steps = [], fallbackVideoUrl = null) => {
    const persistableSteps = [];

    for (const step of steps) {
        let media = step?.media;
        let images = step.images || [];

        // 1. Handle primary media (video/image)
        if (media && typeof media === 'object') {
            if (media.type === 'video') {
                const url = media.url;
                const normalizedUrl = isBlobUrl(url) ? (fallbackVideoUrl || null) : url;
                media = { ...media, url: normalizedUrl };
            } else if (media.type === 'image' && isBlobUrl(media.url)) {
                try {
                    const storagePath = `manuals/${manualId}/steps/${step.id}/main.jpg`;
                    const publicUrl = await uploadDataUrlToSupabase(storagePath, media.url);
                    media = { ...media, url: publicUrl };
                } catch (err) {
                    console.error('Failed to upload step main image:', err);
                    media = { ...media, url: null };
                }
            }
        }

        // 2. Handle multiple images gallery
        const uploadedImages = [];
        for (let i = 0; i < images.length; i++) {
            const imgUrl = images[i];
            if (isBlobUrl(imgUrl)) {
                try {
                    const storagePath = `manuals/${manualId}/steps/${step.id}/gallery_${i}.jpg`;
                    const publicUrl = await uploadDataUrlToSupabase(storagePath, imgUrl);
                    uploadedImages.push(publicUrl);
                } catch (err) {
                    console.error(`Failed to upload gallery image ${i}:`, err);
                }
            } else {
                uploadedImages.push(imgUrl);
            }
        }

        persistableSteps.push({
            ...step,
            media,
            images: uploadedImages
        });
    }

    return persistableSteps;
};

const sanitizePathPart = (value) => String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'manual';

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

const extractYouTubeVideoId = (value = '') => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    try {
        const parsed = new URL(withProtocol);
        const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

        if (host === 'youtu.be') {
            return parsed.pathname.split('/').filter(Boolean)[0] || null;
        }

        if (host.includes('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || null;
            if (parsed.pathname.startsWith('/embed/')) return parsed.pathname.split('/embed/')[1]?.split('/')[0] || null;
            if (parsed.pathname.startsWith('/shorts/')) return parsed.pathname.split('/shorts/')[1]?.split('/')[0] || null;
        }
    } catch {
        // ignore parsing failure, fallback regex below
    }

    const fallback = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
    return fallback?.[1] || null;
};

const getYouTubeEmbedUrl = (value = '') => {
    const id = extractYouTubeVideoId(value);
    return id ? `https://www.youtube.com/embed/${id}` : null;
};

const USER_ROLES = ['Author', 'Reviewer', 'Approver', 'Operator', 'Admin'];
const CAPA_TRANSITIONS = {
    Open: ['Root Cause'],
    'Root Cause': ['Corrective Action'],
    'Corrective Action': ['Verification'],
    Verification: ['Closed'],
    Closed: []
};

const CanvasPreviewLayer = ({ elements = [], isInteractive = false, answers = {}, onAnswerChange, stepId }) => {
    if (!Array.isArray(elements) || elements.length === 0) return null;

    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    const shapeClipPath = (shapeVariant) => {
        if (shapeVariant === 'triangle') return 'polygon(50% 0%, 0% 100%, 100% 100%)';
        if (shapeVariant === 'hexagon') return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
        if (shapeVariant === 'star') return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
        return 'none';
    };

    return (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
            {sortedElements.map((el, idx) => {
                if (!el || typeof el !== 'object') return null;

                if (el.type === 'draw') {
                    if (!Array.isArray(el.linePoints) || el.linePoints.length < 2) return null;
                    const d = el.linePoints
                        .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
                        .join(' ');
                    return (
                        <svg
                            key={el.id || `draw-${idx}`}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                width: '100%',
                                height: '100%',
                                pointerEvents: 'none',
                                opacity: el.opacity ?? 1,
                                zIndex: el.zIndex || 1
                            }}
                            viewBox="0 0 100 100"
                            preserveAspectRatio="none"
                        >
                            <path
                                d={d}
                                fill="none"
                                stroke={el.color || '#38bdf8'}
                                strokeWidth={Math.max(0.3, (el.borderWidth || 3) / 8)}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    );
                }

                const baseStyle = {
                    position: 'absolute',
                    left: `${Number(el.x) || 0}%`,
                    top: `${Number(el.y) || 0}%`,
                    width: `${Number(el.w) || 0}%`,
                    height: el.type === 'line' ? `${Math.max(1, Number(el.borderWidth) || 3)}px` : `${Number(el.h) || 0}%`,
                    opacity: el.opacity ?? 1,
                    zIndex: el.zIndex || 1,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    transformOrigin: 'center center',
                    pointerEvents: 'none'
                };

                if (el.type === 'image' && el.imageUrl) {
                    return (
                        <img
                            key={el.id || `img-${idx}`}
                            src={el.imageUrl}
                            alt=""
                            draggable={false}
                            style={{ ...baseStyle, objectFit: 'contain', display: 'block' }}
                        />
                    );
                }

                if (el.type === 'shape') {
                    return (
                        <div key={el.id || `shape-${idx}`} style={baseStyle}>
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: el.background || '#3b82f6',
                                    border: `${el.borderWidth || 2}px solid ${el.borderColor || '#60a5fa'}`,
                                    borderRadius: el.shapeVariant === 'circle' ? '50%' : `${el.borderRadius || 0}px`,
                                    clipPath: shapeClipPath(el.shapeVariant),
                                    boxSizing: 'border-box'
                                }}
                            />
                        </div>
                    );
                }

                if (el.type === 'line') {
                    return (
                        <div key={el.id || `line-${idx}`} style={baseStyle}>
                            <div
                                style={{
                                    width: '100%',
                                    height: `${Math.max(1, Number(el.borderWidth) || 3)}px`,
                                    background: el.borderColor || '#3b82f6',
                                    borderRadius: 2
                                }}
                            />
                        </div>
                    );
                }

                if (el.type === 'arrow') {
                    const borderWidth = Math.max(1, Number(el.borderWidth) || 3);
                    return (
                        <div key={el.id || `arrow-${idx}`} style={baseStyle}>
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                                <div style={{ flex: 1, height: `${borderWidth}px`, background: el.borderColor || '#3b82f6' }} />
                                <div
                                    style={{
                                        width: 0,
                                        height: 0,
                                        borderTop: `${borderWidth * 2.5}px solid transparent`,
                                        borderBottom: `${borderWidth * 2.5}px solid transparent`,
                                        borderLeft: `${borderWidth * 4}px solid ${el.borderColor || '#3b82f6'}`
                                    }}
                                />
                            </div>
                        </div>
                    );
                }

                if (el.type === 'datacapture') {
                    const answer = answers?.[el.id] || '';
                    return (
                        <div key={el.id || `dc-${idx}`} style={{ ...baseStyle, pointerEvents: isInteractive ? 'auto' : 'none' }}>
                            <div style={{
                                width: '100%', height: '100%', padding: '8px',
                                background: el.background || '#f8fafc',
                                border: `${el.borderWidth || 1}px solid ${el.borderColor || '#cbd5e1'}`,
                                borderRadius: `${el.borderRadius || 6}px`,
                                boxSizing: 'border-box',
                                display: 'flex', flexDirection: 'column', gap: 4,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                overflow: 'hidden'
                            }}>
                                <div style={{ fontSize: `${el.fontSize || 12}px`, fontWeight: '600', color: el.color || '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {el.label || 'New Field'} {el.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </div>

                                <div style={{ flex: 1, display: 'flex' }}>
                                    {(el.fieldType === 'text' || !el.fieldType) && (
                                        <input
                                            type="text"
                                            value={answer}
                                            onChange={(e) => onAnswerChange && onAnswerChange(stepId, el.id, e.target.value)}
                                            style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0 6px', fontSize: '12px' }}
                                        />
                                    )}
                                    {el.fieldType === 'number' && (
                                        <input
                                            type="number"
                                            value={answer}
                                            onChange={(e) => onAnswerChange && onAnswerChange(stepId, el.id, e.target.value)}
                                            style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0 6px', fontSize: '12px' }}
                                        />
                                    )}
                                    {el.fieldType === 'textarea' && (
                                        <textarea
                                            value={answer}
                                            onChange={(e) => onAnswerChange && onAnswerChange(stepId, el.id, e.target.value)}
                                            style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '4px 6px', fontSize: '12px', resize: 'none' }}
                                        />
                                    )}
                                    {el.fieldType === 'select' && (
                                        <select
                                            value={answer}
                                            onChange={(e) => onAnswerChange && onAnswerChange(stepId, el.id, e.target.value)}
                                            style={{ width: '100%', height: '100%', border: '1px solid #e2e8f0', borderRadius: 4, padding: '0 6px', fontSize: '12px' }}
                                        >
                                            <option value="">Select option...</option>
                                            {(el.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                    {el.fieldType === 'radio' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto', width: '100%' }}>
                                            {(el.options || []).map((opt, i) => (
                                                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#334155', cursor: isInteractive ? 'pointer' : 'default' }}>
                                                    <input
                                                        type="radio"
                                                        name={`radio-${el.id}`}
                                                        value={opt}
                                                        checked={answer === opt}
                                                        onChange={(e) => onAnswerChange && onAnswerChange(stepId, el.id, e.target.value)}
                                                    />
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{opt}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                }

                if (el.type === 'text' || el.type === 'sticky') {
                    return (
                        <div key={el.id || `text-${idx}`} style={baseStyle}>
                            <div
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    padding: '6px 8px',
                                    boxSizing: 'border-box',
                                    background: el.background || 'transparent',
                                    borderRadius: el.type === 'sticky' ? '4px' : 0,
                                    border: el.type === 'sticky' ? '1px solid #fbbf24' : 'none',
                                    color: el.color || '#ffffff',
                                    fontSize: `${el.fontSize || 16}px`,
                                    fontWeight: el.fontWeight || 'normal',
                                    fontStyle: el.fontStyle || 'normal',
                                    textDecoration: el.textDecoration || 'none',
                                    textAlign: el.textAlign || 'left',
                                    lineHeight: 1.35,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    overflow: 'hidden'
                                }}
                            >
                                {el.text || ''}
                            </div>
                        </div>
                    );
                }

                return null;
            })}
        </div>
    );
};

function ManualCreation() {
    const { t: i18nT, currentLanguage } = useLanguage();

    const manualLocalFallbacks = {
        en: {
            'manual.createVersionSnapshot': 'Create Version Snapshot',
            'manual.newVersion': 'New Ver',
            'manual.operatorOn': 'Operator ON',
            'manual.exportPdfDocument': 'PDF Document',
            'manual.exportWordDocument': 'MS Word (.docx)',
            'manual.exportPowerPoint': 'PowerPoint (.pptx)',
            'manual.layoutStandard': 'Standard',
            'manual.layoutCompact': 'Compact',
            'manual.layoutSinglePage': 'Single Page',
            'manual.user': 'User',
            'manual.completion': 'Completion',
            'manual.noOperatorSteps': 'No steps available for operator mode.',
            'manual.noVideoLoaded': 'No video loaded',
            'manual.analyzeFullVideo': 'Analyze Full Video',
            'manual.analyzingVideo': 'Analyzing Video...',
            'manual.uploadingToAI': 'Uploading to AI...',
            'manual.openMaviChat': 'Open Mavi Chat',
            'manual.hideMaviChat': 'Hide Mavi Chat',
            'manual.statuses.draft': 'DRAFT',
            'manual.statuses.review': 'REVIEW',
            'manual.statuses.published': 'PUBLISHED',
            'manual.alerts.enterTitle': 'Please enter manual title first.',
            'manual.alerts.saveSuccess': 'Manual saved successfully!',
            'manual.alerts.updateSuccess': 'Manual updated successfully!',
            'manual.alerts.saveFailed': 'Failed to save manual: {{message}}',
            'manual.alerts.loadManualsFailed': 'Failed to load saved manuals.',
            'manual.alerts.confirmDeleteStep': 'Delete this step?',
            'manual.alerts.generateContentFailed': 'Failed to generate AI content: {{message}}',
            'manual.alerts.uploadVideoFirst': 'Please upload video first.',
            'manual.alerts.apiKeyMissing': 'Gemini API key is missing. Please set it in settings.',
            'manual.alerts.videoPrepareFailed': 'Failed to prepare video for AI analysis.',
            'manual.alerts.confirmOverwriteSteps': 'Overwrite existing steps with {{count}} AI steps?',
            'manual.alerts.confirmAppendSteps': 'Append {{count}} AI steps to current manual?',
            'manual.alerts.analyzeVideoFailed': 'Failed to analyze video: {{message}}',
            'manual.alerts.uploadVideoSourceFirst': 'Please upload source video first.',
            'manual.alerts.captureFrameFailed': 'Failed to capture frame from video.',
            'manual.alerts.improveContentFailed': 'Failed to improve content: {{message}}',
            'manual.alerts.noStepsToExport': 'No steps available to export.',
            'manual.alerts.exportFailed': 'Export failed: {{message}}',
            'manual.alerts.wordExportFailed': 'Word export failed: {{message}}',
            'manual.alerts.powerPointExportFailed': 'PowerPoint export failed: {{message}}',
            'manual.alerts.excelEmpty': 'Excel file is empty.',
            'manual.alerts.confirmAppendExcelSteps': 'Append {{count}} steps from Excel?',
            'manual.alerts.excelImportFailed': 'Excel import failed: {{message}}',
            'manual.alerts.confirmAppendWordSteps': 'Append {{count}} steps from Word?',
            'manual.alerts.noStepsInWord': 'No step headings found in Word document.',
            'manual.alerts.wordImportFailed': 'Word import failed: {{message}}',
            'manual.embedGuide': 'Embed Guide',
            'manual.embedCode': 'Embed Code',
            'manual.copyCode': 'Copy Code',
            'manual.codeCopied': 'Code Copied!',
            'manual.embedSize.small': 'Small',
            'manual.embedSize.medium': 'Medium',
            'manual.embedSize.large': 'Large',
            'manual.embedSize.full': 'Full Width',
            'manual.embedPreview': 'Embed Preview',
            'manual.pdfExportSuccess': 'PDF generated successfully.'
        },
        id: {
            'manual.createVersionSnapshot': 'Buat Snapshot Versi',
            'manual.newVersion': 'Versi Baru',
            'manual.operatorOn': 'Operator AKTIF',
            'manual.exportPdfDocument': 'Dokumen PDF',
            'manual.exportWordDocument': 'MS Word (.docx)',
            'manual.exportPowerPoint': 'PowerPoint (.pptx)',
            'manual.layoutStandard': 'Standar',
            'manual.layoutCompact': 'Ringkas',
            'manual.layoutSinglePage': 'Satu Halaman',
            'manual.user': 'Pengguna',
            'manual.completion': 'Progres',
            'manual.noOperatorSteps': 'Tidak ada langkah untuk mode operator.',
            'manual.noVideoLoaded': 'Belum ada video dimuat',
            'manual.analyzeFullVideo': 'Analisis Video Penuh',
            'manual.analyzingVideo': 'Menganalisis Video...',
            'manual.uploadingToAI': 'Mengunggah ke AI...',
            'manual.openMaviChat': 'Buka Mavi Chat',
            'manual.hideMaviChat': 'Sembunyikan Mavi Chat',
            'manual.statuses.draft': 'DRAFT',
            'manual.statuses.review': 'REVIEW',
            'manual.statuses.published': 'PUBLISHED',
            'manual.embedGuide': 'Sematkan Panduan',
            'manual.embedCode': 'Kode Semat',
            'manual.copyCode': 'Salin Kode',
            'manual.codeCopied': 'Kode Disalin!',
            'manual.embedSize.small': 'Kecil',
            'manual.embedSize.medium': 'Sedang',
            'manual.embedSize.large': 'Besar',
            'manual.embedSize.full': 'Lebar Penuh',
            'manual.embedPreview': 'Pratinjau Sematan'
        },
        ja: {
            'manual.createVersionSnapshot': 'バージョンスナップショット作成',
            'manual.newVersion': '新規版',
            'manual.operatorOn': 'オペレーター ON',
            'manual.exportPdfDocument': 'PDFドキュメント',
            'manual.exportWordDocument': 'MS Word (.docx)',
            'manual.exportPowerPoint': 'PowerPoint (.pptx)',
            'manual.layoutStandard': '標準',
            'manual.layoutCompact': 'コンパクト',
            'manual.layoutSinglePage': '1ページ',
            'manual.user': 'ユーザー',
            'manual.completion': '進捗',
            'manual.noOperatorSteps': 'オペレーターモードで使用できる手順がありません。',
            'manual.noVideoLoaded': 'ビデオ未読み込み',
            'manual.analyzeFullVideo': '動画全体を解析',
            'manual.analyzingVideo': '動画を解析中...',
            'manual.uploadingToAI': 'AIへアップロード中...',
            'manual.openMaviChat': 'Maviチャットを開く',
            'manual.hideMaviChat': 'Maviチャットを閉じる',
            'manual.statuses.draft': 'DRAFT',
            'manual.statuses.review': 'REVIEW',
            'manual.statuses.published': 'PUBLISHED',
            'manual.embedGuide': 'ガイドを埋め込む',
            'manual.embedCode': '埋め込みコード',
            'manual.copyCode': 'コードをコピー',
            'manual.codeCopied': 'コピー完了！',
            'manual.embedSize.small': '小',
            'manual.embedSize.medium': '中',
            'manual.embedSize.large': '大',
            'manual.embedSize.full': '全幅',
            'manual.embedPreview': '埋め込みプレビュー'
        }
    };

    const interpolate = (str, params = {}) => String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => params?.[k] ?? '');
    const t = (key, params) => {
        const value = i18nT(key, params);
        if (value && value !== key) return value;
        const lang = manualLocalFallbacks[currentLanguage] ? currentLanguage : 'en';
        const local = manualLocalFallbacks[lang]?.[key] ?? manualLocalFallbacks.en?.[key];
        return local ? interpolate(local, params) : value;
    };
    const tt = (key, fallback, params) => {
        const value = t(key, params);
        return !value || value === key ? interpolate(fallback, params) : value;
    };
    const { currentProject } = useProject();
    const { showAlert, showConfirm, showPrompt } = useDialog();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [videoSrc, setVideoSrc] = useState(null);
    const [showQRModal, setShowQRModal] = useState(false);
    const [operatorAnswers, setOperatorAnswers] = useState({});
    const [showSessionSummary, setShowSessionSummary] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle, syncing, saved, error
    const [isSavingManual, setIsSavingManual] = useState(false);
    const [saveProgress, setSaveProgress] = useState(0);
    const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
    const [isManualOpening, setIsManualOpening] = useState(false);
    const [manualOpeningProgress, setManualOpeningProgress] = useState(0);
    const [manualOpeningMessage, setManualOpeningMessage] = useState('');
    const lastRequestedManualIdRef = useRef(null);
    const loadingManualIdRef = useRef(null);
    const videoRef = useRef(null);

    const DEFAULT_HEADER_ORDER = [
        { id: 'documentNumber', label: 'Doc Number' },
        { id: 'revisionDate', label: 'Revision Date' },
        { id: 'version', label: 'Version' },
        { id: 'effectiveDate', label: 'Effective Date' },
        { id: 'status', label: 'Status' },
        { id: 'difficulty', label: 'Difficulty' },
        { id: 'author', label: 'Author' },
        { id: 'timeRequired', label: 'Time Required' }
    ];

    const normalizeWorkflowStatus = (status) => {
        const value = String(status || '').trim();
        if (!value) return 'DRAFT';
        const upper = value.toUpperCase();
        if (upper === 'DRAFT' || upper === 'REVIEW' || upper === 'PUBLISHED') return upper;
        if (['PROPOSED', 'IN REVIEW', 'IN_REVIEW'].includes(upper)) return 'REVIEW';
        if (['APPROVED', 'RELEASED'].includes(upper)) return 'PUBLISHED';
        return 'DRAFT';
    };

    const WORKFLOW_STATUSES = ['DRAFT', 'REVIEW', 'PUBLISHED'];
    const WORKFLOW_TRANSITIONS = {
        DRAFT: ['DRAFT', 'REVIEW'],
        REVIEW: ['DRAFT', 'REVIEW', 'PUBLISHED'],
        PUBLISHED: ['REVIEW', 'PUBLISHED']
    };

    const getAllowedWorkflowTransitions = (status) => WORKFLOW_TRANSITIONS[status] || [status];

    const createDefaultGuide = () => ({
        id: generateId(),
        title: '',
        summary: '',
        difficulty: 'Moderate',
        timeRequired: '',
        documentNumber: '',
        version: '1.0',
        status: 'DRAFT',
        author: '',
        revisionDate: new Date().toISOString().split('T')[0],
        effectiveDate: '',
        headerOrder: DEFAULT_HEADER_ORDER,
        workflow: {
            status: 'DRAFT',
            updatedBy: 'System',
            updatedAt: new Date().toISOString()
        },
        versionHistory: [],
        templateFields: {
            tools: [],
            parts: [],
            ppe: []
        },
        approvalMatrix: [
            { id: generateId(), level: 1, role: 'Supervisor', approverName: '', slaHours: 24 }
        ],
        approvalRequests: [],
        assignments: [],
        auditTrail: [],
        stepComments: [],
        issueReports: [],
        notifications: [],
        eSignatures: [],
        readAcks: [],
        stepStatusMap: {},
        stepChangeLog: [],
        steps: [],
        images: [], // Global images if any, but steps will have their own
        // Dozuki-style Introduction fields
        guideType: 'Replacement',
        category: '',
        introductionText: '',
        flags: ['In Progress'],
        accessControl: { isPublic: true, teams: [], individuals: [] },
        editPermissions: 0,
        tags: [],
        sourceVideoUrl: null
    });

    const normalizeGuide = (manual) => {
        const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
            ? manual.content
            : {};

        const templateFields = contentObj.templateFields || manual?.templateFields || {};
        const fallbackStatus = normalizeWorkflowStatus(
            manual?.status || contentObj?.status || contentObj?.workflow?.status || 'DRAFT'
        );

        return {
            ...createDefaultGuide(),
            id: manual?.cloudId || manual?.id || generateId(),
            kbId: manual?.id,
            title: manual?.title || contentObj?.title || '',
            summary: manual?.summary || manual?.description || contentObj?.summary || '',
            difficulty: manual?.difficulty || contentObj?.difficulty || 'Moderate',
            timeRequired: manual?.timeRequired || contentObj?.timeRequired || '',
            documentNumber: manual?.documentNumber || contentObj?.documentNumber || '',
            version: manual?.version || contentObj?.version || '1.0',
            status: fallbackStatus,
            author: manual?.author || contentObj?.author || '',
            revisionDate: manual?.updatedAt
                ? new Date(manual.updatedAt).toISOString().split('T')[0]
                : (contentObj?.revisionDate || new Date().toISOString().split('T')[0]),
            effectiveDate: manual?.effectiveDate || contentObj?.effectiveDate || '',
            headerOrder: manual?.headerOrder || contentObj?.headerOrder || DEFAULT_HEADER_ORDER,
            workflow: {
                status: fallbackStatus,
                updatedBy: contentObj?.workflow?.updatedBy || 'System',
                updatedAt: contentObj?.workflow?.updatedAt || new Date().toISOString()
            },
            versionHistory: Array.isArray(contentObj?.versionHistory) ? contentObj.versionHistory : [],
            templateFields: {
                tools: Array.isArray(templateFields?.tools) ? templateFields.tools : [],
                parts: Array.isArray(templateFields?.parts) ? templateFields.parts : [],
                ppe: Array.isArray(templateFields?.ppe) ? templateFields.ppe : []
            },
            approvalMatrix: Array.isArray(contentObj?.approvalMatrix) ? contentObj.approvalMatrix : [{ id: generateId(), level: 1, role: 'Supervisor', approverName: '', slaHours: 24 }],
            approvalRequests: Array.isArray(contentObj?.approvalRequests) ? contentObj.approvalRequests : [],
            assignments: Array.isArray(contentObj?.assignments) ? contentObj.assignments : [],
            auditTrail: Array.isArray(contentObj?.auditTrail) ? contentObj.auditTrail : [],
            stepComments: Array.isArray(contentObj?.stepComments) ? contentObj.stepComments : [],
            issueReports: Array.isArray(contentObj?.issueReports) ? contentObj.issueReports : [],
            notifications: Array.isArray(contentObj?.notifications) ? contentObj.notifications : [],
            eSignatures: Array.isArray(contentObj?.eSignatures) ? contentObj.eSignatures : [],
            readAcks: Array.isArray(contentObj?.readAcks) ? contentObj.readAcks : [],
            stepStatusMap: contentObj?.stepStatusMap && typeof contentObj.stepStatusMap === 'object' ? contentObj.stepStatusMap : {},
            stepChangeLog: Array.isArray(contentObj?.stepChangeLog) ? contentObj.stepChangeLog : [],
            steps: ensureUniqueStepIds(manual?.steps || contentObj?.steps || manual?.content || []),
            // Introduction fields fallback
            guideType: manual?.guideType || contentObj?.guideType || 'Replacement',
            category: manual?.category || contentObj?.category || '',
            introductionText: manual?.introductionText || contentObj?.introductionText || '',
            flags: manual?.flags || contentObj?.flags || ['In Progress'],
            accessControl: manual?.accessControl || contentObj?.accessControl || { isPublic: true, teams: [], individuals: [] },
            editPermissions: manual?.editPermissions || contentObj?.editPermissions || 0,
            tags: manual?.tags || contentObj?.tags || [],
            sourceVideoUrl: manual?.sourceVideoUrl || contentObj?.sourceVideoUrl || null
        };
    };

    const [guide, setGuide] = useState(createDefaultGuide());

    const [activeStepId, setActiveStepId] = useState(null);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [savedManuals, setSavedManuals] = useState([]);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [generationLanguage, setGenerationLanguage] = useState('English');
    const [layoutTemplate, setLayoutTemplate] = useState('standard'); // standard, compact, one-per-page
    const [QRCodePreviewComponent, setQRCodePreviewComponent] = useState(null);
    const [qrPreviewDataUrl, setQrPreviewDataUrl] = useState('');
    const [isOperatorMode, setIsOperatorMode] = useState(false);
    const [operatorStepIndex, setOperatorStepIndex] = useState(0);
    const [operatorChecks, setOperatorChecks] = useState({});
    const [operatorDataCaptureAnswers, setOperatorDataCaptureAnswers] = useState({});
    const [previewImageIndices, setPreviewImageIndices] = useState({});

    // Advanced AI State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [geminiVideoUri, setGeminiVideoUri] = useState(null);
    const [isFullAIAnalyzing, setIsFullAIAnalyzing] = useState(false);
    const [rawVideoFile, setRawVideoFile] = useState(null);
    const [persistentVideoSrc, setPersistentVideoSrc] = useState(null);
    const { user, userRole: rawUserRole } = useAuth();
    const currentUserName = user?.email || 'User 1';

    // Map internal role logic to the new roles
    const mappedAuthUserRole = useMemo(() => {
        if (!rawUserRole) return 'Author'; // Default fallback
        const roleMap = {
            'admin': 'Admin',
            'drafter': 'Author',
            'checker': 'Reviewer',
            'approval': 'Approver'
        };
        return roleMap[rawUserRole] || 'Author';
    }, [rawUserRole]);
    const [manualRoleOverride, setManualRoleOverride] = useState('');
    const currentUserRole = manualRoleOverride || mappedAuthUserRole;

    const [activeTab, setActiveTab] = useState('edit'); // edit, info, management, history
    const [uiTheme, setUiTheme] = useState('dark'); // dark | light | colorful
    const [showEmbedModal, setShowEmbedModal] = useState(false);
    const [embedSize, setEmbedSize] = useState('medium'); // small, medium, large, full


    const location = useLocation();

    useEffect(() => {
        loadProjects();
    }, []);

    useEffect(() => {
        let mounted = true;
        import('qrcode.react')
            .then((mod) => {
                if (mounted) {
                    setQRCodePreviewComponent(() => mod.QRCodeSVG || null);
                }
            })
            .catch(() => {
                if (mounted) setQRCodePreviewComponent(null);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const manualPublicLink = `${window.location.origin}/#/manual/${guide.cloudId || guide.kbId || guide.id}?v=${encodeURIComponent(guide.version || '1.0')}`;
    // Deep-link QR: Points to the public viewer (/manual/ID) for instant mobile access
    const manualQRLink = `${window.location.origin}/#/manual/${guide.cloudId || guide.kbId || guide.id}`;
    const buildStepPublicLink = (step, stepIndex) => {
        const stationName = step?.title || `Step ${stepIndex + 1}`;
        return `${manualPublicLink}&stepId=${encodeURIComponent(step?.id || '')}&step=${stepIndex + 1}&station=${encodeURIComponent(stationName)}`;
    };

    useEffect(() => {
        let alive = true;
        const generateFallbackQr = async () => {
            try {
                const QRCodeLib = (await import('qrcode')).default;
                const dataUrl = await QRCodeLib.toDataURL(manualPublicLink, {
                    width: 120,
                    margin: 1,
                    color: { dark: '#0078d4', light: '#ffffff' }
                });
                if (alive) setQrPreviewDataUrl(dataUrl);
            } catch {
                if (alive) setQrPreviewDataUrl('');
            }
        };
        generateFallbackQr();
        return () => {
            alive = false;
        };
    }, [manualPublicLink]);

    useEffect(() => {
        if (location.state?.manualId) {
            loadManualById(location.state.manualId);
        }
    }, [location.state]);

    const loadManualById = async (id) => {
        if (!id) return;

        // Prevent duplicate fetches in development StrictMode / repeated route effects.
        if (loadingManualIdRef.current === id || lastRequestedManualIdRef.current === id) {
            return;
        }
        loadingManualIdRef.current = id;

        setIsManualOpening(true);
        setManualOpeningProgress(10);
        setManualOpeningMessage('Mengakses data manual creation dari database...');

        try {
            setManualOpeningProgress(45);
            setManualOpeningMessage('Mengambil detail manual...');
            const manual = await getManualById(id);

            if (manual) {
                setManualOpeningProgress(80);
                setManualOpeningMessage('Menyiapkan tampilan Manual Creation...');
                handleOpenManual(manual);
                lastRequestedManualIdRef.current = id;
                setManualOpeningProgress(100);
                setManualOpeningMessage('Manual berhasil dibuka.');
            } else {
                await showAlert('Manual Not Found', 'Manual tidak ditemukan atau sudah dihapus.');
            }
        } catch (error) {
            console.error('Error loading manual by ID:', error);
            await showAlert('Error', error?.message || 'Gagal membuka manual dari database.');
        } finally {
            loadingManualIdRef.current = null;
            setTimeout(() => {
                setIsManualOpening(false);
                setManualOpeningProgress(0);
                setManualOpeningMessage('');
            }, 250);
        }
    };

    // Deep link: jika URL mengandung ?manual=<id>, otomatis buka manual tersebut
    useEffect(() => {
        // In HashRouter with react-router-dom, parameters after the path are often in location.search
        // e.g. #/manual-creation?manual=123 -> location.search is "?manual=123"
        let manualIdFromUrl = new URLSearchParams(location.search).get('manual');

        // Fallback for cases where search is part of the hash string itself
        if (!manualIdFromUrl && location.hash.includes('?')) {
            const searchPart = location.hash.split('?')[1];
            manualIdFromUrl = new URLSearchParams(searchPart).get('manual');
        }

        if (manualIdFromUrl) {
            if (
                loadingManualIdRef.current !== manualIdFromUrl
                && lastRequestedManualIdRef.current !== manualIdFromUrl
            ) {
                console.log('Deep link detected, loading manual:', manualIdFromUrl);
            }
            loadManualById(manualIdFromUrl);
        }
    }, [location.search, location.hash]);

    useEffect(() => {
        if (selectedProjectId && projects.length > 0) {
            const project = projects.find(p => p.projectName === selectedProjectId);
            setSelectedProject(project);
            if (project.videoBlob) {
                setVideoSrc(URL.createObjectURL(project.videoBlob));
                setRawVideoFile(new File([project.videoBlob], 'source_video.mp4', { type: project.videoBlob.type || 'video/mp4' }));
                readBlobAsDataUrl(project.videoBlob)
                    .then((dataUrl) => setPersistentVideoSrc(dataUrl || null))
                    .catch(() => setPersistentVideoSrc(null));
            } else {
                setPersistentVideoSrc(null);
            }

            if (project.measurements) {
                const newSteps = project.measurements.map(m => ({
                    id: generateId(),
                    title: m.elementName || tt('manual.untitledStep', 'Untitled Step'),
                    media: { type: 'video', url: null },
                    instructions: m.elementName || '',
                    bullets: [],
                    startTime: m.startTime,
                    duration: m.duration
                }));
                if (guide.steps.length === 0) {
                    setGuide(prev => ({
                        ...prev,
                        title: project.projectName || tt('manual.workInstructions', 'Work Instructions'),
                        steps: ensureUniqueStepIds(newSteps)
                    }));
                    if (newSteps.length > 0) setActiveStepId(newSteps[0].id);
                }
            }
        } else {
            // Only reset if we are NOT on a deep-link path and NOT already loading/loaded a manual.
            const searchParams = new URLSearchParams(location.search);
            const manualIdInUrl = searchParams.get('manual') || (location.hash.includes('?manual=') ? location.hash.split('?manual=')[1].split('&')[0] : null);

            if (!manualIdInUrl) {
                setSelectedProject(null);
                setVideoSrc(null);
                setPersistentVideoSrc(null);
                setGuide(createDefaultGuide());
                setActiveStepId(null);
            }
        }
    }, [selectedProjectId, projects]);

    // Sync with global currentProject from File Explorer
    useEffect(() => {
        if (currentProject && currentProject.projectName && !selectedProjectId) {
            setSelectedProjectId(currentProject.projectName);
        }
    }, [currentProject]);

    async function loadProjects() {
        try {
            const allProjects = await getAllProjects();
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const getNextMinorVersion = (currentVersion) => {
        const [majorRaw, minorRaw] = String(currentVersion || '1.0').split('.');
        const major = Number.isFinite(Number(majorRaw)) ? Number(majorRaw) : 1;
        const minor = Number.isFinite(Number(minorRaw)) ? Number(minorRaw) : 0;
        return `${major}.${minor + 1}`;
    };

    const buildGuideSnapshot = async (currentGuide = guide) => {
        const manualId = currentGuide.id || generateId();
        const finalSteps = await toPersistableSteps(manualId, currentGuide.steps, currentGuide.sourceVideoUrl || persistentVideoSrc || null);

        return {
            id: manualId,
            title: currentGuide.title,
            summary: currentGuide.summary,
            difficulty: currentGuide.difficulty,
            timeRequired: currentGuide.timeRequired,
            documentNumber: currentGuide.documentNumber,
            version: currentGuide.version,
            status: currentGuide.status,
            author: currentGuide.author,
            revisionDate: currentGuide.revisionDate,
            effectiveDate: currentGuide.effectiveDate,
            headerOrder: currentGuide.headerOrder,
            workflow: currentGuide.workflow,
            templateFields: currentGuide.templateFields,
            approvalMatrix: currentGuide.approvalMatrix,
            approvalRequests: currentGuide.approvalRequests,
            assignments: currentGuide.assignments,
            auditTrail: currentGuide.auditTrail,
            stepComments: currentGuide.stepComments,
            issueReports: currentGuide.issueReports,
            notifications: currentGuide.notifications,
            eSignatures: currentGuide.eSignatures,
            readAcks: currentGuide.readAcks,
            stepStatusMap: currentGuide.stepStatusMap,
            stepChangeLog: currentGuide.stepChangeLog,
            sourceVideoUrl: currentGuide.sourceVideoUrl || persistentVideoSrc || null,
            steps: finalSteps
        };
    };

    const appendStepAuditEvent = (prevGuide, stepId, action, details = '') => {
        const entry = {
            id: generateId(),
            stepId,
            action,
            details,
            actor: `${currentUserName} (${currentUserRole})`,
            timestamp: new Date().toISOString()
        };
        return [entry, ...(prevGuide.stepChangeLog || [])].slice(0, 500);
    };

    const hasAnyRole = (...roles) => currentUserRole === 'Admin' || roles.includes(currentUserRole);

    const getWorkflowStatusLabel = (status) => {
        const map = {
            DRAFT: tt('manual.statuses.draft', 'DRAFT'),
            REVIEW: tt('manual.statuses.review', 'REVIEW'),
            PUBLISHED: tt('manual.statuses.published', 'PUBLISHED')
        };
        const normalized = normalizeWorkflowStatus(status);
        return map[normalized] || normalized;
    };
    const canEditManual = hasAnyRole('Author');
    const canSubmitApproval = hasAnyRole('Author');
    const canApprove = hasAnyRole('Approver');
    const canRelease = hasAnyRole('Approver');
    const canSign = hasAnyRole('Approver');
    const canReportIssue = hasAnyRole('Operator', 'Author', 'Reviewer', 'Approver');
    const canResolveComment = hasAnyRole('Reviewer', 'Approver');
    const canManageAssignments = hasAnyRole('Author', 'Approver');
    const canAcknowledge = hasAnyRole('Operator', 'Reviewer', 'Approver', 'Author');
    const canManageCAPA = hasAnyRole('Reviewer', 'Approver');

    const guardPermission = async (allowed, actionLabel = 'this action') => {
        if (allowed) return true;
        await showAlert('Access Denied', `Role ${currentUserRole} cannot perform ${actionLabel}.`);
        return false;
    };

    const appendAuditEvent = (prevGuide, action, details = '') => {
        const entry = {
            id: generateId(),
            action,
            details,
            actor: `${currentUserName} (${currentUserRole})`,
            timestamp: new Date().toISOString()
        };
        return [entry, ...(prevGuide.auditTrail || [])].slice(0, 200);
    };

    const createVersionSnapshot = (snapshotGuide = guide, summary = '') => ({
        id: generateId(),
        version: snapshotGuide.version || '1.0',
        summary: summary || `Snapshot v${snapshotGuide.version || '1.0'}`,
        updatedAt: new Date().toISOString(),
        updatedBy: snapshotGuide.author || 'System',
        guideSnapshot: buildGuideSnapshot(snapshotGuide)
    });

    const handleWorkflowStatusChange = async (nextStatus) => {
        const normalizedNextStatus = normalizeWorkflowStatus(nextStatus);
        if (!(await guardPermission(normalizedNextStatus === 'PUBLISHED' ? canRelease : canEditManual, `status change to ${normalizedNextStatus}`))) return;
        const currentStatus = normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT');
        const allowed = getAllowedWorkflowTransitions(currentStatus);

        if (!allowed.includes(normalizedNextStatus)) {
            await showAlert(
                'Invalid Transition',
                `Status transition from "${currentStatus}" to "${normalizedNextStatus}" is not allowed. Use step-by-step approval flow.`
            );
            return;
        }

        if (normalizedNextStatus === 'PUBLISHED') {
            const allApproved = (guide.approvalRequests || []).length > 0 && (guide.approvalRequests || []).every(r => r.status === 'Approved');
            if (!allApproved) {
                await showAlert('Approval Required', 'All approval levels must be approved before status can be PUBLISHED.');
                return;
            }
        }

        setGuide(prev => {
            const nextReadAcks = normalizedNextStatus === 'PUBLISHED'
                ? (prev.readAcks || []).filter(a => a.version !== (prev.version || '1.0'))
                : (prev.readAcks || []);
            return {
                ...prev,
                status: normalizedNextStatus,
                workflow: {
                    ...(prev.workflow || {}),
                    status: normalizedNextStatus,
                    updatedBy: `${currentUserName} (${currentUserRole})`,
                    updatedAt: new Date().toISOString()
                },
                readAcks: nextReadAcks,
                auditTrail: appendAuditEvent(prev, 'Workflow Status Changed', `${normalizeWorkflowStatus(prev.workflow?.status || prev.status || 'DRAFT')} -> ${normalizedNextStatus}`)
            };
        });
    };

    const handleCreateVersion = async () => {
        const summary = window.prompt('Version summary (optional):', 'Minor improvement') || '';
        setGuide(prev => {
            const snapshot = createVersionSnapshot(prev, summary);
            const nextVersion = getNextMinorVersion(prev.version);
            return {
                ...prev,
                version: nextVersion,
                revisionDate: new Date().toISOString().split('T')[0],
                versionHistory: [snapshot, ...(prev.versionHistory || [])].slice(0, 25),
                workflow: {
                    ...(prev.workflow || {}),
                    status: normalizeWorkflowStatus(prev.workflow?.status || prev.status || 'DRAFT'),
                    updatedAt: new Date().toISOString(),
                    updatedBy: prev.author || 'System'
                },
                auditTrail: appendAuditEvent(prev, 'Version Snapshot Created', `Created snapshot v${snapshot.version}${summary ? `: ${summary}` : ''}`)
            };
        });
        await showAlert('Version Created', 'New version snapshot created successfully.');
    };

    const handleRestoreVersion = async (historyItem) => {
        if (!historyItem?.guideSnapshot) return;
        if (!await showConfirm(`Restore version ${historyItem.version}? Current unsaved changes may be replaced.`)) return;

        setGuide(prev => {
            const backupSnapshot = createVersionSnapshot(prev, `Auto-backup before restore ${historyItem.version}`);
            const restored = historyItem.guideSnapshot;
            return {
                ...prev,
                ...restored,
                versionHistory: [backupSnapshot, ...(prev.versionHistory || [])].slice(0, 25),
                workflow: {
                    ...(restored.workflow || {}),
                    updatedAt: new Date().toISOString(),
                    updatedBy: prev.author || 'System'
                },
                auditTrail: appendAuditEvent(prev, 'Version Restored', `Restored version ${historyItem.version}`)
            };
        });
        setActiveStepId(historyItem.guideSnapshot?.steps?.[0]?.id || null);
    };

    const handleAddApprovalLevel = () => {
        setGuide(prev => {
            const nextLevel = (prev.approvalMatrix?.length || 0) + 1;
            return {
                ...prev,
                approvalMatrix: [...(prev.approvalMatrix || []), { id: generateId(), level: nextLevel, role: '', approverName: '', slaHours: 24 }],
                auditTrail: appendAuditEvent(prev, 'Approval Matrix Updated', `Added level ${nextLevel}`)
            };
        });
    };

    const handleUpdateApprovalLevel = (id, key, value) => {
        setGuide(prev => ({
            ...prev,
            approvalMatrix: (prev.approvalMatrix || []).map(l => l.id === id ? { ...l, [key]: value } : l)
        }));
    };

    const handleRemoveApprovalLevel = (id) => {
        setGuide(prev => {
            const updated = (prev.approvalMatrix || []).filter(l => l.id !== id).map((l, idx) => ({ ...l, level: idx + 1 }));
            return {
                ...prev,
                approvalMatrix: updated,
                auditTrail: appendAuditEvent(prev, 'Approval Matrix Updated', 'Removed approval level')
            };
        });
    };

    const handleSubmitForApproval = async () => {
        if (!(await guardPermission(canSubmitApproval, 'submit for approval'))) return;
        const workflowStatus = normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT');
        if (workflowStatus !== 'DRAFT') {
            await showAlert('Invalid Status', 'Manual can only be submitted for approval from DRAFT status.');
            return;
        }
        if (!(guide.approvalMatrix || []).length) {
            await showAlert('Approval Matrix Missing', 'Please add at least one approval level before submitting.');
            return;
        }

        setGuide(prev => {
            const requests = (prev.approvalMatrix || []).map(level => ({
                id: generateId(),
                level: level.level,
                role: level.role,
                approverName: level.approverName,
                status: 'Pending',
                note: '',
                actedAt: null
            }));

            return {
                ...prev,
                status: 'REVIEW',
                workflow: {
                    ...(prev.workflow || {}),
                    status: 'REVIEW',
                    updatedBy: `${currentUserName} (${currentUserRole})`,
                    updatedAt: new Date().toISOString()
                },
                approvalRequests: requests,
                auditTrail: appendAuditEvent(prev, 'Submitted for Approval', `${currentUserName} submitted ${requests.length} approval levels`)
            };
        });
    };

    const handleApprovalAction = async (requestId, decision) => {
        if (!(await guardPermission(canApprove, `${decision.toLowerCase()} approval`))) return;
        const note = window.prompt(`${decision} note (optional):`, '') || '';
        setGuide(prev => {
            const existingRequests = prev.approvalRequests || [];
            const targetRequest = existingRequests.find(r => r.id === requestId);
            if (!targetRequest) return prev;
            if (targetRequest.status !== 'Pending') {
                return prev;
            }

            const blockingLowerLevel = existingRequests.some(r => r.level < targetRequest.level && r.status !== 'Approved');
            if (blockingLowerLevel) {
                return prev;
            }

            const updatedRequests = existingRequests.map(r =>
                r.id === requestId ? { ...r, status: decision, note, actedAt: new Date().toISOString() } : r
            );

            const allApproved = updatedRequests.length > 0 && updatedRequests.every(r => r.status === 'Approved');
            const hasRejected = updatedRequests.some(r => r.status === 'Rejected');

            let nextStatus = normalizeWorkflowStatus(prev.status);
            if (allApproved) nextStatus = 'PUBLISHED';
            if (hasRejected) nextStatus = 'DRAFT';

            return {
                ...prev,
                status: nextStatus,
                workflow: {
                    ...(prev.workflow || {}),
                    status: nextStatus,
                    updatedBy: `${currentUserName} (${currentUserRole})`,
                    updatedAt: new Date().toISOString()
                },
                approvalRequests: updatedRequests,
                auditTrail: appendAuditEvent(prev, 'Approval Action', `${currentUserName} ${decision} level ${targetRequest.level}${note ? ` (${note})` : ''}`)
            };
        });
    };

    const handleAddAssignment = async () => {
        if (!(await guardPermission(canManageAssignments, 'add assignment'))) return;
        const assignee = window.prompt('Assignee name:', '') || '';
        if (!assignee.trim()) return;
        const team = window.prompt('Team (optional):', '') || '';
        const shift = window.prompt('Shift (optional):', '') || '';
        const dueAt = window.prompt('Due date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]) || '';

        setGuide(prev => ({
            ...prev,
            assignments: [
                {
                    id: generateId(),
                    assignee,
                    team,
                    shift,
                    dueAt,
                    status: 'Not Started',
                    assignedAt: new Date().toISOString(),
                    startedAt: null,
                    completedAt: null,
                    signedOffBy: null,
                    signedOffAt: null
                },
                ...(prev.assignments || [])
            ],
            auditTrail: appendAuditEvent(prev, 'Assignment Added', `Assigned to ${assignee}`)
        }));
    };

    const handleAssignmentStatusChange = (assignmentId, status) => {
        setGuide(prev => ({
            ...prev,
            assignments: (prev.assignments || []).map(a => {
                if (a.id !== assignmentId) return a;
                const next = { ...a, status };
                if (status === 'In Progress' && !a.startedAt) next.startedAt = new Date().toISOString();
                if (status === 'Done' && !a.completedAt) next.completedAt = new Date().toISOString();
                return next;
            }),
            auditTrail: appendAuditEvent(prev, 'Assignment Status Changed', `Assignment updated to ${status}`)
        }));
    };

    const handleSignOffAssignment = async (assignmentId) => {
        if (!(await guardPermission(canManageAssignments, 'sign off assignment'))) return;
        const signer = window.prompt('Sign-off by:', '') || '';
        if (!signer.trim()) return;

        setGuide(prev => ({
            ...prev,
            assignments: (prev.assignments || []).map(a =>
                a.id === assignmentId
                    ? {
                        ...a,
                        status: 'Done',
                        completedAt: a.completedAt || new Date().toISOString(),
                        signedOffBy: signer,
                        signedOffAt: new Date().toISOString()
                    }
                    : a
            ),
            auditTrail: appendAuditEvent(prev, 'Assignment Signed Off', `Signed off by ${signer}`)
        }));
    };

    const handleAddInlineComment = async (stepId) => {
        if (!(await guardPermission(hasAnyRole('Reviewer', 'Approver', 'Author'), 'add inline comment'))) return;
        const reviewer = window.prompt('Reviewer name:', '') || '';
        const comment = window.prompt('Inline comment:', '') || '';
        if (!reviewer.trim() || !comment.trim()) return;

        setGuide(prev => ({
            ...prev,
            stepComments: [
                {
                    id: generateId(),
                    stepId,
                    reviewer,
                    comment,
                    status: 'Open',
                    createdAt: new Date().toISOString(),
                    resolvedAt: null
                },
                ...(prev.stepComments || [])
            ],
            auditTrail: appendAuditEvent(prev, 'Inline Comment Added', `Step ${stepId} commented by ${reviewer}`)
        }));
    };

    const handleResolveInlineComment = async (commentId) => {
        if (!(await guardPermission(canResolveComment, 'resolve inline comment'))) return;
        setGuide(prev => ({
            ...prev,
            stepComments: (prev.stepComments || []).map(c =>
                c.id === commentId ? { ...c, status: 'Resolved', resolvedAt: new Date().toISOString() } : c
            ),
            auditTrail: appendAuditEvent(prev, 'Inline Comment Resolved', `Comment ${commentId} resolved`)
        }));
    };

    const handleReportIssue = async (stepId) => {
        if (!(await guardPermission(canReportIssue, 'report issue'))) return;
        const category = window.prompt('Issue category (tool/safety/quality/method):', 'safety') || 'general';
        const title = window.prompt('Issue title:', '') || '';
        const description = window.prompt('Issue description:', '') || '';
        const reportedBy = window.prompt('Reported by:', currentUserName) || currentUserName;
        if (!title.trim() || !reportedBy.trim()) return;

        setGuide(prev => ({
            ...prev,
            issueReports: [
                {
                    id: generateId(),
                    stepId,
                    category,
                    title,
                    description,
                    reportedBy,
                    owner: '',
                    status: 'Open',
                    rootCause: '',
                    correctiveAction: '',
                    verificationNote: '',
                    targetDate: '',
                    verifiedBy: '',
                    verifiedAt: null,
                    closureNote: '',
                    createdAt: new Date().toISOString()
                },
                ...(prev.issueReports || [])
            ],
            auditTrail: appendAuditEvent(prev, 'Issue Reported', `${category}: ${title}`)
        }));
    };

    const handleSignElectronic = async () => {
        if (!(await guardPermission(canSign, 'electronic sign'))) return;
        const signerName = window.prompt('Signer name:', '') || '';
        const role = window.prompt('Role:', 'Approver') || 'Approver';
        const pin = window.prompt('PIN (min 4 digits):', '') || '';
        const reason = window.prompt('Reason/signature note:', 'Manual verification') || '';

        if (!signerName.trim()) return;
        if (!pin || pin.length < 4) {
            await showAlert('Invalid PIN', 'PIN must be at least 4 digits.');
            return;
        }

        setGuide(prev => ({
            ...prev,
            eSignatures: [
                {
                    id: generateId(),
                    signerName,
                    role,
                    pinMasked: '*'.repeat(pin.length),
                    reason,
                    signedAt: new Date().toISOString(),
                    targetVersion: prev.version || '1.0'
                },
                ...(prev.eSignatures || [])
            ],
            auditTrail: appendAuditEvent(prev, 'Electronic Signature Added', `${signerName} (${role}) signed`)
        }));
    };

    const handleAcknowledgeCurrentVersion = async () => {
        if (!(await guardPermission(canAcknowledge, 'acknowledge manual version'))) return;
        const currentVersion = guide.version || '1.0';
        const exists = (guide.readAcks || []).some(a => a.version === currentVersion && a.userName === currentUserName);
        if (exists) {
            await showAlert('Already Acknowledged', `You already acknowledged version ${currentVersion}.`);
            return;
        }
        const note = window.prompt('Acknowledgement note (optional):', '') || '';
        setGuide(prev => ({
            ...prev,
            readAcks: [
                {
                    id: generateId(),
                    version: prev.version || '1.0',
                    userName: currentUserName,
                    role: currentUserRole,
                    acknowledgedAt: new Date().toISOString(),
                    note
                },
                ...(prev.readAcks || [])
            ],
            auditTrail: appendAuditEvent(prev, 'Manual Acknowledged', `Version ${prev.version || '1.0'} acknowledged by ${currentUserName}`)
        }));
    };

    const handleIssueTransition = async (issueId, nextStatus) => {
        if (!(await guardPermission(canManageCAPA, `move CAPA to ${nextStatus}`))) return;
        const currentIssue = (guide.issueReports || []).find(i => i.id === issueId);
        if (!currentIssue) return;
        const allowedNow = CAPA_TRANSITIONS[currentIssue.status] || [];
        if (!allowedNow.includes(nextStatus)) {
            await showAlert('Invalid CAPA Transition', `Cannot move from ${currentIssue.status} to ${nextStatus}.`);
            return;
        }
        if (nextStatus === 'Closed' && !String(currentIssue.verificationNote || '').trim()) {
            await showAlert('Verification Required', 'Please fill verification note before closing CAPA.');
            return;
        }
        setGuide(prev => {
            const target = (prev.issueReports || []).find(i => i.id === issueId);
            if (!target) return prev;
            const allowed = CAPA_TRANSITIONS[target.status] || [];
            if (!allowed.includes(nextStatus)) return prev;

            let patch = {};
            if (nextStatus === 'Root Cause') {
                patch.rootCause = window.prompt('Root cause:', target.rootCause || '') || target.rootCause || '';
                patch.owner = window.prompt('Owner:', target.owner || currentUserName) || target.owner || currentUserName;
            }
            if (nextStatus === 'Corrective Action') {
                patch.correctiveAction = window.prompt('Corrective action:', target.correctiveAction || '') || target.correctiveAction || '';
                patch.targetDate = window.prompt('Target date (YYYY-MM-DD):', target.targetDate || new Date().toISOString().split('T')[0]) || target.targetDate || '';
            }
            if (nextStatus === 'Verification') {
                patch.verificationNote = window.prompt('Verification note:', target.verificationNote || '') || target.verificationNote || '';
            }
            if (nextStatus === 'Closed') {
                patch.closureNote = window.prompt('Closure note:', target.closureNote || '') || target.closureNote || '';
                patch.verifiedBy = currentUserName;
                patch.verifiedAt = new Date().toISOString();
            }

            return {
                ...prev,
                issueReports: (prev.issueReports || []).map(i => i.id === issueId ? { ...i, ...patch, status: nextStatus } : i),
                auditTrail: appendAuditEvent(prev, 'CAPA Transition', `${target.title}: ${target.status} -> ${nextStatus}`)
            };
        });
    };

    const updateTemplateList = (type, nextList) => {
        setGuide(prev => ({
            ...prev,
            templateFields: {
                ...(prev.templateFields || {}),
                [type]: nextList
            }
        }));
    };

    const addTemplateItem = (type) => {
        const defaults = {
            tools: { name: '', qty: '', note: '' },
            parts: { partNo: '', name: '', qty: '', note: '' },
            ppe: { name: '', mandatory: true }
        };
        const current = guide.templateFields?.[type] || [];
        updateTemplateList(type, [...current, defaults[type]]);
    };

    const updateTemplateItem = (type, index, key, value) => {
        const current = [...(guide.templateFields?.[type] || [])];
        if (!current[index]) return;
        current[index] = { ...current[index], [key]: value };
        updateTemplateList(type, current);
    };

    const removeTemplateItem = (type, index) => {
        const current = [...(guide.templateFields?.[type] || [])];
        current.splice(index, 1);
        updateTemplateList(type, current);
    };

    const handleOperatorToggleCheck = (stepId) => {
        setOperatorChecks(prev => {
            const existing = prev[stepId];
            return {
                ...prev,
                [stepId]: existing?.completed
                    ? { completed: false, checkedAt: null, note: existing?.note || '' }
                    : { completed: true, checkedAt: new Date().toISOString(), note: existing?.note || '' }
            };
        });
    };

    const isQuestionAnswered = (question, value) => {
        if (question?.type === 'checkbox') {
            return Array.isArray(value) ? value.length > 0 : Boolean(value);
        }
        return String(value ?? '').trim().length > 0;
    };

    const findMissingRequiredQuestion = (questions = [], answers = {}) => {
        return questions.find((q) => q?.required && !isQuestionAnswered(q, answers?.[q.id]));
    };

    const handleOperatorNext = async () => {
        const currentStep = guide.steps[operatorStepIndex] || null;
        if (currentStep && !currentStep.hideDataCapture) {
            const questions = getStepDataCaptureFields(currentStep);
            const answers = operatorDataCaptureAnswers?.[currentStep.id] || {};
            const missingRequired = findMissingRequiredQuestion(questions, answers);
            if (missingRequired) {
                await showAlert('Validation', `Please fill required field: ${missingRequired.label}`);
                return;
            }
        }

        setOperatorStepIndex(prev => Math.min(prev + 1, Math.max(guide.steps.length - 1, 0)));
    };

    const handleOperatorBack = () => {
        const minIndex = (guide.summary || (guide.templateFields?.tools || []).length > 0 || (guide.templateFields?.parts || []).length > 0) ? -1 : 0;
        setOperatorStepIndex(prev => Math.max(prev - 1, minIndex));
    };

    const handleSaveManual = async (silent = false) => {
        if (isSavingManual) return;

        if (!guide.title) {
            if (!silent) await showAlert('Title Required', t('manual.alerts.enterTitle'));
            return;
        }

        if (!isSupabaseReady()) {
            if (!silent) await showAlert('Storage Not Configured', 'Supabase is not configured. Please set your Supabase URL and Anon Key in App Settings.');
            return;
        }

        setIsSavingManual(true);
        setSyncStatus('syncing');
        setSaveProgress(10);
        const isUpdate = Boolean(guide.id && String(guide.id).includes('-'));

        try {
            setSaveProgress(35);
            const snapshot = await buildGuideSnapshot(guide);
            setSaveProgress(70);
            const result = await upsertManual({
                id: isUpdate ? guide.id : snapshot.id,
                title: guide.title,
                summary: guide.summary || '',
                description: guide.summary || '',
                documentNumber: guide.documentNumber || '',
                version: guide.version || '1.0',
                status: normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT'),
                author: guide.author || '',
                difficulty: guide.difficulty || 'Moderate',
                timeRequired: guide.timeRequired || '',
                category: 'Work Instruction',
                industry: guide.category || '',
                createdAt: guide.createdAt || new Date().toISOString(),
                content: {
                    ...snapshot,
                    status: normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT')
                }
            });

            const nextId = result.id;

            setGuide(prev => ({
                ...prev,
                id: nextId,
                cloudId: nextId,
                kbId: nextId
            }));

            setSaveProgress(100);
            setSyncStatus('saved');
            if (!silent) {
                await showAlert('Success', isUpdate ? t('manual.alerts.updateSuccess') : t('manual.alerts.saveSuccess'));
            }

            // Revert status to idle after 3 seconds
            setTimeout(() => {
                setSyncStatus('idle');
                setSaveProgress(0);
                setIsSavingManual(false);
            }, 1000);
        } catch (error) {
            console.error('Error saving manual:', error);
            setSyncStatus('error');
            setIsSavingManual(false);
            setSaveProgress(0);
            if (!silent) {
                await showAlert('Error', t('manual.alerts.saveFailed', { message: error.message }));
            }
        }
    };

    useEffect(() => {
        const onKeyDown = (event) => {
            const isSaveShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's';
            if (!isSaveShortcut) return;

            event.preventDefault();
            if (isSavingManual) return;
            handleSaveManual(false);
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isSavingManual, handleSaveManual]);

    const handleLoadManualsList = async () => {
        try {
            if (!isSupabaseReady()) {
                await showAlert('Storage Not Configured', 'Supabase is not configured. Please set your Supabase URL and Anon Key in App Settings.');
                return;
            }

            const manuals = await listManuals();
            setSavedManuals(manuals);
            setShowOpenDialog(true);
        } catch (error) {
            console.error('Error loading manuals list:', error);
            await showAlert('Error', t('manual.alerts.loadManualsFailed'));
        }
    };

    // Video Clipping Feature
    const handleMarkIn = () => {
        if (!videoRef.current || !activeStepId) return;
        const time = Math.round(videoRef.current.currentTime * 10) / 10;
        const currentStep = guide.steps.find(s => s.id === activeStepId);
        if (!currentStep) return;

        const update = { startTime: time };
        const resolvedVideoUrl = persistentVideoSrc || guide.sourceVideoUrl || (!isBlobUrl(videoSrc) ? videoSrc : null);
        // Auto-set as video media if not already set or if it's an image
        if ((!currentStep.media || currentStep.media.type !== 'youtube') && resolvedVideoUrl) {
            update.media = { type: 'video', url: resolvedVideoUrl };
        }
        handleStepChange(activeStepId, update);
    };

    const handleMarkOut = () => {
        if (!videoRef.current || !activeStepId) return;
        const time = Math.round(videoRef.current.currentTime * 10) / 10;
        const currentStep = guide.steps.find(s => s.id === activeStepId);
        if (!currentStep) return;

        const startTime = currentStep.startTime || 0;
        const duration = Math.max(0, time - startTime);
        const update = { duration: Math.round(duration * 10) / 10 };
        const resolvedVideoUrl = persistentVideoSrc || guide.sourceVideoUrl || (!isBlobUrl(videoSrc) ? videoSrc : null);

        // Auto-set as video media if not already set or if it's an image
        if ((!currentStep.media || currentStep.media.type !== 'youtube') && resolvedVideoUrl) {
            update.media = { type: 'video', url: resolvedVideoUrl };
        }
        handleStepChange(activeStepId, update);
    };

    const handleSeekTo = (time) => {
        if (!videoRef.current || time === undefined) return;
        videoRef.current.currentTime = time;
    };

    const handleOpenManual = (manual) => {
        const normalized = normalizeGuide(manual);
        setGuide(normalized);
        setActiveStepId(normalized.steps?.[0]?.id || null);
        setOperatorStepIndex(0);
        setOperatorChecks({});

        setShowOpenDialog(false);
        // Set selectedProject to enable the editor view
        setSelectedProject({ projectName: manual.title || 'Loaded Manual' });
    };


    const handleStepSelect = (id) => {
        setActiveStepId(id);
        setGuide(prev => {
            const current = prev.stepStatusMap?.[id] || 'not_started';
            if (current === 'completed' || current === 'in_progress') return prev;
            return {
                ...prev,
                stepStatusMap: {
                    ...(prev.stepStatusMap || {}),
                    [id]: 'in_progress'
                },
                stepChangeLog: appendStepAuditEvent(prev, id, 'Status Changed', 'not_started -> in_progress')
            };
        });
    };

    const handleAddStep = () => {
        const newStep = {
            id: generateId(),
            title: tt('manual.untitledStep', 'Untitled Step'),
            media: null,
            instructions: '',
            bullets: []
        };
        setGuide(prev => ({
            ...prev,
            steps: ensureUniqueStepIds([...prev.steps, newStep]),
            stepStatusMap: {
                ...(prev.stepStatusMap || {}),
                [newStep.id]: 'not_started'
            },
            stepChangeLog: appendStepAuditEvent(prev, newStep.id, 'Step Created', `Added ${newStep.title}`)
        }));
        setActiveStepId(newStep.id);
    };

    const resolveAnalysisMeasurements = () => {
        if (Array.isArray(selectedProject?.measurements) && selectedProject.measurements.length > 0) {
            return selectedProject.measurements;
        }

        if (Array.isArray(currentProject?.measurements) && currentProject.measurements.length > 0) {
            return currentProject.measurements;
        }

        const matchedById = projects.find((p) => p?.projectName === selectedProjectId);
        if (Array.isArray(matchedById?.measurements) && matchedById.measurements.length > 0) {
            return matchedById.measurements;
        }

        return [];
    };

    const handleImportFromAnalysis = async () => {
        const analysisMeasurements = resolveAnalysisMeasurements();

        if (!analysisMeasurements.length) {
            await showAlert(
                'No Analysis Data',
                t('manual.alerts.uploadVideoFirst') || 'No analysis data found. Please select a project with measurements first.'
            );
            return;
        }

        const confirmAppend = await showConfirm(
            tt('manual.alerts.confirmAppendSteps', 'Import {{count}} steps from analysis?', { count: analysisMeasurements.length }),
            'This will add steps based on your video measurements.'
        );

        if (!confirmAppend) return;

        const newSteps = analysisMeasurements.map(m => ({
            id: generateId(),
            title: m.elementName || tt('manual.untitledStep', 'Untitled Step'),
            media: { type: 'video', url: null },
            instructions: m.elementName || '',
            bullets: [],
            startTime: m.startTime,
            duration: m.duration
        }));

        setGuide(prev => ({
            ...prev,
            steps: ensureUniqueStepIds([...prev.steps, ...newSteps]),
            auditTrail: appendAuditEvent(prev, 'Imported from Analysis', `Added ${newSteps.length} steps`)
        }));

        if (newSteps.length > 0 && !activeStepId) {
            setActiveStepId(newSteps[0].id);
        }
    };

    const handleDeleteStep = async (id) => {
        if (!await showConfirm(t('manual.alerts.confirmDeleteStep'))) return;
        setGuide(prev => {
            const newSteps = prev.steps.filter(s => s.id !== id);
            const nextStatus = { ...(prev.stepStatusMap || {}) };
            delete nextStatus[id];
            return {
                ...prev,
                steps: newSteps,
                stepStatusMap: nextStatus,
                stepChangeLog: appendStepAuditEvent(prev, id, 'Step Deleted', 'Step removed from guide')
            };
        });
        if (activeStepId === id) setActiveStepId(null);
    };

    const handleReorderStep = (fromIndex, toIndex) => {
        setGuide(prev => {
            if (fromIndex < 0 || toIndex < 0 || fromIndex >= prev.steps.length || toIndex >= prev.steps.length) return prev;
            const nextSteps = [...prev.steps];
            const [moved] = nextSteps.splice(fromIndex, 1);
            nextSteps.splice(toIndex, 0, moved);
            return {
                ...prev,
                steps: nextSteps,
                stepChangeLog: appendStepAuditEvent(prev, moved?.id, 'Step Reordered', `Moved from ${fromIndex + 1} to ${toIndex + 1}`)
            };
        });
    };

    const handleEditStep = (id) => {
        const step = guide.steps.find((s) => s.id === id);
        if (!step) return;

        showPrompt('Edit Step Title', 'Update step name:', step.title || '').then((nextTitle) => {
            if (nextTitle === null) return;
            handleStepChange(id, { title: nextTitle.trim() || tt('manual.untitledStep', 'Untitled Step') });
        });
    };

    const handleRenameGuideTitle = async () => {
        const nextTitle = await showPrompt('Rename Manual', 'Nama Baru / New Title', guide.title || '');
        if (nextTitle === null) return;

        const trimmed = nextTitle.trim();
        if (!trimmed) return;

        setGuide(prev => ({ ...prev, title: trimmed }));
    };

    const handleStepChange = (id, fieldOrUpdate, value) => {
        setGuide(prev => ({
            ...prev,
            stepStatusMap: {
                ...(prev.stepStatusMap || {}),
                [id]: prev.stepStatusMap?.[id] === 'completed' ? 'completed' : 'in_progress'
            },
            stepChangeLog: appendStepAuditEvent(prev, id, 'Step Updated', typeof fieldOrUpdate === 'string' ? fieldOrUpdate : 'bulk_update'),
            steps: prev.steps.map(s => {
                if (s.id !== id) return s;
                if (typeof fieldOrUpdate === 'string') {
                    return { ...s, [fieldOrUpdate]: value };
                }
                return { ...s, ...fieldOrUpdate };
            })
        }));
    };

    const [isAiLoading, setIsAiLoading] = useState(false);

    const handleAiGenerate = async (stepId, taskName, imageData = null) => {
        setIsAiLoading(true);
        try {
            const content = await generateManualContent(taskName, undefined, null, imageData, generationLanguage);

            // Format instructions from description + key points
            let instructions = `<p>${content.description}</p>`;
            if (content.keyPoints) {
                instructions += `<p><strong>Key Points:</strong> ${content.keyPoints}</p>`;
            }

            const bullets = [];
            if (content.safety) {
                bullets.push({ type: 'warning', text: content.safety });
            }

            handleStepChange(stepId, {
                instructions: instructions,
                bullets: [...(guide.steps.find(s => s.id === stepId).bullets || []), ...bullets]
            });
        } catch (error) {
            console.error('AI Generate Error:', error);
            await showAlert('AI Error', t('manual.alerts.generateContentFailed', { message: error.message }));
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleFullVideoAI = async () => {
        if (!rawVideoFile && !videoSrc) {
            await showAlert('Video Required', t('manual.alerts.uploadVideoFirst'));
            return;
        }

        const apiKey = getStoredApiKey();
        if (!apiKey) {
            await showAlert('API Key Missing', t('manual.alerts.apiKeyMissing'));
            return;
        }

        setIsFullAIAnalyzing(true);
        try {
            let videoUri = geminiVideoUri;

            // 1. Upload to Gemini if not already uploaded
            if (!videoUri && rawVideoFile) {
                setIsUploadingVideo(true);
                videoUri = await uploadFileToGemini(rawVideoFile, apiKey);
                setGeminiVideoUri(videoUri);
                setIsUploadingVideo(false);
            }

            if (!videoUri) {
                throw new Error(t('manual.alerts.videoPrepareFailed'));
            }

            // 2. Analyze Full Video
            const steps = await generateFullManualFromVideo(videoUri, apiKey, generationLanguage);

            if (steps && Array.isArray(steps)) {
                const formattedSteps = steps.map(s => ({
                    id: generateId(),
                    title: s.title || tt('manual.untitledStep', 'Untitled Step'),
                    instructions: `<p>${s.description || ''}</p>`,
                    startTime: s.startTime || 0,
                    endTime: s.endTime || 0,
                    bullets: Array.isArray(s.bullets) ? s.bullets : [],
                    media: { type: 'video', url: null } // We link to the main video
                }));

                if (await showConfirm(t('manual.alerts.confirmOverwriteSteps', { count: formattedSteps.length }))) {
                    setGuide(prev => ({ ...prev, steps: ensureUniqueStepIds(formattedSteps) }));
                    if (formattedSteps.length > 0) setActiveStepId(formattedSteps[0].id);
                } else if (await showConfirm(t('manual.alerts.confirmAppendSteps', { count: formattedSteps.length }))) {
                    setGuide(prev => ({ ...prev, steps: ensureUniqueStepIds([...prev.steps, ...formattedSteps]) }));
                }
            }
        } catch (error) {
            console.error('Full Video AI Error:', error);
            await showAlert('AI Error', t('manual.alerts.analyzeVideoFailed', { message: error.message }));
        } finally {
            setIsFullAIAnalyzing(false);
            setIsUploadingVideo(false);
        }
    };

    const handleVideoAiGenerate = async (stepId, taskName) => {
        if (!videoRef.current) {
            await showAlert('Video Source Required', t('manual.alerts.uploadVideoSourceFirst'));
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

            // Auto-save the capture as step media
            const currentStep = guide.steps.find(s => s.id === stepId);
            if (currentStep) {
                handleStepChange(stepId, {
                    media: { type: 'image', url: dataUrl }
                });
            }

            // Generate content using the image
            await handleAiGenerate(stepId, taskName, dataUrl);

        } catch (e) {
            console.error(e);
            await showAlert('Error', t('manual.alerts.captureFrameFailed'));
        }
    };

    const handleAiImprove = async (stepId, currentStep) => {

        setIsAiLoading(true);
        try {
            // Extract text from HTML instructions for AI (simplification)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = currentStep.instructions;
            const plainDescription = tempDiv.textContent || tempDiv.innerText || '';

            const inputContent = {
                description: plainDescription,
                keyPoints: '', // We don't have separate keypoints in current model, assuming integrated
                safety: currentStep.bullets.filter(b => b.type === 'warning' || b.type === 'caution').map(b => b.text).join(', ')
            };

            const improved = await improveManualContent(inputContent);

            handleStepChange(stepId, {
                instructions: `<p>${improved.description}</p>`,
                // We typically don't want to replace bullets entirely, maybe just update text if matched?
                // For simplicity, let's stick to improving the instructions text for now to avoid messing up structural bullets.
            });
        } catch (error) {
            console.error('AI Improve Error:', error);
            await showAlert('AI Error', t('manual.alerts.improveContentFailed', { message: error.message }));
        } finally {
            setIsAiLoading(false);
        }
    };


    const handleCaptureFrame = async () => {
        if (!videoRef.current) {
            await showAlert('Video Required', 'Please upload a source video first to capture frames and create your manual.');
            return;
        }
        if (!activeStepId) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        const currentStep = guide.steps.find(s => s.id === activeStepId);
        if (!currentStep) return;

        const existingImages = Array.isArray(currentStep.images) ? currentStep.images : [];

        if (isSupabaseConfigured()) {
            const cfg = getSupabaseSettings();
            const guideKey = sanitizePathPart(guide.cloudId || guide.kbId || guide.id);
            const stepKey = sanitizePathPart(activeStepId);
            const fileName = `${Date.now()}-capture.jpg`;
            const path = `${sanitizePathPart(cfg.folder || 'manuals')}/${guideKey}/steps/${stepKey}/${fileName}`;

            uploadDataUrlToSupabase(path, dataUrl)
                .then((publicUrl) => {
                    const nextImages = [...existingImages, publicUrl];
                    handleStepChange(activeStepId, {
                        images: nextImages,
                        media: { type: 'image', url: publicUrl }
                    });
                })
                .catch((err) => {
                    console.warn('Supabase image upload failed, fallback to local data URL:', err);
                    const nextImages = [...existingImages, dataUrl];
                    handleStepChange(activeStepId, {
                        images: nextImages,
                        media: { type: 'image', url: dataUrl }
                    });
                });
            return;
        }

        const nextImages = [...existingImages, dataUrl];
        handleStepChange(activeStepId, {
            images: nextImages,
            media: { type: 'image', url: dataUrl }
        });
    };

    const exportToPDF = async () => {
        try {
            if (!guide.steps || guide.steps.length === 0) {
                await showAlert('No Content', t('manual.alerts.noStepsToExport'));
                return;
            }

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;

            const colors = {
                primary: [37, 99, 235], // MAVi Blue
                text: [30, 41, 59],
                muted: [100, 116, 139],
                border: [226, 232, 240],
                headerBg: [248, 250, 252]
            };

            const manualId = guide.kbId || guide.id || generateId();
            const baseUrl = window.location.origin;
            const qrUrl = `${baseUrl}/#/manual/${manualId}`;

            // Helper for Header
            const drawHeader = (pageNumber) => {
                doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                doc.setLineWidth(0.3);

                // Header Container
                doc.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
                doc.rect(margin, 10, pageWidth - (margin * 2), 24, 'FD');

                // Dividers
                doc.line(margin + 50, 10, margin + 50, 34);
                doc.line(pageWidth - margin - 40, 10, pageWidth - margin - 40, 34);

                // Logo/Brand area
                doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                doc.setFont(undefined, 'bold');
                doc.setFontSize(14);
                doc.text('MAVi', margin + 5, 22);
                doc.setFontSize(6);
                doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                doc.text('Work Instructions AI', margin + 5, 26);

                // Title Area (Middle)
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                const titleText = doc.splitTextToSize(guide.title || 'Work Instruction', pageWidth - margin - margin - 90);
                doc.text(titleText, margin + 55, 18);

                doc.setFontSize(7);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                doc.text(`ID: ${guide.documentNumber || 'WI-TEMP-001'}`, margin + 55, 28);
                doc.text(`Status: ${normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT')}`, margin + 55, 31);

                // Meta Area (Right)
                doc.setFontSize(7);
                doc.text(`Revision: ${guide.version || '1.0'}`, pageWidth - margin - 35, 16);
                doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, 20);
                doc.text(`Page: ${pageNumber}`, pageWidth - margin - 35, 24);
            };

            // Helper for Footer
            const drawFooter = () => {
                doc.setFontSize(7);
                doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
                doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

                doc.text('© MAVi Industrial Intelligence | Confidential', margin, pageHeight - 10);
                doc.text(`Generated on ${new Date().toLocaleString()}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            };

            let yPos = 45;

            // DRAW FIRST PAGE HEADER
            drawHeader(1);
            let currentPage = 1;

            // Introduction Section
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
            doc.text('INTRODUCTION', margin, yPos);
            yPos += 6;

            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
            const summaryText = doc.splitTextToSize(guide.summary || 'No overview provided.', pageWidth - (margin * 2));
            doc.text(summaryText, margin, yPos);
            yPos += (summaryText.length * 5) + 8;

            // Steps section
            guide.steps.forEach((step, index) => {
                // Space check
                if (yPos > pageHeight - 70) {
                    drawFooter();
                    doc.addPage();
                    currentPage++;
                    drawHeader(currentPage);
                    yPos = 45;
                }

                // Step Header
                doc.setFillColor(241, 245, 249);
                doc.rect(margin, yPos, pageWidth - (margin * 2), 8, 'F');
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
                doc.text(`STEP ${index + 1}: ${step.title}`.toUpperCase(), margin + 4, yPos + 5.5);
                yPos += 14;

                const colWidth = (pageWidth - (margin * 2) - 8) / 2;
                const imageH = 50;

                // Left Column: Media
                if (step.media && step.media.url) {
                    try {
                        doc.addImage(step.media.url, 'JPEG', margin, yPos, colWidth, imageH);
                    } catch (e) {
                        doc.setDrawColor(200);
                        doc.rect(margin, yPos, colWidth, imageH);
                        doc.setFontSize(7);
                        doc.text('[Image Placeholder]', margin + 10, yPos + 25);
                    }
                } else {
                    doc.setDrawColor(240);
                    doc.rect(margin, yPos, colWidth, imageH);
                    doc.setFontSize(7);
                    doc.setTextColor(200);
                    doc.text('No Media', margin + colWidth / 2, yPos + imageH / 2, { align: 'center' });
                }

                // Right Column: Content
                let textY = yPos;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

                const instText = doc.splitTextToSize(step.instructions || '', colWidth);
                doc.text(instText, margin + colWidth + 8, textY);
                textY += (instText.length * 5) + 4;

                // Bullets in Right Column
                if (step.bullets && step.bullets.length > 0) {
                    step.bullets.forEach(b => {
                        let color = [30, 41, 59];
                        let prefix = '• ';
                        if (b.type === 'warning') color = [239, 68, 68];
                        if (b.type === 'caution') color = [245, 158, 11];
                        if (b.type === 'note') color = [59, 130, 246];

                        doc.setTextColor(color[0], color[1], color[2]);
                        doc.setFont(undefined, 'bold');
                        const bText = doc.splitTextToSize(`${b.type ? b.type.toUpperCase() + ': ' : ''}${b.text}`, colWidth - 5);
                        doc.text(prefix, margin + colWidth + 8, textY);
                        doc.text(bText, margin + colWidth + 12, textY);
                        textY += (bText.length * 4) + 2;
                    });
                }

                yPos = Math.max(yPos + imageH, textY) + 12;
            });

            // Final Footer for last page
            drawFooter();

            // Link to Web Version on the last page if there's space
            if (yPos < pageHeight - 50) {
                try {
                    const QRCode = (await import('qrcode')).default;
                    const qrDataUrl = await QRCode.toDataURL(qrUrl, { width: 50, margin: 1 });
                    doc.addImage(qrDataUrl, 'PNG', margin, yPos, 25, 25);
                    doc.setFontSize(7);
                    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
                    doc.text('SCAN FOR DIGITAL ACCESS', margin + 28, yPos + 10);
                    doc.setTextColor(colors.muted[0], colors.muted[1], colors.muted[2]);
                    doc.textWithLink(qrUrl, margin + 28, yPos + 15, { url: qrUrl });
                } catch (e) { }
            }

            doc.save(`${(guide.title || 'manual').replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(e);
            if (showAlert) await showAlert('Export Error', t('manual.alerts.exportFailed', { message: e.message }));
        }
    };

    const exportToWord = async () => {
        try {
            if (!guide.steps || guide.steps.length === 0) {
                await showAlert('No Content', t('manual.alerts.noStepsToExport'));
                return;
            }

            const docx = await import('docx');
            const { saveAs } = await import('file-saver');
            const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = docx;

            const children = [];

            // Title
            children.push(
                new Paragraph({
                    text: guide.title || 'Work Instructions',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER
                })
            );

            // Metadata table (simplified as paragraphs)
            children.push(new Paragraph({ text: `Document Number: ${guide.documentNumber || '-'}` }));
            children.push(new Paragraph({ text: `Version: ${guide.version || '1.0'}` }));
            children.push(new Paragraph({ text: `Status: ${normalizeWorkflowStatus(guide.status || 'DRAFT')}` }));
            children.push(new Paragraph({ text: `Author: ${guide.author || '-'}` }));
            children.push(new Paragraph({ text: `Description: ${guide.summary || '-'}` }));
            children.push(new Paragraph({ text: '' })); // Spacing

            // Steps
            for (let i = 0; i < guide.steps.length; i++) {
                const step = guide.steps[i];

                children.push(
                    new Paragraph({
                        text: `Step ${i + 1}: ${step.title}`,
                        heading: HeadingLevel.HEADING_2
                    })
                );

                // Instructions
                if (step.instructions) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = step.instructions;
                    const plainText = tempDiv.textContent || tempDiv.innerText || '';
                    children.push(new Paragraph({ text: plainText }));
                }

                // Bullets
                if (step.bullets && step.bullets.length > 0) {
                    step.bullets.forEach(b => {
                        children.push(
                            new Paragraph({
                                text: `${b.type.toUpperCase()}: ${b.text}`,
                                bullet: { level: 0 }
                            })
                        );
                    });
                }

                children.push(new Paragraph({ text: '' })); // Spacing
            }

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: children
                }]
            });

            const blob = await Packer.toBlob(doc);
            saveAs(blob, `${(guide.title || 'manual').replace(/\s+/g, '_')}.docx`);
        } catch (e) {
            console.error(e);
            await showAlert('Export Error', t('manual.alerts.wordExportFailed', { message: e.message }));
        }
    };

    const exportToPowerPoint = async () => {
        try {
            if (!guide.steps || guide.steps.length === 0) {
                await showAlert('No Content', t('manual.alerts.noStepsToExport'));
                return;
            }

            const PptxGenJSImport = await import('pptxgenjs');
            const PptxGenJS = PptxGenJSImport.default;
            const pptx = new PptxGenJS();

            pptx.layout = 'LAYOUT_WIDE';
            const BRAND_COLOR = '2563EB'; // Blue-600
            const TEXT_COLOR = '1E293B'; // Slate-800

            // 1. TITLE SLIDE
            const titleSlide = pptx.addSlide();
            titleSlide.background = { color: 'F8FAFC' };

            // Decorative accents
            titleSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.1, fill: { color: BRAND_COLOR } });

            titleSlide.addText(guide.title?.toUpperCase() || 'WORK INSTRUCTIONS', {
                x: 0.5, y: 2.0, w: 9, h: 1.5,
                fontSize: 42, bold: true, color: BRAND_COLOR, align: 'center', fontFace: 'Arial'
            });

            titleSlide.addText([
                { text: `Doc ID: ${guide.documentNumber || 'WI-001'} | Rev: ${guide.version || '1.0'}\n`, options: { fontSize: 14, color: '64748B' } },
                { text: `Status: ${guide.workflow?.status || guide.status || 'Internal Use Only'}`, options: { fontSize: 12, color: '94A3B8', italic: true } }
            ], { x: 0.5, y: 3.5, w: 9, h: 1.0, align: 'center' });

            titleSlide.addShape(pptx.ShapeType.rect, { x: 4.5, y: 5.5, w: 1.0, h: 0.05, fill: { color: BRAND_COLOR } });

            // 2. STEP SLIDES
            guide.steps.forEach((step, i) => {
                const slide = pptx.addSlide();

                // Branded Header
                slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.6, fill: { color: BRAND_COLOR } });
                slide.addText(`STEP ${i + 1}: ${step.title}`.toUpperCase(), {
                    x: 0.3, y: 0.1, w: 9, h: 0.4,
                    fontSize: 20, bold: true, color: 'FFFFFF'
                });

                // Layout: Split 50/50
                const midX = 5.0;

                // Left: Media
                if (step.media && step.media.url) {
                    slide.addImage({
                        path: step.media.url,
                        x: 0.4, y: 1.0, w: 4.5, h: 4.0,
                        sizing: { type: 'contain', w: 4.5, h: 4.0 }
                    });
                } else {
                    slide.addShape(pptx.ShapeType.rect, {
                        x: 0.4, y: 1.0, w: 4.5, h: 4.0,
                        fill: { color: 'F1F5F9' }, line: { color: 'CBD5E1', width: 1 }
                    });
                    slide.addText('NO MEDIA AVAILABLE', {
                        x: 0.4, y: 1.0, w: 4.5, h: 4.0,
                        fontSize: 14, color: '94A3B8', align: 'center', valign: 'middle'
                    });
                }

                // Right: Content
                const contentX = 5.2;
                const contentW = 4.4;

                // Clean instructions
                const cleanInst = (step.instructions || '')
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .trim();

                slide.addText(cleanInst, {
                    x: contentX, y: 1.0, w: contentW, h: 2.5,
                    fontSize: 14, color: TEXT_COLOR, valign: 'top', fontFace: 'Arial'
                });

                // Bullets/Alerts
                if (step.bullets && step.bullets.length > 0) {
                    const bulletsData = step.bullets.map(b => {
                        let color = '1E293B';
                        if (b.type === 'warning') color = 'EF4444';
                        if (b.type === 'caution') color = 'F59E0B';
                        if (b.type === 'note') color = '3B82F6';

                        return {
                            text: b.text,
                            options: {
                                bullet: { type: 'bullet' },
                                color: color,
                                fontSize: 12,
                                margin: 5,
                                bold: b.type !== 'note'
                            }
                        };
                    });

                    slide.addText(bulletsData, {
                        x: contentX, y: 3.6, w: contentW, h: 3.0,
                        valign: 'top'
                    });
                }

                // Footer
                slide.addText(`MAVi Work Instructions | ${guide.title} | Page ${i + 2}`, {
                    x: 0, y: 7.1, w: '100%', h: 0.3,
                    fontSize: 8, color: '94A3B8', align: 'center'
                });
            });

            await pptx.writeFile({ fileName: `${(guide.title || 'manual').replace(/\s+/g, '_')}.pptx` });
        } catch (e) {
            console.error(e);
            if (showAlert) await showAlert('Export Error', t('manual.alerts.powerPointExportFailed', { message: e.message }));
        }
    };

    const handleImportExcel = async (file) => {
        if (!file) return;

        try {
            const XLSX = await import('xlsx');
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                await showAlert('Error', t('manual.alerts.excelEmpty'));
                return;
            }

            // Map data to steps
            // Expected columns: Title, Instructions, Warning, Note
            const newSteps = jsonData.map(row => {
                const instructions = row['Instructions'] || row['Description'] || '';
                const bullets = [];
                if (row['Warning']) bullets.push({ type: 'warning', text: row['Warning'] });
                if (row['Note']) bullets.push({ type: 'note', text: row['Note'] });

                return {
                    id: generateId(),
                    title: row['Title'] || row['Step'] || tt('manual.untitledStep', 'Untitled Step'),
                    media: null,
                    instructions: instructions ? `<p>${instructions}</p>` : '',
                    bullets: bullets
                };
            });

            if (await showConfirm(t('manual.alerts.confirmAppendExcelSteps', { count: newSteps.length }))) {
                setGuide(prev => ({
                    ...prev,
                    steps: ensureUniqueStepIds([...prev.steps, ...newSteps])
                }));
                if (newSteps.length > 0) setActiveStepId(newSteps[0].id);
            }

        } catch (error) {
            console.error('Excel Import Error:', error);
            await showAlert('Import Error', t('manual.alerts.excelImportFailed', { message: error.message }));
        }
    };

    const handleImportWord = async (file) => {
        if (!file) return;

        try {
            const mammoth = await import('mammoth');
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.default.convertToHtml({ arrayBuffer: arrayBuffer });
            const html = result.value;

            // Simple parsing: split by Header tags (h1, h2, etc) if possible
            // But mammoth returns flat HTML.
            // Let's assume h1/h2 are step titles.

            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const elements = Array.from(doc.body.children);

            const newSteps = [];
            let currentStep = null;

            elements.forEach(el => {
                const tagName = el.tagName.toLowerCase();
                if (['h1', 'h2', 'h3'].includes(tagName)) {
                    // New Step
                    if (currentStep) newSteps.push(currentStep);
                    currentStep = {
                        id: generateId(),
                        title: el.innerText,
                        media: null,
                        instructions: '',
                        bullets: []
                    };
                } else {
                    if (currentStep) {
                        currentStep.instructions += el.outerHTML;
                    } else if (newSteps.length === 0 && el.innerText.trim()) {
                        // Content before first header? treat as Summary or start first step
                        // Let's create a "Introduction" step
                        currentStep = {
                            id: generateId(),
                            title: 'Introduction',
                            media: null,
                            instructions: el.outerHTML,
                            bullets: []
                        };
                    }
                }
            });
            if (currentStep) newSteps.push(currentStep);

            if (newSteps.length > 0) {
                if (await showConfirm(t('manual.alerts.confirmAppendWordSteps', { count: newSteps.length }))) {
                    setGuide(prev => ({
                        ...prev,
                        steps: ensureUniqueStepIds([...prev.steps, ...newSteps])
                    }));
                    if (newSteps.length > 0) setActiveStepId(newSteps[0].id);
                }
            } else {
                await showAlert('Info', t('manual.alerts.noStepsInWord'));
            }

        } catch (error) {
            console.error('Word Import Error:', error);
            await showAlert('Import Error', t('manual.alerts.wordImportFailed', { message: error.message }));
        }
    };

    const getStepDataCaptureFields = (step) => {
        if (Array.isArray(step?.questions) && step.questions.length > 0) return step.questions;
        return [];
    };

    const getStepCanvasElements = (step) => {
        return Array.isArray(step?.canvasData) ? step.canvasData : [];
    };

    const activeStep = guide.steps.find(s => s.id === activeStepId);
    const operatorCurrentStep = guide.steps[operatorStepIndex] || null;
    const operatorCanvasElements = getStepCanvasElements(operatorCurrentStep);
    const operatorHasCanvasVisual = operatorCanvasElements.length > 0;
    const operatorHasPrimaryVisual = !!(
        operatorCurrentStep?.media?.type === 'video'
        || operatorCurrentStep?.media?.type === 'youtube'
        || (operatorCurrentStep?.images?.length > 0)
        || operatorCurrentStep?.media?.url
    );
    const operatorStepDataFields = getStepDataCaptureFields(operatorCurrentStep);
    const guideReferenceLinks = useMemo(() => extractReferenceLinks(guide.documentNumber), [guide.documentNumber]);
    const operatorStepAnswerMap = operatorCurrentStep
        ? (operatorDataCaptureAnswers?.[operatorCurrentStep.id] || {})
        : {};
    const operatorCompletedCount = guide.steps.reduce((acc, step) => acc + (operatorChecks[step.id]?.completed ? 1 : 0), 0);
    const operatorTotalSteps = guide.steps.length;
    const operatorProgress = operatorTotalSteps > 0 ? Math.round((operatorCompletedCount / operatorTotalSteps) * 100) : 0;
    const assignments = guide.assignments || [];
    const totalAssignments = assignments.length;
    const completedAssignments = assignments.filter(a => a.status === 'Done').length;
    const overdueAssignments = assignments.filter(a => a.dueAt && new Date(a.dueAt) < new Date() && a.status !== 'Done').length;
    const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
    const firstPassCompliance = totalAssignments > 0 ? Math.round((assignments.filter(a => a.signedOffBy && a.status === 'Done').length / totalAssignments) * 100) : 0;
    const completedWithTime = assignments.filter(a => a.startedAt && a.completedAt);
    const avgCompletionHours = completedWithTime.length > 0
        ? (completedWithTime.reduce((sum, a) => sum + ((new Date(a.completedAt) - new Date(a.startedAt)) / 3600000), 0) / completedWithTime.length).toFixed(1)
        : '0.0';
    const currentVersion = guide.version || '1.0';
    const currentVersionAcks = (guide.readAcks || []).filter(a => a.version === currentVersion);
    const readAckRate = USER_ROLES.length > 0 ? Math.min(100, Math.round((currentVersionAcks.length / USER_ROLES.length) * 100)) : 0;
    const openCapaCount = (guide.issueReports || []).filter(i => i.status !== 'Closed').length;
    const closedCapaCount = (guide.issueReports || []).filter(i => i.status === 'Closed').length;

    const setOperatorDataCaptureValue = (stepId, questionId, value) => {
        setOperatorDataCaptureAnswers(prev => ({
            ...prev,
            [stepId]: {
                ...(prev[stepId] || {}),
                [questionId]: value
            }
        }));
    };

    const toggleOperatorCheckboxValue = (stepId, questionId, optionValue) => {
        const stepAnswer = operatorDataCaptureAnswers[stepId] || {};
        const existing = Array.isArray(stepAnswer[questionId]) ? stepAnswer[questionId] : [];
        const next = existing.includes(optionValue)
            ? existing.filter(v => v !== optionValue)
            : [...existing, optionValue];
        setOperatorDataCaptureValue(stepId, questionId, next);
    };

    const manualThemes = {
        dark: {
            appBg: '#0a0a0c',
            text: '#f8fafc',
            mutedText: 'rgba(255,255,255,0.6)',
            panelBg: 'rgba(255, 255, 255, 0.03)',
            panelBorder: 'rgba(255, 255, 255, 0.08)',
            topBarBg: 'rgba(15, 15, 20, 0.95)',
            divider: 'rgba(255,255,255,0.1)',
            inputBg: 'rgba(255, 255, 255, 0.05)',
            inputText: '#ffffff',
            accent: '#3b82f6',
            accentGradient: 'linear-gradient(135deg, #2563eb, #3b82f6)',
            sectionBg: 'rgba(255, 255, 255, 0.02)',
            sectionBorder: 'rgba(255, 255, 255, 0.08)',
            faintBg: 'rgba(255, 255, 255, 0.03)',
            faintBorder: 'rgba(255, 255, 255, 0.05)',
            hoverBg: 'rgba(255, 255, 255, 0.06)',
            progressTrack: 'rgba(255,255,255,0.08)',
            shadowColor: 'rgba(0, 0, 0, 0.37)',
            inactiveText: 'rgba(255,255,255,0.4)',
            subtleText: 'rgba(255,255,255,0.55)',
            veryMutedText: 'rgba(255,255,255,0.3)',
            inputBorder: 'rgba(255,255,255,0.12)',
            inputDarkBg: 'rgba(0, 0, 0, 0.3)'
        },
        light: {
            appBg: '#eef3fb',
            text: '#0f172a',
            mutedText: '#475569',
            panelBg: '#ffffff',
            panelBorder: 'rgba(15, 23, 42, 0.12)',
            topBarBg: 'rgba(248, 251, 255, 0.96)',
            divider: 'rgba(15, 23, 42, 0.12)',
            inputBg: '#ffffff',
            inputText: '#0f172a',
            accent: '#2563eb',
            accentGradient: 'linear-gradient(135deg, #60a5fa, #2563eb)',
            sectionBg: '#ffffff',
            sectionBorder: 'rgba(15, 23, 42, 0.1)',
            faintBg: 'rgba(15, 23, 42, 0.03)',
            faintBorder: 'rgba(15, 23, 42, 0.08)',
            hoverBg: 'rgba(15, 23, 42, 0.06)',
            progressTrack: 'rgba(15, 23, 42, 0.08)',
            shadowColor: 'rgba(15, 23, 42, 0.08)',
            inactiveText: '#64748b',
            subtleText: '#64748b',
            veryMutedText: '#94a3b8',
            inputBorder: 'rgba(15, 23, 42, 0.15)',
            inputDarkBg: '#f1f5f9'
        },
        colorful: {
            appBg: 'radial-gradient(circle at 15% 15%, #1d4ed8 0%, #0f172a 35%, #1e1b4b 100%)',
            text: '#f8fafc',
            mutedText: 'rgba(226,232,240,0.78)',
            panelBg: 'linear-gradient(145deg, rgba(30,41,59,0.75), rgba(76,29,149,0.55))',
            panelBorder: 'rgba(96, 165, 250, 0.35)',
            topBarBg: 'linear-gradient(90deg, rgba(15,23,42,0.96), rgba(30,58,138,0.92), rgba(76,29,149,0.9))',
            divider: 'rgba(147,197,253,0.35)',
            inputBg: 'rgba(15,23,42,0.55)',
            inputText: '#e2e8f0',
            accent: '#22d3ee',
            accentGradient: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
            sectionBg: 'rgba(255, 255, 255, 0.02)',
            sectionBorder: 'rgba(255, 255, 255, 0.08)',
            faintBg: 'rgba(255, 255, 255, 0.03)',
            faintBorder: 'rgba(255, 255, 255, 0.05)',
            hoverBg: 'rgba(255, 255, 255, 0.06)',
            progressTrack: 'rgba(255,255,255,0.08)',
            shadowColor: 'rgba(0, 0, 0, 0.37)',
            inactiveText: 'rgba(255,255,255,0.4)',
            subtleText: 'rgba(255,255,255,0.55)',
            veryMutedText: 'rgba(255,255,255,0.3)',
            inputBorder: 'rgba(255,255,255,0.12)',
            inputDarkBg: 'rgba(0, 0, 0, 0.3)'
        }
    };

    const theme = manualThemes[uiTheme] || manualThemes.dark;

    return (
        <div
            className={`manual-creation-root manual-theme-${uiTheme}`}
            style={{
                '--mc-bg': theme.appBg,
                '--mc-text': theme.text,
                '--mc-muted-text': theme.mutedText,
                '--mc-panel-bg': theme.panelBg,
                '--mc-panel-border': theme.panelBorder,
                '--mc-topbar-bg': theme.topBarBg,
                '--mc-divider': theme.divider,
                '--mc-input-bg': theme.inputBg,
                '--mc-input-text': theme.inputText,
                '--mc-accent': theme.accent,
                '--mc-accent-gradient': theme.accentGradient,
                '--mc-section-bg': theme.sectionBg,
                '--mc-section-border': theme.sectionBorder,
                '--mc-faint-bg': theme.faintBg,
                '--mc-faint-border': theme.faintBorder,
                '--mc-hover-bg': theme.hoverBg,
                '--mc-progress-track': theme.progressTrack,
                '--mc-shadow-color': theme.shadowColor,
                '--mc-inactive-text': theme.inactiveText,
                '--mc-subtle-text': theme.subtleText,
                '--mc-very-muted-text': theme.veryMutedText,
                '--mc-input-border': theme.inputBorder,
                '--mc-input-dark-bg': theme.inputDarkBg,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: 'var(--mc-bg)',
                color: 'var(--mc-text)',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}
        >
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes pulseSync {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.2); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
                .pulse-sync {
                    animation: pulseSync 2s ease-in-out infinite;
                }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
                .glass-panel {
                    background: var(--mc-panel-bg);
                    backdrop-filter: blur(12px);
                    border: 1px solid var(--mc-panel-border);
                    border-radius: 12px;
                }
                .btn-pro {
                    display: flex;
                    alignItems: center;
                    gap: 8px;
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: 1px solid var(--mc-panel-border);
                    color: var(--mc-text);
                }
                .btn-pro:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border-color: var(--mc-accent);
                }
                .btn-pro:active { transform: translateY(0); }
                .pro-select {
                    background: var(--mc-input-bg);
                    color: var(--mc-input-text);
                    border: 1px solid var(--mc-panel-border);
                    border-radius: 12px;
                    padding: 8px 14px;
                    font-size: 0.85rem;
                    outline: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .pro-select:hover {
                    filter: brightness(1.05);
                    border-color: var(--mc-accent);
                }
                .pro-select:focus {
                    border-color: var(--mc-accent);
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                .btn-icon-label {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 38px;
                    height: 38px;
                    padding: 0;
                    border-radius: 10px;
                    background: var(--mc-input-bg);
                    border: 1px solid var(--mc-panel-border);
                    color: var(--mc-muted-text);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon-label:hover {
                    filter: brightness(1.08);
                    color: var(--mc-text);
                    border-color: var(--mc-accent);
                }

                /* ===== LIGHT MODE COMPREHENSIVE OVERRIDES ===== */
                .manual-theme-light {
                    color: #0f172a;
                }
                .manual-theme-light .glass-panel {
                    background: #ffffff !important;
                    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06), 0 6px 20px rgba(15, 23, 42, 0.06) !important;
                    border-color: rgba(15, 23, 42, 0.1) !important;
                }
                .manual-theme-light .btn-icon-label,
                .manual-theme-light .btn-pro,
                .manual-theme-light .pro-select {
                    color: #1e293b !important;
                }
                .manual-theme-light .pro-select option {
                    color: #0f172a;
                    background: #ffffff;
                }

                /* --- Text color overrides for inline styles --- */
                .manual-theme-light [style*="color: #fff"],
                .manual-theme-light [style*="color:#fff"],
                .manual-theme-light [style*="color: white"] {
                    color: #0f172a !important;
                }
                .manual-theme-light [style*="color: rgba(255,255,255"],
                .manual-theme-light [style*="color: rgba(255, 255, 255"] {
                    color: #475569 !important;
                }

                /* --- Border overrides for inline styles --- */
                .manual-theme-light [style*="border: 1px solid rgba(255, 255, 255"],
                .manual-theme-light [style*="border: 1px solid rgba(255,255,255"] {
                    border-color: rgba(15, 23, 42, 0.12) !important;
                }
                .manual-theme-light [style*="border-bottom: 1px solid rgba(255, 255, 255"],
                .manual-theme-light [style*="border-bottom: 1px solid rgba(255,255,255"] {
                    border-bottom-color: rgba(15, 23, 42, 0.12) !important;
                }
                .manual-theme-light [style*="borderBottom: 1px solid rgba(255,255,255"],
                .manual-theme-light [style*="borderBottom: 1px solid rgba(255, 255, 255"] {
                    border-bottom-color: rgba(15, 23, 42, 0.12) !important;
                }
                .manual-theme-light [style*="border-left: 1px solid rgba(255,255,255"],
                .manual-theme-light [style*="borderLeft: 1px solid rgba(255,255,255"] {
                    border-left-color: rgba(15, 23, 42, 0.12) !important;
                }
                .manual-theme-light [style*="border: 2px dashed rgba(255,255,255"] {
                    border-color: rgba(15, 23, 42, 0.12) !important;
                }

                /* --- Background overrides for inline styles --- */
                .manual-theme-light [style*="background: rgba(255,255,255,0.0"],
                .manual-theme-light [style*="background: rgba(255, 255, 255, 0.0"],
                .manual-theme-light [style*="backgroundColor: rgba(255,255,255,0.0"],
                .manual-theme-light [style*="backgroundColor: rgba(255, 255, 255, 0.0"] {
                    background: rgba(15, 23, 42, 0.03) !important;
                }
                .manual-theme-light [style*="background-color: rgba(255,255,255,0.0"],
                .manual-theme-light [style*="background-color: rgba(255, 255, 255, 0.0"] {
                    background-color: rgba(15, 23, 42, 0.03) !important;
                }
                .manual-theme-light [style*="background: rgba(255, 255, 255, 0.05)"],
                .manual-theme-light [style*="background: rgba(255,255,255,0.05)"],
                .manual-theme-light [style*="backgroundColor: rgba(255,255,255,0.05)"],
                .manual-theme-light [style*="backgroundColor: rgba(255, 255, 255, 0.05)"],
                .manual-theme-light [style*="background-color: rgba(255,255,255,0.05)"],
                .manual-theme-light [style*="background-color: rgba(255, 255, 255, 0.05)"] {
                    background: #f8fafc !important;
                    background-color: #f8fafc !important;
                }
                .manual-theme-light [style*="background: rgba(255, 255, 255, 0.06)"],
                .manual-theme-light [style*="background: rgba(255,255,255,0.06)"],
                .manual-theme-light [style*="background: rgba(255, 255, 255, 0.08)"],
                .manual-theme-light [style*="background: rgba(255,255,255,0.08)"],
                .manual-theme-light [style*="backgroundColor: rgba(255,255,255,0.06)"],
                .manual-theme-light [style*="backgroundColor: rgba(255, 255, 255, 0.06)"],
                .manual-theme-light [style*="backgroundColor: rgba(255,255,255,0.08)"],
                .manual-theme-light [style*="backgroundColor: rgba(255, 255, 255, 0.08)"] {
                    background: rgba(15, 23, 42, 0.04) !important;
                    background-color: rgba(15, 23, 42, 0.04) !important;
                }
                .manual-theme-light [style*="background: rgba(0,0,0,0.2)"],
                .manual-theme-light [style*="background: rgba(0, 0, 0, 0.2)"],
                .manual-theme-light [style*="backgroundColor: rgba(0,0,0,0.2)"],
                .manual-theme-light [style*="backgroundColor: rgba(0, 0, 0, 0.2)"],
                .manual-theme-light [style*="background-color: rgba(0,0,0,0.2)"],
                .manual-theme-light [style*="background-color: rgba(0, 0, 0, 0.2)"] {
                    background: #f1f5f9 !important;
                    background-color: #f1f5f9 !important;
                }
                .manual-theme-light [style*="background: rgba(0, 0, 0, 0.15)"],
                .manual-theme-light [style*="background: rgba(0,0,0,0.15)"],
                .manual-theme-light [style*="backgroundColor: rgba(0,0,0,0.15)"],
                .manual-theme-light [style*="backgroundColor: rgba(0, 0, 0, 0.15)"] {
                    background: #f8fafc !important;
                    background-color: #f8fafc !important;
                }
                .manual-theme-light [style*="background: rgba(15,23,42,0.45)"],
                .manual-theme-light [style*="background: rgba(15, 23, 42, 0.45)"],
                .manual-theme-light [style*="backgroundColor: rgba(15,23,42,0.45)"],
                .manual-theme-light [style*="backgroundColor: rgba(15, 23, 42, 0.45)"] {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                }
                .manual-theme-light [style*="background: #000"],
                .manual-theme-light [style*="backgroundColor: #000"] {
                    background: #f1f5f9 !important;
                    background-color: #f1f5f9 !important;
                }

                /* --- Input fields in light mode --- */
                .manual-theme-light input,
                .manual-theme-light textarea,
                .manual-theme-light select {
                    background-color: #ffffff !important;
                    color: #0f172a !important;
                    border-color: rgba(15, 23, 42, 0.15) !important;
                }
                .manual-theme-light input::placeholder,
                .manual-theme-light textarea::placeholder {
                    color: #94a3b8 !important;
                }
                .manual-theme-light input:focus,
                .manual-theme-light textarea:focus,
                .manual-theme-light select:focus {
                    border-color: #2563eb !important;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1) !important;
                }

                /* --- Shadow overrides --- */
                .manual-theme-light [style*="box-shadow: 0 8px 32px"],
                .manual-theme-light [style*="boxShadow: 0 8px 32px"],
                .manual-theme-light [style*="box-shadow: 0 25px 50px"],
                .manual-theme-light [style*="boxShadow: 0 25px 50px"],
                .manual-theme-light [style*="box-shadow: 0 30px 60px"],
                .manual-theme-light [style*="boxShadow: 0 30px 60px"],
                .manual-theme-light [style*="box-shadow: 0 20px 40px"],
                .manual-theme-light [style*="boxShadow: 0 20px 40px"],
                .manual-theme-light [style*="box-shadow: 0 10px 30px"],
                .manual-theme-light [style*="boxShadow: 0 10px 30px"] {
                    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08) !important;
                }
                .manual-theme-light [style*="box-shadow: inset"],
                .manual-theme-light [style*="boxShadow: inset"] {
                    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06) !important;
                }

                /* --- Gradient divider lines --- */
                .manual-theme-light [style*="background: linear-gradient(90deg, transparent, rgba(255,255,255"],
                .manual-theme-light [style*="background: linear-gradient(90deg, transparent, rgba(255, 255, 255"] {
                    background: linear-gradient(90deg, transparent, rgba(15, 23, 42, 0.1), transparent) !important;
                }

                /* --- Progress bar track --- */
                .manual-theme-light [style*="backgroundColor: rgba(255,255,255,0.08)"][style*="border-radius: 999px"],
                .manual-theme-light [style*="backgroundColor: rgba(255, 255, 255, 0.08)"][style*="border-radius: 999px"] {
                    background-color: rgba(15, 23, 42, 0.08) !important;
                }

                /* --- Backdrop / dialog overlay fix --- */
                .manual-theme-light [style*="backgroundColor: rgba(0,0,0,0.6)"],
                .manual-theme-light [style*="backgroundColor: rgba(0, 0, 0, 0.6)"] {
                    background-color: rgba(15, 23, 42, 0.4) !important;
                }

                /* --- Labels and section headers --- */
                .manual-theme-light h1, .manual-theme-light h2,
                .manual-theme-light h3, .manual-theme-light h4 {
                    color: #0f172a !important;
                }

                /* --- Role selector in top bar --- */
                .manual-theme-light [style*="background: rgba(255,255,255,0.05)"][style*="border-radius: 8px"],
                .manual-theme-light [style*="background: rgba(255, 255, 255, 0.05)"][style*="border-radius: 8px"] {
                    background: rgba(15, 23, 42, 0.05) !important;
                    border-color: rgba(15, 23, 42, 0.12) !important;
                }

                /* --- Operator mode buttons --- */
                .manual-theme-light .btn-pro[style*="color: #fff"] {
                    color: #1e293b !important;
                }
                .manual-theme-light .btn-pro[style*="backgroundColor: rgba(255,255,255,0.06)"],
                .manual-theme-light .btn-pro[style*="backgroundColor: rgba(255, 255, 255, 0.06)"] {
                    background-color: rgba(15, 23, 42, 0.06) !important;
                    color: #1e293b !important;
                }

                /* --- Scrollbar for light mode --- */
                .manual-theme-light ::-webkit-scrollbar-thumb {
                    background: rgba(15, 23, 42, 0.15);
                }
                .manual-theme-light ::-webkit-scrollbar-thumb:hover {
                    background: #2563eb;
                }

                /* --- AI panel sidebar --- */
                .manual-theme-light [style*="backgroundColor: rgba(15, 23, 42, 0.95)"],
                .manual-theme-light [style*="backgroundColor: rgba(15,23,42,0.95)"] {
                    background-color: #ffffff !important;
                    border-left-color: rgba(15, 23, 42, 0.1) !important;
                }

                /* --- Bullet dots in light mode --- */
                .manual-theme-light [style*="backgroundColor: #fff"][style*="border-radius: 50%"][style*="width: 8px"] {
                    background-color: #334155 !important;
                }

                /* --- Step number in preview --- */
                .manual-theme-light span[style*="color: rgba(255, 255, 255, 0.2)"],
                .manual-theme-light span[style*="color: rgba(255,255,255,0.2)"] {
                    color: rgba(15, 23, 42, 0.2) !important;
                }

                /* Dozuki Specific Styles */
                .dozuki-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #475569;
                }
                .manual-theme-light .dozuki-step-card {
                    display: grid;
                    grid-template-columns: minmax(300px, 1fr) 400px;
                    gap: 40px;
                    padding: 40px 0;
                    border-bottom: 1px solid #f1f5f9;
                }
                @media (max-width: 900px) {
                    .manual-theme-light .dozuki-step-card {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                }
                .dozuki-flag {
                    display: flex;
                    gap: 16px;
                    padding: 16px 20px;
                    border-left: 5px solid;
                    margin: 16px 0;
                    font-size: 0.9rem;
                    border-radius: 4px 12px 12px 4px;
                    align-items: flex-start;
                }
                .flag-note { background: #f0f7ff; border-left-color: #007bff; color: #004085; }
                .flag-caution { background: #fffcf0; border-left-color: #ffc107; color: #856404; }
                .flag-warning { background: #fff5f5; border-left-color: #dc3545; color: #721c24; }
                
                .dozuki-icon-container {
                    flex-shrink: 0;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .dozuki-prerequisites-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                }
                .manual-theme-light .dozuki-prerequisites-card {
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 24px;
                }
            `}</style>
            {/* Top Bar - Compact & Icon Focused */}
            <div style={{
                height: '56px',
                borderBottom: '1px solid var(--mc-panel-border)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                background: 'var(--mc-topbar-bg)',
                backdropFilter: 'blur(10px)',
                zIndex: 100,
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '32px', height: '32px',
                        background: 'var(--mc-accent-gradient)',
                        borderRadius: '8px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Book size={18} />
                    </div>
                </div>

                <div style={{ height: '24px', width: '1px', background: 'var(--mc-divider)' }} />

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        onClick={handleRenameGuideTitle}
                        style={{
                            fontSize: '0.9rem', fontWeight: 700, color: 'var(--mc-text)',
                            maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', cursor: 'pointer', transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        title="Klik untuk mengubah nama / Click to rename"
                    >
                        {guide.title || 'Untitled Manual'}
                    </div>
                    {/* Sync Status Indicator */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: syncStatus === 'saved' ? '#10b981' : syncStatus === 'error' ? '#ef4444' : 'rgba(255,255,255,0.25)',
                        marginLeft: '8px', padding: '2px 8px', borderRadius: '99px',
                        background: syncStatus === 'syncing' ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                        transition: 'all 0.3s'
                    }}>
                        {syncStatus === 'syncing' ? 'Syncing' : syncStatus === 'saved' ? 'Saved' : syncStatus === 'error' ? 'Offline' : 'Ready'}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    {isSavingManual && (
                        <div style={{
                            minWidth: '160px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: '4px',
                            marginRight: '8px'
                        }}>
                            <div style={{
                                height: '5px',
                                borderRadius: '999px',
                                backgroundColor: 'rgba(255,255,255,0.14)',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.max(0, Math.min(100, saveProgress))}%`,
                                    background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                                    transition: 'width 0.25s ease'
                                }} />
                            </div>
                            <div style={{
                                fontSize: '0.64rem',
                                color: 'rgba(255,255,255,0.65)',
                                textAlign: 'right',
                                fontWeight: 700,
                                letterSpacing: '0.03em'
                            }}>
                                {Math.round(saveProgress)}%
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => handleSaveManual(false)}
                        className="btn-pro"
                        disabled={isSavingManual}
                        title={isSavingManual ? 'Saving...' : tt('common.save', 'Save')}
                        style={{
                            padding: '7px 12px',
                            background: syncStatus === 'saved' ? 'rgba(16,185,129,0.16)' : 'var(--mc-accent-gradient)',
                            border: 'none',
                            color: '#fff',
                            opacity: isSavingManual ? 0.7 : 1,
                            cursor: isSavingManual ? 'not-allowed' : 'pointer'
                        }}
                    >
                        <Save size={16} />
                        {isSavingManual ? 'Saving...' : tt('common.save', 'Save')}
                    </button>
                    <button onClick={handleRenameGuideTitle} className="btn-icon-label" title="Ubah Nama (Rename)">
                        <Edit3 size={18} />
                    </button>
                    <button onClick={handleLoadManualsList} className="btn-icon-label" title={tt('common.open', 'Open')}>
                        <FolderOpen size={18} />
                    </button>
                    <button onClick={() => setIsPreviewMode(!isPreviewMode)} className="btn-icon-label" title={tt('common.preview', 'Preview')} style={{ color: isPreviewMode ? '#3b82f6' : 'inherit' }}>
                        {isPreviewMode ? <Layout size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={() => setIsHistorySidebarOpen(!isHistorySidebarOpen)} className="btn-icon-label" title="Version Timeline" style={{ color: isHistorySidebarOpen ? '#3b82f6' : '#93c5fd', background: isHistorySidebarOpen ? 'rgba(59,130,246,0.1)' : '' }}>
                        <Clock size={18} />
                    </button>
                    <button onClick={() => setShowEmbedModal(true)} className="btn-icon-label" title={t('manual.embedGuide')} style={{ color: '#a78bfa' }}>
                        <Code size={18} />
                    </button>
                    <button onClick={() => setShowQRModal(true)} className="btn-icon-label" title="Quick Access QR" style={{ color: '#ec4899' }}>
                        <QrCode size={18} />
                    </button>
                    <button
                        onClick={() => setIsOperatorMode(prev => {
                            const next = !prev;
                            if (next) {
                                const hasPrep = (guide.summary || (guide.templateFields?.tools || []).length > 0 || (guide.templateFields?.parts || []).length > 0);
                                setOperatorStepIndex(hasPrep ? -1 : 0);
                            }
                            return next;
                        })}
                        className="btn-icon-label"
                        title={tt('manual.operator', 'Operator Mode')}
                        style={{ color: isOperatorMode ? '#10b981' : 'inherit', background: isOperatorMode ? 'rgba(16, 185, 129, 0.1)' : '' }}
                    >
                        <Play size={18} />
                    </button>
                </div>

                <div style={{ height: '24px', width: '1px', background: 'var(--mc-divider)', margin: '0 8px' }} />

                {/* Draft/Published Toggle - Modern Interactive Approach */}
                <div style={{
                    display: 'flex', background: 'rgba(0,0,0,0.2)',
                    borderRadius: '10px', padding: '2px', border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    {['DRAFT', 'REVIEW', 'PUBLISHED'].map(status => (
                        <button
                            key={status}
                            onClick={() => handleWorkflowStatusChange(status)}
                            style={{
                                padding: '4px 14px', borderRadius: '8px',
                                border: 'none', fontSize: '0.7rem', fontWeight: 800,
                                cursor: 'pointer',
                                background: normalizeWorkflowStatus(guide.workflow?.status || guide.status) === status
                                    ? (status === 'PUBLISHED' ? '#10b981' : status === 'REVIEW' ? '#f59e0b' : '#3b82f6')
                                    : 'transparent',
                                color: normalizeWorkflowStatus(guide.workflow?.status || guide.status) === status ? '#fff' : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                {/* Tabs - The Landscape Optimizer */}
                <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
                    {[
                        { id: 'intro', label: 'Intro', icon: BookOpen },
                        { id: 'info', label: 'Details', icon: Info },
                        { id: 'edit', label: 'Steps', icon: List },
                        { id: 'management', label: 'Compliance', icon: Shield },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '6px 16px',
                                borderRadius: '8px',
                                border: 'none',
                                background: activeTab === tab.id
                                    ? (uiTheme === 'light' ? 'rgba(37, 99, 235, 0.14)' : 'rgba(37, 99, 235, 0.15)')
                                    : 'transparent',
                                color: activeTab === tab.id
                                    ? (uiTheme === 'light' ? '#1d4ed8' : '#60a5fa')
                                    : (uiTheme === 'light' ? '#475569' : 'rgba(255,255,255,0.5)'),
                                fontSize: '0.85rem',
                                fontWeight: activeTab === tab.id ? '700' : '500',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            <tab.icon size={14} />
                            <span className="hide-on-small">{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div style={{ height: '24px', width: '1px', background: 'var(--mc-divider)' }} />

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={uiTheme}
                            onChange={(e) => setUiTheme(e.target.value)}
                            className="pro-select"
                            style={{
                                fontSize: '0.75rem',
                                padding: '4px',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                color: 'transparent',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--mc-panel-border)',
                                cursor: 'pointer',
                                appearance: 'none',
                                borderRadius: '8px'
                            }}
                            title="Switch Theme"
                        >
                            <option value="dark" style={{ color: '#1e293b', background: 'white' }}>Dark Mode</option>
                            <option value="light" style={{ color: '#1e293b', background: 'white' }}>Light Mode</option>
                            <option value="colorful" style={{ color: '#1e293b', background: 'white' }}>Colorful</option>
                        </select>
                        {uiTheme === 'light' ? (
                            <Sun size={14} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.8 }} />
                        ) : uiTheme === 'colorful' ? (
                            <Palette size={14} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.8 }} />
                        ) : (
                            <Moon size={14} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.8 }} />
                        )}
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={normalizeWorkflowStatus(guide.workflow?.status || guide.status || 'DRAFT')}
                            onChange={(e) => handleWorkflowStatusChange(e.target.value)}
                            className="pro-select"
                            style={{
                                fontSize: '0.75rem',
                                padding: '4px',
                                minWidth: '32px',
                                width: '32px',
                                height: '32px',
                                color: 'transparent',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--mc-panel-border)',
                                cursor: 'pointer',
                                appearance: 'none',
                                borderRadius: '8px'
                            }}
                            title="Change Workflow Status"
                        >
                            {WORKFLOW_STATUSES.map((statusItem) => (
                                <option key={statusItem} value={statusItem} style={{ color: '#1e293b', background: 'white' }}>
                                    {getWorkflowStatusLabel(statusItem)}
                                </option>
                            ))}
                        </select>
                        <Activity size={14} style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', pointerEvents: 'none', opacity: 0.8 }} />
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            onChange={(e) => {
                                const format = e.target.value;
                                if (format === 'pdf') exportToPDF();
                                else if (format === 'word') exportToWord();
                                else if (format === 'pptx') exportToPowerPoint();
                                e.target.value = '';
                            }}
                            className="pro-select"
                            defaultValue=""
                            style={{
                                fontSize: '0.75rem',
                                padding: '4px 28px 4px 10px',
                                minWidth: '42px',
                                width: '42px',
                                height: '32px',
                                color: 'transparent',
                                background: 'var(--mc-accent-gradient)',
                                border: 'none',
                                cursor: 'pointer',
                                appearance: 'none',
                                borderRadius: '8px',
                                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)'
                            }}
                            title="Export Guide (PDF, PPTX, Word)"
                        >
                            <option value="" disabled></option>
                            <option value="pdf" style={{ color: '#1e293b', background: 'white' }}>PDF Document</option>
                            <option value="pptx" style={{ color: '#1e293b', background: 'white' }}>PowerPoint Presentation</option>
                            <option value="word" style={{ color: '#1e293b', background: 'white' }}>Word Document</option>
                        </select>
                        <FileDown size={16} style={{
                            position: 'absolute',
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            pointerEvents: 'none',
                            color: 'white'
                        }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>
                            {currentUserName.charAt(0)}
                        </div>
                        <select
                            value={currentUserRole}
                            onChange={(e) => setManualRoleOverride(e.target.value)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--mc-text)', fontSize: '0.7rem', outline: 'none', cursor: 'pointer' }}
                        >
                            {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                        </select>
                    </div>

                    <HelpButton
                        title={helpContent['manual-creation'].title}
                        content={helpContent['manual-creation'].content}
                    />
                </div>
            </div>

            {/* Main Content Area */}
            {selectedProject ? (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                    {/* Left: Steps Editor / Preview */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: isOperatorMode ? '0' : '20px' }}>
                        {isOperatorMode ? (
                            <div style={{
                                padding: '20px',
                                maxWidth: 'none',
                                margin: 0,
                                width: '100%',
                                minHeight: '100%',
                                animation: 'fadeIn 0.4s ease'
                            }}>
                                <div className="glass-panel" style={{ padding: '24px', marginBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Operator Execution Mode</h3>
                                            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', marginTop: '4px' }}>
                                                {tt('manual.completion', 'Completion')}: {operatorCompletedCount}/{operatorTotalSteps} {tt('manual.steps', 'steps')}
                                            </div>
                                        </div>
                                        <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '1.1rem' }}>{operatorProgress}%</div>
                                    </div>

                                    <div style={{ height: '8px', borderRadius: '999px', backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                                        <div style={{ width: `${operatorProgress}%`, height: '100%', background: 'linear-gradient(90deg, #16a34a, #22c55e)' }} />
                                    </div>

                                    {guideReferenceLinks.length > 0 && (
                                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => window.open(guideReferenceLinks[0].url, '_blank', 'noopener,noreferrer')}
                                                className="btn-pro"
                                                style={{
                                                    backgroundColor: 'rgba(59,130,246,0.15)',
                                                    color: '#93c5fd',
                                                    borderColor: 'rgba(59,130,246,0.35)',
                                                    fontSize: '0.78rem'
                                                }}
                                            >
                                                <ExternalLink size={14} /> Open Reference
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {operatorCurrentStep ? (
                                    <div className="glass-panel" style={{ padding: '28px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                                                Step {operatorStepIndex + 1}: {operatorCurrentStep.title}
                                            </h2>
                                            <button
                                                onClick={() => handleOperatorToggleCheck(operatorCurrentStep.id)}
                                                className="btn-pro"
                                                style={{
                                                    backgroundColor: operatorChecks[operatorCurrentStep.id]?.completed ? 'rgba(16,185,129,0.22)' : 'rgba(255,255,255,0.06)',
                                                    color: operatorChecks[operatorCurrentStep.id]?.completed ? '#6ee7b7' : '#fff',
                                                    borderColor: operatorChecks[operatorCurrentStep.id]?.completed ? 'rgba(16,185,129,0.35)' : 'rgba(255,255,255,0.12)'
                                                }}
                                            >
                                                <CheckCircle size={16} />
                                                {operatorChecks[operatorCurrentStep.id]?.completed ? tt('manual.completed', 'Completed') : tt('manual.markComplete', 'Mark Complete')}
                                            </button>
                                        </div>

                                        <div style={{ marginBottom: '12px' }}>
                                            <button
                                                onClick={() => handleReportIssue(operatorCurrentStep.id)}
                                                className="btn-pro"
                                                style={{
                                                    backgroundColor: 'rgba(239,68,68,0.14)',
                                                    color: '#fca5a5',
                                                    borderColor: 'rgba(239,68,68,0.35)'
                                                }}
                                            >
                                                <Shield size={15} /> Report Issue
                                            </button>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: operatorHasPrimaryVisual ? '1.2fr 1fr' : '1fr', gap: '32px', marginBottom: '24px' }}>
                                            {/* Left: Images */}
                                            {operatorHasPrimaryVisual && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    <div style={{ position: 'relative', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#000', aspectRatio: '4/3' }}>
                                                        {(!operatorCurrentStep.media?.type || operatorCurrentStep.media?.type === 'image') && (
                                                            <img
                                                                src={operatorCurrentStep.images?.[operatorChecks[operatorCurrentStep.id]?.activeImageIndex || 0] || operatorCurrentStep.media?.url}
                                                                alt={operatorCurrentStep.title}
                                                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                            />
                                                        )}
                                                        {operatorCurrentStep.media?.type === 'video' && videoSrc && (
                                                            <video
                                                                src={`${videoSrc}#t=${operatorCurrentStep.startTime || 0}${operatorCurrentStep.duration ? ',' + (Math.round(((operatorCurrentStep.startTime || 0) + operatorCurrentStep.duration) * 10) / 10) : ''}`}
                                                                controls
                                                                style={{ width: '100%', height: '100%', display: 'block' }}
                                                            />
                                                        )}
                                                        {operatorCurrentStep.media?.type === 'youtube' && (operatorCurrentStep.media.youtubeUrl || operatorCurrentStep.media.url) && (
                                                            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', height: '100%' }}>
                                                                <iframe
                                                                    src={getYouTubeEmbedUrl(operatorCurrentStep.media.youtubeUrl || operatorCurrentStep.media.url) || ''}
                                                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                                                    allowFullScreen
                                                                />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Thumbnails */}
                                                    {operatorCurrentStep.images?.length > 1 && (
                                                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                            {operatorCurrentStep.images.map((img, idx) => (
                                                                <img
                                                                    key={idx}
                                                                    src={img}
                                                                    onClick={() => setOperatorChecks(prev => ({
                                                                        ...prev,
                                                                        [operatorCurrentStep.id]: {
                                                                            ...(prev[operatorCurrentStep.id] || {}),
                                                                            activeImageIndex: idx
                                                                        }
                                                                    }))}
                                                                    style={{
                                                                        width: '80px',
                                                                        height: '60px',
                                                                        objectFit: 'cover',
                                                                        borderRadius: '4px',
                                                                        border: (operatorChecks[operatorCurrentStep.id]?.activeImageIndex || 0) === idx ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Right: Text Content */}
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                {operatorHasCanvasVisual && (
                                                    <div style={{
                                                        borderRadius: '12px',
                                                        border: '1px solid rgba(255,255,255,0.12)',
                                                        background: '#ffffff',
                                                        padding: '10px'
                                                    }}>
                                                        <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                                            <CanvasPreviewLayer
                                                                elements={operatorCanvasElements}
                                                                isInteractive={true}
                                                                answers={operatorDataCaptureAnswers?.[operatorCurrentStep.id] || {}}
                                                                onAnswerChange={setOperatorDataCaptureValue}
                                                                stepId={operatorCurrentStep.id}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {operatorCurrentStep.instructions && (
                                                    <div
                                                        style={{ lineHeight: '1.6', color: 'rgba(255,255,255,0.9)', fontSize: '1.1rem' }}
                                                        dangerouslySetInnerHTML={{ __html: operatorCurrentStep.instructions }}
                                                    />
                                                )}

                                                {operatorCurrentStep.bullets?.length > 0 && (
                                                    <div style={{ display: 'grid', gap: '10px' }}>
                                                        {operatorCurrentStep.bullets.map((b, idx) => (
                                                            <div key={`${operatorCurrentStep.id}-bullet-${idx}`} style={{
                                                                display: 'flex',
                                                                gap: '12px',
                                                                padding: '12px',
                                                                borderRadius: '10px',
                                                                backgroundColor: 'rgba(255,255,255,0.03)',
                                                                borderLeft: `4px solid ${b.type === 'warning' ? '#f59e0b' : b.type === 'caution' ? '#ef4444' : '#3b82f6'}`
                                                            }}>
                                                                <div style={{ color: b.type === 'warning' ? '#f59e0b' : b.type === 'caution' ? '#ef4444' : '#3b82f6', marginTop: '2px' }}>
                                                                    {b.type === 'caution' || b.type === 'warning' ? <Shield size={16} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fff', marginTop: '4px' }} />}
                                                                </div>
                                                                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)' }}>{b.text}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {getStepDataCaptureFields(operatorCurrentStep).length > 0 && (
                                                    <div style={{ marginTop: '8px', padding: '14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                        <div style={{ fontSize: '0.82rem', fontWeight: 700, marginBottom: 10, color: '#93c5fd' }}>
                                                            Data Capture
                                                        </div>
                                                        <div style={{ display: 'grid', gap: '10px' }}>
                                                            {getStepDataCaptureFields(operatorCurrentStep).map((q) => {
                                                                const answer = operatorDataCaptureAnswers?.[operatorCurrentStep.id]?.[q.id];
                                                                return (
                                                                    <div key={q.id}>
                                                                        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.78)', marginBottom: 5 }}>
                                                                            {q.label} {q.required ? <span style={{ color: '#fca5a5' }}>*</span> : null}
                                                                        </div>

                                                                        {(q.type === 'text' || q.type === 'number') && (
                                                                            <input
                                                                                type={q.type === 'number' ? 'number' : 'text'}
                                                                                value={answer || ''}
                                                                                onChange={(e) => setOperatorDataCaptureValue(operatorCurrentStep.id, q.id, e.target.value)}
                                                                                style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(15,23,42,0.45)', color: '#fff', padding: '8px' }}
                                                                            />
                                                                        )}

                                                                        {q.type === 'textarea' && (
                                                                            <textarea
                                                                                rows={3}
                                                                                value={answer || ''}
                                                                                onChange={(e) => setOperatorDataCaptureValue(operatorCurrentStep.id, q.id, e.target.value)}
                                                                                style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(15,23,42,0.45)', color: '#fff', padding: '8px' }}
                                                                            />
                                                                        )}

                                                                        {q.type === 'select' && (
                                                                            <select
                                                                                value={answer || ''}
                                                                                onChange={(e) => setOperatorDataCaptureValue(operatorCurrentStep.id, q.id, e.target.value)}
                                                                                style={{ width: '100%', borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(15,23,42,0.45)', color: '#fff', padding: '8px' }}
                                                                            >
                                                                                <option value="">Select option...</option>
                                                                                {(q.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                            </select>
                                                                        )}

                                                                        {q.type === 'radio' && (
                                                                            <div style={{ display: 'grid', gap: 4 }}>
                                                                                {(q.options || []).map(opt => (
                                                                                    <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`${operatorCurrentStep.id}-${q.id}`}
                                                                                            checked={answer === opt}
                                                                                            onChange={() => setOperatorDataCaptureValue(operatorCurrentStep.id, q.id, opt)}
                                                                                        />
                                                                                        {opt}
                                                                                    </label>
                                                                                ))}
                                                                            </div>
                                                                        )}

                                                                        {q.type === 'checkbox' && (
                                                                            <div style={{ display: 'grid', gap: 4 }}>
                                                                                {(q.options || []).map(opt => {
                                                                                    const selected = Array.isArray(answer) && answer.includes(opt);
                                                                                    return (
                                                                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                                                                                            <input
                                                                                                type="checkbox"
                                                                                                checked={selected}
                                                                                                onChange={() => toggleOperatorCheckboxValue(operatorCurrentStep.id, q.id, opt)}
                                                                                            />
                                                                                            {opt}
                                                                                        </label>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                                            <button
                                                onClick={handleOperatorBack}
                                                disabled={operatorStepIndex === 0}
                                                className="btn-pro"
                                                style={{
                                                    opacity: operatorStepIndex === 0 ? 0.4 : 1,
                                                    cursor: operatorStepIndex === 0 ? 'not-allowed' : 'pointer',
                                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                                    color: '#fff'
                                                }}
                                            >
                                                {tt('manual.back', 'Back')}
                                            </button>
                                            <button
                                                onClick={handleOperatorNext}
                                                className="btn-pro"
                                                style={{
                                                    backgroundColor: 'rgba(37,99,235,0.18)',
                                                    color: '#93c5fd',
                                                    borderColor: 'rgba(59,130,246,0.35)'
                                                }}
                                            >
                                                {tt('manual.next', 'Next')}
                                            </button>
                                        </div>
                                    </div>
                                ) : operatorStepIndex === -1 ? (
                                    <div className="glass-panel" style={{ padding: '32px' }}>
                                        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                                            <div style={{
                                                width: '56px', height: '56px', borderRadius: '14px',
                                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#3b82f6', margin: '0 auto 16px'
                                            }}>
                                                <Info size={28} />
                                            </div>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', margin: '0 0 8px 0' }}>Preparation Phase</h2>
                                            <p style={{ color: 'rgba(255,255,255,0.5)', margin: 0 }}>Review required tools and parts before starting the procedure.</p>
                                        </div>

                                        {guide.summary && (
                                            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px' }}>Summary</div>
                                                <div style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.8)', lineHeight: '1.5' }}>{guide.summary}</div>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                                            {(guide.templateFields?.tools || []).length > 0 && (
                                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#93c5fd', fontWeight: 700, marginBottom: '12px' }}>
                                                        <Box size={14} /> REQUIRED TOOLS
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {guide.templateFields.tools.map((t, idx) => (
                                                            <div key={idx} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>{t.name}</span>
                                                                <span style={{ opacity: 0.5 }}>x{t.qty || 1}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {(guide.templateFields?.parts || []).length > 0 && (
                                                <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#93c5fd', fontWeight: 700, marginBottom: '12px' }}>
                                                        <Activity size={14} /> REQUIRED PARTS
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                        {guide.templateFields.parts.map((p, idx) => (
                                                            <div key={idx} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between' }}>
                                                                <span>{p.name} #{p.partNo}</span>
                                                                <span style={{ opacity: 0.5 }}>x{p.qty || 1}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <button
                                                onClick={handleOperatorNext}
                                                className="btn-pro"
                                                style={{ padding: '12px 32px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '1rem' }}
                                            >
                                                Start Procedure
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
                                        {tt('manual.noOperatorSteps', 'No steps available for operator mode.')}
                                    </div>
                                )}
                            </div>
                        ) : (isOperatorMode || isPreviewMode) ? (
                            <div className={uiTheme === 'light' ? 'manual-theme-light' : ''} style={{
                                flex: 1,
                                overflowY: 'auto',
                                backgroundColor: uiTheme === 'light' ? '#fff' : 'transparent'
                            }}>
                                <div style={{
                                    padding: '60px 40px',
                                    maxWidth: '1200px',
                                    margin: '0 auto',
                                    color: uiTheme === 'light' ? '#334155' : '#fff'
                                }}>
                                    {/* Header Section */}
                                    <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                                        <h1 style={{
                                            fontSize: '3rem',
                                            fontWeight: 900,
                                            marginBottom: '24px',
                                            letterSpacing: '-0.04em',
                                            lineHeight: 1.1
                                        }}>
                                            {guide.title || 'Untitled Manual'}
                                        </h1>

                                        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
                                            <div className="dozuki-badge">
                                                <Sparkles size={14} /> {guide.difficulty || 'Moderate'}
                                            </div>
                                            <div className="dozuki-badge">
                                                <Clock size={14} /> {guide.timeRequired || '15 mins'}
                                            </div>
                                            <div className="dozuki-badge">
                                                <List size={14} /> {guide.steps.length} Steps
                                            </div>
                                            <div className="dozuki-badge" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                                                {guide.version || '1.0'}
                                            </div>
                                            {guideReferenceLinks.length > 0 && (
                                                <button
                                                    className="dozuki-badge"
                                                    onClick={() => window.open(guideReferenceLinks[0].url, '_blank', 'noopener,noreferrer')}
                                                    style={{
                                                        cursor: 'pointer',
                                                        border: '1px solid rgba(34,197,94,0.35)',
                                                        background: 'rgba(34,197,94,0.1)',
                                                        color: '#22c55e'
                                                    }}
                                                >
                                                    <ExternalLink size={14} /> Open Reference
                                                </button>
                                            )}
                                        </div>

                                        {guide.summary && (
                                            <div style={{ maxWidth: '800px', margin: '0 auto 40px', textAlign: 'center' }}>
                                                <p style={{ fontSize: '1.25rem', lineHeight: '1.6', opacity: 0.8, color: uiTheme === 'light' ? '#64748b' : 'rgba(255,255,255,0.7)' }}>
                                                    {guide.summary}
                                                </p>
                                            </div>
                                        )}

                                        {guide.id && (
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    padding: '16px',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '20px',
                                                    boxShadow: '0 20px 50px rgba(0,0,0,0.1)'
                                                }}>
                                                    {QRCodePreviewComponent ? (
                                                        <QRCodePreviewComponent value={manualPublicLink} size={120} />
                                                    ) : (
                                                        <div style={{ width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px solid #eee', borderRadius: '12px' }}>
                                                            QR Code
                                                        </div>
                                                    )}
                                                </div>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.2rem', fontWeight: 800 }}>
                                                    Scan for Digital View
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Prerequisites Grid */}
                                    <div className="dozuki-prerequisites-grid" style={{ marginBottom: '60px' }}>
                                        {((guide.templateFields?.tools || []).length > 0) && (
                                            <div className="dozuki-prerequisites-card">
                                                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#3b82f6', marginBottom: '20px' }}>
                                                    Required Tools
                                                </h3>
                                                <div style={{ display: 'grid', gap: '10px' }}>
                                                    {guide.templateFields.tools.map((t, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: uiTheme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                                            <span style={{ fontWeight: 600 }}>{t.name}</span>
                                                            <span style={{ opacity: 0.5 }}>x{t.qty || 1}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {((guide.templateFields?.parts || []).length > 0) && (
                                            <div className="dozuki-prerequisites-card">
                                                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#10b981', marginBottom: '20px' }}>
                                                    Required Parts
                                                </h3>
                                                <div style={{ display: 'grid', gap: '10px' }}>
                                                    {guide.templateFields.parts.map((p, idx) => (
                                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: uiTheme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                                                            <span><span style={{ fontWeight: 600 }}>{p.name}</span> <span style={{ opacity: 0.5 }}>#{p.partNo}</span></span>
                                                            <span style={{ opacity: 0.5 }}>x{p.qty || 1}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Steps Loop */}
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        {(isOperatorMode ? guide.steps.slice(operatorStepIndex, operatorStepIndex + 1) : guide.steps).map((step, idx) => {
                                            const displayIdx = isOperatorMode ? operatorStepIndex : idx;
                                            const stepCanvasElements = getStepCanvasElements(step);
                                            const stepHasCanvasVisual = stepCanvasElements.length > 0;
                                            const stepHasMediaVisual = !!(
                                                step.media?.type === 'video'
                                                || step.media?.type === 'youtube'
                                                || (step.images?.length > 0)
                                                || step.media?.url
                                            );
                                            return (
                                                <div key={step.id || idx} className="dozuki-step-card">
                                                    {/* Media Side */}
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                        <div style={{ position: 'relative', width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', background: '#000', aspectRatio: '4/3' }}>
                                                            {step.media?.type === 'video' ? (
                                                                <video src={step.media.url} style={{ width: '100%', height: '100%', objectFit: 'contain' }} controls />
                                                            ) : step.media?.type === 'youtube' && (step.media?.youtubeUrl || step.media?.url) ? (
                                                                <iframe
                                                                    src={getYouTubeEmbedUrl(step.media?.youtubeUrl || step.media?.url) || ''}
                                                                    title={`preview-youtube-${step.id || idx}`}
                                                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                                                    allowFullScreen
                                                                />
                                                            ) : (step.images?.length > 0 || step.media?.url) ? (
                                                                <img
                                                                    src={step.images?.[previewImageIndices[step.id] || 0] || step.media?.url}
                                                                    alt={step.title}
                                                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                                    <VideoOff size={32} />
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Thumbnails if multiple images */}
                                                        {step.images?.length > 1 && (
                                                            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
                                                                {step.images.map((img, imgIdx) => (
                                                                    <img
                                                                        key={imgIdx}
                                                                        src={img}
                                                                        onClick={() => setPreviewImageIndices(prev => ({ ...prev, [step.id]: imgIdx }))}
                                                                        style={{
                                                                            width: '80px',
                                                                            height: '60px',
                                                                            objectFit: 'cover',
                                                                            borderRadius: '8px',
                                                                            border: (previewImageIndices[step.id] || 0) === imgIdx ? '2px solid #3b82f6' : '1px solid rgba(0,0,0,0.1)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.2s'
                                                                        }}
                                                                        alt={`Thumbnail ${imgIdx + 1}`}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Instruction Side */}
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                                                            <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#3b82f6', opacity: 0.2, lineHeight: 1 }}>
                                                                {displayIdx + 1}
                                                            </div>
                                                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                                                {step.title}
                                                            </h2>
                                                        </div>

                                                        {stepHasCanvasVisual && (
                                                            <div style={{
                                                                marginBottom: '24px',
                                                                borderRadius: '12px',
                                                                border: '1px solid rgba(148,163,184,0.2)',
                                                                background: '#ffffff',
                                                                padding: '10px'
                                                            }}>
                                                                <div style={{ position: 'relative', width: '100%', aspectRatio: '4/3', borderRadius: '8px', overflow: 'hidden', background: '#ffffff' }}>
                                                                    <CanvasPreviewLayer elements={stepCanvasElements} />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div
                                                            style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '24px', color: uiTheme === 'light' ? '#475569' : 'rgba(255,255,255,0.8)' }}
                                                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                                                        />

                                                        {step.voiceInstruction && (
                                                            <div style={{ marginTop: '-12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                                <Volume2 size={20} style={{ color: '#3b82f6' }} />
                                                                <div style={{ flex: 1 }}>
                                                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#3b82f6', marginBottom: '4px' }}>Audio Guide</div>
                                                                    <audio src={step.voiceInstruction} controls style={{ width: '100%', height: '32px' }} />
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {(step.bullets || []).map((b, bIdx) => {
                                                                if (['note', 'warning', 'caution'].includes(b.type)) {
                                                                    const Icon = b.type === 'note' ? Info : b.type === 'caution' ? AlertTriangle : AlertOctagon;
                                                                    return (
                                                                        <div key={bIdx} className={`dozuki-flag flag-${b.type}`}>
                                                                            <div className="dozuki-icon-container">
                                                                                <Icon size={18} />
                                                                            </div>
                                                                            <div>
                                                                                <div style={{ fontWeight: 900, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
                                                                                    {b.type}
                                                                                </div>
                                                                                <div style={{ lineHeight: '1.5' }}>{b.text}</div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                }
                                                                return (
                                                                    <div key={bIdx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingLeft: '4px' }}>
                                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#475569', marginTop: '10px', flexShrink: 0 }} />
                                                                        <span style={{ fontSize: '1rem', lineHeight: '1.6' }}>{b.text}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Interactive Data Capture Fields */}
                                                        {((step.questions || []).length > 0) && !step.hideDataCapture && (
                                                            <div style={{ marginTop: '32px', padding: '24px', background: uiTheme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid var(--mc-panel-border)' }}>
                                                                <h3 style={{ fontSize: '0.85rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#ec4899', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                    <Activity size={16} /> DATA COLLECTION
                                                                </h3>
                                                                <div style={{ display: 'grid', gap: '16px' }}>
                                                                    {step.questions.map((q, qIdx) => (
                                                                        <div key={q.id || qIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                            <label style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                {q.label}
                                                                                {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                                                                            </label>

                                                                            {q.type === 'text' || q.type === 'number' ? (
                                                                                <input
                                                                                    type={q.type}
                                                                                    value={operatorAnswers[q.id] || ''}
                                                                                    onChange={(e) => setOperatorAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                                                    placeholder={`Enter ${q.label.toLowerCase()}...`}
                                                                                    style={{
                                                                                        padding: '10px 14px', borderRadius: '10px',
                                                                                        backgroundColor: uiTheme === 'light' ? '#ffffff' : 'rgba(0,0,0,0.2)',
                                                                                        color: 'var(--mc-text)', border: '1px solid var(--mc-panel-border)',
                                                                                        fontSize: '0.95rem'
                                                                                    }}
                                                                                />
                                                                            ) : q.type === 'textarea' ? (
                                                                                <textarea
                                                                                    value={operatorAnswers[q.id] || ''}
                                                                                    onChange={(e) => setOperatorAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                                                    placeholder={`Enter notes for ${q.label.toLowerCase()}...`}
                                                                                    rows={3}
                                                                                    style={{
                                                                                        padding: '10px 14px', borderRadius: '10px',
                                                                                        backgroundColor: uiTheme === 'light' ? '#ffffff' : 'rgba(0,0,0,0.2)',
                                                                                        color: 'var(--mc-text)', border: '1px solid var(--mc-panel-border)',
                                                                                        fontSize: '0.95rem', resize: 'none'
                                                                                    }}
                                                                                />
                                                                            ) : q.type === 'select' ? (
                                                                                <select
                                                                                    value={operatorAnswers[q.id] || ''}
                                                                                    onChange={(e) => setOperatorAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                                                    style={{
                                                                                        padding: '10px 14px', borderRadius: '10px',
                                                                                        backgroundColor: uiTheme === 'light' ? '#ffffff' : 'rgba(0,0,0,0.2)',
                                                                                        color: 'var(--mc-text)', border: '1px solid var(--mc-panel-border)',
                                                                                        fontSize: '0.95rem'
                                                                                    }}
                                                                                >
                                                                                    <option value="">Select Option</option>
                                                                                    {(q.options || []).map(opt => (
                                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                                    ))}
                                                                                </select>
                                                                            ) : q.type === 'radio' ? (
                                                                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                                                    {(q.options || []).map(opt => (
                                                                                        <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                                                            <input
                                                                                                type="radio"
                                                                                                name={q.id}
                                                                                                value={opt}
                                                                                                checked={operatorAnswers[q.id] === opt}
                                                                                                onChange={(e) => setOperatorAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                                                                            />
                                                                                            {opt}
                                                                                        </label>
                                                                                    ))}
                                                                                </div>
                                                                            ) : q.type === 'checkbox' ? (
                                                                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                                                    {(q.options || []).map(opt => {
                                                                                        const current = operatorAnswers[q.id] || [];
                                                                                        return (
                                                                                            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                                                                <input
                                                                                                    type="checkbox"
                                                                                                    value={opt}
                                                                                                    checked={current.includes(opt)}
                                                                                                    onChange={(e) => {
                                                                                                        const next = e.target.checked
                                                                                                            ? [...current, opt]
                                                                                                            : current.filter(o => o !== opt);
                                                                                                        setOperatorAnswers(prev => ({ ...prev, [q.id]: next }));
                                                                                                    }}
                                                                                                />
                                                                                                {opt}
                                                                                            </label>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Operator Mode Navigation */}
                                    {isOperatorMode && (
                                        <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '32px', background: uiTheme === 'light' ? '#f8fafc' : 'rgba(255,255,255,0.03)', borderRadius: '24px' }}>
                                            <button onClick={handleOperatorBack} className="btn-pro" style={{ padding: '12px 32px' }}>
                                                Previous
                                            </button>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#94a3b8' }}>
                                                STEP {operatorStepIndex + 1} OF {guide.steps.length}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const currentStep = guide.steps[operatorStepIndex];
                                                    const missingRequired = !currentStep.hideDataCapture
                                                        ? findMissingRequiredQuestion((currentStep.questions || []), operatorAnswers)
                                                        : null;

                                                    if (missingRequired) {
                                                        showAlert(`Please fill required field: ${missingRequired.label}`);
                                                        return;
                                                    }

                                                    if (operatorStepIndex === guide.steps.length - 1) {
                                                        setShowSessionSummary(true);
                                                    } else {
                                                        handleOperatorNext();
                                                    }
                                                }}
                                                className="btn-pro"
                                                style={{ padding: '12px 32px', backgroundColor: '#3b82f6', color: '#fff', border: 'none' }}
                                            >
                                                {operatorStepIndex === guide.steps.length - 1 ? 'Finish' : 'Next Step'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flex: 1, flexDirection: 'column', overflow: 'hidden', animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                                {activeTab === 'edit' && (
                                    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                                                <div style={{ opacity: canEditManual ? 1 : 0.65, pointerEvents: canEditManual ? 'auto' : 'none' }}>
                                                    <StepEditor
                                                        step={activeStep}
                                                        stepListPanel={(
                                                            <StepList
                                                                steps={guide.steps}
                                                                activeStepId={activeStepId}
                                                                onSelectStep={handleStepSelect}
                                                                onAddStep={handleAddStep}
                                                                onEditStep={handleEditStep}
                                                                onDeleteStep={handleDeleteStep}
                                                                onReorderStep={handleReorderStep}
                                                                onImportFromAnalysis={handleImportFromAnalysis}
                                                                stepStatuses={guide.stepStatusMap}
                                                            />
                                                        )}
                                                        onChange={handleStepChange}
                                                        onCaptureImage={handleCaptureFrame}
                                                        onAiImprove={handleAiImprove}
                                                        onAiGenerate={handleAiGenerate}
                                                        onAiGenerateFromVideo={handleVideoAiGenerate}
                                                        isAiLoading={isAiLoading}
                                                        activeImageIndex={activeImageIndex}
                                                        setActiveImageIndex={setActiveImageIndex}
                                                        onSave={handleSaveManual}
                                                        globalVideoSrc={videoSrc}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '280px', gap: '12px', overflowY: 'auto', paddingBottom: '16px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                            <SourceVideo
                                                videoSrc={videoSrc}
                                                videoRef={videoRef}
                                                onUpload={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setVideoSrc(url);
                                                        setRawVideoFile(file);

                                                        if (isSupabaseConfigured()) {
                                                            const cfg = getSupabaseSettings();
                                                            const guideKey = sanitizePathPart(guide.cloudId || guide.kbId || guide.id);
                                                            const ext = (file.name?.split('.').pop() || 'mp4').replace(/[^a-z0-9]/gi, '');
                                                            const fileName = `${Date.now()}-source.${ext || 'mp4'}`;
                                                            const path = `${sanitizePathPart(cfg.folder || 'manuals')}/${guideKey}/source/${fileName}`;

                                                            uploadBlobToSupabase(path, file, file.type || 'video/mp4')
                                                                .then((publicUrl) => {
                                                                    setPersistentVideoSrc(publicUrl);
                                                                    setGuide(prev => ({ ...prev, sourceVideoUrl: publicUrl }));
                                                                })
                                                                .catch((err) => {
                                                                    console.warn('Supabase video upload failed, fallback to data URL:', err);
                                                                    readBlobAsDataUrl(file)
                                                                        .then((dataUrl) => {
                                                                            setPersistentVideoSrc(dataUrl || null);
                                                                            if (dataUrl) {
                                                                                setGuide(prev => ({ ...prev, sourceVideoUrl: dataUrl }));
                                                                            }
                                                                        })
                                                                        .catch(() => setPersistentVideoSrc(null));
                                                                });
                                                        } else {
                                                            readBlobAsDataUrl(file)
                                                                .then((dataUrl) => {
                                                                    setPersistentVideoSrc(dataUrl || null);
                                                                    if (dataUrl) {
                                                                        setGuide(prev => ({ ...prev, sourceVideoUrl: dataUrl }));
                                                                    }
                                                                })
                                                                .catch(() => setPersistentVideoSrc(null));
                                                        }

                                                        setGeminiVideoUri(null);
                                                    }
                                                }}
                                                onFullAI={handleFullVideoAI}
                                                isFullAIAnalyzing={isFullAIAnalyzing}
                                                isUploadingVideo={isUploadingVideo}
                                                isAIPanelOpen={isAIPanelOpen}
                                                onToggleAIPanel={() => setIsAIPanelOpen(!isAIPanelOpen)}
                                                activeStep={activeStep}
                                                onMarkIn={handleMarkIn}
                                                onMarkOut={handleMarkOut}
                                                onSeekTo={handleSeekTo}
                                                tt={tt}
                                                t={t}
                                            />
                                            <StepMediaControls
                                                step={activeStep}
                                                onCaptureImage={handleCaptureFrame}
                                                handleStepUpdate={handleStepChange}
                                                activeImageIndex={activeImageIndex}
                                                setActiveImageIndex={setActiveImageIndex}
                                                tt={tt}
                                                globalVideoSrc={videoSrc}
                                            />
                                        </div>
                                    </div>
                                )}
                                {activeTab === 'intro' && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                                        <GuideIntroduction
                                            guide={guide}
                                            onChange={(newGuide) => setGuide(newGuide)}
                                            onShowEmbed={() => setShowEmbedModal(true)}
                                            onDelete={() => {
                                                showConfirm('Delete Guide?', 'This action is irreversible.', () => {
                                                    // Handle guide deletion logic here if needed
                                                    setSelectedProject(null);
                                                });
                                            }}
                                        />
                                    </div>
                                )}

                                {activeTab === 'info' && (
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                                        <GuideDetails
                                            guide={guide}
                                            onChange={(newGuide) => setGuide(newGuide)}
                                        />

                                        <div style={{ margin: '40px 0 24px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />

                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                                            <div className="glass-panel" style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '16px' }}>SOP Quick Access QR</div>
                                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                    <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#fff' }}>
                                                        {QRCodePreviewComponent ? <QRCodePreviewComponent value={manualPublicLink} size={100} /> : qrPreviewDataUrl ? <img src={qrPreviewDataUrl} alt="SOP QR" style={{ width: '100px', height: '100px' }} /> : 'QR'}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginBottom: '8px', wordBreak: 'break-all', opacity: 0.8 }}>{manualPublicLink}</div>
                                                        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>Scan for mobile access</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {activeStep && (
                                                <div className="glass-panel" style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '16px' }}>Active Step QR</div>
                                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                        <div style={{ padding: '12px', borderRadius: '16px', backgroundColor: '#fff' }}>
                                                            {QRCodePreviewComponent ? <QRCodePreviewComponent value={buildStepPublicLink(activeStep, 0)} size={100} /> : qrPreviewDataUrl ? <img src={qrPreviewDataUrl} alt="Step QR" style={{ width: '100px', height: '100px' }} /> : 'QR'}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: '0.85rem', color: '#fff', marginBottom: '4px', fontWeight: '600' }}>{activeStep.title || 'Untitled Step'}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#93c5fd', wordBreak: 'break-all', opacity: 0.8 }}>{buildStepPublicLink(activeStep, 0)}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {guideReferenceLinks.length > 0 && (
                                                <div className="glass-panel" style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '16px' }}>Document References</div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                                        {guideReferenceLinks.slice(0, 5).map((ref, index) => (
                                                            <button
                                                                key={`${ref.url}-${index}`}
                                                                onClick={() => window.open(ref.url, '_blank', 'noopener,noreferrer')}
                                                                className="btn-pro"
                                                                style={{
                                                                    justifyContent: 'space-between',
                                                                    width: '100%',
                                                                    background: 'rgba(34,197,94,0.08)',
                                                                    borderColor: 'rgba(34,197,94,0.25)',
                                                                    color: '#86efac'
                                                                }}
                                                                title={ref.url}
                                                            >
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px', textAlign: 'left' }}>{ref.label}</span>
                                                                <ExternalLink size={14} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'management' && (
                                    <div style={{ display: 'grid', gap: '20px', animation: 'fadeIn 0.3s' }}>
                                        {/* Workflow Status Summary */}
                                        <div className="glass-panel" style={{ padding: '20px', borderLeft: `6px solid ${normalizeWorkflowStatus(guide.status) === 'PUBLISHED' ? '#10b981' : normalizeWorkflowStatus(guide.status) === 'REVIEW' ? '#f59e0b' : '#94a3b8'}` }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>Current Workflow Status</div>
                                                    <div style={{ fontSize: '1.5rem', fontWeight: '900', color: normalizeWorkflowStatus(guide.status) === 'PUBLISHED' ? '#10b981' : normalizeWorkflowStatus(guide.status) === 'REVIEW' ? '#f59e0b' : '#fff' }}>
                                                        {normalizeWorkflowStatus(guide.status)}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    {normalizeWorkflowStatus(guide.status) === 'DRAFT' && canSubmitApproval && (
                                                        <button
                                                            onClick={handleSubmitForApproval}
                                                            className="btn-pro"
                                                            style={{ background: 'var(--mc-accent-gradient)', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                                                        >
                                                            <Send size={18} /> Submit for Approval
                                                        </button>
                                                    )}
                                                    {normalizeWorkflowStatus(guide.status) === 'REVIEW' && canRelease && (
                                                        <button
                                                            onClick={() => handleWorkflowStatusChange('PUBLISHED')}
                                                            className="btn-pro"
                                                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)', border: 'none', color: 'white', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
                                                        >
                                                            <CheckCircle size={18} /> Publish Manual
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.88rem', opacity: 0.7, lineHeight: '1.5' }}>
                                                {normalizeWorkflowStatus(guide.status) === 'DRAFT' && "The manual is currently in DRAFT mode. You can edit content and setup the approval matrix before submitting for review."}
                                                {normalizeWorkflowStatus(guide.status) === 'REVIEW' && "The manual is under REVIEW. You can publish once all required approvals are completed."}
                                                {normalizeWorkflowStatus(guide.status) === 'PUBLISHED' && "This manual has been PUBLISHED and is active. Scanning the QR code will show this version to operators."}
                                            </div>
                                        </div>

                                        {/* Approval Matrix Configuration */}
                                        <div className="glass-panel" style={{ padding: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <Shield size={18} />
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval Matrix Configuration</div>
                                                </div>
                                                {normalizeWorkflowStatus(guide.status) === 'DRAFT' && (
                                                    <button
                                                        onClick={handleAddApprovalLevel}
                                                        className="btn-pro"
                                                        style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}
                                                    >
                                                        <Plus size={14} /> Add Review Level
                                                    </button>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                {(guide.approvalMatrix || []).map((level, idx) => (
                                                    <div key={level.id} style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: '50px 1.5fr 2fr 40px',
                                                        gap: '16px',
                                                        alignItems: 'center',
                                                        background: 'rgba(255,255,255,0.02)',
                                                        padding: '14px 20px',
                                                        borderRadius: '16px',
                                                        border: '1px solid rgba(255,255,255,0.06)',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '50%',
                                                            background: 'rgba(255,255,255,0.05)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '0.8rem', fontWeight: '900', color: 'rgba(255,255,255,0.5)'
                                                        }}>
                                                            {idx + 1}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.4, fontWeight: '800' }}>Reviewer Role</div>
                                                            <input
                                                                placeholder="e.g. Quality Manager"
                                                                value={level.role || ''}
                                                                onChange={(e) => handleUpdateApprovalLevel(level.id, 'role', e.target.value)}
                                                                disabled={normalizeWorkflowStatus(guide.status) !== 'DRAFT'}
                                                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', opacity: 0.4, fontWeight: '800' }}>Approver Name (Optional)</div>
                                                            <input
                                                                placeholder="Exact Name"
                                                                value={level.approverName || ''}
                                                                onChange={(e) => handleUpdateApprovalLevel(level.id, 'approverName', e.target.value)}
                                                                disabled={normalizeWorkflowStatus(guide.status) !== 'DRAFT'}
                                                                style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem', outline: 'none' }}
                                                            />
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                            {normalizeWorkflowStatus(guide.status) === 'DRAFT' && (
                                                                <button
                                                                    onClick={() => handleRemoveApprovalLevel(level.id)}
                                                                    title="Remove level"
                                                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6, transition: '0.2s', padding: '4px', borderRadius: '4px' }}
                                                                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                                                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.6'}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!guide.approvalMatrix || guide.approvalMatrix.length === 0) && (
                                                    <div style={{ textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                                        <Shield size={32} style={{ opacity: 0.1, marginBottom: '12px' }} />
                                                        <div style={{ opacity: 0.4, fontSize: '0.9rem' }}>No approval levels defined. Click "Add Review Level" to start.</div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Approval Requests Tracking */}
                                        {(normalizeWorkflowStatus(guide.status) === 'REVIEW' || (guide.approvalRequests || []).length > 0) && (
                                            <div className="glass-panel" style={{ padding: '24px', borderTop: '1px solid rgba(245, 158, 11, 0.2)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                                        <Clock size={18} />
                                                    </div>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Approval Workflow Tracking</div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                                    {(guide.approvalRequests || []).map((req, idx) => (
                                                        <div key={req.id} style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            background: 'rgba(255,255,255,0.02)',
                                                            padding: '20px',
                                                            borderRadius: '16px',
                                                            border: '1px solid rgba(255,255,255,0.06)',
                                                            borderLeft: `4px solid ${req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b'}`
                                                        }}>
                                                            <div style={{ flex: 1 }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                                                    <div style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', padding: '3px 8px', borderRadius: '6px', fontWeight: '900' }}>LEVEL {req.level}</div>
                                                                    <div style={{ fontWeight: '800', fontSize: '1.1rem' }}>{req.role}</div>
                                                                </div>
                                                                <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>Approver: <span style={{ color: '#fff', fontWeight: '600' }}>{req.approverName || (idx === 0 ? guide.author : 'Any Reviewer')}</span></div>
                                                                {req.actedAt && (
                                                                    <div style={{ fontSize: '0.75rem', opacity: 0.4, marginTop: '4px' }}>
                                                                        Last Action: {new Date(req.actedAt).toLocaleString()}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                                                                <div style={{
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: '900',
                                                                    textTransform: 'uppercase',
                                                                    padding: '4px 12px',
                                                                    borderRadius: '99px',
                                                                    background: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                                                    color: req.status === 'Approved' ? '#10b981' : req.status === 'Rejected' ? '#ef4444' : '#f59e0b',
                                                                    border: `1px solid ${req.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : req.status === 'Rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                                                                }}>
                                                                    {req.status}
                                                                </div>

                                                                {req.status === 'Pending' && normalizeWorkflowStatus(guide.status) === 'REVIEW' && canApprove && (
                                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                                        <button
                                                                            onClick={() => handleApprovalAction(req.id, 'Rejected')}
                                                                            className="btn-pro"
                                                                            style={{ fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                                                        >
                                                                            Reject Request
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleApprovalAction(req.id, 'Approved')}
                                                                            className="btn-pro"
                                                                            style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.2)' }}
                                                                        >
                                                                            Approve Level
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                            <div className="glass-panel" style={{ padding: '24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '800', marginBottom: '20px' }}>
                                                    <Activity size={16} /> Compliance Metrics
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '8px' }}>Global Completion</div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{completionRate}%</div>
                                                    </div>
                                                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '8px' }}>First-Pass Compliance</div>
                                                        <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{firstPassCompliance}%</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '24px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '800' }}>
                                                        <BookOpen size={16} /> Personnel Assignments
                                                    </div>
                                                    <button onClick={handleAddAssignment} className="btn-pro" style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)' }}>
                                                        <Plus size={14} /> New Assignment
                                                    </button>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                                                        <BarChart3 size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '1rem', fontWeight: '800' }}>{assignments.length} Total</div>
                                                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>Currently active assignments</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>

                    {/* Right: AI Chat Overlay Integration */}
                    {isAIPanelOpen && !isPreviewMode && !isOperatorMode && (
                        <div style={{
                            width: '350px',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <AIChatOverlay
                                isOpen={isAIPanelOpen}
                                onClose={() => setIsAIPanelOpen(false)}
                                context={{
                                    type: 'manual_creation',
                                    manualTitle: guide.title,
                                    currentStep: activeStep,
                                    allSteps: guide.steps
                                }}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <div className="glass-panel" style={{
                        padding: '40px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '32px',
                        zIndex: 1,
                        maxWidth: '600px',
                        width: '90%',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        animation: 'fadeIn 0.6s ease-out'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '64px', height: '64px',
                                borderRadius: '16px',
                                background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(37, 99, 235, 0.05))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#3b82f6',
                                margin: '0 auto 20px',
                                border: '1px solid rgba(59, 130, 246, 0.2)'
                            }}>
                                <Plus size={32} />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: '700', margin: '0 0 8px 0', color: '#fff' }}>
                                {tt('manual.newManual', 'New Manual')}
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.95rem', margin: 0 }}>
                                {tt('manual.newManualDescription', 'Create a new manual from project data or start from scratch.')}
                            </p>
                        </div>

                        <div style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: 'minmax(200px, 1fr) auto',
                            gap: '12px',
                            padding: '20px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{ position: 'relative' }}>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="pro-select"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '10px',
                                        backgroundColor: 'rgba(0,0,0,0.2)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff',
                                        appearance: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">{tt('common.selectProject', 'Select Project')}</option>
                                    {projects.map(p => (
                                        <option key={p.projectName} value={p.projectName}>{p.projectName}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }} />
                            </div>

                            <button
                                onClick={() => {
                                    const localizedNewManual = tt('manual.newManual', 'New Manual');
                                    setSelectedProject({ projectName: localizedNewManual });
                                    setGuide(prev => ({ ...prev, title: localizedNewManual, steps: [] }));
                                }}
                                className="btn-pro"
                                style={{
                                    padding: '0 20px',
                                    borderRadius: '10px',
                                    backgroundColor: '#2563eb',
                                    color: '#fff',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    border: 'none'
                                }}
                            >
                                <Plus size={18} />
                                {tt('manual.newManual', 'New Manual')}
                            </button>
                        </div>

                        <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}></div>

                        <button
                            onClick={handleLoadManualsList}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'rgba(255, 255, 255, 0.8)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                fontSize: '0.95rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <FolderOpen size={20} />
                            {tt('manual.openManual', 'Open Manual')}
                        </button>
                    </div>
                </div>
            )
            }


            {/* Open Manual Dialog */}
            {
                showOpenDialog && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backdropFilter: 'blur(8px)',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <div className="glass-panel" style={{
                            width: '500px', maxHeight: '80vh',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            animation: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}>
                            <div style={{
                                padding: '20px 24px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <FolderOpen size={20} style={{ color: '#0891b2' }} />
                                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.01em' }}>
                                        {tt('manual.openSaved', 'Open Saved Manual')}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => setShowOpenDialog(false)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: 'none',
                                        color: '#888',
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                                {savedManuals.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.5 }}>
                                        <Book size={48} style={{ marginBottom: '16px', color: 'rgba(255, 255, 255, 0.2)' }} />
                                        <p>{tt('manual.noSavedFound', 'No saved manuals found.')}</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {savedManuals.map(m => (
                                            <div
                                                key={m.id}
                                                onClick={() => handleOpenManual(m)}
                                                className="glass-panel"
                                                style={{
                                                    padding: '16px',
                                                    cursor: 'pointer',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                                                    e.currentTarget.style.transform = 'translateX(4px)';
                                                    e.currentTarget.style.borderColor = 'rgba(37, 99, 235, 0.3)';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                                                    e.currentTarget.style.transform = 'translateX(0)';
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div style={{ fontWeight: '700', color: '#fff', fontSize: '1rem' }}>{m.title}</div>
                                                    <div style={{
                                                        fontSize: '0.65rem',
                                                        fontWeight: '900',
                                                        padding: '2px 8px',
                                                        borderRadius: '6px',
                                                        backgroundColor: 'rgba(37, 99, 235, 0.15)',
                                                        color: '#60a5fa',
                                                        textTransform: 'uppercase'
                                                    }}>
                                                        v{m.version}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontSize: '0.75rem',
                                                    color: 'rgba(255, 255, 255, 0.4)',
                                                    marginTop: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <Activity size={12} />
                                                    Updated: {new Date(m.updatedAt || m.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {isManualOpening && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 2500,
                    backgroundColor: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-panel" style={{
                        width: 'min(560px, 92vw)',
                        padding: '24px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        textAlign: 'center'
                    }}>
                        <Loader2 size={30} style={{ color: '#60a5fa', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
                        <div style={{ color: '#fff', fontWeight: 700, marginBottom: '8px' }}>
                            {manualOpeningMessage || 'Membuka manual...'}
                        </div>
                        <div style={{
                            height: '10px',
                            borderRadius: '999px',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${Math.max(0, Math.min(100, manualOpeningProgress))}%`,
                                background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
                                transition: 'width 0.25s ease'
                            }} />
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '8px' }}>
                            {Math.round(Math.max(0, Math.min(100, manualOpeningProgress)))}%
                        </div>
                    </div>
                </div>
            )}

            {/* AIChatOverlay Integration */}
            <AIChatOverlay
                visible={isAIPanelOpen}
                onClose={() => setIsAIPanelOpen(false)}
                title="Mavi manual AI"
                subtitle="Video Context Assistant"
                contextData={{
                    videoUri: geminiVideoUri,
                    guide: guide,
                    activeStepId: activeStepId
                }}
            />
            {/* Session Summary Modal */}
            {
                showSessionSummary && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div className="glass-panel" style={{
                            maxWidth: '650px', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto',
                            padding: '40px',
                            animation: 'slideUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '80px', height: '80px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', margin: '0 auto 24px',
                                boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
                            }}>
                                <CheckCircle size={40} />
                            </div>

                            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>
                                Session Completed!
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '40px' }}>
                                All steps verified and data captured successfully.
                            </p>

                            <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', padding: '24px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ fontSize: '0.8rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#10b981', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Activity size={14} /> CAPTURED DATA SUMMARY
                                </h3>

                                <div style={{ display: 'grid', gap: '12px' }}>
                                    {guide.steps.some(s => (s.questions || []).length > 0) ? (
                                        guide.steps.flatMap(step => (step.questions || []).map(q => {
                                            const ans = operatorAnswers[q.id];
                                            const displayAns = Array.isArray(ans) ? ans.join(', ') : (ans || '-');
                                            return (
                                                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{q.label}</div>
                                                    <div style={{ color: '#10b981', fontWeight: 700 }}>{displayAns}</div>
                                                </div>
                                            );
                                        }))
                                    ) : (
                                        <div style={{ textAlign: 'center', opacity: 0.4, padding: '20px', fontSize: '0.9rem' }}>
                                            No data fields were required for this manual.
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button
                                    onClick={() => {
                                        setShowSessionSummary(false);
                                        setIsOperatorMode(false);
                                        setOperatorAnswers({});
                                    }}
                                    className="btn-pro"
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                                >
                                    Close & Reset
                                </button>
                                <button
                                    onClick={() => {
                                        showAlert('Report Saved', 'Execution data has been logged to the audit trail.');
                                        setShowSessionSummary(false);
                                        setIsOperatorMode(false);
                                        setOperatorAnswers({});
                                    }}
                                    className="btn-pro"
                                    style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#3b82f6', color: '#fff', border: 'none', fontWeight: 700 }}
                                >
                                    Save & Exit
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Version History Sidebar Overlay */}
            {isHistorySidebarOpen && !isPreviewMode && !isOperatorMode && (
                <div style={{
                    position: 'fixed', top: '56px', right: 0, bottom: 0,
                    width: '320px', backgroundColor: 'rgba(15, 23, 42, 0.98)',
                    backdropFilter: 'blur(20px)', borderLeft: '1px solid rgba(255,255,255,0.1)',
                    zIndex: 1000, display: 'flex', flexDirection: 'column',
                    animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '-10px 0 30px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Clock size={16} style={{ color: '#3b82f6' }} />
                            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline</h3>
                        </div>
                        <button onClick={() => setIsHistorySidebarOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                            <X size={18} />
                        </button>
                    </div>

                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <button
                            onClick={handleCreateVersion}
                            className="btn-pro"
                            style={{ width: '100%', justifyContent: 'center', backgroundColor: '#3b82f6', border: 'none', color: '#fff', padding: '10px' }}
                        >
                            <Plus size={16} /> New Snapshot
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {(guide.versionHistory || []).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255,255,255,0.3)' }}>
                                <Layers size={32} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                                <div style={{ fontSize: '0.85rem' }}>No snapshots yet</div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {(guide.versionHistory || []).map((item, idx) => (
                                    <div key={item.id || idx} style={{
                                        padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>Ver {item.version}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                                    {new Date(item.updatedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRestoreVersion(item)}
                                                style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(59,130,246,0.1)', color: '#3b82f6', border: 'none', cursor: 'pointer' }}
                                            >
                                                RESTORE
                                            </button>
                                        </div>
                                        {item.summary && (
                                            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '6px' }}>
                                                "{item.summary}"
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Embed Guide Modal */}
            {
                showEmbedModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        backdropFilter: 'blur(8px)',
                        zIndex: 2000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '20px'
                    }}>
                        <div className="glass-panel" style={{
                            maxWidth: '800px', width: '100%',
                            maxHeight: '90vh', overflowY: 'auto',
                            padding: '32px',
                            animation: 'slideUp 0.3s ease-out'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(167, 139, 250, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                                        <Code size={22} />
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{t('manual.embedGuide')}</h2>
                                </div>
                                <button onClick={() => setShowEmbedModal(false)} className="btn-icon-label" style={{ borderRadius: '50%' }}>
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ gridTemplateColumns: '1fr 1fr', display: 'grid', gap: '24px', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--mc-muted-text)', marginBottom: '8px' }}>
                                        {t('manual.embedCodeInstructions', 'Copy this code into your website to display this guide as a widget.')}
                                    </div>

                                    <div style={{ position: 'relative' }}>
                                        <textarea
                                            readOnly
                                            value={`<iframe src="${manualPublicLink}" width="${embedSize === 'full' ? '100%' : (embedSize === 'small' ? '320' : embedSize === 'medium' ? '640' : '800')}" height="${embedSize === 'small' ? '480' : '600'}" frameborder="0" style="border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.1);"></iframe>`}
                                            style={{
                                                width: '100%', height: '140px',
                                                background: 'var(--mc-input-dark-bg)',
                                                color: 'var(--mc-accent)',
                                                border: '1px solid var(--mc-panel-border)',
                                                borderRadius: '12px',
                                                padding: '16px',
                                                fontSize: '0.8rem',
                                                fontFamily: 'monospace',
                                                resize: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={() => {
                                                const code = `<iframe src="${manualPublicLink}" width="${embedSize === 'full' ? '100%' : (embedSize === 'small' ? '320' : embedSize === 'medium' ? '640' : '800')}" height="${embedSize === 'small' ? '480' : '600'}" frameborder="0" style="border-radius: 12px; border: 1px solid rgba(0,0,0,0.1); box-shadow: 0 4px 20px rgba(0,0,0,0.1);"></iframe>`;
                                                navigator.clipboard.writeText(code);
                                                showAlert('Copied', t('manual.codeCopied'));
                                            }}
                                            className="btn-pro"
                                            style={{ position: 'absolute', right: '12px', bottom: '12px', padding: '6px 12px', fontSize: '0.75rem', background: 'var(--mc-accent)', color: 'white', border: 'none' }}
                                        >
                                            <Copy size={14} /> {t('manual.copyCode')}
                                        </button>
                                    </div>

                                    <div>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--mc-inactive-text)', marginBottom: '10px', letterSpacing: '0.05em' }}>
                                            {t('manual.selectSize', 'Select Size')}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {[
                                                { id: 'small', label: t('manual.embedSize.small'), desc: '320×480' },
                                                { id: 'medium', label: t('manual.embedSize.medium'), desc: '640×600' },
                                                { id: 'large', label: t('manual.embedSize.large'), desc: '800×600' },
                                                { id: 'full', label: t('manual.embedSize.full'), desc: '100% Width' }
                                            ].map(size => (
                                                <button
                                                    key={size.id}
                                                    onClick={() => setEmbedSize(size.id)}
                                                    style={{
                                                        padding: '8px 14px',
                                                        borderRadius: '8px',
                                                        border: '1px solid',
                                                        borderColor: embedSize === size.id ? 'var(--mc-accent)' : 'var(--mc-panel-border)',
                                                        background: embedSize === size.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                                        color: embedSize === size.id ? 'var(--mc-accent)' : 'var(--mc-muted-text)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        flex: 1,
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <div style={{ fontWeight: 700 }}>{size.label}</div>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{size.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--mc-inactive-text)', marginBottom: '14px', letterSpacing: '0.05em' }}>
                                        {t('manual.embedPreview')}
                                    </div>
                                    <div style={{
                                        width: '100%', height: '320px',
                                        borderRadius: '12px',
                                        background: 'var(--mc-input-dark-bg)',
                                        border: '1px solid var(--mc-panel-border)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden',
                                        position: 'relative'
                                    }}>
                                        <div style={{
                                            width: embedSize === 'small' ? '120px' : (embedSize === 'medium' ? '200px' : '260px'),
                                            height: embedSize === 'small' ? '180px' : '200px',
                                            background: 'white',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                            padding: '12px',
                                            color: '#334155'
                                        }}>
                                            <div style={{ width: '40%', height: '8px', background: '#3b82f6', borderRadius: '4px', marginBottom: '8px' }} />
                                            <div style={{ width: '100%', height: '60px', background: '#f1f5f9', borderRadius: '4px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <BookOpen size={24} color="#3b82f6" opacity={0.3} />
                                            </div>
                                            <div style={{ width: '80%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '6px' }} />
                                            <div style={{ width: '60%', height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '12px' }} />
                                            <div style={{ width: '100%', height: '24px', background: '#3b82f6', borderRadius: '6px' }} />
                                        </div>
                                        <div style={{ position: 'absolute', bottom: '12px', fontSize: '0.7rem', color: 'var(--mc-very-muted-text)' }}>
                                            Previewing as {embedSize} widget
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                                        <button
                                            onClick={() => window.open(manualPublicLink, '_blank')}
                                            className="btn-pro"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <ExternalLink size={14} /> Open Live
                                        </button>
                                        <button
                                            onClick={exportToPDF}
                                            className="btn-pro"
                                            style={{ flex: 1, justifyContent: 'center' }}
                                        >
                                            <Printer size={14} /> Print Snapshot
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--mc-divider)', paddingTop: '24px', textAlign: 'right' }}>
                                <button
                                    onClick={() => setShowEmbedModal(false)}
                                    style={{
                                        padding: '10px 24px',
                                        borderRadius: '10px',
                                        background: 'var(--mc-accent-gradient)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* QR Code Modal */}
            {
                showQRModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div className="glass-panel" style={{
                            width: '450px',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                            animation: 'slideUp 0.4s ease-out'
                        }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid var(--mc-divider)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #ec4899, #d946ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                        <QrCode size={20} />
                                    </div>
                                    <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Quick Access QR</h2>
                                </div>
                                <button onClick={() => setShowQRModal(false)} className="btn-icon-label">
                                    <X size={20} />
                                </button>
                            </div>

                            <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                                <div style={{
                                    padding: '24px',
                                    background: 'white',
                                    borderRadius: '24px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                                    border: '8px solid white'
                                }}>
                                    <QRCodeCanvas
                                        id="manual-qr-code"
                                        value={manualQRLink}
                                        size={256}
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem' }}>{guide.title || 'Untitled Manual'}</h3>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--mc-muted-text)', maxWidth: '280px' }}>
                                        Scan this code to instantly open this work instruction on any mobile device.
                                    </p>
                                </div>

                                <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                                    <button
                                        onClick={() => {
                                            const canvas = document.getElementById('manual-qr-code');
                                            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
                                            let downloadLink = document.createElement("a");
                                            downloadLink.href = pngUrl;
                                            downloadLink.download = `${guide.title || 'manual'}-qr.png`;
                                            document.body.appendChild(downloadLink);
                                            downloadLink.click();
                                            document.body.removeChild(downloadLink);
                                        }}
                                        className="btn-pro"
                                        style={{ flex: 1, height: '44px', justifyContent: 'center', background: 'rgba(236, 72, 153, 0.1)', borderColor: 'rgba(236, 72, 153, 0.3)', color: '#ec4899' }}
                                    >
                                        <Download size={18} /> Save QR Image
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(manualQRLink);
                                            showAlert('Link copied to clipboard!');
                                        }}
                                        className="btn-pro"
                                        style={{ flex: 1, height: '44px', justifyContent: 'center' }}
                                    >
                                        <Copy size={18} /> Copy Link
                                    </button>
                                </div>
                            </div>

                            <div style={{ padding: '20px', borderTop: '1px solid var(--mc-divider)', background: 'var(--mc-faint-bg)', fontSize: '0.8rem', color: 'var(--mc-muted-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Info size={14} />
                                <span>This QR code leads to the exact ID of this manual.</span>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

// Style constants for preview table
const headerCellStyle = {
    padding: '8px',
    backgroundColor: '#f0f0f0',
    fontWeight: 'bold',
    border: '1px solid #ddd',
    width: '20%'
};

const dataCellStyle = {
    padding: '8px',
    border: '1px solid #ddd'
};

export default ManualCreation;
