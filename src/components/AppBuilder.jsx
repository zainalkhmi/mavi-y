import React, { useState, useEffect } from 'react';
import {
    Blocks,
    Plus,
    Save,
    Share2,
    Type,
    Clock,
    Barcode,
    CheckSquare,
    Trash2,
    ChevronRight,
    Settings2,
    Eye,
    Layout,
    MousePointer2,
    ShieldCheck,
    Gauge,
    PlayCircle,
    FileText,
    Play
} from 'lucide-react';
import { saveFrontlineApp, getAllFrontlineApps } from '../utils/supabaseFrontlineDB';
import AppDiagram from './AppDiagram';

const COMPONENT_TYPES = {
    TEXT: { id: 'TEXT', label: 'Text Label', icon: Type, defaultProps: { text: 'New Label', fontSize: '1.2rem', color: '#ffffff' } },
    TIMER: { id: 'TIMER', label: 'Production Timer', icon: Clock, defaultProps: { label: 'Cycle Time', format: 'mm:ss' } },
    BARCODE: { id: 'BARCODE', label: 'Barcode Input', icon: Barcode, defaultProps: { placeholder: 'Scan Item...', autoFocus: true } },
    CHECKLIST: { id: 'CHECKLIST', label: 'Step Checklist', icon: CheckSquare, defaultProps: { items: ['Step 1', 'Step 2'], title: 'Operational Checklist' } },
    SIGNATURE: { id: 'SIGNATURE', label: 'Digital Sign-off', icon: ChevronRight, defaultProps: { label: 'Operator Signature', required: true } },
    MACHINE_STATUS: { id: 'MACHINE_STATUS', label: 'Machine Status', icon: Settings2, defaultProps: { label: 'CNC Machine 01', topic: 'factory/line1/cnc1/status', type: 'STATE' } },
    QUALITY_PASS_FAIL: { id: 'QUALITY_PASS_FAIL', label: 'Pass/Fail Check', icon: ShieldCheck, defaultProps: { label: 'Inspection Step', required: true } },
    QUALITY_TOLERANCE: { id: 'QUALITY_TOLERANCE', label: 'Tolerance Check', icon: Gauge, defaultProps: { label: 'Measurement', min: 0, max: 10, unit: 'mm' } },
    VIDEO: { id: 'VIDEO', label: 'Video Player', icon: PlayCircle, defaultProps: { url: '', title: 'Step Video' } },
    PDF: { id: 'PDF', label: 'PDF Viewer', icon: FileText, defaultProps: { url: '', title: 'Technical Drawing' } },
    BUTTON: { id: 'BUTTON', label: 'Action Button', icon: Play, defaultProps: { label: 'Next Step', action: 'NEXT_STEP', targetStepId: '', color: '#3b82f6' } }
};

