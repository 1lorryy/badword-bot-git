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

  // 2. ADMIN BALANCE MANAGEMENT (?msg admin add/remove/set @user amount)
  if (sub === "admin") {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ You need **Administrator** permissions to manage economy balances.");
    }

    const action = args[1]?.toLowerCase();
    const targetUser = message.mentions.users.first();
    const amount = parseFloat(args[3]);

    if (!action || !targetUser || isNaN(amount)) {
      return message.reply(`❌ Usage: \`${prefix}msg admin [add/remove/set] @user [amount]\``);
    }

    if (!data.economy[targetUser.id]) {
      data.economy[targetUser.id] = { balance: 0, robux: 0 };
    }

    const userEco = data.economy[targetUser.id];
    if (action === "add") {
      userEco.balance += amount;
    } else if (action === "remove") {
      userEco.balance = Math.max(0, userEco.balance - amount);
    } else if (action === "set") {
      userEco.balance = amount;
    } else {
      return message.reply(`❌ Invalid action! Use \`add\`, \`remove\`, or \`set\`.`);
    }

    saveData();
    return message.reply(`✅ Updated <@${targetUser.id}>'s balance. New Balance: \`${userEco.balance.toFixed(2)} DON\``);
  }

  // 3. CONVERT CALCULATOR (?msg convert [amount of DON or R$])
  if (sub === "convert") {
    const inputAmount = parseFloat(args[1]);
    const userEco = data.economy[message.author.id] || { balance: 0, robux: 0 };

    if (isNaN(inputAmount) || inputAmount <= 0) {
      const maxRobux = ((userEco.balance || 0) / 10).toFixed(1);
      return message.reply(
        `🧮 **DON ➔ Robux Calculator**\n` +
        `• Rate: **10 DON = 1 Virtual R$**\n` +
        `• Your Balance: \`${(userEco.balance || 0).toFixed(2)} DON\` ➔ **${maxRobux} R$**\n\n` +
        `💡 *Usage:* \`${prefix}msg convert [DON amount]\` (e.g. \`${prefix}msg convert 500\`)`
      );
    }

    const robuxValue = (inputAmount / 10).toFixed(1);
    const donNeededFor200 = Math.max(0, 2000 - inputAmount);

    let progressNote = "";
    if (inputAmount < 2000) {
      progressNote = `\n⚠️ *Needs \`${donNeededFor200.toFixed(2)} DON\` more to reach the 200 R$ exchange minimum.*`;
    } else {
      progressNote = `\n✅ *Meets the minimum requirement for \`${prefix}msg exchange\`!*`;
    }

    return message.reply(
      `🧮 **Conversion Calculator:**\n` +
      `\`${inputAmount.toFixed(2)} DON\` = **${robuxValue} Virtual R$**${progressNote}`
    );
  }

  // 4. ACTUAL EXCHANGE TRANSACTION (?msg exchange [amount of DON])
  if (sub === "exchange") {
    const amount = parseFloat(args[1]);
    const userEco = data.economy[message.author.id] || { balance: 0, robux: 0 };
    const maxRobux = Math.floor((userEco.balance || 0) / 10);

    if (isNaN(amount) || amount <= 0) {
      return message.reply(
        `❌ Usage: \`${prefix}msg exchange [amount of DON]\` (Rate: 10 DON = 1 Virtual R$)\n` +
        `💡 Your Balance: \`${(userEco.balance || 0).toFixed(2)} DON\` (You can exchange up to **${maxRobux} R$**).\n` +
        `⚠️ **Minimum exchange is 200 R$** (requires **2,000 DON**).`
      );
    }

    if (userEco.balance < amount) {
      return message.reply(`❌ You don't have enough DON! Your balance: \`${userEco.balance.toFixed(2)} DON\``);
    }

    const robuxEarned = amount / 10;

    if (robuxEarned < 200) {
      return message.reply(
        `❌ Minimum exchange is **200 R$** (requires at least **2,000 DON**).\n` +
        `You requested **${robuxEarned.toFixed(1)} R$** (${amount} DON).`
      );
    }

    userEco.balance -= amount;
    userEco.robux = (userEco.robux || 0) + robuxEarned;
    saveData();

    return message.reply(
      `🎉 Successfully exchanged **${amount} DON** for **${robuxEarned.toFixed(1)} Virtual R$**!\n` +
      `💎 Total Virtual Robux: \`${userEco.robux.toFixed(1)} R$\``
    );
  }

  // Calculate UTC Reset Timestamps for Dynamic Display
  const now = new Date();
  const nextMidnight = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0) / 1000);
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = (1 - dayOfWeek + 7) % 7 || 7;
  const nextMonday = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday, 0, 0, 0) / 1000);
  const nextMonth = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0) / 1000);

  const targetUser = message.mentions.users.first() || message.author;
  const userId = targetUser.id;

  const userStats = data.messageStats[userId] || { total: 0, daily: { count: 0 }, weekly: { count: 0 }, monthly: { count: 0 } };
  const userEco = data.economy[userId] || { balance: 0, robux: 0 };
  const userPets = data.pets[userId] || [];

  // Page 1: Message Activity Stats
  const page1 = new EmbedBuilder()
    .setTitle(`📊 ${targetUser.username} • Messages`)
    .setColor(0x2ecc71)
    .addFields(
      { name: "💬 Total Messages", value: `\`${userStats.total}\``, inline: false },
      { name: "☀️ Daily", value: `\`${userStats.daily.count}\`\nResets <t:${nextMidnight}:R>`, inline: true },
      { name: "📆 Weekly", value: `\`${userStats.weekly.count}\`\nResets <t:${nextMonday}:R>`, inline: true },
      { name: "📅 Monthly", value: `\`${userStats.monthly.count}\`\nResets <t:${nextMonth}:R>`, inline: true }
    )
    .setFooter({ text: "Page 1/2 • UTC Tracked Channels" });

  // Page 2: Mini-Game & Economy (Compact & Clean)
  const page2 = new EmbedBuilder()
    .setTitle(`📦 ${targetUser.username} • Mini-Game & Economy`)
    .setColor(0x5865f2)
    .addFields(
      { name: "💳 Balance", value: `\`${(userEco.balance || 0).toFixed(2)} DON\``, inline: true },
      { name: "💎 Virtual Robux", value: `\`${(userEco.robux || 0).toFixed(1)} R$\``, inline: true },
      { name: "🎒 Pets", value: `\`${userPets.length} Collected\``, inline: true },
      { name: "🔄 Commands", value: `\`${prefix}msg convert [DON]\` — Calculate Robux value\n\`${prefix}msg exchange [DON]\` — Claim R$ (Min: **200 R$**)`, inline: false }
    )
    .setFooter({ text: "Page 2/2 • Economy & Exchange" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("p1").setLabel("📊 Messages").setStyle(ButtonStyle.Primary).setDisabled(true),
    new ButtonBuilder().setCustomId("p2").setLabel("📦 Mini-Game").setStyle(ButtonStyle.Secondary)
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
