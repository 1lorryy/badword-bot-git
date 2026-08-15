const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

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
  description: "Marry another user, check status privately, or request a divorce.",
  data: new SlashCommandBuilder()
    .setName("marry")
    .setDescription("Marriage management system")
    .addSubcommand(sub =>
      sub.setName("status")
        .setDescription("Check marriage status privately")
        .addUserOption(opt => opt.setName("user").setDescription("Target user (leave empty for yourself)").setRequired(false))
        .addBooleanOption(opt => opt.setName("private").setDescription("Hide response so only you see it").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("propose")
        .setDescription("Propose to another user")
        .addUserOption(opt => opt.setName("user").setDescription("User to marry").setRequired(true))
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
        statusEmbed.addFields(
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
    if (!target) return message.reply("❌ Mention a user to propose to! Usage: `?marry @user` or `?marry status`");

    if (target.id === userId) return message.reply("❌ You cannot marry yourself!");
    if (target.bot) return message.reply("❌ You cannot marry bots!");
    if (userMarriage) return message.reply("❌ You are already married!");
    if (data.marriages[target.id]) return message.reply(`❌ **${target.username}** is already married!`);

    if (data.marriageCooldowns[userId] && Date.now() < data.marriageCooldowns[userId]) {
      return message.reply(`⏳ You are on post-divorce cooldown for \`${formatDuration(data.marriageCooldowns[userId] - Date.now())}\`.`);
    }

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
          .setDescription(`**${message.author.username}** has proposed to **${target.username}**!\nDo you accept?`)
      ],
      components: [row]
    });

    const collector = proposalMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) return i.reply({ content: "❌ Only the proposed user can respond!", ephemeral: true });

      if (i.customId === "accept_marry") {
        const now = Date.now();
        data.marriages[userId] = { partnerId: target.id, partnerTag: target.username, since: now };
        data.marriages[target.id] = { partnerId: userId, partnerTag: message.author.username, since: now };
        saveData();

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🎉 Just Married!")
              .setDescription(`💖 **${message.author.username}** & **${target.username}** are now officially married!`)
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
