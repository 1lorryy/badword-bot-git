const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays clean giveaway and server operations guidelines",
  async execute(message, args) {
    try {
      await message.delete().catch(() => null);

      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.channel.send("❌ **Access Denied:** Administrator permission required.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      const guideEmbed = new EmbedBuilder()
        .setTitle("🎉 DonQuixote's Lounge • Giveaway Rules")
        .setColor(0x5865F2)
        .setDescription(
          `★ **Always** read requirements before joining any giveaways[cite: 7].\n` +
          `★ **Failing** to fulfill requirements leads to a <@&1481370041260966067> and further punishments[cite: 7].\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
        )
        .addFields(
          {
            name: "🚨 Giveaway Ban Policy (<@&1481370041260966067>)",
            value:
              `• **Offenses:** Spamming, message farming, or faking requirements = **2-Day Giveaway Ban**[cite: 7].\n` +
              `• **Message Farming:** Typing 3+ low-effort messages (e.g., *"hi"*, *"hello"*, *"hru"*) will trigger a ban and future punishments[cite: 7].`
          },
          {
            name: "⚡ Quick Drops Rules",
            value:
              `• **Rerolls:** Quick drops are rerolled **4 times**. If unclaimed, they are **voided**[cite: 7].\n` +
              `• **Host Authority:** The hoster has the final decision on whether a claim was valid[cite: 7].\n` +
              `• **Fulfillment:** Gamepasses must be sent within **24 hours**[cite: 7].\n` +
              `⚠️ *Booster claim times do not apply to Quick Drops[cite: 7].*`
          },
          {
            name: "⏳ Claim Times & Booster Multipliers",
            value:
              `• **Quick Drops:** Ranges from **30 seconds to 5 minutes**[cite: 7].\n` +
              `• **Standard Giveaways:** Default is **30 minutes** (unless specified by hoster)[cite: 7].\n` +
              `• **Booster (<@&1482787743527604305>):** **2x Claim Time**[cite: 7]\n` +
              `• **2x Booster (<@&1481370041382604874>):** **3x Claim Time**[cite: 7]`
          }
        )
        .setImage("https://media.discordapp.net/attachments/1453806812515008533/1491100480313622659/standard_1.gif?ex=6ad2ee49&is=6ad19cc9&hm=a47824643fca3c1ad179ebabf7b2a83eead9cb5dbe61d0330c5331a2d9866e6c&animated=true")
        .setFooter({ text: "DonQuixote's Lounge • Guidelines & Operations" })
        .setTimestamp();
