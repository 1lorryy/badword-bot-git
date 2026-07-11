const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "joininfo",
  description: "Displays a member's server join placement milestone and account age.",
  async execute(message, args) {
    // Target the mentioned user, or default to the person who ran the command
    const targetMember = message.mentions.members.first() || message.member;
    if (!targetMember) return message.reply("Could not find that member.");

    // Fetch and sort all server members by their historical join timestamp
    const allMembers = await message.guild.members.fetch();
    const sortedMembers = [...allMembers.values()].sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
    
    // Find the target member's index position inside the sorted list
    const joinPosition = sortedMembers.findIndex(m => m.id === targetMember.id) + 1;

    const infoEmbed = new EmbedBuilder()
      .setColor("#5865F2")
      .setAuthor({ name: targetMember.user.tag, iconURL: targetMember.user.displayAvatarURL({ dynamic: true }) })
      .setTitle("📥 Member Milestone Tracking")
      .setDescription(`<@${targetMember.id}> is **Member #${joinPosition}** out of ${message.guild.memberCount} historical entries.`)
      .addFields(
        { 
          name: "📅 Server Joined", 
          value: `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:F>\n(<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>)`, 
          inline: true 
        },
        { 
          name: "📅 Account Created", 
          value: `<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:F>\n(<t:${Math.floor(targetMember.user.createdTimestamp / 1000)}:R>)`, 
          inline: true 
        }
      )
      .setTimestamp();

    return message.reply({ embeds: [infoEmbed] });
  }
};
