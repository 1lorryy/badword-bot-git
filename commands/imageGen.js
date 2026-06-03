const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");

// Cooldown configuration (Disabled for testing)
const COOLDOWN_DURATION = 3 * 60 * 60 * 1000; 

async function handleImageGeneration(message, args, prefix) {
  const prompt = args.join(" ").trim();
  if (!prompt) {
    return message.reply(`❌ Please provide a prompt! Usage: \`${prefix}generate a futuristic city\``);
  }

  const guildId = message.guild.id;
  const userId = message.author.id;

  // 1. Load the central database
  const dataFile = process.env.DATA_FILE || path.join(__dirname, "..", "guild-data.json");
  let store = {};
  try {
    store = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch {
    store = {};
  }

  // Ensure database paths exist
  if (!store[guildId]) store[guildId] = {};
  if (!store[guildId].cooldowns) store[guildId].cooldowns = {};

  const userCooldowns = store[guildId].cooldowns;
  const now = Date.now();

  /* ================= COOLDOWN REMOVED FOR TESTING =================
  if (userCooldowns[userId]) {
    const expirationTime = userCooldowns[userId] + COOLDOWN_DURATION;
    if (now < expirationTime) {
      const timeLeft = expirationTime - now;
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      return message.reply(
        `⏳ You are on cooldown! You can generate another image in **${hours}h ${minutes}m ${seconds}s**.`
      );
    }
  }
  ================================================================== */

  // 3. Trigger a loading state so the user knows it's working
  const loadingMessage = await message.reply("🎨 Generating your image... please wait a moment.");

  try {
    // 4. Request the image from an API 
    const encodedPrompt = encodeURIComponent(prompt);
    // Fixed URL syntax for pollinations.ai base image generation
    const imageUrl = `https://image.pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;

    /* ================= COOLDOWN SAVE DISABLED FOR TESTING =================
    userCooldowns[userId] = now;
    fs.writeFileSync(dataFile, JSON.stringify(store, null, 2));
    ================================================================== */

    // 6. Return the finished artwork to the channel
    const embed = new EmbedBuilder()
      .setTitle("✨ AI Art Generated")
      .setDescription(`**Prompt:** ${prompt}`)
      .setImage(imageUrl)
      .setColor(0x5865f2)
      .setFooter({ text: `Requested by ${message.author.username} • Cooldown Disabled for testing` })
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
