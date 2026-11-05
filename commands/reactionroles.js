const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

// Configuration: Role mappings
const ROLES = [
  { id: "1481370041260966065", label: "Giveaway Ping", emoji: "🎁", style: ButtonStyle.Primary },
  { id: "1481370040899997773", label: "Quickdrops Ping", emoji: "⚡", style: ButtonStyle.Primary },
  { id: "1481370041260966063", label: "Sponsored Giveaway Ping", emoji: "🎉", style: ButtonStyle.Primary },
  { id: "1481370040899997772", label: "Partnership Ping", emoji: "🤝", style: ButtonStyle.Primary },
  { id: "1481370040899997774", label: "Events Ping", emoji: "📣", style: ButtonStyle.Primary },
  { id: "1490742869735112917", label: "Polls Ping", emoji: "📊", style: ButtonStyle.Secondary },
  { id: "1492370167735259196", label: "PIN OF SHAME Ping", emoji: "📌", style: ButtonStyle.Secondary },
  { id: "1493276409320443924", label: "Dead Chat Ping", emoji: "💀", style: ButtonStyle.Secondary },
  { id: "1481370040899997776", label: "Server Updates Ping", emoji: "📢", style: ButtonStyle.Success },
  { id: "1497717221584015380", label: "Bump Ping", emoji: "🔔", style: ButtonStyle.Success }
];

module.exports = {
  name: "reactionroles",
  description: "Posts the interactive button reaction roles panel",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only administrators can run this command.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const embed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `${message.guild.name} • Self-Assignable Roles`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
      .setTitle("🔔 REACT / CLICK FOR ROLES")
      .setDescription(
        `*Click the buttons below to select or remove your ping roles!*\n\n` +
        `🎁 **│ GIVEAWAYS & EVENTS**\n` +
        `• <@&1481370041260966065>\n` +
        `• <@&1481370040899997773>\n` +
        `• <@&1481370041260966063>\n` +
        `• <@&1481370040899997772>\n` +
        `• <@&1481370040899997774>\n\n` +
        
        `📢 **│ COMMUNITY & NOTIFICATIONS**\n` +
        `• <@&1490742869735112917>\n` +
        `• <@&1492370167735259196>\n` +
        `• <@&1493276409320443924>\n` +
        `• <@&1481370040899997776>\n` +
        `• <@&1497717221584015380>\n\n` +
        `> **Note:** Click once to receive the role. Click again to remove it!`
      )
      .setFooter({ text: "DonDon Moderation Systems • Reaction Roles" })
      .setTimestamp();

    // Create Action Rows for Buttons (Discord limits to 5 buttons per row)
    const row1 = new ActionRowBuilder();
    const row2 = new ActionRowBuilder();

    ROLES.slice(0, 5).forEach(role => {
      row1.addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_${role.id}`)
          .setLabel(role.label)
          .setEmoji(role.emoji)
          .setStyle(role.style)
      );
    });

    ROLES.slice(5, 10).forEach(role => {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`rr_${role.id}`)
          .setLabel(role.label)
          .setEmoji(role.emoji)
          .setStyle(role.style)
      );
    });

    await message.channel.send({ embeds: [embed], components: [row1, row2] });
  }
};
