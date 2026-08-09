const { PermissionsBitField } = require("discord.js");
const Jimp = require("jimp");

module.exports = {
  name: "roleicon",
  description: "Set a custom role icon using gallery uploads, image URLs, or static/animated emojis from any server.",
  async execute(message, args) {
    // 1. Permission checks
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
      return message.reply("❌ Please specify a valid role.\n**Usage:** `?roleicon @role [upload image/GIF, paste link, or use custom emoji]`");
    }

    // 3. Extract image URL (Gallery upload, URL link, or Custom Emoji)
    let iconUrl = null;

    if (message.attachments.size > 0) {
      // Handles gallery uploads (PNG, JPG, GIF)
      iconUrl = message.attachments.first().url;
    } else if (args[1]) {
      // Matches both static <:name:id> and animated <a:name:id> emojis from ANY server
      const emojiMatch = args[1].match(/<a?:.+?:(\d+)>/);
      if (emojiMatch) {
        const emojiId = emojiMatch[1];
        // Fetch static PNG stream from Discord CDN to prevent HTTP 415 errors
        iconUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png?size=128`;
      } else if (args[1].startsWith("http://") || args[1].startsWith("https://")) {
        iconUrl = args[1];
      }
    }

    if (!iconUrl) {
      return message.reply("❌ No valid image found! Please attach a photo/GIF, paste an image link, or send a custom emoji.");
    }

    const processingMsg = await message.reply("🔄 *Processing media & resizing for role icon...*");

    try {
      let finalBuffer = null;

      // 4. Process image/emoji
      if (iconUrl.includes(".gif") && !iconUrl.includes("cdn.discordapp.com/emojis/")) {
        // Direct fetch for animated GIFs to preserve original structure
        const response = await fetch(iconUrl);
        if (!response.ok) throw new Error(`Failed to fetch GIF (HTTP ${response.status})`);
        const arrayBuffer = await response.arrayBuffer();
        finalBuffer = Buffer.from(arrayBuffer);
      } else {
        // Use Jimp for auto-resizing static images, gallery uploads, and emoji streams
        const image = await Jimp.read(iconUrl);
        image.resize(128, 128);
        finalBuffer = await image.getBufferAsync(Jimp.MIME_PNG);
      }

      // 5. Update the role icon via Discord API
      await role.setIcon(finalBuffer);

      return processingMsg.edit(`✅ Successfully updated the custom role icon for **${role.name}**!`);
    } catch (err) {
      console.error("RoleIcon Execution Error:", err);

      let errorReason = "An unexpected error occurred while processing the image.";

      if (err.code === 50013) {
        errorReason = `Discord rejected the edit because **${role.name}** is positioned higher than or equal to my bot role in Server Settings > Roles.`;
      } else if (err.code === 50001) {
        errorReason = "Server lacks Boost Level 2 features required for custom role icons.";
      } else if (err.code === 50035 || err.message?.includes("256")) {
        errorReason = "Image size exceeds Discord's **256 KB** limit or format is unsupported.";
      }

      return processingMsg.edit(`❌ **Failed to set role icon:** ${errorReason}\n\`\`\`${err.message}\`\`\``);
    }
  }
};
