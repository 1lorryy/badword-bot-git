const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "rolecreate",
  async execute(message, args) {
    // Permission check
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ You need **Manage Roles** permission to use this command.");
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need **Manage Roles** permission to create roles.");
    }

    // Parse command arguments: ?rolecreate <name> [hexColor]
    if (!args.length) {
      return message.reply("Usage: `?rolecreate <Role Name> [Hex Color]`\n*Example:* `?rolecreate VIP #ff0000` or `?rolecreate Moderator`");
    }

    let name = args.join(" ");
    let color = "#99AAB5"; // Default Discord role gray color

    // Check if the last argument is a valid hex color (e.g., #ff0000 or ff0000)
    const possibleHex = args[args.length - 1];
    const hexRegex = /^#?([0-9A-F]{6})$/i;

    if (hexRegex.test(possibleHex)) {
      color = possibleHex.startsWith("#") ? possibleHex : `#${possibleHex}`;
      name = args.slice(0, -1).join(" "); // Remove hex code from name
    }

    if (!name) {
      return message.reply("❌ Please provide a valid role name.");
    }

    try {
      // Create the role
      const newRole = await message.guild.roles.create({
        name: name,
        color: color,
        reason: `Role created by ${message.author.tag} via command`
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Role Created")
        .setColor(newRole.color || 0x22c55e)
        .addFields(
          { name: "Role Name", value: `<@&${newRole.id}> (\`${newRole.name}\`)`, inline: true },
          { name: "Role ID", value: `\`${newRole.id}\``, inline: true },
          { name: "Color", value: `\`${color.toUpperCase()}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Role Create Error:", err);
      return message.reply("❌ Failed to create role. Please check my role hierarchy and permissions.");
    }
  }
};
