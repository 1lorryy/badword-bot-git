const { initTimers, handleTimerCommand } = require("./commands/timer.js");
const { handleChannelToolsCommand } = require("./commands/channelTools");
const { handlePurchaseCommand, handlePurchEditCommand } = require("./commands/buy");
const { handleAfkCommand, handleAfkMentionsAndReturn } = require("./commands/afk");
const { handleTranslateCommand } = require("./commands/translate");
const { handleAuctionCommand } = require("./commands/auction");
const { handleModLogsCommand } = require("./commands/modlogs");
const { generateAiReply } = require("./commands/aiReply");
const { checkBirthdays, handleBirthdayCommand } = require("./commands/birthday");
const { handleVerifyCommand } = require("./commands/verify");
const renameCommand = require("./commands/rename.js");
const roleIconCommand = require("./commands/roleicon.js");
const roleCreateCommand = require("./commands/rolecreate.js");
const customColorCommand = require("./commands/customcolor.js");
const shopCommand = require("./commands/shop.js");
const arCommand = require('./commands/ar.js');
const marriageCommand = require("./commands/marriage.js");
const adoptionCommand = require("./commands/adoption.js");
const pollCommand = require("./commands/poll.js");
const giveawayCommand = require("./commands/giveaway.js");

const snipes = {};
const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  REST,
  Routes,
  InteractionContextType,
  ApplicationIntegrationType
} = require("discord.js");

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "guild-data.json");

const DEFAULT_PREFIX = process.env.DEFAULT_PREFIX || "?";
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID || "1492845794192134245";

// Dedicated Category & Channel Configuration
const SUPPORT_TICKET_CATEGORY_ID = "1481939936964775946";

const ALLOWED_RENAME_CATEGORIES = [
  "1481939936964775946", // Support Ticket Category
  "1481938314062725281", // Purchases Category
  "1481937769612968038"  // Claim Category
];

const BDAY_COMMAND_CHANNEL_ID = "1481370051264254259"; // #commands channel

const BYPASS_ROLE_IDS = (
  process.env.BYPASS_ROLE_IDS || ""
)
  .split(",")
  .map(id => id.trim())
  .filter(Boolean);

const STAFF_ROLE_ID = "1481370041420087474";
const MOD_ROLE_ID = "1481370041432932379";
const MAIN_ADMIN_ROLE_ID = "1481370041441189959";

const BLOCKED_LINKS = [
  "onlyfans.com",
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com"
];

const CORE_BLACKLIST = [
  "ass",
  "nigga",
  "nigger",
  "nga",
  "idiot",
  "retard",
  "bitchass",
  "dumbass",
  "faggot",
  "fagot",
  "porn",
  "sex",
  "pussy",
  "boobs",
  "penis",
  "dick",
  "idgaf",
  "motherfuck",
  "motherfucker",
  "mf",
  "asshole",
  "cunt",
  "possay",
  "sexcam",
  "bubs"
];

const PROTECTED_BLACKLIST = [
  "nigga",
  "nigger",
  "nga",
  "retard",
  "faggot",
  "fagot",
  "tard",
];

let client;

// ================= DATA AUTO-SAVE SECURITY =================
function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (err) {
    console.error("❌ Error reading data file:", err);
    return {};
  }
}

let store = loadData();

function saveData() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Error writing auto-save to file:", err);
  }
}

function getGuildData(guildId) {
  if (!store[guildId]) {
    store[guildId] = {
      prefix: DEFAULT_PREFIX,
      words: [],
      blockedLinks: [],
      customCommands: {},
      warnings: {},
      cooldowns: {}, 
      modStats: {},
      purchaseLinks: {
        classes: [],
        ads6h: [],
        ads24h: [],
        extras: []
      },
      birthdays: {},
      afkUsers: {},
      channelCounters: {},
      snipeEnabled: true,
      snipes: {}
    };
    saveData();
  }

  const guild = store[guildId];

  if (!Array.isArray(guild.words)) guild.words = [];
  if (!Array.isArray(guild.blockedLinks)) guild.blockedLinks = [];
  if (!guild.customCommands || typeof guild.customCommands !== "object") guild.customCommands = {};
  if (!guild.warnings || typeof guild.warnings !== "object") guild.warnings = {};
  if (!guild.cooldowns || typeof guild.cooldowns !== "object") guild.cooldowns = {};
  if (!guild.afkUsers || typeof guild.afkUsers !== "object") guild.afkUsers = {};
  if (!guild.channelCounters || typeof guild.channelCounters !== "object") guild.channelCounters = {};

  if (!guild.purchaseLinks || typeof guild.purchaseLinks !== "object") {
    guild.purchaseLinks = { classes: [], ads6h: [], ads24h: [], extras: [] };
  }

  for (const key of ["classes", "ads6h", "ads24h", "extras"]) {
    if (!Array.isArray(guild.purchaseLinks[key])) {
      guild.purchaseLinks[key] = [];
    }
  }
  
  if (!guild.modStats || typeof guild.modStats !== "object") guild.modStats = {};
  if (!guild.birthdays || typeof guild.birthdays !== "object") guild.birthdays = {};
  if (!guild.verification || typeof guild.verification !== "object") {
    guild.verification = {
      verifiedRole: null,
      unverifiedRole: null,
      trustedDays: 7,
      autoban: false,
      autokick: false,
      flagSuspiciousNames: true
    };
  }

  if (!guild.tempRoles) guild.tempRoles = [];
  if (!guild.prefix) guild.prefix = DEFAULT_PREFIX;

  return guild;
}

// ================= HELPERS =================
async function deleteAfter(msg, ms = 5000) {
  if (!msg) return;
  setTimeout(() => msg.delete().catch(() => null), ms);
}

function canManageGuild(message) {
  if (!message.member) return false;
  return (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    message.member.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
    message.member.roles.cache.has(MAIN_ADMIN_ROLE_ID) ||
    message.member.roles.cache.has(STAFF_ROLE_ID) ||
    message.member.roles.cache.has(MOD_ROLE_ID)
  );
}

function canBanUsers(message) {
  if (!message.member) return false;

  const roles = message.member.roles.cache;
  return (
    message.member.permissions.has(PermissionsBitField.Flags.Administrator) ||
    roles.has(MAIN_ADMIN_ROLE_ID)
  );
}

function isStaffMember(member) {
  return (
    member.roles.cache.has(STAFF_ROLE_ID) ||
    member.roles.cache.has(MOD_ROLE_ID) ||
    member.roles.cache.has(MAIN_ADMIN_ROLE_ID) ||
    member.permissions.has(PermissionsBitField.Flags.Administrator)
  );
}

function hasBypassRole(message) {
  return message.member?.roles?.cache?.some(role =>
    BYPASS_ROLE_IDS.includes(role.id)
  );
}

function canUseFunCommand(message) {
  if (isStaffMember(message.member) || canManageGuild(message)) return true;
  return message.channel.id === BDAY_COMMAND_CHANNEL_ID;
}

async function findTargetMember(message, args) {
  const mention = message.mentions?.members?.first();
  if (mention) return mention;

  const input = args[0];
  if (!input) return null;

  const clean = input.replace(/^@/, "");
  const byId = await message.guild.members
    .fetch(clean)
    .catch(() => null);
  if (byId) return byId;

  const search = clean.toLowerCase();

  let found = message.guild.members.cache.find(
    m =>
      m.user.username.toLowerCase() === search ||
      m.displayName.toLowerCase() === search ||
      m.user.tag.toLowerCase() === search
  );
  if (found) return found;

  found = message.guild.members.cache.find(
    m =>
      m.user.username.toLowerCase().includes(search) ||
      m.displayName.toLowerCase().includes(search)
  );
  return found || null;
}

function parseDuration(input) {
  if (!input) return null;
  const match = String(input)
    .toLowerCase()
    .match(/^(\d+)(s|sec|m|min|h|hr|d|day)$/);

  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "s" || unit === "sec") return amount * 1000;
  if (unit === "m" || unit === "min") return amount * 60 * 1000;
  if (unit === "h" || unit === "hr") return amount * 60 * 60 * 1000;
  if (unit === "d" || unit === "day") return amount * 24 * 60 * 60 * 1000;

  return null;
}

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBlacklistedWord(content, words) {
  const text = content.toLowerCase();
  for (const word of words) {
    const clean = String(word).toLowerCase().trim();
    if (!clean) continue;
    const letters = clean
      .split("")
      .map(escapeRegex)
      .join("[\\s._-]*");
    const regex = new RegExp(
      `(^|[^a-z0-9])${letters}([^a-z0-9]|$)`,
      "i"
    );
    if (regex.test(text)) return word;
  }

  const link = BLOCKED_LINKS.find(l => text.includes(l));
  if (link) return link;

  return null;
}

