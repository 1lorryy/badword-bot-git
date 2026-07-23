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
      .setDescription(
        "🎁 **CLAIM**\n" +
        "➔ GWS, Drops, Giveaways & Rewards\n\n\n" +
        "🎟️ **SUPPORT**\n" +
        "➔ Questions, Booster Perks (<#1492180619474767892>), Help & Reports\n\n\n" +
        "🛒 **PURCHASE**\n" +
        "➔ Interested in buying from <#1508167190149333155> or <#1481373711675162890>\n\n\n" +
        "⚠️ **NO UNNECESSARY TICKETS**\n" +
        "➔ Unnecessary or troll tickets may result in a warning."
      );

    return message.reply({ embeds: [guideEmbed] });
  }
};
