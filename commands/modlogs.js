const { EmbedBuilder } = require("discord.js");

async function findMember(message, args) {
  const mention = message.mentions.members.first();
  if (mention) return mention;

  const input = args.join(" ").trim();
  if (!input) return null;

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
  const data = getGuildData(message.guild.id);

  const member = await findMember(message, args);
  if (!member) {
    return message.reply(`Usage: \`${prefix}modlogs @user\` / \`${prefix}modlogs username\` / \`${prefix}modlogs userID\``);
  }

  const warnings = data.warnings?.[member.id] || [];

  const recent = warnings.length
    ? warnings
        .slice(-10)
        .reverse()
        .map((w, i) => {
          const date = w.date ? new Date(w.date).toLocaleString() : "Unknown date";
          return `**Case ${warnings.length - i}**\n**Type:** Warn\n**Moderator:** <@${w.mod}>\n**Reason:** ${w.reason}\n**Date:** ${date}`;
        })
        .join("\n\n")
    : "No warnings found.";

  const embed = new EmbedBuilder()
    .setTitle(`Modlogs for ${member.user.tag}`)
    .setColor(0x5865f2)
    .setDescription(recent.slice(0, 4000))
    .addFields(
      { name: "Total Warns", value: `${warnings.length}`, inline: true }
    )
    .setFooter({ text: "Showing last 10 cases" })
    .setTimestamp();

  return message.reply({ embeds: [embed] });
}

module.exports = {
  handleModLogsCommand
};