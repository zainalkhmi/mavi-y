import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  Square,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Loader2,
  Pause,
  Hash,
  Package,
  Zap
} from 'lucide-react';
import { listManualSummaries, getManualById } from '../utils/supabaseManualDB';
import { saveLiveMeasurement } from '../utils/supabaseUtilityDB';
import { getAllFrontlineApps, getProductionQueue } from '../utils/supabaseFrontlineDB';
import { useLanguage } from '../contexts/LanguageContext';
import iotConnector from '../utils/iotConnector';
import webhookUtility from '../utils/webhookUtility';
import WorkOrderManager from './WorkOrderManager';
import { logEvent, AUDIT_EVENTS } from '../utils/auditLog';

const STATUS_CONFIG = {
  READY: { label: 'System Ready', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)' },
  RUNNING: { label: 'Production Running', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)' },
  DOWN: { label: 'Workstation Down', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)' },
  SETUP: { label: 'Changeover / Setup', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)' }
};

const LiveTerminal = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [manuals, setManuals] = useState([]);
  const [frontlineApps, setFrontlineApps] = useState([]);
  const [productionQueue, setProductionQueue] = useState([]);
  const [selectedManual, setSelectedManual] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [signature, setSignature] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [status, setStatus] = useState('READY');
  const [timer, setTimer] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [cycleData, setCycleData] = useState([]);
  const [machineData, setMachineData] = useState({});
  const [currentWorkOrder, setCurrentWorkOrder] = useState('');
  const [qualityData, setQualityData] = useState({}); // Tracking inputs for quality components
  const [quantityLog, setQuantityLog] = useState({}); // { [compId]: { completed: 0, target: N } }
  const [sessionStartTime] = useState(new Date());

  const timerRef = useRef(null);
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const now = Date.now();
      // Most scanners send characters rapidly (< 50ms apart)
      if (now - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }
      lastKeyTime.current = now;

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length > 3) {
          handleBarcodeScan(barcodeBuffer.current);
        }
        barcodeBuffer.current = '';
      } else if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [manuals, selectedManual]);

  const handleBarcodeScan = (code) => {
    console.log('Barcode Scanned:', code);
    // If we're on the selection screen, try to find a matching SOP or App
    if (!selectedManual && !selectedApp) {
      const matchSop = manuals.find(m => m.documentNumber === code || m.id === code);
      if (matchSop) {
        handleStartCycle(matchSop.id);
        return;
      }
      const matchApp = frontlineApps.find(a => a.id === code || a.name === code);
      if (matchApp) {
        handleStartApp(matchApp);
      }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [manualData, appData, queueData] = await Promise.all([
          listManualSummaries(),
          getAllFrontlineApps(),
          getProductionQueue()
        ]);
        setManuals(manualData || []);
        setFrontlineApps(appData || []);
        setProductionQueue(queueData || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleStartCycle = async (manualId) => {
    setLoading(true);
    try {
      const fullManual = await getManualById(manualId);
      setSelectedManual(fullManual);
      setSelectedApp(null);
      setStatus('RUNNING');
      setTimer(0);
      setCurrentStepIndex(0);
      setCycleData([]);
      setQualityData({});
      setQuantityLog({});

      logEvent({
        type: AUDIT_EVENTS.CYCLE_START,
        workstation: 'WS-01',
        workOrder: currentWorkOrder,
        details: { id: manualId, type: 'SOP', title: fullManual.title }
      });

      startTimer();
    } catch (err) {
      console.error('Failed to start cycle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartApp = (app) => {
    setSelectedApp(app);
    setSelectedManual(null);
    setStatus('RUNNING');
    setTimer(0);
    setCurrentStepIndex(0);
    setCycleData([]);
    setQuantityLog({});
    startTimer();

    // IoT Integration
    const appSteps = app.config?.steps || [];
    const firstStepComponents = appSteps[0]?.components || [];
    const machineComponents = firstStepComponents.filter(c => c.type === 'MACHINE_STATUS') || [];

    machineComponents.forEach(comp => {
      if (comp.props?.topic) {
        iotConnector.connect();
        iotConnector.subscribe(comp.props.topic, (val) => {
          setMachineData(prev => ({ ...prev, [comp.props.topic]: val }));
        });
      }
    });

    logEvent({
      type: AUDIT_EVENTS.CYCLE_START,
      workstation: 'WS-01',
      workOrder: currentWorkOrder,
      details: { id: app.id, type: 'APP', name: app.name }
    });
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFinalizeWithSignature = async () => {
    if (!signature.trim()) {
      alert('Signature / Operator ID is required for governance sign-off.');
      return;
    }

    const totalTime = timer;
    setStatus('READY');
    stopTimer();

    try {
      const savedData = {
        video_name: `LIVE_${selectedApp ? selectedApp.name : selectedManual.title}_${new Date().getTime()}`,
        measurements: {
          manual_id: selectedManual?.id || selectedApp?.id,
          manual_title: selectedManual?.title || selectedApp?.name,
          total_time: totalTime,
          workstation: 'WS-01',
          operator_id: signature,
          has_signature: true
        },
        cycle_data: cycleData,
        quality_data: qualityData,
        work_order: currentWorkOrder,
        narration: `Live completion with sign-off by ${signature}`
      };

      logEvent({
        type: AUDIT_EVENTS.CYCLE_COMPLETE,
        user: signature,
        workstation: 'WS-01',
        workOrder: currentWorkOrder,
        details: { id: selectedManual?.id || selectedApp?.id, totalTime, quality: qualityData }
      });

      await saveLiveMeasurement(savedData);

      // Enterprise Sync: Webhook trigger
      await webhookUtility.syncProductionRecord({
        ...savedData.measurements,
        steps: cycleData
      });

      alert('Cycle completed and signed off successfully!');
    } catch (err) {
      console.error('Failed to save cycle:', err);
      alert('Cycle completed, but failed to save to database.');
    }

    setSelectedManual(null);
    setSelectedApp(null);
    setMachineData({});
    // Disconnect IoT if moving back to selection
    iotConnector.subscriptions.forEach((_, topic) => iotConnector.unsubscribe(topic));
    setTimer(0);
    setSignature('');
    setShowSignaturePad(false);
  };

  const handleNextStep = async () => {
    const activeSteps = selectedApp ? (selectedApp.config?.steps || []) : (selectedManual?.content?.steps || []);
    const currentTime = timer;

    // Record step completion
    const newStepData = {
      step: activeSteps[currentStepIndex]?.title || `Step ${currentStepIndex + 1}`,
      duration: currentTime - (cycleData.reduce((acc, s) => acc + s.duration, 0))
    };

    const updatedCycleData = [...cycleData, newStepData];
    setCycleData(updatedCycleData);

    if (currentStepIndex < activeSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);

      // Update IoT subscriptions for new step
      if (selectedApp) {
        const nextStep = activeSteps[currentStepIndex + 1];
        const newMachineComps = nextStep?.components?.filter(c => c.type === 'MACHINE_STATUS') || [];
        newMachineComps.forEach(comp => {
          if (comp.props?.topic && !iotConnector.subscriptions.has(comp.props.topic)) {
            iotConnector.subscribe(comp.props.topic, (val) => {
              setMachineData(prev => ({ ...prev, [comp.props.topic]: val }));
            });
          }
        });
      }
    } else {
      setShowSignaturePad(true);
      stopTimer();
    }
  };

  const handleButtonAction = (props) => {
    const action = props.action;
    switch (action) {
      case 'NEXT_STEP':
        handleNextStep();
        break;
      case 'PREV_STEP':
        setCurrentStepIndex(prev => Math.max(0, prev - 1));
        break;
      case 'GO_TO_STEP':
        if (props.targetStepId) {
          const targetIndex = steps.findIndex(s => s.id === props.targetStepId);
          if (targetIndex !== -1) {
            setCurrentStepIndex(targetIndex);
          }
        }
        break;
      case 'COMPLETE':
        setShowSignaturePad(true);
        stopTimer();
        break;
      default:
        break;
    }
  };

  const handleAbort = () => {
    if (window.confirm('Abort current cycle? Progress will be lost.')) {
      stopTimer();
      setStatus('READY');
      setSelectedManual(null);
      setSelectedApp(null);
      setTimer(0);
      setShowSignaturePad(false);
      setSignature('');
    }
  };

  if (loading && !selectedManual && !selectedApp) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#030305' }}>
        <Loader2 className="animate-spin" size={48} color="#3b82f6" />
      </div>
    );
  }

  // --- SELECTION VIEW ---
  if (!selectedManual && !selectedApp) {
    return (
      <div style={{ height: '100%', backgroundColor: '#030305', padding: '40px', overflowY: 'auto' }}>
        <h1 style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 900, marginBottom: '10px' }}>Workstation Selection</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: '30px' }}>Select an SOP or Custom App to begin production tracking.</p>

        <div style={{ marginBottom: '40px', maxWidth: '800px' }}>
          <WorkOrderManager
            currentWorkOrder={currentWorkOrder}
            onSelect={(wo) => {
              setCurrentWorkOrder(wo);
              if (wo) {
                logEvent({
                  type: AUDIT_EVENTS.WORK_ORDER_BIND,
                  workstation: 'WS-01',
                  workOrder: wo
                });
              }
            }}
          />
        </div>

        {/* Section: Assigned Queue (New Phase 7) */}
        {productionQueue.length > 0 && (
          <div style={{ marginBottom: '50px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
              <div style={{ padding: '8px 12px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Assigned</div>
              <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 900, margin: 0 }}>Pending Job Queue</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {productionQueue.map(job => {
                const app = frontlineApps.find(a => a.id === job.app_id);
                return (
                  <div
                    key={job.id}
                    onClick={() => {
                      if (app) {
                        setCurrentWorkOrder(job.work_order);
                        handleStartApp(app);
                      }
                    }}
                    className="glass-panel"
                    style={{
                      padding: '25px',
                      borderRadius: '24px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: job.priority === 'P1' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                      background: job.priority === 'P1' ? 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(0,0,0,0))' : 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', marginBottom: '4px' }}>{job.work_order}</div>
                      <div style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>{app?.name || 'Unknown App'}</div>
                      <div style={{ marginTop: '12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>Target: <b>{job.target_qty} units</b></div>
                    </div>
                    {job.priority === 'P1' && (
                      <div style={{ color: '#ef4444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <AlertCircle size={24} />
                        <span style={{ fontSize: '0.6rem', fontWeight: 900 }}>URGENT</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section: Custom Apps */}
        {frontlineApps.length > 0 && (
          <div style={{ marginBottom: '40px' }}>
            <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Custom Apps</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
              {frontlineApps.map(app => (
                <div
                  key={app.id}
                  onClick={() => handleStartApp(app)}
                  className="glass-card"
                  style={{ padding: '30px', borderRadius: '24px', cursor: 'pointer', border: '1px solid rgba(59, 130, 246, 0.2)' }}
                >
                  <div style={{ color: '#8b5cf6', marginBottom: '15px' }}><LayoutGrid size={32} /></div>
                  <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>{app.name}</h3>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: 0 }}>
                    Custom Workstation App
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section: Standard Operating Procedures */}
        <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.2rem', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>SOPs & Manuals</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {manuals.map(m => (
            <div
              key={m.id}
              onClick={() => handleStartCycle(m.id)}
              className="glass-card"
              style={{ padding: '30px', borderRadius: '24px', cursor: 'pointer' }}
            >
              <div style={{ color: '#3b82f6', marginBottom: '15px' }}><Activity size={32} /></div>
              <h3 style={{ color: '#fff', margin: '0 0 10px 0' }}>{m.title}</h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem', margin: 0 }}>
                {m.documentNumber ? `ID: ${m.documentNumber}` : 'No Document ID'}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '20px', color: 'rgba(255,255,255,0.2)' }}>
                <Clock size={16} /> <span>Est. {m.timeRequired || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>

        {manuals.length === 0 && frontlineApps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px', color: 'rgba(255,255,255,0.2)' }}>
            No apps or SOPs available. Create them in App Builder or Manual Creation.
          </div>
        )}
      </div>
    );
  }

  // --- LIVE OPERATION VIEW ---
  const currentStatus = STATUS_CONFIG[status];
  const steps = selectedApp ? (selectedApp.config?.steps || []) : (selectedManual?.content?.steps || []);
  const activeStep = steps[currentStepIndex];
  const appComponents = selectedApp ? (activeStep?.components || []) : [];

  return (
    <div style={{
      height: '100%',
      backgroundColor: '#030305',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      padding: '40px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div style={{ flex: 1 }}>
          {/* App / SOP title */}
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.8rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap size={18} color="#fff" />
            </div>
            {selectedApp ? selectedApp.name : selectedManual.title}
          </h1>
          {/* Meta row: Work Order · Material · Batch · Station */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '12px' }}>
            {[
              { label: 'Work Order', value: currentWorkOrder || '—' },
              { label: 'Batch ID', value: selectedApp?.config?.batchId || `BATCH-${sessionStartTime.getTime().toString().slice(-6)}` },
              { label: 'Material', value: selectedApp?.config?.materialId || selectedManual?.documentNumber || '—' },
              { label: 'Start', value: sessionStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
              { label: 'Workstation', value: 'WS-01' }
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>{label}</span>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexShrink: 0 }}>
          {/* Station Status Badge */}
          <div style={{
            padding: '10px 20px',
            backgroundColor: currentStatus.bg,
            border: `1px solid ${currentStatus.border}`,
            borderRadius: '14px',
            color: currentStatus.color,
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: '0.8rem'
          }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: currentStatus.color, boxShadow: `0 0 8px ${currentStatus.color}` }} />
            {currentStatus.label}
          </div>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
              if (newStatus === 'DOWN') {
                const reason = prompt('Please select Downtime Reason:\n1. Material Shortage\n2. Mechanical Failure\n3. Tooling Issue\n4. Changeover\n5. Quality Hold');
                if (reason) {
                  setStatus('DOWN');
                  logEvent({ type: AUDIT_EVENTS.QUALITY_FAIL, workstation: 'WS-01', workOrder: currentWorkOrder, details: { event: 'DOWNTIME_TRIGGERED', reason } });
                }
              } else {
                setStatus(newStatus);
              }
            }}
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', padding: '0 12px', outline: 'none', height: '40px', fontSize: '0.8rem' }}
          >
            {Object.keys(STATUS_CONFIG).map(k => <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(300px, 400px)', gap: '30px', minHeight: 0 }}>
        {/* Main Work Area */}
        <div className="glass-panel" style={{ borderRadius: '32px', padding: '40px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          {/* Progress Indicator */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: `${((currentStepIndex + 1) / steps.length) * 100}%`, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', transition: 'width 0.3s ease' }} />

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            {selectedApp ? (
              <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                {appComponents.map((comp, idx) => (
                  <div key={comp.id || idx} style={{ width: '100%' }}>
                    {comp.type === 'TEXT' && (
                      <div style={{ fontSize: comp.props.fontSize || '1.2rem', color: comp.props.color }}>{comp.props.text}</div>
                    )}

                    {comp.type === 'QUALITY_PASS_FAIL' && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '20px' }}>{comp.props.label}</h3>
                        <div style={{ display: 'flex', gap: '20px' }}>
                          <button
                            onClick={() => {
                              setQualityData(prev => ({ ...prev, [comp.id]: 'PASS' }));
                              logEvent({ type: AUDIT_EVENTS.QUALITY_PASS, workstation: 'WS-01', workOrder: currentWorkOrder, details: { compId: comp.id, label: comp.props.label } });
                            }}
                            style={{
                              flex: 1, padding: '24px', borderRadius: '16px', border: 'none',
                              backgroundColor: qualityData[comp.id] === 'PASS' ? '#4CAF50' : 'rgba(76, 175, 80, 0.1)',
                              color: qualityData[comp.id] === 'PASS' ? '#fff' : '#4CAF50',
                              fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            PASS
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Defect Reason (Mandatory):');
                              if (reason) {
                                setQualityData(prev => ({ ...prev, [comp.id]: { result: 'FAIL', reason } }));
                                logEvent({ type: AUDIT_EVENTS.QUALITY_FAIL, workstation: 'WS-01', workOrder: currentWorkOrder, details: { compId: comp.id, label: comp.props.label, reason } });
                              }
                            }}
                            style={{
                              flex: 1, padding: '24px', borderRadius: '16px', border: 'none',
                              backgroundColor: qualityData[comp.id]?.result === 'FAIL' ? '#f44336' : 'rgba(244, 67, 54, 0.1)',
                              color: qualityData[comp.id]?.result === 'FAIL' ? '#fff' : '#f44336',
                              fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            FAIL {qualityData[comp.id]?.result === 'FAIL' && `(${qualityData[comp.id].reason})`}
                          </button>
                        </div>
                      </div>
                    )}

                    {comp.type === 'QUALITY_TOLERANCE' && (
                      <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h3 style={{ marginBottom: '20px' }}>{comp.props.label} (Target: {comp.props.min} - {comp.props.max} {comp.props.unit})</h3>
                        <input
                          type="number"
                          placeholder={`Enter ${comp.props.unit}...`}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const isOk = val >= comp.props.min && val <= comp.props.max;
                            setQualityData(prev => ({ ...prev, [comp.id]: { value: val, status: isOk ? 'PASS' : 'FAIL' } }));
                            if (!isOk) {
                              logEvent({ type: AUDIT_EVENTS.QUALITY_FAIL, workstation: 'WS-01', workOrder: currentWorkOrder, details: { compId: comp.id, label: comp.props.label, value: val, range: [comp.props.min, comp.props.max] } });
                            }
                          }}
                          style={{
                            width: '100%', padding: '20px', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.3)',
                            border: qualityData[comp.id] ? (qualityData[comp.id].status === 'PASS' ? '2px solid #4CAF50' : '2px solid #f44336') : '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '1.5rem', textAlign: 'center', outline: 'none'
                          }}
                        />
                        {qualityData[comp.id] && (
                          <div style={{ marginTop: '10px', color: qualityData[comp.id].status === 'PASS' ? '#4CAF50' : '#f44336', fontWeight: 'bold' }}>
                            {qualityData[comp.id].status === 'PASS' ? 'IN SPEC' : 'OUT OF SPEC'}
                          </div>
                        )}
                      </div>
                    )}

                    {comp.type === 'MACHINE_STATUS' && (
                      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.5)' }}>{comp.props.label}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: machineData[comp.props.topic] === 'RUNNING' ? '#22c55e' : '#ef4444' }} />
                          <span style={{ fontWeight: 'bold' }}>{machineData[comp.props.topic] || 'OFFLINE'}</span>
                        </div>
                      </div>
                    )}

                    {comp.type === 'VIDEO' && (
                      <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: '#000' }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <PlayCircle size={16} /> {comp.props.title || 'Instructional Video'}
                        </div>
                        <div style={{ position: 'relative', paddingTop: '56.25%' }}>
                          <iframe
                            src={comp.props.url?.includes('youtube.com') ? comp.props.url.replace('watch?v=', 'embed/') : comp.props.url}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                            allowFullScreen
                          />
                        </div>
                      </div>
                    )}

                    {comp.type === 'PDF' && (
                      <div style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ padding: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={16} /> {comp.props.title || 'Technical Document'}
                        </div>
                        <div style={{ height: '500px' }}>
                          <iframe
                            src={comp.props.url}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                          />
                        </div>
                      </div>
                    )}

                    {comp.type === 'BUTTON' && (
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                        <button
                          onClick={() => handleButtonAction(comp.props)}
                          style={{
                            padding: '24px 48px',
                            backgroundColor: comp.props.color || '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '24px',
                            fontSize: '1.4rem',
                            fontWeight: '900',
                            cursor: 'pointer',
                            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}
                          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                          onMouseDown={(e) => e.target.style.transform = 'translateY(0) scale(0.98)'}
                        >
                          {comp.props.label}
                        </button>
                      </div>
                    )}

                    {comp.type === 'QUANTITY_LOGGER' && (() => {
                      const target = comp.props.targetQty || 10;
                      const completed = quantityLog[comp.id]?.completed ?? 0;
                      const isComplete = completed >= target;
                      const adjustQty = (delta) => {
                        setQuantityLog(prev => {
                          const cur = prev[comp.id]?.completed ?? 0;
                          const next = Math.max(0, Math.min(target, cur + delta));
                          logEvent({ type: AUDIT_EVENTS.CYCLE_START, workstation: 'WS-01', workOrder: currentWorkOrder, details: { compId: comp.id, label: comp.props.label, action: 'QTY_ADJUST', delta, newValue: next } });
                          return { ...prev, [comp.id]: { completed: next, target } };
                        });
                      };
                      const addAll = () => {
                        setQuantityLog(prev => ({ ...prev, [comp.id]: { completed: target, target } }));
                        logEvent({ type: AUDIT_EVENTS.CYCLE_START, workstation: 'WS-01', workOrder: currentWorkOrder, details: { compId: comp.id, label: comp.props.label, action: 'QTY_ADD_ALL', newValue: target } });
                      };
                      return (
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', padding: '30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {/* Label */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Hash size={18} color="#3b82f6" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{comp.props.label}</span>
                          </div>
                          {/* Buttons Row */}
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {[
                              { label: '-10', delta: -10, danger: true },
                              { label: '-1', delta: -1, danger: true },
                            ].map(({ label, delta }) => (
                              <button key={label} onClick={() => adjustQty(delta)} style={{
                                padding: '14px 22px', borderRadius: '14px', border: '1px solid rgba(239,68,68,0.35)',
                                backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                minWidth: '60px'
                              }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.08)'}>{label}</button>
                            ))}
                            <button onClick={addAll} style={{
                              padding: '14px 22px', borderRadius: '14px', border: '1px solid rgba(59,130,246,0.4)',
                              backgroundColor: 'rgba(59,130,246,0.12)', color: '#60a5fa',
                              fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s'
                            }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.25)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.12)'}>
                              + Add all
                            </button>
                            {[
                              { label: '+1', delta: 1 },
                              { label: '+10', delta: 10 },
                            ].map(({ label, delta }) => (
                              <button key={label} onClick={() => adjustQty(delta)} style={{
                                padding: '14px 22px', borderRadius: '14px', border: '1px solid rgba(34,197,94,0.35)',
                                backgroundColor: 'rgba(34,197,94,0.08)', color: '#22c55e',
                                fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
                                minWidth: '60px'
                              }} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(34,197,94,0.08)'}>{label}</button>
                            ))}
                          </div>
                          {/* KPI Tiles */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ padding: '24px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '18px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>QTY Required</div>
                              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', color: '#fff' }}>{target}</div>
                            </div>
                            <div style={{ padding: '24px', backgroundColor: isComplete ? 'rgba(34,197,94,0.1)' : 'rgba(59,130,246,0.08)', borderRadius: '18px', textAlign: 'center', border: `1px solid ${isComplete ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.2)'}`, transition: 'all 0.3s' }}>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>QTY Complete</div>
                              <div style={{ fontSize: '2.5rem', fontWeight: 900, fontStyle: 'italic', color: isComplete ? '#22c55e' : '#fff' }}>{completed}</div>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min((completed / target) * 100, 100)}%`, background: isComplete ? '#22c55e' : 'linear-gradient(90deg, #3b82f6, #60a5fa)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}

                <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
                  <button
                    onClick={handleNextStep}
                    className="btn"
                    style={{ flex: 1, padding: '24px', backgroundColor: '#3b82f6', color: 'white', fontSize: '1.5rem', fontWeight: '900', borderRadius: '24px' }}
                  >
                    COMPLETE SESSION
                  </button>
                  <button
                    onClick={handleAbort}
                    className="btn"
                    style={{ padding: '24px 30px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '24px' }}
                  >
                    <Square size={28} />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '1.2rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: '20px' }}>
                  STEP {currentStepIndex + 1} OF {steps.length}
                </div>
                <h2 style={{ fontSize: '3rem', fontWeight: 900, marginBottom: '20px', lineHeight: 1.1 }}>{activeStep?.title}</h2>
                <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', marginBottom: '60px' }}>
                  {activeStep?.description || "Follow the standard procedure defined for this step."}
                </p>

                <div style={{ fontSize: '8rem', fontWeight: '900', fontFamily: 'monospace', color: '#fff', textShadow: '0 0 40px rgba(59, 130, 246, 0.3)', marginBottom: '60px' }}>
                  {formatTime(timer)}
                </div>

                <div style={{ display: 'flex', gap: '20px' }}>
                  <button
                    onClick={handleNextStep}
                    className="btn"
                    style={{
                      padding: '24px 80px',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      fontSize: '1.8rem',
                      fontWeight: '900',
                      borderRadius: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)'
                    }}
                  >
                    {currentStepIndex === steps.length - 1 ? 'COMPLETE CYCLE' : 'NEXT STEP'}
                    <ChevronRight size={32} />
                  </button>

                  <button
                    onClick={handleAbort}
                    className="btn"
                    style={{
                      padding: '24px 30px',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      color: '#ef4444',
                      borderRadius: '24px'
                    }}
                    title="Abort Cycle"
                  >
                    <Square size={28} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sidebar / Instructions Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ borderRadius: '24px', padding: '24px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="#3b82f6" /> Sequence
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {steps.map((step, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  backgroundColor: idx === currentStepIndex ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.02)',
                  borderRadius: '16px',
                  border: idx === currentStepIndex ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  opacity: idx < currentStepIndex ? 0.4 : 1,
                  display: 'flex',
                  gap: '15px',
                  alignItems: 'center'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: idx === currentStepIndex ? '#3b82f6' : (idx < currentStepIndex ? '#22c55e' : 'rgba(255,255,255,0.1)'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: idx === currentStepIndex || idx < currentStepIndex ? '#fff' : 'rgba(255,255,255,0.3)'
                  }}>
                    {idx < currentStepIndex ? <CheckCircle2 size={16} /> : idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{step.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-panel" style={{ borderRadius: '24px', padding: '24px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(34, 197, 94, 0.1))' }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Workstation Insights</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Target Cycle Time:</span>
                <span style={{ fontWeight: 'bold' }}>{selectedManual.timeRequired || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Current Pace:</span>
                <span style={{ fontWeight: 'bold', color: '#22c55e' }}>ON TRACK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Signature Pad Overlay */}
      {showSignaturePad && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(10px)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '40px',
            borderRadius: '32px',
            textAlign: 'center',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <div style={{ color: '#3b82f6', marginBottom: '20px' }}>
              <CheckCircle2 size={64} className="mx-auto" />
            </div>
            <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '10px' }}>Governance Sign-off</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '30px' }}>
              Cycle completed in {formatTime(timer)}. Please provide your operator signature/ID to finalize.
            </p>

            <div style={{ textAlign: 'left', marginBottom: '30px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '10px' }}>
                Operator ID / Digital Signature
              </label>
              <input
                type="text"
                autoFocus
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Enter your ID or Name"
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '16px',
                  padding: '20px',
                  color: '#fff',
                  fontSize: '1.2rem',
                  outline: 'none',
                  textAlign: 'center'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                onClick={() => {
                  setShowSignaturePad(false);
                  startTimer();
                }}
                className="btn"
                style={{ flex: 1, padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '16px' }}
              >
                Back
              </button>
              <button
                onClick={handleFinalizeWithSignature}
                className="btn"
                style={{ flex: 2, padding: '15px', backgroundColor: '#3b82f6', fontWeight: 'bold', borderRadius: '16px' }}
              >
                Sign & Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveTerminal;
