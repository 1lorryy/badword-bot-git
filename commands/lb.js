const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// 50 DON = 1 fun Robux (0.02 per DON)
const FUN_ROBUX_PER_DON = 0.02;
const DON_PER_FUN_ROBUX = 50;
const TOTAL_INDEX_PETS = 30;
const TOP_LIMIT = 5;
const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];

function formatDon(amount) {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return "0";
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
}

function buildMiniBar(value, maxValue, segments = 8) {
  const safeMax = Number(maxValue) > 0 ? Number(maxValue) : 1;
  const ratio = Math.max(0, Math.min(1, (Number(value) || 0) / safeMax));
  const filled = Math.round(ratio * segments);
  return `${"▰".repeat(filled)}${"▱".repeat(segments - filled)}`;
}

function getRankTag(index) {
  return MEDALS[index] || `**#${index + 1}**`;
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

async function resolveUsernamesFast(guild, client, userIds) {
  const nameMap = new Map();
  const missingIds = [];

  for (const id of userIds) {
    const cachedMember = guild?.members?.cache?.get(id);
    if (cachedMember?.user?.username) {
      nameMap.set(id, cachedMember.user.username);
      continue;
    }
    const cachedUser = client?.users?.cache?.get(id);
    if (cachedUser?.username) {
      nameMap.set(id, cachedUser.username);
      continue;
    }
    missingIds.push(id);
  }

  if (missingIds.length > 0 && client?.users?.fetch) {
    const fetchOne = async (id) => {
      try {
        const u = await Promise.race([
          client.users.fetch(id).catch(() => null),
          new Promise((resolve) => setTimeout(() => resolve(null), 900))
        ]);
        if (u?.username) nameMap.set(id, u.username);
      } catch {
        // ignore lookup errors
      }
    };

    await Promise.all(missingIds.slice(0, 20).map(fetchOne));
  }

  for (const id of userIds) {
    if (!nameMap.has(id)) {
      nameMap.set(id, `Player ${id.slice(-4)}`);
    }
  }

  return nameMap;
}

function buildPages(usersData, prefix) {
  // Page 1: DON Wallet Balance (Top 5)
  const donSorted = [...usersData]
    .sort((a, b) => b.balance - a.balance || b.powerScore - a.powerScore)
    .slice(0, TOP_LIMIT);
  const topDon = donSorted[0]?.balance ?? 0;

  const donLines = donSorted.map((u, i) => {
    const bar = buildMiniBar(u.balance, topDon);
    const tag = i === 0 ? "👑" : `-${formatDon(Math.max(0, topDon - u.balance))}`;
    return `${getRankTag(i)} **${u.username}** • \`${formatDon(u.balance)} DON\`\n${bar} *${tag}*`;
  });

  const page1 = new EmbedBuilder()
    .setTitle("🏆 Top 5 • DON Wallet")
    .setColor(0x2ecc71)
    .setDescription(donLines.join("\n\n") || "*No rankings yet.*")
    .setFooter({ text: `Page 1/4 • ${prefix}lb <don|rbx|pets|index>` })
    .setTimestamp();

  // Page 2: Fun Robux Rate (50 DON = 1 R$, Top 5)
  const rbxSorted = [...usersData]
    .sort((a, b) => b.funRobux - a.funRobux || b.balance - a.balance)
    .slice(0, TOP_LIMIT);
  const topRbx = rbxSorted[0]?.funRobux ?? 0;

  const rbxLines = rbxSorted.map((u, i) => {
    const bar = buildMiniBar(u.funRobux, topRbx);
    const tag = i === 0 ? "👑" : `-${Math.max(0, topRbx - u.funRobux).toFixed(2)} R$`;
    return `${getRankTag(i)} **${u.username}** • \`${u.funRobux.toFixed(2)} R$\`\n${bar} *${tag}*`;
  });

  const page2 = new EmbedBuilder()
    .setTitle("💎 Top 5 • Fun Robux")
    .setColor(0x5865f2)
    .setDescription(
      `*Fun rate: \`${DON_PER_FUN_ROBUX} DON = 1 R$\`*\n\n` +
        (rbxLines.join("\n\n") || "*No rankings yet.*")
    )
    .setFooter({ text: `Page 2/4 • Event/fun exchange reference` })
    .setTimestamp();

  // Page 3: Total Pet Worth (Top 5)
  const worthSorted = [...usersData]
    .sort((a, b) => b.totalPetWorth - a.totalPetWorth || b.indexedPets - a.indexedPets)
    .slice(0, TOP_LIMIT);
  const topWorth = worthSorted[0]?.totalPetWorth ?? 0;

  const worthLines = worthSorted.map((u, i) => {
    const bar = buildMiniBar(u.totalPetWorth, topWorth);
    return `${getRankTag(i)} **${u.username}** • \`${formatDon(u.totalPetWorth)} DON\` *(${u.petCount} pets)*\n${bar}`;
  });

  const page3 = new EmbedBuilder()
    .setTitle("🐾 Top 5 • Pet Worth")
    .setColor(0xf1c40f)
    .setDescription(worthLines.join("\n\n") || "*No pets ranked yet.*")
    .setFooter({ text: `Page 3/4 • Bag value • ${prefix}pets` })
    .setTimestamp();

  // Page 4: Permanent Pet Index Mastery (Top 5)
  const indexSorted = [...usersData]
    .sort(
      (a, b) =>
        b.indexedPets - a.indexedPets ||
        b.totalPetWorth - a.totalPetWorth ||
        b.balance - a.balance
    )
    .slice(0, TOP_LIMIT);

  const indexLines = indexSorted.map((u, i) => {
    const pct = Math.min(100, Math.round((u.indexedPets / TOTAL_INDEX_PETS) * 100));
    const bar = buildMiniBar(u.indexedPets, TOTAL_INDEX_PETS);
    return `${getRankTag(i)} **${u.username}** • \`${u.indexedPets}/${TOTAL_INDEX_PETS}\` (**${pct}%**)\n${bar}`;
  });

  const page4 = new EmbedBuilder()
    .setTitle("📖 Top 5 • Index Mastery")
    .setColor(0x9b59b6)
    .setDescription(indexLines.join("\n\n") || "*No discoveries yet.*")
    .setFooter({ text: `Page 4/4 • Permanent dex • ${prefix}index` })
    .setTimestamp();

  return [page1, page2, page3, page4];
}

function getRow(pageIndex) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("lb_p1")
      .setLabel("DON")
      .setStyle(pageIndex === 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(pageIndex === 0),
    new ButtonBuilder()
      .setCustomId("lb_p2")
      .setLabel("Fun R$")
      .setStyle(pageIndex === 1 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(pageIndex === 1),
    new ButtonBuilder()
      .setCustomId("lb_p3")
      .setLabel("Pet Worth")
      .setStyle(pageIndex === 2 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(pageIndex === 2),
    new ButtonBuilder()
      .setCustomId("lb_p4")
      .setLabel("Index")
      .setStyle(pageIndex === 3 ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(pageIndex === 3)
  );
}

async function execute(message, args = [], prefix = "?") {
  try {
    if (!message?.guild) {
      return message?.reply?.("❌ Use this command inside a server.");
    }

    const data = typeof global.getGuildData === "function"
      ? global.getGuildData(message.guild.id) || {}
      : {};

    const ecoMap = data.economy && typeof data.economy === "object" ? data.economy : {};
    const petsMap = data.pets && typeof data.pets === "object" ? data.pets : {};
    const dexMap = data.petDex && typeof data.petDex === "object" ? data.petDex : {};

    const allIds = Array.from(
      new Set([
        ...Object.keys(ecoMap),
        ...Object.keys(petsMap),
        ...Object.keys(dexMap),
        message.author.id
      ])
    );

    const nameMap = await resolveUsernamesFast(message.guild, message.client, allIds);

    const usersData = allIds.map((id) => {
