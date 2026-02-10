import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Play, CheckCircle, ChevronRight, Trophy, Target, Clock, Zap } from 'lucide-react';
import { labChallenges } from '../../data/labChallenges';
import ModelBuilder from './ModelBuilder';

const MotionLaboratory = () => {
    const navigate = useNavigate();
    const [selectedChallenge, setSelectedChallenge] = useState(null);
    const [isLabActive, setIsLabActive] = useState(false);

    const handleStartChallenge = (challenge) => {
        setSelectedChallenge(challenge);
        setIsLabActive(true);
    };

    const handleCloseLab = () => {
        setIsLabActive(false);
        setSelectedChallenge(null);
    };

    const styles = {
        container: {
            height: '100%',
            backgroundColor: '#0f172a',
            color: 'white',
            padding: '2rem',
            overflowY: 'auto',
            fontFamily: 'Inter, sans-serif'
        },
        header: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '3rem'
        },
        title: {
            fontSize: '2.5rem',
            fontWeight: '800',
            background: 'linear-gradient(to right, #8b5cf6, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0
        },
        grid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
            gap: '2rem'
        },
        card: {
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '1.5rem',
            padding: '2rem',
            transition: 'all 0.3s ease',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden'
        },
        cardHover: {
            transform: 'translateY(-5px)',
            borderColor: '#8b5cf6',
            boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.4)'
        },
        badge: {
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.25rem 0.75rem',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            fontWeight: 'bold',
            backgroundColor: '#8b5cf6',
            color: 'white'
        },
        difficulty: (diff) => ({
            fontSize: '0.75rem',
            color: diff === 'Easy' ? '#4ade80' : diff === 'Medium' ? '#facc15' : '#f87171',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '0.5rem',
            display: 'block'
        }),
        cardTitle: {
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '1rem',
            margin: 0
        },
        cardDesc: {
            color: '#94a3b8',
            fontSize: '0.9rem',
            lineHeight: '1.5',
            marginBottom: '1.5rem'
        },
        stats: {
            display: 'flex',
            gap: '1.5rem',
            marginBottom: '1.5rem',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '1.5rem'
        },
        statItem: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#cbd5e1',
            fontSize: '0.8rem'
        },
        button: {
            width: '100%',
            padding: '1rem',
            borderRadius: '1rem',
            border: 'none',
            background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
            color: 'white',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'opacity 0.2s'
        }
    };

    if (isLabActive) {
        return (
            <ModelBuilder
                model={selectedChallenge.initialModel}
                videoSrc={selectedChallenge.videoSrc}
                isLaboratory={true}
                challenge={selectedChallenge}
                onClose={handleCloseLab}
            />
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.2)', borderRadius: '1rem' }}>
                    <FlaskConical size={40} color="#8b5cf6" />
                </div>
                <div>
                    <h1 style={styles.title}>Motion Laboratory</h1>
                    <p style={{ color: '#94a3b8', margin: 0 }}>Train your models, solve industrial missions, and master AI-IE.</p>
                </div>
            </div>

            <div style={styles.grid}>
                {labChallenges.map((challenge) => (
                    <div
                        key={challenge.id}
                        style={styles.card}
                        onMouseOver={(e) => {
                            Object.assign(e.currentTarget.style, styles.cardHover);
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => handleStartChallenge(challenge)}
                    >
                        <span style={styles.difficulty(challenge.difficulty)}>{challenge.difficulty}</span>
                        <h3 style={styles.cardTitle}>{challenge.name}</h3>
                        <p style={styles.cardDesc}>{challenge.description}</p>

                        <div style={styles.stats}>
                            <div style={styles.statItem}>
                                <Target size={14} color="#8b5cf6" />
                                <span>{challenge.tasks.length} Tasks</span>
                            </div>
                            <div style={styles.statItem}>
                                <Zap size={14} color="#facc15" />
                                <span>+50 XP</span>
                            </div>
                        </div>

                        <button style={styles.button}>
                            Start Mission <Play size={16} fill="white" />
                        </button>
                    </div>
                ))}

                {/* Coming Soon Card */}
                <div style={{ ...styles.card, borderStyle: 'dashed', opacity: 0.6 }}>
                    <h3 style={{ ...styles.cardTitle, color: '#64748b' }}>Coming Soon</h3>
                    <p style={styles.cardDesc}>Tantangan baru sedang dalam pengembangan oleh tim MAVi.</p>
                    <div style={{ height: '50px' }}></div>
                </div>
            </div>
        </div>
    );
};

export default MotionLaboratory;
