const renameCommand = require("./rename.js");
const { initTimers, handleTimerCommand } = require("./commands/timer.js");
const { handleChannelToolsCommand } = require("./commands/channelTools");
const { handlePurchaseCommand, handlePurchEditCommand } = require("./commands/buy");
const { handleAfkCommand, handleAfkMentionsAndReturn } = require("./commands/afk");
const { handleTranslateCommand } = require("./commands/translate");
const { handleAuctionCommand } = require("./commands/auction");
const { handleModLogsCommand } = require("./commands/modlogs");
const { generateAiReply } = require("./commands/aiReply");
const { checkBirthdays, handleBirthdayCommand } = require("./commands/birthday");
const { handleVerifyCommand } = require("./commands/verify");
const snipes = {};
const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "guild-data.json");

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || "?";
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1492845794192134245";

const BYPASS_ROLE_IDS = (
  process.env.BYPASS_ROLE_IDS || ""
)
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

const STAFF_ROLE_ID = "1481370041420087474";
const MOD_ROLE_ID = "1481370041432932379";
const MAIN_ADMIN_ROLE_ID = "1481370041441189959";

const BLOCKED_LINKS = [
  "onlyfans.com",
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com"
];

const CORE_BLACKLIST = [
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
];

const PROTECTED_BLACKLIST = [
  "nigga",
  "nigger",
  "nga",
  "retard",
  "faggot",
  "fagot",
  "tard",
];

let client;

// ================= DATA SAVE =================
function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

let store = loadData();

function saveData() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function getGuildData(guildId) {
  store = loadData();

  if (!store[guildId]) {
    store[guildId] = {
      prefix: DEFAULT_PREFIX,
      words: [],
      blockedLinks: [],
      customCommands: {},
      warnings: {},
      cooldowns: {}, 
      modStats: {},
      purchaseLinks: {
        classes: [],
        ads6h: [],
        ads24h: [],
        extras: []
      },
      birthdays: {},
      snipeEnabled: true,
      snipes: {}
    };
    saveData();
  }

  if (!Array.isArray(store[guildId].words)) store[guildId].words = [];
  if (!Array.isArray(store[guildId].blockedLinks)) store[guildId].blockedLinks = [];
  if (!store[guildId].customCommands || typeof store[guildId].customCommands !== "object") {
    store[guildId].customCommands = {};
  }
  if (!store[guildId].warnings || typeof store[guildId].warnings !== "object") {
    store[guildId].warnings = {};
  }

  if (!store[guildId].cooldowns || typeof store[guildId].cooldowns !== "object") {
    store[guildId].cooldowns = {};
  }

  if (!store[guildId].purchaseLinks || typeof store[guildId].purchaseLinks !== "object") {
    store[guildId].purchaseLinks = {
      classes: [],
      ads6h: [],
      ads24h: [],
      extras: []
    };
  }

  for (const key of ["classes", "ads6h", "ads24h", "extras"]) {
    if (!Array.isArray(store[guildId].purchaseLinks[key])) {
      store[guildId].purchaseLinks[key] = [];
    }
  }
  
  if (!store[guildId].modStats || typeof store[guildId].modStats !== "object") {
    store[guildId].modStats = {};
  }
  
  if (!store[guildId].birthdays || typeof store[guildId].birthdays !== "object") {
    store[guildId].birthdays = {};
  }
  if (!store[guildId].verification || typeof store[guildId].verification !== "object") {
    store[guildId].verification = {
      verifiedRole: null,
      unverifiedRole: null,
      trustedDays: 7,
      autoban: false,
      autokick: false,
      flagSuspiciousNames: true
    };
  }

  if (!store[guildId].tempRoles) store[guildId].tempRoles = [];

  if (!store[guildId].prefix) store[guildId].prefix = DEFAULT_PREFIX;

  return store[guildId];
}

// ================= HELPERS =================
async function deleteAfter(msg, ms = 5000) {
  if (!msg) return;
  setTimeout(() => msg.delete().catch(() => null), ms);
}

function canManageGuild(message) {
  if (!message.member) return false;
  return (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    message.member.roles.cache.has(MAIN_ADMIN_ROLE_ID) ||
    message.member.roles.cache.has(STAFF_ROLE_ID) ||
    message.member.roles.cache.has(MOD_ROLE_ID)
  );
}

function canBanUsers(message) {
  if (!message.member) return false;

  const roles = message.member.roles.cache;
  return (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    roles.has(MAIN_ADMIN_ROLE_ID)
  );
}

