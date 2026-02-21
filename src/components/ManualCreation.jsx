import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAllProjects } from '../utils/database';
import { addKnowledgeBaseItem, updateKnowledgeBaseItem, getAllKnowledgeBaseItems, getKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
import { upsertManual, listManuals } from '../utils/tursoAPI';
import HelpButton from './HelpButton';
import { helpContent } from '../utils/helpContent.jsx';
import GuideHeader from './manual/GuideHeader';
import StepList from './manual/StepList';
import StepEditor from './manual/StepEditor';
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
    Cpu, Loader2, BarChart3, Settings, Book, Layout,
    Eye, Save, FolderOpen, FileDown, Globe, Layers,
    ChevronDown, Trash2, Plus, Info, Video, CheckCircle,
    Activity, Shield, Play, VideoOff, X
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProject } from '../contexts/ProjectContext';
import { useDialog } from '../contexts/DialogContext';

const generateId = () => Math.random().toString(36).substr(2, 9);
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
            'manual.alerts.wordImportFailed': 'Word import failed: {{message}}'
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
            'manual.statuses.released': 'Dirilis'
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
            'manual.statuses.released': '公開済み'
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
        steps: []
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
            steps: manual?.steps || contentObj?.steps || manual?.content || []
        };
    };

    const [guide, setGuide] = useState(createDefaultGuide());

    const [activeStepId, setActiveStepId] = useState(null);
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

    // Advanced AI State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [geminiVideoUri, setGeminiVideoUri] = useState(null);
    const [isFullAIAnalyzing, setIsFullAIAnalyzing] = useState(false);
    const [rawVideoFile, setRawVideoFile] = useState(null);
    const [currentUserName, setCurrentUserName] = useState('User 1');
    const [currentUserRole, setCurrentUserRole] = useState('Author');

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
                        steps: newSteps
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
        setOperatorStepIndex(prev => Math.max(prev - 1, 0));
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
                updatedAt: new Date().toISOString()
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
            let cloudManuals = [];
            try {
                cloudManuals = await listManuals();
            } catch {
                cloudManuals = [];
            }

            const items = await getAllKnowledgeBaseItems();
            const localManuals = items.filter(item => item.type === 'manual');

            const mergedMap = new Map();
            [...cloudManuals, ...localManuals].forEach((m) => {
                const key = String(m.cloudId || m.cloud_id || m.id);
                if (!mergedMap.has(key)) mergedMap.set(key, m);
            });

            const manuals = Array.from(mergedMap.values());
            setSavedManuals(manuals);
            setShowOpenDialog(true);
        } catch (error) {
            console.error('Error loading manuals list:', error);
            await showAlert('Error', t('manual.alerts.loadManualsFailed'));
        }
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
            steps: [...prev.steps, newStep]
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

    const handleStepChange = (id, updatedStep) => {
        setGuide(prev => ({
            ...prev,
            steps: prev.steps.map(s => s.id === id ? updatedStep : s)
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
                ...guide.steps.find(s => s.id === stepId),
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
                    setGuide(prev => ({ ...prev, steps: formattedSteps }));
                    if (formattedSteps.length > 0) setActiveStepId(formattedSteps[0].id);
                } else if (await showConfirm(t('manual.alerts.confirmAppendSteps', { count: formattedSteps.length }))) {
                    setGuide(prev => ({ ...prev, steps: [...prev.steps, ...formattedSteps] }));
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
                    ...currentStep,
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
                ...currentStep,
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
            handleStepChange(activeStepId, {
                ...currentStep,
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
                    steps: [...prev.steps, ...newSteps]
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
                        steps: [...prev.steps, ...newSteps]
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

    const activeStep = guide.steps.find(s => s.id === activeStepId);
    const operatorCurrentStep = guide.steps[operatorStepIndex] || null;
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

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0a0a0c', color: '#fff', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .glass-panel {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
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
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }
                .btn-pro:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .btn-pro:active { transform: translateY(0); }
                .pro-select {
                    background: rgba(255, 255, 255, 0.04);
                    color: #fff;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 8px 14px;
                    font-size: 0.85rem;
                    outline: none;
                    transition: all 0.2s;
                    cursor: pointer;
                }
                .pro-select:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                }
                .pro-select:focus {
                    border-color: #3b82f6;
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
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.7);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon-label:hover {
                    background: rgba(255, 255, 255, 0.1);
                    color: #fff;
                    border-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
            {/* Top Bar */}
            <div style={{
                height: '64px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 24px',
                backgroundColor: 'rgba(20, 20, 25, 0.8)',
                backdropFilter: 'blur(10px)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginRight: 'auto' }}>
                    <div style={{
                        width: '36px', height: '36px',
                        background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                        borderRadius: '10px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                    }}>
                        <Book size={20} />
                    </div>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
                        {tt('manual.creator', 'Manual Creator')}
                    </h2>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {/* Toggle Preview */}
                    <button
                        onClick={() => setIsPreviewMode(!isPreviewMode)}
                        className="btn-pro"
                        style={{
                            backgroundColor: isPreviewMode ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            color: isPreviewMode ? '#60a5fa' : 'white',
                            border: isPreviewMode ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            minWidth: '130px',
                            justifyContent: 'center'
                        }}
                    >
                        {isPreviewMode ? <Layout size={16} /> : <Eye size={16} />}
                        {isPreviewMode ? tt('common.edit', 'Edit Mode') : tt('common.preview', 'Preview Mode')}
                    </button>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

                    <button
                        onClick={handleSaveManual}
                        className="btn-pro"
                        style={{ backgroundColor: '#16a34a', color: 'white', border: 'none' }}
                        title={tt('common.save', 'Save')}
                    >
                        <Save size={16} />
                        {tt('common.save', 'Save')}
                    </button>
                    <button
                        onClick={handleLoadManualsList}
                        className="btn-pro"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'white' }}
                        title={tt('common.open', 'Open')}
                    >
                        <FolderOpen size={16} />
                        {tt('common.open', 'Open')}
                    </button>

                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={guide.workflow?.status || guide.status || 'Draft'}
                            onChange={(e) => handleWorkflowStatusChange(e.target.value)}
                            className="pro-select"
                            style={{ paddingRight: '32px', minWidth: '135px' }}
                        >
                            {WORKFLOW_STATUSES.map((statusItem) => (
                                <option key={statusItem} value={statusItem}>{getWorkflowStatusLabel(statusItem)}</option>
                            ))}
                        </select>
                        <Activity size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.4)' }} />
                    </div>

                    <button
                        onClick={handleCreateVersion}
                        className="btn-pro"
                        style={{ backgroundColor: 'rgba(37, 99, 235, 0.15)', color: '#93c5fd', borderColor: 'rgba(59, 130, 246, 0.35)' }}
                        title={tt('manual.createVersionSnapshot', 'Create Version Snapshot')}
                    >
                        <Layers size={16} />
                        {tt('manual.newVersion', 'New Ver')}
                    </button>

                    <button
                        onClick={() => {
                            setIsOperatorMode(prev => {
                                const next = !prev;
                                if (next) setOperatorStepIndex(0);
                                return next;
                            });
                        }}
                        className="btn-pro"
                        style={{
                            backgroundColor: isOperatorMode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            color: isOperatorMode ? '#6ee7b7' : 'white',
                            borderColor: isOperatorMode ? 'rgba(16, 185, 129, 0.35)' : 'rgba(255, 255, 255, 0.1)'
                        }}
                    >
                        <Play size={16} />
                        {isOperatorMode ? tt('manual.operatorOn', 'Operator ON') : tt('manual.operator', 'Operator')}
                    </button>



                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

                    {/* Export Select */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            onChange={(e) => {
                                const format = e.target.value;
                                if (format === 'pdf') exportToPDF();
                                else if (format === 'word') exportToWord();
                                else if (format === 'pptx') exportToPowerPoint();
                                e.target.value = ''; // Reset
                            }}
                            disabled={!selectedProject}
                            className="pro-select"
                            style={{ paddingRight: '32px', minWidth: '140px' }}
                        >
                            <option value="">{tt('common.exportAs', 'Export As...')}</option>
                            <option value="pdf">📄 {tt('manual.exportPdfDocument', 'PDF Document')}</option>
                            <option value="word">📝 {tt('manual.exportWordDocument', 'MS Word (.docx)')}</option>
                            <option value="pptx">📊 {tt('manual.exportPowerPoint', 'PowerPoint (.pptx)')}</option>
                        </select>
                        <FileDown size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.4)' }} />
                    </div>

                    {/* Language Select */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={generationLanguage}
                            onChange={(e) => setGenerationLanguage(e.target.value)}
                            className="pro-select"
                            style={{ paddingRight: '32px', minWidth: '110px' }}
                        >
                            <option value="English">🇺🇸 EN</option>
                            <option value="Indonesian">🇮🇩 ID</option>
                            <option value="Japanese">🇯🇵 JA</option>
                            <option value="Korean">🇰🇷 KR</option>
                            <option value="Chinese">🇨🇳 ZH</option>
                        </select>
                        <Globe size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.4)' }} />
                    </div>

                    {/* Layout Select */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={layoutTemplate}
                            onChange={(e) => setLayoutTemplate(e.target.value)}
                            className="pro-select"
                            style={{ paddingRight: '32px', minWidth: '130px' }}
                        >
                            <option value="standard">📐 {tt('manual.layoutStandard', 'Standard')}</option>
                            <option value="compact">📋 {tt('manual.layoutCompact', 'Compact')}</option>
                            <option value="one-per-page">📄 {tt('manual.layoutSinglePage', 'Single Page')}</option>
                        </select>
                        <Layers size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.4)' }} />
                    </div>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 4px' }} />

                    {/* Project Select */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            className="pro-select"
                            style={{ paddingRight: '32px', minWidth: '160px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.3)' }}
                        >
                            <option value="">{tt('common.selectProject', 'Select Project')}</option>
                            {projects.map(p => (
                                <option key={p.projectName} value={p.projectName}>{p.projectName}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} style={{ position: 'absolute', right: '12px', pointerEvents: 'none', color: '#60a5fa' }} />
                    </div>

                    <input
                        className="pro-select"
                        value={currentUserName}
                        onChange={(e) => setCurrentUserName(e.target.value)}
                        placeholder={tt('manual.user', 'User')}
                        style={{ minWidth: '120px' }}
                    />
                    <select
                        value={currentUserRole}
                        onChange={(e) => setCurrentUserRole(e.target.value)}
                        className="pro-select"
                        style={{ minWidth: '120px' }}
                    >
                        {USER_ROLES.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>

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

                                        {operatorCurrentStep.media?.url && (
                                            <img
                                                src={operatorCurrentStep.media.url}
                                                alt={operatorCurrentStep.title}
                                                style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '12px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.1)' }}
                                            />
                                        )}

                                        {operatorCurrentStep.instructions && (
                                            <div
                                                style={{ lineHeight: '1.8', color: 'rgba(255,255,255,0.9)', marginBottom: '16px' }}
                                                dangerouslySetInnerHTML={{ __html: operatorCurrentStep.instructions }}
                                            />
                                        )}

                                        {operatorCurrentStep.bullets?.length > 0 && (
                                            <div style={{ display: 'grid', gap: '8px', marginBottom: '20px' }}>
                                                {operatorCurrentStep.bullets.map((b, idx) => (
                                                    <div key={`${operatorCurrentStep.id}-bullet-${idx}`} style={{
                                                        padding: '10px 12px',
                                                        borderRadius: '10px',
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        borderLeft: `4px solid ${b.type === 'warning' ? '#f59e0b' : b.type === 'caution' ? '#ef4444' : '#3b82f6'}`
                                                    }}>
                                                        <strong style={{ textTransform: 'uppercase', fontSize: '0.72rem', opacity: 0.9 }}>{b.type}</strong>
                                                        <div style={{ marginTop: '4px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.85)' }}>{b.text}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

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
                                                disabled={operatorStepIndex >= operatorTotalSteps - 1}
                                                className="btn-pro"
                                                style={{
                                                    opacity: operatorStepIndex >= operatorTotalSteps - 1 ? 0.4 : 1,
                                                    cursor: operatorStepIndex >= operatorTotalSteps - 1 ? 'not-allowed' : 'pointer',
                                                    backgroundColor: 'rgba(37,99,235,0.18)',
                                                    color: '#93c5fd',
                                                    borderColor: 'rgba(59,130,246,0.35)'
                                                }}
                                            >
                                                {tt('manual.next', 'Next')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="glass-panel" style={{ padding: '28px', textAlign: 'center', color: 'rgba(255,255,255,0.55)' }}>
                                        {tt('manual.noOperatorSteps', 'No steps available for operator mode.')}
                                    </div>
                                )}
                            </div>
                        ) : isPreviewMode ? (
                            <div style={{ padding: '0 40px 80px 40px', maxWidth: '1000px', margin: '0 auto', animation: 'fadeIn 0.6s ease' }}>
                                {/* Modern Digital Header */}
                                <div className="glass-panel" style={{ padding: '48px', marginBottom: '32px', textAlign: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                                    <div style={{
                                        width: '64px', height: '64px',
                                        borderRadius: '16px',
                                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#60a5fa',
                                        margin: '0 auto 24px auto'
                                    }}>
                                        <Book size={32} />
                                    </div>
                                    <h1 style={{ fontSize: '3rem', fontWeight: '900', color: '#fff', margin: '0 0 16px 0', letterSpacing: '-0.04em' }}>
                                        {guide.title || tt('manual.workInstructions', 'Work Instructions')}
                                    </h1>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
                                            <Shield size={14} style={{ color: '#60a5fa' }} />
                                            {guide.documentNumber || 'NO-DOC'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
                                            <Activity size={14} style={{ color: '#10b981' }} />
                                            {getWorkflowStatusLabel(guide.status || 'Draft')}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
                                            <FileText size={14} style={{ color: '#f59e0b' }} />
                                            v{guide.version || '1.0'}
                                        </div>
                                    </div>

                                    {guide.id && (
                                        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                padding: '12px',
                                                backgroundColor: '#fff',
                                                borderRadius: '16px',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
                                            }}>
                                                {QRCodePreviewComponent ? (
                                                    <QRCodePreviewComponent value={manualPublicLink} size={100} />
                                                ) : qrPreviewDataUrl ? (
                                                    <img src={qrPreviewDataUrl} alt="Manual QR" style={{ width: '100px', height: '100px', display: 'block' }} />
                                                ) : (
                                                    <div style={{ width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '0.75rem' }}>
                                                        QR
                                                    </div>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700' }}>
                                                {tt('manual.scanForMobile', 'Scan for Digital Access')}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Digital Step Cards */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                                    {guide.steps.map((step, idx) => (
                                        <div key={step.id} className="glass-panel" style={{ overflow: 'hidden', padding: 0 }}>
                                            <div style={{
                                                padding: '24px 32px',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'rgba(255, 255, 255, 0.02)'
                                            }}>
                                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#fff' }}>
                                                    <span style={{ color: 'rgba(255, 255, 255, 0.2)', marginRight: '12px' }}>{String(idx + 1).padStart(2, '0')}</span>
                                                    {step.title}
                                                </h3>
                                                {step.duration && (
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        color: '#60a5fa',
                                                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontWeight: '700'
                                                    }}>
                                                        {step.duration}s
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: step.media?.url ? '1fr 1fr' : '1fr', gap: '32px', padding: '32px' }}>
                                                {step.media && step.media.url && (
                                                    <div style={{ position: 'relative' }}>
                                                        <img
                                                            src={step.media.url}
                                                            alt={step.title}
                                                            style={{
                                                                width: '100%',
                                                                borderRadius: '16px',
                                                                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                                                                border: '1px solid rgba(255, 255, 255, 0.1)'
                                                            }}
                                                        />
                                                        <div style={{
                                                            position: 'absolute', top: '16px', right: '16px',
                                                            width: '32px', height: '32px',
                                                            borderRadius: '50%', background: 'rgba(0,0,0,0.5)',
                                                            backdropFilter: 'blur(4px)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: '#fff'
                                                        }}>
                                                            <Eye size={16} />
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                    {step.instructions && (
                                                        <div
                                                            style={{
                                                                lineHeight: '1.8',
                                                                color: 'rgba(255, 255, 255, 0.8)',
                                                                fontSize: '1.05rem'
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: step.instructions }}
                                                        />
                                                    )}

                                                    {step.bullets && step.bullets.length > 0 && (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            {step.bullets.map((b, i) => (
                                                                <div key={i} style={{
                                                                    padding: '16px',
                                                                    borderRadius: '12px',
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                                                    borderLeft: `4px solid ${b.type === 'note' ? '#3b82f6' : b.type === 'warning' ? '#f59e0b' : b.type === 'caution' ? '#ef4444' : '#6b7280'}`,
                                                                    display: 'flex',
                                                                    gap: '12px',
                                                                    alignItems: 'flex-start'
                                                                }}>
                                                                    <div style={{ color: b.type === 'note' ? '#3b82f6' : b.type === 'warning' ? '#f59e0b' : b.type === 'caution' ? '#ef4444' : '#6b7280' }}>
                                                                        {b.type === 'note' ? <Info size={16} /> : b.type === 'warning' ? <Shield size={16} /> : b.type === 'caution' ? <Shield size={16} /> : <FileText size={16} />}
                                                                    </div>
                                                                    <span style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>{b.text}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', animation: 'slideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
                                <div style={{ width: '280px', borderRight: '1px solid rgba(255, 255, 255, 0.08)', overflowY: 'auto', backgroundColor: 'rgba(255, 255, 255, 0.01)' }}>
                                    <StepList steps={guide.steps} activeStepId={activeStepId} onSelectStep={handleStepSelect} onAddStep={handleAddStep} onDeleteStep={handleDeleteStep} />
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '24px', backgroundColor: 'rgba(0, 0, 0, 0.2)' }}>
                                    <div className="glass-panel" style={{ padding: '24px' }}>
                                        <div style={{ opacity: canEditManual ? 1 : 0.65, pointerEvents: canEditManual ? 'auto' : 'none' }}>
                                            <GuideHeader headerInfo={guide} onChange={(info) => setGuide(prev => ({ ...prev, ...info }))} />
                                        </div>
                                        <div style={{ margin: '24px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />

                                        <div className="glass-panel" style={{ padding: '12px', marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>SOP QR Access</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#93c5fd', marginTop: '4px', wordBreak: 'break-all' }}>{manualPublicLink}</div>
                                                </div>
                                                <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fff' }}>
                                                    {QRCodePreviewComponent ? (
                                                        <QRCodePreviewComponent value={manualPublicLink} size={88} />
                                                    ) : qrPreviewDataUrl ? (
                                                        <img src={qrPreviewDataUrl} alt="SOP QR" style={{ width: '88px', height: '88px', display: 'block' }} />
                                                    ) : (
                                                        <div style={{ width: '88px', height: '88px', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>QR</div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {activeStep && (
                                            <div className="glass-panel" style={{ padding: '12px', marginBottom: '16px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                                    <div>
                                                        <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>Step/Station QR Deep Link</div>
                                                        <div style={{ fontSize: '0.85rem', color: '#fff', marginTop: '4px' }}>
                                                            {guide.steps.findIndex(s => s.id === activeStep.id) + 1}. {activeStep.title || 'Untitled Step'}
                                                        </div>
                                                        <div style={{ fontSize: '0.78rem', color: '#93c5fd', marginTop: '4px', wordBreak: 'break-all' }}>
                                                            {buildStepPublicLink(activeStep, Math.max(guide.steps.findIndex(s => s.id === activeStep.id), 0))}
                                                        </div>
                                                    </div>
                                                    <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#fff' }}>
                                                        {QRCodePreviewComponent ? (
                                                            <QRCodePreviewComponent
                                                                value={buildStepPublicLink(activeStep, Math.max(guide.steps.findIndex(s => s.id === activeStep.id), 0))}
                                                                size={88}
                                                            />
                                                        ) : qrPreviewDataUrl ? (
                                                            <img src={qrPreviewDataUrl} alt="Step QR" style={{ width: '88px', height: '88px', display: 'block' }} />
                                                        ) : (
                                                            <div style={{ width: '88px', height: '88px', color: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>QR</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Workflow + Version History */}
                                        <div style={{ marginBottom: '24px', display: 'grid', gap: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>Workflow</div>
                                                    <div style={{ marginTop: '4px', fontWeight: '700' }}>{getWorkflowStatusLabel(guide.workflow?.status || guide.status || 'Draft')}</div>
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>
                                                    Updated by {guide.workflow?.updatedBy || 'System'} • {guide.workflow?.updatedAt ? new Date(guide.workflow.updatedAt).toLocaleString() : '-'}
                                                </div>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                    <strong style={{ fontSize: '0.9rem' }}>Version History</strong>
                                                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{guide.versionHistory?.length || 0} snapshots</span>
                                                </div>

                                                {(guide.versionHistory || []).length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No snapshots yet. Click "New Ver" to create version snapshot.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                                        {guide.versionHistory.map((v) => (
                                                            <div key={v.id} style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                backgroundColor: 'rgba(255,255,255,0.03)',
                                                                border: '1px solid rgba(255,255,255,0.08)',
                                                                borderRadius: '10px',
                                                                padding: '8px 10px'
                                                            }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.84rem', fontWeight: '700' }}>v{v.version} — {v.summary || 'Snapshot'}</div>
                                                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>{v.updatedBy || 'System'} • {v.updatedAt ? new Date(v.updatedAt).toLocaleString() : '-'}</div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleRestoreVersion(v)}
                                                                    className="btn-pro"
                                                                    style={{
                                                                        padding: '6px 10px',
                                                                        fontSize: '0.75rem',
                                                                        backgroundColor: 'rgba(59,130,246,0.14)',
                                                                        color: '#93c5fd',
                                                                        borderColor: 'rgba(59,130,246,0.35)'
                                                                    }}
                                                                >
                                                                    Restore
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Template Fields (Tools / Parts / PPE) */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>
                                                Template Fields
                                            </div>

                                            <div style={{ display: 'grid', gap: '12px' }}>
                                                {[
                                                    { key: 'tools', title: 'Tools' },
                                                    { key: 'parts', title: 'Parts' },
                                                    { key: 'ppe', title: 'PPE' }
                                                ].map(section => (
                                                    <div key={section.key} className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                            <strong style={{ fontSize: '0.9rem' }}>{section.title}</strong>
                                                            <button
                                                                onClick={() => addTemplateItem(section.key)}
                                                                className="btn-pro"
                                                                style={{
                                                                    padding: '6px 10px',
                                                                    fontSize: '0.75rem',
                                                                    backgroundColor: 'rgba(16,185,129,0.15)',
                                                                    color: '#6ee7b7',
                                                                    borderColor: 'rgba(16,185,129,0.35)'
                                                                }}
                                                            >
                                                                <Plus size={12} /> Add
                                                            </button>
                                                        </div>

                                                        {(guide.templateFields?.[section.key] || []).length === 0 ? (
                                                            <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No {section.title.toLowerCase()} added.</div>
                                                        ) : (
                                                            <div style={{ display: 'grid', gap: '8px' }}>
                                                                {(guide.templateFields?.[section.key] || []).map((item, idx) => (
                                                                    <div key={`${section.key}-${idx}`} style={{ display: 'grid', gap: '6px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px' }}>
                                                                        {section.key === 'tools' && (
                                                                            <>
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Tool name" value={item.name || ''} onChange={(e) => updateTemplateItem('tools', idx, 'name', e.target.value)} />
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Qty" value={item.qty || ''} onChange={(e) => updateTemplateItem('tools', idx, 'qty', e.target.value)} />
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Note" value={item.note || ''} onChange={(e) => updateTemplateItem('tools', idx, 'note', e.target.value)} />
                                                                            </>
                                                                        )}
                                                                        {section.key === 'parts' && (
                                                                            <>
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Part No" value={item.partNo || ''} onChange={(e) => updateTemplateItem('parts', idx, 'partNo', e.target.value)} />
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Part name" value={item.name || ''} onChange={(e) => updateTemplateItem('parts', idx, 'name', e.target.value)} />
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Qty" value={item.qty || ''} onChange={(e) => updateTemplateItem('parts', idx, 'qty', e.target.value)} />
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="Note" value={item.note || ''} onChange={(e) => updateTemplateItem('parts', idx, 'note', e.target.value)} />
                                                                            </>
                                                                        )}
                                                                        {section.key === 'ppe' && (
                                                                            <>
                                                                                <input className="pro-select" style={{ width: '100%' }} placeholder="PPE name" value={item.name || ''} onChange={(e) => updateTemplateItem('ppe', idx, 'name', e.target.value)} />
                                                                                <label style={{ fontSize: '0.8rem', display: 'flex', gap: '8px', alignItems: 'center', color: 'rgba(255,255,255,0.75)' }}>
                                                                                    <input type="checkbox" checked={Boolean(item.mandatory)} onChange={(e) => updateTemplateItem('ppe', idx, 'mandatory', e.target.checked)} />
                                                                                    Mandatory
                                                                                </label>
                                                                            </>
                                                                        )}

                                                                        <button
                                                                            onClick={() => removeTemplateItem(section.key, idx)}
                                                                            className="btn-pro"
                                                                            style={{
                                                                                width: 'fit-content',
                                                                                padding: '6px 10px',
                                                                                fontSize: '0.75rem',
                                                                                backgroundColor: 'rgba(239,68,68,0.15)',
                                                                                color: '#fca5a5',
                                                                                borderColor: 'rgba(239,68,68,0.35)'
                                                                            }}
                                                                        >
                                                                            <Trash2 size={12} /> Remove
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* P2: Approval Matrix */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Approval Matrix
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button className="btn-pro" onClick={handleAddApprovalLevel} disabled={!canEditManual} title={!canEditManual ? 'Author/Admin only' : ''} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)', opacity: canEditManual ? 1 : 0.5 }}>
                                                        <Plus size={12} /> Add Level
                                                    </button>
                                                    <button className="btn-pro" onClick={handleSubmitForApproval} disabled={!canSubmitApproval} title={!canSubmitApproval ? 'Author/Admin only' : ''} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(59,130,246,0.14)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.35)', opacity: canSubmitApproval ? 1 : 0.5 }}>
                                                        Submit Approval
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', display: 'grid', gap: '8px' }}>
                                                {(guide.approvalMatrix || []).map(level => (
                                                    <div key={level.id} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 90px auto', gap: '8px', alignItems: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>L{level.level}</div>
                                                        <input className="pro-select" placeholder="Role" value={level.role || ''} onChange={(e) => handleUpdateApprovalLevel(level.id, 'role', e.target.value)} />
                                                        <input className="pro-select" placeholder="Approver" value={level.approverName || ''} onChange={(e) => handleUpdateApprovalLevel(level.id, 'approverName', e.target.value)} />
                                                        <input className="pro-select" placeholder="SLA(h)" value={level.slaHours || ''} onChange={(e) => handleUpdateApprovalLevel(level.id, 'slaHours', e.target.value)} />
                                                        <button className="btn-pro" onClick={() => handleRemoveApprovalLevel(level.id)} style={{ padding: '6px 8px', fontSize: '0.72rem', backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}>
                                                            <Trash2 size={12} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {(guide.approvalRequests || []).length > 0 && (
                                                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'grid', gap: '8px' }}>
                                                        {(guide.approvalRequests || []).map(req => (
                                                            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem' }}>L{req.level} • {req.role || '-'} • {req.approverName || 'Unassigned'} • <strong>{req.status}</strong></div>
                                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                                    {req.status === 'Pending' && (
                                                                        <>
                                                                            <button className="btn-pro" disabled={!canApprove} title={!canApprove ? 'Approver/Admin only' : ''} onClick={() => handleApprovalAction(req.id, 'Approved')} style={{ padding: '5px 8px', fontSize: '0.72rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)', opacity: canApprove ? 1 : 0.5 }}>Approve</button>
                                                                            <button className="btn-pro" disabled={!canApprove} title={!canApprove ? 'Approver/Admin only' : ''} onClick={() => handleApprovalAction(req.id, 'Rejected')} style={{ padding: '5px 8px', fontSize: '0.72rem', backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)', opacity: canApprove ? 1 : 0.5 }}>Reject</button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sprint Next: Inline Comments */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Inline Comments (per step)
                                                </div>
                                                <button
                                                    className="btn-pro"
                                                    onClick={() => activeStep && handleAddInlineComment(activeStep.id)}
                                                    disabled={!activeStep}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '0.75rem',
                                                        opacity: activeStep ? 1 : 0.5,
                                                        backgroundColor: 'rgba(59,130,246,0.14)',
                                                        color: '#93c5fd',
                                                        borderColor: 'rgba(59,130,246,0.35)'
                                                    }}
                                                >
                                                    <Plus size={12} /> Add Comment
                                                </button>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                {(guide.stepComments || []).filter(c => c.stepId === activeStep?.id).length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No comments for current step.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px' }}>
                                                        {(guide.stepComments || []).filter(c => c.stepId === activeStep?.id).map(c => (
                                                            <div key={c.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{c.reviewer} • {c.status}</div>
                                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.72)', marginTop: '4px' }}>{c.comment}</div>
                                                                {c.status === 'Open' && (
                                                                    <button className="btn-pro" onClick={() => handleResolveInlineComment(c.id)} style={{ marginTop: '8px', padding: '5px 8px', fontSize: '0.72rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' }}>
                                                                        Resolve
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sprint Next: Issue Reporting */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Issue Reporting
                                                </div>
                                                <button className="btn-pro" disabled={!canReportIssue} title={!canReportIssue ? 'Not allowed for this role' : ''} onClick={() => handleReportIssue(activeStep?.id || 'manual')} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(239,68,68,0.14)', color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)', opacity: canReportIssue ? 1 : 0.5 }}>
                                                    <Plus size={12} /> Report Issue
                                                </button>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                {(guide.issueReports || []).length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No issues reported.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                                                        {(guide.issueReports || []).map(issue => (
                                                            <div key={issue.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{issue.title} • {issue.category} • {issue.status}</div>
                                                                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.62)' }}>{issue.description || '-'}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>By {issue.reportedBy} • Step {issue.stepId || '-'} • {new Date(issue.createdAt).toLocaleString()}</div>
                                                                {issue.rootCause && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)', marginTop: '4px' }}><strong>Root Cause:</strong> {issue.rootCause}</div>}
                                                                {issue.correctiveAction && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}><strong>Corrective:</strong> {issue.correctiveAction}</div>}
                                                                {issue.verificationNote && <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}><strong>Verification:</strong> {issue.verificationNote}</div>}
                                                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                                                                    {(CAPA_TRANSITIONS[issue.status] || []).map(next => (
                                                                        <button
                                                                            key={`${issue.id}-${next}`}
                                                                            className="btn-pro"
                                                                            disabled={!canManageCAPA}
                                                                            onClick={() => handleIssueTransition(issue.id, next)}
                                                                            style={{ padding: '5px 8px', fontSize: '0.7rem', backgroundColor: 'rgba(59,130,246,0.14)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.35)', opacity: canManageCAPA ? 1 : 0.5 }}
                                                                        >
                                                                            {next}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Sprint Next: Electronic Signature */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Electronic Signature
                                                </div>
                                                <button className="btn-pro" disabled={!canSign} title={!canSign ? 'Approver/Admin only' : ''} onClick={handleSignElectronic} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(59,130,246,0.14)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.35)', opacity: canSign ? 1 : 0.5 }}>
                                                    <CheckCircle size={12} /> Sign
                                                </button>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                {(guide.eSignatures || []).length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No signatures yet.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
                                                        {(guide.eSignatures || []).map(sig => (
                                                            <div key={sig.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{sig.signerName} • {sig.role}</div>
                                                                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.62)' }}>{sig.reason || '-'}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>PIN: {sig.pinMasked} • v{sig.targetVersion} • {new Date(sig.signedAt).toLocaleString()}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* P2: Assignment + Sign-off */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Assignment & Sign-off
                                                </div>
                                                <button className="btn-pro" onClick={handleAddAssignment} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)' }}>
                                                    <Plus size={12} /> Add Assignment
                                                </button>
                                            </div>

                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                {assignments.length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No assignments yet.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px' }}>
                                                        {assignments.map(a => (
                                                            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 140px auto', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem' }}>
                                                                    <strong>{a.assignee}</strong> • {a.team || '-'} • {a.shift || '-'} • Due: {a.dueAt || '-'}
                                                                    {a.signedOffBy && <div style={{ fontSize: '0.72rem', color: 'rgba(110,231,183,0.9)' }}>Signed off by {a.signedOffBy}</div>}
                                                                </div>
                                                                <select className="pro-select" value={a.status} onChange={(e) => handleAssignmentStatusChange(a.id, e.target.value)}>
                                                                    <option value="Not Started">Not Started</option>
                                                                    <option value="In Progress">In Progress</option>
                                                                    <option value="Done">Done</option>
                                                                    <option value="Overdue">Overdue</option>
                                                                </select>
                                                                <div style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.55)' }}>{a.completedAt ? `Completed ${new Date(a.completedAt).toLocaleString()}` : 'Not completed'}</div>
                                                                <button className="btn-pro" onClick={() => handleSignOffAssignment(a.id)} style={{ padding: '6px 10px', fontSize: '0.72rem', backgroundColor: 'rgba(59,130,246,0.14)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.35)' }}>
                                                                    Sign-off
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* P2: Compliance Dashboard */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>
                                                Completion / Compliance Dashboard
                                            </div>
                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(120px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Completion Rate</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{completionRate}%</div></div>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Overdue Rate</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{totalAssignments > 0 ? Math.round((overdueAssignments / totalAssignments) * 100) : 0}%</div></div>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>First-pass Compliance</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{firstPassCompliance}%</div></div>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Avg Completion (h)</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{avgCompletionHours}</div></div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Read Ack v{currentVersion}</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{readAckRate}%</div></div>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Open CAPA</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{openCapaCount}</div></div>
                                                    <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px' }}><div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)' }}>Closed CAPA</div><div style={{ fontWeight: 800, fontSize: '1.15rem' }}>{closedCapaCount}</div></div>
                                                </div>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)' }}>
                                                    Top non-compliance steps: {guide.steps.filter(s => !operatorChecks[s.id]?.completed).slice(0, 3).map(s => s.title).join(', ') || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Read & Acknowledge */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700' }}>
                                                    Read & Acknowledge (v{currentVersion})
                                                </div>
                                                <button className="btn-pro" disabled={!canAcknowledge} onClick={handleAcknowledgeCurrentVersion} style={{ padding: '6px 10px', fontSize: '0.75rem', backgroundColor: 'rgba(16,185,129,0.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,0.35)', opacity: canAcknowledge ? 1 : 0.5 }}>
                                                    <CheckCircle size={12} /> Acknowledge This Version
                                                </button>
                                            </div>
                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                {currentVersionAcks.length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No acknowledgements yet for this version.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                                                        {currentVersionAcks.map(ack => (
                                                            <div key={ack.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{ack.userName} • {ack.role}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>{new Date(ack.acknowledgedAt).toLocaleString()}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* P2: Audit Trail */}
                                        <div style={{ marginBottom: '24px' }}>
                                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: '700', marginBottom: '10px' }}>
                                                Audit Trail
                                            </div>
                                            <div className="glass-panel" style={{ padding: '12px', backgroundColor: 'rgba(255,255,255,0.02)', maxHeight: '180px', overflowY: 'auto' }}>
                                                {(guide.auditTrail || []).length === 0 ? (
                                                    <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>No audit records yet.</div>
                                                ) : (
                                                    <div style={{ display: 'grid', gap: '8px' }}>
                                                        {(guide.auditTrail || []).map(log => (
                                                            <div key={log.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 10px' }}>
                                                                <div style={{ fontSize: '0.82rem', fontWeight: '700' }}>{log.action}</div>
                                                                <div style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.6)' }}>{log.details}</div>
                                                                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)' }}>{log.actor} • {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ opacity: canEditManual ? 1 : 0.65, pointerEvents: canEditManual ? 'auto' : 'none' }}>
                                            <StepEditor step={activeStep} onChange={handleStepChange} onCaptureImage={handleCaptureFrame} onAiImprove={handleAiImprove} onAiGenerate={handleAiGenerate} onAiGenerateFromVideo={handleVideoAiGenerate} isAiLoading={isAiLoading} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Video Source */}
                    {!isPreviewMode && !isOperatorMode && (
                        <div style={{
                            width: '320px',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
                            backdropFilter: 'blur(12px)'
                        }}>
                            <div style={{
                                padding: '16px 20px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                fontWeight: '800',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                fontSize: '0.85rem',
                                letterSpacing: '0.02em',
                                textTransform: 'uppercase'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Video size={16} style={{ color: '#60a5fa' }} />
                                    {tt('manual.sourceVideo', 'Source Video')}
                                </div>
                                <label style={{
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    fontSize: '0.75rem',
                                    color: '#60a5fa',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                    transition: 'all 0.2s'
                                }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.2)'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(37, 99, 235, 0.1)'}
                                >
                                    <Upload size={14} />
                                    {tt('common.upload', 'Upload')}
                                    <input
                                        type="file"
                                        accept="video/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file) {
                                                const url = URL.createObjectURL(file);
                                                setVideoSrc(url);
                                                setRawVideoFile(file);
                                                setGeminiVideoUri(null); // Reset URI for new file
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={handleFullVideoAI}
                                    disabled={isFullAIAnalyzing || isUploadingVideo}
                                    className="btn-pro"
                                    style={{
                                        width: '100%',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        padding: '12px',
                                        fontSize: '0.9rem',
                                        fontWeight: '700',
                                        opacity: (isFullAIAnalyzing || isUploadingVideo) ? 0.7 : 1,
                                        boxShadow: '0 10px 20px rgba(37, 99, 235, 0.2)'
                                    }}
                                >
                                    {isFullAIAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                                    {isFullAIAnalyzing ? t('manual.analyzingVideo') : isUploadingVideo ? t('manual.uploadingToAI') : t('manual.analyzeFullVideo')}
                                </button>

                                <button
                                    onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                                    className="btn-pro"
                                    style={{
                                        width: '100%',
                                        backgroundColor: isAIPanelOpen ? 'rgba(37, 99, 235, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                        color: isAIPanelOpen ? '#60a5fa' : 'white',
                                        borderColor: isAIPanelOpen ? 'rgba(37, 99, 235, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                                        padding: '10px'
                                    }}
                                >
                                    <MessageSquare size={16} />
                                    {isAIPanelOpen ? t('manual.hideMaviChat') : t('manual.openMaviChat')}
                                </button>
                            </div>

                            <div style={{ padding: '0 20px 20px 20px' }}>
                                {videoSrc ? (
                                    <div className="glass-panel" style={{ overflow: 'hidden', backgroundColor: '#000', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                        <video
                                            ref={videoRef}
                                            src={videoSrc}
                                            controls
                                            style={{ width: '100%', display: 'block' }}
                                        />
                                    </div>
                                ) : (
                                    <div className="glass-panel" style={{
                                        padding: '40px 20px',
                                        textAlign: 'center',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '16px',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        borderStyle: 'dashed'
                                    }}>
                                        <div style={{
                                            width: '48px', height: '48px',
                                            borderRadius: '50%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'rgba(255, 255, 255, 0.2)'
                                        }}>
                                            <VideoOff size={24} />
                                        </div>
                                        <div style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.85rem' }}>{tt('manual.noVideoLoaded', 'No video loaded')}</div>
                                        <label className="btn-pro" style={{ padding: '8px 16px', backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                            <Upload size={14} />
                                            {tt('manual.uploadVideo', 'Upload Video')}
                                            <input
                                                type="file"
                                                accept="video/*"
                                                style={{ display: 'none' }}
                                                onChange={(e) => {
                                                    const file = e.target.files[0];
                                                    if (file) {
                                                        const url = URL.createObjectURL(file);
                                                        setVideoSrc(url);
                                                        setRawVideoFile(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>
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
                    {/* Background Watermark */}
                    <Book size={400} style={{ position: 'absolute', opacity: 0.02, color: '#fff', transform: 'rotate(-10deg)', zIndex: 0 }} />

                    <div className="glass-panel" style={{
                        padding: '60px 80px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '24px',
                        zIndex: 1,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                        animation: 'slideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)'
                    }}>
                        <div style={{
                            width: '80px', height: '80px',
                            borderRadius: '24px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#60a5fa',
                            marginBottom: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}>
                            <Book size={40} />
                        </div>

                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 12px 0', letterSpacing: '-0.02em' }}>
                                {tt('manual.newManual', 'New Manual')}
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.5)', maxWidth: '400px', lineHeight: '1.6', fontSize: '0.95rem' }}>
                                {tt('manual.newManualDescription', 'Create a new manual from project data or start from scratch.')}
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <select
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="pro-select"
                                    style={{ padding: '12px 40px 12px 16px', borderRadius: '12px', height: 'auto', fontSize: '1rem', minWidth: '200px', appearance: 'none' }}
                                >
                                    <option value="">{tt('common.selectProject', 'Select Project')}</option>
                                    {projects.map(p => (
                                        <option key={p.projectName} value={p.projectName}>{p.projectName}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} style={{ position: 'absolute', right: '16px', pointerEvents: 'none', color: 'rgba(255, 255, 255, 0.4)' }} />
                            </div>

                            <button
                                onClick={() => {
                                    // Create scratch manual
                                    const localizedNewManual = tt('manual.newManual', 'New Manual');
                                    setSelectedProject({ projectName: localizedNewManual }); // Dummy project to enable UI
                                    setGuide(prev => ({ ...prev, title: localizedNewManual, steps: [] }));
                                }}
                                className="btn-pro"
                                style={{
                                    padding: '0 24px',
                                    height: 'auto',
                                    fontSize: '1rem',
                                    backgroundColor: '#2563eb',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px'
                                }}
                            >
                                <Plus size={20} />
                                {tt('manual.newManual', 'New Manual')}
                            </button>

                            <button
                                onClick={handleLoadManualsList}
                                className="btn-pro"
                                style={{
                                    padding: '0 24px',
                                    height: 'auto',
                                    fontSize: '1rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    borderRadius: '12px'
                                }}
                            >
                                <FolderOpen size={20} />
                                {tt('manual.openManual', 'Open Manual')}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Open Manual Dialog */}
            {showOpenDialog && (
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
