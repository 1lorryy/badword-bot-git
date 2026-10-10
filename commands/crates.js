const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const CRATE_TYPES = {
  basic: { name: "🪵 Basic Crate", cost: 5, color: 0x8b5a2b, desc: "Affordable crate with common and rare pets." },
  epic: { name: "✨ Epic Crate", cost: 25, color: 0x9b59b6, desc: "Better odds for rare and epic pets!" },
  mythic: { name: "🌌 Mythic Crate", cost: 100, color: 0xf1c40f, desc: "High stakes! Unlocks legendary and mythic beasts." },
  legendary: { name: "⚡ Legendary Crate", cost: 350, color: 0xe67e22, desc: "Exclusive crate for legendary & celestial beings." },
  godly: { name: "👑 Godly Crate", cost: 1000, color: 0xe74c3c, desc: "The ultimate gamble! Unlocks ultra-rare godly entities." }
};

const PET_POOL = [
  // --- Basic Tier ---
  { name: "Slime", rarity: "Common", emoji: "🟢", tier: "basic", weight: 60, value: 1 },
  { name: "Bunny", rarity: "Common", emoji: "🐰", tier: "basic", weight: 50, value: 2 },
  { name: "Cat", rarity: "Common", emoji: "🐱", tier: "basic", weight: 45, value: 3 },
  { name: "Dog", rarity: "Common", emoji: "🐶", tier: "basic", weight: 45, value: 3 },
  { name: "Fox", rarity: "Rare", emoji: "🦊", tier: "basic", weight: 25, value: 8 },
  { name: "Panda", rarity: "Rare", emoji: "🐼", tier: "basic", weight: 20, value: 10 },
  { name: "Snow Owl", rarity: "Rare", emoji: "🦉", tier: "basic", weight: 15, value: 14 },

  // --- Epic Tier ---
  { name: "Frost Wolf", rarity: "Epic", emoji: "🐺", tier: "epic", weight: 40, value: 25 },
  { name: "Phoenix", rarity: "Epic", emoji: "🔥", tier: "epic", weight: 35, value: 35 },
  { name: "Griffin", rarity: "Epic", emoji: "🦅", tier: "epic", weight: 30, value: 45 },
  { name: "Thunder Eagle", rarity: "Epic", emoji: "⚡", tier: "epic", weight: 20, value: 65 },
  { name: "Demon Bat", rarity: "Epic", emoji: "🦇", tier: "epic", weight: 15, value: 85 },

  // --- Mythic Tier ---
  { name: "Unicorn", rarity: "Legendary", emoji: "🦄", tier: "mythic", weight: 30, value: 120 },
  { name: "Shadow Dragon", rarity: "Legendary", emoji: "🐉", tier: "mythic", weight: 25, value: 150 },
  { name: "Golden Tiger", rarity: "Mythic", emoji: "🐅", tier: "mythic", weight: 15, value: 300 },
  { name: "Cyber Mecha Titan", rarity: "Mythic", emoji: "🤖", tier: "mythic", weight: 10, value: 450 },
  { name: "Cosmic Nebula Beast", rarity: "Mythic", emoji: "🌌", tier: "mythic", weight: 5, value: 750 },

  // --- Legendary Tier ---
  { name: "Crystal Phoenix", rarity: "Legendary", emoji: "💎", tier: "legendary", weight: 25, value: 1100 },
  { name: "Celestial Kitsune", rarity: "Legendary", emoji: "🦊", tier: "legendary", weight: 15, value: 1600 },
  { name: "Void Overlord", rarity: "Legendary", emoji: "🕳️", tier: "legendary", weight: 8, value: 2400 },
  { name: "Astral Titan", rarity: "Legendary", emoji: "✨", tier: "legendary", weight: 4, value: 3500 },

  // --- Godly Tier ---
  { name: "Infinite Godly Dominus", rarity: "Godly", emoji: "👑", tier: "godly", weight: 10, value: 6000 },
  { name: "Eternal Galaxy Dragon", rarity: "Godly", emoji: "🪐", tier: "godly", weight: 5, value: 9500 },
  { name: "Supreme Celestial Apex", rarity: "Godly", emoji: "🌟", tier: "godly", weight: 1, value: 15000 }
];

function rollPet(crateType) {
  let filtered = PET_POOL.filter(p => {
    if (crateType === 'basic') return p.tier === 'basic';
    if (crateType === 'epic') return p.tier === 'basic' || p.tier === 'epic';
    if (crateType === 'mythic') return p.tier === 'epic' || p.tier === 'mythic';
    if (crateType === 'legendary') return p.tier === 'mythic' || p.tier === 'legendary';
    return true; // Godly crate can roll everything including Godly tier
  });

  const totalWeight = filtered.reduce((sum, p) => sum + p.weight, 0);
  let randomNum = Math.random() * totalWeight;
  
  for (const pet of filtered) {
    if (randomNum < pet.weight) return pet;
    randomNum -= pet.weight;
  }
  return filtered[0];
}

