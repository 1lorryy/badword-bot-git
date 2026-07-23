const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ticketrules",
  description: "Displays or edits the ticket rules",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("ticketrulesedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newRulesText = args.join(" ");
      if (!newRulesText) {
        return message.reply("⚠️ **Usage:** `?ticketrulesedit <new rules info>`");
      }

      return message.reply("✅ **Ticket rules updated successfully!**");
    }

    const rulesEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🎫 Ticket System Rules & Guidelines")
      .setThumbnail("https://image2url.com/r2/default/images/1775844039536-8fd2df06-6fab-4b6c-92ed-821f8fe176d9.jpg")
      .setDescription(
        "📍 **Open Tickets Here:** <#1481370042892550220>\n\n" +
        "📌 **1. Use the Right Category**\n" +
        "Only open tickets for valid support, questions, concerns, or claiming giveaway wins. Make sure to open the ticket under the correct topic—no casual chat, testing, or troll tickets.\n\n" +
        "📌 **2. No Duplicate or Spam Tickets**\n" +
        "Keep it to one ticket at a time per issue. Spamming or opening multiple tickets for the same reason will result in a ticket ban.\n\n" +
        "📌 **3. Provide Immediate Context**\n" +
        "State your question or details right away in your first message so staff can assist you as efficiently as possible.\n\n" +
        "📌 **4. Do Not Ping Staff**\n" +
        "Our team is notified automatically when a ticket is created. Pinging individual staff members will not get you a faster response.\n\n" +
        "📌 **5. Close When Resolved**\n" +
        "Once your question is answered or issue is fixed, please close your ticket or request staff to close it.\n\n" +
        "📌 **6. Respect & Co-operation**\n" +
        "Treat staff with respect. Rude, aggressive, or non-cooperative behavior will lead to warnings or server removal."
      )
      .setImage("https://image2url.com/r2/default/images/1775845711233-eeede801-13ce-4f7c-b0ac-ea6a6d81b638.jpg")
      .setFooter({ text: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊’𝖘 𝖙𝖎𝖈𝖐𝖊𝖙 𝖗𝖚𝖑𝖊𝖘" });

    return message.reply({ embeds: [rulesEmbed] });
  }
};
