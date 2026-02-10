/**
 * MTM (Methods-Time Measurement) Data Tables
 * Time values are in TMU (Time Measurement Units)
 * 1 TMU = 0.00001 hour = 0.0006 minute = 0.036 second
 */

// TMU conversion factors
export const TMU_TO_SECONDS = 0.036;
export const TMU_TO_MINUTES = 0.0006;
export const TMU_TO_HOURS = 0.00001;

// REACH (R) - Time values in TMU
export const REACH_TABLE = {
    'A': { // Reach to object in fixed location
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 3.6 },
            { distance: 6, tmu: 5.0 },
            { distance: 8, tmu: 6.1 },
            { distance: 10, tmu: 7.3 },
            { distance: 12, tmu: 8.4 },
            { distance: 14, tmu: 9.4 },
            { distance: 16, tmu: 10.5 },
            { distance: 18, tmu: 11.5 },
            { distance: 20, tmu: 12.5 },
            { distance: 22, tmu: 13.4 },
            { distance: 24, tmu: 14.4 },
            { distance: 26, tmu: 15.3 },
            { distance: 28, tmu: 16.2 },
            { distance: 30, tmu: 17.1 }
        ]
    },
    'B': { // Reach to single object in location which may vary
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 3.9 },
            { distance: 6, tmu: 5.3 },
            { distance: 8, tmu: 6.8 },
            { distance: 10, tmu: 8.0 },
            { distance: 12, tmu: 9.3 },
            { distance: 14, tmu: 10.5 },
            { distance: 16, tmu: 11.8 },
            { distance: 18, tmu: 12.9 },
            { distance: 20, tmu: 14.2 },
            { distance: 22, tmu: 15.3 },
            { distance: 24, tmu: 16.5 },
            { distance: 26, tmu: 17.6 },
            { distance: 28, tmu: 18.8 },
            { distance: 30, tmu: 19.8 }
        ]
    },
    'C': { // Reach to object jumbled with other objects
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 5.3 },
            { distance: 6, tmu: 7.3 },
            { distance: 8, tmu: 9.4 },
            { distance: 10, tmu: 11.4 },
            { distance: 12, tmu: 13.3 },
            { distance: 14, tmu: 15.3 },
            { distance: 16, tmu: 17.3 },
            { distance: 18, tmu: 19.2 },
            { distance: 20, tmu: 21.2 },
            { distance: 22, tmu: 23.2 },
            { distance: 24, tmu: 25.1 },
            { distance: 26, tmu: 27.1 },
            { distance: 28, tmu: 29.0 },
            { distance: 30, tmu: 31.0 }
        ]
    }
};

// MOVE (M) - Time values in TMU
export const MOVE_TABLE = {
    'A': { // Move object to other hand or against stop
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 3.4 },
            { distance: 6, tmu: 4.3 },
            { distance: 8, tmu: 5.2 },
            { distance: 10, tmu: 6.1 },
            { distance: 12, tmu: 6.9 },
            { distance: 14, tmu: 7.7 },
            { distance: 16, tmu: 8.6 },
            { distance: 18, tmu: 9.4 },
            { distance: 20, tmu: 10.3 },
            { distance: 22, tmu: 11.1 },
            { distance: 24, tmu: 11.8 },
            { distance: 26, tmu: 12.7 },
            { distance: 28, tmu: 13.5 },
            { distance: 30, tmu: 14.3 }
        ]
    },
    'B': { // Move object to approximate location
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 4.0 },
            { distance: 6, tmu: 5.7 },
            { distance: 8, tmu: 7.4 },
            { distance: 10, tmu: 9.1 },
            { distance: 12, tmu: 10.8 },
            { distance: 14, tmu: 12.5 },
            { distance: 16, tmu: 14.2 },
            { distance: 18, tmu: 15.8 },
            { distance: 20, tmu: 17.5 },
            { distance: 22, tmu: 19.2 },
            { distance: 24, tmu: 20.8 },
            { distance: 26, tmu: 22.5 },
            { distance: 28, tmu: 24.2 },
            { distance: 30, tmu: 25.8 }
        ]
    },
    'C': { // Move object to exact location
        distances: [
            { distance: 2, tmu: 2.0 },
            { distance: 4, tmu: 5.6 },
            { distance: 6, tmu: 8.9 },
            { distance: 8, tmu: 12.2 },
            { distance: 10, tmu: 15.5 },
            { distance: 12, tmu: 18.8 },
            { distance: 14, tmu: 22.1 },
            { distance: 16, tmu: 25.4 },
            { distance: 18, tmu: 28.7 },
            { distance: 20, tmu: 32.0 },
            { distance: 22, tmu: 35.3 },
            { distance: 24, tmu: 38.6 },
            { distance: 26, tmu: 41.9 },
            { distance: 28, tmu: 45.2 },
            { distance: 30, tmu: 48.5 }
        ]
    }
};

