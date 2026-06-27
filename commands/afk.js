const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Global AFKs
const globalAfkUsers = new Map();

// Server-specific AFKs
const serverAfkUsers = new Map();

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

async function handleAfkCommand(message, args) {

  const reason = args.join(" ").trim() || "AFK";

  const member = message.member;

  const oldNickname = member.nickname || null;

  afkUsers.set(message.author.id, {
    reason,
    since: Date.now(),
    pings: [],
    oldNickname
  });

  // AFK nickname
  if (
    message.guild.members.me.permissions.has(
      PermissionsBitField.Flags.ManageNicknames
    ) &&
    member.manageable
  ) {

    const base =
      member.nickname ||
      member.user.globalName ||
      member.user.username;

    const clean = base.replace(/^\[AFK\]\s*/i, "");

    const newNick = `[AFK] ${clean}`.slice(0, 32);

    await member.setNickname(newNick).catch(() => null);
  }

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0xfacc15)
        .setDescription(
          `🌙 **${message.author.username} is AFK** — ${reason}`
        )
    ],
    allowedMentions: {
      parse: []
    }
  }).catch(() => null);
}

async function handleAfkMentionsAndReturn(message, prefix) {

  if (!message.guild || message.author.bot) return;

  const authorAfk = afkUsers.get(message.author.id);

  // ================= RETURN =================
  if (
    authorAfk &&
    !message.content.startsWith(`${prefix}afk`)
  ) {

    afkUsers.delete(message.author.id);

    const awayFor = formatDuration(
      Date.now() - authorAfk.since
    );

    // restore nickname
    if (
      message.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageNicknames
      ) &&
      message.member.manageable
    ) {

      await message.member
        .setNickname(
          authorAfk.oldNickname || null,
          "User returned from AFK"
        )
        .catch(() => null);
    }

    // ping history
    let pingList = "NO ONE PINGED U - CRY ABOUT IT";

    if (authorAfk.pings.length > 0) {

      pingList = authorAfk.pings
        .slice(-10)
        .map(
          (p, i) =>
            `${i + 1}. ${p.authorTag} — [jump to message](${p.url})`
        )
        .join("\n")
        .slice(0, 1000);
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setAuthor({
            name: `${message.member.displayName} is back`,
            iconURL: message.author.displayAvatarURL()
          })
          .setDescription(
            `welcome back\n` +
            `⏱️ AFK for: ${awayFor}\n` +
            `💬 Reason: ${authorAfk.reason}`
          )
          .addFields({
            name: "📬 Who pinged you",
            value: pingList
          })
          .setTimestamp()
      ],
      allowedMentions: {
        parse: []
      }
    }).catch(() => null);
  }

  // ================= MENTION AFK USER =================
  for (const user of message.mentions.users.values()) {

    const data = afkUsers.get(user.id);

    if (!data) continue;

    const awayFor = formatDuration(
      Date.now() - data.since
    );

    // save ping
    data.pings.push({
      authorTag: message.author.tag,
      url: message.url,
      time: Date.now()
    });

    // limit history
    if (data.pings.length > 20) {
      data.pings.shift();
    }

    await message.reply({
      content:
        `🌙 ${user.username} is AFK — ${data.reason}\n⏱️ Away for: ${awayFor}`,
      allowedMentions: {
        parse: []
      }
    }).catch(() => null);
  }
}

module.exports = {
  handleAfkCommand,
  handleAfkMentionsAndReturn
};
