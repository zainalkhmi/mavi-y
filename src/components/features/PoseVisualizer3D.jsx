import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Center, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 3D Human Skeleton implementation
 */
const Skeleton3D = ({ pose, riskScores }) => {
    const groupRef = useRef();

    const normalizedKeypoints = useMemo(() => {
        if (!pose || !pose.keypoints) return [];

        // MoveNet keypoints are 0-1. 
        // We map them to 3D space: 
        // x: -0.5 to 0.5 (left to right)
        // y: 1 to 0 (top to bottom) -> 0 to 2 (height)
        // z: depth (we'll estimate or keep at 0 for single camera, or use side view)

        return pose.keypoints.map(kp => ({
            ...kp,
            pos: [
                (kp.x - 0.5) * 2, // x: mirror and scale
                (1 - kp.y) * 2,    // y: invert and scale
                0                 // z: default for 2D pose
            ]
        }));
    }, [pose]);

    const connections = [
        [5, 6], [5, 11], [6, 12], [11, 12], // Torso
        [5, 7], [7, 9],                     // Left arm
        [6, 8], [8, 10],                    // Right arm
        [11, 13], [13, 15],                 // Left leg
        [12, 14], [14, 16],                 // Right leg
        [0, 5], [0, 6]                      // Neck/Head connection
    ];

    const getColor = (part, score) => {
        const risk = score || 0;
        if (risk <= 2) return '#00ff00';
        if (risk <= 4) return '#ffff00';
        if (risk <= 6) return '#ff9900';
        return '#ff0000';
    };

    const getBodyPartByJoint = (index) => {
        if (index === 0) return 'neck';
        if (index >= 5 && index <= 6) return 'upperArm'; // shoulder
        if (index >= 7 && index <= 8) return 'lowerArm'; // elbow
        if (index >= 9 && index <= 10) return 'wrist';
        if (index >= 11 && index <= 12) return 'trunk'; // hip
        if (index >= 13 && index <= 14) return 'legs'; // knee
        return 'other';
    };

    const getBodyPartByBone = (i, j) => {
        if ((i === 5 && j === 7) || (i === 6 && j === 8)) return 'upperArm';
        if ((i === 7 && j === 9) || (i === 8 && j === 10)) return 'lowerArm';
        if ((i === 5 && j === 11) || (i === 6 && j === 12)) return 'trunk';
        if ((i === 11 && j === 13) || (i === 12 && j === 14)) return 'legs';
        if (i === 0 || j === 0) return 'neck';
        return 'other';
    };

    return (
        <group ref={groupRef}>
            {/* Joints */}
            {normalizedKeypoints.map((kp, i) => {
                if (kp.score <= 0.3) return null;
                const part = getBodyPartByJoint(i);
                const color = getColor(part, riskScores[part]);
                return (
                    <mesh key={i} position={kp.pos}>
                        <sphereGeometry args={[0.04, 16, 16]} />
                        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
                    </mesh>
                );
            })}

            {/* Bones */}
            {connections.map(([i, j], idx) => {
                const kp1 = normalizedKeypoints[i];
                const kp2 = normalizedKeypoints[j];

                if (kp1 && kp2 && kp1.score > 0.3 && kp2.score > 0.3) {
                    const start = new THREE.Vector3(...kp1.pos);
                    const end = new THREE.Vector3(...kp2.pos);
                    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
                    const direction = new THREE.Vector3().subVectors(end, start);
                    const length = direction.length();

                    const part = getBodyPartByBone(i, j);
                    const color = getColor(part, riskScores[part]);

                    return (
                        <mesh
                            key={`bone-${idx}`}
                            position={midPoint}
                            quaternion={new THREE.Quaternion().setFromUnitVectors(
                                new THREE.Vector3(0, 1, 0),
                                direction.clone().normalize()
                            )}
                        >
                            <cylinderGeometry args={[0.02, 0.02, length, 8]} />
                            <meshStandardMaterial color={color} transparent opacity={0.6} />
                        </mesh>
                    );
                }
                return null;
            })}
        </group>
    );
};

const PoseVisualizer3D = ({ pose, riskScores = {}, showGrid = true, autoRotate = false }) => {
    return (
        <div style={{ width: '100%', height: '100%', background: '#0a0a12', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
            <Canvas shadows gl={{ antialias: true }}>
                <PerspectiveCamera makeDefault position={[0, 1.5, 4]} fov={50} />
                <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 1.75} />

                {/* Lighting */}
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} castShadow />
                <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />

                {/* Environment */}
                {showGrid && (
                    <Grid
                        infiniteGrid
                        fadeDistance={20}
                        fadeStrength={5}
                        cellSize={0.5}
                        sectionSize={2.5}
                        sectionColor="#2d3748"
                        cellColor="#1a202c"
                    />
                )}

                {/* Target */}
                <Center top>
                    <Skeleton3D pose={pose} riskScores={riskScores} />
                </Center>

                {/* Floor shadow */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                    <planeGeometry args={[50, 50]} />
                    <shadowMaterial opacity={0.3} />
                </mesh>
            </Canvas>

            {/* Overlay Info */}
            <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', pointerEvents: 'none' }}>
                Right-click to pan • Left-click to rotate • Scroll to zoom
            </div>
        </div>
    );
};

export default PoseVisualizer3D;
