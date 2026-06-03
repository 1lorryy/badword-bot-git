const { EmbedBuilder } = require("discord.js");

function parseTime(input) {
  const match = input.match(/^(\d+)(s|m|h|d)$/i);

  if (!match) return null;

  const amount = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

function format(ms) {
  let totalSeconds = Math.floor(ms / 1000);

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

async function handleTimerCommand(message, args) {
  const timeInput = args[0];

  if (!timeInput) {
    return message.reply("Usage: `?timer 1h`");
  }

  const duration = parseTime(timeInput);

  if (!duration) {
    return message.reply(
      "Use: `10s`, `5m`, `1h`, `1d`"
    );
  }

  const timerName = args.slice(1).join(" ") || "Timer";

  const endTime = Date.now() + duration;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`⏳ ${timerName}`)
    .setDescription(format(duration));

  const timerMessage = await message.channel.send({
    embeds: [embed]
  });

  const interval = setInterval(async () => {
    const remaining = endTime - Date.now();

    if (remaining <= 0) {
      clearInterval(interval);

      const finishedEmbed = new EmbedBuilder()
        .setColor(0x22c55e)
        .setTitle("⏰ Timer Finished")
        .setDescription(`Your timer for **${timerName}** has ended.`); // Changed this since they are pinged outside now

      return timerMessage.edit({
        content: `${message.author}`, // <--- Pings the user outside the embed here
        embeds: [finishedEmbed]
      }).catch(() => {});
    }

    embed.setDescription(format(remaining));

    timerMessage.edit({
      embeds: [embed]
    }).catch(() => {});
  }, 1000);
}

module.exports = {
  handleTimerCommand
};
