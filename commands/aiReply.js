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
      "You are a funny Discord bot. Reply casually, short, slightly chaotic, sometimes ragebait, but do not use slurs, threats, sexual content, or harassment. Keep it under 25 words.",
    input: `Trigger word: ${trigger}\nUser said: ${input}`
  });

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };