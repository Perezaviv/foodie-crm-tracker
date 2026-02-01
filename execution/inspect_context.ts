
import { searchRestaurant } from '../lib/skills/ai/search_restaurant';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function inspect(name: string) {
    const apiKey = process.env.TAVILY_API_KEY;
    const query = `restaurant "${name}" Israel physical address street number`;

    const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 5,
        }),
    });
    const data: any = await response.json();
    console.log(`\n\n=== RAW TAVILY FOR: ${name} ===`);
    console.log('ANSWER:', data.answer);
    data.results?.forEach((r: any, i: number) => {
        console.log(`[${i}] ${r.content}`);
    });
}

inspect('A.K.A תל אביב').catch(console.error);
inspect('Sid and Nancy תל אביב').catch(console.error);
