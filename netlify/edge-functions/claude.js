exports.handler = async function(event) {
const h = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’
};
if (event.httpMethod === ‘OPTIONS’) return { statusCode: 200, headers: h, body: ‘’ };
if (event.httpMethod !== ‘POST’) return { statusCode: 405, headers: h, body: ‘{“error”:“POST only”}’ };

const key = process.env.ANTHROPIC_API_KEY;
if (!key) return { statusCode: 500, headers: h, body: ‘{“error”:{“message”:“ANTHROPIC_API_KEY not set”}}’ };

let body;
try { body = JSON.parse(event.body); } catch(e) { return { statusCode: 400, headers: h, body: ‘{“error”:“bad json”}’ }; }

const SYSTEMS = {
dialin: ‘You are an expert specialty coffee barista and Q Grader. Be specific and concise. Give one clear next-shot recommendation with exact adjustments.’,
bean: ‘You are a specialty coffee expert. Return ONLY valid JSON: {“found”:true,“name”:””,“roaster”:””,“origin”:””,“roastLevel”:“Medium”,“process”:“Washed”,“tasting”:””,“suggestedDose”:18,“suggestedYield”:36,“suggestedTemp”:93} or {“found”:false}. No markdown.’
};

const payload = JSON.stringify({
model: body.model || ‘claude-haiku-4-5-20251001’,
max_tokens: body.max_tokens || 400,
system: SYSTEMS[body.type] || body.system || ‘’,
messages: body.messages || []
});

try {
const r = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: key,
‘anthropic-version’: ‘2023-06-01’
},
body: payload
});
const data = await r.json();
return { statusCode: r.status, headers: h, body: JSON.stringify(data) };
} catch(e) {
return { statusCode: 500, headers: h, body: JSON.stringify({ error: { message: e.message } }) };
}
};
