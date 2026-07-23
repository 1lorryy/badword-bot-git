const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "ticketrules",
  description: "Displays or edits the ticket rules",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("ticketrulesedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newRulesText = args.join(" ");
      if (!newRulesText) {
        return message.reply("⚠️ **Usage:** `?ticketrulesedit <new rules info>`");
      }

      return message.reply("✅ **Ticket rules updated successfully!**");
    }

    const rulesEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("SERVER'S TICKET SYSTEM RULES")
      .setThumbnail("https://image2url.com/r2/default/images/1775844039536-8fd2df06-6fab-4b6c-92ed-821f8fe176d9.jpg") // Pocoyo in corner
      .setDescription(
        "**RULES**\n\n" +
        "**#1. Use Tickets for Their Intended Purpose**\n" +
        "Only open a ticket for valid support, questions, or concerns—not casual chat or for any jokes.\n\n" +
        "**#2. Do Not Spam Tickets**\n" +
        "One ticket at a time per issue. Spamming or abusing the system may lead to a warning or ban.\n\n" +
        "**#3. Be Clear and Provide Details**\n" +
        "Give as much context as possible when opening a ticket to help staff assist you efficiently.\n\n" +
        "**#4. Do Not Ping Staff Unnecessarily**\n" +
        "Staff will respond as soon as they can. Pinging won't make things faster.\n\n" +
        "**#5 Close Tickets When Resolved**\n" +
        "If your issue is solved, please close the ticket or ask a staff member to do so.\n\n" +
        "**#6. Respect Staff in Tickets**\n" +
        "Aggressive, rude, or non-cooperative behaviour may result in warnings or removal."
      )
      .setImage("https://image2url.com/r2/default/images/1775845711233-eeede801-13ce-4f7c-b0ac-ea6a6d81b638.jpg") // Pocoyo at bottom
      .setFooter({ text: "server's ticket rules" });

    return message.reply({ embeds: [rulesEmbed] });
  }
};
