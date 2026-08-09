const { EmbedBuilder } = require("discord.js");

const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "joininfo",
  description: "Compact milestone and join analytics card.",
  async execute(message, args, client, getGuildData) {
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?joininfo\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    let targetMember = message.mentions.members.first();
    
    if (!targetMember && args[0]) {
      const cleanId = args[0].replace(/[^0-9]/g, "");
      if (cleanId) {
        targetMember = await message.guild.members.fetch(cleanId).catch(() => null);
      }
    }
    
    if (!targetMember) targetMember = message.member;

    const user = targetMember.user;
    const guild = message.guild;

    const sortedMembers = Array.from(guild.members.cache.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    const joinPosition = sortedMembers.findIndex(m => m.id === targetMember.id) + 1 || guild.memberCount;
    const totalCount = guild.memberCount;
    const percentile = Math.max(1, Math.round((joinPosition / totalCount) * 100));

    let badge = "⚡ Member";
    if (joinPosition <= 10) badge = "👑 Founder";
    else if (joinPosition <= 50) badge = "🔥 OG";
    else if (percentile <= 25) badge = "💎 Pioneer";
    else if (percentile <= 75) badge = "⚔️ Veteran";

    // Sleek minimal progress meter
    const filled = Math.max(1, Math.min(5, Math.ceil((joinPosition / totalCount) * 5)));
    const miniBar = "▰".repeat(filled) + "▱".repeat(5 - filled);

    const joinedTs = Math.floor(targetMember.joinedTimestamp / 1000);
    const createdTs = Math.floor(user.createdTimestamp / 1000);
    const isNew = (Date.now() - user.createdTimestamp) < (7 * 24 * 60 * 60 * 1000) ? " ⚠️" : "";

    const data = getGuildData ? getGuildData(guild.id) : {};
    const savedTz = data?.timezones?.[user.id] || "Not Set (`?tz`)";

    const embed = new EmbedBuilder()
      .setColor("#2B2D31")
      .setAuthor({ 
        name: `${user.displayName} • ${badge}`, 
        iconURL: user.displayAvatarURL({ forceStatic: false }) 
      })
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 64 }))
      .setDescription(
        `▸ **Placement:** \`#${joinPosition}\` / \`${totalCount}\` (\`Top ${percentile}%\`)\n` +
        `▸ **Timeline:** \`${miniBar}\` | **TZ:** \`${savedTz}\`\n` +
        `▸ **Joined:** <t:${joinedTs}:R>\n` +
        `▸ **Created:** <t:${createdTs}:R>${isNew}`
      )
      .setFooter({ text: `DonQuixotes Lounge • ID: ${user.id}` });

    return message.reply({ embeds: [embed] });
  }
};
