import React, { useState, useEffect } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    Target,
    Trophy,
    Cpu,
    Video,
    BarChart3,
    ShieldCheck,
    Zap,
    Users,
    ArrowRight,
    Monitor,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';

const Slide = ({ children, active }) => (
    <div
        style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: active ? 1 : 0,
            transform: `translateX(${active ? 0 : '50px'})`,
            transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
            pointerEvents: active ? 'all' : 'none',
            padding: '40px',
            textAlign: 'center'
        }}
    >
        {children}
    </div>
);

const PitchDeck = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 'title',
            content: (
                <div className="glass-card" style={{ padding: '60px', borderRadius: '32px' }}>
                    <div style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'inline-block', marginBottom: '30px' }}>
                        <Cpu size={64} color="var(--accent-blue)" />
                    </div>
                    <h1 style={{ fontSize: '4rem', fontWeight: '800', marginBottom: '20px', background: 'linear-gradient(to right, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        MAVi
                    </h1>
                    <h2 style={{ fontSize: '1.8rem', color: 'var(--text-secondary)', fontWeight: '400', letterSpacing: '4px' }}>
                        THE FUTURE OF INDUSTRIAL MOTION ANALYSIS
                    </h2>
                    <p style={{ marginTop: '40px', fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '40px auto' }}>
                        Empowering Industrial Engineers with AI-driven insights to revolutionize productivity and compliance.
                    </p>
                </div>
            )
        },
        {
            id: 'problem',
            content: (
                <div style={{ maxWidth: '900px' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>The Problem</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '30px' }}>
                        <div className="glass-card" style={{ padding: '30px' }}>
                            <AlertTriangle size={48} color="var(--accent-red)" style={{ marginBottom: '20px' }} />
                            <h3>Manual & Slow</h3>
                            <p>Stopwatch-based analysis takes days. IE hours are wasted on data entry.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '30px' }}>
                            <Users size={48} color="var(--accent-yellow)" style={{ marginBottom: '20px' }} />
                            <h3>Inconsistent</h3>
                            <p>Human bias leads to up to 20% variance in motion study measurements.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '30px' }}>
                            <ShieldCheck size={48} color="var(--border-color)" style={{ marginBottom: '20px' }} />
                            <h3>No Real-Time</h3>
                            <p>Compliance issues are found "after the fact", causing scrap and re-work.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'solution',
            content: (
                <div style={{ maxWidth: '900px' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>The Solution: AI Orchestration</h2>
                    <div className="glass-card" style={{ padding: '40px', display: 'flex', gap: '40px', alignItems: 'center' }}>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <div style={{ marginBottom: '20px' }}>
                                <CheckCircle2 color="#10b981" size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                <span style={{ fontSize: '1.2rem' }}>Automatic Element Recognition</span>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <CheckCircle2 color="#10b981" size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                <span style={{ fontSize: '1.2rem' }}>Web-Based Real-Time Processing</span>
                            </div>
                            <div style={{ marginBottom: '20px' }}>
                                <CheckCircle2 color="#10b981" size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} />
                                <span style={{ fontSize: '1.2rem' }}>Integrated Industrial Tools (Yamazumi, VSM)</span>
                            </div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <Monitor size={200} color="var(--accent-blue)" style={{ opacity: 0.8 }} />
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'market',
            content: (
                <div style={{ maxWidth: '900px' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>Market Target</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div className="glass-card" style={{ padding: '40px', textAlign: 'left' }}>
                            <Target size={40} color="var(--accent-blue)" style={{ marginBottom: '20px' }} />
                            <h3>Manufacturing Leaders</h3>
                            <p>Fortune 500 Automotive, Electronics, and FMCG companies seeking digital transformation.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '40px', textAlign: 'left' }}>
                            <Zap size={40} color="var(--accent-yellow)" style={{ marginBottom: '20px' }} />
                            <h3>IE & Lean Consultants</h3>
                            <p>Specialists who need professional-grade tools to deliver results faster to their clients.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'competition',
            content: (
                <div style={{ maxWidth: '1000px', width: '100%' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>MAVi vs. OTRS10</h2>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 10px' }}>
                        <thead>
                            <tr style={{ color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '20px', textAlign: 'left' }}>Feature</th>
                                <th style={{ padding: '20px' }}>OTRS10 (Traditional)</th>
                                <th style={{ padding: '20px', color: 'var(--accent-blue)', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px 8px 0 0' }}>MAVi (AI-Native)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="glass-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '20px', textAlign: 'left', fontWeight: 'bold' }}>Data Collection</td>
                                <td style={{ padding: '20px' }}>Manual Clicks</td>
                                <td style={{ padding: '20px', color: '#10b981' }}>Automatic AI Detection</td>
                            </tr>
                            <tr className="glass-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '20px', textAlign: 'left', fontWeight: 'bold' }}>Analysis Type</td>
                                <td style={{ padding: '20px' }}>Post-Event Only</td>
                                <td style={{ padding: '20px', color: '#10b981' }}>Real-Time Compliance</td>
                            </tr>
                            <tr className="glass-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '20px', textAlign: 'left', fontWeight: 'bold' }}>Accessibility</td>
                                <td style={{ padding: '20px' }}>Desktop Install</td>
                                <td style={{ padding: '20px', color: '#10b981' }}>Cloud/Web-Native</td>
                            </tr>
                            <tr className="glass-card" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '20px', textAlign: 'left', fontWeight: 'bold' }}>Collaboration</td>
                                <td style={{ padding: '20px' }}>Flash Drive/Email</td>
                                <td style={{ padding: '20px', color: '#10b981' }}>Live Broadcast & Sync</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )
        },
        {
            id: 'tech-stack',
            content: (
                <div style={{ maxWidth: '1000px', width: '100%' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>Technology Stack</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <Cpu size={32} color="var(--accent-blue)" style={{ marginBottom: '10px' }} />
                            <h4 style={{ margin: '0 0 10px 0' }}>Frontend</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>React 19, Vite, TailwindCSS</p>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <Zap size={32} color="var(--accent-yellow)" style={{ marginBottom: '10px' }} />
                            <h4 style={{ margin: '0 0 10px 0' }}>AI Runtime</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>TensorFlow.js, MediaPipe</p>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <ShieldCheck size={32} color="#10b981" style={{ marginBottom: '10px' }} />
                            <h4 style={{ margin: '0 0 10px 0' }}>Backend</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Supabase (Auth & DB)</p>
                        </div>
                        <div className="glass-card" style={{ padding: '20px' }}>
                            <Users size={32} color="var(--accent-blue)" style={{ marginBottom: '10px' }} />
                            <h4 style={{ margin: '0 0 10px 0' }}>Real-time</h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>PeerJS, WebRTC Sync</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'core-algorithms',
            content: (
                <div style={{ maxWidth: '1000px', width: '100%' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>Core AI Algorithms</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left' }}>
                        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.2)', padding: '15px', borderRadius: '12px' }}>
                                <Target size={30} color="var(--accent-blue)" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>MediaPipe BlazePose 3D</h4>
                                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>High-fidelity human pose estimation with 33 landmarks for precise motion capture.</p>
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: 'rgba(234, 179, 8, 0.2)', padding: '15px', borderRadius: '12px' }}>
                                <Cpu size={30} color="var(--accent-yellow)" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>Rule-based Finite State Machine (FSM)</h4>
                                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Orchestrating industrial logic to verify SOP compliance in real-time.</p>
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.2)', padding: '15px', borderRadius: '12px' }}>
                                <BarChart3 size={30} color="#10b981" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>Temporal Action Recognition</h4>
                                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Analyzing patterns over time to classify work elements like "Assemble", "Pick", or "Walk".</p>
                            </div>
                        </div>
                        <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                            <div style={{ background: 'rgba(239, 68, 68, 0.2)', padding: '15px', borderRadius: '12px' }}>
                                <ShieldCheck size={30} color="var(--accent-red)" />
                            </div>
                            <div>
                                <h4 style={{ margin: 0 }}>Heuristic Ergonomics Analysis</h4>
                                <p style={{ margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>Euclidean distance and angular analysis for REBA/RULA ergonomics assessment.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'features1',
            content: (
                <div style={{ maxWidth: '1000px' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>Core Capabilities</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                        <div className="glass-card" style={{ padding: '30px', textAlign: 'left' }}>
                            <Video size={32} color="var(--accent-blue)" style={{ marginBottom: '15px' }} />
                            <h4>Video AI Comparison</h4>
                            <p>Side-by-side analysis with skeleton tracking to pinpoint precise variations between cycles.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '30px', textAlign: 'left' }}>
                            <Cpu size={32} color="var(--accent-blue)" style={{ marginBottom: '15px' }} />
                            <h4>Studio Model (FSM)</h4>
                            <p>Define complex work rules using a State Machine. Turn visual movement into logic.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '30px', textAlign: 'left' }}>
                            <ShieldCheck size={32} color="var(--accent-blue)" style={{ marginBottom: '15px' }} />
                            <h4>Real-Time Compliance</h4>
                            <p>Instant visual cues for operators when a process deviation is detected.</p>
                        </div>
                        <div className="glass-card" style={{ padding: '30px', textAlign: 'left' }}>
                            <BarChart3 size={32} color="var(--accent-blue)" style={{ marginBottom: '15px' }} />
                            <h4>Professional Charts</h4>
                            <p>One-click Yamazumi, Spaghetti, and Value Stream Maps derived directly from AI data.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'ergo-copilot',
            content: (
                <div style={{ maxWidth: '1000px' }}>
                    <h2 style={{ fontSize: '3rem', marginBottom: '40px' }}>AI Ergo Copilot</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', alignItems: 'center' }}>
                        <div className="glass-card" style={{ padding: '40px', textAlign: 'left' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
                                <ShieldCheck size={48} color="#10b981" />
                                <h3 style={{ fontSize: '2rem', margin: 0 }}>Advanced 3D Biomechanics</h3>
                            </div>
                            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: '1.6', marginBottom: '25px' }}>
                                Real-time RULA, REBA, and NIOSH Lifting Equation assessments powered by 3D pose projection.
                            </p>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={18} color="#10b981" /> Automatic detection of high-risk intervals</li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={18} color="#10b981" /> Visual Health & Safety risk heatmaps</li>
                                <li style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><CheckCircle2 size={18} color="#10b981" /> NIOSH Lifting Index & Snook Table integration</li>
                            </ul>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #ef4444' }}>
                                <AlertTriangle size={24} color="#ef4444" style={{ marginBottom: '8px' }} />
                                <h4 style={{ margin: 0 }}>Prevent MSDs</h4>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>Identify cumulative trauma risks before injuries happen.</p>
                            </div>
                            <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
                                <Zap size={24} color="#10b981" style={{ marginBottom: '8px' }} />
                                <h4 style={{ margin: 0 }}>Automated Reporting</h4>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', color: '#94a3b8' }}>Zero-click ergonomic compliance certificates.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'cta',
            content: (
                <div className="glass-card" style={{ padding: '80px', borderRadius: '40px', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 30, 30, 0.5) 100%)' }}>
                    <Trophy size={80} color="var(--accent-yellow)" style={{ marginBottom: '30px' }} />
                    <h2 style={{ fontSize: '3.5rem', marginBottom: '20px' }}>Start Optimizing Today</h2>
                    <p style={{ fontSize: '1.4rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
                        Join the new era of Lean Manufacturing with MAVi.
                    </p>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            padding: '15px 40px',
                            fontSize: '1.2rem',
                            borderRadius: '12px',
                            backgroundColor: 'var(--accent-blue)',
                            borderColor: 'transparent',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontWeight: '600'
                        }}
                    >
                        Enter Workspace <ArrowRight size={20} />
                    </button>
                </div>
            )
        }
    ];

    const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
    const prevSlide = () => setCurrentSlide((prev) => Math.max(0, prev - 1));

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'var(--bg-primary)',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05) 0%, rgba(0, 0, 0, 0) 100%)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            color: 'var(--text-primary)'
        }}>
            <style>{`
        .glass-card {
          background: rgba(45, 45, 45, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        
        .nav-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: white;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .nav-btn:hover {
          background: rgba(59, 130, 246, 0.2);
          transform: scale(1.1);
        }
        
        .nav-btn:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          margin: 0 5px;
          transition: all 0.3s;
        }

        .dot.active {
          background: var(--accent-blue);
          transform: scale(1.5);
          box-shadow: 0 0 10px var(--accent-blue);
        }
      `}</style>

            {/* Close button */}
            <button
                onClick={onClose}
                style={{
                    position: 'absolute',
                    top: '30px',
                    right: '30px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    zIndex: 10001
                }}
            >
                Skip Presentation
            </button>

            {/* Main Container */}
            <div style={{ flex: 1, position: 'relative' }}>
                {slides.map((slide, index) => (
                    <Slide key={slide.id} active={index === currentSlide}>
                        {slide.content}
                    </Slide>
                ))}
            </div>

            {/* Controls */}
            <div style={{
                padding: '40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10001
            }}>
                <button className="nav-btn" onClick={prevSlide} disabled={currentSlide === 0}>
                    <ChevronLeft />
                </button>

                <div style={{ display: 'flex' }}>
                    {slides.map((_, index) => (
                        <div key={index} className={`dot ${index === currentSlide ? 'active' : ''}`} />
                    ))}
                </div>

                <button className="nav-btn" onClick={nextSlide} disabled={currentSlide === slides.length - 1}>
                    <ChevronRight />
                </button>
            </div>
        </div>
    );
};

export default PitchDeck;
