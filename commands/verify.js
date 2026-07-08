const { EmbedBuilder, PermissionsBitField } = require("discord.js");

/**
 * Main handler routing all ?verify controls
 */
async function handleVerifyCommand(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  
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

  // 4. ?verify settings
  if (subCommand === "settings" || !subCommand) {
    if (subCommand !== "massscan") {
      const config = data.verification;
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Verification Suite Settings")
        .setColor(0x5865f2)
        .setDescription(`Configure your automated anti-alt gates using choices below:\nUsage: \`${prefix}verify <setting> <value>\``)
        .addFields(
          { name: "Verified Role", value: config.verifiedRole ? `<@&${config.verifiedRole}>` : "❌ None Setup", inline: true },
          { name: "Unverified Role", value: config.unverifiedRole ? `<@&${config.unverifiedRole}>` : "❌ None Setup", inline: true },
          { name: "Min Account Age", value: `\`${config.trustedDays} Days\``, inline: true }
        )
        .setFooter({ text: `Type ${prefix}verify massscan to run a server audit.` });

      return message.reply({ embeds: [embed] });
    }
  }

  // 5. ?verify massscan (CRASH-PROOF LIVE ENGINE)
  if (subCommand === "massscan") {
    const progressEmbed = new EmbedBuilder()
      .setTitle("🔄 Live Security Directory Scan")
      .setColor(0x3498db)
      .setDescription("Fetching directory cache and establishing link context...")
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [progressEmbed] });
    
    // Cache directory fetch
    await message.guild.members.fetch().catch(() => {});
    const members = Array.from(message.guild.members.cache.values());
    const totalMembers = members.size || members.length;

    let flaggedAlts = [];
    let botCount = 0;
    let processedCount = 0;
    
    // Live update frequency chunking (Update UI every 40 items processed to prevent API rate-limits)
    const updateInterval = 40; 

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      processedCount++;

      if (member.user.bot) {
        botCount++;
        continue;
      }

      const diagnostics = runScanDiagnostics(member, data.verification);
      
      if (diagnostics.riskScore >= 40) {
        flaggedAlts.push({
          member,
          score: diagnostics.riskScore,
          reason: diagnostics.reasons.join(", ")
        });
      }

      // Send updates visually in real-time
      if (processedCount % updateInterval === 0 || processedCount === totalMembers) {
        progressEmbed.setDescription(`Analyzing profiles: **${processedCount}**/**${totalMembers}** done.\nFound **${flaggedAlts.length}** high-risk flags so far...`);
        await statusMessage.edit({ embeds: [progressEmbed] }).catch(() => {});
      }
    }

    // Sort threat severity index descending
    flaggedAlts.sort((a, b) => b.score - a.score);

    const finalEmbed = new EmbedBuilder()
      .setTitle("🚨 Server Security Risk Audit Report")
      .setColor(flaggedAlts.length > 0 ? 0xef4444 : 0x22c55e)
      .setDescription(`Successfully audited **${processedCount - botCount}** human users and **${botCount}** application accounts.`)
      .setTimestamp();

    if (flaggedAlts.length > 0) {
      let currentFieldText = "";
      let fieldIndex = 1;

      for (const item of flaggedAlts) {
        const line = `• ${item.member} (\`${item.member.user.tag}\`)\n  **Risk:** \`${item.score}%\` | *${item.reason}*\n\n`;
        
        // Split cleanly into separate fields if we creep near the 1,024 limit
        if ((currentFieldText + line).length > 950) {
          finalEmbed.addFields({ name: `⚠️ Flagged Accounts (Part ${fieldIndex})`, value: currentFieldText });
          currentFieldText = line;
          fieldIndex++;
        } else {
          currentFieldText += line;
        }

        // Limit maximum display size to top 25 high threat targets so embeds don't hit grand global limits
        if (fieldIndex > 4) break; 
      }

      if (currentFieldText.length > 0) {
        finalEmbed.addFields({ name: `⚠️ Flagged Accounts ${fieldIndex > 1 ? `(Part ${fieldIndex})` : ""}`, value: currentFieldText });
      }

      if (flaggedAlts.length > 20) {
        finalEmbed.setFooter({ text: `Showing top threat vectors. Total hidden matching entries: ${flaggedAlts.length - 20}` });
      }
    } else {
      finalEmbed.addFields({ name: "⚠️ Risk Sweep Status", value: "✅ Clean sweep! No profiles matched threat vectors." });
    }

    return statusMessage.edit({ content: "✅ Scan finalized successfully.", embeds: [finalEmbed] });
  }

  // 6. ?verify scan @user
  if (subCommand === "scan") {
    const targetInput = args[1];
    if (!targetInput) return message.reply(`Usage: \`${prefix}verify scan @user\``);

    const targetId = targetInput.replace(/[<@!>]/g, "");
    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (!member) return message.reply("❌ Target member could not be found in this server.");

    const evaluation = runScanDiagnostics(member, data.verification);
    
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Diagnostic Profile: ${member.user.tag}`)
      .setColor(evaluation.riskScore >= 40 ? 0xef4444 : 0x22c55e)
      .addFields(
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: "Profile Avatar", value: evaluation.hasAvatar ? "✅ Custom" : "⚠️ Default/None", inline: true },
        { name: "Risk Assessment Rating", value: `**${evaluation.riskScore}% Threat Rating**\nReasons: *${evaluation.reasons.join(", ") || "None"}*`, inline: false }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
}

/**
 * Advanced Multi-Factor Diagnostics Engine
 */
function runScanDiagnostics(member, config) {
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const hasAvatar = member.user.avatar !== null;
  
  let riskScore = 0;
  let reasons = [];

  if (accountAgeDays < config.trustedDays) {
    riskScore += 50; 
    reasons.push(`New Account (${Math.floor(accountAgeDays)}d old)`);
  } else if (accountAgeDays < 30) {
    riskScore += 20;
    reasons.push("Account under 30 days old");
  }

  if (!hasAvatar) {
    riskScore += 25;
    reasons.push("Default Avatar");
  }

  const username = member.user.username;
  const hasRandomGibberish = /^[a-z0-9]{8,12}$/i.test(username) && !/[aeiou]/i.test(username);
  const consecutiveNumbers = /\d{4,}/.test(username);

  if (hasRandomGibberish || consecutiveNumbers) {
    riskScore += 25;
    reasons.push("Suspicious name layout");
  }

  return {
    riskScore: Math.min(riskScore, 100),
    hasAvatar,
    reasons
  };
}

module.exports = {
  handleVerifyCommand,
  runScanDiagnostics
};
