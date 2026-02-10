import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ArrowRight, Check, Activity, MousePointer2, Copy, Video, Target, Info } from 'lucide-react';
import { RULE_TYPES, JOINTS } from '../../utils/studio/ModelBuilderEngine';
import { getDetectableClasses } from '../../utils/objectDetector';
import JointSelector from './JointSelector';
import ScriptAutoComplete from './ScriptAutoComplete';
import { Sparkles, Loader2 } from 'lucide-react';

const OPERATORS = [
    { value: '<', label: '<' },
    { value: '>', label: '>' },
    { value: '<=', label: '<=' },
    { value: '>=', label: '>=' },
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'BETWEEN', label: 'Between' }
];

const evaluateComparison = (val, operator, target, target2 = null) => {
    if (val === null || val === undefined) return null;
    switch (operator) {
        case '>': return val > target;
        case '<': return val < target;
        case '>=': return val >= target;
        case '<=': return val <= target;
        case '=': return Math.abs(val - target) < 0.05;
        case '!=': return Math.abs(val - target) >= 0.05;
        case 'BETWEEN': return val >= target && val <= (target2 !== null ? target2 : target);
        default: return false;
    }
};

const RuleEditor = ({ states, transitions, onAddTransition, onDeleteTransition, onUpdateTransition, activePose, onAiSuggest, onAiValidateScript, tmModels = [], rfModels = [], selectedStateId, onSelectState, onCaptureSequence, captureBufferStatus }) => {
    const [fromState, setFromState] = useState('');
    const [toState, setToState] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [selectorTarget, setSelectorTarget] = useState(null); // { transitionId, ruleId, field }
    const [aiLoading, setAiLoading] = useState({}); // { transitionId: boolean }

    const handleAiSuggest = async (transitionId) => {
        if (!onAiSuggest) return;
        setAiLoading(prev => ({ ...prev, [transitionId]: true }));
        try {
            await onAiSuggest(transitionId);
        } finally {
            setAiLoading(prev => ({ ...prev, [transitionId]: false }));
        }
    };

    const handleCreateTransition = () => {
        if (fromState && toState) {
            onAddTransition(fromState, toState);
            setFromState('');
            setToState('');
        }
    };

    const handleAddRule = (transitionId) => {
        const transition = transitions.find(t => t.id === transitionId);
        if (!transition) return;

        const newRule = {
            id: `rule_${Date.now()}`,
            type: 'POSE_ANGLE',
            params: {
                jointA: 'right_shoulder',
                jointB: 'right_elbow',
                jointC: 'right_wrist',
                operator: '<',
                value: 90
            }
        };

        const updatedCondition = {
            ...transition.condition,
            rules: [...transition.condition.rules, newRule]
        };

        onUpdateTransition(transitionId, { condition: updatedCondition });
    };

    const handleUpdateRule = (transitionId, ruleId, updates) => {
        const transition = transitions.find(t => t.id === transitionId);
        if (!transition) return;

        const updatedRules = transition.condition.rules.map(r =>
            r.id === ruleId ? { ...r, ...updates } : r
        );

        onUpdateTransition(transitionId, {
            condition: { ...transition.condition, rules: updatedRules }
        });
    };

    const handleDeleteRule = (transitionId, ruleId) => {
        const transition = transitions.find(t => t.id === transitionId);
        if (!transition) return;

        const updatedRules = transition.condition.rules.filter(r => r.id !== ruleId);

        onUpdateTransition(transitionId, {
            condition: { ...transition.condition, rules: updatedRules }
        });
    };

    const handleDuplicateRule = (transitionId, ruleId) => {
        const transition = transitions.find(t => t.id === transitionId);
        if (!transition) return;

        const ruleToCopy = transition.condition.rules.find(r => r.id === ruleId);
        if (!ruleToCopy) return;

        const newRule = {
            ...ruleToCopy,
            id: `rule_${Date.now()}`
        };

        const updatedCondition = {
            ...transition.condition,
            rules: [...transition.condition.rules, newRule]
        };

        onUpdateTransition(transitionId, { condition: updatedCondition });
    };

    const openJointSelector = (transitionId, ruleId, field) => {
        setSelectorTarget({ transitionId, ruleId, field });
        setShowSelector(true);
    };

    const handleJointSelection = (jointId) => {
        if (selectorTarget) {
            const { transitionId, ruleId, field } = selectorTarget;
            const transition = transitions.find(t => t.id === transitionId);
            const rule = transition.condition.rules.find(r => r.id === ruleId);

            handleUpdateRule(transitionId, ruleId, {
                params: { ...rule.params, [field]: jointId }
            });
        }
        setShowSelector(false);
    };

    // Helper to calculate raw value for a rule
    const calculateRuleValue = (rule) => {
        if (!activePose || !activePose.keypoints) return null;
        const getKP = (name) => activePose.keypoints.find(k => k.name === name);
        const params = rule.params;

        try {
            switch (rule.type) {
                case 'POSE_ANGLE': {
                    const a = getKP(params.jointA);
                    const b = getKP(params.jointB);
                    const c = getKP(params.jointC);
                    if (!a || !b || !c) return null;
                    const angle = Math.abs(
                        (Math.atan2(c.y - b.y, c.x - b.x) -
                            Math.atan2(a.y - b.y, a.x - b.x)) * (180 / Math.PI)
                    );
                    const normalizedAngle = angle > 180 ? 360 - angle : angle;
                    return normalizedAngle;
                }
                case 'POSE_RELATION': {
                    const a = getKP(params.jointA);
                    if (!a) return null;
                    if (params.targetType === 'POINT') {
                        const b = getKP(params.jointB);
                        if (!b) return null;
                        return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
                    } else {
                        return a[params.component || 'y'];
                    }
                }
                case 'TEACHABLE_MACHINE':
                case 'ROBOFLOW_DETECTION':
                case 'CVAT_MODEL': {
                    // This will be populated by the inference loop in ModelBuilder
                    return rule.lastValue || null;
                }
                default: return null;
            }
        } catch (e) { return null; }
    };

    // Helper to evaluate a single rule against activePose
    const checkRuleStatus = (rule) => {
        const val = calculateRuleValue(rule);
        if (val === null) return null;

        const params = rule.params;

        if (rule.type === 'POSE_ANGLE' || rule.type === 'POSE_VELOCITY' ||
            rule.type === 'HAND_PROXIMITY' || rule.type === 'OBJECT_PROXIMITY' || rule.type === 'OPERATOR_PROXIMITY') {
            return evaluateComparison(val, params.operator, params.value, params.value2);
        }

        if (rule.type === 'POSE_RELATION') {
            if (params.targetType === 'POINT') return true; // Complex relation
            return evaluateComparison(val, params.operator, params.value, params.value2);
        }
        if (rule.type === 'TEACHABLE_MACHINE' || rule.type === 'ROBOFLOW_DETECTION' || rule.type === 'CVAT_MODEL') {
            if (!val) return null;
            if (rule.type === 'ROBOFLOW_DETECTION') {
                // val is an array of detections
                return Array.isArray(val) && val.some(det => det.class === params.targetClass && det.confidence >= params.threshold);
            }
            return val.className === params.targetClass && val.probability >= params.threshold;
        }
        return null;
    };

    const renderLiveValue = (rule) => {
        const val = calculateRuleValue(rule);
        if (val === null) return null;

        let displayVal = val;
        let suffix = '';

        if (rule.type === 'POSE_ANGLE') {
            displayVal = val.toFixed(1);
            suffix = '°';
        } else if (rule.type === 'POSE_RELATION') {
            displayVal = val.toFixed(2);
            suffix = '';
        } else if (rule.type === 'TEACHABLE_MACHINE' || rule.type === 'ROBOFLOW_DETECTION' || rule.type === 'CVAT_MODEL') {
            if (!val) return null;
            if (rule.type === 'ROBOFLOW_DETECTION') {
                const best = Array.isArray(val) ? val.find(d => d.class === rule.params.targetClass) : null;
                displayVal = best ? `${best.class} (${(best.confidence * 100).toFixed(0)}%)` : 'No Match';
            } else {
                displayVal = `${val.className} (${(val.probability * 100).toFixed(0)}%)`;
            }
            suffix = '';
        }

        return (
            <div style={{
                fontSize: '0.75rem',
                color: '#60a5fa',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                marginLeft: '8px',
                whiteSpace: 'nowrap'
            }}>
                Current: {displayVal}{suffix}
            </div>
        );
    };

    const styles = {
        container: {
            padding: '0 0 120px 0',
            color: 'white',
            fontFamily: 'Inter, sans-serif',
            display: 'flex',
            flexDirection: 'column'
        },
        createSection: {
            backgroundColor: '#1f2937',
            padding: '20px',
            borderRadius: '16px',
            marginBottom: '24px',
            border: '1px solid #374151',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
        sectionTitle: {
            fontSize: '1.1rem',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#60a5fa',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
        },
        controls: {
            display: 'flex',
            gap: '12px',
            alignItems: 'center'
        },
        select: {
            flex: 1,
            padding: '12px',
            borderRadius: '10px',
            backgroundColor: '#111827',
            border: '1px solid #4b5563',
            color: 'white',
            outline: 'none',
            fontSize: '0.9rem',
            cursor: 'pointer'
        },
        button: {
            padding: '10px 20px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s'
        },
        transitionList: {
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
        },
        transitionCard: {
            backgroundColor: '#1f2937',
            borderRadius: '16px',
            border: '1px solid #374151',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        },
        cardHeader: {
            padding: '14px 20px',
            backgroundColor: 'rgba(55, 65, 81, 0.5)',
            borderBottom: '1px solid #374151',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        },
        flow: {
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: '600'
        },
        stateBadge: {
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            color: '#60a5fa',
            fontSize: '0.85rem',
            border: '1px solid rgba(59, 130, 246, 0.2)'
        },
        rulesContainer: {
            padding: '20px',
            overflowY: 'visible'
        },
        ruleItem: {
            backgroundColor: '#111827',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '12px',
            fontSize: '0.9rem',
            border: '1px solid #374151',
            position: 'relative'
        },
        ruleControls: {
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '8px'
        },
        paramRow: {
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
        },
        paramSelect: {
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#1f2937',
            border: '1px solid #4b5563',
            color: 'white',
            fontSize: '0.85rem',
            outline: 'none',
            cursor: 'pointer'
        },
        skeletonBtn: {
            padding: '8px',
            background: 'rgba(96, 165, 250, 0.1)',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            color: '#60a5fa',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
        },
        input: {
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#1f2937',
            border: '1px solid #4b5563',
            color: 'white',
            width: '80px',
            fontSize: '0.85rem'
        },
        statusIndicator: (isActive) => ({
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: isActive === true ? '#10b981' : (isActive === false ? '#ef4444' : '#6b7280'),
            boxShadow: isActive === true ? '0 0 8px #10b981' : 'none',
            transition: 'all 0.3s ease'
        })
    };


    const objectClasses = getDetectableClasses();

    const renderRuleParams = (rule, transitionId) => {
        const isMet = checkRuleStatus(rule);

        return (
            <div style={styles.ruleControls}>
                <div style={styles.paramRow}>
                    <select
                        style={{ ...styles.paramSelect, minWidth: '140px' }}
                        value={rule.type}
                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { type: e.target.value })}
                    >
                        <option value="POSE_ANGLE">Joint Angle</option>
                        <option value="POSE_RELATION">Pose Relation (XYZ)</option>
                        <option value="POSE_VELOCITY">Pose Velocity (Speed)</option>
                        <option value="OBJECT_PROXIMITY">Object Proximity</option>
                        <option value="OBJECT_IN_ROI">Object in ROI</option>
                        <option value="OPERATOR_PROXIMITY">Operator Proximity</option>
                        <option value="POSE_MATCHING">Golden Pose Match</option>
                        <option value="SEQUENCE_MATCH">Motion Sequence Match (DTW)</option>
                        <option value="TEACHABLE_MACHINE">Teachable Machine</option>
                        <option value="ROBOFLOW_DETECTION">Roboflow Detection</option>
                        <option value="CVAT_MODEL">CVAT / Custom Model</option>
                        <option value="ADVANCED_SCRIPT">Advanced Script (DSL)</option>
                    </select>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {isMet === true ? 'Condition Met' : (isMet === false ? 'No Match' : 'Ready')}
                        </span>
                        <div style={styles.statusIndicator(isMet)} title="Real-time Status" />
                    </div>
                </div>

                {/* Dynamic params based on type */}
                {rule.type === 'POSE_ANGLE' && (
                    <div style={styles.paramRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.jointA}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointA: e.target.value } })}
                            >
                                {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                            <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'jointA')}>
                                <MousePointer2 size={14} />
                            </button>
                        </div>
                        <span style={{ color: '#4b5563' }}>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.jointB}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointB: e.target.value } })}
                            >
                                {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                            <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'jointB')}>
                                <MousePointer2 size={14} />
                            </button>
                        </div>
                        <span style={{ color: '#4b5563' }}>•</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.jointC}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointC: e.target.value } })}
                            >
                                {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                            <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'jointC')}>
                                <MousePointer2 size={14} />
                            </button>
                        </div>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                style={styles.input}
                                value={rule.params.value}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value: parseInt(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={rule.params.value2 || rule.params.value}
                                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseInt(e.target.value) } })}
                                    />
                                </>
                            )}
                            {renderLiveValue(rule)}
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>deg</span>
                    </div>
                )}

                {rule.type === 'POSE_RELATION' && (
                    <div style={styles.paramRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.jointA}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointA: e.target.value } })}
                            >
                                {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                            <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'jointA')}>
                                <MousePointer2 size={14} />
                            </button>
                        </div>

                        <select
                            style={{ ...styles.paramSelect, width: '60px' }}
                            value={rule.params.component || 'y'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, component: e.target.value } })}
                        >
                            <option value="x">X</option>
                            <option value="y">Y</option>
                            <option value="z">Z</option>
                        </select>

                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator || '<'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>

                        <select
                            style={{ ...styles.paramSelect, width: '90px', color: '#60a5fa' }}
                            value={rule.params.targetType || 'VALUE'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetType: e.target.value, value: 0, jointB: '' } })}
                        >
                            <option value="VALUE">Value</option>
                            <option value="POINT">Point</option>
                        </select>

                        {rule.params.targetType === 'POINT' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <select
                                    style={{ ...styles.paramSelect, width: '90px', color: '#a855f7' }}
                                    value={rule.params.targetTrackId || 'self'}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetTrackId: e.target.value } })}
                                >
                                    <option value="self">Self</option>
                                    <option value="nearest">Nearest Other</option>
                                    <option value="any">Any Other</option>
                                    {[1, 2, 3, 4].map(id => <option key={id} value={id}>Track {id}</option>)}
                                </select>
                                <select
                                    style={styles.paramSelect}
                                    value={rule.params.jointB || ''}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointB: e.target.value } })}
                                >
                                    <option value="">Target Joint...</option>
                                    {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                                </select>
                                <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'jointB')}>
                                    <MousePointer2 size={14} />
                                </button>
                                {renderLiveValue(rule)}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <input
                                    type="number"
                                    step="0.01"
                                    style={styles.input}
                                    value={rule.params.value || 0}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value: parseFloat(e.target.value) } })}
                                />
                                {rule.params.operator === 'BETWEEN' && (
                                    <>
                                        <span style={{ color: '#9ca3af' }}>-</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            style={styles.input}
                                            value={rule.params.value2 || (rule.params.value || 0)}
                                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseFloat(e.target.value) } })}
                                        />
                                    </>
                                )}
                                {renderLiveValue(rule)}
                            </div>
                        )}
                    </div>
                )}

                {rule.type === 'POSE_VELOCITY' && (
                    <div style={styles.paramRow}>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.joint}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, joint: e.target.value } })}
                        >
                            {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                style={styles.input}
                                value={rule.params.value}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value: parseFloat(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        style={styles.input}
                                        value={rule.params.value2 || rule.params.value}
                                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseFloat(e.target.value) } })}
                                    />
                                </>
                            )}
                            {renderLiveValue(rule)}
                        </div>
                    </div>
                )}

                {rule.type === 'HAND_PROXIMITY' && (
                    <div style={styles.paramRow}>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.landmark || 8}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, landmark: parseInt(e.target.value) } })}
                        >
                            <option value={8}>Index Tip</option>
                            <option value={4}>Thumb Tip</option>
                            <option value={0}>Wrist</option>
                        </select>
                        <span style={{ color: '#4b5563' }}>distance to</span>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.bodyPart}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, bodyPart: e.target.value } })}
                        >
                            {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator || '<'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                step="0.01"
                                style={styles.input}
                                value={rule.params.distance || 0.1}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, distance: parseFloat(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        style={styles.input}
                                        value={rule.params.value2 || 0.2}
                                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseFloat(e.target.value) } })}
                                    />
                                </>
                            )}
                            {renderLiveValue(rule)}
                        </div>
                    </div>
                )}

                {rule.type === 'OBJECT_PROXIMITY' && (
                    <div style={styles.paramRow}>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.objectClass}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, objectClass: e.target.value } })}
                        >
                            <option value="">Select Object...</option>
                            {objectClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.joint}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, joint: e.target.value } })}
                        >
                            {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator || '<'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                step="0.01"
                                style={styles.input}
                                value={rule.params.distance || 0.1}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, distance: parseFloat(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        style={styles.input}
                                        value={rule.params.value2 || 0.2}
                                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseFloat(e.target.value) } })}
                                    />
                                </>
                            )}
                            {renderLiveValue(rule)}
                        </div>
                    </div>
                )}

                {rule.type === 'OBJECT_IN_ROI' && (
                    <div style={styles.paramRow}>
                        {rule.params.isCustomObject ? (
                            <input
                                style={{ ...styles.paramSelect, width: '140px', backgroundColor: '#374151', border: '1px solid #60a5fa' }}
                                value={rule.params.objectClass || ''}
                                placeholder="Custom Name..."
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, objectClass: e.target.value } })}
                            />
                        ) : (
                            <select
                                style={styles.paramSelect}
                                value={rule.params.objectClass}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, objectClass: e.target.value } })}
                            >
                                <option value="">Select Object...</option>
                                {objectClasses.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        )}
                        <button
                            onClick={() => {
                                const isCustom = rule.params.isCustomObject;
                                handleUpdateRule(transitionId, rule.id, {
                                    params: {
                                        ...rule.params,
                                        isCustomObject: !isCustom,
                                        objectClass: ''
                                    }
                                });
                            }}
                            style={{
                                background: 'transparent',
                                border: '1px solid #4b5563',
                                color: rule.params.isCustomObject ? '#60a5fa' : '#9ca3af',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                marginLeft: '8px'
                            }}
                            title="Toggle Custom Name"
                        >
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>✎</span>
                        </button>

                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginLeft: '8px' }}>must be in</div>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.roiSource || 'STATE_ROI'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, roiSource: e.target.value } })}
                        >
                            <option value="STATE_ROI">Current State ROI</option>
                        </select>
                    </div>
                )}

                {rule.type === 'OPERATOR_PROXIMITY' && (
                    <div style={styles.paramRow}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.joint}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, joint: e.target.value } })}
                            >
                                {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                            <button style={styles.skeletonBtn} onClick={() => openJointSelector(transitionId, rule.id, 'joint')}>
                                <MousePointer2 size={14} />
                            </button>
                        </div>
                        <span style={{ color: '#4b5563' }}>distance to</span>
                        <select
                            style={{ ...styles.paramSelect, width: '120px', color: '#a855f7' }}
                            value={rule.params.targetTrackId || 'nearest'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetTrackId: e.target.value } })}
                        >
                            <option value="nearest">Nearest Other</option>
                            <option value="any">Any Other</option>
                            {[1, 2, 3, 4].map(id => <option key={id} value={id}>Track {id}</option>)}
                        </select>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator || '<'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                step="0.05"
                                style={styles.input}
                                value={rule.params.distance || 0.2}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, distance: parseFloat(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        step="0.05"
                                        style={styles.input}
                                        value={rule.params.value2 || 0.4}
                                        onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value2: parseFloat(e.target.value) } })}
                                    />
                                </>
                            )}
                            {renderLiveValue(rule)}
                        </div>
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>units</span>
                    </div>
                )}

                {rule.type === 'SEQUENCE_MATCH' && (
                    <div style={{ ...styles.paramRow, flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
                        <div style={{ ...styles.paramRow, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Threshold:</span>
                                <input
                                    type="number"
                                    step="0.05"
                                    min="0.05"
                                    max="1.0"
                                    style={{ ...styles.input, width: '70px' }}
                                    value={rule.params.threshold || 0.4}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, threshold: parseFloat(e.target.value) } })}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Window Size:</span>
                                <input
                                    type="number"
                                    step="10"
                                    min="10"
                                    max="300"
                                    style={{ ...styles.input, width: '70px' }}
                                    value={rule.params.bufferSize || 60}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, bufferSize: parseInt(e.target.value) } })}
                                />
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>frames</span>
                            </div>
                        </div>

                        <div style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: 'rgba(59, 130, 246, 0.05)',
                            borderRadius: '8px',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {/* Range Selection UI */}
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#111827', padding: '10px', borderRadius: '8px', border: '1px solid #374151' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Start Marker:</div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <input
                                            type="number"
                                            step="0.1"
                                            style={{ ...styles.input, width: '100%', padding: '6px' }}
                                            value={rule.params.startTime !== undefined ? rule.params.startTime.toFixed(1) : ''}
                                            placeholder="0.0"
                                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, startTime: parseFloat(e.target.value) } })}
                                        />
                                        <button
                                            onClick={() => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, startTime: captureBufferStatus?.videoTime || 0 } })}
                                            style={{ padding: '4px 8px', backgroundColor: '#374151', border: '1px solid #4b5563', color: '#60a5fa', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            title="Set to Current Video Time"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>
                                <div style={{ color: '#4b5563', paddingBottom: '16px' }}>&rarr;</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>Finish Marker:</div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <input
                                            type="number"
                                            step="0.1"
                                            style={{ ...styles.input, width: '100%', padding: '6px' }}
                                            value={rule.params.endTime !== undefined ? rule.params.endTime.toFixed(1) : ''}
                                            placeholder="0.0"
                                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, endTime: parseFloat(e.target.value) } })}
                                        />
                                        <button
                                            onClick={() => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, endTime: captureBufferStatus?.videoTime || 0 } })}
                                            style={{ padding: '4px 8px', backgroundColor: '#374151', border: '1px solid #4b5563', color: '#60a5fa', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                                            title="Set to Current Video Time"
                                        >
                                            Set
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Target size={14} color="#60a5fa" />
                                        {rule.params.targetSequence ? `Template captured (${rule.params.targetSequence.length || 0} frames)` : 'No Template Recorded'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                                        {rule.params.targetSequence ? 'Ready to match.' : 'Select range & capture motion.'}
                                    </div>
                                </div>
                                <button
                                    onClick={() => onCaptureSequence && onCaptureSequence(transitionId, rule.id, {
                                        startTime: rule.params.startTime,
                                        endTime: rule.params.endTime,
                                        bufferSize: rule.params.bufferSize || 60
                                    })}
                                    disabled={rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime}
                                    style={{
                                        padding: '8px 16px',
                                        backgroundColor: (rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime) ? '#374151' : '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold',
                                        cursor: (rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime) ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        boxShadow: (rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime) ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Video size={14} />
                                    {(rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime) ? 'Select Range' : 'Capture Range'}
                                </button>
                            </div>

                            {/* Progress Bar for Motion Buffer */}
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#6b7280', marginBottom: '4px' }}>
                                    <span>Motion Storage (last 60s):</span>
                                    <span>{captureBufferStatus?.current || 0} / 1800 frames</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', backgroundColor: '#1f2937', borderRadius: '3px', overflow: 'hidden', border: '1px solid #374151' }}>
                                    <div style={{
                                        width: `${Math.min(100, ((captureBufferStatus?.current || 0) / 1800) * 100)}%`,
                                        height: '100%',
                                        backgroundColor: '#3b82f6',
                                        transition: 'width 0.3s ease-out'
                                    }} />
                                </div>
                                {(!captureBufferStatus || captureBufferStatus.current < 10) && (
                                    <div style={{ fontSize: '0.65rem', color: '#60a5fa', marginTop: '4px', fontStyle: 'italic' }}>
                                        Play video to build motion memory...
                                    </div>
                                )}
                            </div>
                        </div>

                        {rule.params.targetSequence && (
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} /> Reference sequence successfully stored in model.
                            </div>
                        )}
                    </div>
                )}

                {rule.type === 'POSE_MATCHING' && (
                    <div style={styles.paramRow}>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Match against state:</span>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.targetStateId}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetStateId: e.target.value } })}
                        >
                            <option value="">Select State...</option>
                            {states.filter(s => s.id !== 's_start').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Threshold:</span>
                        <input
                            type="number"
                            step="0.01"
                            style={styles.input}
                            value={rule.params.threshold || 0.8}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, threshold: parseFloat(e.target.value) } })}
                        />
                    </div>
                )}

                {(rule.type === 'TEACHABLE_MACHINE' || rule.type === 'ROBOFLOW_DETECTION' || rule.type === 'CVAT_MODEL') && (
                    <div style={{ ...styles.paramRow, flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>
                                {rule.type === 'ROBOFLOW_DETECTION' ? 'Roboflow Model:' : (rule.type === 'CVAT_MODEL' ? 'Custom Model:' : 'Model:')}
                            </span>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.modelId || ''}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, modelId: e.target.value } })}
                            >
                                <option value="">Any (Default)</option>
                                {rule.type === 'ROBOFLOW_DETECTION' ?
                                    (rfModels || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>) :
                                    (tmModels || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                }
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Target Class:</span>
                            <input
                                type="text"
                                style={{ ...styles.input, width: '120px' }}
                                placeholder="e.g. Working"
                                value={rule.params.targetClass || ''}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetClass: e.target.value } })}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>Threshold:</span>
                            <input
                                type="number"
                                step="0.01"
                                style={{ ...styles.input, width: '60px' }}
                                value={rule.params.threshold || 0.8}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, threshold: parseFloat(e.target.value) } })}
                            />
                        </div>
                    </div>
                )}

                {/* ADVANCED SCRIPT UI */}
                {rule.type === 'ADVANCED_SCRIPT' && (
                    <div style={{ ...styles.paramRow, flexDirection: 'column', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
                        <div style={{ position: 'relative', width: '100%' }}>
                            <ScriptAutoComplete
                                style={{
                                    width: '100%',
                                    minHeight: '80px',
                                    backgroundColor: '#1f2937',
                                    border: '1px solid #4b5563',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    color: '#60a5fa',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    outline: 'none',
                                    resize: 'vertical'
                                }}
                                placeholder="Example: right_wrist.y < nose.y AND dist(right_wrist, left_wrist) > 0.3"
                                value={rule.params.script || ''}
                                onChange={(val) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, script: val } })}
                            />
                            {renderLiveValue(rule)}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                            <button
                                onClick={() => onAiValidateScript && onAiValidateScript(transitionId, rule.id, rule.params.script)}
                                style={{
                                    flex: 1,
                                    padding: '8px',
                                    backgroundColor: 'rgba(168, 85, 247, 0.1)',
                                    color: '#a855f7',
                                    border: '1px solid #a855f7',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                {aiLoading[transitionId] ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                AI Logic Check
                            </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                            Tips: Use joint.x/y/z, dist(A, B), or angle(A, B, C). Logical: AND, OR, NOT.
                        </div>
                    </div>
                )}

                {/* Occlusion Tolerance Toggle */}
                <div style={{
                    marginTop: '12px',
                    paddingTop: '12px',
                    borderTop: '1px solid #374151',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <label style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={14} color={rule.params.trustPersistent !== false ? '#eab308' : '#6b7280'} />
                        Prediction Tolerance (Kinematic)
                    </label>
                    <button
                        onClick={() => handleUpdateRule(transitionId, rule.id, {
                            params: { ...rule.params, trustPersistent: !(rule.params.trustPersistent !== false) }
                        })}
                        style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '0.7rem',
                            backgroundColor: rule.params.trustPersistent !== false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${rule.params.trustPersistent !== false ? '#10b981' : '#ef4444'}`,
                            color: rule.params.trustPersistent !== false ? '#10b981' : '#ef4444',
                            cursor: 'pointer'
                        }}
                    >
                        {rule.params.trustPersistent !== false ? 'Resilient (Trust Prediction)' : 'Strict (Live Only)'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={styles.container} className="custom-scrollbar">
            {showSelector && (
                <JointSelector
                    onSelect={handleJointSelection}
                    onClose={() => setShowSelector(false)}
                    selectedJoint={selectorTarget ? (transitions.find(t => t.id === selectorTarget.transitionId).condition.rules.find(r => r.id === selectorTarget.ruleId).params[selectorTarget.field]) : null}
                />
            )}

            {/* Create Transition */}
            <div style={styles.createSection}>
                <h3 style={styles.sectionTitle}>
                    <Activity size={18} /> Add State Transition (Roboflow Enabled)
                </h3>
                <div style={styles.controls}>
                    <select
                        style={styles.select}
                        value={fromState}
                        onChange={(e) => setFromState(e.target.value)}
                    >
                        <option value="">From State...</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ArrowRight size={20} color="#4b5563" />
                    <select
                        style={styles.select}
                        value={toState}
                        onChange={(e) => setToState(e.target.value)}
                    >
                        <option value="">To State...</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                        style={styles.button}
                        onClick={handleCreateTransition}
                        disabled={!fromState || !toState}
                    >
                        <Plus size={18} /> Add
                    </button>
                </div>
            </div>

            {/* List Transitions */}
            <div style={styles.transitionList}>
                {transitions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
                        <MousePointer2 size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>No transitions defined yet.</p>
                        <p style={{ fontSize: '0.8rem' }}>Define paths for your model to move between states.</p>
                    </div>
                )}

                {transitions.map(transition => {
                    const fromName = states.find(s => s.id === transition.from)?.name || 'Unknown';
                    const toName = states.find(s => s.id === transition.to)?.name || 'Unknown';
                    const isSelected = selectedStateId === transition.from;

                    return (
                        <div key={transition.id} style={{
                            ...styles.transitionCard,
                            border: isSelected ? '1px solid #3b82f6' : '1px solid #374151',
                            boxShadow: isSelected ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}>
                            <div
                                style={{ ...styles.cardHeader, cursor: 'pointer', backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : styles.cardHeader.backgroundColor }}
                                onClick={() => onSelectState && onSelectState(transition.from)}
                            >
                                <div style={styles.flow}>
                                    <span style={styles.stateBadge}>{fromName}</span>
                                    <ArrowRight size={16} color="#6b7280" />
                                    <span style={styles.stateBadge}>{toName}</span>
                                </div>
                                <button
                                    style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                                    onClick={() => onDeleteTransition(transition.id)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div style={styles.rulesContainer} className="custom-scrollbar">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #374151', borderStyle: 'none none dashed none' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#eab308', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Activity size={14} /> Hysteresis (Hold Time):
                                    </span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        style={styles.input}
                                        value={transition.condition.holdTime || 0}
                                        onChange={(e) => onUpdateTransition(transition.id, {
                                            condition: { ...transition.condition, holdTime: parseFloat(e.target.value) }
                                        })}
                                    />
                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>seconds</span>
                                </div>

                                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conditions</h4>
                                    </div>

                                    {transition.condition.rules.map((rule, idx) => (
                                        <div key={rule.id || idx} style={{ ...styles.ruleItem, borderColor: rule.aiGenerated ? '#a855f7' : '#374151' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: rule.aiGenerated ? '#a855f7' : '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {rule.aiGenerated ? <Sparkles size={14} /> : null}
                                                    Rule #{idx + 1} {rule.aiGenerated ? '(AI)' : ''}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {rule.aiReasoning && (
                                                        <div title={rule.aiReasoning} style={{ cursor: 'help', color: '#a855f7' }}>
                                                            <Info size={14} />
                                                        </div>
                                                    )}
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#9ca3af', cursor: 'pointer' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={!!rule.invert}
                                                            onChange={(e) => handleUpdateRule(transition.id, rule.id, { invert: e.target.checked })}
                                                            style={{ cursor: 'pointer', accentColor: '#2563eb' }}
                                                        />
                                                        Invert (NOT)
                                                    </label>
                                                    <button
                                                        style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                                                        onClick={() => handleDuplicateRule(transition.id, rule.id)}
                                                        title="Duplicate Rule"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                    <button
                                                        style={{ background: 'transparent', border: 'none', color: '#4b5563', cursor: 'pointer' }}
                                                        onClick={() => handleDeleteRule(transition.id, rule.id)}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                            {renderRuleParams(rule, transition.id)}
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => handleAddRule(transition.id)}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'rgba(37, 99, 235, 0.05)',
                                            color: '#60a5fa',
                                            border: '1px dashed #2563eb',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <Plus size={16} /> Add Rule Condition
                                    </button>

                                    <button
                                        onClick={() => handleAiSuggest(transition.id)}
                                        disabled={aiLoading[transition.id]}
                                        style={{
                                            flex: 1,
                                            padding: '12px',
                                            background: 'rgba(168, 85, 247, 0.05)',
                                            color: '#a855f7',
                                            border: '1px dashed #a855f7',
                                            borderRadius: '12px',
                                            cursor: aiLoading[transition.id] ? 'not-allowed' : 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '0.85rem',
                                            fontWeight: '600',
                                            transition: 'all 0.2s',
                                            opacity: aiLoading[transition.id] ? 0.6 : 1
                                        }}
                                    >
                                        {aiLoading[transition.id] ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Sparkles size={16} />
                                        )}
                                        {aiLoading[transition.id] ? 'AI Berpikir...' : 'AI Suggest Rule'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RuleEditor;
