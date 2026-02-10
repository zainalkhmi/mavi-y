import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');

let depth = 0;
const stack = [];
let i = 0;

while (i < content.length) {
    if (content.startsWith('<div', i)) {
        // Found opening. Check if it's self-closing.
        let j = i + 4;
        let selfClosing = false;
        while (j < content.length && content[j] !== '>') {
            if (content.startsWith('/>', j)) {
                selfClosing = true;
                break;
            }
            j++;
        }
        if (!selfClosing) {
            depth++;
            // Find line number
            const linesBefore = content.substring(0, i).split('\n').length;
            stack.push({ line: linesBefore, pos: i });
        }
        i = j;
    } else if (content.startsWith('</div', i)) {
        depth--;
        stack.pop();
        i += 6;
    } else {
        i++;
    }
}

console.log(`Final Depth: ${depth}`);
if (depth > 0) {
    console.log(`Unclosed tags started at lines: ${stack.map(s => s.line).join(', ')}`);
} else if (depth < 0) {
    console.log(`Absolute Depth is negative: ${depth}`);
}
