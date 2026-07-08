const { EmbedBuilder, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

/**
 * Main handler routing all ?verify controls
 */
async function handleVerifyCommand(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  
  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return message.reply("❌ You need `Manage Server` permissions to use verification configurations.");
  }

  const subCommand = (args[0] || "").toLowerCase();

  // 1. ?verify verifiedrole / unverifiedrole / trusteddays
  if (subCommand === "verifiedrole") {
    const role = message.mentions.roles.first() || message.guild.roles.roles.cache.get(args[1]);
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

  // 2. Dashboard Settings Panel
  if (subCommand === "settings" || !subCommand) {
    if (subCommand !== "massscan") {
      const config = data.verification;
      const embed = new EmbedBuilder()
        .setTitle("🛡️ Verification Suite Settings")
        .setColor(0x5865f2)
        .addFields(
          { name: "Verified Role", value: config.verifiedRole ? `<@&${config.verifiedRole}>` : "❌ None", inline: true },
          { name: "Unverified Role", value: config.unverifiedRole ? `<@&${config.unverifiedRole}>` : "❌ None", inline: true },
          { name: "Min Account Age", value: `\`${config.trustedDays} Days\``, inline: true }
        )
        .setFooter({ text: `Type ${prefix}verify massscan to execute a deep audit.` });
      return message.reply({ embeds: [embed] });
    }
  }

  // 3. ?verify massscan (COMPRESSED + INTERACTIVE PAGINATION EDITION)
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

    // Pagination chunking configurations (10 compressed records per page view)
    const itemsPerPage = 10;
    const totalPages = Math.ceil(flaggedAlts.length / itemsPerPage);
    let currentPage = 1;

    // Helper to generate custom compressed block pages
    const generatePageEmbed = (page) => {
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const pageItems = flaggedAlts.slice(start, end);

      // Create a super compact row structure 
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

    // Build pagination navigation row
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

    // Push first page print layout out
    await statusMessage.edit({
      content: "✅ Scan complete.",
      embeds: [generatePageEmbed(currentPage)],
      components: [getRow(currentPage)]
    });

    // Create a temporary live collector stream targeting button updates (lasts 5 minutes)
    const collector = statusMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000 
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "prev_page") {
        currentPage--;
      } else if (interaction.customId === "next_page") {
        currentPage++;
      }

      await interaction.update({
        embeds: [generatePageEmbed(currentPage)],
        components: [getRow(currentPage)]
      });
    });

    collector.on("end", () => {
      // Clean up buttons and strip them out when interaction session expires
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
    reasons.push(`${Math.floor(accountAgeDays)}d old`);
  } else if (accountAgeDays < 30) {
    riskScore += 20;
    reasons.push("Under 30d old");
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
