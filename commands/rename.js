const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const TICKET_CATEGORIES = [
  "1481938314062725281", // Purchases
  "1481937769612968038", // Claims
  "1481939936964775946"  // Support
];

module.exports = {
  name: "rename",
  description: "Renames the current ticket channel",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                    message.member.permissions.has(PermissionFlagsBits.ManageMessages);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isStaff && !isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only staff members can use this command.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const isInTicketCategory = TICKET_CATEGORIES.includes(message.channel.parentId);

    if (!isInTicketCategory && !isAdmin) {
      return message.channel.send("❌ **Restricted:** The `?rename` command can only be used inside ticket channels!")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const currentPrefix = prefix || "?";
    if (!args || args.length === 0) {
      const syntaxEmbed = new EmbedBuilder()
        .setColor(0xED4245)
        .setDescription(
          "⚠️ **The syntax of this command is incorrect!**\n\n" +
          `Please use the syntax: \`${currentPrefix}rename <new-name>\`\n` +
          `**Example:** \`${currentPrefix}rename ticket-1\``
        );

      return message.channel.send({ embeds: [syntaxEmbed] })
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const newName = args.join("-").toLowerCase().replace(/[^a-z0-9\-_]/g, "");

    if (newName.length < 1 || newName.length > 100) {
      return message.channel.send("❌ Channel names must be between 1 and 100 characters.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    try {
      const oldName = message.channel.name;
      await message.channel.setName(newName);

      const successEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ Channel renamed from **#${oldName}** to **#${newName}**!`);

      return message.channel.send({ embeds: [successEmbed] })
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));

    } catch (error) {
      console.error(error);
      return message.channel.send("❌ Failed to rename the channel. (Note: Discord limits channel renames to 2 times per 10 minutes per channel!).")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }
  }
};
