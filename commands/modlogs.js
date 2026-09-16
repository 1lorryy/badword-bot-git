const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require("discord.js");
const fs = require("fs");
const path = require("path");

function loadMergedData() {
  const merged = { warnings: {}, cases: [], modStats: {} };
  const possibleFiles = ["data.json", "moderation-data.json"];

  for (const file of possibleFiles) {
    try {
      const filePath = path.join(__dirname, "..", file);
      if (fs.existsSync(filePath)) {
        const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));

        const extractData = (obj) => {
          if (!obj || typeof obj !== "object") return;

          // Merge warning arrays
          if (obj.warnings && typeof obj.warnings === "object") {
            for (const uId in obj.warnings) {
              if (Array.isArray(obj.warnings[uId])) {
                merged.warnings[uId] = (merged.warnings[uId] || []).concat(obj.warnings[uId]);
              }
            }
          }

          // Merge modStats counters
          if (obj.modStats && typeof obj.modStats === "object") {
            Object.assign(merged.modStats, obj.modStats);
          }

          // Collect all case arrays
          ["cases", "actions", "modlogs", "history", "mutes", "bans", "kicks"].forEach(key => {
            if (Array.isArray(obj[key])) {
              merged.cases.push(...obj[key]);
            }
          });
        };

        extractData(raw);
        for (const key in raw) {
          if (raw[key] && typeof raw[key] === "object") {
            extractData(raw[key]);
          }
        }
      }
    } catch (err) {
      // Ignore file reading errors
    }
  }
  return merged;
}

function getModId(item) {
  return String(
    item.mod ||
    item.moderatorId ||
    item.moderator ||
    item.executorId ||
    item.executor ||
    item.staffId ||
    item.staff ||
    item.authorId ||
    item.author ||
    ""
  );
}

