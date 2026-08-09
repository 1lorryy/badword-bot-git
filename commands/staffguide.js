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
    title: "🛡️ DONQUIXOTES LOUNGE • STAFF PROTOCOLS & ESCALATION",
    color: "#2B2D31",
    description: "Standard Warn Escalation Ladder, Staff Commands, and Utility Integrations."
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

    // Read live data from JSON
    const guideData = loadStaffGuide();
    const hexColor = parseInt((guideData.color || "#2B2D31").replace("#", ""), 16);

    const guideEmbed = new EmbedBuilder()
      .setColor(isNaN(hexColor) ? 0x2b2d31 : hexColor)
      .setTitle(guideData.title || "🛡️ STAFF GUIDELINES")
      .setDescription(guideData.description || "No guidelines configured.")
      .addFields(
        {
          name: "🌐 Member & Utility Commands",
          value: 
            "• `?tz [zone]` — Set or view personal timezone (e.g., `?tz EST`, `?tz UTC+2`).\n" +
            "• `?joininfo [@user]` — Display join rank, milestone badge, and synced timezone.",
          inline: false
        }
      )
      .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
      .setTimestamp();

    return message.channel.send({ embeds: [guideEmbed] });
  }
};
