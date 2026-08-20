const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require("discord.js");

// Active timer references to prevent overlapping in-memory intervals
const activeGiveawayTimers = new Map();

/**
 * Automatically restarts active timers for un-ended giveaways after a bot reboot.
 */
async function initGiveaways(client, getGuildData, saveData) {
  for (const [guildId, guildData] of client.guilds.cache) {
    if (!guildData.giveaways) continue;

    const data = getGuildData(guildId);
    if (!data.giveaways) continue;

    for (const [giveawayId, gw] of Object.entries(data.giveaways)) {
      if (gw.ended) continue;

      const timeLeft = gw.endsAt - Date.now();
      
      if (timeLeft <= 0) {
        // Already expired while offline, end immediately
        endGiveaway(client, guildId, giveawayId, getGuildData, saveData);
      } else {
        // Schedule remaining time
        if (activeGiveawayTimers.has(giveawayId)) clearTimeout(activeGiveawayTimers.get(giveawayId));
        
        const timer = setTimeout(() => {
          endGiveaway(client, guildId, giveawayId, getGuildData, saveData);
        }, timeLeft);
        
        activeGiveawayTimers.set(giveawayId, timer);
      }
    }
  }
}

async function endGiveaway(client, guildId, giveawayId, getGuildData, saveData) {
  if (activeGiveawayTimers.has(giveawayId)) {
    clearTimeout(activeGiveawayTimers.get(giveawayId));
    activeGiveawayTimers.delete(giveawayId);
  }

  const guildData = getGuildData(guildId);
  if (!guildData || !guildData.giveaways || !guildData.giveaways[giveawayId]) return;

  const gw = guildData.giveaways[giveawayId];
  if (gw.ended) return;

  gw.ended = true;
  saveData(guildId, guildData);

  try {
    const guild = await client.guilds.fetch(guildId);
    if (!guild) return;
    const channel = await guild.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) return;
    const message = await channel.messages.fetch(gw.messageId).catch(() => null);

    // Pick Winners
    const validEntries = gw.entries;
    let winnersText = "No valid entries.";
    const winners = [];

    if (validEntries.length > 0) {
      const shuffled = [...validEntries].sort(() => 0.5 - Math.random());
      const winnerCount = Math.min(gw.winnerCount, shuffled.length);
      
      for (let i = 0; i < winnerCount; i++) {
        winners.push(shuffled[i]);
      }
      winnersText = winners.map(id => `<@${id}>`).join(", ");
    }

    gw.lastWinners = winners; // Store for potential rerolls
    saveData(guildId, guildData);

    const endedEmbed = new EmbedBuilder()
      .setColor(0x2f3136)
      .setTitle("🎉 **GIVEAWAY ENDED** 🎉")
      .setDescription(
        `### Prize: **${gw.prize}**\n\n` +
        `• **Hosted by:** <@${gw.hostId}>\n` +
        `• **Winners:** ${winnersText}\n` +
        `• **Total Entries:** \`${validEntries.length}\``
      )
      .setFooter({ text: `Giveaway ID: ${giveawayId} • Ended` })
      .setTimestamp();

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`gw_enter_${giveawayId}`)
        .setEmoji("🎉")
        .setLabel("Giveaway Ended")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    if (message) {
      await message.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => {});
      await channel.send({ content: `🎊 Congratulations ${winnersText}! You won the **${gw.prize}**!` }).catch(() => {});
    }
  } catch (err) {
    console.error(`Error ending giveaway ${giveawayId}:`, err);
  }
}

