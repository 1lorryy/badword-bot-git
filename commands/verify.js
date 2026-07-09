const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

/**
 * Advanced Multi-Factor Diagnostics Engine
 */
function runScanDiagnostics(member, config) {
  const accountAgeDays = (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
  const hasAvatar = member.user.avatar !== null;
  
  let riskScore = 0;
  let reasons = [];

  // Account age thresholds
  if (accountAgeDays < (config.trustedDays || 7)) {
    riskScore += 50; 
    reasons.push(`${Math.floor(accountAgeDays)}d old`);
  } else if (accountAgeDays < 30) {
    riskScore += 20;
    reasons.push("Under 30d old");
  }

  // Avatar validation
  if (!hasAvatar) {
    riskScore += 25;
    reasons.push("Default Avatar");
  }

  // Name layout validation
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

/**
 * Main handler routing all ?verify controls
 */
async function handleVerifyCommand(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return message.reply("❌ You need `Manage Server` permissions to use verification configurations.");
  }

  const subCommand = (args[0] || "").toLowerCase();

  // 1. Core Config Subcommands
  if (subCommand === "verifiedrole") {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!role) return message.reply(`Usage: \`${prefix}verify verifiedrole @role\``);
    data.verification.verifiedRole = role.id;
    saveData();
    return message.reply(`✅ Verified role set to: **${role.name}**`);
  }

  if (subCommand === "unverifiedrole") {
    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
    if (!role) return message.reply(`Usage: \`${prefix}verify unverifiedrole @role\``);
    data.verification.unverifiedRole = role.id;
    saveData();
    return message.reply(`✅ Unverified tracker role set to: **${role.name}**`);
  }

  if (subCommand === "trusteddays") {
    const days = parseInt(args[1], 10);
    if (isNaN(days) || days < 0) return message.reply(`Usage: \`${prefix}verify trusteddays <days>\``);
    data.verification.trustedDays = days;
    saveData();
    return message.reply(`✅ Minimum age threshold adjusted to **${days}** days.`);
  }

  if (subCommand === "autokick") {
    data.verification.autokick = !data.verification.autokick;
    if (data.verification.autokick) data.verification.autoban = false; // Turn off autoban if autokick is enabled
    saveData();
    return message.reply(`🛡️ **Auto-Kick for untrusted accounts:** ${data.verification.autokick ? "🟩 ENABLED" : "🟥 DISABLED"}`);
  }

  if (subCommand === "autoban") {
    data.verification.autoban = !data.verification.autoban;
    if (data.verification.autoban) data.verification.autokick = false; // Turn off autokick if autoban is enabled
    saveData();
    return message.reply(`🔨 **Auto-Ban for untrusted accounts:** ${data.verification.autoban ? "🟩 ENABLED" : "🟥 DISABLED"}`);
  }

  // 2. Full Help & Dashboard Setup Layout
  if (subCommand === "settings" || !subCommand) {
    if (subCommand !== "massscan" && subCommand !== "scan") {
      const config = data.verification;
      
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Verification & Anti-Raid Manual")
        .setColor(0x5865f2)
        .setDescription(
          `**Current Status Panel:**\n` +
          `• Verified Role: ${config.verifiedRole ? `<@&${config.verifiedRole}>` : "❌ None"}\n` +
          `• Unverified Role: ${config.unverifiedRole ? `<@&${config.unverifiedRole}>` : "❌ None"}\n` +
          `• Min Account Age: \`${config.trustedDays || 7} Days\`\n` +
          `• Auto-Kick Raider Alts: ${config.autokick ? "🟩 **Enabled**" : "🟥 **Disabled**"}\n` +
          `• Auto-Ban Raider Alts: ${config.autoban ? "🟩 **Enabled**" : "🟥 **Disabled**"}\n\n` +
          `⚙️ **How to configure / Full Command List:**\n` +
          `\`${prefix}verify verifiedrole @role\`\n└ Sets final verification role.\n\n` +
          `\`${prefix}verify unverifiedrole @role\`\n└ Sets unverified jail holding role.\n\n` +
          `\`${prefix}verify trusteddays <days>\`\n└ Sets flag threshold limit (e.g. \`30\`).\n\n` +
          `\`${prefix}verify autokick\`\n└ Toggles active instant-kick on joining alts.\n\n` +
          `\`${prefix}verify autoban\`\n└ Toggles active permanent-ban on joining alts.\n\n` +
          `\`${prefix}verify scan @user\`\n└ Audits a specific user profile instantly.\n\n` +
          `\`${prefix}verify massscan\`\n└ Audits full server database directory for hidden alts.`
        )
        .setFooter({ text: `Don Bot Security Systems` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }
  }

  // 3. ?verify massscan (Interactive Pagination)
  if (subCommand === "massscan") {
    const progressEmbed = new EmbedBuilder()
      .setTitle("🔄 Live Security Directory Scan")
      .setColor(0x3498db)
      .setDescription("Re-indexing server cache structures...")
      .setTimestamp();

    const statusMessage = await message.reply({ embeds: [progressEmbed] });
    
    await message.guild.members.fetch().catch(() => {});
    const members = Array.from(message.guild.members.cache.values());
    const totalMembers = members.length;

    let flaggedAlts = [];
    let botCount = 0;
    let processedCount = 0;
    const updateInterval = 40; 

    for (let i = 0; i < totalMembers; i++) {
      const member = members[i];
      processedCount++;

      if (member.user.bot) {
        botCount++;
        continue;
      }

      const diagnostics = runScanDiagnostics(member, data.verification);
      if (diagnostics.riskScore >= 40) {
        flaggedAlts.push({
          mention: `<@${member.id}>`,
          tag: member.user.username,
          score: diagnostics.riskScore,
          reason: diagnostics.reasons.join(", ")
        });
      }

      if (processedCount % updateInterval === 0 || processedCount === totalMembers) {
        progressEmbed.setDescription(`Auditing accounts: **${processedCount}**/**${totalMembers}** processed.\nDetected **${flaggedAlts.length}** high-risk entries...`);
        await statusMessage.edit({ embeds: [progressEmbed] }).catch(() => {});
      }
    }

    flaggedAlts.sort((a, b) => b.score - a.score);

    if (flaggedAlts.length === 0) {
      const cleanEmbed = new EmbedBuilder()
        .setTitle("🚨 Server Security Risk Audit Report")
        .setColor(0x22c55e)
        .setDescription("✅ **Clean sweep!** No malicious footprints or alt profiles met risk thresholds.");
      return statusMessage.edit({ embeds: [cleanEmbed] });
    }

    const itemsPerPage = 10;
    const totalPages = Math.ceil(flaggedAlts.length / itemsPerPage);
    let currentPage = 1;

    const generatePageEmbed = (page) => {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageItems = flaggedAlts.slice(start, end);

      let tableRows = pageItems.map(item => 
        `\`[${item.score}%]\` ${item.mention} (\`${item.tag}\`)\n└ *${item.reason}*`
      ).join("\n");

      return new EmbedBuilder()
        .setTitle("🚨 Server Security Risk Audit Report")
        .setColor(0xef4444)
        .setDescription(`Audited **${processedCount - botCount}** users. Found **${flaggedAlts.length}** targets.\n\n${tableRows}`)
        .setFooter({ text: `Page ${page} of ${totalPages} • High Risk Detection Vector` })
        .setTimestamp();
    };

    const getRow = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("⏪ Back")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 1),
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("Forward ⏩")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages)
      );
    };

    await statusMessage.edit({
      content: "✅ Scan complete.",
      embeds: [generatePageEmbed(currentPage)],
      components: [getRow(currentPage)]
    });

    const collector = statusMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000 
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "prev_page") currentPage--;
      else if (interaction.customId === "next_page") currentPage++;

      await interaction.update({
        embeds: [generatePageEmbed(currentPage)],
        components: [getRow(currentPage)]
      });
    });

    collector.on("end", () => {
      statusMessage.edit({ components: [] }).catch(() => {});
    });
    return;
  }

  // 4. ?verify scan @user
  if (subCommand === "scan") {
    const targetInput = args[1];
    if (!targetInput) return message.reply(`Usage: \`${prefix}verify scan @user\``);

    const targetId = targetInput.replace(/[<@!>]/g, "");
    const member = await message.guild.members.fetch(targetId).catch(() => null);
    if (!member) return message.reply("❌ Target profile not found.");

    const evaluation = runScanDiagnostics(member, data.verification);
    const embed = new EmbedBuilder()
      .setTitle(`🔍 Diagnostic Profile: ${member.user.tag}`)
      .setColor(evaluation.riskScore >= 40 ? 0xef4444 : 0x22c55e)
      .addFields(
        { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: "Risk Assessment Rating", value: `**${evaluation.riskScore}% Threat Rating**\nReasons: *${evaluation.reasons.join(", ") || "None"}*`, inline: false }
      );
    return message.reply({ embeds: [embed] });
  }
}

module.exports = {
  handleVerifyCommand,
  runScanDiagnostics
};
