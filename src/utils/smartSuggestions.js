/**
 * Smart Suggestions Utilities
 * Provides intelligent auto-complete and suggestions based on historical data
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching and similarity scoring
 */
export function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }

    return matrix[len1][len2];
}

/**
 * Calculate similarity score between two strings (0-1)
 */
export function calculateSimilarity(str1, str2) {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Get element name suggestions based on input and history
 */
export function getElementNameSuggestions(input, measurements, limit = 5) {
    if (!input || input.length < 2) return [];

    // Get unique element names from history
    const uniqueNames = [...new Set(measurements.map(m => m.elementName))];

    // Calculate similarity scores
    const scored = uniqueNames.map(name => ({
        name,
        score: calculateSimilarity(input, name)
    }));

    // Filter and sort by score
    return scored
        .filter(item => item.score > 0.3) // Minimum 30% similarity
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.name);
}

/**
 * Suggest category based on element name patterns
 */
export function suggestCategory(elementName, measurements) {
    const lowerName = elementName.toLowerCase();

    // Common patterns for categories
    const patterns = {
        'Manual': ['pick', 'place', 'grasp', 'move', 'reach', 'position', 'assemble', 'insert', 'remove', 'hold'],
        'Auto': ['machine', 'automatic', 'auto', 'cycle', 'process', 'drill', 'cut', 'weld'],
        'Walk': ['walk', 'move to', 'go to', 'travel', 'transport', 'carry'],
        'Inspect': ['check', 'inspect', 'verify', 'measure', 'test', 'examine'],
        'Delay': ['wait', 'delay', 'idle', 'pause']
    };

    // Check patterns
    for (const [category, keywords] of Object.entries(patterns)) {
        if (keywords.some(keyword => lowerName.includes(keyword))) {
            return category;
        }
    }

    // Check historical data
    const similarMeasurements = measurements.filter(m =>
        calculateSimilarity(elementName, m.elementName) > 0.7
    );

    if (similarMeasurements.length > 0) {
        // Return most common category from similar measurements
        const categories = similarMeasurements.map(m => m.category);
        const categoryCount = {};
        categories.forEach(cat => {
            categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        });
        const mostCommon = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0];
        return mostCommon ? mostCommon[0] : 'Manual';
    }

    return 'Manual'; // Default
}

/**
 * Suggest Therblig based on element name
 */
export function suggestTherblig(elementName) {
    const lowerName = elementName.toLowerCase();

    const therbligPatterns = {
        'TE': ['reach', 'extend'],
        'TL': ['grasp', 'grab', 'pick', 'take'],
        'PP': ['pre-position', 'prepare'],
        'G': ['assemble', 'put together'],
        'A': ['use', 'operate', 'apply'],
        'DA': ['disassemble', 'take apart'],
        'RL': ['release', 'let go', 'drop'],
        'TR': ['transport', 'move', 'carry'],
        'H': ['hold', 'support'],
        'UD': ['unavoidable delay', 'wait'],
        'AD': ['avoidable delay', 'idle'],
        'P': ['position', 'place', 'locate'],
        'I': ['inspect', 'check', 'examine'],
        'PN': ['plan', 'think', 'decide'],
        'ST': ['search', 'find', 'look for'],
        'S': ['select', 'choose'],
        'F': ['find', 'locate']
    };

    for (const [therblig, keywords] of Object.entries(therbligPatterns)) {
        if (keywords.some(keyword => lowerName.includes(keyword))) {
            return therblig;
        }
    }

    return '';
}

/**
 * Detect duplicate or very similar measurements
 */
export function detectDuplicates(newMeasurement, existingMeasurements, threshold = 0.9) {
    const duplicates = existingMeasurements.filter(m => {
        const nameSimilarity = calculateSimilarity(newMeasurement.elementName, m.elementName);
        const timeSimilarity = Math.abs(newMeasurement.duration - m.duration) < 0.5; // Within 0.5 seconds
        const categorySame = newMeasurement.category === m.category;

        return nameSimilarity > threshold && timeSimilarity && categorySame;
    });

    return duplicates;
}

/**
 * Find similar measurements for reference
 */
export function findSimilarMeasurements(measurement, allMeasurements, limit = 5) {
    const scored = allMeasurements
        .filter(m => m.id !== measurement.id)
        .map(m => ({
            measurement: m,
            score: calculateSimilarity(measurement.elementName, m.elementName)
        }));

    return scored
        .filter(item => item.score > 0.5)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => item.measurement);
}

/**
 * Get recent measurements for quick access
 */
export function getRecentMeasurements(measurements, limit = 10) {
    return [...measurements]
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
        .slice(0, limit);
}

/**
 * Auto-complete suggestions combining multiple sources
 */
export function getAutoCompleteSuggestions(input, measurements, currentCategory = null) {
    const suggestions = {
        elementNames: getElementNameSuggestions(input, measurements, 5),
        category: currentCategory || suggestCategory(input, measurements),
        therblig: suggestTherblig(input),
        recent: getRecentMeasurements(measurements, 5)
    };

    return suggestions;
}

/**
 * Validate measurement and provide warnings
 */
export function validateMeasurement(measurement, existingMeasurements) {
    const warnings = [];
    const suggestions = [];

    // Check for duplicates
    const duplicates = detectDuplicates(measurement, existingMeasurements);
    if (duplicates.length > 0) {
        warnings.push({
            type: 'duplicate',
            message: `Similar measurement found: "${duplicates[0].elementName}"`,
            severity: 'warning'
        });
    }

    // Check duration reasonableness
    if (measurement.duration < 0.1) {
        warnings.push({
            type: 'duration',
            message: 'Duration is very short (< 0.1s). Is this correct?',
            severity: 'info'
        });
    }

    if (measurement.duration > 60) {
        warnings.push({
            type: 'duration',
            message: 'Duration is very long (> 60s). Consider breaking into smaller elements.',
            severity: 'warning'
        });
    }

    // Suggest category if not set
    if (!measurement.category) {
        const suggestedCategory = suggestCategory(measurement.elementName, existingMeasurements);
        suggestions.push({
            type: 'category',
            message: `Suggested category: ${suggestedCategory}`,
            value: suggestedCategory
        });
    }

    // Suggest therblig if not set
    if (!measurement.therblig) {
        const suggestedTherblig = suggestTherblig(measurement.elementName);
        if (suggestedTherblig) {
            suggestions.push({
                type: 'therblig',
                message: `Suggested Therblig: ${suggestedTherblig}`,
                value: suggestedTherblig
            });
        }
    }

    return { warnings, suggestions };
}
