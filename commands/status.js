const { EmbedBuilder } = require("discord.js");

// Configuration IDs
const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const MEMBER_ROLE_ID = "1481564058984517762";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "status",
  description: "Displays live engine specs, active AI cycle configurations, and member join info.",
  async execute(message, args, client, getGuildData) {
    // Check if user is staff (has Staff Role, Administrator, or Manage Messages permission)
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    // Restrict regular members to the bot-commands channel
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?status\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Calculate precise uptime string
    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m`;

    const ping = client.ws.ping;
    const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    // Fetch live guild data 
    const data = getGuildData ? getGuildData(message.guild.id) : {};
    
    const personalities = [
      "Dry & Sarcastic 😒", "Lighthearted Roaster 🔥", "Sweaty Toxic Gamer 🎮", "Max Aura Brainrot 🌀",
      "Tin Foil Hat Theorist 👁️", "Soap Opera Drama Queen 🎭", "Over-Aggressive Hype Man 📢", "Scurvy Sea Dog 🏴‍☠️"
    ];
    
    const index = data.currentPersonaIndex || 0;
    const currentPersonaName = personalities[index % personalities.length];
    
    // Look directly into the live channel counter map data
    if (!data.channelCounters) data.channelCounters = {};
    const channelCounter = data.channelCounters[message.channel.id] || 0;
    const msgsRemaining = Math.max(0, 50 - channelCounter);

    // Custom visual progress bar for the 50-message rotation track
    const progressBarLength = 10;
    const completedBlocks = Math.min(progressBarLength, Math.floor((channelCounter / 50) * progressBarLength));
    const remainingBlocks = progressBarLength - completedBlocks;
    const progressVisual = "🟦".repeat(completedBlocks) + "⬛".repeat(remainingBlocks);

    // Format Member Join Dates (Discord Created & Server Joined)
    const joinedServerTimestamp = Math.floor(message.member.joinedTimestamp / 1000);
    const createdAccountTimestamp = Math.floor(message.author.createdTimestamp / 1000);

    const statusEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 GRAND REGENT • ENGINE STATUS")
      .addFields(
        { name: "📡 Network Ping", value: `\`${ping}ms\``, inline: true },
        { name: "🔋 Live Uptime", value: `\`${uptimeString}\``, inline: true },
        { name: "🎛️ RAM Allocation", value: `\`${memoryUsed} MB\``, inline: true },
        { 
          name: "👤 Your Join Info", 
          value: `• **Account Created:** <t:${createdAccountTimestamp}:D> (<t:${createdAccountTimestamp}:R>)\n• **Joined Server:** <t:${joinedServerTimestamp}:D> (<t:${joinedServerTimestamp}:R>)`, 
          inline: false 
        },
        { name: "🎭 Active AI Persona Frequency", value: `**${currentPersonaName}**`, inline: false },
        { name: "🔄 Next Persona Rotation Cycle", value: `${progressVisual} \`${msgsRemaining}\` messages left\n*Currently tracked at: ${channelCounter}/50 messages in <#${message.channel.id}>*`, inline: false }
      )
      .setFooter({ text: "Infrastructure Hosted Live Via Railway Container Services" })
      .setTimestamp();

    return message.reply({ embeds: [statusEmbed] });
  }
};
