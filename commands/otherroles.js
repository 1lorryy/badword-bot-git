const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Ticket Creation Channel ID
const TICKET_CHANNEL_ID = "1481370042892550220";

module.exports = {
  name: "otherroles",
  description: "Displays the Other Roles overview and ticket claim guide",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only administrators can post this overview.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const rolesEmbed = new EmbedBuilder()
      .setColor(0x2B2D31) // Sleek dark aesthetic
      .setTitle("Other Roles <3")
      .setDescription(
        `🎉 **EVENT & GIVEAWAY ROLES**\n` +
        `• <@&1481370041352982674> | **Who host giveaways regularly and trusted by the staff team**\n` +
        `• <@&1481370041352982673> | **Who host event in #【⏳】events and trusted by the staff team**\n` +
        `• <@&1495356958075650228> | **Who won a giveaway**\n` +
        `• <@&1481370041260966067> | **Banned from giveaway**\n\n` +

        `🚀 **BOOSTERS & SHOP**\n` +
        `• <@&1481370041382604874> | **Boosted the server twice**\n` +
        `• <@&1482787743527604305> | **Boosted the server once**\n\n` +

        `⭐ **CREATORS & INFLUENCERS**\n` +
        `• <@&1503086235839889510> | **Who got over 50k followers/subscribers**\n` +
        `• <@&1481370041352982669> | **Who got over 10k followers/subscribers**\n` +
        `• <@&1492475009082589325> | **Who got over 1k followers/subscribers**\n` +
        `• <@&1498758603828494496> | **Featured Artist**\n` +
        `• <@&1481370041352982676> | **Partnered with this server**\n\n` +

        `🛠️ **COMMUNITY & SPECIAL**\n` +
        `• <@&1481370041336336448> | **Who friends with <@1490695243320922163>**\n\n` +

        `─────────────────────────────\n` +
        `🎟️ **Go to <#${TICKET_CHANNEL_ID}> to claim these roles! Once inside, click Support!**`
      )
      .setFooter({ text: "DonDon Moderation Systems • Server Roles" })
      .setTimestamp();

    await message.channel.send({ embeds: [rolesEmbed] });
  }
};
