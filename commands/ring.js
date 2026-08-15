const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const RING_COST = 5; // Set how many 'don' currency a ring costs (adjust as needed)

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy items from the shop using your don currency')
    .addSubcommand(subcommand =>
      subcommand
        .setName('ring')
        .setDescription(`Purchase a ring for ${RING_COST} don currency`)
    ),

  category: 'fun',

  async execute(interaction) {
    const userId = interaction.user.id;
    const subcommand = interaction.options.getSubcommand();

    // TODO: Fetch user data from your database
    let userData = getUserData(userId);

    if (subcommand === 'ring') {
      if (userData.don < RING_COST) {
        return interaction.reply({
          content: `❌ You don't have enough currency! A ring costs **${RING_COST} don**, but you only have **${userData.don} don**.`,
          ephemeral: true
        });
      }

      // Deduct cost and give the ring (you can add an inventory flag like userData.hasRing = true)
      userData.don -= RING_COST;
      userData.hasRing = true; 
      saveUserData(userId, userData); // TODO: Save to your database

      const embed = new EmbedBuilder()
        .setColor('#FFD700')
        .setTitle('💍 Successful Purchase!')
        .setDescription('Congratulations! You successfully bought a **Ring**!')
        .addFields(
          { name: 'Remaining Balance', value: `\`${userData.don} don\``, inline: true }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }
  },
};