function isStaffMember(member) {
  return (
    member.roles.cache.has(STAFF_ROLE_ID) ||
    member.roles.cache.has(MOD_ROLE_ID) ||
    member.roles.cache.has(MAIN_ADMIN_ROLE_ID) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

function hasBypassRole(message) {
  return message.member?.roles?.cache?.some(role =>
    BYPASS_ROLE_IDS.includes(role.id)
  );
}

async function findTargetMember(message, args) {
  const mention = message.mentions.members.first();
  if (mention) return mention;

  const input = args[0];
  if (!input) return null;

  const clean = input.replace(/^@/, "");
  const byId = await message.guild.members
    .fetch(clean)
    .catch(() => null);
  if (byId) return byId;

  const search = clean.toLowerCase();

  let found = message.guild.members.cache.find(
    m =>
      m.user.username.toLowerCase() === search ||
      m.displayName.toLowerCase() === search ||
      m.user.tag.toLowerCase() === search
  );
  if (found) return found;

  found = message.guild.members.cache.find(
    m =>
      m.user.username.toLowerCase().includes(search) ||
      m.displayName.toLowerCase().includes(search)
  );
  return found || null;
}

function parseDuration(input) {
  if (!input) return null;
  const match = String(input)
    .toLowerCase()
    .match(/^(\d+)(s|sec|m|min|h|hr|d|day)$/);

  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "s" || unit === "sec") return amount * 1000;
  if (unit === "m" || unit === "min") return amount * 60 * 1000;
  if (unit === "h" || unit === "hr") return amount * 60 * 60 * 1000;
  if (unit === "d" || unit === "day") return amount * 24 * 60 * 60 * 1000;

  return null;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBlacklistedWord(content, words) {
  const text = content.toLowerCase();
  for (const word of words) {
    const clean = String(word).toLowerCase().trim();
    if (!clean) continue;
    const letters = clean
      .split("")
      .map(escapeRegex)
      .join("[\\s._-]*");
    const regex = new RegExp(
      `(^|[^a-z0-9])${letters}([^a-z0-9]|$)`,
      "i"
    );
    if (regex.test(text)) return word;
  }

  const link = BLOCKED_LINKS.find(l => text.includes(l));
  if (link) return link;

  return null;
}

async function sendAutomodLog(message, word) {
  const log = await message.guild.channels
    .fetch(LOG_CHANNEL_ID)
    .catch(() => null);
  if (!log || !log.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("🚫 Blacklisted Message Deleted")
    .setColor(0xef4444)
    .addFields(
      { name: "User", value: `${message.author.tag}`, inline: true },
      { name: "Channel", value: `${message.channel}`, inline: true },
      { name: "Matched", value: `\`${word}\``, inline: true },
      { name: "Message", value: message.content.slice(0, 1000), inline: false }
    )
    .setTimestamp();
  await log.send({ embeds: [embed] }).catch(() => null);
}

async function sendModLog(embed) {
  const log = await client.channels
    .fetch(LOG_CHANNEL_ID)
    .catch(() => null);
  if (!log || !log.isTextBased()) return;

  await log.send({ embeds: [embed] }).catch(() => null);
}

// ================= SNIPE =================
function saveSnipe(message) {
  const data = getGuildData(message.guild.id);

  if (!data.snipes) data.snipes = {};

  if (!data.snipes[message.channel.id]) {
    data.snipes[message.channel.id] = [];
  }

  data.snipes[message.channel.id].unshift({
    content: message.content || "*No text*",
    authorId: message.author.id,
    createdAt: message.createdTimestamp,
    deletedAt: Date.now()
  });

  data.snipes[message.channel.id] =
    data.snipes[message.channel.id].slice(0, 5);

  saveData();
}

// ================= COMMANDS =================
async function handleCommands(message, getGuildData) {
  const data = getGuildData(message.guild.id);
  const prefix = data.prefix || DEFAULT_PREFIX;
  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();
  if (!command) return true;

  // ================= CUSTOM COMMANDS =================
  if (data.customCommands?.[command]) {
    const custom = data.customCommands[command];

    if (typeof custom === "object" && custom.ai === true) {
      let aiReply = null;
      try {
        aiReply = await generateAiReply(message, message.content);
      } catch (err) {
        console.error(err);
        return true;
      }
      if (!aiReply) {
        return message.reply("AI unavailable.");
      }
      return message.channel.send(aiReply);
    }

    if (typeof custom === "object" && custom.type === "embed") {
      const embed = new EmbedBuilder()
        .setTitle(custom.title || "Embed")
        .setDescription(custom.description || "")
        .setColor(custom.color ? parseInt(custom.color.replace("#", ""), 16) : 0x5865f2);

      if (custom.url) {
        embed.setURL(custom.url);
      }
      return message.channel.send({ embeds: [embed] });
    }

    const response = typeof custom === "string" ? custom : custom.response || "No response set.";
    return message.channel.send({
      content: response,
      allowedMentions: { parse: [] }
    });
  }

if (command === "status") {
    const statusCmd = require("./commands/status.js");
    return statusCmd.execute(message, args, client, getGuildData);
  }

  if (command === "joininfo") {
    const joinInfoCmd = require("./commands/joininfo.js");
    return joinInfoCmd.execute(message, args);
  }

  if (command === "timer") {
    return handleTimerCommand(message, args);
  }
if (command === "slowmode") {
    return handleChannelToolsCommand(message, args, prefix, command, canManageGuild);
  }
  if (command === "purchase" || command === "buy") {
    return handlePurchaseCommand(message);
  }
  if (command === "purchedit" || command === "editpurch") {
    return handlePurchEditCommand(message, args);
  }
  if (command === "afk") {
    return handleAfkCommand(message, args, prefix, getGuildData, saveData);
  }
  if (command === "auction") return handleAuctionCommand(message, args, prefix);
  if (command === "bid") return handleAuctionCommand(message, ["bid", ...args], prefix);
  
  if (command === "modlogs") {
    return handleModLogsCommand(message, args, prefix, getGuildData);
  }

  if (command === "bday" || command === "birthday") {
    return handleBirthdayCommand(message, args, prefix, getGuildData, saveData);
  }

  if (command === "verify") {
    return handleVerifyCommand(message, args, prefix, getGuildData, saveData);
  }
  
  if (command === "ping") {
    const msg = await message.reply("🏓 Pinging...").catch(() => null);
    if (!msg) return true;

    const latency = msg.createdTimestamp - message.createdTimestamp;
    const api = Math.round(client.ws.ping);
    return msg.edit(`🏓 Pong!\n📨 Message: \`${latency}ms\`\n🌐 API: \`${api}ms\``).catch(() => null);
  }

  if (command === "translate") {
    return handleTranslateCommand(message, args);
  }

  if (command === "prefix") {
    return message.reply(`Current prefix: \`${prefix}\``);
  }

  if (command === "setprefix") {
    if (!canBanUsers(message)) {
      return message.reply("❌ Only admin+ can change prefix.");
    }
    const newPrefix = args[0];
    if (!newPrefix || newPrefix.length > 3) {
      return message.reply(`Usage: \`${prefix}setprefix ?\``);
    }
    data.prefix = newPrefix;
    saveData();
    return message.reply(`✅ Prefix updated to \`${newPrefix}\``);
  }
  if (command === "staffguide" || command === "staffguidedit") {
    const staffGuideCmd = require("./commands/staffguide.js");
    return staffGuideCmd.execute(message, args);
  }
  if (command === "rename") {
    await renameCommand.execute(message, args);
  }

 // ================= WARN =================
  if (command === "warn") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}warn @user reason\``);

    const reason = args.slice(1).join(" ") || "No reason";
    const warnId = Date.now().toString();

    if (!data.warnings[member.id]) data.warnings[member.id] = [];
    data.warnings[member.id].push({
      id: warnId,
      reason,
      mod: message.author.id,
      date: new Date().toISOString()
    });

    if (!data.modLogs) data.modLogs = [];
    data.modLogs.unshift({
      type: "WARN",
      modId: message.author.id,
      userId: member.id,
      reason: reason,
      date: new Date().toISOString()
    });

    if (!data.modStats[message.author.id]) {
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
    }
    data.modStats[message.author.id].warns++;
    saveData();

    const embed = new EmbedBuilder()
      .setTitle("⚠️ User Warned")
      .setColor(0xf59e0b)
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true },
        { name: "Moderator", value: `${message.author.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false },
        { name: "Warn ID", value: `\`${warnId}\``, inline: true }
      )
      .setTimestamp();
    await sendModLog(embed);
    await member.send({ embeds: [embed] }).catch(() => null);

    return message.reply(`✅ Warned ${member.user.tag}\nWarn ID: \`${warnId}\``);
  }

  // ================= WARNINGS =================
  if (command === "warnings") {
    const member = await findTargetMember(message, args) || message.member;
    const warnings = data.warnings[member.id] || [];

    if (!warnings.length) return message.reply(`${member.user.tag} has no warnings.`);

    const perPage = 5;
    const totalPages = Math.ceil(warnings.length / perPage);
    let currentPage = 0;

    const generateWarningEmbed = (page) => {
      const start = page * perPage;
      const current = warnings.slice(start, start + perPage);

      const description = current
        .map((w, i) => `**#${start + i + 1}** ID: \`${w.id}\` • By: <@${w.mod}>\n└ **Reason:** ${w.reason}`)
        .join("\n\n");

      return new EmbedBuilder()
        .setTitle(`⚠️ Warnings Record • ${member.user.tag}`)
        .setColor(0xf59e0b)
        .setDescription(description || "*No warnings on this page.*")
        .setFooter({ text: `Page ${page + 1}/${totalPages} • Total Logs: ${warnings.length}\n💡 Tip: You can type a page number directly to jump!` });
    };

    const generateWarningButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev_warn_page").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("next_warn_page").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
      );
    };

    const embedMessage = await message.reply({
      embeds: [generateWarningEmbed(currentPage)],
      components: totalPages > 1 ? [generateWarningButtons(currentPage)] : []
    });

    if (totalPages > 1) {
      const buttonCollector = embedMessage.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 90000 });
      const textCollector = message.channel.createMessageCollector({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), time: 90000 });

      buttonCollector.on("collect", async (interaction) => {
        if (interaction.customId === "prev_warn_page") currentPage--;
        else if (interaction.customId === "next_warn_page") currentPage++;
        await interaction.update({ embeds: [generateWarningEmbed(currentPage)], components: [generateWarningButtons(currentPage)] });
      });

      textCollector.on("collect", async (msg) => {
        const targetPage = parseInt(msg.content.trim(), 10);
        if (targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage - 1;
          await embedMessage.edit({ embeds: [generateWarningEmbed(currentPage)], components: [generateWarningButtons(currentPage)] }).catch(() => null);
          msg.delete().catch(() => null);
        }
      });

      buttonCollector.on("end", () => {
        textCollector.stop();
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_warn_page").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("next_warn_page").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(true)
        );
        embedMessage.edit({ components: [disabledRow] }).catch(() => null);
      });
    }
    return true;
  }

  // ================= UNWARN =================
  if (command === "unwarn") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    const warnId = args[1];

    if (!member || !warnId) return message.reply(`Usage: \`${prefix}unwarn @user warnId\``);
    const warnings = data.warnings[member.id] || [];
    const before = warnings.length;

    data.warnings[member.id] = warnings.filter(w => w.id !== warnId);
    saveData();
    if (before === data.warnings[member.id].length) return message.reply("❌ Warn ID not found.");
    return message.reply(`✅ Removed warning \`${warnId}\` from ${member.user.tag}`);
  }

  // ================= SETNICK =================
  if (command === "setnick") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return message.reply("❌ I need Manage Nicknames permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``);

    const newNick = args.slice(1).join(" ").trim();
    if (!newNick) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``);
    if (newNick.length > 32) return message.reply("❌ Nickname max length is 32 characters.");

    try {
      await member.setNickname(newNick, `Changed by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle("✏️ Nickname Changed")
        .setColor(0x5865f2)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "New Nickname", value: newNick, inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);
      return message.reply(`✅ Changed nickname for ${member.user.tag} to **${newNick}**`);
    } catch (err) {
      console.error("Setnick error:", err);
      return message.reply("❌ I cannot change that nickname. Check role hierarchy permissions.");
    }
  }

  // ================= MUTE / TIMEOUT =================
  if (command === "mute" || command === "timeout") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ I need Moderate Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}mute @user 10m [reason]\``);
    const durationText = args[1];
    const durationMs = parseDuration(durationText);

    if (!durationMs) return message.reply("❌ Use time values like `10s`, `5m`, `2h`, `1d`.");
    if (durationMs > 14 * 24 * 60 * 60 * 1000) return message.reply("❌ Maximum timeout length is 14 days.");
    const reason = args.slice(2).join(" ") || "No reason specified";

    try {
      await member.timeout(durationMs, reason);
      
      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].mutes++;
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🔇 User Muted")
        .setColor(0x3b82f6)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Duration", value: durationText, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);
      return message.reply(`🔇 **Muted** ${member.user.tag} for ${durationText} | Reason: *${reason}*`);
    } catch (err) {
      console.error("Mute error:", err);
      return message.reply("❌ Failed to mute user. Their role level may be higher than mine.");
    }
  }

  // ================= UNMUTE =================
  if (command === "unmute") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}unmute @user\``);

    try {
      if (!member.communicationDisabledUntilTimestamp) {
        return message.reply(`ℹ️ **${member.user.tag}** is not currently muted.`);
      }

      await member.timeout(null);
      return message.reply(`🔊 **Unmuted** ${member.user.tag}`);
    } catch (err) {
      console.error("Unmute error:", err);
      return message.reply("❌ Failed to remove timeout from member.");
    }
  }

  // ================= KICK =================
  if (command === "kick") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("❌ I need Kick Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}kick @user [reason]\``);
    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.kickable) {
      return message.reply("❌ I cannot kick this user. They are staff or hold a higher role.");
    }

    const reason = args.slice(1).join(" ") || "No reason specified";

    try {
      const embed = new EmbedBuilder()
        .setTitle("👢 User Kicked")
        .setColor(0xef4444)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();
      
      await member.send({ embeds: [embed] }).catch(() => null);
      await member.kick(reason);

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].kicks++;
      saveData();
      await sendModLog(embed);

      return message.reply(`👢 **Kicked** ${member.user.tag}`);
    } catch (err) {
      console.error("Kick error:", err);
      return message.reply("❌ A structural error occurred while executing the kick.");
    }
  }

  // ================= BAN =================
  if (command === "ban") {
    // Stage 1: Fall back on your custom helper check, but enforce a hard Administrator permission fallback
    const { PermissionFlagsBits } = require("discord.js");
    
    const isCustomMod = typeof canBanUsers === "function" && canBanUsers(message);
    const isHardAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isCustomMod && !isHardAdmin) {
      return message.reply("❌ Only admin+ can ban.");
    }
    
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}ban @user [reason]\``);
    if (!member.bannable) return message.reply("❌ I cannot ban this member (higher roles or missing permissions).");

    const reason = args.slice(1).join(" ") || "No reason specified";

    try {
      await member.ban({ 
        deleteMessageSeconds: 604800, 
        reason: reason 
      });

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].bans++;
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🔨 Member Banned & Cleared")
        .setColor(0xef4444)
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Action Taken", value: "Banned permanently + 7 days of message history deleted.", inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);

      return message.reply(`🔨 **Banned** ${member.user.tag} and wiped their recent messages.`);
    } catch (err) {
      console.error("Ban error:", err);
      return message.reply("❌ Failed to process server ban configuration.");
    }
  }

  // ================= SOFTBAN =================
  if (command === "softban") {
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can softban.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}softban @user [reason]\``);
    if (!member.bannable) return message.reply("❌ I cannot softban this member.");

    const reason = args.slice(1).join(" ") || "Raid/Spam cleanup";

    try {
      await member.ban({ 
        deleteMessageSeconds: 604800, 
        reason: `[Softban] ${reason}` 
      });
      await message.guild.members.unban(member.id, "Softban completion (unban)").catch(() => null);

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].kicks++; // Counts dynamically as message scrubbing/kick profile
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Member Softbanned")
        .setColor(0x3b82f6)
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Action Taken", value: "Kicked from server + 7 days of message history wiped.", inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);

      return message.reply(`🛡️ **Softbanned** ${member.user.tag} (Messages wiped, user kicked).`);
    } catch (err) {
      console.error("Softban error:", err);
      return message.reply("❌ Failed to finish target account softban.");
    }
  }

  // ================= UNBAN =================
  if (command === "unban") {
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can unban.");
    const userId = args[0];
    if (!userId) return message.reply(`Usage: \`${prefix}unban USER_ID [reason]\``);

    const reason = args.slice(1).join(" ") || "No reason specified";
    try {
      await message.guild.members.unban(userId, reason);
      return message.reply(`✅ Successfully unbanned \`${userId}\``);
    } catch (err) {
      console.error("UNBAN ERROR:", err);
      return message.reply(`❌ Failed to unban user ID.\n\`${err.message}\``);
    }
  }
  
  // ================= PURGE =================
  if (command === "purge") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("I need Manage Messages permission.");
    }

    const amount = parseInt(args[0], 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      return message.reply(`Usage: \`${prefix}purge 1\``);
    }

    const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
    if (!deleted) return message.reply("Could not purge messages.");
    const msg = await message.channel.send(`✅ Purged ${deleted.size} messages.`);
    await deleteAfter(msg);
    await deleteAfter(message);
    return true;
  }

