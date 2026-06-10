const { initTimers, handleTimerCommand } = require("./commands/timer.js");
const { handleChannelToolsCommand } = require("./commands/channelTools");
const { handleBuyCommand } = require("./commands/buy");
const { handleAfkCommand, handleAfkMentionsAndReturn } = require("./commands/afk");
const { handleAuctionCommand } = require("./commands/auction");
const { handleModLogsCommand } = require("./commands/modlogs");
const { generateAiReply } = require("./commands/aiReply");
const { handleImageGeneration } = require("./commands/imageGen.js");
const { checkBirthdays, handleBirthdayCommand } = require("./commands/birthday");
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
      birthdays: {}
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

// Check if a member is a staff member
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

// ================= COMMANDS =================
async function handleCommands(message) {
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
        console.error("AI unavailable:", err.code || err.message);
        return true;
      }

      if (!aiReply) return message.reply("AI unavailable rn.");
      return message.channel.send({
        content: aiReply,
        allowedMentions: { parse: [] }
      });
    }

    const response = typeof custom === "string" ? custom : custom.response || "No response set.";
    const allowPings = typeof custom === "object" && custom.allowPings === true;
    if (allowPings) {
      return message.reply({
        content: response,
        allowedMentions: { repliedUser: true }
      });
    }

    return message.channel.send({
      content: response,
      allowedMentions: { parse: [] }
    });
  }

  // ================= IMAGE COMMAND ROUTER =================
  if (command === "image") {
    return handleImageGeneration(message, args, prefix);
  }

  if (command === "birthday" || command === "bday") {
    return handleBirthdayCommand(
      message,
      args,
      prefix,
      getGuildData,
      saveData
    );
  }
  // ================= AFK / AUCTION / CHANNEL TOOLS =================
  if (command === "timer") {
    return handleTimerCommand(message, args);
  }
  if (command === "slowmode") {
    return handleChannelToolsCommand(message, args, prefix, command, canManageGuild);
  }
  if (command === "purchase") return handleBuyCommand(message, args, prefix, canManageGuild);
  if (command === "afk") return handleAfkCommand(message, args, prefix);
  if (command === "auction") return handleAuctionCommand(message, args, prefix);
  if (command === "bid") return handleAuctionCommand(message, ["bid", ...args], prefix);
  
  if (command === "modlogs") {
    return handleModLogsCommand(message, args, prefix, getGuildData);
  }

  // ================= PING =================
  if (command === "ping") {
    const msg = await message.reply("🏓 Pinging...").catch(() => null);
    if (!msg) return true;

    const latency = msg.createdTimestamp - message.createdTimestamp;
    const api = Math.round(client.ws.ping);
    return msg.edit(`🏓 Pong!\n📨 Message: \`${latency}ms\`\n🌐 API: \`${api}ms\``).catch(() => null);
  }

  // ================= PREFIX =================
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

  // ================= WARNINGS (PAGINATED EMBED GRID) =================
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
    if (before === data.warnings[member.id].length) return message.reply("Warn ID not found.");
    return message.reply(`✅ Removed warning \`${warnId}\``);
  }

  // ================= SETNICK =================
  if (command === "setnick") {
    if (!canManageGuild(message)) {
      return message.reply("❌ No permission.");
    }

    if (
      !message.guild.members.me.permissions.has(
        PermissionsBitField.Flags.ManageNicknames
      )
    ) {
      return message.reply(
        "❌ I need Manage Nicknames permission."
      );
    }

    const member = await findTargetMember(message, args);
    if (!member) {
      return message.reply(
        `Usage: \`${prefix}setnick @user new nickname\``
      );
    }

    const newNick = args.slice(1).join(" ").trim();

    if (!newNick) {
      return message.reply(
        `Usage: \`${prefix}setnick @user new nickname\``
      );
    }

    if (newNick.length > 32) {
      return message.reply(
        "❌ Nickname max length is 32 characters."
      );
    }

    try {
      await member.setNickname(
        newNick,
        `Changed by ${message.author.tag}`
      );
      const embed = new EmbedBuilder()
        .setTitle("✏️ Nickname Changed")
        .setColor(0x5865f2)
        .addFields(
          {
            name: "User",
            value: `${member.user.tag}`,
            inline: true
          },
          {
            name: "Moderator",
            value: `${message.author.tag}`,
            inline: true
          },
          {
            name: "New Nickname",
            value: newNick,
            inline: false
          }
        )
        .setTimestamp();
      await sendModLog(embed);

      return message.reply(
        `✅ Changed nickname for ${member.user.tag} to **${newNick}**`
      );
    } catch (err) {
      console.error("Setnick error:", err);
      return message.reply(
        "❌ I cannot change that nickname. My role must be above the target user's highest role."
      );
    }
  }

  // ================= MUTE =================
  if (command === "mute" || command === "timeout") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("I need Moderate Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}mute @user 1min reason\``);
    const durationText = args[1];
    const durationMs = parseDuration(durationText);

    if (!durationMs) return message.reply("Use time like `10s`, `1min`, `1h`, `1d`.");
    if (durationMs > 14 * 24 * 60 * 60 * 1000) return message.reply("Max mute is 14 days.");
    const reason = args.slice(2).join(" ") || "No reason";

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
        { name: "Duration", value: durationText, inline: true },
        { name: "Reason", value: reason, inline: false }
      )
      .setTimestamp();
    await sendModLog(embed);
    return message.reply(`🔇 Muted ${member.user.tag} for ${durationText}`);
  }

  // ================= UNMUTE =================
  if (command === "unmute") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}unmute @user\``);

    await member.timeout(null);
    return message.reply(`🔊 Unmuted ${member.user.tag}`);
  }

  // ================= KICK =================
  if (command === "kick") {
    if (!args[0]) return message.reply(`Usage: \`${prefix}kick @user reason\``);
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("❌ I need Kick Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}kick @user reason\``);
    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.kickable) {
      return;
    }

    const reason = args.slice(1).join(" ") || "No reason";
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

    return message.reply(`👢 Kicked ${member.user.tag}`);
  }

  // ================= BAN =================
  if (command === "ban") {
    if (!args[0]) return message.reply(`Usage: \`${prefix}ban @user reason\``);
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can ban.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply("❌ I need Ban Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}ban @user reason\``);
    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.bannable) {
      return;
    }

    const reason = args.slice(1).join(" ") || "No reason";
    const embed = new EmbedBuilder()
      .setTitle("🔨 User Banned")
      .setColor(0xef4444)
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true },
        { name: "Moderator", value: `${message.author.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false }
      )
      .setTimestamp();
    await member.send({ embeds: [embed] }).catch(() => null);
    await member.ban({ reason });
    if (!data.modStats[message.author.id]) {
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
    }
    data.modStats[message.author.id].bans++;
    saveData();
    await sendModLog(embed);

    return message.reply(`🔨 Banned ${member.user.tag}`);
  }

  // ================= UNBAN =================
  if (command === "unban") {
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can unban.");
    const userId = args[0];
    if (!userId) return message.reply(`Usage: \`${prefix}unban userId reason\``);

    const reason = args.slice(1).join(" ") || "No reason";
    await message.guild.members.unban(userId, reason).catch(() => null);
    return message.reply(`✅ Unbanned \`${userId}\``);
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

  // ================= ROLE =================
  if (command === "role") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("I need Manage Roles permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}role @user role\``);
    const roleInput = args.slice(1).join(" ").trim();
    if (!roleInput) return message.reply(`Usage: \`${prefix}role @user role\``);
    const role =
      message.mentions.roles.first() ||
      message.guild.roles.cache.get(roleInput.replace(/[<@&>]/g, "")) ||
      message.guild.roles.cache.find(
        r => r.name.toLowerCase() === roleInput.toLowerCase()
      );
    if (!role) return message.reply("Role not found.");
    if (role.managed) return message.reply("I cannot manage that role.");
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }
    if (role.position >= message.member.roles.highest.position) {
      return message.reply("❌ You cannot give/remove a role equal or higher than your highest role.");
    }

    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return message.reply(`✅ Removed **${role.name}** from ${member.user.tag}`);
    }

    await member.roles.add(role);
    return message.reply(`✅ Added **${role.name}** to ${member.user.tag}`);
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

  // ================= HELP =================
  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("🔥 Dashboard Bot Commands")
      .setDescription(`Current Prefix: \`${prefix}\``)
      .addFields(
        {
          name: "🛡️ Moderation",
          value:
            `\`${prefix}warn\` • \`${prefix}warnings\` • \`${prefix}unwarn\`\n` +
            `\`${prefix}mute\` • \`${prefix}unmute\`\n` +
            `\`${prefix}kick\` • \`${prefix}ban\` • \`${prefix}unban\`\n` +
            `\`${prefix}purge\` • \`${prefix}modstats\` • \`${prefix}modlogs\``,
          inline: false
        },
        {
          name: "🎨 AI Images",
          value: `\`${prefix}image\``,
          inline: false
        },
        {
          name: "⚙️ Server",
          value:
            `\`${prefix}setprefix\` • \`${prefix}setnick\`\n` +
            `\`${prefix}role\` • \`${prefix}purchase\``,
          inline: false
        },
        {
          name: "🚫 AutoMod",
          value:
            `\`${prefix}bl\` • \`${prefix}unbl\` • \`${prefix}words\``,
          inline: false
        },
        {
          name: "🏆 Auction",
          value:
            `\`${prefix}auction\` • \`${prefix}bid\``,
          inline: false
        },
        {
          name: "🔒 Channels",
          value:
            `\`${prefix}slowmode\``,
          inline: false
        },
        {
          name: "💤 Utility",
          value:
            `\`${prefix}afk\` • \`${prefix}timer\` • \`${prefix}ping\`\n` + 
            `\`${prefix}birthday set DD-MM\`\n` +
            `\`${prefix}birthday me\`\n` +
            `\`${prefix}birthday @user\`\n` +
            `\`${prefix}birthday closest\``,
          inline: false
        }
      )
      .setFooter({
        text: "🔥 Don Bot"
      })
      .setTimestamp();
    if (data.customCommands && Object.keys(data.customCommands).length) {
      embed.addFields({
        name: "💬 Custom Commands",
        value: Object.keys(data.customCommands)
          .map(cmd => `\`${prefix}${cmd}\``)
          .join(" • ")
          .slice(0, 1000),
        inline: false
      });
    }

    return message.reply({ embeds: [embed] });
  }

  // ================= AI FALLBACK CHAT =================
  const messages = await message.channel.messages.fetch({ limit: 30 });
  const history = [...messages.values()]
    .reverse()
    .filter(m => !m.author.bot)
    .map(m => ({
      author: m.author.username,
      content: m.content
    }));
  const aiReply = await generateAiReply(message, message.content, history);
  if (aiReply) {
    return message.reply({
      content: aiReply,
      allowedMentions: { parse: [], repliedUser: false }
    });
  }

  return true;
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
  client.once("ready", async () => {
    console.log(`Ready as ${client.user.tag}`);

    // START ACTIVE TIMERS TRACKING ON INITIALIZATION
    initTimers(client);

    for (const guild of client.guilds.cache.values()) {
      const me = guild.members.me;
      if (!me?.permissions.has(PermissionsBitField.Flags.ManageNicknames)) continue;

      const members = await guild.members.fetch().catch(() => null);
      if (!members) continue;

      for (const member of members.values()) {
        if (member.user.bot) continue;
        if (!member.manageable) continue;

        const nick = member.nickname;
        if (!nick || !nick.startsWith("[AFK] ")) continue;

        const cleanNick = nick.replace(/^\[AFK\]\s*/i, "").slice(0, 32);
        await member
          .setNickname(cleanNick || null, "Bot restarted - clearing AFK nickname")
          .catch(() => null);
      }
    }

    // Birthday interval task runner (registered once globally, not nested)
    setInterval(() => {
      checkBirthdays(
        client,
        getGuildData,
        saveData
      ).catch(console.error);
    }, 60 * 60 * 1000);

    checkBirthdays(
      client,
      getGuildData,
      saveData
    ).catch(console.error);
  });

  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content) return;

      const data = getGuildData(message.guild.id);
      const prefix = data.prefix || DEFAULT_PREFIX;

      // ================= REPLY TO BOT AI =================
      if (message.reference && message.reference.messageId) {
        const replied = await message.channel.messages
          .fetch(message.reference.messageId)
          .catch(() => null);

        if (replied && replied.author.id === client.user.id) {
          let aiReply = null;
          try {
            const messages = await message.channel.messages.fetch({ limit: 30 });
            const history = [...messages.values()]
              .reverse()
              .filter(m => !m.author.bot)
              .map(m => ({
                author: m.author.username,
                content: m.content
              }));

            aiReply = await generateAiReply(message, message.content, history);
          } catch (err) {
            console.error("Reply AI error:", err);
          }

          if (aiReply) {
            return message.reply({
              content: aiReply,
              allowedMentions: { parse: [], repliedUser: false }
            });
          }
        }
      }

      await handleAfkMentionsAndReturn(message, prefix);
      // ================= BYPASS ROLE DISCORD INVITE ALLOW =================
      const bypassRoleId = "1492630307650666546";
      const hasBypassDiscordInvite = message.member?.roles.cache.has(bypassRoleId) || false;
      const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/\S+/gi;
      const containsDiscordInvite = discordInviteRegex.test(message.content);
      const allowDiscordInvite = hasBypassDiscordInvite && containsDiscordInvite;
      // ================= AUTOMOD =================
      const isCommand = message.content.startsWith(prefix);
      const isBypass = typeof hasBypassRole === "function" ? hasBypassRole(message) : false;

      const protectedWord = containsBlacklistedWord(message.content, PROTECTED_BLACKLIST);
      if (protectedWord) {
        await message.delete().catch(() => null);
        await sendAutomodLog(message, protectedWord);
        return;
      }

      if (!isCommand && !isBypass && !allowDiscordInvite) {
        const word = containsBlacklistedWord(
          message.content,
          [...CORE_BLACKLIST, ...data.words, ...(data.blockedLinks || [])]
        );
        if (word) {
          await message.delete().catch(() => null);
          await sendAutomodLog(message, word);
          return;
        }
      }

      // ================= PREFIX COMMANDS =================
      const usedCommand = await handleCommands(message);
      // ================= CUSTOM COMMANDS WITHOUT PREFIX =================
      if (!usedCommand) {
        const freshData = getGuildData(message.guild.id);
        const msg = message.content.toLowerCase().trim();
        const custom = freshData.customCommands?.[msg];

        if (custom) {
          const response = typeof custom === "string" ? custom : custom.response || "No response set.";
          const allowPings = typeof custom === "object" && custom.allowPings === true;
          if (allowPings) {
            return message.reply({
              content: response,
              allowedMentions: { repliedUser: true }
            });
          }

          return message.channel.send({
            content: response,
            allowedMentions: { parse: [] }
          });
        }
      }
    } catch (err) {
      console.error("Bot error:", err);
    }
  });

  // ================= BOT INITIATION =================
  client.login(process.env.DISCORD_TOKEN);
}

function getClient() {
  return client;
}

module.exports = {
  startBot,
  getClient
};
