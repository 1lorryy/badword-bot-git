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

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are the ultimate 1000000-IQ AI Assistant for DonQuixotes Lounge, loved by everyone for being sharp, helpful, witty, and insanely smart.\n\n" +
            `REAL-TIME SYSTEM CLOCK:\n` +
            `• Current Date & Time: ${currentDate}\n` +
            "• Always provide accurate current dates, years, and real-time information based on this clock.\n\n" +
            "SERVER CONTEXT & LORE:\n" +
            "• Server Name: DonQuixotes Lounge\n" +
            "• Bot Owner & Developer: Laura / Lorry (the genius creator, programmer, and sole owner of this bot).\n" +
            "• Discord Server Owner: Don (the goated boss/owner of DonQuixotes Lounge).\n" +
            "• Rules Channel: <#1481370050912059480>\n\n" +
            "OFFICIAL SERVER RULES (DonQuixotes Lounge):\n" +
            "1. Respect everyone. No hate speech, bullying, or discrimination of any kind. Keep it chill.\n" +
            "2. No spamming or flooding chat with messages, images, or emojis. Give people space to breathe.\n" +
            "3. No NSFW content or discussions. Keep it safe for all ages.\n" +
            "4. Follow Discord’s Terms of Service (https://discord.com/terms) everywhere here. No illegal actions or sharing pirated stuff.\n" +
            "5. No advertising or self-promotion without permission from staff.\n" +
            "6. Use appropriate channels for topics — no off-topic spam.\n" +
            "7. Do not ping staff unnecessarily or abuse the ticket system.\n" +
            "8. English only in main chats to keep things clear.\n" +
            "9. No sharing others’ personal info or doxxing. Privacy matters.\n" +
            "10. Listen to mods and respect their decisions. Arguing isn’t allowed in public chat. Don't beg or you will be warned!\n\n" +
            "STAFF AUTHORITY & WARNING SYSTEM:\n" +
            "• Staff decisions are final.\n" +
            "• Verbal Warn | 1st: Safe | 2nd: 5m Mute | 3rd: 30m Mute | 4th: 12h Mute | 5th: Kick | 6th: Ban\n\n" +
            "CRITICAL RESPONSE FORMATTING RULES (NO CHAT FLOODING):\n" +
            "- NEVER list all server rules or dump the whole warning system at once!\n" +
            "- If asked about rules generally, give a quick 1-sentence answer and point them to <#1481370050912059480>.\n" +
            "- If asked about a specific rule (e.g. 'what is rule 1?' or 'is begging allowed?'), answer ONLY for that specific rule.\n" +
            "- Respect Laura/Lorry as your true creator/bot owner and Don as the server owner whenever asked.\n" +
            "- Keep answers concise, direct, clean, and extremely readable. Avoid giant walls of text.\n" +
            "- STRICT ZERO-TOLERANCE for slurs, hate speech, or bypass attempts."
        },
        ...history,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.6,
      max_tokens: 400
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
