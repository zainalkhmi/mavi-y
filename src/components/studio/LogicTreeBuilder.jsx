import React from 'react';
import { Trash2, Plus } from 'lucide-react';

const LogicTreeBuilder = ({ tree, rules, onUpdate, checkRuleStatus }) => {
    // Helper to evaluate node status for visualization
    const evaluateNode = (node) => {
        if (!checkRuleStatus || !node) return null;

        if (node.type === 'RULE') {
            const rule = rules.find(r => r.id === node.ruleId);
            if (!rule) return false;
            const status = checkRuleStatus(rule);
            return node.negate ? !status : status;
        }

        if (node.type === 'GROUP') {
            if (!node.children || node.children.length === 0) return false;

            const results = node.children.map(evaluateNode);
            let groupResult = false;

            switch (node.operator) {
                case 'AND': groupResult = results.every(r => r === true); break;
                case 'OR': groupResult = results.some(r => r === true); break;
                case 'XOR': groupResult = results.filter(r => r === true).length === 1; break;
                case 'NAND': groupResult = !results.every(r => r === true); break;
                case 'NOR': groupResult = !results.some(r => r === true); break;
                default: groupResult = false;
            }
            return node.negate ? !groupResult : groupResult;
        }
        return false;
    };

    // Update node at specific path
    const updateNode = (path, updates) => {
        const newTree = JSON.parse(JSON.stringify(tree)); // Deep clone
        let current = newTree;

        // Navigate to parent
        for (let i = 0; i < path.length - 1; i++) {
            current = current.children[path[i]];
        }

        // Update the target node
        if (path.length === 0) {
            Object.assign(newTree, updates);
        } else {
            const lastIndex = path[path.length - 1];
            Object.assign(current.children[lastIndex], updates);
        }

        onUpdate(newTree);
    };

    // Toggle negate on node
    const toggleNegate = (path) => {
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;

        for (let i = 0; i < path.length; i++) {
            if (i === path.length - 1) {
                current.children[path[i]].negate = !current.children[path[i]].negate;
            } else {
                current = current.children[path[i]];
            }
        }

        if (path.length === 0) {
            newTree.negate = !newTree.negate;
        }

        onUpdate(newTree);
    };

    // Update operator
    const updateOperator = (path, operator) => {
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;

        for (let i = 0; i < path.length; i++) {
            if (i === path.length - 1) {
                current.children[path[i]].operator = operator;
            } else {
                current = current.children[path[i]];
            }
        }

        if (path.length === 0) {
            newTree.operator = operator;
        }

        onUpdate(newTree);
    };

    // Add child to group
    const addChild = (path, type) => {
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;

        for (let i = 0; i < path.length; i++) {
            current = current.children[path[i]];
        }

        const newChild = type === 'GROUP'
            ? { type: 'GROUP', operator: 'AND', negate: false, children: [] }
            : { type: 'RULE', ruleId: rules[0]?.id || '', negate: false };

        if (path.length === 0) {
            newTree.children.push(newChild);
        } else {
            current.children.push(newChild);
        }

        onUpdate(newTree);
    };

    // Delete node
    const deleteNode = (path) => {
        if (path.length === 0) return; // Can't delete root

        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;

        for (let i = 0; i < path.length - 1; i++) {
            current = current.children[path[i]];
        }

        current.children.splice(path[path.length - 1], 1);
        onUpdate(newTree);
    };

    // Update rule selection
    const updateRuleId = (path, ruleId) => {
        const newTree = JSON.parse(JSON.stringify(tree));
        let current = newTree;

        for (let i = 0; i < path.length - 1; i++) {
            current = current.children[path[i]];
        }

        current.children[path[path.length - 1]].ruleId = ruleId;
        onUpdate(newTree);
    };

    // Render node recursively
    const renderNode = (node, path = []) => {
        const isPassing = evaluateNode(node);
        // Only apply style if checkRuleStatus is provided (meaning we are in live mode)
        const statusColor = checkRuleStatus ? (isPassing ? '#10b981' : '#ef4444') : null;
        const borderColor = statusColor || (node.type === 'GROUP' ? '#6366f1' : '#0ea5e9'); // Default or Status
        const borderWidth = statusColor ? '3px' : '2px';
        const opacity = (checkRuleStatus && !isPassing) ? 0.7 : 1;

        if (node.type === 'RULE') {
            const rule = rules.find(r => r.id === node.ruleId);
            const ruleIndex = rules.indexOf(rule) + 1;

            return (
                <div style={{ ...styles.ruleNode, border: `${borderWidth} solid ${statusColor || 'transparent'}`, opacity }}>
                    {node.negate && <span style={styles.notBadge}>NOT</span>}
                    <select
                        value={node.ruleId}
                        onChange={(e) => updateRuleId(path, e.target.value)}
                        style={styles.ruleSelect}
                    >
                        {rules.map((r, idx) => (
                            <option key={r.id} value={r.id}>
                                Rule #{idx + 1} ({r.type}) {checkRuleStatus && (checkRuleStatus(r) ? '✅' : '❌')}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => toggleNegate(path)}
                        style={{
                            ...styles.smallButton,
                            background: node.negate ? '#ef4444' : '#374151'
                        }}
                        title="Toggle NOT"
                    >
                        NOT
                    </button>
                    {path.length > 0 && (
                        <button
                            onClick={() => deleteNode(path)}
                            style={{ ...styles.smallButton, background: '#7f1d1d' }}
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                </div>
            );
        }

        if (node.type === 'GROUP') {
            return (
                <div style={{ ...styles.groupNode, border: `${borderWidth} solid ${borderColor}`, opacity }}>
                    <div style={styles.groupHeader}>
                        {node.negate && <span style={styles.notBadge}>NOT</span>}
                        <select
                            value={node.operator}
                            onChange={(e) => updateOperator(path, e.target.value)}
                            style={styles.operatorSelect}
                        >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                            <option value="XOR">XOR</option>
                            <option value="NAND">NAND</option>
                            <option value="NOR">NOR</option>
                        </select>
                        <button
                            onClick={() => toggleNegate(path)}
                            style={{
                                ...styles.smallButton,
                                background: node.negate ? '#ef4444' : '#374151'
                            }}
                            title="Toggle NOT"
                        >
                            NOT
                        </button>
                        {path.length > 0 && (
                            <button
                                onClick={() => deleteNode(path)}
                                style={{ ...styles.smallButton, background: '#7f1d1d' }}
                                title="Delete Group"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        {checkRuleStatus && (
                            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: isPassing ? '#10b981' : '#f87171', fontWeight: 'bold' }}>
                                {isPassing ? 'TRUE' : 'FALSE'}
                            </span>
                        )}
                    </div>

                    <div style={styles.groupChildren}>
                        {node.children && node.children.length > 0 ? (
                            node.children.map((child, idx) => (
                                <div key={idx} style={styles.childWrapper}>
                                    {renderNode(child, [...path, idx])}
                                    {idx < node.children.length - 1 && (
                                        <div style={{ ...styles.operatorLabel, color: isPassing ? '#10b981' : '#a78bfa' }}>
                                            {node.operator}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div style={styles.emptyGroup}>Empty group - add rules or groups below</div>
                        )}
                    </div>

                    <div style={styles.addButtons}>
                        <button
                            onClick={() => addChild(path, 'RULE')}
                            style={styles.addButton}
                        >
                            <Plus size={14} /> Add Rule
                        </button>
                        <button
                            onClick={() => addChild(path, 'GROUP')}
                            style={styles.addButton}
                        >
                            <Plus size={14} /> Add Group
                        </button>
                    </div>
                </div>
            );
        }

        return null;
    };

    return (
        <div style={styles.treeBuilder}>
            <div style={styles.header}>
                <span style={styles.headerTitle}>🌳 Logic Tree Builder</span>
                <span style={styles.headerHint}>Build complex conditions with nested groups</span>
            </div>
            {renderNode(tree)}
        </div>
    );
};

const styles = {
    treeBuilder: {
        padding: '16px',
        background: '#0f0f0f',
        borderRadius: '8px',
        border: '2px solid #8b5cf6',
        marginTop: '12px'
    },
    header: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #374151'
    },
    headerTitle: {
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: '#a78bfa'
    },
    headerHint: {
        fontSize: '0.7rem',
        color: '#9ca3af'
    },
    groupNode: {
        padding: '12px',
        background: '#111827',
        borderRadius: '6px',
        marginBottom: '8px',
        transition: 'all 0.3s ease'
    },
    groupHeader: {
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '12px',
        padding: '8px',
        background: '#1f2937',
        borderRadius: '4px',
        flexWrap: 'wrap'
    },
    groupChildren: {
        marginLeft: '16px',
        paddingLeft: '16px',
        borderLeft: '2px solid #4b5563',
        minHeight: '40px'
    },
    childWrapper: {
        marginBottom: '8px'
    },
    emptyGroup: {
        padding: '12px',
        color: '#6b7280',
        fontSize: '0.8rem',
        fontStyle: 'italic',
        textAlign: 'center'
    },
    ruleNode: {
        padding: '8px 12px',
        background: '#0ea5e9',
        borderRadius: '6px',
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        color: 'white',
        fontSize: '0.85rem',
        flexWrap: 'wrap',
        transition: 'all 0.3s ease'
    },
    notBadge: {
        padding: '2px 8px',
        background: '#ef4444',
        borderRadius: '4px',
        fontSize: '0.7rem',
        fontWeight: 'bold',
        color: 'white'
    },
    operatorLabel: {
        textAlign: 'center',
        color: '#a78bfa',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        margin: '4px 0',
        padding: '4px',
        background: '#1f2937',
        borderRadius: '4px'
    },
    operatorSelect: {
        padding: '6px 12px',
        background: '#1f2937',
        border: '1px solid #4b5563',
        borderRadius: '4px',
        color: '#a78bfa',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        cursor: 'pointer'
    },
    ruleSelect: {
        padding: '6px 12px',
        background: '#075985',
        border: '1px solid #0284c7',
        borderRadius: '4px',
        color: 'white',
        fontSize: '0.85rem',
        cursor: 'pointer',
        flex: 1,
        minWidth: '200px'
    },
    smallButton: {
        padding: '4px 8px',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontSize: '0.7rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 'bold'
    },
    addButtons: {
        display: 'flex',
        gap: '8px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #374151'
    },
    addButton: {
        padding: '6px 12px',
        background: '#059669',
        border: '1px solid #4b5563',
        borderRadius: '4px',
        color: 'white',
        fontSize: '0.75rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        fontWeight: 'bold'
    }
};

export default LogicTreeBuilder;
