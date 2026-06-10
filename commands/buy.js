const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "guild-data.json");

function loadData() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); } catch { return {}; }
}

function renderLinks(items) {
  if (!Array.isArray(items) || !items.length) return "None configured.";
  return items.map(item => `🔹 [${item.name}](${item.url})`).join("\n");
}

async function handleBuyCommand(message) {
  await message.delete().catch(() => null);
  const data = loadData();
  const guildSettings = data[message.guild.id] || {};
  const links = guildSettings.purchaseLinks || { 
      embedSettings: { title: "🛒 Purchase", description: "Links", color: "#5865f2" },
      classes: [], ads6h: [], ads24h: [], extras: [] 
  };

  const embed = new EmbedBuilder()
    .setTitle(links.embedSettings.title)
    .setDescription(links.embedSettings.description)
    .setColor(links.embedSettings.color)
    .addFields(
      { name: "✈️ Classes", value: renderLinks(links.classes) },
      { name: "⏱️ 6H Ads", value: renderLinks(links.ads6h) },
      { name: "🕒 24H Ads", value: renderLinks(links.ads24h) },
      { name: "➕ Extras", value: renderLinks(links.extras) }
    );
  
  await message.channel.send({ embeds: [embed] });
}

module.exports = { handleBuyCommand };
