const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ar",
  aliases: ["autoresponder", "autoresp"],
  description: "Manage auto-responses with text, emojis, and images.",
  
  async execute(message, args, prefix, getGuildData, saveData) {
    // Check if author has manage guild / admin permission
    if (!message.member.permissions.has("ManageGuild") && message.author.id !== "1221773740434653299") {
      const err = await message.reply("❌ You need **Manage Guild** permission to configure auto-responses.");
      setTimeout(() => err.delete().catch(() => {}), 5000);
      return;
    }

    const sub = args[0]?.toLowerCase();
    const data = getGuildData(message.guild.id);
    if (!data.autoResponses) data.autoResponses = {}; // Structure: { "trigger_phrase": { responseText, imageUrl } }

    if (sub === "add") {
      // Syntax: ?ar add [trigger phrase] [response text] (or attached image)
      const queryParts = args.slice(1);
      if (queryParts.length === 0 && message.attachments.size === 0) {
        const usage = await message.reply(`💡 **Usage:** \`${prefix}ar add [trigger] [response text]\` (You can also attach an image/GIF!)`);
        setTimeout(() => usage.delete().catch(() => {}), 6000);
        return;
      }

      // Extract trigger. Let's support quotes for multi-word triggers, e.g. ?ar add "hello there" general kenobi
      // Or fallback to first word if no quotes. Let's make it easy: first word is trigger if single word, or use quotes.
      // Better yet: look for the trigger up to the first space, or wrapped in quotes.
      let trigger = "";
      let responseText = "";

      const fullArgsText = queryParts.join(" ");
      if (fullArgsText.startsWith('"')) {
        const endQuote = fullArgsText.indexOf('"', 1);
        if (endQuote !== -1) {
          trigger = fullArgsText.slice(1, endQuote).toLowerCase().trim();
          responseText = fullArgsText.slice(endQuote + 1).trim();
        }
      }

      if (!trigger) {
        trigger = queryParts[0].toLowerCase().trim();
        responseText = queryParts.slice(1).join(" ").trim();
      }

      const attachedImage = message.attachments.first() ? message.attachments.first().url : null;

      if (!trigger) {
        const err = await message.reply("❌ Please provide a valid trigger word or phrase.");
        setTimeout(() => err.delete().catch(() => {}), 5000);
        return;
      }

      if (!responseText && !attachedImage) {
        const err = await message.reply("❌ Please provide a response text or attach an image/GIF for this auto-response.");
        setTimeout(() => err.delete().catch(() => {}), 5000);
        return;
      }

      data.autoResponses[trigger] = {
        text: responseText || "",
        image: attachedImage || null,
        authorTag: message.author.tag
      };

      saveData(message.guild.id, data);

      const success = await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setDescription(`✅ **Auto-response created!**\nTrigger: \`${trigger}\`\nResponse: ${responseText || "*[Attached Image]*"}`)
        ]
      });
      setTimeout(() => success.delete().catch(() => {}), 6000);
      return;
    }

    if (sub === "remove" || sub === "delete") {
      const trigger = args.slice(1).join(" ").toLowerCase().trim();
      if (!trigger || !data.autoResponses[trigger]) {
        const err = await message.reply(`❌ Auto-response not found for trigger: \`${trigger || "none"}\``);
        setTimeout(() => err.delete().catch(() => {}), 5000);
        return;
      }

      delete data.autoResponses[trigger];
      saveData(message.guild.id, data);

      const success = await message.reply(`✅ Deleted auto-response for trigger: \`${trigger}\``);
      setTimeout(() => success.delete().catch(() => {}), 5000);
      return;
    }

    if (sub === "list") {
      const triggers = Object.keys(data.autoResponses);
      if (triggers.length === 0) {
        return message.reply("📋 There are no active auto-responses in this server.");
      }

      const listEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle("📋 Server Auto-Responses")
        .setDescription(triggers.map(t => `• \`${t}\``).join("\n"))
        .setFooter({ text: `Total: ${triggers.length} auto-responses` });

      return message.reply({ embeds: [listEmbed] });
    }

    // Default help info if no valid subcommand given
    const helpEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🤖 Autoresponder System")
      .setDescription(
        `• \`${prefix}ar add [trigger] [response] + [optional image/GIF attachment]\`\n` +
        `• \`${prefix}ar remove [trigger]\`\n` +
        `• \`${prefix}ar list\``
      );
    return message.reply({ embeds: [helpEmbed] });
  }
};
