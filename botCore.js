const fs = require("fs");
const path = require("path");
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder
} = require("discord.js");

const BOT_OWNER_ID = process.env.BOT_OWNER_ID || "419893791844204546";
const BOT_OWNER_LABEL = process.env.BOT_OWNER_LABEL || "Laura";
const DEFAULT_PREFIX = process.env.PREFIX || "?";

// Points to your mounted Railway volume (e.g. /data/bot-data.json) or local fallback
const DATA_FILE = process.env.BOT_DATA_FILE
  ? path.resolve(process.env.BOT_DATA_FILE)
  : path.join(__dirname, "bot-data.json");

function createDefaultGuildData() {
  return {
    prefix: DEFAULT_PREFIX,
    staffRoleIds: [],
    modRoleIds: [],
    pingRoleId: null,
    logChannelId: null,
    welcomeChannelId: null,
    afk: {},        // { [userId]: { reason, since } }
    counters: {},   // any custom per-server counters (vouches, warnings, etc.)
    settings: {}    // any custom toggles/strings per server
  };
}

let store = { guilds: {} };

function loadStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    if (!fs.existsSync(DATA_FILE)) {
      saveStore();
      return;
    }

    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = raw.trim() ? JSON.parse(raw) : {};
    store = {
      guilds: parsed.guilds && typeof parsed.guilds === "object" ? parsed.guilds : {}
    };

    // Merge defaults onto existing guilds so updates never crash old data
    for (const guildId of Object.keys(store.guilds)) {
      store.guilds[guildId] = {
        ...createDefaultGuildData(),
        ...store.guilds[guildId],
        afk: store.guilds[guildId].afk || {},
        counters: store.guilds[guildId].counters || {},
        settings: store.guilds[guildId].settings || {}
      };
    }
  } catch (err) {
    console.error("[botCore] Failed to load store:", err);
  }
}

function saveStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const tmpFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(store, null, 2), "utf8");
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    console.error("[botCore] Failed to save store:", err);
  }
}

// Always returns an isolated, clean config for any server
function getGuild(guildId) {
  if (!guildId) return createDefaultGuildData();
  if (!store.guilds[guildId]) {
    store.guilds[guildId] = createDefaultGuildData();
    saveStore();
  }
  return store.guilds[guildId];
}

function updateGuild(guildId, updater) {
  const current = getGuild(guildId);
  const next = typeof updater === "function" ? updater(current) : { ...current, ...updater };
  store.guilds[guildId] = { ...createDefaultGuildData(), ...next };
  saveStore();
  return store.guilds[guildId];
}

function resetGuild(guildId) {
  store.guilds[guildId] = createDefaultGuildData();
  saveStore();
  return store.guilds[guildId];
}

// --- Permission Helper ---
function isGuildStaff(member) {
  if (!member || !member.guild) return false;
  if (member.id === BOT_OWNER_ID) return true;
  if (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  ) {
    return true;
  }
  const cfg = getGuild(member.guild.id);
  const allowed = [...cfg.staffRoleIds, ...cfg.modRoleIds];
  return member.roles.cache.some((r) => allowed.includes(r.id));
}

// --- Per-Server AFK System ---
function setAfk(guildId, userId, reason = "AFK") {
  const cfg = getGuild(guildId);
  cfg.afk[userId] = {
    reason: String(reason || "AFK").slice(0, 200),
    since: Date.now()
  };
  saveStore();
  return cfg.afk[userId];
}

function clearAfk(guildId, userId) {
  const cfg = getGuild(guildId);
  const entry = cfg.afk[userId] || null;
  if (entry) {
    delete cfg.afk[userId];
    saveStore();
  }
  return entry;
}

function getAfk(guildId, userId) {
  return getGuild(guildId).afk[userId] || null;
}

// Call this inside client.on("messageCreate") BEFORE command parsing
async function processAfkMessage(message) {
  if (!message.guild || message.author.bot) return;
  const guildId = message.guild.id;
  const cfg = getGuild(guildId);
  const prefix = cfg.prefix || DEFAULT_PREFIX;

  // Ignore if they just ran the afk command itself
  if (message.content.toLowerCase().startsWith(`${prefix}afk`)) return;

  // 1. Welcome back if the author was AFK in THIS server
  const ownAfk = clearAfk(guildId, message.author.id);
  if (ownAfk) {
    const mins = Math.max(1, Math.floor((Date.now() - ownAfk.since) / 60000));
    await message
      .reply(`👋 Welcome back **${message.member?.displayName || message.author.username}**! Removed your AFK (away for ~${mins}m).`)
      .catch(() => null);
  }

  // 2. Notify if they pinged anyone who is AFK in THIS server
  if (message.mentions.users.size > 0) {
    const notices = [];
    for (const [, user] of message.mentions.users) {
      if (user.id === message.author.id) continue;
      const targetAfk = getAfk(guildId, user.id);
      if (targetAfk) {
        const ts = Math.floor(targetAfk.since / 1000);
        notices.push(`💤 **${user.username}** is AFK: *${targetAfk.reason}* (<t:${ts}:R>)`);
      }
    }
    if (notices.length > 0) {
      await message.reply(notices.join("\n")).catch(() => null);
    }
  }
}

