import React, { useState, useEffect } from 'react';
import { Save, Trash2, Play, Copy, Calendar, Package, Clock, TrendingUp } from 'lucide-react';
import { useDialog } from '../../contexts/DialogContext';

const ScenarioManager = ({
    currentSimulation,
    onLoadScenario,
    currentLanguage,
    vsmId
}) => {
    const { showAlert, showConfirm } = useDialog();
    const [scenarios, setScenarios] = useState([]);
    const [scenarioName, setScenarioName] = useState('');
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState([]);

    const t = (id, en) => currentLanguage === 'id' ? id : en;

    // Load scenarios from localStorage
    useEffect(() => {
        loadScenarios();
    }, [vsmId]);

    const loadScenarios = () => {
        try {
            const key = `vsm_scenarios_${vsmId || 'default'}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                setScenarios(JSON.parse(stored));
            }
        } catch (e) {
            console.error('Failed to load scenarios:', e);
        }
    };

    const saveScenario = async () => {
        if (!scenarioName.trim()) {
            await showAlert('Validation Error', t('Masukkan nama scenario!', 'Please enter a scenario name!'));
            return;
        }

        if (!currentSimulation) {
            await showAlert('Validation Error', t('Tidak ada simulasi untuk disimpan!', 'No simulation to save!'));
            return;
        }

        const newScenario = {
            id: Date.now(),
            name: scenarioName,
            timestamp: new Date().toISOString(),
            parameters: currentSimulation.parameters || {},
            results: currentSimulation.results || {},
            vsmId: vsmId || 'default'
        };

        const updated = [...scenarios, newScenario];
        setScenarios(updated);

        try {
            const key = `vsm_scenarios_${vsmId || 'default'}`;
            localStorage.setItem(key, JSON.stringify(updated));
            setScenarioName('');
            await showAlert('Success', t('Scenario berhasil disimpan!', 'Scenario saved successfully!'));
        } catch (e) {
            console.error('Failed to save scenario:', e);
            await showAlert('Error', t('Gagal menyimpan scenario!', 'Failed to save scenario!'));
        }
    };

    const deleteScenario = async (id) => {
        if (!await showConfirm(t('Hapus scenario ini?', 'Delete this scenario?'))) return;

        const updated = scenarios.filter(s => s.id !== id);
        setScenarios(updated);

        try {
            const key = `vsm_scenarios_${vsmId || 'default'}`;
            localStorage.setItem(key, JSON.stringify(updated));
        } catch (e) {
            console.error('Failed to delete scenario:', e);
        }
    };

    const loadScenario = (scenario) => {
        if (onLoadScenario) {
            onLoadScenario(scenario);
        }
    };

    const toggleCompareSelection = async (id) => {
        if (selectedForCompare.includes(id)) {
            setSelectedForCompare(selectedForCompare.filter(sid => sid !== id));
        } else {
            if (selectedForCompare.length >= 3) {
                await showAlert('Info', t('Maksimal 3 scenario untuk perbandingan', 'Maximum 3 scenarios for comparison'));
                return;
            }
            setSelectedForCompare([...selectedForCompare, id]);
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const ComparisonView = () => {
        const compareScenarios = scenarios.filter(s => selectedForCompare.includes(s.id));

        if (compareScenarios.length === 0) {
            return (
                <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                    {t('Pilih 2-3 scenario untuk membandingkan', 'Select 2-3 scenarios to compare')}
                </div>
            );
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid #444' }}>
                            <th style={{ padding: '10px', textAlign: 'left', color: '#aaa' }}>
                                {t('Metrik', 'Metric')}
                            </th>
                            {compareScenarios.map(s => (
                                <th key={s.id} style={{ padding: '10px', textAlign: 'center', color: '#2196f3' }}>
                                    {s.name}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px', color: '#aaa' }}>{t('Status', 'Status')}</td>
                            {compareScenarios.map(s => (
                                <td key={s.id} style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    color: s.results?.success ? '#4caf50' : '#c50f1f',
                                    fontWeight: 'bold'
                                }}>
                                    {s.results?.success ? t('FEASIBLE', 'FEASIBLE') : t('IMPOSSIBLE', 'IMPOSSIBLE')}
                                </td>
                            ))}
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px', color: '#aaa' }}>{t('Qty Terpenuhi', 'Fulfilled Qty')}</td>
                            {compareScenarios.map(s => (
                                <td key={s.id} style={{ padding: '10px', textAlign: 'center', color: '#fff' }}>
                                    {s.results?.fulfilledQuantity || 0}
                                </td>
                            ))}
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px', color: '#aaa' }}>{t('Permintaan', 'Demand')}</td>
                            {compareScenarios.map(s => (
                                <td key={s.id} style={{ padding: '10px', textAlign: 'center', color: '#fff' }}>
                                    {s.parameters?.quantity || '-'}
                                </td>
                            ))}
                        </tr>
                        <tr style={{ borderBottom: '1px solid #333' }}>
                            <td style={{ padding: '10px', color: '#aaa' }}>{t('Lead Time (hari)', 'Lead Time (days)')}</td>
                            {compareScenarios.map(s => (
                                <td key={s.id} style={{ padding: '10px', textAlign: 'center', color: '#fff' }}>
                                    {s.parameters?.leadTime || '-'}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td style={{ padding: '10px', color: '#aaa' }}>{t('Root Cause', 'Root Cause')}</td>
                            {compareScenarios.map(s => (
                                <td key={s.id} style={{
                                    padding: '10px',
                                    textAlign: 'center',
                                    color: s.results?.rootCause ? '#ff9800' : '#4caf50',
                                    fontSize: '0.85rem'
                                }}>
                                    {s.results?.rootCause || t('Tidak ada', 'None')}
                                </td>
                            ))}
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Save Current Simulation */}
            <div style={{
                padding: '15px',
                borderRadius: '8px',
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid #2196f3'
            }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#2196f3', fontSize: '0.95rem' }}>
                    {t('Simpan Simulasi Saat Ini', 'Save Current Simulation')}
                </h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder={t('Nama scenario...', 'Scenario name...')}
                        value={scenarioName}
                        onChange={(e) => setScenarioName(e.target.value)}
                        style={{
                            flex: 1,
                            padding: '8px 12px',
                            backgroundColor: '#2d2d2d',
                            border: '1px solid #444',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}
                    />
                    <button
                        onClick={saveScenario}
                        disabled={!currentSimulation}
                        style={{
                            padding: '8px 15px',
                            backgroundColor: currentSimulation ? '#2196f3' : '#555',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            cursor: currentSimulation ? 'pointer' : 'not-allowed',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Save size={16} />
                        {t('Simpan', 'Save')}
                    </button>
                </div>
            </div>

            {/* Compare Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                    {t('Scenario Tersimpan', 'Saved Scenarios')} ({scenarios.length})
                </h3>
                <button
                    onClick={() => {
                        setCompareMode(!compareMode);
                        setSelectedForCompare([]);
                    }}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: compareMode ? '#ff9800' : '#2196f3',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                    }}
                >
                    {compareMode ? t('Batal Bandingkan', 'Cancel Compare') : t('Bandingkan', 'Compare')}
                </button>
            </div>

            {/* Comparison View */}
            {compareMode && selectedForCompare.length > 0 && (
                <div style={{
                    padding: '15px',
                    borderRadius: '8px',
                    background: 'rgba(255, 152, 0, 0.1)',
                    border: '1px solid #ff9800'
                }}>
                    <ComparisonView />
                </div>
            )}

            {/* Scenarios List */}
            {scenarios.length === 0 ? (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#888',
                    border: '1px dashed #444',
                    borderRadius: '8px'
                }}>
                    {t('Belum ada scenario tersimpan. Jalankan simulasi dan simpan sebagai scenario.', 'No saved scenarios. Run a simulation and save it as a scenario.')}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {scenarios.map(scenario => (
                        <div
                            key={scenario.id}
                            style={{
                                padding: '15px',
                                borderRadius: '8px',
                                background: selectedForCompare.includes(scenario.id)
                                    ? 'rgba(255, 152, 0, 0.1)'
                                    : 'rgba(255, 255, 255, 0.02)',
                                border: selectedForCompare.includes(scenario.id)
                                    ? '1px solid #ff9800'
                                    : '1px solid #333',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                        {compareMode && (
                                            <input
                                                type="checkbox"
                                                checked={selectedForCompare.includes(scenario.id)}
                                                onChange={() => toggleCompareSelection(scenario.id)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        )}
                                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1rem' }}>
                                            {scenario.name}
                                        </h4>
                                        <span style={{
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '0.75rem',
                                            background: scenario.results?.success ? 'rgba(76, 175, 80, 0.2)' : 'rgba(197, 15, 31, 0.2)',
                                            color: scenario.results?.success ? '#4caf50' : '#c50f1f'
                                        }}>
                                            {scenario.results?.success ? t('FEASIBLE', 'FEASIBLE') : t('IMPOSSIBLE', 'IMPOSSIBLE')}
                                        </span>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                        gap: '10px',
                                        fontSize: '0.85rem',
                                        color: '#aaa',
                                        marginTop: '10px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {formatDate(scenario.timestamp)}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Package size={14} />
                                            {t('Qty:', 'Qty:')} {scenario.parameters?.quantity || '-'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Clock size={14} />
                                            {t('Lead:', 'Lead:')} {scenario.parameters?.leadTime || '-'} {t('hari', 'days')}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <TrendingUp size={14} />
                                            {t('Terpenuhi:', 'Fulfilled:')} {scenario.results?.fulfilledQuantity || 0}
                                        </div>
                                    </div>
                                </div>

                                {!compareMode && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            onClick={() => loadScenario(scenario)}
                                            style={{
                                                padding: '6px 10px',
                                                backgroundColor: '#2196f3',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}
                                            title={t('Muat scenario', 'Load scenario')}
                                        >
                                            <Play size={14} />
                                            {t('Muat', 'Load')}
                                        </button>
                                        <button
                                            onClick={() => deleteScenario(scenario.id)}
                                            style={{
                                                padding: '6px 10px',
                                                backgroundColor: '#c50f1f',
                                                border: 'none',
                                                borderRadius: '6px',
                                                color: 'white',
                                                cursor: 'pointer',
                                                fontSize: '0.85rem'
                                            }}
                                            title={t('Hapus scenario', 'Delete scenario')}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ScenarioManager;
