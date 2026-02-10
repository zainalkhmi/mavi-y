import React, { useRef, useEffect } from 'react';

/**
 * Pose Visualizer
 * Draws skeleton overlay on video canvas
 */
function PoseVisualizer({ pose, videoElement, riskScores = {}, width, height }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current || !pose || !videoElement) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw skeleton
        drawSkeleton(ctx, pose, riskScores);
    }, [pose, videoElement, riskScores]);

    /**
     * Draw skeleton on canvas
     */
    const drawSkeleton = (ctx, pose, riskScores) => {
        if (!pose || !pose.keypoints) return;

        const keypoints = pose.keypoints;

        // Define skeleton connections
        const connections = [
            // Head
            ['nose', 'left_eye'],
            ['nose', 'right_eye'],
            ['left_eye', 'left_ear'],
            ['right_eye', 'right_ear'],

            // Torso
            ['left_shoulder', 'right_shoulder'],
            ['left_shoulder', 'left_hip'],
            ['right_shoulder', 'right_hip'],
            ['left_hip', 'right_hip'],

            // Left arm
            ['left_shoulder', 'left_elbow'],
            ['left_elbow', 'left_wrist'],

            // Right arm
            ['right_shoulder', 'right_elbow'],
            ['right_elbow', 'right_wrist'],

            // Left leg
            ['left_hip', 'left_knee'],
            ['left_knee', 'left_ankle'],

            // Right leg
            ['right_hip', 'right_knee'],
            ['right_knee', 'right_ankle']
        ];

        // Draw connections (bones)
        connections.forEach(([start, end]) => {
            const startPoint = keypoints.find(kp => kp.name === start);
            const endPoint = keypoints.find(kp => kp.name === end);

            if (startPoint && endPoint && startPoint.score > 0.3 && endPoint.score > 0.3) {
                const color = getConnectionColor(start, end, riskScores);
                drawLine(ctx, startPoint, endPoint, color);
            }
        });

        // Draw keypoints (joints)
        keypoints.forEach(kp => {
            if (kp.score > 0.3) {
                const color = getKeypointColor(kp.name, riskScores);
                drawKeypoint(ctx, kp, color);
            }
        });
    };

    /**
     * Draw a line between two keypoints
     */
    const drawLine = (ctx, start, end, color = '#00ff00') => {
        const canvas = canvasRef.current;
        ctx.beginPath();
        ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
        ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.stroke();
    };

    /**
     * Draw a keypoint (circle)
     */
    const drawKeypoint = (ctx, keypoint, color = '#00ff00') => {
        const canvas = canvasRef.current;
        ctx.beginPath();
        ctx.arc(keypoint.x * canvas.width, keypoint.y * canvas.height, 5, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
    };

    /**
     * Get color based on risk level
     */
    const getConnectionColor = (start, end, riskScores) => {
        // Color code based on RULA scores
        const bodyPart = getBodyPart(start, end);
        const score = riskScores[bodyPart] || 0;

        if (score <= 2) return '#00ff00'; // Green - Acceptable
        if (score <= 4) return '#ffff00'; // Yellow - Low risk
        if (score <= 6) return '#ff9900'; // Orange - Medium risk
        return '#ff0000'; // Red - High risk
    };

    /**
     * Get keypoint color based on risk
     */
    const getKeypointColor = (name, riskScores) => {
        if (name.includes('shoulder') || name.includes('elbow') || name.includes('wrist')) {
            const score = riskScores.upperArm || riskScores.lowerArm || riskScores.wrist || 0;
            if (score <= 2) return '#00ff00';
            if (score <= 4) return '#ffff00';
            if (score <= 6) return '#ff9900';
            return '#ff0000';
        }

        if (name.includes('hip') || name.includes('knee')) {
            const score = riskScores.trunk || riskScores.legs || 0;
            if (score <= 2) return '#00ff00';
            if (score <= 4) return '#ffff00';
            if (score <= 6) return '#ff9900';
            return '#ff0000';
        }

        return '#00ff00';
    };

    /**
     * Map connection to body part
     */
    const getBodyPart = (start, end) => {
        if ((start.includes('shoulder') && end.includes('elbow')) ||
            (start.includes('elbow') && end.includes('shoulder'))) {
            return 'upperArm';
        }
        if ((start.includes('elbow') && end.includes('wrist')) ||
            (start.includes('wrist') && end.includes('elbow'))) {
            return 'lowerArm';
        }
        if (start.includes('shoulder') || end.includes('shoulder')) {
            return 'neck';
        }
        if (start.includes('hip') || end.includes('hip')) {
            return 'trunk';
        }
        return 'other';
    };

    return (
        <canvas
            ref={canvasRef}
            width={width || 640}
            height={height || 480}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 10
            }}
        />
    );
}

export default PoseVisualizer;
