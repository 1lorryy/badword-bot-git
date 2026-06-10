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
    .map(item => `[${item.name}](${item.url})`)
    .join("\n");
}

async function deleteAfter(msg, ms = 5000) {
  if (!msg) return;
  setTimeout(() => msg.delete().catch(() => null), ms);
}

async function handleBuyCommand(message, args, prefix, canManageGuild, saveData) {
  if (!canManageGuild(message)) {
    const msg = await message.reply("❌ Staff only command.").catch(() => null);
    await deleteAfter(msg);
    return true;
  }

  const fullData = loadFullData();
  if (!fullData[message.guild.id]) fullData[message.guild.id] = {};
  
  // Set default structure if it does not exist yet
  if (!fullData[message.guild.id].purchaseLinks) {
    fullData[message.guild.id].purchaseLinks = JSON.parse(JSON.stringify(DEFAULT_PURCHASE_LINKS));
  }

  const subCommand = args[0] ? args[0].toLowerCase() : null;

  // ================= SUBCOMMAND: ADD LINK =================
  if (subCommand === "add") {
    const category = args[1] ? args[1].toLowerCase() : null; // classes, ads6h, ads24h, extras
    const name = args[2];
    const url = args[3];

    const validCategories = ["classes", "ads6h", "ads24h", "extras"];
    if (!category || !validCategories.includes(category) || !name || !url) {
      return message.reply(`❌ Usage: \`${prefix}purchase add [classes/ads6h/ads24h/extras] [ItemName] [URL]\``);
    }

    // Force link schema safety
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return message.reply("❌ Please provide a valid web URL link.");
    }

    // Push link entry to layout data
    fullData[message.guild.id].purchaseLinks[category].push({ name, url });
    
    // Save locally to guild-data.json
    fs.writeFileSync(DATA_FILE, JSON.stringify(fullData, null, 2));
    
    // Synchronize the memory cache state inside bot.js dynamically
    if (typeof saveData === "function") saveData();

    return message.reply(`✅ Added **${name}** to the **${category}** list successfully!`);
  }

  // ================= SUBCOMMAND: RESET LINKS =================
  if (subCommand === "reset") {
    fullData[message.guild.id].purchaseLinks = JSON.parse(JSON.stringify(DEFAULT_PURCHASE_LINKS));
    
    fs.writeFileSync(DATA_FILE, JSON.stringify(fullData, null, 2));
    if (typeof saveData === "function") saveData();

    return message.reply("🔄 Reset purchase links back to standard original values.");
  }

  // ================= DEFAULT ACTION: SHOW LINKS EMBED =================
  await message.delete().catch(() => null);

  const links = fullData[message.guild.id].purchaseLinks;

  const embed = new EmbedBuilder()
    .setTitle("🛒 Purchase Links")
    .setColor(0x5865f2)
    .setDescription(`Select the upgrade or add-on you want below.\n*Staff Tip: Use \`${prefix}purchase add\` to append items.*`)
    .addFields(
      {
        name: "✈️ Classes",
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
