import React, { useMemo } from 'react';

const findNodeCenter = (node) => {
    const x = Number(node?.position?.x || 0);
    const y = Number(node?.position?.y || 0);
    const width = Number(node?.width || 160);
    const height = Number(node?.height || 70);
    return { x: x + (width / 2), y: y + (height / 2) };
};

const statusClass = (status) => {
    switch ((status || '').toLowerCase()) {
        case 'blocked': return 'kb-token-blocked';
        case 'overdue': return 'kb-token-overdue';
        case 'delivered': return 'kb-token-delivered';
        case 'consumed': return 'kb-token-consumed';
        case 'issued': return 'kb-token-issued';
        default: return 'kb-token-transit';
    }
};

const isInformationEdge = (edge) => {
    if (!edge) return false;
    return Boolean(
        edge?.data?.type === 'manual'
        || edge?.data?.type === 'electronic'
        || edge?.style?.strokeDasharray
    );
};

const isKanbanInfoEdge = (edge) => {
    if (!edge) return false;
    const symbolType = String(edge?.data?.symbolType || '').toLowerCase();
    const label = String(edge?.label || '').toLowerCase();
    if (symbolType === 'kanban_withdrawal' || symbolType === 'signal_kanban') return true;
    if (label.includes('kanban')) return true;
    return isInformationEdge(edge);
};

export default function KanbanAnimationLayer({ nodes = [], edges = [], events = [], enabled = true }) {
    const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
    const edgeMap = useMemo(() => new Map(edges.map((e) => [e.id, e])), [edges]);

    if (!enabled) return null;

    return (
        <div className="vsm-kanban-overlay-layer" aria-hidden>
            {events.map((evt) => {
                const directEdge = edgeMap.get(evt.edgeId);
                const candidateEdges = edges.filter((e) => e.source === evt.sourceNodeId && e.target === evt.targetNodeId);
                const kanbanInfoEdge = candidateEdges.find((e) => isKanbanInfoEdge(e));
                const infoEdge = candidateEdges.find((e) => isInformationEdge(e));
                const fallbackEdge = candidateEdges[0];
                const edge = directEdge || kanbanInfoEdge || infoEdge || fallbackEdge;

                if (!edge || !isKanbanInfoEdge(edge)) return null;

                const sourceNode = nodeMap.get(evt.sourceNodeId) || (edge ? nodeMap.get(edge.source) : null);
                const targetNode = nodeMap.get(evt.targetNodeId) || (edge ? nodeMap.get(edge.target) : null);
                if (!sourceNode || !targetNode) return null;

                const source = findNodeCenter(sourceNode);
                const target = findNodeCenter(targetNode);
                const p = Number(evt.progress ?? 0);
                const clamped = Math.max(0, Math.min(1, p));

                const x = source.x + ((target.x - source.x) * clamped);
                const y = source.y + ((target.y - source.y) * clamped);

                const typeClass = evt.type === 'withdrawal' ? 'kb-withdrawal' : 'kb-production';

                return (
                    <div
                        key={evt.id}
                        className={`vsm-kanban-token ${typeClass} ${statusClass(evt.status)}`}
                        style={{ transform: `translate(${x}px, ${y}px)` }}
                        title={`${evt.type || 'kanban'} • ${evt.status || 'in_transit'}`}
                    >
                        {evt.type === 'withdrawal' ? 'W' : 'P'}
                    </div>
                );
            })}
        </div>
    );
}
