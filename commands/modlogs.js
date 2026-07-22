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
  const userCases = guildData.cases.filter(c => c.userId === target.id);

  if (!userCases.length) {
    const cleanEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle(`🛡️ Modlogs • ${target.user.tag}`)
      .setDescription("✅ **Clean Record!** No moderation history recorded for this user.")
      .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
      .setFooter({ text: `ID: ${target.id} • Donquixote Store` })
      .setTimestamp();

    return message.reply({ embeds: [cleanEmbed] });
  }

  // Count types
  const warns = userCases.filter(c => c.type === "warn" && c.active).length;
  const mutes = userCases.filter(c => c.type === "mute").length;
  const bans = userCases.filter(c => c.type === "ban").length;

  // Format last 5 cases cleanly
  const formattedCases = userCases
    .slice(-5)
    .reverse()
    .map(c => {
      const ts = Math.floor(new Date(c.createdAt).getTime() / 1000);
      const status = c.active ? "🔴 Active" : "🟢 Cleared";
      return `**Case #${c.id}** [${c.type.toUpperCase()}] • ${status}\n└ **Reason:** ${c.reason}\n└ **Mod:** <@${c.moderatorId}>\n└ **Date:** <t:${ts}:R>`;
    })
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(warns > 0 ? "#ED4245" : "#5865F2")
    .setAuthor({ name: `Moderation History: ${target.user.tag}`, iconURL: target.user.displayAvatarURL() })
    .setThumbnail(target.user.displayAvatarURL({ forceStatic: false }))
    .addFields(
      { name: "📊 Infraction Summary", value: `• **Active Warns:** \`${warns}\`\n• **Total Mutes:** \`${mutes}\`\n• **Bans Issued:** \`${bans}\``, inline: false },
      { name: "📜 Recent Cases (Max 5)", value: formattedCases || "No active cases.", inline: false }
    )
    .setFooter({ text: `Target ID: ${target.id} • Donquixote Store Mod Engine` })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleModLogsCommand
};
