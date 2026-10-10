const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const CRATE_TYPES = {
  basic: { name: "🪵 Basic Crate", cost: 5, color: 0x8b5a2b, desc: "Affordable crate with common and rare pets." },
  epic: { name: "✨ Epic Crate", cost: 25, color: 0x9b59b6, desc: "Better odds for rare and epic pets!" },
  mythic: { name: "🌌 Mythic Crate", cost: 100, color: 0xf1c40f, desc: "High stakes! Unlocks legendary and mythic beasts." }
};

const PET_POOL = [
  // Basic Tier
  { name: "Bunny", rarity: "Common", emoji: "🐰", tier: "basic", weight: 50, value: 2 },
  { name: "Cat", rarity: "Common", emoji: "🐱", tier: "basic", weight: 50, value: 2 },
  { name: "Fox", rarity: "Rare", emoji: "🦊", tier: "basic", weight: 25, value: 8 },
  { name: "Panda", rarity: "Rare", emoji: "🐼", tier: "basic", weight: 20, value: 10 },
  
  // Epic Tier
  { name: "Phoenix", rarity: "Epic", emoji: "🔥", tier: "epic", weight: 35, value: 35 },
  { name: "Griffin", rarity: "Epic", emoji: "🦅", tier: "epic", weight: 30, value: 45 },
  { name: "Unicorn", rarity: "Legendary", emoji: "🦄", tier: "epic", weight: 10, value: 120 },
  
  // Mythic Tier
  { name: "Shadow Dragon", rarity: "Legendary", emoji: "🐉", tier: "mythic", weight: 30, value: 150 },
  { name: "Golden Tiger", rarity: "Mythic", emoji: "🐅", tier: "mythic", weight: 15, value: 300 },
  { name: "Cosmic Nebula Beast", rarity: "Mythic", emoji: "🌌", tier: "mythic", weight: 5, value: 750 }
];

function rollPet(crateType) {
  let filtered = PET_POOL.filter(p => {
    if (crateType === 'basic') return p.tier === 'basic';
    if (crateType === 'epic') return p.tier === 'basic' || p.tier === 'epic';
    return true; // Mythic crate can roll everything
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
  if (!data.pets) data.pets = {}; // Storage for user inventories: data.pets[userId] = [{name, rarity, emoji, value}]

  const userId = message.author.id;
  if (!data.economy[userId]) {
    data.economy[userId] = { balance: 0, coins: 0, lastDaily: 0 };
  }

  const sub = args[0]?.toLowerCase();

  // 1. VIEW INVENTORY (`?pets` or `?crates inventory`)
  if (sub === "inventory" || sub === "inv" || message.content.includes("pets")) {
    const userPets = data.pets[userId] || [];
    if (userPets.length === 0) {
      return message.reply(`🎒 Your pet inventory is empty! Use \`${prefix}crates\` to buy and spin crates.`);
    }

    const inventoryList = userPets
      .slice(0, 15)
      .map((p, idx) => `**#${idx + 1}** ${p.emoji} **${p.name}** (\`${p.rarity}\`) • Val: ${p.value} DON`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`🎒 ${message.author.username}'s Pet Collection`)
      .setColor(0x5865f2)
      .setDescription(inventoryList)
      .setFooter({ text: `Total Pets Collected: ${userPets.length} • Earn points by chatting!` })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // 2. OPEN CRATE SHOP MAIN MENU (`?crates`)
  const userBalance = data.economy[userId].balance || 0;

  const embed = new EmbedBuilder()
    .setTitle("📦 Pet Crate Marketplace & Gacha")
    .setColor(0x5865f2)
    .setDescription(
      `Welcome to the pet crate spin station! Earn points by chatting in the server and test your luck.\n\n` +
      `💳 **Your Balance:** \`${userBalance.toFixed(2)} DON\`\n\n` +
      `Choose a crate tier below to spin and unlock rare animals:`
    )
    .addFields(
      { name: "🪵 Basic Crate", value: `Cost: **${CRATE_TYPES.basic.cost} DON**\n${CRATE_TYPES.basic.desc}`, inline: true },
      { name: "✨ Epic Crate", value: `Cost: **${CRATE_TYPES.epic.cost} DON**\n${CRATE_TYPES.epic.desc}`, inline: true },
      { name: "🌌 Mythic Crate", value: `Cost: **${CRATE_TYPES.mythic.cost} DON**\n${CRATE_TYPES.mythic.desc}`, inline: true }
    )
    .setFooter({ text: "Click the buttons below to open your crates!" });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("open_crate_basic").setLabel("🪵 Open Basic (5 DON)").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("open_crate_epic").setLabel("✨ Open Epic (25 DON)").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("open_crate_mythic").setLabel("🌌 Open Mythic (100 DON)").setStyle(ButtonStyle.Success)
  );

  const shopMsg = await message.reply({ embeds: [embed], components: [row] });

  // Component Collector for Crate Opening Buttons
  const collector = shopMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === message.author.id,
    time: 60000
  });

  collector.on("collect", async (interaction) => {
    const crateKey = interaction.customId.replace("open_crate_", "");
    const crate = CRATE_TYPES[crateKey];

    if (!crate) return;

    // Refresh user balance check from store
    const currentData = getGuildData(interaction.guild.id);
    const userEco = currentData.economy[userId];

    if (userEco.balance < crate.cost) {
      return interaction.reply({ 
        content: `❌ You need **${crate.cost} DON** to open this crate, but you only have **${userEco.balance.toFixed(2)} DON**! Keep chatting to earn more points.`, 
        ephemeral: true 
      });
    }

    // Deduct cost and roll pet
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
      .setFooter({ text: `Type ${prefix}pets to view your full collection!` })
      .setTimestamp();

    await interaction.update({ embeds: [resultEmbed], components: [row] });
  });

  collector.on("end", () => {
    shopMsg.edit({ components: [] }).catch(() => null);
  });
}

module.exports = {
  execute
};