// GRASP (G) - Time values in TMU
export const GRASP_TABLE = {
    'G1A': { name: 'Pick up grasp - any size', tmu: 2.0 },
    'G1B': { name: 'Very small object', tmu: 3.5 },
    'G1C1': { name: 'Interference with grasp on bottom and one side', tmu: 7.3 },
    'G1C2': { name: 'Interference with grasp on bottom and two sides', tmu: 8.7 },
    'G1C3': { name: 'Interference with grasp on bottom and three sides', tmu: 10.8 },
    'G2': { name: 'Regrasp', tmu: 5.6 },
    'G3': { name: 'Transfer grasp', tmu: 5.6 },
    'G4A': { name: 'Object jumbled with other objects - easily', tmu: 7.3 },
    'G4B': { name: 'Object jumbled with other objects - search and select', tmu: 9.1 },
    'G4C': { name: 'Object jumbled with other objects - difficult', tmu: 12.9 },
    'G5': { name: 'Contact grasp', tmu: 0 }
};

// POSITION (P) - Time values in TMU
export const POSITION_TABLE = {
    'P1SE': { name: 'Fit - loose, no pressure', tmu: 5.6 },
    'P1SS': { name: 'Fit - loose, light pressure', tmu: 9.1 },
    'P1SD': { name: 'Fit - loose, heavy pressure', tmu: 10.4 },
    'P2SE': { name: 'Fit - close, no pressure', tmu: 16.2 },
    'P2SS': { name: 'Fit - close, light pressure', tmu: 19.7 },
    'P2SD': { name: 'Fit - close, heavy pressure', tmu: 21.8 },
    'P3SE': { name: 'Fit - exact, no pressure', tmu: 43.0 },
    'P3SS': { name: 'Fit - exact, light pressure', tmu: 46.5 },
    'P3SD': { name: 'Fit - exact, heavy pressure', tmu: 48.6 }
};

// RELEASE (RL) - Time values in TMU
export const RELEASE_TABLE = {
    'RL1': { name: 'Normal release', tmu: 2.0 },
    'RL2': { name: 'Contact release', tmu: 0 }
};

// TURN (T) - Time values in TMU per degree
export const TURN_TABLE = {
    'T30S': { name: 'Turn 30° - small', tmu: 2.8 },
    'T30M': { name: 'Turn 30° - medium', tmu: 4.4 },
    'T30L': { name: 'Turn 30° - large', tmu: 5.4 },
    'T45S': { name: 'Turn 45° - small', tmu: 3.5 },
    'T45M': { name: 'Turn 45° - medium', tmu: 5.5 },
    'T45L': { name: 'Turn 45° - large', tmu: 6.8 },
    'T60S': { name: 'Turn 60° - small', tmu: 4.1 },
    'T60M': { name: 'Turn 60° - medium', tmu: 6.5 },
    'T60L': { name: 'Turn 60° - large', tmu: 8.0 },
    'T75S': { name: 'Turn 75° - small', tmu: 4.8 },
    'T75M': { name: 'Turn 75° - medium', tmu: 7.5 },
    'T75L': { name: 'Turn 75° - large', tmu: 9.4 },
    'T90S': { name: 'Turn 90° - small', tmu: 5.4 },
    'T90M': { name: 'Turn 90° - medium', tmu: 8.5 },
    'T90L': { name: 'Turn 90° - large', tmu: 10.6 },
    'T120S': { name: 'Turn 120° - small', tmu: 6.8 },
    'T120M': { name: 'Turn 120° - medium', tmu: 10.6 },
    'T120L': { name: 'Turn 120° - large', tmu: 13.5 },
    'T180S': { name: 'Turn 180° - small', tmu: 8.4 },
    'T180M': { name: 'Turn 180° - medium', tmu: 12.8 },
    'T180L': { name: 'Turn 180° - large', tmu: 15.8 }
};

// APPLY PRESSURE (AP) - Time values in TMU
export const APPLY_PRESSURE_TABLE = {
    'AP1': { name: 'Apply pressure - minimum', tmu: 10.6 },
    'AP2': { name: 'Apply pressure - normal', tmu: 16.2 },
    'APA': { name: 'Apply pressure - additional', tmu: 3.4 }
};

// Helper function to get TMU value for Reach
export function getReachTMU(caseType, distance) {
    const table = REACH_TABLE[caseType];
    if (!table) return 0;

    // Find closest distance
    const closest = table.distances.reduce((prev, curr) => {
        return Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev;
    });

    return closest.tmu;
}

// Helper function to get TMU value for Move
export function getMoveTMU(caseType, distance) {
    const table = MOVE_TABLE[caseType];
    if (!table) return 0;

    // Find closest distance
    const closest = table.distances.reduce((prev, curr) => {
        return Math.abs(curr.distance - distance) < Math.abs(prev.distance - distance) ? curr : prev;
    });

    return closest.tmu;
}

// Helper function to convert TMU to seconds
export function tmuToSeconds(tmu) {
    return tmu * TMU_TO_SECONDS;
}

// Helper function to convert TMU to minutes
export function tmuToMinutes(tmu) {
    return tmu * TMU_TO_MINUTES;
}

// Helper function to convert TMU to hours
export function tmuToHours(tmu) {
    return tmu * TMU_TO_HOURS;
}

// Get all motion types
export function getMotionTypes() {
    return [
        { value: 'reach', label: 'Reach (R)' },
        { value: 'move', label: 'Move (M)' },
        { value: 'grasp', label: 'Grasp (G)' },
        { value: 'position', label: 'Position (P)' },
        { value: 'release', label: 'Release (RL)' },
        { value: 'turn', label: 'Turn (T)' },
        { value: 'applyPressure', label: 'Apply Pressure (AP)' }
    ];
}
