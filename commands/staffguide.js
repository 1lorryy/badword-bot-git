const { EmbedBuilder, PermissionsBitField } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "staff-guide-data.json");
const STAFF_ROLE_ID = "1481370041420087474";

// Exact default staff escalation rules
const DEFAULT_GUIDE = {
  title: "🛡️ DONQUIXOTES LOUNGE • STAFF PROTOCOLS & ESCALATION",
  color: "#5865F2",
  description: 
    "### 📜 Standard Warn Escalation Ladder\n" +
    "• **Verbal:** Verbal Warning\n" +
    "• **1st Warn:** Safe (Logged Warning)\n" +
    "• **2nd Warn:** Warning + **5 Minutes Mute**\n" +
    "• **3rd Warn:** Warning + **30 Minutes Mute**\n" +
    "• **4th Warn:** Warning + **12 Hours Mute**\n" +
    "• **5th Warn:** Warning + **KICK** *(Levels/data reset)*\n" +
    "• **6th Warn:** Warning + **BAN**\n\n" +
    "### 🚨 Special & Category Rules\n" +
    "• **Special Rule Breaker** *(NSFW / Gore / Disturbing / Scammer)* ➔ **BAN**\n" +
    "• **Giveaway Rules** *(Spamming / Msg Farming)* ➔ Warn + Timeout <@&1481370041260966067> **2 days**\n" +
    "• **Harassing / Insulting / Ragebaiting** ➔ **Verbal**\n" +
    "• **Not Listening to Staff** ➔ Warn + **Mute 30 mins**\n\n" +
    "### 📢 Naughty Advertisers *(DM Advertising / Self-Promo)*\n" +
    "• **First Offense:** **Verbal**\n" +
    "• **If They Continue:** **KICK**"
};

// Helper to load persistent JSON data
function loadGuideData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_GUIDE, null, 2), "utf8");
      return DEFAULT_GUIDE;
    }
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return DEFAULT_GUIDE;
  }
}

// Helper to save persistent JSON data
function saveGuideData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save staff guide data:", err);
  }
}

module.exports = {
  name: "staffguide",
  aliases: ["staffguidedit"],
  description: "Displays or edits the persistent staff guidelines embed.",
  async execute(message, args) {
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!isStaff) {
      return message.reply("❌ Only staff members can use this command.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const commandUsed = message.content.slice(1).split(" ")[0].toLowerCase();
    let currentData = loadGuideData();

    // ================= EDIT MODE (?staffguidedit) =================
    if (commandUsed === "staffguidedit") {
      const newContent = args.join(" ");

      if (!newContent) {
        return message.reply(
          "💡 **Usage:** `?staffguidedit <new embed description text>`\n" +
          "*(Saves forever across bot rebuilds & syncs with web dashboard)*"
        );
      }

      currentData.description = newContent;
      saveGuideData(currentData);

      const successEmbed = new EmbedBuilder()
        .setColor("#57F287")
        .setTitle("✅ Staff Guidelines Updated & Saved Forever")
        .setDescription("The rules have been updated in disk storage! Run `?staffguide` to post the new layout.");

      return message.reply({ embeds: [successEmbed] });
    }

    // ================= DISPLAY MODE (?staffguide) =================
    const embed = new EmbedBuilder()
      .setColor(currentData.color || "#5865F2")
      .setTitle(currentData.title || "🛡️ STAFF GUIDELINES")
      .setDescription(currentData.description)
      .setFooter({ text: "donQuixotes Lounge • Staff Operations" })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
    if (message.deletable) message.delete().catch(() => null);
  }
};
