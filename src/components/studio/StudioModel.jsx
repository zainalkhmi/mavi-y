import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2, Video, Activity, Box, X } from 'lucide-react';
import ModelBuilder from './ModelBuilder';

import { useLanguage } from '../../i18n/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';

// Mock data for initial testing
const MOCK_MODELS = [
    {
        id: 'model_001',
        name: 'Drilling Operation Standard',
        description: 'Standard work for manual drilling process',
        created: '2024-12-25',
        states: 4,
        rules: 6
    },
    {
        id: 'model_002',
        name: 'Assembly Station A',
        description: 'Cycle time analysis for station A',
        created: '2024-12-26',
        states: 5,
        rules: 8
    }
];

const StudioModel = () => {
    const { t } = useLanguage();
    const { showConfirm, showPrompt } = useDialog();
    // Load from localStorage or default to MOCK
    const [models, setModels] = useState(() => {
        const saved = localStorage.getItem('motionModels');
        return saved ? JSON.parse(saved) : MOCK_MODELS;
    });

    // Persist changes
    useEffect(() => {
        localStorage.setItem('motionModels', JSON.stringify(models));
    }, [models]);

    const [searchTerm, setSearchTerm] = useState('');
    const [isBuilderActive, setIsBuilderActive] = useState(false);
    const [selectedModel, setSelectedModel] = useState(null);
    const [showHelp, setShowHelp] = useState(false);

    const handleCreateModel = () => {
        const newModel = {
            id: `model_${Date.now()}`,
            name: 'New Motion Model',
            description: 'Description of the new model',
            created: new Date().toISOString().split('T')[0],
            states: 0,
            rules: 0,
            statesList: [], // Initialize empty arrays
            transitions: [],
            isNew: true
        };
        setSelectedModel(newModel);
        setIsBuilderActive(true);
    };

    const handleEditModel = (model) => {
        setSelectedModel(model);
        setIsBuilderActive(true);
    };

    const handleDeleteModel = async (id) => {
        if (await showConfirm('Delete Model', t('studioModel.deleteConfirm'))) {
            setModels(models.filter(m => m.id !== id));
        }
    };

    const handleRenameModel = async (id, currentName) => {
        const newName = await showPrompt('Rename Model', t('studioModel.renamePrompt'), currentName);
        if (newName && newName !== currentName) {
            setModels(models.map(m => m.id === id ? { ...m, name: newName } : m));
        }
    };

    const handleCloseBuilder = () => {
        setIsBuilderActive(false);
        setSelectedModel(null);
    };

    // Reuse HelpModal text/content
    const HelpModal = () => (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#1f2937',
                color: 'white',
                borderRadius: '12px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid #374151',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Sticky Header */}
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, color: '#60a5fa', fontSize: '1.5rem' }}>
                        {t('studioModel.helpModal.title')}
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid #374151',
                            borderRadius: '50%',
                            width: '36px',
                            height: '36px',
                            color: '#9ca3af',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{ padding: '30px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ lineHeight: '1.6', fontSize: '0.95rem' }}>
                        <p dangerouslySetInnerHTML={{ __html: t('studioModel.helpModal.intro').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                        <div style={{ marginTop: '20px' }}>
                            <h4 style={{ color: '#60a5fa', marginBottom: '8px' }}>{t('studioModel.helpModal.concepts.title')}</h4>
                            <ul style={{ paddingLeft: '20px', color: '#d1d5db' }}>
                                <li><strong>State (Status):</strong> {t('studioModel.helpModal.concepts.state').replace('State (Status): ', '')}</li>
                                <li><strong>Transition:</strong> {t('studioModel.helpModal.concepts.transition').replace('Transition: ', '')}</li>
                                <li><strong>Rule (Aturan):</strong> {t('studioModel.helpModal.concepts.rule').replace('Rule (Aturan): ', '')}</li>
                            </ul>

                            <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '16px' }}>{t('studioModel.helpModal.workflow.title')}</h4>
                            <ol style={{ paddingLeft: '20px', color: '#d1d5db' }}>
                                <li><strong>Upload Video:</strong> {t('studioModel.helpModal.workflow.step1').replace('Upload Video: ', '')}</li>
                                <li><strong>Definisikan States:</strong> {t('studioModel.helpModal.workflow.step2').replace('Definisikan States: ', '')}</li>
                                <li><strong>Buat Transisi & Rule:</strong> {t('studioModel.helpModal.workflow.step3').replace('Buat Transisi & Rule: ', '')}</li>
                                <li><strong>Validasi:</strong> {t('studioModel.helpModal.workflow.step4').replace('Validasi: ', '')}</li>
                            </ol>

                            <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '16px' }}>{t('studioModel.helpModal.navigation.title')}</h4>
                            <ul style={{ paddingLeft: '20px', color: '#d1d5db' }}>
                                <li><strong>Tab States:</strong> {t('studioModel.helpModal.navigation.tabStates').replace('Tab States: ', '')}</li>
                                <li><strong>Tab Rules:</strong> {t('studioModel.helpModal.navigation.tabRules').replace('Tab Rules: ', '')}</li>
                                <li><strong>Tab Test/Debug:</strong> {t('studioModel.helpModal.navigation.tabTest').replace('Tab Test/Debug: ', '')}</li>
                            </ul>

                            <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '16px' }}>4. Tipe Rule (Aturan)</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div style={{ padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#60a5fa' }}>Joint Angle</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Sudut sendi (Siku &lt; 90°).</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Cek postur tubuh/ergonomi.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#10b981' }}>Pose Relation (XYZ)</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Posisi relatif (Wrist Y &lt; Nose Y).</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Cek posisi tangan vs badan.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(236, 72, 153, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#ec4899' }}>Pose Velocity</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Kecepatan gerak sendi.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Deteksi diam (tunggu) atau gerakan cepat.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#f59e0b' }}>Object Proximity</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Jarak tangan ke objek.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Deteksi ambil/taruh barang.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#ef4444' }}>Object in ROI</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Objek masuk area.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Safety zone atau deteksi material masuk.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(14, 165, 233, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#0ea5e9' }}>Operator Proximity</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Jarak operator ke kamera/titik.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Cek apakah operator di stasiun kerja.</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#7c3aed' }}>Golden Pose Match</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Kemiripan dengan foto referensi.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Validasi postur kompleks (contoh: SOP).</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#8b5cf6' }}>Advanced Script</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Logika custom (DSL).</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Skenario rumit (Logika AND/OR).</p>
                                </div>
                                <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                                    <strong style={{ color: '#10b981' }}>Teachable Machine</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#d1d5db' }}>Klasifikasi AI kustom.</p>
                                    <p style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>*Guna: Deteksi aktivitas kompleks (e.g. "Working", "Phone Use").</p>
                                </div>
                            </div>
                        </div>

                        <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '20px' }}>5. 📚 Contoh Kasus Penggunaan (Use Cases)</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                <strong style={{ color: '#eab308' }}>Case 1: Hitung Rakitan</strong>
                                <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#9ca3af' }}>Hitung cycle saat tangan ambil part.</p>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: '#d1d5db', margin: 0 }}>
                                    <li><strong>Rule:</strong> <code>Hand Proximity</code> &lt; 10cm ke Box.</li>
                                </ul>
                            </div>
                            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                <strong style={{ color: '#ef4444' }}>Case 2: Safety Zone</strong>
                                <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#9ca3af' }}>Alarm jika tangan masuk mesin.</p>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: '#d1d5db', margin: 0 }}>
                                    <li><strong>Rule:</strong> <code>Object in ROI</code> (Hand in Danger Zone).</li>
                                </ul>
                            </div>
                            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                <strong style={{ color: '#10b981' }}>Case 3: Ergonomi</strong>
                                <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#9ca3af' }}>Cegah kerja tangan di atas kepala.</p>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: '#d1d5db', margin: 0 }}>
                                    <li><strong>Script:</strong> <code>right_wrist.y &lt; nose.y</code></li>
                                </ul>
                            </div>
                            <div style={{ backgroundColor: '#1f2937', padding: '12px', borderRadius: '8px', border: '1px solid #374151' }}>
                                <strong style={{ color: '#8b5cf6' }}>Case 4: Dua Tangan</strong>
                                <p style={{ margin: '6px 0', fontSize: '0.8rem', color: '#9ca3af' }}>Wajib angkat dengan 2 tangan.</p>
                                <ul style={{ paddingLeft: '16px', fontSize: '0.75rem', color: '#d1d5db', margin: 0 }}>
                                    <li><strong>Script:</strong> <code>dist(L_Hand) &lt; 0.1 && dist(R_Hand) &lt; 0.1</code></li>
                                </ul>
                            </div>
                        </div>

                        <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '20px' }}>6. 🏭 Contoh Step-by-Step (Siklus Mesin CNC)</h4>
                        <div style={{ backgroundColor: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151', fontSize: '0.85rem', color: '#d1d5db' }}>
                            <p style={{ margin: '0 0 10px 0', fontStyle: 'italic', color: '#9ca3af' }}>Skenario: Operator menjalankan mesin, merakit, dan memindahkan barang.</p>
                            <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.8' }}>
                                <li><strong>Tekan Tombol MSIN ON:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Object Proximity</code> (Kanan &lt; 5cm ke "Start Button").</li></ul></li>
                                <li><strong>Ambil Baut:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Hand Proximity</code> (Kiri &lt; 10cm ke "Box Baut").</li></ul></li>
                                <li><strong>Pasang Baut:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Pose Relation</code> (Kiri &lt; Dada Y).</li></ul></li>
                                <li><strong>Pindah Belakang (Mundur):</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Pose Relation</code> (Ankle Y &gt; Line Batas Lantai).</li></ul></li>
                                <li><strong>Periksa Barang (Inspeksi):</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Pose Angle</code> (Leher Angle &lt; 150°).</li></ul></li>
                                <li><strong>Tekan Tombol RUN:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Object Proximity</code> (Kanan &lt; 5cm ke "Panel Run").</li></ul></li>
                                <li><strong>Tunggu Mesin Berhenti:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Pose Velocity</code> (Semua Sendi &lt; 10).</li></ul></li>
                                <li><strong>Ambil Barang Jadi:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Hand Proximity</code> (Kedua Tangan &lt; 10cm ke "Machine Chuck").</li></ul></li>
                                <li><strong>Taruh di Meja:</strong><ul style={{ paddingLeft: '15px', margin: '4px 0', color: '#9ca3af', listStyleType: 'circle' }}><li>Rule: <code>Object Proximity</code> (Object &lt; 5cm ke "Meja Finish").</li></ul></li>
                            </ol>
                        </div>

                        <h4 style={{ color: '#10b981', marginBottom: '8px', marginTop: '20px' }}>7. 🤖 Integrasi Teachable Machine (AI Kustom)</h4>
                        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.85rem' }}>
                            <p style={{ margin: '0 0 10px 0' }}>Gunakan model klasifikasi kustom dari <a href="https://teachablemachine.withgoogle.com/train/pose" target="_blank" rel="noreferrer" style={{ color: '#10b981' }}>Teachable Machine</a>.</p>
                            <div style={{ marginBottom: '12px' }}>
                                <strong style={{ color: 'white' }}>A. Cara Menghubungkan:</strong>
                                <ol style={{ paddingLeft: '20px', color: '#d1d5db', marginTop: '4px' }}>
                                    <li>Buka tab <strong>Settings</strong> → Klik <strong>Add Model</strong>.</li>
                                    <li>Masukkan <strong>URL</strong> model (Online) atau upload 3 file (Offline).</li>
                                </ol>
                            </div>
                            <div>
                                <strong style={{ color: 'white' }}>B. Cara Menggunakan di Rule:</strong>
                                <p style={{ color: '#d1d5db', margin: '4px 0 0' }}>Di Rule Editor, pilih tipe <strong>Teachable Machine</strong> → Pilih <strong>Model</strong> → Masukkan <strong>Target Class</strong>.</p>
                            </div>
                        </div>

                        <h4 style={{ color: '#60a5fa', marginBottom: '8px', marginTop: '20px' }}>8. ⚖️ Analisa Akurasi</h4>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', color: '#d1d5db' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #4b5563', color: '#9ca3af', textAlign: 'left' }}>
                                        <th style={{ padding: '8px' }}>Tipe Logic</th>
                                        <th style={{ padding: '8px' }}>Kelebihan (Pros)</th>
                                        <th style={{ padding: '8px' }}>Kekurangan (Cons)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr style={{ borderBottom: '1px solid #374151' }}>
                                        <td style={{ padding: '8px', color: '#60a5fa' }}>Pose/Joint</td>
                                        <td style={{ padding: '8px' }}>Sangat cepat, real-time 30FPS.</td>
                                        <td style={{ padding: '8px', color: '#f87171' }}>Gagal jika badan tertutup.</td>
                                    </tr>
                                    <tr style={{ borderBottom: '1px solid #374151' }}>
                                        <td style={{ padding: '8px', color: '#f59e0b' }}>Object Detection</td>
                                        <td style={{ padding: '8px' }}>Mengenali alat spesifik.</td>
                                        <td style={{ padding: '8px', color: '#f87171' }}>Lebih berat (FPS turun).</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div style={{ padding: '20px 30px', borderTop: '1px solid #374151' }}>
                    <button
                        onClick={() => setShowHelp(false)}
                        style={{
                            padding: '12px 24px',
                            background: '#2563eb',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: '1rem'
                        }}
                    >
                        {t('studioModel.helpModal.close')}
                    </button>
                </div>
            </div>
        </div>
    );

    if (isBuilderActive) {
        return (
            <ModelBuilder
                model={selectedModel}
                onClose={handleCloseBuilder}
                onSave={(updatedModel) => {
                    if (updatedModel.isNew) {
                        setModels([...models, { ...updatedModel, isNew: false }]);
                    } else {
                        setModels(models.map(m => m.id === updatedModel.id ? updatedModel : m));
                    }
                    setIsBuilderActive(false);
                }}
            />
        );
    }

    const styles = {
        helpButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            background: '#374151',
            borderRadius: '12px',
            fontWeight: '600',
            color: '#e5e7eb',
            border: '1px solid #4b5563',
            cursor: 'pointer',
            transition: 'all 0.2s',
            marginRight: '12px'
        },
        container: {
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#111827', // gray-900
            color: 'white',
            padding: '24px',
            overflow: 'hidden',
            fontFamily: 'Inter, sans-serif'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px'
        },
        title: {
            fontSize: '1.875rem',
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #60a5fa, #a855f7)', // blue-400 to purple-500
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            margin: 0
        },
        subtitle: {
            color: '#9ca3af', // gray-400
            marginTop: '4px',
            margin: 0
        },
        createButton: {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(to right, #2563eb, #9333ea)', // blue-600 to purple-600
            borderRadius: '12px',
            fontWeight: 'bold',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
        },
        searchContainer: {
            display: 'flex',
            gap: '16px',
            marginBottom: '24px'
        },
        searchInputWrapper: {
            position: 'relative',
            flex: 1,
            maxWidth: '448px' // max-w-md
        },
        searchIcon: {
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af'
        },
        searchInput: {
            width: '100%',
            backgroundColor: '#1f2937', // gray-800
            border: '1px solid #374151', // gray-700
            borderRadius: '8px',
            padding: '12px 16px 12px 40px',
            color: 'white',
            outline: 'none',
            fontSize: '1rem'
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
            overflowY: 'auto',
            paddingBottom: '24px'
        },
        card: {
            backgroundColor: 'rgba(31, 41, 55, 0.5)', // gray-800/50
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '20px',
            transition: 'all 0.2s',
            cursor: 'pointer',
            position: 'relative'
        },
        cardHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px'
        },
        iconWrapper: {
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500/10
            borderRadius: '8px'
        },
        actionButtons: {
            display: 'flex',
            gap: '8px'
        },
        actionBtn: {
            padding: '8px',
            borderRadius: '8px',
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            transition: 'background 0.2s'
        },
        cardTitle: {
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '8px',
            margin: 0
        },
        cardDesc: {
            color: '#9ca3af',
            fontSize: '0.875rem',
            marginBottom: '16px',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
        },
        cardFooter: {
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: '0.875rem',
            color: '#6b7280', // gray-500
            borderTop: '1px solid #374151',
            paddingTop: '16px'
        },
        statItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        }
    };

    return (
        <div style={styles.container}>
            {showHelp && <HelpModal />}
            {/* Header */}
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>
                        {t('studioModel.title')}
                    </h1>
                    <p style={styles.subtitle}>{t('studioModel.subtitle')}</p>
                </div>
                <div style={{ display: 'flex' }}>
                    <button
                        style={styles.helpButton}
                        onClick={() => setShowHelp(true)}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#374151'}
                    >
                        ? {t('studioModel.helpButton')}
                    </button>
                    <button
                        onClick={handleCreateModel}
                        style={styles.createButton}
                        onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(37, 99, 235, 0.2)'}
                        onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
                    >
                        <Plus size={20} />
                        {t('studioModel.createButton')}
                    </button>
                </div>
            </div>
            {/* ... rest of return ... */}

            {/* Search */}
            <div style={styles.searchContainer}>
                <div style={styles.searchInputWrapper}>
                    <Search style={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        placeholder={t('studioModel.searchPlaceholder')}
                        style={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#374151'}
                    />
                </div>
            </div>

            {/* Grid */}
            <div style={styles.grid}>
                {models
                    .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(model => (
                        <div
                            key={model.id}
                            style={styles.card}
                            onMouseOver={(e) => {
                                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                                e.currentTarget.style.backgroundColor = '#1f2937';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.borderColor = '#374151';
                                e.currentTarget.style.backgroundColor = 'rgba(31, 41, 55, 0.5)';
                            }}
                            onClick={() => handleEditModel(model)}
                        >
                            <div style={styles.cardHeader}>
                                <div style={styles.iconWrapper}>
                                    <Activity color="#60a5fa" size={24} />
                                </div>
                                <div style={styles.actionButtons}>
                                    <button
                                        style={styles.actionBtn}
                                        onClick={(e) => { e.stopPropagation(); handleEditModel(model); }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#374151'; e.currentTarget.style.color = 'white'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                                        title={t('studioModel.openEditor')}
                                    >
                                        <Edit3 size={16} />
                                    </button>
                                    <button
                                        style={styles.actionBtn}
                                        onClick={(e) => { e.stopPropagation(); handleDeleteModel(model.id); }}
                                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)'; e.currentTarget.style.color = '#f87171'; }}
                                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
                                        title={t('studioModel.delete')}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <h3
                                style={{ ...styles.cardTitle, cursor: 'pointer' }}
                                onClick={(e) => { e.stopPropagation(); handleRenameModel(model.id, model.name); }}
                                title={t('studioModel.clickRename')}
                                onMouseOver={(e) => e.currentTarget.style.color = '#60a5fa'}
                                onMouseOut={(e) => e.currentTarget.style.color = 'white'}
                            >
                                {model.name}
                            </h3>
                            <p
                                style={{ ...styles.cardDesc, cursor: 'pointer' }}
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    const newDesc = await showPrompt('Edit Description', t('studioModel.descPrompt'), model.description);
                                    if (newDesc !== null) {
                                        setModels(models.map(m => m.id === model.id ? { ...m, description: newDesc } : m));
                                    }
                                }}

                                title={t('studioModel.clickDesc')}
                            >
                                {model.description}
                            </p>

                            <div style={styles.cardFooter}>
                                <div style={styles.statItem}>
                                    <Box size={14} />
                                    <span>{model.states} {t('studioModel.states')}</span>
                                </div>
                                <div style={styles.statItem}>
                                    <Activity size={14} />
                                    <span>{model.rules} {t('studioModel.rules')}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                {/* Empty State */}
                {models.length === 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '48px',
                        color: '#6b7280',
                        border: '2px dashed #374151',
                        borderRadius: '12px'
                    }}>
                        <Video size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                        <p style={{ fontSize: '1.125rem', margin: 0 }}>{t('studioModel.noModels')}</p>
                        <button
                            onClick={handleCreateModel}
                            style={{
                                marginTop: '16px',
                                color: '#60a5fa',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline'
                            }}
                        >
                            {t('studioModel.createFirst')}
                        </button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default StudioModel;
