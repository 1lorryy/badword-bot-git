const { EmbedBuilder } = require("discord.js");

const ADMIN_ROLE_ID = "1481370041441189959";
const MANAGER_ROLE_ID = "1499376933635489893";
const SELLER_ROLE_ID = "1499376701220585575";

const ANTI_SNIPE_ADD_MS = 30 * 1000;

let activeAuction = null;
let auctionTimer = null;

function canUseAuctionStaff(message) {
  if (!message.member) return false;

  const roles = message.member.roles.cache;

  return (
    message.member.permissions.has("Administrator") ||
    roles.has(ADMIN_ROLE_ID) ||
    roles.has(MANAGER_ROLE_ID) ||
    roles.has(SELLER_ROLE_ID)
  );
}

function parseTime(input) {
  const match = String(input).toLowerCase().match(/^(\d+)(s|sec|m|min|h|hr|d|day)$/);
  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "s" || unit === "sec") return num * 1000;
  if (unit === "m" || unit === "min") return num * 60 * 1000;
  if (unit === "h" || unit === "hr") return num * 60 * 60 * 1000;
  if (unit === "d" || unit === "day") return num * 24 * 60 * 60 * 1000;

  return null;
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(total / 60);
  const sec = total % 60;

  if (min > 0) return `${min}m ${sec}s`;
  return `${sec}s`;
}

function resetAuctionTimer() {
  if (!activeAuction) return;

  if (auctionTimer) clearTimeout(auctionTimer);

  const remaining = Math.max(0, activeAuction.endsAt - Date.now());

  auctionTimer = setTimeout(() => {
    finishAuction(false);
  }, remaining);
}

function auctionEmbed(title, color, auction) {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(color)
    .addFields(
      { name: "Item", value: auction.item, inline: false },
      { name: "Highest Bid", value: String(auction.highestBid), inline: true },
      {
        name: "Highest Bidder",
        value: auction.highestBidder ? `<@${auction.highestBidder}>` : "No bids yet",
        inline: true
      },
      {
        name: "Time Left",
        value: formatTime(auction.endsAt - Date.now()),
        inline: true
      }
    )
    .setTimestamp();
}

async function finishAuction(cancelled = false) {
  if (!activeAuction) return;

  const auction = activeAuction;
  activeAuction = null;

  if (auctionTimer) clearTimeout(auctionTimer);
  auctionTimer = null;

  if (cancelled) {
    return auction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ Auction Cancelled")
          .setColor(0xef4444)
          .setDescription(`Auction for **${auction.item}** was cancelled.`)
      ]
    });
  }

  if (!auction.highestBidder) {
    return auction.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("⏰ Auction Ended")
          .setColor(0xef4444)
          .setDescription(`Auction for **${auction.item}** ended with no bids.`)
      ]
    });
  }

  return auction.channel.send({
    content: `🏆 <@${auction.highestBidder}> won the auction!`,
    embeds: [
      new EmbedBuilder()
        .setTitle("🏆 Auction Ended")
        .setColor(0x22c55e)
        .addFields(
          { name: "Item", value: auction.item, inline: false },
          { name: "Winning Bid", value: String(auction.highestBid), inline: true }
        )
        .setTimestamp()
    ]
  });
}

async function handleAuctionCommand(message, args, prefix) {
  const sub = args.shift()?.toLowerCase();

  if (!sub) {
    await message.reply(`Usage: ${prefix}auction start item price time`);
    return true;
  }

  if (["start", "end", "cancel"].includes(sub)) {
    if (!canUseAuctionStaff(message)) {
      await message.reply("❌ You do not have permission.");
      return true;
    }
  }

  if (sub === "start") {
    if (activeAuction) {
      await message.reply("❌ An auction is already running.");
      return true;
    }

    if (args.length < 3) {
      await message.reply(`Usage: ${prefix}auction start item price time`);
      return true;
    }

    const timeInput = args[args.length - 1];
    const priceInput = args[args.length - 2];
    const item = args.slice(0, -2).join(" ");

    const startPrice = parseInt(priceInput, 10);
    const timeMs = parseTime(timeInput);

    if (!item || isNaN(startPrice) || !timeMs) {
      await message.reply(`Example: ${prefix}auction start Nitro 100 10min`);
      return true;
    }

    activeAuction = {
      item,
      highestBid: startPrice,
      highestBidder: null,
      channel: message.channel,
      startedBy: message.author.id,
      endsAt: Date.now() + timeMs
    };

    await message.channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("🏁 Auction Started")
          .setColor(0x5865f2)
          .addFields(
            { name: "Item", value: item, inline: false },
            { name: "Starting Price", value: String(startPrice), inline: true },
            { name: "Time", value: timeInput, inline: true },
            { name: "Anti-Snipe", value: "+30s added after every bid", inline: true },
            { name: "Bid Command", value: `${prefix}bid amount`, inline: false }
          )
          .setTimestamp()
      ]
    });

    resetAuctionTimer();
    return true;
  }

  if (sub === "bid") {
    if (!activeAuction) {
      await message.reply("❌ No active auction.");
      return true;
    }

    if (message.channel.id !== activeAuction.channel.id) {
      await message.reply("❌ Bids must be placed in the auction channel.");
      return true;
    }

    const amountText = String(args[0] || "").trim();

if (!/^\d+$/.test(amountText)) {
  await message.reply(`Usage: ${prefix}bid amount`);
  return true;
}

const amount = Number(amountText);

const MAX_BID = 999999999999; // 999 billion max

if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_BID) {
  await message.reply(`❌ Bid must be between 1 and ${MAX_BID}.`);
  return true;
}

    if (isNaN(amount)) {
      await message.reply(`Usage: ${prefix}bid amount`);
      return true;
    }

    if (amount <= activeAuction.highestBid) {
      await message.reply(`❌ Bid must be higher than ${activeAuction.highestBid}.`);
      return true;
    }

    activeAuction.highestBid = amount;
    activeAuction.highestBidder = message.author.id;
    activeAuction.endsAt += ANTI_SNIPE_ADD_MS;

    resetAuctionTimer();

    await message.channel.send({
  content: `💰 <@${message.author.id}> is now the highest bidder!`,
  embeds: [
    new EmbedBuilder()
      .setTitle("💰 New Highest Bid")
      .setColor(0x22c55e)
      .addFields(
        { name: "Item", value: activeAuction.item, inline: false },
        { name: "Bid", value: String(amount), inline: true },
        { name: "Time Left (+30s)", value: formatTime(activeAuction.endsAt - Date.now()), inline: true }
      )
      .setTimestamp()
  ]
});

    return true;
  }

  if (sub === "end") {
    if (!activeAuction) return message.reply("❌ No active auction.");
    await finishAuction(false);
    return true;
  }

  if (sub === "cancel") {
    if (!activeAuction) return message.reply("❌ No active auction.");
    await finishAuction(true);
    return true;
  }

  if (sub === "status") {
    if (!activeAuction) return message.reply("❌ No active auction.");

    await message.channel.send({
      embeds: [auctionEmbed("📊 Auction Status", 0x5865f2, activeAuction)]
    });

    return true;
  }

  return false;
}

module.exports = { handleAuctionCommand };