import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getAllProjects } from '../utils/database';
import { addKnowledgeBaseItem, updateKnowledgeBaseItem, getAllKnowledgeBaseItems, getKnowledgeBaseItem } from '../utils/knowledgeBaseDB';
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

function ManualCreation() {
    const { t } = useLanguage();
    const tt = (key, fallback) => {
        const value = t(key);
        return !value || value === key ? fallback : value;
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

    const [guide, setGuide] = useState({
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
        steps: []
    });

    const [activeStepId, setActiveStepId] = useState(null);
    const [savedManuals, setSavedManuals] = useState([]);
    const [showOpenDialog, setShowOpenDialog] = useState(false);
    const [isPreviewMode, setIsPreviewMode] = useState(false);
    const [generationLanguage, setGenerationLanguage] = useState('English');
    const [layoutTemplate, setLayoutTemplate] = useState('standard'); // standard, compact, one-per-page
    const [QRCodePreviewComponent, setQRCodePreviewComponent] = useState(null);

    // Advanced AI State
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(false);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);
    const [geminiVideoUri, setGeminiVideoUri] = useState(null);
    const [isFullAIAnalyzing, setIsFullAIAnalyzing] = useState(false);
    const [rawVideoFile, setRawVideoFile] = useState(null);

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
            setGuide({
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
                steps: []
            });
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

    const handleSaveManual = async () => {
        if (!guide.title) {
            await showAlert('Title Required', t('manual.alerts.enterTitle'));
            return;
        }

        try {
            const manualData = {
                ...guide, // spread everything to catch custom fields
                title: guide.title,
                category: 'Work Instruction',
                type: 'manual',
                steps: guide.steps,
                content: guide.steps,
                updatedAt: new Date().toISOString()
            };

            // Check if this manual already exists in KB (by ID match or Title match loosely?)
            // For now, we rely on having an ID. But 'generateId' creates a random string not matching KB IDs unless loaded.
            // If guide has a 'cloudId' or 'kbId', we assume update. Otherwise create.

            if (guide.kbId) {
                await updateKnowledgeBaseItem(guide.kbId, manualData);
                await showAlert('Success', t('manual.alerts.updateSuccess'));
            } else {
                const result = await addKnowledgeBaseItem(manualData);
                // result is { id, cloudId }
                setGuide(prev => ({ ...prev, kbId: result.id, cloudId: result.cloudId, id: result.cloudId }));
                // We update main 'id' to cloudId as well, as that's what we use for external refs
                await showAlert('Success', t('manual.alerts.saveSuccess'));
            }
        } catch (error) {
            console.error('Error saving manual:', error);
            await showAlert('Error', t('manual.alerts.saveFailed', { message: error.message }));
        }
    };

    const handleLoadManualsList = async () => {
        try {
            const items = await getAllKnowledgeBaseItems();
            const manuals = items.filter(item => item.type === 'manual');
            setSavedManuals(manuals);
            setShowOpenDialog(true);
        } catch (error) {
            console.error('Error loading manuals list:', error);
            await showAlert('Error', t('manual.alerts.loadManualsFailed'));
        }
    };

    const handleOpenManual = (manual) => {
        setGuide({
            id: manual.cloudId || generateId(),
            kbId: manual.id, // Local SQLite ID
            title: manual.title || '',
            summary: manual.summary || manual.description || '',
            difficulty: manual.difficulty || 'Moderate',
            timeRequired: manual.timeRequired || '',
            documentNumber: manual.documentNumber || '',
            version: manual.version || '1.0',
            status: manual.status || 'Draft',
            author: manual.author || '',
            revisionDate: manual.updatedAt ? new Date(manual.updatedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            effectiveDate: manual.effectiveDate || '',
            headerOrder: manual.headerOrder || DEFAULT_HEADER_ORDER,
            steps: manual.steps || manual.content || []
        });

        if (manual.steps && manual.steps.length > 0) {
            setActiveStepId(manual.steps[0].id);
        } else {
            setActiveStepId(null);
        }

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
            const manualId = guide.id || generateId();
            const qrUrl = `${baseUrl}/#/manual/${manualId}?doc=${encodeURIComponent(guide.documentNumber || '')}&title=${encodeURIComponent(guide.title || '')}`;
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
                            <option value="pdf">📄 PDF Document</option>
                            <option value="word">📝 MS Word (.docx)</option>
                            <option value="pptx">📊 PowerPoint (.pptx)</option>
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
                            <option value="standard">📐 Standard</option>
                            <option value="compact">📋 Compact</option>
                            <option value="one-per-page">📄 Single Page</option>
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
                        {isPreviewMode ? (
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
                                            {guide.status || 'Draft'}
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
                                                    <QRCodePreviewComponent value={`${window.location.origin}/#/manual/${guide.id}`} size={100} />
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
                                        <GuideHeader headerInfo={guide} onChange={(info) => setGuide(prev => ({ ...prev, ...info }))} />
                                        <div style={{ margin: '24px 0', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }} />
                                        <StepEditor step={activeStep} onChange={handleStepChange} onCaptureImage={handleCaptureFrame} onAiImprove={handleAiImprove} onAiGenerate={handleAiGenerate} onAiGenerateFromVideo={handleVideoAiGenerate} isAiLoading={isAiLoading} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Video Source */}
                    {!isPreviewMode && (
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
