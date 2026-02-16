import React, { useMemo, useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    MarkerType,
    ReactFlowProvider,
    Handle,
    Position,
    useNodesState,
    useEdgesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
    AlertTriangle, Zap, Layout, ArrowRightCircle,
    Factory, Truck, Box, User, ShoppingCart, Ship, Plane, Warehouse, HelpCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

// Icon mapping helper
const getNodeIcon = (symbolType) => {
    switch (symbolType) {
        case 'process': return <Factory size={24} />;
        case 'supplier': return <Warehouse size={24} />;
        case 'customer': return <User size={24} />;
        case 'inventory': return <Box size={24} />;
        case 'warehouse_receiving': return <Warehouse size={24} />;
        case 'truck': return <Truck size={24} />;
        case 'sea': return <Ship size={24} />;
        case 'air': return <Plane size={24} />;
        case 'supermarket': return <ShoppingCart size={24} />;
        case 'finished_goods': return <Box size={24} />;
        default: return <Zap size={24} />;
    }
};

// Custom High-Contrast Node for Better Readability
const ModernNode = ({ data }) => {
    const { t } = useLanguage();
    const isFailed = data.isFailed;
    const isBottleneck = data.isBottleneck;

    return (
        <div style={{
            padding: '10px 16px',
            borderRadius: '12px',
            background: isFailed ? 'rgba(211, 47, 47, 0.8)' : (isBottleneck ? 'rgba(245, 124, 0, 0.8)' : 'rgba(30, 40, 100, 0.8)'),
            border: `2px solid ${isFailed ? '#ff5252' : (isBottleneck ? '#ffb74d' : '#3f51b5')}`,
            boxShadow: isBottleneck || isFailed ? '0 0 15px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.3)',
            color: '#fff',
            minWidth: '140px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'Inter, sans-serif',
            position: 'relative',
            zIndex: 5,
            cursor: 'grab',
            backdropFilter: 'blur(8px)',
            transition: 'background 0.3s ease, border 0.3s ease'
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#555', opacity: 0 }} />

            {/* Subtitle / Type Tag */}
            <div style={{
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                letterSpacing: '0.5px'
            }}>
                {t('vsm.nodes.' + data.symbolType, data.symbolType || 'Node')}
            </div>

            {/* Icon */}
            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '6px',
                borderRadius: '8px',
                marginBottom: '2px'
            }}>
                {getNodeIcon(data.symbolType)}
            </div>

            {/* Main Label */}
            <div style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#fff',
                textAlign: 'center',
                textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }}>
                {data.name || data.label || 'Node'}
            </div>

            {/* Shortage indicator */}
            {data.shortage > 0 && (
                <div style={{
                    marginTop: '4px',
                    padding: '2px 8px',
                    background: 'rgba(0,0,0,0.4)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    color: '#ffc107',
                    border: '1px solid rgba(255, 193, 7, 0.5)'
                }}>
                    {t('vsm.supplyChain.shortage', 'Shortage')}: {data.shortage} pcs
                </div>
            )}

            <Handle type="source" position={Position.Bottom} style={{ background: '#555', opacity: 0 }} />
        </div>
    );
};

const nodeTypes = {
    default: ModernNode,
    generic: ModernNode,
    process: ModernNode,
    inventory: ModernNode
};

