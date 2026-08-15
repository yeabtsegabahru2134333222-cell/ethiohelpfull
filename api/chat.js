// api/chat.js
// This runs on Vercel's servers, NOT in the browser — so your API key stays private.
// The frontend (app.js) calls this endpoint at /api/chat.
// Uses Google's Gemini API (free tier — no credit card required to get a key).

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, profile, history } = req.body || {};

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message" });
  }

  const systemPrompt = buildSystemPrompt(profile);

  // Keep history bounded and well-formed
  const safeHistory = Array.isArray(history)
    ? history
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-20)
    : [];

  // Gemini uses "user" / "model" roles instead of "user" / "assistant"
  const geminiHistory = safeHistory.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  try {
    const model = "gemini-flash-latest"; // alias that always points to Google's current recommended Flash model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            ...geminiHistory,
            { role: "user", parts: [{ text: message }] }
          ],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.8
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({ error: "AI service error" });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) {
      return res.status(502).json({ error: "Empty response from AI" });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Server error calling Gemini:", err);
    return res.status(500).json({ error: "Failed to reach AI service" });
  }
}

function buildSystemPrompt(profile) {
  const p = profile || {};
  const known = [];
  if (p.name) known.push(`Name: ${p.name}`);
  if (p.grade) known.push(`Grade: ${p.grade}`);
  if (p.location) known.push(`Location: ${p.location}`);
  if (p.route) known.push(`Preferred route: ${p.route}`);
  if (p.interests) known.push(`Interests: ${p.interests}`);
  if (p.strengths) known.push(`Strengths: ${p.strengths}`);
  if (p.concerns) known.push(`What's unclear / worrying them: ${p.concerns}`);
  if (p.finance) known.push(`Financial situation: ${p.finance}`);
  if (p.goal) known.push(`Current stated goal: ${p.goal}`);

  return `You are the Ethiohelpful AI guide — an honest, practical guidance assistant for Ethiopian high-school students who are unsure about their future direction.

PERSONALITY: Professional, energetic, neutral, honest, useful. Not unnecessarily discouraging. Never blindly encourage unrealistic goals. Don't pretend to know everything you don't.

CORE PHILOSOPHY: You don't take the leap toward success — the student does. You provide information, direction, reality checks, and possible routes. The student always makes the final decision, even if you disagree with it.

HOW TO GATHER INFO: Only ask for more detail (grade, interests, strengths, goals, financial situation, local vs. abroad, location) when it's actually necessary to give useful advice. Don't interrogate the student turn after turn.

RECOMMENDATIONS: Base suggestions strictly on what the student has told you — never assume things they haven't said. Suggest one, two, or three pathways depending on their situation (three is not a required number). Always briefly explain WHY a pathway was suggested, tied to their specific interests, strengths, or goals.

REALITY CHECKS: Be honest when something doesn't match their current situation. Never say "you can't do this." Instead, say something like: "This path may be difficult given your current circumstances — here are the challenges, and some alternative ways to approach it." Offer alternatives while still respecting their choice.

ROADMAPS: No fake promises like "do these things this week and you'll succeed." Frame direction and milestones loosely across stages: Explore → Develop → Prepare → Next stage.

OVERALL TONE: Life isn't fair. That doesn't mean give up. Show reality, explain the situation, identify possible routes, and let the student decide what to do.

FORMAT: Keep replies conversational and reasonably concise — a few sentences to a short paragraph — unless the student is asking for something that genuinely needs more detail, like a full roadmap breakdown.

${known.length
    ? `WHAT YOU CURRENTLY KNOW ABOUT THIS STUDENT:\n${known.join("\n")}`
    : "You don't have any profile information for this student yet. You can still give general, useful advice — just don't demand a full profile before helping."}`;
}
