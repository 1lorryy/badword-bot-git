const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const fs = require("fs");
const path = require("path");

const STAFF_GUIDE_FILE = process.env.STAFF_GUIDE_FILE || path.join(__dirname, "..", "staff-guide-data.json");

function loadStaffGuide() {
  try {
    if (fs.existsSync(STAFF_GUIDE_FILE)) {
      return JSON.parse(fs.readFileSync(STAFF_GUIDE_FILE, "utf8"));
    }
  } catch (err) {
    console.error("Error reading staff guide file:", err);
  }
  return {
    title: "🛡️ Moderation & Staff Commands Usage Guide",
    color: "#5865F2"
  };
}

module.exports = {
  name: "staffguide",
  description: "Displays staff guidelines edited from the dashboard",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send("❌ **Access Denied:** Administrator permission required.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const guideData = loadStaffGuide();
    const hexColor = parseInt((guideData.color || "#5865F2").replace("#", ""), 16);

    const fullGuideText = 
      "How to use all moderation, management, and AutoMod staff commands.\n" +
      "───\n\n" +
      "⚠️ **Warnings**\n" +
      "• `?warn @user [reason]` — Issue an official warning\n" +
      "• `?warnings [@user]` — Check warn history with dynamic timestamps & page jump\n" +
      "• `?unwarn @user [warn_id]` — Remove a specific warning\n\n" +
      "🔇 **Mutes & Timeouts**\n" +
      "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)\n" +
      "• `?unmute @user` — Remove an active timeout\n\n" +
      "🔨 **Kicks & Bans**\n" +
      "• `?kick @user [reason]` — Kick user from server\n" +
      "• `?ban @user [reason]` — Ban user & purge recent messages\n" +
      "• `?softban @user [reason]` — Kick user & wipe 7 days of message history\n" +
      "• `?unban [user_id]` — Unban user using their Discord ID\n\n" +
      "✏️ **Chat & Channel Controls**\n" +
      "• `?purge [1-100]` — Bulk delete recent messages\n" +
      "• `?purge @user [1-100]` — Delete messages from a specific user\n" +
      "• `?purge bots [1-100]` — Clean up bot messages\n" +
      "• `?purge links [1-100]` — Delete messages containing links\n" +
      "• `?rename <new-name>` — Rename channel (Ticket categories only)\n" +
      "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `5s` or `off`)\n" +
      "• `?modstats [@staff]` — Check moderator action statistics\n" +
      "• `?modlogs [@user]` — View recent moderation log entries\n\n" +
      "👤 **Roles & Management**\n" +
      "• `?role @user [role]` — Add or remove a role from a user\n" +
      "• `?temprole @user [time] [role]` — Give temporary role (Auto-removes across restarts)\n" +
      "• `?rolecreate [role_name] [color_hex]` — Create a new server role\n" +
      "• `?roleicon @role <image/URL/emoji>` — Set or update a role's icon\n" +
      "• `?customcolor` / `?color` — Open interactive custom hex color picker\n" +
      "• `?setnick @user [new_nickname]` — Change a user's server nickname\n" +
      "• `?status` — Check bot system status & performance\n\n" +
      "🌙 **AFK & Utilities**\n" +
      "• `?afk [reason]` / `?afk global` — Set AFK status (Pings survive redeploys)\n" +
      "• `?help` — Open interactive button command center\n" +
      "• `?tz [zone]` — Set or view personal timezone (e.g. `EST`, `UTC+2`)\n" +
      "• `?joininfo [@user]` — View join placement, milestone tier, and synced timezone\n\n" +
      "🚫 **Blacklist & Staff Guide**\n" +
      "• `?bl [word]` — Add a word to auto-blacklist\n" +
      "• `?unbl [word]` — Remove a word from blacklist\n" +
      "• `?words` — View all blacklisted words\n" +
      "• `?staffguide` — Show this command usage guide\n" +
      "• `?staffguidedit <message_id> [new_text]` — Edit staff guide content";

    const guideEmbed = new EmbedBuilder()
      .setColor(isNaN(hexColor) ? 0x5865f2 : hexColor)
      .setTitle(guideData.title || "🛡️ Moderation & Staff Commands Usage Guide")
      .setDescription(fullGuideText)
      .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
      .setTimestamp();

    return message.channel.send({ embeds: [guideEmbed] });
  }
};
