const { PermissionsBitField, EmbedBuilder } = require("discord.js");

const BIRTHDAY_ROLE_ID = "1512121400624812072";

// Whitelisted channel IDs where the birthday command can be executed
const ALLOWED_CHANNELS = [
  "1481370051264254259", // Public Bot Command Channel
  "1481370050597228656", // Staff Command Channel
  "1499888577738309633"  // Testing / Tuff Channel
];

let processedToday = new Set();
let lastKey = null;

function getUTCKey() {
  const now = new Date();
  return `${now.getUTCDate()}-${now.getUTCMonth() + 1}`;
}

/**
 * Handles all variants of the birthday command
 */
async function handleBirthdayCommand(message, args, prefix, getGuildData, saveData) {
  // 1. Channel Restriction Check
  if (!ALLOWED_CHANNELS.includes(message.channel.id)) {
    const reply = await message.reply("❌ This command can only be used in designated bot channels.");
    // Auto-delete message and invocation after 5 seconds to prevent flood
    setTimeout(() => {
      reply.delete().catch(() => null);
      message.delete().catch(() => null);
    }, 5000);
    return;
  }

  const data = getGuildData(message.guild.id);
  const subCommand = args[0]?.toLowerCase();

  // Variant A: ?birthday OR ?birthday me
  if (!subCommand || subCommand === "me") {
    const bday = data.birthdays?.[message.author.id];
    if (!bday) {
      return message.reply(`❌ You haven't set your birthday yet! Use \`${prefix}birthday set DD-MM\``);
    }
    return message.reply(`🎂 Your birthday is currently set to **${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}**.`);
  }

  // Variant B: ?birthday set DD-MM
  if (subCommand === "set") {
    const dateStr = args[1];
    if (!dateStr) {
      return message.reply(`❌ Usage: \`${prefix}birthday set DD-MM\` (e.g., \`${prefix}birthday set 25-12\`)`);
    }

    const parts = dateStr.split("-");
    if (parts.length !== 2) {
      return message.reply(`❌ Invalid format. Use \`${prefix}birthday set DD-MM\``);
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);

    if (isNaN(day) || isNaN(month) || month < 1 || month > 12 || day < 1 || day > 31) {
      return message.reply("❌ Invalid date. Please provide a valid day (1-31) and month (1-12).");
    }

    // Month length validation
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month - 1]) {
      return message.reply("❌ Invalid day matching for that month.");
    }

    // 2. Cooldown Limitation Check (1 Month / 30 Days Cooldown)
    const existing = data.birthdays[message.author.id];
    const COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days in milliseconds

    if (existing && existing.lastUpdated) {
      const timePassed = Date.now() - existing.lastUpdated;
      if (timePassed < COOLDOWN_MS) {
        const daysLeft = Math.ceil((COOLDOWN_MS - timePassed) / (24 * 60 * 60 * 1000));
        return message.reply(`❌ You can only update your birthday once every month. Please wait **${daysLeft}** more day(s).`);
      }
    }

    // Save configuration
    data.birthdays[message.author.id] = {
      day,
      month,
      lastUpdated: Date.now()
    };
    saveData();

    return message.reply(`✅ Your birthday has been configured to **${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}**!`);
  }

  // Variant C: ?birthday closest
  if (subCommand === "closest") {
    const birthdays = data.birthdays;
    if (!birthdays || Object.keys(birthdays).length === 0) {
      return message.reply("❌ No birthdays have been registered in this server yet.");
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    let closestUser = null;
    let minDiff = Infinity;

    for (const [userId, bday] of Object.entries(birthdays)) {
      if (!bday) continue;

      let bdayDate = new Date(Date.UTC(currentYear, bday.month - 1, bday.day));
      
      const todayKey = now.getUTCMonth() * 100 + now.getUTCDate();
      const bdayKey = (bday.month - 1) * 100 + bday.day;

      if (bdayKey < todayKey) {
        bdayDate.setUTCFullYear(currentYear + 1);
      }

      const diff = bdayDate - now;
      if (diff < minDiff) {
        minDiff = diff;
        closestUser = { userId, bday };
      }
    }

    if (!closestUser) {
      return message.reply("❌ Could not determine the closest birthday.");
    }

    const daysLeft = Math.ceil(minDiff / (1000 * 60 * 60 * 24));
    return message.reply(`🎂 The closest upcoming birthday belongs to <@${closestUser.userId}> on **${String(closestUser.bday.day).padStart(2, '0')}-${String(closestUser.bday.month).padStart(2, '0')}** (In **${daysLeft}** day(s)!).`);
  }

  // Variant D: Check another user's birthday (?birthday @user or ?birthday userID)
  const targetUser = message.mentions.users.first();
  let targetId = targetUser?.id;

  if (!targetId && args[0]) {
    const cleanId = args[0].replace(/[<@!>]/g, "");
    if (/^\d+$/.test(cleanId)) targetId = cleanId;
  }

  if (!targetId) {
    return message.reply(`❌ Unknown subcommand or user. Try \`${prefix}birthday set DD-MM\` or \`${prefix}birthday closest\`.`);
  }

  const bday = data.birthdays?.[targetId];
  if (!bday) {
    return message.reply(`❌ <@${targetId}> has not set up their birthday yet.`);
  }

  return message.reply(`🎂 <@${targetId}>'s birthday is **${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}**.`);
}

/**
 * Hourly automated background system task called from bot.js
 */
async function checkBirthdays(client, getGuildData, saveData) {
  try {
    const now = new Date();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const key = getUTCKey();

    if (lastKey !== key) {
      lastKey = key;
      processedToday.clear();
    }

    for (const guild of client.guilds.cache.values()) {
      const data = getGuildData(guild.id);
      const birthdays = data?.birthdays;

      if (!birthdays || typeof birthdays !== "object") continue;

      const role = guild.roles.cache.get(BIRTHDAY_ROLE_ID);
      if (!role) continue;

      for (const userId of Object.keys(birthdays)) {
        const bday = birthdays[userId];
        if (!bday) continue;

        const idKey = `${guild.id}-${userId}`;
        const isToday = bday.day === day && bday.month === month;

        if (isToday) {
          if (processedToday.has(idKey)) continue;

          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(() => null);
          }

          const channel =
            guild.systemChannel ||
            guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages));

          if (channel) {
            channel.send(`🎉 Happy Birthday <@${userId}>! Enjoy your special day 🎂`);
          }

          processedToday.add(idKey);
        } else {
          const member = guild.members.cache.get(userId) || await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role).catch(() => null);
          }
        }
      }
    }
  } catch (err) {
    console.error("Birthday system error:", err);
  }
}

module.exports = { 
  handleBirthdayCommand, 
  checkBirthdays 
};
