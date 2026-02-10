import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

const ImageMarkupDialog = ({ isOpen, onClose, imageSrc, onSave }) => {
    const { t } = useLanguage();
    const canvasRef = useRef(null);
    const [context, setContext] = useState(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState('arrow'); // arrow, rect, circle, line
    const [color, setColor] = useState('#ff0000'); // red, yellow, green
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [snapshot, setSnapshot] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (isOpen && canvasRef.current && imageSrc) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            setContext(ctx);

            const img = new Image();
            img.src = imageSrc;
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                saveState(); // Initial state
            };
        }
    }, [isOpen, imageSrc]);

    const saveState = () => {
        if (!canvasRef.current) return;
        setHistory(prev => [...prev, canvasRef.current.toDataURL()]);
    };

    const restoreState = (dataUrl) => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(img, 0, 0);
        };
    };

    const handleUndo = () => {
        if (history.length > 1) {
            const newHistory = history.slice(0, -1);
            setHistory(newHistory);
            restoreState(newHistory[newHistory.length - 1]);
        }
    };

    const getMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = canvasRef.current.width / rect.width;
        const scaleY = canvasRef.current.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        setIsDrawing(true);
        const pos = getMousePos(e);
        setStartPos(pos);
        setSnapshot(context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height));
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const pos = getMousePos(e);

        // Restore snapshot to avoid trails
        context.putImageData(snapshot, 0, 0);

        context.strokeStyle = color;
        context.lineWidth = 5;
        context.lineCap = 'round';
        context.lineJoin = 'round';

        if (tool === 'rect') {
            const w = pos.x - startPos.x;
            const h = pos.y - startPos.y;
            context.strokeRect(startPos.x, startPos.y, w, h);
        } else if (tool === 'circle') {
            context.beginPath();
            const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
            context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
            context.stroke();
        } else if (tool === 'line') {
            context.beginPath();
            context.moveTo(startPos.x, startPos.y);
            context.lineTo(pos.x, pos.y);
            context.stroke();
        } else if (tool === 'arrow') {
            drawArrow(context, startPos.x, startPos.y, pos.x, pos.y);
        }
    };

    const drawArrow = (ctx, fromX, fromY, toX, toY) => {
        const headlen = 20; // length of head in pixels
        const angle = Math.atan2(toY - fromY, toX - fromX);

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(toX, toY);
        ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
        ctx.fillStyle = color;
        ctx.fill();
        ctx.stroke();
    };

    const stopDrawing = () => {
        if (isDrawing) {
            setIsDrawing(false);
            saveState();
        }
    };

    const handleSave = () => {
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.9);
        onSave(dataUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: '#252526', padding: '10px', borderRadius: '8px',
                display: 'flex', gap: '20px', marginBottom: '10px', alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={() => setTool('arrow')} style={toolStyle(tool === 'arrow')}>↗ {t('manual.arrow')}</button>
                    <button onClick={() => setTool('line')} style={toolStyle(tool === 'line')}>━ {t('manual.line')}</button>
                    <button onClick={() => setTool('rect')} style={toolStyle(tool === 'rect')}>⬜ {t('manual.box')}</button>
                    <button onClick={() => setTool('circle')} style={toolStyle(tool === 'circle')}>⭕ {t('manual.circle')}</button>
                </div>

                <div style={{ width: '1px', height: '30px', backgroundColor: '#555' }}></div>

                <div style={{ display: 'flex', gap: '5px' }}>
                    <div onClick={() => setColor('#ff0000')} style={colorStyle('#ff0000', color === '#ff0000')}></div>
                    <div onClick={() => setColor('#00ff00')} style={colorStyle('#00ff00', color === '#00ff00')}></div>
                    <div onClick={() => setColor('#ffff00')} style={colorStyle('#ffff00', color === '#ffff00')}></div>
                </div>

                <div style={{ width: '1px', height: '30px', backgroundColor: '#555' }}></div>

                <button onClick={handleUndo} style={actionStyle}>↩ {t('common.undo')}</button>
            </div>

            <div style={{
                border: '1px solid #444', maxHeight: '80vh', maxWidth: '90vw', overflow: 'auto',
                backgroundColor: '#000', boxShadow: '0 0 20px rgba(0,0,0,0.5)'
            }}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ cursor: 'crosshair', display: 'block' }}
                />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                    onClick={onClose}
                    style={{ padding: '8px 20px', backgroundColor: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {t('common.cancel')}
                </button>
                <button
                    onClick={handleSave}
                    style={{ padding: '8px 20px', backgroundColor: '#0078d4', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                    {t('common.saveChanges')}
                </button>
            </div>
        </div>
    );
};

const toolStyle = (active) => ({
    padding: '6px 12px',
    backgroundColor: active ? '#0078d4' : '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer'
});

const colorStyle = (c, active) => ({
    width: '24px',
    height: '24px',
    backgroundColor: c,
    borderRadius: '50%',
    cursor: 'pointer',
    border: active ? '2px solid white' : '2px solid transparent'
});

const actionStyle = {
    padding: '6px 12px',
    backgroundColor: '#333',
    color: '#fff',
    border: '1px solid #555',
    borderRadius: '4px',
    cursor: 'pointer'
};

export default ImageMarkupDialog;