function getTargetId(item) {
  return String(
    item.userId ||
    item.targetId ||
    item.user ||
    item.target ||
    ""
  );
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

  const fileData = loadMergedData();

  if (typeof getGuildData === "function") {
    const runtimeData = getGuildData(message.guild.id) || {};
    if (runtimeData.warnings) {
      for (const uId in runtimeData.warnings) {
        if (Array.isArray(runtimeData.warnings[uId])) {
          fileData.warnings[uId] = (fileData.warnings[uId] || []).concat(runtimeData.warnings[uId]);
        }
      }
    }
    if (runtimeData.modStats) {
      Object.assign(fileData.modStats, runtimeData.modStats);
    }
    ["cases", "actions", "modlogs", "history", "mutes", "bans", "kicks"].forEach(key => {
      if (Array.isArray(runtimeData[key])) {
        fileData.cases.push(...runtimeData[key]);
      }
    });
  }

  // Get raw counts from modStats object
  const rawModStats = fileData.modStats[target.id] || { warns: 0, mutes: 0, kicks: 0, bans: 0 };
  const totalModStatsCount = (rawModStats.warns || 0) + (rawModStats.mutes || 0) + (rawModStats.kicks || 0) + (rawModStats.bans || 0);

  const allRecords = [];
  const seenCaseKeys = new Set();

  // 1. Infractions Received
  const userWarns = fileData.warnings[target.id] || [];
  userWarns.forEach(w => {
    const key = `rec_warn_${w.id || w.date || Math.random()}`;
    if (!seenCaseKeys.has(key)) {
      seenCaseKeys.add(key);
      allRecords.push({
        kind: "RECEIVED",
        id: w.id || "N/A",
        type: (w.type || "WARN").toUpperCase(),
        reason: w.reason || "No reason provided",
        mod: getModId(w) || "Unknown",
        date: w.date || w.createdAt
      });
    }
  });

  fileData.cases.forEach(c => {
    if (getTargetId(c) === target.id) {
      const key = `rec_case_${c.id || c.createdAt || Math.random()}`;
      if (!seenCaseKeys.has(key)) {
        seenCaseKeys.add(key);
        allRecords.push({
          kind: "RECEIVED",
          id: c.id || "N/A",
          type: (c.type || "ACTION").toUpperCase(),
          reason: c.reason || "No reason provided",
          mod: getModId(c) || "Unknown",
          date: c.createdAt || c.date
        });
      }
    }
  });

  // 2. Actions Executed as Staff
  for (const uId in fileData.warnings) {
    const warnsList = fileData.warnings[uId];
    if (Array.isArray(warnsList)) {
      warnsList.forEach(w => {
        if (getModId(w) === target.id) {
          const key = `iss_warn_${w.id || w.date || Math.random()}`;
          if (!seenCaseKeys.has(key)) {
            seenCaseKeys.add(key);
            allRecords.push({
              kind: "ISSUED",
              id: w.id || "N/A",
              type: (w.type || "WARN").toUpperCase(),
              targetId: uId,
              reason: w.reason || "No reason provided",
              date: w.date || w.createdAt
            });
          }
        }
      });
    }
  }

  fileData.cases.forEach(c => {
    if (getModId(c) === target.id) {
      const key = `iss_case_${c.id || c.createdAt || Math.random()}`;
      if (!seenCaseKeys.has(key)) {
        seenCaseKeys.add(key);
        allRecords.push({
          kind: "ISSUED",
          id: c.id || "N/A",
          type: (c.type || "ACTION").toUpperCase(),
          targetId: getTargetId(c),
          reason: c.reason || "No reason provided",
          date: c.createdAt || c.date
        });
      }
    }
  });

  const receivedCount = allRecords.filter(r => r.kind === "RECEIVED").length;
  const loggedIssuedCount = allRecords.filter(r => r.kind === "ISSUED").length;
  
  // Use modStats total if higher than logged cases
  const totalIssuedDisplay = Math.max(loggedIssuedCount, totalModStatsCount);

  if (allRecords.length === 0 && totalIssuedDisplay === 0) {
    const cleanEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🛡️ Modlogs • ${target.user.tag}`)
      .setDescription("✅ **Clean Record!** No infractions received or moderation actions issued by this user.")
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({ text: `ID: ${target.id} • Donquixote Store` })
      .setTimestamp();

    return message.reply({ embeds: [cleanEmbed] });
  }

  allRecords.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

  const ITEMS_PER_PAGE = 4;
  const totalPages = Math.max(1, Math.ceil(allRecords.length / ITEMS_PER_PAGE));
  let currentPage = 0;

  const buildEmbed = (page) => {
    const start = page * ITEMS_PER_PAGE;
    const pageItems = allRecords.slice(start, start + ITEMS_PER_PAGE);

    let formattedList = pageItems.map(item => {
      const ts = item.date ? Math.floor(new Date(item.date).getTime() / 1000) : null;
      const timeStr = ts ? `<t:${ts}:R>` : "Recently";

      if (item.kind === "RECEIVED") {
        return `📥 **Case #${item.id}** [${item.type}]\n└ **Reason:** ${item.reason}\n└ **Mod:** <@${item.mod}>\n└ **Date:** ${timeStr}`;
      } else {
        return `🛠️ **Case #${item.id}** [${item.type}]\n└ **Target:** <@${item.targetId}>\n└ **Reason:** ${item.reason}\n└ **Date:** ${timeStr}`;
      }
    }).join("\n\n");

    if (!formattedList) {
      formattedList = "_No detailed case logs available for older counter stats._";
    }

    const breakdownStr = totalModStatsCount > 0 
      ? `\n└ **Stats Breakdown:** \`${rawModStats.warns || 0}\` Warns • \`${rawModStats.mutes || 0}\` Mutes • \`${rawModStats.kicks || 0}\` Kicks • \`${rawModStats.bans || 0}\` Bans`
      : "";

    return new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({ name: `Moderation History: ${target.user.tag}`, iconURL: target.user.displayAvatarURL() })
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setDescription(`**Summary:** Received \`${receivedCount}\` infraction(s) • Issued \`${totalIssuedDisplay}\` action(s)${breakdownStr}\n\n${formattedList}`)
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
    time: 120000
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
