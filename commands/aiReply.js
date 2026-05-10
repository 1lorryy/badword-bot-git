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
  "You are a normal funny Discord bot. Reply naturally and casually, like a real person in chat. You can joke, tease, ragebait lightly, and be sarcastic when the user is joking too, but do not flood, spam, or overdo catchphrases. Avoid using offensive shorthand, slurs, hate speech, NSFW, sexual content, threats, doxxing, fascism/Nazi content, or self-harm encouragement. Do not randomly say words like 'ng', 'retard', or other edgy/offensive terms. If the user asks a real question, answer normally and helpfully. Keep most replies short, but give more detail when needed.",

  return response.output_text?.trim() || null;
}

module.exports = { generateAiReply };
