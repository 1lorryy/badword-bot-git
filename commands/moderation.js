const fs = require("fs");
const path = require("path");
const { PermissionsBitField } = require("discord.js");

const DATA_FILE = path.join(__dirname, "..", "moderation-data.json");
const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

function ensureGuild(data, guildId) {
  if (!data[guildId]) {
    data[guildId] = {
      nextCaseId: 1,
      cases: []
    };
  }
  return data[guildId];
}

function parseDuration(input) {
  if (!input) return null;

  const match = String(input)
    .toLowerCase()
    .match(/^(\d+)(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/);

  if (!match) return null;

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];

  if (["s", "sec", "secs", "second", "seconds"].includes(unit)) return amount * 1000;
  if (["m", "min", "mins", "minute", "minutes"].includes(unit)) return amount * 60 * 1000;
  if (["h", "hr", "hrs", "hour", "hours"].includes(unit)) return amount * 60 * 60 * 1000;
  if (["d", "day", "days"].includes(unit)) return amount * 24 * 60 * 60 * 1000;

  return null;
}

async function findMember(message, input) {
  return (
    message.mentions.members.first() ||
    await message.guild.members.fetch(input).catch(() => null)
  );
}

async function findUser(client, input) {
  const clean = String(input || "").replace(/[<@!>]/g, "");
  return await client.users.fetch(clean).catch(() => null);
}

function addCase(guildId, type, user, moderator, reason) {
  const data = loadData();
  const guild = ensureGuild(data, guildId);

  const newCase = {
    id: guild.nextCaseId++,
    type,
    userId: user.id,
    userTag: user.tag,
    moderatorId: moderator.id,
    moderatorTag: moderator.tag,
    reason,
    active: true,
    createdAt: new Date().toISOString()
  };

  guild.cases.push(newCase);
  saveData(data);

  return newCase;
}

function getUserCases(guildId, userId) {
  const data = loadData();
  const guild = ensureGuild(data, guildId);

  return guild.cases.filter((c) => c.userId === userId);
}

function removeWarnCase(guildId, caseId) {
  const data = loadData();
  const guild = ensureGuild(data, guildId);

  const found = guild.cases.find(
    (c) => c.id === caseId && c.type === "warn" && c.active
  );

  if (!found) return null;

  found.active = false;
  found.removedAt = new Date().toISOString();

  saveData(data);
  return found;
}

async function handleModerationCommand(message, args, command, prefix, canManageGuild, sendTempReply, sendReply) {
  const client = message.client;

  if (command === "warn") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `Usage: ${prefix}warn @user reason`);
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    const modCase = addCase(message.guild.id, "warn", member.user, message.author, reason);

    await sendReply(
      message,
      `⚠️ Warned **${member.user.tag}**\nCase: \`${modCase.id}\`\nReason: ${reason}`
    );

    return true;
  }

  if (command === "warnings" || command === "cases") {
    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `Usage: ${prefix}${command} @user`);
      return true;
    }

    const cases = getUserCases(message.guild.id, member.id)
      .filter((c) => c.active);

    if (!cases.length) {
      await sendReply(message, `✅ **${member.user.tag}** has no active cases.`);
      return true;
    }

    const text = cases
      .slice(-10)
      .map((c) => `#${c.id} **${c.type}** — ${c.reason}`)
      .join("\n");

    await sendReply(message, `📋 Cases for **${member.user.tag}**:\n${text}`);
    return true;
  }

  if (command === "unwarn") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    const caseId = Number.parseInt(args[0], 10);

    if (!Number.isInteger(caseId)) {
      await sendTempReply(message, `Usage: ${prefix}unwarn caseID`);
      return true;
    }

    const removed = removeWarnCase(message.guild.id, caseId);

    if (!removed) {
      await sendTempReply(message, "Could not find active warn case.");
      return true;
    }

    await sendReply(message, `✅ Removed warn case \`#${caseId}\` from **${removed.userTag}**.`);
    return true;
  }

  if (command === "mute" || command === "timeout") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      await sendTempReply(message, "I need Moderate Members permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `Usage: ${prefix}mute @user 10m reason`);
      return true;
    }

    const durationText = args[1];
    const durationMs = parseDuration(durationText);

    if (!durationMs) {
      await sendTempReply(message, `Use: ${prefix}mute @user 30s / 10m / 2h / 7d reason`);
      return true;
    }

    if (durationMs > MAX_TIMEOUT_MS) {
      await sendTempReply(message, "Max mute is 28 days.");
      return true;
    }

    const reason = args.slice(2).join(" ") || "No reason provided";

    await member.timeout(durationMs, reason).catch(async () => {
      await sendTempReply(message, "Could not mute this user. Check role hierarchy and permissions.");
    });

    addCase(message.guild.id, "mute", member.user, message.author, `${durationText} — ${reason}`);

    await sendReply(
      message,
      `🔇 Muted **${member.user.tag}** for **${durationText}**\nReason: ${reason}`
    );

    return true;
  }

  if (command === "unmute") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      await sendTempReply(message, "I need Moderate Members permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `Usage: ${prefix}unmute @user`);
      return true;
    }

    await member.timeout(null).catch(async () => {
      await sendTempReply(message, "Could not unmute this user.");
    });

    addCase(message.guild.id, "unmute", member.user, message.author, "Timeout removed");

    await sendReply(message, `🔊 Unmuted **${member.user.tag}**.`);
    return true;
  }

  if (command === "ban") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await sendTempReply(message, "I need Ban Members permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `Usage: ${prefix}ban @user reason`);
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    await member.ban({ reason }).catch(async () => {
      await sendTempReply(message, "Could not ban this user. Check role hierarchy and permissions.");
    });

    addCase(message.guild.id, "ban", member.user, message.author, reason);

    await sendReply(message, `🔨 Banned **${member.user.tag}**\nReason: ${reason}`);
    return true;
  }

  if (command === "unban") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "You do not have permission.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await sendTempReply(message, "I need Ban Members permission.");
      return true;
    }

    const userId = args[0];

    if (!userId) {
      await sendTempReply(message, `Usage: ${prefix}unban userID reason`);
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    const user = await findUser(client, userId);

    await message.guild.members.unban(userId, reason).catch(async () => {
      await sendTempReply(message, "Could not unban this user. Check the ID.");
    });

    if (user) {
      addCase(message.guild.id, "unban", user, message.author, reason);
      await sendReply(message, `✅ Unbanned **${user.tag}**\nReason: ${reason}`);
    } else {
      await sendReply(message, `✅ Unbanned user ID \`${userId}\`\nReason: ${reason}`);
    }

    return true;
  }

  return false;
}

module.exports = {
  handleModerationCommand
};