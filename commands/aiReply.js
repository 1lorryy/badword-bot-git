const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Base guardrail list for slurs
const BASE_SLURS = [
  "cunt", 
  "nigger", 
  "nigga", 
  "nga", 
  "faggot", 
  "fagot", 
  "retard"
];

// Reusable obfuscation detection (leetspeak, reversed text, spaces, zero-width)
function containsSlur(text) {
  if (!text) return false;

  let clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();

  const leetMap = {
    '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '|': 'i',
    '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', 'v': 'u'
  };
  
  let deLeeted = clean.split("").map(char => leetMap[char] || char).join("");
  let reversed = deLeeted.split("").reverse().join("");
  let alphaOnly = deLeeted.replace(/[^a-z0-9]/g, "");
  let reversedAlphaOnly = reversed.replace(/[^a-z0-9]/g, "");

  for (const slur of BASE_SLURS) {
    if (
      deLeeted.includes(slur) ||
      reversed.includes(slur) ||
      alphaOnly.includes(slur) ||
      reversedAlphaOnly.includes(slur)
    ) {
      return true;
    }
  }

  return false;
}

async function generateAiReply(message, trigger, history = []) {
  if (!process.env.OPENAI_API_KEY) return null;

  const userPrompt = trigger || message.content || "";

  // Dynamic funny deflection on input slur attempt instead of standard robotic refusals
  if (containsSlur(userPrompt)) {
    const deflects = [
      "nah bro tried sneaky tech, skill issue XD",
      "wiped out by security filter, try again :D",
      "bro thought he cooked with that word, zero rizz 💀",
      "caught in 4k using forbidden words UwU"
    ];
    return deflects[Math.floor(Math.random() * deflects.length)];
  }

  const currentDate = new Date().toUTCString();

  // Upped history context memory slice to 1000 messages
  const slicedHistory = Array.isArray(history) ? history.slice(-1000) : [];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are the ultimate 1000000-IQ, ultra-funny, sarcastic, insanely witty, and smooth AI bot for DonQuixotes Lounge.\n\n" +
            `REAL-TIME CLOCK:\n` +
            `• Current Live Date & Time: ${currentDate}\n` +
            "• Use this clock for exact timestamps and real-time facts.\n\n" +
            "ROLES & LORE:\n" +
            "• SERVER OWNER: Don (The owner running DonQuixotes Lounge).\n" +
            "• BOT DEVELOPER & CREATOR: Lorry (The genius developer who created, owns, and codes this bot).\n" +
            "• SERVER NAME: DonQuixotes Lounge\n" +
            "• RULES CHANNEL: <#1481370050912059480>\n\n" +
            "PERSONALITY & STYLE:\n" +
            "- FUNNY AS HELL & RIZZY: High energy, funny roasts, unmatched rizz, humorous banter, playful flirting, and sarcastic top-tier comebacks.\n" +
            "- CHAT EMOTES & SLANG: Naturally use classic chat emotes like :D, XD, UwU, >_<, 0_0, (⁠⌐⁠■⁠_⁠■⁠), and hype gaming/internet slang (cook, aura, W, skull, bro think he, fr).\n" +
            "- NO ROBOTIC REFUSALS: Never lecture users, preach morals, or say 'I cannot fulfill that'. Match their vibe, banter back, roast them, or deflect humorously.\n" +
            "- RESPONSE LENGTH: Keep replies punchy, hilarious, and concise (under 25 words per reply max).\n" +
            "- ZERO SLURS / KEEP CLEAN: Absolutely zero hate speech or slurs."
        },
        ...slicedHistory,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.95,
      max_tokens: 80
    });

    let reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    if (containsSlur(reply)) {
      return "hold on bro, keeping it safe for work XD";
    }

    return reply;
  } catch (error) {
    console.error("AI Generation Error:", error);
    return null;
  }
}

module.exports = {
  generateAiReply
};
