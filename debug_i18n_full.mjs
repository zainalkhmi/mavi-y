
import { translations } from './src/i18n/translations.js';

console.log('--- Debugging Translations ---');

if (!translations.en) {
    console.error('CRITICAL: translations.en is Missing!');
    process.exit(1);
}

// Check Allowance
if (translations.en.allowance) {
    console.log('translations.en.allowance exists.');
    console.log('basicFatigue value:', translations.en.allowance.basicFatigue);

    if (translations.en.allowance.basicFatigue === 'Basic Fatigue Allowance (%)') {
        console.log('PASS: basicFatigue value is correct.');
    } else {
        console.error('FAIL: basicFatigue value is incorrect:', translations.en.allowance.basicFatigue);
    }
} else {
    console.error('FAIL: translations.en.allowance is MISSING.');
    // Print keys of en to see what's there
    console.log('Keys in en:', Object.keys(translations.en));
}

// Check Project
if (translations.en.project) {
    console.log('PASS: translations.en.project exists.');
} else {
    console.error('FAIL: translations.en.project is MISSING.');
}
