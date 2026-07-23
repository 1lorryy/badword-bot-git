const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Store the last sent guide message ID and channel ID in memory
let lastGuideMessageId = null;
let lastGuideChannelId = null;

module.exports = {
  name: "staffguide",
  description: "Displays or edits the staff command usage guide",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().startsWith("?staffguidedit");

    // Clean up staff trigger message to keep channel clean
    message.delete().catch(() => null);

    // ==========================================
    // 1. EDIT MODE: ?staffguidedit <Message ID or Link> <New Text>
    // ==========================================
    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.channel.send("❌ **Access Denied:** Administrator permission required.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      if (!args || args.length < 2) {
        return message.channel.send("⚠️ **Usage:** `?staffguidedit <Message ID or Link> <New Description/Content>`")
          .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      }

      // Extract Target Message ID from raw ID or Discord Message Link
      const targetInput = args[0];
      const newText = args.slice(1).join(" ");
      const messageIdMatch = targetInput.match(/\d+$/);
      const targetMessageId = messageIdMatch ? messageIdMatch[0] : null;

      if (!targetMessageId) {
        return message.channel.send("❌ Invalid Message ID or Link provided.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      try {
        // Fetch message from current channel
        const targetMsg = await message.channel.messages.fetch(targetMessageId);

        if (targetMsg.author.id !== message.client.user.id) {
          return message.channel.send("❌ Can only edit messages sent by this bot.")
            .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        }

        // If target message has an Embed, update its description
        if (targetMsg.embeds.length > 0) {
          const oldEmbed = targetMsg.embeds[0];
          const updatedEmbed = EmbedBuilder.from(oldEmbed).setDescription(newText);
          await targetMsg.edit({ embeds: [updatedEmbed] });
        } else {
          // Plain message update
          await targetMsg.edit({ content: newText });
        }

        return message.channel.send("✅ **Message updated successfully!**")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));

      } catch (err) {
        console.error(err);
        return message.channel.send("❌ Could not find or edit that message in this channel.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }
    }

    // ==========================================
    // 2. DISPLAY GUIDE MODE: ?staffguide
    // ==========================================
    const guideEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🛡️ Moderation & Staff Commands Usage Guide")
      .setDescription("How to use all moderation, management, and AutoMod staff commands.\n━━━")
      .addFields(
        {
          name: "⚠️ Warnings",
          value:
            "• `?warn @user [reason]` — Issue an official warning\n" +
            "• `?warnings @user` — Check a user's warn history & IDs\n" +
            "• `?unwarn @user [warn_id]` — Remove a specific warning"
        },
        {
          name: "🔇 Mutes & Timeouts",
          value:
            "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)\n" +
            "• `?unmute @user` — Remove an active timeout"
        },
        {
          name: "🔨 Kicks & Bans",
          value:
            "• `?kick @user [reason]` — Kick user from server\n" +
            "• `?ban @user [reason]` — Ban user & purge recent messages\n" +
            "• `?unban [user_id]` — Unban user using their Discord ID"
        },
        {
          name: "🧹 Chat & Channel Controls",
          value:
            "• `?purge [amount]` — Delete multiple messages at once\n" +
            "• `?rename <new-name>` — Rename current channel (Tickets only)\n" +
            "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `?slowmode 5s` or `?slowmode #chat 10s`)\n" +
            "• `?slowmode [off / 0]` — Turn off channel slowmode\n" +
            "• `?modstats [@staff]` — Check moderation action stats\n" +
            "• `?modlogs [@user]` — View recent moderation log entries"
        },
        {
          name: "👤 Roles & Management",
          value:
            "• `?role @user [role]` — Add or remove a role from a user\n" +
            "• `?temprole @user [time] [role]` — Give a role temporarily (e.g. `7d`)\n" +
            "• `?setnick @user [new_nickname]` — Change a user's server nickname\n" +
            "• `?status` — Check bot system status & performance"
        },
        {
          name: "🚫 Blacklist & Staff Guide",
          value:
            "• `?bl [word]` — Add a word to auto-blacklist\n" +
            "• `?unbl [word]` — Remove a word from blacklist\n" +
            "• `?words` — View all blacklisted words\n" +
            "• `?staffguide` — Show this command usage guide\n" +
            "• `?staffguidedit <msg_id/link> <text>` — Edit any bot rules/guide embed"
        },
        {
          name: "⚖️ Staff Authority & Disclaimer",
          value:
            "• **Final Decision:** Staff & Management hold ultimate discretion on all rule interpretations, warnings, mutes, kicks, bans, and ticket disputes.\n" +
            "• **Enforcement:** Actions taken in accordance with server rules and ticket rules are final. Arguing with staff decisions in public chat is strictly prohibited."
        }
      )
      .setFooter({ text: "donQuixotes lounge Staff Operations • Command Usage Guide" })
      .setTimestamp();

    // Try editing existing guide in channel if present
    if (lastGuideMessageId && lastGuideChannelId === message.channel.id) {
      try {
        const existingMsg = await message.channel.messages.fetch(lastGuideMessageId);
        if (existingMsg) {
          await existingMsg.edit({ embeds: [guideEmbed] });
          return;
        }
      } catch (err) {
        // Fallback to sending new
      }
    }

    // Send new guide message
    const newMsg = await message.channel.send({ embeds: [guideEmbed] });
    lastGuideMessageId = newMsg.id;
    lastGuideChannelId = message.channel.id;
  }
};