async function sendAutomodLog(message, word) {
  const log = await message.guild.channels
    .fetch(LOG_CHANNEL_ID)
    .catch(() => null);
  if (!log || !log.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setTitle("🚫 Blacklisted Message Deleted")
    .setColor(0xef4444)
    .addFields(
      { name: "User", value: `${message.author.tag}`, inline: true },
      { name: "Channel", value: `${message.channel}`, inline: true },
      { name: "Matched", value: `\`${word}\``, inline: true },
      { name: "Message", value: message.content.slice(0, 1000), inline: false }
    )
    .setTimestamp();
  await log.send({ embeds: [embed] }).catch(() => null);
}

async function sendModLog(embed) {
  const log = await client.channels
    .fetch(LOG_CHANNEL_ID)
    .catch(() => null);
  if (!log || !log.isTextBased()) return;

  await log.send({ embeds: [embed] }).catch(() => null);
}

const globalContexts = [
  InteractionContextType.Guild,
  InteractionContextType.BotDM,
  InteractionContextType.PrivateChannel
];

const globalIntegrationTypes = [
  ApplicationIntegrationType.GuildInstall,
  ApplicationIntegrationType.UserInstall
];

// ================= REGISTER SLASH COMMANDS =================
async function registerSlashCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("ping")
      .setDescription("Check latency")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("daily")
      .setDescription("Claim your daily reward")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("status")
      .setDescription("Check system health")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("snipe")
      .setDescription("View deleted messages")
      .setContexts(InteractionContextType.Guild)
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall),

    new SlashCommandBuilder()
      .setName("shop")
      .setDescription("Browse the ring shop and view item details")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("marry")
      .setDescription("Propose to another user with a ring")
      .addUserOption(opt => opt.setName("user").setDescription("User to marry").setRequired(true))
      .addStringOption(opt =>
        opt.setName("ring")
          .setDescription("Ring type to offer")
          .setRequired(false)
          .addChoices(
            { name: "🪵 Wooden Ring (5 DON)", value: "wood" },
            { name: "🍟 Plastic Onion Ring (150 DON)", value: "onion" },
            { name: "💻 Binary Code Band (Exclusive - Unc)", value: "code" },
            { name: "🚽 Skibidi Ring (10 DON)", value: "skibidi" },
            { name: "✨ Glow-in-the-Dark Ring (50,000 DON)", value: "glow" },
            { name: "🌌 Supernova Diamond Ring (1,000,000 DON)", value: "supernova" }
          )
      )
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("divorce")
      .setDescription("Divorce your current spouse")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("marriages")
      .setDescription("View all active marriages in the server")
      .addUserOption(opt => opt.setName("user").setDescription("Target user (leave empty for yourself)").setRequired(false))
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("adopt")
      .setDescription("Adopt or manage family members")
      .addUserOption(opt => opt.setName("child").setDescription("User to adopt").setRequired(false))
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("ship")
      .setDescription("Calculate compatibility between two users")
      .addUserOption(opt => opt.setName("first").setDescription("First user").setRequired(true))
      .addUserOption(opt => opt.setName("second").setDescription("Second user").setRequired(false))
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("8ball")
      .setDescription("Ask the magic 8-ball a question")
      .addStringOption(opt => opt.setName("question").setDescription("Your question").setRequired(true))
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("coinflip")
      .setDescription("Flip a coin (Heads or Tails)")
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("roll")
      .setDescription("Roll a random number (1-100 or custom max)")
      .addIntegerOption(opt => opt.setName("max").setDescription("Maximum number").setRequired(false))
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes),

    new SlashCommandBuilder()
      .setName("rps")
      .setDescription("Play Rock, Paper, Scissors")
      .addStringOption(opt =>
        opt.setName("choice")
          .setDescription("Your choice")
          .setRequired(true)
          .addChoices(
            { name: "🪨 Rock", value: "rock" },
            { name: "📄 Paper", value: "paper" },
            { name: "✂️ Scissors", value: "scissors" }
          )
      )
      .setContexts(globalContexts)
      .setIntegrationTypes(globalIntegrationTypes)
  ].map(command => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log("✅ Slash commands successfully registered.");
  } catch (error) {
    console.error("❌ Failed to register slash commands:", error);
  }
}

// ================= SNIPE =================
function saveSnipe(message) {
  const data = getGuildData(message.guild.id);

  if (!data.snipes) data.snipes = {};

  if (!data.snipes[message.channel.id]) {
    data.snipes[message.channel.id] = [];
  }

  data.snipes[message.channel.id].unshift({
    content: message.content || "*No text*",
    authorId: message.author.id,
    createdAt: message.createdTimestamp,
    deletedAt: Date.now()
  });

  data.snipes[message.channel.id] =
    data.snipes[message.channel.id].slice(0, 5);

  saveData();
}

// ================= STANDALONE PREFIX SHIP HANDLER =================
async function handleShipCommand(message, args) {
  let user1, user2;
  const mentions = message.mentions.users.first(2);

  if (mentions && mentions.length >= 2) {
    user1 = mentions[0];
    user2 = mentions[1];
  } else if (mentions && mentions.length === 1) {
    user1 = message.author;
    user2 = mentions[0];
  } else if (args.length >= 2) {
    const m1 = await findTargetMember(message, [args[0]]);
    const m2 = await findTargetMember(message, [args[1]]);
    user1 = m1 ? m1.user : message.author;
    user2 = m2 ? m2.user : null;
  } else if (args.length === 1) {
    const m1 = await findTargetMember(message, [args[0]]);
    user1 = message.author;
    user2 = m1 ? m1.user : null;
  }

  if (!user1 || !user2) {
    return message.reply("❌ Mention someone to ship! Example: `?ship @user`");
  }

  if (user1.id === user2.id) {
    return message.reply("❌ You can't ship someone with themselves!");
  }

  const id1 = BigInt(user1.id);
  const id2 = BigInt(user2.id);
  const combinedIds = id1 > id2 ? id1 + id2 : id2 + id1;
  const percentage = Number(combinedIds % 101n);

  const totalBlocks = 6;
  const filled = Math.round((percentage / 100) * totalBlocks);
  const bar = "💖".repeat(filled) + "🖤".repeat(totalBlocks - filled);

  let comment = "";
  let color = 0xff69b4;
  let imgUrl = "";

  if (percentage >= 85) {
    comment = "✨ **Soulmates!** Get married already! 💍";
    color = 0xff1493;
    imgUrl = "https://media.giphy.com/media/26hpKMT7M4iOtdaSc/giphy.gif";
  } else if (percentage >= 50) {
    comment = "👀 **Cute combo!** There's definitely a spark here.";
    color = 0xff69b4;
    imgUrl = "https://media.giphy.com/media/l41Jw7AedR39y4S40/giphy.gif";
  } else if (percentage >= 25) {
    comment = "😬 **Awkward...** Stick to sending memes in chat.";
    color = 0xffa500;
    imgUrl = "https://media.giphy.com/media/H5C8CevNMbpBqNqFjl/giphy.gif";
  } else {
    comment = "💀 **0% Chemistry.** Stay at least 50 feet apart!";
    color = 0x2f3136;
    imgUrl = "https://media.giphy.com/media/e2wFI0JGg6Tcg/giphy.gif";
  }

  const shipEmbed = new EmbedBuilder()
    .setColor(color)
    .setAuthor({ name: "💘 Compatibility Check" })
    .setDescription(
      `**${user1.username}**  ×  **${user2.username}**\n` +
      `**${percentage}%** \`${bar}\`\n\n` +
      `${comment}`
    )
    .setThumbnail(imgUrl)
    .setFooter({ 
      text: `Shipped by ${message.author.username}`, 
      iconURL: message.author.displayAvatarURL({ dynamic: true }) 
    });

  return message.channel.send({ embeds: [shipEmbed] });
}

