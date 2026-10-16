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
        .setTitle("📜 SERVER RULES")
        .setColor(0xd9383a)
        .setDescription(
          "**1.** Respect everyone. No hate speech, bullying, or discrimination of any kind. Keep it chill.\n\n" +
          "**2.** No spamming or flooding chat with messages, images, or emojis. Give people space to breathe.\n\n" +
          "**3.** No NSFW content or discussions. Keep it safe for all ages.\n\n" +
          "**4.** Follow Discord's Terms of Service everywhere here. No illegal actions or sharing pirated stuff.\n\n" +
          "**5.** No advertising or self-promotion without permission from staff.\n\n" +
          "**6.** Use appropriate channels for topics — no off-topic spam.\n\n" +
          "**7.** Do not ping staff unnecessarily or abuse the ticket system.\n\n" +
          "**8.** English only in main chats to keep things clear.\n\n" +
          "**9.** No sharing others' personal info or doxxing. Privacy matters.\n\n" +
          "**10.** Listen to mods and respect their decisions. Arguing isn't allowed in public chat.\n\n" +
         "### 🧠 11. COMMON SENSE RULE\n" +
          "**Not every single rule is explicitly listed here. Use common sense. If something is obviously toxic, harmful, or stupid, claiming *\"it wasn't in the rules\"* won't save you from a punishment.**\n" +
          "* Examples of unwritten violations include: slurs or obfuscated slurs, loophole abusing, deliberately provoking/baiting arguments, bypass attempts, or general malice.*\n\n" +
          "⚠️ **Don't beg or you will be warned!**\n\n" +
          "🚨 **Reporting Severe Violations & Ticket Policy**\n" +
          "If you witness someone breaking server rules severely, please report it immediately by opening a ticket in <#1481370042892550220>.\n" +
          "⚠️ *Creating false reports, troll tickets, or abusing the ticket system will result in warnings, ticket blacklists, or mutes.*\n\n" +
          "🔗 https://discord.com/terms\n\n" +
          "⚖️ **Staff Authority & Disclaimer**\n" +
          "Staff & Management hold full ownership and ultimate discretion over all rule interpretations, warnings, mutes, kicks, bans, and server disputes. All staff decisions are final."
        );

      // ================= EMBED 2: PUNISHMENT ESCALATION LADDER =================
      const ladderEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setDescription(
          "💬 **verbal warn**\n" +
          "🔹 **1st warn** safe\n" +
          "🔹 **2nd warn** + 5 minutes mute\n" +
          "🔹 **3rd warn** + 30 minutes mute\n" +
          "🔹 **4th warn** + 12 hours mute\n" +
          "🔹 **5th warn** + kick\n" +
          "🔹 **6th warn** + Ban\n\n" +
          "⚠️ **Note:** Punishments are subject to change depending on the **severity** of the infraction. Staff members reserve the right to issue harsher penalties, skip warning tiers, or apply custom actions (such as <@&1481370041260966067>) immediately if deemed necessary.\n\n" +
          "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊'𝕤 𝖘𝖊𝖗𝖛𝖊𝖗 𝖗𝖚𝖑𝖊𝖘"
        );

      return message.channel.send({ embeds: [mainRulesEmbed, ladderEmbed] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  }
};
