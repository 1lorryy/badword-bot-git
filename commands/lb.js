const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const FUN_ROBUX_PER_DON = 0.05;

// Keep in sync with your PET_POOL size / IDs if needed
const TOTAL_INDEX_PETS = 30;

const MEDALS = ["🥇", "🥈", "🥉"];

function formatDon(amount) {
  const num = Number(amount) || 0;
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
}

function getRankPrefix(index) {
  return MEDALS[index] ? `${MEDALS[index]} **#${index + 1}**` : `**#${index + 1}**`;
}

function countUniquePets(pets = []) {
  const seen = new Set();
  for (const p of pets) {
    if (!p) continue;
    const key = p.id || String(p.name || "").toLowerCase();
    if (key) seen.add(key);
  }
  return seen.size;
}

function resolvePageFromArgs(args = []) {
  const arg = (args[0] || "").toLowerCase();
  if (arg === "1" || arg === "don" || arg === "balance" || arg === "bal") return 0;
  if (arg === "2" || arg === "rbx" || arg === "robux" || arg === "fun") return 1;
  if (arg === "3" || arg === "pets" || arg === "worth") return 2;
  if (arg === "4" || arg === "index" || arg === "dex" || arg === "pokedex") return 3;
  return 0;
}

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  const userIds = new Set([...Object.keys(data.economy), ...Object.keys(data.pets)]);
  if (userIds.size === 0) {
    return message.reply("📊 No leaderboard data yet! Chat to earn DON, open crates, and build your index.");
  }

  const usersData = [];
  for (const id of userIds) {
    const eco = data.economy[id] || {};
    const pets = Array.isArray(data.pets[id]) ? data.pets[id] : [];

    const balance = Number(eco.balance) || 0;
    const totalPetWorth = pets.reduce((sum, p) => sum + (Number(p?.value) || 0), 0);
    const uniquePets = countUniquePets(pets);

    // Prefer explicit eco.robux if tracked, otherwise compute from the low fun rate (1 DON = 0.05 R$)
    const funRobux =
      typeof eco.robux === "number"
        ? Number(eco.robux)
        : Number((balance * FUN_ROBUX_PER_DON).toFixed(2));

    // Tougher overall power score blending liquid DON + pet collection + unique dex completion
    const powerScore = Number(
      (balance + totalPetWorth * 0.5 + uniquePets * 15).toFixed(2)
    );

    let username = `User ${id}`;
    try {
      const member = await message.guild.members.fetch(id).catch(() => null);
      if (member) {
        username = member.user.username;
      } else {
        const fetchedUser = await message.client.users.fetch(id).catch(() => null);
        if (fetchedUser) username = fetchedUser.username;
      }
    } catch {
      username = `User ${id}`;
    }

    usersData.push({
      id,
      username,
      balance,
      funRobux,
      totalPetWorth,
      petCount: pets.length,
      uniquePets,
      powerScore
    });
  }

  // Page 1: DON Wallet Balance + Gap to #1
  const donSorted = [...usersData]
    .sort((a, b) => b.balance - a.balance || b.powerScore - a.powerScore)
    .slice(0, 10);
  const topDon = donSorted[0]?.balance ?? 0;

  const donLines = donSorted.map((u, i) => {
    const gap = i === 0 ? "👑 Leader" : `-${formatDon(Math.max(0, topDon - u.balance))} DON`;
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${formatDon(u.balance)} DON\` • *${gap}*`;
  });

  const page1 = new EmbedBuilder()
    .setTitle("🏆 Leaderboard • DON Wallet Balance")
    .setColor(0x2ecc71)
    .setDescription(donLines.join("\n") || "No data.")
    .setFooter({ text: `Page 1/4 • ${prefix}lb <don|rbx|pets|index> to jump` })
    .setTimestamp();

  // Page 2: Fun / Fake Robux (Low Exchange Rate)
  const rbxSorted = [...usersData]
    .sort((a, b) => b.funRobux - a.funRobux || b.balance - a.balance)
    .slice(0, 10);
  const topRbx = rbxSorted[0]?.funRobux ?? 0;

  const rbxLines = rbxSorted.map((u, i) => {
    const gap = i === 0 ? "👑 Leader" : `-${(Math.max(0, topRbx - u.funRobux)).toFixed(2)} R$`;
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${u.funRobux.toFixed(2)} R$\` *(fun rate: 1 DON = ${FUN_ROBUX_PER_DON} R$)* • *${gap}*`;
  });

  const page2 = new EmbedBuilder()
    .setTitle("🏆 Leaderboard • Fun Robux Rate")
    .setColor(0x5865f2)
    .setDescription(rbxLines.join("\n") || "No data.")
    .setFooter({ text: `Page 2/4 • Fake/fun exchange rate only • ${prefix}lb` })
    .setTimestamp();

  // Page 3: Total Pet Worth
  const petWorthSorted = [...usersData]
    .sort((a, b) => b.totalPetWorth - a.totalPetWorth || b.uniquePets - a.uniquePets)
    .slice(0, 10);
  const topWorth = petWorthSorted[0]?.totalPetWorth ?? 0;

  const worthLines = petWorthSorted.map((u, i) => {
    const gap = i === 0 ? "👑 Leader" : `-${formatDon(Math.max(0, topWorth - u.totalPetWorth))} DON`;
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${formatDon(u.totalPetWorth)} DON worth\` (${u.petCount} pets • ${u.uniquePets}/${TOTAL_INDEX_PETS} dex) • *${gap}*`;
  });

  const page3 = new EmbedBuilder()
    .setTitle("🏆 Leaderboard • Total Pet Worth")
    .setColor(0xf1c40f)
    .setDescription(worthLines.join("\n") || "No data.")
    .setFooter({ text: `Page 3/4 • Pet collection value • ${prefix}lb` })
    .setTimestamp();

  // Page 4: Pet Index Completion
  const indexSorted = [...usersData]
    .sort(
      (a, b) =>
        b.uniquePets - a.uniquePets ||
        b.totalPetWorth - a.totalPetWorth ||
        b.balance - a.balance
    )
    .slice(0, 10);

  const indexLines = indexSorted.map((u, i) => {
    const pct = Math.min(100, Math.round((u.uniquePets / TOTAL_INDEX_PETS) * 100));
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${u.uniquePets}/${TOTAL_INDEX_PETS} unlocked\` (**${pct}%**) • Worth: \`${formatDon(u.totalPetWorth)} DON\``;
  });

  const page4 = new EmbedBuilder()
    .setTitle("📖 Leaderboard • Pet Index Mastery")
    .setColor(0x9b59b6)
    .setDescription(indexLines.join("\n") || "No data.")
    .setFooter({ text: `Page 4/4 • Unique pets collected • ${prefix}index` })
    .setTimestamp();

  const pages = [page1, page2, page3, page4];
  let currentPage = resolvePageFromArgs(args);

  const getRow = (pageIndex) => {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("lb_p1")
        .setLabel("1️⃣ DON")
        .setStyle(pageIndex === 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(pageIndex === 0),
      new ButtonBuilder()
        .setCustomId("lb_p2")
        .setLabel("2️⃣ Fun R$")
        .setStyle(pageIndex === 1 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(pageIndex === 1),
      new ButtonBuilder()
        .setCustomId("lb_p3")
        .setLabel("3️⃣ Pet Worth")
        .setStyle(pageIndex === 2 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(pageIndex === 2),
      new ButtonBuilder()
        .setCustomId("lb_p4")
        .setLabel("4️⃣ Index")
        .setStyle(pageIndex === 3 ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(pageIndex === 3)
    );
  };

  const lbMsg = await message.reply({
    embeds: [pages[currentPage]],
    components: [getRow(currentPage)],
    allowedMentions: { users: [] }
  });

  const collector = lbMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000
  });

  collector.on("collect", async (i) => {
    if (i.customId === "lb_p1") currentPage = 0;
    else if (i.customId === "lb_p2") currentPage = 1;
    else if (i.customId === "lb_p3") currentPage = 2;
    else if (i.customId === "lb_p4") currentPage = 3;

    await i.update({
      embeds: [pages[currentPage]],
      components: [getRow(currentPage)],
      allowedMentions: { users: [] }
    });
  });

  collector.on("end", () => {
    lbMsg.edit({ components: [] }).catch(() => null);
  });
}

module.exports = { execute };
