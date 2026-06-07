const { 
  PermissionsBitField, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");

const BIRTHDAY_ROLE_ID = "1512121400624812072";
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
    const matches = args.slice(1).join(" ").match(/\d+/g);
    if (!matches || matches.length < 2) {
      return message.reply(`❌ Use: \`${prefix}bday set MM DD\` (e.g., \`${prefix}bday set 12 25\`)`);
    }

    const m = Number(matches[0]);
    const d = Number(matches[1]);

    if (m < 1 || m > 12 || d < 1 || d > 31) {
      return message.reply(`❌ Invalid Date! Use: \`${prefix}bday set MM DD\` (Month 1-12, Day 1-31)`);
    }

    const existing = data.birthdays[message.author.id];
    if (existing?.lastUpdated && Date.now() - existing.lastUpdated < 30 * 24 * 60 * 60 * 1000) {
      const days = Math.ceil((30 * 24 * 60 * 60 * 1000 - (Date.now() - existing.lastUpdated)) / 86400000);
      return message.reply(`❌ Cooldown active! Please wait **${days}** more day(s).`);
    }

    data.birthdays[message.author.id] = { day: d, month: m, lastUpdated: Date.now() };
    saveData();
    return message.reply(`✅ Birthday set to **${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}**!`);
  }

  if (sub === "closest" || sub === "list") {
    const bdays = Object.entries(data.birthdays || {});
    if (!bdays.length) return message.reply("❌ No birthdays registered yet.");

    const now = new Date();
    const todayMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    let birthdayList = [];

    for (const [uid, b] of bdays) {
      let tgt = new Date(Date.UTC(now.getUTCFullYear(), b.month - 1, b.day));
      
      if (tgt < todayMidnight) {
        tgt.setUTCFullYear(now.getUTCFullYear() + 1);
      }
      
      const diffTime = tgt.getTime() - todayMidnight.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      birthdayList.push({ uid, day: b.day, month: b.month, diffDays });
    }

    birthdayList.sort((a, b) => a.diffDays - b.diffDays);

    const itemsPerPage = 10;
    const totalPages = Math.ceil(birthdayList.length / itemsPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * itemsPerPage;
      const end = start + itemsPerPage;
      const pageItems = birthdayList.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle("🎂 Upcoming Server Birthdays")
        .setColor(0x5865f2)
        .setFooter({ text: `Page ${page + 1} of ${totalPages} • Total Registered Users: ${birthdayList.length}\n💡 Type a number (e.g. "2") to jump directly to that page!` })
        .setTimestamp();

      let description = "";
      pageItems.forEach((user, index) => {
        const globalIndex = start + index + 1;
        const padDay = String(user.day).padStart(2, '0');
        const padMonth = String(user.month).padStart(2, '0');
        const countdown = user.diffDays === 0 ? "🎉 **TODAY!**" : `In **${user.diffDays}** days`;
        
        description += `**${globalIndex}.** <@${user.uid}> • **${padMonth}/${padDay}** (${countdown})\n`;
      });

      description += `\n🔹 *Use \`${prefix}bday set MM DD\` to add your birthday!*`;
      embed.setDescription(description);
      return embed;
    };

    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("⬅️ Prev")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("Next ➡️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === totalPages - 1)
      );
    };

    const embedMessage = await message.reply({
      embeds: [generateEmbed(currentPage)],
      components: totalPages > 1 ? [generateButtons(currentPage)] : []
    });

    if (totalPages > 1) {
      const buttonCollector = embedMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === message.author.id,
        time: 90000
      });

      const textCollector = message.channel.createMessageCollector({
        filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()),
        time: 90000
      });

      buttonCollector.on("collect", async (interaction) => {
        if (interaction.customId === "prev_page") {
          currentPage--;
        } else if (interaction.customId === "next_page") {
          currentPage++;
        }
        
        await interaction.update({
          embeds: [generateEmbed(currentPage)],
          components: [generateButtons(currentPage)]
        });
      });

      textCollector.on("collect", async (msg) => {
        const targetPage = parseInt(msg.content.trim(), 10);
        
        if (targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage - 1;
          
          await embedMessage.edit({
            embeds: [generateEmbed(currentPage)],
            components: [generateButtons(currentPage)]
          }).catch(() => null);

          msg.delete().catch(() => null);
        }
      });

      buttonCollector.on("end", () => {
        textCollector.stop();
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_page").setLabel("⬅️ Prev").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("next_page").setLabel("Next ➡️").setStyle(ButtonStyle.Primary).setDisabled(true)
        );
        embedMessage.edit({ components: [disabledRow] }).catch(() => null);
      });
    }
    return;
  }

  const targetId = message.mentions.users.first()?.id || args[0]?.replace(/[<@!>]/g, "") || message.author.id;
  const bday = data.birthdays?.[targetId];
  if (!bday) {
    return message.reply(targetId === message.author.id ? `❌ You haven't set your birthday yet! Use \`${prefix}bday set MM DD\`` : "❌ No birthday found for this user.");
  }
  return message.reply(`🎂 ${targetId === message.author.id ? "Your" : `<@${targetId}>'s`} birthday is **${String(bday.month).padStart(2, '0')}/${String(bday.day).padStart(2, '0')}**.`);
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
