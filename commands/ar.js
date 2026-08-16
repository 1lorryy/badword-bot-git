const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "ar",
  aliases: ["autoresponder", "autoresp"],
  description: "Manage auto-responses with cross-server text, emojis, images, GIFs, and stickers.",
  
  async execute(message, args, prefix, getGuildData, saveData) {
    // Permission check + Owner Bypass
    if (!message.member.permissions.has("ManageGuild") && message.author.id !== "1221773740434653299") {
      const err = await message.reply("❌ You need **Manage Guild** permission to configure auto-responses.");
      setTimeout(() => err.delete().catch(() => {}), 5000);
      return;
    }

    const data = getGuildData(message.guild.id);
    if (!data.autoResponses) data.autoResponses = {};

    const sub = args[0]?.toLowerCase();

    // ================= ADD COMMAND =================
    if (sub === "add") {
      const queryParts = args.slice(1);
      
      if (queryParts.length === 0 && message.attachments.size === 0 && message.stickers.size === 0) {
        const usage = await message.reply(`💡 **Usage:** \`${prefix}ar add "trigger phrase" response text\`\n*(You can use emojis from any server, GIF links, attach files, or send a sticker!)*`);
        setTimeout(() => usage.delete().catch(() => {}), 8000);
        return;
      }

      let trigger = "";
      let responseText = "";
      const fullArgsText = queryParts.join(" ");

      // Smart parsing: Check if trigger is wrapped in quotes (for multi-word triggers)
      if (fullArgsText.startsWith('"')) {
        const endQuote = fullArgsText.indexOf('"', 1);
        if (endQuote !== -1) {
          trigger = fullArgsText.slice(1, endQuote).toLowerCase().trim();
          responseText = fullArgsText.slice(endQuote + 1).trim();
        }
      }

      // Fallback: If no quotes, the first word is the trigger
      if (!trigger) {
        trigger = queryParts[0].toLowerCase().trim();
        responseText = queryParts.slice(1).join(" ").trim();
      }

      // Automatically convert custom emojis from other servers into direct image URLs so they never fail
      // Matches standard/animated custom emojis: <:name:id> or <a:name:id>
      responseText = responseText.replace(/<a?:([a-zA-Z0-9_]+):(\d+)>/g, (match, name, id) => {
        const isAnimated = match.startsWith("<a:");
        return `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}?v=1`;
      });

      // Grab the first attachment (Image/GIF) or sticker URL
      const mediaUrl = message.attachments.first()?.url || message.stickers.first()?.url || null;

      if (!trigger) {
        return message.reply("❌ Please provide a valid trigger word or phrase.");
      }

      if (!responseText && !mediaUrl) {
        return message.reply("❌ Please provide response text, attach an image/GIF, or send a sticker.");
      }

      // Save to database
      data.autoResponses[trigger] = {
        text: responseText || "",
        image: mediaUrl || null,
        authorTag: message.author.tag
      };

      saveData(message.guild.id, data);

      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("✅ Auto-response Created!")
        .addFields(
          { name: "Trigger", value: `\`${trigger}\``, inline: true },
          { name: "Response", value: responseText || "*[No text / Media only]*", inline: true }
        );

      if (mediaUrl) embed.setImage(mediaUrl);

      return message.reply({ embeds: [embed] });
    }

    // ================= REMOVE COMMAND =================
    if (sub === "remove" || sub === "delete") {
      const trigger = args.slice(1).join(" ").toLowerCase().trim();
      
      if (!trigger || !data.autoResponses[trigger]) {
        return message.reply(`❌ Auto-response not found for trigger: \`${trigger || "none"}\``);
      }

      delete data.autoResponses[trigger];
      saveData(message.guild.id, data);

      return message.reply(`✅ Successfully deleted auto-response for trigger: \`${trigger}\``);
    }

    // ================= LIST COMMAND =================
    if (sub === "list") {
      const triggers = Object.keys(data.autoResponses);
      if (triggers.length === 0) {
        return message.reply("📋 There are no active auto-responses in this server.");
      }

      const listEmbed = new EmbedBuilder()
        .setColor(0xff69b4)
        .setTitle("📋 Server Auto-Responses")
        .setDescription(triggers.map(t => `• \`${t}\``).join("\n"))
        .setFooter({ text: `Total: ${triggers.length}` });

      return message.reply({ embeds: [listEmbed] });
    }

    // ================= DEFAULT HELP =================
    const helpEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle("🤖 Autoresponder System")
      .setDescription(
        `• \`${prefix}ar add "trigger phrase" [response]\`\n` +
        `• \`${prefix}ar remove [trigger]\`\n` +
        `• \`${prefix}ar list\``
      )
      .setFooter({ text: "Pro tip: Cross-server emojis and stickers are fully supported!" });
      
    return message.reply({ embeds: [helpEmbed] });
  }
};
