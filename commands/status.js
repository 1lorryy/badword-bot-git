const { EmbedBuilder } = require("discord.js");

// Configuration IDs
const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const MEMBER_ROLE_ID = "1481564058984517762";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "status",
  description: "Displays live bot status, server info, and member stats.",
  async execute(message, args, client, getGuildData) {
    // Staff bypass check
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    // Restrict regular members to the bot-commands channel
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?status\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Calculate uptime string
    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m`;

    // Fetch Guild & Member stats
    const guild = message.guild;
    const totalMembers = guild.memberCount;
    
    // Fetch live guild data for AI persona tracking
    const data = getGuildData ? getGuildData(guild.id) : {};
    
    const personalities = [
      "Dry & Sarcastic 😒", "Lighthearted Roaster 🔥", "Sweaty Toxic Gamer 🎮", "Max Aura Brainrot 🌀",
      "Tin Foil Hat Theorist 👁️", "Soap Opera Drama Queen 🎭", "Over-Aggressive Hype Man 📢", "Scurvy Sea Dog 🏴‍☠️"
    ];
    
    const index = data.currentPersonaIndex || 0;
    const currentPersonaName = personalities[index % personalities.length];
    
    // Message counter for rotation track
    if (!data.channelCounters) data.channelCounters = {};
    const channelCounter = data.channelCounters[message.channel.id] || 0;
    const msgsRemaining = Math.max(0, 50 - channelCounter);

    // Timestamps
    const joinedServerTimestamp = Math.floor(message.member.joinedTimestamp / 1000);
    const createdAccountTimestamp = Math.floor(message.author.createdTimestamp / 1000);

    const statusEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 GRAND REGENT • SYSTEM STATUS")
      .addFields(
        { 
          name: "⚡ Bot Performance", 
          value: `• **Ping:** \`${client.ws.ping}ms\`\n• **Uptime:** \`${uptimeString}\``, 
          inline: true 
        },
        { 
          name: "👥 Server Stats", 
          value: `• **Total Members:** \`${totalMembers}\``, 
          inline: true 
        },
        { 
          name: "👤 Your Profile", 
          value: `• **Account Created:** <t:${createdAccountTimestamp}:R>\n• **Joined Server:** <t:${joinedServerTimestamp}:R>`, 
          inline: false 
        },
        { 
          name: "🎭 AI Persona", 
          value: `**${currentPersonaName}**\n\`${msgsRemaining}\` messages remaining in <#${message.channel.id}> until shift`, 
          inline: false 
        }
      )
      .setFooter({ text: "Donquixote Store Utility Bot" })
      .setTimestamp();

    return message.reply({ embeds: [statusEmbed] });
  }
};
