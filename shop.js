const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

const RINGS = [
  { key: "wood", name: "🪵 Wooden Ring", price: 1, desc: "A rough, handmade wooden band. Perfect for a budget start.", img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  { key: "onion", name: "🍟 Plastic Onion Ring", price: 50, desc: "Smells like fast food, surprisingly durable.", img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  { key: "code", name: "💻 Binary Code Band", price: 1024, desc: "Engraved with endless lines of code for tech lovers.", img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" },
  { key: "glow", name: "✨ Glow-in-the-Dark Ring", price: 25000, desc: "Illuminates brightly during late-night gaming sessions.", img: "https://cdn-icons-png.flaticon.com/512/2904/2904838.png" },
  { key: "supernova", name: "🌌 Supernova Diamond Ring", price: 999999999, desc: "A legendary cosmic gemstone worth an absolute fortune.", img: "https://cdn-icons-png.flaticon.com/512/1086/1086741.png" }
];

module.exports = {
  name: "shop",
  aliases: ["store", "marketplace"],
  description: "Browse the ring shop and view item details.",
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Browse marriage rings and server shop items"),

  async execute(message, args, prefix, getGuildData, saveData, interaction = null) {
    const isSlash = !!interaction;
    const guild = isSlash ? interaction.guild : message.guild;
    const user = isSlash ? interaction.user : message.author;
    
    const data = getGuildData(guild ? guild.id : "global_dm");
    if (!data.economy) data.economy = {};
    if (!data.economy[user.id]) data.economy[user.id] = { coins: 0 };
    
    const userCoins = data.economy[user.id].coins;

    const catalogDescription = RINGS.map(r => 
      `**${r.name}** — \`${r.price.toLocaleString()} coins\`\n*${r.desc}*`
    ).join("\n\n");

    const shopEmbed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle("💍 Marriage Ring Boutique")
      .setDescription(
        "Welcome to the ring shop! Select a ring from the dropdown menu below to view details or select how to proceed.\n\n" +
        catalogDescription
      )
      .addFields(
        { name: "💰 Your Balance", value: `\`${userCoins.toLocaleString()} coins\``, inline: true },
        { name: "📌 Tip", value: `You can also buy & propose using \`${prefix}marry propose @user [ring]\``, inline: false }
      )
      .setThumbnail(RINGS[0].img)
      .setFooter({ text: "DonQuixotes Lounge • Shop System" });

    // Create a select menu for rings
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("shop_ring_select")
      .setPlaceholder("🔍 Select a ring to inspect...")
      .addOptions(
        RINGS.map(r => ({
          label: r.name,
          description: `Price: ${r.price.toLocaleString()} coins`,
          value: r.key,
          emoji: r.name.split(" ")[0]
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const replyPayload = { embeds: [shopEmbed], components: [row], fetchReply: true };
    const sentMsg = isSlash ? await interaction.reply(replyPayload) : await message.reply(replyPayload);

    const collector = sentMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: "❌ This shop menu is not for you!", ephemeral: true });
      }

      const selectedKey = i.values[0];
      const ring = RINGS.find(r => r.key === selectedKey);

      const updatedEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle(`💍 ${ring.name}`)
        .setDescription(
          `**Price:** \`${ring.price.toLocaleString()} coins\`\n` +
          `**Description:** ${ring.desc}\n\n` +
          `*To propose with this ring, use:*\n\`${prefix}marry propose @user ${ring.key}\``
        )
        .setThumbnail(ring.img)
        .addFields({ name: "💰 Your Balance", value: `\`${data.economy[user.id].coins.toLocaleString()} coins\``, inline: true })
        .setFooter({ text: "DonQuixotes Lounge • Shop System" });

      await i.update({ embeds: [updatedEmbed], components: [row] });
    });
  }
};
