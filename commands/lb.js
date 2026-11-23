const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const FUN_ROBUX_PER_DON = 0.05;
const TOTAL_INDEX_PETS = 30;
const MEDALS = ["🥇", "🥈", "🥉"];

function formatDon(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return "0";
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
}

function getRankPrefix(index) {
  return MEDALS[index] ? `${MEDALS[index]} **#${index + 1}**` : `**#${index + 1}**`;
}

function countUniquePets(pets) {
  if (!Array.isArray(pets)) return 0;
  const seen = new Set();
  for (const p of pets) {
    if (!p || typeof p !== "object") continue;
    const key = p.id || String(p.name || "").trim().toLowerCase();
    if (key) seen.add(key);
  }
  return seen.size;
}

function countIndexedPets(data, userId, pets) {
  const seen = new Set();

  const dexEntries = Array.isArray(data?.petDex?.[userId]) ? data.petDex[userId] : [];
  for (const entry of dexEntries) {
    if (typeof entry === "string" && entry.trim()) {
      seen.add(entry.trim().toLowerCase());
    } else if (entry && typeof entry === "object") {
      const key = entry.id || String(entry.name || "").trim().toLowerCase();
      if (key) seen.add(key);
    }
  }

  if (Array.isArray(pets)) {
    for (const p of pets) {
      if (!p || typeof p !== "object") continue;
      const key = p.id || String(p.name || "").trim().toLowerCase();
      if (key) seen.add(key);
    }
  }

  return seen.size;
}

function getTotalPetWorth(pets) {
  if (!Array.isArray(pets)) return 0;
  return pets.reduce((sum, p) => {
    const val = Number(p?.value);
    return sum + (Number.isFinite(val) ? val : 0);
  }, 0);
}

function resolvePageFromArgs(args = []) {
  const arg = String(args[0] || "").trim().toLowerCase();
  if (arg === "1" || arg === "don" || arg === "balance" || arg === "bal") return 0;
  if (arg === "2" || arg === "rbx" || arg === "robux" || arg === "fun") return 1;
  if (arg === "3" || arg === "pets" || arg === "worth") return 2;
  if (arg === "4" || arg === "index" || arg === "dex" || arg === "pokedex") return 3;
  return 0;
}

