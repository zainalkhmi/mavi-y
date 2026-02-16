import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, ArrowRight, Check, Activity, MousePointer2, Copy, Video, Target, Info, Upload, Download, Library } from 'lucide-react';
import { RULE_TYPES, JOINTS } from '../../utils/studio/ModelBuilderEngine';
import { getDetectableClasses } from '../../utils/objectDetector';
import JointSelector from './JointSelector';
import ScriptAutoComplete from './ScriptAutoComplete';
import LogicTreeBuilder from './LogicTreeBuilder';
import { Sparkles, Loader2 } from 'lucide-react';

const ROBOT_JOINTS = ['J1', 'J2', 'J3', 'J4', 'J5', 'J6'];
const ROBOT_AXES = ['angle', 'x', 'y', 'z', 'roll', 'pitch', 'yaw', 'rx', 'ry', 'rz'];

const getOperators = (t) => [
    { value: '<', label: '<' },
    { value: '>', label: '>' },
    { value: '<=', label: '<=' },
    { value: '>=', label: '>=' },
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'BETWEEN', label: t('studioModel.modelBuilder.rules.operators.BETWEEN') }
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

const BUILTIN_RULE_TEMPLATES = [
    {
        id: 'tpl_posture_bent_arm',
        name: 'Bent Arm Detection',
        description: 'Detect elbow angle below 90°',
        condition: {
            operator: 'AND',
            holdTime: 0,
            rules: [
                {
                    id: 'rule_tpl_1',
                    type: 'POSE_ANGLE',
                    params: {
                        jointA: 'right_shoulder',
                        jointB: 'right_elbow',
                        jointC: 'right_wrist',
                        operator: '<',
                        value: 90
                    }
                }
            ]
        }
    },
    {
        id: 'tpl_object_near_hand',
        name: 'Object Near Hand',
        description: 'Object close to right wrist',
        condition: {
            operator: 'AND',
            holdTime: 0,
            rules: [
                {
                    id: 'rule_tpl_2',
                    type: 'OBJECT_PROXIMITY',
                    params: {
                        objectClass: 'target',
                        joint: 'right_wrist',
                        operator: '<',
                        distance: 0.12
                    }
                }
            ]
        }
    },
    {
        id: 'tpl_zone_entry',
        name: 'Zone Entry Alert',
        description: 'Detect object/body entering ROI',
        condition: {
            operator: 'AND',
            holdTime: 0,
            rules: [
                {
                    id: 'rule_tpl_3',
                    type: 'OBJECT_IN_ROI',
                    params: {
                        targetType: 'OBJECT',
                        objectClass: 'person',
                        roiSource: 'STATE_ROI'
                    }
                }
            ]
        }
    },
    {
        id: 'tpl_repetitive_motion',
        name: 'Repetitive Motion (Frequency)',
        description: 'Track frequent repeated trigger in time window',
        condition: {
            operator: 'AND',
            holdTime: 0,
            rules: [
                {
                    id: 'rule_tpl_4',
                    type: 'POSE_VELOCITY',
                    params: {
                        joint: 'right_wrist',
                        operator: '>',
                        value: 0.03
                    },
                    frequencyConfig: {
                        count: 5,
                        window: 60,
                        resetMode: 'SLIDING'
                    }
                }
            ]
        }
    }
];

