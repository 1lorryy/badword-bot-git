const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// 1. VIP & Booster Role IDs
const ALLOWED_ROLE_IDS = [
  "1495091140272324768", // ECONOMY
  "1495091152506847311", // PREMIUM ECONOMY
  "1495091157443805234", // BUSINESS
  "1495091161457627206", // FIRST CLASS
  "1481370041382604874", // 2x BOOSTER
  "1482787743527604305"  // BOOSTER
];

// 2. Ticket Category ID
const TICKET_CATEGORY_ID = "1481939936964775946";

module.exports = {
  name: "roleicon",
  description: "Allows VIPs, Boosters, and Staff to set role icons inside ticket category channels",
  async execute(message, args) {
    // Clean up command message to keep chat tidy
    message.delete().catch(() => null);

    // --- CHECK 1: Must be inside the designated Ticket Category or ticket channel ---
    const isTicketChannel = 
      message.channel.parentId === TICKET_CATEGORY_ID ||
      message.channel.name.startsWith("ticket-") || 
      message.channel.name.includes("ticket");

    if (!isTicketChannel) {
      return message.channel.send("⚠️ **Access Restricted:** This command can only be used inside ticket channels.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
    }

    // --- CHECK 2: Staff, VIP, or Booster Role Verification ---
    const isStaff = 
      message.member.permissions.has(PermissionFlagsBits.ManageRoles) ||
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member.roles.cache.some(r => r.name.toLowerCase().includes("staff") || r.name.toLowerCase().includes("mod"));

    const hasVIPOrBoosterRole = message.member.roles.cache.some(role => 
      ALLOWED_ROLE_IDS.includes(role.id)
    );

    if (!isStaff && !hasVIPOrBoosterRole) {
      return message.channel.send("❌ **Access Denied:** Only **Boosters**, **VIP Members** (Economy, Premium Economy, Business, First Class), and **Staff** can use this command.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 7000));
    }

    // --- CHECK 3: Input Validation ---
    // Syntax: ?roleicon @role <Image URL or Attachment>
    const targetRole = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
    const attachment = message.attachments.first();
    const iconUrl = attachment ? attachment.url : args[1];

    if (!targetRole) {
      return message.channel.send("⚠️ **Usage:** `?roleicon @role <Image URL or Attach Image>`")
        .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
    }

    if (!iconUrl || (!iconUrl.startsWith("http://") && !iconUrl.startsWith("https://"))) {
      return message.channel.send("⚠️ Please attach an image file or provide a valid image link.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
    }

    // --- EXECUTE: Set the Role Icon ---
    try {
      await targetRole.setIcon(iconUrl);

      const successEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setDescription(`✅ <@${message.author.id}>: Successfully updated the icon for <@&${targetRole.id}>!`)
        .setThumbnail(iconUrl);

      return message.channel.send({ embeds: [successEmbed] });

    } catch (err) {
      console.error(err);

      if (err.code === 50013) {
        return message.channel.send("❌ **Permission Error:** Make sure the bot's highest role is positioned **above** the target role in Server Settings!")
          .then(m => setTimeout(() => m.delete().catch(() => null), 7000));
      }

      return message.channel.send("❌ Could not set role icon. Note: Server must be **Level 2 Boosted** for role icons, and the file must be under 256KB.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 8000));
    }
  }
};
