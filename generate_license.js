// Run this script with Node.js to generate a license key
// Usage: node generate_license.js [NAME] [ID]
// Example: node generate_license.js ACER 0001

const SECRET_SALT = 'MAVI_ROCKS_2024';

function generateKey(part1, part2) {
    // Normalize inputs
    const p1 = (part1 || 'USER').toUpperCase().slice(0, 4).padEnd(4, 'X');
    const p2 = (part2 || '0000').toUpperCase().slice(0, 4).padEnd(4, '0');

    const input = p1 + p2 + SECRET_SALT;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to hex, absolute value, 4 chars, uppercase
    const checksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, '0');

    return `MAVI-${p1}-${p2}-${checksum}`;
}

// Get arguments from command line
const args = process.argv.slice(2);
const name = args[0];
const id = args[1];

const key = generateKey(name, id);

console.log('\n==================================================');
console.log('✅ GENERATED LICENSE KEY');
console.log('==================================================');
console.log(`\n${key}\n`);
console.log('==================================================');
console.log('Copy this key and paste it into the application.');
