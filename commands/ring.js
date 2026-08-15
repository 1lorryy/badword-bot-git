const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const DAILY_REWARD = 100; // Adjust the reward amount as needed (e.g., 100 don currency)
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily free currency reward!'),

  async execute(messageOrInteraction, args, prefix, getGuildData, saveData, isSlash = false) {
    const user = isSlash ? messageOrInteraction.user : messageOrInteraction.author;
    const guild = messageOrInteraction.guild;
    const data = getGuildData(guild.id);

    // Initialize user balances if they don't exist
    if (!data.balances) data.balances = {};
    if (!data.balances[user.id]) data.balances[user.id] = { don: 0, lastDaily: 0 };

    const userData = data.balances[user.id];
    const now = Date.now();
    const timeLeft = (userData.lastDaily + COOLDOWN_MS) - now;

    if (timeLeft > 0) {
      // User is still on cooldown
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      const replyContent = `⏳ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**ing.`;
      
      if (isSlash) {
        return await messageOrInteraction.reply({ content: replyContent, ephemeral: true });
      }
      return await messageOrInteraction.reply(replyContent);
    }

    // Give reward and update timestamp
    userData.don += DAILY_REWARD;
    userData.lastDaily = now;
    saveData();

    const embed = new EmbedBuilder()
      .setColor(0x22c55e)
      .setTitle('🎁 Daily Reward Claimed!')
      .setDescription(`You successfully claimed your daily **${DAILY_REWARD} don** currency!`)
      .addFields(
        { name: 'New Balance', value: `\`${userData.don} don\``, inline: true }
      )
      .setTimestamp();

    if (isSlash) {
      return await messageOrInteraction.reply({ embeds: [embed] });
    }
    return await messageOrInteraction.reply({ embeds: [embed] });
  }
};
