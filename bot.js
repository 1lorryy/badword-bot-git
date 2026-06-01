const { handleChannelToolsCommand } = require("./commands/channelTools"); [cite: 195]
const { handleBuyCommand } = require("./commands/buy"); [cite: 195]
const { handleAfkCommand, handleAfkMentionsAndReturn } = require("./commands/afk"); [cite: 195]
const { handleAuctionCommand } = require("./commands/auction"); [cite: 196]
const { handleModLogsCommand } = require("./commands/modlogs"); [cite: 196]
const { generateAiReply } = require("./commands/aiReply"); [cite: 196]
const fs = require("fs"); [cite: 197]
const path = require("path"); [cite: 197]

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js"); [cite: 197]

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "guild-data.json"); [cite: 198]

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || "?"; [cite: 198]
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1492845794192134245"; [cite: 198]
const BYPASS_ROLE_IDS = ( [cite: 199]
  process.env.BYPASS_ROLE_IDS || ""
)
  .split(",")
  .map(id => id.trim())
  .filter(Boolean); [cite: 199]

const STAFF_ROLE_ID = "1481370041420087474"; [cite: 199]
const MOD_ROLE_ID = "1481370041432932379"; [cite: 200]
const MAIN_ADMIN_ROLE_ID = "1481370041441189959"; [cite: 200]

const BLOCKED_LINKS = [ [cite: 200]
  "onlyfans.com",
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com"
]; [cite: 200]

const CORE_BLACKLIST = [ [cite: 201]
  "ass",
  "nigga",
  "nigger",
  "nga",
  "idiot",
  "retard",
  "bitchass",
  "dumbass",
  "faggot",
  "fagot",
  "porn",
  "sex",
  "pussy",
  "boobs",
  "penis",
  "dick",
  "idgaf",
  "motherfuck",
  "motherfucker",
  "mf",
  "asshole",
  "cunt",
  "possay",
  "sexcam",
  "bubs"
]; [cite: 201]

const PROTECTED_BLACKLIST = [ [cite: 202]
  "nigga",
  "nigger",
  "nga",
  "retard",
  "faggot",
  "fagot",
  "tard",
]; [cite: 202]

let client; [cite: 202]

// ================= DATA SAVE =================
function loadData() { [cite: 203]
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); [cite: 203]
  } catch {
    return {}; [cite: 204]
  }
}

let store = loadData(); [cite: 204]

function saveData() { [cite: 205]
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); [cite: 205]
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2)); [cite: 205]
}

function getGuildData(guildId) { [cite: 205]
  store = loadData(); [cite: 205]
  if (!store[guildId]) { [cite: 206]
    store[guildId] = {
      prefix: DEFAULT_PREFIX, [cite: 206]
      words: [], [cite: 206]
      blockedLinks: [], [cite: 206]
      customCommands: {}, [cite: 206]
      warnings: {}, [cite: 206]
      cooldowns: {}, // Initialize database spot for tracking systems [cite: 371]
      modStats: {}, [cite: 206]
      purchaseLinks: { [cite: 206]
        classes: [], [cite: 206]
        ads6h: [], [cite: 206]
        ads24h: [], [cite: 206]
        extras: [] [cite: 206]
      }
    };
    saveData(); [cite: 207]
  }

  if (!Array.isArray(store[guildId].words)) store[guildId].words = []; [cite: 207]
  if (!Array.isArray(store[guildId].blockedLinks)) store[guildId].blockedLinks = []; [cite: 207]
  
  if (!store[guildId].customCommands || typeof store[guildId].customCommands !== "object") { [cite: 208]
    store[guildId].customCommands = {}; [cite: 208]
  }
  if (!store[guildId].warnings || typeof store[guildId].warnings !== "object") { [cite: 209]
    store[guildId].warnings = {}; [cite: 209]
  }

  // Inject tracking system safeguard [cite: 371]
  if (!store[guildId].cooldowns || typeof store[guildId].cooldowns !== "object") { [cite: 371, 372]
    store[guildId].cooldowns = {}; [cite: 371, 372]
  }

  if (!store[guildId].purchaseLinks || typeof store[guildId].purchaseLinks !== "object") { [cite: 210]
    store[guildId].purchaseLinks = { [cite: 210]
      classes: [], [cite: 210]
      ads6h: [], [cite: 210]
      ads24h: [], [cite: 210]
      extras: [] [cite: 210]
    };
  }

  for (const key of ["classes", "ads6h", "ads24h", "extras"]) { [cite: 211]
    if (!Array.isArray(store[guildId].purchaseLinks[key])) { [cite: 211]
      store[guildId].purchaseLinks[key] = []; [cite: 211]
    }
  }
  
  if (!store[guildId].modStats || typeof store[guildId].modStats !== "object") { [cite: 212]
    store[guildId].modStats = {}; [cite: 212]
  }

  if (!store[guildId].prefix) store[guildId].prefix = DEFAULT_PREFIX; [cite: 213]

  return store[guildId]; [cite: 213]
}

// ================= HELPERS =================
async function deleteAfter(msg, ms = 5000) { [cite: 213]
  if (!msg) return; [cite: 213]
  setTimeout(() => msg.delete().catch(() => null), ms); [cite: 214]
}

