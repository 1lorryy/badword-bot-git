const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "customcolor",
  description: "Changes the color of a specific role using a hex code",
  async execute(message, args) {
    // Permission check: Manage Roles required
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.channel.send("❌ **Access Denied:** You need `Manage Roles` permission to change role colors.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Usage check: ?customcolor @role #HEXCODE
    if (!args || args.length < 2) {
      return message.channel.send("⚠️ **Usage:** `?customcolor @role #HEXCODE` (e.g. `?customcolor @VIP #FF69B4`)")
        .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
    }

    // Get the target role
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    if (!role) {
      return message.channel.send("❌ Could not find that role. Please mention a valid role or provide a Role ID.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Extract and validate HEX code
    let hexInput = args[1].replace("#", "").trim();
    const isValidHex = /^[0-9A-F]{6}$/i.test(hexInput);

    if (!isValidHex) {
      return message.channel.send("❌ Invalid Hex Color code! Please provide a 6-character hex code (e.g., `#FF69B4` or `FF69B4`).")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const hexColor = `#${hexInput}`;

    try {
      // Update role color
      await role.setColor(hexColor);

      const embed = new EmbedBuilder()
        .setColor(hexColor)
        .setTitle("🎨 Role Color Updated")
        .setDescription(`Successfully changed the color of ${role} to **${hexColor.toUpperCase()}**!`)
        .setFooter({ text: "Don Don Moderation • Role Management" })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });

    } catch (err) {
      console.error(err);
      return message.channel.send("❌ Failed to update role color. Make sure my bot role is higher than the role you are trying to edit!")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }
  }
};
