module.exports = {
  name: 'toggleai',
  aliases: ['aitoggle', 'ai'],
  category: 'Config', // Set this to whichever subcategory you use for settings in your help command
  description: 'Toggles the AI response feature on or off for the server.',
  usage: 'toggleai',
  execute(message, args) {
    // 1. Check if the user has permission (you usually only want admins changing this)
    if (!message.member.permissions.has('Administrator')) {
      return message.reply("❌ You need Administrator permissions to use this command.");
    }

    // 2. Fetch the current data for the guild
    const guildData = getGuildData(message.guild.id);

    // 3. Flip the current state (if true, becomes false. If false, becomes true)
    guildData.aiEnabled = !guildData.aiEnabled;

    // 4. Save the changes to your database/JSON file
    saveData();

    // 5. Send a confirmation message
    const status = guildData.aiEnabled ? 'ENABLED ✅' : 'DISABLED ❌';
    return message.reply(`🤖 AI features are now **${status}** for this server.`);
  }
};
