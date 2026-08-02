const { PermissionsBitField, EmbedBuilder } = require("discord.js");

module.exports = {
  name: "rolecreate",
  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ You need **Manage Roles** permission.");
    }

    if (!args.length) {
      return message.reply("Usage: `?rolecreate <Name> [HexColor] [--hoist] [--mention]`");
    }

    let hoist = args.includes("--hoist") || args.includes("-h");
    let mentionable = args.includes("--mention") || args.includes("-m");

    // Filter out flag arguments
    let cleanArgs = args.filter(a => !["--hoist", "-h", "--mention", "-m"].includes(a));

    const hexRegex = /^#?([0-9A-F]{6})$/i;
    let color = "#99AAB5";

    if (cleanArgs.length > 0 && hexRegex.test(cleanArgs[cleanArgs.length - 1])) {
      const hex = cleanArgs.pop();
      color = hex.startsWith("#") ? hex : `#${hex}`;
    }

    const name = cleanArgs.join(" ");
    if (!name) return message.reply("❌ Please specify a valid role name.");

    try {
      const newRole = await message.guild.roles.create({
        name: name,
        color: color,
        hoist: hoist,
        mentionable: mentionable,
        reason: `Created by ${message.author.tag}`
      });

      const embed = new EmbedBuilder()
        .setTitle("✨ Role Successfully Created")
        .setColor(newRole.color || 0x5865f2)
        .addFields(
          { name: "Role", value: `<@&${newRole.id}> (\`${newRole.name}\`)`, inline: true },
          { name: "Color", value: `\`${color.toUpperCase()}\``, inline: true },
          { name: "Settings", value: `Displayed Separately: **${hoist ? "Yes" : "No"}**\nMentionable: **${mentionable ? "Yes" : "No"}**`, inline: false }
        )
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to create role. Check permissions or hierarchy.");
    }
  }
};
