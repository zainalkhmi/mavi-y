import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');

let depth = 0;
let i = 0;

while (i < content.length) {
    if (content.startsWith('<div', i)) {
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
        }
        i = j;
    } else if (content.startsWith('</div', i)) {
        depth--;
        if (depth < 0) {
            const linesBefore = content.substring(0, i).split('\n').length;
            console.log(`EXTRA CLOSING at line ${linesBefore}`);
        }
        i += 6;
    } else {
        i++;
    }
}
console.log(`Final depth: ${depth}`);
