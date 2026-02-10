import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');
const openings = (content.match(/<div/g) || []).length;
const closings = (content.match(/<\/div\s*>/g) || []).length;
console.log(`Openings (<div>): ${openings}`);
console.log(`Closings (</div>): ${closings}`);
console.log(`Diff: ${openings - closings}`);