const RuleEditor = ({ states, transitions, onAddTransition, onDeleteTransition, onUpdateTransition, activePose, onAiSuggest, onAiValidateScript, tmModels = [], rfModels = [], rfPredictions = {}, selectedStateId, onSelectState, onCaptureSequence, captureBufferStatus, zones = [], modelId = 'global' }) => {
    const { t } = useTranslation();
    const OPERATORS = useMemo(() => getOperators(t), [t]);
    const [fromState, setFromState] = useState('');
    const [toState, setToState] = useState('');
    const [showSelector, setShowSelector] = useState(false);
    const [selectorTarget, setSelectorTarget] = useState(null); // { transitionId, ruleId, field }
    const [aiLoading, setAiLoading] = useState({}); // { transitionId: boolean }
    const [selectedTemplateId, setSelectedTemplateId] = useState(BUILTIN_RULE_TEMPLATES[0]?.id || '');
    const [selectedTemplateTransitionId, setSelectedTemplateTransitionId] = useState('');
    const [ruleLibrary, setRuleLibrary] = useState([]);
    const importInputRef = useRef(null);

    const LIBRARY_KEY = `studioRuleLibrary_${modelId}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(LIBRARY_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) setRuleLibrary(parsed);
            }
        } catch (e) {
            console.warn('Failed to load rule library:', e);
        }
    }, [LIBRARY_KEY]);

    useEffect(() => {
        localStorage.setItem(LIBRARY_KEY, JSON.stringify(ruleLibrary));
    }, [ruleLibrary, LIBRARY_KEY]);

    // Duration tracking: { ruleId: { startTime: timestamp, elapsed: seconds, isActive: boolean } }
    const [ruleTimers, setRuleTimers] = useState({});

    // Frequency tracking: { ruleId: { events: [timestamps], count: number } }
    const [frequencyCounters, setFrequencyCounters] = useState({});

    // Logic tree mode: { transitionId: boolean }
    const [useLogicTree, setUseLogicTree] = useState({});


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

    useEffect(() => {
        if (!selectedTemplateTransitionId && transitions.length > 0) {
            setSelectedTemplateTransitionId(transitions[0].id);
        }
    }, [transitions, selectedTemplateTransitionId]);

    const cloneRuleWithFreshIds = (rule) => ({
        ...rule,
        id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    });

    const normalizeCondition = (condition) => {
        const safe = condition || { rules: [] };
        return {
            ...safe,
            rules: (safe.rules || []).map(cloneRuleWithFreshIds)
        };
    };

    const applyConditionToTransition = (transitionId, condition, mode = 'replace') => {
        const transition = transitions.find(t => t.id === transitionId);
        if (!transition) return;

        const incoming = normalizeCondition(condition);
        const mergedCondition = mode === 'append'
            ? {
                ...transition.condition,
                rules: [...(transition.condition?.rules || []), ...(incoming.rules || [])]
            }
            : {
                ...transition.condition,
                ...incoming,
                rules: incoming.rules || []
            };

        onUpdateTransition(transitionId, { condition: mergedCondition });
    };

    const allTemplates = useMemo(() => {
        const custom = (ruleLibrary || []).map(item => ({ ...item, source: 'library' }));
        const builtins = BUILTIN_RULE_TEMPLATES.map(item => ({ ...item, source: 'builtin' }));
        return [...builtins, ...custom];
    }, [ruleLibrary]);

    const selectedTemplate = allTemplates.find(tpl => tpl.id === selectedTemplateId) || allTemplates[0];

    const handleApplyTemplate = (mode = 'replace') => {
        if (!selectedTemplateTransitionId || !selectedTemplate) {
            window.alert('Select transition and template first.');
            return;
        }
        applyConditionToTransition(selectedTemplateTransitionId, selectedTemplate.condition, mode);
    };

    const handleExportRules = () => {
        const payload = {
            type: 'studio-rule-pack',
            version: 1,
            exportedAt: new Date().toISOString(),
            transitions: transitions.map(t => ({
                id: t.id,
                from: t.from,
                to: t.to,
                condition: t.condition
            })),
            library: ruleLibrary
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rules_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportRules = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (Array.isArray(data.library)) {
                    const normalizedLib = data.library.map(item => ({
                        ...item,
                        id: item.id || `lib_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
                    }));
                    setRuleLibrary(prev => [...prev, ...normalizedLib]);
                }

                if (Array.isArray(data.transitions) && selectedTemplateTransitionId) {
                    const firstCondition = data.transitions[0]?.condition;
                    if (firstCondition) {
                        applyConditionToTransition(selectedTemplateTransitionId, firstCondition, 'append');
                    }
                }

                window.alert('Rules imported successfully.');
            } catch (err) {
                console.error(err);
                window.alert('Invalid rules JSON file.');
            }
        };

        reader.readAsText(file);
        event.target.value = '';
    };

    const handleSaveTransitionToLibrary = () => {
        if (!selectedTemplateTransitionId) {
            window.alert('Select a transition first.');
            return;
        }

        const transition = transitions.find(t => t.id === selectedTemplateTransitionId);
        if (!transition) return;

        const name = window.prompt('Preset name', 'Custom Rule Preset');
        if (!name) return;

        const item = {
            id: `lib_${Date.now()}`,
            name,
            description: `From ${transition.from} → ${transition.to}`,
            condition: transition.condition
        };

        setRuleLibrary(prev => [...prev, item]);
        setSelectedTemplateId(item.id);
    };

    const handleDeleteLibraryItem = (id) => {
        setRuleLibrary(prev => prev.filter(item => item.id !== id));
        if (selectedTemplateId === id) {
            setSelectedTemplateId(BUILTIN_RULE_TEMPLATES[0]?.id || '');
        }
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
        const isRobotRule = rule.type === 'ROBOT_JOINT_ANGLE' || rule.type === 'ROBOT_JOINT_VELOCITY' || rule.type === 'ROBOT_JOINT_ACCELERATION';
        if (!isRobotRule && (!activePose || !activePose.keypoints)) return null;
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
                case 'OBJECT_PROXIMITY': {
                    const joint = getKP(params.joint);
                    if (!joint) return null;
                    const objectClass = params.objectClass;
                    let minDistance = 1000; // Infinity
                    let found = false;

                    Object.values(rfPredictions || {}).flat().forEach(det => {
                        if (det.class === objectClass) {
                            const [x, y, w, h] = det.bbox;
                            const cx = x + w / 2;
                            const cy = y + h / 2;
                            const dist = Math.sqrt(Math.pow(joint.x - cx, 2) + Math.pow(joint.y - cy, 2));
                            if (dist < minDistance) {
                                minDistance = dist;
                                found = true;
                            }
                        }
                    });
                    return found ? minDistance : null;
                }
                case 'OBJECT_IN_ROI': {
                    let roi = null;
                    if (params.roiSource === 'GLOBAL_ZONE') {
                        roi = zones.find(z => z.id === params.zoneId);
                    } else {
                        // Default to STATE_ROI
                        const state = states.find(s => s.id === selectedStateId);
                        roi = state ? state.roi : null;
                    }

                    if (!roi) return false; // No ROI defined

                    const targetType = params.targetType || 'OBJECT'; // OBJECT or KEYPOINT
                    let isInside = false;

                    if (targetType === 'KEYPOINT') {
                        const joint = getKP(params.joint);
                        if (joint) {
                            // Check if joint is within ROI
                            if (joint.x >= roi.x && joint.x <= roi.x + roi.width &&
                                joint.y >= roi.y && joint.y <= roi.y + roi.height) {
                                isInside = true;
                            }
                        }
                    } else {
                        // Check Objects
                        const objectClass = params.objectClass;
                        Object.values(rfPredictions || {}).flat().forEach(det => {
                            if (det.class === objectClass) {
                                const [x, y, w, h] = det.bbox;
                                const cx = x + w / 2;
                                const cy = y + h / 2;
                                // ROI is {x, y, width, height}
                                if (cx >= roi.x && cx <= roi.x + roi.width &&
                                    cy >= roi.y && cy <= roi.y + roi.height) {
                                    isInside = true;
                                }
                            }
                        });
                    }
                    return isInside;
                }
                case 'TEACHABLE_MACHINE':
                case 'ROBOFLOW_DETECTION':
                case 'CVAT_MODEL': {
                    // This will be populated by the inference loop in ModelBuilder
                    return rule.lastValue || null;
                }
                case 'ROBOT_JOINT_ANGLE':
                case 'ROBOT_JOINT_VELOCITY':
                case 'ROBOT_JOINT_ACCELERATION': {
                    return Number.isFinite(rule.lastValue) ? rule.lastValue : null;
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
            rule.type === 'HAND_PROXIMITY' || rule.type === 'OBJECT_PROXIMITY' || rule.type === 'OPERATOR_PROXIMITY' ||
            rule.type === 'ROBOT_JOINT_ANGLE' || rule.type === 'ROBOT_JOINT_VELOCITY' || rule.type === 'ROBOT_JOINT_ACCELERATION') {
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
        if (rule.type === 'OBJECT_IN_ROI') {
            return val === true;
        }
        return null;
    };

    // Evaluate rule with duration constraints
    const evaluateWithDuration = (ruleId, baseCondition, durationConfig) => {
        if (!durationConfig) return baseCondition;

        const now = Date.now();

        if (baseCondition) {
            // Condition is true
            if (!ruleTimers[ruleId] || !ruleTimers[ruleId].isActive) {
                // Start timer
                setRuleTimers(prev => ({
                    ...prev,
                    [ruleId]: { startTime: now, elapsed: 0, isActive: true }
                }));
                return false; // Not yet met minimum duration
            }

            const elapsed = (now - ruleTimers[ruleId].startTime) / 1000;

            // Update elapsed time
            setRuleTimers(prev => ({
                ...prev,
                [ruleId]: { ...prev[ruleId], elapsed }
            }));

            // Check minimum duration
            if (durationConfig.minDuration && elapsed < durationConfig.minDuration) {
                return false;
            }

            // Check maximum duration (timeout)
            if (durationConfig.maxDuration && elapsed > durationConfig.maxDuration) {
                return false; // Timeout
            }

            return true; // Duration requirements met
        } else {
            // Condition is false
            if (durationConfig.resetOnFalse && ruleTimers[ruleId]) {
                // Reset timer
                setRuleTimers(prev => {
                    const newTimers = { ...prev };
                    delete newTimers[ruleId];
                    return newTimers;
                });
            }
            return false;
        }
    };

    // Evaluate rule with frequency counting
    const evaluateWithFrequency = (ruleId, conditionTriggered, frequencyConfig) => {
        if (!frequencyConfig) return conditionTriggered;

        const now = Date.now();
        const windowMs = frequencyConfig.window * 1000;

        if (conditionTriggered) {
            // Add new event
            const currentCounter = frequencyCounters[ruleId] || { events: [], count: 0 };
            const newEvents = [...currentCounter.events, now];

            // Filter events within window
            const validEvents = newEvents.filter(timestamp =>
                (now - timestamp) <= windowMs
            );

            setFrequencyCounters(prev => ({
                ...prev,
                [ruleId]: { events: validEvents, count: validEvents.length }
            }));

            // Check if threshold met
            return validEvents.length >= frequencyConfig.count;
        }

        // Clean up old events even when not triggered
        if (frequencyCounters[ruleId]) {
            const validEvents = frequencyCounters[ruleId].events.filter(timestamp =>
                (now - timestamp) <= windowMs
            );

            if (validEvents.length !== frequencyCounters[ruleId].events.length) {
                setFrequencyCounters(prev => ({
                    ...prev,
                    [ruleId]: { events: validEvents, count: validEvents.length }
                }));
            }
        }

        return false;
    };

    // Evaluate logic tree recursively for complex boolean logic
    const evaluateLogicTree = (node, ruleResults) => {
        if (!node) return false;

        if (node.type === 'RULE') {
            // Leaf node - get rule result
            const result = ruleResults[node.ruleId];
            if (result === null || result === undefined) return false;
            return node.negate ? !result : result;
        }

        if (node.type === 'GROUP') {
            // Evaluate all children
            const childResults = node.children.map(child =>
                evaluateLogicTree(child, ruleResults)
            );

            // Apply operator
            let groupResult;
            switch (node.operator) {
                case 'AND':
                    groupResult = childResults.every(r => r === true);
                    break;
                case 'OR':
                    groupResult = childResults.some(r => r === true);
                    break;
                case 'XOR':
                    // Exclusive OR - exactly one must be true
                    groupResult = childResults.filter(r => r === true).length === 1;
                    break;
                case 'NAND':
                    // NOT AND
                    groupResult = !childResults.every(r => r === true);
                    break;
                case 'NOR':
                    // NOT OR
                    groupResult = !childResults.some(r => r === true);
                    break;
                default:
                    groupResult = false;
            }

            // Apply negation to group
            return node.negate ? !groupResult : groupResult;
        }

        return false;
    };

    // Create default logic tree from existing rules
    const createDefaultTree = (transition) => {
        if (!transition || !transition.condition || !transition.condition.rules) {
            return {
                type: 'GROUP',
                operator: 'AND',
                negate: false,
                children: []
            };
        }

        return {
            type: 'GROUP',
            operator: transition.condition.operator || 'AND',
            negate: false,
            children: transition.condition.rules.map(rule => ({
                type: 'RULE',
                ruleId: rule.id,
                negate: false
            }))
        };
    };

    // Convert tree to human-readable expression
    const treeToExpression = (node, rules) => {
        if (!node) return '';

        if (node.type === 'RULE') {
            const rule = rules.find(r => r.id === node.ruleId);
            const ruleIndex = rules.indexOf(rule) + 1;
            const expr = rule ? `Rule${ruleIndex}` : 'Unknown';
            return node.negate ? `NOT(${expr})` : expr;
        }

        if (node.type === 'GROUP') {
            if (!node.children || node.children.length === 0) return '';

            const childExprs = node.children.map(c => treeToExpression(c, rules));
            const grouped = `(${childExprs.join(` ${node.operator} `)})`;
            return node.negate ? `NOT${grouped}` : grouped;
        }

        return '';
    };



    const renderLiveValue = (rule) => {
        const val = calculateRuleValue(rule);
        if (val === null) return null;

        let displayVal = val;
        let suffix = '';

        if (rule.type === 'POSE_ANGLE') {
            displayVal = val.toFixed(1);
            suffix = '°';
        } else if (rule.type === 'ROBOT_JOINT_ANGLE' || rule.type === 'ROBOT_JOINT_VELOCITY' || rule.type === 'ROBOT_JOINT_ACCELERATION') {
            displayVal = Number.isFinite(val) ? val.toFixed(3) : val;
            suffix = '';
        } else if (rule.type === 'POSE_RELATION') {
            displayVal = val.toFixed(2);
            suffix = '';
        } else if (rule.type === 'TEACHABLE_MACHINE' || rule.type === 'ROBOFLOW_DETECTION' || rule.type === 'CVAT_MODEL') {
            if (!val) return null;
            if (rule.type === 'ROBOFLOW_DETECTION') {
                const best = Array.isArray(val) ? val.find(d => d.class === rule.params.targetClass) : null;
                displayVal = best ? `${best.class} (${(best.confidence * 100).toFixed(0)}%)` : t('studioModel.modelBuilder.rules.noMatch');
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
                {t('studioModel.modelBuilder.rulesEditor.currentValue')} {displayVal}{suffix}
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
        ruleItem: (passing) => ({
            backgroundColor: '#111827',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '12px',
            fontSize: '0.9rem',
            border: `1px solid ${passing === true ? '#10b981' : (passing === false ? '#ef4444' : '#374151')}`,
            transition: 'border-color 0.3s ease',
            position: 'relative'
        }),
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


    const objectClasses = useMemo(() => {
        const classes = new Set(getDetectableClasses());
        console.log('RuleEditor: rfPredictions received:', rfPredictions); // DEBUG LOG
        if (rfPredictions) {
            Object.values(rfPredictions).flat().forEach(d => {
                if (d.class) classes.add(d.class);
            });
        }
        return Array.from(classes).sort();
    }, [rfPredictions]);

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
                        <option value="POSE_ANGLE">{t('studioModel.modelBuilder.rules.types.POSE_ANGLE')}</option>
                        <option value="POSE_RELATION">{t('studioModel.modelBuilder.rules.types.POSE_RELATION')}</option>
                        <option value="POSE_VELOCITY">{t('studioModel.modelBuilder.rules.types.POSE_VELOCITY')}</option>
                        <option value="OPERATOR_PROXIMITY">{t('studioModel.modelBuilder.rules.types.OPERATOR_PROXIMITY')}</option>
                        <option value="ROBOT_JOINT_ANGLE">Robot Joint Angle</option>
                        <option value="ROBOT_JOINT_VELOCITY">Robot Joint Velocity</option>
                        <option value="ROBOT_JOINT_ACCELERATION">Robot Joint Acceleration</option>
                        <option value="POSE_MATCHING">{t('studioModel.modelBuilder.rules.types.POSE_MATCHING')}</option>
                        <option value="SEQUENCE_MATCH">{t('studioModel.modelBuilder.rules.types.SEQUENCE_MATCH')}</option>
                        <option value="ADVANCED_SCRIPT">{t('studioModel.modelBuilder.rules.types.ADVANCED_SCRIPT')}</option>
                    </select>

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                            {isMet === true ? t('studioModel.modelBuilder.rules.conditionMet') : (isMet === false ? t('studioModel.modelBuilder.rules.noMatch') : t('studioModel.modelBuilder.rules.ready'))}
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
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{t('studioModel.modelBuilder.rulesEditor.deg')}</span>
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
                            <option value="VALUE">{t('studioModel.modelBuilder.rulesEditor.value')}</option>
                            <option value="POINT">{t('studioModel.modelBuilder.rulesEditor.point')}</option>
                        </select>

                        {rule.params.targetType === 'POINT' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <select
                                    style={{ ...styles.paramSelect, width: '90px', color: '#a855f7' }}
                                    value={rule.params.targetTrackId || 'self'}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetTrackId: e.target.value } })}
                                >
                                    <option value="self">{t('studioModel.modelBuilder.rulesEditor.self')}</option>
                                    <option value="nearest">{t('studioModel.modelBuilder.rulesEditor.nearestOther')}</option>
                                    <option value="any">{t('studioModel.modelBuilder.rulesEditor.anyOther')}</option>
                                    {[1, 2, 3, 4].map(id => <option key={id} value={id}>{t('studioModel.modelBuilder.rulesEditor.track')} {id}</option>)}
                                </select>
                                <select
                                    style={styles.paramSelect}
                                    value={rule.params.jointB || ''}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, jointB: e.target.value } })}
                                >
                                    <option value="">{t('studioModel.modelBuilder.rulesEditor.targetJoint')}</option>
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

                {(rule.type === 'ROBOT_JOINT_ANGLE' || rule.type === 'ROBOT_JOINT_VELOCITY' || rule.type === 'ROBOT_JOINT_ACCELERATION') && (
                    <div style={styles.paramRow}>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.joint || 'J1'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, joint: e.target.value } })}
                        >
                            {ROBOT_JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.axis || 'angle'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, axis: e.target.value } })}
                        >
                            {ROBOT_AXES.map(axis => <option key={axis} value={axis}>{axis}</option>)}
                        </select>
                        <select
                            style={{ ...styles.paramSelect, width: '90px' }}
                            value={rule.params.operator || '>'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, operator: e.target.value } })}
                        >
                            {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input
                                type="number"
                                step="0.01"
                                style={styles.input}
                                value={rule.params.value ?? 0}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, value: parseFloat(e.target.value) } })}
                            />
                            {rule.params.operator === 'BETWEEN' && (
                                <>
                                    <span style={{ color: '#9ca3af' }}>-</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        style={styles.input}
                                        value={rule.params.value2 ?? rule.params.value ?? 0}
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
                        <span style={{ color: '#4b5563' }}>{t('studioModel.modelBuilder.rules.distanceTo')}</span>
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
                            <option value="">{t('studioModel.modelBuilder.rulesEditor.selectObject')}</option>
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
                    <div style={{ ...styles.paramRow, flexWrap: 'wrap', alignItems: 'flex-start', flexDirection: 'column', gap: '8px' }}>
                        <div style={styles.paramRow}>
                            <select
                                style={{ ...styles.paramSelect, width: '100px', fontWeight: 'bold' }}
                                value={rule.params.targetType || 'OBJECT'}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetType: e.target.value } })}
                            >
                                <option value="OBJECT">{t('studioModel.modelBuilder.rulesEditor.object') || 'Object'}</option>
                                <option value="KEYPOINT">{t('studioModel.modelBuilder.rulesEditor.bodyPart') || 'Body Part'}</option>
                            </select>

                            {rule.params.targetType === 'KEYPOINT' ? (
                                <select
                                    style={styles.paramSelect}
                                    value={rule.params.joint}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, joint: e.target.value } })}
                                >
                                    {JOINTS.map(j => <option key={j} value={j}>{j}</option>)}
                                </select>
                            ) : (
                                <>
                                    {rule.params.isCustomObject ? (
                                        <input
                                            style={{ ...styles.paramSelect, width: '140px', backgroundColor: '#374151', border: '1px solid #60a5fa' }}
                                            value={rule.params.objectClass || ''}
                                            placeholder={t('studioModel.modelBuilder.rulesEditor.customNamePlaceholder')}
                                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, objectClass: e.target.value } })}
                                        />
                                    ) : (
                                        <select
                                            style={styles.paramSelect}
                                            value={rule.params.objectClass}
                                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, objectClass: e.target.value } })}
                                        >
                                            <option value="">{t('studioModel.modelBuilder.rulesEditor.selectObject')}</option>
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
                                            cursor: 'pointer'
                                        }}
                                        title={t('studioModel.modelBuilder.rulesEditor.toggleCustomName')}
                                    >
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>✎</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div style={styles.paramRow}>
                            <span style={{ fontSize: '0.85rem', color: '#9ca3af' }}>{t('studioModel.modelBuilder.rules.mustBeIn')}</span>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.roiSource || 'STATE_ROI'}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, roiSource: e.target.value } })}
                            >
                                <option value="STATE_ROI">{t('studioModel.modelBuilder.rulesEditor.currentState')}</option>
                                <option value="GLOBAL_ZONE">{t('studioModel.modelBuilder.rulesEditor.globalZone') || 'Global Zone'}</option>
                            </select>

                            {rule.params.roiSource === 'GLOBAL_ZONE' && (
                                <select
                                    style={{ ...styles.paramSelect, border: '1px solid #eab308', color: '#fca5a5' }}
                                    value={rule.params.zoneId || ''}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, zoneId: e.target.value } })}
                                >
                                    <option value="">{t('studioModel.modelBuilder.rulesEditor.selectZone') || 'Select Zone...'}</option>
                                    {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                                </select>
                            )}
                        </div>
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
                        <span style={{ color: '#4b5563' }}>{t('studioModel.modelBuilder.rules.distanceTo')}</span>
                        <select
                            style={{ ...styles.paramSelect, width: '120px', color: '#a855f7' }}
                            value={rule.params.targetTrackId || 'nearest'}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetTrackId: e.target.value } })}
                        >
                            <option value="nearest">{t('studioModel.modelBuilder.rulesEditor.anyDefault')}</option>
                            <option value="any">{t('studioModel.modelBuilder.rulesEditor.anyDefault')}</option>
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
                        <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{t('studioModel.modelBuilder.rulesEditor.units')}</span>
                    </div>
                )}

                {rule.type === 'SEQUENCE_MATCH' && (
                    <div style={{ ...styles.paramRow, flexDirection: 'column', alignItems: 'flex-start', gap: '10px', width: '100%' }}>
                        <div style={{ ...styles.paramRow, width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.threshold')}</span>
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
                                <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.windowSize')}</span>
                                <input
                                    type="number"
                                    step="10"
                                    min="10"
                                    max="300"
                                    style={{ ...styles.input, width: '70px' }}
                                    value={rule.params.bufferSize || 60}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, bufferSize: parseInt(e.target.value) } })}
                                />
                                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>{t('studioModel.modelBuilder.rulesEditor.frames')}</span>
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
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.rulesEditor.startMarker')}</div>
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
                                            title={t('studioModel.modelBuilder.rulesEditor.setToCurrentVideoTime')}
                                        >
                                            {t('studioModel.modelBuilder.rulesEditor.set')}
                                        </button>
                                    </div>
                                </div>
                                <div style={{ color: '#4b5563', paddingBottom: '16px' }}>&rarr;</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '4px' }}>{t('studioModel.modelBuilder.rulesEditor.finishMarker')}</div>
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
                                            title={t('studioModel.modelBuilder.rulesEditor.setToCurrentVideoTime')}
                                        >
                                            {t('studioModel.modelBuilder.rulesEditor.set')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'space-between', width: '100%', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Target size={14} color="#60a5fa" />
                                        {rule.params.targetSequence ? t('studioModel.modelBuilder.rulesEditor.templateCaptured', { count: rule.params.targetSequence.length || 0 }) : t('studioModel.modelBuilder.rulesEditor.noTemplateRecorded')}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
                                        {rule.params.targetSequence ? t('studioModel.modelBuilder.rulesEditor.readyToMatch') : t('studioModel.modelBuilder.rulesEditor.selectRangeCapture')}
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
                                    {(rule.params.startTime === undefined || rule.params.endTime === undefined || rule.params.startTime >= rule.params.endTime) ? t('studioModel.modelBuilder.rulesEditor.selectRange') : t('studioModel.modelBuilder.rulesEditor.captureRange')}
                                </button>
                            </div>

                            {/* Progress Bar for Motion Buffer */}
                            <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#6b7280', marginBottom: '4px' }}>
                                    <span>{t('studioModel.modelBuilder.rulesEditor.motionStorage')}</span>
                                    <span>{captureBufferStatus?.current || 0} / 1800 {t('studioModel.modelBuilder.rulesEditor.frames')}</span>
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
                                        {t('studioModel.modelBuilder.rulesEditor.playVideoBuildMemory')}
                                    </div>
                                )}
                            </div>
                        </div>

                        {rule.params.targetSequence && (
                            <div style={{ fontSize: '0.7rem', color: '#10b981', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} /> {t('studioModel.modelBuilder.rulesEditor.referenceStored')}
                            </div>
                        )}
                    </div>
                )}

                {rule.type === 'POSE_MATCHING' && (
                    <div style={styles.paramRow}>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.matchAgainstState')}</span>
                        <select
                            style={styles.paramSelect}
                            value={rule.params.targetStateId}
                            onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetStateId: e.target.value } })}
                        >
                            <option value="">{t('studioModel.modelBuilder.rulesEditor.selectState')}</option>
                            {states.filter(s => s.id !== 's_start').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.threshold')}</span>
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
                                {rule.type === 'ROBOFLOW_DETECTION' ? t('studioModel.modelBuilder.rulesEditor.roboflowModel') : (rule.type === 'CVAT_MODEL' ? t('studioModel.modelBuilder.rulesEditor.customModel') : t('studioModel.modelBuilder.rulesEditor.model'))}
                            </span>
                            <select
                                style={styles.paramSelect}
                                value={rule.params.modelId || ''}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, modelId: e.target.value } })}
                            >
                                <option value="">{t('studioModel.modelBuilder.rulesEditor.anyDefault')}</option>
                                {rule.type === 'ROBOFLOW_DETECTION' ?
                                    (rfModels || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>) :
                                    (tmModels || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                }
                            </select>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.targetClass')}</span>
                            <input
                                type="text"
                                style={{ ...styles.input, width: '120px' }}
                                placeholder={t('studioModel.modelBuilder.rulesEditor.targetClassPlaceholder')}
                                value={rule.params.targetClass || ''}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, { params: { ...rule.params, targetClass: e.target.value } })}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.85rem' }}>{t('studioModel.modelBuilder.rulesEditor.threshold')}</span>
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
                                placeholder={t('studioModel.modelBuilder.rulesEditor.advancedScriptPlaceholder')}
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
                                {t('studioModel.modelBuilder.rulesEditor.aiLogicCheck')}
                            </button>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontStyle: 'italic' }}>
                            {t('studioModel.modelBuilder.rulesEditor.advancedScriptTips')}
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
                        {t('studioModel.modelBuilder.rulesEditor.predictionTolerance')}
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
                        {rule.params.trustPersistent !== false ? t('studioModel.modelBuilder.rulesEditor.resilient') : t('studioModel.modelBuilder.rulesEditor.strict')}
                    </button>
                </div>

                {/* Duration and Frequency Controls */}
                <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => handleUpdateRule(transitionId, rule.id, {
                            durationConfig: rule.durationConfig ? null : { minDuration: 3, maxDuration: null, resetOnFalse: true }
                        })}
                        style={{
                            padding: '6px 12px',
                            background: rule.durationConfig ? '#0ea5e9' : '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        ⏱️ {rule.durationConfig ? 'Disable' : 'Enable'} Duration
                    </button>

                    <button
                        onClick={() => handleUpdateRule(transitionId, rule.id, {
                            frequencyConfig: rule.frequencyConfig ? null : { count: 5, window: 60, resetMode: 'SLIDING' }
                        })}
                        style={{
                            padding: '6px 12px',
                            background: rule.frequencyConfig ? '#f59e0b' : '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🔢 {rule.frequencyConfig ? 'Disable' : 'Enable'} Frequency
                    </button>
                </div>

                {/* Duration Configuration UI */}
                {rule.durationConfig && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #0ea5e9' }}>
                        <div style={{ fontSize: '0.75rem', color: '#60a5fa', marginBottom: '8px', fontWeight: '600' }}>
                            ⏱️ Duration Settings
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Min Duration (s)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={rule.durationConfig.minDuration || 0}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, {
                                        durationConfig: { ...rule.durationConfig, minDuration: parseFloat(e.target.value) || 0 }
                                    })}
                                    style={{ width: '100%', padding: '6px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Max Duration (s)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.1"
                                    value={rule.durationConfig.maxDuration || ''}
                                    placeholder="No limit"
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, {
                                        durationConfig: { ...rule.durationConfig, maxDuration: e.target.value ? parseFloat(e.target.value) : null }
                                    })}
                                    style={{ width: '100%', padding: '6px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', fontSize: '0.75rem', color: '#9ca3af', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={rule.durationConfig.resetOnFalse !== false}
                                onChange={(e) => handleUpdateRule(transitionId, rule.id, {
                                    durationConfig: { ...rule.durationConfig, resetOnFalse: e.target.checked }
                                })}
                            />
                            Reset timer when condition becomes false
                        </label>

                        {/* Real-time feedback */}
                        {ruleTimers[rule.id] && ruleTimers[rule.id].isActive && (
                            <div style={{ marginTop: '8px', padding: '6px', background: '#0a3a0a', borderRadius: '4px', fontSize: '0.7rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                ⏱️ Active: {ruleTimers[rule.id].elapsed.toFixed(1)}s
                            </div>
                        )}
                    </div>
                )}

                {/* Frequency Configuration UI */}
                {rule.frequencyConfig && (
                    <div style={{ marginTop: '12px', padding: '12px', background: '#1a1a1a', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: '8px', fontWeight: '600' }}>
                            🔢 Frequency Counter
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Count Threshold</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={rule.frequencyConfig.count || 1}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, {
                                        frequencyConfig: { ...rule.frequencyConfig, count: parseInt(e.target.value) || 1 }
                                    })}
                                    style={{ width: '100%', padding: '6px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Time Window (s)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={rule.frequencyConfig.window || 60}
                                    onChange={(e) => handleUpdateRule(transitionId, rule.id, {
                                        frequencyConfig: { ...rule.frequencyConfig, window: parseInt(e.target.value) || 60 }
                                    })}
                                    style={{ width: '100%', padding: '6px', background: '#111', border: '1px solid #333', color: 'white', borderRadius: '4px', fontSize: '0.85rem' }}
                                />
                            </div>
                        </div>

                        {/* Real-time feedback */}
                        {frequencyCounters[rule.id] && (
                            <div style={{ marginTop: '8px', padding: '6px', background: '#3a2a0a', borderRadius: '4px', fontSize: '0.7rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🔢 Count: {frequencyCounters[rule.id].count} / {rule.frequencyConfig.count}
                            </div>
                        )}
                    </div>
                )}
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
                    <Activity size={18} /> {t('studioModel.modelBuilder.rulesEditor.addTransition')}
                </h3>
                <div style={styles.controls}>
                    <select
                        style={styles.select}
                        value={fromState}
                        onChange={(e) => setFromState(e.target.value)}
                    >
                        <option value="">{t('studioModel.modelBuilder.rulesEditor.fromState')}</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ArrowRight size={20} color="#4b5563" />
                    <select
                        style={styles.select}
                        value={toState}
                        onChange={(e) => setToState(e.target.value)}
                    >
                        <option value="">{t('studioModel.modelBuilder.rulesEditor.toState')}</option>
                        {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <button
                        style={styles.button}
                        onClick={handleCreateTransition}
                        disabled={!fromState || !toState}
                    >
                        <Plus size={18} /> {t('studioModel.modelBuilder.rulesEditor.add')}
                    </button>
                </div>
            </div>

            <div style={styles.createSection}>
                <h3 style={styles.sectionTitle}>
                    <Library size={18} /> Rule Templates & Presets
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <select
                        style={styles.select}
                        value={selectedTemplateTransitionId}
                        onChange={(e) => setSelectedTemplateTransitionId(e.target.value)}
                    >
                        <option value="">Target Transition</option>
                        {transitions.map(tr => {
                            const from = states.find(s => s.id === tr.from)?.name || tr.from;
                            const to = states.find(s => s.id === tr.to)?.name || tr.to;
                            return <option key={tr.id} value={tr.id}>{from} → {to}</option>;
                        })}
                    </select>

                    <select
                        style={styles.select}
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                        {allTemplates.map(tpl => (
                            <option key={tpl.id} value={tpl.id}>
                                [{tpl.source === 'builtin' ? 'Built-in' : 'Library'}] {tpl.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedTemplate && (
                    <div style={{ marginBottom: '12px', color: '#9ca3af', fontSize: '0.85rem' }}>
                        {selectedTemplate.description}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                    <button style={styles.button} onClick={() => handleApplyTemplate('replace')}>
                        Apply Preset
                    </button>
                    <button style={{ ...styles.button, backgroundColor: '#374151' }} onClick={() => handleApplyTemplate('append')}>
                        Add Preset Rules
                    </button>
                    <button style={{ ...styles.button, backgroundColor: '#0f766e' }} onClick={handleSaveTransitionToLibrary}>
                        Save to Library
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <button style={{ ...styles.button, backgroundColor: '#1d4ed8' }} onClick={handleExportRules}>
                        <Download size={16} /> Export Rules
                    </button>
                    <button style={{ ...styles.button, backgroundColor: '#7c3aed' }} onClick={() => importInputRef.current?.click()}>
                        <Upload size={16} /> Import Rules
                    </button>
                    <input
                        ref={importInputRef}
                        type="file"
                        accept="application/json"
                        style={{ display: 'none' }}
                        onChange={handleImportRules}
                    />
                </div>

                {ruleLibrary.length > 0 && (
                    <div style={{ borderTop: '1px solid #374151', paddingTop: '12px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '8px' }}>Rule Library</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ruleLibrary.map(item => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111827', border: '1px solid #374151', borderRadius: '8px', padding: '8px 10px' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', color: 'white' }}>{item.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{item.description}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button
                                            style={{ ...styles.button, padding: '6px 10px', backgroundColor: '#374151' }}
                                            onClick={() => {
                                                setSelectedTemplateId(item.id);
                                                handleApplyTemplate('append');
                                            }}
                                        >
                                            Use
                                        </button>
                                        <button
                                            style={{ ...styles.button, padding: '6px 10px', backgroundColor: '#7f1d1d' }}
                                            onClick={() => handleDeleteLibraryItem(item.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List Transitions */}
            <div style={styles.transitionList}>
                {transitions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#4b5563' }}>
                        <MousePointer2 size={40} style={{ marginBottom: '16px', opacity: 0.3 }} />
                        <p>{t('studioModel.modelBuilder.rulesEditor.noTransitions')}</p>
                        <p style={{ fontSize: '0.8rem' }}>{t('studioModel.modelBuilder.rulesEditor.definePaths')}</p>
                    </div>
                )}

                {transitions.map(transition => {
                    const fromName = states.find(s => s.id === transition.from)?.name || t('studioModel.modelBuilder.rulesEditor.unknownState');
                    const toName = states.find(s => s.id === transition.to)?.name || t('studioModel.modelBuilder.rulesEditor.unknownState');
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
                                        <Activity size={14} /> {t('studioModel.modelBuilder.rulesEditor.hysteresis')}
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
                                    <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{t('studioModel.modelBuilder.rulesEditor.seconds')}</span>
                                </div>

                                <div style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                        <h4 style={{ margin: 0, color: '#9ca3af', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('studioModel.modelBuilder.rulesEditor.conditions')}</h4>
                                        <button
                                            onClick={() => {
                                                const newMode = !useLogicTree[transition.id];
                                                setUseLogicTree(prev => ({ ...prev, [transition.id]: newMode }));

                                                if (newMode && !transition.condition.logicTree) {
                                                    onUpdateTransition(transition.id, {
                                                        condition: {
                                                            ...transition.condition,
                                                            logicTree: createDefaultTree(transition)
                                                        }
                                                    });
                                                }
                                            }}
                                            style={{
                                                padding: '4px 8px',
                                                background: useLogicTree[transition.id] ? '#8b5cf6' : '#374151',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                fontSize: '0.7rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            🌳 {useLogicTree[transition.id] ? t('studioModel.modelBuilder.rulesEditor.simpleMode') || 'Simple Mode' : t('studioModel.modelBuilder.rulesEditor.logicTree') || 'Logic Tree'}
                                        </button>
                                    </div>

                                    {useLogicTree[transition.id] ? (
                                        <LogicTreeBuilder
                                            tree={transition.condition.logicTree || createDefaultTree(transition)}
                                            rules={transition.condition.rules}
                                            checkRuleStatus={checkRuleStatus}
                                            onUpdate={(newTree) => {
                                                onUpdateTransition(transition.id, {
                                                    condition: {
                                                        ...transition.condition,
                                                        logicTree: newTree
                                                    }
                                                });
                                            }}
                                        />
                                    ) : (
                                        <>
                                            {transition.condition.rules.map((rule, idx) => (
                                                <div key={rule.id || idx} style={{ ...styles.ruleItem, borderColor: rule.aiGenerated ? '#a855f7' : '#374151' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
                                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: rule.aiGenerated ? '#a855f7' : '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            {rule.aiGenerated ? <Sparkles size={14} /> : null}
                                                            {t('studioModel.modelBuilder.rulesEditor.ruleHash')}{idx + 1} {rule.aiGenerated ? '(AI)' : ''}
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
                                                                {t('studioModel.modelBuilder.rulesEditor.invertNOT')}
                                                            </label>
                                                            <button
                                                                style={{ background: 'transparent', border: 'none', color: '#60a5fa', cursor: 'pointer' }}
                                                                onClick={() => handleDuplicateRule(transition.id, rule.id)}
                                                                title={t('studioModel.modelBuilder.rulesEditor.duplicateRule')}
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

                                            <div style={{ display: 'flex', gap: '10px' }}>
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
                                                    <Plus size={16} /> {t('studioModel.modelBuilder.rulesEditor.addRuleCondition')}
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
                                                    {aiLoading[transition.id] ? t('studioModel.modelBuilder.rulesEditor.aiThinking') : t('studioModel.modelBuilder.rulesEditor.aiSuggestRule')}
                                                </button>
                                            </div>
                                        </>
                                    )}
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
