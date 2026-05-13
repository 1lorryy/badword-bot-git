const { PermissionsBitField, EmbedBuilder } = require("discord.js");

const DELETE_AFTER_MS = 5000;

// ===== TIME PARSER =====
function parseTime(input) {
  if (!input) return null;

  const match = String(input)
    .toLowerCase()
    .match(/^(\d+)(s|sec|m|min|h|hr)$/);

  if (!match) return null;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === "s" || unit === "sec") return num;
  if (unit === "m" || unit === "min") return num * 60;
  if (unit === "h" || unit === "hr") return num * 60 * 60;

  return null;
}

// ===== CHANNEL FINDER =====
function getTargetChannel(message, args) {
  const mentioned = message.mentions.channels.first();
  if (mentioned) return mentioned;

  const possibleId = args[0]?.replace(/[<#>]/g, "");
  const byId = message.guild.channels.cache.get(possibleId);

  if (byId) return byId;

  return message.channel;
}

// ===== DELETE LATER =====
async function deleteLater(msg, ms = DELETE_AFTER_MS) {
  if (!msg) return;

  setTimeout(() => {
    msg.delete().catch(() => null);
  }, ms);
}

// ===== EMBED =====
async function sendSmallEmbed(message, color, text) {
  const sent = await message.channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor(color)
        .setDescription(text)
    ]
  }).catch(() => null);

  await deleteLater(sent);
}

// ===== MAIN =====
async function handleChannelToolsCommand(
  message,
  args,
  prefix,
  command,
  canManageGuild
) {

  if (!canManageGuild(message)) {
    const reply = await message.reply("❌ No permission.");
    await deleteLater(reply);
    return true;
  }

  if (
    !message.guild.members.me.permissions.has(
      PermissionsBitField.Flags.ManageChannels
    )
  ) {
    const reply = await message.reply(
      "❌ I need Manage Channels permission."
    );

    await deleteLater(reply);
    return true;
  }

  const channel = getTargetChannel(message, args);

  // ================= SLOWMODE =================
  if (command === "slowmode") {

    let timeArg = args[0];

    // if first arg is channel
    if (
      message.mentions.channels.first() ||
      message.guild.channels.cache.get(
        args[0]?.replace(/[<#>]/g, "")
      )
    ) {
      timeArg = args[1];
    }

    if (!timeArg) {
      const reply = await message.reply(
        `Usage: ${prefix}slowmode #channel 10s`
      );

      await deleteLater(reply);
      return true;
    }

    // OFF
    if (
      ["off", "0"].includes(timeArg.toLowerCase())
    ) {
      await channel.setRateLimitPerUser(0);

      await sendSmallEmbed(
        message,
        0x22c55e,
        `✅ Slowmode disabled in ${channel}`
      );

      return true;
    }

    const seconds = parseTime(timeArg);

    if (seconds === null || seconds > 21600) {
      const reply = await message.reply(
        "❌ Max slowmode is 6h."
      );

      await deleteLater(reply);
      return true;
    }

    await channel.setRateLimitPerUser(seconds);

    await sendSmallEmbed(
      message,
      0x5865f2,
      `🐢 Slowmode set to \`${timeArg}\` in ${channel}`
    );

    return true;
  }

  return false;
}

module.exports = {
  handleChannelToolsCommand
};