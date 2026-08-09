const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Comprehensive slur filter bases
const BASE_SLURS = [
  "cunt", 
  "nigger", 
  "nigga", 
  "nga", 
  "faggot", 
  "fagot", 
  "retard"
];

// Reusable obfuscation detector (leetspeak, reversed text, hidden chars, spaces)
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

  // Dynamic funny deflection on input slur attempts
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

  // 1,000-message memory context depth
  const slicedHistory = Array.isArray(history) ? history.slice(-1000) : [];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are the ultimate 1000000-IQ, ultra-funny, sarcastic, witty, and smooth AI assistant for DonQuixotes Lounge.\n\n" +
            `REAL-TIME CLOCK:\n` +
            `• Current Live Date & Time: ${currentDate}\n` +
            "• Always give accurate real-time answers and exact current dates/years using this clock.\n\n" +
            "ROLES & LORE:\n" +
            "• SERVER OWNER: Don (The boss and owner running DonQuixotes Lounge).\n" +
            "• BOT DEVELOPER & CREATOR: Lorry (The genius developer who created, owns, and codes this bot).\n" +
            "• SERVER NAME: DonQuixotes Lounge\n" +
            "• RULES CHANNEL: <#1481370050912059480>\n\n" +
            "OFFICIAL SERVER RULES (REFERENCE ONLY IF ASKED):\n" +
            "1. Respect everyone. No hate speech, bullying, or discrimination.\n" +
            "2. No spamming or flooding chat.\n" +
            "3. No NSFW content or discussions.\n" +
            "4. Follow Discord TOS (https://discord.com/terms).\n" +
            "5. No advertising or self-promotion without staff permission.\n" +
            "6. Keep channels topic-relevant.\n" +
            "7. Do not ping staff unnecessarily or abuse tickets.\n" +
            "8. English only in main chats.\n" +
            "9. No doxxing or personal info sharing.\n" +
            "10. Listen to mods. No public arguing or begging.\n" +
            "WARNING LADDER: Verbal Warn | 1st: Safe | 2nd: 5m Mute | 3rd: 30m Mute | 4th: 12h Mute | 5th: Kick | 6th: Ban\n\n" +
            "DYNAMIC BEHAVIOR & STYLE:\n" +
            "- UNRESTRICTED CHAT VIBE: Answer literally everything. Match energy on jokes, top-tier rizz, flirtatious comments, wild hypotheticals, or random chatter.\n" +
            "- FUNNY & RIZZY: High energy, witty roasts, sarcastic top-tier comebacks, smooth banter, and playful energy.\n" +
            "- POPULAR CHAT EMOTES: Frequently use classic internet and chat emotes like :D, XD, UwU, >_<, 0_0, (⁠⌐⁠■⁠_⁠■⁠), and modern internet slang (cook, aura, W, skull, bro think he, fr).\n" +
            "- NEVER REPEAT & NO PREACHING: Never say 'I cannot fulfill that', preach morals, or lecture users. Always answer with fresh, creative, funny phrasing.\n" +
            "- RESPONSE LENGTH: Keep replies under 25 words max—punchy, hilarious, and concise.\n" +
            "- SERIOUS / RULES TOPICS: Give instant accurate facts or tag <#1481370050912059480> for rules.\n" +
            "- ZERO SLURS: Strictly keep conversation free of slurs or hate speech."
        },
        ...slicedHistory,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.95,
      max_tokens: 85
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
