const { EmbedBuilder } = require("discord.js");

const BOT_COMMANDS_CHANNEL_ID = "1481370051264254259";
const STAFF_ROLE_ID = "1481370041420087474";

const TZ_ALIASES = {
  EST: "UTC-5", EDT: "UTC-4",
  CST: "UTC-6", CDT: "UTC-5",
  MST: "UTC-7", MDT: "UTC-6",
  PST: "UTC-8", PDT: "UTC-7",
  GMT: "UTC+0", UTC: "UTC+0",
  CET: "UTC+1", CEST: "UTC+2",
  EET: "UTC+2", EEST: "UTC+3",
  JST: "UTC+9", AEST: "UTC+10"
};

module.exports = {
  name: "tz",
  aliases: ["timezone"],
  description: "Set or view your personal timezone.",
  async execute(message, args, client, getGuildData, saveData) {
    const isStaff = message.member.roles.cache.has(STAFF_ROLE_ID) ||
                    message.member.permissions.has("Administrator") ||
                    message.member.permissions.has("ManageMessages");

    if (!isStaff && message.channel.id !== BOT_COMMANDS_CHANNEL_ID) {
      return message.reply(`❌ Standard members can only use \`?tz\` in <#${BOT_COMMANDS_CHANNEL_ID}>!`)
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Resolve guild data safely
    const data = typeof getGuildData === "function" ? getGuildData(message.guild.id) : {};
    if (!data.timezones) data.timezones = {};

    // View timezone if no arguments given
    if (!args[0]) {
      const userTz = data.timezones[message.author.id] || "Not Set";
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#2B2D31")
            .setAuthor({ name: `${message.author.username} • Timezone Status`, iconURL: message.author.displayAvatarURL() })
            .setDescription(`🌐 **Active Timezone:** \`${userTz}\`\n\n*Update with:* \`?tz <EST | UTC+2 | Europe/London>\``)
        ]
      });
    }

    // Format & Save
    let inputTz = args[0].toUpperCase();
    if (TZ_ALIASES[inputTz]) inputTz = TZ_ALIASES[inputTz];

    data.timezones[message.author.id] = inputTz;

    if (typeof saveData === "function") {
      saveData();
    }

    return message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor("#2B2D31")
          .setDescription(`⚡ **Timezone set to \`${inputTz}\`** for <@${message.author.id}>! Synced with \`?joininfo\`.`)
      ]
    });
  }
};
