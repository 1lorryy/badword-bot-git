const { EmbedBuilder, PermissionFlagsBits, AttachmentBuilder } = require("discord.js");

const TICKET_CATEGORIES = [
  "1481938314062725281", // Purchases
  "1481937769612968038", // Claims
  "1481939936964775946"  // Support
];

// Ticket Log Channel ID
const LOG_CHANNEL_ID = "1481370050597228661"; 

module.exports = {
  name: "close",
  description: "Closes the ticket, generates a transcript log file, and sends it to the logs channel",
  async execute(message, args, prefix) {
    message.delete().catch(() => null);

    const isStaff = message.member.permissions.has(PermissionFlagsBits.ManageChannels) ||
                    message.member.permissions.has(PermissionFlagsBits.ManageMessages);

    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || 
                    message.guild.ownerId === message.author.id;

    if (!isStaff && !isAdmin) {
      return message.channel.send("❌ **Access Denied:** Only staff members can close tickets.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const isInTicketCategory = TICKET_CATEGORIES.includes(message.channel.parentId);

    if (!isInTicketCategory && !isAdmin) {
      return message.channel.send("❌ **Restricted:** The `?close` command can only be used inside ticket channels!")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    const reason = args.length > 0 ? args.join(" ") : "No reason provided";

    // 1. Notify users inside the ticket channel
    const closingEmbed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle("🔒 Ticket Closing Sequence Initiated")
      .setDescription(
        `This ticket is being closed by **${message.author.tag}**.\n\n` +
        `> **Reason:** ${reason}\n\n` +
        `📥 *Generating chat transcript and deleting channel in **5 seconds**...*`
      )
      .setFooter({ text: "Don Don Moderation Systems • Ticket System" })
      .setTimestamp();

    await message.channel.send({ embeds: [closingEmbed] });

    // 2. Fetch up to 100 recent messages from the ticket channel
    const fetchedMessages = await message.channel.messages.fetch({ limit: 100 }).catch(() => null);
    let transcriptText = `==================================================\n`;
    transcriptText += `TRANSCRIPT LOG FOR #${message.channel.name.toUpperCase()}\n`;
    transcriptText += `Closed By: ${message.author.tag} (${message.author.id})\n`;
    transcriptText += `Reason: ${reason}\n`;
    transcriptText += `Date: ${new Date().toISOString()}\n`;
    transcriptText += `==================================================\n\n`;

    if (fetchedMessages) {
      const sortedMsgs = Array.from(fetchedMessages.values()).reverse();
      sortedMsgs.forEach(msg => {
        const time = msg.createdAt.toISOString().replace('T', ' ').substring(0, 19);
        transcriptText += `[${time}] ${msg.author.tag}: ${msg.content || "[Attachment/Embed]"}\n`;
      });
    }

    // 3. Create readable .txt transcript attachment
    const transcriptAttachment = new AttachmentBuilder(
      Buffer.from(transcriptText, "utf-8"),
      { name: `transcript-${message.channel.name}.txt` }
    );

    // 4. Send the log embed + transcript file directly to <#1481370050597228661>
    const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🔒 Ticket Closed & Logged")
        .addFields(
          { name: "🌐 Channel", value: `#${message.channel.name}`, inline: true },
          { name: "👤 Closed By", value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
          { name: "❓ Reason", value: reason, inline: false }
        )
        .setFooter({ text: "Don Don Moderation Systems • Transcripts" })
        .setTimestamp();

      await logChannel.send({
        embeds: [logEmbed],
        files: [transcriptAttachment]
      }).catch(err => console.error("Error sending ticket transcript log:", err));
    }

    // 5. Delete channel after 5 seconds
    setTimeout(async () => {
      try {
        await message.channel.delete(`Ticket closed by ${message.author.tag} - Reason: ${reason}`);
      } catch (err) {
        console.error("Failed to delete ticket channel during close command:", err);
      }
    }, 5000);
  }
};
