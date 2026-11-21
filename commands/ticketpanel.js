const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} = require("discord.js");

module.exports = {
  name: "ticketpanel",
  description: "Posts the 3-category ticket panel",
  async execute(message) {
    await message.delete().catch(() => null);

    const isAdmin =
      message.member.permissions.has(PermissionFlagsBits.Administrator) ||
      message.guild.ownerId === message.author.id;

    if (!isAdmin) {
      return message.channel
        .send("❌ **Access Denied:** Only administrators can post the ticket panel.")
        .then((m) => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const panelEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🎟️ TICKETS")
      .setDescription(
        `Select the category that matches your request to open a private ticket:\n\n` +
        `🎁 **CLAIM TICKET**\n` +
        `> *Giveaways, quickdrops, event wins & reward claims*\n\n` +
        `🛠️ **SUPPORT TICKET**\n` +
        `> *Questions, help, booster perks & reports*\n\n` +
        `🛒 **PURCHASE TICKET**\n` +
        `> *VIP, adverts, gamepasses & other server purchases*\n\n` +
        `⚠️ **Please do not open troll or unnecessary tickets.**`
      )
      .setFooter({
        text: `${message.guild.name} • Ticket System`,
        iconURL: message.guild.iconURL({ dynamic: true })
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tkt_open_claims")
        .setLabel("Claim Ticket")
        .setEmoji("🎁")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("tkt_open_support")
        .setLabel("Support Ticket")
        .setEmoji("🛠️")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("tkt_open_purchases")
        .setLabel("Purchase Ticket")
        .setEmoji("🛒")
        .setStyle(ButtonStyle.Success)
    );

    await message.channel.send({ embeds: [panelEmbed], components: [row] });
  }
};
