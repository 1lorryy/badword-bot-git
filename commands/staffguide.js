const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "staffguide",
  description: "Displays or edits the moderation & staff commands usage guide",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().startsWith("?staffguidedit");

    // Clean up trigger message
    message.delete().catch(() => null);

    // Permission check
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return message.channel.send("❌ **Access Denied:** Administrator permission required.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Embed matching your Moderation & Staff Commands Usage Guide setup
    const guideEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🛡️ Moderation & Staff Commands Usage Guide")
      .setDescription(
        "How to use all moderation, management, and AutoMod staff commands.\n" +
        "───\n\n" +
        "⚠️ **Warnings**\n" +
        "• `?warn @user [reason]` — Issue an official warning\n" +
        "• `?warnings @user` — Check a user's warn history & IDs\n" +
        "• `?unwarn @user [warn_id]` — Remove a specific warning\n\n" +
        "🔇 **Mutes & Timeouts**\n" +
        "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)\n" +
        "• `?unmute @user` — Remove an active timeout\n\n" +
        "🔨 **Kicks & Bans**\n" +
        "• `?kick @user [reason]` — Kick user from server\n" +
        "• `?ban @user [reason]` — Ban user & purge recent messages\n" +
        "• `?unban [user_id]` — Unban user using their Discord ID\n\n" +
        "✏️ **Chat & Channel Controls**\n" +
        "• `?purge [amount]` — Delete multiple messages at once\n" +
        "• `?rename <new-name>` — Rename the current channel\n" +
        "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `?slowmode 5s` or `?slowmode #chat 10s`)\n" +
        "• `?slowmode [off / 0]` — Turn off channel slowmode\n" +
        "• `?modstats [@staff]` — Check moderation action stats\n" +
        "• `?modlogs [@user]` — View recent moderation log entries\n\n" +
        "👤 **Roles & Management**\n" +
        "• `?role @user [role]` — Add or remove a role from a user\n" +
        "• `?temprole @user [time] [role]` — Give a role temporarily (e.g. `7d`)\n" +
        "• `?rolecreate [role_name] [color_hex]` — Create a new server role\n" +
        "• `?roleicon @role <image/URL/emoji>` — Set or update a role's icon\n" +
        "• `?customcolor @role #HEX` — Change the color of a specific role\n" +
        "• `?setnick @user [new_nickname]` — Change a user's server nickname\n" +
        "• `?status` — Check bot system status & performance\n\n" +
        "🚫 **Blacklist & Staff Guide**\n" +
        "• `?bl [word]` — Add a word to auto-blacklist\n" +
        "• `?unbl [word]` — Remove a word from blacklist\n" +
        "• `?words` — View all blacklisted words\n" +
        "• `?staffguide` — Show this command usage guide\n" +
        "• `?staffguidedit [message_id]` — Edit staff guide settings"
      )
      .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
      .setTimestamp();

    // ==========================================
    // EDIT MODE: ?staffguidedit <Message ID or Link>
    // ==========================================
    if (isEdit) {
      if (!args || args.length < 1) {
        return message.channel.send("⚠️ **Usage:** `?staffguidedit <Message ID or Link>`")
          .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      }

      const targetInput = args[0];
      const messageIdMatch = targetInput.match(/\d+$/);
      const targetMessageId = messageIdMatch ? messageIdMatch[0] : null;

      if (!targetMessageId) {
        return message.channel.send("❌ Invalid Message ID or Link provided.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      try {
        const targetMsg = await message.channel.messages.fetch(targetMessageId);

        if (targetMsg.author.id !== message.client.user.id) {
          return message.channel.send("❌ Can only edit messages sent by this bot.")
            .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        }

        await targetMsg.edit({ embeds: [guideEmbed] });

        return message.channel.send("✅ **Staff guide updated successfully!**")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));

      } catch (err) {
        console.error(err);
        return message.channel.send("❌ Could not find or edit that message in this channel.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }
    }

    // ==========================================
    // SEND FRESH STAFF GUIDE: ?staffguide
    // ==========================================
    return message.channel.send({ embeds: [guideEmbed] });
  }
};
