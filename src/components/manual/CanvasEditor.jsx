import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Image, Type, Square, Circle, Minus, ArrowRight, Pencil,
    Trash2, Copy, Layers, ChevronUp, ChevronDown, X,
    Download, RotateCcw, AlignLeft, AlignCenter, AlignRight,
    Bold, Italic, Underline, Palette, Plus, MousePointer,
    StickyNote, Triangle, Star, Hexagon, ZoomIn, ZoomOut,
    Maximize, Minimize
} from 'lucide-react';

// ─── Unique ID helper ────────────────────────────────────────────────────────
const uid = () => `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Default element factory ─────────────────────────────────────────────────
const makeElement = (type, extra = {}) => ({
    id: uid(),
    type,
    x: 20 + Math.random() * 30,  // % of canvas
    y: 20 + Math.random() * 30,
    w: type === 'text' || type === 'sticky' ? 25 : type === 'draw' ? 0 : 20,
    h: type === 'text' || type === 'sticky' ? 10 : type === 'draw' ? 0 : 15,
    rotation: 0,
    opacity: 1,
    locked: false,
    zIndex: 1,
    // type-specific defaults
    text: type === 'text' ? 'Double-click to edit' : type === 'sticky' ? 'Note...' : '',
    fontSize: 16,
    fontWeight: 'normal',
    fontStyle: 'normal',
    textDecoration: 'none',
    textAlign: 'left',
    color: type === 'sticky' ? '#1a1a1a' : type === 'datacapture' ? '#1e293b' : '#ffffff',
    background: type === 'shape' ? '#3b82f6'
        : type === 'sticky' ? '#fde68a'
            : type === 'datacapture' ? '#f8fafc'
                : 'transparent',
    borderColor: type === 'shape' ? '#60a5fa' : type === 'line' || type === 'arrow' ? '#3b82f6' : type === 'datacapture' ? '#cbd5e1' : 'transparent',
    borderWidth: type === 'shape' ? 2 : type === 'line' || type === 'arrow' ? 3 : type === 'datacapture' ? 1 : 0,
    borderRadius: type === 'datacapture' ? 6 : 0,
    shapeVariant: 'rect',   // rect | circle | triangle | star | hexagon
    linePoints: [],          // for 'draw' type: array of {x,y}
    imageUrl: '',

    // Data Capture specific
    label: type === 'datacapture' ? 'New Field' : undefined,
    fieldType: type === 'datacapture' ? 'text' : undefined, // text, number, select, radio, textarea
    required: type === 'datacapture' ? false : undefined,
    options: type === 'datacapture' ? ['Option 1', 'Option 2'] : undefined, // for select/radio
    ...extra
});

// ─── Lucide icon name map for sticky/icon elements ───────────────────────────
const ICON_LIST = [
    { name: 'Star', icon: Star },
    { name: 'Circle', icon: Circle },
    { name: 'Square', icon: Square },
    { name: 'Triangle', icon: Triangle },
    { name: 'Hexagon', icon: Hexagon },
    { name: 'ArrowRight', icon: ArrowRight },
    { name: 'Image', icon: Image },
    { name: 'Type', icon: Type },
];

// ─── Shape renderer ──────────────────────────────────────────────────────────
const ShapeRenderer = ({ el }) => {
    const style = {
        width: '100%', height: '100%',
        background: el.background,
        border: `${el.borderWidth}px solid ${el.borderColor}`,
        opacity: el.opacity,
        borderRadius: el.shapeVariant === 'circle' ? '50%'
            : el.borderRadius ? `${el.borderRadius}px` : 0,
        clipPath: el.shapeVariant === 'triangle'
            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
            : el.shapeVariant === 'hexagon'
                ? 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
                : el.shapeVariant === 'star'
                    ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                    : 'none'
    };
    return <div style={style} />;
};

// ─── Main CanvasEditor ────────────────────────────────────────────────────────
const CanvasEditor = ({ step, onChange }) => {
    const canvasData = Array.isArray(step?.canvasData) ? step.canvasData : [];

    const [elements, setElements] = useState(canvasData);
    const [selectedId, setSelectedId] = useState(null);
    const [activeTool, setActiveTool] = useState('select');  // select | text | shape | image | line | arrow | draw | sticky
    const [isDrawing, setIsDrawing] = useState(false);
    const [showLayers, setShowLayers] = useState(false);
    const [showProps, setShowProps] = useState(true);
    const [editingTextId, setEditingTextId] = useState(null);
    const [shapeVariant, setShapeVariant] = useState('rect');
    const [canvasBg, setCanvasBg] = useState('#ffffff');
    const [zoom, setZoom] = useState(1);
    const [drawing, setDrawing] = useState(null); // temp path for freehand
    const [dragState, setDragState] = useState(null);
    const [resizeState, setResizeState] = useState(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Close fullscreen on Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isFullscreen) {
                setIsFullscreen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isFullscreen]);

    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const textEditRef = useRef(null);

    // Sync elements → step.canvasData whenever elements change
    useEffect(() => {
        onChange(step.id, { ...step, canvasData: elements });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [elements]);

    // ── Sync from outside (e.g., when step changes) ─────────────────────────
    useEffect(() => {
        const incoming = Array.isArray(step?.canvasData) ? step.canvasData : [];
        setElements(incoming);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [step?.id]);

    const selectedEl = elements.find(e => e.id === selectedId) || null;

    // ─── Canvas coordinate helpers ──────────────────────────────────────────
    const getRelPos = (e) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return { x: 0, y: 0 };
        return {
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100
        };
    };

    // ─── Element CRUD ───────────────────────────────────────────────────────
    const addElement = (type, extra = {}) => {
        const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex || 1), 0);
        const el = makeElement(type, { ...extra, zIndex: maxZ + 1 });
        setElements(prev => [...prev, el]);
        setSelectedId(el.id);
        setActiveTool('select');
    };

    const updateElement = (id, patch) => {
        setElements(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    };

    const deleteSelected = () => {
        setElements(prev => prev.filter(e => e.id !== selectedId));
        setSelectedId(null);
    };

    const duplicateSelected = () => {
        if (!selectedEl) return;
        const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex || 1), 0);
        const newEl = { ...selectedEl, id: uid(), x: selectedEl.x + 3, y: selectedEl.y + 3, zIndex: maxZ + 1 };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    };

    const bringForward = () => {
        if (!selectedEl) return;
        updateElement(selectedId, { zIndex: (selectedEl.zIndex || 1) + 1 });
    };

    const sendBackward = () => {
        if (!selectedEl) return;
        updateElement(selectedId, { zIndex: Math.max(1, (selectedEl.zIndex || 1) - 1) });
    };

    const clearCanvas = () => {
        setElements([]);
        setSelectedId(null);
    };

    // ─── Drag ───────────────────────────────────────────────────────────────
    const handleMouseDown = (e, elId) => {
        if (activeTool !== 'select') return;
        if (editingTextId) return;
        e.stopPropagation();
        const pos = getRelPos(e);
        const el = elements.find(en => en.id === elId);
        if (!el || el.locked) return;
        setSelectedId(elId);
        setDragState({ elId, startX: pos.x, startY: pos.y, origX: el.x, origY: el.y });
    };

    const handleResizeMouseDown = (e, elId, handle) => {
        e.stopPropagation();
        const pos = getRelPos(e);
        const el = elements.find(en => en.id === elId);
        if (!el) return;
        setResizeState({ elId, handle, startX: pos.x, startY: pos.y, origX: el.x, origY: el.y, origW: el.w, origH: el.h });
    };

    const handleCanvasMouseMove = useCallback((e) => {
        if (dragState) {
            const pos = getRelPos(e);
            const dx = pos.x - dragState.startX;
            const dy = pos.y - dragState.startY;
            updateElement(dragState.elId, {
                x: Math.max(0, Math.min(90, dragState.origX + dx)),
                y: Math.max(0, Math.min(90, dragState.origY + dy))
            });
        } else if (resizeState) {
            const pos = getRelPos(e);
            const dx = pos.x - resizeState.startX;
            const dy = pos.y - resizeState.startY;
            let newW = resizeState.origW, newH = resizeState.origH;
            let newX = resizeState.origX, newY = resizeState.origY;
            if (resizeState.handle === 'se') {
                newW = Math.max(5, resizeState.origW + dx);
                newH = Math.max(3, resizeState.origH + dy);
            } else if (resizeState.handle === 'sw') {
                newW = Math.max(5, resizeState.origW - dx);
                newX = resizeState.origX + dx;
                newH = Math.max(3, resizeState.origH + dy);
            } else if (resizeState.handle === 'ne') {
                newW = Math.max(5, resizeState.origW + dx);
                newH = Math.max(3, resizeState.origH - dy);
                newY = resizeState.origY + dy;
            } else if (resizeState.handle === 'nw') {
                newW = Math.max(5, resizeState.origW - dx);
                newX = resizeState.origX + dx;
                newH = Math.max(3, resizeState.origH - dy);
                newY = resizeState.origY + dy;
            }
            updateElement(resizeState.elId, { x: newX, y: newY, w: newW, h: newH });
        } else if (isDrawing && drawing) {
            const pos = getRelPos(e);
            setDrawing(prev => ({ ...prev, linePoints: [...prev.linePoints, pos] }));
        }
    }, [dragState, resizeState, isDrawing, drawing]);

    const handleCanvasMouseUp = useCallback(() => {
        if (dragState) setDragState(null);
        if (resizeState) setResizeState(null);
        if (isDrawing && drawing && drawing.linePoints.length > 1) {
            const maxZ = elements.reduce((m, e) => Math.max(m, e.zIndex || 1), 0);
            const el = { ...drawing, zIndex: maxZ + 1 };
            setElements(prev => [...prev, el]);
            setSelectedId(el.id);
            setDrawing(null);
            setIsDrawing(false);
            setActiveTool('select');
        }
    }, [dragState, resizeState, isDrawing, drawing, elements]);

    // ─── Canvas click (place element / start drawing) ────────────────────────
    const handleCanvasClick = (e) => {
        if (e.target === canvasRef.current || e.target.dataset.canvasBg) {
            setSelectedId(null);
            setEditingTextId(null);
        }
        if (activeTool === 'draw') {
            if (!isDrawing) {
                const pos = getRelPos(e);
                const newDraw = makeElement('draw', { linePoints: [pos], color: '#38bdf8', borderWidth: 3 });
                setDrawing(newDraw);
                setIsDrawing(true);
            }
        }
    };

    // ─── Image upload ────────────────────────────────────────────────────────
    const handleImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            addElement('image', { imageUrl: ev.target.result, w: 35, h: 25 });
        };
        reader.readAsDataURL(file);
        fileInputRef.current.value = '';
    };

    // ─── Export canvas to PNG (native Canvas API) ────────────────────────────
    const handleExportToPng = async () => {
        const node = canvasRef.current;
        if (!node) return;
        try {
            // Use native Canvas API to capture visible DOM elements
            const canvas = document.createElement('canvas');
            const rect = node.getBoundingClientRect();
            const scale = 2;
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.scale(scale, scale);

            // Draw background
            ctx.fillStyle = canvasBg;
            ctx.fillRect(0, 0, rect.width, rect.height);

            // Draw images only (native canvas can draw imgs)
            const imgPromises = [];
            const sortedEls = [...elements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));
            for (const el of sortedEls) {
                if (el.type === 'image' && el.imageUrl) {
                    imgPromises.push(new Promise((res) => {
                        const img = new window.Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            const px = (el.x / 100) * rect.width;
                            const py = (el.y / 100) * rect.height;
                            const pw = (el.w / 100) * rect.width;
                            const ph = (el.h / 100) * rect.height;
                            ctx.globalAlpha = el.opacity ?? 1;
                            ctx.drawImage(img, px, py, pw, ph);
                            ctx.globalAlpha = 1;
                            res();
                        };
                        img.onerror = () => res();
                        img.src = el.imageUrl;
                    }));
                } else if ((el.type === 'shape') && el.shapeVariant !== 'triangle' && el.shapeVariant !== 'star' && el.shapeVariant !== 'hexagon') {
                    const px = (el.x / 100) * rect.width;
                    const py = (el.y / 100) * rect.height;
                    const pw = (el.w / 100) * rect.width;
                    const ph = (el.h / 100) * rect.height;
                    ctx.globalAlpha = el.opacity ?? 1;
                    ctx.fillStyle = el.background || '#3b82f6';
                    if (el.shapeVariant === 'circle') {
                        ctx.beginPath();
                        ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
                        ctx.fill();
                    } else {
                        const r = el.borderRadius || 0;
                        ctx.beginPath();
                        ctx.roundRect(px, py, pw, ph, r);
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                } else if (el.type === 'text' || el.type === 'sticky') {
                    const px = (el.x / 100) * rect.width;
                    const py = (el.y / 100) * rect.height;
                    const pw = (el.w / 100) * rect.width;
                    ctx.globalAlpha = el.opacity ?? 1;
                    if (el.type === 'sticky') {
                        ctx.fillStyle = el.background || '#fde68a';
                        ctx.fillRect(px, py, pw, (el.h / 100) * rect.height);
                    }
                    ctx.fillStyle = el.color || '#ffffff';
                    ctx.font = `${el.fontWeight || 'normal'} ${el.fontSize || 16}px sans-serif`;
                    ctx.fillText(el.text || '', px + 6, py + (el.fontSize || 16) + 4, pw - 12);
                    ctx.globalAlpha = 1;
                } else if (el.type === 'line' || el.type === 'arrow') {
                    const px = (el.x / 100) * rect.width;
                    const py = (el.y / 100) * rect.height;
                    const pw = (el.w / 100) * rect.width;
                    ctx.globalAlpha = el.opacity ?? 1;
                    ctx.strokeStyle = el.borderColor || '#3b82f6';
                    ctx.lineWidth = el.borderWidth || 3;
                    ctx.beginPath();
                    ctx.moveTo(px, py);
                    ctx.lineTo(px + pw, py);
                    ctx.stroke();
                    if (el.type === 'arrow') {
                        const aw = (el.borderWidth || 3) * 4;
                        ctx.fillStyle = el.borderColor || '#3b82f6';
                        ctx.beginPath();
                        ctx.moveTo(px + pw, py);
                        ctx.lineTo(px + pw - aw, py - aw / 2);
                        ctx.lineTo(px + pw - aw, py + aw / 2);
                        ctx.closePath();
                        ctx.fill();
                    }
                    ctx.globalAlpha = 1;
                } else if (el.type === 'draw' && el.linePoints?.length > 1) {
                    ctx.globalAlpha = el.opacity ?? 1;
                    ctx.strokeStyle = el.color || '#38bdf8';
                    ctx.lineWidth = el.borderWidth || 3;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    el.linePoints.forEach((pt, i) => {
                        const px2 = (pt.x / 100) * rect.width;
                        const py2 = (pt.y / 100) * rect.height;
                        if (i === 0) ctx.moveTo(px2, py2);
                        else ctx.lineTo(px2, py2);
                    });
                    ctx.stroke();
                    ctx.globalAlpha = 1;
                } else if (el.type === 'datacapture') {
                    const px = (el.x / 100) * rect.width;
                    const py = (el.y / 100) * rect.height;
                    const pw = (el.w / 100) * rect.width;
                    const ph = (el.h / 100) * rect.height;
                    const r = el.borderRadius || 6;

                    ctx.globalAlpha = el.opacity ?? 1;

                    // Draw outer box
                    ctx.fillStyle = el.background || '#f8fafc';
                    ctx.beginPath();
                    ctx.roundRect(px, py, pw, ph, r);
                    ctx.fill();

                    // Draw border
                    ctx.strokeStyle = el.borderColor || '#cbd5e1';
                    ctx.lineWidth = el.borderWidth || 1;
                    ctx.stroke();

                    // Draw text label
                    ctx.fillStyle = el.color || '#1e293b';
                    ctx.font = `600 ${el.fontSize || 12}px sans-serif`;
                    const labelText = (el.label || 'New Field') + (el.required ? ' *' : '');
                    ctx.fillText(labelText, px + 8, py + (el.fontSize || 12) + 8, pw - 16);

                    ctx.globalAlpha = 1;
                }
            }

            await Promise.all(imgPromises);

            const dataUrl = canvas.toDataURL('image/png');
            const newImages = [...(step.images || []), dataUrl];
            onChange(step.id, { ...step, canvasData: elements, images: newImages });
            alert('Canvas exported to step image gallery! (Switch to Image tab to view it)');
        } catch (err) {
            console.error('Canvas export failed:', err);
            alert('Export failed: ' + err.message);
        }
    };

    // ─── Keyboard shortcuts ──────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e) => {
            if (editingTextId) return;
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedId && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
                    deleteSelected();
                }
            }
            if (e.key === 'Escape') {
                setSelectedId(null);
                setEditingTextId(null);
                setActiveTool('select');
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedId, editingTextId]);

    // ─── Sorted elements (by zIndex) ─────────────────────────────────────────
    const sortedElements = [...elements].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

    // ─── Styles ──────────────────────────────────────────────────────────────
    const toolbarBtn = (active) => ({
        padding: '6px 10px',
        borderRadius: '8px',
        border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.12)',
        background: active ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.04)',
        color: active ? '#60a5fa' : 'rgba(255,255,255,0.75)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '0.72rem',
        fontWeight: 600,
        transition: 'all 0.15s',
        whiteSpace: 'nowrap'
    });

    const renderDrawPath = (el) => {
        if (!el.linePoints || el.linePoints.length < 2) return null;
        const pts = el.linePoints;
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return (
            <svg
                key={el.id}
                style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                    pointerEvents: 'none', zIndex: el.zIndex || 1, opacity: el.opacity ?? 1
                }}
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
            >
                <path
                    d={d}
                    fill="none"
                    stroke={el.color || '#38bdf8'}
                    strokeWidth={((el.borderWidth || 3) / 8)}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    };

    return (
        <div style={
            isFullscreen
                ? { position: 'fixed', inset: 0, zIndex: 9999, background: '#0b1220', display: 'flex', flexDirection: 'column', userSelect: 'none' }
                : { display: 'flex', flexDirection: 'column', height: '100%', userSelect: 'none' }
        }>

            {/* ── Top Toolbar ──────────────────────────────────────────────── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                background: 'rgba(15,23,42,0.9)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                flexWrap: 'wrap', flexShrink: 0
            }}>
                {/* Tool select */}
                <button style={toolbarBtn(activeTool === 'select')} onClick={() => setActiveTool('select')} title="Select (V)">
                    <MousePointer size={13} /> Select
                </button>

                <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.12)' }} />

                {/* Add Image */}
                <button style={toolbarBtn(activeTool === 'image')} onClick={() => fileInputRef.current?.click()} title="Add Image">
                    <Image size={13} /> Image
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />

                {/* Add Text */}
                <button style={toolbarBtn(activeTool === 'text')} onClick={() => addElement('text', { w: 28, h: 10 })} title="Add Text Box">
                    <Type size={13} /> Text
                </button>

                {/* Sticky Note */}
                <button style={toolbarBtn(false)} onClick={() => addElement('sticky', { w: 22, h: 16 })} title="Add Sticky Note">
                    <StickyNote size={13} /> Sticky
                </button>

                {/* Data Capture Field */}
                <button style={toolbarBtn(activeTool === 'datacapture')} onClick={() => addElement('datacapture', { w: 30, h: 12 })} title="Add Data Capture Field">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 2, border: '1px solid currentColor', fontSize: 10 }}>P</div> Data Field
                </button>

                {/* Shapes */}
                <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {[
                        { v: 'rect', Icon: Square, label: 'Rect' },
                        { v: 'circle', Icon: Circle, label: 'Circle' },
                        { v: 'triangle', Icon: Triangle, label: 'Triangle' },
                        { v: 'star', Icon: Star, label: 'Star' },
                        { v: 'hexagon', Icon: Hexagon, label: 'Hex' },
                    ].map(({ v, Icon, label }) => (
                        <button
                            key={v}
                            title={`Add ${label}`}
                            style={toolbarBtn(activeTool === 'shape' && shapeVariant === v)}
                            onClick={() => {
                                setShapeVariant(v);
                                setActiveTool('shape');
                                addElement('shape', { shapeVariant: v, w: 18, h: 14 });
                            }}
                        >
                            <Icon size={13} />
                        </button>
                    ))}
                </div>

                {/* Line & Arrow */}
                <button style={toolbarBtn(false)} onClick={() => addElement('line', { w: 30, h: 2, shapeVariant: 'line' })} title="Line">
                    <Minus size={13} /> Line
                </button>
                <button style={toolbarBtn(false)} onClick={() => addElement('arrow', { w: 30, h: 8, shapeVariant: 'arrow' })} title="Arrow">
                    <ArrowRight size={13} /> Arrow
                </button>

                {/* Freehand Draw */}
                <button style={toolbarBtn(activeTool === 'draw')} onClick={() => { setActiveTool('draw'); setSelectedId(null); }} title="Freehand Draw">
                    <Pencil size={13} /> Draw
                </button>

                <div style={{ flex: 1 }} />

                {/* Zoom */}
                <button style={toolbarBtn(false)} onClick={() => setZoom(z => Math.min(2, z + 0.1))} title="Zoom In">
                    <ZoomIn size={13} />
                </button>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem' }}>{Math.round(zoom * 100)}%</span>
                <button style={toolbarBtn(false)} onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} title="Zoom Out">
                    <ZoomOut size={13} />
                </button>

                {/* Canvas BG */}
                <label title="Canvas Background" style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                    <Palette size={13} />
                    <input type="color" value={canvasBg} onChange={e => setCanvasBg(e.target.value)}
                        style={{ width: 22, height: 20, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }} />
                </label>

                {/* Layers */}
                <button style={toolbarBtn(showLayers)} onClick={() => setShowLayers(s => !s)} title="Layers">
                    <Layers size={13} /> Layers
                </button>

                {/* Fullscreen Toggle */}
                <button
                    style={{ ...toolbarBtn(isFullscreen), marginBase: '0 4px' }}
                    onClick={() => setIsFullscreen(prev => !prev)}
                    title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}
                >
                    {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                </button>

                {/* Export */}
                <button
                    style={{ ...toolbarBtn(false), background: 'rgba(34,197,94,0.15)', color: '#4ade80', borderColor: 'rgba(34,197,94,0.3)' }}
                    onClick={handleExportToPng}
                    title="Export canvas to step image"
                >
                    <Download size={13} /> Export to Image
                </button>

                {/* Clear */}
                <button
                    style={{ ...toolbarBtn(false), background: 'rgba(239,68,68,0.12)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                    onClick={clearCanvas}
                    title="Clear all"
                >
                    <RotateCcw size={13} /> Clear
                </button>
            </div>

            {/* ── Main area ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

                {/* ── Canvas ────────────────────────────────────────────────── */}
                <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.35)', overflow: 'hidden', padding: '12px'
                }}>
                    <div
                        ref={canvasRef}
                        data-canvas-bg="true"
                        style={{
                            width: `${Math.min(100, 85 * zoom)}%`,
                            aspectRatio: '16/9',
                            backgroundColor: canvasBg,
                            position: 'relative',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
                            cursor: activeTool === 'draw' ? 'crosshair' : activeTool !== 'select' ? 'crosshair' : 'default',
                            flexShrink: 0
                        }}
                        onClick={handleCanvasClick}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    >
                        {/* Draw temp line path */}
                        {isDrawing && drawing && renderDrawPath(drawing)}

                        {sortedElements.map(el => {
                            if (el.type === 'draw') return renderDrawPath(el);

                            const isSelected = el.id === selectedId;
                            const isEditingText = el.id === editingTextId;

                            const elStyle = {
                                position: 'absolute',
                                left: `${el.x}%`,
                                top: `${el.y}%`,
                                width: `${el.w}%`,
                                height: el.type === 'line' ? `${el.borderWidth || 3}px` : `${el.h}%`,
                                zIndex: el.zIndex || 1,
                                opacity: el.opacity ?? 1,
                                cursor: el.locked ? 'not-allowed' : 'move',
                                outline: isSelected ? '2px solid #3b82f6' : 'none',
                                outlineOffset: '2px',
                                boxSizing: 'border-box',
                                transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                            };

                            return (
                                <div
                                    key={el.id}
                                    style={elStyle}
                                    onMouseDown={(e) => handleMouseDown(e, el.id)}
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                                    onDoubleClick={() => {
                                        if (el.type === 'text' || el.type === 'sticky') {
                                            setEditingTextId(el.id);
                                            setTimeout(() => textEditRef.current?.focus(), 50);
                                        }
                                    }}
                                >
                                    {/* Render by type */}
                                    {el.type === 'image' && (
                                        <img
                                            src={el.imageUrl}
                                            alt=""
                                            draggable={false}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', pointerEvents: 'none' }}
                                        />
                                    )}

                                    {el.type === 'shape' && <ShapeRenderer el={el} />}

                                    {el.type === 'line' && (
                                        <div style={{ width: '100%', height: `${el.borderWidth || 3}px`, background: el.borderColor || '#3b82f6', borderRadius: 2 }} />
                                    )}

                                    {el.type === 'arrow' && (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', position: 'relative' }}>
                                            <div style={{ flex: 1, height: `${el.borderWidth || 3}px`, background: el.borderColor || '#3b82f6' }} />
                                            <div style={{
                                                width: 0, height: 0,
                                                borderTop: `${(el.borderWidth || 3) * 2.5}px solid transparent`,
                                                borderBottom: `${(el.borderWidth || 3) * 2.5}px solid transparent`,
                                                borderLeft: `${(el.borderWidth || 3) * 4}px solid ${el.borderColor || '#3b82f6'}`
                                            }} />
                                        </div>
                                    )}

                                    {(el.type === 'text' || el.type === 'sticky') && (
                                        <div style={{
                                            width: '100%', height: '100%', padding: '6px 8px',
                                            background: el.background || 'transparent',
                                            borderRadius: el.type === 'sticky' ? '4px' : 0,
                                            border: '1px solid ' + (el.type === 'sticky' ? '#fbbf24' : 'transparent'),
                                            boxSizing: 'border-box', overflow: 'hidden'
                                        }}>
                                            {isEditingText ? (
                                                <textarea
                                                    ref={textEditRef}
                                                    value={el.text}
                                                    onChange={ev => updateElement(el.id, { text: ev.target.value })}
                                                    onBlur={() => setEditingTextId(null)}
                                                    style={{
                                                        width: '100%', height: '100%', resize: 'none', border: 'none',
                                                        background: 'transparent', outline: 'none',
                                                        color: el.color || '#fff', fontSize: `${el.fontSize || 16}px`,
                                                        fontWeight: el.fontWeight || 'normal',
                                                        fontStyle: el.fontStyle || 'normal',
                                                        textDecoration: el.textDecoration || 'none',
                                                        textAlign: el.textAlign || 'left',
                                                        lineHeight: 1.4, cursor: 'text',
                                                        wordBreak: 'break-word'
                                                    }}
                                                />
                                            ) : (
                                                <div style={{
                                                    color: el.color || '#fff', fontSize: `${el.fontSize || 16}px`,
                                                    fontWeight: el.fontWeight || 'normal',
                                                    fontStyle: el.fontStyle || 'normal',
                                                    textDecoration: el.textDecoration || 'none',
                                                    textAlign: el.textAlign || 'left',
                                                    lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                                    pointerEvents: 'none'
                                                }}>
                                                    {el.text || 'Double-click to edit'}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {el.type === 'datacapture' && (
                                        <div style={{
                                            width: '100%', height: '100%', padding: '8px',
                                            background: el.background || '#f8fafc',
                                            borderRadius: `${el.borderRadius || 6}px`,
                                            border: `${el.borderWidth || 1}px solid ${el.borderColor || '#cbd5e1'}`,
                                            boxSizing: 'border-box', overflow: 'hidden',
                                            display: 'flex', flexDirection: 'column', gap: 4,
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                        }}>
                                            <div style={{ fontSize: `${el.fontSize || 12}px`, fontWeight: '600', color: el.color || '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {el.label || 'New Field'} {el.required && <span style={{ color: '#ef4444' }}>*</span>}
                                            </div>

                                            {/* Preview input based on type */}
                                            <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 4, background: '#fff', padding: '0 6px', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '11px', pointerEvents: 'none' }}>
                                                {el.fieldType === 'text' && 'Text Input...'}
                                                {el.fieldType === 'number' && 'Number Input...'}
                                                {el.fieldType === 'textarea' && 'Long Text...'}
                                                {el.fieldType === 'select' && 'Dropdown / Select ▼'}
                                                {el.fieldType === 'radio' && 'Radio Buttons 🔘'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Resize handles (only when selected) */}
                                    {isSelected && !el.locked && el.type !== 'draw' && (
                                        <>
                                            {['nw', 'ne', 'sw', 'se'].map(handle => (
                                                <div
                                                    key={handle}
                                                    onMouseDown={(e) => { e.stopPropagation(); handleResizeMouseDown(e, el.id, handle); }}
                                                    style={{
                                                        position: 'absolute',
                                                        width: 10, height: 10, borderRadius: 2,
                                                        background: '#3b82f6', border: '2px solid #fff',
                                                        cursor: `${handle}-resize`,
                                                        zIndex: 9999,
                                                        top: handle.startsWith('n') ? -5 : 'auto',
                                                        bottom: handle.startsWith('s') ? -5 : 'auto',
                                                        left: handle.endsWith('w') ? -5 : 'auto',
                                                        right: handle.endsWith('e') ? -5 : 'auto',
                                                    }}
                                                />
                                            ))}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── Right Panels ──────────────────────────────────────────── */}
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0',
                    width: '190px', flexShrink: 0,
                    borderLeft: '1px solid rgba(255,255,255,0.07)',
                    background: 'rgba(10,15,26,0.95)', overflowY: 'auto'
                }}>

                    {/* Selected element actions */}
                    {selectedEl && (
                        <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '8px' }}>
                                Element
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                <button style={{ ...toolbarBtn(false), padding: '4px 8px', fontSize: '0.68rem' }} onClick={duplicateSelected} title="Duplicate"><Copy size={12} /></button>
                                <button style={{ ...toolbarBtn(false), padding: '4px 8px', fontSize: '0.68rem' }} onClick={bringForward} title="Bring Forward"><ChevronUp size={12} /></button>
                                <button style={{ ...toolbarBtn(false), padding: '4px 8px', fontSize: '0.68rem' }} onClick={sendBackward} title="Send Backward"><ChevronDown size={12} /></button>
                                <button
                                    style={{ ...toolbarBtn(false), padding: '4px 8px', fontSize: '0.68rem', background: 'rgba(239,68,68,0.15)', color: '#f87171', borderColor: 'rgba(239,68,68,0.3)' }}
                                    onClick={deleteSelected}
                                    title="Delete"
                                ><Trash2 size={12} /></button>
                            </div>
                        </div>
                    )}

                    {/* Properties panel */}
                    {showProps && selectedEl && (
                        <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                Properties
                            </div>

                            {/* Opacity */}
                            <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                Opacity: {Math.round((selectedEl.opacity ?? 1) * 100)}%
                                <input type="range" min={0} max={1} step={0.05}
                                    value={selectedEl.opacity ?? 1}
                                    onChange={e => updateElement(selectedId, { opacity: parseFloat(e.target.value) })}
                                    style={{ width: '100%', marginTop: 2 }}
                                />
                            </label>

                            {/* Text-specific props */}
                            {(selectedEl.type === 'text' || selectedEl.type === 'sticky') && (
                                <>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Font Size: {selectedEl.fontSize || 16}px
                                        <input type="range" min={8} max={72} step={1}
                                            value={selectedEl.fontSize || 16}
                                            onChange={e => updateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button style={toolbarBtn(selectedEl.fontWeight === 'bold')} onClick={() => updateElement(selectedId, { fontWeight: selectedEl.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold size={12} /></button>
                                        <button style={toolbarBtn(selectedEl.fontStyle === 'italic')} onClick={() => updateElement(selectedId, { fontStyle: selectedEl.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={12} /></button>
                                        <button style={toolbarBtn(selectedEl.textDecoration === 'underline')} onClick={() => updateElement(selectedId, { textDecoration: selectedEl.textDecoration === 'underline' ? 'none' : 'underline' })}><Underline size={12} /></button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        {['left', 'center', 'right'].map(a => (
                                            <button key={a} style={toolbarBtn(selectedEl.textAlign === a)}
                                                onClick={() => updateElement(selectedId, { textAlign: a })}>
                                                {a === 'left' ? <AlignLeft size={12} /> : a === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                                            </button>
                                        ))}
                                    </div>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Text Color
                                        <input type="color" value={selectedEl.color || '#ffffff'}
                                            onChange={e => updateElement(selectedId, { color: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        BG Color
                                        <input type="color" value={selectedEl.background || '#000000'}
                                            onChange={e => updateElement(selectedId, { background: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                </>
                            )}

                            {/* Shape-specific props */}
                            {selectedEl.type === 'shape' && (
                                <>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Fill Color
                                        <input type="color" value={selectedEl.background || '#3b82f6'}
                                            onChange={e => updateElement(selectedId, { background: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Border Color
                                        <input type="color" value={selectedEl.borderColor || '#60a5fa'}
                                            onChange={e => updateElement(selectedId, { borderColor: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Border: {selectedEl.borderWidth || 2}px
                                        <input type="range" min={0} max={12} step={1}
                                            value={selectedEl.borderWidth || 2}
                                            onChange={e => updateElement(selectedId, { borderWidth: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Radius: {selectedEl.borderRadius || 0}px
                                        <input type="range" min={0} max={50} step={1}
                                            value={selectedEl.borderRadius || 0}
                                            onChange={e => updateElement(selectedId, { borderRadius: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                </>
                            )}

                            {/* Draw stroke */}
                            {selectedEl.type === 'draw' && (
                                <>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Color
                                        <input type="color" value={selectedEl.color || '#38bdf8'}
                                            onChange={e => updateElement(selectedId, { color: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Stroke: {selectedEl.borderWidth || 3}px
                                        <input type="range" min={1} max={20} step={1}
                                            value={selectedEl.borderWidth || 3}
                                            onChange={e => updateElement(selectedId, { borderWidth: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                </>
                            )}

                            {/* Line/Arrow color */}
                            {(selectedEl.type === 'line' || selectedEl.type === 'arrow') && (
                                <>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        Color
                                        <input type="color" value={selectedEl.borderColor || '#3b82f6'}
                                            onChange={e => updateElement(selectedId, { borderColor: e.target.value })}
                                            style={{ width: 30, height: 22, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                                    </label>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Thickness: {selectedEl.borderWidth || 3}px
                                        <input type="range" min={1} max={16} step={1}
                                            value={selectedEl.borderWidth || 3}
                                            onChange={e => updateElement(selectedId, { borderWidth: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                </>
                            )}

                            {/* Data Capture specific props */}
                            {selectedEl.type === 'datacapture' && (
                                <>
                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Field Label
                                        <input type="text" value={selectedEl.label || ''}
                                            onChange={e => updateElement(selectedId, { label: e.target.value })}
                                            style={{ width: '100%', marginTop: 2, padding: '4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                                        />
                                    </label>

                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Input Type
                                        <select
                                            value={selectedEl.fieldType || 'text'}
                                            onChange={e => updateElement(selectedId, { fieldType: e.target.value })}
                                            style={{ width: '100%', marginTop: 2, padding: '4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                                        >
                                            <option value="text">Short Text</option>
                                            <option value="textarea">Long Text</option>
                                            <option value="number">Numeric</option>
                                            <option value="select">Dropdown (Select)</option>
                                            <option value="radio">Multiple Choice (Radio)</option>
                                        </select>
                                    </label>

                                    {(selectedEl.fieldType === 'select' || selectedEl.fieldType === 'radio') && (
                                        <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                            Options (comma separated)
                                            <input type="text"
                                                value={(selectedEl.options || []).join(', ')}
                                                onChange={e => {
                                                    const newOpts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                                                    updateElement(selectedId, { options: newOpts.length > 0 ? newOpts : ['Option 1'] });
                                                }}
                                                style={{ width: '100%', marginTop: 2, padding: '4px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.2)', color: '#fff' }}
                                            />
                                        </label>
                                    )}

                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                                        <input type="checkbox" checked={!!selectedEl.required} onChange={e => updateElement(selectedId, { required: e.target.checked })} />
                                        Required field
                                    </label>

                                    <label style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>
                                        Label Font Size: {selectedEl.fontSize || 12}px
                                        <input type="range" min={8} max={36} step={1}
                                            value={selectedEl.fontSize || 12}
                                            onChange={e => updateElement(selectedId, { fontSize: parseInt(e.target.value) })}
                                            style={{ width: '100%', marginTop: 2 }}
                                        />
                                    </label>
                                </>
                            )}

                            {/* Lock */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={!!selectedEl.locked} onChange={e => updateElement(selectedId, { locked: e.target.checked })} />
                                Lock element
                            </label>
                        </div>
                    )}

                    {/* Layers Panel */}
                    {showLayers && (
                        <div style={{ padding: '10px', flex: 1, overflowY: 'auto' }}>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '8px' }}>
                                Layers ({elements.length})
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {[...elements].reverse().map((el, i) => (
                                    <div
                                        key={el.id}
                                        onClick={() => setSelectedId(el.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '5px 7px', borderRadius: '6px', cursor: 'pointer',
                                            background: el.id === selectedId ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.03)',
                                            border: el.id === selectedId ? '1px solid rgba(59,130,246,0.4)' : '1px solid transparent',
                                            transition: 'all 0.12s'
                                        }}
                                    >
                                        <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', width: 14 }}>
                                            {elements.length - i}
                                        </span>
                                        <span style={{ flex: 1, fontSize: '0.7rem', color: el.id === selectedId ? '#93c5fd' : 'rgba(255,255,255,0.7)', textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {el.type === 'text' || el.type === 'sticky' ? (el.text?.slice(0, 18) || el.type) : el.type}
                                        </span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setElements(prev => prev.filter(x => x.id !== el.id)); if (selectedId === el.id) setSelectedId(null); }}
                                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                                        >
                                            <X size={11} />
                                        </button>
                                    </div>
                                ))}
                                {elements.length === 0 && (
                                    <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
                                        No elements yet.<br />Add something from the toolbar.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CanvasEditor;
