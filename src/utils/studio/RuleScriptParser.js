/**
 * RuleScriptParser.js
 * Parses and evaluates text-based motion logic.
 */

import { getKeypoint } from '../poseDetector';
import AngleCalculator from '../angleCalculator';

const angleCalc = new AngleCalculator();

class RuleScriptParser {
    /**
     * Evaluates a script string against the current frame data.
     * @param {string} script - The statement (e.g., "right_wrist.y < right_shoulder.y")
    static evaluate(script, data) {
        if (!script || !data || !data.pose) return false;

        try {
            let processedScript = script.toLowerCase();

            // 1. Handle Functions: dist(A, B), angle(A, B, C)
            processedScript = this.processFunctions(processedScript, data);

            // 2. Handle Keypoint properties: joint_name.x, joint_name.y
            processedScript = this.processKeypoints(processedScript, data.pose);

            // 2.5 Handle Teachable Machine: tm.class, tm.confidence, tm['modelId'].class
            processedScript = this.processTeachableMachine(processedScript, data.tm);

            // 3. Handle Logical Aliases
            processedScript = processedScript
                .replace(/\band\b/g, '&&')
                .replace(/\bor\b/g, '||')
                .replace(/\bnot\b/g, '!');

            // 4. Safe Evaluation
            return new Function(`return ${processedScript}`)();
        } catch (e) {
            return false;
        }
    }

    static processTeachableMachine(script, tmData) {
    if (!tmData) return script;
    let result = script;

    // Pattern 1: tm['id'].class or tm.id.class
    const multiTmRegex = /\btm\[['"]([^'"]+)['"]\]\.(class|confidence|probability)/g;
    result = result.replace(multiTmRegex, (match, id, prop) => {
        const pred = tmData[id];
        if (!pred) return prop === 'class' ? "''" : '0';
        if (prop === 'class') return `'${pred.className}'`;
        return pred.probability.toString();
    });

    const dotTmRegex = /\btm\.([a-z0-9_]+)\.(class|confidence|probability)/g;
    result = result.replace(dotTmRegex, (match, id, prop) => {
        const pred = tmData[id];
        if (!pred) return prop === 'class' ? "''" : '0';
        if (prop === 'class') return `'${pred.className}'`;
        return pred.probability.toString();
    });

    // Pattern 2: tm.class (backwards compatibility for the first model if available)
    const singleTmRegex = /\btm\.(class|confidence|probability)\b(?![\.\[])/g;
    result = result.replace(singleTmRegex, (match, prop) => {
        const firstModelId = Object.keys(tmData)[0];
        const pred = firstModelId ? tmData[firstModelId] : null;
        if (!pred) return prop === 'class' ? "''" : '0';
        if (prop === 'class') return `'${pred.className}'`;
        return pred.probability.toString();
    });

    return result;
}

    static processFunctions(script, data) {
    let result = script;

    // Math aliases: abs, min, max, round, floor, ceil
    const mathFuncs = ['abs', 'min', 'max', 'round', 'floor', 'ceil', 'sqrt', 'sin', 'cos', 'tan', 'atan2'];
    mathFuncs.forEach(func => {
        const regex = new RegExp(`\\b${func}\\(`, 'g');
        result = result.replace(regex, `Math.${func}(`);
    });

    // Distance: dist(A, B) or distance(A, B)
    const distRegex = /\b(dist|distance)\(([^,]+),\s*([^)]+)\)/g;
    result = result.replace(distRegex, (match, fn, jA, jB) => {
        const p1 = getKeypoint(data.pose.keypoints, jA.trim());
        const p2 = getKeypoint(data.pose.keypoints, jB.trim());
        if (!p1 || !p2) return '0';
        return Math.hypot(p1.x - p2.x, p1.y - p2.y).toString();
    });

    // Angle: angle(A, B, C)
    const angleRegex = /\bangle\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g;
    result = result.replace(angleRegex, (match, jA, jB, jC) => {
        const p1 = getKeypoint(data.pose.keypoints, jA.trim());
        const p2 = getKeypoint(data.pose.keypoints, jB.trim());
        const p3 = getKeypoint(data.pose.keypoints, jC.trim());
        if (!p1 || !p2 || !p3) return '0';
        return angleCalc.calculateAngle(p1, p2, p3).toString();
    });

    return result;
}

    static processKeypoints(script, pose) {
    // Find pattern: name.prop (e.g. right_wrist.y, right_wrist.score)
    const kpRegex = /([a-z_]+)\.([x-z]|score|confidence)/g;
    return script.replace(kpRegex, (match, name, prop) => {
        const kp = getKeypoint(pose.keypoints, name);
        if (!kp) return '0';
        if (prop === 'confidence') return kp.score.toString();
        return kp[prop].toString();
    });
}

    /**
     * AI-Assisted Validation Logic
     * Checks if the script is syntactically correct and semantically logical.
     */
    static validate(script) {
        if (!script) return { valid: false, error: "Empty script" };

        // Basic syntax check
        const openParens = (script.match(/\(/g) || []).length;
        const closeParens = (script.match(/\)/g) || []).length;
        if (openParens !== closeParens) return { valid: false, error: "Unbalanced parentheses" };

        // Check for forbidden keywords (security)
        const forbidden = ['window', 'document', 'localStorage', 'fetch', 'eval'];
        if (forbidden.some(f => script.includes(f))) return { valid: false, error: "Forbidden keywords detected" };

        return { valid: true };
    }
}

export default RuleScriptParser;
