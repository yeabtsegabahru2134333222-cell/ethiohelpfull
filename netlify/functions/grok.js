exports.handler = async function (event, context) {
  // A simple Netlify Function that forwards user input to the Grok API.
  // IMPORTANT: Set the GROK_API_KEY and GROK_API_URL environment variables in Netlify.
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const input = (body.input || '').toString().trim();
    const profile = body.profile || {};

    if (!input) return { statusCode: 400, body: JSON.stringify({ error: 'Missing input' }) };

    // Build a compact system prompt and include a short profile summary (to save tokens).
    const systemPrompt = `
You are Ethiohelpful Guide, a concise, helpful advisor for Ethiopian high-school students.\n
Be factual, avoid making unverifiable promises, and show practical next steps.\n
When appropriate, ask one follow-up question to clarify the user's situation.
`.trim();

    const profileParts = [];
    if (profile.name) profileParts.push(`Name: ${profile.name}`);
    if (profile.grade) profileParts.push(`Grade: ${profile.grade}`);
    if (profile.location) profileParts.push(`Location: ${profile.location}`);
    if (profile.route) profileParts.push(`Route: ${profile.route}`);
    if (profile.interests) profileParts.push(`Interests: ${profile.interests}`);
    const profileSummary = profileParts.length ? `User profile: ${profileParts.join(' — ')}` : '';

    const payload = {
      // Adapt model name and body to the exact Grok/XAI schema if it differs.
      model: process.env.GROK_MODEL || 'grok-1',
      messages: [
        { role: 'system', content: systemPrompt },
        ...(profileSummary ? [{ role: 'system', content: profileSummary }] : []),
        { role: 'user', content: input }
      ],
      max_tokens: 600
    };

    const res = await fetch(process.env.GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('Grok API error', res.status, text);
      return { statusCode: 502, body: JSON.stringify({ error: 'AI service error' }) };
    }

    const json = await res.json();

    // Try common reply extraction shapes; adapt if the provider uses another format.
    let reply = '';
    if (json.choices && json.choices[0] && json.choices[0].message) {
      reply = json.choices[0].message.content;
    } else if (json.output) {
      reply = Array.isArray(json.output) ? json.output.join('\n') : String(json.output);
    } else {
      // fallback: stringify entire response
      reply = JSON.stringify(json);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ reply })
    };
  } catch (err) {
    console.error('Function error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
