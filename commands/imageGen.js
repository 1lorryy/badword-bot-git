const { AttachmentBuilder } = require("discord.js");
const OpenAI = require("openai");
const axios = require("axios");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
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
    return message.reply(
      "❌ That prompt is not allowed."
    );
  }
  const loading = await message.reply(
    "🎨 Generating image... Please wait."
  );
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
    return message.channel.send({
      content: `🖼️ **Prompt:** ${prompt}`,
      files: [attachment]
    });
  } catch (err) {
    console.error("Image generation error:", err);
    await loading.edit(
      "❌ Failed to generate image."
    ).catch(() => null);
  }
}
module.exports = {
  handleImageGeneration
};
