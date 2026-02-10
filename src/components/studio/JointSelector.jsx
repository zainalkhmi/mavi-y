import React from 'react';
import { X } from 'lucide-react';

const JointSelector = ({ onSelect, onClose, selectedJoint }) => {
    // MediaPipe / BlazePose 33 keypoints mapping
    const JOINTS = [
        // Face
        { id: 'nose', x: 200, y: 50, label: 'Nose' },
        { id: 'left_eye_inner', x: 190, y: 40, label: 'L Eye Inner' },
        { id: 'left_eye', x: 180, y: 40, label: 'L Eye' },
        { id: 'left_eye_outer', x: 170, y: 40, label: 'L Eye Outer' },
        { id: 'right_eye_inner', x: 210, y: 40, label: 'R Eye Inner' },
        { id: 'right_eye', x: 220, y: 40, label: 'R Eye' },
        { id: 'right_eye_outer', x: 230, y: 40, label: 'R Eye Outer' },
        { id: 'left_ear', x: 165, y: 55, label: 'L Ear' },
        { id: 'right_ear', x: 235, y: 55, label: 'R Ear' },
        { id: 'mouth_left', x: 190, y: 65, label: 'Mouth L' },
        { id: 'mouth_right', x: 210, y: 65, label: 'Mouth R' },

        // Body
        { id: 'left_shoulder', x: 140, y: 110, label: 'L Shoulder' },
        { id: 'right_shoulder', x: 260, y: 110, label: 'R Shoulder' },
        { id: 'left_elbow', x: 110, y: 190, label: 'L Elbow' },
        { id: 'right_elbow', x: 290, y: 190, label: 'R Elbow' },
        { id: 'left_wrist', x: 90, y: 270, label: 'L Wrist' },
        { id: 'right_wrist', x: 310, y: 270, label: 'R Wrist' },

        // Hands Detail
        { id: 'left_pinky', x: 75, y: 295, label: 'L Pinky' },
        { id: 'right_pinky', x: 325, y: 295, label: 'R Pinky' },
        { id: 'left_index', x: 85, y: 305, label: 'L Index' },
        { id: 'right_index', x: 315, y: 305, label: 'R Index' },
        { id: 'left_thumb', x: 100, y: 300, label: 'L Thumb' },
        { id: 'right_thumb', x: 300, y: 300, label: 'R Thumb' },

        // Lower Body
        { id: 'left_hip', x: 170, y: 260, label: 'L Hip' },
        { id: 'right_hip', x: 230, y: 260, label: 'R Hip' },
        { id: 'left_knee', x: 165, y: 370, label: 'L Knee' },
        { id: 'right_knee', x: 235, y: 370, label: 'R Knee' },
        { id: 'left_ankle', x: 165, y: 470, label: 'L Ankle' },
        { id: 'right_ankle', x: 235, y: 470, label: 'R Ankle' },

        // Feet Detail
        { id: 'left_heel', x: 175, y: 490, label: 'L Heel' },
        { id: 'right_heel', x: 225, y: 490, label: 'R Heel' },
        { id: 'left_foot_index', x: 150, y: 495, label: 'L Foot Index' },
        { id: 'right_foot_index', x: 250, y: 495, label: 'R Foot Index' },
    ];

    const CONNECTIONS = [
        ['left_eye', 'left_eye_inner'], ['left_eye', 'left_eye_outer'], ['left_eye_outer', 'left_ear'],
        ['right_eye', 'right_eye_inner'], ['right_eye', 'right_eye_outer'], ['right_eye_outer', 'right_ear'],
        ['mouth_left', 'mouth_right'],
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
        ['left_wrist', 'left_pinky'], ['left_wrist', 'left_index'], ['left_wrist', 'left_thumb'],
        ['right_wrist', 'right_pinky'], ['right_wrist', 'right_index'], ['right_wrist', 'right_thumb'],
        ['left_ankle', 'left_heel'], ['left_ankle', 'left_foot_index'], ['left_heel', 'left_foot_index'],
        ['right_ankle', 'right_heel'], ['right_ankle', 'right_foot_index'], ['right_heel', 'right_foot_index']
    ];

    const styles = {
        overlay: {
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)'
        },
        modal: {
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '24px',
            width: '500px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
        },
        title: {
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: 'white',
            margin: 0
        },
        closeBtn: {
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            padding: '4px'
        },
        svgScroll: {
            flex: 1,
            overflowY: 'auto',
            background: '#1f2937',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #374151',
            display: 'flex',
            justifyContent: 'center'
        },
        legend: {
            marginTop: '20px',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px'
        },
        jointLabel: {
            fontSize: '0.75rem',
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        }
    };

    return (
        <div style={styles.overlay} onClick={onClose}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
                <div style={styles.header}>
                    <div>
                        <h3 style={styles.title}>Visual Keypoint Selector</h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>All 33 points (BlazePose + Hands Detail)</p>
                    </div>
                    <button style={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div style={styles.svgScroll} className="custom-scrollbar">
                    <svg width="400" height="520" viewBox="0 0 400 520">
                        {/* Draw Connections */}
                        {CONNECTIONS.map(([startId, endId], idx) => {
                            const start = JOINTS.find(j => j.id === startId);
                            const end = JOINTS.find(j => j.id === endId);
                            if (!start || !end) return null;
                            return (
                                <line
                                    key={`conn-${idx}`}
                                    x1={start.x} y1={start.y}
                                    x2={end.x} y2={end.y}
                                    stroke="#374151"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                />
                            );
                        })}

                        {/* Draw Selected Highlight */}
                        {JOINTS.filter(j => j.id === selectedJoint).map(j => (
                            <circle
                                key={`highlight-${j.id}`}
                                cx={j.x} cy={j.y}
                                r="12"
                                fill="transparent"
                                stroke="#60a5fa"
                                strokeWidth="2"
                                strokeDasharray="4 2"
                            >
                                <animateTransform
                                    attributeName="transform"
                                    type="rotate"
                                    from={`0 ${j.x} ${j.y}`}
                                    to={`360 ${j.x} ${j.y}`}
                                    dur="4s"
                                    repeatCount="indefinite"
                                />
                            </circle>
                        ))}

                        {/* Draw Joints */}
                        {JOINTS.map((joint) => {
                            const isSelected = selectedJoint === joint.id;
                            const isHandOrFoot = ['pinky', 'index', 'thumb', 'heel', 'foot'].some(k => joint.id.includes(k));
                            const isFace = ['eye', 'ear', 'mouth'].some(k => joint.id.includes(k));

                            return (
                                <g
                                    key={joint.id}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onSelect(joint.id)}
                                >
                                    <circle
                                        cx={joint.x} cy={joint.y}
                                        r={isSelected ? "7" : (isFace || isHandOrFoot ? "4" : "6")}
                                        fill={isSelected ? "#2563eb" : (isFace || isHandOrFoot ? "#4b5563" : "#9ca3af")}
                                        stroke={isSelected ? "#60a5fa" : "transparent"}
                                        strokeWidth="2"
                                        style={{ transition: 'all 0.2s' }}
                                    />
                                    <title>{joint.label} ({joint.id})</title>

                                    {/* Interaction area */}
                                    <circle
                                        cx={joint.x} cy={joint.y}
                                        r="12"
                                        fill="transparent"
                                        onMouseOver={(e) => {
                                            const circle = e.currentTarget.previousSibling.previousSibling;
                                            if (!isSelected) circle.setAttribute('fill', '#60a5fa');
                                        }}
                                        onMouseOut={(e) => {
                                            const circle = e.currentTarget.previousSibling.previousSibling;
                                            if (!isSelected) {
                                                const originalFill = (isFace || isHandOrFoot ? "#4b5563" : "#9ca3af");
                                                circle.setAttribute('fill', originalFill);
                                            }
                                        }}
                                    />
                                </g>
                            );
                        })}
                    </svg>
                </div>

                <div style={styles.legend}>
                    <div style={styles.jointLabel}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
                        <span>Selected</span>
                    </div>
                    <div style={styles.jointLabel}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />
                        <span>Major Joint</span>
                    </div>
                    <div style={styles.jointLabel}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4b5563' }} />
                        <span>Detail Point (Facial/Hands)</span>
                    </div>
                </div>

                <p style={{ marginTop: '20px', fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                    Click points for precise Pose Logic. Works best in Body-Centric mode.
                </p>
            </div>
        </div>
    );
};

export default JointSelector;
