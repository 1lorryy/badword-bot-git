const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "roleicon",
  description: "Set or change a role icon from anywhere in the server.",
  async execute(message, args) {
    // 1. Permission check (Requires Manage Roles)
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply("❌ You need **Manage Roles** permission to use this command.");
    }

    // 2. Check if the bot has permission
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need **Manage Roles** permission to change role icons.");
    }

    // 3. Find the target role
    const roleMention = message.mentions.roles.first();
    const roleIdOrName = args[0];

    if (!roleMention && !roleIdOrName) {
      return message.reply("Usage: `?roleicon @role <Image URL or Attachment>`");
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

    // Check role hierarchy
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }

    // 4. Get the image URL from attachment or argument
    let iconUrl = message.attachments.first()?.url || args[1];

    if (!iconUrl) {
      return message.reply("❌ Please provide an image URL or attach an image.");
    }

    // 5. Update the role icon
    try {
      await role.setIcon(iconUrl);

      const embed = new EmbedBuilder()
        .setTitle("🎨 Role Icon Updated")
        .setColor(role.color || 0x5865f2)
        .setDescription(`Successfully set the icon for **${role.name}**!`)
        .setThumbnail(iconUrl)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Roleicon Error:", err);
      return message.reply(
        "❌ Failed to set role icon. Make sure the server has enough **Boost Level** (Level 2+ required for role icons) and the link is a valid image!"
      );
    }
  },
};
