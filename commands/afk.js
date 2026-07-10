const { EmbedBuilder, PermissionsBitField } = require("discord.js");

// Global maps initialized to sync across boot schedules
const globalAfkUsers = new Map();
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
    data.afk = { global: {}, servers: {} };
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

  if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) && member.manageable) {
    const base = member.nickname || member.user.globalName || member.user.username;
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
    allowedMentions: { parse: [] }
  }).catch(() => null);
}

async function handleAfkMentionsAndReturn(message, prefix, getGuildData, saveData) {
  if (!message.guild || message.author.bot) return false;

  const globalAfk = globalAfkUsers.get(message.author.id);
  const serverKey = `${message.guild.id}:${message.author.id}`;
  const serverAfk = serverAfkUsers.get(serverKey);
  const authorAfk = globalAfk || serverAfk;

  // ================= RETURN HANDLER =================
  if (authorAfk && !message.content.startsWith(`${prefix}afk`)) {
    
    globalAfkUsers.delete(message.author.id);
    serverAfkUsers.delete(serverKey);

    const data = getGuildData(message.guild.id);
    if (data.afk) {
      if (data.afk.global) delete data.afk.global[message.author.id];
      if (data.afk.servers) delete data.afk.servers[serverKey];
    }
    saveData();

    const awayFor = formatDuration(Date.now() - authorAfk.since);

    if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) && message.member.manageable) {
      await message.member.setNickname(authorAfk.oldNickname || null, "Returned from AFK").catch(() => null);
    }

    let pingList = "No one pinged you while you were away.";
    if (authorAfk.pings && authorAfk.pings.length > 0) {
      pingList = authorAfk.pings
        .slice(-10)
        .map((p, i) => `${i + 1}. **${p.authorTag}** — [Jump to message](${p.url})`)
        .join("\n")
        .slice(0, 1000);
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x22c55e)
          .setAuthor({ name: `${message.member.displayName} is back`, iconURL: message.author.displayAvatarURL() })
          .setDescription(`⏱️ **Away for:** ${awayFor}\n💬 **Reason:** ${authorAfk.reason}`)
          .addFields({ name: "📬 Recent Mentions", value: pingList })
          .setTimestamp()
      ],
      allowedMentions: { parse: [] }
    }).catch(() => null);

    return true; 
  }

  // ================= MENTION DETECTOR =================
  for (const user of message.mentions.users.values()) {
    if (user.id === message.author.id) continue;

    const targetKey = `${message.guild.id}:${user.id}`;
    const afkInfo = globalAfkUsers.get(user.id) || serverAfkUsers.get(targetKey);

    if (!afkInfo) continue;

    const awayFor = formatDuration(Date.now() - afkInfo.since);

    if (!afkInfo.pings) afkInfo.pings = [];
    afkInfo.pings.push({
      authorTag: message.author.username,
      url: message.url,
      time: Date.now()
    });

    if (afkInfo.pings.length > 20) afkInfo.pings.shift();

    const data = getGuildData(message.guild.id);
    if (!data.afk) data.afk = { global: {}, servers: {} };

    if (globalAfkUsers.has(user.id)) {
      data.afk.global[user.id] = afkInfo;
    } else {
      data.afk.servers[targetKey] = afkInfo;
    }
    saveData();    

    await message.reply({
      content: `🌙 **${user.username}** is AFK — ${afkInfo.reason} (${awayFor} ago)`,
      allowedMentions: { parse: [] }
    }).catch(() => null);
  }
  
  return false;
}

function loadAfks(allGuildsData) {
  if (!allGuildsData || typeof allGuildsData !== "object") return;

  globalAfkUsers.clear();
  serverAfkUsers.clear();

  for (const guildId of Object.keys(allGuildsData)) {
    const afk = allGuildsData[guildId]?.afk;
    if (!afk) continue;

    if (afk.global) {
      for (const userId of Object.keys(afk.global)) {
        globalAfkUsers.set(userId, afk.global[userId]);
      }
    }

    if (afk.servers) {
      for (const key of Object.keys(afk.servers)) {
        serverAfkUsers.set(key, afk.servers[key]);
      }
    }
  }
}

module.exports = {
  handleAfkCommand,
  handleAfkMentionsAndReturn,
  loadAfks
};
