const { PermissionsBitField } = require("discord.js");

module.exports = {
  name: "roleicon",
  description: "Set a custom icon for a server role using an image attachment, URL, or emoji.",
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
      return message.reply("❌ Please specify a valid role. Usage: `?roleicon @role [upload image or paste URL]`");
    }

    // 3. Role hierarchy check
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply(`❌ I cannot edit **${role.name}**! Please drag my bot role higher than **${role.name}** in Server Settings > Roles.`);
    }

    // 4. Extract icon URL from attachment, custom emoji, or direct URL
    let iconUrl = null;

    if (message.attachments.size > 0) {
      iconUrl = message.attachments.first().url;
    } else if (args[1]) {
      const emojiMatch = args[1].match(/<a?:.+?:(\d+)>/);
      if (emojiMatch) {
        iconUrl = `https://cdn.discordapp.com/emojis/${emojiMatch[1]}.png`;
      } else if (args[1].startsWith("http://") || args[1].startsWith("https://")) {
        iconUrl = args[1];
      }
    }

    if (!iconUrl) {
      return message.reply("❌ No image found! Please attach an image file directly to your message or provide an image link.");
    }

    // 5. Update role icon
    try {
      await role.setIcon(iconUrl);
      return message.reply(`✅ Successfully set the icon for **${role.name}**!`);
    } catch (err) {
      console.error("RoleIcon Execution Error:", err);
      return message.reply(
        "❌ Failed to set role icon. Please verify that:\n" +
        "1. The image size is under **256 KB**.\n" +
        "2. The file is a valid `.png` or `.jpg` image.\n" +
        "3. The bot's role is positioned above the target role."
      );
    }
  }
};