// ================= ROLE COMMAND (NO PING) =================
  if (command === "role") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need Manage Roles permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}role @user [role name or ID]\``);

    const roleQuery = args.slice(1).join(" ").trim();
    if (!roleQuery) return message.reply("❌ Please provide a role name or ID.");

    // Find role by text matching or ID directly without looking at mentions to avoid pings
    const role = message.guild.roles.cache.find(r => r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase());
    if (!role) return message.reply(`❌ Could not find a role matching \`${roleQuery}\`.`);
    if (role.managed) return message.reply("❌ I cannot manage an integration role.");
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }
    if (role.position >= message.member.roles.highest.position) {
      return message.reply("❌ You cannot give/remove a role equal to or higher than your highest role.");
    }

    try {
      if (member.roles.cache.has(role.id)) {
        await member.roles.remove(role, `Toggled by ${message.author.tag}`);
        return message.reply(`✅ Removed role **${role.name}** from ${member.user.tag} (No Pings).`);
      } else {
        await member.roles.add(role, `Toggled by ${message.author.tag}`);
        return message.reply(`✅ Added role **${role.name}** to ${member.user.tag} (No Pings).`);
      }
    } catch (err) {
      console.error(err);
      return message.reply("❌ Unable to modify user roles.");
    }
  }

  // ================= TEMPORARY ROLE COMMAND (NO PING) =================
  if (command === "temprole") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need Manage Roles permission.");
    }

    // Expecting: ?temprole @user 7d VIP
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}temprole @user [duration] [role name]\` (e.g., \`${prefix}temprole @user 7d Premium\`)`);

    const durationText = args[1];
    const durationMs = parseDuration(durationText);
    if (!durationMs) return message.reply("❌ Invalid duration format. Use formatting like `1h`, `12h`, `3d`, or `7d`.");

    const roleQuery = args.slice(2).join(" ").trim();
    if (!roleQuery) return message.reply("❌ Please specify the role name or ID to grant.");

    const role = message.guild.roles.cache.find(r => r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase());
    if (!role) return message.reply(`❌ Could not find a role matching \`${roleQuery}\`.`);
    if (role.managed) return message.reply("❌ I cannot manage an integration role.");
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }
    if (role.position >= message.member.roles.highest.position) {
      return message.reply("❌ You cannot give a role equal to or higher than your highest role.");
    }

    try {
      // Grant role instantly
      await member.roles.add(role, `Temp role assigned by ${message.author.tag} for ${durationText}`);

      const expiryTimestamp = Date.now() + durationMs;
      
      // Filter out any existing tracking entries for this specific user and role combo to prevent duplication issues
      data.tempRoles = data.tempRoles.filter(r => !(r.userId === member.id && r.roleId === role.id));
      
      data.tempRoles.push({
        userId: member.id,
        roleId: role.id,
        expiry: expiryTimestamp
      });
      saveData();

      return message.reply(`⏳ Added temporary role **${role.name}** to ${member.user.tag} for **${durationText}** (No Pings).`);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to assign temporary role configuration.");
    }
  }

  // ================= BLACKLIST ADD =================
  if (command === "bl" || command === "blacklist") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const word = args.join(" ").trim().toLowerCase();
    if (!word) return message.reply(`Usage: \`${prefix}bl word\``);
    if (CORE_BLACKLIST.includes(word) || data.words.includes(word)) {
      const reply = await message.reply(`⚠️ \`${word}\` is already blacklisted.`);
      await deleteAfter(reply);
      await deleteAfter(message);
      return true;
    }

    data.words.push(word);
    saveData();
    const reply = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚫 Word Blacklisted")
          .setColor(0xef4444)
          .setDescription(`Added \`${word}\` to the blacklist.`)
          .setFooter({ text: "AutoMod updated" })
          .setTimestamp()
      ]
    }).catch(() => null);
    await deleteAfter(reply);
    await deleteAfter(message);
    return true;
  }

  // ================= BLACKLIST REMOVE =================
  if (command === "unbl" || command === "unblacklist") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const word = args.join(" ").trim().toLowerCase();
    if (!word) return message.reply(`Usage: \`${prefix}unbl word\``);
    if (CORE_BLACKLIST.includes(word)) {
      const reply = await message.reply(`❌ \`${word}\` is protected and cannot be removed.`);
      await deleteAfter(reply);
      await deleteAfter(message);
      return true;
    }

    const before = data.words.length;
    data.words = data.words.filter(w => w !== word);
    saveData();

    if (before === data.words.length) {
      const reply = await message.reply(`⚠️ \`${word}\` was not found in blacklist.`);
      await deleteAfter(reply);
      await deleteAfter(message);
      return true;
    }

    const reply = await message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Word Removed")
          .setColor(0x22c55e)
          .setDescription(`Removed \`${word}\` from the blacklist.`)
          .setFooter({ text: "AutoMod updated" })
          .setTimestamp()
      ]
    }).catch(() => null);

    await deleteAfter(reply);
    await deleteAfter(message);
    return true;
  }

  // ================= BLACKLIST WORDS =================
  if (command === "words") {
    const allWords = [...new Set([...CORE_BLACKLIST, ...data.words])];
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚫 Blacklisted Words")
          .setColor(0x5865f2)
          .setDescription(allWords.map(w => `\`${w}\``).join(", ").slice(0, 4000))
          .setFooter({ text: `${allWords.length} word(s) blocked` })
      ]
    });
  }

  // ================= MOD STATS =================
  if (command === "modstats") {
    const member = (await findTargetMember(message, args)) || message.member;
    const stats = data.modStats[member.id] || { warns: 0, mutes: 0, kicks: 0, bans: 0 };
    const embed = new EmbedBuilder()
      .setTitle(`📊 Mod Stats • ${member.user.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "⚠️ Warns", value: String(stats.warns || 0), inline: true },
        { name: "🔇 Mutes", value: String(stats.mutes || 0), inline: true },
        { name: "👢 Kicks", value: String(stats.kicks || 0), inline: true },
        { name: "🔨 Bans", value: String(stats.bans || 0), inline: true }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  // ================= SNIPE =================
  if (command === "snipe") {
    if (args[0]?.toLowerCase() === "on") {
      if (!canManageGuild(message)) return message.reply("❌ No permission.");
      data.snipeEnabled = true;
      saveData();
      return message.reply("✅ Snipe enabled.");
    }

    if (args[0]?.toLowerCase() === "off") {
      if (!canManageGuild(message)) return message.reply("❌ No permission.");
      data.snipeEnabled = false;
      saveData();
      return message.reply("❌ Snipe disabled.");
    }

    if (!data.snipeEnabled) {
      return message.reply("❌ Snipe is disabled.");
    }

    const snipes = data.snipes?.[message.channel.id];
    if (!snipes || !snipes.length) {
      return message.reply("Nothing to snipe.");
    }

    const index = parseInt(args[0]) || 1;
    const snipe = snipes[index - 1];

    if (!snipe) {
      return message.reply(`Only ${snipes.length} deleted messages stored.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📌 Sniped Message #${index}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "Author", value: `<@${snipe.authorId}>`, inline: true },
        { name: "Deleted", value: `<t:${Math.floor(snipe.deletedAt / 1000)}:R>`, inline: true },
        { name: "Message", value: snipe.content.slice(0, 1024) }
      )
      .setFooter({ text: `${index}/${snipes.length} stored snipes` });

    return message.reply({ embeds: [embed] });
  }
  
  // ================= SNIPES =================
  if (command === "snipes") {
    const snipes = data.snipes?.[message.channel.id];
    if (!snipes || !snipes.length) {
      return message.reply("Nothing to snipe.");
    }

    const embed = new EmbedBuilder()
      .setTitle("📌 Recent Deleted Messages")
      .setColor(0x5865f2)
      .setDescription(
        snipes
          .slice(0, 5)
          .map((s, i) => `**${i + 1}.** <@${s.authorId}> • <t:${Math.floor(s.deletedAt / 1000)}:R>\n${s.content}`)
          .join("\n\n")
      )
      .setFooter({ text: `${snipes.length} stored deleted messages` });

    return message.reply({ embeds: [embed] });
  }
  
