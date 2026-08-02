const { EmbedBuilder, PermissionsBitField } = require("discord.js");

module.exports = {
  name: "rolecreate",
  description: "Create a new role in the server",
  async execute(message, args) {
    // 1. Permission Check
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return message.reply("❌ You need **Manage Roles** permission to use `?rolecreate`!");
    }

    // 2. Bot Permission Check
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need **Manage Roles** permission to create roles.");
    }

    if (!args[0]) {
      return message.reply("Usage: `?rolecreate [role_name] [optional_hex_color]`\nExample: `?rolecreate VIP #ff007f`");
    }

    // 3. Extract Role Name and Color
    let color = "#99AAB5"; // Default Discord role color
    let roleName = args.join(" ");

    // Check if the last argument is a valid hex color (e.g. #ff0000 or ff0000)
    const lastArg = args[args.length - 1];
    const hexColorRegex = /^#?([0-9A-F]{6})$/i;

    if (args.length > 1 && hexColorRegex.test(lastArg)) {
      color = lastArg.startsWith("#") ? lastArg : `#${lastArg}`;
      roleName = args.slice(0, -1).join(" "); // Remove color hex from role name
    }

    // 4. Create Role
    try {
      const createdRole = await message.guild.roles.create({
        name: roleName,
        color: color,
        reason: `Created via ?rolecreate command by ${message.author.tag}`
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Role Created")
        .setColor(createdRole.color || 0x5865f2)
        .setDescription(`Successfully created role **${createdRole.name}**!`)
        .addFields(
          { name: "Role Mention", value: `<@&${createdRole.id}>`, inline: true },
          { name: "Role ID", value: `\`${createdRole.id}\``, inline: true },
          { name: "Color", value: `\`${color}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error("Rolecreate Error:", err);
      return message.reply("❌ Failed to create role. Please check my permissions and role hierarchy.");
    }
  }
};
