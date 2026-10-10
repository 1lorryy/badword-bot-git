const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  // Gather all unique user IDs present in economy or pets
  const userIds = new Set([...Object.keys(data.economy), ...Object.keys(data.pets)]);
  if (userIds.size === 0) {
    return message.reply("📊 No leaderboard data available yet! Start chatting or opening crates to populate the rankings.");
  }

  // Compile stats for each user
  const usersData = [];
  for (const id of userIds) {
    const eco = data.economy[id] || { balance: 0, robux: 0 };
    const pets = data.pets[id] || [];
    const totalPetWorth = pets.reduce((sum, p) => sum + (p.value || 0), 0);

    let username = `User ${id}`;
    try {
      const member = await message.guild.members.fetch(id).catch(() => null);
      username = member ? member.user.username : await message.client.users.fetch(id).then(u => u.username).catch(() => `User ${id}`);
    } catch {
      username = `User ${id}`;
    }

    usersData.push({
      id,
      username,
      balance: eco.balance || 0,
      robux: eco.robux || 0,
      totalPetWorth,
      petCount: pets.length
    });
  }

  // Page 1: DON Wallet Balance Leaderboard
  const donSorted = [...usersData].sort((a, b) => b.balance - a.balance).slice(0, 10);
  const donDesc = donSorted.map((u, i) => `**#${i + 1}** <@${u.id}> — \`${u.balance.toFixed(2)} DON\``).join("\n") || "No data.";
  const page1 = new EmbedBuilder()
    .setTitle("🏆 Server Leaderboard • DON Wallet Balance")
    .setColor(0x2ecc71)
    .setDescription(donDesc)
    .setFooter({ text: "Page 1/3 • DON Currency" })
    .setTimestamp();

  // Page 2: Virtual Robux Leaderboard
  const rbxSorted = [...usersData].sort((a, b) => b.robux - a.robux).slice(0, 10);
  const rbxDesc = rbxSorted.map((u, i) => `**#${i + 1}** <@${u.id}> — \`${u.robux.toFixed(1)} R$\``).join("\n") || "No data.";
  const page2 = new EmbedBuilder()
    .setTitle("🏆 Server Leaderboard • Virtual Robux")
    .setColor(0x5865f2)
    .setDescription(rbxDesc)
    .setFooter({ text: "Page 2/3 • Virtual Robux Balance" })
    .setTimestamp();

  // Page 3: Total Pets Worth Leaderboard
  const petWorthSorted = [...usersData].sort((a, b) => b.totalPetWorth - a.totalPetWorth).slice(0, 10);
  const petWorthDesc = petWorthSorted.map((u, i) => `**#${i + 1}** <@${u.id}> — \`${u.totalPetWorth} DON worth\` (${u.petCount} pets)`).join("\n") || "No data.";
  const page3 = new EmbedBuilder()
    .setTitle("🏆 Server Leaderboard • Total Pets Worth")
    .setColor(0xf1c40f)
    .setDescription(petWorthDesc)
    .setFooter({ text: "Page 3/3 • Pet Collection Value" })
    .setTimestamp();

  const pages = [page1, page2, page3];
  let currentPage = 0;

  const getRow = (pageIndex) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("lb_p1").setLabel("1️⃣ DON").setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 0),
      new ButtonBuilder().setCustomId("lb_p2").setLabel("2️⃣ Robux").setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 1),
      new ButtonBuilder().setCustomId("lb_p3").setLabel("3️⃣ Pet Worth").setStyle(ButtonStyle.Primary).setDisabled(pageIndex === 2)
    );
  };

  const lbMsg = await message.reply({ embeds: [pages[0]], components: [getRow(0)] });
  const collector = lbMsg.createMessageComponentCollector({ filter: i => i.user.id === message.author.id, time: 60000 });

  collector.on("collect", async (i) => {
    if (i.customId === "lb_p1") currentPage = 0;
    else if (i.customId === "lb_p2") currentPage = 1;
    else if (i.customId === "lb_p3") currentPage = 2;

    await i.update({ embeds: [pages[currentPage]], components: [getRow(currentPage)] });
  });

  collector.on("end", () => lbMsg.edit({ components: [] }).catch(() => null));
}

module.exports = { execute };
