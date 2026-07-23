const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays or edits the staff guide",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("staffguidedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newGuideText = args.join(" ");
      if (!newGuideText) {
        return message.reply("⚠️ **Usage:** `?staffguidedit <new guide info>`");
      }

      return message.reply("✅ **Staff guide updated successfully!**");
    }

    const guideEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setThumbnail("https://image2url.com/r2/default/images/1775844039536-8fd2df06-6fab-4b6c-92ed-821f8fe176d9.jpg") // Top-right corner (Thinking Pocoyo)
      .setDescription(
        "🎁 **CLAIM**\n" +
        "➔ GWS, Drops, Giveaways & Rewards\n\n" +
        "🎟️ **SUPPORT**\n" +
        "➔ Questions, Booster Perks (<#1492180619474767892>), Help & Reports\n\n" +
        "🛒 **PURCHASE**\n" +
        "➔ Interested in buying from <#1508167190149333155> or <#1481373711675162890>\n\n" +
        "⚠️ **NO UNNECESSARY TICKETS**\n" +
        "➔ Unnecessary or troll tickets may result in a warning.\n" +
        "➔ Read rules in <#1481370042892550221>."
      )
      .setImage("https://image2url.com/r2/default/images/1775845711233-eeede801-13ce-4f7c-b0ac-ea6a6d81b638.jpg"); // Main image at bottom (Finger Pocoyo)

    return message.reply({ embeds: [guideEmbed] });
  }
};
