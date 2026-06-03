const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// This creates a timers.json right inside your commands folder to remember them
const DATA_FILE = path.join(__dirname, "timers.json");

function loadTimers() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const data = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(data || "[]");
  } catch (error) {
    console.error("Error reading timers file:", error);
    return [];
  }
}

function saveTimers(timers) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(timers, null, 2));
  } catch (error) {
    console.error("Error writing to timers file:", error);
  }
}

function parseTime(input) {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s": return amount * 1000;
    case "m": return amount * 60 * 1000;
    case "h": return amount * 60 * 60 * 1000;
    case "d": return amount * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function format(ms) {
  let totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds <= 0) return "0s";

  const days = Math.floor(totalSeconds / 86400);
  totalSeconds %= 86400;

  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(" ");
}

function startTimerLoop(client) {
  setInterval(async () => {
    let timers = loadTimers();
    const now = Date.now();
    let changed = false;

    for (let i = timers.length - 1; i >= 0; i--) {
      const timer = timers[i];

      if (now >= timer.endTime) {
        try {
          const channel = await client.channels.fetch(timer.channelId).catch(() => null);
          if (channel) {
            const finishedEmbed = new EmbedBuilder()
              .setColor(0x22c55e)
              .setTitle("⏰ Timer Finished")
              .setDescription(`Your timer for **${timer.timerName}** has ended.`);

            if (timer.messageId) {
              const originalMsg = await channel.messages.fetch(timer.messageId).catch(() => null);
              if (originalMsg) {
                await originalMsg.edit({ embeds: [finishedEmbed] }).catch(() => {});
              }
            }

            // Pings the user across channels cleanly
            await channel.send({
              content: `🚨 <@${timer.authorId}>, your timer for **${timer.timerName}** is up!`
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Failed to process finished timer:", err);
        }

        timers.splice(i, 1);
        changed = true;
      } else {
        // Updates the embed countdown every 5 seconds so it doesn't lag/rate-limit the bot
        if (timer.messageId && Math.floor(now / 1000) % 5 === 0) {
          try {
            const channel = await client.channels.fetch(timer.channelId).catch(() => null);
            const originalMsg = await channel.messages.fetch(timer.messageId).catch(() => null);
            if (originalMsg && originalMsg.embeds[0]) {
              const currentEmbed = EmbedBuilder.from(originalMsg.embeds[0]);
              currentEmbed.setDescription(format(timer.endTime - now));
              await originalMsg.edit({ embeds: [currentEmbed] }).catch(() => {});
            }
          } catch (e) {}
        }
      }
    }

    if (changed) {
      saveTimers(timers);
    }
  }, 2500); 
}

async function handleTimerCommand(message, args) {
  const timeInput = args[0];
  if (!timeInput) return message.reply("Usage: `?timer 1h`");

  const duration = parseTime(timeInput);
  if (!duration) return message.reply("Use: `10s`, `5m`, `1h`, `1d`");

  const timerName = args.slice(1).join(" ") || "Timer";
  const endTime = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⏳ ${timerName}`)
    .setDescription(format(duration));

  const timerMessage = await message.channel.send({ embeds: [embed] });

  const timers = loadTimers();
  timers.push({
    messageId: timerMessage.id,
    channelId: message.channel.id,
    authorId: message.author.id,
    timerName: timerName,
    endTime: endTime
  });
  saveTimers(timers);
}

function initTimers(client) {
  startTimerLoop(client);
  console.log("⏰ Persistent timer loop initialized.");
}

module.exports = {
  handleTimerCommand,
  initTimers
};
