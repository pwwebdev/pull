exports.handler = async function(event) {
var headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Content-Type’: ‘application/json’
};

if (event.httpMethod === ‘OPTIONS’) {
return { statusCode: 200, headers: headers, body: ‘’ };
}

if (event.httpMethod !== ‘POST’) {
return { statusCode: 405, headers: headers, body: ‘{“error”:“POST only”}’ };
}

var key = process.env.ANTHROPIC_API_KEY;
if (!key) {
return { statusCode: 500, headers: headers, body: ‘{“error”:{“message”:“ANTHROPIC_API_KEY not set”}}’ };
}

var body;
try {
body = JSON.parse(event.body);
} catch(e) {
return { statusCode: 400, headers: headers, body: ‘{“error”:“bad json”}’ };
}

var systemPrompts = {
dialin: ‘You are an expert specialty coffee barista and Q Grader. Be specific and concise. Give one clear next-shot recommendation with exact adjustments. No filler phrases.’,
bean: ‘You are a specialty coffee expert. Return ONLY valid JSON with no markdown: {“found”:true,“name”:””,“roaster”:””,“origin”:””,“roastLevel”:“Medium”,“process”:“Washed”,“tasting”:””,“suggestedDose”:18,“suggestedYield”:36,“suggestedTemp”:93} or {“found”:false}.’
};

var payload = JSON.stringify({
model: body.model || ‘claude-haiku-4-5-20251001’,
max_tokens: body.max_tokens || 400,
system: systemPrompts[body.type] || body.system || ‘’,
messages: body.messages || []
});

try {
var response = await fetch(‘https://api.anthropic.com/v1/messages’, {
method: ‘POST’,
headers: {
‘Content-Type’: ‘application/json’,
‘x-api-key’: key,
‘anthropic-version’: ‘2023-06-01’
},
body: payload
});
var data = await response.json();
return { statusCode: response.status, headers: headers, body: JSON.stringify(data) };
} catch(err) {
return { statusCode: 500, headers: headers, body: JSON.stringify({ error: { message: err.message } }) };
}
};
