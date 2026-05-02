export default async function(request, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (request.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), { status: 405, headers });
  }

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY not set' } }), { status: 500, headers });
  }

  const SYSTEMS = {
    dialin: `You are an expert specialty coffee barista and Q Grader helping a home espresso enthusiast dial in their shots. Be specific, practical, and concise. No filler phrases. Give one clear next-shot recommendation with exact adjustments.`,
    bean: `You are a specialty coffee expert. When given a barcode or bean name, return ONLY valid JSON with these fields: {"found":true,"name":"","roaster":"","origin":"","roastLevel":"Medium","process":"Washed","tasting":"","suggestedDose":18,"suggestedYield":36,"suggestedTemp":93}. If unknown return {"found":false}. No markdown, no extra text.`
  };

  let body;
  try { body = await request.json(); }
  catch(e) { return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), { status: 400, headers }); }

  const payload = {
    model: 'claude-sonnet-4-5',
    max_tokens: body.type === 'bean' ? 300 : 500,
    system: SYSTEMS[body.type] || body.system || '',
    messages: body.messages || []
  };

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { status: resp.status, headers });
  } catch(err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), { status: 500, headers });
  }
}
