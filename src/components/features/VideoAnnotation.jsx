import React, { useRef, useState, useEffect } from 'react';

function VideoAnnotation({
    videoRef,
    videoState,
    annotations,
    onUpdateAnnotations,
    currentTool = 'pen',
    drawColor = '#ff0000',
    lineWidth = 3
}) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState([]);
    const [startPoint, setStartPoint] = useState(null);
    const [textInput, setTextInput] = useState({ x: 0, y: 0, visible: false, text: '', canvasX: 0, canvasY: 0 });

    // Initialize canvas
    useEffect(() => {
        if (!canvasRef.current || !videoRef.current) return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        // Match canvas size to video
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        // Redraw annotations
        redrawCanvas();
    }, [videoState.currentTime, annotations, currentPath, startPoint]); // Added dependencies for live drawing

    const redrawCanvas = () => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw all annotations for current time
        const currentTime = videoState.currentTime;
        const relevantAnnotations = (annotations || []).filter(
            ann => ann.timestamp >= currentTime - 0.5 && ann.timestamp <= currentTime + 0.5
        );

        relevantAnnotations.forEach(annotation => {
            drawAnnotation(ctx, annotation);
        });

        // Draw current drawing preview
        if (isDrawing) {
            // For pen, we draw the path
            if (currentTool === 'pen' && currentPath.length > 0) {
                ctx.strokeStyle = drawColor;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                ctx.beginPath();
                ctx.moveTo(currentPath[0].x, currentPath[0].y);
                currentPath.forEach(point => {
                    ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
            }
            // For shapes, we draw the preview shape
            else if (startPoint && currentPath.length > 0) { // currentPath holds the current mouse position for shapes
                const endPoint = currentPath[currentPath.length - 1];
                const tempAnnotation = {
                    type: currentTool,
                    start: startPoint,
                    end: endPoint,
                    color: drawColor,
                    lineWidth: lineWidth
                };
                drawAnnotation(ctx, tempAnnotation);
            }
        }
    };

    const drawAnnotation = (ctx, annotation) => {
        ctx.strokeStyle = annotation.color || drawColor;
        ctx.fillStyle = annotation.color || drawColor;
        ctx.lineWidth = annotation.lineWidth || lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        switch (annotation.type) {
            case 'pen':
                if (annotation.path && annotation.path.length > 1) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.path[0].x, annotation.path[0].y);
                    annotation.path.forEach(point => {
                        ctx.lineTo(point.x, point.y);
                    });
                    ctx.stroke();
                }
                break;

            case 'line':
                if (annotation.start && annotation.end) {
                    ctx.beginPath();
                    ctx.moveTo(annotation.start.x, annotation.start.y);
                    ctx.lineTo(annotation.end.x, annotation.end.y);
                    ctx.stroke();
                }
                break;

            case 'arrow':
                if (annotation.start && annotation.end) {
                    drawArrow(ctx, annotation.start, annotation.end);
                }
                break;

            case 'rectangle':
                if (annotation.start && annotation.end) {
                    const width = annotation.end.x - annotation.start.x;
                    const height = annotation.end.y - annotation.start.y;
                    ctx.strokeRect(annotation.start.x, annotation.start.y, width, height);
                }
                break;

            case 'circle':
                if (annotation.start && annotation.end) {
                    const radius = Math.sqrt(
                        Math.pow(annotation.end.x - annotation.start.x, 2) +
                        Math.pow(annotation.end.y - annotation.start.y, 2)
                    );
                    ctx.beginPath();
                    ctx.arc(annotation.start.x, annotation.start.y, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                break;

            case 'text':
                if (annotation.position && annotation.text) {
                    ctx.font = `bold ${annotation.fontSize || 24}px Arial`;
                    ctx.fillStyle = annotation.color || drawColor;
                    ctx.textBaseline = 'middle'; // Center text vertically at click point
                    ctx.textAlign = 'left';

                    // Add text shadow for better visibility
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    ctx.shadowBlur = 4;
                    ctx.shadowOffsetX = 2;
                    ctx.shadowOffsetY = 2;

                    ctx.fillText(annotation.text, annotation.position.x, annotation.position.y);

                    // Reset shadow
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                }
                break;
        }
    };

    const drawArrow = (ctx, start, end) => {
        const headLength = 15;
        const angle = Math.atan2(end.y - start.y, end.x - start.x);

        // Draw line
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();

        // Draw arrowhead
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - headLength * Math.cos(angle - Math.PI / 6),
            end.y - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(
            end.x - headLength * Math.cos(angle + Math.PI / 6),
            end.y - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    };

    const getCanvasPoint = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const handleMouseDown = (e) => {
        if (!canvasRef.current) return;

        const point = getCanvasPoint(e);

        if (currentTool === 'text') {
            // Use screen coordinates for the input box position
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            setTextInput({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                visible: true,
                text: '',
                canvasX: point.x,  // Store canvas coordinates for actual text rendering
                canvasY: point.y
            });
            return;
        }

        setIsDrawing(true);
        setStartPoint(point);

        if (currentTool === 'pen') {
            setCurrentPath([point]);
        } else {
            // For shapes, we use currentPath to store the current mouse position (end point)
            setCurrentPath([point]);
        }
    };

    const handleMouseMove = (e) => {
        if (!isDrawing || !canvasRef.current) return;

        const point = getCanvasPoint(e);

        if (currentTool === 'pen') {
            setCurrentPath(prev => [...prev, point]);
        } else {
            // For shapes, update the end point
            setCurrentPath([point]);
        }

        // Redraw happens via useEffect dependency on currentPath
    };

    const handleMouseUp = (e) => {
        if (!isDrawing) return;

        const point = getCanvasPoint(e);

        const newAnnotation = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            type: currentTool,
            timestamp: videoState.currentTime,
            color: drawColor,
            lineWidth: lineWidth
        };

        if (currentTool === 'pen') {
            newAnnotation.path = currentPath;
        } else {
            newAnnotation.start = startPoint;
            newAnnotation.end = point;
        }

        // Auto-save: Update parent state immediately
        if (onUpdateAnnotations) {
            onUpdateAnnotations([...(annotations || []), newAnnotation]);
        }

        setIsDrawing(false);
        setCurrentPath([]);
        setStartPoint(null);
    };

    const handleTextSubmit = () => {
        if (textInput.text.trim()) {
            const newAnnotation = {
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: 'text',
                timestamp: videoState.currentTime,
                color: drawColor,
                text: textInput.text,
                position: { x: textInput.canvasX || textInput.x, y: textInput.canvasY || textInput.y },
                fontSize: lineWidth * 6 + 14 // Scale font size
            };

            if (onUpdateAnnotations) {
                onUpdateAnnotations([...(annotations || []), newAnnotation]);
            }
        }
        setTextInput({ x: 0, y: 0, visible: false, text: '', canvasX: 0, canvasY: 0 });
    };

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {/* Canvas Overlay */}
            <canvas
                ref={canvasRef}
                style={{ pointerEvents: 'all' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => setIsDrawing(false)}
            />

            {/* Text Input Overlay - Modal Style */}
            {textInput.visible && (
                <div
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        pointerEvents: 'all',
                        zIndex: 99999,
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        padding: '20px',
                        borderRadius: '8px',
                        border: `3px solid ${drawColor}`,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.8)'
                    }}
                >
                    <div style={{ marginBottom: '10px', color: 'white', fontSize: '14px' }}>
                        Enter text annotation:
                    </div>
                    <input
                        autoFocus
                        type="text"
                        value={textInput.text}
                        onChange={(e) => setTextInput({ ...textInput, text: e.target.value })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleTextSubmit();
                            if (e.key === 'Escape') setTextInput({ x: 0, y: 0, visible: false, text: '', canvasX: 0, canvasY: 0 });
                        }}
                        placeholder="Type text here..."
                        style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            border: `2px solid ${drawColor}`,
                            padding: '8px 12px',
                            borderRadius: '4px',
                            outline: 'none',
                            fontSize: '16px',
                            width: '300px',
                            display: 'block'
                        }}
                    />
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
                        Press Enter to save, Escape to cancel
                    </div>
                </div>
            )}
        </div>
    );
}

export default VideoAnnotation;
