const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays or edits the main server rules and punishment system",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().startsWith("?staffguidedit");

    // Clean up trigger message
    message.delete().catch(() => null);

    // Permission check
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send("❌ **Access Denied:** Administrator permission required.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Embed 1: Main Server Rules + Staff Disclaimer
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
        "🔗 https://discord.com/terms\n\n" +
        "⚖️ **Staff Authority & Disclaimer**\n" +
        "Staff & Management hold full ownership and ultimate discretion over all rule interpretations, warnings, mutes, kicks, bans, and server disputes. All staff decisions are final."
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

    // ==========================================
    // 1. EDIT MODE: ?staffguidedit <Message ID or Link>
    // ==========================================
    if (isEdit) {
      if (!args || args.length < 1) {
        return message.channel.send("⚠️ **Usage:** `?staffguidedit <Message ID or Link>`")
          .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      }

      // Extract Target Message ID
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

        await targetMsg.edit({ embeds: [rulesEmbed, punishmentsEmbed] });

        return message.channel.send("✅ **Server rules updated successfully!**")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));

      } catch (err) {
        console.error(err);
        return message.channel.send("❌ Could not find or edit that message in this channel.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }
    }

    // ==========================================
    // 2. SEND FRESH RULES: ?staffguide
    // ==========================================
    return message.channel.send({ embeds: [rulesEmbed, punishmentsEmbed] });
  }
};
