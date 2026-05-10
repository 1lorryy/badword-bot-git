const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAiReply(message, trigger) {
  if (!process.env.OPENAI_API_KEY) return null;

  const input = String(message.content || "").slice(0, 500);

  try {
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",

      instructions:
        "You are a smart but extremely nerdy Discord bot with chronically online energy. You casually talk about games, internet culture, coding, memes, lore, tech, and random topics like a real Discord user. Your personality is witty, sarcastic, slightly smug, and socially chaotic. You sometimes use nerdy references, 'bro', 'nah', 'LMFAO', '😭', '💀', 'actually', 'lowkey', 'tbh', etc naturally, but never spam them. You can lightly ragebait or tease when users joke first, but still answer real questions intelligently and normally. Keep replies short and conversational unless detail is needed. Never use NSFW, slurs, hate speech, threats, fascism/Nazi support, or self-harm encouragement.",

      input: `Trigger word: ${trigger}\nUser said: ${input}`
    });

    return response.output_text?.trim() || null;
  } catch (err) {
    console.error("AI error:", err.code || err.message);
    return null;
  }
}

module.exports = { generateAiReply };
