// Pull — Netlify Function: claude.js
// Proxies ALL Claude API requests from the browser
// Handles: dial-in shot coaching + bean barcode/name lookup
// Deploy to: netlify/functions/claude.js
// Required env var: ANTHROPIC_API_KEY in Netlify dashboard

const https = require('https');

function httpsPost(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, body: { error: { message: data } } });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// System prompts for different request types
const SYSTEMS = {

  dialin: `You are an expert specialty coffee barista and Q Grader helping a home espresso enthusiast dial in their shots. Be specific, practical, and concise. Speak directly — no filler phrases. Give one clear next-shot recommendation with exact adjustments.`,

  bean: `You are a specialty coffee expert with deep knowledge of coffee roasters, bean origins, processing methods, and flavor profiles worldwide. When given a barcode number or bean name, return ONLY a JSON object with these exact fields (no other text, no markdown):
{
  "found": true,
  "name": "bean name",
  "roaster": "roaster name",
  "origin": "country or region",
  "roastLevel": "Light|Medium-Light|Medium|Medium-Dark|Dark",
  "process": "Washed|Natural|Honey|Anaerobic|Unknown",
  "variety": "varietal if known, else empty string",
  "tasting": "brief tasting notes, 1 sentence",
  "suggestedDose": 18,
  "suggestedYield": 36,
  "suggestedTemp": 93
}
If you cannot identify the specific product, return: {"found": false}
Never return anything except valid JSON.`

};

exports.handler = async function(event) {

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: { message: 'Method not allowed' } }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not configured in Netlify environment variables.' } })
    };
  }

  let reqBody;
  try {
    reqBody = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: { message: 'Invalid JSON body' } }) };
  }

  // Determine system prompt — use type field or fall back to provided system
  const systemPrompt = SYSTEMS[reqBody.type] || reqBody.system || '';
  const maxTokens = reqBody.type === 'bean' ? 300 : (reqBody.max_tokens || 500);

  const payload = JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: reqBody.messages || []
  });

  const options = {
    hostname: 'api.anthropic.com',
    port: 443,
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  try {
    const result = await httpsPost(options, payload);
    return { statusCode: result.status, headers, body: JSON.stringify(result.body) };
  } catch(err) {
    return {
      statusCode: 500, headers,
      body: JSON.stringify({ error: { message: 'Request failed: ' + err.message } })
    };
  }
};
