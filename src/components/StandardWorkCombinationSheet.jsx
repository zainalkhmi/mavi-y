import React, { useState, useEffect, useRef } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { getAllProjects, saveSWCSData, getSWCSData, updateProject as updateProjectDb } from '../utils/database';
import { useProject } from '../contexts/ProjectContext';
import { useLanguage } from '../contexts/LanguageContext';
import * as XLSX from 'xlsx';
import { saveWorkbook } from '../utils/excelExport';
import { exportSWCSToPDF } from '../utils/swcsExport';
import {
    FileSpreadsheet,
    ClipboardList,
    Folder,
    FileType,
    FileJson,
    Download,
    Upload,
    Save,
    BarChart3,
    RefreshCw,
    ZoomIn,
    ZoomOut,
    Plus,
    Trash2,
    ChevronRight,
    LayoutGrid,
    FileEdit,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Search,
    X,
    Maximize2,
    Clock,
    User,
    Settings,
    Layers,
    Info
} from 'lucide-react';

function StandardWorkCombinationSheet() {
    const { showAlert } = useDialog();
    const { t } = useLanguage();
    const { currentProject, setMeasurements: setGlobalMeasurements } = useProject();
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState(''); // Stores project.id (serialized to string)
    const [selectedProject, setSelectedProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState(''); // 'saving', 'saved', 'error'

    // Header State
    const [headerInfo, setHeaderInfo] = useState({
        partName: '',
        partNo: '',
        workScope: '',
        taktTime: '',
        date: new Date().toISOString().split('T')[0],
        preparedBy: '',
        approvedBy: '',
        // TPS Additional Fields
        processName: '',
        station: '',
        revision: '1.0',
        standardWIP: 0,
        targetOutput: ''
    });

    useEffect(() => {
        loadProjects();
    }, []);

    // Sync with global currentProject if it changes
    useEffect(() => {
        if (currentProject && projects.length > 0) {
            const project = projects.find(p => (currentProject.id && p.id === currentProject.id) || p.projectName === currentProject.projectName);
            if (project) {
                // Only auto-switch if not already selected or if current project just changed
                if (selectedProjectId !== project.id.toString()) {
                    setSelectedProjectId(project.id.toString());
                    setSelectedProject(project);
                }
            }
        }
    }, [currentProject, projects, selectedProjectId]);

    useEffect(() => {
        if (selectedProjectId && projects.length > 0) {
            const project = projects.find(p => p.id.toString() === selectedProjectId);
            if (project) {
                setSelectedProject(project);
                // Auto-load SWCS data when project is selected
                loadSWCSFromProject(project);
            }
        } else if (!selectedProjectId) {
            setSelectedProject(null);
            setProjectMeasurements([]);
        }
    }, [selectedProjectId, projects]);

    // Load SWCS data from selected project
    const loadSWCSFromProject = async (project) => {
        if (!project) return;
        try {
            const swcsData = await getSWCSData(project.id);
            if (swcsData) {
                if (swcsData.headerInfo) setHeaderInfo(swcsData.headerInfo);
                if (swcsData.manualMeasurements) setManualMeasurements(swcsData.manualMeasurements);
                if (swcsData.mode) setMode(swcsData.mode);
                console.log('✅ SWCS data loaded from project');
            }
        } catch (error) {
            console.error('Error loading SWCS data:', error);
        }
    };

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            if (Array.isArray(allProjects)) {
                allProjects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                setProjects(allProjects);
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleHeaderChange = (field, value) => {
        setHeaderInfo(prev => ({ ...prev, [field]: value }));
    };

    const handleExport = () => {
        if (!selectedProject && mode === 'project') return;
        const filename = `SWCS_${headerInfo.partName || 'Untitled'}_${headerInfo.date}.pdf`;
        exportSWCSToPDF('swcs-container', filename);
    };

    // Save SWCS data to project database
    const handleSaveToProject = async () => {
        if (!selectedProject) {
            await showAlert('Warning', 'Pilih project terlebih dahulu!');
            return;
        }

        try {
            setSaveStatus('saving');
            const swcsData = {
                headerInfo,
                manualMeasurements,
                mode,
                version: '1.0',
                savedAt: new Date().toISOString()
            };

            await saveSWCSData(selectedProject.id, swcsData);

            // Also sync measurements back to the main project record if modified
            if (mode === 'project' && projectMeasurements.length > 0) {
                await updateProjectDb(selectedProject.id, {
                    measurements: projectMeasurements
                });
                // If this is the globally active project, update the global state too
                if (currentProject && currentProject.id === selectedProject.id) {
                    setGlobalMeasurements(projectMeasurements);
                }
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
            console.log('✅ SWCS data saved to project');
        } catch (error) {
            console.error('Error saving SWCS:', error);
            setSaveStatus('error');
            await showAlert('Error', 'Gagal menyimpan SWCS: ' + error.message);
        }
    };

    // Excel and Save Handlers
    const handleSaveManual = () => {
        const data = {
            headerInfo,
            manualMeasurements,
            version: '1.0'
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `SWCS_Manual_${headerInfo.partName || 'Project'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLoadManual = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.headerInfo) setHeaderInfo(data.headerInfo);
                if (data.manualMeasurements) setManualMeasurements(data.manualMeasurements);
                setMode('manual');
            } catch (err) {
                await showAlert('Error', 'Gagal memuat file JSON. Pastikan format benar.');
            }
        };
        reader.readAsText(file);
    };

    const manualLoadInputRef = useRef(null);


    const handleExportExcel = async () => {
        if (!dataToExport || dataToExport.length === 0) {
            await showAlert('Info', 'Tidak ada data untuk diekspor!');
            return;
        }

        const wsData = dataToExport.map((m, i) => ({
            'No': i + 1,
            'Element Name': m.elementName,
            'Manual Time': parseFloat(m.manualTime) || 0,
            'Auto Time': parseFloat(m.autoTime) || 0,
            'Walk Time': parseFloat(m.walkTime) || 0,
            'Loss Time': parseFloat(m.waitingTime) || 0,
            'Timing Mode': m.timingMode || 'series',
            'Offset': m.offset || 0
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "SWCS Data");
        saveWorkbook(wb, `SWCS_Data_${headerInfo.partName || 'Export'}.xlsx`);
    };

    const handleImportExcel = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const data = XLSX.utils.sheet_to_json(ws);

                const newMeasurements = data.map(row => ({
                    elementName: row['Element Name'] || '',
                    manualTime: parseFloat(row['Manual Time']) || 0,
                    autoTime: parseFloat(row['Auto Time']) || 0,
                    walkTime: parseFloat(row['Walk Time']) || 0,
                    timingMode: (row['Timing Mode'] || 'series').toLowerCase(),
                    offset: parseFloat(row['Offset']) || 0
                }));

                setManualMeasurements(newMeasurements);
                setMode('manual');
            } catch (err) {
                console.error(err);
                await showAlert('Error', 'Gagal mengimpor Excel.');
            }
        };
        reader.readAsBinaryString(file);
    };

    const loadManualJSON = () => manualLoadInputRef.current?.click();
    const saveManualJSON = handleSaveManual;
    const exportToExcel = handleExportExcel;

    // Helper to generate wavy path
    const generateWavyPath = (x1, y, x2, amplitude = 3, frequency = 0.2) => {
        let path = `M ${x1} ${y}`;
        const width = x2 - x1;
        const steps = Math.ceil(width); // One step per pixel for smoothness
        for (let i = 0; i <= steps; i++) {
            const x = x1 + i;
            const yOffset = Math.sin(i * frequency) * amplitude;
            path += ` L ${x} ${y + yOffset}`;
        }
        return path;
    };

    const [mode, setMode] = useState('project'); // 'project' or 'manual'
    const [manualMeasurements, setManualMeasurements] = useState([
        {
            elementName: 'Elemen 1',
            manualTime: 0,
            autoTime: 0,
            walkTime: 0,
            waitingTime: 0,
            timingMode: 'series',
            offset: 0,
            // TPS Fields
            qualityCheck: false,
            qualityCheckDescription: '',
            safetyPoint: false,
            safetyPointDescription: '',
            valueType: { manual: 'VA', auto: 'VA', walk: 'NVA', waiting: 'NNVA' },
            equipment: '',
            skillLevel: 1,
            kaizenFlag: false,
            kaizenNote: ''
        }
    ]);

    // ... (existing useEffects)

    const [drawMode, setDrawMode] = useState(null); // 'text', 'arrow' (future), etc.
    const [columnWidths, setColumnWidths] = useState({
        no: 30,
        name: 150,
        man: 45,
        auto: 45,
        walk: 45,
        waiting: 45,
        start: 50,
        finish: 50,
        duration: 50,
        total: 45,
        quality: 30,
        safety: 30,
        kaizen: 30,
        timing: 80,
        offset: 50,
        delete: 30
    });

    // Column visibility state
    const [columnVisibility, setColumnVisibility] = useState({
        no: true,
        name: true,
        man: true,
        auto: true,
        walk: true,
        waiting: true,
        start: true,
        finish: true,
        duration: true,
        total: false,
        quality: true,
        safety: true,
        kaizen: true,
        timing: true,
        offset: true
    });

    const [tableWidth, setTableWidth] = useState(550);
    const [resizingColumn, setResizingColumn] = useState(null);
    const [resizingPanel, setResizingPanel] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, width: 0 });

    const handleColumnResizeStart = (colId, e) => {
        e.preventDefault();
        setResizingColumn(colId);
        setDragStart({ x: e.clientX, width: columnWidths[colId] });
    };

    const handlePanelResizeStart = (e) => {
        e.preventDefault();
        setResizingPanel(true);
        setDragStart({ x: e.clientX, width: tableWidth });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (resizingColumn) {
                const delta = e.clientX - dragStart.x;
                const newWidth = Math.max(20, dragStart.width + delta);
                setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
            } else if (resizingPanel) {
                const delta = e.clientX - dragStart.x;
                const newWidth = Math.max(200, dragStart.width + delta);
                setTableWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setResizingColumn(null);
            setResizingPanel(false);
        };

        if (resizingColumn || resizingPanel) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumn, resizingPanel, dragStart]);

    const [projectMeasurements, setProjectMeasurements] = useState([]);

    useEffect(() => {
        if (selectedProject) {
            // Initialize editable buffer with project data
            const measurements = selectedProject.measurements || [];
            // Map duration to manualTime if missing (similar to render logic, but persisted in state)
            const initializedMeasurements = measurements.map(m => {
                const manual = parseFloat((parseFloat(m.manualTime) || 0).toFixed(1));
                const auto = parseFloat((parseFloat(m.autoTime) || 0).toFixed(1));
                const walk = parseFloat((parseFloat(m.walkTime) || 0).toFixed(1));
                const waiting = parseFloat((parseFloat(m.waitingTime) || 0).toFixed(1));

                if (manual === 0 && auto === 0 && walk === 0 && waiting === 0) {
                    const dur = parseFloat(m.duration) || (m.endTime && m.startTime ? m.endTime - m.startTime : 0) || 0;
                    if (dur > 0) return { ...m, manualTime: parseFloat(dur.toFixed(1)) };
                }
                return {
                    ...m,
                    manualTime: manual,
                    autoTime: auto,
                    walkTime: walk,
                    waitingTime: waiting
                };
            });
            setProjectMeasurements(initializedMeasurements);
        } else {
            setProjectMeasurements([]);
        }
    }, [selectedProject]);

    const [rulerExtraBuffer, setRulerExtraBuffer] = useState(30); // Default 30s buffer
    const [zoomLevel, setZoomLevel] = useState(20); // Default 20px per second - CHART zoom
    const [viewScale, setViewScale] = useState(1);
    const [showColumnSettings, setShowColumnSettings] = useState(false);

    const tableVScrollRef = useRef(null);
    const chartVScrollRef = useRef(null);

    const handleVerticalSyncScroll = (source, target) => {
        if (source.current && target.current) {
            if (target.current.scrollTop !== source.current.scrollTop) {
                target.current.scrollTop = source.current.scrollTop;
            }
        }
    };

    const styles = {
        container: {
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#0a0a0c',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            boxSizing: 'border-box',
            overflow: 'hidden'
        },
        glassPanel: {
            background: 'rgba(255, 255, 255, 0.02)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '24px',
            padding: '16px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
        },
        headerLayout: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '4px'
        },
        titleGroup: {
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
        },
        title: {
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #fff 0%, #a5a5a5 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
        },

        controlBar: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
            padding: '2px 4px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
        },
        analysisGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
            marginBottom: '20px'
        },
        card: (color = '#3b82f6') => ({
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: `4px solid ${color}`,
            borderRadius: '16px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }),
        cardValue: {
            fontSize: '1.25rem',
            fontWeight: '800',
            color: '#fff'
        },
        cardLabel: {
            fontSize: '0.75rem',
            fontWeight: '600',
            color: 'rgba(255, 255, 255, 0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px'
        },
        contentWrapper: {
            flex: 1,
            display: 'flex',
            gap: '20px',
            overflow: 'hidden',
            minHeight: 0
        },
        tablePanel: {
            flex: '0 0 auto',
            width: '600px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.01)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            overflow: 'hidden'
        },
        chartPanel: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.01)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            overflow: 'hidden'
        }
    };

    const toggleColumn = (columnId) => {
        setColumnVisibility(prev => ({
            ...prev,
            [columnId]: !prev[columnId]
        }));
    };

    const showAllColumns = () => {
        const allVisible = {};
        Object.keys(columnVisibility).forEach(key => {
            allVisible[key] = true;
        });
        setColumnVisibility(allVisible);
    };

    const hideOptionalColumns = () => {
        setColumnVisibility({
            no: true,
            name: true,
            man: true,
            auto: true,
            walk: true,
            waiting: false,
            start: true,
            finish: true,
            duration: true,
            total: false,
            quality: false,
            safety: false,
            kaizen: false,
            timing: false,
            offset: false
        });
    };

    const handleColumnResize = (column, newWidth) => {
        setColumnWidths(prev => ({
            ...prev,
            [column]: Math.max(30, newWidth)
        }));
    };

    const autoFitColumns = () => {
        const newWidths = { ...columnWidths };
        const data = mode === 'project' ? projectMeasurements : manualMeasurements;

        // Measure Element Name max width
        let maxChars = 12; // Default for 'Element Name'
        data.forEach(m => {
            if (m.elementName && m.elementName.length > maxChars) maxChars = m.elementName.length;
        });
        newWidths.name = Math.min(300, Math.max(100, maxChars * 8)); // Rough estimate

        setColumnWidths(newWidths);
    };

    const handleManualChange = async (index, field, value) => {
        const isProjectMode = mode === 'project';
        const currentData = isProjectMode ? projectMeasurements : manualMeasurements;
        const newMeasurements = [...currentData]; // Clone array

        if (field === 'elementName' || field === 'timingMode') {
            newMeasurements[index] = { ...newMeasurements[index], [field]: value };
        } else if (field === 'qualityCheck' || field === 'safetyPoint' || field === 'kaizenFlag') {
            // Boolean fields
            newMeasurements[index] = { ...newMeasurements[index], [field]: value };
        } else if (field.startsWith('valueType.')) {
            // Handle nested valueType updates (e.g., 'valueType.manual')
            const timeType = field.split('.')[1]; // 'manual', 'auto', 'walk'
            newMeasurements[index] = {
                ...newMeasurements[index],
                valueType: {
                    ...newMeasurements[index].valueType,
                    [timeType]: value
                }
            };
        } else {
            // Numeric fields - VALIDATION LOGIC
            const numericValue = parseFloat(value) || 0;
            const currentItem = newMeasurements[index];

            // Calculate potential new sum
            let proposedManual = currentItem.manualTime || 0;
            let proposedAuto = currentItem.autoTime || 0;
            let proposedWalk = currentItem.walkTime || 0;
            let proposedWaiting = currentItem.waitingTime || 0;

            if (field === 'manualTime') proposedManual = numericValue;
            if (field === 'autoTime') proposedAuto = numericValue;
            if (field === 'walkTime') proposedWalk = numericValue;
            if (field === 'waitingTime') proposedWaiting = numericValue;

            const newTotal = proposedManual + proposedAuto + proposedWalk + proposedWaiting;

            // Get constraints (original duration)
            const originalDuration = currentItem.duration ||
                (currentItem.endTime && currentItem.startTime ? (currentItem.endTime - currentItem.startTime) : 0);

            // If original duration exists, ensure we don't exceed it (allowing small float tolerance)
            if (originalDuration > 0 && newTotal > (originalDuration + 0.1)) {
                await showAlert('Validation Error', `Total duration (${newTotal.toFixed(1)}s) cannot exceed the original element duration (${originalDuration.toFixed(1)}s).`);
                return; // Revert change
            }

            newMeasurements[index] = { ...newMeasurements[index], [field]: numericValue };
        }

        if (isProjectMode) {
            setProjectMeasurements(newMeasurements);
        } else {
            setManualMeasurements(newMeasurements);
        }
    };

    const addManualRow = () => {
        setManualMeasurements([...manualMeasurements, {
            elementName: '',
            manualTime: 0,
            autoTime: 0,
            walkTime: 0,
            waitingTime: 0,
            timingMode: 'series',
            offset: 0,
            // TPS Fields
            qualityCheck: false,
            qualityCheckDescription: '',
            safetyPoint: false,
            safetyPointDescription: '',
            valueType: { manual: 'VA', auto: 'VA', walk: 'NVA', waiting: 'NNVA' },
            equipment: '',
            skillLevel: 1,
            kaizenFlag: false,
            kaizenNote: ''
        }]);
    };

    const deleteManualRow = (index) => {
        const newMeasurements = manualMeasurements.filter((_, i) => i !== index);
        setManualMeasurements(newMeasurements);
    };

    const hasData = mode === 'project'
        ? (selectedProject && selectedProject.measurements && selectedProject.measurements.length > 0)
        : (manualMeasurements.length > 0);

    // Calculate start and end times for rendering
    const calculateTimedMeasurements = () => {
        const rawMeasurements = mode === 'project'
            ? projectMeasurements
            : manualMeasurements;

        let lastFinishTime = 0;
        let lastRowStart = 0;

        return rawMeasurements.map((m, index) => {
            let manual = parseFloat(m.manualTime) || 0;
            let auto = parseFloat(m.autoTime) || 0;
            let walk = parseFloat(m.walkTime) || 0;
            let waiting = parseFloat(m.waitingTime) || 0;

            // Adapt data from VideoIntelligence/Project if SWCS fields are missing but duration/times exist
            if (manual === 0 && auto === 0 && walk === 0 && waiting === 0) {
                if (m.duration !== undefined || (m.endTime !== undefined && m.startTime !== undefined)) {
                    const dur = parseFloat(m.duration) || (parseFloat(m.endTime) - parseFloat(m.startTime)) || 0;
                    // Map to Manual Time by default so it appears on chart/table
                    manual = dur;
                }
            }

            const duration = manual + auto + walk + waiting;

            let startTime = 0;

            if (mode === 'project') {
                // Use explicit start time from project data if available (e.g. from VideoIntelligence)
                if (m.startTime !== undefined && m.startTime !== null && !isNaN(parseFloat(m.startTime))) {
                    startTime = parseFloat(m.startTime);
                } else {
                    // Project mode: purely sequential fallback
                    startTime = lastFinishTime;
                }
            } else {
                // Manual mode with advanced timing
                const timingMode = m.timingMode || 'series';
                const offset = parseFloat(m.offset) || 0;

                if (index === 0) {
                    startTime = offset;
                } else {
                    if (timingMode === 'series') {
                        startTime = lastFinishTime + offset;
                    } else if (timingMode === 'parallel') {
                        startTime = lastRowStart + offset;
                    }
                }
            }

            // Calculate component starts relative to row startTime
            // Standard SWCS Pattern: Manual -> Auto -> Walk -> Waiting
            // Usually: Manual happens, then Auto machine runs (operator moves away?), Walk happens, then Waiting
            // Visualizing:
            // Manual Bar: Starts at startTime
            // Auto Bar: Starts at startTime + manual (if auto follows manual)
            // Walk Bar: Starts at startTime + manual (if walk follows manual) OR startTime + manual + auto?
            // Waiting Bar: Starts after walk (waste time - operator idle)

            const rowStart = startTime;
            const manualStart = rowStart;
            const manualEnd = manualStart + manual;

            const autoStart = manualEnd; // Machine starts after loading
            const autoEnd = autoStart + auto;

            const walkStart = manualEnd; // Operator walks after loading
            const walkEnd = walkStart + walk;

            const waitingStart = walkEnd; // Waiting starts after walk
            const waitingEnd = waitingStart + waiting;

            // For the next row calculations
            lastRowStart = rowStart;
            // Next element starts when Operator is free (Manual + Walk + Waiting) or purely based on max time
            lastFinishTime = Math.max(manualEnd, autoEnd, walkEnd, waitingEnd);

            return {
                ...m,
                manualTime: manual, // Ensure mapped duration is reflected in the object
                autoTime: auto,
                walkTime: walk,
                waitingTime: waiting,
                _calculated: {
                    startTime: rowStart,
                    finishTime: Math.max(manualEnd, autoEnd, walkEnd, waitingEnd), // Total duration of this row's activity
                    manualStart,
                    manualEnd,
                    autoStart,
                    autoEnd,
                    walkStart,
                    walkEnd,
                    waitingStart,
                    waitingEnd
                }
            };
        });
    };

    const timedMeasurements = calculateTimedMeasurements();

    // TPS Analysis Calculations
    const calculateTPSAnalysis = () => {
        const measurements = timedMeasurements;
        if (!measurements || measurements.length === 0) {
            return {
                cycleTime: 0,
                taktTime: parseFloat(headerInfo.taktTime) || 0,
                capacity: 0,
                vaTime: 0,
                nvaTime: 0,
                nnvaTime: 0,
                vaPercentage: 0,
                nvaPercentage: 0,
                nnvaPercentage: 0,
                bottleneckIndex: -1,
                bottleneckTime: 0,
                kaizenCount: 0,
                qualityCheckCount: 0,
                safetyPointCount: 0
            };
        }

        // Calculate cycle time (total operator time)
        let totalManual = 0;
        let totalAuto = 0;
        let totalWalk = 0;
        let totalWaiting = 0;
        let vaTime = 0;
        let nvaTime = 0;
        let nnvaTime = 0;
        let bottleneckIndex = -1;
        let bottleneckTime = 0;
        let kaizenCount = 0;
        let qualityCheckCount = 0;
        let safetyPointCount = 0;

        measurements.forEach((m, idx) => {
            const manual = parseFloat(m.manualTime) || 0;
            const auto = parseFloat(m.autoTime) || 0;
            const walk = parseFloat(m.walkTime) || 0;
            const waiting = parseFloat(m.waitingTime) || 0;
            const elementTotal = manual + auto + walk + waiting;

            totalManual += manual;
            totalAuto += auto;
            totalWalk += walk;
            totalWaiting += waiting;

            // Find bottleneck (slowest element)
            if (elementTotal > bottleneckTime) {
                bottleneckTime = elementTotal;
                bottleneckIndex = idx;
            }

            // Count TPS markers
            if (m.kaizenFlag) kaizenCount++;
            if (m.qualityCheck) qualityCheckCount++;
            if (m.safetyPoint) safetyPointCount++;

            // Calculate VA/NVA/NNVA time
            if (m.valueType) {
                if (m.valueType.manual === 'VA') vaTime += manual;
                else if (m.valueType.manual === 'NVA') nvaTime += manual;
                else if (m.valueType.manual === 'NNVA') nnvaTime += manual;

                if (m.valueType.auto === 'VA') vaTime += auto;
                else if (m.valueType.auto === 'NVA') nvaTime += auto;
                else if (m.valueType.auto === 'NNVA') nnvaTime += auto;

                if (m.valueType.walk === 'VA') vaTime += walk;
                else if (m.valueType.walk === 'NVA') nvaTime += walk;
                else if (m.valueType.walk === 'NNVA') nnvaTime += walk;

                if (m.valueType.waiting === 'VA') vaTime += waiting;
                else if (m.valueType.waiting === 'NVA') nvaTime += waiting;
                else if (m.valueType.waiting === 'NNVA') nnvaTime += waiting;
            } else {
                // Default categorization if not specified
                vaTime += manual + auto;
                nvaTime += walk;
                nnvaTime += waiting; // Waiting is always waste by default
            }
        });

        const cycleTime = totalManual + totalWalk + totalWaiting; // Operator cycle time includes waiting
        const taktTime = parseFloat(headerInfo.taktTime) || 0;
        const capacity = taktTime > 0 ? (cycleTime / taktTime) * 100 : 0;
        const totalTime = vaTime + nvaTime + nnvaTime;
        const vaPercentage = totalTime > 0 ? (vaTime / totalTime) * 100 : 0;
        const nvaPercentage = totalTime > 0 ? (nvaTime / totalTime) * 100 : 0;
        const nnvaPercentage = totalTime > 0 ? (nnvaTime / totalTime) * 100 : 0;

        return {
            cycleTime,
            taktTime,
            capacity,
            vaTime,
            nvaTime,
            nnvaTime,
            vaPercentage,
            nvaPercentage,
            nnvaPercentage,
            bottleneckIndex,
            bottleneckTime,
            kaizenCount,
            qualityCheckCount,
            safetyPointCount
        };
    };

    const tpsAnalysis = calculateTPSAnalysis();

    const [annotations, setAnnotations] = useState([]);

    const handleChartClick = (e) => {
        if (!drawMode) return;

        const svg = e.target.closest('svg');
        if (!svg) return;

        const rect = svg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (drawMode === 'text') {
            const text = prompt('Masukkan teks:');
            if (text) {
                setAnnotations([...annotations, { type: 'text', x, y, content: text, color: 'black' }]);
            }
            setDrawMode(null); // Exit draw mode after one action
        }
    };

    const deleteAnnotation = (index) => {
        if (window.confirm('Hapus anotasi ini?')) {
            setAnnotations(annotations.filter((_, i) => i !== index));
        }
    }; // End Annotation Logic

    const renderChart = () => {
        if (!hasData) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', gap: '16px' }}>
                    <BarChart3 size={48} />
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ margin: 0, color: '#f8fafc' }}>{t('swcs.noData')}</h3>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>{t('swcs.noDataDescManual')}</p>
                    </div>
                </div>
            );
        }

        const measurements = timedMeasurements;
        const rowHeight = 40;
        const headerHeight = 44; // Match table header height
        const chartHeight = measurements.length * rowHeight + headerHeight;

        let maxDuration = 0;
        measurements.forEach(m => {
            if (m._calculated.finishTime > maxDuration) maxDuration = m._calculated.finishTime;
        });

        const pixelsPerSecond = zoomLevel; // Use dynamic zoom level
        const maxScaleTime = Math.max(maxDuration + 5, tpsAnalysis.cycleTime + 5, 20);
        const chartWidth = Math.max(800, maxScaleTime * pixelsPerSecond);

        return (
            <div className="swcs-chart-inner" style={{ flex: 1, backgroundColor: '#0a0a0c', position: 'relative' }}>
                <svg width={chartWidth} height={chartHeight} style={{ display: 'block' }}>
                    {/* Background Header */}
                    <rect x="0" y="0" width={chartWidth} height={headerHeight} fill="#111827" />
                    <line x1="0" y1={headerHeight} x2={chartWidth} y2={headerHeight} stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />

                    {/* Ruler and Grid */}
                    {Array.from({ length: Math.ceil(maxScaleTime) + 1 }).map((_, i) => {
                        const x = i * pixelsPerSecond;
                        const isMajor = i % 10 === 0;
                        const isMid = i % 5 === 0;

                        return (
                            <g key={i}>
                                {/* Grid Line */}
                                <line
                                    x1={x} y1={headerHeight}
                                    x2={x} y2={chartHeight}
                                    stroke={isMajor ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'}
                                    strokeWidth={isMajor ? '1' : '1'}
                                />
                                {/* Ruler Tick */}
                                <line
                                    x1={x} y1={headerHeight}
                                    x2={x} y2={headerHeight - (isMajor ? 12 : isMid ? 8 : 4)}
                                    stroke="#94a3b8"
                                    strokeWidth="1"
                                />
                                {/* Ruler Label */}
                                {isMajor && (
                                    <text x={x + 2} y={headerHeight - 16} fontSize="10" fontWeight="700" fill="#94a3b8">
                                        {i}s
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {/* Takt Time Indicator */}
                    {headerInfo.taktTime > 0 && (
                        <g>
                            <line
                                x1={headerInfo.taktTime * pixelsPerSecond} y1={0}
                                x2={headerInfo.taktTime * pixelsPerSecond} y2={chartHeight}
                                stroke="#ef4444" strokeWidth="2" strokeDasharray="4,2"
                            />
                            <rect
                                x={headerInfo.taktTime * pixelsPerSecond - 15} y={2}
                                width="30" height="12" rx="4" fill="#ef4444"
                            />
                            <text
                                x={headerInfo.taktTime * pixelsPerSecond} y={11}
                                textAnchor="middle" fontSize="8" fontWeight="900" fill="white"
                            >
                                TAKT
                            </text>
                        </g>
                    )}

                    {/* Connection Lines (Flow visualization) */}
                    {measurements.map((m, idx) => {
                        if (idx === 0) return null;
                        const prevEnd = measurements[idx - 1]._calculated.finishTime;
                        const currStart = m._calculated.startTime;
                        const xStart = prevEnd * pixelsPerSecond;
                        const xEnd = currStart * pixelsPerSecond;
                        const yStart = headerHeight + (idx - 1) * rowHeight + rowHeight / 2;
                        const yEnd = headerHeight + idx * rowHeight + rowHeight / 2;

                        return (
                            <path
                                key={`conn-${idx}`}
                                d={`M ${xStart} ${yStart} L ${xStart} ${yEnd} L ${xEnd} ${yEnd}`}
                                fill="none"
                                stroke="rgba(255, 255, 255, 0.2)"
                                strokeWidth="1"
                                strokeDasharray="4,2"
                            />
                        );
                    })}

                    {/* Rows and Bars */}
                    {measurements.map((m, index) => {
                        const yBase = headerHeight + index * rowHeight;
                        const yMid = yBase + rowHeight / 2;
                        const isBottleneck = index === tpsAnalysis.bottleneckIndex;
                        const { manualStart, manualEnd, autoStart, autoEnd, walkStart, walkEnd, waitingStart, waitingEnd } = m._calculated;

                        return (
                            <g key={`row-${index}`}>
                                {/* Row Background Highlight for Bottleneck */}
                                {isBottleneck && (
                                    <rect x="0" y={yBase} width={chartWidth} height={rowHeight} fill="rgba(239, 68, 68, 0.1)" />
                                )}

                                {/* Auto Bar (Bottom-most layer of the task) */}
                                {autoEnd > autoStart && (
                                    <rect
                                        x={autoStart * pixelsPerSecond} y={yMid - 6}
                                        width={(autoEnd - autoStart) * pixelsPerSecond} height={12}
                                        rx="2" fill="rgba(59, 130, 246, 0.1)" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4,2"
                                    />
                                )}

                                {/* Manual Bar */}
                                {manualEnd > manualStart && (
                                    <rect
                                        x={manualStart * pixelsPerSecond} y={yMid - 4}
                                        width={(manualEnd - manualStart) * pixelsPerSecond} height={8}
                                        rx="4" fill="#22c55e"
                                        style={{ filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))' }}
                                    />
                                )}

                                {/* Walk Bar */}
                                {walkEnd > walkStart && (
                                    <path
                                        d={generateWavyPath(walkStart * pixelsPerSecond, yMid, walkEnd * pixelsPerSecond, 3, 0.5)}
                                        stroke="#f43f5e" strokeWidth="2" fill="none" strokeLinecap="round"
                                    />
                                )}

                                {/* Waiting Bar */}
                                {waitingEnd > waitingStart && (
                                    <line
                                        x1={waitingStart * pixelsPerSecond} y1={yMid}
                                        x2={waitingEnd * pixelsPerSecond} y2={yMid}
                                        stroke="#ef4444" strokeWidth="3" strokeDasharray="1,4" strokeLinecap="round"
                                    />
                                )}

                                {/* Markers */}
                                {m.qualityCheck && (
                                    <g transform={`translate(${manualEnd * pixelsPerSecond}, ${yMid - 14})`}>
                                        <circle r="6" fill="#22c55e" stroke="#0a0a0c" strokeWidth="1" />
                                        <text dy=".3em" textAnchor="middle" fontSize="7" fontWeight="900" fill="white">Q</text>
                                    </g>
                                )}
                                {m.safetyPoint && (
                                    <g transform={`translate(${manualEnd * pixelsPerSecond}, ${yMid + 14})`}>
                                        <path d="M -6 4 L 0 -6 L 6 4 Z" fill="#3b82f6" stroke="#0a0a0c" strokeWidth="1" />
                                        <text y="2" textAnchor="middle" fontSize="7" fontWeight="900" fill="white">S</text>
                                    </g>
                                )}
                                {m.kaizenFlag && (
                                    <g transform={`translate(${manualEnd * pixelsPerSecond + 12}, ${yMid})`}>
                                        <circle r="7" fill="#eab308" stroke="#0a0a0c" strokeWidth="1" />
                                        <text dy=".3em" textAnchor="middle" fontSize="8">💡</text>
                                    </g>
                                )}
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };



    const maxFinishTime = timedMeasurements.reduce((max, m) => Math.max(max, m._calculated?.finishTime || 0), 0);
    const maxScaleTime = Math.max(maxFinishTime + 5, tpsAnalysis.cycleTime + 5, 20);

    return (
        <div style={styles.container}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                .glass-panel {
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                
                .glass-panel:hover {
                    background: rgba(255, 255, 255, 0.04) !important;
                    border-color: rgba(255, 255, 255, 0.12) !important;
                    transform: translateY(-2px);
                }

                .btn-segmented {
                    display: flex;
                    background: rgba(255, 255, 255, 0.03);
                    padding: 4px;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }

                .btn-segment {
                    padding: 6px 16px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    background: transparent;
                    color: rgba(255, 255, 255, 0.5);
                    display: flex;
                    alignItems: center;
                    gap: 8px;
                }

                .btn-segment.active {
                    background: #3b82f6;
                    color: white;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .btn-icon {
                    width: 38px;
                    height: 38px;
                    display: flex;
                    alignItems: center;
                    justifyContent: center;
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    color: white;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-icon:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.1);
                    transform: scale(1.05);
                }

                .btn-primary {
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    alignItems: center;
                    gap: 8px;
                }

                .btn-primary:hover {
                    background: #2563eb;
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }

                .header-input {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 4px 10px;
                    color: white;
                    font-size: 0.8rem;
                    outline: none;
                    width: 100%;
                }

                .header-input:focus {
                    border-color: #3b82f6;
                    background: rgba(255, 255, 255, 0.05);
                }

                /* Force Scrollbar Visibility */
                ::-webkit-scrollbar {
                    width: 8px !important;
                    height: 8px !important;
                    background: transparent !important;
                }
                ::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02) !important;
                    border-radius: 4px !important;
                }
                ::-webkit-scrollbar-thumb {
                    background-color: rgba(255, 255, 255, 0.2) !important;
                    border-radius: 4px !important;
                    transition: background-color 0.2s;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background-color: #3b82f6 !important;
                }
                ::-webkit-scrollbar-corner {
                    background: transparent !important;
                }
                /* Ensure nested scrollbars (like in table) are also visible */
                .swcs-table::-webkit-scrollbar {
                   height: 10px;
                }
                .swcs-table input.input-modern {
                    border: none;
                    background: transparent;
                    padding: 4px;
                    margin: 0;
                    width: 100%;
                    color: inherit;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .swcs-table input.input-modern:hover {
                    background: rgba(255, 255, 255,0.05);
                }
                .swcs-table input.input-modern:focus {
                    background: rgba(59, 130, 246, 0.05);
                    box-shadow: inset 0 0 0 1px #3b82f6;
                    outline: none;
                    border-radius: 4px;
                }
                .swcs-header-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .swcs-header-label {
                    font-size: 0.7rem;
                    color: #64748b;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .swcs-header-value {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 4px 0;
                    color: white;
                    font-weight: 600;
                    font-size: 0.9rem;
                    transition: border-color 0.2s;
                }
                .swcs-header-value:focus-within {
                    border-color: #3b82f6;
                }
                .swcs-grid-line {
                    stroke: rgba(255, 255, 255, 0.05);
                }
                .swcs-grid-line-major {
                    stroke: rgba(255, 255, 255, 0.1);
                }
                .resize-handle:hover {
                    background-color: rgba(59, 130, 246, 0.5) !important;
                }
                .panel-resize-handle:hover {
                    background-color: rgba(59, 130, 246, 0.3) !important;
                }
            `}</style>

            <div style={styles.headerLayout}>
                <div style={styles.titleGroup}>
                    <h1 style={styles.title}>
                        <ClipboardList size={28} color="#3b82f6" />
                        {t('swcs.title')}
                    </h1>

                </div>

                <div style={styles.controlBar}>
                    <div className="btn-segmented">
                        <button
                            className={`btn-segment ${mode === 'project' ? 'active' : ''}`}
                            onClick={() => setMode('project')}
                        >
                            <Folder size={16} />
                            {t('swcs.projects')}
                        </button>
                        <button
                            className={`btn-segment ${mode === 'manual' ? 'active' : ''}`}
                            onClick={() => setMode('manual')}
                        >
                            <FileEdit size={16} />
                            {t('swcs.manual')}
                        </button>
                    </div>

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 8px' }} />

                    {/* View Zoom Controls */}
                    {/* Removed view zoom controls as the container is now fluid */}

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 8px' }} />

                    {mode === 'project' ? (
                        <select
                            value={selectedProjectId}
                            onChange={(e) => setSelectedProjectId(e.target.value)}
                            style={{
                                background: '#111827',
                                color: '#f8fafc',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                outline: 'none',
                                fontSize: '0.85rem',
                                minWidth: '200px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="" style={{ background: '#111827', color: '#f8fafc' }}>-- {t('swcs.projects')} --</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id} style={{ background: '#111827', color: '#f8fafc' }}>{p.projectName}</option>
                            ))}
                        </select>
                    ) : (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon" onClick={loadManualJSON} title={t('swcs.loadManual')}>
                                <Upload size={18} />
                                <input
                                    type="file"
                                    ref={manualLoadInputRef}
                                    onChange={handleLoadManual}
                                    accept=".json"
                                    style={{ display: 'none' }}
                                />
                            </button>
                            <button className="btn-icon" onClick={saveManualJSON} title={t('swcs.saveManual')}>
                                <Save size={18} />
                            </button>
                        </div>
                    )}

                    <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '0 8px' }} />

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn-icon" onClick={handleExport} title={t('swcs.exportPdf')}>
                            <FileType size={18} />
                        </button>
                        <button className="btn-icon" onClick={handleExportExcel} title={t('swcs.exportExcel')}>
                            <Download size={18} />
                        </button>
                        <label className="btn-icon" title={t('swcs.importExcel')}>
                            <FileType size={18} />
                            <input type="file" onChange={handleImportExcel} accept=".xlsx, .xls" style={{ display: 'none' }} />
                        </label>
                    </div>
                </div>
            </div>

            <div style={styles.glassPanel} className="glass-panel">
                {/* Column Settings Panel */}
                {mode === 'manual' && showColumnSettings && (
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '16px',
                        marginBottom: '16px',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h4 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Settings size={16} /> Column Visibility
                            </h4>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-segment" onClick={showAllColumns}>Show All</button>
                                <button className="btn-segment" onClick={hideOptionalColumns}>Hide Optional</button>
                            </div>
                        </div>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                            gap: '8px',
                            color: 'white'
                        }}>
                            {[
                                { id: 'no', label: t('swcs.table.no') },
                                { id: 'name', label: t('swcs.table.elementName') },
                                { id: 'man', label: t('swcs.table.man') },
                                { id: 'auto', label: t('swcs.table.auto') },
                                { id: 'walk', label: t('swcs.table.walk') },
                                { id: 'waiting', label: t('swcs.table.wait') },
                                { id: 'start', label: t('swcs.table.start') },
                                { id: 'finish', label: t('swcs.table.finish') },
                                { id: 'duration', label: t('swcs.table.duration') },
                                { id: 'total', label: t('swcs.table.total') },
                                { id: 'quality', label: t('swcs.table.quality') },
                                { id: 'safety', label: t('swcs.table.safety') },
                                { id: 'kaizen', label: t('swcs.table.kaizen') },
                                { id: 'timing', label: 'Timing' },
                                { id: 'offset', label: 'Offset' }
                            ].filter(col => columnVisibility[col.id]).map((col) => (
                                <label
                                    key={col.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        cursor: 'pointer',
                                        fontSize: '0.85rem',
                                        padding: '4px 8px',
                                        borderRadius: '6px',
                                        background: 'rgba(255, 255, 255, 0.05)'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={columnVisibility[col.id]}
                                        onChange={() => toggleColumn(col.id)}
                                        style={{ cursor: 'pointer', accentColor: '#3b82f6' }}
                                    />
                                    <span>{col.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{
                    flex: '1 1 auto',
                    overflow: 'auto',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div
                        id="swcs-container"
                        style={{
                            width: '100%',
                            flex: 1,
                            backgroundColor: '#0a0a0c',
                            padding: '24px',
                            color: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            fontFamily: "'Inter', sans-serif",
                            minHeight: 0
                        }}
                    >
                        {/* Dashboard Header Bar */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '10px',
                            padding: '6px 16px',
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: '10px',
                            border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{
                                    width: '32px',
                                    height: '32px',
                                    backgroundColor: '#2563eb',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                                }}>
                                    <FileSpreadsheet size={16} />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <h1 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#fff', letterSpacing: '-0.5px' }}>
                                        {t('swcs.title')}
                                    </h1>
                                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                        <div className="swcs-header-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                                            <span className="swcs-header-label" style={{ fontSize: '9px' }}>{t('swcs.header.process')}</span>
                                            <input
                                                value={headerInfo.processName}
                                                onChange={(e) => setHeaderInfo(prev => ({ ...prev, processName: e.target.value }))}
                                                className="swcs-header-value"
                                                style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '700', minWidth: '100px', fontSize: '11px' }}
                                            />
                                        </div>
                                        <div className="swcs-header-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center' }}>
                                            <span className="swcs-header-label" style={{ fontSize: '9px' }}>{t('swcs.header.station')}</span>
                                            <input
                                                value={headerInfo.stationName}
                                                onChange={(e) => setHeaderInfo(prev => ({ ...prev, stationName: e.target.value }))}
                                                className="swcs-header-value"
                                                style={{ border: 'none', background: 'transparent', padding: 0, fontWeight: '700', minWidth: '100px', fontSize: '11px' }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <div style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '9px', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase' }}>Takt Time</span>
                                    <input
                                        type="number"
                                        value={headerInfo.taktTime}
                                        onChange={(e) => setHeaderInfo(prev => ({ ...prev, taktTime: e.target.value }))}
                                        style={{ border: 'none', background: 'transparent', fontWeight: '900', fontSize: '13px', color: '#60a5fa', textAlign: 'center', width: '40px' }}
                                    />
                                </div>
                                <div style={{
                                    backgroundColor: tpsAnalysis.capacity > 100 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(34, 197, 94, 0.05)',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    border: tpsAnalysis.capacity > 100 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(34, 197, 94, 0.2)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center'
                                }}>
                                    <span style={{ fontSize: '9px', color: tpsAnalysis.capacity > 100 ? '#dc2626' : '#16a34a', fontWeight: '800', textTransform: 'uppercase' }}>Capacity</span>
                                    <span style={{ fontWeight: '900', fontSize: '13px', color: tpsAnalysis.capacity > 100 ? '#ef4444' : '#22c55e' }}>
                                        {tpsAnalysis.capacity.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Grid (Small integrated widgets) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '10px' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>{t('swcs.analysis.cycleTime')}</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>{tpsAnalysis.cycleTime.toFixed(1)}s</span>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>VA RATIO</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#22c55e' }}>{tpsAnalysis.vaPercentage.toFixed(1)}%</span>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>WASTE</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ef4444' }}>{(tpsAnalysis.nvaPercentage + tpsAnalysis.nnvaPercentage).toFixed(1)}%</span>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>KAIZEN</span>
                                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#eab308' }}>{tpsAnalysis.kaizenCount}</span>
                            </div>
                        </div>

                        {/* Content Split: Table & Chart */}
                        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                            {/* Left Panel: Table */}
                            <div
                                ref={tableVScrollRef}
                                onScroll={() => handleVerticalSyncScroll(tableVScrollRef, chartVScrollRef)}
                                style={{
                                    flex: '0 0 auto',
                                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    width: `${tableWidth}px`,
                                    backgroundColor: '#0a0a0c',
                                    transition: resizingPanel ? 'none' : 'width 0.1s'
                                }}
                            >
                                <table className="swcs-table" style={{ borderCollapse: 'collapse', width: 'max-content' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                                        <tr style={{ height: '44px', backgroundColor: '#111827' }}>
                                            {[
                                                { id: 'no', label: 'ID', width: columnWidths.no },
                                                { id: 'name', label: 'Element Name', width: columnWidths.name, textAlign: 'left' },
                                                { id: 'man', label: 'M', width: columnWidths.man },
                                                { id: 'auto', label: 'A', width: columnWidths.auto },
                                                { id: 'walk', label: 'W', width: columnWidths.walk },
                                                { id: 'waiting', label: 'WT', width: columnWidths.waiting },
                                                { id: 'total', label: 'TOT', width: columnWidths.total },
                                            ].map((col) => (
                                                <th key={col.id} style={{
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                                    width: col.width,
                                                    minWidth: col.width,
                                                    textAlign: col.textAlign || 'center',
                                                    color: '#94a3b8',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    textTransform: 'uppercase',
                                                    padding: '8px 4px',
                                                    position: 'relative'
                                                }}>
                                                    {col.label}
                                                    <div
                                                        onMouseDown={(e) => handleColumnResizeStart(col.id, e)}
                                                        className="resize-handle"
                                                        style={{
                                                            position: 'absolute',
                                                            right: 0,
                                                            top: 0,
                                                            bottom: 0,
                                                            width: '4px',
                                                            cursor: 'col-resize',
                                                            zIndex: 10,
                                                            transition: 'background-color 0.2s'
                                                        }}
                                                    />
                                                </th>
                                            ))}
                                            {mode === 'manual' && [
                                                { id: 'quality', label: 'Q', width: columnWidths.quality },
                                                { id: 'safety', label: 'S', width: columnWidths.safety },
                                                { id: 'kaizen', label: 'K', width: columnWidths.kaizen },
                                                { id: 'delete', label: '', width: columnWidths.delete },
                                            ].map((col) => (
                                                <th key={col.id} style={{
                                                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRight: col.id === 'delete' ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                                                    width: col.width,
                                                    minWidth: col.width,
                                                    textAlign: 'center',
                                                    fontSize: '11px',
                                                    color: '#94a3b8',
                                                    padding: '8px 0',
                                                    position: 'relative'
                                                }}>
                                                    {col.label}
                                                    {col.id !== 'delete' && (
                                                        <div
                                                            onMouseDown={(e) => handleColumnResizeStart(col.id, e)}
                                                            className="resize-handle"
                                                            style={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                top: 0,
                                                                bottom: 0,
                                                                width: '4px',
                                                                cursor: 'col-resize',
                                                                zIndex: 10,
                                                                transition: 'background-color 0.2s'
                                                            }}
                                                        />
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {timedMeasurements.map((m, idx) => (
                                            <tr key={idx} style={{ height: '40px', backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.01)' }}>
                                                <td style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.no, minWidth: columnWidths.no }}>{idx + 1}</td>
                                                <td style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0 8px', width: columnWidths.name, minWidth: columnWidths.name }}>
                                                    {mode === 'manual' ? (
                                                        <input
                                                            value={m.elementName}
                                                            onChange={(e) => handleManualChange(idx, 'elementName', e.target.value)}
                                                            className="input-modern"
                                                            style={{ color: '#fff', fontSize: '12px', fontWeight: '500' }}
                                                        />
                                                    ) : <div style={{ fontSize: '12px', color: '#fff', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{m.elementName}</div>}
                                                </td>
                                                <td style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.man, minWidth: columnWidths.man }}>
                                                    <input type="number" value={m.manualTime} onChange={(e) => handleManualChange(idx, 'manualTime', e.target.value)} className="input-modern" style={{ textAlign: 'center' }} />
                                                </td>
                                                <td style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.auto, minWidth: columnWidths.auto }}>
                                                    <input type="number" value={m.autoTime} onChange={(e) => handleManualChange(idx, 'autoTime', e.target.value)} className="input-modern" style={{ textAlign: 'center' }} />
                                                </td>
                                                <td style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.walk, minWidth: columnWidths.walk }}>
                                                    <input type="number" value={m.walkTime} onChange={(e) => handleManualChange(idx, 'walkTime', e.target.value)} className="input-modern" style={{ textAlign: 'center' }} />
                                                </td>
                                                <td style={{ borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(239, 68, 68, 0.05)', width: columnWidths.waiting, minWidth: columnWidths.waiting }}>
                                                    <input type="number" value={m.waitingTime || 0} onChange={(e) => handleManualChange(idx, 'waitingTime', e.target.value)} className="input-modern" style={{ textAlign: 'center', color: '#f87171' }} />
                                                </td>
                                                <td style={{ textAlign: 'center', fontWeight: '800', fontSize: '12px', color: '#fff', borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.total, minWidth: columnWidths.total }}>
                                                    {((parseFloat(m.manualTime) || 0) + (parseFloat(m.autoTime) || 0) + (parseFloat(m.walkTime) || 0) + (parseFloat(m.waitingTime) || 0)).toFixed(1)}
                                                </td>
                                                {mode === 'manual' && (
                                                    <>
                                                        <td style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.quality, minWidth: columnWidths.quality }}>
                                                            <input type="checkbox" checked={m.qualityCheck || false} onChange={(e) => handleManualChange(idx, 'qualityCheck', e.target.checked)} />
                                                        </td>
                                                        <td style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.safety, minWidth: columnWidths.safety }}>
                                                            <input type="checkbox" checked={m.safetyPoint || false} onChange={(e) => handleManualChange(idx, 'safetyPoint', e.target.checked)} />
                                                        </td>
                                                        <td style={{ textAlign: 'center', borderRight: '1px solid rgba(255, 255, 255, 0.05)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.kaizen, minWidth: columnWidths.kaizen }}>
                                                            <input type="checkbox" checked={m.kaizenFlag || false} onChange={(e) => handleManualChange(idx, 'kaizenFlag', e.target.checked)} />
                                                        </td>
                                                        <td style={{ textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', width: columnWidths.delete, minWidth: columnWidths.delete }}>
                                                            <button onClick={() => deleteManualRow(idx)} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }}>×</button>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        ))}
                                        {mode === 'manual' && (
                                            <tr>
                                                <td colSpan={11} style={{ padding: 0 }}>
                                                    <button onClick={addManualRow} style={{ width: '100%', padding: '12px', border: 'none', background: 'rgba(255, 255, 255, 0.02)', color: '#3b82f6', fontWeight: '700', cursor: 'pointer' }}>
                                                        + Add Process Element
                                                    </button>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Panel Resize Handle */}
                            <div
                                onMouseDown={handlePanelResizeStart}
                                className="panel-resize-handle"
                                style={{
                                    width: '6px',
                                    cursor: 'col-resize',
                                    backgroundColor: resizingPanel ? '#3b82f6' : 'transparent',
                                    borderRight: '1px solid rgba(255, 255, 255, 0.05)',
                                    zIndex: 30,
                                    transition: 'background-color 0.2s'
                                }}
                            />

                            {/* Right Panel: Chart */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                                <div
                                    ref={chartVScrollRef}
                                    onScroll={() => handleVerticalSyncScroll(chartVScrollRef, tableVScrollRef)}
                                    style={{ flex: 1, overflowY: 'scroll', overflowX: 'auto' }}
                                >
                                    {renderChart()}
                                </div>
                                {/* Legend */}
                                <div style={{
                                    padding: '12px 24px',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                    display: 'flex',
                                    gap: '24px',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: '600',
                                    color: '#94a3b8'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '16px', height: '8px', background: '#22c55e', borderRadius: '4px' }}></div> Manual
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '16px', height: '4px', borderTop: '2px dashed #3b82f6' }}></div> Auto
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <svg width="16" height="8"><path d="M 0 4 Q 4 0 8 4 T 16 4" stroke="#f43f5e" strokeWidth="2" fill="none" /></svg> Walk
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '16px', height: '4px', borderTop: '2px dotted #ef4444' }}></div> Wait
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default StandardWorkCombinationSheet;