function canManageGuild(message) { [cite: 214]
  if (!message.member) return false; [cite: 214]
  return ( [cite: 215]
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) || [cite: 215]
    message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) || [cite: 215]
    message.member.roles.cache.has(MAIN_ADMIN_ROLE_ID) || [cite: 215]
    message.member.roles.cache.has(STAFF_ROLE_ID) || [cite: 215]
    message.member.roles.cache.has(MOD_ROLE_ID) [cite: 215]
  );
}

function canBanUsers(message) { [cite: 216]
  if (!message.member) return false; [cite: 216]

  const roles = message.member.roles.cache; [cite: 216]
  return ( [cite: 217]
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) || [cite: 217]
    roles.has(MAIN_ADMIN_ROLE_ID) [cite: 217]
  );
}

function isStaffMember(member) { [cite: 218]
  return ( [cite: 218]
    member.roles.cache.has(STAFF_ROLE_ID) || [cite: 218]
    member.roles.cache.has(MOD_ROLE_ID) || [cite: 218]
    member.roles.cache.has(MAIN_ADMIN_ROLE_ID) || [cite: 218]
    member.permissions.has(PermissionsBitField.Flags.Administrator) [cite: 218]
  );
}

function hasBypassRole(message) { [cite: 219]
  return message.member?.roles?.cache?.some(role => [cite: 219]
    BYPASS_ROLE_IDS.includes(role.id) [cite: 220]
  );
}

async function findTargetMember(message, args) { [cite: 220]
  const mention = message.mentions.members.first(); [cite: 220]
  if (mention) return mention; [cite: 220]

  const input = args[0]; [cite: 220]
  if (!input) return null; [cite: 221]

  const clean = input.replace(/^@/, ""); [cite: 221]
  const byId = await message.guild.members [cite: 222]
    .fetch(clean) [cite: 222]
    .catch(() => null); [cite: 222]
  if (byId) return byId; [cite: 223]

  const search = clean.toLowerCase(); [cite: 223]

  let found = message.guild.members.cache.find( [cite: 223]
    m => [cite: 223]
      m.user.username.toLowerCase() === search || [cite: 223]
      m.displayName.toLowerCase() === search || [cite: 223]
      m.user.tag.toLowerCase() === search [cite: 223]
  );
  if (found) return found; [cite: 224]

  found = message.guild.members.cache.find( [cite: 224]
    m => [cite: 224]
      m.user.username.toLowerCase().includes(search) || [cite: 224]
      m.displayName.toLowerCase().includes(search) [cite: 224]
  );
  return found || null; [cite: 225]
}

function parseDuration(input) { [cite: 225]
  if (!input) return null; [cite: 225]
  const match = String(input) [cite: 226]
    .toLowerCase() [cite: 226]
    .match(/^(\d+)(s|sec|m|min|h|hr|d|day)$/); [cite: 226]

  if (!match) return null; [cite: 226]
  const amount = parseInt(match[1], 10); [cite: 227]
  const unit = match[2]; [cite: 227]

  if (unit === "s" || unit === "sec") return amount * 1000; [cite: 227]
  if (unit === "m" || unit === "min") return amount * 60 * 1000; [cite: 228]
  if (unit === "h" || unit === "hr") return amount * 60 * 60 * 1000; [cite: 229]
  if (unit === "d" || unit === "day") return amount * 24 * 60 * 60 * 1000; [cite: 230]

  return null; [cite: 230]
}

function escapeRegex(text) { [cite: 231]
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); [cite: 231]
}

function containsBlacklistedWord(content, words) { [cite: 231]
  const text = content.toLowerCase(); [cite: 231]
  for (const word of words) { [cite: 232]
    const clean = String(word).toLowerCase().trim(); [cite: 232]
    if (!clean) continue; [cite: 232]
    const letters = clean [cite: 233]
      .split("") [cite: 233]
      .map(escapeRegex) [cite: 233]
      .join("[\\s._-]*"); [cite: 233]
    const regex = new RegExp( [cite: 234]
      `(^|[^a-z0-9])${letters}([^a-z0-9]|$)`, [cite: 234]
      "i" [cite: 234]
    );
    if (regex.test(text)) return word; [cite: 235]
  }

  const link = BLOCKED_LINKS.find(l => text.includes(l)); [cite: 235]
  if (link) return link; [cite: 235]

  return null; [cite: 236]
}

async function sendAutomodLog(message, word) { [cite: 236]
  const log = await message.guild.channels [cite: 236]
    .fetch(LOG_CHANNEL_ID) [cite: 237]
    .catch(() => null); [cite: 237]
  if (!log || !log.isTextBased()) return; [cite: 237]

  const embed = new EmbedBuilder() [cite: 237]
    .setTitle("🚫 Blacklisted Message Deleted") [cite: 237]
    .setColor(0xef4444) [cite: 237]
    .addFields(
      { name: "User", value: `${message.author.tag}`, inline: true }, [cite: 237]
      { name: "Channel", value: `${message.channel}`, inline: true }, [cite: 237]
      { name: "Matched", value: `\`${word}\``, inline: true }, [cite: 238]
      { name: "Message", value: message.content.slice(0, 1000), inline: false } [cite: 238]
    )
    .setTimestamp(); [cite: 238]
  await log.send({ embeds: [embed] }).catch(() => null); [cite: 239]
}

async function sendModLog(embed) { [cite: 239]
  const log = await client.channels [cite: 239]
    .fetch(LOG_CHANNEL_ID) [cite: 240]
    .catch(() => null); [cite: 240]
  if (!log || !log.isTextBased()) return; [cite: 240]

  await log.send({ embeds: [embed] }).catch(() => null); [cite: 241]
}

