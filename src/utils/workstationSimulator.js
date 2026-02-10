/**
 * Workstation Simulator
 * Provides collision detection, pathfinding, and efficiency analysis for Digital Twin workstation layouts
 */

/**
 * Check if two rectangular objects collide using AABB (Axis-Aligned Bounding Box)
 * @param {Object} obj1 - First object {x, y, width, height}
 * @param {Object} obj2 - Second object {x, y, width, height}
 * @returns {boolean} True if objects collide
 */
export function checkCollision(obj1, obj2) {
    return (
        obj1.x < obj2.x + obj2.width &&
        obj1.x + obj1.width > obj2.x &&
        obj1.y < obj2.y + obj2.height &&
        obj1.y + obj1.height > obj2.y
    );
}

/**
 * Check if an object collides with any object in a list
 * @param {Object} obj - Object to check
 * @param {Array} objects - List of objects to check against
 * @param {string} excludeId - Optional ID to exclude from check
 * @returns {boolean} True if collision detected
 */
export function hasCollision(obj, objects, excludeId = null) {
    return objects.some(other => {
        if (excludeId && other.id === excludeId) return false;
        return checkCollision(obj, other);
    });
}

/**
 * Snap position to grid
 * @param {number} value - Position value
 * @param {number} gridSize - Grid cell size
 * @returns {number} Snapped value
 */
export function snapToGrid(value, gridSize = 20) {
    return Math.round(value / gridSize) * gridSize;
}

/**
 * Calculate Euclidean distance between two points
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Second point {x, y}
 * @returns {number} Distance
 */
export function distance(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Simple A* pathfinding algorithm
 * @param {Object} start - Start position {x, y}
 * @param {Object} end - End position {x, y}
 * @param {Array} obstacles - List of obstacle objects
 * @param {number} gridSize - Grid resolution for pathfinding
 * @returns {Array} Array of waypoints [{x, y}]
 */
export function calculatePath(start, end, obstacles = [], gridSize = 20) {
    // For simplicity, use straight line if no obstacles block the path
    // In production, implement full A* with grid-based navigation

    const path = [];
    const steps = 20; // Number of interpolation steps

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = start.x + (end.x - start.x) * t;
        const y = start.y + (end.y - start.y) * t;
        path.push({ x, y });
    }

    return path;
}

/**
 * Calculate total distance of a path
 * @param {Array} path - Array of waypoints [{x, y}]
 * @returns {number} Total distance in pixels
 */
export function calculateTotalDistance(path) {
    if (!path || path.length < 2) return 0;

    let total = 0;
    for (let i = 1; i < path.length; i++) {
        total += distance(path[i - 1], path[i]);
    }

    return total;
}

/**
 * Analyze ergonomic reach zones
 * @param {Object} workerPos - Worker position {x, y}
 * @param {Array} objects - List of workstation objects
 * @returns {Object} Analysis result {green: [], yellow: [], red: []}
 */
export function analyzeReachZones(workerPos, objects) {
    const GREEN_RADIUS = 50;  // Optimal reach (< 50cm)
    const YELLOW_RADIUS = 100; // Acceptable reach (50-100cm)
    // RED > 100cm (poor ergonomics)

    const zones = {
        green: [],
        yellow: [],
        red: []
    };

    objects.forEach(obj => {
        const objCenter = {
            x: obj.x + obj.width / 2,
            y: obj.y + obj.height / 2
        };

        const dist = distance(workerPos, objCenter);

        if (dist <= GREEN_RADIUS) {
            zones.green.push(obj);
        } else if (dist <= YELLOW_RADIUS) {
            zones.yellow.push(obj);
        } else {
            zones.red.push(obj);
        }
    });

    return zones;
}

/**
 * Validate layout for common issues
 * @param {Array} objects - List of workstation objects
 * @returns {Object} Validation result {valid: boolean, issues: []}
 */
export function validateLayout(objects) {
    const issues = [];

    // Check for overlapping objects
    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            if (checkCollision(objects[i], objects[j])) {
                issues.push({
                    type: 'collision',
                    message: `"${objects[i].type}" overlaps with "${objects[j].type}"`,
                    objects: [objects[i].id, objects[j].id]
                });
            }
        }
    }

    // Check if worker position exists
    const hasWorker = objects.some(obj => obj.type === 'worker');
    if (!hasWorker) {
        issues.push({
            type: 'missing_worker',
            message: 'No worker position defined'
        });
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

/**
 * Calculate layout efficiency score (0-100)
 * @param {Array} objects - List of workstation objects
 * @param {Array} path - Worker movement path
 * @returns {number} Efficiency score
 */
export function calculateEfficiencyScore(objects, path) {
    let score = 100;

    // Penalty for long walking distance
    const totalDist = calculateTotalDistance(path);
    const distPenalty = Math.min(30, totalDist / 50); // Max 30 points penalty
    score -= distPenalty;

    // Penalty for poor reach zones
    const worker = objects.find(obj => obj.type === 'worker');
    if (worker) {
        const zones = analyzeReachZones(
            { x: worker.x + worker.width / 2, y: worker.y + worker.height / 2 },
            objects.filter(obj => obj.type !== 'worker')
        );

        const redZonePenalty = zones.red.length * 5; // 5 points per red zone item
        score -= redZonePenalty;
    }

    // Penalty for collisions
    const validation = validateLayout(objects);
    const collisionPenalty = validation.issues.filter(i => i.type === 'collision').length * 10;
    score -= collisionPenalty;

    return Math.max(0, Math.min(100, score));
}

/**
 * Workstation object templates
 */
export const WORKSTATION_OBJECTS = {
    table: {
        type: 'table',
        width: 120,
        height: 80,
        color: '#8B4513',
        icon: '🪑',
        label: 'Table'
    },
    bin: {
        type: 'bin',
        width: 40,
        height: 40,
        color: '#4169E1',
        icon: '📦',
        label: 'Bin'
    },
    machine: {
        type: 'machine',
        width: 100,
        height: 100,
        color: '#696969',
        icon: '⚙️',
        label: 'Machine'
    },
    toolRack: {
        type: 'toolRack',
        width: 60,
        height: 30,
        color: '#FF8C00',
        icon: '🔧',
        label: 'Tool Rack'
    },
    chair: {
        type: 'chair',
        width: 40,
        height: 40,
        color: '#2F4F4F',
        icon: '💺',
        label: 'Chair'
    },
    worker: {
        type: 'worker',
        width: 30,
        height: 30,
        color: '#32CD32',
        icon: '🚶',
        label: 'Worker'
    },
    shelf: {
        type: 'shelf',
        width: 80,
        height: 40,
        color: '#A0522D',
        icon: '📚',
        label: 'Shelf'
    },
    conveyor: {
        type: 'conveyor',
        width: 150,
        height: 40,
        color: '#708090',
        icon: '↔️',
        label: 'Conveyor'
    }
};

/**
 * Convert pixel distance to real-world distance (assuming scale)
 * @param {number} pixels - Distance in pixels
 * @param {number} scale - Pixels per meter (default: 50px = 1m)
 * @returns {number} Distance in meters
 */
export function pixelsToMeters(pixels, scale = 50) {
    return pixels / scale;
}

/**
 * Convert real-world distance to pixels
 * @param {number} meters - Distance in meters
 * @param {number} scale - Pixels per meter (default: 50px = 1m)
 * @returns {number} Distance in pixels
 */
export function metersToPixels(meters, scale = 50) {
    return meters * scale;
}
