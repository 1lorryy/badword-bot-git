const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Ticket Creation Channel ID
const TICKET_CHANNEL_ID = "1481370042892550220";

module.exports = {
  name: "otherroles",
  description: "Displays the server special roles overview and ticket claim guide",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only administrators can post this overview.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const rolesEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `${message.guild.name} • Special Role Directory`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
      .setTitle("👑  SERVER ROLES & PERKS")
      .setDescription(
        `*Check out the available special roles below and learn how to claim them for yourself!*\n\n` +

        `🏆 **│ EVENT & GIVEAWAY**\n` +
        `• <@&1481370041352982674> ── *Who host giveaways regularly & trusted by staff*\n` +
        `• <@&1481370041352982673> ── *Who host events in <#1492824756066455644> & trusted by staff*\n` +
        `• <@&1495356958075650228> ── *Who won an official server giveaway*\n` +
        `• <@&1481370041260966067> ── *Banned from giveaway participation*\n\n` +

        `💎 **│ BOOSTERS & SUPPORTERS**\n` +
        `• <@&1481370041382604874> ── *Exclusive role for 2x Server Boosters*\n` +
        `• <@&1482787743527604305> ── *Official Server Booster*\n\n` +

        `⭐ **│ CREATORS & INFLUENCERS**\n` +
        `• <@&1503086235839889510> ── *Creators with **50k+** followers/subscribers*\n` +
        `• <@&1481370041352982669> ── *Creators with **10k+** followers/subscribers*\n` +
        `• <@&1492475009082589325> ── *Creators with **1k+** followers/subscribers*\n` +
        `• <@&1498758603828494496> ── *Official Featured Artist*\n` +
        `• <@&1481370041352982676> ── *Official Partnered Server*\n\n` +

        `🤝 **│ COMMUNITY & SPECIAL**\n` +
        `• <@&1481370041336336448> ── *Recognized friends of <@1207297962745536543>*\n\n` +

        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
        `🎟️ **HOW TO CLAIM YOUR ROLE**\n` +
        `> Head over to <#${TICKET_CHANNEL_ID}> to open a ticket. Once inside, click **Support** and provide your proof!`
      )
      .setFooter({ 
        text: "DonDon Moderation Systems • Role Eligibility", 
        iconURL: message.guild.iconURL({ dynamic: true }) 
      })
      .setTimestamp();

    await message.channel.send({ embeds: [rolesEmbed] });
  }
};
