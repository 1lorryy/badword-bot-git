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
      .setTitle("🎫 Ticket Rules & Etiquette")
      .setThumbnail("https://image2url.com/r2/default/images/1775844039536-8fd2df06-6fab-4b6c-92ed-821f8fe176d9.jpg")
      .setDescription(
        "⚡ **1. Valid Reason Only** — Open tickets for support/questions, not casual chat or jokes.\n\n" +
        "⚡ **2. One Ticket at a Time** — Do not spam or create duplicate tickets.\n\n" +
        "⚡ **3. Be Clear** — State your issue right away so staff can help you fast.\n\n" +
        "⚡ **4. Don't Ping Staff** — We see your ticket and will reply as soon as possible.\n\n" +
        "⚡ **5. Be Respectful** — Keep it friendly; toxic behavior won't be tolerated."
      )
      .setImage("https://image2url.com/r2/default/images/1775845711233-eeede801-13ce-4f7c-b0ac-ea6a6d81b638.jpg")
      .setFooter({ text: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊’𝖘 𝖙𝖎𝖈𝖐𝖊𝖙 𝖗𝖚𝖑𝖊𝖘" });

    return message.reply({ embeds: [rulesEmbed] });
  }
};
