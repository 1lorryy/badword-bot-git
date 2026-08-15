const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Ring Catalog Definition (Updated prices and DON currency alignment)
const RINGS = {
  wood: { name: "🪵 Wooden Ring", price: 5, img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  onion: { name: "🍟 Plastic Onion Ring", price: 150, img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  code: { name: "💻 Binary Code Band", price: 5000, img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" },
  glow: { name: "✨ Glow-in-the-Dark Ring", price: 50000, img: "https://cdn-icons-png.flaticon.com/512/2904/2904838.png" },
  supernova: { name: "🌌 Supernova Diamond Ring", price: 1000000, img: "https://cdn-icons-png.flaticon.com/512/1086/1086741.png" }
};

function formatDuration(ms) {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day}d ${hr % 24}h`;
  if (hr > 0) return `${hr}h ${min % 60}m`;
  return `${min}m ${sec % 60}s`;
}

module.exports = {
  name: "marry",
  aliases: ["marriage", "married", "divorce", "spouse"],
  description: "Marry another user with custom rings, check status, or request a divorce.",
  data: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Marriage management system")
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("Check marriage status privately")
        .addUserOption(opt => opt.setName("user").setDescription("Target user (leave empty for yourself)").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("propose")
        .setDescription("Propose to another user with a ring")
        .addUserOption(opt => opt.setName("user").setDescription("User to marry").setRequired(true))
        .addStringOption(opt =>
          opt.setName("ring")
            .setDescription("Ring type to offer")
            .setRequired(false)
            .addChoices(
              { name: "🪵 Wooden Ring (5 DON)", value: "wood" },
              { name: "🍟 Plastic Onion Ring (150 DON)", value: "onion" },
              { name: "💻 Binary Code Band (5,000 DON)", value: "code" },
              { name: "✨ Glow-in-the-Dark Ring (50,000 DON)", value: "glow" },
              { name: "🌌 Supernova Diamond Ring (1,000,000 DON)", value: "supernova" }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName("divorce")
        .setDescription("Divorce your current partner (30-day cooldown applies)")
    ),

  async execute(message, args, prefix, getGuildData, saveData, interaction = null) {
    const isSlash = !!interaction;
    const guild = isSlash ? interaction.guild : message.guild;
    const user = isSlash ? interaction.user : message.author;
    const sub = isSlash ? interaction.options.getSubcommand() : args[0]?.toLowerCase();

    const data = getGuildData(guild ? guild.id : "global_dm");
    if (!data.marriages) data.marriages = {};
    if (!data.marriageCooldowns) data.marriageCooldowns = {};
    if (!data.economy) data.economy = {};
    if (!data.economy[user.id]) data.economy[user.id] = { coins: 0 };

    const userId = user.id;
    const userMarriage = data.marriages[userId];

    // VIEW STATUS
    if (!sub || sub === "status" || (!isSlash && message.content.toLowerCase().includes("married"))) {
      const targetUser = isSlash ? (interaction.options.getUser("user") || user) : (message.mentions.users.first() || message.author);
      const targetData = data.marriages[targetUser.id];
      const ring = targetData ? (RINGS[targetData.ring] || RINGS.wood) : null;

      const statusEmbed = new EmbedBuilder()
        .setColor(targetData ? 0xff69b4 : 0x2b2d31)
        .setAuthor({ name: "Marriage Status", iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
        .setDescription(
          targetData 
            ? `💍 **${targetUser.username}** is happily married to **${targetData.partnerTag}**!`
            : `💔 **${targetUser.username}** is currently single.`
        )
        .setFooter({ text: "donQuixoted lounge • Marriage System" });

      if (targetData) {
        statusEmbed.setThumbnail(ring.img);
        statusEmbed.addFields(
          { name: "💍 Ring Exchanged", value: ring.name, inline: true },
          { name: "⏳ Together For", value: `\`${formatDuration(Date.now() - targetData.since)}\``, inline: true },
          { name: "📅 Married Since", value: `<t:${Math.floor(targetData.since / 1000)}:D>`, inline: true }
        );
      }

      const replyPayload = { embeds: [statusEmbed] };
      return isSlash ? await interaction.reply(replyPayload) : await message.reply(replyPayload);
    }

    // DIVORCE
    if (sub === "divorce") {
      if (!userMarriage) {
        const replyText = "❌ You are not married to anyone!";
        return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
      }

      const timeMarried = Date.now() - userMarriage.since;
      if (timeMarried < THIRTY_DAYS_MS) {
        const remaining = formatDuration(THIRTY_DAYS_MS - timeMarried);
        const replyText = `⏳ You must be married for at least **30 days** before divorcing. Remaining cooldown: \`${remaining}\`.`;
        return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
      }

      const partnerId = userMarriage.partnerId;
      delete data.marriages[userId];
      delete data.marriages[partnerId];

      data.marriageCooldowns[userId] = Date.now() + THIRTY_DAYS_MS;
      data.marriageCooldowns[partnerId] = Date.now() + THIRTY_DAYS_MS;
      saveData();

      const divorcePayload = {
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("💔 Marriage Ended")
            .setDescription(`**${user.username}** and **${userMarriage.partnerTag}** have officially divorced.\n*30-day marriage cooldown applied to both users.*`)
        ]
      };
      return isSlash ? await interaction.reply(divorcePayload) : await message.reply(divorcePayload);
    }

    // PROPOSE
    const target = isSlash ? interaction.options.getUser("user") : message.mentions.users.first();
    if (!target) {
      const replyText = "❌ Mention a user to propose to! Usage: `?marry propose @user [wood|onion|code|glow|supernova]`";
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    if (target.id === userId) {
      const replyText = "❌ You cannot marry yourself!";
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }
    if (target.bot) {
      const replyText = "❌ You cannot marry bots!";
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }
    if (userMarriage) {
      const replyText = "❌ You are already married!";
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }
    if (data.marriages[target.id]) {
      const replyText = `❌ **${target.username}** is already married!`;
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    if (data.marriageCooldowns[userId] && Date.now() < data.marriageCooldowns[userId]) {
      const replyText = `⏳ You are on post-divorce cooldown for \`${formatDuration(data.marriageCooldowns[userId] - Date.now())}\`.`;
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    // Ring Selection Logic (Defaults to wood if not specified)
    const chosenRingKey = isSlash 
      ? (interaction.options.getString("ring") || "wood")
      : ((args[1] && RINGS[args[1].toLowerCase()]) ? args[1].toLowerCase() : "wood");
      
    const ring = RINGS[chosenRingKey];

    // Check user balance for ring purchase
    const userCoins = data.economy[userId].coins;
    if (userCoins < ring.price) {
      const replyText = `❌ You need **${ring.price.toLocaleString()} DON** to buy the ${ring.name}, but you only have **${userCoins.toLocaleString()} DON**!`;
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_marry").setLabel("Accept 💍").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("decline_marry").setLabel("Decline ❌").setStyle(ButtonStyle.Danger)
    );

    const proposalPayload = {
      content: `<@${target.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xff69b4)
          .setTitle("💍 Marriage Proposal!")
          .setDescription(
            `**${user.username}** has proposed to **${target.username}**!\n\n` +
            `**Offered Ring:** ${ring.name}\n` +
            `**Price:** \`${ring.price.toLocaleString()} DON\``
          )
          .setThumbnail(ring.img)
      ],
      components: [row],
      fetchReply: true
    };

    const proposalMsg = isSlash ? await interaction.reply(proposalPayload) : await message.reply(proposalPayload);

    const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({ content: "❌ Only the proposed user can respond!", ephemeral: true });
      }

      if (i.customId === "accept_marry") {
        // Re-verify balance upon acceptance to prevent exploits
        if (!data.economy[userId] || data.economy[userId].coins < ring.price) {
          return i.update({
            content: `❌ **${user.username}** no longer has enough DON coins to buy the ${ring.name}!`,
            embeds: [],
            components: []
          });
        }

        // Deduct ring price from proposer
        data.economy[userId].coins -= ring.price;

        const now = Date.now();
        data.marriages[userId] = { partnerId: target.id, partnerTag: target.username, since: now, ring: chosenRingKey };
        data.marriages[target.id] = { partnerId: userId, partnerTag: user.username, since: now, ring: chosenRingKey };
        saveData();

        await i.update({
          content: null,
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🎉 Just Married!")
              .setDescription(`💖 **${user.username}** & **${target.username}** are now officially married!\n\nThey exchanged the **${ring.name}** 💍✨`)
              .setThumbnail(ring.img)
          ],
          components: []
        });
      } else {
        await i.update({
          content: null,
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`💔 **${target.username}** declined the proposal.`)],
          components: []
        });
      }
      collector.stop();
    });
  }
};
