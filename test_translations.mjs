
import { translations } from './src/i18n/translations.js';

console.log("Testing Translations Integrity...");

const langs = ['en', 'id', 'ja'];
const keysToCheck = [
    'vsm.supplyChain.title',
    'vsm.analysis.nodeInventoryStatus'
];

let hasError = false;

langs.forEach(lang => {
    console.log(`\nChecking Language: ${lang.toUpperCase()}`);
    if (!translations[lang]) {
        console.error(`❌ Missing language block: ${lang}`);
        hasError = true;
        return;
    }

    keysToCheck.forEach(keyPath => {
        const parts = keyPath.split('.');
        let val = translations[lang];
        for (const part of parts) {
            val = val ? val[part] : undefined;
        }

        if (val) {
            console.log(`✅ Found ${keyPath}: "${val}"`);
        } else {
            console.error(`❌ Missing key ${keyPath}`);
            // Check partial paths to debug
            let partialVal = translations[lang];
            let currentPath = '';
            for (const part of parts) {
                currentPath += part;
                partialVal = partialVal ? partialVal[part] : undefined;
                console.log(`   - path '${currentPath}': ${partialVal ? 'EXISTS' : 'UNDEFINED'}`);
                currentPath += '.';
            }
            hasError = true;
        }
    });
});

if (hasError) {
    console.error("\nFAILED: Translation integrity check failed.");
    process.exit(1);
} else {
    console.log("\nSUCCESS: All keys present.");
}
