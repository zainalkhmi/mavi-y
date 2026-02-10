import fs from 'fs';
const path = 'c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/<\/div\s+>/g, '</div>');
fs.writeFileSync(path, content, 'utf8');
console.log('Fixed all malformed div closings');
const check = (content.match(/<\/div\s*>/g) || []).length;
console.log(`New count of </div>: ${check}`);
