const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, SlashCommandBuilder } = require("discord.js");

module.exports = {
  name: "adopt",
  aliases: ["disown", "family", "children", "parents"],
  description: "Adopt users, manage family trees, or disown children.",
  data: new SlashCommandBuilder()
    .setName("adopt")
    .setDescription("Adoption & family tree management")
    .addSubcommand(sub =>
      sub.setName("family")
        .setDescription("View family tree privately")
        .addUserOption(opt => opt.setName("user").setDescription("Target user").setRequired(false))
        .addBooleanOption(opt => opt.setName("private").setDescription("Hide response so only you see it").setRequired(false))
    )
    .addSubcommand(sub =>
      sub.setName("request")
        .setDescription("Adopt a user")
        .addUserOption(opt => opt.setName("user").setDescription("User to adopt").setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName("disown")
        .setDescription("Disown a child")
        .addUserOption(opt => opt.setName("user").setDescription("Child to disown").setRequired(true))
    ),

  async execute(message, args, prefix, getGuildData, saveData) {
    const sub = args[0]?.toLowerCase();
    const data = getGuildData(message.guild ? message.guild.id : "global_dm");
    if (!data.families) data.families = {};

    const userId = message.author.id;
    if (!data.families[userId]) data.families[userId] = { parent: null, children: [] };

    // VIEW FAMILY TREE
    if (!sub || sub === "family" || sub === "tree" || message.content.toLowerCase().includes("family")) {
      const targetUser = message.mentions.users.first() || message.author;
      const targetFam = data.families[targetUser.id] || { parent: null, children: [] };

      const parentText = targetFam.parent ? `<@${targetFam.parent}>` : "*None*";
      const childrenText = targetFam.children.length > 0 ? targetFam.children.map(c => `<@${c}>`).join("\n") : "*No children*";

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865f2)
            .setAuthor({ name: `${targetUser.username}'s Family Tree`, iconURL: targetUser.displayAvatarURL({ dynamic: true }) })
            .addFields(
              { name: "👑 Parent", value: parentText, inline: true },
              { name: "👶 Children", value: childrenText, inline: false }
            )
            .setFooter({ text: "DonQuixotes Lounge • Family System" })
        ]
      });
    }

    // DISOWN
    if (sub === "disown") {
      const childTarget = message.mentions.users.first();
      if (!childTarget) return message.reply("❌ Mention the child you wish to disown!");

      if (!data.families[userId].children.includes(childTarget.id)) {
        return message.reply("❌ That user is not your child!");
      }

      data.families[userId].children = data.families[userId].children.filter(id => id !== childTarget.id);
      if (data.families[childTarget.id]) data.families[childTarget.id].parent = null;
      saveData();

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setDescription(`💥 **${message.author.username}** disowned **${childTarget.username}** from their family.`)
        ]
      });
    }

    // ADOPT
    const target = message.mentions.users.first();
    if (!target) return message.reply("❌ Mention a user to adopt! Usage: `?adopt @user` or `?adopt family`");

    if (target.id === userId) return message.reply("❌ You cannot adopt yourself!");
    if (target.bot) return message.reply("❌ You cannot adopt bots!");

    if (!data.families[target.id]) data.families[target.id] = { parent: null, children: [] };
    if (data.families[target.id].parent) return message.reply(`❌ **${target.username}** already has a parent!`);
    if (data.families[userId].children.includes(target.id)) return message.reply(`❌ **${target.username}** is already your child!`);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("accept_adopt").setLabel("Accept 🍼").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("decline_adopt").setLabel("Decline ❌").setStyle(ButtonStyle.Danger)
    );

    const adoptMsg = await message.reply({
      content: `<@${target.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0xfee75c)
          .setTitle("🍼 Adoption Request!")
          .setDescription(`**${message.author.username}** wants to adopt **${target.username}** as their child!\nDo you accept?`)
      ],
      components: [row]
    });

    const collector = adoptMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on("collect", async (i) => {
      if (i.user.id !== target.id) return i.reply({ content: "❌ Only the target user can respond!", ephemeral: true });

      if (i.customId === "accept_adopt") {
        data.families[userId].children.push(target.id);
        data.families[target.id].parent = userId;
        saveData();

        await i.update({
          embeds: [
            new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("🏠 Adoption Complete!")
              .setDescription(`🎉 **${target.username}** is now officially the child of **${message.author.username}**!`)
          ],
          components: []
        });
      } else {
        await i.update({
          embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`❌ **${target.username}** declined the request.`)],
          components: []
        });
      }
      collector.stop();
    });
  }
};
