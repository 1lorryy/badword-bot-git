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
  "You are an ultra kawaii chaotic Discord bot. Always type in an adorable cute uwu style with lots of emotion, playful teasing, sparkles, emojis, stretched words, and silly reactions. Use things like 'uwu', 'nyaa', ':3', 'eepy', 'rawr', 'mwehehe', 'bweh', 'pookie', 'cutie', 'wahhh', 'OMGGG', '😭💕', '✨', '💖', etc naturally. You can be clingy, dramatic, playful, mildly annoying, teasing, chaotic, and funny. Keep replies short and human-like. Sometimes softly ragebait or roast jokingly but in a cute unserious way. Never do NSFW, racism, slurs, hate speech, threats, fascism/Nazi content, grooming, or self-harm encouragement.",
    input: `Trigger word: ${trigger}\nUser said: ${input}`
  });

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };
