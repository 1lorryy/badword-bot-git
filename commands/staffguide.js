const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays clean giveaway rules and operations guidelines",
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
          "★ **Always** read requirements before joining giveaways.\n" +
          "★ **Failing** to follow requirements results in a <@&1481370041260966067> and punishments.\n\n" +
          "═══════════════════════════════════"
        )
        .addFields(
          {
            name: "🚨 Giveaway Ban Rules",
            value:
              "• **Offenses:** Spamming, message farming, or faking requirements.\n" +
              "• **Penalty:** Receives a <@&1481370041260966067> for **2 days**.\n" +
              "• **Message Farming:** Typing 3+ short low-effort messages (e.g., 'hi', 'hru') triggers a ban."
          },
          {
            name: "⚡ Quick Drops Policy",
            value:
              "• **Rerolls:** Quick drops are rerolled up to **4 times**, then **voided** if unclaimed.\n" +
              "• **Host Decision:** The hoster has final say on whether a claim was valid.\n" +
              "• **Fulfillment:** Gamepasses must be delivered within **24 hours**.\n" +
              "⚠️ *Booster claim times do not affect Quick Drops.*"
          },
          {
            name: "⏳ Claim Times & Multipliers",
            value:
              "• **Quick Drops Window:** 30 seconds to 5 minutes.\n" +
              "• **Standard Giveaways:** Default 30 minutes claim time.\n" +
              "• **Boosters (<@&1482787743527604305>):** **2x Claim Time**\n" +
              "• **2x Boosters (<@&1481370041382604874>):** **3x Claim Time**"
          }
        )
        .setImage("https://media.discordapp.net/attachments/1453806812515008533/1491100480313622659/standard_1.gif?ex=6ad2ee49&is=6ad19cc9&hm=a47824643fca3c1ad179ebabf7b2a83eead9cb5dbe61d0330c5331a2d9866e6c&animated=true")
        .setFooter({ text: "DonQuixote's Lounge • Giveaway Guidelines" })
    .setTimestamp();

      return message.channel.send({ embeds: [guideEmbed] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  }
};
