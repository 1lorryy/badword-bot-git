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

async function handleAfkCommand(message, args, prefix, getGuildData, saveData) {

  const isGlobal = args[0]?.toLowerCase() === "global";
  const reason = (isGlobal ? args.slice(1) : args).join(" ").trim() || "AFK";

  const member = message.member;

  const oldNickname = member.nickname || null;

  const afkData = {
  reason,
  since: Date.now(),
  pings: [],
  oldNickname
};

const data = getGuildData(message.guild.id);

if (!data.afk) {
  data.afk = {
    global: {},
    servers: {}
  };
}  

if (isGlobal) {

  globalAfkUsers.set(message.author.id, afkData);

  data.afk.global[message.author.id] = afkData;

} else {

  const key = `${message.guild.id}:${message.author.id}`;

  serverAfkUsers.set(key, afkData);

  data.afk.servers[key] = afkData;
}

saveData();

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
        `🌙 **${message.author.username} is AFK** — ${reason}` +
        (isGlobal ? "\n🌍 Mode: Global" : "\n🏠 Mode: This server")
      )
  ],
  allowedMentions: {
    parse: []
  }
}).catch(() => null);
  }

async function handleAfkMentionsAndReturn(message, prefix) {

  if (!message.guild || message.author.bot) return;

  const data = getGuildData(message.guild.id);

const globalAfk = globalAfkUsers.get(message.author.id);
const serverKey = `${message.guild.id}:${message.author.id}`;
const serverAfk = serverAfkUsers.get(serverKey);

const authorAfk = globalAfk || serverAfk;

  // ================= RETURN =================
  if (
    authorAfk &&
    !message.content.startsWith(`${prefix}afk`)
  ) {

    const guildData = getGuildData(message.guild.id);

if (globalAfkUsers.has(message.author.id)) {
    globalAfkUsers.delete(message.author.id);

    if (guildData.afk?.global) {
        delete guildData.afk.global[message.author.id];
    }

} else {

    const key = `${message.guild.id}:${message.author.id}`;

    serverAfkUsers.delete(key);

    if (guildData.afk?.servers) {
        delete guildData.afk.servers[key];
    }
}

saveData();

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

    const data =
  globalAfkUsers.get(user.id) ||
  serverAfkUsers.get(`${message.guild.id}:${user.id}`);

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

saveData();    

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