const ModernFlowVisualization = ({ nodes: initialNodes, edges: initialEdges, result, loading }) => {
    const { t } = useLanguage();

    // Keep React Flow type objects stable across renders
    const stableNodeTypes = useMemo(() => nodeTypes, []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const isInitialized = React.useRef(false);

    // Initial load of nodes and edges
    useEffect(() => {
        if (initialNodes.length > 0 && !isInitialized.current) {
            const styledNodes = initialNodes.map(node => ({
                ...node,
                type: 'generic',
                data: {
                    ...node.data,
                    isSimulating: true,
                    shortage: 0
                }
            }));
            setNodes(styledNodes);
            isInitialized.current = true;
        }
    }, [initialNodes, setNodes]);

    // Update data when result changes, without resetting positions
    useEffect(() => {
        if (!result) return;

        const nodeStatus = result?.nodeStatus || {};

        setNodes(nds => nds.map(node => {
            const status = nodeStatus[node.id];
            const isBottleneck = status?.shortage > 0 || (parseInt(node.data?.utilization) > 90);
            const isFailed = result?.success === false && result?.rootCause?.includes(node.data?.label);

            return {
                ...node,
                data: {
                    ...node.data,
                    isBottleneck,
                    isFailed,
                    shortage: status?.shortage || 0,
                }
            };
        }));

        const isSuccessful = !!(result?.success);
        const styledEdges = initialEdges.map(edge => ({
            ...edge,
            animated: isSuccessful,
            style: {
                stroke: isSuccessful ? '#4caf50' : '#757575',
                strokeWidth: 3,
                filter: isSuccessful ? 'drop-shadow(0 0 5px rgba(76, 175, 80, 0.4))' : 'none'
            },
            markerEnd: {
                type: MarkerType.ArrowClosed,
                color: isSuccessful ? '#4caf50' : '#9e9e9e',
            }
        }));
        setEdges(styledEdges);
    }, [result, initialEdges, setNodes, setEdges]);

    const handleAutoLayout = useCallback(() => {
        setNodes((nds) => {
            // Very simple horizontal spacing layout to resolve overlap
            return nds.map((node, index) => {
                // If they are all at 0 (unpositioned) or overlapping, space them out
                return {
                    ...node,
                    position: {
                        x: (node.position.x === 0 && index > 0) ? index * 250 : node.position.x,
                        y: node.position.y
                    }
                };
            });
        });
    }, [setNodes]);

    return (
        <div style={{
            height: '600px',
            width: '100%',
            position: 'relative',
            background: '#0a0a0a',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid #222',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
        }}>
            <ReactFlowProvider>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    nodeTypes={stableNodeTypes}
                    fitView
                    nodesDraggable={true}
                    nodesConnectable={false}
                    elementsSelectable={true}
                >
                    <Background color="#1a1a1a" gap={25} size={1} />
                    <Controls />
                </ReactFlow>
            </ReactFlowProvider>

            {/* Overlay Widgets */}
            <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '260px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <button
                    onClick={handleAutoLayout}
                    style={{
                        padding: '12px',
                        background: 'rgba(33, 150, 243, 0.2)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid #2196f3',
                        borderRadius: '12px',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        fontWeight: 'bold',
                        transition: 'all 0.2s',
                        marginBottom: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(33, 150, 243, 0.4)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(33, 150, 243, 0.2)'}
                >
                    <Layout size={18} />
                    {t('vsm.supplyChain.autoTidy') || 'Auto-Tidy Nodes'}
                </button>

                {/* Status Card */}
                <div style={{
                    padding: '20px',
                    background: 'rgba(20, 20, 20, 0.95)',
                    borderRadius: '14px',
                    border: `2px solid ${result?.success ? '#4caf50' : (result ? '#ff4444' : '#333')}`,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Zap size={22} color={result ? (result.success ? '#4caf50' : '#ff4444') : '#aaa'} />
                        <span style={{ fontSize: '0.85rem', color: '#888', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {t('vsm.supplyChain.liveStatus') || 'LIVE STATUS'}
                        </span>
                    </div>
                    <div style={{
                        fontSize: '1.2rem',
                        fontWeight: '900',
                        color: result ? (result.success ? '#4caf50' : '#ff4444') : '#666'
                    }}>
                        {result
                            ? (result.success ? t('vsm.supplyChain.flowOptimized') || 'Flow Optimized' : t('vsm.supplyChain.shortageDetected') || 'Shortage Detected')
                            : t('vsm.supplyChain.idle') || 'Standby'}
                    </div>
                </div>

                {/* Legend Card */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(20, 20, 20, 0.95)',
                    borderRadius: '14px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontSize: '0.9rem'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(60, 80, 150, 0.5)', border: '1px solid #3f51b5' }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{t('vsm.supplyChain.healthyFlow', 'Healthy Flow')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(200, 120, 20, 0.6)', border: '1px solid #ffb74d' }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{t('vsm.supplyChain.bottleneck', 'Bottleneck')}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'rgba(180, 50, 50, 0.6)', border: '1px solid #ff5252' }} />
                            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>{t('vsm.supplyChain.shortage', 'Shortage')}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Insight Panel */}
            {result?.rootCause && (
                <div style={{
                    position: 'absolute',
                    bottom: '30px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    padding: '10px 24px',
                    background: 'rgba(183, 28, 28, 0.8)',
                    borderRadius: '30px',
                    border: '1px solid rgba(255, 82, 82, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <AlertTriangle size={18} color="#fff" />
                    <span>{t('vsm.supplyChain.issue', 'Issue')}: {result.rootCause}</span>
                </div>
            )}
        </div>
    );
};

export default ModernFlowVisualization;