// ================= COMMANDS =================
async function handleCommands(message, getGuildData) {
  const data = getGuildData(message.guild.id);
  const prefix = data.prefix || DEFAULT_PREFIX;
  if (!message.content.startsWith(prefix)) return false;

  const args = message.content.slice(prefix.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();
  if (!command) return true;

  const funCommandsList = [
    "ship", "shop", "store", "marketplace", "8ball", "coinflip", "flip", 
    "roll", "rps", "marry", "divorce", "marriage", "marriages", 
    "adopt", "disown", "family", "children", "parents", "daily",
    "poll", "vote", "voting"
  ];

  if (funCommandsList.includes(command)) {
    if (!canUseFunCommand(message)) {
      const reply = await message.reply(`❌ You can only use fun commands inside <#${BDAY_COMMAND_CHANNEL_ID}>!`);
      deleteAfter(reply, 5000);
      deleteAfter(message, 5000);
      return true;
    }
  }

  if (command === "daily") {
    const userId = message.author.id;
    
    if (!data.economy) data.economy = {};
    if (!data.economy[userId]) {
      data.economy[userId] = { balance: 0, coins: 0, lastDaily: 0 };
    }

    const userData = data.economy[userId];
    const cooldownTime = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const timeLeft = cooldownTime - (now - userData.lastDaily);

    if (timeLeft > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      return message.reply(`⏱️ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**.`);
    }

    let isMarried = false;
    let ringType = "None";
    let rewardAmount = 0.5;

    if (data.marriages) {
      for (const marriage of Object.values(data.marriages)) {
        if (marriage.partners && marriage.partners.includes(userId)) {
          isMarried = true;
          ringType = marriage.ring || "Standard Ring";
          rewardAmount = 1.0; 
          break;
        }
      }
    }

    userData.balance += rewardAmount;
    userData.coins = (userData.coins || 0) + rewardAmount;
    userData.lastDaily = now;
    saveData();

    const embed = new EmbedBuilder()
      .setTitle("🎁 Daily Reward Claimed!")
      .setDescription(`You successfully collected your daily reward of **${rewardAmount} DON**!${isMarried ? `\n💍 *Marriage Bonus Active* (Ring: **${ringType}**) ✨` : ""}`)
      .setColor(0x57F287)
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  if (command === "shop" || command === "store" || command === "marketplace") {
    if (shopCommand && typeof shopCommand.execute === "function") {
      return shopCommand.execute(message, args, prefix, getGuildData, saveData);
    }
  }

  if (command === "poll" || command === "vote" || command === "voting") {
    if (pollCommand && typeof pollCommand.execute === "function") {
      return pollCommand.execute(message, args, prefix, getGuildData, saveData);
    }
  }

  if (command === "ship") {
    return handleShipCommand(message, args);
  }

  if (command === "8ball") {
    const question = args.join(" ");
    if (!question) return message.reply("🔮 Please ask a question! Example: `?8ball Will today be a great day?`");
    const answers = [
      "🎱 It is certain.", "🎱 It is decidedly so.", "🎱 Without a doubt.",
      "🎱 Yes - definitely.", "🎱 You may rely on it.", "🎱 As I see it, yes.",
      "🎱 Most likely.", "🎱 Outlook good.", "🎱 Yes.", "🎱 Signs point to yes.",
      "🎱 Reply hazy, try again.", "🎱 Ask again later.", "🎱 Better not tell you now.",
      "🎱 Cannot predict now.", "🎱 Concentrate and ask again.",
      "🎱 Don't count on it.", "🎱 My reply is no.", "🎱 My sources say no.",
      "🎱 Outlook not so good.", "🎱 Very doubtful."
    ];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    return message.reply(`🔮 **Question:** ${question}\n${answer}`);
  }

  if (command === "coinflip" || command === "flip") {
    const result = Math.random() < 0.5 ? "🪙 Heads!" : "🪙 Tails!";
    return message.reply(`The coin landed on **${result}**`);
  }

  if (command === "roll") {
    let max = parseInt(args[0], 10) || 100;
    if (max < 1) max = 100;
    const rolled = Math.floor(Math.random() * max) + 1;
    return message.reply(`🎲 You rolled a **${rolled}** (1-${max})`);
  }

  if (command === "rps") {
    const choices = ["rock", "paper", "scissors"];
    const userChoice = args[0]?.toLowerCase();
    if (!choices.includes(userChoice)) {
      return message.reply("✂️ Please choose: `rock`, `paper`, or `scissors`. Example: `?rps rock`");
    }
    const botChoice = choices[Math.floor(Math.random() * choices.length)];
    let outcome = "";
    if (userChoice === botChoice) outcome = "It's a tie! 🤝";
    else if (
      (userChoice === "rock" && botChoice === "scissors") ||
      (userChoice === "paper" && botChoice === "rock") ||
      (userChoice === "scissors" && botChoice === "paper")
    ) outcome = "You win! 🎉";
    else outcome = "I win! 😈";

    return message.reply(`🎮 You chose **${userChoice}**, I chose **${botChoice}**. ${outcome}`);
  }

  if (
    command === "marry" ||
    command === "divorce" ||
    command === "marriage" ||
    command === "marriages"
  ) {
    if (marriageCommand && typeof marriageCommand.execute === "function") {
      return marriageCommand.execute(message, [command, ...args], prefix, getGuildData, saveData);
    }
  }

  if (
    command === "adopt" ||
    command === "disown" ||
    command === "family" ||
    command === "children" ||
    command === "parents"
  ) {
    if (adoptionCommand && typeof adoptionCommand.execute === "function") {
      return adoptionCommand.execute(message, [command, ...args], prefix, getGuildData, saveData);
    }
  }

  if (data.customCommands?.[command]) {
    const custom = data.customCommands[command];

    if (typeof custom === "object" && custom.ai === true) {
      let aiReply = await generateAiReply(message, message.content).catch(() => null);
      if (!aiReply) return message.reply("AI unavailable.");
      return message.channel.send(aiReply);
    }

    if (typeof custom === "object" && custom.embeds && custom.embeds.length > 0) {
      return message.channel.send({ embeds: custom.embeds });
    }

    if (typeof custom === "object" && custom.type === "embed") {
      const embed = new EmbedBuilder()
        .setTitle(custom.title || "Embed")
        .setDescription(custom.description || "")
        .setColor(custom.color ? parseInt(custom.color.replace("#", ""), 16) : 0x5865f2);

      if (custom.url) embed.setURL(custom.url);
      return message.channel.send({ embeds: [embed] });
    }

    const response = typeof custom === "string" ? custom : custom.response || "No response set.";
    return message.channel.send({
      content: response,
      allowedMentions: custom.allowPings ? { parse: ["users", "roles"] } : { parse: [] }
    });
  }

  if (command === "roleicon") {
    return roleIconCommand.execute(message, args);
  }

  if (command === "rolecreate") {
    return roleCreateCommand.execute(message, args);
  }

  if (command === "rename") {
    if (!ALLOWED_RENAME_CATEGORIES.includes(message.channel.parentId)) {
      const reply = await message.reply("❌ The rename command can only be used inside Support, Purchases, or Claim ticket categories.");
      deleteAfter(reply, 5000);
      deleteAfter(message, 5000);
      return true;
    }

    const botReply = await renameCommand.execute(message, args);
    deleteAfter(message, 5000);
    if (botReply && typeof botReply.delete === "function") {
      deleteAfter(botReply, 5000);
    }
    return true;
  }

  if (command === "bday" || command === "birthday") {
    if (message.channel.id !== BDAY_COMMAND_CHANNEL_ID && !canManageGuild(message)) {
      const reply = await message.reply(`❌ You can only use birthday commands inside <#${BDAY_COMMAND_CHANNEL_ID}>!`);
      deleteAfter(reply, 5000);
      deleteAfter(message, 5000);
      return true;
    }
    return handleBirthdayCommand(message, args, prefix, getGuildData, saveData);
  }

  if (command === "status") {
    const statusCmd = require("./commands/status.js");
    return statusCmd.execute(message, args, client, getGuildData);
  }

  if (command === "joininfo") {
    const joinInfoCmd = require("./commands/joininfo.js");
    return joinInfoCmd.execute(message, args, client, getGuildData);
  }

  if (command === "tz" || command === "timezone") {
    const tzCmd = require("./commands/tz.js");
    return tzCmd.execute(message, args, client, getGuildData, saveData);
  }

  if (command === "timer") {
    return handleTimerCommand(message, args);
  }
  if (command === "slowmode") {
    return handleChannelToolsCommand(message, args, prefix, command, canManageGuild);
  }
  if (command === "purchase" || command === "buy") {
    return handlePurchaseCommand(message);
  }
  if (command === "purchedit" || command === "editpurch") {
    return handlePurchEditCommand(message, args);
  }
  if (command === "afk") {
    return handleAfkCommand(message, args, prefix, getGuildData, saveData);
  }
  if (command === "auction") return handleAuctionCommand(message, args, prefix);
  if (command === "bid") return handleAuctionCommand(["bid", ...args], prefix);
  
  if (command === "modlogs") {
    return handleModLogsCommand(message, args, prefix, getGuildData);
  }

  if (command === "verify") {
    return handleVerifyCommand(message, args, prefix, getGuildData, saveData);
  }
  
  if (command === "ping") {
    const msg = await message.reply("🏓 Pinging...").catch(() => null);
    if (!msg) return true;

    const latency = msg.createdTimestamp - message.createdTimestamp;
    const api = Math.round(client.ws.ping);
    return msg.edit(`🏓 Pong!\n📨 Message: \`${latency}ms\`\n🌐 API: \`${api}ms\``).catch(() => null);
  }

  if (command === "translate") {
    return handleTranslateCommand(message, args);
  }

  if (command === "prefix") {
    return message.reply(`Current prefix: \`${prefix}\``);
  }

  if (command === "setprefix") {
    if (!canBanUsers(message)) {
      return message.reply("❌ Only admin+ can change prefix.");
    }
    const newPrefix = args[0];
    if (!newPrefix || newPrefix.length > 3) {
      return message.reply(`Usage: \`${prefix}setprefix ?\``);
    }
    data.prefix = newPrefix;
    saveData();
    return message.reply(`✅ Prefix updated to \`${newPrefix}\``);
  }

  if (command === "staffguide" || command === "staffguidedit") {
    const staffGuideCmd = require("./commands/staffguide.js");
    return staffGuideCmd.execute(message, args);
  }
  
  if (command === "customcolor" || command === "color") {
    return customColorCommand.execute(message);
  }

  if (command === "warn") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}warn @user reason\``);

    const reason = args.slice(1).join(" ") || "No reason";
    const warnId = Date.now().toString();

    if (!data.warnings[member.id]) data.warnings[member.id] = [];
    data.warnings[member.id].push({
      id: warnId,
      reason,
      mod: message.author.id,
      date: new Date().toISOString()
    });

    if (!data.modLogs) data.modLogs = [];
    data.modLogs.unshift({
      type: "WARN",
      modId: message.author.id,
      userId: member.id,
      reason: reason,
      date: new Date().toISOString()
    });

    if (!data.modStats[message.author.id]) {
      data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
    }
    data.modStats[message.author.id].warns++;
    saveData();

    const embed = new EmbedBuilder()
      .setTitle("⚠️ User Warned")
      .setColor(0xf59e0b)
      .addFields(
        { name: "User", value: `${member.user.tag}`, inline: true },
        { name: "Moderator", value: `${message.author.tag}`, inline: true },
        { name: "Reason", value: reason, inline: false },
        { name: "Warn ID", value: `\`${warnId}\``, inline: true }
      )
      .setTimestamp();
    await sendModLog(embed);
    await member.send({ embeds: [embed] }).catch(() => null);

    return message.reply(`✅ Warned ${member.user.tag}\nWarn ID: \`${warnId}\``);
  }

  if (command === "warnings") {
    const member = await findTargetMember(message, args) || message.member;
    const warnings = data.warnings[member.id] || [];

    if (!warnings.length) return message.reply(`${member.user.tag} has no warnings.`);

    const perPage = 5;
    const totalPages = Math.ceil(warnings.length / perPage);
    let currentPage = 0;

    const generateWarningEmbed = (page) => {
      const start = page * perPage;
      const current = warnings.slice(start, start + perPage);

      const description = current
        .map((w, i) => {
          const unixTime = w.date ? Math.floor(new Date(w.date).getTime() / 1000) : null;
          const timeString = unixTime ? ` • <t:${unixTime}:R>` : "";
          return `**#${start + i + 1}** ID: \`${w.id}\`${timeString} • By: <@${w.mod}>\n└ **Reason:** ${w.reason}`;
        })
        .join("\n\n");

      return new EmbedBuilder()
        .setTitle(`⚠️ Warnings Record • ${member.user.tag}`)
        .setColor(0xf59e0b)
        .setDescription(description || "*No warnings on this page.*")
        .setFooter({ text: `Page ${page + 1}/${totalPages} • Total Logs: ${warnings.length}\n💡 Tip: You can type a page number directly to jump!` });
    };

    const generateWarningButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prev_warn_page").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("next_warn_page").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
      );
    };

    const embedMessage = await message.reply({
      embeds: [generateWarningEmbed(currentPage)],
      components: totalPages > 1 ? [generateWarningButtons(currentPage)] : []
    });

    if (totalPages > 1) {
      const buttonCollector = embedMessage.createMessageComponentCollector({ filter: (i) => i.user.id === message.author.id, time: 90000 });
      const textCollector = message.channel.createMessageCollector({ filter: (m) => m.author.id === message.author.id && /^\d+$/.test(m.content.trim()), time: 90000 });

      buttonCollector.on("collect", async (interaction) => {
        if (interaction.customId === "prev_warn_page") currentPage--;
        else if (interaction.customId === "next_warn_page") currentPage++;
        await interaction.update({ embeds: [generateWarningEmbed(currentPage)], components: [generateWarningButtons(currentPage)] });
      });

      textCollector.on("collect", async (msg) => {
        const targetPage = parseInt(msg.content.trim(), 10);
        msg.delete().catch(() => null);

        if (targetPage >= 1 && targetPage <= totalPages) {
          currentPage = targetPage - 1;
          await embedMessage.edit({ embeds: [generateWarningEmbed(currentPage)], components: [generateWarningButtons(currentPage)] }).catch(() => null);
        }
      });

      buttonCollector.on("end", () => {
        textCollector.stop();
        const disabledRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_warn_page").setLabel("⬅️").setStyle(ButtonStyle.Primary).setDisabled(true),
          new ButtonBuilder().setCustomId("next_warn_page").setLabel("➡️").setStyle(ButtonStyle.Primary).setDisabled(true)
        );
        embedMessage.edit({ components: [disabledRow] }).catch(() => null);
      });
    }
    return true;
  }

  if (command === "unwarn") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    const warnId = args[1];

    if (!member || !warnId) return message.reply(`Usage: \`${prefix}unwarn @user warnId\``);
    const warnings = data.warnings[member.id] || [];
    const before = warnings.length;

    data.warnings[member.id] = warnings.filter(w => w.id !== warnId);
    saveData();
    if (before === data.warnings[member.id].length) return message.reply("❌ Warn ID not found.");
    return message.reply(`✅ Removed warning \`${warnId}\` from ${member.user.tag}`);
  }

  if (command === "setnick") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return message.reply("❌ I need Manage Nicknames permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``);

    const newNick = args.slice(1).join(" ").trim();
    if (!newNick) return message.reply(`Usage: \`${prefix}setnick @user new nickname\``);
    if (newNick.length > 32) return message.reply("❌ Nickname max length is 32 characters.");

    try {
      await member.setNickname(newNick, `Changed by ${message.author.tag}`);
      const embed = new EmbedBuilder()
        .setTitle("✏️ Nickname Changed")
        .setColor(0x5865f2)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "New Nickname", value: newNick, inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);
      return message.reply(`✅ Changed nickname for ${member.user.tag} to **${newNick}**`);
    } catch (err) {
      console.error("Setnick error:", err);
      return message.reply("❌ I cannot change that nickname. Check role hierarchy permissions.");
    }
  }

  if (command === "mute" || command === "timeout") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply("❌ I need Moderate Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}mute @user 10m [reason]\``);
    const durationText = args[1];
    const durationMs = parseDuration(durationText);

    if (!durationMs) return message.reply("❌ Use time values like `10s`, `5m`, `2h`, `1d`.");
    if (durationMs > 14 * 24 * 60 * 60 * 1000) return message.reply("❌ Maximum timeout length is 14 days.");
    const reason = args.slice(2).join(" ") || "No reason specified";

    try {
      await member.timeout(durationMs, reason);
      
      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].mutes++;
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🔇 User Muted")
        .setColor(0x3b82f6)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Duration", value: durationText, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);
      return message.reply(`🔇 **Muted** ${member.user.tag} for ${durationText} | Reason: *${reason}*`);
    } catch (err) {
      console.error("Mute error:", err);
      return message.reply("❌ Failed to mute user. Their role level may be higher than mine.");
    }
  }

  if (command === "unmute") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}unmute @user\``);

    try {
      if (!member.communicationDisabledUntilTimestamp) {
        return message.reply(`ℹ️ **${member.user.tag}** is not currently muted.`);
      }

      await member.timeout(null);
      return message.reply(`🔊 **Unmuted** ${member.user.tag}`);
    } catch (err) {
      console.error("Unmute error:", err);
      return message.reply("❌ Failed to remove timeout from member.");
    }
  }

  if (command === "kick") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply("❌ I need Kick Members permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}kick @user [reason]\``);
    if (member.id === message.author.id || member.id === message.guild.ownerId || isStaffMember(member) || !member.kickable) {
      return message.reply("❌ I cannot kick this user. They are staff or hold a higher role.");
    }

    const reason = args.slice(1).join(" ") || "No reason specified";

    try {
      const embed = new EmbedBuilder()
        .setTitle("👢 User Kicked")
        .setColor(0xef4444)
        .addFields(
          { name: "User", value: `${member.user.tag}`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false }
        )
        .setTimestamp();
      
      await member.send({ embeds: [embed] }).catch(() => null);
      await member.kick(reason);

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].kicks++;
      saveData();
      await sendModLog(embed);

      return message.reply(`👢 **Kicked** ${member.user.tag}`);
    } catch (err) {
      console.error("Kick error:", err);
      return message.reply("❌ A structural error occurred while executing the kick.");
    }
  }

  if (command === "ban") {
    const { PermissionFlagsBits } = require("discord.js");
    
    const isCustomMod = typeof canBanUsers === "function" && canBanUsers(message);
    const isHardAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isCustomMod && !isHardAdmin) {
      return message.reply("❌ Only admin+ can ban.");
    }
    
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}ban @user [reason]\``);
    if (!member.bannable) return message.reply("❌ I cannot ban this member (higher roles or missing permissions).");

    const reason = args.slice(1).join(" ") || "No reason specified";

    try {
      await member.ban({ 
        deleteMessageSeconds: 604800, 
        reason: reason 
      });

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].bans++;
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🔨 Member Banned & Cleared")
        .setColor(0xef4444)
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Action Taken", value: "Banned permanently + 7 days of message history deleted.", inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);

      return message.reply(`🔨 **Banned** ${member.user.tag} and wiped their recent messages.`);
    } catch (err) {
      console.error("Ban error:", err);
      return message.reply("❌ Failed to process server ban configuration.");
    }
  }

  if (command === "softban") {
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can softban.");
    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}softban @user [reason]\``);
    if (!member.bannable) return message.reply("❌ I cannot softban this member.");

    const reason = args.slice(1).join(" ") || "Raid/Spam cleanup";

    try {
      await member.ban({ 
        deleteMessageSeconds: 604800, 
        reason: `[Softban] ${reason}` 
      });
      await message.guild.members.unban(member.id, "Softban completion (unban)").catch(() => null);

      if (!data.modStats[message.author.id]) {
        data.modStats[message.author.id] = { warns: 0, mutes: 0, kicks: 0, bans: 0 };
      }
      data.modStats[message.author.id].kicks++; 
      saveData();

      const embed = new EmbedBuilder()
        .setTitle("🛡️ Member Softbanned")
        .setColor(0x3b82f6)
        .addFields(
          { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
          { name: "Moderator", value: `${message.author.tag}`, inline: true },
          { name: "Reason", value: reason, inline: false },
          { name: "Action Taken", value: "Kicked from server + 7 days of message history wiped.", inline: false }
        )
        .setTimestamp();
      await sendModLog(embed);

      return message.reply(`🛡️ **Softbanned** ${member.user.tag} (Messages wiped, user kicked).`);
    } catch (err) {
      console.error("Softban error:", err);
      return message.reply("❌ Failed to finish target account softban.");
    }
  }

  if (command === "unban") {
    if (!canBanUsers(message)) return message.reply("❌ Only admin+ can unban.");
    const userId = args[0];
    if (!userId) return message.reply(`Usage: \`${prefix}unban USER_ID [reason]\``);

    const reason = args.slice(1).join(" ") || "No reason specified";
    try {
      await message.guild.members.unban(userId, reason);
      return message.reply(`✅ Successfully unbanned \`${userId}\``);
    } catch (err) {
      console.error("UNBAN ERROR:", err);
      return message.reply(`❌ Failed to unban user ID.\n\`${err.message}\``);
    }
  }

  if (command === "purge") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ I need Manage Messages permission.");
    }

    if (!args[0]) {
      const helpReply = await message.reply(
        `💡 **Usage:**\n` +
        `• \`${prefix}purge [1-100]\` — Delete recent messages\n` +
        `• \`${prefix}purge @user [1-100]\` — Delete messages from a specific user\n` +
        `• \`${prefix}purge bots [1-100]\` — Delete messages sent by bots\n` +
        `• \`${prefix}purge links [1-100]\` — Delete messages containing links`
      );
      deleteAfter(message, 5000);
      deleteAfter(helpReply, 5000);
      return true;
    }

    await message.delete().catch(() => null);

    let targetMember = null;
    let targetType = "all";
    let amountInput = null;

    if (!isNaN(args[0])) {
      amountInput = args[0];
      targetType = "all";
    } else if (["bot", "bots"].includes(args[0].toLowerCase())) {
      targetType = "bots";
      amountInput = args[1];
    } else if (["link", "links", "url"].includes(args[0].toLowerCase())) {
      targetType = "links";
      amountInput = args[1];
    } else {
      targetMember = await findTargetMember(message, args).catch(() => null);
      if (targetMember) {
        targetType = "user";
        amountInput = args[1];
      } else {
        const errReply = await message.channel.send(`❌ Invalid usage! Please provide a valid number, user, or filter.`);
        return deleteAfter(errReply, 5000);
      }
    }

    const amount = parseInt(amountInput, 10);
    if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
      const errReply = await message.channel.send(`❌ Please specify a valid number between 1 and 100.`);
      return deleteAfter(errReply, 5000);
    }

    try {
      const fetched = await message.channel.messages.fetch({ limit: 100 });
      let messagesToDelete = [];

      if (targetType === "user" && targetMember) {
        messagesToDelete = fetched.filter(m => m.author.id === targetMember.id).first(amount);
      } else if (targetType === "bots") {
        messagesToDelete = fetched.filter(m => m.author.bot).first(amount);
      } else if (targetType === "links") {
        const linkRegex = /(https?:\/\/[^\s]+)/gi;
        messagesToDelete = fetched.filter(m => linkRegex.test(m.content)).first(amount);
      } else {
        messagesToDelete = fetched.first(amount);
      }

      const targetArray = Array.from(messagesToDelete.values ? messagesToDelete.values() : messagesToDelete);

      if (!targetArray || targetArray.length === 0) {
        const errReply = await message.channel.send("❌ No matching messages found or they are older than 14 days.");
        return deleteAfter(errReply, 5000);
      }

      const deleted = await message.channel.bulkDelete(targetArray, true).catch((err) => {
        console.error("Bulk delete execution error:", err);
        return null;
      });

      if (!deleted || deleted.size === 0) {
        const errReply = await message.channel.send("❌ Could not delete messages. They might be older than 14 days.");
        return deleteAfter(errReply, 5000);
      }

      let label = "**all** messages";
      if (targetType === "user" && targetMember) label = `messages from ${targetMember.user.tag}`;
      if (targetType === "bots") label = "bot messages";
      if (targetType === "links") label = "messages containing links";

      const successReply = await message.channel.send(`✅ Successfully purged **${deleted.size}** ${label}.`);
      deleteAfter(successReply, 5000);
      return true;

    } catch (err) {
      console.error("Purge Error:", err);
      const errReply = await message.channel.send("❌ An error occurred while purging messages.");
      return deleteAfter(errReply, 5000);
    }
  }
  
  if (command === "temprole") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply("❌ I need Manage Roles permission.");
    }

    const member = await findTargetMember(message, args);
    if (!member) return message.reply(`Usage: \`${prefix}temprole @user [duration] [role name]\` (e.g., \`${prefix}temprole @user 7d Premium\`)`);

    const durationText = args[1];
    const durationMs = parseDuration(durationText);
    if (!durationMs) return message.reply("❌ Invalid duration format. Use formatting like `1h`, `12h`, `3d`, or `7d`.");

    const roleQuery = args.slice(2).join(" ").trim();
    if (!roleQuery) return message.reply("❌ Please specify the role name or ID to grant.");

    const role = message.guild.roles.cache.find(r => r.id === roleQuery || r.name.toLowerCase() === roleQuery.toLowerCase());
    if (!role) return message.reply(`❌ Could not find a role matching \`${roleQuery}\`.`);
    if (role.managed) return message.reply("❌ I cannot manage an integration role.");
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return message.reply("❌ That role is higher than or equal to my highest role.");
    }
    if (role.position >= message.member.roles.highest.position) {
      return message.reply("❌ You cannot give a role equal to or higher than your highest role.");
    }

    try {
      await member.roles.add(role, `Temp role assigned by ${message.author.tag} for ${durationText}`);

      const expiryTimestamp = Date.now() + durationMs;
      
      data.tempRoles = data.tempRoles.filter(r => !(r.userId === member.id && r.roleId === role.id));
      
      data.tempRoles.push({
        userId: member.id,
        roleId: role.id,
        expiry: expiryTimestamp
      });
      saveData();

      return message.reply(`⏳ Added temporary role **${role.name}** to ${member.user.tag} for **${durationText}** (No Pings).`);
    } catch (err) {
      console.error(err);
      return message.reply("❌ Failed to assign temporary role configuration.");
    }
  }

  if (command === "bl" || command === "blacklist") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const word = args.join(" ").trim().toLowerCase();
    if (!word) return message.reply(`Usage: \`${prefix}bl word\``);
    if (CORE_BLACKLIST.includes(word) || data.words.includes(word)) {
      return message.reply(`⚠️ \`${word}\` is already blacklisted.`);
    }

    data.words.push(word);
    saveData();
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚫 Word Blacklisted")
          .setColor(0xef4444)
          .setDescription(`Added \`${word}\` to the blacklist.`)
          .setFooter({ text: "AutoMod updated" })
          .setTimestamp()
      ]
    });
  }

  if (command === "unbl" || command === "unblacklist") {
    if (!canManageGuild(message)) return message.reply("❌ No permission.");
    const word = args.join(" ").trim().toLowerCase();
    if (!word) return message.reply(`Usage: \`${prefix}unbl word\``);
    if (CORE_BLACKLIST.includes(word)) {
      return message.reply(`❌ \`${word}\` is protected and cannot be removed.`);
    }

    const before = data.words.length;
    data.words = data.words.filter(w => w !== word);
    saveData();

    if (before === data.words.length) {
      return message.reply(`⚠️ \`${word}\` was not found in blacklist.`);
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("✅ Word Removed")
          .setColor(0x22c55e)
          .setDescription(`Removed \`${word}\` from the blacklist.`)
          .setFooter({ text: "AutoMod updated" })
          .setTimestamp()
      ]
    });
  }

  // ================= AUTORESPONDER INTEGRATION =================
  if (command === "ar" || command === "autoresponder" || command === "autoresp") {
    const arCommand = require("./commands/ar.js");
    if (arCommand && typeof arCommand.execute === "function") {
      return arCommand.execute(message, args, prefix, getGuildData, saveData);
    }
  }

  if (command === "words") {
    const allWords = [...new Set([...CORE_BLACKLIST, ...data.words])];
    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🚫 Blacklisted Words")
          .setColor(0x5865f2)
          .setDescription(allWords.map(w => `\`${w}\``).join(", ").slice(0, 4000))
          .setFooter({ text: `${allWords.length} word(s) blocked` })
      ]
    });
  }

  if (command === "modstats") {
    const member = (await findTargetMember(message, args)) || message.member;
    const stats = data.modStats[member.id] || { warns: 0, mutes: 0, kicks: 0, bans: 0 };
    const embed = new EmbedBuilder()
      .setTitle(`📊 Mod Stats • ${member.user.tag}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "⚠️ Warns", value: String(stats.warns || 0), inline: true },
        { name: "🔇 Mutes", value: String(stats.mutes || 0), inline: true },
        { name: "👢 Kicks", value: String(stats.kicks || 0), inline: true },
        { name: "🔨 Bans", value: String(stats.bans || 0), inline: true }
      )
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  }

  if (command === "snipe") {
    if (args[0]?.toLowerCase() === "on") {
      if (!canManageGuild(message)) return message.reply("❌ No permission.");
      data.snipeEnabled = true;
      saveData();
      return message.reply("✅ Snipe logging enabled for this server.");
    }

    if (args[0]?.toLowerCase() === "off") {
      if (!canManageGuild(message)) return message.reply("❌ No permission.");
      data.snipeEnabled = false;
      saveData();
      return message.reply("❌ Snipe logging disabled.");
    }

    if (!data.snipeEnabled) {
      return message.reply("❌ Snipe is currently disabled on this server.");
    }

    const currentChannelSnipes = data.snipes?.[message.channel.id];

    if (!currentChannelSnipes || !currentChannelSnipes.length) {
      return message.reply(`ℹ️ There are no recently deleted messages logged in <#${message.channel.id}>.`);
    }

    const index = parseInt(args[0], 10) || 1;
    const snipe = currentChannelSnipes[index - 1];

    if (!snipe) {
      return message.reply(`⚠️ Only ${currentChannelSnipes.length} deleted message(s) stored for <#${message.channel.id}>.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📌 Sniped Message #${index} in #${message.channel.name}`)
      .setColor(0x5865f2)
      .addFields(
        { name: "Author", value: `<@${snipe.authorId}>`, inline: true },
        { name: "Deleted", value: `<t:${Math.floor(snipe.deletedAt / 1000)}:R>`, inline: true },
        { name: "Message Content", value: snipe.content.slice(0, 1024) }
      )
      .setFooter({ text: `Showing ${index}/${currentChannelSnipes.length} stored snipes for this channel` });

    return message.reply({ embeds: [embed] });
  }

  if (command === "snipes") {
    if (!data.snipeEnabled) {
      return message.reply("❌ Snipe is currently disabled.");
    }

    const currentChannelSnipes = data.snipes?.[message.channel.id];

    if (!currentChannelSnipes || !currentChannelSnipes.length) {
      return message.reply(`ℹ️ There are no recently deleted messages logged in <#${message.channel.id}>.`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📌 Recent Deleted Messages in #${message.channel.name}`)
      .setColor(0x5865f2)
      .setDescription(
        currentChannelSnipes
          .slice(0, 5)
          .map((s, i) => `**${i + 1}.** <@${s.authorId}> • <t:${Math.floor(s.deletedAt / 1000)}:R>\n└ ${s.content}`)
          .join("\n\n")
      )
      .setFooter({ text: `${currentChannelSnipes.length} deleted message(s) logged for this channel` });

    return message.reply({ embeds: [embed] });
  }

  if (command === "help") {
    if (!canManageGuild(message)) {
      const reply = await message.reply("❌ The help command is restricted to server staff.");
      deleteAfter(reply, 5000);
      deleteAfter(message, 5000);
      return true;
    }

    const totalCustomCmds = data.customCommands ? Object.keys(data.customCommands).length : 0;

    const pageOverview = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🔥 Don Don Command Center")
      .setDescription(
        `Welcome to the **Don Don** server management bot!\n` +
        `Current Prefix: \`${prefix}\`\n\n` +
        `Use the buttons below to browse commands by category:`
      )
      .addFields(
        { name: "🛡️ Moderation & AutoMod", value: "Warnings, mutes, kicks, bans, blacklists, and staff guides.", inline: true },
        { name: "🔒 Advanced Security", value: "Verification settings, member scans, and trust filters.", inline: true },
        { name: "⚙️ Server & Utility", value: "Roles, tickets, channel tools, auto-responders, AFK, and analytics.", inline: true },
        { name: "🎮 Fun & Games", value: "Marriage, adoption, polls, ships, mini-games, AI, and personalization.", inline: true }
      )
      .setFooter({ text: "Page 1/6 • Don Don Operations" })
      .setTimestamp();

    const pageMod = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🛡️ Moderation & AutoMod Commands")
      .setDescription(`Commands reserved for staff and moderators. Prefix: \`${prefix}\``)
      .addFields(
        {
          name: "🔨 Punishments & Logs",
          value:
            `• \`${prefix}warn @user [reason]\` — Issue a warning\n` +
            `• \`${prefix}warnings [@user]\` — View warn history\n` +
            `• \`${prefix}unwarn @user [id]\` — Clear warning\n` +
            `• \`${prefix}mute @user [time] [reason]\` — Timeout user\n` +
            `• \`${prefix}unmute @user\` — Remove timeout\n` +
            `• \`${prefix}kick @user [reason]\` — Kick member\n` +
            `• \`${prefix}ban @user [reason]\` — Ban member & purge msgs\n` +
            `• \`${prefix}softban @user [reason]\` — Kick & wipe 7d msgs\n` +
            `• \`${prefix}unban [user_id]\` — Unban user ID`
        },
        {
          name: "🚫 Chat & Blacklist",
          value:
            `• \`${prefix}purge [1-100]\` — Bulk delete (supports \`@user\`, \`bots\`, \`links\`)\n` +
            `• \`${prefix}bl [word]\` / \`${prefix}unbl [word]\` — Manage blacklist\n` +
            `• \`${prefix}words\` — List blacklisted words\n` +
            `• \`${prefix}modstats [@staff]\` — View moderator activity\n` +
            `• \`${prefix}modlogs [@user]\` — Check recent moderation entries\n` +
            `• \`${prefix}staffguide\` / \`${prefix}staffguidedit\` — Usage guide setup`
        }
      )
      .setFooter({ text: "Page 2/5 • Moderation" })
      .setTimestamp();

    const pageSecurity = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🔒 Advanced Verification & Security")
      .setDescription(`Configure server verification and anti-raid parameters. Prefix: \`${prefix}\``)
      .addFields({
        name: "🛡️ Verification Controls",
        value:
          `• \`${prefix}verify settings\` — Check current security setup\n` +
          `• \`${prefix}verify scan @user\` — Scan account risk score\n` +
          `• \`${prefix}verify massscan\` — Scan all unverified members\n` +
          `• \`${prefix}verify verifiedrole [role]\` — Set verified role\n` +
          `• \`${prefix}verify unverifiedrole [role]\` — Set unverified role\n` +
          `• \`${prefix}verify trusteddays [days]\` — Set minimum account age threshold\n` +
          `• \`${prefix}verify autoban [on/off]\` — Toggle auto-ban on join\n` +
          `• \`${prefix}verify autokick [on/off]\` — Toggle auto-kick on join`
      })
      .setFooter({ text: "Page 3/5 • Security" })
      .setTimestamp();

    const pageUtility = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("⚙️ Utility, Roles & Tools")
      .setDescription(`General tools, administration, and member commands. Prefix: \`${prefix}\``)
      .addFields(
        {
          name: "👤 Role & Channel Management",
          value:
            `• \`${prefix}role @user [role]\` — Toggle user role\n` +
            `• \`${prefix}temprole @user [time] [role]\` — Give temporary role\n` +
            `• \`${prefix}rolecreate [name] [hex]\` — Create a new role\n` +
            `• \`${prefix}roleicon @role [icon]\` — Set custom role icon\n` +
            `• \`${prefix}rename [new-name]\` — Rename ticket channels\n` +
            `• \`${prefix}setnick @user [nick]\` — Change server nickname`
        },
        {
          name: "🤖 Autoresponders & Triggers",
          value:
            `• \`${prefix}ar add "trigger phrase" [response]\` — Add response (supports emojis/GIFs!)\n` +
            `• \`${prefix}ar remove [trigger]\` — Delete an auto-response\n` +
            `• \`${prefix}ar list\` — View all server auto-responses`
        },
        {
          name: "🌐 Tools & System",
          value:
            `• \`${prefix}joininfo [@user]\` — View join rank & milestone analytics\n` +
            `• \`${prefix}afk [reason]\` / \`${prefix}afk global\` — Set AFK status\n` +
            `• \`${prefix}translate [lang] [text]\` — Translate message\n` +
            `• \`${prefix}timer [time] [label]\` — Set countdown timer\n` +
            `• \`${prefix}birthday\` / \`${prefix}bday\` — Set birthday (\`#commands\` only)\n` +
            `• \`${prefix}snipe\` / \`${prefix}snipes\` — View deleted messages\n` +
            `• \`${prefix}slowmode [time]\` — Channel slowmode control\n` +
            `• \`${prefix}status\` / \`${prefix}ping\` — System health & latency`
        }
      )
      .setFooter({ text: "Page 4/5 • Utility & Tools" })
      .setTimestamp();

    if (totalCustomCmds > 0) {
      pageUtility.addFields({
        name: "💬 Custom Commands",
        value: Object.keys(data.customCommands).map(c => `\`${prefix}${c}\``).join(" ").slice(0, 1024)
      });
    }

const pageFun = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎮 Fun, Social & Games")
      .setDescription(`Interactive family systems, mini-games, AI, and personal customization. Prefix: \`${prefix}\``)
      .addFields(
        {
          name: "💍 Family & Relationships",
          value:
            `• \`${prefix}marry @user [ring]\` — Propose to a server member\n` +
            `• \`${prefix}divorce [@user]\` — End a marriage\n` +
            `• \`${prefix}marriages\` — View server marriages\n` +
            `• \`${prefix}ship @user1 [@user2]\` — Calculate love compatibility\n` +
            `• \`${prefix}adopt @user\` — Adopt a child into your family\n` +
            `• \`${prefix}disown @user\` — Disown a child\n` +
            `• \`${prefix}family [@user]\` — View family tree`
        },
        {
          name: "🎲 Games, Polls & Giveaways",
          value:
            `• \`/giveaway\` — Host an advanced custom giveaway with role & requirement filters\n` +
            `• \`${prefix}poll "Question?" "Opt1" "Opt2" [--multi]\` — Create an interactive poll\n` +
            `• \`${prefix}8ball [question]\` — Ask the magic 8-ball\n` +
            `• \`${prefix}coinflip\` — Flip a coin (Heads or Tails)\n` +
            `• \`${prefix}roll [max]\` — Roll a random number (1-100)\n` +
            `• \`${prefix}rps [rock/paper/scissors]\` — Play Rock Paper Scissors\n` +
            `• \`${prefix}auction\` — Server auction & bidding engine`
        },
        {
          name: "🎨 AI & Personalization",
          value:
            `• \`${prefix}ai [prompt]\` — Chat with the OpenAI bot engine\n` +
            `• \`${prefix}customcolor\` / \`${prefix}color\` — Personal role color studio\n` +
            `• \`${prefix}tz [zone]\` — Set or check personal timezone`
        }
      )
      .setFooter({ text: "Page 5/5 • Fun & Games" })
      .setTimestamp();

    const pages = [pageOverview, pageMod, pageSecurity, pageUtility, pageFun];
    let currentPage = 0;

    const generateButtons = (page) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("help_home").setLabel("🏠 Overview").setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId("help_mod").setLabel("🛡️ Moderation").setStyle(ButtonStyle.Danger).setDisabled(page === 1),
        new ButtonBuilder().setCustomId("help_security").setLabel("🔒 Security").setStyle(ButtonStyle.Primary).setDisabled(page === 2),
        new ButtonBuilder().setCustomId("help_utility").setLabel("⚙️ Utility").setStyle(ButtonStyle.Success).setDisabled(page === 3),
        new ButtonBuilder().setCustomId("help_fun").setLabel("🎮 Fun & Games").setStyle(ButtonStyle.Primary).setDisabled(page === 4)
      );
    };
    
    const helpMsg = await message.reply({
      embeds: [pages[currentPage]],
      components: [generateButtons(currentPage)]
    });

    const collector = helpMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 90000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "help_home") currentPage = 0;
      else if (interaction.customId === "help_mod") currentPage = 1;
      else if (interaction.customId === "help_security") currentPage = 2;
      else if (interaction.customId === "help_utility") currentPage = 3;
      else if (interaction.customId === "help_fun") currentPage = 4;

      await interaction.update({
        embeds: [pages[currentPage]],
        components: [generateButtons(currentPage)]
      });
    });

    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        generateButtons(currentPage).components.map(button =>
          ButtonBuilder.from(button).setDisabled(true)
        )
      );

      await helpMsg.edit({ components: [disabledRow] }).catch(() => null);
    });

    return true;
  }

  return false;
}