async function execute(message, args, prefix, getGuildData, saveData) {
  const data = getGuildData(message.guild.id);
  if (!data.economy) data.economy = {};
  if (!data.pets) data.pets = {};

  const userId = message.author.id;
  if (!data.economy[userId]) {
    data.economy[userId] = { balance: 0, coins: 0, lastDaily: 0 };
  }

  const firstArg = args[0]?.toLowerCase();
  const secondArg = args[1];

  // 1. SELL PET COMMAND (?sell [number] or ?crates sell [number])
  const isSellCommand = message.content.startsWith(prefix + "sell") || message.content.startsWith(prefix + "sellpet") || firstArg === "sell" || firstArg === "sellpet";
  if (isSellCommand) {
    const indexArg = (firstArg === "sell" || firstArg === "sellpet") ? secondArg : firstArg;
    const petIndex = parseInt(indexArg, 10) - 1;
    const userPets = data.pets[userId] || [];

    if (isNaN(petIndex) || petIndex < 0 || petIndex >= userPets.length) {
      return message.reply(`❌ Usage: \`${prefix}sell [pet number]\` (Check your pet numbers using \`${prefix}pets\` or \`${prefix}inventory\`)`);
    }

    const [soldPet] = userPets.splice(petIndex, 1);
    const donEarned = soldPet.value || 1;

    data.economy[userId].balance += donEarned;
    saveData();

    return message.reply(
      `💰 Sold ${soldPet.emoji || "🐾"} **${soldPet.name}** (\`${soldPet.rarity}\`) for **${donEarned} DON**!\n` +
      `💳 New Wallet Balance: \`${data.economy[userId].balance.toFixed(2)} DON\``
    );
  }

  // 2. VIEW INVENTORY (?pets, ?inventory, or ?crates inventory)
  if (firstArg === "inventory" || firstArg === "inv" || message.content.includes("pets") && !firstArg) {
    const userPets = data.pets[userId] || [];
    if (userPets.length === 0) {
      return message.reply(`🎒 Your pet inventory is empty! Use \`${prefix}crates\` to buy and spin crates.`);
    }

    const inventoryList = userPets
      .slice(0, 15)
      .map((p, idx) => `**#${idx + 1}** ${p.emoji} **${p.name}** (\`${p.rarity}\`) • Val: ${p.value} DON • \`${prefix}sell ${idx + 1}\``)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Pet Collection`)
      .setColor(0x5865f2)
      .setDescription(inventoryList)
      .setFooter({ text: `Total Pets Collected: ${userPets.length} • Sell any pet using ${prefix}sell [number]` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // 3. OPEN CRATE SHOP MAIN MENU (?crates)
  const userBalance = data.economy[userId].balance || 0;

  const embed = new EmbedBuilder()
    .setTitle("📦 Pet Crate Marketplace & Gacha")
    .setColor(0x5865f2)
    .setDescription(
      `Welcome to the expanded pet crate spin station! Chat in the server to earn DON, then test your luck.\n\n` +
      `💳 **Your Balance:** \`${userBalance.toFixed(2)} DON\`\n\n` +
      `Choose a crate tier below to open:`
    )
    .addFields(
      { name: "🪵 Basic", value: `Cost: **${CRATE_TYPES.basic.cost} DON**\n${CRATE_TYPES.basic.desc}`, inline: true },
      { name: "✨ Epic", value: `Cost: **${CRATE_TYPES.epic.cost} DON**\n${CRATE_TYPES.epic.desc}`, inline: true },
      { name: "🌌 Mythic", value: `Cost: **${CRATE_TYPES.mythic.cost} DON**\n${CRATE_TYPES.mythic.desc}`, inline: true },
      { name: "⚡ Legendary", value: `Cost: **${CRATE_TYPES.legendary.cost} DON**\n${CRATE_TYPES.legendary.desc}`, inline: true },
      { name: "👑 Godly", value: `Cost: **${CRATE_TYPES.godly.cost} DON**\n${CRATE_TYPES.godly.desc}`, inline: true }
    )
    .setFooter({ text: "Click the buttons below to open your crates!" });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_basic").setLabel("🪵 Basic (5)").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("open_crate_epic").setLabel("✨ Epic (25)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_mythic").setLabel("🌌 Mythic (100)").setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_legendary").setLabel("⚡ Legendary (350)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_godly").setLabel("👑 Godly (1000)").setStyle(ButtonStyle.Danger)
  );

  const shopMsg = await message.reply({ embeds: [embed], components: [row1, row2] });

  // Component Collector for Crate Opening Buttons
  const collector = shopMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000
  });

  collector.on("collect", async (interaction) => {
    const crateKey = interaction.customId.replace("open_crate_", "");
    const crate = CRATE_TYPES[crateKey];

    if (!crate) return;

    const currentData = getGuildData(interaction.guild.id);
    const userEco = currentData.economy[userId];

    if (userEco.balance < crate.cost) {
      return interaction.reply({ 
        content: `❌ You need **${crate.cost} DON** to open this crate, but you only have **${userEco.balance.toFixed(2)} DON**! Keep chatting to earn more points.`, 
        ephemeral: true 
      });
    }

    userEco.balance -= crate.cost;
    const wonPet = rollPet(crateKey);

    if (!currentData.pets[userId]) currentData.pets[userId] = [];
    currentData.pets[userId].push(wonPet);
    saveData();

    const resultEmbed = new EmbedBuilder()
      .setTitle(`🎉 Crate Opened: ${crate.name}!`)
      .setColor(crate.color)
      .setDescription(
        `📦 Spinning the crate...\n\n` +
        `✨ **You hatched:** ${wonPet.emoji} **${wonPet.name}**!\n` +
        `📊 **Rarity:** \`${wonPet.rarity}\`\n` +
        `💰 **Pet Value:** \`${wonPet.value} DON\`\n\n` +
        `*(New Balance: ${userEco.balance.toFixed(2)} DON)*`
      )
      .setFooter({ text: `Type ${prefix}pets to view your inventory or ${prefix}sell [number] to sell!` })
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
