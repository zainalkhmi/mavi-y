
import { translations } from './src/i18n/translations.js';

console.log('--- Debugging Values ---');
try {
    const enProject = translations.en.project;
    console.log('Type of en.project:', typeof enProject);
    console.log('Value of en.project:', JSON.stringify(enProject, null, 2));
    console.log('en.project.newProject:', enProject ? enProject.newProject : 'UNDEFINED');

    const enAllowance = translations.en.allowance;
    console.log('en.allowance.title:', enAllowance ? enAllowance.title : 'UNDEFINED');

    console.log('Total keys in en:', Object.keys(translations.en).length);
    console.log('Keys in en:', Object.keys(translations.en));

} catch (e) {
    console.error('Error accessing translations:', e);
}