// ================= TEMPORARY ROLE EXPIRATION ENGINE =================
async function processExpiredTempRoles(client) {
  const now = Date.now();
  for (const guildId in store) {
    const guildData = store[guildId];
    if (!guildData.tempRoles || !guildData.tempRoles.length) continue;

    const remainingTempRoles = [];
    let dataChanged = false;

    for (const record of guildData.tempRoles) {
      if (now >= record.expiry) {
        dataChanged = true;
        try {
          const guild = await client.guilds.fetch(guildId).catch(() => null);
          if (!guild) continue;

          const member = await guild.members.fetch(record.userId).catch(() => null);
          const role = await guild.roles.fetch(record.roleId).catch(() => null);

          if (member && role && member.roles.cache.has(role.id)) {
            await member.roles.remove(role, "Temporary role duration expired.");
            console.log(`[TEMPROLE] Removed ${role.name} from ${member.user.tag}.`);
          }
        } catch (err) {
          console.error("[TEMPROLE ERROR] Failed to process expiration:", err);
        }
      } else {
        remainingTempRoles.push(record);
      }
    }

    if (dataChanged) {
      store[guildId].tempRoles = remainingTempRoles;
      saveData();
    }
  }
}

// ================= BOT START =================
async function startBot() {
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ]
  });

client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);

    processExpiredTempRoles(client);

    setInterval(() => {
      processExpiredTempRoles(client);
    }, 60 * 1000);
    
    try {
      const { loadAfks } = require("./commands/afk.js");
      loadAfks(store || {}); 
    } catch(err) {
      console.error("Failed to load AFK memory layers on setup:", err);
    }

    initTimers(client);
    console.log("⏰ Real-time dynamic timer system initialized.");

    setInterval(() => {
      checkBirthdays(client, getGuildData, saveData).catch(console.error);
    }, 60 * 60 * 1000);

    checkBirthdays(client, getGuildData, saveData).catch(console.error);
  });

