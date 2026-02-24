import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAllProjects } from '../utils/database';
import { addKnowledgeBaseItem, updateKnowledgeBaseItem, getAllKnowledgeBaseItems, getKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
import { upsertManual, listManuals } from '../utils/tursoAPI';
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
import {
    FileSpreadsheet, FileText, Upload, Sparkles, MessageSquare,
    Cpu, Loader2, BarChart3, Settings, Book, Layout, List,
    Eye, Save, FolderOpen, FileDown, Globe, Layers,
    ChevronDown, Trash2, Plus, Info, Video, CheckCircle,
    Activity, Shield, Play, VideoOff, X, BookOpen, Sun, Moon, Palette,
    Code, Copy, ExternalLink, Printer, Box, AlertTriangle, AlertOctagon,
    Clock
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';

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

const USER_ROLES = ['Author', 'Reviewer', 'Approver', 'Operator', 'Admin'];
const CAPA_TRANSITIONS = {
    Open: ['Root Cause'],
    'Root Cause': ['Corrective Action'],
    'Corrective Action': ['Verification'],
    Verification: ['Closed'],
    Closed: []
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
            'manual.statuses.draft': 'Draft',
            'manual.statuses.proposed': 'Proposed',
            'manual.statuses.review': 'In Review',
            'manual.statuses.approved': 'Approved',
            'manual.statuses.released': 'Released',
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
            'manual.statuses.draft': 'Draft',
            'manual.statuses.proposed': 'Usulan',
            'manual.statuses.review': 'Dalam Review',
            'manual.statuses.approved': 'Disetujui',
            'manual.statuses.released': 'Dirilis',
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
            'manual.statuses.draft': '下書き',
            'manual.statuses.proposed': '提案済み',
            'manual.statuses.review': 'レビュー中',
            'manual.statuses.approved': '承認済み',
            'manual.statuses.released': '公開済み',
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
    const { showAlert, showConfirm } = useDialog();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [videoSrc, setVideoSrc] = useState(null);
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

    const WORKFLOW_STATUSES = ['Draft', 'In Review', 'Approved', 'Released'];
    const WORKFLOW_TRANSITIONS = {
        Draft: ['Draft', 'In Review'],
        'In Review': ['Draft', 'In Review', 'Approved'],
        Approved: ['In Review', 'Approved', 'Released'],
        Released: ['Approved', 'Released']
    };

    const createDefaultGuide = () => ({
        id: generateId(),
        title: '',
        summary: '',
        difficulty: 'Moderate',
        timeRequired: '',
        documentNumber: '',
        version: '1.0',
        status: 'Draft',
        author: '',
        revisionDate: new Date().toISOString().split('T')[0],
        effectiveDate: '',
        headerOrder: DEFAULT_HEADER_ORDER,
        workflow: {
            status: 'Draft',
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
        steps: [],
        images: [], // Global images if any, but steps will have their own
        // Dozuki-style Introduction fields
        guideType: 'Replacement',
        category: '',
        introductionText: '',
        flags: ['In Progress'],
        accessControl: { isPublic: true, teams: [], individuals: [] },
        editPermissions: 0,
        tags: []
    });

    const normalizeGuide = (manual) => {
        const contentObj = manual?.content && typeof manual.content === 'object' && !Array.isArray(manual.content)
            ? manual.content
            : {};

        const templateFields = contentObj.templateFields || manual?.templateFields || {};
        const fallbackStatus = manual?.status || contentObj?.workflow?.status || 'Draft';

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
            steps: ensureUniqueStepIds(manual?.steps || contentObj?.steps || manual?.content || []),
            // Introduction fields fallback
            guideType: manual?.guideType || contentObj?.guideType || 'Replacement',
            category: manual?.category || contentObj?.category || '',
            introductionText: manual?.introductionText || contentObj?.introductionText || '',
            flags: manual?.flags || contentObj?.flags || ['In Progress'],
            accessControl: manual?.accessControl || contentObj?.accessControl || { isPublic: true, teams: [], individuals: [] },
            editPermissions: manual?.editPermissions || contentObj?.editPermissions || 0,
            tags: manual?.tags || contentObj?.tags || []
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

    // Advanced AI State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [geminiVideoUri, setGeminiVideoUri] = useState(null);
    const [isFullAIAnalyzing, setIsFullAIAnalyzing] = useState(false);
    const [rawVideoFile, setRawVideoFile] = useState(null);
    const [currentUserName, setCurrentUserName] = useState('User 1');
    const [currentUserRole, setCurrentUserRole] = useState('Author');
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
        try {
            const manual = await getKnowledgeBaseItem(id);
            if (manual) {
                handleOpenManual(manual);
            }
        } catch (error) {
            console.error('Error loading manual by ID:', error);
        }
    };

    useEffect(() => {
        if (selectedProjectId && projects.length > 0) {
            const project = projects.find(p => p.projectName === selectedProjectId);
            setSelectedProject(project);
            if (project.videoBlob) {
                setVideoSrc(URL.createObjectURL(project.videoBlob));
                setRawVideoFile(new File([project.videoBlob], 'source_video.mp4', { type: project.videoBlob.type || 'video/mp4' }));
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
            setSelectedProject(null);
            setVideoSrc(null);
            setGuide(createDefaultGuide());
            setActiveStepId(null);
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

    const buildGuideSnapshot = (currentGuide = guide) => ({
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
        steps: currentGuide.steps
    });

    const hasAnyRole = (...roles) => currentUserRole === 'Admin' || roles.includes(currentUserRole);

    const getWorkflowStatusLabel = (status) => {
        const map = {
            Draft: tt('manual.statuses.draft', 'Draft'),
            Proposed: tt('manual.statuses.proposed', 'Proposed'),
            'In Review': tt('manual.statuses.review', 'In Review'),
            Approved: tt('manual.statuses.approved', 'Approved'),
            Released: tt('manual.statuses.released', 'Released')
        };
        return map[status] || status;
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
        if (!(await guardPermission(nextStatus === 'Released' ? canRelease : canEditManual, `status change to ${nextStatus}`))) return;
        const currentStatus = guide.workflow?.status || guide.status || 'Draft';
        const allowed = WORKFLOW_TRANSITIONS[currentStatus] || [currentStatus];

        if (!allowed.includes(nextStatus)) {
            await showAlert(
                'Invalid Transition',
                `Status transition from "${currentStatus}" to "${nextStatus}" is not allowed. Use step-by-step approval flow.`
            );
            return;
        }

        if (nextStatus === 'Released') {
            const allApproved = (guide.approvalRequests || []).length > 0 && (guide.approvalRequests || []).every(r => r.status === 'Approved');
            if (!allApproved) {
                await showAlert('Approval Required', 'All approval levels must be approved before status can be Released.');
                return;
            }
        }

        setGuide(prev => {
            const nextReadAcks = nextStatus === 'Released'
                ? (prev.readAcks || []).filter(a => a.version !== (prev.version || '1.0'))
                : (prev.readAcks || []);
            return {
                ...prev,
                status: nextStatus,
                workflow: {
                    ...(prev.workflow || {}),
                    status: nextStatus,
                    updatedBy: `${currentUserName} (${currentUserRole})`,
                    updatedAt: new Date().toISOString()
                },
                readAcks: nextReadAcks,
                auditTrail: appendAuditEvent(prev, 'Workflow Status Changed', `${prev.workflow?.status || prev.status || 'Draft'} -> ${nextStatus}`)
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
                    status: prev.workflow?.status || prev.status || 'Draft',
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
                status: 'In Review',
                workflow: {
                    ...(prev.workflow || {}),
                    status: 'In Review',
                    updatedBy: prev.author || 'System',
                    updatedAt: new Date().toISOString()
                },
                approvalRequests: requests,
                auditTrail: appendAuditEvent(prev, 'Submitted for Approval', `Submitted ${requests.length} approval levels`)
            };
        });
    };

    const handleApprovalAction = async (requestId, decision) => {
        if (!(await guardPermission(canApprove, `${decision.toLowerCase()} approval`))) return;
        const note = window.prompt(`${decision} note (optional):`, '') || '';
        setGuide(prev => {
            const updatedRequests = (prev.approvalRequests || []).map(r =>
                r.id === requestId ? { ...r, status: decision, note, actedAt: new Date().toISOString() } : r
            );

            const allApproved = updatedRequests.length > 0 && updatedRequests.every(r => r.status === 'Approved');
            const hasRejected = updatedRequests.some(r => r.status === 'Rejected');

            let nextStatus = prev.status;
            if (allApproved) nextStatus = 'Approved';
            if (hasRejected) nextStatus = 'Draft';

            return {
                ...prev,
                status: nextStatus,
                workflow: {
                    ...(prev.workflow || {}),
                    status: nextStatus,
                    updatedBy: prev.author || 'System',
                    updatedAt: new Date().toISOString()
                },
                approvalRequests: updatedRequests,
                auditTrail: appendAuditEvent(prev, 'Approval Action', `${decision} by level request`)
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

    const handleOperatorNext = () => {
        setOperatorStepIndex(prev => Math.min(prev + 1, Math.max(guide.steps.length - 1, 0)));
    };

    const handleOperatorBack = () => {
        const minIndex = (guide.summary || (guide.templateFields?.tools || []).length > 0 || (guide.templateFields?.parts || []).length > 0) ? -1 : 0;
        setOperatorStepIndex(prev => Math.max(prev - 1, minIndex));
    };

    const handleSaveManual = async () => {
        if (!guide.title) {
            await showAlert('Title Required', t('manual.alerts.enterTitle'));
            return;
        }

        try {
            const manualData = {
                title: guide.title,
                description: guide.summary || '',
                category: 'Work Instruction',
                type: 'manual',
                version: guide.version,
                status: guide.workflow?.status || guide.status || 'Draft',
                author: guide.author || '',
                documentNumber: guide.documentNumber || '',
                content: {
                    ...buildGuideSnapshot(guide),
                    status: guide.workflow?.status || guide.status || 'Draft'
                },
                updatedAt: new Date().toISOString(),
                industry: guide.category || '',
                createdAt: guide.createdAt || new Date().toISOString()
            };

            // 1) Save to Turso cloud first for QR cross-device access
            const cloudResult = await upsertManual({
                cloudId: guide.cloudId,
                ...manualData
            });
            const nextCloudId = cloudResult?.cloudId || guide.cloudId;

            // 2) Keep local KB in sync (best-effort fallback cache)
            let nextKbId = guide.kbId;
            if (guide.kbId) {
                try {
                    await updateKnowledgeBaseItem(guide.kbId, {
                        ...manualData,
                        cloudId: nextCloudId
                    });
                } catch {
                    const localResult = await addKnowledgeBaseItem({
                        ...manualData,
                        cloudId: nextCloudId
                    });
                    if (localResult?.id) nextKbId = localResult.id;
                }
            } else {
                const localResult = await addKnowledgeBaseItem({
                    ...manualData,
                    cloudId: nextCloudId
                });
                if (localResult?.id) {
                    nextKbId = localResult.id;
                }
            }

            setGuide(prev => ({
                ...prev,
                cloudId: nextCloudId,
                id: nextCloudId || prev.id,
                kbId: nextKbId
            }));

            await showAlert('Success', guide.kbId ? t('manual.alerts.updateSuccess') : t('manual.alerts.saveSuccess'));
        } catch (error) {
            console.error('Error saving manual:', error);
            await showAlert('Error', t('manual.alerts.saveFailed', { message: error.message }));
        }
    };

    const handleLoadManualsList = async () => {
        try {
            // Load from both Cloud (Turso manuals table) and Local KB (which now also checks Turso KB table)
            const items = await getAllKnowledgeBaseItems();
            const localManuals = items.filter(item => item.type === 'manual');

            let cloudManuals = [];
            if (isTursoConfigured()) {
                try {
                    cloudManuals = await listManuals();
                } catch (e) {
                    console.warn('Sync notice: Could not list manuals from Turso:', e);
                }
            }

            const mergedMap = new Map();
            // Order matters: later items overwrite earlier ones. Local/KB items are usually richer.
            [...cloudManuals, ...localManuals].forEach((m) => {
                const key = String(m.cloudId || m.cloud_id || m.id);
                mergedMap.set(key, m);
            });

            const manuals = Array.from(mergedMap.values());
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
        // Auto-set as video media if not already set or if it's an image
        if (!currentStep.media || currentStep.media.type !== 'youtube') {
            update.media = { type: 'video', url: videoSrc };
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

        // Auto-set as video media if not already set or if it's an image
        if (!currentStep.media || currentStep.media.type !== 'youtube') {
            update.media = { type: 'video', url: videoSrc };
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


    const handleStepSelect = (id) => setActiveStepId(id);

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
            steps: ensureUniqueStepIds([...prev.steps, newStep])
        }));
        setActiveStepId(newStep.id);
    };

    const handleDeleteStep = async (id) => {
        if (!await showConfirm(t('manual.alerts.confirmDeleteStep'))) return;
        setGuide(prev => {
            const newSteps = prev.steps.filter(s => s.id !== id);
            return { ...prev, steps: newSteps };
        });
        if (activeStepId === id) setActiveStepId(null);
    };

    const handleEditStep = (id) => {
        const step = guide.steps.find((s) => s.id === id);
        if (!step) return;

        const nextTitle = window.prompt('Edit step title:', step.title || '');
        if (nextTitle === null) return;

        handleStepChange(id, { title: nextTitle.trim() || tt('manual.untitledStep', 'Untitled Step') });
    };

    const handleStepChange = (id, fieldOrUpdate, value) => {
        setGuide(prev => ({
            ...prev,
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


    const handleCaptureFrame = () => {
        if (!videoRef.current || !activeStepId) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        const currentStep = guide.steps.find(s => s.id === activeStepId);
        if (currentStep) {
            const existingImages = Array.isArray(currentStep.images) ? currentStep.images : [];
            const nextImages = [...existingImages, dataUrl];
            handleStepChange(activeStepId, {
                images: nextImages,
                media: { type: 'image', url: dataUrl }
            });
        }
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
            let yPos = margin;

            // Document Title
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(guide.title || 'Work Instructions', margin, yPos + 5);

            // QR Code - Top Right Corner (web-accessible URL)
            const baseUrl = window.location.origin;
            const manualId = guide.kbId || guide.id || generateId();
            const qrUrl = `${baseUrl}/#/manual/${manualId}?v=${encodeURIComponent(guide.version || '1.0')}&doc=${encodeURIComponent(guide.documentNumber || '')}&title=${encodeURIComponent(guide.title || '')}`;
            try {
                const QRCode = (await import('qrcode')).default;
                const qrDataUrl = await QRCode.toDataURL(qrUrl, {
                    width: 40,
                    margin: 1,
                    color: { dark: '#0078d4', light: '#ffffff' }
                });
                doc.addImage(qrDataUrl, 'PNG', pageWidth - margin - 11, margin, 11, 11);
                doc.setFontSize(5);
                doc.setTextColor(100, 100, 100);
                doc.text('Scan', pageWidth - margin - 5.5, margin + 12, { align: 'center' });
            } catch (qrError) {
                console.log('QR code error:', qrError);
            }

            yPos += 12;

            // Black line under title
            doc.setLineWidth(0.5);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 8;

            // Document Metadata Table
            doc.setFontSize(8);
            const cellHeight = 6;
            const labelWidth = 38;
            const valueWidth = 52;

            const drawMetaRow = (label1, value1, label2, value2, y) => {
                const x1 = margin;
                const x2 = margin + labelWidth + valueWidth;

                // Draw all rectangles first (structure)
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.1);

                // Left label cell (with gray background)
                doc.setFillColor(245, 245, 245);
                doc.rect(x1, y, labelWidth, cellHeight, 'FD');

                // Left value cell (white background)
                doc.setFillColor(255, 255, 255);
                doc.rect(x1 + labelWidth, y, valueWidth, cellHeight, 'FD');

                // Right label cell (with gray background)
                doc.setFillColor(245, 245, 245);
                doc.rect(x2, y, labelWidth, cellHeight, 'FD');

                // Right value cell (white background)
                doc.setFillColor(255, 255, 255);
                doc.rect(x2 + labelWidth, y, valueWidth, cellHeight, 'FD');

                // Now add text on top
                doc.setTextColor(0, 0, 0);

                // Left pair text
                doc.setFont(undefined, 'bold');
                doc.text(label1, x1 + 2, y + 4);
                doc.setFont(undefined, 'normal');
                doc.text(value1 || '-', x1 + labelWidth + 2, y + 4);

                // Right pair text
                doc.setFont(undefined, 'bold');
                doc.text(label2, x2 + 2, y + 4);
                doc.setFont(undefined, 'normal');
                doc.text(value2 || '-', x2 + labelWidth + 2, y + 4);
            };

            // Dynamic Metadata Rows based on headerOrder
            const fields = guide.headerOrder || DEFAULT_HEADER_ORDER;
            for (let i = 0; i < fields.length; i += 2) {
                const field1 = fields[i];
                const field2 = fields[i + 1];

                if (field1 && field2) {
                    const val1 = guide[field1.id] || '';
                    const val2 = guide[field2.id] || '';
                    drawMetaRow(field1.label, val1, field2.label, val2, yPos);
                    yPos += cellHeight;
                } else if (field1) {
                    const val1 = guide[field1.id] || '';
                    drawMetaRow(field1.label, val1, '', '', yPos);
                    yPos += cellHeight;
                }
            }

            // Description (full width)
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, yPos, labelWidth, cellHeight, 'FD');
            doc.setFillColor(255, 255, 255);
            doc.rect(margin + labelWidth, yPos, pageWidth - margin - margin - labelWidth, cellHeight, 'FD');

            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'bold');
            doc.text('Description', margin + 2, yPos + 4);
            doc.setFont(undefined, 'normal');
            const descText = doc.splitTextToSize(guide.summary || '-', pageWidth - margin - margin - labelWidth - 4);
            doc.text(descText, margin + labelWidth + 2, yPos + 4);
            yPos += cellHeight + 10;

            // Steps
            guide.steps.forEach((step, index) => {
                // Check if we need a new page
                if (yPos > pageHeight - 80) {
                    doc.addPage();
                    yPos = margin;
                }

                // Step Title (above everything)
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(`Step ${index + 1}: ${step.title}`, margin, yPos);
                yPos += 8;

                const contentStartY = yPos;
                const imageWidth = 70;
                const imageHeight = 55;
                const textStartX = margin + imageWidth + 5;
                const textWidth = pageWidth - textStartX - margin;

                // Image on the left
                if (step.media && step.media.url) {
                    try {
                        doc.addImage(step.media.url, 'JPEG', margin, yPos, imageWidth, imageHeight);
                    } catch (e) {
                        console.error('PDF Image Error', e);
                    }
                }

                // Instructions and Alerts on the right
                let textY = yPos;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);

                // Instructions
                if (step.instructions) {
                    const plainText = step.instructions.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                    if (plainText) {
                        const splitInst = doc.splitTextToSize(plainText, textWidth);
                        doc.text(splitInst, textStartX, textY);
                        textY += (splitInst.length * 4) + 3;
                    }
                }

                // Alerts/Bullets
                if (step.bullets && step.bullets.length > 0) {
                    step.bullets.forEach(b => {
                        let prefix = '';
                        let color = [0, 0, 0];

                        if (b.type === 'note') {
                            prefix = 'NOTE: ';
                            color = [0, 120, 212];
                        } else if (b.type === 'warning') {
                            prefix = 'WARNING: ';
                            color = [255, 170, 0];
                        } else if (b.type === 'caution') {
                            prefix = 'CAUTION: ';
                            color = [209, 52, 56];
                        } else {
                            prefix = '• ';
                        }

                        doc.setFont(undefined, 'bold');
                        doc.setTextColor(color[0], color[1], color[2]);
                        const prefixWidth = doc.getTextWidth(prefix);
                        doc.text(prefix, textStartX, textY);

                        doc.setFont(undefined, 'normal');
                        const bulletText = doc.splitTextToSize(b.text, textWidth - prefixWidth - 2);
                        doc.text(bulletText, textStartX + prefixWidth, textY);
                        textY += (bulletText.length * 4) + 2;
                        doc.setTextColor(0, 0, 0);
                    });
                }

                // Move yPos to the bottom of the tallest content (image or text)
                const imageBottom = contentStartY + imageHeight;
                const textBottom = textY;
                yPos = Math.max(imageBottom, textBottom) + 8;
            });

            doc.save(`${(guide.title || 'manual').replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(e);
            await showAlert('Export Error', t('manual.alerts.exportFailed', { message: e.message }));
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
            children.push(new Paragraph({ text: `Status: ${guide.status || 'Draft'}` }));
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

            // Title slide
            const titleSlide = pptx.addSlide();
            titleSlide.addText(guide.title || 'Work Instructions', {
                x: 0.5,
                y: 1.5,
                w: 9,
                h: 1.5,
                fontSize: 44,
                bold: true,
                align: 'center',
                color: '0078D4'
            });
            titleSlide.addText(`${guide.author || 'Author'} | ${guide.revisionDate || new Date().toLocaleDateString()}`, {
                x: 0.5,
                y: 3.5,
                w: 9,
                h: 0.5,
                fontSize: 18,
                align: 'center',
                color: '666666'
            });

            // Step slides
            for (let i = 0; i < guide.steps.length; i++) {
                const step = guide.steps[i];
                const slide = pptx.addSlide();

                // Step title
                slide.addText(`Step ${i + 1}: ${step.title}`, {
                    x: 0.5,
                    y: 0.3,
                    w: 9,
                    h: 0.6,
                    fontSize: 28,
                    bold: true,
                    color: '0078D4'
                });

                // Image (if available)
                if (step.media && step.media.url) {
                    slide.addImage({
                        data: step.media.url,
                        x: 0.5,
                        y: 1.2,
                        w: 4,
                        h: 3
                    });
                }

                // Instructions
                if (step.instructions) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = step.instructions;
                    const plainText = tempDiv.textContent || tempDiv.innerText || '';

                    slide.addText(plainText, {
                        x: step.media && step.media.url ? 5 : 0.5,
                        y: 1.2,
                        w: step.media && step.media.url ? 4.5 : 9,
                        h: 3,
                        fontSize: 14,
                        valign: 'top'
                    });
                }

                // Bullets
                if (step.bullets && step.bullets.length > 0) {
                    const bulletText = step.bullets.map(b => ({
                        text: `${b.type.toUpperCase()}: ${b.text}`,
                        options: { bullet: true, color: b.type === 'warning' ? 'FF0000' : b.type === 'caution' ? 'FFA500' : '0078D4' }
                    }));

                    slide.addText(bulletText, {
                        x: 0.5,
                        y: 4.5,
                        w: 9,
                        h: 2,
                        fontSize: 12
                    });
                }
            }

            await pptx.writeFile({ fileName: `${(guide.title || 'manual').replace(/\s+/g, '_')}.pptx` });
        } catch (e) {
            console.error(e);
            await showAlert('Export Error', t('manual.alerts.powerPointExportFailed', { message: e.message }));
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

    const activeStep = guide.steps.find(s => s.id === activeStepId);
    const operatorCurrentStep = guide.steps[operatorStepIndex] || null;
    const operatorStepDataFields = getStepDataCaptureFields(operatorCurrentStep);
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

                <div style={{ display: 'flex', gap: '4px' }}>
                    <button onClick={handleSaveManual} className="btn-icon-label" title={tt('common.save', 'Save')} style={{ color: '#16a34a' }}>
                        <Save size={18} />
                    </button>
                    <button onClick={handleLoadManualsList} className="btn-icon-label" title={tt('common.open', 'Open')}>
                        <FolderOpen size={18} />
                    </button>
                    <button onClick={() => setIsPreviewMode(!isPreviewMode)} className="btn-icon-label" title={tt('common.preview', 'Preview')} style={{ color: isPreviewMode ? '#3b82f6' : 'inherit' }}>
                        {isPreviewMode ? <Layout size={18} /> : <Eye size={18} />}
                    </button>
                    <button onClick={handleCreateVersion} className="btn-icon-label" title={tt('manual.createVersionSnapshot', 'New Version')} style={{ color: '#93c5fd' }}>
                        <Layers size={18} />
                    </button>
                    <button onClick={() => setShowEmbedModal(true)} className="btn-icon-label" title={t('manual.embedGuide')} style={{ color: '#a78bfa' }}>
                        <Code size={18} />
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

                <div style={{ height: '24px', width: '1px', background: 'var(--mc-divider)' }} />

                {/* Tabs - The Landscape Optimizer */}
                <div style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
                    {[
                        { id: 'intro', label: 'Introduction', icon: BookOpen },
                        { id: 'info', label: 'Details', icon: Info },
                        { id: 'edit', label: 'Guide Steps', icon: List },
                        { id: 'management', label: 'Approval Process', icon: Shield },
                        { id: 'history', label: 'History', icon: Activity }
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
                            style={{ fontSize: '0.75rem', padding: '4px 28px 4px 10px', minWidth: '115px', height: '32px' }}
                            title="Manual Creation Theme"
                        >
                            <option value="dark">Dark Mode</option>
                            <option value="light">Light Mode</option>
                            <option value="colorful">Colorful</option>
                        </select>
                        {uiTheme === 'light' ? (
                            <Sun size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', opacity: 0.7 }} />
                        ) : uiTheme === 'colorful' ? (
                            <Palette size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', opacity: 0.7 }} />
                        ) : (
                            <Moon size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', opacity: 0.7 }} />
                        )}
                    </div>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={guide.workflow?.status || guide.status || 'Draft'}
                            onChange={(e) => handleWorkflowStatusChange(e.target.value)}
                            className="pro-select"
                            style={{ fontSize: '0.75rem', padding: '4px 28px 4px 10px', minWidth: '100px', height: '32px' }}
                        >
                            {WORKFLOW_STATUSES.map((statusItem) => (
                                <option key={statusItem} value={statusItem}>{getWorkflowStatusLabel(statusItem)}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', opacity: 0.5 }} />
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
                            style={{ fontSize: '0.75rem', padding: '4px 28px 4px 10px', minWidth: '100px', height: '32px' }}
                        >
                            <option value="">Export</option>
                            <option value="pdf">PDF</option>
                            <option value="word">Word</option>
                            <option value="pptx">PPTX</option>
                        </select>
                        <FileDown size={12} style={{ position: 'absolute', right: '8px', pointerEvents: 'none', opacity: 0.5 }} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>
                            {currentUserName.charAt(0)}
                        </div>
                        <select
                            value={currentUserRole}
                            onChange={(e) => setCurrentUserRole(e.target.value)}
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
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '20px' }}>
                        {isOperatorMode ? (
                            <div style={{ padding: '0 40px 60px 40px', maxWidth: '1000px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.4s ease' }}>
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

                                        <div style={{ display: 'grid', gridTemplateColumns: (operatorCurrentStep.images?.length > 0 || operatorCurrentStep.media?.url) ? '1.2fr 1fr' : '1fr', gap: '32px', marginBottom: '24px' }}>
                                            {/* Left: Images */}
                                            {(operatorCurrentStep.images?.length > 0 || operatorCurrentStep.media?.url) && (
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
                                                        {operatorCurrentStep.media?.type === 'youtube' && operatorCurrentStep.media.youtubeUrl && (
                                                            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000', height: '100%' }}>
                                                                <iframe
                                                                    src={operatorCurrentStep.media.youtubeUrl.replace('watch?v=', 'embed/').split('&')[0]}
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
                                            return (
                                                <div key={step.id || idx} className="dozuki-step-card">
                                                    {/* Media Side */}
                                                    <div style={{ position: 'relative' }}>
                                                        {step.media && step.media.url ? (
                                                            <div style={{ width: '100%', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', background: '#000' }}>
                                                                {step.media.type === 'video' ? (
                                                                    <video src={step.media.url} style={{ width: '100%', display: 'block' }} controls />
                                                                ) : (
                                                                    <img src={step.media.url} alt={step.title} style={{ width: '100%', display: 'block' }} />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div style={{ width: '100%', aspectRatio: '4/3', borderRadius: '20px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                                                <VideoOff size={32} />
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

                                                        <div
                                                            style={{ fontSize: '1.1rem', lineHeight: '1.8', marginBottom: '24px', color: uiTheme === 'light' ? '#475569' : 'rgba(255,255,255,0.8)' }}
                                                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                                                        />

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
                                            <button onClick={handleOperatorNext} className="btn-pro" style={{ padding: '12px 32px', backgroundColor: '#3b82f6', color: '#fff', border: 'none' }}>
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
                                            <StepList
                                                steps={guide.steps}
                                                activeStepId={activeStepId}
                                                onSelectStep={handleStepSelect}
                                                onAddStep={handleAddStep}
                                                onEditStep={handleEditStep}
                                                onDeleteStep={handleDeleteStep}
                                                horizontal={true}
                                            />
                                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '12px', backgroundColor: 'rgba(0, 0, 0, 0.15)' }}>
                                                <div style={{ opacity: canEditManual ? 1 : 0.65, pointerEvents: canEditManual ? 'auto' : 'none' }}>
                                                    <StepEditor
                                                        step={activeStep}
                                                        onChange={handleStepChange}
                                                        onCaptureImage={handleCaptureFrame}
                                                        onAiImprove={handleAiImprove}
                                                        onAiGenerate={handleAiGenerate}
                                                        onAiGenerateFromVideo={handleVideoAiGenerate}
                                                        isAiLoading={isAiLoading}
                                                        activeImageIndex={activeImageIndex}
                                                        setActiveImageIndex={setActiveImageIndex}
                                                        onSave={handleSaveManual}
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
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'management' && (
                                    <div style={{ display: 'grid', gap: '16px', animation: 'fadeIn 0.3s' }}>
                                        <div className="glass-panel" style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Approval Matrix</div>
                                            {/* Summary list instead of full table to save space */}
                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                {(guide.approvalMatrix || []).map(level => (
                                                    <div key={level.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                        <span>L{level.level} {level.role}</span>
                                                        <span style={{ opacity: 0.6 }}>{level.approverName}</span>
                                                    </div>
                                                ))}
                                                <button onClick={handleAddApprovalLevel} className="btn-pro" style={{ marginTop: '8px', fontSize: '0.75rem' }}><Plus size={12} /> Add Level</button>
                                            </div>
                                        </div>

                                        <div className="glass-panel" style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Compliance</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Completion</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{completionRate}%</div>
                                                </div>
                                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                                    <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>Compliance</div>
                                                    <div style={{ fontSize: '1.1rem', fontWeight: '700' }}>{firstPassCompliance}%</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="glass-panel" style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>Assignments</div>
                                                <button onClick={handleAddAssignment} className="btn-pro" style={{ fontSize: '0.75rem' }}><Plus size={12} /></button>
                                            </div>
                                            <span style={{ fontSize: '0.85rem', opacity: 0.6 }}>{assignments.length} assignments active.</span>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'history' && (
                                    <div style={{ display: 'grid', gap: '16px', animation: 'fadeIn 0.3s' }}>
                                        <div className="glass-panel" style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Version History</div>
                                            <div style={{ display: 'grid', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                                {(guide.versionHistory || []).map(v => (
                                                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', fontSize: '0.8rem' }}>
                                                        <span>v{v.version} - {v.summary}</span>
                                                        <button onClick={() => handleRestoreVersion(v)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer' }}>Restore</button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="glass-panel" style={{ padding: '16px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '12px' }}>Audit Trail</div>
                                            <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{(guide.auditTrail || []).length} events recorded.</div>
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
