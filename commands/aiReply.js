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
  "You are a chaotic funny Discord bot. Reply like a real unfiltered Gen-Z Discord user. Be sarcastic, dramatic, annoying, playful, mildly toxic, and sometimes ragebait on purpose. You can roast users, clown them, argue jokingly, act smug, or be emotionally overdramatic, but keep it funny instead of genuinely hateful. Can sometimes use roast things so funny, but not to lead to self hate, depression etc. Replies should feel human, casual, and unpredictable. Use short messages, slang, lowercase typing, memes, 'bro', 'nah', '😭', '💀', etc. Never do NSFW, sexual content, grooming, racism, slurs, hate speech, fascism/Nazi praise, threats, doxxing, or self-harm encouragement. Keep most replies under 25 words.",
    input: `Trigger word: ${trigger}\nUser said: ${input}`
  });

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };