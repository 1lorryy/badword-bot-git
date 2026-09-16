const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

function loadData() {
  const merged = { warnings: {}, cases: [] };
  const possibleFiles = ["data.json", "moderation-data.json"];

  for (const file of possibleFiles) {
    try {
      const filePath = path.join(__dirname, "..", file);
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
        
        // Merge warnings structure
        if (raw.warnings) Object.assign(merged.warnings, raw.warnings);
        
        // Merge guild-specific structures
        for (const key in raw) {
          if (raw[key] && typeof raw[key] === "object") {
            if (raw[key].warnings) Object.assign(merged.warnings, raw[key].warnings);
            if (Array.isArray(raw[key].cases)) merged.cases.push(...raw[key].cases);
          }
        }
        if (Array.isArray(raw.cases)) merged.cases.push(...raw.cases);
      }
    } catch (err) {
      // Continue if a file isn't present
    }
  }
  return merged;
}

async function findMember(message, args) {
  if (!args.length) return message.member;
  
  const mention = message.mentions.members.first();
  if (mention) return mention;

  const input = args.join(" ").trim();
  const byId = await message.guild.members.fetch(input).catch(() => null);
  if (byId) return byId;

  const search = input.toLowerCase();
  return message.guild.members.cache.find(m =>
    m.user.username.toLowerCase() === search ||
    m.displayName.toLowerCase() === search ||
    m.user.tag.toLowerCase() === search
  ) || null;
}

async function handleModLogsCommand(message, args, prefix, getGuildData) {
  const target = await findMember(message, args);
  if (!target) {
    return message.reply(`💡 **Usage:** \`${prefix}modlogs [@user / ID / username]\``);
  }

  // Load merged file data + runtime guild data if available
  const fileData = loadData();
  if (typeof getGuildData === "function") {
    const runtimeData = getGuildData(message.guild.id) || {};
    if (runtimeData.warnings) Object.assign(fileData.warnings, runtimeData.warnings);
    if (Array.isArray(runtimeData.cases)) fileData.cases.push(...runtimeData.cases);
  }

  // 1. Collect Infractions Received by Target
  const receivedWarns = fileData.warnings[target.id] || [];
  const receivedCases = fileData.cases.filter(c => c.userId === target.id);

  // 2. Collect Actions Executed by Target as Staff/Mod
  const issuedWarns = [];
  for (const uId in fileData.warnings) {
    const userWarns = fileData.warnings[uId];
    if (Array.isArray(userWarns)) {
      userWarns.forEach(w => {
        if (String(w.mod) === String(target.id) || String(w.moderatorId) === String(target.id)) {
          issuedWarns.push({ ...w, targetId: uId, type: w.type || "warn" });
        }
      });
    }
  }
  const issuedCases = fileData.cases.filter(c => String(c.moderatorId || c.mod) === String(target.id));

  const totalReceived = receivedWarns.length + receivedCases.length;
  const totalIssued = issuedWarns.length + issuedCases.length;

  if (totalReceived === 0 && totalIssued === 0) {
    const cleanEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🛡️ Modlogs • ${target.user.tag}`)
      .setDescription("✅ **Clean Record!** No infractions received or moderation actions issued by this user.")
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({ text: `ID: ${target.id} • Donquixote Store` })
      .setTimestamp();

    return message.reply({ embeds: [cleanEmbed] });
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: `Moderation Record: ${target.user.tag}`, iconURL: target.user.displayAvatarURL() })
    .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
    .setFooter({ text: `Target ID: ${target.id} • Donquixote Store Mod Engine` })
    .setTimestamp();

  // Infractions Received Section
  if (totalReceived > 0) {
    const formattedReceived = [
      ...receivedWarns.map(w => ({
        id: w.id || "N/A",
        type: (w.type || "WARN").toUpperCase(),
        reason: w.reason || "No reason provided",
        mod: w.mod || w.moderatorId || "Unknown",
        date: w.date || w.createdAt
      })),
      ...receivedCases.map(c => ({
        id: c.id || "N/A",
        type: (c.type || "ACTION").toUpperCase(),
        reason: c.reason || "No reason provided",
        mod: c.moderatorId || c.mod || "Unknown",
        date: c.createdAt || c.date
      }))
    ]
    .slice(-3)
    .reverse()
    .map(c => {
      const ts = c.date ? Math.floor(new Date(c.date).getTime() / 1000) : null;
      const timeStr = ts ? `<t:${ts}:R>` : "Recently";
      return `**Case #${c.id}** [${c.type}]\n└ **Reason:** ${c.reason}\n└ **Mod:** <@${c.mod}>\n└ **Date:** ${timeStr}`;
    })
    .join("\n\n");

    embed.setColor("#ED4245");
    embed.addFields(
      { name: "📥 Infractions Received", value: `• Total Recorded: \`${totalReceived}\``, inline: false },
      { name: "📜 Recent Received Cases", value: formattedReceived || "None", inline: false }
    );
  } else {
    embed.setColor("#5865F2");
    embed.addFields({ name: "📥 Infractions Received", value: "✅ Clean (0 infractions on record)", inline: false });
  }

  // Staff Moderation Activity Section
  if (totalIssued > 0) {
    const formattedIssued = [
      ...issuedWarns.map(w => ({
        id: w.id || "N/A",
        type: (w.type || "WARN").toUpperCase(),
        targetId: w.targetId,
        reason: w.reason || "No reason provided",
        date: w.date || w.createdAt
      })),
      ...issuedCases.map(c => ({
        id: c.id || "N/A",
        type: (c.type || "ACTION").toUpperCase(),
        targetId: c.userId,
        reason: c.reason || "No reason provided",
        date: c.createdAt || c.date
      }))
    ]
    .slice(-5)
    .reverse()
    .map(c => {
      const ts = c.date ? Math.floor(new Date(c.date).getTime() / 1000) : null;
      const timeStr = ts ? `<t:${ts}:R>` : "Recently";
      return `**Case #${c.id}** [${c.type}]\n└ **Target:** <@${c.targetId}>\n└ **Reason:** ${c.reason}\n└ **Date:** ${timeStr}`;
    })
    .join("\n\n");

    embed.addFields(
      { name: "🛠️ Staff Moderation Activity", value: `• Total Actions Executed: \`${totalIssued}\``, inline: false },
      { name: "📜 Actions Executed by Mod (Max 5)", value: formattedIssued || "None", inline: false }
    );
  }

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleModLogsCommand
};
