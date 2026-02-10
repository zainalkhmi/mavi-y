import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');
const lines = content.split('\n');
const result = [];
lines.forEach((line, i) => {
    const openings = (line.match(/<div/g) || []).length;
    const closings = (line.match(/<\/div\s*>/g) || []).length;
    if (openings > 0 || closings > 0) {
        result.push({ line: i + 1, openings, closings, content: line.trim() });
    }
});
fs.writeFileSync('c:/Users/ACER/Motion/div_report.json', JSON.stringify(result, null, 2));
console.log('Report generated');
