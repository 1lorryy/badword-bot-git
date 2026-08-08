const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

// Default layout updated with all upgraded bot features
const DEFAULT_GUIDE_TEXT = 
`How to use all moderation, management, and AutoMod staff commands.
───

⚠️ **Warnings**
• \`?warn @user [reason]\` — Issue an official warning
• \`?warnings [@user]\` — Check warn history with dynamic timestamps & page jump
• \`?unwarn @user [warn_id]\` — Remove a specific warning

🔇 **Mutes & Timeouts**
• \`?mute @user [time] [reason]\` — Timeout user (e.g. \`5m\`, \`30m\`, \`12h\`)
• \`?unmute @user\` — Remove an active timeout

🔨 **Kicks & Bans**
• \`?kick @user [reason]\` — Kick user from server
• \`?ban @user [reason]\` — Ban user & purge recent messages
• \`?softban @user [reason]\` — Kick user & wipe 7 days of message history
• \`?unban [user_id]\` — Unban user using their Discord ID

✏️ **Chat & Channel Controls**
• \`?purge [1-100]\` — Bulk delete recent messages
• \`?purge @user [1-100]\` — Delete messages from a specific user
• \`?purge bots [1-100]\` — Clean up bot messages
• \`?purge links [1-100]\` — Delete messages containing links
• \`?rename <new-name>\` — Rename channel (Ticket categories only)
• \`?slowmode [#channel] [time]\` — Set channel slowmode (e.g. \`5s\` or \`off\`)
• \`?modstats [@staff]\` — Check moderator action statistics
• \`?modlogs [@user]\` — View recent moderation log entries

👤 **Roles & Management**
• \`?role @user [role]\` — Add or remove a role from a user
• \`?temprole @user [time] [role]\` — Give temporary role (Auto-removes across restarts)
• \`?rolecreate [role_name] [color_hex]\` — Create a new server role
• \`?roleicon @role <image/URL/emoji>\` — Set or update a role's icon
• \`?customcolor\` / \`?color\` — Open interactive custom hex color picker
• \`?setnick @user [new_nickname]\` — Change a user's server nickname
• \`?status\` — Check bot system status & performance

🌙 **AFK & Utilities**
• \`?afk [reason]\` / \`?afk global\` — Set AFK status (Pings survive redeploys)
• \`?help\` — Open interactive button command center

🚫 **Blacklist & Staff Guide**
• \`?bl [word]\` — Add a word to auto-blacklist
• \`?unbl [word]\` — Remove a word from blacklist
• \`?words\` — View all blacklisted words
• \`?staffguide\` — Show this command usage guide
• \`?staffguidedit <message_id> [new_text]\` — Edit staff guide content`;

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

    // Initialize in-memory storage on client if not present
    if (!message.client.staffGuideText) {
      message.client.staffGuideText = DEFAULT_GUIDE_TEXT;
    }

    // ==========================================
    // EDIT MODE: ?staffguidedit <Message ID or Link> [Optional New Content]
    // ==========================================
    if (isEdit) {
      if (!args || args.length < 1) {
        return message.channel.send("⚠️ **Usage:** `?staffguidedit <Message_ID> [Optional new guide text]`")
          .then(m => setTimeout(() => m.delete().catch(() => null), 6000));
      }

      const targetInput = args[0];
      const messageIdMatch = targetInput.match(/\d+$/);
      const targetMessageId = messageIdMatch ? messageIdMatch[0] : null;

      if (!targetMessageId) {
        return message.channel.send("❌ Invalid Message ID or Link provided.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      // If text was provided after the message ID, update stored guide text
      const newContent = args.slice(1).join(" ").trim();
      if (newContent) {
        message.client.staffGuideText = newContent;
      }

      try {
        const targetMsg = await message.channel.messages.fetch(targetMessageId);

        if (targetMsg.author.id !== message.client.user.id) {
          return message.channel.send("❌ Can only edit messages sent by this bot.")
            .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
        }

        const updatedEmbed = new EmbedBuilder()
          .setColor(0x2B2D31)
          .setTitle("🛡️ Moderation & Staff Commands Usage Guide")
          .setDescription(message.client.staffGuideText)
          .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
          .setTimestamp();

        await targetMsg.edit({ embeds: [updatedEmbed] });

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
    const guideEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle("🛡️ Moderation & Staff Commands Usage Guide")
      .setDescription(message.client.staffGuideText)
      .setFooter({ text: "Don Don Staff Operations • Command Usage Guide" })
      .setTimestamp();

    return message.channel.send({ embeds: [guideEmbed] });
  }
};
