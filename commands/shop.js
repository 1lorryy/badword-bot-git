const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, SlashCommandBuilder } = require("discord.js");

const RINGS = [
  { key: "wood", name: "🪵 Wooden Ring", price: 5, desc: "A rough, handmade wooden band. Perfect for a budget start.", img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  { key: "onion", name: "🍟 Plastic Onion Ring", price: 150, desc: "Smells like fast food, surprisingly durable.", img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  { key: "code", name: "💻 Binary Code Band", price: 5000, desc: "Engraved with endless lines of code for tech lovers.", img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png", exclusive: "1221773740434653299" },
  { key: "skibidi", name: "🚽 Skibidi Ring", price: 10, desc: "Taxes 10% of you and your partner's job earnings to mochi.", img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  { key: "glow", name: "✨ Glow-in-the-Dark Ring", price: 50000, desc: "Illuminates brightly during late-night gaming sessions.", img: "https://cdn-icons-png.flaticon.com/512/2904/2904838.png" },
  { key: "supernova", name: "🌌 Supernova Diamond Ring", price: 1000000, desc: "A legendary cosmic gemstone worth an absolute fortune.", img: "https://cdn-icons-png.flaticon.com/512/1086/1086741.png" }
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

    const catalogDescription = RINGS.map(r => {
      let suffix = "";
      if (r.exclusive) {
        // Only show if the current browsing user is *not* unc, or phrase it for him specifically
        if (user.id === r.exclusive) {
          suffix = " *(Exclusive: Unlocked for you!)*";
        } else {
          suffix = " *(Exclusive to <@${r.exclusive}>)*";
        }
      }
      return `**${r.name}** — \`${r.price.toLocaleString()} DON\`${suffix}\n*${r.desc}*`;
    }).join("\n\n");

    const shopEmbed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle("💍 Marriage Ring Boutique")
      .setDescription(
        "Welcome to the ring shop! Select a ring from the dropdown menu below to view details or select how to proceed.\n\n" +
        catalogDescription
      )
      .addFields(
        { name: "💰 Your Balance", value: `\`${userCoins.toLocaleString()} DON\``, inline: true },
        { name: "📌 Tip", value: `You can also buy & propose using \`${prefix}marry propose @user [ring]\``, inline: false }
      )
      .setThumbnail(RINGS[0].img)
      .setFooter({ text: "donQuixoted lounge • Shop System" });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("shop_ring_select")
      .setPlaceholder("🔍 Select a ring to inspect...")
      .addOptions(
        RINGS.map(r => ({
          label: r.name,
          description: `Price: ${r.price.toLocaleString()} DON${r.exclusive && user.id !== r.exclusive ? " (Locked)" : ""}`,
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

      let exclusiveText = "";
      if (ring.exclusive) {
        if (i.user.id === ring.exclusive) {
          exclusiveText = `✨ *Exclusive Ring: This legendary ring is fully unlocked for you, unc!*\n\n`;
        } else {
          exclusiveText = `🔒 *Exclusive Ring: Only <@${ring.exclusive}> can purchase and wear this item!*\n\n`;
        }
      }

      const updatedEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle(`💍 ${ring.name}`)
        .setDescription(
          `**Price:** \`${ring.price.toLocaleString()} DON\`\n` +
          `**Description:** ${ring.desc}\n\n` +
          exclusiveText +
          `*To propose with this ring, use:*\n\`${prefix}marry propose @user ${ring.key}\``
        )
        .setThumbnail(ring.img)
        .addFields({ name: "💰 Your Balance", value: `\`${data.economy[user.id].coins.toLocaleString()} DON\``, inline: true })
        .setFooter({ text: "donQuixoted lounge • Shop System" });

      await i.update({ embeds: [updatedEmbed], components: [row] });
    });
  }
};
