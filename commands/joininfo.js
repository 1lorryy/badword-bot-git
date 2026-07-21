const { EmbedBuilder } = require("discord.js");

// Configuration IDs
const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

module.exports = {
  name: "userinfo",
  description: "Displays compact, useful profile and server info for a member.",
  async execute(message, args) {
    // Staff bypass check
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");
    
    // Restrict regular members to the bot-commands channel
    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?userinfo\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Target mentioned member, member by ID, or fallback to author
    let targetMember = message.mentions.members.first();
    if (!targetMember && args[0]) {
      targetMember = await message.guild.members.fetch(args[0]).catch(() => null);
    }
    if (!targetMember) targetMember = message.member;

    const user = targetMember.user;

    // Calculate Join Position
    const allMembers = await message.guild.members.fetch();
    const sorted = [...allMembers.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    const joinPosition = sorted.findIndex(m => m.id === targetMember.id) + 1;

    // Account Age Check (Flag accounts newer than 7 days)
    const accountAgeDays = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));
    const isNewAccount = accountAgeDays < 7 ? " ⚠️ **(New)**" : "";

    // Roles (excluding @everyone, max 5 shown for clean layout)
    const roles = targetMember.roles.cache
      .filter(r => r.id !== message.guild.id)
      .map(r => r.toString());
    const rolesDisplay = roles.length > 0 
      ? (roles.length > 5 ? `${roles.slice(0, 5).join(", ")} + ${roles.length - 5} more` : roles.join(", "))
      : "None";

    // Format timestamps
    const joinedTs = Math.floor(targetMember.joinedTimestamp / 1000);
    const createdTs = Math.floor(user.createdTimestamp / 1000);

    const embed = new EmbedBuilder()
      .setColor(targetMember.displayHexColor || "#5865F2")
      .setAuthor({ 
        name: `${user.tag} (${targetMember.displayName})`, 
        iconURL: user.displayAvatarURL({ forceStatic: false }) 
      })
      .setThumbnail(user.displayAvatarURL({ forceStatic: false, size: 128 }))
      .addFields(
        {
          name: "👤 Overview",
          value: `• **Mention:** <@${user.id}>\n• **Join Rank:** Member **#${joinPosition}**\n• **Highest Role:** ${targetMember.roles.highest}`,
          inline: true
        },
        {
          name: "📅 Dates",
          value: `• **Joined:** <t:${joinedTs}:R>\n• **Created:** <t:${createdTs}:R>${isNewAccount}`,
          inline: true
        },
        {
          name: `🛡️ Roles [${roles.length}]`,
          value: rolesDisplay,
          inline: false
        }
      )
      .setFooter({ text: `ID: ${user.id}` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
