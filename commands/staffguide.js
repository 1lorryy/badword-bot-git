const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays or edits the staff guidelines",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("staffguidedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newGuideText = args.join(" ");
      if (!newGuideText) {
        return message.reply("⚠️ **Usage:** `?staffguidedit <new guide rules/info>`");
      }

      return message.reply("✅ **Staff guide updated successfully!**");
    }

    const guideEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🛡️ Staff Infraction Escalation & Rules")
      .setDescription("Follow this strict step-by-step punishment guide.\n━━━")
      .addFields(
        {
          name: "📈 General Warn Escalation",
          value:
            "🗣️ **Verbal Warn:** Initial warning\n" +
            "1️⃣ **1st Warn:** Safe warning\n" +
            "2️⃣ **2nd Warn:** + 5 Minutes Mute\n" +
            "3️⃣ **3rd Warn:** + 30 Minutes Mute\n" +
            "4th **4th Warn:** + 12 Hours Mute\n" +
            "5️⃣ **5th Warn:** Kick *(Wipes levels & progress)*\n" +
            "6️⃣ **6th Warn:** Ban"
        },
        {
          name: "🚨 Specific Infractions",
          value:
            "• **Special Rule Breaker (NSFW / Gore / Disturbing / Scammer):**\n" +
            "└ 🔨 **BAN**\n\n" +
            "• **Giveaway Rules (Spamming / Msg Farming):**\n" +
            "└ ⚠️ Warn + Remove <@&1481370041260966067> for **2 Days**\n\n" +
            "• **Harassing / Insulting / Ragebaiting:**\n" +
            "└ 🗣️ Verbal Warn\n\n" +
            "• **Not Listening:**\n" +
            "└ ⚠️ Warn + 30 Minutes Mute\n\n" +
            "• **Naughty Advertisers (DM Advertising / Server Ads):**\n" +
            "└ 🗣️ Verbal Warn → *(If continued)* 👢 **Kick**"
        }
      )
      .setFooter({ text: "Staff Operations • Enforce Consistently" })
      .setTimestamp();

    return message.reply({ embeds: [guideEmbed] });
  }
};
};
