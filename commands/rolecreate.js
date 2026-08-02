const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "rolecreate",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ You need **Manage Roles** permission.");
    }

    if (!args.length) {
      return message.reply("Usage: `?rolecreate <Role Name> [Hex Color]`");
    }

    const hexRegex = /^#?([0-9A-F]{6})$/i;
    let color = "#99AAB5"; // Default gray
    let nameArgs = [...args];

    // Check if the user passed multiple hex codes
    const hexMatches = args.filter(arg => hexRegex.test(arg));

    if (hexMatches.length > 1) {
      // Pick the first hex color and warn the user
      color = hexMatches[0].startsWith("#") ? hexMatches[0] : `#${hexMatches[0]}`;
      nameArgs = args.filter(arg => !hexRegex.test(arg));
      
      message.channel.send("⚠️ *Discord only supports one solid hex color per role. Using the first color provided (`" + color + "`).*");
    } else if (hexMatches.length === 1) {
      const lastArg = args[args.length - 1];
      if (hexRegex.test(lastArg)) {
        color = lastArg.startsWith("#") ? lastArg : `#${lastArg}`;
        nameArgs.pop();
      }
    }

    const name = nameArgs.join(" ");
    if (!name) return message.reply("❌ Please provide a valid role name.");

    try {
      const newRole = await message.guild.roles.create({
        name: name,
        color: color,
        reason: `Created by ${message.author.tag}`
      });

      const embed = new EmbedBuilder()
        .setTitle("✅ Role Created")
        .setColor(newRole.color || 0x22c55e)
        .addFields(
          { name: "Role Name", value: `<@&${newRole.id}>`, inline: true },
          { name: "Color", value: `\`${color.toUpperCase()}\``, inline: true }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to create role. Check permissions and hierarchy.");
    }
  }
};