// // ================= HELP =================
  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🔥 Don Don Commands")
      .setDescription(`Prefix: \`${prefix}\``)
      .addFields(
        {
          name: "🛡️ Moderation & AutoMod",
          value: 
            `\`${prefix}warn\` \`${prefix}warnings\` \`${prefix}unwarn\` \`${prefix}mute\` \`${prefix}unmute\`\n` +
            `\`${prefix}kick\` \`${prefix}ban\` \`${prefix}unban\` \`${prefix}purge\` \`${prefix}modstats\` \`${prefix}modlogs\`\n` +
            `\`${prefix}bl\` \`${prefix}unbl\` \`${prefix}words\` \`${prefix}staffguide\` \`${prefix}staffguidedit\``
        },
        {
          name: "🔒 Advanced Verification",
          value:
            `\`${prefix}verify settings\` • \`${prefix}verify scan @user\` • \`${prefix}verify massscan\`\n` +
            `\`${prefix}verify verifiedrole\` • \`${prefix}verify unverifiedrole\`\n` +
            `\`${prefix}verify trusteddays\` • \`${prefix}verify autoban\` • \`${prefix}verify autokick\``
        },
        {
          name: "⚙️ Server, Auction & Channels",
          value:
            `\`${prefix}setprefix\` \`${prefix}setnick\` \`${prefix}role\` \`${prefix}temprole\` \`${prefix}rename\`\n` +
            `\`${prefix}purchase\` (or \`${prefix}buy\`) • \`${prefix}purchedit\`\n` +
            `\`${prefix}snipe/s\` \`${prefix}snipe (on/off)\` \`${prefix}slowmode\` • \`${prefix}auction\` \`${prefix}bid\``
        },
        {
          name: "🌍 Utility & Translation",
          value:
            `\`${prefix}translate [lang] [text]\` • Auto-detects text to target language.\n` +
            `▫️ Languages: \`en\`, \`lt\`, \`es\`, \`fr\`, \`de\`, \`pl\`, \`ru\`, \`tr\`, \`ja\`\n` +
            `▫️ Utilities: \`${prefix}afk\` \`${prefix}timer\` \`${prefix}ping\` \`${prefix}birthday\` \`${prefix}bday\` \`${prefix}status\` \`${prefix}joininfo\``
        }
      )
      .setTimestamp();
      
    if (data.customCommands && Object.keys(data.customCommands).length) {
      embed.addFields({
        name: "💬 Custom",
        value: Object.keys(data.customCommands).map(cmd => `\`${prefix}${cmd}\``).join(" ").slice(0, 1024)
      });
    }

    return message.reply({ embeds: [embed] });
  }

  return false;
}

