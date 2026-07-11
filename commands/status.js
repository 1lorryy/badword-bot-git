// ====================================================================
// SYSTEM MODULES & CONFIGURATION DEPENDENCIES
// ====================================================================
const { EmbedBuilder, version: djsVersion } = require("discord.js");
const os = require("os");

module.exports = {
  name: "status",
  description: "Displays advanced tech metrics, bot uptime, and active AI configurations.",
  async execute(message, args, client, getGuildData) {
    
    // ----------------------------------------------------------------
    // 1. TIME & PERFORMANCE METRICS
    // ----------------------------------------------------------------
    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m`;

    const ping = client.ws.ping;

    // Calculate RAM footprint (converts heapUsed into Megabytes)
    const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    // ----------------------------------------------------------------
    // 2. GUILD DATA & PERSONA TRACKING
    // ----------------------------------------------------------------
    const data = getGuildData ? getGuildData(message.guild.id) : {};
    
    const personalities = [
      "Dry & Sarcastic 😒", "Lighthearted Roaster 🔥", "Sweaty Toxic Gamer 🎮", "Max Aura Brainrot 🌀",
      "Tin Foil Hat Theorist 👁️", "Soap Opera Drama Queen 🎭", "Over-Aggressive Hype Man 📢", "Scurvy Sea Dog 🏴‍☠️"
    ];
    
    const index = data.currentPersonaIndex || 0;
    const currentPersonaName = personalities[index % personalities.length];
    
    const channelCounter = data.channelCounters?.[message.channel.id] || 0;
    const msgsRemaining = Math.max(0, 50 - channelCounter);

    // ----------------------------------------------------------------
    // 3. RENDER ULTRA-COMPACT STATUS CARD
    // ----------------------------------------------------------------
    const statusEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("⚙️ Grand Regent • System Diagnostics")
      .addFields(
        // Line 1: Bot Connection Core
        { name: "⚡ Ping", value: `\`${ping}ms\``, inline: true },
        { name: "⏱️ Uptime", value: `\`${uptimeString}\``, inline: true },
        { name: "💾 Memory", value: `\`${memoryUsed} MB\``, inline: true },
        
        // Line 2: Server Stats
        { name: "🌐 Active Servers", value: `\`${client.guilds.cache.size}\` Guilds`, inline: true },
        { name: "👥 Node Engine", value: `\`${process.version}\``, inline: true },
        { name: "📦 Library", value: `\`djs v${djsVersion}\``, inline: true },
        
        // Line 3: AI Engine Loop Parameters
        { name: "🤖 Active Persona State", value: `**${currentPersonaName}**`, inline: false },
        { name: "📊 AI Cycle Progress", value: `\`${msgsRemaining}\` messages remaining in this channel until rotation trigger.`, inline: false }
      )
      .setFooter({ text: `Host Architecture: Railway Platform Linux Container`, iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    return message.reply({ embeds: [statusEmbed] });
  }
};
