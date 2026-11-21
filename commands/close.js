const ticketSystem = require("../ticketSystem.js");

const ALLOWED_TICKET_CATEGORIES = [
  "1481939936964775946", // Support Ticket Category
  "1481938314062725281", // Purchases Category
  "1481937769612968038"  // Claim Category
];

module.exports = {
  name: "close",
  description: "Immediately closes a ticket, saves transcript, and sends log + transcript to logs channel and user DMs",
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

    const reason = args.join(" ").trim() || "No reason provided";

    if (typeof ticketSystem.closeTicketChannel === "function") {
      await ticketSystem.closeTicketChannel({
        channel: message.channel,
        guild: message.guild,
        closedBy: message.author,
        reason,
        method: "?close"
      });
      return true;
    }

    return message.reply("❌ `closeTicketChannel` is not exported from `ticketSystem.js` yet.");
  }
};
