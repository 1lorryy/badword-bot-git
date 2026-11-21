const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField,
  AttachmentBuilder
} = require("discord.js");

const STAFF_ROLE_ID = "1481370041420087474";
const LOGS_CHANNEL_ID = "1481370050597228661";

const CATEGORIES = {
  claims: {
    id: "1481937769612968038",
    label: "Claim",
    prefix: "claim",
    color: 0xe74c3c,
    emoji: "🎁",
    instructions:
      "• **Username / Payment Info:** Share your exact username (or GP / payment details depending on what/where you are claiming).\n" +
      "• **Proof / Win Details:** Send a **screenshot** showing **where** you won and **what** you won in the server.\n" +
      "• Wait patiently for <@&1481370041420087474> to verify and process your claim."
  },
  support: {
    id: "1481939936964775946",
    label: "Support",
    prefix: "support",
    color: 0x3b82f6,
    emoji: "🛠️",
    instructions:
      "• **Describe Your Issue:** Explain what you need help with clearly in one message.\n" +
      "• **Include Details:** Add any relevant screenshots, user IDs, or links if applicable.\n" +
      "• A staff member (<@&1481370041420087474>) will be with you shortly."
  },
  purchases: {
    id: "1481938314062725281",
    label: "Purchase",
    prefix: "purchase",
    color: 0x22c55e,
    emoji: "🛒",
    instructions:
      "• **What Are You Buying?** Let us know if you want **VIP**, **adverts**, or another server purchase.\n" +
      "• **Details & Info:** Include your username, item/package choice, or any required links.\n" +
      "• Staff (<@&1481370041420087474>) will assist you with your order soon."
  }
};

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function generateHtmlTranscript(channel, ticketMeta) {
  let allMessages = [];
  let lastId;

  while (true) {
    const fetched = await channel.messages.fetch({
      limit: 100,
      ...(lastId ? { before: lastId } : {})
    });
    if (fetched.size === 0) break;
    allMessages.push(...fetched.values());
    lastId = fetched.last().id;
    if (fetched.size < 100) break;
  }

  allMessages.reverse();

  const rowsHtml = allMessages
    .map((msg) => {
      const time = new Date(msg.createdTimestamp).toLocaleString();
      const author = escapeHtml(msg.author?.tag || "Unknown User");
      const avatar = msg.author?.displayAvatarURL({ extension: "png", size: 64 }) || "";
      const content = escapeHtml(msg.content || "").replace(/\n/g, "<br>");
      const attachments = msg.attachments.size
        ? `<div class="attachments">${[...msg.attachments.values()]
            .map((a) => `<a href="${escapeHtml(a.url)}" target="_blank">${escapeHtml(a.name || a.url)}</a>`)
            .join("<br>")}</div>`
        : "";
      const embedsNote = msg.embeds.length
        ? `<div class="embed-note">[Embed: ${escapeHtml(msg.embeds[0].title || msg.embeds[0].description || "Rich Embed")}]</div>`
        : "";

      return `
        <div class="msg">
          <img class="avatar" src="${avatar}" alt="" />
          <div class="body">
            <div class="meta"><span class="author">${author}</span> <span class="time">${escapeHtml(time)}</span></div>
            <div class="content">${content}</div>
            ${embedsNote}
            ${attachments}
          </div>
        </div>
      `;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Transcript - ${escapeHtml(channel.name)}</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; background: #1e1f22; color: #f2f3f5; margin: 0; padding: 24px; }
  .header { background: #2b2d31; padding: 18px 22px; border-radius: 10px; margin-bottom: 20px; border-left: 4px solid #5865f2; }
  .header h1 { margin: 0 0 8px 0; font-size: 20px; }
  .meta-grid { font-size: 13px; color: #b5bac1; line-height: 1.6; }
  .msg { display: flex; gap: 12px; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; background: #232428; }
  .avatar { width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0; object-fit: cover; }
  .author { font-weight: 600; color: #ffffff; margin-right: 8px; }
  .time { font-size: 12px; color: #949ba4; }
  .content { margin-top: 4px; font-size: 14px; line-height: 1.45; word-break: break-word; }
  .attachments { margin-top: 6px; font-size: 13px; }
  .attachments a { color: #00a8fc; text-decoration: none; }
  .embed-note { margin-top: 6px; font-size: 12px; color: #b5bac1; font-style: italic; }
</style>
</head>
<body>
  <div class="header">
    <h1>#${escapeHtml(channel.name)}</h1>
    <div class="meta-grid">
      <div><strong>Server:</strong> ${escapeHtml(channel.guild.name)}</div>
      <div><strong>Category:</strong> ${escapeHtml(ticketMeta.categoryLabel)}</div>
      <div><strong>Opened By:</strong> ${escapeHtml(ticketMeta.openerTag)} (${escapeHtml(ticketMeta.openerId)})</div>
      <div><strong>Claimed By:</strong> ${escapeHtml(ticketMeta.claimedBy || "Unclaimed")}</div>
      <div><strong>Closed By:</strong> ${escapeHtml(ticketMeta.closedByTag)}</div>
      <div><strong>Reason:</strong> ${escapeHtml(ticketMeta.reason || "No reason provided")}</div>
      <div><strong>Total Messages:</strong> ${allMessages.length}</div>
    </div>
  </div>
  ${rowsHtml || "<p>No messages recorded in this ticket.</p>"}
</body>
</html>`;

  return new AttachmentBuilder(Buffer.from(html, "utf-8"), {
    name: `transcript-${channel.name}.html`
  });
}

function parseTicketTopic(topic = "") {
  // Format: openerId:123|category:claims|claimedBy:456|openedAt:1700000000000
  const parts = topic.split("|");
  const meta = {
    openerId: null,
    categoryKey: "support",
    categoryLabel: "Support",
    claimedBy: null,
    openedAt: Date.now()
  };

  for (const p of parts) {
    const [k, ...rest] = p.split(":");
    const v = rest.join(":");
    if (k === "openerId") meta.openerId = v;
    if (k === "categoryKey" && CATEGORIES[v]) {
      meta.categoryKey = v;
      meta.categoryLabel = CATEGORIES[v].label;
    }
    if (k === "claimedBy" && v) meta.claimedBy = v;
    if (k === "openedAt" && v) meta.openedAt = Number(v) || Date.now();
  }
  return meta;
}

async function openTicket(interaction, categoryKey) {
  const cat = CATEGORIES[categoryKey];
  if (!cat) return;

  const guild = interaction.guild;
  const user = interaction.user;

  // Prevent duplicate open tickets by the same user in this category
  const existing = guild.channels.cache.find(
    (ch) =>
      ch.parentId === cat.id &&
      ch.type === ChannelType.GuildText &&
      ch.topic &&
      ch.topic.includes(`openerId:${user.id}`)
  );

  if (existing) {
    return interaction.reply({
      content: `❌ You already have an open **${cat.label}** ticket at <#${existing.id}>!`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true }).catch(() => null);

  const safeName = user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 18) || "user";
  const channelName = `${cat.prefix}-${safeName}`;
  const openedAt = Date.now();

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: cat.id,
    topic: `openerId:${user.id}|categoryKey:${categoryKey}|claimedBy:|openedAt:${openedAt}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.EmbedLinks
        ]
      },
      {
        id: STAFF_ROLE_ID,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels
        ]
      },
      {
        id: guild.members.me.id,
        allow: [
          PermissionsBitField.Flags.ViewChannel,
          PermissionsBitField.Flags.SendMessages,
          PermissionsBitField.Flags.AttachFiles,
          PermissionsBitField.Flags.ReadMessageHistory,
          PermissionsBitField.Flags.ManageChannels
        ]
      }
    ]
  });

  const welcomeEmbed = new EmbedBuilder()
    .setColor(cat.color)
    .setTitle(`${cat.emoji} ${cat.label.toUpperCase()} TICKET`)
    .setDescription(
      `Welcome <@${user.id}>! Thank you for opening a **${cat.label}** ticket.\n\n` +
      `${cat.instructions}\n\n` +
      `> Need to wrap up? Use the **Close** or **Close With Reason** buttons below.`
    )
    .setFooter({
      text: `${guild.name} • ${cat.label} Ticket`,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTimestamp();

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("tkt_claim")
      .setLabel("Claim Ticket")
      .setEmoji("🙋")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("tkt_close")
      .setLabel("Close Ticket")
      .setEmoji("🔒")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("tkt_close_reason")
      .setLabel("Close With Reason")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: `<@${user.id}> • <@&${STAFF_ROLE_ID}>`,
    embeds: [welcomeEmbed],
    components: [actionRow]
  });

  return interaction.editReply({
    content: `✅ Your **${cat.label}** ticket has been created: <#${channel.id}>`
  });
}

async function claimTicket(interaction) {
  const channel = interaction.channel;
  const meta = parseTicketTopic(channel.topic);

  const isStaff =
    interaction.member?.roles.cache.has(STAFF_ROLE_ID) ||
    interaction.member?.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!isStaff) {
    return interaction.reply({
      content: "❌ Only staff members can claim tickets.",
      ephemeral: true
    });
  }

  if (meta.claimedBy) {
    return interaction.reply({
      content: `⚠️ This ticket is already claimed by **${meta.claimedBy}**.`,
      ephemeral: true
    });
  }

  const newTopic = `openerId:${meta.openerId}|categoryKey:${meta.categoryKey}|claimedBy:${interaction.user.tag}|openedAt:${meta.openedAt}`;
  await channel.setTopic(newTopic).catch(() => null);

  const claimEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(`🙋 Ticket claimed by <@${interaction.user.id}> (**${interaction.user.tag}**).`);

  await channel.send({ embeds: [claimEmbed] });
  return interaction.reply({
    content: "✅ You have claimed this ticket.",
    ephemeral: true
  });
}

async function executeClose(interaction, reason = "No reason provided") {
  const channel = interaction.channel;
  const guild = interaction.guild;
  const meta = parseTicketTopic(channel.topic);

  if (channel.datasetClosing) {
    return interaction.reply({
      content: "⏳ This ticket is already being closed...",
      ephemeral: true
    }).catch(() => null);
  }
  channel.datasetClosing = true;

  await interaction.reply({
    content: "🔒 Closing ticket, saving transcript, and sending copies..."
  }).catch(() => null);

  const openerUser = meta.openerId
    ? await interaction.client.users.fetch(meta.openerId).catch(() => null)
    : null;

  const fullMeta = {
    ...meta,
    openerTag: openerUser ? openerUser.tag : meta.openerId || "Unknown",
    closedByTag: interaction.user.tag,
    reason
  };

  const transcriptAttachment = await generateHtmlTranscript(channel, fullMeta);
  const openTimeUnix = Math.floor(meta.openedAt / 1000);
  const closeTimeUnix = Math.floor(Date.now() / 1000);

  const logEmbed = new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({
      name: guild.name,
      iconURL: guild.iconURL({ dynamic: true })
    })
    .setTitle("🔒 Ticket Closed")
    .addFields(
      { name: "🎫 Ticket Name", value: `\`${channel.name}\``, inline: true },
      { name: "📂 Category", value: meta.categoryLabel, inline: true },
      { name: "👤 Opened By", value: meta.openerId ? `<@${meta.openerId}>` : "Unknown", inline: true },
      { name: "🔒 Closed By", value: `<@${interaction.user.id}>`, inline: true },
      { name: "🙋 Claimed By", value: meta.claimedBy || "Unclaimed", inline: true },
      { name: "🕒 Timeline", value: `Opened: <t:${openTimeUnix}:f>\nClosed: <t:${closeTimeUnix}:f>`, inline: false },
      { name: "📝 Reason", value: reason, inline: false }
    )
    .setTimestamp()
    .setFooter({ text: "DonDon Moderation Systems • Ticket Logs" });

  // Send transcript & log to ticket logs channel
  const logsChannel = guild.channels.cache.get(LOGS_CHANNEL_ID) ||
    await guild.channels.fetch(LOGS_CHANNEL_ID).catch(() => null);

  if (logsChannel && logsChannel.isTextBased()) {
    await logsChannel.send({
      embeds: [logEmbed],
      files: [transcriptAttachment]
    }).catch((err) => console.error("Failed to send ticket log:", err));
  }

  // DM the user who opened the ticket with a fresh attachment copy
  if (openerUser) {
    const dmAttachment = await generateHtmlTranscript(channel, fullMeta);
    const dmEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle("📄 Your Ticket Transcript")
      .setDescription(
        `Your ticket **\`${channel.name}\`** in **${guild.name}** has been closed.\n` +
        `Attached is the full transcript so you can review your conversation anytime.`
      )
      .addFields(
        { name: "📂 Category", value: meta.categoryLabel, inline: true },
        { name: "🔒 Closed By", value: interaction.user.tag, inline: true },
        { name: "📝 Reason", value: reason, inline: false }
      )
      .setTimestamp();

    await openerUser.send({
      embeds: [dmEmbed],
      files: [dmAttachment]
    }).catch(() => null);
  }

  setTimeout(() => {
    channel.delete(`Ticket closed by ${interaction.user.tag}: ${reason}`).catch(() => null);
  }, 3000);
}

async function handleTicketInteraction(interaction) {
  if (interaction.isButton()) {
    if (interaction.customId === "tkt_open_claims") return openTicket(interaction, "claims");
    if (interaction.customId === "tkt_open_support") return openTicket(interaction, "support");
    if (interaction.customId === "tkt_open_purchases") return openTicket(interaction, "purchases");
    if (interaction.customId === "tkt_claim") return claimTicket(interaction);
    if (interaction.customId === "tkt_close") return executeClose(interaction, "No reason provided");

    if (interaction.customId === "tkt_close_reason") {
      const modal = new ModalBuilder()
        .setCustomId("tkt_close_reason_modal")
        .setTitle("Close Ticket With Reason");

      const reasonInput = new TextInputBuilder()
        .setCustomId("tkt_reason_input")
        .setLabel("Reason for closing this ticket")
        .setPlaceholder("e.g. Reward sent, issue resolved, or no response")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === "tkt_close_reason_modal") {
    const reason =
      interaction.fields.getTextInputValue("tkt_reason_input")?.trim() ||
      "No reason provided";
    return executeClose(interaction, reason);
  }

  return false;
}

module.exports = {
  handleTicketInteraction
};
