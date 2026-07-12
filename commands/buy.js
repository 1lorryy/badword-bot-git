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
  
  // Pulls your dashboard structured categories live
  const purchaseLinks = guildSettings.purchaseLinks || DEFAULT_PURCHASE_LINKS;

  const embed = new EmbedBuilder()
    .setTitle("🛒 Purchase Links")
    .setDescription("Select the upgrade or add-on you want below.")
    .setColor(0x5865f2)
    .addFields(
      {
        name: "✈️ Classes",
        value: renderLinks(purchaseLinks.classes || DEFAULT_PURCHASE_LINKS.classes)
      },
      {
        name: "⏱️ 10M–6H Ads",
        value: renderLinks(purchaseLinks.ads6h || DEFAULT_PURCHASE_LINKS.ads6h)
      },
      {
        name: "🕒 6H–24H Ads",
        value: renderLinks(purchaseLinks.ads24h || DEFAULT_PURCHASE_LINKS.ads24h)
      },
      {
        name: "➕ Extras",
        value: renderLinks(purchaseLinks.extras || DEFAULT_PURCHASE_LINKS.extras)
      }
    )
    .setFooter({ text: "💳 Purchase your ads & upgrades above" })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] }).catch(() => null);
  return true;
}

module.exports = { handleBuyCommand, DEFAULT_PURCHASE_LINKS };
