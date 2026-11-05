const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require("discord.js");

// Configuration: Role mappings
const ROLES = [
  // Row 1: Giveaways & Events
  { id: "1481370041260966065", label: "Giveaway Ping", emoji: "🎁", style: ButtonStyle.Primary },
  { id: "1481370040899997773", label: "Quickdrops", emoji: "⚡", style: ButtonStyle.Primary },
  { id: "1481370041260966063", label: "Sponsored GW", emoji: "🎉", style: ButtonStyle.Primary },
  { id: "1481370040899997772", label: "Partnerships", emoji: "🤝", style: ButtonStyle.Primary },
  { id: "1481370040899997774", label: "Events Ping", emoji: "📣", style: ButtonStyle.Primary },

  // Row 2: Community & Alerts
  { id: "1490742869735112917", label: "Polls Ping", emoji: "📊", style: ButtonStyle.Secondary },
  { id: "1492370167735259196", label: "Pin of Shame", emoji: "📌", style: ButtonStyle.Secondary },
  { id: "1493276409320443924", label: "Dead Chat", emoji: "💀", style: ButtonStyle.Secondary },
  { id: "1481370040899997766", label: "Server Updates", emoji: "📢", style: ButtonStyle.Success },
  { id: "1497717221584015380", label: "Bump Ping", emoji: "🔔", style: ButtonStyle.Success }
];

module.exports = {
  name: "reactionroles",
  description: "Posts the advanced button reaction roles panel",
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
        name: `${message.guild.name} • Role Selection Hub`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
      .setTitle("🔔  SELF-ASSIGNABLE NOTIFICATION ROLES")
      .setDescription(
        `*Customize your server experience! Choose which announcements and ping alerts you want to receive by interacting with the buttons below.*\n\n` +

        `🏆 **│ GIVEAWAY & EVENT ALERTS**\n` +
        `• <@&1481370041260966065> ── *Official server giveaways*\n` +
        `• <@&1481370040899997773> ── *Fast-paced drop events*\n` +
        `• <@&1481370041260966063> ── *Promotional giveaways*\n` +
        `• <@&1481370040899997772> ── *Partner announcements*\n` +
        `• <@&1481370040899997774> ── *Community events & games*\n\n` +
        
        `📢 **│ COMMUNITY & SERVER NOTIFICATIONS**\n` +
        `• <@&1490742869735112917> ── *Community opinion polls*\n` +
        `• <@&1492370167735259196> ── *Hall of fame & shame pins*\n` +
        `• <@&1493276409320443924> ── *Chat revival alerts*\n` +
        `• <@&1481370040899997766> ── *Major bot & server updates*\n` +
        `• <@&1497717221584015380> ── *Server bump reminders*\n\n` +

        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `💡 **HOW IT WORKS:**\n` +
        `> Click a button once to **receive** the role.\n` +
        `> Click the same button again to **remove** it. All changes are instant!`
      )
      .setFooter({ 
        text: "DonDon Moderation Systems • Interactive Reaction Roles", 
        iconURL: message.guild.iconURL({ dynamic: true }) 
      })
      .setTimestamp();

    // Create Action Rows for Buttons (5 buttons max per row)
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
