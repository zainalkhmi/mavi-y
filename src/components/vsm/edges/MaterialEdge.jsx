import React from 'react';
import { getSmoothStepPath, BaseEdge } from 'reactflow';

export default function MaterialEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data
}) {
    const [edgePath] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const isPush = data?.materialType === 'push';

    const edgeStyle = isPush
        ? {
            ...style,
            stroke: '#ffffff',
            strokeWidth: 6,
            strokeDasharray: '10 5', // Striped appearance
        }
        : { ...style, stroke: '#ffffff', strokeWidth: 2 };

    const isSimulating = data?.simulating;
    const materialCategory = data?.materialCategory || 'wip'; // raw, wip, finished
    const isShortage = data?.isShortage;

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
            {isSimulating && (
                <div
                    className={`vsm-particle ${materialCategory} ${isShortage ? 'shortage' : ''}`}
                    style={{
                        offsetPath: `path('${edgePath}')`,
                        animation: `materialFlow ${isShortage ? 4 : 2}s linear infinite`
                    }}
                />
            )}
        </>
    );
}
