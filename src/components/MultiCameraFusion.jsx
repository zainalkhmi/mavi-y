import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getAllProjects } from '../utils/database';
import VideoPanel from './VideoPanel';
import { initializePoseDetector, detectPose } from '../utils/poseDetector';
import AngleCalculator from '../utils/angleCalculator';
import FusionCalculator from '../utils/fusionCalculator';
import RULACalculator from '../utils/rulaCalculator';
import REBACalculator from '../utils/rebaCalculator';
import PoseVisualizer from './features/PoseVisualizer';
import PoseVisualizer3D from './features/PoseVisualizer3D';

function MultiCameraFusion() {
    const [projects, setProjects] = useState([]);
    const [frontProjectId, setFrontProjectId] = useState(null);
    const [sideProjectId, setSideProjectId] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [status, setStatus] = useState('Initializing AI...');
    const [fusedScore, setFusedScore] = useState(null);
    const [analysisMode, setAnalysisMode] = useState('RULA'); // 'RULA' or 'REBA'

    // Playback State
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    // Refs
    const frontVideoRef = useRef(null);
    const sideVideoRef = useRef(null);
    const detectorRef = useRef(null);
    const animationFrameRef = useRef(null);
    const objectUrls = useRef([]);

    // Calculators
    const angleCalculator = useRef(new AngleCalculator());
    const fusionCalculator = useRef(new FusionCalculator());
    const rulaCalculator = useRef(new RULACalculator());
    const rebaCalculator = useRef(new REBACalculator());

    // Poses for visualization
    const [frontPose, setFrontPose] = useState(null);
    const [sidePose, setSidePose] = useState(null);

    useEffect(() => {
        loadProjects();
        initAI();
        return () => {
            objectUrls.current.forEach(url => URL.revokeObjectURL(url));
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const loadProjects = async () => {
        try {
            const allProjects = await getAllProjects();
            const mappedProjects = allProjects
                .filter(p => p.videoBlob || p.videoName)
                .map(p => {
                    let videoUrl = null;
                    if (p.videoBlob) {
                        videoUrl = URL.createObjectURL(p.videoBlob);
                        objectUrls.current.push(videoUrl);
                    }
                    return {
                        id: p.id,
                        videoName: p.videoName || p.projectName,
                        videoUrl: videoUrl,
                        measurements: p.measurements || []
                    };
                });
            setProjects(mappedProjects);
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    };

    const initAI = async () => {
        try {
            const detector = await initializePoseDetector();
            detectorRef.current = detector;
            setStatus('Ready');
        } catch (error) {
            console.error('AI Init Failed:', error);
            setStatus('AI Failed');
        }
    };

    const togglePlay = (playing) => {
        setIsPlaying(playing);
        if (frontVideoRef.current) playing ? frontVideoRef.current.play() : frontVideoRef.current.pause();
        if (sideVideoRef.current) playing ? sideVideoRef.current.play() : sideVideoRef.current.pause();
    };

    const handleSeek = (time) => {
        if (frontVideoRef.current) frontVideoRef.current.currentTime = time;
        if (sideVideoRef.current) sideVideoRef.current.currentTime = time;
    };

    // Analysis Loop
    const analyzeFrame = useCallback(async () => {
        if (!isAnalyzing || !detectorRef.current) return;

        // 1. Detect Front Pose
        let anglesFront = {};
        if (frontVideoRef.current && !frontVideoRef.current.paused) {
            const poses = await detectPose(frontVideoRef.current);
            if (poses && poses.length > 0) {
                setFrontPose(poses[0]);
                anglesFront = angleCalculator.current.calculateAllAngles(poses[0].keypoints);
            }
        }

        // 2. Detect Side Pose
        let anglesSide = {};
        if (sideVideoRef.current && !sideVideoRef.current.paused) {
            const poses = await detectPose(sideVideoRef.current);
            if (poses && poses.length > 0) {
                setSidePose(poses[0]);
                anglesSide = angleCalculator.current.calculateAllAngles(poses[0].keypoints);
            }
        }

        // 3. Fuse Angles
        const fusedAngles = fusionCalculator.current.fuseAngles(anglesFront, anglesSide);

        // 4. Calculate Score
        let result;
        if (analysisMode === 'RULA') {
            result = rulaCalculator.current.calculate(fusedAngles);
        } else {
            result = rebaCalculator.current.calculate(fusedAngles);
        }
        setFusedScore(result);

        animationFrameRef.current = requestAnimationFrame(analyzeFrame);
    }, [isAnalyzing, analysisMode]);

    useEffect(() => {
        if (isAnalyzing && isPlaying) {
            analyzeFrame();
        } else {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        }
    }, [isAnalyzing, isPlaying, analyzeFrame]);

    const frontProject = projects.find(p => p.id === frontProjectId);
    const sideProject = projects.find(p => p.id === sideProjectId);

    const getRiskColor = (level) => {
        if (!level) return '#888';
        if (level.includes('High')) return '#ff0000';
        if (level.includes('Medium')) return '#ff9900';
        return '#00ff00';
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '15px', padding: '20px', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>📹 Multi-Camera 3D Fusion</h2>
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#888' }}>
                        Synchronize Front & Side views for high-precision ergonomic analysis.
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                        value={analysisMode}
                        onChange={(e) => setAnalysisMode(e.target.value)}
                        style={{ padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}
                    >
                        <option value="RULA">RULA Analysis</option>
                        <option value="REBA">REBA Analysis</option>
                    </select>

                    <button
                        onClick={() => setIsAnalyzing(!isAnalyzing)}
                        disabled={status !== 'Ready' || !frontProject || !sideProject}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: isAnalyzing ? '#c50f1f' : '#0078d4',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            opacity: (status !== 'Ready' || !frontProject || !sideProject) ? 0.5 : 1
                        }}
                    >
                        {isAnalyzing ? '⏹ Stop Fusion' : '▶ Start 3D Fusion'}
                    </button>
                </div>
            </div>

            {/* Video Grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 300px', gap: '20px', minHeight: 0 }}>

                {/* Front View */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#4da6ff' }}>FRONT VIEW (X-Axis)</span>
                        <select
                            value={frontProjectId || ''}
                            onChange={(e) => setFrontProjectId(Number(e.target.value))}
                            style={{ padding: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', maxWidth: '200px' }}
                        >
                            <option value="">Select Front Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.videoName}</option>)}
                        </select>
                    </div>
                    <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '8px', overflow: 'auto', border: '2px solid #4da6ff', display: 'flex', flexDirection: 'column', minHeight: '400px', maxHeight: '600px' }}>
                        <VideoPanel
                            project={frontProject}
                            videoRef={frontVideoRef}
                            isPlaying={isPlaying}
                            playbackSpeed={playbackSpeed}
                            zoom={1}
                            onPlayPause={togglePlay}
                            onSpeedChange={setPlaybackSpeed}
                            onTimeUpdate={(t) => handleSeek(t)} // Sync seek
                        />
                        {isAnalyzing && frontPose && frontVideoRef.current && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <PoseVisualizer
                                    pose={frontPose}
                                    videoElement={frontVideoRef.current}
                                    riskScores={{}}
                                    width={frontVideoRef.current.clientWidth}
                                    height={frontVideoRef.current.clientHeight}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Side View */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: '#0a5' }}>SIDE VIEW (Z-Axis)</span>
                        <select
                            value={sideProjectId || ''}
                            onChange={(e) => setSideProjectId(Number(e.target.value))}
                            style={{ padding: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px', maxWidth: '200px' }}
                        >
                            <option value="">Select Side Project...</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.videoName}</option>)}
                        </select>
                    </div>
                    <div style={{ position: 'relative', backgroundColor: '#000', borderRadius: '8px', overflow: 'auto', border: '2px solid #0a5', display: 'flex', flexDirection: 'column', minHeight: '400px', maxHeight: '600px' }}>
                        <VideoPanel
                            project={sideProject}
                            videoRef={sideVideoRef}
                            isPlaying={isPlaying}
                            playbackSpeed={playbackSpeed}
                            zoom={1}
                            onPlayPause={togglePlay}
                            onSpeedChange={setPlaybackSpeed}
                            onTimeUpdate={(t) => { }} // Driven by front or sync
                        />
                        {isAnalyzing && sidePose && sideVideoRef.current && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                                <PoseVisualizer
                                    pose={sidePose}
                                    videoElement={sideVideoRef.current}
                                    riskScores={{}}
                                    width={sideVideoRef.current.clientWidth}
                                    height={sideVideoRef.current.clientHeight}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Analysis Panel */}
                <div style={{ backgroundColor: '#1e1e1e', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '15px', border: '1px solid #333' }}>
                    <h3 style={{ margin: 0, color: 'white', borderBottom: '1px solid #444', paddingBottom: '10px' }}>
                        📊 3D Analysis Results
                    </h3>

                    {fusedScore ? (
                        <>
                            <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#252526', borderRadius: '8px', border: `2px solid ${getRiskColor(fusedScore.riskLevel)}` }}>
                                <div style={{ color: '#888', fontSize: '0.9rem' }}>Final {analysisMode} Score</div>
                                <div style={{ fontSize: '4rem', fontWeight: 'bold', color: getRiskColor(fusedScore.riskLevel), lineHeight: 1 }}>
                                    {fusedScore.finalScore}
                                </div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white', marginTop: '5px' }}>
                                    {fusedScore.riskLevel}
                                </div>
                            </div>

                            <div style={{ height: '240px', position: 'relative', marginTop: '10px' }}>
                                <PoseVisualizer3D
                                    pose={frontPose || sidePose}
                                    riskScores={fusedScore.scores}
                                />
                                <div style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', color: '#8b5cf6' }}>
                                    3D RECONSTRUCTION
                                </div>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <h4 style={{ color: '#ccc', margin: '0 0 10px 0', fontSize: '0.9rem' }}>Fused Breakdown</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {Object.entries(fusedScore.scores).map(([part, score]) => (
                                        <div key={part} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', backgroundColor: '#333', borderRadius: '4px' }}>
                                            <span style={{ color: '#ccc', textTransform: 'capitalize' }}>{part.replace(/([A-Z])/g, ' $1').trim()}</span>
                                            <span style={{ fontWeight: 'bold', color: score > 2 ? '#ff9900' : '#0a5' }}>{score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', textAlign: 'center' }}>
                            Select projects and start analysis to see fused 3D results.
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

export default MultiCameraFusion;
