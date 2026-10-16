const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays official server rules and punishment escalation ladder",
  async execute(message, args) {
    try {
      await message.delete().catch(() => null);

      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.channel.send("❌ **Access Denied:** Administrator permission required.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      // ================= EMBED 1: MAIN SERVER RULES =================
      const mainRulesEmbed = new EmbedBuilder()
        .setTitle("📜 DONQUIXOTES LOUNGE — OFFICIAL SERVER RULES")
        .setColor(0xd9383a)
        .setDescription(
          "### 🧠 COMMON SENSE & UNWRITTEN RULES CLAUSE\n" +
          "**Not every forbidden action is explicitly written below.** Common sense is strictly enforced. If something is obviously toxic, harmful, manipulative, or detrimental to the community, **doing it is still a bannable offense.** Claiming *\"it wasn't in the rules\"* will **NOT** protect you.\n\n" +

          "### 🛑 ZERO TOLERANCE POLICY\n" +
          "**1. NO SLURS, HATE SPEECH, OR DISCRIMINATION**\n" +
          "Zero tolerance for racism, homophobia, sexism, or slurs of any kind. Keep it clean.\n\n" +

          "**2. NO HARASSMENT, DOXXING, OR THREATS**\n" +
          "No sharing personal information, witch-hunting, bullying, or threatening members.\n\n" +

          "**3. NO NSFW, GORE, OR SHOCK CONTENT**\n" +
          "Keep all text, images, and links safe for work and safe for all ages.\n\n" +

          "**4. NO SCAMS, PHISHING, OR MALICIOUS LINKS**\n" +
          "Sending grabber links, nitro scams, fake crypto links, or unauthorized ads results in an **immediate permanent ban**.\n\n" +

          "### ⚡ GENERAL CHAT RULES\n" +
          "**5. NO SPAM, FLOODING, OR EAR-RAPE**\n" +
          "Don't spam chat, copypastas, emojis, or soundboards in voice chats. Give people breathing room.\n\n" +

          "**6. NO BYPASSING THE AUTOMOD OR FILTERS**\n" +
          "Trying to evade word filters using spaces, alternate characters, or symbols will trigger automatic mutes/bans.\n\n" +

          "**7. NO SELF-PROMOTION OR UNSOLICITED DMs**\n" +
          "Do not advertise other servers, social media, or slide into member DMs to promote things without permission.\n\n" +

          "**8. ENGLISH ONLY IN MAIN CHATS**\n" +
          "Keep public text channels in English so moderators can properly review chats.\n\n" +

          "**9. RESPECT STAFF & TICKET ETIQUETTE**\n" +
          "Listen to staff decisions. **Do not ping staff unnecessarily or abuse tickets.**\n" +
          "⚠️ *False reports, troll tickets, or begging will result in warnings or ticket blacklists.*\n\n" +

          "⚖️ **STAFF AUTHORITY & DISCLAIMER**\n" +
          "Staff & Management hold full ownership and ultimate discretion over all rule interpretations, warnings, mutes, kicks, bans, and server disputes. All staff decisions are final."
        );

      // ================= EMBED 2: PUNISHMENT ESCALATION LADDER =================
      const ladderEmbed = new EmbedBuilder()
        .setTitle("⚖️ PUNISHMENT ESCALATION LADDER")
        .setColor(0x2b2d31)
        .setDescription(
          "### 📈 HOW WARNINGS & PENALTIES ESCALATE:\n" +
          "💬 **Verbal Warning** — Friendly heads up\n" +
          "🔹 **1st Official Warn** — Logged on record\n" +
          "🔹 **2nd Warn** — Logged + **5 Minutes Mute**\n" +
          "🔹 **3rd Warn** — Logged + **30 Minutes Mute**\n" +
          "🔹 **4th Warn** — Logged + **12 Hours Mute**\n" +
          "🔹 **5th Warn** — Logged + **Server Kick**\n" +
          "🔹 **6th Warn** — Logged + **Permanent Ban**\n\n" +
          "⚠️ **CRITICAL NOTE:** Punishments are subject to change instantly depending on the **severity** of the infraction. Severe offenses (such as slurs, raids, doxxing, or scams) will **skip the ladder entirely** resulting in immediate bans or role restrictions (like <@&1481370041260966067>).\n\n" +
          "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊 — *Play stupid games, win stupid prizes.*"
        );

      return message.channel.send({ embeds: [mainRulesEmbed, ladderEmbed] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  }
};
