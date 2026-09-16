const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
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
        
        if (raw.warnings) Object.assign(merged.warnings, raw.warnings);
        
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

  const fileData = loadData();
  if (typeof getGuildData === "function") {
    const runtimeData = getGuildData(message.guild.id) || {};
    if (runtimeData.warnings) Object.assign(fileData.warnings, runtimeData.warnings);
    if (Array.isArray(runtimeData.cases)) fileData.cases.push(...runtimeData.cases);
  }

  const allRecords = [];

  // 1. Gather Infractions Received by Target
  const receivedWarns = fileData.warnings[target.id] || [];
  receivedWarns.forEach(w => {
    allRecords.push({
      kind: "RECEIVED",
      id: w.id || "N/A",
      type: (w.type || "WARN").toUpperCase(),
      reason: w.reason || "No reason provided",
      mod: w.mod || w.moderatorId || "Unknown",
      date: w.date || w.createdAt
    });
  });

  const receivedCases = fileData.cases.filter(c => c.userId === target.id);
  receivedCases.forEach(c => {
    allRecords.push({
      kind: "RECEIVED",
      id: c.id || "N/A",
      type: (c.type || "ACTION").toUpperCase(),
      reason: c.reason || "No reason provided",
      mod: c.moderatorId || c.mod || "Unknown",
      date: c.createdAt || c.date
    });
  });

  // 2. Gather Actions Executed by Target as Staff/Mod
  for (const uId in fileData.warnings) {
    const userWarns = fileData.warnings[uId];
    if (Array.isArray(userWarns)) {
      userWarns.forEach(w => {
        if (String(w.mod) === String(target.id) || String(w.moderatorId) === String(target.id)) {
          allRecords.push({
            kind: "ISSUED",
            id: w.id || "N/A",
            type: (w.type || "WARN").toUpperCase(),
            targetId: uId,
            reason: w.reason || "No reason provided",
            date: w.date || w.createdAt
          });
        }
      });
    }
  }

  const issuedCases = fileData.cases.filter(c => String(c.moderatorId || c.mod) === String(target.id));
  issuedCases.forEach(c => {
    allRecords.push({
      kind: "ISSUED",
      id: c.id || "N/A",
      type: (c.type || "ACTION").toUpperCase(),
      targetId: c.userId,
      reason: c.reason || "No reason provided",
      date: c.createdAt || c.date
    });
  });

  // Clean Record Check
  if (allRecords.length === 0) {
    const cleanEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🛡️ Modlogs • ${target.user.tag}`)
      .setDescription("✅ **Clean Record!** No infractions received or moderation actions issued by this user.")
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({ text: `ID: ${target.id} • Donquixote Store` })
      .setTimestamp();

    return message.reply({ embeds: [cleanEmbed] });
  }

  // Sort newest first
  allRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  // Pagination Settings
  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.ceil(allRecords.length / ITEMS_PER_PAGE);
  let currentPage = 0;

  const buildEmbed = (page) => {
    const start = page * ITEMS_PER_PAGE;
    const pageItems = allRecords.slice(start, start + ITEMS_PER_PAGE);

    const formattedList = pageItems.map(item => {
      const ts = item.date ? Math.floor(new Date(item.date).getTime() / 1000) : null;
      const timeStr = ts ? `<t:${ts}:R>` : "Recently";

      if (item.kind === "RECEIVED") {
        return `📥 **Case #${item.id}** [${item.type}]\n└ **Reason:** ${item.reason}\n└ **Mod:** <@${item.mod}>\n└ **Date:** ${timeStr}`;
      } else {
        return `🛠️ **Case #${item.id}** [${item.type}]\n└ **Target:** <@${item.targetId}>\n└ **Reason:** ${item.reason}\n└ **Date:** ${timeStr}`;
      }
    }).join("\n\n");

    const receivedCount = allRecords.filter(r => r.kind === "RECEIVED").length;
    const issuedCount = allRecords.filter(r => r.kind === "ISSUED").length;

    return new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({ name: `Moderation History: ${target.user.tag}`, iconURL: target.user.displayAvatarURL() })
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setDescription(`**Summary:** Received \`${receivedCount}\` infraction(s) • Issued \`${issuedCount}\` action(s)\n\n${formattedList}`)
      .setFooter({ text: `Target ID: ${target.id} • Page ${page + 1} of ${totalPages} • Donquixote Store` })
      .setTimestamp();
  };

  const buildButtons = (page) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("modlogs_prev")
        .setLabel("◀ Previous")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === 0),
      new ButtonBuilder()
        .setCustomId("modlogs_page")
        .setLabel(`${page + 1} / ${totalPages}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("modlogs_next")
        .setLabel("Next ▶")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(page === totalPages - 1)
    );
  };

  const replyMsg = await message.reply({
    embeds: [buildEmbed(currentPage)],
    components: totalPages > 1 ? [buildButtons(currentPage)] : []
  });

  if (totalPages <= 1) return;

  const collector = replyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 120000 // 2 minutes active
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== message.author.id) {
      return interaction.reply({ content: "❌ You cannot control this page.", ephemeral: true });
    }

    if (interaction.customId === "modlogs_prev" && currentPage > 0) {
      currentPage--;
    } else if (interaction.customId === "modlogs_next" && currentPage < totalPages - 1) {
      currentPage++;
    }

    await interaction.update({
      embeds: [buildEmbed(currentPage)],
      components: [buildButtons(currentPage)]
    });
  });

  collector.on("end", () => {
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("disabled_prev").setLabel("◀ Previous").setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId("disabled_page").setLabel(`${currentPage + 1} / ${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
      new ButtonBuilder().setCustomId("disabled_next").setLabel("Next ▶").setStyle(ButtonStyle.Primary).setDisabled(true)
    );
    replyMsg.edit({ components: [disabledRow] }).catch(() => {});
  });
}

module.exports = {
  handleModLogsCommand
};
