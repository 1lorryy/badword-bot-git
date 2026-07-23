const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Edits or sends the Ticket Rules embed",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().startsWith("?staffguidedit");

    // Clean up trigger message
    message.delete().catch(() => null);

    // Permission check
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send("❌ **Access Denied:** Administrator permission required.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Build clean Ticket Rules Embed
    const ticketEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🎫 Ticket System Rules & Guidelines")
      .setDescription(
        "📌 **1. Open Correct Topics**\n" +
        "Open tickets only for valid support, purchases, or claiming giveaway wins. Make sure to open the ticket under the correct topic—no casual chat, testing, or troll tickets.\n\n" +
        "📌 **2. No Duplicate or Spam Tickets**\n" +
        "Keep it to one ticket at a time per issue. Spamming or opening multiple tickets for the same reason will result in a ticket ban.\n\n" +
        "📌 **3. Provide Immediate Context**\n" +
        "State your question or details right away in your first message so staff can assist you as efficiently as possible.\n\n" +
        "📌 **4. Do Not Ping Staff**\n" +
        "Our team is notified automatically when a ticket is created. Pinging individual staff members will not get you a faster response.\n\n" +
        "📌 **5. Close When Resolved**\n" +
        "Once your question is answered or issue is fixed, please close your ticket or request staff to close it.\n\n" +
        "📌 **6. Respect & Co-operation**\n" +
        "Treat staff with respect. Rude, aggressive, or non-cooperative behavior will lead to warnings or server removal.\n\n" +
        "⚖️ **7. Staff Authority & Disclaimer**\n" +
        "Staff & Management hold full ownership and ultimate discretion over all ticket disputes, rule interpretations, and moderation actions. All staff decisions are final. Arguing with staff or management in public channels is strictly prohibited."
      );

    // Add server icon thumbnail (or direct Pocoyo thumbnail image)
    if (message.guild.iconURL()) {
      ticketEmbed.setThumbnail(message.guild.iconURL({ dynamic: true }));
    }

    // ==========================================
    // 1. EDIT EXISTING MESSAGE: ?staffguidedit <Message ID or Link>
    // ==========================================
    if (isEdit) {
      if (!args || args.length < 1) {
        return message.channel.send("⚠️ **Usage:** `?staffguidedit <Message ID or Link>`")
          .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      }

      // Extract target ID
      const targetInput = args[0];
      const messageIdMatch = targetInput.match(/\d+$/);
      const targetMessageId = messageIdMatch ? messageIdMatch[0] : null;

      if (!targetMessageId) {
        return message.channel.send("❌ Invalid Message ID or Link provided.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      try {
        const targetMsg = await message.channel.messages.fetch(targetMessageId);

        if (targetMsg.author.id !== message.client.user.id) {
          return message.channel.send("❌ Can only edit messages sent by this bot.")
            .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        }

        await targetMsg.edit({ embeds: [ticketEmbed] });

        return message.channel.send("✅ **Ticket Rules updated successfully!**")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));

      } catch (err) {
        console.error(err);
        return message.channel.send("❌ Could not find or edit that message in this channel.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }
    }

    // ==========================================
    // 2. SEND FRESH TICKET RULES: ?staffguide
    // ==========================================
    return message.channel.send({ embeds: [ticketEmbed] });
  }
};
