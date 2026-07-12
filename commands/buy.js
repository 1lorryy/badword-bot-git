const { EmbedBuilder, codeBlock } = require("discord.js");
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
    btc: "Not Set Yet"
  }
};

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function formatLinks(items) {
  if (!items || !items.length) return "*None configured yet*";
  return items.map(item => `✨ **[${item.name}](${item.url})**`).join("\n");
}

// ================= THE MAIN SHOW COMMAND =================
async function handlePurchaseCommand(message) {
  await message.delete().catch(() => null);

  const fullData = loadData();
  const guildID = message.guild.id;
  
  if (!fullData[guildID]) fullData[guildID] = JSON.parse(JSON.stringify(DEFAULT_DATA));
  const settings = fullData[guildID];

  const links = settings.purchaseLinks || DEFAULT_DATA.purchaseLinks;
  const wallets = settings.wallets || DEFAULT_DATA.wallets;

  const embed = new EmbedBuilder()
    .setTitle("🌟 DONQUIXOTE OFFICIAL STORE 🌟")
    .setDescription(
      "Welcome to our premium upgrade and advertising portal! Secure your perks instantly via Roblox Gamepasses, or pay easily with Bitcoin below.\n\n" +
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    )
    .setColor("#5865F2")
    .addFields(
      { 
        name: "✈️ PREMIUM CLASSES", 
        value: formatLinks(links.classes) + "\n\u200B", 
        inline: false 
      },
      { 
        name: "⏱️ ADVERTISING (10M – 6H)", 
        value: formatLinks(links.ads6h) + "\n\u200B", 
        inline: true 
      },
      { 
        name: "🕒 ADVERTISING (6H – 24H)", 
        value: formatLinks(links.ads24h) + "\n\u200B", 
        inline: true 
      },
      { 
        name: "➕ VALUE EXTRAS & PINGS", 
        value: formatLinks(links.extras) + "\n\u200B", 
        inline: false 
      },
      {
        name: "🪙 BITCOIN WALLET (Tap address text box to copy!)",
        value: `₿ **Bitcoin (BTC) Address:**\n${codeBlock(wallets.btc || "Not Set Yet")}`,
        inline: false
      }
    )
    .setFooter({ text: "💎 After paying via BTC, open a support ticket with your transaction ID!" })
    .setTimestamp();

  await message.channel.send({ embeds: [embed] }).catch(() => null);
}

// ================= THE EDITING COMMAND =================
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
                "**Or BTC wallet:** `?purchedit wallet btc <address>`\n\n" +
                "**Example:** `?purchedit classes 1 https://roblox.com/...` (Changes Economy link)\n" +
                "**Example:** `?purchedit wallet btc 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`";

  if (!args || args.length < 2) {
    return message.reply(usage);
  }

  const category = args[0].toLowerCase();
  const indexOrWallet = args[1].toLowerCase();
  const value = args.slice(2).join(" ");

  // Handle BTC Wallet Setup
  if (category === "wallet") {
    if (indexOrWallet !== "btc") {
      return message.reply("❌ Currently, only `btc` wallet settings are active.");
    }
    if (!value) return message.reply("❌ Please provide a wallet address string!");
    
    if (!settings.wallets) settings.wallets = { btc: "Not Set Yet" };
    settings.wallets.btc = value;
    
    saveData(fullData);
    return message.reply(`✅ Successfully updated your **Bitcoin (BTC)** address!`);
  }

  // Handle Link Categories Editing
  if (["classes", "ads6h", "ads24h", "extras"].includes(category)) {
    if (!value) return message.reply("❌ Please include the new URL link destination!");
    
    const itemIndex = parseInt(indexOrWallet) - 1;
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
