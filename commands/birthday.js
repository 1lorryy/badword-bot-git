const { PermissionsBitField } = require("discord.js");

const BIRTHDAY_ROLE_ID = "1512121400624812072";
// Your allowed channels whitelist
const ALLOWED_CHANNELS = ["1481370051264254259", "1481370050597228656", "1499888577738309633"];

let processedToday = new Set();
let lastKey = null;

async function handleBirthdayCommand(message, args, prefix, getGuildData, saveData) {
  // Channel Whitelist Check
  if (!ALLOWED_CHANNELS.includes(message.channel.id)) {
    return message.reply("❌ This command can only be used in designated bot channels.").then(m => {
      setTimeout(() => {
        m.delete().catch(() => null);
        message.delete().catch(() => null);
      }, 5000);
    });
  }

  const data = getGuildData(message.guild.id);
  const sub = args[0]?.toLowerCase();

  if (sub === "set") {
    const [d, m] = args[1]?.split("-").map(Number) || [];
    if (!d || !m || m < 1 || m > 12 || d < 1 || d > 31) {
      return message.reply(`❌ Use: \`${prefix}bday set DD-MM\``);
    }

    const existing = data.birthdays[message.author.id];
    if (existing?.lastUpdated && Date.now() - existing.lastUpdated < 30 * 24 * 60 * 60 * 1000) {
      const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - existing.lastUpdated)) / 86400000);
      return message.reply(`❌ Cooldown active! Please wait **${days}** more day(s).`);
    }

    data.birthdays[message.author.id] = { day: d, month: m, lastUpdated: Date.now() };
    saveData();
    return message.reply(`✅ Birthday set to **${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}**!`);
  }

  if (sub === "closest") {
    const bdays = Object.entries(data.birthdays || {});
    if (!bdays.length) return message.reply("❌ No birthdays registered yet.");

    const now = new Date();
    let closest = null;
    let min = Infinity;

    for (const [uid, b] of bdays) {
      let tgt = new Date(Date.UTC(now.getUTCFullYear(), b.month - 1, b.day));
      if (tgt < now) tgt.setUTCFullYear(now.getUTCFullYear() + 1);
      if (tgt - now < min) {
        min = tgt - now;
        closest = { uid, b };
      }
    }
    return message.reply(`🎂 Closest birthday: <@${closest.uid}> on **${String(closest.b.day).padStart(2, '0')}-${String(closest.b.month).padStart(2, '0')}** (In **${Math.ceil(min / 86400000)}** days!).`);
  }

  const targetId = message.mentions.users.first()?.id || args[0]?.replace(/[<@!>]/g, "") || message.author.id;
  const bday = data.birthdays?.[targetId];
  if (!bday) {
    return message.reply(targetId === message.author.id ? `❌ You haven't set your birthday yet! Use \`${prefix}bday set DD-MM\`` : "❌ No birthday found for this user.");
  }
  return message.reply(`🎂 ${targetId === message.author.id ? "Your" : `<@${targetId}>'s`} birthday is **${String(bday.day).padStart(2, '0')}-${String(bday.month).padStart(2, '0')}**.`);
}

async function checkBirthdays(client, getGuildData, saveData) {
  try {
    const now = new Date();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const key = `${day}-${month}`;
    
    if (lastKey !== key) {
      lastKey = key;
      processedToday.clear();
    }

    for (const guild of client.guilds.cache.values()) {
      const birthdays = getGuildData(guild.id)?.birthdays;
      if (!birthdays) continue;
      const role = guild.roles.cache.get(BIRTHDAY_ROLE_ID);
      if (!role) continue;

      for (const [uid, b] of Object.entries(birthdays)) {
        const idKey = `${guild.id}-${uid}`;
        const isToday = b.day === day && b.month === month;
        const member = await guild.members.fetch(uid).catch(() => null);
        if (!member) continue;

        if (isToday) {
          if (processedToday.has(idKey)) continue;
          if (!member.roles.cache.has(role.id)) await member.roles.add(role).catch(() => null);
          const chan = guild.systemChannel || guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages));
          if (chan) chan.send(`🎉 Happy Birthday <@${uid}>! Enjoy your special day 🎂`);
          processedToday.add(idKey);
        } else if (member.roles.cache.has(role.id)) {
          await member.roles.remove(role).catch(() => null);
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

module.exports = { handleBirthdayCommand, checkBirthdays };

module.exports = { handleBirthdayCommand, checkBirthdays };
