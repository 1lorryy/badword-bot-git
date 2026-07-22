const fs = require("fs");
const path = require("path");
const { PermissionsBitField, EmbedBuilder } = require("discord.js");

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
  if (!input) return null;
  return (
    message.mentions.members.first() ||
    await message.guild.members.fetch(input).catch(() => null)
  );
}

async function findUser(client, input) {
  const clean = String(input || "").replace(/[<@!>]/g, "");
  if (!clean) return null;
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

// Role Hierarchy Check Function
function isManageable(modMember, targetMember) {
  if (targetMember.id === modMember.guild.ownerId) return false;
  if (targetMember.id === modMember.id) return false;
  return modMember.roles.highest.position > targetMember.roles.highest.position;
}

// Helper to send DMs safely
async function sendDM(user, guildName, action, reason) {
  const embed = new EmbedBuilder()
    .setColor("#ED4245")
    .setTitle(`⚠️ Action Notice • ${guildName}`)
    .setDescription(`You have received a **${action}** in **${guildName}**.`)
    .addFields({ name: "📄 Reason", value: reason })
    .setTimestamp();

  await user.send({ embeds: [embed] }).catch(() => null);
}

async function handleModerationCommand(message, args, command, prefix, canManageGuild, sendTempReply, sendReply) {
  const client = message.client;

  // ================= WARN =================
  if (command === "warn") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission to use this command.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}warn @user [reason]\``);
      return true;
    }

    if (!isManageable(message.member, member)) {
      await sendTempReply(message, "❌ You cannot warn this user due to role hierarchy.");
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    const modCase = addCase(message.guild.id, "warn", member.user, message.author, reason);

    await sendDM(member.user, message.guild.name, "Warning", reason);

    const warnEmbed = new EmbedBuilder()
      .setColor("#FEE75C")
      .setTitle("⚠️ Member Warned")
      .addFields(
        { name: "👤 Target", value: `${member.user} (\`${member.id}\`)`, inline: true },
        { name: "🛡️ Moderator", value: `${message.author}`, inline: true },
        { name: "📋 Case ID", value: `\`#${modCase.id}\``, inline: true },
        { name: "📄 Reason", value: reason, inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [warnEmbed] });
    return true;
  }

  // ================= CASES / WARNINGS =================
  if (command === "warnings" || command === "cases") {
    const member = await findMember(message, args[0]) || message.member;

    const cases = getUserCases(message.guild.id, member.id).filter((c) => c.active);

    if (!cases.length) {
      await sendReply(message, `✅ **${member.user.tag}** has no active cases.`);
      return true;
    }

    const formattedCases = cases
      .slice(-5)
      .map((c) => `• **Case #${c.id}** [${c.type.toUpperCase()}]\n└ **Reason:** ${c.reason}\n└ **Mod:** ${c.moderatorTag}`)
      .join("\n\n");

    const casesEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({ name: `${member.user.tag}'s Mod Logs`, iconURL: member.user.displayAvatarURL() })
      .setDescription(formattedCases)
      .setFooter({ text: `Total Active Cases: ${cases.length}` })
      .setTimestamp();

    await message.reply({ embeds: [casesEmbed] });
    return true;
  }

  // ================= UNWARN =================
  if (command === "unwarn") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission to use this command.");
      return true;
    }

    const caseId = Number.parseInt(args[0], 10);

    if (!Number.isInteger(caseId)) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}unwarn <caseID>\``);
      return true;
    }

    const removed = removeWarnCase(message.guild.id, caseId);

    if (!removed) {
      await sendTempReply(message, "❌ Could not find an active warn case with that ID.");
      return true;
    }

    await sendReply(message, `✅ Removed warn case \`#${caseId}\` from **${removed.userTag}**.`);
    return true;
  }

  // ================= MUTE / TIMEOUT =================
  if (command === "mute" || command === "timeout") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission to use this command.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      await sendTempReply(message, "❌ I need the **Moderate Members** permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}mute @user <time> [reason]\` (e.g. 10m, 2h)`);
      return true;
    }

    if (!isManageable(message.member, member)) {
      await sendTempReply(message, "❌ You cannot mute this user due to role hierarchy.");
      return true;
    }

    const durationText = args[1];
    const durationMs = parseDuration(durationText);

    if (!durationMs) {
      await sendTempReply(message, `💡 **Valid Units:** \`30s\`, \`10m\`, \`2h\`, \`7d\``);
      return true;
    }

    if (durationMs > MAX_TIMEOUT_MS) {
      await sendTempReply(message, "❌ Maximum timeout duration is 28 days.");
      return true;
    }

    const reason = args.slice(2).join(" ") || "No reason provided";

    await sendDM(member.user, message.guild.name, `Mute (${durationText})`, reason);

    const success = await member.timeout(durationMs, reason).catch(() => null);

    if (!success) {
      await sendTempReply(message, "❌ Failed to mute user. Check role hierarchy.");
      return true;
    }

    addCase(message.guild.id, "mute", member.user, message.author, `${durationText} — ${reason}`);

    const muteEmbed = new EmbedBuilder()
      .setColor("#57F287")
      .setTitle("🔇 Member Muted")
      .addFields(
        { name: "👤 Target", value: `${member.user} (\`${member.id}\`)`, inline: true },
        { name: "⏳ Duration", value: `\`${durationText}\``, inline: true },
        { name: "🛡️ Moderator", value: `${message.author}`, inline: true },
        { name: "📄 Reason", value: reason, inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [muteEmbed] });
    return true;
  }

  // ================= UNMUTE =================
  if (command === "unmute") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}unmute @user\``);
      return true;
    }

    const success = await member.timeout(null).catch(() => null);

    if (!success) {
      await sendTempReply(message, "❌ Could not unmute this user.");
      return true;
    }

    addCase(message.guild.id, "unmute", member.user, message.author, "Timeout removed");

    await sendReply(message, `🔊 Unmuted **${member.user.tag}**.`);
    return true;
  }

  // ================= BAN =================
  if (command === "ban") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission.");
      return true;
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      await sendTempReply(message, "❌ I need the **Ban Members** permission.");
      return true;
    }

    const member = await findMember(message, args[0]);

    if (!member) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}ban @user [reason]\``);
      return true;
    }

    if (!isManageable(message.member, member)) {
      await sendTempReply(message, "❌ You cannot ban this user due to role hierarchy.");
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";

    await sendDM(member.user, message.guild.name, "Ban", reason);

    const success = await member.ban({ reason }).catch(() => null);

    if (!success) {
      await sendTempReply(message, "❌ Failed to ban user. Check role hierarchy.");
      return true;
    }

    addCase(message.guild.id, "ban", member.user, message.author, reason);

    const banEmbed = new EmbedBuilder()
      .setColor("#ED4245")
      .setTitle("🔨 Member Banned")
      .addFields(
        { name: "👤 Target", value: `**${member.user.tag}** (\`${member.id}\`)`, inline: true },
        { name: "🛡️ Moderator", value: `${message.author}`, inline: true },
        { name: "📄 Reason", value: reason, inline: false }
      )
      .setTimestamp();

    await message.reply({ embeds: [banEmbed] });
    return true;
  }

  // ================= UNBAN =================
  if (command === "unban") {
    if (!canManageGuild(message)) {
      await sendTempReply(message, "❌ You do not have permission.");
      return true;
    }

    const userId = args[0];

    if (!userId) {
      await sendTempReply(message, `💡 **Usage:** \`${prefix}unban <userID> [reason]\``);
      return true;
    }

    const reason = args.slice(1).join(" ") || "No reason provided";
    const user = await findUser(client, userId);

    const success = await message.guild.members.unban(userId, reason).catch(() => null);

    if (!success) {
      await sendTempReply(message, "❌ Could not unban this user ID. Make sure the ID is correct and banned.");
      return true;
    }

    if (user) addCase(message.guild.id, "unban", user, message.author, reason);

    await sendReply(message, `✅ Unbanned user \`${user ? user.tag : userId}\`.`);
    return true;
  }

  return false;
}

module.exports = {
  handleModerationCommand
};
