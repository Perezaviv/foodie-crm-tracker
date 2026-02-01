
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugQueries() {
    console.log('Testing Queries for Sid and Nancy...');
    const apiKey = process.env.TAVILY_API_KEY;

    let output = '';
    const variations = [
        'Sid and Nancy restaurant Tel Aviv address',
        'Sid and Nancy bar Tel Aviv locations',
        'Sid and Nancy Nahalat Binyamin Tel Aviv' // Cheating a bit to see if it even exists
    ];

    for (const q of variations) {
        output += `\n\n=== QUERY: ${q} ===\n`;
        try {
            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: apiKey,
                    query: q,
                    search_depth: 'advanced',
                    include_answer: true,
                    max_results: 5,
                }),
            });
            const data = await response.json();
            output += `Answer: ${data.answer}\n`;
            if (data.results) {
                data.results.forEach((r: any, i: number) => {
                    output += `--- Result ${i + 1} ---\n`;
                    output += `Title: ${r.title}\n`;
                    output += `URL: ${r.url}\n`;
                    output += `Content: ${r.content.substring(0, 300)}\n`;
                });
            }
        } catch (e) {
            output += `Error: ${e}\n`;
        }
    }
    fs.writeFileSync('debug_queries.txt', output);
    console.log('Written to debug_queries.txt');
}

debugQueries();
