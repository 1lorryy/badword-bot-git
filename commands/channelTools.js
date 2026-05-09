const { PermissionsBitField, EmbedBuilder } = require("discord.js");

const MEMBER_ROLE_ID = "1481564058984517762";
const STAFF_ROLE_ID = "1481370041420087474";
const MOD_ROLE_ID = "1481370041432932379";
const ADMIN_ROLE_ID = "1481370041441189959";

const DELETE_AFTER_MS = 5000;

// ===== TIME PARSER =====
function parseTime(input) {
  if (!input) return null;

  const match = String(input).toLowerCase().match(/^(\d+)(s|sec|m|min|h|hr)$/);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "s" || unit === "sec") return num;
  if (unit === "m" || unit === "min") return num * 60;
  if (unit === "h" || unit === "hr") return num * 60 * 60;

  return null;
}

// ===== CHANNEL FINDER =====
function getTargetChannel(message, args) {
  const mentioned = message.mentions.channels.first();
  if (mentioned) return mentioned;

  const possibleId = args[0]?.replace(/[<#>]/g, "");
  const byId = message.guild.channels.cache.get(possibleId);
  if (byId) return byId;

  return message.channel;
}

// ===== CLEANING =====
async function deleteLater(msg, ms = DELETE_AFTER_MS) {
  if (!msg) return;
  setTimeout(() => msg.delete().catch(() => null), ms);
}

async function cleanCommandMessage(message) {
  await message.delete().catch(() => null);
}

async function sendSmallEmbed(message, color, text) {
  const sent = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setDescription(text)
    ]
  }).catch(() => null);

  await deleteLater(sent);
}

// ===== MAIN HANDLER =====
async function handleChannelToolsCommand(message, args, prefix, command, canManageGuild) {
  await cleanCommandMessage(message);

  if (!canManageGuild(message)) {
    const reply = await message.channel.send("❌ No permission").catch(() => null);
    await deleteLater(reply);
    return true;
  }

  if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
    const reply = await message.channel.send("❌ I need Manage Channels").catch(() => null);
    await deleteLater(reply);
    return true;
  }

  const channel = getTargetChannel(message, args);

  // ================= SLOWMODE =================
  if (command === "slowmode") {
    let timeArg = args[0];

    if (
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(args[0]?.replace(/[<#>]/g, ""))
    ) {
      timeArg = args[1];
    }

    if (!timeArg) {
      const reply = await message.channel.send(`Usage: ${prefix}slowmode #channel 10s`).catch(() => null);
      await deleteLater(reply);
      return true;
    }

    if (["off", "0"].includes(timeArg.toLowerCase())) {
      await channel.setRateLimitPerUser(0);
      await sendSmallEmbed(message, 0x22c55e, `✅ Slowmode OFF → ${channel}`);
      return true;
    }

    const seconds = parseTime(timeArg);

    if (seconds === null || seconds > 21600) {
      const reply = await message.channel.send("❌ Max 6h").catch(() => null);
      await deleteLater(reply);
      return true;
    }

    await channel.setRateLimitPerUser(seconds);
    await sendSmallEmbed(message, 0x5865f2, `🐢 Slowmode ${timeArg} → ${channel}`);
    return true;
  }

  // ================= LOCK =================
  if (command === "lock") {
  const channel = getTargetChannel(message, args);

  // 🔥 REMOVE ALL overwrites first (important)
  await channel.permissionOverwrites.set([]);

  // ❌ DENY everyone
  await channel.permissionOverwrites.create(message.guild.roles.everyone, {
    SendMessages: false,
    SendMessagesInThreads: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false
  });

  // ✅ allow ONLY staff
  const allowRoles = [STAFF_ROLE_ID, MOD_ROLE_ID, ADMIN_ROLE_ID];

  for (const roleId of allowRoles) {
    const role = message.guild.roles.cache.get(roleId);
    if (!role) continue;

    await channel.permissionOverwrites.create(role, {
      SendMessages: true,
      SendMessagesInThreads: true
    });
  }

  await sendSmallEmbed(message, 0xef4444, `🔒 Locked ${channel}`);
  return true;
}

  // ================= UNLOCK =================
  if (command === "unlock") {
    const roles = [
      message.guild.roles.everyone.id,
      STAFF_ROLE_ID,
      MOD_ROLE_ID,
      ADMIN_ROLE_ID,
      MEMBER_ROLE_ID
    ];

    for (const roleId of roles) {
      const role = message.guild.roles.cache.get(roleId);
      if (!role) continue;

      await channel.permissionOverwrites.edit(role, {
        SendMessages: null,
        SendMessagesInThreads: null,
        CreatePublicThreads: null,
        CreatePrivateThreads: null
      });
    }

    await sendSmallEmbed(message, 0x22c55e, `🔓 Unlocked ${channel}`);
    return true;
  }

  return false;
}

module.exports = { handleChannelToolsCommand };