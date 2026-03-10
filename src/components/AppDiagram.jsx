import React, { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MarkerType,
    Handle,
    Position
} from 'reactflow';
import 'reactflow/dist/style.css';

const StepNode = ({ data }) => {
    return (
        <div style={{
            padding: '15px 25px',
            borderRadius: '12px',
            background: data.isSelected ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${data.isSelected ? '#60a5fa' : 'rgba(255,255,255,0.1)'}`,
            color: '#fff',
            minWidth: '180px',
            textAlign: 'center',
            boxShadow: data.isSelected ? '0 10px 25px rgba(59, 130, 246, 0.3)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}>
            <Handle type="target" position={Position.Top} style={{ background: '#3b82f6' }} />
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>Step</div>
            <div style={{ fontWeight: 'bold' }}>{data.label}</div>
            <Handle type="source" position={Position.Bottom} style={{ background: '#3b82f6' }} />
        </div>
    );
};

const nodeTypes = {
    step: StepNode
};

const AppDiagram = ({ steps, currentStepId, onSelectStep }) => {
    const { nodes, edges } = useMemo(() => {
        const nodes = steps.map((step, index) => ({
            id: step.id,
            type: 'step',
            data: {
                label: step.title,
                isSelected: step.id === currentStepId
            },
            position: { x: 250, y: index * 150 }, // Simple vertical layout
        }));

        const edges = [];
        steps.forEach((step, index) => {
            // Find transitions in this step
            step.components.forEach(comp => {
                if (comp.type === 'BUTTON') {
                    const action = comp.props.action;
                    let targetId = null;

                    if (action === 'NEXT_STEP' && index < steps.length - 1) {
                        targetId = steps[index + 1].id;
                    } else if (action === 'PREV_STEP' && index > 0) {
                        targetId = steps[index - 1].id;
                    } else if (action === 'GO_TO_STEP') {
                        targetId = comp.props.targetStepId;
                    }

                    if (targetId) {
                        edges.push({
                            id: `e-${step.id}-${targetId}-${comp.id}`,
                            source: step.id,
                            target: targetId,
                            label: comp.props.label,
                            animated: true,
                            style: { stroke: '#3b82f6' },
                            markerEnd: {
                                type: MarkerType.ArrowClosed,
                                color: '#3b82f6',
                            },
                        });
                    }
                }
            });
        });

        return { nodes, edges };
    }, [steps, currentStepId]);

    const onNodeClick = (event, node) => {
        onSelectStep(node.id);
    };

    return (
        <div style={{ width: '100%', height: '100%', backgroundColor: '#030305' }}>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodeClick={onNodeClick}
                fitView
            >
                <Background color="rgba(255,255,255,0.05)" gap={20} />
                <Controls />
            </ReactFlow>
        </div>
    );
};

export default AppDiagram;
