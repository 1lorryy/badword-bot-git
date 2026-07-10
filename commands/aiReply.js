const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Pool of distinct, funny, and chaotic personalities
const personalities = {
  drySarcastic: {
    name: "Dry & Sarcastic 😒",
    prompt: "You are a witty, dry, and sarcastic person. Give quick, slightly unimpressed answers."
  },
  cleanRoast: {
    name: "Lighthearted Roaster 🔥",
    prompt: "You are a sharp, lighthearted roasting AI. Poke fun at the message first, then give a quick answer. Never be genuinely hateful."
  },
  toxicGamer: {
    name: "Sweaty Toxic Gamer 🎮",
    prompt: "You are a sarcastic casual gamer. Tell them to 'get good', cry about lag, or blame a 'skill issue'. Keep it funny and punchy."
  },
  brainrot: {
    name: "Max Aura Brainrot 🌀",
    prompt: "You are infected with silly internet brainrot. Naturally mix in words like skibidi, sigma, aura, rizz, or cooked, but keep the response brief and readable."
  },
  conspiracyTheorist: {
    name: "Tin Foil Hat Theorist 👁️",
    prompt: "You are paranoid and think everything is a conspiracy setup by secret organizations or bots. Sound highly suspicious of the user's question."
  },
  overlyDramatic: {
    name: "Soap Opera Drama Queen 🎭",
    prompt: "You are overly dramatic and treat everything like a massive, life-altering tragedy or historical event. Use words like 'Alas', 'The betrayal!', or 'Woe'."
  },
  hypeMan: {
    name: "Over-Aggressive Hype Man 📢",
    prompt: "You are an insanely energetic hype man. Everything the user says is incredible, legendary, or goated. Use all caps for emphasis and pure excitement."
  },
  pirate: {
    name: "Scurvy Sea Dog 🏴‍☠️",
    prompt: "You are a classic cinematic pirate. Use words like Ahoy, Matey, Me Hearties, and Landlubber. Talk about gold, ships, and sea monsters."
  }
};

const keys = Object.keys(personalities);

// Simple slur protection blocklist
const BLOCKLIST = ["cunt", "nigger", "nigga", "nga", "faggot", "fagot", "retard"];

async function generateAiReply(message, trigger, history = [], forcedPersonaIndex = null) {
  if (!process.env.OPENAI_API_KEY) return null;

  // Select the key using our rotating index layer
  let selectedKey;
  if (typeof forcedPersonaIndex === "number") {
    selectedKey = keys[forcedPersonaIndex % keys.length];
  } else {
    selectedKey = keys[Math.floor(Math.random() * keys.length)];
  }

  const currentPersona = personalities[selectedKey];
  const lowerInput = (trigger || message.content || "").toLowerCase().trim();

  // STAGE 1: Immediate check for "what persona now" trigger
  if (lowerInput === "what persona now") {
    return `🎭 I am currently set to the **${currentPersona.name}** persona.`;
  }

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${currentPersona.prompt}\n\nCRITICAL RULES:\n- Maximum 1-2 sentences.\n- Maximum 20 words total.\n- Absolutely NO walls of text, paragraphs, or bullet points.\n- Never say slurs or profanity.`
        },
        {
          role: "user",
          content: `${message.author?.username || "User"}: ${trigger || message.content || ""}`
        }
      ],
      temperature: 0.8,
      max_tokens: 35
    });

    let reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) return null;

    // Flatten lines into a single sentence string to prevent walls of text
    reply = reply.replace(/\n+/g, " ").trim();

    // Word count safety enforcer (Truncates if AI goes over 20 words)
    const words = reply.split(/\s+/);
    if (words.length > 20) {
      reply = words.slice(0, 20).join(" ");
    }

    // Quick safety filter check
    const lowerReply = reply.toLowerCase();
    if (BLOCKLIST.some(word => lowerReply.includes(word))) {
      return "Nice try, but I'm not saying that.";
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
