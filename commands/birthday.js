const { PermissionsBitField } = require("discord.js");

const BIRTHDAY_ROLE_ID = "1512121400624812072";

let processedToday = new Set();
let lastKey = null;

function getUTCKey() {
  const now = new Date();
  return `${now.getUTCDate()}-${now.getUTCMonth() + 1}`;
}

function startBirthdaySystem(client, getGuildData) {
  async function checkBirthdays() {
    try {
      const now = new Date();
      const day = now.getUTCDate();
      const month = now.getUTCMonth() + 1;

      const key = getUTCKey();

      // reset once per day
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

          // ================= BIRTHDAY DAY =================
          if (isToday) {
            if (processedToday.has(idKey)) continue;

            const member = await guild.members.fetch(userId).catch(() => null);
            if (!member) continue;

            // only add if not already has role
            if (!member.roles.cache.has(role.id)) {
              await member.roles.add(role).catch(() => null);
            }

            const channel =
              guild.systemChannel ||
              guild.channels.cache.find(c => c.isTextBased());

            if (channel) {
              channel.send(`🎉 Happy Birthday <@${userId}>! Enjoy your day 🎂`);
            }

            processedToday.add(idKey);
          }

         // ================= NOT BIRTHDAY =================
          else {
            // only remove if they still have role
            const member = guild.members.cache.get(userId);
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

  // run every minute
  setInterval(checkBirthdays, 60 * 1000);

  console.log("🎂 Birthday system running (optimized + guild-data.json)");
}

module.exports = { startBirthdaySystem };