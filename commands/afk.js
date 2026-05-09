const { EmbedBuilder, PermissionsBitField } = require("discord.js");

const afkUsers = new Map();

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h`;
  if (hr > 0) return `${hr}h ${min % 60}m`;
  if (min > 0) return `${min}m ${sec % 60}s`;
  return `${sec}s`;
}

async function handleAfkCommand(message, args, prefix) {
  const reason = args.join(" ").trim() || "AFK";
  const member = message.member;

  const oldNickname = member.nickname;
  const displayName = member.nickname || member.user.username;

  afkUsers.set(message.author.id, {
    reason,
    since: Date.now(),
    pings: [],
    oldNickname
  });

  if (
    message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) &&
    member.manageable
  ) {
    const cleanName = displayName.replace(/^\[AFK\]\s*/i, "");
    const newNick = `[AFK] ${cleanName}`.slice(0, 32);
    await member.setNickname(newNick, "User went AFK").catch(() => null);
  }

  // This one CAN ping you.
  await message.reply(`${message.author} is now AFK - ${reason}`).catch(() => null);

  return true;
}

async function handleAfkMentionsAndReturn(message, prefix) {
  if (!message.guild || message.author.bot) return;

  const authorAfk = afkUsers.get(message.author.id);

  if (authorAfk && !message.content.startsWith(`${prefix}afk`)) {
    afkUsers.delete(message.author.id);

    const awayFor = formatDuration(Date.now() - authorAfk.since);

    if (
      message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) &&
      message.member.manageable
    ) {
      await message.member.setNickname(authorAfk.oldNickname, "User returned from AFK").catch(() => null);
    }

    const pingList = authorAfk.pings.length
  ? authorAfk.pings
      .map((p, i) => `${i + 1}. ${p.authorTag} — [jump](${p.url})`)
      .join("\n")
      .slice(0, 1000)
  : "NOBODY PINGED U - CRY ABOUT IT";

    await message.reply({
  embeds: [
    new EmbedBuilder()
      .setColor(0x22c55e)
      .setAuthor({
        name: `${message.member.displayName} is back`,
        iconURL: message.author.displayAvatarURL()
      })
      .setDescription(
        `<@${message.author.id}> welcome back!\n` +
        `⏱️ **AFK:** ${awayFor}\n` +
        `💬 **Reason:** ${authorAfk.reason}`
      )
      .addFields(
        {
          name: "📬 Mentions",
          value: pingList.length ? pingList : "NO ONE PINGED U - CRY ABOUT IT",
        }
      )
      .setTimestamp()
  ],
  allowedMentions: { users: [] } // no ping
}).catch(() => null);
  }

  for (const user of message.mentions.users.values()) {
    const data = afkUsers.get(user.id);
    if (!data) continue;

    const awayFor = formatDuration(Date.now() - data.since);

    data.pings.push({
      authorTag: message.author.tag,
      url: message.url,
      time: Date.now()
    });


    const member = message.guild.members.cache.get(user.id);
    const displayName = member ? member.displayName : user.username;

    // This one will NOT ping the AFK person.
    await message.reply({
  content: `<@${user.id}> is AFK for ${awayFor} - ${data.reason}`,
  allowedMentions: { users: [] } // no ping
}).catch(() => null);
  }
}

module.exports = {
  handleAfkCommand,
  handleAfkMentionsAndReturn
};