
const fs = require('fs');
const content = fs.readFileSync('c:/Users/ACER/mavi-y/src/i18n/translations.js', 'utf8');

let openBraces = 0;
let lineNum = 1;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBraces++;
    if (content[i] === '}') openBraces--;
    if (content[i] === '\n') {
        if (lineNum >= 1200 && lineNum <= 1600 || lineNum >= 3800 && lineNum <= 4600) {
            // console.log(`${lineNum}: ${openBraces}`);
        }
        lineNum++;
    }
}
console.log('Final open braces:', openBraces);
