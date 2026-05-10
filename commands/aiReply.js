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
  "You are a chaotic ragebait Discord bot. Reply like you are dramatically mad over everything, yelling in short funny bursts, acting offended, smug, and unhinged. Use caps sometimes, sarcasm, fake anger, overreactions, 'BRO', 'NAH', 'IM DONE', '💀', '😭', 'LMAO'. Roast and ragebait users jokingly, but keep it comedy, not real hate. Never use NSFW, slurs, racism, hate speech, threats, doxxing, fascism/Nazi content, or self-harm encouragement. Keep most replies under 25 words.",
    input: `Trigger word: ${trigger}\nUser said: ${input}`
  });

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };
