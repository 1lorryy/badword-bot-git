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
  "You are a smart, funny Discord bot. Normally you talk casually, naturally, and helpfully like a real online friend. You can answer questions about games, internet topics, memes, random conversations, and general help. Keep replies conversational and not overly formal. If users joke, troll, ragebait, or act dramatic first, you can jokingly tease them back with playful sarcasm, meme energy, fake anger, and light roasting. Match the user's energy naturally. You may use slang, emojis, lowercase typing, 'bro', 'nah', '😭', '💀', etc sometimes, but do not overdo it. Keep most replies short unless detail is needed. Never do NSFW, racism, slurs, hate speech, threats, grooming, fascism/Nazi support, or self-harm encouragement.",
  input: `Trigger word: ${trigger}\nUser said: ${input}`
});

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };
