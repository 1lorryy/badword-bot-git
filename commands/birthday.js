const { EmbedBuilder } = require("discord.js");

const BDAY_ANNOUNCE_CHANNEL_ID = "1481370051264254259"; // Your #commands / announcement channel

async function checkBirthdays(client, getGuildData, saveData) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDate = now.getDate();       // 1-31
  const currentYear = now.getFullYear();   // e.g. 2026

  for (const guild of client.guilds.cache.values()) {
    const data = getGuildData(guild.id);
    if (!data || !data.birthdays) continue;

    let dataModified = false;

    for (const [userId, bdayInfo] of Object.entries(data.birthdays)) {
      // bdayInfo format: { month: 7, day: 31, lastWishedYear: 2026 }
      if (bdayInfo.month === currentMonth && bdayInfo.day === currentDate) {
        
        // 🚨 PREVENT DUPLICATES ON RESTART: Skip if already wished this year!
        if (bdayInfo.lastWishedYear === currentYear) {
          continue;
        }

        const channel = await guild.channels.fetch(BDAY_ANNOUNCE_CHANNEL_ID).catch(() => null);
        if (channel && channel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle("🎉 Happy Birthday! 🎂")
            .setColor(0xff69b4)
            .setDescription(`Wishing a very happy birthday to <@${userId}>! Have an awesome day! 🎈✨`)
            .setTimestamp();

          await channel.send({ content: `🎂 <@${userId}>`, embeds: [embed] }).catch(() => null);

          // Mark user as wished for this year
          data.birthdays[userId].lastWishedYear = currentYear;
          dataModified = true;
        }
      }
    }

    if (dataModified) {
      saveData();
    }
  }
}

module.exports = {
  checkBirthdays,
  // ... export your handleBirthdayCommand here as well
};
