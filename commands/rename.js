const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Allowed Ticket Category IDs
const TICKET_CATEGORIES = [
  "1481938314062725281", // Purchases
  "1481937769612968038", // Claims
  "1481939936964775946"  // Support
];

module.exports = {
  name: "rename",
  description: "Renames the current ticket channel",
  async execute(message, args) {
    // 1. Check permissions (Staff / Admins)
    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                    message.member.permissions.has(PermissionFlagsBits.ManageMessages);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isStaff) {
      return message.reply("❌ **Access Denied:** Only staff members can use this command.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // 2. Check if channel is inside a Ticket Category (Admins bypass this restriction)
    const isInTicketCategory = TICKET_CATEGORIES.includes(message.channel.parentId);

    if (!isInTicketCategory && !isAdmin) {
      return message.reply("❌ **Restricted:** The `?rename` command can only be used inside ticket channels!")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // 3. Syntax check
    if (!args || args.length === 0) {
      const syntaxEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(
          "⚠️ **The syntax of this command is incorrect!**\n\n" +
          "Please use the syntax: `?rename <new-name>`\n" +
          "**Example:** `?rename ticket-1`"
        );

      return message.reply({ embeds: [syntaxEmbed] });
    }

    // 4. Format channel name
    const newName = args.join("-").toLowerCase().replace(/[^a-z0-9\-_]/g, "");

    if (newName.length < 1 || newName.length > 100) {
      return message.reply("❌ Channel names must be between 1 and 100 characters.");
    }

    // 5. Execute Rename
    try {
      const oldName = message.channel.name;
      await message.channel.setName(newName);

      const successEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ Channel renamed from **#${oldName}** to **#${newName}**!`);

      return message.channel.send({ embeds: [successEmbed] });
    } catch (error) {
      console.error(error);
      return message.reply("❌ Failed to rename the channel. (Note: Discord limits channel renames to 2 times per 10 minutes per channel!).");
    }
  }
};
