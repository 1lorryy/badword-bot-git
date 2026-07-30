const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Set allowed role IDs here so buyers can also use the command
const ALLOWED_BUYER_ROLE_IDS = [
  "1481370041441189959", // Replace with your First Class Role ID
  "1481370041432932379", // Replace with your Business Class Role ID
  "1481370041420087474", // Replace with your Premium Class Role ID
  "1492630307650666546"  // Replace with your Economy Class Role ID
];

/**
 * Helper to parse custom Discord emojis (<:name:id> or <a:name:id>) into CDN URLs
 */
function parseEmojiToUrl(input) {
  if (!input) return null;
  
  // Custom Emoji Regex: <:emoji_name:123456789012345678> or animated <a:emoji_name:123456789012345678>
  const customEmojiMatch = input.match(/<a?:(\w+):(\d+)>/);
  if (customEmojiMatch) {
    const isAnimated = input.startsWith("<a:");
    const emojiId = customEmojiMatch[2];
    const extension = isAnimated ? "gif" : "png";
    return `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=128&quality=lossless`;
  }

  // If it's already an HTTP/HTTPS image link
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  return null;
}

module.exports = {
  name: "roleicon",
  description: "Set or change a role icon using an image, URL, or custom emoji.",
  async execute(message, args) {
    // 1. Permission Check: Admin/Manage Roles OR holding an allowed buyer role
    const isStaff =
      message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
      message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    const hasBuyerRole = message.member.roles.cache.some((role) =>
      ALLOWED_BUYER_ROLE_IDS.includes(role.id)
    );

    if (!isStaff && !hasBuyerRole) {
      return message.reply("❌ You do not have permission to use `?roleicon`!");
    }

    // 2. Bot Permission Check
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need **Manage Roles** permission to change role icons.");
    }

    // 3. Find Target Role
    const roleMention = message.mentions.roles.first();
    const roleIdOrName = args[0];

    if (!roleMention && !roleIdOrName) {
      return message.reply("Usage: `?roleicon @role <Image / URL / Custom Emoji>`");
    }

    const role =
      roleMention ||
      message.guild.roles.cache.get(roleIdOrName) ||
      message.guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleIdOrName.toLowerCase()
      );

    if (!role) {
      return message.reply("❌ Could not find that role.");
    }

    // Role Hierarchy Safeguard
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }

    // 4. Extract Icon Source (Attachment, Custom Emoji, or URL)
    const rawInput = args[1];
    let iconUrl = message.attachments.first()?.url || parseEmojiToUrl(rawInput);

    if (!iconUrl) {
      return message.reply(
        "❌ Please provide a valid **Image URL**, attach an **Image**, or send a **Custom Emoji** (`<:emoji:id>`)!"
      );
    }

    // 5. Apply Icon to Role
    try {
      await role.setIcon(iconUrl);

      const embed = new EmbedBuilder()
        .setTitle("🎨 Role Icon Updated")
        .setColor(role.color || 0x5865f2)
        .setDescription(`Successfully updated icon for **${role.name}**!`)
        .setThumbnail(iconUrl)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Roleicon Error:", err);
      return message.reply(
        "❌ Failed to set role icon. Make sure the server has **Boost Level 2+** unlocked for role icons, and that the link/emoji is valid!"
      );
    }
  },
};
