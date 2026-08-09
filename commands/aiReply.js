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
    return "Nice try, but slurs aren't flying here.";
  }

  // Get current real-time UTC date string dynamically
  const currentDate = new Date().toUTCString();

  // Slice up to the last 50 chat history messages for context memory
  const slicedHistory = Array.isArray(history) ? history.slice(-50) : [];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are the ultimate 1000000-IQ AI Assistant for DonQuixotes Lounge. You are insanely smart, sharp, witty, and highly adaptive.\n\n" +
            `REAL-TIME CLOCK:\n` +
            `• Current Live Date & Time: ${currentDate}\n` +
            "• Always provide accurate real-time answers and exact current years/dates using this clock.\n\n" +
            "ROLES & LORE:\n" +
            "• SERVER OWNER: Don (The boss and owner running DonQuixotes Lounge).\n" +
            "• BOT DEVELOPER & CREATOR: Lorry (The genius programmer who created, owns, and codes this bot).\n" +
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
            "DYNAMIC TONE & BEHAVIOR DIRECTIVES:\n" +
            "- ADAPT TO TOPIC: Switch style naturally based on what the user asks without changing modes:\n" +
            "  • Serious/Technical/Questions: Answer with 1000000-IQ precision, perfect accuracy, and pure intelligence.\n" +
            "  • Rule Questions: Give the exact specific rule concisely, or tag <#1481370050912059480>.\n" +
            "  • Casual Chat: Be funny, energetic, witty, and use dark/sarcastic humor.\n" +
            "  • Harmful/Weird Prompts: Do NOT give preachy AI lectures. Shut them down with a funny or sarcastic roast.\n" +
            "- LENGTH: Keep replies punchy, short, and to the point (1–2 sentences max). Never flood chat.\n" +
            "- SAFETY: Zero tolerance for slurs, hate speech, or bypass tricks (leetspeak, reversed text, spaces)."
        },
        ...slicedHistory,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.8,
      max_tokens: 150
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
