const { PermissionsBitField } = require("discord.js");

const BIRTHDAY_ROLE_ID = "1512121400624812072";

let processedToday = new Set();
let lastKey = null;

function getUTCKey() {
  const now = new Date();
  return `${now.getUTCDate()}-${now.getUTCMonth() + 1}`;
}

// 1. Exported core logic function that bot.js invokes on intervals/startup
async function checkBirthdays(client, getGuildData, saveData) {
  try {
    const now = new Date();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;

    const key = getUTCKey();

    // Reset tracked birthdays once per day
    if (lastKey !== key) {
      lastKey = key;
      processedToday.clear();
    }

    for (const guild of client.guilds.cache.values()) {
      const data = getGuildData(guild.id);
      const birthdays = data?.birthdays;

      if (!birthdays || typeof birthdays !== "object") continue;

      const role = guild.roles.cache.get(BIRTHDAY_ROLE_ID);

      for (const userId of Object.keys(birthdays)) {
        const bday = birthdays[userId];
        if (!bday) continue;

        const idKey = `${guild.id}-${userId}`;
        const isToday = bday.day === day && bday.month === month;

        // ================= BIRTHDAY DAY =================
        if (isToday) {
          if (processedToday.has(idKey)) continue;

          const member = await guild.members.fetch(userId).catch(() => null);
          if (!member) continue;

          // Only add role if they don't have it
          if (role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role).catch(() => null);
          }

          const channel =
            guild.systemChannel ||
            guild.channels.cache.find(c => c.isTextBased());

          if (channel) {
            channel.send(`🎉 Happy Birthday <@${userId}>! Enjoy your day 🎂`).catch(() => null);
          }

          processedToday.add(idKey);
        }
        // ================= NOT BIRTHDAY =================
        else {
          const member = guild.members.cache.get(userId);
          if (!member) continue;

          if (role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role).catch(() => null);
          }
        }
      }
    }
  } catch (err) {
    console.error("Birthday system error:", err);
  }
}

// 2. Exported message handler for command variants
async function handleBirthdayCommand(message, args, prefix, getGuildData, saveData) {
  const sub = (args[0] || "").toLowerCase();
  const data = getGuildData(message.guild.id);

  if (sub === "set") {
    const dateStr = args[1];
    if (!dateStr) {
      return message.reply(`❌ Usage: \`${prefix}birthday set DD-MM\``);
    }
    
    const match = dateStr.match(/^(\d{1,2})-(\d{1,2})$/);
    if (!match) {
      return message.reply(`❌ Invalid format. Use \`${prefix}birthday set DD-MM\` (e.g., \`25-12\`).`);
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return message.reply("❌ Invalid date values.");
    }

    const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (day > daysInMonth[month]) {
      return message.reply("❌ Invalid calendar day for that month.");
    }

    data.birthdays[message.author.id] = { day, month };
    saveData();

    return message.reply(`✅ Your birthday has been saved as **${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}**!`);
  }

  if (sub === "me") {
    const bday = data.birthdays[message.author.id];
    if (!bday) {
      return message.reply(`❌ You haven't set your birthday yet! Use \`${prefix}birthday set DD-MM\``);
    }
    return message.reply(`🎂 Your birthday is registered on **${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}**.`);
  }

  if (sub === "closest") {
    const birthdays = data.birthdays;
    if (!birthdays || Object.keys(birthdays).length === 0) {
      return message.reply("❌ No birthdays have been registered on this server yet.");
    }

    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const list = [];

    for (const [userId, bday] of Object.entries(birthdays)) {
      let bdayDate = new Date(Date.UTC(currentYear, bday.month - 1, bday.day));
      if (bdayDate < now) {
        bdayDate = new Date(Date.UTC(currentYear + 1, bday.month - 1, bday.day));
      }
      list.push({ userId, date: bdayDate, day: bday.day, month: bday.month });
    }

    list.sort((a, b) => a.date - b.date);

    const closestList = list.slice(0, 5).map((b, i) => {
      return `${i + 1}. <@${b.userId}> — **${String(b.day).padStart(2, '0')}-${String(b.month).padStart(2, '0')}**`;
    }).join("\n");

    return message.reply(`📅 **Upcoming Server Birthdays:**\n\n${closestList}`);
  }

  // Check specific user's mention
  const mention = message.mentions.users.first();
  if (mention) {
    const bday = data.birthdays[mention.id];
    if (!bday) {
      return message.reply(`❌ ${mention.username} hasn't registered their birthday yet.`);
    }
    return message.reply(`🎂 ${mention.username}'s birthday is **${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}**.`);
  }

  // Default Fallback Instruction Card
  return message.reply(
    `🎂 **Birthday System Menu:**\n` +
    `• \`${prefix}birthday set DD-MM\` — Configure your birthday\n` +
    `• \`${prefix}birthday me\` — View your configured birthday\n` +
    `• \`${prefix}birthday @user\` — Check a member's birthday\n` +
    `• \`${prefix}birthday closest\` — Show next upcoming birthdays`
  );
}

module.exports = { 
  checkBirthdays, 
  handleBirthdayCommand 
};
