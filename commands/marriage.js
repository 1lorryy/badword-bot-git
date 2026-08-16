const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Ring Catalog Definition
const RINGS = {
  wood: { name: "🪵 Wooden Ring", price: 5, img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  onion: { name: "🍟 Plastic Onion Ring", price: 150, img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  code: { name: "💻 Binary Code Band", price: 5000, img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png", exclusive: "1221773740434653299" },
  skibidi: { name: "🚽 Skibidi Ring", price: 10, img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
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
  description: "Marry another user with custom rings from your inventory, check status, or request a divorce.",
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
        .setDescription("Propose to another user with a ring from your inventory")
        .addUserOption(opt => opt.setName("user").setDescription("User to marry").setRequired(true))
        .addStringOption(opt =>
          opt.setName("ring")
            .setDescription("Ring type from your inventory")
            .setRequired(false)
            .addChoices(
              { name: "🪵 Wooden Ring", value: "wood" },
              { name: "🍟 Plastic Onion Ring", value: "onion" },
              { name: "💻 Binary Code Band", value: "code" },
              { name: "🚽 Skibidi Ring", value: "skibidi" },
              { name: "✨ Glow-in-the-Dark Ring", value: "glow" },
              { name: "🌌 Supernova Diamond Ring", value: "supernova" }
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
    
    // Parse subcommand for both slash and prefix (?marry propose @user ring)
    let sub = isSlash ? interaction.options.getSubcommand() : null;
    if (!isSlash && args[0]) {
      const firstArg = args[0].toLowerCase();
      if (["status", "propose", "divorce"].includes(firstArg)) {
        sub = firstArg;
      } else if (message.mentions.users.size > 0 || firstArg) {
        // Default prefix usage like ?marry @user [ring] becomes a proposal
        sub = "propose";
      }
    }
    if (!sub) sub = "status";

    const data = getGuildData(guild ? guild.id : "global_dm");
    if (!data.marriages) data.marriages = {};
    if (!data.marriageCooldowns) data.marriageCooldowns = {};
    if (!data.economy) data.economy = {};
    if (!data.economy[user.id]) data.economy[user.id] = { coins: 0, inventory: [] };
    if (!data.economy[user.id].inventory) data.economy[user.id].inventory = [];

    const userId = user.id;
    const userMarriage = data.marriages[userId];

    // VIEW STATUS
    if (sub === "status") {
      const targetUser = isSlash 
        ? (interaction.options.getUser("user") || user) 
        : (message.mentions.users.first() || user);
      
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
        .setFooter({ text: "DonQuixotes lounge • Marriage System" });

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
      saveData(guild ? guild.id : "global_dm", data);

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
    let target = isSlash ? interaction.options.getUser("user") : message.mentions.users.first();
    
    // Handle prefix fallback parsing if target wasn't explicitly captured via subcommand keyword
    if (!isSlash && !target && args.length > 0) {
      const possibleUserArg = args[args[0].toLowerCase() === "propose" ? 1 : 0];
      if (possibleUserArg) {
        const cleanedId = possibleUserArg.replace(/<@!?(\d+)>/, "$1");
        try {
          target = await client.users.fetch(cleanedId);
        } catch (e) {}
      }
    }

    if (!target) {
      const replyText = `❌ Mention a user to propose to! Usage: \`${prefix}marry propose @user [ring]\``;
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

    const userInventory = data.economy[userId].inventory;

    // Ring Selection Logic for both Slash & Prefix
    let chosenRingKey = null;
    if (isSlash) {
      chosenRingKey = interaction.options.getString("ring");
    } else {
      // Look through arguments for a ring key match (e.g., supernova, glow, code, etc.)
      const ringArg = args.find(arg => RINGS[arg.toLowerCase()]);
      if (ringArg) chosenRingKey = ringArg.toLowerCase();
    }

    if (!chosenRingKey) {
      // Smart fallback: pick highest value ring owned, else default to wood[cite: 7]
      const priorityOrder = ["supernova", "glow", "code", "onion", "skibidi", "wood"];
      const foundRing = priorityOrder.find(r => userInventory.includes(r) || (r === "code" && userId === "1221773740434653299"));
      chosenRingKey = foundRing || "wood";
    }

    const ring = RINGS[chosenRingKey];

    // Check Exclusive Ring Restrictions
    if (ring.exclusive && userId !== ring.exclusive) {
      const replyText = `❌ The **${ring.name}** is exclusively restricted and can only be used by <@${ring.exclusive}>!`;
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    // Check inventory validation
    const hasRing = userInventory.includes(chosenRingKey) || (chosenRingKey === "code" && userId === "1221773740434653299");

    if (!hasRing) {
      const replyText = `❌ You don't own the **${ring.name}**! Go to the shop (\`${prefix}shop\`) and buy it first before proposing with it.`;
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
            (chosenRingKey === "skibidi" ? `⚠️ *Note: Wearing the Skibidi Ring automatically taxes 10% of job earnings to mochi!*` : "")
          )
          .setThumbnail(ring.img)
      ],
      components: [row]
    };

    const proposalMsg = isSlash ? await interaction.reply({ ...proposalPayload, fetchReply: true }) : await message.reply(proposalPayload);

    const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) {
        return i.reply({ content: "❌ Only the proposed user can respond!", ephemeral: true });
      }

      if (i.customId === "accept_marry") {
        const now = Date.now();
        data.marriages[userId] = { partnerId: target.id, partnerTag: target.username, since: now, ring: chosenRingKey };
        data.marriages[target.id] = { partnerId: userId, partnerTag: user.username, since: now, ring: chosenRingKey };
        saveData(guild ? guild.id : "global_dm", data);

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
