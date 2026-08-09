const { PermissionsBitField } = require("discord.js");
const Jimp = require("jimp");

module.exports = {
  name: "roleicon",
  description: "Set a custom icon for a server role with automatic image resizing.",
  async execute(message, args) {
    // 1. Check user and bot permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ You need the **Manage Roles** permission to use this command.");
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I am missing the **Manage Roles** permission in this server.");
    }

    // 2. Identify target role
    const role = message.mentions.roles.first() || 
                 message.guild.roles.cache.get(args[0]) || 
                 message.guild.roles.cache.find(r => r.name.toLowerCase() === args[0]?.toLowerCase());

    if (!role) {
      return message.reply("❌ Please specify a valid role.\n**Usage:** `?roleicon @role [upload image or paste URL]`");
    }

    // 3. Verify role hierarchy
    const botHighestRole = message.guild.members.me.roles.highest;
    if (role.position >= botHighestRole.position) {
      return message.reply(
        `❌ **Role Hierarchy Error:** My highest role (\`${botHighestRole.name}\`) is placed lower than or equal to **${role.name}**.\n` +
        `▸ **Fix:** Go to **Server Settings > Roles** and drag my bot's role above **${role.name}**.`
      );
    }

    // 4. Extract image source (Attachment, Custom Emoji, or URL)
    let iconUrl = null;

    if (message.attachments.size > 0) {
      iconUrl = message.attachments.first().url;
    } else if (args[1]) {
      const emojiMatch = args[1].match(/<(a)?:.+?:(\d+)>/);
      if (emojiMatch) {
        const isAnimated = Boolean(emojiMatch[1]);
        const emojiId = emojiMatch[2];
        iconUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${isAnimated ? "gif" : "png"}`;
      } else if (args[1].startsWith("http://") || args[1].startsWith("https://")) {
        iconUrl = args[1];
      }
    }

    if (!iconUrl) {
      return message.reply("❌ No valid image found! Please attach an image file directly to your message or provide an image link.");
    }

    const processingMsg = await message.reply("🔄 *Processing image & auto-resizing to 128x128 for Discord...*");

    try {
      // 5. Download and process image with Jimp
      const image = await Jimp.read(iconUrl);

      // Auto-resize to standard 128x128 role icon dimensions
      image.resize(128, 128);

      // Export as compressed PNG Buffer
      const resizedBuffer = await image.getBufferAsync(Jimp.MIME_PNG);

      // 6. Set the role icon
      await role.setIcon(resizedBuffer);

      return processingMsg.edit(`✅ Successfully auto-resized and updated the custom role icon for **${role.name}**!`);
    } catch (err) {
      console.error("RoleIcon Execution Error:", err);

      let errorReason = "An unexpected error occurred while setting the role icon.";

      if (err.code === 50013) {
        errorReason = "Bot lacks permission or role hierarchy position to edit this role.";
      } else if (err.code === 50001) {
        errorReason = "Server lacks Boost Level 2 features required for custom role icons.";
      } else if (err.code === 50035 || err.message?.includes("256")) {
        errorReason = "Image size or format is unsupported by Discord.";
      }

      return processingMsg.edit(`❌ **Failed to set role icon:** ${errorReason}\n\`\`\`${err.message}\`\`\``);
    }
  }
};
