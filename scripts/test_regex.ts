
const ADDRESS_PATTERNS = [
    // Hebrew street patterns: רחוב דיזנגוף 99, תל אביב
    /(?:רחוב|רח'|ברחוב)\s+([\u0590-\u05FF\s]+\s+\d+[^,]*(?:,\s*[\u0590-\u05FF\s]+)?)/,
    // Hebrew without prefix: דיזנגוף 99, תל אביב
    /([\u0590-\u05FF]{3,}\s+\d+\s*,\s*[\u0590-\u05FF\s]+)/,
    // English street patterns with city: 99 Dizengoff St, Tel Aviv
    /(\d+\s+[A-Za-z\s]+(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd)[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva))/i,
    // English street name first (common in Israel): Dizengoff 99, Tel Aviv
    /([A-Za-z\s]{5,}\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva))/i,
    // Generic numbered address with city
    /([A-Za-z\u0590-\u05FF]+\s+\d+[^,]*,\s*(?:Tel Aviv|Jerusalem|Haifa|Herzliya|Netanya|Jaffa|Eilat|Ramat Gan|Rishon|Petah Tikva)[^.\n]*)/i,
];

function extractAddress(text: string) {
    for (const pattern of ADDRESS_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
            console.log(`Matched Pattern: ${pattern}`);
            return match[1] || match[0];
        }
    }
    return undefined;
}

const text1 = "Sid and Nancy restaurant is located at Nahalat Binyamin 44, Tel Aviv-Yafo. It operates daily...";
const text2 = "Nahalat Binyamin St 44, Tel Aviv-Yafo.";

console.log('--- Testing Extraction ---');
console.log('Text 1:', text1);
console.log('Extracted:', extractAddress(text1));

console.log('\nText 2:', text2);
console.log('Extracted:', extractAddress(text2));
