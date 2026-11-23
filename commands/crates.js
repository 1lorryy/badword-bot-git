const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

// Fun / fake exchange reference only (very low rate so high pet values don't blow up)
// Example: 20 DON = 1 fun Robux (0.05 per DON)
const FUN_ROBUX_PER_DON = 0.05;
const INDEX_PER_PAGE = 15;

const CRATE_TYPES = {
  basic: { name: "🪵 Basic Crate", cost: 4, color: 0x8b5a2b, desc: "Cheap starter crate with common & rare pets." },
  epic: { name: "✨ Epic Crate", cost: 18, color: 0x9b59b6, desc: "Better odds for rare & epic pets." },
  mythic: { name: "🌌 Mythic Crate", cost: 65, color: 0xf1c40f, desc: "Mid-high crate for epic & mythic pets." },
  legendary: { name: "⚡ Legendary Crate", cost: 200, color: 0xe67e22, desc: "High-tier crate for mythic & legendary pets." },
  godly: { name: "👑 Godly Crate", cost: 550, color: 0xe74c3c, desc: "Top crate with a shot at ultra-rare godlies." }
};

const PET_POOL = [
  // --- Basic Tier ---
  { id: "slime", name: "Slime", rarity: "Common", emoji: "🟢", tier: "basic", weight: 65, value: 0.5 },
  { id: "bunny", name: "Bunny", rarity: "Common", emoji: "🐰", tier: "basic", weight: 55, value: 1 },
  { id: "cat", name: "Cat", rarity: "Common", emoji: "🐱", tier: "basic", weight: 50, value: 1.5 },
  { id: "dog", name: "Dog", rarity: "Common", emoji: "🐶", tier: "basic", weight: 50, value: 1.5 },
  { id: "hamster", name: "Hamster", rarity: "Common", emoji: "🐹", tier: "basic", weight: 45, value: 2 },
  { id: "fox", name: "Fox", rarity: "Rare", emoji: "🦊", tier: "basic", weight: 25, value: 4 },
  { id: "panda", name: "Panda", rarity: "Rare", emoji: "🐼", tier: "basic", weight: 20, value: 5 },
  { id: "snow_owl", name: "Snow Owl", rarity: "Rare", emoji: "🦉", tier: "basic", weight: 15, value: 7 },
  { id: "hedgehog", name: "Hedgehog", rarity: "Rare", emoji: "🦔", tier: "basic", weight: 12, value: 8 },

  // --- Epic Tier ---
  { id: "frost_wolf", name: "Frost Wolf", rarity: "Epic", emoji: "🐺", tier: "epic", weight: 42, value: 12 },
  { id: "phoenix", name: "Phoenix", rarity: "Epic", emoji: "🔥", tier: "epic", weight: 36, value: 16 },
  { id: "griffin", name: "Griffin", rarity: "Epic", emoji: "🦅", tier: "epic", weight: 30, value: 20 },
  { id: "thunder_eagle", name: "Thunder Eagle", rarity: "Epic", emoji: "⚡", tier: "epic", weight: 22, value: 28 },
  { id: "demon_bat", name: "Demon Bat", rarity: "Epic", emoji: "🦇", tier: "epic", weight: 18, value: 35 },
  { id: "venom_viper", name: "Venom Viper", rarity: "Epic", emoji: "🐍", tier: "epic", weight: 14, value: 42 },

  // --- Mythic Tier ---
  { id: "unicorn", name: "Unicorn", rarity: "Legendary", emoji: "🦄", tier: "mythic", weight: 32, value: 55 },
  { id: "shadow_dragon", name: "Shadow Dragon", rarity: "Legendary", emoji: "🐉", tier: "mythic", weight: 25, value: 70 },
  { id: "golden_tiger", name: "Golden Tiger", rarity: "Mythic", emoji: "🐅", tier: "mythic", weight: 16, value: 110 },
  { id: "cyber_mecha_titan", name: "Cyber Mecha Titan", rarity: "Mythic", emoji: "🤖", tier: "mythic", weight: 11, value: 160 },
  { id: "cosmic_nebula_beast", name: "Cosmic Nebula Beast", rarity: "Mythic", emoji: "🌌", tier: "mythic", weight: 7, value: 240 },
  { id: "starlight_lynx", name: "Starlight Lynx", rarity: "Mythic", emoji: "🐈‍⬛", tier: "mythic", weight: 5, value: 300 },

  // --- Legendary Tier ---
  { id: "crystal_phoenix", name: "Crystal Phoenix", rarity: "Legendary", emoji: "💎", tier: "legendary", weight: 25, value: 420 },
  { id: "celestial_kitsune", name: "Celestial Kitsune", rarity: "Legendary", emoji: "🦊", tier: "legendary", weight: 16, value: 600 },
  { id: "void_overlord", name: "Void Overlord", rarity: "Legendary", emoji: "🕳️", tier: "legendary", weight: 10, value: 850 },
  { id: "astral_titan", name: "Astral Titan", rarity: "Legendary", emoji: "✨", tier: "legendary", weight: 6, value: 1200 },
  { id: "chrono_wyvern", name: "Chrono Wyvern", rarity: "Legendary", emoji: "🐲", tier: "legendary", weight: 3, value: 1600 },

  // --- Godly Tier ---
  { id: "infinite_godly_dominus", name: "Infinite Godly Dominus", rarity: "Godly", emoji: "👑", tier: "godly", weight: 12, value: 2400 },
  { id: "eternal_galaxy_dragon", name: "Eternal Galaxy Dragon", rarity: "Godly", emoji: "🪐", tier: "godly", weight: 6, value: 3800 },
  { id: "supreme_celestial_apex", name: "Supreme Celestial Apex", rarity: "Godly", emoji: "🌟", tier: "godly", weight: 2, value: 6000 }
];

function formatDon(amount) {
  const num = Number(amount) || 0;
  return Number.isInteger(num) ? `${num}` : num.toFixed(2);
}

function toFunRobux(donAmount) {
  const val = (Number(donAmount) || 0) * FUN_ROBUX_PER_DON;
  return val.toFixed(2);
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
    const key = p.id || p.name.toLowerCase();
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function rollPet(crateType) {
  const filtered = PET_POOL.filter((p) => {
    if (crateType === "basic") return p.tier === "basic";
    if (crateType === "epic") return p.tier === "basic" || p.tier === "epic";
    if (crateType === "mythic") return p.tier === "epic" || p.tier === "mythic";
    if (crateType === "legendary") return p.tier === "mythic" || p.tier === "legendary";
    return true; // godly
  });

  const totalWeight = filtered.reduce((sum, p) => sum + p.weight, 0);
  let randomNum = Math.random() * totalWeight;

  for (const pet of filtered) {
    if (randomNum < pet.weight) return { ...pet };
    randomNum -= pet.weight;
  }
  return { ...filtered[0] };
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

function buildIndexEmbed(user, userPets, page = 1) {
  const totalPages = getTotalIndexPages();
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * INDEX_PER_PAGE;
  const slice = PET_POOL.slice(start, start + INDEX_PER_PAGE);

  const ownedCounts = getOwnedCounts(userPets);
  let totalUniqueOwned = 0;
  for (const pet of PET_POOL) {
    const key = pet.id || pet.name.toLowerCase();
    if ((ownedCounts.get(key) || 0) > 0) totalUniqueOwned += 1;
  }

  const lines = slice.map((pet, idx) => {
    const globalNum = String(start + idx + 1).padStart(2, "0");
    const key = pet.id || pet.name.toLowerCase();
    const count = ownedCounts.get(key) || 0;
    const statusText = count > 0 ? `**x${count} owned**` : "*not owned*";
    return `\`#${globalNum}\` ${pet.emoji} **${pet.name}** (\`${pet.rarity}\`) • ${formatDon(pet.value)} DON • ${statusText}`;
  });

  return {
    page: safePage,
    totalPages,
    embed: new EmbedBuilder()
      .setTitle(`📖 ${user.username}'s Pet Index`)
      .setColor(0x9b59b6)
      .setDescription(
        `Unlocked: **${totalUniqueOwned}/${PET_POOL.length}** pets • Fun Rate: \`1 DON = ${FUN_ROBUX_PER_DON} R$\` (just for fun)\n\n` +
        lines.join("\n")
      )
      .setFooter({ text: `Page ${safePage}/${totalPages} • Use buttons below or ?index <page>` })
      .setTimestamp()
  };
}

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  const userId = message.author.id;
  if (!data.economy[userId]) {
    data.economy[userId] = { balance: 0, coins: 0, lastDaily: 0 };
  }

  const invokedCmd = message.content.startsWith(prefix)
    ? message.content.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase()
    : "";

  const firstArg = args[0]?.toLowerCase();
  const secondArg = args[1];

  // 0. OWO-STYLE PET INDEX (?index [page], ?dex [page], ?pokedex [page], or ?crates index [page])
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
    const userPets = data.pets[userId] || [];
    let { page: currentPage, totalPages, embed } = buildIndexEmbed(message.author, userPets, startPage);

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
      const latestPets = freshData.pets?.[userId] || [];
      const built = buildIndexEmbed(message.author, latestPets, currentPage);
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

  // 1. SELL PET COMMAND (?sell [number] or ?crates sell [number])
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
        `❌ Usage: \`${prefix}sell [pet number]\` (Check your pet numbers using \`${prefix}pets\` or \`${prefix}inventory\`)`
      );
    }

    const [soldPet] = userPets.splice(petIndex, 1);
    const donEarned = Number(soldPet.value) || 0.5;

    data.economy[userId].balance = Number(((data.economy[userId].balance || 0) + donEarned).toFixed(2));
    saveData();

    return message.reply(
      `💰 Sold ${soldPet.emoji || "🐾"} **${soldPet.name}** (\`${soldPet.rarity}\`) for **${formatDon(donEarned)} DON** *(~${toFunRobux(donEarned)} R$ fun rate)*!\n` +
      `💳 New Wallet Balance: \`${formatDon(data.economy[userId].balance)} DON\``
    );
  }

  // 2. VIEW INVENTORY (?pets, ?inventory, ?inv, or ?crates pets/inventory)
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
        `🎒 Your pet inventory is empty! Use \`${prefix}crates\` to open crates or \`${prefix}index\` to see all pets (**not owned**).`
      );
    }

    const indexMap = getPetIndexMap();
    const inventoryList = userPets
      .slice(0, 15)
      .map((p, idx) => {
        const key = p.id || p.name.toLowerCase();
        const dexEntry = indexMap.get(key);
        const dexTag = dexEntry ? `#${String(dexEntry.index).padStart(2, "0")}` : "#??";
        return `**#${idx + 1}** \`${dexTag}\` ${p.emoji} **${p.name}** (\`${p.rarity}\`) • ${formatDon(p.value)} DON • \`${prefix}sell ${idx + 1}\``;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Pet Collection`)
      .setColor(0x5865f2)
      .setDescription(inventoryList)
      .setFooter({
        text: `Total Pets: ${userPets.length} • ${prefix}sell [num] to sell • ${prefix}index to view dex`
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // 3. OPEN CRATE SHOP MAIN MENU (?crates)
  const userBalance = Number(data.economy[userId].balance) || 0;

  const embed = new EmbedBuilder()
    .setTitle("📦 Pet Crate Marketplace & Gacha")
    .setColor(0x5865f2)
    .setDescription(
      `Chat in the server to earn DON, spin crates, and collect pets.\n` +
      `💳 **Your Balance:** \`${formatDon(userBalance)} DON\` *(~${toFunRobux(userBalance)} R$ — fake/fun rate only)*\n` +
      `📖 Check collection progress anytime with \`${prefix}index\` and your pets with \`${prefix}pets\`.`
    )
    .addFields(
      { name: "🪵 Basic", value: `Cost: **${CRATE_TYPES.basic.cost} DON**\n${CRATE_TYPES.basic.desc}`, inline: true },
      { name: "✨ Epic", value: `Cost: **${CRATE_TYPES.epic.cost} DON**\n${CRATE_TYPES.epic.desc}`, inline: true },
      { name: "🌌 Mythic", value: `Cost: **${CRATE_TYPES.mythic.cost} DON**\n${CRATE_TYPES.mythic.desc}`, inline: true },
      { name: "⚡ Legendary", value: `Cost: **${CRATE_TYPES.legendary.cost} DON**\n${CRATE_TYPES.legendary.desc}`, inline: true },
      { name: "👑 Godly", value: `Cost: **${CRATE_TYPES.godly.cost} DON**\n${CRATE_TYPES.godly.desc}`, inline: true }
    )
    .setFooter({ text: "Click a button below to open a crate!" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_basic").setLabel(`🪵 Basic (${CRATE_TYPES.basic.cost})`).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("open_crate_epic").setLabel(`✨ Epic (${CRATE_TYPES.epic.cost})`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_mythic").setLabel(`🌌 Mythic (${CRATE_TYPES.mythic.cost})`).setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_legendary").setLabel(`⚡ Legendary (${CRATE_TYPES.legendary.cost})`).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_godly").setLabel(`👑 Godly (${CRATE_TYPES.godly.cost})`).setStyle(ButtonStyle.Danger)
  );

  const shopMsg = await message.reply({ embeds: [embed], components: [row1, row2] });

  const collector = shopMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000
  });

  collector.on("collect", async (interaction) => {
    const crateKey = interaction.customId.replace("open_crate_", "");
    const crate = CRATE_TYPES[crateKey];
    if (!crate) return;

    const currentData = getGuildData(interaction.guild.id);
    if (!currentData.economy) currentData.economy = {};
    if (!currentData.pets) currentData.pets = {};
    if (!currentData.economy[userId]) {
      currentData.economy[userId] = { balance: 0, coins: 0, lastDaily: 0 };
    }

    const userEco = currentData.economy[userId];
    const currentBalance = Number(userEco.balance) || 0;

    if (currentBalance < crate.cost) {
      return interaction.reply({
        content: `❌ You need **${crate.cost} DON** to open this crate, but you only have **${formatDon(currentBalance)} DON**!`,
        ephemeral: true
      });
    }

    userEco.balance = Number((currentBalance - crate.cost).toFixed(2));
    const wonPet = rollPet(crateKey);

    if (!currentData.pets[userId]) currentData.pets[userId] = [];
    currentData.pets[userId].push(wonPet);
    saveData();

    const indexMap = getPetIndexMap();
    const dexNum = indexMap.get(wonPet.id)?.index;
    const dexLabel = dexNum ? `\`#${String(dexNum).padStart(2, "0")}\`` : "";

    const resultEmbed = new EmbedBuilder()
      .setTitle(`🎉 Crate Opened: ${crate.name}!`)
      .setColor(crate.color)
      .setDescription(
        `✨ **You hatched:** ${dexLabel} ${wonPet.emoji} **${wonPet.name}**!\n` +
        `📊 **Rarity:** \`${wonPet.rarity}\`\n` +
        `💰 **Pet Value:** \`${formatDon(wonPet.value)} DON\` *(~${toFunRobux(wonPet.value)} R$ fun rate)*\n\n` +
        `*(New Balance: ${formatDon(userEco.balance)} DON)*`
      )
      .setFooter({ text: `${prefix}pets for inventory • ${prefix}index for dex • ${prefix}sell [num] to sell` })
      .setTimestamp();

    await interaction.update({ embeds: [resultEmbed], components: [row1, row2] });
  });

  collector.on("end", () => {
    shopMsg.edit({ components: [] }).catch(() => null);
  });
}

module.exports = {
  execute
};
