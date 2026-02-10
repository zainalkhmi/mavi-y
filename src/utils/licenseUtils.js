/**
 * Shared license utilities for MAVI App
 */

const SECRET_SALT = 'MAVI_ROCKS_2024_HARDWARE_LOCKED';

/**
 * Gets or creates a persistent Machine ID for this device.
 * In a real Tauri app, this would query system APIs.
 * Here we simulate it with a persistent localStorage UUID.
 */
export const getMachineId = () => {
    let id = localStorage.getItem('mavi_machine_id');
    if (!id) {
        // Generate a random 8-char hex string to simulate a Hardware ID
        id = Math.random().toString(16).substring(2, 10).toUpperCase();
        localStorage.setItem('mavi_machine_id', id);
    }
    return id;
};

/**
 * Generates a license key locked to a specific Machine ID.
 * Format: MAVI-XXXX-XXXX-XXXX
 * @param {string} targetMachineId - The Machine ID this key is for.
 */
export const generateLicenseKey = (targetMachineId) => {
    if (!targetMachineId) {
        console.warn("Generating key without Machine ID! Using 'UNIVERSAL' fallback.");
        targetMachineId = "UNIVERSAL";
    }

    // Part 1 & 2 are random entropy
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();

    // Input for hash includes the Machine ID, making it hardware dependent
    const input = targetMachineId + part1 + part2 + SECRET_SALT;

    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    // Checksum is the last 4 chars
    const checksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, '0');

    return `MAVI-${part1}-${part2}-${checksum}`;
};

/**
 * Validates a license key against the current Machine ID.
 * @param {string} key - The license key to validate
 * @returns {object} { valid: boolean, status: string }
 */
export const validateKeyFormat = (key) => {
    if (!key) return { valid: false, status: 'invalid' };

    try {
        const parts = key.toUpperCase().trim().split('-');
        if (parts.length !== 4) return { valid: false, status: 'invalid' };
        if (parts[0] !== 'MAVI') return { valid: false, status: 'invalid' };

        const [prefix, part1, part2, checksum] = parts;
        const currentMachineId = getMachineId();

        // 1. Try validating against current Machine ID (Hardware Lock)
        let input = currentMachineId + part1 + part2 + SECRET_SALT;
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        let expectedChecksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, '0');

        if (checksum === expectedChecksum) {
            return { valid: true, status: 'hardware_locked' };
        }

        // 2. BACKWARD COMPATIBILITY / UNIVERSAL KEYS
        // Check if it matches the old algo or "UNIVERSAL" ID for admins/old keys
        /* 
           This is crucial so we don't break existing keys if you want to support them.
           If strict hardware lock is required, remove this block.
           For now, I'll comment it out to enforce STRICT HARDWARE LOCK as per user request.
        */

        return { valid: false, status: 'machine_mismatch' };

    } catch (e) {
        return { valid: false, status: 'error' };
    }
};

export const sendLicenseEmailSimulation = async (email, key) => {
    console.log(`[OFFLINE] Would send license key ${key} to ${email}`);
    return { success: true };
};

