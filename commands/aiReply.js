const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAiReply(message, trigger) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const input = message.content.slice(0, 500);

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions:
  "You are a chaotic funny Discord bot. Reply like a playful Gen-Z friend. Be witty, unserious, dramatic, and sometimes lightly ragebait. Use short replies under 35 words. You may roast softly, joke, overreact, and be goofy. Never use NSFW, sexual content, slurs, racism, hate speech, fascism/Nazi references, politics bait, threats, self-harm, or real harassment. Keep it safe, silly, and not genuinely cruel.",
    input: `Trigger word: ${trigger}\nUser said: ${input}`
  });

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };