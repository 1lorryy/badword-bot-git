const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Fun / fake exchange reference only (very low rate so high pet values don't blow up)
// 20 DON = 1 fun Robux (0.05 per DON)
const FUN_ROBUX_PER_DON = 0.05;
const INDEX_PER_PAGE = 15;
const PITY_THRESHOLD = 15; // Guaranteed Epic+ (or Rare+ on Basic) on 15th dry pull

const CRATE_TYPES = {
  basic: {
    name: "🪵 Basic Crate",
    cost: 5,
    color: 0x8b5a2b,
    desc: "Mostly Commons, slim shot at Rares."
  },
  epic: {
    name: "✨ Epic Crate",
    cost: 22,
    color: 0x9b59b6,
    desc: "Common/Rare grind with tough Epic odds."
  },
  mythic: {
    name: "🌌 Mythic Crate",
    cost: 80,
    color: 0xf1c40f,
    desc: "Heavy Epic/Mythic pool—Mythics are rare hits."
  },
  legendary: {
    name: "⚡ Legendary Crate",
    cost: 260,
    color: 0xe67e22,
    desc: "Brutal odds—Legendaries take real luck."
  },
  godly: {
    name: "👑 Godly Crate",
    cost: 700,
    color: 0xe74c3c,
    desc: "High-stakes gamble—Godlies are ultra-rare."
  }
};

// Tough weights on top-end pets so rare/mythic/legendary/godly drops feel earned
const PET_POOL = [
  // --- Basic Tier ---
  { id: "slime", name: "Slime", rarity: "Common", emoji: "🟢", tier: "basic", weight: 90, value: 0.5 },
  { id: "bunny", name: "Bunny", rarity: "Common", emoji: "🐰", tier: "basic", weight: 75, value: 1 },
  { id: "cat", name: "Cat", rarity: "Common", emoji: "🐱", tier: "basic", weight: 70, value: 1.5 },
  { id: "dog", name: "Dog", rarity: "Common", emoji: "🐶", tier: "basic", weight: 70, value: 1.5 },
  { id: "hamster", name: "Hamster", rarity: "Common", emoji: "🐹", tier: "basic", weight: 60, value: 2 },
  { id: "fox", name: "Fox", rarity: "Rare", emoji: "🦊", tier: "basic", weight: 22, value: 4 },
  { id: "panda", name: "Panda", rarity: "Rare", emoji: "🐼", tier: "basic", weight: 16, value: 5.5 },
  { id: "snow_owl", name: "Snow Owl", rarity: "Rare", emoji: "🦉", tier: "basic", weight: 11, value: 7.5 },
  { id: "hedgehog", name: "Hedgehog", rarity: "Rare", emoji: "🦔", tier: "basic", weight: 8, value: 9 },

  // --- Epic Tier ---
  { id: "frost_wolf", name: "Frost Wolf", rarity: "Epic", emoji: "🐺", tier: "epic", weight: 45, value: 13 },
  { id: "phoenix", name: "Phoenix", rarity: "Epic", emoji: "🔥", tier: "epic", weight: 35, value: 18 },
  { id: "griffin", name: "Griffin", rarity: "Epic", emoji: "🦅", tier: "epic", weight: 28, value: 23 },
  { id: "thunder_eagle", name: "Thunder Eagle", rarity: "Epic", emoji: "⚡", tier: "epic", weight: 19, value: 32 },
  { id: "demon_bat", name: "Demon Bat", rarity: "Epic", emoji: "🦇", tier: "epic", weight: 13, value: 42 },
  { id: "venom_viper", name: "Venom Viper", rarity: "Epic", emoji: "🐍", tier: "epic", weight: 9, value: 52 },

  // --- Mythic Tier ---
  { id: "unicorn", name: "Unicorn", rarity: "Mythic", emoji: "🦄", tier: "mythic", weight: 30, value: 65 },
  { id: "shadow_dragon", name: "Shadow Dragon", rarity: "Mythic", emoji: "🐉", tier: "mythic", weight: 22, value: 85 },
  { id: "golden_tiger", name: "Golden Tiger", rarity: "Mythic", emoji: "🐅", tier: "mythic", weight: 13, value: 135 },
  { id: "cyber_mecha_titan", name: "Cyber Mecha Titan", rarity: "Mythic", emoji: "🤖", tier: "mythic", weight: 8, value: 195 },
  { id: "cosmic_nebula_beast", name: "Cosmic Nebula Beast", rarity: "Mythic", emoji: "🌌", tier: "mythic", weight: 4.5, value: 290 },
  { id: "starlight_lynx", name: "Starlight Lynx", rarity: "Mythic", emoji: "🐈‍⬛", tier: "mythic", weight: 2.5, value: 375 },

  // --- Legendary Tier ---
  { id: "crystal_phoenix", name: "Crystal Phoenix", rarity: "Legendary", emoji: "💎", tier: "legendary", weight: 24, value: 490 },
  { id: "celestial_kitsune", name: "Celestial Kitsune", rarity: "Legendary", emoji: "🦊", tier: "legendary", weight: 14, value: 720 },
  { id: "void_overlord", name: "Void Overlord", rarity: "Legendary", emoji: "🕳️", tier: "legendary", weight: 8, value: 1050 },
  { id: "astral_titan", name: "Astral Titan", rarity: "Legendary", emoji: "✨", tier: "legendary", weight: 4, value: 1500 },
  { id: "chrono_wyvern", name: "Chrono Wyvern", rarity: "Legendary", emoji: "🐲", tier: "legendary", weight: 1.8, value: 2100 },

  // --- Godly Tier ---
  { id: "infinite_godly_dominus", name: "Infinite Godly Dominus", rarity: "Godly", emoji: "👑", tier: "godly", weight: 10, value: 3000 },
  { id: "eternal_galaxy_dragon", name: "Eternal Galaxy Dragon", rarity: "Godly", emoji: "🪐", tier: "godly", weight: 4.5, value: 4800 },
  { id: "supreme_celestial_apex", name: "Supreme Celestial Apex", rarity: "Godly", emoji: "🌟", tier: "godly", weight: 1.2, value: 7500 }
];

const TIER_ORDER = ["basic", "epic", "mythic", "legendary", "godly"];

const MUTATIONS = [
  { name: "Rainbow", tag: "🌈 RAINBOW", mult: 5.0, chance: 0.0025 }, // 0.25%
  { name: "Golden", tag: "🌟 GOLDEN", mult: 3.0, chance: 0.01 },    // 1.0%
  { name: "Shadow", tag: "🌑 SHADOW", mult: 2.2, chance: 0.03 },    // 3.0%
  { name: "Shiny", tag: "✨ SHINY", mult: 1.6, chance: 0.08 }       // 8.0%
];

const RARITY_BADGE = {
  Common: "⬜ Common",
  Rare: "🟦 Rare",
  Epic: "🟪 Epic",
  Mythic: "🟨 Mythic",
  Legendary: "🟧 Legendary",
  Godly: "🟥✨ GODLY"
};

function formatDon(amount) {
  const num = Number(amount) || 0;
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
}

function toFunRobux(donAmount) {
  const val = (Number(donAmount) || 0) * FUN_ROBUX_PER_DON;
  return val.toFixed(2);
}

function getPetDisplayName(pet) {
  return pet.mutation ? `[${pet.mutation}] ${pet.name}` : pet.name;
}

function getPetIndexMap() {
  const map = new Map();
  PET_POOL.forEach((pet, i) => {
    const key = pet.id || pet.name.toLowerCase();
    map.set(key, { index: i + 1, pet });
  });
  return map;
}

function getOwnedCounts(userPets = []) {
  const counts = new Map();
  for (const p of userPets) {
    if (!p) continue;
    const key = p.id || String(p.name || "").toLowerCase();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

// Ensures data.petDex[userId] tracks every species ever discovered (even after selling/fusing)
function ensureAndSyncDex(data, userId) {
  if (!data.petDex || typeof data.petDex !== "object") data.petDex = {};
  if (!Array.isArray(data.petDex[userId])) data.petDex[userId] = [];

  const dexSet = new Set(data.petDex[userId]);
  let changed = false;

  const currentPets = Array.isArray(data.pets?.[userId]) ? data.pets[userId] : [];
  for (const p of currentPets) {
    if (!p) continue;
    const key = p.id || String(p.name || "").toLowerCase();
    if (key && !dexSet.has(key)) {
      dexSet.add(key);
      changed = true;
    }
  }

  if (changed) {
    data.petDex[userId] = Array.from(dexSet);
  }
  return { dexSet, changed };
}

function markPetIndexed(data, userId, pet) {
  const { dexSet } = ensureAndSyncDex(data, userId);
  const key = pet?.id || String(pet?.name || "").toLowerCase();
  if (!key) return false;

  const isBrandNewDiscovery = !dexSet.has(key);
  if (isBrandNewDiscovery) {
    dexSet.add(key);
    data.petDex[userId] = Array.from(dexSet);
  }
  return isBrandNewDiscovery;
}

function rollMutation(basePet) {
  const roll = Math.random();
  let cumulative = 0;
  for (const m of MUTATIONS) {
    cumulative += m.chance;
    if (roll < cumulative) {
      return {
        ...basePet,
        mutation: m.name,
        mutationTag: m.tag,
        value: Number((basePet.value * m.mult).toFixed(2))
      };
    }
  }
  return { ...basePet, mutation: null, mutationTag: null };
}

function getCandidatePool(crateType, forcePity = false) {
  let pool;
  if (crateType === "basic") {
    pool = PET_POOL.filter((p) => p.tier === "basic").map((p) => ({
      ...p,
      effectiveWeight: p.rarity === "Rare" ? p.weight * 0.45 : p.weight * 1.25
    }));
  } else if (crateType === "epic") {
    pool = PET_POOL.filter((p) => p.tier === "basic" || p.tier === "epic").map((p) => ({
      ...p,
      effectiveWeight: p.tier === "epic" ? p.weight * 0.65 : p.weight * 1.35
    }));
  } else if (crateType === "mythic") {
    pool = PET_POOL.filter((p) => ["basic", "epic", "mythic"].includes(p.tier)).map((p) => {
      if (p.tier === "mythic") return { ...p, effectiveWeight: p.weight * 0.55 };
      if (p.tier === "epic") return { ...p, effectiveWeight: p.weight * 1.1 };
      return { ...p, effectiveWeight: p.weight * 0.5 };
    });
  } else if (crateType === "legendary") {
    pool = PET_POOL.filter((p) => ["epic", "mythic", "legendary"].includes(p.tier)).map((p) => {
      if (p.tier === "legendary") return { ...p, effectiveWeight: p.weight * 0.5 };
      if (p.tier === "mythic") return { ...p, effectiveWeight: p.weight * 0.9 };
      return { ...p, effectiveWeight: p.weight * 0.85 };
    });
  } else {
    pool = PET_POOL.filter((p) => ["mythic", "legendary", "godly"].includes(p.tier)).map((p) => {
      if (p.tier === "godly") return { ...p, effectiveWeight: p.weight * 0.45 };
      if (p.tier === "legendary") return { ...p, effectiveWeight: p.weight * 0.85 };
      return { ...p, effectiveWeight: p.weight * 1.1 };
    });
  }

  if (forcePity) {
    const pityFiltered =
      crateType === "basic"
        ? pool.filter((p) => p.rarity !== "Common")
        : pool.filter((p) => ["Epic", "Mythic", "Legendary", "Godly"].includes(p.rarity));
    if (pityFiltered.length > 0) return pityFiltered;
  }

  return pool;
}

function rollPetWithOdds(crateType, pityCount = 0) {
  const triggeredPity = pityCount + 1 >= PITY_THRESHOLD;
  const candidates = getCandidatePool(crateType, triggeredPity);
  const totalWeight = candidates.reduce((sum, p) => sum + p.effectiveWeight, 0);
  let randomNum = Math.random() * totalWeight;
  let chosen = candidates[0];

  for (const pet of candidates) {
    if (randomNum < pet.effectiveWeight) {
      chosen = pet;
      break;
    }
    randomNum -= pet.effectiveWeight;
  }

  const rarityOddsPct = ((chosen.effectiveWeight / totalWeight) * 100).toFixed(1);
  const { effectiveWeight, ...cleanPet } = chosen;
  const mutatedPet = rollMutation(cleanPet);

  return { pet: mutatedPet, rarityOddsPct, triggeredPity };
}

function getHypeLine(pet, triggeredPity) {
  if (pet.mutation === "Rainbow") return "🌈🚨 **UNREAL RAINBOW MUTATION!! 5.0x VALUE FLEX!!**";
  if (pet.rarity === "Godly") return "🚨 **INSANE GODLY PULL!!** The whole server felt that.";
  if (pet.rarity === "Legendary") return "🔥 **HUGE LEGENDARY HIT!** Beat brutal odds for this one.";
  if (pet.mutation === "Golden") return "🌟 **GOLDEN VARIANT!** 3.0x sell value multiplier!";
  if (pet.rarity === "Mythic") return "⚡ **MYTHIC DROP!** Huge luck on that spin.";
  if (pet.rarity === "Epic") {
    return triggeredPity
      ? "🎯 **PITY TRIGGERED!** Guaranteed Epic+ hit!"
      : "✨ **Epic pull!** Solid step up from the grind.";
  }
  if (pet.rarity === "Rare") {
    return triggeredPity
      ? "🎯 **PITY TRIGGERED!** Guaranteed Rare+ hit!"
      : "🟦 **Rare sneak!** Better than the usual commons.";
  }
  return "💨 *Common roll — stack 3 duplicates to `?fuse` or keep spinning!*";
}

function findFusionCandidate(userPets = []) {
  const groups = new Map();
  userPets.forEach((pet, index) => {
    if (!pet || pet.locked || pet.tier === "godly") return;
    const key = pet.id || pet.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ pet, index });
  });

  let bestGroup = null;
  for (const entries of groups.values()) {
    if (entries.length >= 3) {
      entries.sort((a, b) => (Number(a.pet.value) || 0) - (Number(b.pet.value) || 0));
      if (!bestGroup || (Number(entries[0].pet.value) || 0) < (Number(bestGroup[0].pet.value) || 0)) {
        bestGroup = entries;
      }
    }
  }
  return bestGroup ? bestGroup.slice(0, 3) : null;
}

function executeFusion(userPets) {
  const trio = findFusionCandidate(userPets);
  if (!trio) return null;

  const basePet = trio[0].pet;
  const currentTierIdx = TIER_ORDER.indexOf(basePet.tier);
  const nextTier = TIER_ORDER[Math.min(TIER_ORDER.length - 1, Math.max(0, currentTierIdx + 1))];
  const nextPool = PET_POOL.filter((p) => p.tier === nextTier);
  const baseReward = nextPool[Math.floor(Math.random() * nextPool.length)] || PET_POOL[0];

  // Fusion has boosted 20% mutation chance!
  let fusedPet = { ...baseReward, mutation: null, mutationTag: null };
  if (Math.random() < 0.2) {
    fusedPet = rollMutation(baseReward);
    if (!fusedPet.mutation) {
      fusedPet = {
        ...baseReward,
        mutation: "Shiny",
        mutationTag: "✨ SHINY",
        value: Number((baseReward.value * 1.6).toFixed(2))
      };
    }
  }

  const indicesToRemove = trio.map((t) => t.index).sort((a, b) => b - a);
  for (const idx of indicesToRemove) {
    userPets.splice(idx, 1);
  }
  userPets.push(fusedPet);

  return {
    consumedName: `${basePet.emoji} ${basePet.name}`,
    fusedPet
  };
}

function getTotalIndexPages() {
  return Math.max(1, Math.ceil(PET_POOL.length / INDEX_PER_PAGE));
}

function buildIndexRow(page, totalPages) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("dex_prev_page")
      .setLabel("◀️ Prev")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page <= 1),
    new ButtonBuilder()
      .setCustomId("dex_next_page")
      .setLabel("Next ▶️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(page >= totalPages)
  );
}

function buildIndexEmbed(user, data, userId, page = 1) {
  const totalPages = getTotalIndexPages();
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * INDEX_PER_PAGE;
  const slice = PET_POOL.slice(start, start + INDEX_PER_PAGE);

  const userPets = Array.isArray(data.pets?.[userId]) ? data.pets[userId] : [];
  const { dexSet } = ensureAndSyncDex(data, userId);
  const ownedCounts = getOwnedCounts(userPets);

  let totalIndexedCount = 0;
  for (const pet of PET_POOL) {
    const key = pet.id || pet.name.toLowerCase();
    if (dexSet.has(key)) totalIndexedCount += 1;
  }

  const pct = Math.round((totalIndexedCount / PET_POOL.length) * 100);

  const lines = slice.map((pet, idx) => {
    const globalNum = String(start + idx + 1).padStart(2, "0");
    const key = pet.id || pet.name.toLowerCase();
    const ownedCount = ownedCounts.get(key) || 0;
    const isIndexed = dexSet.has(key);

    let statusText;
    if (ownedCount > 0) {
      statusText = `✅ **Indexed** *(x${ownedCount} in bag)*`;
    } else if (isIndexed) {
      statusText = `📘 **Indexed** *(sold/fused)*`;
    } else {
      statusText = `❓ *Not indexed*`;
    }

    return `\`#${globalNum}\` ${pet.emoji} **${pet.name}** (\`${pet.rarity}\`) • ${formatDon(pet.value)} DON • ${statusText}`;
  });

  return {
    page: safePage,
    totalPages,
    embed: new EmbedBuilder()
      .setTitle(`📖 ${user.username}'s Permanent Pet Index`)
      .setColor(0x9b59b6)
      .setDescription(
        `Discovered: **${totalIndexedCount}/${PET_POOL.length}** (**${pct}%**) • *Stays indexed forever even after selling!*\n` +
        `Fun Rate: \`1 DON = ${FUN_ROBUX_PER_DON} R$\` (just for fun)\n\n` +
        lines.join("\n")
      )
      .setFooter({ text: `Page ${safePage}/${totalPages} • Use buttons below or ?index <page>` })
      .setTimestamp()
  };
}

function buildShopComponents() {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_basic").setLabel(`🪵 Basic (${CRATE_TYPES.basic.cost})`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("open_crate_epic").setLabel(`✨ Epic (${CRATE_TYPES.epic.cost})`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_mythic").setLabel(`🌌 Mythic (${CRATE_TYPES.mythic.cost})`).setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_legendary").setLabel(`⚡ Legendary (${CRATE_TYPES.legendary.cost})`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_godly").setLabel(`👑 Godly (${CRATE_TYPES.godly.cost})`).setStyle(ButtonStyle.Danger)
  );

  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("gacha_quick_fuse").setLabel("⚗️ Fuse 3 Dupes").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("gacha_quick_flip").setLabel("🎲 Coin Flip (10 DON)").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("gacha_sell_unlocked").setLabel("💸 Sell Unlocked").setStyle(ButtonStyle.Danger)
  );

  return [row1, row2, row3];
}

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  const userId = message.author.id;
  if (!data.economy[userId]) {
    data.economy[userId] = { balance: 0, coins: 0, lastDaily: 0, gachaPity: 0 };
  }
  if (typeof data.economy[userId].gachaPity !== "number") {
    data.economy[userId].gachaPity = 0;
  }

  // Sync any pre-existing owned pets into the permanent dex
  const { changed: dexSynced } = ensureAndSyncDex(data, userId);
  if (dexSynced) saveData();

  const invokedCmd = message.content.startsWith(prefix)
    ? message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase()
    : "";

  const firstArg = args[0]?.toLowerCase();
  const secondArg = args[1];

  // =========================================================================
  // 0. PERMANENT PET INDEX (?index [page], ?dex [page], ?pokedex [page])
  // =========================================================================
  const isIndexCmd =
    invokedCmd === "index" ||
    invokedCmd === "dex" ||
    invokedCmd === "pokedex" ||
    firstArg === "index" ||
    firstArg === "dex" ||
    firstArg === "pokedex";

  if (isIndexCmd) {
    const pageArg =
      firstArg === "index" || firstArg === "dex" || firstArg === "pokedex"
        ? parseInt(secondArg, 10)
        : parseInt(firstArg, 10);
    const startPage = Number.isNaN(pageArg) ? 1 : pageArg;

    let { page: currentPage, totalPages, embed } = buildIndexEmbed(message.author, data, userId, startPage);

    const indexMsg = await message.reply({
      embeds: [embed],
      components: [buildIndexRow(currentPage, totalPages)]
    });

    const dexCollector = indexMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 120000
    });

    dexCollector.on("collect", async (interaction) => {
      if (interaction.customId === "dex_prev_page") {
        currentPage = Math.max(1, currentPage - 1);
      } else if (interaction.customId === "dex_next_page") {
        currentPage = Math.min(totalPages, currentPage + 1);
      } else {
        return;
      }

      const freshData = getGuildData(interaction.guild.id);
      const { changed } = ensureAndSyncDex(freshData, userId);
      if (changed) saveData();

      const built = buildIndexEmbed(message.author, freshData, userId, currentPage);
      currentPage = built.page;
      totalPages = built.totalPages;

      await interaction.update({
        embeds: [built.embed],
        components: [buildIndexRow(currentPage, totalPages)]
      });
    });

    dexCollector.on("end", () => {
      indexMsg.edit({ components: [] }).catch(() => null);
    });

    return indexMsg;
  }

  // =========================================================================
  // 1. LOCK / FAVORITE PET (?lock [num] or ?unlock [num])
  // =========================================================================
  if (invokedCmd === "lock" || invokedCmd === "unlock" || firstArg === "lock" || firstArg === "unlock") {
    const numArg = firstArg === "lock" || firstArg === "unlock" ? secondArg : firstArg;
    const petIndex = parseInt(numArg, 10) - 1;
    const userPets = data.pets[userId] || [];

    if (isNaN(petIndex) || petIndex < 0 || petIndex >= userPets.length) {
      return message.reply(`❌ Usage: \`${prefix}lock [pet number]\` (protects a pet from \`${prefix}sellall\` and fusion)`);
    }

    const target = userPets[petIndex];
    target.locked = invokedCmd === "unlock" || firstArg === "unlock" ? false : !target.locked;
    saveData();

    return message.reply(
      target.locked
        ? `🔒 Locked ${target.emoji} **${getPetDisplayName(target)}**! It won't be sold by \`${prefix}sellall\` or fused.`
        : `🔓 Unlocked ${target.emoji} **${getPetDisplayName(target)}**.`
    );
  }

  // =========================================================================
  // 2. FUSE 3 DUPLICATE PETS (?fuse or ?crates fuse)
  // =========================================================================
  if (invokedCmd === "fuse" || invokedCmd === "upgrade" || firstArg === "fuse" || firstArg === "upgrade") {
    const userPets = data.pets[userId] || [];
    const result = executeFusion(userPets);

    if (!result) {
      return message.reply(
        `⚗️ You need **3 unlocked duplicate pets** (below Godly tier) to fuse into a higher-tier pet! Open more crates with \`${prefix}crates\`.`
      );
    }

    const { consumedName, fusedPet } = result;
    const isNewEntry = markPetIndexed(data, userId, fusedPet);
    saveData();

    const badge = RARITY_BADGE[fusedPet.rarity] || `\`${fusedPet.rarity}\``;
    const newDexNote = isNewEntry ? `\n📖 **NEW INDEX ENTRY UNLOCKED!**` : "";

    return message.reply(
      `⚗️ **FUSION SUCCESS!** Combined **3x ${consumedName}** into:\n` +
      `✨ ${fusedPet.emoji} **${getPetDisplayName(fusedPet)}** (${badge}) • Value: **${formatDon(fusedPet.value)} DON** *(~${toFunRobux(fusedPet.value)} R$ fun rate)*!` +
      newDexNote
    );
  }

  // =========================================================================
  // 3. DOUBLE-OR-NOTHING COIN FLIP (?gamble [amount] or ?flip [amount])
  // =========================================================================
  if (invokedCmd === "gamble" || invokedCmd === "flip" || firstArg === "gamble" || firstArg === "flip") {
    const amtArg = firstArg === "gamble" || firstArg === "flip" ? secondArg : firstArg;
    const currentBal = Number(data.economy[userId].balance) || 0;
    const bet = amtArg === "all" ? Math.min(currentBal, 500) : Number(amtArg);

    if (!Number.isFinite(bet) || bet < 1 || bet > 500) {
      return message.reply(`🎲 Usage: \`${prefix}gamble [1 - 500]\` (45% chance to 2x your DON bet!)`);
    }
    if (currentBal < bet) {
      return message.reply(`❌ You only have **${formatDon(currentBal)} DON**!`);
    }

    const won = Math.random() < 0.45;
    if (won) {
      data.economy[userId].balance = Number((currentBal + bet).toFixed(2));
      saveData();
      return message.reply(
        `🎲 **HEADS — YOU WON!** Doubled your bet and gained **+${formatDon(bet)} DON**!\n` +
        `💳 New Balance: \`${formatDon(data.economy[userId].balance)} DON\``
      );
    } else {
      data.economy[userId].balance = Number((currentBal - bet).toFixed(2));
      saveData();
      return message.reply(
        `💀 **TAILS — YOU LOST!** Lost **-${formatDon(bet)} DON**.\n` +
        `💳 New Balance: \`${formatDon(data.economy[userId].balance)} DON\``
      );
    }
  }

  // =========================================================================
  // 4. SELL ALL UNLOCKED PETS INSTANTLY (?sellall, ?sell-all, or ?crates sellall)
  // =========================================================================
  const isSellAllCommand =
    invokedCmd === "sellall" ||
    invokedCmd === "sell-all" ||
    invokedCmd === "sellpetsall" ||
    firstArg === "sellall" ||
    firstArg === "sell-all";

  if (isSellAllCommand) {
    const freshData = getGuildData(message.guild.id);
    if (!freshData.economy) freshData.economy = {};
    if (!freshData.pets) freshData.pets = {};
    if (!freshData.economy[userId]) {
      freshData.economy[userId] = { balance: 0, coins: 0, lastDaily: 0, gachaPity: 0 };
    }

    ensureAndSyncDex(freshData, userId);

    const userPets = Array.isArray(freshData.pets[userId]) ? freshData.pets[userId] : [];
    if (userPets.length === 0) {
      return message.reply(`🎒 You don't have any pets to sell! Open crates with \`${prefix}crates\`.`);
    }

    const toSell = userPets.filter((p) => !p?.locked);
    const keptLocked = userPets.filter((p) => p?.locked);

    if (toSell.length === 0) {
      return message.reply(`🔒 All of your pets are locked! Use \`${prefix}unlock [number]\` or \`${prefix}sell [number]\`.`);
    }

    const totalDonEarned = Number(
      toSell.reduce((sum, p) => sum + (Number(p?.value) || 0.5), 0).toFixed(2)
    );

    freshData.pets[userId] = keptLocked;
    freshData.economy[userId].balance = Number(
      ((Number(freshData.economy[userId].balance) || 0) + totalDonEarned).toFixed(2)
    );
    saveData();

    return message.reply(
      `💸 Sold **${toSell.length}** pet(s) for **${formatDon(totalDonEarned)} DON** *(~${toFunRobux(totalDonEarned)} R$ fun rate)*! *(Your \`${prefix}index\` progress stays saved!)*` +
      (keptLocked.length > 0 ? `\n🔒 Kept **${keptLocked.length}** locked pet(s) safe.` : "") +
      `\n💳 New Wallet Balance: \`${formatDon(freshData.economy[userId].balance)} DON\``
    );
  }

  // =========================================================================
  // 5. SELL SINGLE PET (?sell [number] or ?crates sell [number])
  // =========================================================================
  const isSellCommand =
    invokedCmd === "sell" ||
    invokedCmd === "sellpet" ||
    firstArg === "sell" ||
    firstArg === "sellpet";

  if (isSellCommand) {
    const indexArg = firstArg === "sell" || firstArg === "sellpet" ? secondArg : firstArg;
    const petIndex = parseInt(indexArg, 10) - 1;
    const userPets = data.pets[userId] || [];

    if (isNaN(petIndex) || petIndex < 0 || petIndex >= userPets.length) {
      return message.reply(
        `❌ Usage: \`${prefix}sell [pet number]\` or \`${prefix}sellall\` (Check numbers with \`${prefix}pets\`)`
      );
    }

    ensureAndSyncDex(data, userId);

    const [soldPet] = userPets.splice(petIndex, 1);
    const donEarned = Number(soldPet.value) || 0.5;

    data.economy[userId].balance = Number(((data.economy[userId].balance || 0) + donEarned).toFixed(2));
    saveData();

    return message.reply(
      `💰 Sold ${soldPet.emoji || "🐾"} **${getPetDisplayName(soldPet)}** (\`${soldPet.rarity}\`) for **${formatDon(donEarned)} DON** *(~${toFunRobux(donEarned)} R$ fun rate)*!\n` +
      `💳 New Wallet Balance: \`${formatDon(data.economy[userId].balance)} DON\``
    );
  }

  // =========================================================================
  // 6. VIEW INVENTORY (?pets, ?inventory, ?inv)
  // =========================================================================
  const isInventoryCmd =
    invokedCmd === "pets" ||
    invokedCmd === "inventory" ||
    invokedCmd === "inv" ||
    firstArg === "pets" ||
    firstArg === "inventory" ||
    firstArg === "inv";

  if (isInventoryCmd) {
    const userPets = data.pets[userId] || [];
    if (userPets.length === 0) {
      return message.reply(
        `🎒 Your pet inventory is empty! Use \`${prefix}crates\` to spin for pets or \`${prefix}index\` to see your discovered pets.`
      );
    }

    const indexMap = getPetIndexMap();
    const inventoryList = userPets
      .slice(0, 15)
      .map((p, idx) => {
        const key = p.id || p.name.toLowerCase();
        const dexEntry = indexMap.get(key);
        const dexTag = dexEntry ? `#${String(dexEntry.index).padStart(2, "0")}` : "#??";
        const lockIcon = p.locked ? "🔒 " : "";
        return `**#${idx + 1}** \`${dexTag}\` ${lockIcon}${p.emoji} **${getPetDisplayName(p)}** (\`${p.rarity}\`) • ${formatDon(p.value)} DON`;
      })
      .join("\n");

    const totalWorth = userPets.reduce((sum, p) => sum + (Number(p?.value) || 0), 0);

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Pet Collection`)
      .setColor(0x5865f2)
      .setDescription(inventoryList)
      .setFooter({
        text: `Pets: ${userPets.length} • Worth: ${formatDon(totalWorth)} DON • ${prefix}lock [num] • ${prefix}fuse • ${prefix}sellall`
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // =========================================================================
  // 7. ALL-IN-ONE GACHA ARCADE HUB (?crates)
  // =========================================================================
  const userBalance = Number(data.economy[userId].balance) || 0;
  const pityNow = Number(data.economy[userId].gachaPity) || 0;
  const { dexSet } = ensureAndSyncDex(data, userId);
  let sessionPulls = 0;

  const embed = new EmbedBuilder()
    .setTitle("🎰 Pet Gacha Arcade — Crates, Mutations, Fusion & Flip")
    .setColor(0x5865f2)
    .setDescription(
      `Spin crates for rare pets + ultra-rare **Shiny / Shadow / Golden / Rainbow** mutations!\n` +
      `💳 **Balance:** \`${formatDon(userBalance)} DON\` *(~${toFunRobux(userBalance)} R$ fun rate)* • 🎯 **Pity:** \`${pityNow}/${PITY_THRESHOLD}\` • 📖 **Dex:** \`${dexSet.size}/${PET_POOL.length}\`\n` +
      `Commands: \`${prefix}pets\` • \`${prefix}fuse\` • \`${prefix}gamble [amt]\` • \`${prefix}lock [num]\` • \`${prefix}sellall\` • \`${prefix}index\``
    )
    .addFields(
      { name: "🪵 Basic", value: `**${CRATE_TYPES.basic.cost} DON**\n${CRATE_TYPES.basic.desc}`, inline: true },
      { name: "✨ Epic", value: `**${CRATE_TYPES.epic.cost} DON**\n${CRATE_TYPES.epic.desc}`, inline: true },
      { name: "🌌 Mythic", value: `**${CRATE_TYPES.mythic.cost} DON**\n${CRATE_TYPES.mythic.desc}`, inline: true },
      { name: "⚡ Legendary", value: `**${CRATE_TYPES.legendary.cost} DON**\n${CRATE_TYPES.legendary.desc}`, inline: true },
      { name: "👑 Godly", value: `**${CRATE_TYPES.godly.cost} DON**\n${CRATE_TYPES.godly.desc}`, inline: true },
      { name: "✨ Mutations", value: "Shiny `1.6x` • Shadow `2.2x`\nGolden `3.0x` • Rainbow `5.0x`", inline: true }
    )
    .setFooter({ text: "Click any button below to spin, fuse 3 dupes, coin flip, or cash out!" });

  const components = buildShopComponents();
  const shopMsg = await message.reply({ embeds: [embed], components });

  const collector = shopMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 120000
  });

  collector.on("collect", async (interaction) => {
    const currentData = getGuildData(interaction.guild.id);
    if (!currentData.economy) currentData.economy = {};
    if (!currentData.pets) currentData.pets = {};
    if (!currentData.economy[userId]) {
      currentData.economy[userId] = { balance: 0, coins: 0, lastDaily: 0, gachaPity: 0 };
    }
    if (!Array.isArray(currentData.pets[userId])) {
      currentData.pets[userId] = [];
    }

    ensureAndSyncDex(currentData, userId);

    const userEco = currentData.economy[userId];
    const currentBalance = Number(userEco.balance) || 0;

    // --- Quick Action 1: Fuse 3 Duplicate Pets ---
    if (interaction.customId === "gacha_quick_fuse") {
      const fusion = executeFusion(currentData.pets[userId]);
      if (!fusion) {
        return interaction.reply({
          content: "⚗️ Need **3 unlocked duplicate pets** (below Godly) to fuse! Keep spinning to collect dupes.",
          ephemeral: true
        });
      }
      const { consumedName, fusedPet } = fusion;
      const isNewEntry = markPetIndexed(currentData, userId, fusedPet);
      saveData();

      const badge = RARITY_BADGE[fusedPet.rarity] || `\`${fusedPet.rarity}\``;
      const newDexNote = isNewEntry ? `\n📖 **NEW INDEX ENTRY UNLOCKED!** (${currentData.petDex[userId].length}/${PET_POOL.length})` : "";

      const fuseEmbed = new EmbedBuilder()
        .setTitle("⚗️ Pet Fusion Complete!")
        .setColor(0x9b59b6)
        .setDescription(
          `Merged **3x ${consumedName}** into a stronger tier:\n\n` +
          `${fusedPet.emoji} **${getPetDisplayName(fusedPet)}**\n` +
          `• **Rarity:** ${badge}\n` +
          `• **Sell Value:** \`${formatDon(fusedPet.value)} DON\` *(~${toFunRobux(fusedPet.value)} R$ fun rate)*\n` +
          `• **Balance:** \`${formatDon(userEco.balance)} DON\`` +
          newDexNote
        )
        .setFooter({ text: `${prefix}pets to inspect or ${prefix}lock [num] to protect your pull!` })
        .setTimestamp();

      return interaction.update({ embeds: [fuseEmbed], components });
    }

    // --- Quick Action 2: 10 DON Double-or-Nothing Flip ---
    if (interaction.customId === "gacha_quick_flip") {
      const bet = 10;
      if (currentBalance < bet) {
        return interaction.reply({
          content: `❌ You need at least **${bet} DON** to coin flip (Balance: **${formatDon(currentBalance)} DON**).`,
          ephemeral: true
        });
      }
      const won = Math.random() < 0.45;
      userEco.balance = Number((won ? currentBalance + bet : currentBalance - bet).toFixed(2));
      saveData();

      const flipEmbed = new EmbedBuilder()
        .setTitle(won ? "🎲 Coin Flip — HEADS (YOU WON!)" : "💀 Coin Flip — TAILS (LOST!)")
        .setColor(won ? 0x2ecc71 : 0xe74c3c)
        .setDescription(
          (won
            ? `🔥 Doubled your **${bet} DON** wager (**+${bet} DON**)!`
            : `💨 Lost your **${bet} DON** wager (**-${bet} DON**).`) +
          `\n💳 **New Balance:** \`${formatDon(userEco.balance)} DON\``
        )
        .setFooter({ text: `Or use ${prefix}gamble [1-500] for custom bets!` })
        .setTimestamp();

      return interaction.update({ embeds: [flipEmbed], components });
    }

    // --- Quick Action 3: Sell All Unlocked Pets ---
    if (interaction.customId === "gacha_sell_unlocked") {
      const pets = currentData.pets[userId];
      const toSell = pets.filter((p) => !p?.locked);
      const kept = pets.filter((p) => p?.locked);

      if (toSell.length === 0) {
        return interaction.reply({
          content: "🎒 No unlocked pets to sell right now!",
          ephemeral: true
        });
      }

      const earned = Number(toSell.reduce((sum, p) => sum + (Number(p?.value) || 0.5), 0).toFixed(2));
      currentData.pets[userId] = kept;
      userEco.balance = Number((currentBalance + earned).toFixed(2));
      saveData();

      const sellEmbed = new EmbedBuilder()
        .setTitle("💸 Instant Cash-Out Complete!")
        .setColor(0x2ecc71)
        .setDescription(
          `Sold **${toSell.length}** unlocked pet(s) for **+${formatDon(earned)} DON** *(~${toFunRobux(earned)} R$ fun rate)*!\n` +
          `📖 Your \`${prefix}index\` discoveries remain saved permanently.\n` +
          (kept.length > 0 ? `🔒 Kept **${kept.length}** locked pet(s) safe.\n` : "") +
          `💳 **New Balance:** \`${formatDon(userEco.balance)} DON\``
        )
        .setFooter({ text: "Ready to spin again below!" })
        .setTimestamp();

      return interaction.update({ embeds: [sellEmbed], components });
    }

    // --- Crate Spin ---
    const crateKey = interaction.customId.replace("open_crate_", "");
    const crate = CRATE_TYPES[crateKey];
    if (!crate) return;

    if (currentBalance < crate.cost) {
      return interaction.reply({
        content: `❌ Need **${crate.cost} DON** for ${crate.name}, you have **${formatDon(currentBalance)} DON**.`,
        ephemeral: true
      });
    }

    userEco.balance = Number((currentBalance - crate.cost).toFixed(2));
    const prevPity = Number(userEco.gachaPity) || 0;
    const { pet: wonPet, rarityOddsPct, triggeredPity } = rollPetWithOdds(crateKey, prevPity);
    sessionPulls += 1;

    const hitGoodRarity =
      crateKey === "basic"
        ? wonPet.rarity !== "Common"
        : ["Epic", "Mythic", "Legendary", "Godly"].includes(wonPet.rarity);

    userEco.gachaPity = hitGoodRarity ? 0 : prevPity + 1;

    currentData.pets[userId].push(wonPet);
    const isNewDiscovery = markPetIndexed(currentData, userId, wonPet);
    saveData();

    const badge = RARITY_BADGE[wonPet.rarity] || `\`${wonPet.rarity}\``;
    const hypeLine = getHypeLine(wonPet, triggeredPity);
    const mutationLine = wonPet.mutationTag ? `\n• **Mutation:** ${wonPet.mutationTag}` : "";
    const newDexLine = isNewDiscovery
      ? `\n• **Index:** 🆕 **NEW DISCOVERY!** (\`${currentData.petDex[userId].length}/${PET_POOL.length}\`)`
      : `\n• **Index:** ✅ Already indexed (\`${currentData.petDex[userId].length}/${PET_POOL.length}\`)`;

    const resultEmbed = new EmbedBuilder()
      .setTitle(`🎰 ${crate.name} — Spin #${sessionPulls}`)
      .setColor(wonPet.mutation === "Rainbow" || wonPet.rarity === "Godly" ? 0xff0055 : crate.color)
      .setDescription(
        `${hypeLine}\n\n` +
        `${wonPet.emoji} **${getPetDisplayName(wonPet)}**\n` +
        `• **Rarity:** ${badge} *(~${rarityOddsPct}% in this crate)*` +
        mutationLine +
        `\n• **Sell Value:** \`${formatDon(wonPet.value)} DON\` *(~${toFunRobux(wonPet.value)} R$ fun rate)*` +
        newDexLine +
        `\n• **Balance:** \`${formatDon(userEco.balance)} DON\` • **Pity:** \`${userEco.gachaPity}/${PITY_THRESHOLD}\``
      )
      .setFooter({ text: `${prefix}pets • ${prefix}lock [num] • ${prefix}fuse • ${prefix}sellall` })
      .setTimestamp();

    await interaction.update({ embeds: [resultEmbed], components });
  });

  collector.on("end", () => {
    shopMsg.edit({ components: [] }).catch(() => null);
  });
}

module.exports = {
  execute
};
