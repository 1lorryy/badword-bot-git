const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "..", "guild-data.json");

const DEFAULT_DATA = {
  purchaseLinks: {
    classes: [
      { name: "Economy Class", url: "https://www.roblox.com/game-pass/1856306289" },
      { name: "Premium Economy", url: "https://www.roblox.com/game-pass/1856298285" },
      { name: "Business Class", url: "https://www.roblox.com/game-pass/1854202242" },
      { name: "First Class", url: "https://www.roblox.com/game-pass/1856222269" }
    ],
    ads6h: [
      { name: "6H Drops Ping", url: "https://www.roblox.com/game-pass/1809387047" },
      { name: "6H Sponsor / Here", url: "https://www.roblox.com/game-pass/1809387042" },
      { name: "6H Everyone Ping", url: "https://www.roblox.com/game-pass/1809201052" }
    ],
    ads24h: [
      { name: "24H Drops Ping", url: "https://www.roblox.com/game-pass/1808277089" },
      { name: "24H Sponsor / Here", url: "https://www.roblox.com/game-pass/1808415066" },
      { name: "24H Everyone Ping", url: "https://www.roblox.com/game-pass/1809369029" }
    ],
    extras: [
      { name: "Extra Day Link", url: "https://www.roblox.com/game-pass/1807563042" },
      { name: "Skip Queue Item", url: "https://www.roblox.com/game-pass/1809549057" },
      { name: "Ping on Join Adv", url: "https://www.roblox.com/game-pass/1807959069" }
    ]
  },
  wallets: {
    ltc: "Lby2EQyH8yYqd6bWPTGHbUrupephWsqEdM",
    btc: "Not Set Yet",
    eth: "Not Set Yet"
  }
};

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Save Error:", err);
  }
}

function formatLinks(items) {
  if (!items || !items.length) return "*None configured yet*";
  return items.map(item => `✨ **[${item.name}](${item.url})**`).join("\n");
}

async function handlePurchaseCommand(message) {
  await message.delete().catch(() => null);

  const fullData = loadData();
  const guildID = message.guild.id;
  
  if (!fullData[guildID]) fullData[guildID] = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const settings = fullData[guildID];

  // Pull purchase links directly from live dashboard storage
  const links = settings.purchaseLinks && Object.keys(settings.purchaseLinks).length > 0 
    ? settings.purchaseLinks 
    : DEFAULT_DATA.purchaseLinks;

  if (!settings.wallets) settings.wallets = {};
  if (!settings.wallets.ltc || settings.wallets.ltc === "Not Set Yet") {
    settings.wallets.ltc = DEFAULT_DATA.wallets.ltc;
    saveData(fullData);
  }

  const ltcWallet = settings.wallets.ltc;

  const embed = new EmbedBuilder()
    .setTitle("🌟 DONQUIXOTE STORE 🌟")
    .setDescription("Secure your perks instantly via Roblox Gamepasses, or pay with Crypto below.")
    .setColor("#5865F2")
    .addFields(
      { name: "✈️ PREMIUM CLASSES", value: formatLinks(links.classes), inline: false },
      { name: "⏱️ ADS (10M – 6H)", value: formatLinks(links.ads6h), inline: true },
      { name: "🕒 ADS (6H – 24H)", value: formatLinks(links.ads24h), inline: true },
      { name: "➕ VALUE EXTRAS & PINGS", value: formatLinks(links.extras), inline: false },
      { name: "🪙 LITECOIN (LTC) WALLET (Tap address to copy!)", value: `💳 **LTC Address:**\n\`${ltcWallet}\``, inline: false }
    )
    .setFooter({ text: "💎 Send payment proof right here in this ticket once completed!" })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] }).catch(() => null);
}

async function handlePurchEditCommand(message, args) {
  if (!message.member.permissions.has("Administrator")) {
    return message.reply("❌ You do not have permissions to use this command.").then(m => setTimeout(() => m.delete(), 5000));
  }

  const fullData = loadData();
  const guildID = message.guild.id;
  if (!fullData[guildID]) fullData[guildID] = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const settings = fullData[guildID];

  const usage = "💡 **Usage:** `?purchedit <category> <number> <new_url>`\n\n" +
                "**Categories:** `classes`, `ads6h`, `ads24h`, `extras`\n" +
                "**Crypto Wallets:** `?purchedit wallet <ltc/btc/eth> <address>`\n\n" +
                "**Example:** `?purchedit classes 1 https://roblox.com/...`";

  if (!args || args.length < 2) return message.reply(usage);

  const category = args[0].toLowerCase();
  const indexOrWallet = args[1].toLowerCase();
  const value = args.slice(2).join(" ");

  if (category === "wallet") {
    let coinType = indexOrWallet;
    if (coinType === "crypto") coinType = "ltc";

    if (!["ltc", "btc", "eth", "sol"].includes(coinType)) {
      return message.reply("❌ Use `?purchedit wallet ltc <address>` to update your address.");
    }
    if (!value) return message.reply(`❌ Please provide a valid ${coinType.toUpperCase()} wallet address!`);
    
    if (!settings.wallets) settings.wallets = {};
    settings.wallets[coinType] = value;
    saveData(fullData);
    return message.reply(`✅ Successfully updated your **${coinType.toUpperCase()}** wallet address!`);
  }

  if (["classes", "ads6h", "ads24h", "extras"].includes(category)) {
    if (!value) return message.reply("❌ Please include the new URL link destination!");
    
    const itemIndex = parseInt(indexOrWallet) - 1;
    if (!settings.purchaseLinks) settings.purchaseLinks = JSON.parse(JSON.stringify(DEFAULT_DATA.purchaseLinks));
    const items = settings.purchaseLinks[category];

    if (isNaN(itemIndex) || itemIndex < 0 || itemIndex >= items.length) {
      return message.reply(`❌ Invalid item position. Provide a line number from 1 to ${items.length}.`);
    }

    items[itemIndex].url = value;
    saveData(fullData);

    return message.reply(`✅ Updated item **#${itemIndex + 1} (${items[itemIndex].name})** in the **${category}** group!`);
  }

  return message.reply(usage);
}

module.exports = { handlePurchaseCommand, handlePurchEditCommand, DEFAULT_PURCHASE_LINKS: DEFAULT_DATA.purchaseLinks };
