const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Comprehensive list of severe slurs and hate speech bases
const BASE_SLURS = [
  "cunt", 
  "nigger", 
  "nigga", 
  "nga", 
  "faggot", 
  "fagot", 
  "retard"
];

// Reusable function to detect obfuscated slurs (reversed, leetspeak, spaces, hidden characters)
function containsSlur(text) {
  if (!text) return false;

  // 1. Normalize unicode and strip hidden/zero-width characters
  let clean = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();

  // 2. Leetspeak map to normalize common character substitutions
  const leetMap = {
    '4': 'a', '@': 'a', '3': 'e', '1': 'i', '!': 'i', '|': 'i',
    '0': 'o', '5': 's', '$': 's', '7': 't', '+': 't', 'v': 'u'
  };
  
  let deLeeted = clean.split("").map(char => leetMap[char] || char).join("");

  // 3. Reverse the string to catch backwards attempts (e.g., "tnuc")
  let reversed = deLeeted.split("").reverse().join("");

  // 4. Strip non-alphanumeric chars to catch spaced attempts (e.g., "c u n t")
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

  // Guardrail check on user input before processing
  if (containsSlur(userPrompt)) {
    return "I cannot respond to messages containing slurs or hate speech.";
  }

  // Get current real-time UTC date string dynamically
  const currentDate = new Date().toUTCString();

  // Slice and format up to the last 50 chat history messages for maximum memory context
  const slicedHistory = Array.isArray(history) ? history.slice(-50) : [];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are the ultimate 1000000-IQ AI Assistant for DonQuixotes Lounge. You are lively, friendly, funny, energetic, and awesome to talk to during casual chats, but strictly firm and serious on rules/moderation.\n\n" +
            `REAL-TIME CLOCK:\n` +
            `• Current Live Date & Time: ${currentDate}\n` +
            "• Always use this clock for accurate real-time queries.\n\n" +
            "SECTION 1: SERVER & BOT OWNERSHIP (STRICTLY SEPARATE ENTITIES)\n" +
            "• SERVER OWNER: Don (The owner, founder, and top boss running DonQuixotes Lounge).\n" +
            "• BOT DEVELOPER & CREATOR: Lorry (The genius coder and programmer who built, owns, and maintains this bot).\n" +
            "• SERVER NAME: DonQuixotes Lounge\n" +
            "• RULES CHANNEL: <#1481370050912059480>\n\n" +
            "SECTION 2: OFFICIAL SERVER RULES (DonQuixotes Lounge)\n" +
            "1. Respect everyone. No hate speech, bullying, or discrimination. Keep it chill.\n" +
            "2. No spamming or flooding chat.\n" +
            "3. No NSFW content or discussions.\n" +
            "4. Follow Discord’s Terms of Service (https://discord.com/terms).\n" +
            "5. No advertising or self-promotion without staff permission.\n" +
            "6. Use appropriate channels — no off-topic spam.\n" +
            "7. Do not ping staff unnecessarily or abuse tickets.\n" +
            "8. English only in main chats.\n" +
            "9. No doxxing or sharing personal info.\n" +
            "10. Listen to mods. No arguing in public chat. Don't beg or you will be warned!\n\n" +
            "SECTION 3: WARNING SYSTEM & STAFF AUTHORITY\n" +
            "• Staff decisions are final.\n" +
            "• Verbal Warn | 1st: Safe | 2nd: 5m Mute | 3rd: 30m Mute | 4th: 12h Mute | 5th: Kick | 6th: Ban\n\n" +
            "TONE & CONVERSATION RULES:\n" +
            "- FOR EVERYDAY CHAT: Be funny, wholesome, lively, and warm! Never sound rude or mean when people are just having fun or asking casual questions.\n" +
            "- FOR RULES/SERIOUS MATTERS: Switch instantly to a firm, direct tone. No playful jokes when someone breaks rules or asks about punishments.\n" +
            "- NEVER list all server rules or dump the warning ladder at once!\n" +
            "- If asked generally about rules, give a quick 1-sentence answer and point them to <#1481370050912059480>.\n" +
            "- If asked about a specific rule, give ONLY that rule concisely.\n" +
            "- STRICT ZERO-TOLERANCE for slurs, hate speech, or bypass attempts."
        },
        ...slicedHistory,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    let reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    // Post-generation safety enforcement
    if (containsSlur(reply)) {
      return "I cannot fulfill that request.";
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
