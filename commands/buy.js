const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "guild-data.json");

const DEFAULT_PURCHASE_LINKS = {
  classes: [
    { name: "Economy", url: "https://www.roblox.com/game-pass/" },
    { name: "Premium Economy", url: "https://www.roblox.com/game-pass/" },
    { name: "Business Class", url: "https://www.roblox.com/game-pass/" },
    { name: "First Class", url: "https://www.roblox.com/game-pass/" }
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

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function getPurchaseLinks(guildId) {
  const data = loadData();
  const cfg = data[guildId] || {};

  return cfg.purchaseLinks || DEFAULT_PURCHASE_LINKS;
}

function renderLinks(items) {
  if (!Array.isArray(items) || !items.length) return "Nothing added yet.";

  return items
    .map(item => `[${item.name}](${item.url})`)
    .join("\n");
}

async function deleteAfter(msg, ms = 5000) {
  if (!msg) return;
  setTimeout(() => msg.delete().catch(() => null), ms);
}

async function handleBuyCommand(message, args, prefix, canManageGuild) {
  if (!canManageGuild(message)) {
    const msg = await message.reply("❌ Staff only command.").catch(() => null);
    await deleteAfter(msg);
    return true;
  }

  await message.delete().catch(() => null);

  const links = getPurchaseLinks(message.guild.id);

  const embed = new EmbedBuilder()
    .setTitle("🛒 Purchase Links")
    .setColor(0x5865f2)
    .setDescription("Select the upgrade or add-on you want below.")
    .addFields(
      {
        name: "✈️ Classes - coming soon!",
        value: renderLinks(links.classes)
      },
      {
        name: "⏱️ 10M–6H Ads",
        value: renderLinks(links.ads6h)
      },
      {
        name: "🕒 6H–24H Ads",
        value: renderLinks(links.ads24h)
      },
      {
        name: "➕ Extras",
        value: renderLinks(links.extras)
      }
    )
    .setFooter({ text: "💳 Purchase your ads & upgrades above" })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] }).catch(() => null);

  return true;
}

module.exports = { handleBuyCommand, DEFAULT_PURCHASE_LINKS };