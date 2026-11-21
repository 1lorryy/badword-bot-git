const { PermissionFlagsBits } = require("discord.js");
const ticketSystem = require("../ticketSystem.js");

const ALLOWED_TICKET_CATEGORIES = [
  "1481939936964775946", // Support Ticket Category
  "1481938314062725281", // Purchases Category
  "1481937769612968038"  // Claim Category
];

const STAFF_ROLE_IDS = [
  "1481370041420087474",
  "1481370041432932379",
  "1481370041441189959"
];

function isTicketStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.roles?.cache) {
    return STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
  }
  return false;
}

module.exports = {
  name: "close",
  description: "Staff-only command to immediately close a ticket, save HTML transcript, and send logs + DM transcript",
  async execute(message, args) {
    if (!message.guild || !message.channel) return;

    if (!isTicketStaff(message.member)) {
      return message.reply("❌ Only staff members can close tickets.");
    }

    const inCategory = ALLOWED_TICKET_CATEGORIES.includes(message.channel.parentId);
    const isTracked = ticketSystem.isTicketChannel(message.channel.id);

    if (!inCategory && !isTracked) {
      return message.reply("❌ This command can only be used inside an active ticket channel.");
    }

    const reason = args.join(" ").trim() || "No reason provided";

    await ticketSystem.closeTicketChannel({
      channel: message.channel,
      guild: message.guild,
      closedBy: message.author,
      reason,
      method: "?close"
    });

    return true;
  }
};