// --- Built-in Slash Commands (/setup, /botinfo, /afk) ---
const coreSlashCommands = [
  new SlashCommandBuilder()
    .setName("botinfo")
    .setDescription("Show what this bot does, how to set it up, and owner info"),
  new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Set your AFK status in this server")
    .addStringOption((opt) =>
      opt.setName("reason").setDescription("Reason for being AFK").setRequired(false)
    ),
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Configure this bot for your server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View current server settings")
    )
    .addSubcommand((sub) =>
      sub
        .setName("prefix")
        .setDescription("Set custom prefix for this server")
        .addStringOption((o) => o.setName("value").setDescription("New prefix").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("staff")
        .setDescription("Toggle a Staff role")
        .addRoleOption((o) => o.setName("role").setDescription("Staff role").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("logs")
        .setDescription("Set the log channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Log channel").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("welcome")
        .setDescription("Set the welcome channel")
        .addChannelOption((o) => o.setName("channel").setDescription("Welcome channel").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("reset").setDescription("Reset all bot data/settings for this server")
    )
];

function buildBotInfoEmbed(client, guild) {
  const botName = client?.user?.username || "Grand Regent Don";
  const serverCount = client?.guilds?.cache?.size ?? 1;
  const cfg = guild ? getGuild(guild.id) : createDefaultGuildData();
  const prefix = cfg.prefix || DEFAULT_PREFIX;

  return new EmbedBuilder()
    .setTitle(`🤖 ${botName} — Info & Setup`)
    .setColor(0x5865f2)
    .setDescription(
      `Multi-server utility & moderation bot with per-server settings, AFK tracking, logging, and custom commands.\n\n` +
      `**Owner:** ${BOT_OWNER_LABEL} (<@${BOT_OWNER_ID}>)\n` +
      `**Servers:** \`${serverCount}\` • **Server Prefix:** \`${prefix}\``
    )
    .addFields(
      {
        name: "⚙️ Quick Setup",
        value:
          `• \`/setup view\` or \`${prefix}setup view\`\n` +
          `• \`/setup prefix\` or \`${prefix}setup prefix <newPrefix>\`\n` +
          `• \`/setup staff\` or \`${prefix}setup staff @Role\`\n` +
          `• \`/setup logs\` or \`${prefix}setup logs #channel\`\n` +
          `• \`/setup welcome\` or \`${prefix}setup welcome #channel\`\n` +
          `• \`/setup reset\` or \`${prefix}setup reset\``
      },
      {
        name: "💤 AFK & Utility",
        value: `\`/afk [reason]\` or \`${prefix}afk [reason]\` (isolated per server)`
      }
    )
    .setFooter({ text: `${botName} • Owned by ${BOT_OWNER_LABEL}` })
    .setTimestamp();
}

function buildSetupViewEmbed(guild) {
  const cfg = getGuild(guild.id);
  const staffList = cfg.staffRoleIds.length
    ? cfg.staffRoleIds.map((id) => `<@&${id}>`).join(", ")
    : "*Not set*";

  return new EmbedBuilder()
    .setTitle(`⚙️ ${guild.name} — Bot Settings`)
    .setColor(0x2b2d31)
    .addFields(
      { name: "Prefix", value: `\`${cfg.prefix}\``, inline: true },
      { name: "Staff Roles", value: staffList, inline: true },
      {
        name: "Logs Channel",
        value: cfg.logChannelId ? `<#${cfg.logChannelId}>` : "*Not set*",
        inline: true
      },
      {
        name: "Welcome Channel",
        value: cfg.welcomeChannelId ? `<#${cfg.welcomeChannelId}>` : "*Not set*",
        inline: true
      },
      {
        name: "Active AFK Users",
        value: `\`${Object.keys(cfg.afk).length}\``,
        inline: true
      }
    );
}

// Handles /botinfo, /afk, and /setup automatically
async function handleCoreSlash(interaction) {
  const { commandName: cmd, guild, user } = interaction;
  if (!guild) return false;

  if (cmd === "botinfo") {
    await interaction.reply({ embeds: [buildBotInfoEmbed(interaction.client, guild)] });
    return true;
  }

  if (cmd === "afk") {
    const reason = interaction.options.getString("reason") || "AFK";
    setAfk(guild.id, user.id, reason);
    await interaction.reply(`💤 **${interaction.member?.displayName || user.username}** is now AFK: *${reason}*`);
    return true;
  }

  if (cmd === "setup") {
    const sub = interaction.options.getSubcommand();
    const cfg = getGuild(guild.id);

    if (sub === "view") {
      await interaction.reply({ embeds: [buildSetupViewEmbed(guild)], ephemeral: true });
      return true;
    }
    if (sub === "prefix") {
      const val = interaction.options.getString("value", true).trim().slice(0, 5);
      updateGuild(guild.id, { prefix: val });
      await interaction.reply({ content: `✅ Server prefix set to \`${val}\`.`, ephemeral: true });
      return true;
    }
    if (sub === "staff") {
      const role = interaction.options.getRole("role", true);
      const exists = cfg.staffRoleIds.includes(role.id);
      const next = exists
        ? cfg.staffRoleIds.filter((id) => id !== role.id)
        : [...cfg.staffRoleIds, role.id];
      updateGuild(guild.id, { staffRoleIds: next });
      await interaction.reply({
        content: exists ? `🗑️ Removed ${role} from Staff roles.` : `✅ Added ${role} to Staff roles.`,
        ephemeral: true
      });
      return true;
    }
    if (sub === "logs") {
      const ch = interaction.options.getChannel("channel", true);
      updateGuild(guild.id, { logChannelId: ch.id });
      await interaction.reply({ content: `✅ Log channel set to ${ch}.`, ephemeral: true });
      return true;
    }
    if (sub === "welcome") {
      const ch = interaction.options.getChannel("channel", true);
      updateGuild(guild.id, { welcomeChannelId: ch.id });
      await interaction.reply({ content: `✅ Welcome channel set to ${ch}.`, ephemeral: true });
      return true;
    }
    if (sub === "reset") {
      resetGuild(guild.id);
      await interaction.reply({ content: "🔄 All settings and AFK data for this server have been reset.", ephemeral: true });
      return true;
    }
  }

  return false;
}

// Handles ?botinfo, ?afk, and ?setup automatically
async function handleCorePrefix(message, client) {
  if (!message.guild || message.author.bot) return false;
  const cfg = getGuild(message.guild.id);
  const prefix = cfg.prefix || DEFAULT_PREFIX;
  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return false;

  if (cmd === "botinfo" || cmd === "about") {
    await message.reply({ embeds: [buildBotInfoEmbed(client, message.guild)] });
    return true;
  }

  if (cmd === "afk") {
    const reason = args.join(" ").trim() || "AFK";
    setAfk(message.guild.id, message.author.id, reason);
    await message.reply(`💤 **${message.member?.displayName || message.author.username}** is now AFK: *${reason}*`);
    return true;
  }

  if (cmd === "setup") {
    if (!isGuildStaff(message.member)) {
      await message.reply("❌ You need **Manage Server** or a Staff role to configure the bot.");
      return true;
    }
    const sub = (args[0] || "view").toLowerCase();

    if (sub === "view") {
      await message.reply({ embeds: [buildSetupViewEmbed(message.guild)] });
      return true;
    }
    if (sub === "prefix" && args[1]) {
      const val = args[1].trim().slice(0, 5);
      updateGuild(message.guild.id, { prefix: val });
      await message.reply(`✅ Server prefix set to \`${val}\`.`);
      return true;
    }
    if (sub === "staff") {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.reply(`❌ Usage: \`${prefix}setup staff @Role\``), true;
      const exists = cfg.staffRoleIds.includes(role.id);
      const next = exists
        ? cfg.staffRoleIds.filter((id) => id !== role.id)
        : [...cfg.staffRoleIds, role.id];
      updateGuild(message.guild.id, { staffRoleIds: next });
      await message.reply(exists ? `🗑️ Removed ${role} from Staff roles.` : `✅ Added ${role} to Staff roles.`);
      return true;
    }
    if (sub === "logs") {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      updateGuild(message.guild.id, { logChannelId: ch.id });
      await message.reply(`✅ Log channel set to ${ch}.`);
      return true;
    }
    if (sub === "welcome") {
      const ch = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;
      updateGuild(message.guild.id, { welcomeChannelId: ch.id });
      await message.reply(`✅ Welcome channel set to ${ch}.`);
      return true;
    }
    if (sub === "reset") {
      resetGuild(message.guild.id);
      await message.reply("🔄 All settings and AFK data for this server have been reset.");
      return true;
    }

    await message.reply(
      `Usage: \`${prefix}setup <view | prefix | staff | logs | welcome | reset>\``
    );
    return true;
  }

  return false;
}

// Initialize immediately when required
loadStore();

module.exports = {
  BOT_OWNER_ID,
  BOT_OWNER_LABEL,
  DEFAULT_PREFIX,
  getGuild,
  updateGuild,
  resetGuild,
  saveStore,
  isGuildStaff,
  setAfk,
  clearAfk,
  getAfk,
  processAfkMessage,
  coreSlashCommands,
  handleCoreSlash,
  handleCorePrefix
};
