import React, { useState, useEffect, useRef, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';

import VideoWorkspace from './components/VideoWorkspace';
import Header from './components/Header';
import NewProjectDialog from './components/NewProjectDialog';
import OpenProjectDialog from './components/OpenProjectDialog';
import SaveAsDialog from './components/SaveAsDialog';
import YamazumiChart from './components/YamazumiChart';
import ValueStreamMap from './components/ValueStreamMap';
import RealtimeCompliance from './components/RealtimeCompliance';
import AdminPanel from './components/AdminPanel';
import FileExplorer from './components/FileExplorer';

import BroadcastControls from './components/features/BroadcastControls';
import BroadcastManager from './components/features/BroadcastManager';
import TourGuide from './components/features/TourGuide';
import LicenseGuard from './components/features/LicenseGuard';
import { saveProject, getProjectByName, updateProject } from './utils/database';
import { importProject } from './utils/projectExport';
import StreamHandler from './utils/streamHandler';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { initializePoseDetector } from './utils/poseDetector';
import { ProjectProvider, useProject } from './contexts/ProjectContext';
import { DialogProvider, useDialog } from './contexts/DialogContext';
import './index.css';

// Helps recover from transient/stale dynamic import failures
const lazyWithRetry = (importer, componentName = 'component', devImportPath = null) =>
  React.lazy(async () => {
    const storageKey = `lazy-retry-count-${componentName}`;
    const retryCount = Number(sessionStorage.getItem(storageKey) || '0');
    const maxReloadRetries = 3;

    try {
      const mod = await importer();
      sessionStorage.removeItem(storageKey);
      return mod;
    } catch (error) {
      // Typical error: "Failed to fetch dynamically imported module"
      const message = String(error?.message || error || '');
      const isDynamicImportFetchError =
        message.includes('Failed to fetch dynamically imported module') ||
        message.includes('Importing a module script failed');

      // In dev mode, try a direct cache-busted import before forcing full reload.
      if (import.meta.env.DEV && isDynamicImportFetchError && devImportPath) {
        try {
          const sep = devImportPath.includes('?') ? '&' : '?';
          const cacheBustedPath = `${devImportPath}${sep}t=${Date.now()}`;
          const mod = await import(/* @vite-ignore */ cacheBustedPath);
          sessionStorage.removeItem(storageKey);
          return mod;
        } catch {
          // Ignore and continue to one-time hard reload fallback below.
        }
      }

      if (isDynamicImportFetchError && retryCount < maxReloadRetries) {
        sessionStorage.setItem(storageKey, String(retryCount + 1));
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy load components
const AnalysisDashboard = React.lazy(() => import('./components/AnalysisDashboard'));
const ElementRearrangement = React.lazy(() => import('./components/ElementRearrangement'));
const CycleTimeAnalysis = React.lazy(() => import('./components/CycleTimeAnalysis'));
const CycleAggregation = React.lazy(() => import('./components/CycleAggregation'));
const StandardTime = React.lazy(() => import('./components/StandardTime'));
const WasteElimination = React.lazy(() => import('./components/WasteElimination'));
const BestWorstCycle = React.lazy(() => import('./components/BestWorstCycle'));
// VideoComparison is now merged into BestWorstCycle
const VideoComparison = BestWorstCycle;
const Help = React.lazy(() => import('./components/Help'));
const TherbligAnalysis = React.lazy(() => import('./components/TherbligAnalysis'));
const StandardWorkCombinationSheet = React.lazy(() => import('./components/StandardWorkCombinationSheet'));
const StatisticalAnalysis = React.lazy(() => import('./components/StatisticalAnalysis'));
const MTMCalculator = React.lazy(() => import('./components/MTMCalculator'));
const AllowanceCalculator = React.lazy(() => import('./components/AllowanceCalculator'));
const MultiAxialAnalysis = React.lazy(() => import('./components/MultiAxialAnalysis'));
const MultiCameraFusion = React.lazy(() => import('./components/MultiCameraFusion'));
const ManualCreation = lazyWithRetry(
  () => import('./components/ManualCreation'),
  'ManualCreation',
  '/src/components/ManualCreation.jsx'
);
const VRTrainingMode = React.lazy(() => import('./components/VRTrainingMode'));
const KnowledgeBase = React.lazy(() => import('./components/KnowledgeBase'));
const ObjectTracking = React.lazy(() => import('./components/ObjectTracking'));
const PredictiveMaintenance = React.lazy(() => import('./components/PredictiveMaintenance'));
const BroadcastViewer = React.lazy(() => import('./components/features/BroadcastViewer'));
const JitsiConference = React.lazy(() => import('./components/features/JitsiConference'));
const MachineLearningData = React.lazy(() => import('./components/MachineLearningData'));
const ActionRecognition = React.lazy(() => import('./components/ActionRecognition'));
const SpaghettiChart = React.lazy(() => import('./components/SpaghettiChart'));
const WorkflowGuide = React.lazy(() => import('./components/WorkflowGuide'));
const MaviClass = React.lazy(() => import('./components/MaviClass'));
const MotionLaboratory = React.lazy(() => import('./components/studio/MotionLaboratory'));
const PublicManualViewer = React.lazy(() => import('./components/PublicManualViewer'));
const SystemDiagnostics = React.lazy(() => import('./components/SystemDiagnostics'));
const AIProcessWorkspace = React.lazy(() => import('./components/AIProcessWorkspace'));
const StandardDataBuilder = React.lazy(() => import('./components/StandardDataBuilder'));
const ErgoCopilot = React.lazy(() => import('./components/ErgoCopilot'));
const FacilityLayoutOptimizer = React.lazy(() => import('./components/FacilityLayoutOptimizer'));

const StudioModel = React.lazy(() => import('./components/studio/StudioModel'));
const PitchDeck = React.lazy(() => import('./components/PitchDeck'));
const MainMenu = React.lazy(() => import('./components/MainMenu'));
// Loading component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    color: 'var(--text-secondary)',
    flexDirection: 'column',
    gap: '15px'
  }}>
    <div className="spinner" style={{
      width: '40px',
      height: '40px',
      border: '4px solid rgba(255,255,255,0.1)',
      borderLeftColor: 'var(--accent-blue)',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div >
    <div>Loading...</div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div >
);

function AppContent() {
  const { user, signOut } = useAuth();
  const isAuthenticated = !!user;
  const navigate = useNavigate();
  const location = useLocation();
  const { showAlert, showConfirm, showPrompt } = useDialog();

  const [selectedFeature, setSelectedFeature] = useState(null);

  const {
    currentProject,
    measurements,
    setMeasurements,
    videoSrc,
    setVideoSrc,
    videoName,
    setVideoName,
    openProject,
    newProject,
    closeProject,
    saveProjectAs,
    videoFile,
    setVideoFile
  } = useProject();

  // Broadcast state
  const [watchRoomId, setWatchRoomId] = useState(null);
  const videoRef = useRef(null);
  const [streamHandler] = useState(() => new StreamHandler());


  // Global broadcast/chat state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isWebcamOn, setIsWebcamOn] = useState(false);
  const [connectedPeers, setConnectedPeers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [broadcastMode, setBroadcastMode] = useState('jitsi');
  const broadcastManagerRef = useRef(null);

  const handleToggleWebcam = () => broadcastManagerRef.current?.toggleWebcam();
  const handleToggleRecording = () => {
    if (isRecording) broadcastManagerRef.current?.stopRecording();
    else broadcastManagerRef.current?.startRecording();
  };
  const handleTakeScreenshot = () => broadcastManagerRef.current?.takeScreenshot();

  // State for QR code manual viewing
  const [qrManualId, setQrManualId] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const watchId = params.get('watch');
    if (watchId) {
      setWatchRoomId(watchId);
    }

    const hash = window.location.hash;
    if (hash.startsWith('#/manual/')) {
      const manualPath = hash.substring(9);
      const [manualId] = manualPath.split('?');
      if (manualId) {
        setQrManualId(manualId);
        navigate('/knowledge-base');
      }
    }
  }, [navigate]);

  // State for project dialogs
  const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
  const [showOpenProjectDialog, setShowOpenProjectDialog] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const startupInitializedRef = useRef(false);

  // Pre-load pose detector in background after startup
  useEffect(() => {
    // Guard against React StrictMode double-invocation in development
    if (startupInitializedRef.current) return;
    startupInitializedRef.current = true;

    const timer = setTimeout(() => {
      // Initialize Turso Client
      import('./utils/tursoClient').then(({ initTursoClient }) => {
        console.log('🔄 Auto-connecting to Turso...');
        initTursoClient()
          .then((client) => {
            if (client && client.isMock) {
              console.warn('⚠️ Turso auto-connected in offline/mock mode (data will not persist)');
            } else {
              console.log('✅ Turso auto-connected successfully');
            }
          })
          .catch(err => console.error('❌ Turso auto-connect failed:', err));
      }).catch(err => console.error('❌ Failed to load Turso client module:', err));

      initializePoseDetector()
        .then((detector) => {
          if (detector) {
            console.log('✅ Pose detector pre-loaded at app startup');
          } else {
            console.warn('⚠️ Pose detector preload skipped/unavailable');
          }
        })
        .catch(err => console.warn('Pose detector preload failed:', err));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = async () => {
    await signOut();
    closeProject();
    navigate('/');
  };

  const handleLoadVideoFromKB = (videoUrl, videoTitle) => {
    setVideoSrc(videoUrl);
    setVideoName(videoTitle || 'Knowledge Base Video');
    navigate('/');
  };

  const handleNewProject = async (projectName, videoFile, folderId = null) => {
    const success = await newProject(projectName, videoFile, folderId);
    if (success) {
      setShowNewProjectDialog(false);
    }
  };

  const handleOpenProject = async (projectName) => {
    const success = await openProject(projectName);
    if (success) {
      setShowOpenProjectDialog(false);
    }
  };

  const handleSaveProject = async () => {
    await saveProject();
  };

  const handleSaveProjectAs = async (newName) => {
    const success = await saveProjectAs(newName);
    if (success) {
      setShowSaveAsDialog(false);
    }
  };

  const handleExportProject = async () => {
    if (!currentProject) {
      await showAlert('Export', 'Tidak ada proyek yang aktif');
      return;
    }

    try {
      const { getProjectByName } = await import('./utils/database');
      const project = await getProjectByName(currentProject.projectName);
      const { exportProject } = await import('./utils/projectExport');
      await exportProject(project);
    } catch (error) {
      console.error('Error exporting project:', error);
      await showAlert('Export Error', 'Gagal export proyek: ' + error.message);
    }
  };

  const handleImportProject = async (zipFile) => {
    try {
      const projectData = await importProject(zipFile);
      const { getProjectByName } = await import('./utils/database');
      const existing = await getProjectByName(projectData.projectName);
      if (existing) {
        const newName = await showPrompt('Proyek sudah ada', 'Masukkan nama baru:', projectData.projectName + ' (imported)');
        if (!newName) return;
        projectData.projectName = newName;
      }
      await saveProject(
        projectData.projectName,
        projectData.videoBlob,
        projectData.videoName,
        projectData.measurements,
        projectData.swcsData,
        projectData.standardWorkLayoutData,
        null,
        projectData.facilityLayoutData
      );
      handleOpenProject(projectData.projectName);
    } catch (error) {
      console.error('Error importing project:', error);
      await showAlert('Import Error', 'Gagal import proyek: ' + error.message);
    }
  };

  // Auto-save logic moved to ProjectContext
  /*
  useEffect(() => {
    if (!currentProject) return;
    const saveTimer = setTimeout(async () => {
      try {
        await updateProject(currentProject.name, {
          measurements,
          lastModified: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error auto-saving project:', error);
      }
    }, 1000);
    return () => clearTimeout(saveTimer);
  }, [measurements, currentProject]);
  */



  const handleToggleMute = () => {
    if (broadcastManagerRef.current) {
      broadcastManagerRef.current.toggleMute();
    }
  };

  const handleSendMessage = (message) => {
    if (broadcastManagerRef.current) {
      broadcastManagerRef.current.sendChatMessage(message);
    }
  };

  const handleStopBroadcast = () => {
    if (broadcastManagerRef.current) {
      broadcastManagerRef.current.stopBroadcast();
    }
  };

  if (watchRoomId) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <BroadcastViewer roomId={watchRoomId} onClose={() => setWatchRoomId(null)} />
      </Suspense>
    );
  }

  if (qrManualId) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <PublicManualViewer
          manualId={qrManualId}
          onClose={() => setQrManualId(null)}
        />
      </Suspense>
    );
  }

  const isDashboard = location.pathname === '/';

  return (
    <LicenseGuard>
      <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Header
          videoName={videoName}
          onUpload={(file) => {
            const url = URL.createObjectURL(file);
            setVideoSrc(url);
            setVideoName(file.name);
          }}
          sidebarCollapsed={sidebarCollapsed}
        />

        <Suspense fallback={null}>
          <TourGuide />
        </Suspense>


        <BroadcastControls
          isBroadcasting={isBroadcasting}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
          onStopBroadcast={handleStopBroadcast}
          userName={user?.email || "Host"}
          isRecording={isRecording}
          onToggleRecording={handleToggleRecording}
          isWebcamOn={isWebcamOn}
          onToggleWebcam={handleToggleWebcam}
          onTakeScreenshot={handleTakeScreenshot}
          connectedPeers={connectedPeers}
        />

        <div style={{ display: 'none' }}>
          <Suspense fallback={null}>
            <BroadcastManager
              ref={broadcastManagerRef}
              onRemoteInteraction={() => { }}
              isBroadcasting={isBroadcasting}
              setIsBroadcasting={setIsBroadcasting}
              isMuted={isMuted}
              setIsMuted={setIsMuted}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              isRecording={isRecording}
              setIsRecording={setIsRecording}
              isWebcamOn={isWebcamOn}
              setIsWebcamOn={setIsWebcamOn}
              connectedPeers={connectedPeers}
              setConnectedPeers={setConnectedPeers}
            />
          </Suspense>
        </div>

        <button
          className="sidebar-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          style={{
            position: 'absolute',
            // Layout: [Header][MainContent]
            // Button is absolute.
            // If Header is left, button should be near it.
            // Let's set left: sidebarCollapsed ? '10px' : '80px' to be safe.
            left: sidebarCollapsed ? '15px' : '85px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '1.2rem',
            zIndex: 1001,
            transition: 'left 0.3s ease',
            boxShadow: '2px 0 8px rgba(0,0,0,0.3)'
          }}
          title={sidebarCollapsed ? 'Show Menu' : 'Hide Menu'}
        >
          {sidebarCollapsed ? '▶' : '◀'}
        </button>

        <div className="main-content" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Persistent VideoWorkspace - hidden when not on dashboard */}
          <div
            className="workspace-area"
            style={{
              flex: 1,
              display: isDashboard ? 'flex' : 'none',
              flexDirection: 'column',
              padding: '10px',
              gap: '10px'
            }}
          >
            <VideoWorkspace
              measurements={measurements}
              onUpdateMeasurements={setMeasurements}
              videoSrc={videoSrc}
              onVideoChange={setVideoSrc}
              videoName={videoName}
              onVideoNameChange={setVideoName}
              videoFile={videoFile}
              onVideoFileChange={setVideoFile}
              currentProject={currentProject}
              onNewProject={() => setShowNewProjectDialog(true)}
              onOpenProject={() => setShowOpenProjectDialog(true)}
              onSaveProject={handleSaveProject}
              onSaveProjectAs={() => setShowSaveAsDialog(true)}
              onExportProject={handleExportProject}
              onImportProject={handleImportProject}
              onLogout={handleLogout}
            />
          </div>

          {/* Other Views Rendered via Routes with Lazy Loading */}
          <div style={{ flex: 1, display: isDashboard ? 'none' : 'block', overflow: 'hidden' }}>
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={null} /> {/* Handled by persistent div */}
                <Route path="/analysis" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><AnalysisDashboard measurements={measurements} onUpdateMeasurements={setMeasurements} /></div>} />
                <Route path="/rearrangement" element={<div style={{ padding: '10px', overflow: 'hidden', height: '100%' }}><ElementRearrangement measurements={measurements} onUpdateMeasurements={setMeasurements} videoSrc={videoSrc} /></div>} />
                <Route path="/cycle-analysis" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><CycleTimeAnalysis /></div>} />
                <Route path="/swcs" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><StandardWorkCombinationSheet currentProject={currentProject} /></div>} />
                <Route path="/aggregation" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><CycleAggregation measurements={measurements} /></div>} />
                <Route path="/standard-time" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><StandardTime measurements={measurements} /></div>} />
                <Route path="/waste-elimination" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><WasteElimination measurements={measurements} onUpdateMeasurements={setMeasurements} /></div>} />
                <Route path="/therblig" element={<div style={{ overflow: 'hidden', height: '100%' }}><TherbligAnalysis measurements={measurements} /></div>} />
                <Route path="/statistical-analysis" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><StatisticalAnalysis measurements={measurements} /></div>} />
                <Route path="/mtm" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><MTMCalculator /></div>} />
                <Route path="/allowance" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><AllowanceCalculator /></div>} />
                <Route path="/best-worst" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><BestWorstCycle measurements={measurements} /></div>} />
                <Route path="/yamazumi" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><YamazumiChart measurements={measurements} /></div>} />
                <Route path="/multi-axial" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><MultiAxialAnalysis /></div>} />
                <Route path="/pmts-builder" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><StandardDataBuilder /></div>} />
                <Route path="/manual-creation" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><ManualCreation /></div>} />
                <Route path="/spaghetti-chart" element={<div style={{ overflow: 'hidden', height: '100%' }}><SpaghettiChart currentProject={currentProject} projectMeasurements={measurements} /></div>} />
                <Route path="/ml-data" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><MachineLearningData videoSrc={videoSrc} videoFile={videoFile} measurements={measurements} onUpdateMeasurements={setMeasurements} /></div>} />
                <Route path="/object-tracking" element={<div style={{ overflow: 'hidden', height: '100%' }}><ObjectTracking videoSrc={videoSrc} measurements={measurements} onUpdateMeasurements={setMeasurements} /></div>} />
                <Route path="/predictive-maintenance" element={<div style={{ overflow: 'hidden', height: '100%' }}><PredictiveMaintenance measurements={measurements} /></div>} />
                <Route path="/comparison" element={<div style={{ padding: '10px', overflow: 'hidden', height: '100%' }}><BestWorstCycle measurements={measurements} /></div>} />
                <Route path="/mavi-class" element={<div style={{ overflow: 'hidden', height: '100%' }}><MaviClass /></div>} />
                <Route path="/motion-laboratory" element={<div style={{ overflow: 'hidden', height: '100%' }}><MotionLaboratory /></div>} />
                <Route path="/multi-camera" element={<div style={{ overflow: 'hidden', height: '100%' }}><MultiCameraFusion /></div>} />
                <Route path="/vr-training" element={<div style={{ overflow: 'hidden', height: '100%' }}><VRTrainingMode measurements={measurements} videoSrc={videoSrc} videoName={videoName} currentProject={currentProject} /></div>} />
                <Route path="/knowledge-base" element={<div style={{ overflow: 'hidden', height: '100%' }}><KnowledgeBase onLoadVideo={handleLoadVideoFromKB} /></div>} />
                <Route path="/broadcast" element={
                  <div style={{
                    padding: '10px',
                    paddingLeft: isBroadcasting && broadcastMode === 'legacy' ? '420px' : '10px',
                    overflowY: broadcastMode === 'jitsi' ? 'hidden' : 'auto',
                    height: '100%',
                    transition: 'padding-left 0.3s ease'
                  }}>
                    <div style={{
                      width: '100%',
                      maxWidth: broadcastMode === 'jitsi' ? 'none' : '600px',
                      margin: isBroadcasting ? '0' : '0 auto',
                      height: broadcastMode === 'jitsi' ? '100%' : 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: 0
                    }}>
                      <h2 style={{ color: 'var(--text-primary)' }}>📡 Broadcast Video</h2>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        Pilih mode: Legacy Broadcast (PeerJS) atau Jitsi Video Conference (meeting + screen share).
                      </p>

                      <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setBroadcastMode('legacy')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: broadcastMode === 'legacy' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Legacy Broadcast
                        </button>
                        <button
                          onClick={() => setBroadcastMode('jitsi')}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            background: broadcastMode === 'jitsi' ? 'var(--accent-blue)' : 'var(--bg-secondary)',
                            color: 'white',
                            cursor: 'pointer'
                          }}
                        >
                          Jitsi Conference
                        </button>
                      </div>

                      {broadcastMode === 'legacy' ? (
                        <>
                          {/* UI Portal for BroadcastManager */}
                          <div id="broadcast-manager-ui-portal"></div>
                          {!isBroadcasting && (
                            <div style={{
                              padding: '20px',
                              backgroundColor: 'var(--bg-secondary)',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              textAlign: 'center'
                            }}>
                              <p>Broadcast is not active.</p>
                              <button
                                onClick={() => broadcastManagerRef.current?.startBroadcast()}
                                style={{
                                  padding: '10px 20px',
                                  backgroundColor: 'var(--accent-blue)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                Start New Broadcast
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <div style={{ flex: 1, minHeight: 0 }}>
                          <JitsiConference />
                        </div>
                      )}
                    </div>
                  </div >
                } />
                <Route path="/action-recognition" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><ActionRecognition videoSrc={videoSrc} onActionsDetected={setMeasurements} /></div>} />

                <Route path="/value-stream-map" element={<div style={{ overflow: 'hidden', height: '100%' }}><ValueStreamMap /></div>} />


                {/* Workflow Guide */}
                <Route path="/workflow-guide" element={<div style={{ overflow: 'hidden', height: '100%' }}><WorkflowGuide /></div>} />

                {/* File Explorer */}
                <Route path="/files" element={<div style={{ overflow: 'hidden', height: '100%' }}><FileExplorer /></div>} />

                {/* AI Process Studio */}
                <Route path="/ai-process" element={<AIProcessWorkspace measurements={measurements} onUpdateMeasurements={setMeasurements} videoSrc={videoSrc} onVideoChange={setVideoSrc} videoName={videoName} onVideoNameChange={setVideoName} />} />


                {/* Real-time Compliance */}
                <Route path="/realtime-compliance" element={<RealtimeCompliance projectName={currentProject?.projectName} />} />

                {/* Ergo Copilot */}
                <Route path="/ergo-copilot" element={<div style={{ overflow: 'hidden', height: '100%' }}><ErgoCopilot /></div>} />

                {/* Facility Layout Optimizer */}
                <Route path="/facility-layout" element={<div style={{ overflow: 'hidden', height: '100%' }}><FacilityLayoutOptimizer /></div>} />

                {/* Admin Panel */}
                <Route path="/admin" element={<div style={{ overflow: 'hidden', height: '100%' }}><AdminPanel /></div>} />

                {/* System Diagnostics */}
                <Route path="/diagnostics" element={<div style={{ overflow: 'hidden', height: '100%' }}><SystemDiagnostics /></div>} />

                {/* Studio Model */}
                <Route path="/studio-model" element={<div style={{ overflow: 'hidden', height: '100%' }}><StudioModel /></div>} />

                {/* Teachable Machine Studio */}
                <Route path="/teachable-machine" element={<div style={{ padding: '10px', overflowY: 'auto', height: '100%' }}><MachineLearningData videoSrc={videoSrc} videoFile={videoFile} measurements={measurements} onUpdateMeasurements={setMeasurements} /></div>} />

                {/* Pitch Deck */}
                <Route path="/pitch-deck" element={<PitchDeck onClose={() => navigate('/')} />} />

                {/* Main Menu */}
                <Route path="/menu" element={<div style={{ overflow: 'hidden', height: '100%' }}><MainMenu /></div>} />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </div>
        </div>

        <NewProjectDialog
          isOpen={showNewProjectDialog}
          onClose={() => setShowNewProjectDialog(false)}
          onSubmit={handleNewProject}
        />

        <OpenProjectDialog
          isOpen={showOpenProjectDialog}
          onClose={() => setShowOpenProjectDialog(false)}
          onOpenProject={handleOpenProject}
          onImportProject={handleImportProject}
        />

        <SaveAsDialog
          isOpen={showSaveAsDialog}
          onClose={() => setShowSaveAsDialog(false)}
          onSave={handleSaveProjectAs}
          currentProjectName={currentProject?.projectName}
        />
      </div>
    </LicenseGuard >
  );
}

function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <DialogProvider>
            <ProjectProvider>
              <AppContent />
            </ProjectProvider>
          </DialogProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </AuthProvider>
  );
}

export default App;

