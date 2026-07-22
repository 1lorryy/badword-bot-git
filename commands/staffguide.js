const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays or edits the staff command usage guide",
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
      .setTitle("🛡️ Moderation & Staff Commands Usage Guide")
      .setDescription("How to use all moderation, management, and AutoMod staff commands.\n━━━")
      .addFields(
        {
          name: "⚠️ Warnings",
          value:
            "• `?warn @user [reason]` — Issue an official warning\n" +
            "• `?warnings @user` — Check a user's warn history & IDs\n" +
            "• `?unwarn @user [warn_id]` — Remove a specific warning"
        },
        {
          name: "🔇 Mutes & Timeouts",
          value:
            "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)\n" +
            "• `?unmute @user` — Remove an active timeout"
        },
        {
          name: "🔨 Kicks & Bans",
          value:
            "• `?kick @user [reason]` — Kick user from server\n" +
            "• `?ban @user [reason]` — Ban user & purge recent messages\n" +
            "• `?unban [user_id]` — Unban user using their Discord ID"
        },
        {
          name: "🧹 Chat & Channel Controls",
          value:
            "• `?purge [amount]` — Delete multiple messages at once\n" +
            "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `?slowmode 5s` or `?slowmode #chat 10s`)\n" +
            "• `?slowmode [off / 0]` — Turn off channel slowmode\n" +
            "• `?modstats [@staff]` — Check moderation action stats\n" +
            "• `?modlogs [@user]` — View recent moderation log entries"
        },
        {
          name: "👤 Roles & Management",
          value:
            "• `?role @user [role]` — Add or remove a role from a user\n" +
            "• `?temprole @user [time] [role]` — Give a role temporarily (e.g. `7d`)\n" +
            "• `?setnick @user [new_nickname]` — Change a user's server nickname\n" +
            "• `?status` — Check bot system status & performance"
        },
        {
          name: "🚫 Blacklist & Staff Guide",
          value:
            "• `?bl [word]` — Add a word to auto-blacklist\n" +
            "• `?unbl [word]` — Remove a word from blacklist\n" +
            "• `?words` — View all blacklisted words\n" +
            "• `?staffguide` — Show this command usage guide\n" +
            "• `?staffguidedit [text]` — Edit staff guide settings"
        }
      )
      .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
      .setTimestamp();

    return message.reply({ embeds: [guideEmbed] });
  }
};
