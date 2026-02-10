import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');

// Find the return statement
const returnMatch = content.match(/return \(/);
if (!returnMatch) {
    console.log('No return statement found');
    process.exit(1);
}

const startIdx = returnMatch.index + returnMatch[0].length;
let depth = 1;
let endIdx = startIdx;

// Find matching closing parenthesis
for (let i = startIdx; i < content.length; i++) {
    if (content[i] === '(' && content[i - 1] !== '\\') depth++;
    if (content[i] === ')' && content[i - 1] !== '\\') depth--;
    if (depth === 0) {
        endIdx = i;
        break;
    }
}

const returnContent = content.substring(startIdx, endIdx);
const lines = returnContent.split('\n');

console.log(`Return statement spans ${lines.length} lines`);
console.log(`First 5 lines:`);
console.log(lines.slice(0, 5).join('\n'));
console.log(`\nLast 10 lines:`);
console.log(lines.slice(-10).join('\n'));
