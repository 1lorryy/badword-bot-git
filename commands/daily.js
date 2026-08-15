const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily 1 don currency!'),
  
  category: 'fun', // Placed under the fun subcategory

  async execute(interaction) {
    const userId = interaction.user.id;
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();

    // TODO: Fetch user data from your database (e.g., db.getUser(userId))
    let userData = getUserData(userId); 

    const timeLeft = cooldownTime - (now - userData.lastDaily);

    if (timeLeft > 0) {
      // Calculate remaining hours and minutes
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `⏳ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**.`,
        ephemeral: true
      });
    }

    // Update user data: add 1 don and update timestamp
    userData.don += 1;
    userData.lastDaily = now;
    saveUserData(userId, userData); // TODO: Save to your database

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎁 Daily Reward Claimed!')
      .setDescription('You successfully claimed your daily reward!')
      .addFields(
        { name: 'Reward', value: '`1 don`', inline: true },
        { name: 'New Balance', value: `\`${userData.don} don\``, inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
