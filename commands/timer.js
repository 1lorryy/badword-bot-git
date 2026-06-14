const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// Creates a timers.json right inside your commands folder to remember them across restarts
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
  const match = input.match(/^(\d+)(s|m|min|h|d)$/i);
  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s": return amount * 1000;
    case "m": 
    case "min": return amount * 60 * 1000;
    case "h": return amount * 60 * 60 * 1000;
    case "d": return amount * 24 * 60 * 60 * 1000;
    default: return null;
  }
}

function startTimerLoop(client) {
  // Checks every 2.5 seconds if any timers have finished in the database
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

            // Clean cross-channel ping notification
            await channel.send({
              content: `🚨 <@${timer.authorId}>, your timer for **${timer.timerName}** is up!`
            }).catch(() => {});
          }
        } catch (err) {
          console.error("Failed to process finished timer:", err);
        }

        timers.splice(i, 1);
        changed = true;
      }
    }

    if (changed) {
      saveTimers(timers);
    }
  }, 2500); 
}

async function handleTimerCommand(message, args) {
  const timeInput = args[0];
  if (!timeInput) return message.reply("Usage: `?timer 5min [Optional Name]`");

  const duration = parseTime(timeInput);
  if (!duration) return message.reply("Use formats like: `10s`, `5min`, `1h`, `1d`");

  const timerName = args.slice(1).join(" ") || "Timer";
  const endTime = Date.now() + duration;

  // Convert milliseconds to seconds for Discord's Unix format
  const unixSeconds = Math.floor(endTime / 1000);
  
  // This special format <t:UNIX:R> forces Discord to render a dynamic real-time countdown
  const liveCountdownTag = `<t:${unixSeconds}:R> (<t:${unixSeconds}:T>)`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⏳ ${timerName}`)
    .setDescription(`Ends: ${liveCountdownTag}`);

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
  console.log("⏰ Real-time dynamic timer system initialized.");
}

module.exports = {
  handleTimerCommand,
  initTimers
};
