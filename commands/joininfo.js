const { EmbedBuilder } = require("discord.js");

// Configuration IDs
const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "joininfo",
  description: "Compact milestone and join analytics card.",
  async execute(message, args) {
    // Staff bypass check
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    // Restrict regular members
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?joininfo\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Target member resolver (@mention, ID, or author)
    let targetMember = message.mentions.members.first();
    
    if (!targetMember && args[0]) {
      // Try resolving by ID safely from cache or direct fetch (no full search)
      const cleanId = args[0].replace(/[^0-9]/g, "");
      if (cleanId) {
        targetMember = await message.guild.members.fetch(cleanId).catch(() => null);
      }
    }
    
    if (!targetMember) targetMember = message.member;

    const user = targetMember.user;
    const guild = message.guild;

    // ✅ FIX: Use cached members instead of requesting thousands of members via gateway
    const sortedMembers = Array.from(guild.members.cache.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    const joinPosition = sortedMembers.findIndex(m => m.id === targetMember.id) + 1 || guild.memberCount;
    const totalCount = guild.memberCount;
    const percentile = Math.max(1, Math.round((joinPosition / totalCount) * 100));

    // Dynamic Milestone Badge
    let badge = "🆕 New";
    if (joinPosition <= 10) badge = "👑 Founder";
    else if (joinPosition <= 50) badge = "🥇 OG Member";
    else if (percentile <= 25) badge = "🥈 Pioneer";
    else if (percentile <= 75) badge = "🥉 Veteran";

    // Compact Progress Bar (5 blocks max)
    const filled = Math.max(1, Math.min(5, Math.ceil((joinPosition / totalCount) * 5)));
    const miniBar = "🟦".repeat(filled - 1) + "📍" + "⬛".repeat(5 - filled);

    // Timestamps & Checks
    const joinedTs = Math.floor(targetMember.joinedTimestamp / 1000);
    const createdTs = Math.floor(user.createdTimestamp / 1000);
    const isNew = (Date.now() - user.createdTimestamp) < (7 * 24 * 60 * 60 * 1000) ? " ⚠️" : "";

    // Ultra-Compact Embed
    const embed = new EmbedBuilder()
      .setColor(targetMember.displayHexColor || "#5865F2")
      .setAuthor({ 
        name: `${user.displayName} (${user.tag})`, 
        iconURL: user.displayAvatarURL({ forceStatic: false }) 
      })
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 64 }))
      .addFields(
        {
          name: "📍 Join Placement",
          value: `• **Rank:** **#${joinPosition}** / \`${totalCount}\`\n• **Tier:** ${badge} (\`Top ${percentile}%\`)\n• **Timeline:** ${miniBar}`,
          inline: true
        },
        {
          name: "⏱️ Timestamps",
          value: `• **Joined:** <t:${joinedTs}:R>\n• **Created:** <t:${createdTs}:R>${isNew}\n• **Booster:** ${targetMember.premiumSince ? "🚀 Yes" : "❌ No"}`,
          inline: true
        }
      )
      .setFooter({ text: `ID: ${user.id} • Donquixote Store` });

    return message.reply({ embeds: [embed] });
  }
};
