import React, { useState } from 'react';
import { useDialog } from '../contexts/DialogContext';
import { Bot, X, CheckCircle, Eye, EyeOff, Settings } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import { THERBLIGS } from '../constants/therbligs.jsx';
import { chatWithAI } from '../utils/aiGenerator';
import { useLanguage } from '../contexts/LanguageContext';

function ElementEditor({ measurements = [], videoName = 'Untitled', onUpdateMeasurements, videoState, selectedId, onSelect, stopwatches = {}, fullScreenMode, onToggleFullScreen, currentCycle }) {
    const { showAlert, showConfirm, showPrompt } = useDialog();
    const { t } = useLanguage();
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editTherblig, setEditTherblig] = useState('');
    const [editCycle, setEditCycle] = useState(1);
    const [editManual, setEditManual] = useState(0);
    const [editAuto, setEditAuto] = useState(0);
    const [editWalk, setEditWalk] = useState(0);
    const [editWait, setEditWait] = useState(0);
    const [editRating, setEditRating] = useState(100);
    const [searchQuery, setSearchQuery] = useState('');
    const [exportProgress, setExportProgress] = useState(0); // 0 = idle, 1-100 = progress, -1 = error

    const [sortBy, setSortBy] = useState('order');

    // Standard Time State
    const [allowances, setAllowances] = useState({
        personal: 5,
        fatigue: 4,
        delay: 2
    });
    const [showAllowanceModal, setShowAllowanceModal] = useState(false);

    const calculateStandardTime = (duration, rating) => {
        const ratingFactor = (rating || 100) / 100;
        const normalTime = duration * ratingFactor;
        const totalAllowance = allowances.personal + allowances.fatigue + allowances.delay;
        const standardTime = normalTime * (1 + totalAllowance / 100);
        return { normalTime, standardTime };
    };

    // AI Chat State
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);

    const [isChatFullscreen, setIsChatFullscreen] = useState(false);

    const categoryOptions = [
        { key: 'Value-added', label: t('categories.valueAdded') },
        { key: 'Non value-added', label: t('categories.nonValueAdded') },
        { key: 'Waste', label: t('categories.waste') }
    ];

    const getCategoryColor = (category) => {
        if (category === 'Value-added') return '#3f51b5'; // Blue for Value Added
        if (category === 'Non value-added') return '#ffc107'; // Yellow for Non Value Added
        if (category === 'Waste') return '#ef4444'; // Red for Waste
        return 'transparent';
    };

    const renderTherbligIcon = (code) => {
        const therblig = THERBLIGS[code];
        if (!therblig) return null;
        return (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                {therblig.icon}
            </svg>
        );
    };

    // Avatar Component for consistent use
    const SenseiAvatar = ({ size = 40, animated = false, isSpeaking = false }) => (
        <div style={{
            position: 'relative',
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: animated ? 'bounce 3s ease-in-out infinite' : 'none'
        }}>
            <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                opacity: 0.2,
                filter: 'blur(8px)',
                animation: isSpeaking ? 'pulse 1s ease-in-out infinite' : 'none'
            }} />
            <div style={{
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.3)',
                boxShadow: isSpeaking ? '0 0 15px #667eea' : 'none',
                transition: 'all 0.3s ease',
                zIndex: 2
            }}>
                <Bot size={size * 0.5} color="#fff" />
            </div>
            {isSpeaking && (
                <div style={{
                    position: 'absolute',
                    top: -10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '2px',
                    height: '10px',
                    alignItems: 'flex-end',
                    zIndex: 2
                }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            width: '2px',
                            backgroundColor: '#667eea',
                            borderRadius: '1px',
                            animation: `soundWave ${0.5 + i * 0.1}s ease-in-out infinite`,
                            height: '100%'
                        }} />
                    ))}
                </div>
            )}
        </div>
    );


    const totalTime = measurements.reduce((sum, m) => sum + m.duration, 0);
    const valueAddedTime = measurements.filter(m => m.category === 'Value-added').reduce((sum, m) => sum + m.duration, 0);
    const nonValueAddedTime = measurements.filter(m => m.category === 'Non value-added').reduce((sum, m) => sum + m.duration, 0);
    const wasteTime = measurements.filter(m => m.category === 'Waste').reduce((sum, m) => sum + m.duration, 0);



    const handleExport = () => {
        setExportProgress(1); // Show progress bar
        exportToExcel(measurements, videoName, allowances, (progress) => {
            setExportProgress(progress);
            if (progress === 100 || progress === -1) {
                setTimeout(() => setExportProgress(0), 3000); // Hide after completion
            }
        });
    };

    const handleDelete = async (id) => {
        if (await showConfirm(t('common.confirm'), t('elementEditor.confirmDelete'))) {
            onUpdateMeasurements(measurements.filter(m => m.id !== id));
        }
    };

    const [editStartTime, setEditStartTime] = useState(0);
    const [editEndTime, setEditEndTime] = useState(0);

    // Column Visibility State
    const [visibleColumns, setVisibleColumns] = useState({
        no: true,
        cycle: true,
        process: true,
        category: true,
        manual: true,
        auto: true,
        walk: true,
        loss: true,
        therblig: true,
        start: true,
        finish: true,
        duration: true,
        rating: true,
        normalTime: true,
        standardTime: true,
        actions: true
    });
    const [showColumnMenu, setShowColumnMenu] = useState(false);

    const toggleColumn = (column) => {
        setVisibleColumns(prev => ({
            ...prev,
            [column]: !prev[column]
        }));
    };

    const handleStartEdit = (element) => {
        setEditingId(element.id);
        setEditName(element.elementName);
        setEditCategory(element.category);
        setEditTherblig(element.therblig || '');
        setEditCycle(element.cycle || 1);
        setEditManual(element.manualTime || 0);
        setEditAuto(element.autoTime || 0);
        setEditWalk(element.walkTime || 0);
        setEditStartTime(element.startTime);
        setEditEndTime(element.endTime);
        setEditRating(element.rating || 100);
    };

    const handleSaveEdit = async () => {
        const startTime = parseFloat(editStartTime);
        const endTime = parseFloat(editEndTime);

        if (isNaN(startTime) || isNaN(endTime) || startTime < 0 || endTime < 0) {
            await showAlert(t('common.error'), t('elementEditor.errors.positiveTimes'));
            return;
        }

        if (startTime >= endTime) {
            await showAlert(t('common.error'), t('elementEditor.errors.startLessFinish'));
            return;
        }

        const manual = parseFloat(editManual) || 0;
        const auto = parseFloat(editAuto) || 0;
        const walk = parseFloat(editWalk) || 0;
        const waiting = parseFloat(editWait) || 0;
        const duration = endTime - startTime;
        const totalSplit = manual + auto + walk + waiting;

        if (totalSplit > duration + 0.01) { // 0.01 tolerance for floating point
            await showAlert(t('common.error'), t('elementEditor.errors.totalSplitExceeds'));
            return;
        }

        // Soften validation: only warn for under-allocation, don't block
        if (totalSplit > 0 && Math.abs(totalSplit - duration) > 0.05 && totalSplit < duration) {
            console.warn(`Breakdown sum (${totalSplit.toFixed(2)}) != duration (${duration.toFixed(2)})`);
        }

        onUpdateMeasurements(measurements.map(m => m.id === editingId ? {
            ...m,
            elementName: editName,
            category: editCategory,
            therblig: editTherblig,
            cycle: parseInt(editCycle) || 1,
            manualTime: manual,
            autoTime: auto,
            walkTime: walk,
            waitingTime: waiting,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            rating: parseFloat(editRating) || 100
        } : m));
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditCategory('');
        setEditTherblig('');
        setEditCycle(1);
        setEditManual(0);
        setEditAuto(0);
        setEditWalk(0);
        setEditWait(0);
        setEditStartTime(0);
        setEditEndTime(0);
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const updated = [...measurements];
        [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
        onUpdateMeasurements(updated);
    };

    const handleMoveDown = (index) => {
        if (index === measurements.length - 1) return;
        const updated = [...measurements];
        [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
        onUpdateMeasurements(updated);
    };

    const handleRatingChange = (id, rating) => {
        onUpdateMeasurements(measurements.map(m => m.id === id ? { ...m, rating } : m));
    };

    const handleSplit = async (element) => {
        const splitTimeStr = await showPrompt(t('elementEditor.splitTimePrompt', { start: element.startTime.toFixed(2), end: element.endTime.toFixed(2) }), ((element.startTime + element.endTime) / 2).toFixed(2));
        if (splitTimeStr === null || splitTimeStr === undefined) return;

        const splitTime = parseFloat(splitTimeStr);
        if (isNaN(splitTime) || splitTime <= element.startTime || splitTime >= element.endTime) {
            await showAlert(t('common.error'), t('elementEditor.invalidSplitTime'));
            return;
        }

        const firstPart = {
            ...element,
            id: Date.now().toString(),
            endTime: splitTime,
            duration: splitTime - element.startTime,
            elementName: `${element.elementName} (Part 1)`
        };

        const secondPart = {
            ...element,
            id: (Date.now() + 1).toString(),
            startTime: splitTime,
            duration: element.endTime - splitTime,
            elementName: `${element.elementName} (Part 2)`
        };

        const index = measurements.findIndex(m => m.id === element.id);
        const updated = [...measurements];
        updated.splice(index, 1, firstPart, secondPart);
        onUpdateMeasurements(updated);
    };



    const getFilteredAndSortedMeasurements = () => {
        let filtered = [...measurements];
        if (searchQuery) {
            filtered = filtered.filter(m => m.elementName.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        // Filter by current cycle if defined
        if (currentCycle !== undefined && currentCycle > 0) {
            filtered = filtered.filter(m => (m.cycle || 1) === currentCycle);
        }

        switch (sortBy) {
            case 'duration':
                filtered.sort((a, b) => b.duration - a.duration);
                break;

            case 'name':
                filtered.sort((a, b) => a.elementName.localeCompare(b.elementName));
                break;
            case 'cycle':
                filtered.sort((a, b) => (a.cycle || 1) - (b.cycle || 1));
                break;
            default:
                break;
        }
        return filtered;
    };

    const filteredMeasurements = getFilteredAndSortedMeasurements();

    const visibleColumnCount = Object.values(visibleColumns).filter(Boolean).length;
    // Columns that appear before the 'Duration' column
    const columnsBeforeDuration = ['no', 'cycle', 'process', 'category', 'manual', 'auto', 'walk', 'loss', 'therblig', 'start', 'finish'];
    const visibleBeforeDuration = columnsBeforeDuration.filter(c => visibleColumns[c]).length;

    const handleSendMessage = async () => {
        if (!chatInput.trim()) return;



        const userMessage = chatInput.trim();
        setChatInput('');

        // Add user message to history
        const newHistory = [...chatHistory, { role: 'user', content: userMessage }];
        setChatHistory(newHistory);
        setIsAiThinking(true);

        try {
            // Prepare context from measurements
            const context = {
                projectName: videoName,
                elements: measurements.map(m => ({
                    elementName: m.elementName,
                    category: m.category,
                    therblig: m.therblig,
                    duration: m.duration,
                    cycle: m.cycle
                }))
            };

            const aiResponse = await chatWithAI(userMessage, context, newHistory);

            // Add AI response to history
            setChatHistory([...newHistory, { role: 'ai', content: aiResponse }]);
        } catch (error) {
            console.error('Chat error:', error);
            setChatHistory([...newHistory, { role: 'ai', content: `Error: ${error.message}` }]);
        } finally {
            setIsAiThinking(false);
        }
    };

    return (
        <div id="element-editor" style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-secondary)', padding: '10px' }}>
            {/* Filter Row with Action Buttons */}
            {/* Filter Row with Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '4px', marginBottom: '6px', padding: '4px', backgroundColor: '#2a2a2a', borderRadius: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>

                    <button onClick={handleExport} disabled={measurements.length === 0} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', backgroundColor: measurements.length > 0 ? '#217346' : '#555', cursor: measurements.length > 0 ? 'pointer' : 'not-allowed', border: 'none', borderRadius: '4px', color: 'white' }} title={t('common.export')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ verticalAlign: 'middle' }}>
                            <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6zm2-8h8v2H8v-2zm0 4h8v2H8v-2zm0-8h5v2H8V8z" />
                            <text x="12" y="15" fontSize="10" fontWeight="bold" textAnchor="middle" fill="white">X</text>
                        </svg>
                    </button>

                    {/* Full Screen Toggle Button */}
                    {onToggleFullScreen && (
                        <button
                            onClick={onToggleFullScreen}
                            style={{
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1rem',
                                backgroundColor: fullScreenMode === 'editor' ? '#005a9e' : '#333',
                                cursor: 'pointer',
                                border: '2px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                color: 'white',
                                transition: 'all 0.2s'
                            }}
                            title={fullScreenMode === 'editor' ? t('elementEditor.exitFullscreen') : t('elementEditor.fullscreenEditor')}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = fullScreenMode === 'editor' ? '#0077cc' : '#444';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = fullScreenMode === 'editor' ? '#005a9e' : '#333';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }}
                        >
                            ⛶
                        </button>
                    )}
                    <button onClick={() => setShowAllowanceModal(true)} style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem', backgroundColor: '#333', cursor: 'pointer', border: 'none', borderRadius: '4px', color: 'white' }} title={t('elementEditor.allowanceSettings')}>
                        <Settings size={16} />
                    </button>

                    {/* Column Visibility Toggle */}
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button
                            onClick={() => setShowColumnMenu(!showColumnMenu)}
                            style={{
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.9rem',
                                backgroundColor: showColumnMenu ? '#444' : '#2a2a2a',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                            title={t('elementEditor.toggleColumns')}
                        >
                            {showColumnMenu ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        {showColumnMenu && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                zIndex: 1000,
                                backgroundColor: '#1a1a1a',
                                border: '1px solid #444',
                                borderRadius: '4px',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                minWidth: '150px',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                            }}>
                                <div style={{ padding: '4px', borderBottom: '1px solid #333', marginBottom: '4px', fontWeight: 'bold', fontSize: '0.8rem', color: '#888' }}>
                                    {t('elementEditor.toggleColumns')}
                                </div>
                                {Object.keys(visibleColumns).map(col => (
                                    <label key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#ccc', cursor: 'pointer', padding: '2px 4px', borderRadius: '3px', ':hover': { backgroundColor: '#333' } }}>
                                        <input
                                            type="checkbox"
                                            checked={visibleColumns[col]}
                                            onChange={() => toggleColumn(col)}
                                            style={{ accentColor: '#0078d4' }}
                                        />
                                        {col.charAt(0).toUpperCase() + col.slice(1)}
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Search and Sort - Moved here */}
                    <input type="text" placeholder={t('elementEditor.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '6px 12px', backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.85rem', minWidth: '200px' }} />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '6px', backgroundColor: '#1a1a1a', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '0.85rem' }}>
                        <option value="order">{t('elementEditor.sortOriginal')}</option>
                        <option value="cycle">{t('elementEditor.sortCycle')}</option>
                        <option value="duration">{t('elementEditor.sortDuration')}</option>
                        <option value="name">{t('elementEditor.sortName')}</option>
                    </select>

                    {/* Cycle Indicator */}
                    {currentCycle !== undefined && currentCycle > 0 && (
                        <div style={{
                            padding: '6px 12px',
                            backgroundColor: 'rgba(0, 90, 158, 0.2)',
                            border: '1px solid rgba(0, 90, 158, 0.5)',
                            borderRadius: '4px',
                            color: '#60a5fa',
                            fontSize: '0.85rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontWeight: '600'
                        }}>
                            <span>📊</span>
                            <span>{t('elementEditor.cycle')} {currentCycle}</span>
                        </div>
                    )}
                </div>
            </div>

            {exportProgress !== 0 && (
                <div style={{
                    marginBottom: '10px',
                    padding: '10px',
                    backgroundColor: '#2a2a2a',
                    borderRadius: '4px',
                    border: `1px solid ${exportProgress === -1 ? '#f00' : '#444'}`
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '0.8rem' }}>
                        <span>
                            {exportProgress === -1 ? t('elementEditor.exportFailed') :
                                exportProgress === 100 ? t('elementEditor.exportSuccess') : t('elementEditor.preparingExcel')}
                        </span>
                        {exportProgress > 0 && <span>{exportProgress}%</span>}
                    </div>
                    {exportProgress > 0 && (
                        <div style={{ width: '100%', height: '4px', backgroundColor: '#1a1a1a', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                width: `${exportProgress}%`,
                                height: '100%',
                                backgroundColor: exportProgress === 100 ? '#4caf50' : '#0078d4',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                    )}
                </div>
            )}



            {(searchQuery) && (
                <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '8px', padding: '4px 8px', backgroundColor: '#2a2a2a', borderRadius: '4px' }}>
                    {t('elementEditor.showingElements', { filtered: filteredMeasurements.length, total: measurements.length })}
                </div>
            )}

            <div style={{ flex: 1, overflow: 'auto', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
                <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', color: '#fff', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#333', zIndex: 1 }}>
                        <tr>
                            {visibleColumns.actions && <th style={{ padding: '4px', border: '1px solid #444', width: '80px', fontSize: '0.7rem', minWidth: '80px', maxWidth: '80px' }}>{t('elementEditor.actions')}</th>}
                            {visibleColumns.no && <th style={{ padding: '4px', border: '1px solid #444', width: '40px', fontSize: '0.7rem' }}>{t('swcs.table.no')}</th>}
                            {visibleColumns.cycle && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem' }}>{t('elementEditor.cycle')}</th>}
                            {visibleColumns.process && <th style={{ padding: '4px', border: '1px solid #444', fontSize: '0.7rem' }}>{t('swcs.header.process')}</th>}
                            {visibleColumns.category && <th style={{ padding: '4px', border: '1px solid #444', width: '150px', fontSize: '0.7rem' }}>{t('elementEditor.category')}</th>}
                            {visibleColumns.manual && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem', color: '#ffd700' }}>{t('swcs.table.man')}</th>}
                            {visibleColumns.auto && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem', color: '#00ff00' }}>{t('swcs.table.auto')}</th>}
                            {visibleColumns.walk && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem', color: '#ff4d4d' }}>{t('swcs.table.walk')}</th>}
                            {visibleColumns.loss && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem', color: '#f97316' }}>{t('elementEditor.loss')}</th>}
                            {visibleColumns.therblig && <th style={{ padding: '4px', border: '1px solid #444', width: '100px', fontSize: '0.7rem' }}>{t('elementEditor.therbligType')}</th>}

                            {visibleColumns.start && <th style={{ padding: '4px', border: '1px solid #444', width: '70px', fontSize: '0.7rem' }}>{t('elementEditor.startTime')} (s)</th>}
                            {visibleColumns.finish && <th style={{ padding: '4px', border: '1px solid #444', width: '70px', fontSize: '0.7rem' }}>{t('elementEditor.endTime')} (s)</th>}
                            {visibleColumns.duration && <th style={{ padding: '4px', border: '1px solid #444', width: '80px', fontSize: '0.7rem' }}>{t('elementEditor.duration')} (s)</th>}
                            {visibleColumns.rating && <th style={{ padding: '4px', border: '1px solid #444', width: '60px', fontSize: '0.7rem', color: '#00a6ff' }}>{t('elementEditor.rating')}</th>}
                            {visibleColumns.normalTime && <th style={{ padding: '4px', border: '1px solid #444', width: '70px', fontSize: '0.7rem', color: '#00a6ff' }}>{t('elementEditor.normalTime')}</th>}
                            {visibleColumns.standardTime && <th style={{ padding: '4px', border: '1px solid #444', width: '70px', fontSize: '0.7rem', color: '#00d4ff' }}>{t('elementEditor.standardTime')}</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredMeasurements.length === 0 ? (
                            <tr>
                                <td colSpan={16} style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                                    {measurements.length === 0 ? t('elementEditor.emptyElements') : t('elementEditor.noFilterMatch')}
                                </td>
                            </tr>
                        ) : (
                            filteredMeasurements.map((el) => {
                                const originalIndex = measurements.findIndex(m => m.id === el.id);
                                return (
                                    <tr
                                        key={el.id}
                                        style={{
                                            borderBottom: '1px solid #333',
                                            backgroundColor: selectedId === el.id ? 'rgba(0, 90, 158, 0.3)' : 'transparent',
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => onSelect && onSelect(el.id)}
                                    >
                                        {visibleColumns.actions && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'center' }}>
                                            {editingId === el.id ? (
                                                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                    <button onClick={handleSaveEdit} style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#0a0', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '3px' }} title={t('common.save')}>✓</button>
                                                    <button onClick={handleCancelEdit} style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: '#a00', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '3px' }} title={t('common.cancel')}>✗</button>
                                                </div>
                                            ) : (
                                                <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', flexWrap: 'wrap' }}>

                                                    {/* Quick Categorize Buttons (Stopwatch Style) */}
                                                    <div style={{ display: 'none' }}></div>

                                                    <button onClick={() => handleStartEdit(el)} style={{ padding: '3px 6px', fontSize: '0.7rem', backgroundColor: '#05a', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '3px' }} title={t('common.edit')}>✎</button>
                                                    <button onClick={() => handleDelete(el.id)} style={{ padding: '3px 6px', fontSize: '0.7rem', backgroundColor: '#a00', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '3px' }} title={t('common.delete')}>🗑</button>
                                                </div>
                                            )
                                            }
                                        </td>}
                                        {visibleColumns.no && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'center' }}>{originalIndex + 1}</td>}
                                        {visibleColumns.cycle && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'center', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    value={editCycle}
                                                    onChange={(e) => setEditCycle(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    min="1"
                                                    style={{ width: '60px', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: 'white', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ backgroundColor: '#333', padding: '2px 6px', borderRadius: '4px', border: '1px solid #555' }}>
                                                    {el.cycle || 1}
                                                </span>
                                            )}
                                        </td>}
                                        {visibleColumns.process && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()} style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: 'white', fontSize: '0.85rem' }} />
                                            ) : el.elementName}
                                        </td>}
                                        {visibleColumns.category && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: 'white', fontSize: '0.85rem' }}>
                                                    {categoryOptions.map(cat => <option key={cat.key} value={cat.key}>{cat.label}</option>)}
                                                </select>
                                            ) : (
                                                <span style={{ display: 'inline-block', padding: '3px 8px', backgroundColor: getCategoryColor(el.category), borderRadius: '3px', fontSize: '0.8rem' }}>
                                                    {categoryOptions.find(c => c.key === el.category)?.label || el.category}
                                                </span>
                                            )}
                                        </td>}
                                        {visibleColumns.manual && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'center', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editManual}
                                                    onChange={(e) => setEditManual(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: '#ffd700', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#ffd700' }}>{el.manualTime ? el.manualTime.toFixed(2) : '-'}</span>
                                            )}
                                        </td>}
                                        {visibleColumns.auto && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'center', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editAuto}
                                                    onChange={(e) => setEditAuto(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: '#00ff00', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#00ff00' }}>{el.autoTime ? el.autoTime.toFixed(2) : '-'}</span>
                                            )}
                                        </td>}
                                        {visibleColumns.walk && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'center', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editWalk}
                                                    onChange={(e) => setEditWalk(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#ff4d4d' }}>{el.walkTime ? el.walkTime.toFixed(2) : '-'}</span>
                                            )}
                                        </td>}
                                        {visibleColumns.loss && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'center', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={editWait}
                                                    onChange={(e) => setEditWait(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: '#f97316', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#f97316' }}>{el.waitingTime ? el.waitingTime.toFixed(2) : '-'}</span>
                                            )}
                                        </td>}
                                        {visibleColumns.therblig && <td
                                            onClick={() => editingId !== el.id && handleStartEdit(el)}
                                            style={{ padding: '6px', border: '1px solid #444', cursor: editingId !== el.id ? 'pointer' : 'default' }}
                                        >
                                            {editingId === el.id ? (
                                                <select value={editTherblig} onChange={(e) => setEditTherblig(e.target.value)} style={{ width: '100%', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: 'white', fontSize: '0.85rem' }}>
                                                    <option value="">{t('elementEditor.selectOption')}</option>
                                                    {Object.entries(THERBLIGS).map(([code, { name }]) => (
                                                        <option key={code} value={code}>{code} - {name}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                el.therblig && THERBLIGS[el.therblig] ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 8px', backgroundColor: THERBLIGS[el.therblig].color + '40', border: `1px solid ${THERBLIGS[el.therblig].color}`, borderRadius: '3px', fontSize: '0.8rem', color: '#fff' }}>
                                                        {renderTherbligIcon(el.therblig)}
                                                        <span>{el.therblig}</span>
                                                    </span>
                                                ) : '-'
                                            )}
                                        </td>}

                                        {visibleColumns.start && <td
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'right', fontSize: '0.8rem', color: '#888' }}
                                        >
                                            {el.startTime.toFixed(2)}
                                        </td>}
                                        {visibleColumns.finish && <td
                                            style={{ padding: '6px', border: '1px solid #444', textAlign: 'right', fontSize: '0.8rem', color: '#888' }}
                                        >
                                            {el.endTime.toFixed(2)}
                                        </td>}
                                        {visibleColumns.duration && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'right', fontWeight: 'bold' }}>
                                            {(el.endTime - el.startTime).toFixed(2)}
                                        </td>}
                                        {visibleColumns.rating && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'center' }}>
                                            {editingId === el.id ? (
                                                <input
                                                    type="number"
                                                    value={editRating}
                                                    onChange={(e) => setEditRating(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                                                    min="0"
                                                    max="200"
                                                    style={{ width: '50px', padding: '4px', backgroundColor: '#222', border: '1px solid #555', color: '#00a6ff', fontSize: '0.85rem', textAlign: 'center' }}
                                                />
                                            ) : (
                                                <span style={{ color: '#00a6ff' }}>{el.rating || 100}%</span>
                                            )}
                                        </td>}
                                        {visibleColumns.normalTime && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'right', color: '#888' }}>
                                            {calculateStandardTime(el.duration, el.rating).normalTime.toFixed(2)}
                                        </td>}
                                        {visibleColumns.standardTime && <td style={{ padding: '6px', border: '1px solid #444', textAlign: 'right', fontWeight: 'bold', color: '#00d4ff' }}>
                                            {calculateStandardTime(el.duration, el.rating).standardTime.toFixed(2)}
                                        </td>}

                                    </tr>
                                );
                            })
                        )}
                        {
                            measurements.length > 0 && (
                                <>
                                    <tr style={{ backgroundColor: '#222', fontWeight: 'bold' }}>
                                        {visibleColumns.actions && <td style={{ border: '1px solid #444' }}></td>}
                                        <td colSpan={visibleBeforeDuration} style={{ padding: '8px', border: '1px solid #444' }}>{t('elementEditor.total')}</td>
                                        {visibleColumns.duration && <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>{totalTime.toFixed(2)}</td>}
                                    </tr>
                                    <tr style={{ backgroundColor: '#1a1a1a', fontSize: '0.8rem' }}>
                                        <td colSpan={visibleColumnCount} style={{ padding: '10px', border: '1px solid #444' }}>
                                            <div style={{ display: 'flex', gap: '20px', justifyContent: 'space-around', flexWrap: 'wrap' }}>
                                                <div><span style={{ color: '#3f51b5' }}>■</span> Value-added: {valueAddedTime.toFixed(2)}s {totalTime > 0 && `(${((valueAddedTime / totalTime) * 100).toFixed(1)}%)`}</div>
                                                <div><span style={{ color: '#ffc107' }}>■</span> Non value-added: {nonValueAddedTime.toFixed(2)}s {totalTime > 0 && `(${((nonValueAddedTime / totalTime) * 100).toFixed(1)}%)`}</div>
                                                <div><span style={{ color: '#ef4444' }}>■</span> Waste: {wasteTime.toFixed(2)}s {totalTime > 0 && `(${((wasteTime / totalTime) * 100).toFixed(1)}%)`}</div>
                                            </div>
                                        </td>
                                    </tr>
                                </>
                            )
                        }
                    </tbody >
                </table >
            </div >

            {/* AI Chat Panel */}
            {
                showChat && (
                    <div style={{
                        position: 'fixed',
                        right: isChatFullscreen ? '0' : '20px',
                        bottom: isChatFullscreen ? '0' : '20px',
                        top: isChatFullscreen ? '0' : 'auto',
                        left: isChatFullscreen ? '0' : 'auto',
                        width: isChatFullscreen ? '100%' : '400px',
                        height: isChatFullscreen ? '100%' : '500px',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #444',
                        borderRadius: isChatFullscreen ? '0' : '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 1000,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                    }}>
                        {/* Chat Header */}
                        <div style={{ padding: '10px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #444', borderRadius: isChatFullscreen ? '0' : '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>⏱️</span>
                                <div>
                                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '0.9rem' }}>Mavi Engineer</div>
                                    <div style={{ color: '#888', fontSize: '0.7rem' }}>Analyzing {measurements.length} elements</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setIsChatFullscreen(!isChatFullscreen)}
                                    style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}
                                    title={isChatFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                                >
                                    {isChatFullscreen ? '⊡' : '⊞'}
                                </button>
                                <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {chatHistory.length === 0 ? (
                                <div style={{ color: '#666', textAlign: 'center', marginTop: '20px', fontSize: '0.85rem' }}>
                                    <p>👋 Halo! Saya AI Industrial Engineer.</p>
                                    <p style={{ marginTop: '10px' }}>Tanyakan tentang:</p>
                                    <ul style={{ textAlign: 'left', marginTop: '10px', lineHeight: '1.6' }}>
                                        <li>Analisis cycle time</li>
                                        <li>Saran optimasi proses</li>
                                        <li>Identifikasi waste</li>
                                        <li>Rekomendasi improvement</li>
                                    </ul>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <div key={idx} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: '8px', backgroundColor: msg.role === 'user' ? '#0078d4' : '#2d2d2d', color: 'white', fontSize: '0.85rem', lineHeight: '1.4', whiteSpace: 'pre-wrap' }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            {isAiThinking && (
                                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                    <div style={{ padding: '8px 12px', borderRadius: '8px', backgroundColor: '#2d2d2d', color: '#888', fontSize: '0.85rem' }}>
                                        <span>💭 Thinking...</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Chat Input */}
                        <div style={{ padding: '10px', borderTop: '1px solid #444', display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !isAiThinking && handleSendMessage()}
                                placeholder="Tanyakan sesuatu..."
                                disabled={isAiThinking}
                                style={{ flex: 1, padding: '8px', backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', color: 'white', fontSize: '0.85rem' }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={isAiThinking || !chatInput.trim()}
                                style={{ padding: '8px 12px', backgroundColor: isAiThinking || !chatInput.trim() ? '#444' : '#0078d4', border: 'none', borderRadius: '4px', color: 'white', cursor: isAiThinking || !chatInput.trim() ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                            >
                                {isAiThinking ? '⌛' : '→'}
                            </button>
                        </div>
                    </div>
                )
            }
            {/* AI Sensei Floating Button */}
            <div
                onClick={() => setShowChat(!showChat)}
                style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '30px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 0 15px rgba(102, 126, 234, 0.3)',
                    zIndex: 1000,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: showChat ? 'none' : 'bounce 3s ease-in-out infinite'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(102, 126, 234, 0.5)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1) translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
                }}
                title="MAVi Sensei - AI Assistant"
            >
                {showChat ? (
                    <X size={24} color="#fff" />
                ) : (
                    <div style={{ position: 'relative' }}>
                        <SenseiAvatar size={40} animated={!showChat} />
                        {!showChat && (
                            <span style={{
                                position: 'absolute',
                                top: '0',
                                right: '0',
                                width: '12px',
                                height: '12px',
                                borderRadius: '50%',
                                backgroundColor: '#4CAF50',
                                border: '2px solid #0a0a0a',
                                boxShadow: '0 0 10px #4CAF50'
                            }} />
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                @keyframes soundWave {
                    0%, 100% { height: 4px; }
                    50% { height: 12px; }
                }
            `}</style>
            {/* Allowance Modal */}
            {showAllowanceModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }} onClick={() => setShowAllowanceModal(false)}>
                    <div style={{
                        backgroundColor: '#1e1e1e',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '300px',
                        border: '1px solid #444',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0, color: 'white' }}>⚙️ {t('allowance.title')}</h3>
                            <button onClick={() => setShowAllowanceModal(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.9rem' }}>{t('allowance.personal')}</label>
                                <input
                                    type="number"
                                    value={allowances.personal}
                                    onChange={(e) => setAllowances({ ...allowances, personal: parseFloat(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.9rem' }}>{t('allowance.basicFatigue')}</label>
                                <input
                                    type="number"
                                    value={allowances.fatigue}
                                    onChange={(e) => setAllowances({ ...allowances, fatigue: parseFloat(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', color: '#ccc', marginBottom: '5px', fontSize: '0.9rem' }}>{t('allowance.delay')}</label>
                                <input
                                    type="number"
                                    value={allowances.delay}
                                    onChange={(e) => setAllowances({ ...allowances, delay: parseFloat(e.target.value) || 0 })}
                                    style={{ width: '100%', padding: '8px', backgroundColor: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                                />
                            </div>

                            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#2a2a2a', borderRadius: '4px', fontSize: '0.9rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#888' }}>
                                    <span>{t('allowance.total')}</span>
                                    <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>
                                        {allowances.personal + allowances.fatigue + allowances.delay}%
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => setShowAllowanceModal(false)}
                                style={{ width: '100%', padding: '10px', backgroundColor: '#0078d4', border: 'none', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {t('allowance.done')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ElementEditor;
