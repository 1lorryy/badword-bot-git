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

// Clean ALL [AFK] prefixes from a display string
function cleanAfkPrefix(str) {
  if (!str) return "";
  return str.replace(/^(\[AFK\]\s*)+/gi, "").trim();
}

async function handleAfkCommand(message, args, prefix, getGuildData, saveData) {
  const isGlobal = args[0]?.toLowerCase() === "global";
  const reason = (isGlobal ? args.slice(1) : args).join(" ").trim() || "Stepped away";
  const member = message.member;

  const serverKey = `${message.guild.id}:${message.author.id}`;
  const existingGlobal = globalAfkUsers.get(message.author.id);
  const existingServer = serverAfkUsers.get(serverKey);
  const existingAfk = existingGlobal || existingServer;

  // 1. Determine pure pre-AFK nickname without any [AFK] tags
  let originalName = existingAfk?.oldNickname;
  if (!originalName) {
    originalName = member.nickname ? cleanAfkPrefix(member.nickname) : member.user.username;
  }

  const afkData = {
    reason,
    since: Date.now(),
    pings: existingAfk?.pings || [],
    oldNickname: originalName,
    originGuildId: message.guild.id
  };

  const data = getGuildData(message.guild.id);
  if (!data.afk) {
    data.afk = { global: {}, servers: {} };
  }  

  // 2. Clear previous mode entries when toggling/updating AFK
  if (isGlobal) {
    serverAfkUsers.delete(serverKey);
    if (data.afk.servers) delete data.afk.servers[serverKey];

    globalAfkUsers.set(message.author.id, afkData);
    data.afk.global[message.author.id] = afkData;
  } else {
    globalAfkUsers.delete(message.author.id);
    if (data.afk.global) delete data.afk.global[message.author.id];

    serverAfkUsers.set(serverKey, afkData);
    data.afk.servers[serverKey] = afkData;
  }

  saveData();

  // 3. Set AFK Nickname safely
  if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) && member.manageable) {
    const newNick = `[AFK] ${originalName}`.slice(0, 32);
    await member.setNickname(newNick).catch(() => null);
  }

  return message.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({ 
          name: `${message.author.username} went AFK`, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(`💤 **Reason:** ${reason}\n🌐 **Scope:** ${isGlobal ? "`Global`" : "`Server Only`"}`)
        .setFooter({ text: "DonQuixotes Lounge • AFK System" })
        .setTimestamp()
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
  if (authorAfk && !message.content.toLowerCase().startsWith(`${prefix}afk`)) {
    
    globalAfkUsers.delete(message.author.id);
    serverAfkUsers.delete(serverKey);

    if (authorAfk.originGuildId) {
      const originData = getGuildData(authorAfk.originGuildId);
      if (originData?.afk?.global) {
        delete originData.afk.global[message.author.id];
      }
    }

    const currentData = getGuildData(message.guild.id);
    if (currentData.afk) {
      if (currentData.afk.global) delete currentData.afk.global[message.author.id];
      if (currentData.afk.servers) delete currentData.afk.servers[serverKey];
    }
    saveData();

    const awayFor = formatDuration(Date.now() - authorAfk.since);

    // Restore or reset nickname cleanly
    if (message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames) && message.member.manageable) {
      const cleanOriginal = cleanAfkPrefix(authorAfk.oldNickname);
      
      if (!cleanOriginal || cleanOriginal.toLowerCase() === message.author.username.toLowerCase()) {
        await message.member.setNickname("").catch(() => null);
      } else {
        await message.member.setNickname(cleanOriginal).catch(async () => {
          await message.member.setNickname("").catch(() => null);
        });
      }
    }

    let pingList = "*No pings received while away.*";
    if (authorAfk.pings && authorAfk.pings.length > 0) {
      pingList = authorAfk.pings
        .slice(-5)
        .map((p, i) => `**${i + 1}.** **${p.authorTag}** ➔ [Jump to Message](${p.url})`)
        .join("\n");
    }

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setAuthor({ 
            name: `Welcome back, ${message.member.displayName.replace(/^\[AFK\]\s*/i, "")}!`, 
            iconURL: message.author.displayAvatarURL({ dynamic: true }) 
          })
          .setDescription(`⏱️ **Away for:** \`${awayFor}\` | 💬 **Reason:** ${authorAfk.reason}`)
          .addFields({ name: "📬 Missed Mentions", value: pingList })
          .setFooter({ text: "DonQuixotes Lounge • AFK System" })
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

    if (afkInfo.originGuildId) {
      const originData = getGuildData(afkInfo.originGuildId);
      if (!originData.afk) originData.afk = { global: {}, servers: {} };
      if (globalAfkUsers.has(user.id)) {
        originData.afk.global[user.id] = afkInfo;
      }
    }

    const data = getGuildData(message.guild.id);
    if (!data.afk) data.afk = { global: {}, servers: {} };

    if (globalAfkUsers.has(user.id)) {
      data.afk.global[user.id] = afkInfo;
    } else {
      data.afk.servers[targetKey] = afkInfo;
    }
    saveData();    

    await message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setDescription(`🌙 **${user.username}** is currently AFK: **${afkInfo.reason}** (\`${awayFor}\` ago)`)
      ],
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
