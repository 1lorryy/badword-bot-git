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
    title: "🛡️ Don Don Complete Command & Staff Operations Guide",
    color: "#5865F2"
  };
}

module.exports = {
  name: "staffguide",
  description: "Displays complete server guidelines and command manual edited from the dashboard",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send("❌ **Access Denied:** Administrator permission required.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const guideData = loadStaffGuide();
    const hexColor = parseInt((guideData.color || "#5865F2").replace("#", ""), 16);

    const fullGuideText = 
      "Complete manual for all moderation, security, utility, auto-responder, and fun systems.\n" +
      "═══════════════════════════════════\n\n" +
      "🛡️ **Moderation & Punishments**\n" +
      "• `?warn @user [reason]` — Issue an official warning\n" +
      "• `?warnings [@user]` — Check warn history with dynamic timestamps & page jump\n" +
      "• `?unwarn @user [warn_id]` — Remove a specific warning\n" +
      "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)\n" +
      "• `?unmute @user` — Remove an active timeout\n" +
      "• `?kick @user [reason]` — Kick user from server\n" +
      "• `?ban @user [reason]` — Ban user & purge recent messages\n" +
      "• `?softban @user [reason]` — Kick user & wipe 7 days of message history\n" +
      "• `?unban [user_id]` — Unban user using their Discord ID\n" +
      "• `?modstats [@staff]` — Check moderator action statistics\n" +
      "• `?modlogs [@user]` — View recent moderation log entries\n\n" +
      "🔒 **Security & Verification Controls**\n" +
      "• `?verify settings` — Check current anti-raid security configuration\n" +
      "• `?verify scan @user` — Scan an account's risk score and creation age\n" +
      "• `?verify massscan` — Scan all unverified members in bulk\n" +
      "• `?verify verifiedrole [role]` — Set the server's official verified role\n" +
      "• `?verify unverifiedrole [role]` — Set the unverified quarantine role\n" +
      "• `?verify trusteddays [days]` — Set minimum account creation age threshold\n" +
      "• `?verify autoban [on/off]` — Toggle automatic ban on join for risky accounts\n" +
      "• `?verify autokick [on/off]` — Toggle automatic kick on join\n\n" +
      "⚙️ **Chat, Roles & Channel Management**\n" +
      "• `?purge [1-100]` — Bulk delete recent messages\n" +
      "• `?purge @user [1-100]` — Delete messages from a specific user\n" +
      "• `?purge bots [1-100]` — Clean up bot messages\n" +
      "• `?purge links [1-100]` — Delete messages containing links\n" +
      "• `?role @user [role]` — Add or remove a role from a user (No Pings)\n" +
      "• `?temprole @user [time] [role]` — Give temporary role (Auto-removes across restarts)\n" +
      "• `?rolecreate [role_name] [color_hex]` — Create a new server role\n" +
      "• `?roleicon @role <image/URL/emoji>` — Set or update a role's icon\n" +
      "• `?rename <new-name>` — Rename ticket channels\n" +
      "• `?setnick @user [new_nickname]` — Change a user's server nickname\n" +
      "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `5s` or `off`)\n\n" +
      "🤖 **Autoresponders & Blacklist Automation**\n" +
      "• `?ar add [trigger] [response] + [image]` — Create custom text, emoji, or GIF auto-response\n" +
      "• `?ar remove [trigger]` — Delete an active auto-response trigger\n" +
      "• `?ar list` — View all active server auto-responses\n" +
      "• `?bl [word]` — Add a word to auto-blacklist\n" +
      "• `?unbl [word]` — Remove a word from blacklist\n" +
      "• `?words` — View all blacklisted words\n\n" +
      "🛠️ **Utilities & General Tools**\n" +
      "• `?help` — Open interactive button command center\n" +
      "• `?afk [reason]` / `?afk global` — Set AFK status (Survives redeploys)\n" +
      "• `?translate [lang] [text]` — Translate message content\n" +
      "• `?timer [time] [label]` — Set a countdown timer\n" +
      "• `?birthday` / `?bday` — Set your birthday (`#commands` only)\n" +
      "• `?snipe` / `?snipes` — View recently deleted messages\n" +
      "• `?joininfo [@user]` — View join placement, milestone tier, and timezone\n" +
      "• `?tz [zone]` — Set or view personal timezone (e.g. `EST`, `UTC+2`)\n" +
      "• `?status` — Check bot system health and latency performance\n\n" +
      "🎮 **Fun, Social & Games**\n" +
      "• `?marry @user [ring]` — Propose to a member with custom rings from inventory\n" +
      "• `?divorce [@user]` — End a marriage (30-day cooldown applies)\n" +
      "• `?marriages` — View server marriage records\n" +
      "• `?ship @user1 [@user2]` — Calculate love match compatibility\n" +
      "• `?adopt @user` — Adopt a child into your family tree\n" +
      "• `?disown @user` — Disown a family child\n" +
      "• `?family [@user]` — View full interactive family tree\n" +
      "• `?8ball [question]` — Ask the magic 8-ball\n" +
      "• `?coinflip` — Flip a coin (Heads or Tails)\n" +
      "• `?roll [max]` — Roll a random number (1-100)\n" +
      "• `?rps [rock/paper/scissors]` — Play Rock Paper Scissors\n" +
      "• `?auction` / `?bid` — Server auction & bidding engine\n" +
      "• `?ai [prompt]` — Chat with the OpenAI bot engine\n" +
      "• `?customcolor` / `?color` — Open interactive custom hex color studio\n" +
      "• `?staffguide` — Show this command manual\n" +
      "• `?staffguidedit <message_id> [new_text]` — Edit guide content";

    const guideEmbed = new EmbedBuilder()
      .setColor(isNaN(hexColor) ? 0x5865f2 : hexColor)
      .setTitle(guideData.title || "🛡️ Don Don Complete Command & Staff Operations Guide")
      .setDescription(fullGuideText)
      .setFooter({ text: "Don Don Staff Operations • Complete Manual" })
      .setTimestamp();

    return message.channel.send({ embeds: [guideEmbed] });
  }
};