// ================= BOT START =================
function startBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ]
  });

// FIXED: Changed event handler name back to "ready" to repair boot sequence crash
  client.once("ready", () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
    // Look for and strip expired temporary roles every 60 seconds
    setInterval(async () => {
      const now = Date.now();
      // Loop through all guilds stored in database
      for (const guildId in store) {
        const guildData = store[guildId];
        if (!guildData.tempRoles || !guildData.tempRoles.length) continue;

        const remainingTempRoles = [];
        let dataChanged = false;

        for (const record of guildData.tempRoles) {
          if (now >= record.expiry) {
            dataChanged = true;
            try {
              const guild = await client.guilds.fetch(guildId).catch(() => null);
              if (!guild) continue;

              const member = await guild.members.fetch(record.userId).catch(() => null);
              const role = await guild.roles.fetch(record.roleId).catch(() => null);

              if (member && role && member.roles.cache.has(role.id)) {
                await member.roles.remove(role, "Temporary role duration expired.");
                console.log(`[TEMPROLE] Removed ${role.name} from ${member.user.tag}.`);
              }
            } catch (err) {
              console.error("[TEMPROLE ERROR] Failed to process expiration:", err);
            }
          } else {
            remainingTempRoles.push(record);
          }
        }

        if (dataChanged) {
          store[guildId].tempRoles = remainingTempRoles;
          saveData();
        }
      }
    }, 60 * 1000);
    
    try {
      const { loadAfks } = require("./commands/afk.js");
      // FIXED: Pass the raw complete database 'store' instead of an empty getGuildData call
      loadAfks(store || {}); 
    } catch(err) {
      console.error("Failed to load AFK memory layers on setup:", err);
    }

    initTimers(client);
    console.log("⏰ Real-time dynamic timer system initialized.");

    setInterval(() => {
      checkBirthdays(client, getGuildData, saveData).catch(console.error);
    }, 60 * 60 * 1000);

    checkBirthdays(client, getGuildData, saveData).catch(console.error);
  });

