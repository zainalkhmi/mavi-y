import fs from 'fs';
const content = fs.readFileSync('c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx', 'utf8');

function countBalance(charOpen, charClose) {
    let balance = 0;
    for (let i = 0; i < content.length; i++) {
        if (content[i] === charOpen) balance++;
        else if (content[i] === charClose) balance--;
    }
    return balance;
}

console.log(`Braces {}: ${countBalance('{', '}')}`);
console.log(`Parentheses (): ${countBalance('(', ')')}`);
console.log(`Brackets []: ${countBalance('[', ']')}`);
