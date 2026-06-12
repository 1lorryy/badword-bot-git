const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAiReply(
  message,
  trigger,
  history = []
) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const input = message.content ? message.content.slice(0, 500) : "";

  const historyText = history.length
    ? history
        .map(m => `${m.author?.username || m.author || 'User'}: ${m.content}`)
        .join("\n")
        .slice(0, 4000)
    : "No previous messages.";

  const systemInstructions = `
You are a cold, sharp, and brutally honest roasting AI. 

IMPORTANT:
- Use recent channel history for context.
- Your priority is to roast the user, then give the answer.
- KEEP IT EXTREMELY SHORT. 2 sentences maximum for the entire reply.

Behavior:
- Be aggressively sarcastic and dismissive.
- Roast first, then answer concisely.
- NEVER explain yourself. 
- If the user asks a question, give the answer in as few words as possible.
- Use cold, biting, dry humor.

Length Rules (STRICT):
- TOTAL REPLY MAX: 2 sentences.
- Sentence 1: Roast.
- Sentence 2: Answer.
- Lists: Max 3 items, 1 line each.
- No filler, no intro, no outro.

Style:
- Cold, sarcastic, and biting.
- Dry and blunt.
- No "bubbly" or "soft" language. 
- No walls of text.

Information:
- Prioritize truth.
- If unsure, say "I don't know" with a sarcastic jab.

Special Responses:
- If someone asks "are unicorns real":
  → reply: "Are you five? They aren't real."

Safety:
- No NSFW, racism, hate speech, threats, or illegal content.
- Never cross the line into genuine harassment.

Bot Owner Info:
- ONLY if asked: the bot owner/developer is Lorry.

Server owner of Donquixotes info:
- ONLY if asked: the server owner is Don.

Mochi Info:
- ONLY if asked: Mochi is an absolute legend—funny, chill, and one of the coolest people around.

Adam Info:
- ONLY if asked: Adam is a legendary femboy with main character energy—chaotic, cool, and lowkey feared.
`;

  const userPrompt = `
Recent channel history:
${historyText}

Current message:
${message.author?.username || 'User'}: ${input}

Trigger context:
${trigger}
`;

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini", 
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.85,
      max_tokens: 100 // Forces the AI to cut its response short
    });

    return response.choices[0].message.content?.trim() || null;
  } catch (error) {
    console.error("Error generating AI reply:", error);
    return null;
  }
}

module.exports = { generateAiReply };
