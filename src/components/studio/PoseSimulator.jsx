import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * PoseSimulator Component
 * Renders an interactive skeleton allowing users to drag keypoints
 * to simulate pose data for testing rules without a camera.
 */
const PoseSimulator = ({ onPoseUpdate }) => {
    const svgRef = useRef(null);
    const [dragging, setDragging] = useState(null);

    // Default pose (T-Pose-ish)
    const defaultKeypoints = {
        0: { x: 0.5, y: 0.1, name: 'nose' },
        2: { x: 0.46, y: 0.08, name: 'left_eye' },
        5: { x: 0.54, y: 0.08, name: 'right_eye' },
        7: { x: 0.42, y: 0.09, name: 'left_ear' },
        8: { x: 0.58, y: 0.09, name: 'right_ear' },
        11: { x: 0.35, y: 0.25, name: 'left_shoulder' },
        12: { x: 0.65, y: 0.25, name: 'right_shoulder' },
        13: { x: 0.2, y: 0.4, name: 'left_elbow' },
        14: { x: 0.8, y: 0.4, name: 'right_elbow' },
        15: { x: 0.15, y: 0.55, name: 'left_wrist' },
        16: { x: 0.85, y: 0.55, name: 'right_wrist' },
        23: { x: 0.4, y: 0.6, name: 'left_hip' },
        24: { x: 0.6, y: 0.6, name: 'right_hip' },
        25: { x: 0.35, y: 0.8, name: 'left_knee' },
        26: { x: 0.65, y: 0.8, name: 'right_knee' },
        27: { x: 0.35, y: 0.95, name: 'left_ankle' },
        28: { x: 0.65, y: 0.95, name: 'right_ankle' }
    };

    const [keypoints, setKeypoints] = useState(defaultKeypoints);

    // Connections to draw lines
    const connections = [
        [11, 12], // Shoulders
        [11, 23], [12, 24], // Torso
        [23, 24], // Hips
        [11, 13], [13, 15], // Left Arm
        [12, 14], [14, 16], // Right Arm
        [23, 25], [25, 27], // Left Leg
        [24, 26], [26, 28], // Right Leg
        [0, 11], [0, 12], // Neck
        [0, 2], [2, 7], // Left Face
        [0, 5], [5, 8], // Right Face
        [7, 8] // Head Top Loop (optional, but helps visualization)
    ];

    // Emit pose update whenever keypoints change
    useEffect(() => {
        const poseData = Object.entries(keypoints).map(([id, kp]) => ({
            name: kp.name,
            x: kp.x,
            y: kp.y,
            z: 0,
            score: 1.0
        }));

        if (onPoseUpdate) {
            onPoseUpdate([{ keypoints: poseData, score: 1.0 }]);
        }
    }, [keypoints, onPoseUpdate]);

    const handleMouseDown = (e, id) => {
        setDragging(id);
    };

    const handleMouseMove = (e) => {
        if (!dragging || !svgRef.current) return;

        const rect = svgRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

        setKeypoints(prev => ({
            ...prev,
            [dragging]: { ...prev[dragging], x, y }
        }));
    };

    const handleMouseUp = () => {
        setDragging(null);
    };

    const resetPose = () => {
        setKeypoints(defaultKeypoints);
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#111827', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, color: '#9ca3af', fontSize: '0.8rem', pointerEvents: 'none' }}>
                Pose Simulator (Drag joints)
            </div>

            <button
                onClick={resetPose}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, padding: '6px', background: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                title="Reset Pose"
            >
                <RefreshCw size={14} />
            </button>

            <svg
                ref={svgRef}
                width="100%"
                height="100%"
                viewBox="0 0 400 300"
                preserveAspectRatio="none"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: dragging ? 'grabbing' : 'default' }}
            >
                {/* Skeleton Lines */}
                {connections.map(([start, end], idx) => {
                    const k1 = keypoints[start];
                    const k2 = keypoints[end];
                    if (!k1 || !k2) return null;
                    return (
                        <line
                            key={idx}
                            x1={k1.x * 400}
                            y1={k1.y * 300}
                            x2={k2.x * 400}
                            y2={k2.y * 300}
                            stroke="#4b5563"
                            strokeWidth="4"
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Joints */}
                {Object.entries(keypoints).map(([id, kp]) => (
                    <g
                        key={id}
                        transform={`translate(${kp.x * 400}, ${kp.y * 300})`}
                        onMouseDown={(e) => handleMouseDown(e, id)}
                        style={{ cursor: 'grab' }}
                    >
                        {/* Larger invisible hit area */}
                        <circle r="15" fill="transparent" />

                        {/* Visible Joint */}
                        <circle
                            r={dragging === id ? 8 : 6}
                            fill={dragging === id ? '#3b82f6' : '#10b981'}
                            stroke="white"
                            strokeWidth="2"
                        />

                        {/* Label on hover or drag */}
                        {(dragging === id) && (
                            <text
                                y="-15"
                                textAnchor="middle"
                                fill="white"
                                fontSize="12"
                                style={{ pointerEvents: 'none', textShadow: '0px 1px 2px black' }}
                            >
                                {kp.name}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default PoseSimulator;