// ================= INTERACTION LISTENER =================
  client.on("interactionCreate", async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const funSlashCommands = ['8ball', 'coinflip', 'roll', 'rps', 'ship', 'shop', 'marry', 'divorce', 'marriages', 'adopt', 'daily'];
      if (funSlashCommands.includes(interaction.commandName)) {
        const isStaff = isStaffMember(interaction.member) || interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator);
        if (!isStaff && interaction.channelId !== BDAY_COMMAND_CHANNEL_ID) {
          return await interaction.reply({
            content: `❌ You can only use fun commands inside <#${BDAY_COMMAND_CHANNEL_ID}>!`,
            ephemeral: true
          });
        }
      }

      if (interaction.commandName === 'giveaway') {
        return giveawayCommand.execute(interaction, getGuildData, saveData);
      }

      if (interaction.commandName === '8ball') {
        const q = interaction.options.getString('question');
        const answers = [
          "🎱 It is certain.", "🎱 It is decidedly so.", "🎱 Without a doubt.",
          "🎱 Yes - definitely.", "🎱 You may rely on it.", "🎱 As I see it, yes.",
          "🎱 Most likely.", "🎱 Outlook good.", "🎱 Yes.", "🎱 Signs point to yes.",
          "🎱 Reply hazy, try again.", "🎱 Ask again later.", "🎱 Better not tell you now.",
          "🎱 Cannot predict now.", "🎱 Concentrate and ask again.",
          "🎱 Don't count on it.", "🎱 My reply is no.", "🎱 My sources say no.",
          "🎱 Outlook not so good.", "🎱 Very doubtful."
        ];
        const answer = answers[Math.floor(Math.random() * answers.length)];
        return await interaction.reply({ content: `🔮 **Question:** ${q}\n${answer}` });
      }

      if (interaction.commandName === 'coinflip') {
        const result = Math.random() < 0.5 ? "🪙 Heads!" : "🪙 Tails!";
        return await interaction.reply({ content: `The coin landed on **${result}**` });
      }

      if (interaction.commandName === 'roll') {
        let max = interaction.options.getInteger('max') || 100;
        if (max < 1) max = 100;
        const rolled = Math.floor(Math.random() * max) + 1;
        return await interaction.reply({ content: `🎲 You rolled a **${rolled}** (1-${max})` });
      }

      if (interaction.commandName === 'rps') {
        const choices = ["rock", "paper", "scissors"];
        const userChoice = interaction.options.getString('choice');
        const botChoice = choices[Math.floor(Math.random() * choices.length)];
        let outcome = "";
        if (userChoice === botChoice) outcome = "It's a tie! 🤝";
        else if (
          (userChoice === "rock" && botChoice === "scissors") ||
          (userChoice === "paper" && botChoice === "rock") ||
          (userChoice === "scissors" && botChoice === "paper")
        ) outcome = "You win! 🎉";
        else outcome = "I win! 😈";

        return await interaction.reply({ content: `🎮 You chose **${userChoice}**, I chose **${botChoice}**. ${outcome}` });
      }

      if (interaction.commandName === 'ship') {
        const user1 = interaction.options.getUser('first') || interaction.user;
        const user2 = interaction.options.getUser('second');

        if (!user2) {
          return await interaction.reply({
            content: "❌ Mention someone to ship! Select a target user in the command options.",
            ephemeral: true
          });
        }

        if (user1.id === user2.id) {
          return await interaction.reply({ 
            content: "❌ You can't ship someone with themselves!", 
            ephemeral: true 
          });
        }

        const id1 = BigInt(user1.id);
        const id2 = BigInt(user2.id);
        const combinedIds = id1 > id2 ? id1 + id2 : id2 + id1;
        const percentage = Number(combinedIds % 101n);

        const totalBlocks = 6;
        const filled = Math.round((percentage / 100) * totalBlocks);
        const bar = "💖".repeat(filled) + "🖤".repeat(totalBlocks - filled);

        let comment = "";
        let color = 0xff69b4;
        let imgUrl = "";

        if (percentage >= 85) {
          comment = "✨ **Soulmates!** Get married already! 💍";
          color = 0xff1493;
          imgUrl = "https://media.giphy.com/media/26hpKMT7M4iOtdaSc/giphy.gif";
        } else if (percentage >= 50) {
          comment = "👀 **Cute combo!** There's definitely a spark here.";
          color = 0xff69b4;
          imgUrl = "https://media.giphy.com/media/l41Jw7AedR39y4S40/giphy.gif";
        } else if (percentage >= 25) {
          comment = "😬 **Awkward...** Stick to sending memes in chat.";
          color = 0xffa500;
          imgUrl = "https://media.giphy.com/media/H5C8CevNMbpBqNqFjl/giphy.gif";
        } else {
          comment = "💀 **0% Chemistry.** Stay at least 50 feet apart!";
          color = 0x2f3136;
          imgUrl = "https://media.giphy.com/media/e2wFI0JGg6Tcg/giphy.gif";
        }

        const shipEmbed = new EmbedBuilder()
          .setColor(color)
          .setAuthor({ name: "💘 Compatibility Check" })
          .setDescription(
            `**${user1.username}**  ×  **${user2.username}**\n` +
            `**${percentage}%** \`${bar}\`\n\n` +
            `${comment}`
          )
          .setThumbnail(imgUrl)
          .setFooter({ 
            text: `Shipped by ${interaction.user.username}`, 
            iconURL: interaction.user.displayAvatarURL({ dynamic: true }) 
          });

        return await interaction.reply({ embeds: [shipEmbed] });
      }

      if (interaction.commandName === 'daily') {
        const userId = interaction.user.id;
        const cooldownTime = 24 * 60 * 60 * 1000;
        const now = Date.now();

        const data = getGuildData(interaction.guild.id);
        if (!data.economy) data.economy = {};
        if (!data.economy[userId]) data.economy[userId] = { balance: 0, lastDaily: 0 };

        const userData = data.economy[userId];

        if (now - userData.lastDaily < cooldownTime) {
          const timeLeft = cooldownTime - (now - userData.lastDaily);
          const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
          const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
          
          return await interaction.reply({ 
            content: `⏳ You have already claimed your daily reward! Please wait another **${hoursLeft}h ${minutesLeft}m**.`, 
            ephemeral: true 
          });
        }

        userData.balance += 1;
        userData.lastDaily = now;

        saveData();

        return await interaction.reply({
          content: `🎉 You successfully claimed your daily reward and received **1 DON**! Your new balance is **${userData.balance} DON**.`
        });
      }
      
      if (interaction.commandName === 'shop') {
        const fakeMessage = {
          author: interaction.user,
          member: interaction.member,
          guild: interaction.guild,
          channel: interaction.channel,
          reply: async (payload) => {
            return await interaction.reply(payload);
          }
        };
        const data = getGuildData(interaction.guild.id);
        const prefix = data.prefix || DEFAULT_PREFIX;
        return shopCommand.execute(fakeMessage, [], prefix, getGuildData, saveData, interaction);
      }
      
      if (["marry", "divorce", "marriages", "adopt"].includes(interaction.commandName)) {
        await interaction.deferReply({ ephemeral: true }).catch(() => {});

        const targetUser = 
          interaction.options.getUser("user") || 
          interaction.options.getUser("child") || 
          interaction.options.getUser("target") || 
          interaction.options.getUser("spouse");

        let cmdArgs = [];
        if (interaction.commandName === "marry") {
          if (targetUser) cmdArgs.push(targetUser.id);
          const ringOpt = interaction.options.getString("ring");
          if (ringOpt) cmdArgs.push(ringOpt);
        } else if (targetUser) {
          cmdArgs.push(targetUser.id);
        }

        const fakeMessage = {
          content: `${DEFAULT_PREFIX}${interaction.commandName} ${cmdArgs.join(" ")}`.trim(),
          author: interaction.user,
          member: interaction.member || { id: interaction.user.id, user: interaction.user, roles: { cache: new Map() }, permissions: { has: () => false } },
          guild: interaction.guild,
          channel: interaction.channel,
          mentions: { 
            members: { 
              first: () => targetUser ? interaction.guild?.members.cache.get(targetUser.id) : null 
            },
            users: {
              first: () => targetUser || null
            }
          },
          reply: async (payload) => {
            const data = typeof payload === "string" ? { content: payload } : payload;
            if (interaction.deferred || interaction.replied) {
              return await interaction.editReply({ ...data });
            }
            return await interaction.reply({ ...data, ephemeral: true });
          },
          delete: async () => null
        };

        return await handleCommands(fakeMessage, getGuildData);
      }
    }

    if (interaction.isButton() || interaction.isModalSubmit()) {
      if (interaction.isButton() && interaction.customId.startsWith("gw_enter_")) {
        const giveawayId = interaction.customId.split("_")[2];
        const guildData = getGuildData(interaction.guild.id);
        
        if (!guildData.giveaways || !guildData.giveaways[giveawayId]) {
          return interaction.reply({ content: "❌ This giveaway no longer exists.", ephemeral: true });
        }

        const gw = guildData.giveaways[giveawayId];
        if (gw.ended) {
          return interaction.reply({ content: "❌ This giveaway has already ended!", ephemeral: true });
        }

        const member = interaction.member;

        if (gw.requiredRoleId && !member.roles.cache.has(gw.requiredRoleId)) {
          return interaction.reply({ content: `❌ You are missing the required role: <@&${gw.requiredRoleId}> to enter!`, ephemeral: true });
        }

        if (gw.blacklistedRoleId && member.roles.cache.has(gw.blacklistedRoleId)) {
          return interaction.reply({ content: `❌ You have a blacklisted role and cannot enter this giveaway.`, ephemeral: true });
        }

        if (!gw.entries.includes(interaction.user.id)) {
          gw.entries.push(interaction.user.id);
          saveData(interaction.guild.id, guildData);
          return interaction.reply({ content: `🎉 You have successfully entered the giveaway for **${gw.prize}**! Good luck!`, ephemeral: true });
        } else {
          gw.entries = gw.entries.filter(id => id !== interaction.user.id);
          saveData(interaction.guild.id, guildData);
          return interaction.reply({ content: `📤 You have left the giveaway.`, ephemeral: true });
        }
      }

      if (
        interaction.customId === "open_hex_modal" ||
        interaction.customId === "hex_color_modal" ||
        interaction.customId === "clear_hex_color"
      ) {
        return customColorCommand.handleInteraction(interaction);
      }

      if (
        interaction.customId.startsWith("marriage_") &&
        marriageCommand &&
        typeof marriageCommand.handleInteraction === "function"
      ) {
        return marriageCommand.handleInteraction(interaction, getGuildData, saveData);
      }

      if (
        interaction.customId.startsWith("adoption_") &&
        adoptionCommand &&
        typeof adoptionCommand.handleInteraction === "function"
      ) {
        return adoptionCommand.handleInteraction(interaction, getGuildData, saveData);
      }
    }
  });
  
  // ================= MESSAGE CREATE INTERCEPT PIPELINE =================
  client.on("messageCreate", async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.guild) return;
      if (!message.content) return;

      const data = getGuildData(message.guild.id);
      const prefix = data.prefix || DEFAULT_PREFIX;

      const userReturned = await handleAfkMentionsAndReturn(message, prefix, getGuildData, saveData);
      if (userReturned) return;

      const bypassRoleId = "1492630307650666546";
      const hasBypassDiscordInvite = message.member?.roles.cache.has(bypassRoleId) || false;
      const discordInviteRegex = /(https?:\/\/)?(www\.)?(discord\.gg|discord\.com\/invite)\/\S+/gi;
      const containsDiscordInvite = discordInviteRegex.test(message.content);
      const allowDiscordInvite = hasBypassDiscordInvite && containsDiscordInvite;

      const protectedWord = containsBlacklistedWord(message.content, PROTECTED_BLACKLIST);
      if (protectedWord) {
        await message.delete().catch(() => null);
        await sendAutomodLog(message, protectedWord);
        return;
      }

      if (!message.content.startsWith(prefix) && !hasBypassRole(message) && !allowDiscordInvite) {
        const word = containsBlacklistedWord(message.content, [...CORE_BLACKLIST, ...data.words, ...(data.blockedLinks || [])]);
        if (word) {
          await message.delete().catch(() => null);
          await sendAutomodLog(message, word);
          return;
        }
      }

      if (data.autoResponses) {
        const contentLower = message.content.toLowerCase();
        for (const [trigger, arData] of Object.entries(data.autoResponses)) {
          if (contentLower.includes(trigger)) {
            let payload = {};
            if (arData.text) payload.content = arData.text;
            if (arData.image) {
              payload.embeds = [new EmbedBuilder().setColor(0xff69b4).setImage(arData.image)];
            }
            if (payload.content || payload.embeds) {
              await message.channel.send(payload).catch(() => {});
            }
            break;
          }
        }
      }

      if (!data.channelCounters) data.channelCounters = {};
      if (!data.channelCounters[message.channel.id]) data.channelCounters[message.channel.id] = 0;
      if (typeof data.currentPersonaIndex !== "number") data.currentPersonaIndex = 0;

      const isAiCommand = message.content.startsWith(`${prefix}ai`);
      const isStatusCommand = message.content.startsWith(`${prefix}status`);
      
      let isReplyToBot = false;
      if (message.reference && message.reference.messageId) {
        const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (repliedMsg && repliedMsg.author.id === client.user.id) {
          isReplyToBot = true;
        }
      }

      if (!isAiCommand && !isStatusCommand && !isReplyToBot && !message.content.startsWith(prefix)) {
        data.channelCounters[message.channel.id]++;
        
        if (data.channelCounters[message.channel.id] >= 50) {
          data.channelCounters[message.channel.id] = 0; 
          data.currentPersonaIndex += 1; 
        }
        
        store[message.guild.id] = data;
        saveData();
      }

      const wasCommand = await handleCommands(message, getGuildData);
      if (wasCommand) return;

      const isBotMentioned = message.mentions.has(client.user.id) && !message.mentions.everyone;

      if (!isAiCommand && !isReplyToBot && !isBotMentioned) return;

      let triggerText = message.content;

      if (isAiCommand) {
        triggerText = message.content.slice(`${prefix}ai`.length).trim();
        if (!triggerText) return message.reply(`Usage: \`${prefix}ai [your question]\``);
      } else if (isBotMentioned) {
        triggerText = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        if (!triggerText) {
          return message.reply("Hey! How can I help you today?");
        }
      }

      await message.channel.sendTyping().catch(() => null);

      const aiReply = await generateAiReply(message, triggerText, [], data.currentPersonaIndex);
      if (aiReply) {
        return message.reply({ 
          content: aiReply, 
          allowedMentions: { parse: [], repliedUser: true }
        });
      }
} catch (err) {
      console.error("Error running inside messageCreate pipeline:", err);
    }
  });

  await client.login(process.env.DISCORD_TOKEN);
}

module.exports = { startBot };
