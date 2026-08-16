const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, SlashCommandBuilder } = require("discord.js");

const RINGS = [
  { key: "wood", name: "🪵 Wooden Ring", price: 5, desc: "A rough, handmade wooden band. Perfect for a budget start.", img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  { key: "onion", name: "🍟 Plastic Onion Ring", price: 150, desc: "Smells like fast food, surprisingly durable.", img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  { key: "code", name: "💻 Binary Code Band", price: 5000, desc: "Engraved with endless lines of high-tech server code. Only the true Unc can wield this legendary mainframe artifact.", img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png", exclusive: "1221773740434653299" },
  { key: "skibidi", name: "🚽 Skibidi Ring", price: 10, desc: "Taxes 10% of you and your partner's job earnings to mochi.", img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  { key: "glow", name: "✨ Glow-in-the-Dark Ring", price: 50000, desc: "Illuminates brightly during late-night gaming sessions.", img: "https://cdn-icons-png.flaticon.com/512/2904/2904838.png" },
  { key: "supernova", name: "🌌 Supernova Diamond Ring", price: 1000000, desc: "A legendary cosmic gemstone worth an absolute fortune.", img: "https://cdn-icons-png.flaticon.com/512/1086/1086741.png" }
];

module.exports = {
  name: "shop",
  aliases: ["store", "marketplace"],
  description: "Browse the interactive paginated ring shop boutique.",
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

    // Build main overview embed listing all pages / rings cleanly
    const mainEmbed = new EmbedBuilder()
      .setColor(0xff69b4)
      .setTitle("💍 donQuixoted Lounge • Ring Boutique")
      .setDescription(
        "Welcome to the interactive ring boutique! Use the dropdown menu below to flip through each ring's **dedicated page**, check full descriptions, and view pricing.\n\n" +
        "✨ **Catalog Overview:**\n" +
        RINGS.map((r, idx) => {
          let priceTag = `\`${r.price.toLocaleString()} DON\``;
          if (r.exclusive && user.id === r.exclusive) priceTag = "`FREE (Unc Perk!)`";
          return `**${idx + 1}.** ${r.name} — ${priceTag}`;
        }).join("\n")
      )
      .addFields(
        { name: "💰 Your Balance", value: `\`${userCoins.toLocaleString()} DON\``, inline: true },
        { name: "📌 Quick Propose Tip", value: `\`${prefix}marry propose @user [ring]\``, inline: true }
      )
      .setThumbnail(RINGS[0].img)
      .setFooter({ text: "Select a ring page from the dropdown menu below • donQuixoted lounge" });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("shop_ring_select")
      .setPlaceholder("📖 Select a ring page to view...")
      .addOptions(
        RINGS.map((r, idx) => {
          let descText = `Price: ${r.price.toLocaleString()} DON`;
          if (r.exclusive && user.id === r.exclusive) descText = "Price: FREE (Special Unc Perk)";
          else if (r.exclusive) descText = "Exclusive (Locked for you)";

          return {
            label: `Page ${idx + 1}: ${r.name}`,
            description: descText,
            value: r.key,
            emoji: r.name.split(" ")[0]
          };
        })
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const replyPayload = { embeds: [mainEmbed], components: [row], fetchReply: true };
    const sentMsg = isSlash ? await interaction.reply(replyPayload) : await message.reply(replyPayload);

    const collector = sentMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 120000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== user.id) {
        return i.reply({ content: "❌ This shop menu belongs to someone else!", ephemeral: true });
      }

      const selectedKey = i.values[0];
      const ring = RINGS.find(r => r.key === selectedKey);
      const ringIndex = RINGS.findIndex(r => r.key === selectedKey) + 1;

      let displayPrice = `${ring.price.toLocaleString()} DON`;
      let exclusiveText = "";

      if (ring.exclusive) {
        if (i.user.id === ring.exclusive) {
          displayPrice = "`FREE` *(Exclusive Unc Perk!)*";
          exclusiveText = `💻✨ **MAINFRAME OVERRIDE:** This legendary binary code band is customized for you, Unc! Enjoy your exclusive free pricing.\n\n`;
        } else {
          exclusiveText = `🔒 *Exclusive Ring: This item is strictly restricted and can only be acquired by <@${ring.exclusive}>.*\n\n`;
        }
      }

      const updatedCoins = data.economy[user.id] ? data.economy[user.id].coins : 0;

      const pageEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle(`📖 Ring Page ${ringIndex} of ${RINGS.length} • ${ring.name}`)
        .setDescription(
          `**Price:** ${displayPrice}\n` +
          `**Description:** ${ring.desc}\n\n` +
          exclusiveText +
          `*To propose with this ring, use:*\n\`${prefix}marry propose @user ${ring.key}\``
        )
        .setThumbnail(ring.img)
        .addFields({ name: "💰 Your Balance", value: `\`${updatedCoins.toLocaleString()} DON\``, inline: true })
        .setFooter({ text: `donQuixoted lounge • Page ${ringIndex}/${RINGS.length}` });

      await i.update({ embeds: [pageEmbed], components: [row] });
    });
  }
};