// ================= COMMANDS =================
async function handleCommands(message) { [cite: 241]
  const data = getGuildData(message.guild.id); [cite: 241]
  const prefix = data.prefix || DEFAULT_PREFIX; [cite: 241]
  if (!message.content.startsWith(prefix)) return false; [cite: 242]

  const args = message.content.slice(prefix.length).trim().split(/\s+/); [cite: 242]
  const command = (args.shift() || "").toLowerCase(); [cite: 242]
  if (!command) return true; [cite: 242]

  // ================= CUSTOM COMMANDS =================
  if (data.customCommands?.[command]) { [cite: 243]
    const custom = data.customCommands[command]; [cite: 243]
    if (typeof custom === "object" && custom.ai === true) { [cite: 244]
      let aiReply = null; [cite: 244]
      try {
        aiReply = await generateAiReply(message, message.content); [cite: 245]
      } catch (err) {
        console.error("AI unavailable:", err.code || err.message); [cite: 245]
        return true; [cite: 245]
      }

      if (!aiReply) return message.reply("AI unavailable rn."); [cite: 246]
      return message.channel.send({ [cite: 247]
        content: aiReply, [cite: 247]
        allowedMentions: { parse: [] } [cite: 247]
      });
    }

    const response = typeof custom === "string" ? custom : custom.response || "No response set."; [cite: 248, 249]
    const allowPings = typeof custom === "object" && custom.allowPings === true; [cite: 250]
    if (allowPings) { [cite: 251]
      return message.reply({ [cite: 251]
        content: response, [cite: 251]
        allowedMentions: { repliedUser: true } [cite: 251]
      });
    }

    return message.channel.send({ [cite: 252]
      content: response, [cite: 252]
      allowedMentions: { parse: [] } [cite: 252]
    });
  }

  // ================= AFK / AUCTION / CHANNEL TOOLS =================
  if (command === "slowmode") { [cite: 253]
    return handleChannelToolsCommand(message, args, prefix, command, canManageGuild); [cite: 253]
  }
  if (command === "purchase") return handleBuyCommand(message, args, prefix, canManageGuild); [cite: 254]
  if (command === "afk") return handleAfkCommand(message, args, prefix); [cite: 254]
  if (command === "auction") return handleAuctionCommand(message, args, prefix); [cite: 255]
  if (command === "bid") return handleAuctionCommand(message, ["bid", ...args], prefix); [cite: 255]
  if (command === "modlogs") return handleModLogsCommand(message, args, prefix, getGuildData); [cite: 256]

  // ================= PING =================
  if (command === "ping") { [cite: 257]
    const msg = await message.reply("🏓 Pinging...").catch(() => null); [cite: 257]
    if (!msg) return true; [cite: 258]

    const latency = msg.createdTimestamp - message.createdTimestamp; [cite: 258]
    const api = Math.round(client.ws.ping); [cite: 258]
    return msg.edit(`🏓 Pong!\n📨 Message: \`${latency}ms\`\n🌐 API: \`${api}ms\``).catch(() => null); [cite: 259]
  }

  // ================= PREFIX =================
  if (command === "prefix") { [cite: 259]
    return message.reply(`Current prefix: \`${prefix}\``); [cite: 259]
  }

  if (command === "setprefix") { [cite: 260]
    if (!canBanUsers(message)) { [cite: 260]
      return message.reply("❌ Only admin+ can change prefix."); [cite: 260]
    }

    const newPrefix = args[0]; [cite: 261]
    if (!newPrefix || newPrefix.length > 3) { [cite: 261]
      return message.reply(`Usage: \`${prefix}setprefix ?\``); [cite: 261]
    }

    data.prefix = newPrefix; [cite: 262]
    saveData(); [cite: 262]

    return message.reply(`✅ Prefix updated to \`${newPrefix}\``); [cite: 262]
  }

  // ================= WARN =================
  if (command === "warn") { [cite: 263]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 264]
    const member = await findTargetMember(message, args); [cite: 264]
    if (!member) return message.reply(`Usage: \`${prefix}warn @user reason\``); [cite: 264]

    const reason = args.slice(1).join(" ") || "No reason"; [cite: 264, 265]
    const warnId = Date.now().toString(); [cite: 265]

    if (!data.warnings[member.id]) data.warnings[member.id] = []; [cite: 265]
    data.warnings[member.id].push({ [cite: 266]
      id: warnId, [cite: 266]
      reason, [cite: 266]
      mod: message.author.id, [cite: 266]
      date: new Date().toISOString() [cite: 266]
    });

    if (!data.modStats[message.author.id]) { [cite: 267]
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 }; [cite: 267]
    }
    data.modStats[message.author.id].warns++; [cite: 268]
    saveData(); [cite: 268]

    const embed = new EmbedBuilder() [cite: 268]
      .setTitle("⚠️ User Warned") [cite: 268]
      .setColor(0xf59e0b) [cite: 268]
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true }, [cite: 268]
        { name: "Moderator", value: `${message.author.tag}`, inline: true }, [cite: 268]
        { name: "Reason", value: reason, inline: false }, [cite: 268]
        { name: "Warn ID", value: `\`${warnId}\``, inline: true } [cite: 268]
      )
      .setTimestamp(); [cite: 268]
    await sendModLog(embed); [cite: 269]
    await member.send({ embeds: [embed] }).catch(() => null); [cite: 269]

    return message.reply(`✅ Warned ${member.user.tag}\nWarn ID: \`${warnId}\``); [cite: 269]
  }

  // ================= WARNINGS =================
  if (command === "warnings") { [cite: 270]
    const member = await findTargetMember(message, args) || message.member; [cite: 270, 271]
    const warnings = data.warnings[member.id] || []; [cite: 271]

    if (!warnings.length) return message.reply(`${member.user.tag} has no warnings.`); [cite: 271]
    const list = warnings [cite: 272]
      .slice(-10) [cite: 272]
      .map((w, i) => `${i + 1}. ID: \`${w.id}\`\nReason: ${w.reason}`) [cite: 272]
      .join("\n\n"); [cite: 272]
    const ids = warnings.map(w => `\`${w.id}\``).join("\n"); [cite: 273]

    const embed = new EmbedBuilder() [cite: 273]
      .setTitle(`Warnings for ${member.user.tag}`) [cite: 273]
      .setColor(0xf59e0b) [cite: 273]
      .setDescription(list.slice(0, 4000)); [cite: 273]
    return message.reply({ content: ids, embeds: [embed] }); [cite: 274]
  }

  // ================= UNWARN =================
  if (command === "unwarn") { [cite: 274]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 275]
    const member = await findTargetMember(message, args); [cite: 275]
    const warnId = args[1]; [cite: 275]

    if (!member || !warnId) return message.reply(`Usage: \`${prefix}unwarn @user warnId\``); [cite: 275]
    const warnings = data.warnings[member.id] || []; [cite: 276]
    const before = warnings.length; [cite: 276]

    data.warnings[member.id] = warnings.filter(w => w.id !== warnId); [cite: 276]
    saveData(); [cite: 276]
    if (before === data.warnings[member.id].length) return message.reply("Warn ID not found."); [cite: 277]
    return message.reply(`✅ Removed warning \`${warnId}\``); [cite: 278]
  }

  // ================= SETNICK =================
  if (command === "setnick") { [cite: 278]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 279]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) { [cite: 279]
      return message.reply("❌ I need Manage Nicknames permission."); [cite: 280]
    }

    const member = await findTargetMember(message, args); [cite: 280]
    if (!member) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``); [cite: 280]
    if (!member.manageable) { [cite: 281]
      return message.reply("❌ I cannot change this user's nickname. Their role may be higher than mine."); [cite: 282]
    }

    const newNick = message.reference ? args.join(" ").trim() : args.slice(1).join(" ").trim(); [cite: 282, 283]
    if (!newNick) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``); [cite: 283]
    if (newNick.length > 32) return message.reply("❌ Nickname max length is 32 characters."); [cite: 284]

    await member.setNickname(newNick, `Changed by ${message.author.tag}`); [cite: 284]
    const embed = new EmbedBuilder() [cite: 285]
      .setTitle("✏️ Nickname Changed") [cite: 285]
      .setColor(0x5865f2) [cite: 285]
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true }, [cite: 285]
        { name: "Moderator", value: `${message.author.tag}`, inline: true }, [cite: 285]
        { name: "New Nickname", value: newNick, inline: false } [cite: 285]
      )
      .setTimestamp(); [cite: 286]
    await sendModLog(embed); [cite: 286]

    return message.reply(`✅ Changed nickname for ${member.user.tag} to **${newNick}**`); [cite: 287]
  }

  // ================= MUTE =================
  if (command === "mute" || command === "timeout") { [cite: 287]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 288]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) { [cite: 288]
      return message.reply("I need Moderate Members permission."); [cite: 289]
    }

    const member = await findTargetMember(message, args); [cite: 289]
    if (!member) return message.reply(`Usage: \`${prefix}mute @user 1min reason\``); [cite: 290]
    const durationText = args[1]; [cite: 290]
    const durationMs = parseDuration(durationText); [cite: 290]

    if (!durationMs) return message.reply("Use time like `10s`, `1min`, `1h`, `1d`."); [cite: 290]
    if (durationMs > 14 * 24 * 60 * 60 * 1000) return message.reply("Max mute is 14 days."); [cite: 291]
    const reason = args.slice(2).join(" ") || "No reason"; [cite: 292]

    await member.timeout(durationMs, reason); [cite: 292]
    if (!data.modStats[message.author.id]) { [cite: 293]
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 }; [cite: 293]
    }
    data.modStats[message.author.id].mutes++; [cite: 294]
    saveData(); [cite: 294]

    const embed = new EmbedBuilder() [cite: 294]
      .setTitle("🔇 User Muted") [cite: 294]
      .setColor(0x3b82f6) [cite: 294]
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true }, [cite: 294]
        { name: "Duration", value: durationText, inline: true }, [cite: 294]
        { name: "Reason", value: reason, inline: false } [cite: 294]
      )
      .setTimestamp(); [cite: 294]
    await sendModLog(embed); [cite: 295]
    return message.reply(`🔇 Muted ${member.user.tag} for ${durationText}`); [cite: 295]
  }

  // ================= UNMUTE =================
  if (command === "unmute") { [cite: 295]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 296]
    const member = await findTargetMember(message, args); [cite: 296]
    if (!member) return message.reply(`Usage: \`${prefix}unmute @user\``); [cite: 296]

    await member.timeout(null); [cite: 296]
    return message.reply(`🔊 Unmuted ${member.user.tag}`); [cite: 297]
  }

  // ================= KICK =================
  if (command === "kick") { [cite: 297]
    if (!args[0]) return message.reply(`Usage: \`${prefix}kick @user reason\``); [cite: 297, 298]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 298, 299]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) { [cite: 299]
      return message.reply("❌ I need Kick Members permission."); [cite: 300]
    }

    const member = await findTargetMember(message, args); [cite: 300]
    if (!member) return message.reply(`Usage: \`${prefix}kick @user reason\``); [cite: 300, 301]

    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.kickable) { [cite: 301]
      return; [cite: 302]
    }

    const reason = args.slice(1).join(" ") || "No reason"; [cite: 302]
    const embed = new EmbedBuilder() [cite: 303]
      .setTitle("👢 User Kicked") [cite: 303]
      .setColor(0xef4444) [cite: 303]
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true }, [cite: 303]
        { name: "Moderator", value: `${message.author.tag}`, inline: true }, [cite: 303]
        { name: "Reason", value: reason, inline: false } [cite: 303]
      )
      .setTimestamp(); [cite: 304]

    await member.send({ embeds: [embed] }).catch(() => null); [cite: 304]
    await member.kick(reason); [cite: 304]

    if (!data.modStats[message.author.id]) { [cite: 304]
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 }; [cite: 304]
    }
    data.modStats[message.author.id].kicks++; [cite: 305]
    saveData(); [cite: 305]
    await sendModLog(embed); [cite: 305]

    return message.reply(`👢 Kicked ${member.user.tag}`); [cite: 305]
  }

  // ================= BAN =================
  if (command === "ban") { [cite: 305]
    if (!args[0]) return message.reply(`Usage: \`${prefix}ban @user reason\``); [cite: 305, 306]
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can ban."); [cite: 306, 307]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) { [cite: 307]
      return message.reply("❌ I need Ban Members permission."); [cite: 308]
    }

    const member = await findTargetMember(message, args); [cite: 308]
    if (!member) return message.reply(`Usage: \`${prefix}ban @user reason\``); [cite: 309]

    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.bannable) { [cite: 309]
      return; [cite: 310]
    }

    const reason = args.slice(1).join(" ") || "No reason"; [cite: 310]
    const embed = new EmbedBuilder() [cite: 311]
      .setTitle("🔨 User Banned") [cite: 311]
      .setColor(0xef4444) [cite: 311]
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true }, [cite: 311]
        { name: "Moderator", value: `${message.author.tag}`, inline: true }, [cite: 311]
        { name: "Reason", value: reason, inline: false } [cite: 311]
      )
      .setTimestamp(); [cite: 312]

    await member.send({ embeds: [embed] }).catch(() => null); [cite: 312]
    await member.ban({ reason }); [cite: 312]

    if (!data.modStats[message.author.id]) { [cite: 313]
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 }; [cite: 313]
    }
    data.modStats[message.author.id].bans++; [cite: 314]
    saveData(); [cite: 314]
    await sendModLog(embed); [cite: 314]

    return message.reply(`🔨 Banned ${member.user.tag}`); [cite: 314]
  }

  // ================= UNBAN =================
  if (command === "unban") { [cite: 314]
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can unban."); [cite: 314, 315]
    const userId = args[0]; [cite: 315]
    if (!userId) return message.reply(`Usage: \`${prefix}unban userId reason\``); [cite: 315]

    const reason = args.slice(1).join(" ") || "No reason"; [cite: 315, 316]
    await message.guild.members.unban(userId, reason).catch(() => null); [cite: 316]
    return message.reply(`✅ Unbanned \`${userId}\``); [cite: 316]
  }

  // ================= PURGE =================
  if (command === "purge") { [cite: 316]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 317]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) { [cite: 317]
      return message.reply("I need Manage Messages permission."); [cite: 318]
    }

    const amount = parseInt(args[0], 10); [cite: 318]
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) { [cite: 318]
      return message.reply(`Usage: \`${prefix}purge 1\``); [cite: 319]
    }

    const deleted = await message.channel.bulkDelete(amount, true).catch(() => null); [cite: 319]
    if (!deleted) return message.reply("Could not purge messages."); [cite: 319, 320]
    const msg = await message.channel.send(`✅ Purged ${deleted.size} messages.`); [cite: 320]
    await deleteAfter(msg); [cite: 320]
    await deleteAfter(message); [cite: 321]
    return true; [cite: 321]
  }

  // ================= ROLE =================
  if (command === "role") { [cite: 321]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 322]
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) { [cite: 322]
      return message.reply("I need Manage Roles permission."); [cite: 322]
    }

    const member = await findTargetMember(message, args); [cite: 322]
    if (!member) return message.reply(`Usage: \`${prefix}role @user role\``); [cite: 323]

    const roleInput = args.slice(1).join(" ").trim(); [cite: 323]
    if (!roleInput) return message.reply(`Usage: \`${prefix}role @user role\``); [cite: 323]
    const role = [cite: 324]
      message.mentions.roles.first() || [cite: 324]
      message.guild.roles.cache.get(roleInput.replace(/[<@&>]/g, "")) || [cite: 324]
      message.guild.roles.cache.find( [cite: 325]
        r => r.name.toLowerCase() === roleInput.toLowerCase() [cite: 325]
      ); [cite: 325]

    if (!role) return message.reply("Role not found."); [cite: 326]
    if (role.managed) return message.reply("I cannot manage that role."); [cite: 326]
    if (role.position >= message.guild.members.me.roles.highest.position) { [cite: 327]
      return message.reply("❌ That role is higher than or equal to my highest role."); [cite: 328]
    }
    if (role.position >= message.member.roles.highest.position) { [cite: 328]
      return message.reply("❌ You cannot give/remove a role equal or higher than your highest role."); [cite: 329]
    }

    if (member.roles.cache.has(role.id)) { [cite: 329]
      await member.roles.remove(role); [cite: 329]
      return message.reply(`✅ Removed **${role.name}** from ${member.user.tag}`); [cite: 330]
    }

    await member.roles.add(role); [cite: 330]
    return message.reply(`✅ Added **${role.name}** to ${member.user.tag}`); [cite: 331]
  }

  // ================= BLACKLIST ADD =================
  if (command === "bl" || command === "blacklist") { [cite: 332]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 333]
    const word = args.join(" ").trim().toLowerCase(); [cite: 333]
    if (!word) return message.reply(`Usage: \`${prefix}bl word\``); [cite: 334]
    if (CORE_BLACKLIST.includes(word) || data.words.includes(word)) { [cite: 334]
      const reply = await message.reply(`⚠️ \`${word}\` is already blacklisted.`); [cite: 334, 335]
      await deleteAfter(reply); [cite: 335]
      await deleteAfter(message); [cite: 335]
      return true; [cite: 335]
    }

    data.words.push(word); [cite: 335]
    saveData(); [cite: 336]
    const reply = await message.reply({ [cite: 336]
      embeds: [
        new EmbedBuilder() [cite: 336]
          .setTitle("🚫 Word Blacklisted") [cite: 336]
          .setColor(0xef4444) [cite: 336]
          .setDescription(`Added \`${word}\` to the blacklist.`) [cite: 336]
          .setFooter({ text: "AutoMod updated" }) [cite: 336]
          .setTimestamp() [cite: 336]
      ]
    }).catch(() => null); [cite: 336]
    await deleteAfter(reply); [cite: 337]
    await deleteAfter(message); [cite: 337]
    return true; [cite: 337]
  }

  // ================= BLACKLIST REMOVE =================
  if (command === "unbl" || command === "unblacklist") { [cite: 337]
    if (!canManageGuild(message)) return message.reply("❌ No permission."); [cite: 338]
    const word = args.join(" ").trim().toLowerCase(); [cite: 338]
    if (!word) return message.reply(`Usage: \`${prefix}unbl word\``); [cite: 339]
    if (CORE_BLACKLIST.includes(word)) { [cite: 339]
      const reply = await message.reply(`❌ \`${word}\` is protected and cannot be removed.`); [cite: 339, 340]
      await deleteAfter(reply); [cite: 340]
      await deleteAfter(message); [cite: 340]
      return true; [cite: 340]
    }

    const before = data.words.length; [cite: 340]
    data.words = data.words.filter(w => w !== word); [cite: 341]
    saveData(); [cite: 341]

    if (before === data.words.length) { [cite: 341]
      const reply = await message.reply(`⚠️ \`${word}\` was not found in blacklist.`); [cite: 341, 342]
      await deleteAfter(reply); [cite: 342]
      await deleteAfter(message); [cite: 342]
      return true; [cite: 342]
    }

    const reply = await message.reply({ [cite: 342]
      embeds: [
        new EmbedBuilder() [cite: 342]
          .setTitle("✅ Word Removed") [cite: 342]
          .setColor(0x22c55e) [cite: 342]
          .setDescription(`Removed \`${word}\` from the blacklist.`) [cite: 342]
          .setFooter({ text: "AutoMod updated" }) [cite: 342]
          .setTimestamp() [cite: 342]
      ]
    }).catch(() => null); [cite: 343]

    await deleteAfter(reply); [cite: 343]
    await deleteAfter(message); [cite: 343]
    return true; [cite: 343]
  }

  // ================= BLACKLIST WORDS =================
  if (command === "words") { [cite: 343]
    const allWords = [...new Set([...CORE_BLACKLIST, ...data.words])]; [cite: 344]
    return message.reply({ [cite: 344]
      embeds: [
        new EmbedBuilder() [cite: 344]
          .setTitle("🚫 Blacklisted Words") [cite: 344]
          .setColor(0x5865f2) [cite: 344]
          .setDescription(allWords.map(w => `\`${w}\``).join(", ").slice(0, 4000)) [cite: 344]
          .setFooter({ text: `${allWords.length} word(s) blocked` }) [cite: 345]
      ]
    });
  }

  // ================= MOD STATS =================
  if (command === "modstats") { [cite: 345]
    const member = (await findTargetMember(message, args)) || message.member; [cite: 345, 346]
    const stats = data.modStats[member.id] || { warns: 0, mutes: 0, kicks: 0, bans: 0 }; [cite: 346, 347]

    const embed = new EmbedBuilder() [cite: 347]
      .setTitle(`📊 Mod Stats • ${member.user.tag}`) [cite: 347]
      .setColor(0x5865f2) [cite: 347]
      .addFields(
        { name: "⚠️ Warns", value: String(stats.warns || 0), inline: true }, [cite: 348]
        { name: "🔇 Mutes", value: String(stats.mutes || 0), inline: true }, [cite: 348]
        { name: "👢 Kicks", value: String(stats.kicks || 0), inline: true }, [cite: 348]
        { name: "🔨 Bans", value: String(stats.bans || 0), inline: true } [cite: 348]
      )
      .setTimestamp(); [cite: 349]
    return message.reply({ embeds: [embed] }); [cite: 349]
  }

  // ================= HELP =================
  if (command === "help") { [cite: 349]
    const embed = new EmbedBuilder() [cite: 349]
      .setTitle("🔥 Commands") [cite: 350]
      .setColor(0x5865f2) [cite: 350]
      .setDescription(`Prefix: \`${prefix}\``) [cite: 350]
      .addFields(
        { name: "🛡️ Moderation", value: `\`${prefix}warn\` • \`${prefix}modstats\` • \`${prefix}modlogs\` • \`${prefix}mute\` • \`${prefix}kick\` • \`${prefix}ban\` • \`${prefix}warnings\` • \`${prefix}unwarn\` • \`${prefix}unmute\` • \`${prefix}unban\` • \`${prefix}purge\``, inline: false }, [cite: 350]
        { name: "🎨 Image Generation", value: `\`${prefix}generate\` • \`${prefix}draw\` • \`${prefix}image\` *(1-hour user cooldown)*`, inline: false }, [cite: 370, 371]
        { name: "⚙️ Server", value: `\`${prefix}setprefix\` • \`${prefix}role\` • \`${prefix}setnick\` • \`${prefix}purchase\``, inline: false }, [cite: 350]
        { name: "🚫 AutoMod", value: `\`${prefix}bl\` • \`${prefix}unbl\` • \`${prefix}words\``, inline: false }, [cite: 350]
        { name: "🏆 Auction", value: `\`${prefix}auction start\` • \`${prefix}bid\` • \`${prefix}auction end\``, inline: false }, [cite: 351]
        { name: "🔒 Channels", value: `\`${prefix}slowmode\``, inline: false }, [cite: 351]
        { name: "💤 Utility", value: `\`${prefix}afk\` • \`${prefix}ping\``, inline: false } [cite: 351]
      );

    if (data.customCommands && Object.keys(data.customCommands).length) { [cite: 351]
      embed.addFields({
        name: "💬 Custom Commands", [cite: 351]
        value: Object.keys(data.customCommands) [cite: 351]
          .map(cmd => `\`${cmd}\` / \`${prefix}${cmd}\``) [cite: 352]
          .join(" • ") [cite: 352]
          .slice(0, 1000), [cite: 352]
        inline: false [cite: 352]
      });
    }

    embed.setFooter({ text: "🔥 DASHBOARD Bot" }); [cite: 352]
    return message.reply({ embeds: [embed] }); [cite: 352]
  }

  // ================= AI FALLBACK CHAT =================
  const messages = await message.channel.messages.fetch({ limit: 30 }); [cite: 353, 361]
  const history = [...messages.values()] [cite: 354]
    .reverse() [cite: 354]
    .filter(m => !m.author.bot) [cite: 354]
    .map(m => ({
      author: m.author.username, [cite: 354]
      content: m.content [cite: 354]
    }));
  const aiReply = await generateAiReply(message, message.content, history); [cite: 355]
  if (aiReply) { [cite: 356]
    return message.reply({ [cite: 356]
      content: aiReply, [cite: 356]
      allowedMentions: { parse: [], repliedUser: false } [cite: 356]
    });
  }

  return true; [cite: 357]
}

