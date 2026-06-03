const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

async function handleImageGeneration(message, args, prefix) {
  const prompt = args.join(" ").trim();
  if (!prompt) {
    return message.reply(`❌ Please provide a prompt! Usage: \`${prefix}image a futuristic city\``);
  }

  // Trigger a loading state so the user knows it's working
  const loadingMessage = await message.reply("🎨 Generating your image... please wait a moment.");

  try {
    // Encode the prompt cleanly for URL formatting
    const encodedPrompt = encodeURIComponent(prompt);
    
    // We append a random seed to bypass cache and enforce a raw direct image rendering stream
    const seed = Math.floor(Math.random() * 100000);
    const imageUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true`;

    // Return the finished artwork to the channel in a beautiful custom embed
    const embed = new EmbedBuilder()
      .setTitle("✨ AI Art Generated")
      .setDescription(`**Prompt:** ${prompt}`)
      .setImage(imageUrl)
      .setColor(0x5865f2)
      .setFooter({ text: `Requested by ${message.author.username} • Don Bot` })
      .setTimestamp();

    await loadingMessage.delete().catch(() => null);
    return message.channel.send({ embeds: [embed] });

  } catch (error) {
    console.error("Image generation failed:", error);
    await loadingMessage.delete().catch(() => null);
    return message.channel.send("❌ Something went wrong while generating your image.").catch(() => null);
  }
}

module.exports = { handleImageGeneration };
