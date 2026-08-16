const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "daily",
  aliases: ["claim"],
  description: "Claim your daily DON coins reward with a 7-day streak bonus system!",
  data: {
    name: "daily",
    description: "Claim your daily DON coins reward"
  },

  async execute(message, args, prefix, getGuildData, saveData, interaction = null) {
    const isSlash = !!interaction;
    const guild = isSlash ? interaction.guild : message.guild;
    const user = isSlash ? interaction.user : message.author;
    const userId = user.id;

    const data = getGuildData(guild ? guild.id : "global_dm");
    if (!data.economy) data.economy = {};
    if (!data.economy[userId]) data.economy[userId] = { coins: 0 };
    if (!data.dailies) data.dailies = {};

    const userDaily = data.dailies[userId] || { streak: 0, lastClaim: 0 };
    const now = Date.now();
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours
    const streakExpiryTime = cooldownTime * 2; // 48 hours to keep streak

    // Check Cooldown
    if (now - userDaily.lastClaim < cooldownTime) {
      const timeLeft = cooldownTime - (now - userDaily.lastClaim);
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      
      const replyText = `⏳ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**.`;
      return isSlash ? await interaction.reply({ content: replyText, ephemeral: true }) : await message.reply(replyText);
    }

    // Check if streak is lost (> 48 hours since last claim)
    if (userDaily.lastClaim > 0 && (now - userDaily.lastClaim > streakExpiryTime)) {
      userDaily.streak = 0;
    }

    // Increment streak and update timestamp
    userDaily.streak += 1;
    userDaily.lastClaim = now;

    // Base daily reward
    let reward = 100;
    let bonusText = "";

    // Every 7 days randomized bonus (5 to 50 DON extra)
    if (userDaily.streak % 7 === 0) {
      const randomBonus = Math.floor(Math.random() * 46) + 5; // Random number between 5 and 50
      reward += randomBonus;
      bonusText = `\n🎁 **7-Day Streak Milestone!** You received an extra **${randomBonus} DON** randomized bonus!`;
    }

    data.economy[userId].coins += reward;
    data.dailies[userId] = userDaily;
    saveData();

    const dailyEmbed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("🎁 Daily Reward Claimed!")
      .setDescription(
        `✅ You successfully claimed your daily reward and received **${reward.toLocaleString()} DON**!\n\n` +
        `🔥 **Streak:** \`${userDaily.streak} day${userDaily.streak === 1 ? "" : "s"}\` in a row!` +
        bonusText
      )
      .setFooter({ text: "donQuixoted lounge • Economy System" });

    const replyPayload = { embeds: [dailyEmbed] };
    return isSlash ? await interaction.reply(replyPayload) : await message.reply(replyPayload);
  }
};
