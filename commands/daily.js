const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

// Path to store economy data locally (creates an 'economy.json' file automatically)
const dbPath = path.join(__dirname, '../../data/economy.json');

function loadDatabase() {
  try {
    if (!fs.existsSync(dbPath)) {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(dbPath, JSON.stringify({}, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to save economy database:", e);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily 1 don currency!'),
  
  category: 'fun',

  async execute(interaction) {
    const userId = interaction.user.id;
    const cooldownTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const now = Date.now();

    // Load database and safely initialize user if they don't exist yet
    const db = loadDatabase();
    if (!db[userId]) {
      db[userId] = { don: 0, lastDaily: 0 };
    }

    let userData = db[userId];
    const lastDaily = userData.lastDaily || 0;
    const timeLeft = cooldownTime - (now - lastDaily);

    // Check if cooldown is still active
    if (timeLeft > 0 && lastDaily > 0) {
      const hours = Math.floor(timeLeft / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

      return interaction.reply({
        content: `⏳ You have already claimed your daily reward! Come back in **${hours}h ${minutes}m**.`,
        ephemeral: true
      });
    }

    // Update user data: add 1 don and update timestamp
    userData.don = (userData.don || 0) + 1;
    userData.lastDaily = now;
    
    db[userId] = userData;
    saveDatabase(db);

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