async function resolveUsername(guild, client, userId) {
  const fallback = `User ${userId}`;
  try {
    const cachedMember = guild?.members?.cache?.get(userId);
    if (cachedMember?.user?.username) return cachedMember.user.username;

    const cachedUser = client?.users?.cache?.get(userId);
    if (cachedUser?.username) return cachedUser.username;

    if (guild?.members?.fetch) {
      const member = await Promise.race([
        guild.members.fetch(userId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (member?.user?.username) return member.user.username;
    }

    if (client?.users?.fetch) {
      const fetched = await Promise.race([
        client.users.fetch(userId).catch(() => null),
        new Promise((resolve) => setTimeout(() => resolve(null), 1500))
      ]);
      if (fetched?.username) return fetched.username;
    }
  } catch {
    // ignore lookup errors
  }
  return fallback;
}

function buildPages(usersData, prefix) {
  // Page 1: DON Wallet Balance
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
    const gap = i === 0 ? "👑 Leader" : `-${Math.max(0, topRbx - u.funRobux).toFixed(2)} R$`;
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
    .sort((a, b) => b.totalPetWorth - a.totalPetWorth || b.indexedPets - a.indexedPets)
    .slice(0, 10);
  const topWorth = petWorthSorted[0]?.totalPetWorth ?? 0;

  const worthLines = petWorthSorted.map((u, i) => {
    const gap = i === 0 ? "👑 Leader" : `-${formatDon(Math.max(0, topWorth - u.totalPetWorth))} DON`;
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${formatDon(u.totalPetWorth)} DON worth\` (${u.petCount} pets • ${u.indexedPets}/${TOTAL_INDEX_PETS} dex) • *${gap}*`;
  });

  const page3 = new EmbedBuilder()
    .setTitle("🏆 Leaderboard • Total Pet Worth")
    .setColor(0xf1c40f)
    .setDescription(worthLines.join("\n") || "No data.")
    .setFooter({ text: `Page 3/4 • Pet collection value • ${prefix}lb` })
    .setTimestamp();

  // Page 4: Permanent Pet Index Completion
  const indexSorted = [...usersData]
    .sort(
      (a, b) =>
        b.indexedPets - a.indexedPets ||
        b.totalPetWorth - a.totalPetWorth ||
        b.balance - a.balance
    )
    .slice(0, 10);

  const indexLines = indexSorted.map((u, i) => {
    const pct = Math.min(100, Math.round((u.indexedPets / TOTAL_INDEX_PETS) * 100));
    return `${getRankPrefix(i)} **${u.username}** (<@${u.id}>)\n┗ \`${u.indexedPets}/${TOTAL_INDEX_PETS} indexed\` (**${pct}%**) • Worth: \`${formatDon(u.totalPetWorth)} DON\``;
  });

  const page4 = new EmbedBuilder()
    .setTitle("📖 Leaderboard • Pet Index Mastery")
    .setColor(0x9b59b6)
    .setDescription(indexLines.join("\n") || "No data.")
    .setFooter({ text: `Page 4/4 • Permanent dex discoveries • ${prefix}index` })
    .setTimestamp();

  return [page1, page2, page3, page4];
}

function getRow(pageIndex) {
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
}

async function execute(message, args = [], prefix = "?", getGuildData, saveData) {
  try {
    if (!message?.guild) {
      return message?.reply?.("❌ This command can only be used inside a server.");
    }

    const data = typeof getGuildData === "function" ? (getGuildData(message.guild.id) || {}) : {};
    if (!data.economy || typeof data.economy !== "object") data.economy = {};
    if (!data.pets || typeof data.pets !== "object") data.pets = {};
    if (!data.petDex || typeof data.petDex !== "object") data.petDex = {};

    const userIds = new Set([
      ...Object.keys(data.economy),
      ...Object.keys(data.pets),
      ...Object.keys(data.petDex),
      message.author.id
    ]);

    const usersData = [];
    for (const id of userIds) {
      const eco = data.economy[id] || {};
      const pets = Array.isArray(data.pets[id]) ? data.pets[id] : [];

      const rawBal = Number(eco.balance);
      const balance = Number.isFinite(rawBal) ? rawBal : 0;
      const totalPetWorth = getTotalPetWorth(pets);
      const uniquePets = countUniquePets(pets);
      const indexedPets = countIndexedPets(data, id, pets);

      const funRobux =
        typeof eco.robux === "number" && Number.isFinite(eco.robux)
          ? Number(eco.robux)
          : Number((balance * FUN_ROBUX_PER_DON).toFixed(2));

      const powerScore = Number(
        (balance + totalPetWorth * 0.5 + indexedPets * 15).toFixed(2)
      );

      const username = await resolveUsername(message.guild, message.client, id);

      usersData.push({
        id,
        username,
        balance,
        funRobux,
        totalPetWorth,
        petCount: pets.length,
        uniquePets,
        indexedPets,
        powerScore
      });
    }

    const pages = buildPages(usersData, prefix || "?");
    let currentPage = resolvePageFromArgs(args);

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
      try {
        if (i.customId === "lb_p1") currentPage = 0;
        else if (i.customId === "lb_p2") currentPage = 1;
        else if (i.customId === "lb_p3") currentPage = 2;
        else if (i.customId === "lb_p4") currentPage = 3;
        else return;

        await i.update({
          embeds: [pages[currentPage]],
          components: [getRow(currentPage)],
          allowedMentions: { users: [] }
        });
      } catch {
        // ignore interaction update errors
      }
    });

    collector.on("end", () => {
      lbMsg.edit({ components: [] }).catch(() => null);
    });

    return lbMsg;
  } catch (err) {
    console.error("[LB] Command error:", err);
    return message.reply("❌ Could not load the leaderboard right now.").catch(() => null);
  }
}

module.exports = { execute };
