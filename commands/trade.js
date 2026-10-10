const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");

async function execute(message, args, prefix, getGuildData, saveData) {
  const targetUser = message.mentions.users.first();
  if (!targetUser || targetUser.bot || targetUser.id === message.author.id) {
    return message.reply(`❌ Usage: \`${prefix}trade @user\` (You cannot trade yourself or bots!)`);
  }

  const data = getGuildData(message.guild.id);
  if (!data.pets) data.pets = {};

  const senderId = message.author.id;
  const receiverId = targetUser.id;

  const senderPets = data.pets[senderId] || [];
  const receiverPets = data.pets[receiverId] || [];

  if (senderPets.length === 0) {
    return message.reply(`❌ You don't have any pets to trade! Open crates using \`${prefix}crates\` first.`);
  }
  if (receiverPets.length === 0) {
    return message.reply(`❌ <@${receiverId}> doesn't have any pets in their inventory to trade!`);
  }

  // 1. Send Trade Request
  const requestEmbed = new EmbedBuilder()
    .setTitle("🤝 Pet Trade Request")
    .setColor(0x5865f2)
    .setDescription(`<@${receiverId}>, you have received a pet trade request from <@${senderId}>!\n\nClick **Accept** below to open the secure trading session.`)
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("trade_accept").setLabel("Accept Trade").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("trade_decline").setLabel("Decline").setStyle(ButtonStyle.Danger)
  );

  const requestMsg = await message.channel.send({ content: `<@${receiverId}>`, embeds: [requestEmbed], components: [row] });

  const collector = requestMsg.createMessageComponentCollector({
    filter: (i) => i.user.id === receiverId,
    time: 30000
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "trade_decline") {
      return interaction.update({ content: "❌ Trade request was declined.", embeds: [], components: [] });
    }

    if (interaction.customId === "trade_accept") {
      const senderOptions = senderPets.slice(0, 25).map((p, idx) => ({
        label: `${p.name} (${p.rarity})`,
        description: `Value: ${p.value} DON`,
        value: String(idx)
      }));

      const receiverOptions = receiverPets.slice(0, 25).map((p, idx) => ({
        label: `${p.name} (${p.rarity})`,
        description: `Value: ${p.value} DON`,
        value: String(idx)
      }));

      const senderMenu = new StringSelectMenuBuilder()
        .setCustomId("trade_sender_select")
        .setPlaceholder("Select your pet to trade...")
        .addOptions(senderOptions);

      const receiverMenu = new StringSelectMenuBuilder()
        .setCustomId("trade_receiver_select")
        .setPlaceholder("Select your pet to trade...")
        .addOptions(receiverOptions);

      const menuRow1 = new ActionRowBuilder().addComponents(senderMenu);
      const menuRow2 = new ActionRowBuilder().addComponents(receiverMenu);
      const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("trade_confirm").setLabel("Confirm & Swap").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("trade_cancel").setLabel("Cancel").setStyle(ButtonStyle.Secondary)
      );

      let selectedSenderIdx = null;
      let selectedReceiverIdx = null;

      const tradeEmbed = new EmbedBuilder()
        .setTitle("🔄 Active Pet Trade Session")
        .setColor(0x5865f2)
        .setDescription(
          `<@${senderId}> and <@${receiverId}>, select the pet you want to offer from the dropdowns below, then click **Confirm & Swap**!`
        );

      const tradeMsg = await interaction.update({
        content: null,
        embeds: [tradeEmbed],
        components: [menuRow1, menuRow2, confirmRow]
      });

      const tradeCollector = tradeMsg.createMessageComponentCollector({ time: 60000 });

      tradeCollector.on("collect", async (i) => {
        if (i.customId === "trade_sender_select" && i.user.id === senderId) {
          selectedSenderIdx = parseInt(i.values[0], 10);
          await i.reply({ content: `✅ You selected **${senderPets[selectedSenderIdx].name}**.`, ephemeral: true });
        } else if (i.customId === "trade_receiver_select" && i.user.id === receiverId) {
          selectedReceiverIdx = parseInt(i.values[0], 10);
          await i.reply({ content: `✅ You selected **${receiverPets[selectedReceiverIdx].name}**.`, ephemeral: true });
        } else if (i.customId === "trade_cancel") {
          tradeCollector.stop();
          return i.update({ content: "❌ Trade session cancelled.", embeds: [], components: [] });
        } else if (i.customId === "trade_confirm") {
          if (selectedSenderIdx === null || selectedReceiverIdx === null) {
            return i.reply({ content: "❌ Both users must select a pet before confirming!", ephemeral: true });
          }

          const currentData = getGuildData(message.guild.id);
          const sPet = currentData.pets[senderId].splice(selectedSenderIdx, 1)[0];
          const rPet = currentData.pets[receiverId].splice(selectedReceiverIdx, 1)[0];

          currentData.pets[senderId].push(rPet);
          currentData.pets[receiverId].push(sPet);
          saveData();

          const successEmbed = new EmbedBuilder()
            .setTitle("🎉 Trade Successful!")
            .setColor(0x57f287)
            .setDescription(
              `Secure animal trade completed between <@${senderId}> and <@${receiverId}>!\n\n` +
              `• **<@${senderId}>** received: ${rPet.emoji} **${rPet.name}** (\`${rPet.rarity}\`)\n` +
              `• **<@${receiverId}>** received: ${sPet.emoji} **${sPet.name}** (\`${sPet.rarity}\`)`
            )
            .setTimestamp();

          tradeCollector.stop();
          return i.update({ embeds: [successEmbed], components: [] });
        }
      });
    }
  });
}

module.exports = { execute };
