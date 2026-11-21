const ticketSystem = require("../ticketSystem.js");

const ALLOWED_TICKET_CATEGORIES = [
  "1481939936964775946", // Support Ticket Category
  "1481938314062725281", // Purchases Category
  "1481937769612968038"  // Claim Category
];

module.exports = {
  name: "add",
  description: "Adds a user to the current ticket channel (staff and ticket support only)",
  async execute(message, args) {
    if (!message.guild || !message.channel) return;

    const inCategory = ALLOWED_TICKET_CATEGORIES.includes(message.channel.parentId);
    const isTracked =
      typeof ticketSystem.isTicketChannel === "function"
        ? ticketSystem.isTicketChannel(message.channel.id)
        : false;

    if (!inCategory && !isTracked) {
      return message.reply("❌ This command can only be used inside a ticket channel.");
    }

    if (
      typeof ticketSystem.canManageTicketMembers === "function" &&
      !ticketSystem.canManageTicketMembers(message.member)
    ) {
      return message.reply("❌ Only staff and ticket support can add users to tickets.");
    }

    const rawTarget = args[0] || "";
    const mentionMatch = rawTarget.match(/^<@!?(\d{17,20})>$/);
    const userId = mentionMatch
      ? mentionMatch[1]
      : message.mentions.users.first()?.id || (/^\d{17,20}$/.test(rawTarget) ? rawTarget : null);

    if (!userId) {
      return message.reply("❌ Usage: `?add @user`");
    }

    const targetMember =
      message.mentions.members.first() ||
      (await message.guild.members.fetch(userId).catch(() => null));

    if (!targetMember) {
      return message.reply("❌ That user isn't in this server.");
    }

    const result = await ticketSystem.addUserToTicket({
      channel: message.channel,
      guild: message.guild,
      targetUser: targetMember.user,
      addedBy: message.author
    });

    if (!result.ok) {
      return message.reply(result.error || "❌ Could not add that user to the ticket.");
    }

    return message.channel.send({
      content: `✅ ${targetMember.user} was added to this ticket by ${message.author}.`,
      allowedMentions: { users: [targetMember.id, message.author.id] }
    });
  }
};
