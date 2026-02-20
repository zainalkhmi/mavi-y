import React, { useState } from 'react';
import { SupplyChainEngine } from '../../utils/supplyChainEngine';
import ResultsVisualization from './ResultsVisualization';
import ModernFlowVisualization from './ModernFlowVisualization';
import LogViewer from './LogViewer';
import ScenarioManager from './ScenarioManager';

import { useLanguage } from '../../contexts/LanguageContext';
import { X, Network, Play, Settings, BarChart3, FileText, FolderOpen, Clock, Zap, AlertTriangle } from 'lucide-react';

const SupplyChainModal = ({ isOpen, onClose, nodes, edges, onSimulationResult, vsmId }) => {
    const { t, currentLanguage } = useLanguage();
    const [activeTab, setActiveTab] = useState('flow');

    // Calculate total demand from all customer nodes
    const initialDemand = React.useMemo(() => {
        const customerNodes = nodes.filter(n => n.type === 'generic' && n.data?.symbolType === 'customer');
        const total = customerNodes.reduce((sum, n) => sum + (parseInt(n.data?.demand) || 0), 0);
        return total > 0 ? total : 100;
    }, [nodes]);

    const [quantity, setQuantity] = useState(initialDemand);

    const [targetDate, setTargetDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 5);
        d.setHours(10, 0, 0, 0);
        return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    });
    // Shift pattern removed as per request (node-specific)

    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [currentSimulation, setCurrentSimulation] = useState(null);

    // Update quantity when initialDemand changes (e.g. if nodes change)
    React.useEffect(() => {
        setQuantity(initialDemand);
    }, [initialDemand]);

    // const t = (id, en) => currentLanguage === 'id' ? id : en; // Removed custom helper

    // Initialize active tab to analysis
    React.useEffect(() => {
        if (activeTab === 'setup' || activeTab === 'results') {
            setActiveTab('analysis');
        }
    }, []);

    if (!isOpen) return null;

    const handleRunSimulation = () => {
        setLoading(true);
        setResult(null);

        setTimeout(() => {
            try {
                const customerNodes = nodes.filter(n => n.type === 'generic' && n.data?.symbolType === 'customer');

                if (customerNodes.length === 0) {
                    setResult({
                        success: false,
                        message: t('vsm.supplyChain.customerNotFound'),
                        type: 'error'
                    });
                    setLoading(false);
                    return;
                }

                const dueDate = new Date(targetDate);

                const engine = new SupplyChainEngine(nodes, edges);
                // Pass the first customer ID as entry point, but engine should handle multiple or total demand
                // Assuming engine currently takes one start node. If multiple, we might need engine update.
                // For now, adhering to existing signature but using total quantity.
                let simResult = engine.simulate(customerNodes[0].id, parseInt(quantity), dueDate);

                // Run Risk Analysis
                engine.runRiskAnalysis();
                simResult.riskNodes = engine.riskNodes;

                setResult(simResult);

                // Store current simulation for scenario saving
                setCurrentSimulation({
                    parameters: { quantity: parseInt(quantity), targetDate },
                    results: simResult
                });

                if (onSimulationResult) {
                    onSimulationResult(simResult);
                }

                // Auto-switch removed (already same tab)
                // setActiveTab('results'); 
            } catch (e) {
                console.error(e);
                setResult({
                    success: false,
                    rootCause: e.message,
                    message: "Simulation Error"
                });
            } finally {
                setLoading(false);
            }
        }, 100);
    };

    const handleLoadScenario = (scenario) => {
        if (scenario.parameters) {
            setQuantity(scenario.parameters.quantity || 100);
            setTargetDate(scenario.parameters.targetDate || new Date().toISOString().slice(0, 16));
        }
        if (scenario.results) {
            setResult(scenario.results);
            setCurrentSimulation(scenario);
        }
        setActiveTab('analysis');
    };

    const tabs = [
        { id: 'flow', label: t('vsm.supplyChain.flowView') || 'Flow View', icon: Zap },
        { id: 'analysis', label: t('vsm.supplyChain.analysisResults'), icon: BarChart3 },
        { id: 'timeline', label: t('vsm.supplyChain.timeline'), icon: Clock },
        { id: 'logs', label: t('vsm.supplyChain.logs'), icon: FileText },
        { id: 'risk', label: t('vsm.supplyChain.risk') || 'Risk Assessment', icon: AlertTriangle },
        { id: 'scenarios', label: t('vsm.supplyChain.scenarios'), icon: FolderOpen }
    ];



    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: '#111', zIndex: 2000,
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
            <div style={{
                flex: 1,
                display: 'flex', flexDirection: 'column',
                width: '100%', height: '100%',
                backgroundColor: '#1e1e1e'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', backgroundColor: '#2196f3',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Network size={24} color="white" />
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>
                                {t('vsm.supplyChain.title')}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white',
                        cursor: 'pointer', padding: '8px 16px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '0.9rem'
                    }}>
                        <X size={18} />
                        {t('vsm.supplyChain.backToCanvas')}
                    </button>
                </div>

                {/* Tabs */}
                {/* Using a cleaner tab style directly integrated into content area if needed, but keeping top tabs for now */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid #333',
                    backgroundColor: '#252525'
                }}>
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    flex: 1,
                                    padding: '15px 20px',
                                    border: 'none',
                                    background: isActive ? '#1e1e1e' : 'transparent',
                                    color: isActive ? '#2196f3' : '#bbb',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    borderBottom: isActive ? '2px solid #2196f3' : '2px solid transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <Icon size={18} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <div style={{
                    padding: '0',
                    overflowY: 'auto',
                    flex: 1,
                    minHeight: '400px',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Flow Tab */}
                    {activeTab === 'flow' && (
                        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
                                        <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '4px' }}>{t('vsm.supplyChain.demandQty')}</label>
                                        <input
                                            type="number"
                                            value={quantity}
                                            onChange={(e) => setQuantity(e.target.value)}
                                            style={{ padding: '8px', backgroundColor: '#333', border: '1px solid #444', borderRadius: '4px', color: 'white' }}
                                        />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                                        <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '4px' }}>{t('vsm.supplyChain.dueDate')}</label>
                                        <input
                                            type="datetime-local"
                                            value={targetDate}
                                            onChange={(e) => setTargetDate(e.target.value)}
                                            style={{ padding: '8px', backgroundColor: '#333', border: '1px solid #444', borderRadius: '4px', color: 'white' }}
                                        />
                                    </div>
                                    <button
                                        onClick={handleRunSimulation}
                                        disabled={loading}
                                        style={{
                                            padding: '0 24px', backgroundColor: '#2196f3',
                                            border: 'none', borderRadius: '6px', color: 'white',
                                            cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            opacity: loading ? 0.7 : 1, marginTop: 'auto', height: '38px'
                                        }}
                                    >
                                        <Zap size={16} fill={loading ? "none" : "white"} />
                                        {loading ? t('vsm.supplyChain.processing') : t('vsm.supplyChain.run')}
                                    </button>
                                </div>

                                {result && (
                                    <div style={{
                                        padding: '10px 20px',
                                        background: result.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                                        borderRadius: '30px',
                                        border: `1px solid ${result.success ? '#4caf50' : '#ff4444'}`,
                                        color: result.success ? '#4caf50' : '#ff4444',
                                        fontWeight: 'bold',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        {result.success ? <Zap size={16} /> : <AlertTriangle size={16} />}
                                        {result.success ? 'FEASIBLE' : 'SHORTAGE'}
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: 1, minHeight: '500px' }}>
                                <ModernFlowVisualization
                                    nodes={nodes}
                                    edges={edges}
                                    result={result}
                                    loading={loading}
                                />
                            </div>
                        </div>
                    )}
                    {/* Setup & Results Combined (Analysis Tab) */}
                    {activeTab === 'analysis' && (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            {/* Setup Panel (Collapsible or always visible on top) */}
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#252525',
                                borderBottom: '1px solid #333',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '200px' }}>
                                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '4px' }}>
                                        {t('vsm.supplyChain.demandQty')}
                                    </label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: '#333', border: '1px solid #444',
                                            borderRadius: '4px', color: 'white'
                                        }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: '250px' }}>
                                    <label style={{ color: '#aaa', fontSize: '0.8rem', marginBottom: '4px' }}>
                                        {t('vsm.supplyChain.dueDate')}
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={targetDate}
                                        onChange={(e) => setTargetDate(e.target.value)}
                                        style={{
                                            padding: '8px',
                                            backgroundColor: '#333', border: '1px solid #444',
                                            borderRadius: '4px', color: 'white'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleRunSimulation}
                                    disabled={loading}
                                    style={{
                                        padding: '10px 20px', backgroundColor: '#2196f3',
                                        border: 'none', borderRadius: '6px', color: 'white',
                                        cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold',
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        opacity: loading ? 0.7 : 1,
                                        marginTop: 'auto',
                                        height: '40px'
                                    }}
                                >
                                    {loading ? (
                                        t('vsm.supplyChain.processing')
                                    ) : (
                                        <>
                                            <Play size={16} fill="white" />
                                            {t('vsm.supplyChain.run')}
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Results Area */}
                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
                                {result ? (
                                    <ResultsVisualization
                                        result={result}
                                        nodes={nodes}
                                        currentLanguage={currentLanguage}
                                    />
                                ) : (
                                    <div style={{
                                        height: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column',
                                        color: '#666',
                                        marginTop: '50px'
                                    }}>
                                        <BarChart3 size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                                        <p>{t('vsm.supplyChain.runPrompt')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Other Tabs Content */}
                    {activeTab === 'timeline' && (
                        <div style={{ height: '100%', padding: '20px' }}>
                            {/* Timeline content reuse */}
                            {!result ? (
                                <div style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>
                                    {t('vsm.supplyChain.runFirst')}
                                </div>
                            ) : (
                                <ResultsVisualization
                                    result={result}
                                    nodes={nodes}
                                    currentLanguage={currentLanguage}
                                    viewMode="timeline"
                                />
                            )}
                        </div>
                    )}

                    {activeTab === 'logs' && (
                        <div style={{ height: '100%', padding: '20px' }}>
                            <LogViewer
                                logs={result?.logs || []}
                                currentLanguage={currentLanguage}
                            />
                        </div>
                    )}

                    {activeTab === 'risk' && (
                        <div style={{ height: '100%', padding: '20px' }}>
                            <ResultsVisualization
                                result={result}
                                nodes={nodes}
                                viewMode="risk"
                                currentLanguage={currentLanguage}
                            />
                        </div>
                    )}

                    {activeTab === 'scenarios' && (
                        <div style={{ height: '100%', padding: '20px' }}>
                            <ScenarioManager
                                currentSimulation={currentSimulation}
                                onLoadScenario={handleLoadScenario}
                                currentLanguage={currentLanguage}
                                vsmId={vsmId}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplyChainModal;

