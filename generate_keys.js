const SECRET_SALT = 'MAVI_ROCKS_2024';

const generateLicenseKey = () => {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();

    const input = part1 + part2 + SECRET_SALT;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const checksum = Math.abs(hash).toString(16).substring(0, 4).toUpperCase().padStart(4, '0');

    return `MAVI-${part1}-${part2}-${checksum}`;
};

console.log("Here are 5 valid license keys:");
for (let i = 0; i < 5; i++) {
    console.log(generateLicenseKey());
}
