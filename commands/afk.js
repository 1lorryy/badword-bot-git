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

  // Add AFK nickname
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

  await message.reply({
    content: `💤 ${message.author} is now AFK — ${reason}`,
    allowedMentions: {
      users: []
    }
  });

  return true;
}

async function handleAfkMentionsAndReturn(message, prefix) {
  if (!message.guild || message.author.bot) return;

  // ================= RETURN FROM AFK =================
  const afk = afkUsers.get(message.author.id);

  if (
    afk &&
    !message.content.toLowerCase().startsWith(`${prefix}afk`)
  ) {
    afkUsers.delete(message.author.id);

    // restore nickname
    if (
      message.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageNicknames
      ) &&
      message.member.manageable
    ) {
      await message.member
        .setNickname(afk.oldNickname)
        .catch(() => null);
    }

    const awayFor = formatDuration(
      Date.now() - afk.since
    );

    let pingText = "NOBODY PINGED U - CRY ABOUT IT";

    if (afk.pings.length > 0) {
      pingText = afk.pings
        .slice(-10)
        .map(
          (p, i) =>
            `${i + 1}. ${p.authorTag}`
        )
        .join("\n");
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
            `⏱️ AFK for ${awayFor}\n💬 ${afk.reason}`
          )
          .addFields({
            name: "📬 Mentions",
            value: pingText
          })
      ],
      allowedMentions: {
        users: []
      }
    }).catch(() => null);
  }

  // ================= AFK MENTIONS =================
  for (const user of message.mentions.users.values()) {
    if (user.bot) continue;

    const data = afkUsers.get(user.id);

    if (!data) continue;

    const awayFor = formatDuration(
      Date.now() - data.since
    );

    // store ping
    data.pings.push({
      authorTag: message.author.tag,
      time: Date.now()
    });

    // prevent infinite spam memory
    if (data.pings.length > 20) {
      data.pings.shift();
    }

    await message.reply({
      content: `${user.username} is AFK — ${awayFor}\n💬 ${data.reason}`,
      allowedMentions: {
        users: []
      }
    }).catch(() => null);
  }
}

module.exports = {
  handleAfkCommand,
  handleAfkMentionsAndReturn
};