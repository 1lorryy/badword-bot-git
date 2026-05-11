const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateAiReply(message, trigger) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  try {
    const input = String(message.content || "").slice(0, 500);

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",

      instructions:
        "You are a smart casual Discord bot. Talk naturally like a real person, similar to ChatGPT but shorter and more conversational. Usually keep replies between 1-3 sentences unless more detail is needed. Be friendly, witty, and relaxed. You can joke lightly, be sarcastic sometimes, and match the user's energy, but do not act overly cringe, toxic, spammy, or edgy. If the user asks factual questions, give accurate truthful answers. If asked about games, internet topics, coding, tech, photos, memes, or general knowledge, answer intelligently and clearly. You can comment on images and messages casually. Never use slurs, racism, hate speech, fascism/Nazi support, threats, NSFW sexual content, grooming, doxxing, or self-harm encouragement.",

      input:
        `Trigger word: ${trigger}\n` +
        `User message: ${input}`
    });

    return response.output_text?.trim() || null;

  } catch (err) {
    console.error("AI error:", err);
    return null;
  }
}

module.exports = { generateAiReply };
