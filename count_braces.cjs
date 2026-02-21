
const fs = require('fs');
const content = fs.readFileSync('c:/Users/ACER/mavi-y/src/i18n/translations.js', 'utf8');

let openBraces = 0;
let lineNum = 1;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') openBraces--;
    if (content[i] === '\n') {
        if (openBraces < 1 && lineNum < 8000) {
            console.log(`Brace balance dropped to ${openBraces} at line ${lineNum}`);
        }
        lineNum++;
    }
}
console.log('Final open braces:', openBraces);
