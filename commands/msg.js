const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require("discord.js");

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.countedChannels) data.countedChannels = ["1481561361044607047"];
  if (!data.messageStats) data.messageStats = {};
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  const sub = args[0]?.toLowerCase();

  // 1. ADMIN CHANNEL TOGGLE (?msg channel add/remove)
  if (sub === "channel") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You need **Administrator** permissions to configure counted channels.");
    }

    const action = args[1]?.toLowerCase();
    const targetChannel = message.mentions.channels.first() || message.channel;

    if (action === "add") {
      if (data.countedChannels.includes(targetChannel.id)) {
        return message.reply(`❌ <#${targetChannel.id}> is already tracked.`);
      }
      data.countedChannels.push(targetChannel.id);
      saveData();
      return message.reply(`✅ Added <#${targetChannel.id}> to counted channels.`);
    } else if (action === "remove") {
      if (!data.countedChannels.includes(targetChannel.id)) {
        return message.reply(`❌ <#${targetChannel.id}> is not in the tracked list.`);
      }
      data.countedChannels = data.countedChannels.filter(id => id !== targetChannel.id);
      saveData();
      return message.reply(`✅ Removed <#${targetChannel.id}> from counted channels.`);
    } else {
      const channelList = data.countedChannels.map(id => `<#${id}>`).join(", ");
      return message.reply(`📌 **Counted Channels:** ${channelList}\n*Use:* \`${prefix}msg channel add/remove [#channel]\``);
    }
  }

  // Calculate UTC Reset Timestamps for Dynamic Display
  const now = new Date();
  
  // Daily reset: Next 00:00 UTC
  const nextMidnight = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0) / 1000);
  
  // Weekly reset: Next Monday 00:00 UTC
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
  const nextMonday = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0) / 1000);
  
  // Monthly reset: 1st of next month 00:00 UTC
  const nextMonth = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0) / 1000);

  const targetUser = message.mentions.users.first() || message.author;
  const userId = targetUser.id;

  const userStats = data.messageStats[userId] || { total: 0, daily: { count: 0 }, weekly: { count: 0 }, monthly: { count: 0 } };
  const userEco = data.economy[userId] || { balance: 0 };
  const userPets = data.pets[userId] || [];

  // Page 1: Mini-Game & Economy (Compact)
  const page1 = new EmbedBuilder()
    .setTitle(`📦 ${targetUser.username} • Mini-Game`)
    .setColor(0x5865f2)
    .addFields(
      { name: "💳 Balance", value: `\`${(userEco.balance || 0).toFixed(2)} DON\``, inline: true },
      { name: "🎒 Pets", value: `\`${userPets.length} Collected\``, inline: true },
      { name: "✨ Rarest", value: userPets.length > 0 ? `\`${userPets[userPets.length - 1].name}\`` : "`None`", inline: true }
    )
    .setFooter({ text: "Page 1/2 • Economy & Pets" });

  // Page 2: Message Activity with UTC Timestamps (Compact)
  const page2 = new EmbedBuilder()
    .setTitle(`📊 ${targetUser.username} • Messages`)
    .setColor(0x2ecc71)
    .addFields(
      { name: "☀️ Daily", value: `\`${userStats.daily.count}\`\nResets <t:${nextMidnight}:R>`, inline: true },
      { name: "📆 Weekly", value: `\`${userStats.weekly.count}\`\nResets <t:${nextMonday}:R>`, inline: true },
      { name: "📅 Monthly", value: `\`${userStats.monthly.count}\`\nResets <t:${nextMonth}:R>`, inline: true },
      { name: "💬 Total", value: `\`${userStats.total}\``, inline: true }
    )
    .setFooter({ text: "Page 2/2 • UTC Tracked Channels" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p1").setLabel("📦 Mini-Game").setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId("p2").setLabel("📊 Messages").setStyle(ButtonStyle.Secondary)
  );

  const msg = await message.reply({ embeds: [page1], components: [row] });
  const collector = msg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

  collector.on("collect", async (i) => {
    if (i.customId === "p1") {
      row.components[0].setDisabled(true);
      row.components[1].setDisabled(false);
      await i.update({ embeds: [page1], components: [row] });
    } else {
      row.components[0].setDisabled(false);
      row.components[1].setDisabled(true);
      await i.update({ embeds: [page2], components: [row] });
    }
  });

  collector.on("end", () => msg.edit({ components: [] }).catch(() => null));
}

module.exports = { execute };
