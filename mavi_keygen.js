/**
 * MAVI Standalone License Key Generator
 * Version: 4.0 (Universal Lifetime)
 * 
 * Usage: 
 * node mavi_keygen.js --name "Customer Name"
 */

const SECRET_SALT = 'MAVI_ROCKS_2024';

function generateLicense(name, part2 = 'FFFF') {
    const p1 = (name || 'MAVI').toUpperCase().slice(0, 4).padEnd(4, 'X');
    const p2Normalized = part2.toUpperCase().slice(0, 4).padEnd(4, 'F');

    const input = p1 + p2Normalized + SECRET_SALT;

    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const checksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, '0');

    return `MAVI-${p1}-${p2Normalized}-${checksum}`;
}

// CLI Args
const args = process.argv.slice(2);
let userName = 'MAVI';

for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--name' || args[i] === '-n') && args[i + 1]) userName = args[i + 1];
}

console.log('\n\x1b[36m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\x1b[1m%s\x1b[0m', '      MAVI LICENSE GENERATOR v4.0 (Lifetime)       ');
console.log('\x1b[36m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const key = generateLicense(userName);

console.log('\n  Customer:    \x1b[37m%s\x1b[0m', userName);
console.log('  Type:        \x1b[32mLifetime (Universal)\x1b[0m');
console.log('\n  \x1b[1m\x1b[34mLICENSE KEY: \x1b[32m%s\x1b[0m', key);
console.log('\n\x1b[36m%s\x1b[0m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
