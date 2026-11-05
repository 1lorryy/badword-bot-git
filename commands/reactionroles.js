const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

// Configuration: Role mappings
const ROLES = [
  // Row 1: Giveaways & Events
  { id: "1481370041260966065", label: "Giveaway", emoji: "🎁", style: ButtonStyle.Primary },
  { id: "1481370040899997773", label: "Quickdrops", emoji: "⚡", style: ButtonStyle.Primary },
  { id: "1481370041260966063", label: "Sponsored GW", emoji: "🎉", style: ButtonStyle.Primary },
  { id: "1481370040899997772", label: "Partnership", emoji: "🤝", style: ButtonStyle.Primary },
  { id: "1481370040899997774", label: "Events", emoji: "📣", style: ButtonStyle.Primary },

  // Row 2: Community & Alerts
  { id: "1490742869735112917", label: "Polls", emoji: "📊", style: ButtonStyle.Secondary },
  { id: "1492370167735259196", label: "Pin of Shame", emoji: "📌", style: ButtonStyle.Secondary },
  { id: "1493276409320443924", label: "Dead Chat", emoji: "💀", style: ButtonStyle.Secondary },
  { id: "1481370040899997776", label: "Server Updates", emoji: "📢", style: ButtonStyle.Success },
  { id: "1497717221584015380", label: "Bump", emoji: "🔔", style: ButtonStyle.Success }
];

module.exports = {
  name: "reactionroles",
  description: "Posts the compact button reaction roles panel",
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
        name: `${message.guild.name} • Role Reactions`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
      .setTitle("🔔 SELF-ASSIGNABLE ROLES")
      .setDescription(
        `*Click the buttons below to toggle your notification roles on or off.*\n\n` +

        `🎁 **GIVEAWAYS & EVENTS**\n` +
        `• <@&1481370041260966065> ── Giveaways\n` +
        `• <@&1481370040899997773> ── Quickdrops\n` +
        `• <@&1481370041260966063> ── Sponsored Giveaways\n` +
        `• <@&1481370040899997772> ── Partnerships\n` +
        `• <@&1481370040899997774> ── Community Events\n\n` +
        
        `📢 **COMMUNITY & ALERTS**\n` +
        `• <@&1490742869735112917> ── Opinion Polls\n` +
        `• <@&1492370167735259196> ── Pin of Shame\n` +
        `• <@&1493276409320443924> ── Dead Chat Revivals\n` +
        `• <@&1481370040899997776> ── Server & Bot Updates\n` +
        `• <@&1497717221584015380> ── Server Bump Pings\n\n` +

        `> 💡 **Tip:** Click once to receive a role, click again to remove it!`
      )
      .setFooter({ 
        text: "DonDon Moderation Systems", 
        iconURL: message.guild.iconURL({ dynamic: true }) 
      })
      .setTimestamp();

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
