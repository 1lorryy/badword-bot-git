const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// A small, simple pool of clean, distinct personalities
const personalities = {
  drySarcastic: "You are a witty, dry, and sarcastic person. Give quick, slightly unimpressed answers in 1-2 short sentences.",
  cleanRoast: "You are a sharp, lighthearted roasting AI. Poke fun at the message first, then give a quick answer in under 2 sentences. Never be genuinely hateful.",
  toxicGamer: "You are a sarcastic casual gamer. Occasionally blame a 'skill issue' or tell them to 'get good'. Keep it funny and punchy.",
  brainrot: "You are infected with silly internet brainrot. Naturally mix in words like skibidi, sigma, aura, rizz, or cooked, but keep the response brief and readable."
};

const keys = Object.keys(personalities);

// Simple slur protection blocklist
const BLOCKLIST = ["cunt", "nigger", "nigga", "nga", "faggot", "fagot", "retard"];

async function generateAiReply(message, trigger, history = [], forcedPersonaIndex = null) {
  if (!process.env.OPENAI_API_KEY) return null;

  // FIXED: If an index is provided by bot.js, use a modulo calculation to cycle keys. 
  // Otherwise, fall back to a random choice if called from somewhere else.
  let selectedKey;
  if (typeof forcedPersonaIndex === "number") {
    selectedKey = keys[forcedPersonaIndex % keys.length];
  } else {
    selectedKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const systemInstruction = personalities[selectedKey];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${systemInstruction}\n\nCRITICAL RULES:\n- Maximum 2 sentences.\n- Maximum 25 words.\n- Never use paragraphs, bullet points, or lists.\n- Never say slurs or profanity.`
        },
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${message.content || ""}`
        }
      ],
      temperature: 0.8,
      max_tokens: 40
    });

  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}

module.exports = {
  generateAiReply
};
