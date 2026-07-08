const { EmbedBuilder, PermissionsBitField } = require("discord.js");

/**
 * Main handler routing all ?verify controls
 */
async function handleVerifyCommand(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  
  // Ensure moderation/admin controls are permissions protected
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return message.reply("❌ You need `Manage Server` permissions to use verification configurations.");
  }

  const subCommand = (args[0] || "").toLowerCase();

  // 1. ?verify verifiedrole @role
  if (subCommand === "verifiedrole") {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!role) return message.reply(`Usage: \`${prefix}verify verifiedrole @role\``);
    
    data.verification.verifiedRole = role.id;
    saveData();
    return message.reply(`✅ Verified users will now receive the role: **${role.name}**`);
  }

  // 2. ?verify unverifiedrole @role
  if (subCommand === "unverifiedrole") {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!role) return message.reply(`Usage: \`${prefix}verify unverifiedrole @role\``);
    
    data.verification.unverifiedRole = role.id;
    saveData();
    return message.reply(`✅ Unverified users will be assigned/tracked via role: **${role.name}**`);
  }

  // 3. ?verify trusteddays <count>
  if (subCommand === "trusteddays") {
    const days = parseInt(args[1], 10);
    if (isNaN(days) || days < 0) return message.reply(`Usage: \`${prefix}verify trusteddays <number of days>\``);
    
    data.verification.trustedDays = days;
    saveData();
    return message.reply(`✅ Minimum account age threshold set to **${days}** days.`);
  }

  // 4. ?verify autoban true/false
  if (subCommand === "autoban") {
    const choice = (args[1] || "").toLowerCase();
    if (choice !== "true" && choice !== "false") return message.reply(`Usage: \`${prefix}verify autoban true/false\``);
    
    data.verification.autoban = choice === "true";
    saveData();
    return message.reply(`✅ Auto-ban on failed criteria set to: **${data.verification.autoban}**`);
  }

  // 5. ?verify autokick true/false
  if (subCommand === "autokick") {
    const choice = (args[1] || "").toLowerCase();
    if (choice !== "true" && choice !== "false") return message.reply(`Usage: \`${prefix}verify autokick true/false\``);
    
    data.verification.autokick = choice === "true";
    saveData();
    return message.reply(`✅ Auto-kick on failed criteria set to: **${data.verification.autokick}**`);
  }

  // 6. ?verify settings (Display complete verification dashboard status)
  if (subCommand === "settings" || !subCommand) {
    const config = data.verification;
    const embed = new EmbedBuilder()
      .setTitle("🛡️ Verification Suite Settings")
      .setColor(0x5865f2)
      .setDescription(`Configure your automated anti-alt gates using choices below:\nUsage: \`${prefix}verify <setting> <value>\``)
      .addFields(
        { name: "Verified Role", value: config.verifiedRole ? `<@&${config.verifiedRole}>` : "❌ None Setup", inline: true },
        { name: "Unverified Role", value: config.unverifiedRole ? `<@&${config.unverifiedRole}>` : "❌ None Setup", inline: true },
        { name: "Min Account Age", value: `\`${config.trustedDays} Days\``, inline: true },
        { name: "Auto-Ban Raids", value: `\`${config.autoban}\``, inline: true },
        { name: "Auto-Kick Alts", value: `\`${config.autokick}\``, inline: true }
      )
      .setFooter({ text: "Double Counter System Integration" });

    return message.reply({ embeds: [embed] });
  }

  // 7. ?verify scan @user / ID
  if (subCommand === "scan") {
    const targetInput = args[1];
    if (!targetInput) return message.reply(`Usage: \`${prefix}verify scan @user\``);

    // Target extraction helper
    const targetId = targetInput.replace(/[<@!>]/g, "");
    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (!member) return message.reply("❌ Target member could not be found in this server.");

    const evaluation = runScanDiagnostics(member, data.verification);
    
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Scanner Report: ${member.user.tag}`)
      .setColor(evaluation.passed ? 0x22c55e : 0xef4444)
      .addFields(
        { name: "Account Creation Date", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: "Account Age Status", value: evaluation.agePassed ? "✅ Safe" : `❌ Flagged: Too New (< ${data.verification.trustedDays} Days)`, inline: true },
        { name: "Has Custom Avatar", value: evaluation.hasAvatar ? "✅ Yes" : "⚠️ Default Avatar", inline: true },
        { name: "Overall Risk Assessment", value: evaluation.passed ? "🟢 **PASSED / TRUSTED**" : "🔴 **HIGH RISK FLAG**", inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}

/**
 * Engine checking for default avatars, age restrictions, and suspicious patterns
 */
function runScanDiagnostics(member, config) {
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const agePassed = accountAgeDays >= config.trustedDays;
  const hasAvatar = member.user.avatar !== null;

  // Evaluation criteria flags
  let passed = true;
  if (!agePassed) passed = false;

  return {
    passed,
    agePassed,
    hasAvatar
  };
}

module.exports = {
  handleVerifyCommand,
  runScanDiagnostics
};