module.exports = {
  initGiveaways,
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manage advanced custom giveaways.")
    .addSubcommand(sub =>
      sub.setName("start")
        .setDescription("Start a new giveaway.")
        .addStringOption(option => option.setName("prize").setDescription("What is being given away?").setRequired(true))
        .addStringOption(option => option.setName("duration").setDescription("Duration (e.g., 30s, 10m, 2h, 1d)").setRequired(true))
        .addIntegerOption(option => option.setName("winners").setDescription("Number of winners").setRequired(true))
        .addChannelOption(option => option.setName("channel").setDescription("Channel to send giveaway in").addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addRoleOption(option => option.setName("required_role").setDescription("Role required to enter").setRequired(false))
        .addRoleOption(option => option.setName("blacklisted_role").setDescription("Role blacklisted from entering").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("reroll")
        .setDescription("Reroll a new winner for an ended giveaway.")
        .addStringOption(option => option.setName("giveaway_id").setDescription("The ID of the giveaway to reroll").setRequired(true))
    ),

  async execute(interaction, getGuildData, saveData) {
    const HOST_ROLE_ID = "1481370041352982674";
    const STAFF_ROLE_ID = "1481370041420087474";

    const member = interaction.member;
    const hasPermission = 
      member.roles.cache.has(HOST_ROLE_ID) || 
      member.roles.cache.has(STAFF_ROLE_ID) || 
      member.permissions.has(PermissionFlagsBits.Administrator);

    if (!hasPermission) {
      return interaction.reply({ 
        content: "❌ You don't have permission to manage giveaways!", 
        ephemeral: true 
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildData = getGuildData(interaction.guild.id);
    if (!guildData.giveaways) guildData.giveaways = {};

    // ================= REROLL SUBCOMMAND =================
    if (subcommand === "reroll") {
      const gwId = interaction.options.getString("giveaway_id");
      const gw = guildData.giveaways[gwId];

      if (!gw) {
        return interaction.reply({ content: "❌ No giveaway found with that ID.", ephemeral: true });
      }
      if (!gw.ended) {
        return interaction.reply({ content: "❌ You can only reroll giveaways that have already ended!", ephemeral: true });
      }
      if (gw.entries.length === 0) {
        return interaction.reply({ content: "❌ There were no entries for this giveaway, cannot reroll.", ephemeral: true });
      }

      // Pick a random entry different from previous winners if possible
      const availableEntries = gw.entries.filter(id => !gw.lastWinners?.includes(id));
      const pool = availableEntries.length > 0 ? availableEntries : gw.entries;
      const newWinnerId = pool[Math.floor(Math.random() * pool.length)];

      return interaction.reply({ content: `🎲 Rerolled! The new winner for **${gw.prize}** is: <@${newWinnerId}>! 🎉` });
    }

    // ================= START SUBCOMMAND =================
    if (subcommand === "start") {
      const prize = interaction.options.getString("prize");
      const durationStr = interaction.options.getString("duration");
      const winnerCount = interaction.options.getInteger("winners");
      const targetChannel = interaction.options.getChannel("channel") || interaction.channel;
      const requiredRole = interaction.options.getRole("required_role");
      const blacklistedRole = interaction.options.getRole("blacklisted_role");

      const timeMultipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
      const match = durationStr.match(/^(\d+)([smhd])$/);
      if (!match) {
        return interaction.reply({ content: "❌ Invalid duration format! Use `30s`, `15m`, `2h`, or `1d`.", ephemeral: true });
      }

      const durationMs = parseInt(match[1]) * timeMultipliers[match[2]];
      const endsAt = Date.now() + durationMs;

      await interaction.deferReply({ ephemeral: true });

      let reqText = "None";
      const reqs = [];
      if (requiredRole) reqs.push(`Must have ${requiredRole}`);
      if (blacklistedRole) reqs.push(`Must NOT have ${blacklistedRole}`);
      if (reqs.length > 0) reqText = reqs.join("\n• ");

      const giveawayId = Date.now().toString();

      const embed = new EmbedBuilder()
        .setColor(0xFF73FA)
        .setTitle("🎉 **GIVEAWAY TIME** 🎉")
        .setDescription(
          `### Prize: **${prize}**\n\n` +
          `• **Hosted by:** ${interaction.user}\n` +
          `• **Winners:** \`${winnerCount}\`\n` +
          `• **Requirements:**\n• ${reqText}\n\n` +
          `⏳ **Ends At:** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:f>)`
        )
        .setFooter({ text: `Giveaway ID: ${giveawayId} • Click the button below to enter!` })
        .setTimestamp(endsAt);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`gw_enter_${giveawayId}`)
          .setEmoji("🎉")
          .setLabel("Enter Giveaway")
          .setStyle(ButtonStyle.Success)
      );

      const gwMessage = await targetChannel.send({
        embeds: [embed],
        components: [row]
      });

      guildData.giveaways[giveawayId] = {
        prize,
        winnerCount,
        endsAt,
        channelId: targetChannel.id,
        messageId: gwMessage.id,
        hostId: interaction.user.id,
        requiredRoleId: requiredRole ? requiredRole.id : null,
        blacklistedRoleId: blacklistedRole ? blacklistedRole.id : null,
        entries: [],
        ended: false,
        lastWinners: []
      };
      saveData(interaction.guild.id, guildData);

      // Schedule Live Timer
      const timer = setTimeout(() => {
        endGiveaway(interaction.client, interaction.guild.id, giveawayId, getGuildData, saveData);
      }, durationMs);
      activeGiveawayTimers.set(giveawayId, timer);

      await interaction.editReply({ content: `✅ Giveaway successfully deployed in ${targetChannel}!` });
    }
  }
};
