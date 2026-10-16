const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays clean ticket system rules and staff operations guidelines",
  async execute(message, args) {
    try {
      await message.delete().catch(() => null);

      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.channel.send("❌ **Access Denied:** Administrator permission required.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      // ================= EMBED 1: COMPACT TICKET RULES =================
      const mainTicketEmbed = new EmbedBuilder()
        .setTitle("🎟️ Ticket System Rules & Guidelines")
        .setColor(0x5865f2)
        .setThumbnail("https://images-ext-1.discordapp.net/external/wPS7rf5NBFu0WJzAa2PkSIwYoFlnWjMi_gvw3NJSGl0/https/images-ext-1.discordapp.net/external/tcZdCAy72cXlwHhPakw8hVCOruRtK27dMtXDOdTsUQM/https/image2url.com/r2/default/images/1775844039536-8fd2df06-6fab-4b6c-92ed-821f8fe176d9.jpg?format=webp&width=1024&height=1024")
        .setDescription("📩 **Open ticket here:** <#1481370042892550220>\n──────────────────────────────")
        .addFields(
          {
            name: "📌 1. Correct Topics",
            value: "Open tickets strictly for support, purchases, or claiming giveaway wins. No casual chat, testing, or troll tickets.",
            inline: true
          },
          {
            name: "📌 2. No Spam / Duplicates",
            value: "Limit yourself to one ticket per issue. Opening duplicate or spam tickets will lead to a ticket ban.",
            inline: true
          },
          {
            name: "📌 3. Provide Details Right Away",
            value: "State your issue or question clearly in your first message so staff can assist you immediately.",
            inline: true
          },
          {
            name: "📌 4. Do Not Ping Staff",
            value: "Our team is notified automatically upon ticket creation. Pinging individual staff members will not speed up support.",
            inline: true
          },
          {
            name: "📌 5. Ticket Closure Policy",
            value: "Only staff members can close tickets. Request staff to close your ticket once your inquiry or trade is complete.",
            inline: true
          },
          {
            name: "⭐ 6. Giveaway Vouch Requirement",
            value: "If your ticket is for claiming a giveaway win, you **MUST** vouch for the host in <#1481374265340072047> upon receiving your prize.",
            inline: true
          },
          {
            name: "📌 7. Respect & Co-operation",
            value: "Treat staff respectfully. Aggressive, rude, or non-cooperative behavior will result in warnings or mutes.",
            inline: false
          }
        );

      // ================= EMBED 2: AUTHORITY & BANNER =================
      const secondaryTicketEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          "⚖️ **8. Staff Authority & Disclaimer**\n" +
          "Staff & Management hold full authority over ticket disputes, rule interpretations, and moderation actions. All decisions are final. Publicly arguing with staff is strictly prohibited."
        )
        .setImage("https://images-ext-1.discordapp.net/external/AWRZ4I24a_2jeeXlhLcjAvdhZ0mtHA5xT3MvknowKPk/https/image2url.com/r2/default/images/1775845711233-eeede801-13ce-4f7c-b0ac-ea6a6d81b638.jpg?format=webp")
        .setFooter({ text: "DonQuixote's Lounge • Support & Ticket Guidelines" })
        .setTimestamp();

      return message.channel.send({ embeds: [mainTicketEmbed, secondaryTicketEmbed] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  }
};
