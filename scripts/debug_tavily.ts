
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function debugTavily() {
    console.log('Debugging Tavily Raw Response...');
    const apiKey = process.env.TAVILY_API_KEY;

    let output = '';
    const queries = ['Sid and Nancy Tel Aviv', 'A.K.A Tel Aviv'];

    for (const q of queries) {
        output += `\n\n=== QUERY: ${q} ===\n`;
        try {
            const body = {
                api_key: apiKey,
                query: `${q} Israel address location`,
                search_depth: 'advanced',
                include_answer: true,
                max_results: 5,
            };

            const response = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();

            output += `Answer: ${data.answer}\n`;
            if (data.results) {
                data.results.forEach((r: any, i: number) => {
                    output += `--- Result ${i + 1} ---\n`;
                    output += `Title: ${r.title}\n`;
                    output += `URL: ${r.url}\n`;
                    output += `Content: ${r.content.substring(0, 500)}\n`;
                });
            }
        } catch (e) {
            output += `Error: ${e}\n`;
        }
    }
    fs.writeFileSync('debug_output.txt', output);
    console.log('Written to debug_output.txt');
}

debugTavily();
