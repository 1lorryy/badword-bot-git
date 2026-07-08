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
    // If they typed "?verify massscan" instead of settings, bypass this
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

  // 5. ?verify massscan (BRAND NEW DEEP AUDIT ENGINE)
  if (subCommand === "massscan") {
    const statusMessage = await message.reply("🔄 Fetching and scanning server directory... Please wait.");
    
    // Make sure we have all guild members cached
    await message.guild.members.fetch().catch(() => {});
    const members = message.guild.members.cache;

    let totalScanned = 0;
    let flaggedAlts = [];
    let unverifiedBots = [];
    
    members.forEach((member) => {
      if (member.user.bot) {
        // Track unverified bots (bots that don't have an explicit administrator or verified role if you want to inspect them)
        if (data.verification.verifiedRole && !member.roles.cache.has(data.verification.verifiedRole)) {
          unverifiedBots.push(member);
        }
        return;
      }

      totalScanned++;
      const diagnostics = runScanDiagnostics(member, data.verification);
      
      if (diagnostics.riskScore >= 40) {
        flaggedAlts.push({
          member,
          score: diagnostics.riskScore,
          reason: diagnostics.reasons.join(", ")
        });
      }
    });

    // Sort alts by highest risk factor score first
    flaggedAlts.sort((a, b) => b.score - a.score);

    const embed = new EmbedBuilder()
      .setTitle("🚨 Server Security Risk Audit Report")
      .setColor(flaggedAlts.length > 0 ? 0xef4444 : 0x22c55e)
      .setDescription(`Successfully analyzed **${totalScanned}** humans and **${members.size - totalScanned}** bots.`)
      .setTimestamp();

    if (flaggedAlts.length > 0) {
      // Get top 10 highest risk accounts to prevent embed length errors
      const topFlags = flaggedAlts.slice(0, 10);
      let listString = topFlags.map(f => `• ${f.member} (\`${f.member.user.tag}\`)\n  **Risk:** \`${f.score}%\` | *${f.reason}*`).join("\n\n");
      
      if (flaggedAlts.length > 10) {
        listString += `\n\n...and **${flaggedAlts.length - 10}** more suspicious targets flagged below a 40% threshold.`;
      }
      
      embed.addFields({ name: `⚠️ Flagged High-Risk Accounts (${flaggedAlts.length} total)`, value: listString });
    } else {
      embed.addFields({ name: "⚠️ Flagged High-Risk Accounts", value: "✅ Clean sweep! No suspicious alts or new accounts met threat criteria thresholds." });
    }

    if (unverifiedBots.length > 0) {
      embed.addFields({ name: `🤖 Total Bots Found`, value: `Detected **${unverifiedBots.length}** bot applications configured inside guild roles.` });
    }

    return statusMessage.edit({ content: "✅ Scan complete.", embeds: [embed] });
  }

  // 6. ?verify scan @user (Single diagnostic scanner)
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

  // 1. Check strict age barrier
  if (accountAgeDays < config.trustedDays) {
    riskScore += 50; 
    reasons.push(`New Account (${Math.floor(accountAgeDays)}d old)`);
  } else if (accountAgeDays < 30) {
    riskScore += 20;
    reasons.push("Account under 30 days old");
  }

  // 2. Check profile design aesthetics (Alts rarely set custom avatars right away)
  if (!hasAvatar) {
    riskScore += 25;
    reasons.push("Default Avatar");
  }

  // 3. Username patterns (Regex checking for common gibberish / randomized text spammers)
  const username = member.user.username;
  const hasRandomGibberish = /^[a-z0-9]{8,12}$/i.test(username) && !/[aeiou]/i.test(username);
  const consecutiveNumbers = /\d{4,}/.test(username);

  if (hasRandomGibberish || consecutiveNumbers) {
    riskScore += 25;
    reasons.push("Suspicious name layout");
  }

  return {
    riskScore: Math.min(riskScore, 100), // Cap max threat value at 100%
    hasAvatar,
    reasons
  };
}

module.exports = {
  handleVerifyCommand,
  runScanDiagnostics
};
