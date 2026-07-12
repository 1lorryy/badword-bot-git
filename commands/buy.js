const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "guild-data.json");

const DEFAULT_PURCHASE_LINKS = {
  classes: [
    { name: "Economy", url: "https://www.roblox.com/game-pass/1856306289/ECONOMY" },
    { name: "Premium Economy", url: "https://www.roblox.com/game-pass/1856298285/PREMIUM-ECONOMY" },
    { name: "Business Class", url: "https://www.roblox.com/game-pass/1854202242/BUSSINESS-CLASS" },
    { name: "First Class", url: "https://www.roblox.com/game-pass/1856222269/FIRST-CLASS" }
  ],
  ads6h: [
    { name: "Drops Ping", url: "https://www.roblox.com/game-pass/1809387047/Drops-Ping-6H" },
    { name: "Sponsor/Here Ping", url: "https://www.roblox.com/game-pass/1809387042/Sponsor-Here-Ping-6H" },
    { name: "Everyone Ping", url: "https://www.roblox.com/game-pass/1809201052/Everyone-Ping-6H" }
  ],
  ads24h: [
    { name: "Drops Ping", url: "https://www.roblox.com/game-pass/1808277089/Drops-Ping-24H" },
    { name: "Sponsor/Here Ping", url: "https://www.roblox.com/game-pass/1808415066/Sponsor-Here-Ping-24H" },
    { name: "Everyone Ping", url: "https://www.roblox.com/game-pass/1809369029/Everyone-Ping-24H" }
  ],
  extras: [
    { name: "Custom Channel", url: "https://www.roblox.com/game-pass/1808246271/Custom-Channel" },
    { name: "Extra Day", url: "https://www.roblox.com/game-pass/1807563042/Extra-Day" },
    { name: "Skip Queue", url: "https://www.roblox.com/game-pass/1809549057/Skip-Queue" },
    { name: "Ping on Join", url: "https://www.roblox.com/game-pass/1807959069/Ping-On-Join" }
  ]
};

function loadFullData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function renderLinks(items) {
  if (!Array.isArray(items) || !items.length) return "Nothing added yet.";
  return items
    .map(item => `🔹 [${item.name}](${item.url})`)
    .join("\n");
}

async function handleBuyCommand(message, args, prefix, canManageGuild, saveData) {
  await message.delete().catch(() => null);

  const fullData = loadFullData();
  const guildSettings = fullData[message.guild.id] || {};
  const purchaseLinks = guildSettings.purchaseLinks;

  const meta = guildSettings.purchaseEmbedSettings || {
    title: "🛒 Purchase Links",
    description: "Select the upgrade or add-on you want below.",
    color: "#5865f2"
  };

  let embedColor = 0x5865f2;
  if (meta.color) {
    embedColor = parseInt(meta.color.replace("#", ""), 16);
  }

  const embed = new EmbedBuilder()
    .setTitle(meta.title)
    .setDescription(meta.description)
    .setColor(embedColor)
    .setFooter({ text: "💳 Purchase your ads & upgrades above" })
    .setTimestamp();

  // DASHBOARD HANDLING: If dashboard saved it as a flat array of custom items
  if (Array.isArray(purchaseLinks)) {
    if (purchaseLinks.length === 0) {
      embed.addFields({ name: "Store Available Items", value: "No active links configured on dashboard." });
    } else {
      embed.addFields({ name: "✨ Available Shop Items", value: renderLinks(purchaseLinks) });
    }
  } 
  // CATEGORY HANDLING: Fallback if it matches the older group layout structures
  else if (purchaseLinks && (purchaseLinks.classes || purchaseLinks.ads6h)) {
    embed.addFields(
      { name: "✈️ Classes", value: renderLinks(purchaseLinks.classes || DEFAULT_PURCHASE_LINKS.classes) },
      { name: "⏱️ 10M–6H Ads", value: renderLinks(purchaseLinks.ads6h || DEFAULT_PURCHASE_LINKS.ads6h) },
      { name: "🕒 6H–24H Ads", value: renderLinks(purchaseLinks.ads24h || DEFAULT_PURCHASE_LINKS.ads24h) },
      { name: "➕ Extras", value: renderLinks(purchaseLinks.extras || DEFAULT_PURCHASE_LINKS.extras) }
    );
  } 
  // PRESET FALLBACK: If nothing exists in database file yet
  else {
    embed.addFields(
      { name: "✈️ Classes", value: renderLinks(DEFAULT_PURCHASE_LINKS.classes) },
      { name: "⏱️ 10M–6H Ads", value: renderLinks(DEFAULT_PURCHASE_LINKS.ads6h) },
      { name: "🕒 6H–24H Ads", value: renderLinks(DEFAULT_PURCHASE_LINKS.ads24h) },
      { name: "➕ Extras", value: renderLinks(DEFAULT_PURCHASE_LINKS.extras) }
    );
  }

  await message.channel.send({ embeds: [embed] }).catch(() => null);
  return true;
}

module.exports = { handleBuyCommand, DEFAULT_PURCHASE_LINKS };
