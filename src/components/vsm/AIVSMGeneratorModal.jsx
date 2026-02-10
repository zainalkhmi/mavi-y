import React, { useState, useEffect } from 'react';
import { X, Sparkles, MessageSquare, List, HelpCircle, AlertCircle, Save, Trash2, FolderOpen, Play, Info, Wand2, Lightbulb } from 'lucide-react';
import { VSMSymbols } from './vsm-constants';
import { useLanguage } from '../../i18n/LanguageContext';
import { useDialog } from '../../contexts/DialogContext';

const AIVSMGeneratorModal = ({ isOpen, onClose, onGenerate, currentLanguage, existingNodesCount }) => {
    const { showAlert } = useDialog();
    const { t } = useLanguage();
    const [prompt, setPrompt] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState(currentLanguage === 'id' ? 'Indonesian' : 'English');
    const [mode, setMode] = useState(existingNodesCount > 0 ? 'merge' : 'replace');
    const [showExamples, setShowExamples] = useState(false);

    const examplePrompts = {
        English: [
            {
                title: "Simple Manufacturing with Info Flow",
                prompt: "Manufacturing process from Supplier ABC with weekly forecast from production control. Cutting takes 30 seconds with 2 operators, receives daily schedule. Then Assembly 45 seconds with kanban pull system. QC inspection 20 seconds. Ship to Customer XYZ."
            },
            {
                title: "Complete VSM with MRP",
                prompt: "Raw material from supplier with electronic forecast. Production control (MRP) sends daily schedules to all processes. Cutting (30s, 95% uptime, 2 operators), WIP inventory 200 pieces (2 hours), Assembly (45s, 3 operators, 98% yield) with kanban signal. Final QC 15s, ship to customer."
            },
            {
                title: "Kanban Pull System",
                prompt: "Supplier delivers parts. Production control coordinates with kanban system. Process A (30s) and Process B (40s) run in parallel with kanban posts. Both feed into Assembly (60s). Supermarket buffer of 50 units. Final inspection (15s) then ship to customer with shipping schedule."
            }
        ],
        Indonesian: [
            {
                title: "Manufaktur dengan Aliran Informasi",
                prompt: "Proses dari supplier ABC dengan forecast mingguan dari production control. Cutting 30 detik dengan 2 operator, terima jadwal harian. Lalu Assembly 45 detik dengan sistem kanban pull. QC 20 detik. Kirim ke customer XYZ."
            },
            {
                title: "VSM Lengkap dengan MRP",
                prompt: "Material dari supplier dengan forecast elektronik. Production control (MRP) kirim jadwal harian ke semua proses. Cutting (30 detik, uptime 95%, 2 operator), inventory WIP 200 pcs (2 jam), Assembly (45 detik, 3 operator, yield 98%) dengan sinyal kanban. QC akhir 15 detik, kirim ke customer."
            },
            {
                title: "Sistem Kanban Pull",
                prompt: "Supplier kirim part. Production control koordinasi dengan sistem kanban. Proses A (30 detik) dan Proses B (40 detik) paralel dengan kanban post. Keduanya masuk Assembly (60 detik). Supermarket buffer 50 unit. Inspeksi akhir (15 detik) kirim ke customer dengan jadwal pengiriman."
            }
        ],
        Japanese: [
            {
                title: "情報フローを含む製造プロセス",
                prompt: "サプライヤーABCからの製造プロセス。生産管理から週次予測を受信。切断工程は30秒、2名のオペレーター、日次スケジュールを受信。次に組立45秒、かんばんプルシステム。QC検査20秒。顧客XYZへ出荷。"
            },
            {
                title: "MRPを含む完全なVSM",
                prompt: "サプライヤーからの原材料、電子予測付き。生産管理(MRP)が全工程に日次スケジュールを送信。切断(30秒、稼働率95%、2名)、仕掛在庫200個(2時間)、組立(45秒、3名、歩留98%)、かんばん信号付き。最終QC 15秒、顧客へ出荷。"
            },
            {
                title: "かんばんプルシステム",
                prompt: "サプライヤーが部品を納入。生産管理がかんばんシステムと連携。工程A(30秒)と工程B(40秒)が並行、かんばんポスト付き。両方が組立(60秒)に供給。スーパーマーケット在庫50個。最終検査(15秒)、出荷スケジュールで顧客へ。"
            }
        ],
        Korean: [
            {
                title: "정보 흐름이 포함된 제조 프로세스",
                prompt: "공급업체 ABC로부터 제조 프로세스. 생산 관리로부터 주간 예측 수신. 절단 공정 30초, 작업자 2명, 일일 일정 수신. 다음 조립 45초, 간판 풀 시스템. QC 검사 20초. 고객 XYZ로 출하."
            },
            {
                title: "MRP가 포함된 완전한 VSM",
                prompt: "공급업체로부터 원자재, 전자 예측 포함. 생산 관리(MRP)가 모든 공정에 일일 일정 전송. 절단(30초, 가동률 95%, 2명), 재공품 재고 200개(2시간), 조립(45초, 3명, 수율 98%), 간판 신호 포함. 최종 QC 15초, 고객에게 출하."
            },
            {
                title: "간판 풀 시스템",
                prompt: "공급업체가 부품 납품. 생산 관리가 간판 시스템과 조정. 공정 A(30초)와 공정 B(40초)가 병렬, 간판 포스트 포함. 둘 다 조립(60초)에 공급. 슈퍼마켓 버퍼 50개. 최종 검사(15초), 출하 일정으로 고객에게."
            }
        ]
    };

    const handleExampleClick = (examplePrompt) => {
        setPrompt(examplePrompt);
        setShowExamples(false);
    };

    const handleGenerate = async () => {
        if (prompt.trim().length < 20) {
            await showAlert('Info', t('vsm.ai.promptPlaceholder').split('.')[1]); // Minimal char message fallback or just use t
            return;
        }
        if (prompt.trim().length > 3000) {
            await showAlert('Warning', t('vsm.ai.tip'));
            return;
        }
        onGenerate({ prompt: prompt.trim(), language: selectedLanguage, mode });
    };

    if (!isOpen) return null;

    const labels = currentLanguage === 'id' ? {
        title: 'Generate VSM dari Deskripsi',
        subtitle: 'Jelaskan proses Anda, AI akan membuat Value Stream Map lengkap',
        promptLabel: 'Deskripsi Proses',
        promptPlaceholder: 'Contoh: Proses dimulai dari supplier, lalu cutting 30 detik, assembly 45 detik, inventory 100 unit, QC 20 detik, packing 25 detik ke customer...',
        languageLabel: 'Bahasa Output',
        modeLabel: 'Mode',
        modeReplace: 'Ganti Canvas',
        modeMerge: 'Gabung dengan Existing',
        examplesButton: 'Lihat Contoh',
        hideExamplesButton: 'Sembunyikan Contoh',
        generateButton: 'Generate VSM',
        cancelButton: 'Batal',
        charCount: 'karakter'
    } : {
        title: 'Generate VSM from Description',
        subtitle: 'Describe your process, AI will create a complete Value Stream Map',
        promptLabel: 'Process Description',
        promptPlaceholder: 'Example: Process starts from supplier, then cutting 30 seconds, assembly 45 seconds, inventory 100 units, QC 20 seconds, packing 25 seconds to customer...',
        languageLabel: 'Output Language',
        modeLabel: 'Mode',
        modeReplace: 'Replace Canvas',
        modeMerge: 'Merge with Existing',
        examplesButton: 'Show Examples',
        hideExamplesButton: 'Hide Examples',
        generateButton: 'Generate VSM',
        cancelButton: 'Cancel',
        charCount: 'characters'
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: '#1e1e1e', borderRadius: '12px',
                width: '90%', maxWidth: '700px', maxHeight: '90vh',
                border: '1px solid #8a2be2', boxShadow: '0 20px 60px rgba(138, 43, 226, 0.3)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '20px', backgroundColor: '#8a2be2',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Wand2 size={24} color="white" />
                        <div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.3rem' }}>{t('vsm.ai.title')}</h2>
                            <p style={{ margin: '4px 0 0 0', color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}>
                                {t('vsm.ai.subtitle')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'none', border: 'none', color: 'white',
                        cursor: 'pointer', padding: '5px'
                    }}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '25px', overflowY: 'auto', flex: 1 }}>
                    {/* Prompt Input */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block', marginBottom: '8px', color: '#aaa',
                            fontSize: '0.9rem', fontWeight: '500'
                        }}>
                            {t('vsm.ai.promptLabel')}
                        </label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder={t('vsm.ai.promptPlaceholder')}
                            style={{
                                width: '100%', minHeight: '120px', padding: '12px',
                                backgroundColor: '#2d2d2d', border: '1px solid #555',
                                borderRadius: '6px', color: 'white', fontSize: '0.95rem',
                                fontFamily: 'inherit', resize: 'vertical',
                                outline: 'none', transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#8a2be2'}
                            onBlur={(e) => e.target.style.borderColor = '#555'}
                        />
                        <div style={{
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', marginTop: '6px'
                        }}>
                            <span style={{
                                fontSize: '0.75rem',
                                color: prompt.length < 20 ? '#c50f1f' : prompt.length > 3000 ? '#ff9900' : '#888'
                            }}>
                                {prompt.length} {labels.charCount}
                            </span>
                            <button
                                onClick={() => setShowExamples(!showExamples)}
                                style={{
                                    padding: '6px 12px', backgroundColor: '#444',
                                    border: 'none', borderRadius: '4px', color: 'white',
                                    cursor: 'pointer', fontSize: '0.8rem',
                                    display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <Lightbulb size={14} />
                                {showExamples ? t('vsm.ai.hideExamplesButton') : t('vsm.ai.examplesButton')}
                            </button>
                        </div>
                    </div>

                    {/* Example Prompts */}
                    {showExamples && (
                        <div style={{
                            marginBottom: '20px', padding: '15px',
                            backgroundColor: '#2d2d2d', borderRadius: '6px',
                            border: '1px solid #444'
                        }}>
                            {examplePrompts[selectedLanguage].map((example, idx) => (
                                <div key={idx} style={{
                                    marginBottom: idx < examplePrompts[selectedLanguage].length - 1 ? '12px' : 0,
                                    paddingBottom: idx < examplePrompts[selectedLanguage].length - 1 ? '12px' : 0,
                                    borderBottom: idx < examplePrompts[selectedLanguage].length - 1 ? '1px solid #444' : 'none'
                                }}>
                                    <div style={{
                                        fontSize: '0.85rem', color: '#8a2be2',
                                        fontWeight: '500', marginBottom: '6px'
                                    }}>
                                        {example.title}
                                    </div>
                                    <div
                                        onClick={() => handleExampleClick(example.prompt)}
                                        style={{
                                            fontSize: '0.8rem', color: '#ccc',
                                            cursor: 'pointer', padding: '8px',
                                            backgroundColor: '#1e1e1e', borderRadius: '4px',
                                            border: '1px solid transparent',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.target.style.borderColor = '#8a2be2';
                                            e.target.style.backgroundColor = '#252526';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.target.style.borderColor = 'transparent';
                                            e.target.style.backgroundColor = '#1e1e1e';
                                        }}
                                    >
                                        {example.prompt}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Settings Row */}
                    <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                        {/* Language Selection */}
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block', marginBottom: '8px',
                                color: '#aaa', fontSize: '0.9rem', fontWeight: '500'
                            }}>
                                {t('vsm.ai.languageLabel')}
                            </label>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => setSelectedLanguage(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', backgroundColor: '#2d2d2d',
                                    border: '1px solid #555', borderRadius: '6px',
                                    color: 'white', fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                <option value="English">English</option>
                                <option value="Indonesian">Indonesian (Bahasa)</option>
                                <option value="Japanese">Japanese (日本語)</option>
                                <option value="Korean">Korean (한국어)</option>
                            </select>
                        </div>

                        {/* Mode Selection */}
                        <div style={{ flex: 1 }}>
                            <label style={{
                                display: 'block', marginBottom: '8px',
                                color: '#aaa', fontSize: '0.9rem', fontWeight: '500'
                            }}>
                                {t('vsm.ai.modeLabel')}
                            </label>
                            <select
                                value={mode}
                                onChange={(e) => setMode(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px', backgroundColor: '#2d2d2d',
                                    border: '1px solid #555', borderRadius: '6px',
                                    color: 'white', fontSize: '0.9rem', cursor: 'pointer'
                                }}
                            >
                                <option value="replace">{t('vsm.ai.modeReplace')}</option>
                                <option value="merge">{t('vsm.ai.modeMerge')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Info Box */}
                    <div style={{
                        padding: '12px', backgroundColor: 'rgba(138, 43, 226, 0.1)',
                        border: '1px solid rgba(138, 43, 226, 0.3)',
                        borderRadius: '6px', fontSize: '0.8rem', color: '#ccc'
                    }}>
                        <strong style={{ color: '#8a2be2' }}>💡 Tip:</strong>{' '}
                        {t('vsm.ai.tip')}
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '20px', borderTop: '1px solid #333',
                    display: 'flex', justifyContent: 'flex-end', gap: '12px'
                }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px', backgroundColor: '#444',
                            border: 'none', borderRadius: '6px', color: 'white',
                            cursor: 'pointer', fontSize: '0.9rem'
                        }}
                    >
                        {t('vsm.ai.cancelButton')}
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={prompt.trim().length < 20}
                        style={{
                            padding: '10px 24px', backgroundColor: '#8a2be2',
                            border: 'none', borderRadius: '6px', color: 'white',
                            cursor: prompt.trim().length < 20 ? 'not-allowed' : 'pointer',
                            fontSize: '0.9rem', fontWeight: '500',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            opacity: prompt.trim().length < 20 ? 0.5 : 1
                        }}
                    >
                        <Sparkles size={16} />
                        {t('vsm.ai.generateButton')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIVSMGeneratorModal;