// ================= MESSAGE CREATE INTERCEPT PIPELINE =================
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content) return;

      const data = getGuildData(message.guild.id);
      const prefix = data.prefix || DEFAULT_PREFIX;

      // 1. Check if user is returning from AFK state
      const userReturned = await handleAfkMentionsAndReturn(message, prefix, getGuildData, saveData);
      if (userReturned) return;

      // 2. Automod Filter Core Evaluation
      const bypassRoleId = "1492630307650666546";
      const hasBypassDiscordInvite = message.member?.roles.cache.has(bypassRoleId) || false;
      const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/\S+/gi;
      const containsDiscordInvite = discordInviteRegex.test(message.content);
      const allowDiscordInvite = hasBypassDiscordInvite && containsDiscordInvite;

      const protectedWord = containsBlacklistedWord(message.content, PROTECTED_BLACKLIST);
      if (protectedWord) {
        await message.delete().catch(() => null);
        await sendAutomodLog(message, protectedWord);
        return;
      }

      if (!message.content.startsWith(prefix) && !hasBypassRole(message) && !allowDiscordInvite) {
        const word = containsBlacklistedWord(message.content, [...CORE_BLACKLIST, ...data.words, ...(data.blockedLinks || [])]);
        if (word) {
          await message.delete().catch(() => null);
          await sendAutomodLog(message, word);
          return;
        }
      }

      // 3. INITIALIZE COUNTER FIELDS SECURITY
      if (!data.channelCounters) data.channelCounters = {};
      if (!data.channelCounters[message.channel.id]) data.channelCounters[message.channel.id] = 0;
      if (typeof data.currentPersonaIndex !== "number") data.currentPersonaIndex = 0;

      const isAiCommand = message.content.startsWith(`${prefix}ai`);
      const isStatusCommand = message.content.startsWith(`${prefix}status`);
      
      let isReplyToBot = false;
      if (message.reference && message.reference.messageId) {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg && repliedMsg.author.id === client.user.id) {
          isReplyToBot = true;
        }
      }

      // 4. INCREMENT CHAT ENTRIES (Tracks message counts silently)
      if (!isAiCommand && !isStatusCommand && !isReplyToBot && !message.content.startsWith(prefix)) {
        data.channelCounters[message.channel.id]++;
        
        if (data.channelCounters[message.channel.id] >= 50) {
          data.channelCounters[message.channel.id] = 0; // Reset counter for the channel
          data.currentPersonaIndex += 1; // Swap to the next persona configuration array index
        }
        
        store[message.guild.id] = data;
        saveData();
      }

      // 5. Process Standard Commands
      const wasCommand = await handleCommands(message, getGuildData);
      if (wasCommand) return;

      // 6. ================= AI TRIGGER ENGINE RESPONSES =================
      // Now it ONLY triggers if they explicitly typed an AI command or replied directly to the bot
      if (!isAiCommand && !isReplyToBot) return;

      let triggerText = message.content;
      if (isAiCommand) {
        triggerText = message.content.slice(`${prefix}ai`.length).trim();
        if (!triggerText) return message.reply(`Usage: \`${prefix}ai [your question]\``);
      }

      const aiReply = await generateAiReply(message, triggerText, [], data.currentPersonaIndex);
      if (aiReply) {
        return message.reply({ 
          content: aiReply, 
          allowedMentions: { parse: [], repliedUser: true }
        });
      }

    } catch (err) {
      console.error("Error running inside messageCreate pipeline:", err);
    }
  });

  // BACKGROUND TASK: Save snipes when messages are deleted
  client.on("messageDelete", async (message) => {
    try {
      if (!message.guild || message.author?.bot) return;
      const data = getGuildData(message.guild.id);
      if (data.snipeEnabled) {
        saveSnipe(message);
      }
    } catch (err) {
      console.error("Error executing background snipe logger:", err);
    }
  });
  
