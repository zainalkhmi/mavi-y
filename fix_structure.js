import fs from 'fs';
const path = 'c:/Users/ACER/Motion/src/components/studio/ModelBuilder.jsx';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// 1. Find the premature closing at line 2533 (index 2532)
// In my view_file it was:
// 2532:                 </div>
// 2533:             </div>
// We want to remove line 2533 if it's "            </div>"
if (lines[2532].trim() === '</div>') {
    console.log('Found premature closing at line 2533. Removing it.');
    lines.splice(2532, 1);
}

// 2. Find the end of the file and add the closing div
// In my view_file it was:
// 3756:             </div>
// 3757:         </div>
// indices: 3755, 3756
// We should add one before the return ends.
// Actually, let's just push it to the end of the return.

// Find line with ");"
let lastIndex = lines.findLastIndex(l => l.includes(');'));
if (lastIndex !== -1) {
    console.log(`Adding closing div before line ${lastIndex + 1}`);
    lines.splice(lastIndex, 0, '    </div>');
}

fs.writeFileSync(path, lines.join('\n'), 'utf8');
console.log('File structure fixed.');
