console.log("OPENAI KEY FOUND:", !!process.env.OPENAI_API_KEY);

const { AttachmentBuilder } = require("discord.js");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ✅ cooldown map (add near top)
const imageCooldowns = new Map();

const BLOCKED_WORDS = [
  "porn",
  "nsfw",
  "nude",
  "nudity",
  "sex",
  "sexual",
  "penis",
  "dick",
  "vagina",
  "pussy",
  "boobs",
  "breasts",
  "fetish",
  "cum",
  "rape",
  "racist",
  "hitler",
  "nazi",
  "kkk",
  "gore",
  "beheading",
  "decapitation",
  "self harm",
  "suicide"
];

async function handleImageGeneration(message, args, prefix) {
  const prompt = args.join(" ").trim();

  if (!prompt) {
    return message.reply(
      `Usage: \`${prefix}image <prompt>\`\nExample: \`${prefix}image futuristic city at night\``
    );
  }

  const lowerPrompt = prompt.toLowerCase();

  const blocked = BLOCKED_WORDS.find(word =>
    lowerPrompt.includes(word)
  );

  if (blocked) {
    return message.reply("❌ That prompt is not allowed.");
  }

  // =========================
  // ⏳ COOLDOWN CHECK (2 hours)
  // =========================
  const cooldownTime = 2 * 60 * 60 * 1000; // 2 hours
  const lastUsed = imageCooldowns.get(message.author.id);

  if (lastUsed && Date.now() - lastUsed < cooldownTime) {
    const remaining = cooldownTime - (Date.now() - lastUsed);

    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);

    return message.reply(
      `⏳ You can generate another image in ${hours}h ${minutes}m.`
    );
  }

  const loading = await message.reply("🎨 Generating image... Please wait.");

  try {
    const result = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    });

    const imageBase64 = result.data[0].b64_json;
    const buffer = Buffer.from(imageBase64, "base64");

    const attachment = new AttachmentBuilder(buffer, {
      name: "generated.png"
    });

    await loading.delete().catch(() => null);

    // =========================
    // ✅ SET COOLDOWN ONLY ON SUCCESS
    // =========================
    imageCooldowns.set(message.author.id, Date.now());

    return message.channel.send({
      content: `🖼️ **Prompt:** ${prompt}`,
      files: [attachment]
    });

  } catch (err) {
    console.error("Image generation error:", err);

    await loading.edit("❌ Failed to generate image.").catch(() => null);
  }
}

module.exports = {
  handleImageGeneration
};