// SECURITY HANDLER & WELCOME LOGGER: Anti-Raid Gatekeeper & Member Milestones
  client.on("guildMemberAdd", async (member) => {
    try {
      const data = getGuildData(member.guild.id);
      if (!data || !data.verification) return;

      // Calculate total server member milestones live
      const memberCount = member.guild.memberCount;

      const isKickEnabled = data.verification.autokick;
      const isBanEnabled = data.verification.autoban;

      const verifyEngine = require("./commands/verify.js");
      let diagnostics = { riskScore: 0, reasons: [] };
      
      if (verifyEngine && typeof verifyEngine.runScanDiagnostics === "function") {
        diagnostics = verifyEngine.runScanDiagnostics(member, data.verification);
      }

      // 1. If the account fails security age checks, run secure log action and exit early
      if ((isKickEnabled || isBanEnabled) && diagnostics.riskScore >= 50) {
        const actionType = isBanEnabled ? "BANNED" : "KICKED";
        const actionEmoji = isBanEnabled ? "🔨" : "🛡️";

        const DMEmbed = new EmbedBuilder()
          .setColor(0xef4444)
          .setTitle(`${actionEmoji} Anti-Raid Protection Protocol`)
          .setDescription(`You were automatically **${actionType.toLowerCase()}** from **${member.guild.name}** because your account is too new.\n\nOur safety infrastructure requires joining profiles to be at least \`${data.verification.trustedDays || 7} Days\` old.`);

        await member.send({ embeds: [DMEmbed] }).catch(() => {});

        if (isBanEnabled) {
          await member.ban({ deleteMessageSeconds: 604800, reason: `Anti-Raid Auto-Ban: Creation age fell below threshold (${diagnostics.reasons.join(", ")})` });
        } else {
          await member.kick(`Anti-Raid Auto-Kick: Creation age fell below threshold (${diagnostics.reasons.join(", ")})`);
        }
        
        const alertEmbed = new EmbedBuilder()
          .setTitle(`${actionEmoji} Secure Anti-Raid Action Executed`)
          .setColor(0xef4444)
          .addFields(
            { name: "Action Taken", value: `\`AUTO-${actionType}\``, inline: true },
            { name: "Target Profile", value: `\`${member.user.username}\` (<@${member.id}>)`, inline: true },
            { name: "Threat Diagnostics", value: `\`${diagnostics.riskScore}%\` (${diagnostics.reasons.join(", ")})`, inline: false }
          )
          .setTimestamp();
          
        await sendModLog(alertEmbed);
        return; 
      }

      // 2. STANDARD SLEEK LOG CARD: Keeps account creation date and join milestone in your logs forever!
      const joinEmbed = new EmbedBuilder()
        .setAuthor({ name: `${member.user.tag} joined the server`, iconURL: member.user.displayAvatarURL({ dynamic: true }) })
        .setColor("#22C55E")
        .setDescription(`📥 <@${member.id}> is **Member #${memberCount}** to arrive!`)
        .addFields(
          { 
            name: "📅 Account Created", 
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:F> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)`, 
            inline: false 
          }
        )
        .setTimestamp();

      // This pushes it straight to your designated logging channel text stream
      await sendModLog(joinEmbed);

    } catch (err) {
      console.error("Critical Failure in Security Join Handler:", err);
    }
  });
  
  client.login(process.env.DISCORD_TOKEN);
}

function getClient() {
  return client;
}

module.exports = {
  startBot,
  getClient
};
