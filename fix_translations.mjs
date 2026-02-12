
import fs from 'fs';

const filePath = './src/i18n/translations.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove the first duplicate 'en' and 'id' blocks
// We look for the first 'en: {' and the second 'en: {'.
// The content to remove is from the first 'en: {' up to the line before the second 'en: {'.

const firstEnIndex = content.indexOf('    en: {');
const secondEnIndex = content.indexOf('    en: {', firstEnIndex + 1);

if (firstEnIndex === -1 || secondEnIndex === -1) {
    console.error('Could not find two "en: {" blocks. Aborting.');
    process.exit(1);
}

console.log(`Found first 'en' at ${firstEnIndex}, second at ${secondEnIndex}`);

// The content to keep starts from the second 'en' index.
// But we need to keep the header (lines 1-7).
// The first 'en' is usually right after "export const translations = {".
const headerEndIndex = firstEnIndex;
const contentToKeep = content.substring(secondEnIndex);
const header = content.substring(0, headerEndIndex);

// New content starts with valid header + second block onwards
let newContent = header + contentToKeep;

// 2. Insert 'allowance' block and update 'project' block
// We need to find 'project: {' in the NEW content.
// Since we removed the first block, the first 'project: {' we find will be the correct one (from the second block).

const projectBlockStart = newContent.indexOf('        project: {');
if (projectBlockStart === -1) {
    console.error('Could not find "project: {" in new content.');
    process.exit(1);
}

// Find the end of project block. It should be exact closing brace indentation.
// We scan for '        },' after projectBlockStart.
const projectBlockEnd = newContent.indexOf('        },', projectBlockStart);

if (projectBlockEnd === -1) {
    console.error('Could not find closing of project block.');
    process.exit(1);
}

// Construct merged project block
const newProjectBlock = `        project: {
            newProject: 'New Project',
            openProject: 'Open Project',
            projectName: 'Project Name',
            selectProject: 'Select Project',
            noProjects: 'No projects saved',
            createNew: 'Create New Project',
            createProject: 'Create Project',
            enterName: 'Enter project name',
            videoFile: 'Video File *',
            selectVideo: 'Select Video...',
            videoSelected: 'Video Selected',
            lastModified: 'Last Modified',
            cancel: 'Cancel',
            errProjectName: 'Project name is required',
            errVideo: 'Video file is required',
            folderOptional: 'Folder (Optional)',
            rootNoFolder: 'Root (No Folder)',
            errors: {
                nameRequired: 'Project name cannot be empty',
                videoRequired: 'Please select a video file',
                nameExists: 'Project name already exists',
                notFound: 'Project not found'
            }
        },`;

// Construct allowance block
const allowanceBlock = `
        allowance: {
            title: 'Margin Rate Settings',
            calculatorTitle: 'Allowance Calculator',
            subtitle: 'Calculate standard time with personal, fatigue, delay, and special allowances',
            normalTime: 'Normal Time',
            normalTimeMinutes: 'Normal Time (minutes)',
            basicAllowances: 'Basic Allowances',
            personal: 'Personal Allowance (%)',
            basicFatigue: 'Basic Fatigue Allowance (%)',
            delay: 'Delay Allowance (%)',
            special: 'Special Allowance (%)',
            total: 'Total Allowance',
            done: 'Done',
            typicalPersonal: 'Typical: 5-7% (rest breaks, personal needs)',
            typicalFatigue: 'Typical: 4% (basic physical/mental fatigue)',
            typicalDelay: 'Typical: 2-5% (unavoidable delays)',
            specialDesc: 'For special circumstances',
            variableFatigue: 'Variable Fatigue Allowances',
            results: 'Results',
            standardTime: 'Standard Time',
            formula: 'Formula'
        },`;

// Replace original project block with NEW project block + Allowance block
// The original project block goes from projectBlockStart to projectBlockEnd + 3 (length of '},').
const originalProjectBlock = newContent.substring(projectBlockStart, projectBlockEnd + 10); // +10 to include closing brace and comma roughly

// Actually, let's just slice.
const beforeProject = newContent.substring(0, projectBlockStart);
const afterProject = newContent.substring(projectBlockEnd + 10); // +10 to safely skip '        },\n' or similar

// We need to be precise about 'afterProject'.
// The original end was '        },'
// Matches '        },' exactly 10 chars.
// We should check what follows. '        measurement: {' follows project usually.

const searchString = '        },';
const endOfProjectKey = newContent.indexOf(searchString, projectBlockStart);
const startOfNextKey = endOfProjectKey + searchString.length;

const actualBefore = newContent.substring(0, projectBlockStart);
// Use everything after the closing brace of project
const actualAfter = newContent.substring(startOfNextKey);

newContent = actualBefore + newProjectBlock + allowanceBlock + actualAfter;

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Successfully fixed translations.js');
