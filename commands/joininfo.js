const { EmbedBuilder } = require("discord.js");

const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "joininfo",
  description: "Detailed analytics, real server join placement, and booster stats.",
  async execute(message, args, client, getGuildData) {
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?joininfo\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Temporary loading indicator while fetching the full member directory
    const loadingMsg = await message.reply("⚡ *Fetching server analytics & real placement stats...*");

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

    // Fetch complete server roster for 100% accurate join position
    const allMembers = await guild.members.fetch();
    
    const sortedMembers = Array.from(allMembers.values())
      .filter(m => m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    const joinPosition = sortedMembers.findIndex(m => m.id === targetMember.id) + 1 || guild.memberCount;
    const totalCount = guild.memberCount;
    const percentile = Math.max(1, Math.round((joinPosition / totalCount) * 100));

    // Dynamic Rank Badges based on true rank
    let badge = "⚡ Member";
    if (joinPosition === 1) badge = "👑 Founder / First Join";
    else if (joinPosition <= 10) badge = "👑 Server Elite";
    else if (joinPosition <= 100) badge = "🔥 Top 100 OG";
    else if (percentile <= 10) badge = "💎 Pioneer (Top 10%)";
    else if (percentile <= 35) badge = "⚔️ Veteran";

    // Progress Bar Generation
    const filled = Math.max(1, Math.min(8, Math.ceil((joinPosition / totalCount) * 8)));
    const progressBar = "▰".repeat(filled) + "▱".repeat(8 - filled);

    // Booster Diagnostics
    const isBooster = targetMember.premiumSinceTimestamp !== null;
    let boostInfo = "❌ Not Boosting";
    
    if (isBooster) {
      const boostTs = Math.floor(targetMember.premiumSinceTimestamp / 1000);
      boostInfo = `🚀 Boosting since <t:${boostTs}:R> (<t:${boostTs}:D>)`;
    }

    // Timestamps
    const joinedTs = Math.floor(targetMember.joinedTimestamp / 1000);
    const createdTs = Math.floor(user.createdTimestamp / 1000);

    // Saved Timezone check
    const data = typeof getGuildData === "function" ? getGuildData(guild.id) : {};
    const savedTz = data?.timezones?.[user.id] || "Not Set (`?tz`)";

    // Role Stats
    const roles = targetMember.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position);
    const highestRole = targetMember.roles.highest.id !== guild.id ? targetMember.roles.highest : "None";
    const roleCount = roles.size;

    const embed = new EmbedBuilder()
      .setColor(targetMember.displayHexColor !== "#000000" ? targetMember.displayHexColor : "#2B2D31")
      .setAuthor({ 
        name: `${user.username} • ${badge}`, 
        iconURL: user.displayAvatarURL({ forceStatic: false, size: 256 }) 
      })
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 256 }))
      .addFields(
        {
          name: "📊 Join Placement",
          value: `▸ **Rank:** \`#${joinPosition}\` of \`${totalCount}\` members\n▸ **Percentile:** \`Top ${percentile}%\`\n▸ **Scale:** \`${progressBar}\``,
          inline: false
        },
        {
          name: "🚀 Server Boost Status",
          value: `▸ ${boostInfo}`,
          inline: false
        },
        {
          name: "📅 Timeline & Timezone",
          value: `▸ **Joined Server:** <t:${joinedTs}:F> (<t:${joinedTs}:R>)\n▸ **Account Created:** <t:${createdTs}:F> (<t:${createdTs}:R>)\n▸ **Timezone:** \`${savedTz}\``,
          inline: false
        },
        {
          name: "🛡️ Member Details",
          value: `▸ **Highest Role:** ${highestRole}\n▸ **Total Roles:** \`${roleCount}\` roles\n▸ **Bot Account:** \`${user.bot ? "Yes" : "No"}\``,
          inline: false
        }
      )
      .setFooter({ text: `${guild.name} • User ID: ${user.id}` })
      .setTimestamp();

    return loadingMsg.edit({ content: null, embeds: [embed] });
  }
};
