const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Ring Catalog Definition
const RINGS = {
  wood: { name: "🪵 Wooden Ring", price: 1, img: "https://cdn-icons-png.flaticon.com/512/3504/3504381.png" },
  onion: { name: "🍟 Plastic Onion Ring", price: 50, img: "https://cdn-icons-png.flaticon.com/512/2553/2553691.png" },
  code: { name: "💻 Binary Code Band", price: 1024, img: "https://cdn-icons-png.flaticon.com/512/2103/2103633.png" },
  glow: { name: "✨ Glow-in-the-Dark Ring", price: 25000, img: "https://cdn-icons-png.flaticon.com/512/2904/2904838.png" },
  supernova: { name: "🌌 Supernova Diamond Ring", price: 999999999, img: "https://cdn-icons-png.flaticon.com/512/1086/1086741.png" }
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
              { name: "🪵 Wooden Ring (1 coin)", value: "wood" },
              { name: "🍟 Plastic Onion Ring (50 coins)", value: "onion" },
              { name: "💻 Binary Code Band (1,024 coins)", value: "code" },
              { name: "✨ Glow-in-the-Dark Ring (25,000 coins)", value: "glow" },
              { name: "🌌 Supernova Diamond Ring (999,999,999 coins)", value: "supernova" }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName("divorce")
        .setDescription("Divorce your current partner (30-day cooldown applies)")
    ),

  async execute(message, args, prefix, getGuildData, saveData) {
    const sub = args[0]?.toLowerCase();
    const data = getGuildData(message.guild ? message.guild.id : "global_dm");
    if (!data.marriages) data.marriages = {};
    if (!data.marriageCooldowns) data.marriageCooldowns = {};

    const userId = message.author.id;
    const userMarriage = data.marriages[userId];

    // VIEW STATUS
    if (!sub || sub === "status" || message.content.toLowerCase().includes("married")) {
      const targetUser = message.mentions.users.first() || message.author;
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
        .setFooter({ text: "DonQuixotes Lounge • Marriage System" });

      if (targetData) {
        statusEmbed.setThumbnail(ring.img);
        statusEmbed.addFields(
          { name: "💍 Ring Exchanged", value: ring.name, inline: true },
          { name: "⏳ Together For", value: `\`${formatDuration(Date.now() - targetData.since)}\``, inline: true },
          { name: "📅 Married Since", value: `<t:${Math.floor(targetData.since / 1000)}:D>`, inline: true }
        );
      }

      return message.reply({ embeds: [statusEmbed] });
    }

    // DIVORCE
    if (sub === "divorce") {
      if (!userMarriage) return message.reply("❌ You are not married to anyone!");

      const timeMarried = Date.now() - userMarriage.since;
      if (timeMarried < THIRTY_DAYS_MS) {
        const remaining = formatDuration(THIRTY_DAYS_MS - timeMarried);
        return message.reply(`⏳ You must be married for at least **30 days** before divorcing. Remaining cooldown: \`${remaining}\`.`);
      }

      const partnerId = userMarriage.partnerId;
      delete data.marriages[userId];
      delete data.marriages[partnerId];

      data.marriageCooldowns[userId] = Date.now() + THIRTY_DAYS_MS;
      data.marriageCooldowns[partnerId] = Date.now() + THIRTY_DAYS_MS;
      saveData();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("💔 Marriage Ended")
            .setDescription(`**${message.author.username}** and **${userMarriage.partnerTag}** have officially divorced.\n*30-day marriage cooldown applied to both users.*`)
        ]
      });
    }

    // PROPOSE
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Mention a user to propose to! Usage: `?marry @user [wood|onion|code|glow|supernova]`");

    if (target.id === userId) return message.reply("❌ You cannot marry yourself!");
    if (target.bot) return message.reply("❌ You cannot marry bots!");
    if (userMarriage) return message.reply("❌ You are already married!");
    if (data.marriages[target.id]) return message.reply(`❌ **${target.username}** is already married!`);

    if (data.marriageCooldowns[userId] && Date.now() < data.marriageCooldowns[userId]) {
      return message.reply(`⏳ You are on post-divorce cooldown for \`${formatDuration(data.marriageCooldowns[userId] - Date.now())}\`.`);
    }

    // Ring Selection Logic (Defaults to wood if not specified)
    const chosenRingKey = (args[1] && RINGS[args[1].toLowerCase()]) ? args[1].toLowerCase() : "wood";
    const ring = RINGS[chosenRingKey];

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_marry").setLabel("Accept 💍").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("decline_marry").setLabel("Decline ❌").setStyle(ButtonStyle.Danger)
    );

    const proposalMsg = await message.reply({
      content: `<@${target.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xff69b4)
          .setTitle("💍 Marriage Proposal!")
          .setDescription(
            `**${message.author.username}** has proposed to **${target.username}**!\n\n` +
            `**Offered Ring:** ${ring.name}\n` +
            `**Value:** \`${ring.price.toLocaleString()} coins\``
          )
          .setThumbnail(ring.img)
      ],
      components: [row]
    });

    const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) return i.reply({ content: "❌ Only the proposed user can respond!", ephemeral: true });

      if (i.customId === "accept_marry") {
        const now = Date.now();
        data.marriages[userId] = { partnerId: target.id, partnerTag: target.username, since: now, ring: chosenRingKey };
        data.marriages[target.id] = { partnerId: userId, partnerTag: message.author.username, since: now, ring: chosenRingKey };
        saveData();

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🎉 Just Married!")
              .setDescription(`💖 **${message.author.username}** & **${target.username}** are now officially married!\n\nThey exchanged the **${ring.name}** 💍✨`)
              .setThumbnail(ring.img)
          ],
          components: []
        });
      } else {
        await i.update({
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`💔 **${target.username}** declined the proposal.`)],
          components: []
        });
      }
      collector.stop();
    });
  }
};
