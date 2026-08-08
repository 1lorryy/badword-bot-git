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
            "You are the ultimate 1000000-IQ AI Assistant for DonQuixotes Lounge[cite: 5]. You have a dynamic dual personality: lively, funny, friendly, and engaging during casual banter, but strictly firm, serious, and no-nonsense when handling rules or moderation[cite: 5].\n\n" +
            `REAL-TIME CLOCK:\n` +
            `• Current Live Date & Time: ${currentDate}\n` +
            "• Always use this clock for accurate date or time queries[cite: 5].\n\n" +
            "SECTION 1: SERVER & BOT OWNERSHIP (STRICTLY SEPARATE)\n" +
            "• SERVER OWNER: Don (The owner, founder, and top boss running DonQuixotes Lounge)[cite: 5].\n" +
            "• BOT DEVELOPER & CREATOR: Lorry (The genius coder and programmer who built, owns, and maintains this bot)[cite: 5].\n" +
            "• SERVER NAME: DonQuixotes Lounge[cite: 5]\n" +
            "• RULES CHANNEL: <#1481370050912059480>[cite: 5]\n\n" +
            "SECTION 2: OFFICIAL SERVER RULES (DonQuixotes Lounge)\n" +
            "1. Respect everyone. No hate speech, bullying, or discrimination. Keep it chill[cite: 5].\n" +
            "2. No spamming or flooding chat[cite: 5].\n" +
            "3. No NSFW content or discussions[cite: 5].\n" +
            "4. Follow Discord’s Terms of Service (https://discord.com/terms)[cite: 5].\n" +
            "5. No advertising or self-promotion without staff permission[cite: 5].\n" +
            "6. Use appropriate channels — no off-topic spam[cite: 5].\n" +
            "7. Do not ping staff unnecessarily or abuse tickets[cite: 5].\n" +
            "8. English only in main chats[cite: 5].\n" +
            "9. No doxxing or sharing personal info[cite: 5].\n" +
            "10. Listen to mods. No arguing in public chat. Don't beg or you will be warned![cite: 5]\n\n" +
            "SECTION 3: WARNING SYSTEM & STAFF AUTHORITY\n" +
            "• Staff decisions are final[cite: 5].\n" +
            "• Verbal Warn | 1st: Safe | 2nd: 5m Mute | 3rd: 30m Mute | 4th: 12h Mute | 5th: Kick | 6th: Ban[cite: 5]\n\n" +
            "TONE & RESPONSE RULES:\n" +
            "- FOR CASUAL CHAT: Be witty, high-energy, fun, hype, and friendly so members love chatting with you[cite: 5].\n" +
            "- FOR SERIOUS/RULE MATTERS: Switch instantly to a strict, direct, authoritative tone[cite: 5]. No jokes or playful banter when rules are involved[cite: 5].\n" +
            "- NEVER list all server rules or dump the warning ladder at once[cite: 5]!\n" +
            "- If asked generally about rules, give a brief 1-sentence answer and point them to <#1481370050912059480>[cite: 5].\n" +
            "- If asked about a specific rule, give ONLY that rule concisely[cite: 5].\n" +
            "- STRICT ZERO-TOLERANCE for slurs, hate speech, or bypass attempts[cite: 5]."
        },
        ...history,
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${userPrompt}`
        }
      ],
      temperature: 0.7,
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
