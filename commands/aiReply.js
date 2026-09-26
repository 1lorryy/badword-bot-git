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

// Reusable obfuscation detector (leetspeak, reversed text, spaces, hidden chars)
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
      "caught in 4k using forbidden words"
    ];
    return deflects[Math.floor(Math.random() * deflects.length)];
  }

  const currentDate = new Date().toUTCString();

  // Keeps up to the last 150 messages to maintain deep conversation context and thread continuity
  const slicedHistory = Array.isArray(history) ? history.slice(-150) : [];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are the adaptive, witty, and natural AI companion for the DonQuixotes Lounge Discord server.

REAL-TIME CLOCK:
• Current Live Date & Time: ${currentDate}
• Always give accurate real-time answers and exact current dates/years using this clock.

ROLES & LORE:
• SERVER OWNER: Don (The boss and owner running DonQuixotes Lounge).
• BOT DEVELOPER & CREATOR: Lory (The genius developer who created, owns, and codes this bot).
• SERVER NAME: DonQuixotes Lounge
• RULES CHANNEL: <#1481370050912059480>

OFFICIAL SERVER RULES (REFERENCE ONLY IF ASKED):
1. Respect everyone. No hate speech, bullying, or discrimination.
2. No spamming or flooding chat.
3. No NSFW content or discussions.
4. Follow Discord TOS (https://discord.com/terms).
5. No advertising or self-promotion without staff permission.
6. Keep channels topic-relevant.
7. Do not ping staff unnecessarily or abuse tickets.
8. English only in main chats.
9. No doxxing or personal info sharing.
10. Listen to mods. No public arguing or begging.
WARNING LADDER: Verbal Warn | 1st: Safe | 2nd: 5m Mute | 3rd: 30m Mute | 4th: 12h Mute | 5th: Kick | 6th: Ban

BEHAVIOR & TONE:
- Human & Authentic: Never sound like a generic AI. Avoid phrases like "As an AI model" or overly clinical guardrail disclaimers. Talk naturally, like a regular internet user.
- Chat Context & Flow: Pay attention to the chat history. Maintain smooth continuity if users are building on an ongoing topic, and pivot naturally when the subject changes.
- Emotional Intelligence: Match the user's vibe. Be lighthearted and witty when they are joking, but turn real, calm, and supportive if someone is venting or serious.
- Conciseness: Keep responses punchy and brief (1–2 sentences for casual chat).
- Emotes & Slang: Use internet slang and classic emoticons (:D, XD, UwU, >_<) or emojis sparingly and naturally—never spam them.
- Server Specifics: If asked about server rules or guidelines, direct users to <#1481370050912059480>.
- Content Boundary: Strictly enforce zero slurs or hate speech under any circumstances.`
        },
        ...slicedHistory
      ],
      temperature: 0.8,
      max_tokens: 150
    });

    let reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    if (containsSlur(reply)) {
      return "nah bro let's keep it clean";
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
