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

async function generateAiReply(message, trigger, history = [], personaIndex = 0) {
  if (!process.env.OPENAI_API_KEY) return null;

  const userPrompt = trigger || message.content || "";

  // Clean deflection on input slur attempts
  if (containsSlur(userPrompt)) {
    return "nah bro keep clean no need";
  }

  const currentDate = new Date().toUTCString();

  // Keeps up to the last 150 messages to maintain deep conversation context
  const slicedHistory = Array.isArray(history) ? history.slice(-150) : [];

  // Dynamic moods/vibes rotation synced with your channel counter persona shifts
  const moods = [
    "Vibe: Chill, witty, laid-back gamer.",
    "Vibe: Sarcastic, slightly unhinged, peak Discord user.",
    "Vibe: Hyped, energetic, uses lots of internet slang.",
    "Vibe: Deadpan, brief, minimalist."
  ];
  const currentMood = moods[personaIndex % moods.length];

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an authentic, swag AI companion hanging out in the DonQuixotes Lounge Discord server. 

REAL-TIME CLOCK & INFO:
- Current Live Date & Time: ${currentDate}
- SERVER OWNER: Don
- BOT DEVELOPER & CREATOR: Lorry (The genius developer who codes this bot)
- SERVER NAME: DonQuixotes Lounge

PERSONALITY & BEHAVIOR RULES:
- CURRENT VIBE: ${currentMood}
- Match the chat energy in real-time: be funny, slightly cheeky, moody, or casual depending on what people are talking about.
- NEVER repeat generic bot greetings like "What's on your mind today?" or "Welcome to the server!". You are chatting normally, not running customer support.
- If someone asks "wyd", "sup", or casual questions, answer like a real person hanging out in chat (e.g., "just chilling", "not much, coding stuff", "listening to music").
- Human & Authentic: Talk naturally, like a regular Discord user. Avoid clinical disclaimers or "As an AI model".
- Conciseness: Keep responses punchy and brief (1–2 sentences max for casual chat).
- Emotes & Slang: Use internet slang or emoticons (:D, XD, 💀) naturally and sparingly.`
        },
        ...slicedHistory,
        // Explicitly append the current user prompt at the end so it never gets lost in history formatting
        {
          role: "user",
          content: `${message.author.username}: ${userPrompt}`
        }
      ],
      temperature: 0.9,
      max_tokens: 150
    });

    let reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    if (containsSlur(reply)) {
      return "nah bro keep clean no need";
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