// ================= BOT START =================
function startBot() { [cite: 357]
  client = new Client({ [cite: 357]
    intents: [ [cite: 357]
      GatewayIntentBits.Guilds, [cite: 357]
      GatewayIntentBits.GuildMessages, [cite: 357]
      GatewayIntentBits.GuildMembers, [cite: 357]
      GatewayIntentBits.MessageContent [cite: 357]
    ]
  });

  client.once("ready", async () => { [cite: 358]
    console.log(`Ready as ${client.user.tag}`); [cite: 358]

    for (const guild of client.guilds.cache.values()) { [cite: 358]
      const me = guild.members.me; [cite: 358]
      if (!me?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) continue; [cite: 358]

      const members = await guild.members.fetch().catch(() => null); [cite: 358]
      if (!members) continue; [cite: 358]

      for (const member of members.values()) { [cite: 358]
        if (member.user.bot) continue; [cite: 358]
        if (!member.manageable) continue; [cite: 358]

        const nick = member.nickname; [cite: 359]
        if (!nick || !nick.startsWith("[AFK] ")) continue; [cite: 359]

        const cleanNick = nick.replace(/^\[AFK\]\s*/i, "").slice(0, 32); [cite: 359]
        await member [cite: 359]
          .setNickname(cleanNick || null, "Bot restarted - clearing AFK nickname") [cite: 359]
          .catch(() => null); [cite: 359]
      }
    }
  });

  client.on("messageCreate", async (message) => { [cite: 360]
    try {
      if (message.author.bot) return; [cite: 360]
      if (!message.guild) return; [cite: 360]
      if (!message.content) return; [cite: 360]

      const data = getGuildData(message.guild.id); [cite: 363]
      const prefix = data.prefix || DEFAULT_PREFIX; [cite: 364]

      // ================= REPLY TO BOT AI =================
      if (message.reference && message.reference.messageId) { [cite: 360]
        const replied = await message.channel.messages [cite: 360]
          .fetch(message.reference.messageId) [cite: 360]
          .catch(() => null); [cite: 360]

        if (replied && replied.author.id === client.user.id) { [cite: 360]
          let aiReply = null; [cite: 360]
          try {
            const messages = await message.channel.messages.fetch({ limit: 30 }); [cite: 360, 361]
            const history = [...messages.values()] [cite: 361]
              .reverse() [cite: 361]
              .filter(m => !m.author.bot) [cite: 361]
              .map(m => ({
                author: m.author.username, [cite: 361]
                content: m.content [cite: 361]
              }));

            aiReply = await generateAiReply(message, message.content, history); [cite: 361]
          } catch (err) {
            console.error("Reply AI error:", err); [cite: 361]
          }

          if (aiReply) { [cite: 361]
            return message.reply({ [cite: 361]
              content: aiReply, [cite: 361]
              allowedMentions: { parse: [], repliedUser: false } [cite: 362]
            });
          }
        }
      }

      await handleAfkMentionsAndReturn(message, prefix); [cite: 364]

      // ================= BYPASS ROLE DISCORD INVITE ALLOW =================
      const bypassRoleId = "1492630307650666546"; [cite: 364]
      const hasBypassDiscordInvite = message.member?.roles.cache.has(bypassRoleId) || false; [cite: 364]
      const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/\S+/gi; [cite: 364]
      const containsDiscordInvite = discordInviteRegex.test(message.content); [cite: 364]
      const allowDiscordInvite = hasBypassDiscordInvite && containsDiscordInvite; [cite: 364]

      // ================= AUTOMOD =================
      const isCommand = message.content.startsWith(prefix); [cite: 365]
      const isBypass = typeof hasBypassRole === "function" ? hasBypassRole(message) : false; [cite: 365]

      const protectedWord = containsBlacklistedWord(message.content, PROTECTED_BLACKLIST); [cite: 365]
      if (protectedWord) { [cite: 366]
        await message.delete().catch(() => null); [cite: 366]
        await sendAutomodLog(message, protectedWord); [cite: 366]
        return; [cite: 366]
      }

      if (!isCommand && !isBypass && !allowDiscordInvite) { [cite: 367]
        const word = containsBlacklistedWord( [cite: 367]
          message.content,
          [...CORE_BLACKLIST, ...data.words, ...(data.blockedLinks || [])] [cite: 367]
        );
        if (word) { [cite: 368]
          await message.delete().catch(() => null); [cite: 368]
          await sendAutomodLog(message, word); [cite: 368]
          return; [cite: 368]
        }
      }

      // ================= IMAGE GENERATION 1-HOUR COOLDOWN CHECK =================
      if (isCommand) { [cite: 369]
        const args = message.content.slice(prefix.length).trim().split(/\s+/); [cite: 369]
        const commandName = (args.shift() || "").toLowerCase(); [cite: 370]

        if (commandName === "generate" || commandName === "draw" || commandName === "image") { [cite: 370]
          const currentTime = Date.now(); [cite: 370]
          const oneHourMs = 60 * 60 * 1000; [cite: 371]

          if (!data.cooldowns) data.cooldowns = {}; [cite: 371]
          if (!data.cooldowns.imagegen) data.cooldowns.imagegen = {}; [cite: 372]

          const lastUsedTime = data.cooldowns.imagegen[message.author.id] || 0; [cite: 372]
          const timePassed = currentTime - lastUsedTime; [cite: 372]

          if (timePassed < oneHourMs) { [cite: 373]
            const timeLeftMs = oneHourMs - timePassed; [cite: 373]
            const minutesLeft = Math.floor(timeLeftMs / (60 * 1000)); [cite: 374]
            const secondsLeft = Math.floor((timeLeftMs % (60 * 1000)) / 1000); [cite: 374]

            const reply = await message.reply( [cite: 375]
              `❌ **${message.author.username}**, AI image generation has a **1-hour cooldown**.\n⏳ Please wait **${minutesLeft}m ${secondsLeft}s** before generating another image.` [cite: 375]
            );
            if (typeof deleteAfter === "function") { [cite: 376]
              return deleteAfter(reply, 8000); [cite: 376]
            }
            return; [cite: 377]
          }

          data.cooldowns.imagegen[message.author.id] = currentTime; [cite: 379]
          saveData(); [cite: 379]
        }
      }

      // ================= PREFIX COMMANDS =================
      const usedCommand = await handleCommands(message); [cite: 380]

      // ================= CUSTOM COMMANDS WITHOUT PREFIX =================
      if (!usedCommand) { [cite: 381]
        const freshData = getGuildData(message.guild.id); [cite: 381]
        const msg = message.content.toLowerCase().trim(); [cite: 382]
        const custom = freshData.customCommands?.[msg]; [cite: 382]

        if (custom) { [cite: 382]
          const response = typeof custom === "string" ? custom : custom.response || "No response set."; [cite: 382, 383]
          const allowPings = typeof custom === "object" && custom.allowPings === true; [cite: 384]
          if (allowPings) { [cite: 385]
            return message.reply({ [cite: 385]
              content: response, [cite: 385]
              allowedMentions: { repliedUser: true } [cite: 385]
            });
          }

          return message.channel.send({ [cite: 386]
            content: response, [cite: 386]
            allowedMentions: { parse: [] } [cite: 386]
          });
        }
      }
    } catch (err) {
      console.error("Bot error:", err); [cite: 387]
    }
  });

  // ================= BOT INITIATION =================
  client.login(process.env.DISCORD_TOKEN); [cite: 388]
}

function getClient() { [cite: 388]
  return client; [cite: 388]
}

module.exports = { [cite: 388]
  startBot, [cite: 388]
  getClient [cite: 388]
};
