const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "rules",
  description: "Displays or edits the main server rules",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("rulesedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newGuideText = args.join(" ");
      if (!newGuideText) {
        return message.reply("⚠️ **Usage:** `?rulesedit <new rules info>`");
      }

      return message.reply("✅ **Server rules updated successfully!**");
    }

    // Embed 1: Main Server Rules
    const rulesEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setTitle("📜 SERVER RULES")
      .setDescription(
        "**1.** Respect everyone. No hate speech, bullying, or discrimination of any kind. Keep it chill.\n\n" +
        "**2.** No spamming or flooding chat with messages, images, or emojis. Give people space to breathe.\n\n" +
        "**3.** No NSFW content or discussions. Keep it safe for all ages.\n\n" +
        "**4.** Follow Discord’s Terms of Service everywhere here. No illegal actions or sharing pirated stuff.\n\n" +
        "**5.** No advertising or self-promotion without permission from staff.\n\n" +
        "**6.** Use appropriate channels for topics — no off-topic spam.\n\n" +
        "**7.** Do not ping staff unnecessarily or abuse the ticket system.\n\n" +
        "**8.** English only in main chats to keep things clear.\n\n" +
        "**9.** No sharing others’ personal info or doxxing. Privacy matters.\n\n" +
        "**10.** Listen to mods and respect their decisions. Arguing isn’t allowed in public chat.\n\n" +
        "⚠️ **Don't beg or u will be warned!**\n\n" +
        "🔗 https://discord.com/terms"
      );

    // Embed 2: Punishment System
    const punishmentsEmbed = new EmbedBuilder()
      .setColor(0xE74C3C)
      .setDescription(
        "**verbal warn**\n" +
        "**1st warn** safe\n" +
        "**2nd warn** + 5 minutes mute\n" +
        "**3rd warn** + 30 minutes mute\n" +
        "**4th warn** + 12 hours mute\n" +
        "**5th warn** + kick\n" +
        "**6th warn** + Ban"
      )
      .setFooter({ text: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊’𝖘 𝖘𝖊𝖗𝖛𝖊𝖗 𝖗𝖚𝖑𝖊𝖘" });

    return message.reply({ embeds: [rulesEmbed, punishmentsEmbed] });
  }
};
