const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

const TICKET_CATEGORIES = [
  "1481938314062725281", // Purchases
  "1481937769612968038", // Claims
  "1481939936964775946"  // Support
];

module.exports = {
  name: "close",
  description: "Closes the current ticket channel with an optional reason",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                    message.member.permissions.has(PermissionFlagsBits.ManageMessages);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isStaff && !isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only staff members can close tickets.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const isInTicketCategory = TICKET_CATEGORIES.includes(message.channel.parentId);

    if (!isInTicketCategory && !isAdmin) {
      return message.channel.send("❌ **Restricted:** The `?close` command can only be used inside ticket channels!")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const reason = args.length > 0 ? args.join(" ") : "No reason provided";

    const closeEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🔒 Ticket Closing Sequence Initiated")
      .setDescription(
        `This ticket has been marked for closure by **${message.author.tag}**.\n\n` +
        `> **Reason:** ${reason}\n\n` +
        `⚠️ *This channel will be permanently deleted in **5 seconds**.*`
      )
      .setFooter({ text: "DonDon Moderation • Ticket System" })
      .setTimestamp();

    await message.channel.send({ embeds: [closeEmbed] });

    // Wait 5 seconds to let users/staff read the transcript summary, then delete the channel safely
    setTimeout(async () => {
      try {
        await message.channel.delete(`Ticket closed by ${message.author.tag} - Reason: ${reason}`);
      } catch (err) {
        console.error("Failed to delete ticket channel during close command:", err);
      }
    }, 5000);
  }
};