const AppBuilder = () => {
    const [appName, setAppName] = useState('My Frontline App');
    const [steps, setSteps] = useState([
        { id: 'step_1', title: 'Step 1', components: [] }
    ]);
    const [currentStepId, setCurrentStepId] = useState('step_1');
    const [selectedCompId, setSelectedCompId] = useState(null);
    const [currentAppId, setCurrentAppId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [appsList, setAppsList] = useState([]);
    const [viewMode, setViewMode] = useState('DESIGN'); // DESIGN, PREVIEW, or DIAGRAM
    const [activeTab, setActiveTab] = useState('WIDGET'); // WIDGET, STEP, APP

    useEffect(() => {
        loadApps();
    }, []);

    const loadApps = async () => {
        try {
            const data = await getAllFrontlineApps();
            setAppsList(data);
        } catch (err) {
            console.error('Failed to load apps:', err);
        }
    };

    const addStep = () => {
        const newStep = {
            id: `step_${Date.now()}`,
            title: `Step ${steps.length + 1}`,
            components: []
        };
        setSteps([...steps, newStep]);
        setCurrentStepId(newStep.id);
    };

    const addComponent = (typeId) => {
        const newComp = {
            id: `comp_${Date.now()}`,
            type: typeId,
            props: { ...COMPONENT_TYPES[typeId].defaultProps }
        };
        setSteps(steps.map(s =>
            s.id === currentStepId
                ? { ...s, components: [...s.components, newComp] }
                : s
        ));
        setSelectedCompId(newComp.id);
        setActiveTab('WIDGET');
    };

    const deleteComponent = (id) => {
        setSteps(steps.map(s => ({
            ...s,
            components: s.components.filter(c => c.id !== id)
        })));
        if (selectedCompId === id) setSelectedCompId(null);
    };

    const updateComponentProps = (id, newProps) => {
        setSteps(steps.map(s => ({
            ...s,
            components: s.components.map(c =>
                c.id === id ? { ...c, props: { ...c.props, ...newProps } } : c
            )
        })));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const saved = await saveFrontlineApp({
                id: currentAppId,
                name: appName,
                config: { steps }
            });
            setCurrentAppId(saved.id);
            alert('App saved successfully!');
            loadApps();
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save app.');
        } finally {
            setIsSaving(false);
        }
    };

    const loadApp = (app) => {
        setCurrentAppId(app.id);
        setAppName(app.name);
        // Migration for legacy single-config apps
        const appSteps = app.config.steps || [
            { id: 'step_1', title: 'Step 1', components: app.config.components || [] }
        ];
        setSteps(appSteps);
        setCurrentStepId(appSteps[0].id);
        setSelectedCompId(null);
        setViewMode('DESIGN');
    };

    const resetBuilder = () => {
        setCurrentAppId(null);
        setAppName('New Frontline App');
        setSteps([{ id: 'step_1', title: 'Step 1', components: [] }]);
        setCurrentStepId('step_1');
        setSelectedCompId(null);
        setViewMode('DESIGN');
    };

    const currentStep = steps.find(s => s.id === currentStepId);
    const selectedComp = currentStep?.components.find(c => c.id === selectedCompId);

    return (
        <div style={{
            height: '100%',
            backgroundColor: '#030305',
            color: '#fff',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Top Navigation / Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '15px 30px',
                backgroundColor: '#0a0a0c',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                zIndex: 100
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '32px', height: '32px', backgroundColor: '#3b82f6', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Layout size={18} color="white" />
                    </div>
                    <input
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#fff',
                            fontSize: '1.2rem',
                            fontWeight: '700',
                            outline: 'none',
                            width: '300px'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px' }}>
                        <button onClick={() => setViewMode('DESIGN')} style={{ padding: '6px 15px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: viewMode === 'DESIGN' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Design</button>
                        <button onClick={() => setViewMode('PREVIEW')} style={{ padding: '6px 15px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: viewMode === 'PREVIEW' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Preview</button>
                        <button onClick={() => setViewMode('DIAGRAM')} style={{ padding: '6px 15px', borderRadius: '8px', fontSize: '0.85rem', backgroundColor: viewMode === 'DIAGRAM' ? '#3b82f6' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>Diagram</button>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} style={{ padding: '8px 20px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <Save size={16} /> {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    <button style={{ padding: '8px 20px', backgroundColor: '#3b82f6', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer' }}>Publish</button>
                </div>
            </div>

            {/* Top Toolbar (Widgets) */}
            <div style={{
                display: 'flex',
                gap: '10px',
                padding: '10px 30px',
                backgroundColor: '#111114',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                overflowX: 'auto',
                alignItems: 'center'
            }}>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontWeight: 'bold', marginRight: '10px', textTransform: 'uppercase' }}>Widgets</div>
                {Object.entries(COMPONENT_TYPES).map(([key, type]) => (
                    <button
                        key={key}
                        onClick={() => addComponent(key)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 15px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: '10px',
                            color: 'rgba(255,255,255,0.8)',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; }}
                    >
                        <type.icon size={16} color="#3b82f6" /> {type.label}
                    </button>
                ))}
            </div>

            {/* Main Application Area (3-Pane or Diagram) */}
            <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                {viewMode === 'DIAGRAM' ? (
                    <div style={{ flex: 1, position: 'relative' }}>
                        <AppDiagram
                            steps={steps}
                            currentStepId={currentStepId}
                            onSelectStep={(id) => {
                                setCurrentStepId(id);
                                setViewMode('DESIGN');
                            }}
                        />
                        <div style={{ position: 'absolute', top: '20px', left: '20px', padding: '10px 20px', backgroundColor: 'rgba(59, 130, 246, 0.2)', border: '1px solid #3b82f6', borderRadius: '12px', color: '#fff', fontSize: '0.8rem', pointerEvents: 'none' }}>
                            <b>Diagram Mode</b>: Click a step to edit
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Left Pane: Steps Panel */}
                        <div style={{
                            width: '260px',
                            backgroundColor: '#0a0a0c',
                            borderRight: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Steps</span>
                                <button onClick={addStep} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><Plus size={18} /></button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                                {/* Base Layout Step */}
                                <div style={{
                                    padding: '12px 15px',
                                    borderRadius: '10px',
                                    marginBottom: '5px',
                                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                                    border: '1px dashed rgba(59, 130, 246, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    cursor: 'pointer',
                                    color: '#3b82f6'
                                }}>
                                    <Layout size={16} /> <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Base Layout</span>
                                </div>

                                {steps.map((step, idx) => (
                                    <div
                                        key={step.id}
                                        onClick={() => setCurrentStepId(step.id)}
                                        style={{
                                            padding: '12px 15px',
                                            borderRadius: '10px',
                                            marginBottom: '5px',
                                            backgroundColor: currentStepId === step.id ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                                            border: currentStepId === step.id ? '1px solid #3b82f6' : '1px solid transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', width: '15px' }}>{idx + 1}</div>
                                        <span style={{ fontSize: '0.9rem', color: currentStepId === step.id ? '#fff' : 'rgba(255,255,255,0.6)' }}>{step.title}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginBottom: '10px', textTransform: 'uppercase' }}>My Apps</div>
                                <select
                                    onChange={(e) => {
                                        const app = appsList.find(a => a.id === e.target.value);
                                        if (app) loadApp(app);
                                    }}
                                    style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px', borderRadius: '8px', fontSize: '0.85rem' }}
                                >
                                    <option value="">Select an app...</option>
                                    {appsList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Center Pane: Canvas */}
                        <div style={{ flex: 1, backgroundColor: '#141417', padding: '40px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{
                                width: '100%',
                                maxWidth: '900px',
                                aspectRatio: '16/10',
                                backgroundColor: '#030305',
                                borderRadius: '16px',
                                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                position: 'relative',
                                padding: '40px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {currentStep?.components.length === 0 && (
                                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.1)' }}>
                                        <MousePointer2 size={48} style={{ marginBottom: '20px' }} />
                                        <p style={{ fontSize: '1.1rem' }}>Canvas is Empty</p>
                                        <p style={{ fontSize: '0.85rem' }}>Add a widget from the toolbar above to start.</p>
                                    </div>
                                )}

                                {currentStep?.components.map(comp => {
                                    const isSelected = selectedCompId === comp.id;
                                    return (
                                        <div
                                            key={comp.id}
                                            onClick={() => setSelectedCompId(comp.id)}
                                            style={{
                                                padding: '24px',
                                                backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
                                                borderRadius: '20px',
                                                border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.05)',
                                                cursor: 'pointer',
                                                position: 'relative',
                                                marginBottom: '20px',
                                                minHeight: '80px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'center'
                                            }}
                                        >
                                            {isSelected && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteComponent(comp.id); }}
                                                    style={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: '#ef4444', border: 'none', color: '#fff', borderRadius: '8px', padding: '6px' }}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}

                                            {/* Component Rendering Logic */}
                                            {comp.type === 'TEXT' && <div style={{ fontSize: comp.props.fontSize, color: comp.props.color, fontWeight: '900' }}>{comp.props.text}</div>}
                                            {comp.type === 'TIMER' && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'monospace' }}>00:00</div>
                                                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{comp.props.label}</div>
                                                </div>
                                            )}
                                            {comp.type === 'BARCODE' && <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}><Barcode size={32} color="#3b82f6" /><div style={{ flex: 1, padding: '12px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '10px', color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}>{comp.props.placeholder}</div></div>}
                                            {comp.type === 'CHECKLIST' && <div><h5 style={{ margin: '0 0 10px 0' }}>{comp.props.title}</h5>{comp.props.items.map((it, idx) => <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}><div style={{ width: '16px', height: '16px', border: '1px solid rgba(255,255,255,0.2)' }} /> {it}</div>)}</div>}
                                            {comp.type === 'SIGNATURE' && <div style={{ border: '1px dashed rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>{comp.props.label}</div>}
                                            {comp.type === 'MACHINE_STATUS' && <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><div style={{ width: '15px', height: '15px', borderRadius: '50%', backgroundColor: '#10b981' }} /><div><div style={{ fontWeight: 'bold' }}>{comp.props.label}</div><div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{comp.props.topic}</div></div></div>}
                                            {comp.type === 'QUALITY_PASS_FAIL' && <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}><div>{comp.props.label}</div><div style={{ display: 'flex', gap: '10px' }}><div style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(76, 175, 80, 0.1)', border: '1px solid #4CAF50', borderRadius: '8px', textAlign: 'center', color: '#4CAF50', fontSize: '0.8rem' }}>PASS</div><div style={{ flex: 1, padding: '10px', backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px', textAlign: 'center', color: '#f44336', fontSize: '0.8rem' }}>FAIL</div></div></div>}
                                            {comp.type === 'QUALITY_TOLERANCE' && <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}><div>{comp.props.label} ({comp.props.min}-{comp.props.max} {comp.props.unit})</div><div style={{ padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'rgba(255,255,255,0.2)' }}>0.00 {comp.props.unit}</div></div>}
                                            {comp.type === 'VIDEO' && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}><PlayCircle size={32} color="#3b82f6" /> {comp.props.title}</div>}
                                            {comp.type === 'PDF' && <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '20px', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '12px' }}><FileText size={32} color="#ef4444" /> {comp.props.title}</div>}
                                            {comp.type === 'BUTTON' && <button style={{ padding: '15px 30px', backgroundColor: comp.props.color, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}>{comp.props.label}</button>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Right Pane: Context Pane */}
                        <div style={{
                            width: '320px',
                            backgroundColor: '#0a0a0c',
                            borderLeft: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                {['WIDGET', 'STEP', 'APP'].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setActiveTab(t)}
                                        style={{
                                            flex: 1,
                                            padding: '15px 5px',
                                            fontSize: '0.75rem',
                                            fontWeight: 'bold',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            color: activeTab === t ? '#3b82f6' : 'rgba(255,255,255,0.3)',
                                            borderBottom: activeTab === t ? '2px solid #3b82f6' : '2px solid transparent',
                                            cursor: 'pointer',
                                            textTransform: 'uppercase'
                                        }}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                                {activeTab === 'WIDGET' && (
                                    selectedComp ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>{COMPONENT_TYPES[selectedComp.type].label}</div>

                                            {/* Generic & Specific Property Editors */}
                                            {selectedComp.type === 'TEXT' && (
                                                <>
                                                    <div className="prop-group">
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>TEXT</label>
                                                        <input value={selectedComp.props.text} onChange={(e) => updateComponentProps(selectedComp.id, { text: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                                    </div>
                                                    <div className="prop-group">
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>SIZE</label>
                                                        <select value={selectedComp.props.fontSize} onChange={(e) => updateComponentProps(selectedComp.id, { fontSize: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}>
                                                            <option value="1rem">Small</option><option value="1.5rem">Medium</option><option value="2.5rem">Large</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}

                                            {/* ... Other Component Editors (Simplified for brevity or specific logic) */}
                                            {selectedComp.type === 'QUALITY_TOLERANCE' && (
                                                <>
                                                    <div style={{ display: 'flex', gap: '10px' }}>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>MIN</label>
                                                            <input type="number" value={selectedComp.props.min} onChange={(e) => updateComponentProps(selectedComp.id, { min: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>MAX</label>
                                                            <input type="number" value={selectedComp.props.max} onChange={(e) => updateComponentProps(selectedComp.id, { max: parseFloat(e.target.value) })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {selectedComp.type === 'BUTTON' && (
                                                <>
                                                    <div className="prop-group">
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>LABEL</label>
                                                        <input value={selectedComp.props.label} onChange={(e) => updateComponentProps(selectedComp.id, { label: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                                    </div>
                                                    <div className="prop-group">
                                                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>ACTION</label>
                                                        <select value={selectedComp.props.action} onChange={(e) => updateComponentProps(selectedComp.id, { action: e.target.value })} style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}>
                                                            <option value="NEXT_STEP">Go to Next Step</option>
                                                            <option value="PREV_STEP">Go to Previous Step</option>
                                                            <option value="GO_TO_STEP">Go to Specific Step</option>
                                                            <option value="COMPLETE">Complete App</option>
                                                        </select>
                                                    </div>
                                                    {selectedComp.props.action === 'GO_TO_STEP' && (
                                                        <div className="prop-group">
                                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>TARGET STEP</label>
                                                            <select
                                                                value={selectedComp.props.targetStepId}
                                                                onChange={(e) => updateComponentProps(selectedComp.id, { targetStepId: e.target.value })}
                                                                style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                                            >
                                                                <option value="">Select Step...</option>
                                                                {steps.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </>
                                            )}

                                            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                                <button onClick={() => deleteComponent(selectedComp.id)} style={{ width: '100%', padding: '8px', backgroundColor: 'transparent', border: 'none', color: '#ef4444', fontSize: '0.8rem', fontWeight: 'bold', cursor: 'pointer' }}>Delete Widget</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: '40px' }}><MousePointer2 size={32} style={{ marginBottom: '15px' }} /><p fontSize="0.9rem">Select a widget to edit</p></div>
                                    )
                                )}

                                {activeTab === 'STEP' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="prop-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>STEP TITLE</label>
                                            <input
                                                value={currentStep?.title}
                                                onChange={(e) => setSteps(steps.map(s => s.id === currentStepId ? { ...s, title: e.target.value } : s))}
                                                style={{ width: '100%', padding: '100px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                                            />
                                        </div>
                                        <div className="prop-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>TARGET CYCLE TIME (s)</label>
                                            <input type="number" placeholder="60" style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                                        </div>
                                        <div style={{ marginTop: '20px' }}>
                                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>Triggers</span>
                                            <div style={{ marginTop: '10px', padding: '15px', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px dashed rgba(59, 130, 246, 0.2)', textAlign: 'center', cursor: 'pointer' }}>
                                                <Plus size={16} color="#3b82f6" /> <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 'bold' }}>Add Trigger</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'APP' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div className="prop-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>VARIABLES</label>
                                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>No variables defined</div>
                                        </div>
                                        <div className="prop-group">
                                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>RESOLUTION</label>
                                            <select style={{ width: '100%', padding: '10px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}>
                                                <option>1080p (1920x1080)</option>
                                                <option>720p (1280x720)</option>
                                                <option>Tablet (1024x768)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AppBuilder;
