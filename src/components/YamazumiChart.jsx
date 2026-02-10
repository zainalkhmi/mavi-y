import React, { useState, useMemo, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import {
    BarChart3, Scale, Zap, Brain, Layout, Activity, ChevronDown,
    RefreshCcw, Trash2, Users, CheckCircle, TrendingUp, Target,
    Search, Filter, Info, AlertTriangle, Play
} from 'lucide-react';
import { getAllProjects, getProjectByName, updateProject } from '../utils/database';
import LineBalancingBoard from './LineBalancingBoard';
import AIChatOverlay from './features/AIChatOverlay';
import { useProject } from '../contexts/ProjectContext';
import { useLanguage } from '../i18n/LanguageContext';

function YamazumiChart({ measurements: propMeasurements = [] }) {
    const { t } = useLanguage();
    const { currentProject } = useProject();
    const [measurements, setMeasurements] = useState(propMeasurements);
    const [projects, setProjects] = useState([]);
    const [selectedProjects, setSelectedProjects] = useState([]); // Array of project names
    const [taktTime, setTaktTime] = useState(30); // Default takt time in seconds
    const [showTaktLine, setShowTaktLine] = useState(true);
    const [targetCycleRatio, setTargetCycleRatio] = useState(0.95); // 95% of Takt Time
    const [isBalancingMode, setIsBalancingMode] = useState(false);

    // Kaizen Simulation State
    const [isSimulating, setIsSimulating] = useState(false);
    const [eliminateWaste, setEliminateWaste] = useState(false);
    const [simplifyNNVA, setSimplifyNNVA] = useState(0); // 0% reduction

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);


    const [showChat, setShowChat] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // Helper to normalize category names
    const normalizeCategory = (cat) => {
        if (!cat) return 'Other';
        const lowerCat = cat.toString().toLowerCase();
        if (lowerCat.includes('non value') || lowerCat.includes('nva') || lowerCat.includes('non-value')) return 'Non value-added';
        if (lowerCat.includes('value') || lowerCat.includes('va')) return 'Value-added';
        if (lowerCat.includes('waste') || lowerCat.includes('muda')) return 'Waste';
        return 'Other';
    };

    // Group measurements by operator/station
    const chartData = useMemo(() => {
        if (measurements.length === 0) return [];

        // Group by operator (if exists) or create default stations
        const grouped = measurements.reduce((acc, m) => {
            // Use composite key if multiple projects are selected to avoid collisions
            // But for display, we might want to show "Project - Station"
            const stationName = m.station || t('yamazumi.defaultStation');
            const projectPrefix = m.projectName ? `${m.projectName} - ` : '';
            const uniqueStation = m.projectName ? `${m.projectName}::${stationName}` : stationName;

            if (!acc[uniqueStation]) {
                acc[uniqueStation] = {
                    items: [],
                    displayName: projectPrefix + stationName,
                    projectName: m.projectName
                };
            }
            acc[uniqueStation].items.push(m);
            return acc;
        }, {});

        // Convert to chart data format
        return Object.entries(grouped).map(([uniqueStation, data]) => {
            const { items, displayName } = data;
            const stationData = {
                station: displayName,
                uniqueId: uniqueStation
            };
            let totalTime = 0;

            // Group by category for stacking
            const categories = {};
            items.forEach(item => {
                const man = parseFloat(item.manualTime) || 0;
                const walk = parseFloat(item.walkTime) || 0;
                const wait = parseFloat(item.waitingTime) || 0;
                const auto = parseFloat(item.autoTime) || 0;

                // Priority 1: Use valueType if available (granular breakdown from SWCS)
                if (item.valueType) {
                    // Manual Time
                    if (man > 0) {
                        const cat = normalizeCategory(item.valueType.manual || 'VA');
                        if (!categories[cat]) categories[cat] = 0;
                        categories[cat] += man;
                    }
                    // Auto Time (Machine)
                    if (auto > 0) {
                        const cat = normalizeCategory(item.valueType.auto || 'VA');
                        if (!categories[cat]) categories[cat] = 0;
                        categories[cat] += auto;
                    }
                    // Walk Time
                    if (walk > 0) {
                        const cat = normalizeCategory(item.valueType.walk || 'NVA');
                        if (!categories[cat]) categories[cat] = 0;
                        categories[cat] += walk;
                    }
                    // Waiting Time
                    if (wait > 0) {
                        const cat = normalizeCategory(item.valueType.waiting || 'NVA');
                        if (!categories[cat]) categories[cat] = 0;
                        categories[cat] += wait;
                    }

                    const totalItemTime = man + auto + walk + wait;
                    totalTime += totalItemTime;

                    return; // Skip legacy logic for this item
                }

                // Priority 2: Standard/Legacy Logic
                const rawCategory = item.category || t('yamazumi.other');
                const category = normalizeCategory(rawCategory);

                if (!categories[category]) {
                    categories[category] = 0;
                }

                let operatorTime = man + walk + wait;

                // If it's pure Machine work (or legacy auto), include it if categorized
                // TPS "Operator Balance" strictly ignores machine time, but usually we want to see it if it's assigned to the operator's station explicitly.
                if (auto > 0) {
                    operatorTime += auto;
                }

                // Fallback for legacy data (if no breakdown exists but duration does)
                if (operatorTime === 0 && auto === 0 && item.duration > 0) {
                    operatorTime = item.duration;
                }
                // Kaizen Simulation Logic
                if (isSimulating) {
                    const lowerCat = category.toLowerCase();
                    if ((lowerCat.includes('waste') || lowerCat.includes('muda')) && eliminateWaste) {
                        operatorTime = 0;
                    } else if ((lowerCat.includes('non value') || lowerCat.includes('nva') || lowerCat.includes('non-value')) && simplifyNNVA > 0) {
                        // For NNVA, we reduce the time based on the slider
                        operatorTime = operatorTime * (1 - (simplifyNNVA / 100));
                    }
                }

                if (operatorTime > 0) {
                    categories[category] += operatorTime;
                    totalTime += operatorTime;
                }
            });

            // Add categories to station data
            Object.entries(categories).forEach(([category, duration]) => {
                stationData[category] = parseFloat(duration.toFixed(2));
            });

            stationData.total = parseFloat(totalTime.toFixed(2));
            stationData.isBottleneck = totalTime > taktTime;

            return stationData;
        }).sort((a, b) => a.station.localeCompare(b.station));
    }, [measurements, taktTime, isSimulating, eliminateWaste, simplifyNNVA]);

    // Get unique categories for stacking
    const categories = useMemo(() => {
        // We know exactly what categories we support now
        return ['Value-added', 'Non value-added', 'Waste', 'Other'];
    }, []);

    // Color mapping for categories (TPS Standard)
    const getCategoryColor = (category) => {
        if (!category) return '#94a3b8';
        const lowerCat = category.toString().toLowerCase();

        if (lowerCat.includes('non value') || lowerCat.includes('nva') || lowerCat.includes('non-value')) {
            return '#ffc107'; // Yellow
        }
        if (lowerCat.includes('value') || lowerCat.includes('va')) {
            return '#3f51b5'; // Blue
        }
        if (lowerCat.includes('waste') || lowerCat.includes('muda')) {
            return '#ef4444'; // Red
        }

        return '#64748b'; // Other (Slate)
    };

    const getCategoryDisplay = (category) => {
        if (!category) return t('yamazumi.other');
        const lowerCat = category.toString().toLowerCase();

        if (lowerCat.includes('non value') || lowerCat.includes('nva') || lowerCat.includes('non-value')) {
            return t('categories.nonValueAdded');
        }
        if (lowerCat.includes('value') || lowerCat.includes('va')) {
            return t('categories.valueAdded');
        }
        if (lowerCat.includes('waste') || lowerCat.includes('muda')) {
            return t('categories.waste');
        }

        if (lowerCat === 'other') return t('yamazumi.other');

        return category; // Fallback to raw string if unknown
    };

    // Calculate statistics
    const stats = useMemo(() => {
        if (chartData.length === 0) return null;

        const totalTimes = chartData.map(d => d.total);
        const maxTime = Math.max(...totalTimes);
        const minTime = Math.min(...totalTimes);
        const sumTime = totalTimes.reduce((a, b) => a + b, 0);
        const avgTime = sumTime / (totalTimes.length || 1);
        const bottlenecks = chartData.filter(d => d.isBottleneck).length;

        const totalWorkContent = sumTime; // Sum of all operator work
        const theoreticalMen = taktTime > 0 ? Math.ceil(totalWorkContent / taktTime) : 0;

        // TPS Standard Line Balance Efficiency = (Σ Station Times) / (Number of Stations * Max Station Time)
        const lineBalanceEfficiency = (maxTime > 0 && totalTimes.length > 0)
            ? (sumTime / (totalTimes.length * maxTime) * 100)
            : 0;

        return {
            maxTime: maxTime.toFixed(2),
            minTime: minTime.toFixed(2),
            avgTime: avgTime.toFixed(2),
            bottlenecks,
            balance: lineBalanceEfficiency.toFixed(1),
            totalWorkContent: totalWorkContent.toFixed(1),
            theoreticalMen
        };
    }, [chartData, taktTime]);

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: 'rgba(10, 10, 12, 0.95)',
                    padding: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    backdropFilter: 'blur(10px)',
                    minWidth: '180px'
                }}>
                    <div style={{
                        fontSize: '0.9rem',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '8px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingBottom: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Layout size={14} />
                        {data.station}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {payload.map((entry, index) => (
                            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>{entry.name}</span>
                                <span style={{ color: entry.color, fontWeight: '600' }}>{entry.value}s</span>
                            </div>
                        ))}
                    </div>
                    <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>Total</span>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: '#fff' }}>{data.total}s</span>
                    </div>
                    {data.isBottleneck && (
                        <div style={{
                            marginTop: '8px',
                            padding: '4px 8px',
                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <AlertTriangle size={12} />
                            {t('yamazumi.bottleneckDetected')}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    // Load projects on mount
    useEffect(() => {
        loadProjects();
    }, []);

    // Sync with global currentProject from File Explorer
    useEffect(() => {
        if (currentProject && currentProject.projectName && selectedProjects.length === 0) {
            setSelectedProjects([currentProject.projectName]);
        }
    }, [currentProject]);

    // Update measurements when prop changes (only if no projects selected)
    useEffect(() => {
        if (propMeasurements && propMeasurements.length > 0 && selectedProjects.length === 0) {
            setMeasurements(propMeasurements);
        }
    }, [propMeasurements, selectedProjects]);

    // Fetch measurements for selected projects
    useEffect(() => {
        const fetchProjectMeasurements = async () => {
            if (selectedProjects.length === 0) {
                if (propMeasurements.length === 0) setMeasurements([]);
                return;
            }

            let combinedMeasurements = [];
            for (const projectName of selectedProjects) {
                try {
                    const project = await getProjectByName(projectName);
                    if (project && project.measurements) {
                        // Tag measurements with project name
                        const tagged = project.measurements.map(m => ({
                            ...m,
                            projectName: projectName,
                            // Ensure station has a value
                            station: m.station || m.operator || 'Station 1'
                        }));
                        combinedMeasurements = [...combinedMeasurements, ...tagged];
                    }
                } catch (error) {
                    console.error(`Error loading project ${projectName}:`, error);
                }
            }
            setMeasurements(combinedMeasurements);
        };

        fetchProjectMeasurements();
    }, [selectedProjects, propMeasurements]);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            setProjects(allProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const toggleProjectSelection = (projectName) => {
        setSelectedProjects(prev => {
            if (prev.includes(projectName)) {
                return prev.filter(p => p !== projectName);
            } else {
                return [...prev, projectName];
            }
        });
    };

    const handleMeasurementsUpdate = async (newMeasurements) => {
        setMeasurements(newMeasurements);

        // Group by project and save
        const projectGroups = {};

        // Initialize groups for all currently selected projects to ensure we handle empty states if needed
        selectedProjects.forEach(p => projectGroups[p] = []);

        newMeasurements.forEach(m => {
            if (m.projectName) {
                if (!projectGroups[m.projectName]) {
                    projectGroups[m.projectName] = [];
                }
                // Remove the temporary projectName field before saving if desired, 
                // but keeping it might be useful. The database schema doesn't strictly forbid extras.
                // However, let's clean it up to be safe, or keep it if we want to track origin.
                // For now, let's keep the object as is but ensure we strip the composite station name if we used one.
                // Actually, the station name in 'm' is the raw station name (e.g. "Station 1"), 
                // the composite name was only for chartData.
                // Wait, LineBalancingBoard might have updated the station name.
                // If LineBalancingBoard uses the composite name, we need to parse it.

                // Let's check LineBalancingBoard. It uses the 'station' field.
                // If we passed composite names to LineBalancingBoard, we need to split them.
                // But in the current implementation of LineBalancingBoard (which I should check),
                // it groups by 'station'. 
                // We need to ensure LineBalancingBoard works with our data structure.

                projectGroups[m.projectName].push(m);
            }
        });

        // Save each project
        for (const [projectName, measurements] of Object.entries(projectGroups)) {
            try {
                // We need to be careful not to overwrite with empty if it wasn't intended.
                // But here, if a project is selected, we are managing its measurements.
                // If a user moves all tasks out of Project A, Project A should have empty measurements.

                // One edge case: What if a task is moved to a project that wasn't originally its own?
                // The 'projectName' property on the measurement should be updated when it's moved.
                // LineBalancingBoard needs to support updating the 'projectName' if we drag across projects.

                // Currently LineBalancingBoard only updates 'station'.
                // We need to update LineBalancingBoard to handle cross-project moves.
                // For now, let's assume LineBalancingBoard returns measurements with updated 'station'.
                // If we use composite station names in LineBalancingBoard (e.g. "Project A::Station 1"),
                // then we can parse that here to update 'projectName'.

                await updateProject(projectName, { measurements });
            } catch (error) {
                console.error(`Error saving project ${projectName}:`, error);
            }
        }
    };

    // We need to wrap LineBalancingBoard to handle the composite keys
    const handleLineBalancingUpdate = (updatedMeasurements) => {
        // updatedMeasurements will have 'station' set to the composite key (e.g. "Project A::Station 1")
        // We need to parse this back to projectName and station

        const processedMeasurements = updatedMeasurements.map(m => {
            if (m.station && m.station.includes('::')) {
                const [proj, stat] = m.station.split('::');
                return {
                    ...m,
                    projectName: proj,
                    station: stat,
                    operator: stat // Keep operator in sync
                };
            }
            return m;
        });

        handleMeasurementsUpdate(processedMeasurements);
    };

    // Prepare measurements for LineBalancingBoard with composite station names
    const balancingMeasurements = useMemo(() => {
        return measurements.map(m => {
            const stationName = m.station || m.operator || 'Station 1';
            const compositeName = m.projectName ? `${m.projectName}::${stationName}` : stationName;
            return {
                ...m,
                station: compositeName,
                operator: compositeName // Ensure operator matches station for LineBalancingBoard grouping
            };
        });
    }, [measurements]);

    if (measurements.length === 0 && projects.length === 0) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
                <p>{t('yamazumi.loadingProjects')}</p>
            </div>
        );
    }

    return (
        <div style={{
            padding: '24px',
            backgroundColor: '#0a0a0c',
            height: '100%',
            overflowY: 'auto',
            color: '#fff',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(10px)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2563eb'
                    }}>
                        <BarChart3 size={24} />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
                            {t('yamazumi.title')}
                        </h2>
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Activity size={12} />
                            {t('yamazumi.subtitle')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Multi-select Dropdown */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '10px',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                minWidth: '180px',
                                textAlign: 'left',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                transition: 'all 0.2s ease',
                                fontWeight: '500'
                            }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layout size={16} color="rgba(255,255,255,0.6)" />
                                {selectedProjects.length === 0
                                    ? t('yamazumi.selectProject')
                                    : `${selectedProjects.length} ${t('yamazumi.selected')}`}
                            </span>
                            <ChevronDown size={14} style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        </button>

                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: 'calc(100% + 8px)',
                                left: 0,
                                width: '280px',
                                maxHeight: '320px',
                                overflowY: 'auto',
                                backgroundColor: '#111114',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                zIndex: 1000,
                                boxShadow: '0 12px 48px rgba(0, 0, 0, 0.6)',
                                padding: '8px'
                            }}>
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        onClick={() => toggleProjectSelection(project.projectName)}
                                        style={{
                                            padding: '10px 12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            borderRadius: '8px',
                                            marginBottom: '2px',
                                            transition: 'all 0.2s ease',
                                            backgroundColor: selectedProjects.includes(project.projectName) ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
                                            color: selectedProjects.includes(project.projectName) ? '#3b82f6' : 'rgba(255, 255, 255, 0.8)'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px',
                                            height: '18px',
                                            border: `2px solid ${selectedProjects.includes(project.projectName) ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'}`,
                                            borderRadius: '4px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            backgroundColor: selectedProjects.includes(project.projectName) ? '#3b82f6' : 'transparent',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            {selectedProjects.includes(project.projectName) && <CheckCircle size={12} color="#fff" />}
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: selectedProjects.includes(project.projectName) ? '600' : '400' }}>
                                            {project.projectName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={loadProjects}
                        style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <RefreshCcw size={18} />
                    </button>

                    <button
                        onClick={() => setIsBalancingMode(!isBalancingMode)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isBalancingMode ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
                            color: '#white',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isBalancingMode ? <BarChart3 size={16} /> : <Scale size={16} />}
                        {isBalancingMode ? t('yamazumi.visualChart') : t('yamazumi.lineBalancing')}
                    </button>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px',
                        fontSize: '0.9rem'
                    }}>
                        <span style={{ color: 'rgba(255, 255, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Target size={16} /> {t('yamazumi.takt')}
                        </span>
                        <input
                            type="number"
                            value={taktTime}
                            onChange={(e) => setTaktTime(parseFloat(e.target.value) || 0)}
                            style={{
                                width: '60px',
                                backgroundColor: 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                color: '#fff',
                                fontWeight: '700',
                                outline: 'none',
                                textAlign: 'center'
                            }}
                        />
                        <span style={{ color: 'rgba(255, 255, 255, 0.4)' }}>s</span>
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '6px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '10px'
                    }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.8)' }}>
                            <input
                                type="checkbox"
                                checked={showTaktLine}
                                onChange={(e) => setShowTaktLine(e.target.checked)}
                                style={{ accentColor: '#2563eb' }}
                            />
                            {t('yamazumi.taktLine')}
                        </label>

                        {showTaktLine && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '12px' }}>
                                <span style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem' }}>{t('yamazumi.tct')}</span>
                                <input
                                    type="number"
                                    min="80"
                                    max="100"
                                    value={targetCycleRatio * 100}
                                    onChange={(e) => setTargetCycleRatio((parseFloat(e.target.value) || 0) / 100)}
                                    style={{
                                        width: '40px',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        color: '#22c55e',
                                        fontWeight: '700',
                                        textAlign: 'center',
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ color: '#22c55e', fontSize: '0.8rem' }}>%</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setShowChat(!showChat)}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: showChat ? '#2563eb' : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Brain size={16} />
                        {t('yamazumi.aiAnalysis')}
                    </button>

                    <button
                        onClick={() => {
                            setIsSimulating(!isSimulating);
                            if (isSimulating) {
                                setEliminateWaste(false);
                                setSimplifyNNVA(0);
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isSimulating ? '#8b5cf6' : 'rgba(255, 255, 255, 0.05)',
                            color: '#fff',
                            border: '1px solid rgba(139, 92, 246, 0.3)',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <Zap size={16} color={isSimulating ? '#fff' : '#8b5cf6'} />
                        {t('yamazumi.kaizenSim')}
                    </button>
                </div>
            </div>

            {/* Simulation Controls Overlay */}
            {isSimulating && (
                <div style={{
                    marginBottom: '24px',
                    padding: '20px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    flexWrap: 'wrap',
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            backgroundColor: '#8b5cf6',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff'
                        }}>
                            <Zap size={18} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700' }}>{t('yamazumi.ecrsSimMode')}</h3>
                    </div>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        padding: '10px 16px',
                        backgroundColor: eliminateWaste ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px',
                        border: `1px solid ${eliminateWaste ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
                        transition: 'all 0.2s ease'
                    }}>
                        <input
                            type="checkbox"
                            checked={eliminateWaste}
                            onChange={(e) => setEliminateWaste(e.target.checked)}
                            style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: eliminateWaste ? '#ef4444' : '#fff' }}>{t('yamazumi.eliminateWaste')}</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>{t('yamazumi.eliminateWasteDesc')}</span>
                        </div>
                    </label>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        padding: '10px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '12px'
                    }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: '700', color: '#eab308' }}>{t('yamazumi.simplifyNNVA')}</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>{t('yamazumi.simplifyNNVADesc')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                step="10"
                                value={simplifyNNVA}
                                onChange={(e) => setSimplifyNNVA(Number(e.target.value))}
                                style={{ width: '120px', accentColor: '#eab308' }}
                            />
                            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#fff', minWidth: '45px' }}>{simplifyNNVA}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Line Balancing Board Overlay */}
            {isBalancingMode && (
                <div style={{ marginBottom: '24px', animation: 'slideIn 0.3s ease-out' }}>
                    <LineBalancingBoard
                        measurements={balancingMeasurements}
                        onUpdateMeasurements={handleLineBalancingUpdate}
                        taktTime={taktTime}
                    />
                </div>
            )}

            {/* Efficiency Monitors (Statistics) */}
            {stats && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    {[
                        { label: t('yamazumi.maxCycleTime'), value: `${stats.maxTime}s`, icon: <TrendingUp size={18} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
                        { label: t('yamazumi.minCycleTime'), value: `${stats.minTime}s`, icon: <TrendingUp size={18} style={{ transform: 'rotate(180deg)' }} />, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
                        { label: t('yamazumi.avgCycleTime'), value: `${stats.avgTime}s`, icon: <Activity size={18} />, color: '#fff', bg: 'rgba(255, 255, 255, 0.05)' },
                        { label: t('yamazumi.lineBalance'), value: `${stats.balance}%`, icon: <Scale size={18} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
                        { label: t('yamazumi.bottlenecks'), value: stats.bottlenecks, icon: <AlertTriangle size={18} />, color: stats.bottlenecks > 0 ? '#ef4444' : '#22c55e', bg: stats.bottlenecks > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)' },
                        { label: t('yamazumi.workStations'), value: chartData.length, icon: <Users size={18} />, color: '#fff', bg: 'rgba(255, 255, 255, 0.05)' },
                        { label: t('yamazumi.theorOperators'), value: stats.theoreticalMen, icon: <Layout size={18} />, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.1)', sub: `${t('yamazumi.takt')} ${taktTime}s` }
                    ].map((monitor, i) => (
                        <div key={i} style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            backdropFilter: 'blur(10px)',
                            padding: '16px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                position: 'absolute',
                                top: '-10px',
                                right: '-10px',
                                opacity: 0.05,
                                transform: 'scale(2.5)'
                            }}>
                                {monitor.icon}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.8rem', fontWeight: '600' }}>
                                <div style={{
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: monitor.bg,
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: monitor.color
                                }}>
                                    {monitor.icon}
                                </div>
                                {monitor.label}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: monitor.color, lineHeight: '1' }}>{monitor.value}</div>
                                {monitor.sub && <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.3)', marginTop: '4px' }}>{monitor.sub}</div>}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Yamazumi Chart Container */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layout size={20} color="#2563eb" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{t('yamazumi.workDistribution')}</h3>
                    </div>
                </div>

                {measurements.length > 0 ? (
                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 40 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                                <XAxis
                                    dataKey="station"
                                    tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
                                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(val) => `${val}s`}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem' }}>{value}</span>}
                                />

                                {showTaktLine && (
                                    <ReferenceLine
                                        y={taktTime}
                                        stroke="#ef4444"
                                        strokeDasharray="4 4"
                                        strokeWidth={2}
                                        label={{ value: `TAKT: ${taktTime}s`, position: 'right', fill: '#ef4444', fontSize: 11, fontWeight: '700' }}
                                    />
                                )}

                                {showTaktLine && (
                                    <ReferenceLine
                                        y={taktTime * targetCycleRatio}
                                        stroke="#22c55e"
                                        strokeDasharray="4 4"
                                        strokeWidth={2}
                                        label={{ value: `T.C.T: ${(taktTime * targetCycleRatio).toFixed(1)}s`, position: 'right', fill: '#22c55e', fontSize: 11, fontWeight: '700' }}
                                    />
                                )}

                                {categories.map((category, index) => (
                                    <Bar
                                        key={category}
                                        dataKey={category}
                                        name={getCategoryDisplay(category)}
                                        stackId="a"
                                        fill={getCategoryColor(category)}
                                        radius={index === categories.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                                        barSize={45}
                                    >
                                        {chartData.map((entry, idx) => (
                                            <Cell
                                                key={`cell-${idx}`}
                                                fill={getCategoryColor(category)}
                                                fillOpacity={entry.isBottleneck ? 1 : 0.85}
                                                stroke={entry.isBottleneck ? '#ef4444' : 'transparent'}
                                                strokeWidth={entry.isBottleneck ? 1 : 0}
                                            />
                                        ))}
                                    </Bar>
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div style={{
                        height: '300px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        borderRadius: '16px',
                        border: '1px dashed rgba(255, 255, 255, 0.1)'
                    }}>
                        <div style={{ opacity: 0.2, marginBottom: '16px' }}><Scale size={64} /></div>
                        <h4 style={{ margin: 0, color: 'rgba(255, 255, 255, 0.6)' }}>{t('yamazumi.analysisPending')}</h4>
                        <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.3)' }}>
                            {t('yamazumi.selectProjectInstruction')}
                        </p>
                    </div>
                )}
            </div>

            {/* Station Details Grid */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(20px)',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Layout size={20} color="#8b5cf6" />
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700' }}>{t('yamazumi.stationBreakdown')}</h3>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('yamazumi.station')}</th>
                                {categories.map(cat => (
                                    <th key={cat} style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                        {getCategoryDisplay(cat)}
                                    </th>
                                ))}
                                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('yamazumi.total')}</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('yamazumi.efficiency')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {chartData.map((row, idx) => (
                                <tr key={idx} style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    transition: 'all 0.2s ease',
                                    cursor: 'default'
                                }}>
                                    <td style={{
                                        padding: '16px',
                                        color: '#fff',
                                        fontWeight: '700',
                                        borderRadius: '12px 0 0 12px',
                                        border: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                        borderRight: 'none'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ width: '4px', height: '16px', backgroundColor: row.isBottleneck ? '#ef4444' : '#2563eb', borderRadius: '2px' }} />
                                            {row.station}
                                        </div>
                                    </td>
                                    {categories.map(cat => (
                                        <td key={cat} style={{
                                            padding: '16px',
                                            textAlign: 'right',
                                            color: getCategoryColor(cat),
                                            fontWeight: '600',
                                            borderTop: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                            borderBottom: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                        }}>
                                            {row[cat] ? `${row[cat]}s` : '-'}
                                        </td>
                                    ))}
                                    <td style={{
                                        padding: '16px',
                                        textAlign: 'right',
                                        color: '#fff',
                                        fontWeight: '800',
                                        borderTop: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                        borderBottom: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none'
                                    }}>{row.total}s</td>
                                    <td style={{
                                        padding: '16px',
                                        textAlign: 'center',
                                        borderRadius: '0 12px 12px 0',
                                        border: row.isBottleneck ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
                                        borderLeft: 'none'
                                    }}>
                                        {row.isBottleneck ? (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#ef4444',
                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                <AlertTriangle size={14} /> {t('yamazumi.critical')}
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                color: '#22c55e',
                                                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.75rem',
                                                fontWeight: 'bold'
                                            }}>
                                                <CheckCircle size={14} /> {t('yamazumi.balanced')}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <AIChatOverlay
                visible={showChat}
                onClose={() => setShowChat(false)}
                contextData={{
                    projects: selectedProjects,
                    measurements: measurements,
                    stats: stats,
                    chartData: chartData
                }}
                title={t('yamazumi.aiEngineer')}
                subtitle={t('yamazumi.aiSubtitle')}
            />

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                input[type="range"]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    background: #fff;
                    cursor: pointer;
                    border-radius: 50%;
                    box-shadow: 0 0 10px rgba(0,0,0,0.5);
                }
                .recharts-cartesian-grid-horizontal line {
                    stroke-opacity: 0.1;
                }
                tr:hover {
                    background-color: rgba(255, 255, 255, 0.04) !important;
                }
            `}</style>
        </div >
    );
}


export default YamazumiChart;
