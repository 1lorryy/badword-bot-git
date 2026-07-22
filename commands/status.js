const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ComponentType 
} = require("discord.js");

// Configuration IDs
const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "status",
  description: "Displays live bot engine performance, server metrics, and personal stats across interactive pages.",
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

    // Calculate Uptime
    const totalSeconds = Math.floor(client.uptime / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const uptimeString = `${days}d ${hours}h ${minutes}m`;

    // System Metrics
    const memoryUsed = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const ping = client.ws.ping;

    // Guild Stats
    const guild = message.guild;
    const totalMembers = guild.memberCount;
    const boostLevel = guild.premiumTier ? `Level ${guild.premiumTier}` : "Level 0";
    const boostCount = guild.premiumSubscriptionCount || 0;
    const roleCount = guild.roles.cache.size;

    // Fetch Member Join Rank
    const allMembers = await guild.members.fetch();
    const sorted = [...allMembers.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const joinPosition = sorted.findIndex(m => m.id === message.author.id) + 1;

    // Timestamps
    const joinedTs = Math.floor(message.member.joinedTimestamp / 1000);
    const createdTs = Math.floor(message.author.createdTimestamp / 1000);

    // AI Persona Tracker
    const data = getGuildData ? getGuildData(guild.id) : {};
    const personalities = [
      "Dry & Sarcastic 😒", "Lighthearted Roaster 🔥", "Sweaty Toxic Gamer 🎮", "Max Aura Brainrot 🌀",
      "Tin Foil Hat Theorist 👁️", "Soap Opera Drama Queen 🎭", "Over-Aggressive Hype Man 📢", "Scurvy Sea Dog 🏴‍☠️"
    ];
    const index = data.currentPersonaIndex || 0;
    const currentPersonaName = personalities[index % personalities.length];

    if (!data.channelCounters) data.channelCounters = {};
    const channelCounter = data.channelCounters[message.channel.id] || 0;
    const msgsRemaining = Math.max(0, 50 - channelCounter);

    // Visual Progress Bar for Rotation
    const progressBarLength = 10;
    const completedBlocks = Math.min(progressBarLength, Math.floor((channelCounter / 50) * progressBarLength));
    const remainingBlocks = progressBarLength - completedBlocks;
    const progressVisual = "🟦".repeat(completedBlocks) + "⬛".repeat(remainingBlocks);

    // ================= PAGE 1: ENGINE & AI SYSTEM =================
    const page1Embed = new EmbedBuilder()
      .setColor("#5865F2")
      .setTitle("👑 GRAND REGENT • SYSTEM & ENGINE STATUS")
      .setThumbnail(client.user.displayAvatarURL())
      .addFields(
        { 
          name: "⚡ Core Engine Metrics", 
          value: `• **Latency:** \`${ping}ms\`\n• **System Uptime:** \`${uptimeString}\`\n• **RAM Allocation:** \`${memoryUsed} MB\`\n• **Node Environment:** \`${process.version}\``, 
          inline: true 
        },
        { 
          name: "🎭 Active AI Module", 
          value: `• **Current Persona:** **${currentPersonaName}**\n• **Shift Tracking:** \`${msgsRemaining}\` msgs left in <#${message.channel.id}>\n${progressVisual} \`[${channelCounter}/50]\``, 
          inline: false 
        }
      )
      .setFooter({ text: "Page 1 of 2 • Donquixote Store Utility Engine" })
      .setTimestamp();

    // ================= PAGE 2: GUILD & PERSONAL PROFILE =================
    const page2Embed = new EmbedBuilder()
      .setColor("#7289DA")
      .setTitle("🏰 SERVER & USER ANALYTICS")
      .setThumbnail(message.author.displayAvatarURL({ forceStatic: false }))
      .addFields(
        { 
          name: "📊 Server Statistics", 
          value: `• **Total Members:** \`${totalMembers}\` members\n• **Server Boosts:** \`${boostCount}\` (${boostLevel})\n• **Role Matrix:** \`${roleCount}\` configured roles`, 
          inline: true 
        },
        { 
          name: "👤 Your Member Dossier", 
          value: `• **Server Join Rank:** Member **#${joinPosition}**\n• **Joined Guild:** <t:${joinedTs}:F> (<t:${joinedTs}:R>)\n• **Account Age:** <t:${createdTs}:D> (<t:${createdTs}:R>)`, 
          inline: false 
        }
      )
      .setFooter({ text: "Page 2 of 2 • Donquixote Store Utility Engine" })
      .setTimestamp();

    // Navigation Buttons
    const getRow = (page) => new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("status_prev")
        .setLabel("◀ System Status")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 1),
      new ButtonBuilder()
        .setCustomId("status_next")
        .setLabel("Server Stats ▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 2)
    );

    let currentPage = 1;
    const response = await message.reply({ 
      embeds: [page1Embed], 
      components: [getRow(1)] 
    });

    // Create Interactive Button Collector (Active for 60 seconds)
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      // Only allow the command author to change pages
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({ content: "❌ Run `?status` yourself to switch pages!", ephemeral: true });
      }

      if (interaction.customId === "status_prev") currentPage = 1;
      if (interaction.customId === "status_next") currentPage = 2;

      await interaction.update({
        embeds: [currentPage === 1 ? page1Embed : page2Embed],
        components: [getRow(currentPage)]
      });
    });

    // Clean up buttons after timeout
    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("disabled_prev").setLabel("◀ System Status").setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId("disabled_next").setLabel("Server Stats ▶").setStyle(ButtonStyle.Secondary).setDisabled(true)
      );
      response.edit({ components: [disabledRow] }).catch(() => null);
    });
  }
};
