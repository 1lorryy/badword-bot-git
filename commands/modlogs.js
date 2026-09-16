const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "moderation-data.json");

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
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

async function handleModLogsCommand(message, args, prefix) {
  const target = await findMember(message, args);
  if (!target) {
    return message.reply(`💡 **Usage:** \`${prefix}modlogs [@user / ID / username]\``);
  }

  const fileData = loadData();
  const guildData = fileData[message.guild.id] || { cases: [] };
  const allCases = guildData.cases || [];

  // Cases received by this user
  const userCases = allCases.filter(c => c.userId === target.id);
  
  // Cases issued by this user (as a staff member/moderator)
  const modCases = allCases.filter(c => c.moderatorId === target.id);

  // If no infractions received and no mod actions performed
  if (!userCases.length && !modCases.length) {
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

  // 1. Infractions Received Section
  if (userCases.length) {
    const warns = userCases.filter(c => c.type === "warn" && c.active).length;
    const mutes = userCases.filter(c => c.type === "mute").length;
    const bans = userCases.filter(c => c.type === "ban").length;

    const formattedUserCases = userCases
      .slice(-3)
      .reverse()
      .map(c => {
        const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
        const status = c.active ? "🔴 Active" : "🟢 Cleared";
        return `**Case #${c.id}** [${c.type.toUpperCase()}] • ${status}\n└ **Reason:** ${c.reason}\n└ **Mod:** <@${c.moderatorId}>\n└ **Date:** <t:${ts}:R>`;
      })
      .join("\n\n");

    embed.setColor(warns > 0 ? "#ED4245" : "#5865F2");
    embed.addFields(
      { name: "📥 Infractions Received", value: `• **Active Warns:** \`${warns}\` | **Mutes:** \`${mutes}\` | **Bans:** \`${bans}\``, inline: false },
      { name: "📜 Recent Received Cases", value: formattedUserCases, inline: false }
    );
  } else {
    embed.setColor("#5865F2");
    embed.addFields({ name: "📥 Infractions Received", value: "✅ Clean (0 infractions on record)", inline: false });
  }

  // 2. Staff Moderation Activity Section (Actions Executed)
  if (modCases.length) {
    const warnsGiven = modCases.filter(c => c.type === "warn").length;
    const mutesGiven = modCases.filter(c => c.type === "mute").length;
    const bansGiven = modCases.filter(c => c.type === "ban").length;

    const formattedModCases = modCases
      .slice(-5)
      .reverse()
      .map(c => {
        const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
        return `**Case #${c.id}** [${c.type.toUpperCase()}]\n└ **Target:** <@${c.userId}>\n└ **Reason:** ${c.reason}\n└ **Date:** <t:${ts}:R>`;
      })
      .join("\n\n");

    embed.addFields(
      { name: "🛠️ Staff Moderation Activity", value: `• **Warns Issued:** \`${warnsGiven}\` | **Mutes Issued:** \`${mutesGiven}\` | **Bans Issued:** \`${bansGiven}\``, inline: false },
      { name: "📜 Actions Executed by Mod (Max 5)", value: formattedModCases, inline: false }
    );
  }

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleModLogsCommand
};
