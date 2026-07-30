const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Allowed Role IDs (VIPs, Boosters, Staff) who can create/manage their own role icons
const ALLOWED_ROLE_IDS = [
  "1481370041420087474", // Staff Role ID
  "1481370041432932379", // Mod Role ID
  "1481370041441189959"  // Main Admin Role ID
];

// Specific Allowed Channels
const ALLOWED_CHANNEL_IDS = [
  "1499888577738309633", // Tuff Channel
  "1481370050597228656"  // Staff Cmd Channel
];

// ID of your Staff Ticket Category (Replace with your actual Ticket Category ID if different)
const TICKET_CATEGORY_ID = "1481370050597228656"; 

module.exports = {
  name: "roleicon",
  description: "Create or update your personal role icon using an emoji or image link.",
  async execute(message, args) {
    // 🧹 Delete original command message immediately
    if (message.deletable) {
      message.delete().catch(() => null);
    }

    // Check if channel is allowed (Either in list OR inside ticket category)
    const isInAllowedChannel = ALLOWED_CHANNEL_IDS.includes(message.channel.id);
    const isInTicketCategory = message.channel.parentId === TICKET_CATEGORY_ID;

    if (!isInAllowedChannel && !isInTicketCategory) {
      const msg = await message.reply("❌ You can only use this command inside staff tickets, staff-cmd, or tuff-channel.");
      setTimeout(() => msg.delete().catch(() => null), 5000);
      return;
    }

    // Check if the user has an allowed role or admin perms
    const hasAccess = message.member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id)) ||
                      message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasAccess) {
      const msg = await message.reply("❌ You do not have permission to use personal role icons.");
      setTimeout(() => msg.delete().catch(() => null), 5000);
      return;
    }

    // Check bot hierarchy permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      const msg = await message.reply("❌ I need **Manage Roles** permissions to execute this.");
      setTimeout(() => msg.delete().catch(() => null), 5000);
      return;
    }

    // Check level 2 boost requirement for role icons
    if (message.guild.premiumTier < 2) {
      const msg = await message.reply("❌ This server needs **Server Boost Level 2** to set role icons/emojis.");
      setTimeout(() => msg.delete().catch(() => null), 5000);
      return;
    }

    // Parse input (Emoji, URL, or Attachment)
    let iconInput = args[0];
    if (message.attachments.size > 0) {
      iconInput = message.attachments.first().url;
    }

    if (!iconInput) {
      const msg = await message.reply("❌ Please provide a standard emoji, custom emoji, image URL, or image attachment!");
      setTimeout(() => msg.delete().catch(() => null), 5000);
      return;
    }

    // Find existing personal role or create a new one
    const personalRoleName = `🎨 ${message.author.username}`;
    let userRole = message.member.roles.cache.find(r => r.name === personalRoleName);

    try {
      if (!userRole) {
        userRole = await message.guild.roles.create({
          name: personalRoleName,
          reason: `Personal VIP/Staff role for ${message.author.tag}`
        });
        await message.member.roles.add(userRole);
      }

      // Extract custom emoji ID or Unicode emoji
      const customEmojiMatch = iconInput.match(/<a?:(\w+):(\d+)>/);
      
      if (customEmojiMatch) {
        const emojiId = customEmojiMatch[2];
        const isAnimated = iconInput.startsWith("<a:");
        const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? "gif" : "png"}`;
        await userRole.setIcon(emojiUrl);
      } else if (/^https?:\/\/.+/i.test(iconInput)) {
        await userRole.setIcon(iconInput);
      } else {
        await userRole.setUnicodeEmoji(iconInput);
      }

      const embed = new EmbedBuilder()
        .setTitle("✅ Personal Role Icon Updated")
        .setColor(userRole.color || 0x22c55e)
        .setDescription(`Updated personal role **${userRole.name}** icon to: ${iconInput}`)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();

      const successMsg = await message.channel.send({ embeds: [embed] });
      setTimeout(() => successMsg.delete().catch(() => null), 8000);

    } catch (err) {
      console.error("RoleIcon Error:", err);
      const msg = await message.reply("❌ Failed to update role icon. Ensure my bot's top role has **Manage Messages** & is placed above user roles!");
      setTimeout(() => msg.delete().catch(() => null), 5000);
    }
  }
};
