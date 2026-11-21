const fs = require("fs");
const path = require("path");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const {
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require("discord.js");

// ================= CONFIGURATION =================
const TICKET_LOGS_CHANNEL_ID = "1481370050597228661";
const TICKET_PING_ROLE_ID = "1481370041420087475";
const STAFF_ROLE_ID = "1481370041420087474";

const STAFF_ROLE_IDS = [
  "1481370041420087474",
  "1481370041432932379",
  "1481370041441189959"
];

const TICKET_MANAGER_ROLE_IDS = [
  TICKET_PING_ROLE_ID,
  ...STAFF_ROLE_IDS
];

const TICKET_CATEGORIES = {
  support: "1481939936964775946",
  claim: "1481937769612968038",
  purchases: "1481938314062725281"
};

const ALLOWED_CATEGORY_IDS = Object.values(TICKET_CATEGORIES);

const BASE_DATA_DIR = process.env.DATA_FILE
  ? path.dirname(process.env.DATA_FILE)
  : __dirname;
const TICKETS_FILE = path.join(BASE_DATA_DIR, "tickets-data.json");

// ================= PERSISTENT AUTO-SAVE =================
function loadTickets() {
  try {
    if (!fs.existsSync(TICKETS_FILE)) return { tickets: {}, counter: 0 };
    const parsed = JSON.parse(fs.readFileSync(TICKETS_FILE, "utf8"));
    return {
      tickets: parsed.tickets && typeof parsed.tickets === "object" ? parsed.tickets : {},
      counter: typeof parsed.counter === "number" ? parsed.counter : 0
    };
  } catch (err) {
    console.error("❌ Failed to load tickets-data.json:", err);
    return { tickets: {}, counter: 0 };
  }
}

let ticketStore = loadTickets();

function saveTickets() {
  try {
    fs.mkdirSync(path.dirname(TICKETS_FILE), { recursive: true });
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(ticketStore, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Failed to auto-save tickets-data.json:", err);
  }
}

function isTicketChannel(channelId) {
  return Boolean(ticketStore.tickets[channelId]);
}

function isTicketStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.roles?.cache) {
    return STAFF_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId));
  }
  return false;
}

function canManageTicketMembers(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.roles?.cache) {
    return TICKET_MANAGER_ROLE_IDS.some((roleId) => member.roles.cache.has(roleId));
  }
  return false;
}

async function addUserToTicket({ channel, guild, targetUser, addedBy }) {
  if (!channel || !guild || !targetUser) {
    return { ok: false, error: "❌ Missing ticket channel or target user." };
  }

  await channel.permissionOverwrites.edit(targetUser.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  if (ticketStore.tickets[channel.id]) {
    const entry = ticketStore.tickets[channel.id];
    if (!Array.isArray(entry.addedUserIds)) entry.addedUserIds = [];
    if (!entry.addedUserIds.includes(targetUser.id)) {
      entry.addedUserIds.push(targetUser.id);
      saveTickets();
    }
  }

  return { ok: true, addedBy };
}

function resolveOpenerId(channel) {
  const saved = ticketStore.tickets[channel.id];
  if (saved?.openerId) return saved.openerId;

  const topicMatch = channel.topic?.match(/Opener:\s*(\d{17,20})/i);
  if (topicMatch) return topicMatch[1];

  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    if (
      overwrite.type === 1 &&
      id !== channel.client.user.id &&
      overwrite.allow.has(PermissionFlagsBits.ViewChannel)
    ) {
      return id;
    }
  }
  return null;
}

function formatShortTime(ts) {
  const d = new Date(ts || Date.now());
  return d.toTimeString().slice(0, 5);
}

function formatFullDateTime(ts) {
  const d = new Date(ts || Date.now());
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function fetchAllChannelMessages(channel) {
  let all = [];
  let lastId = null;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options).catch(() => null);
    if (!batch || batch.size === 0) break;

    all.push(...batch.values());
    lastId = batch.last().id;
    if (batch.size < 100) break;
  }

  return all.reverse();
}

// ================= TEXT WRAPPING & PNG TRANSCRIPT RENDERER =================
function wrapTextLines(ctx, text, maxWidth) {
  const clean = String(text || "");
  if (!clean) return [];
  const paragraphs = clean.split("\n");
  const lines = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(/\s+/);
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(testLine).width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = "";
          for (const ch of word) {
            if (ctx.measureText(chunk + ch).width <= maxWidth) {
              chunk += ch;
            } else {
              lines.push(chunk);
              chunk = ch;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

async function renderTranscriptPng({
  channel,
  guild,
  ticketNumber,
  openerTag,
  claimedByTag,
  closedBy,
  reason,
  createdAt,
  messages
}) {
  const width = 760;
  const paddingX = 24;
  const avatarSize = 38;
  const textStartX = paddingX + avatarSize + 14;
  const maxTextWidth = width - textStartX - paddingX - 12;
  const cappedMessages = messages.slice(-60);

  const uniqueAuthors = new Map();
  for (const m of cappedMessages) {
    if (m.author && !uniqueAuthors.has(m.author.id)) {
      uniqueAuthors.set(
        m.author.id,
        m.author.displayAvatarURL({ extension: "png", size: 128 })
      );
    }
  }

  const avatarMap = new Map();
  await Promise.all(
    Array.from(uniqueAuthors.entries()).map(async ([id, url]) => {
      try {
        const img = await loadImage(url);
        avatarMap.set(id, img);
      } catch {
        avatarMap.set(id, null);
      }
    })
  );

  const measureCanvas = createCanvas(width, 200);
  const mctx = measureCanvas.getContext("2d");

  const prepared = cappedMessages.map((m) => {
    mctx.font = "15px sans-serif";
    const bodyText =
      m.content ||
      (m.embeds?.[0]?.title
        ? `${m.embeds[0].title}${m.embeds[0].description ? ` — ${m.embeds[0].description}` : ""}`
        : "") ||
      (m.attachments?.size ? `[Attachment: ${m.attachments.first().name}]` : "(empty message)");

    const lines = wrapTextLines(mctx, bodyText, maxTextWidth);
    const hasEmbedBox = Boolean(!m.content && m.embeds?.length);
    const lineHeight = 20;
    const textBlockHeight = Math.max(1, lines.length) * lineHeight;
    const rowHeight = Math.max(54, 28 + textBlockHeight + (hasEmbedBox ? 8 : 0) + 12);

    return {
      msg: m,
      lines,
      hasEmbedBox,
      rowHeight
    };
  });

  const headerHeight = 148;
  const chatTop = headerHeight + 12;
  const chatHeight =
    prepared.length > 0
      ? prepared.reduce((sum, item) => sum + item.rowHeight, 0) + 16
      : 64;
  const totalHeight = chatTop + chatHeight + 28;

  const canvas = createCanvas(width, totalHeight);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#141821";
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.fillStyle = "#8f9bb3";
  ctx.font = "13px sans-serif";
  ctx.fillText(`Transcripts > #${channel.name}`, paddingX, 34);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText(`Transcript #${ticketNumber || channel.name}`, paddingX, 68);

  ctx.fillStyle = "#b8c2d6";
  ctx.font = "13px sans-serif";
  const summaryLine = `Opened by ${openerTag}  •  Closed by ${closedBy.username || closedBy.tag}  •  Claimed by ${claimedByTag || "Unclaimed"}`;
  ctx.fillText(summaryLine.slice(0, 105), paddingX, 96);

  ctx.fillStyle = "#8f9bb3";
  const subLine = `Opened: ${formatFullDateTime(createdAt)}  •  Reason: ${reason}`;
  ctx.fillText(subLine.slice(0, 110), paddingX, 118);

  drawRoundedRect(ctx, paddingX - 6, chatTop, width - (paddingX - 6) * 2, chatHeight, 12);
  ctx.fillStyle = "#1b202c";
  ctx.fill();
  ctx.strokeStyle = "#293142";
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = chatTop + 14;

  for (const item of prepared) {
    const { msg, lines, hasEmbedBox, rowHeight } = item;
    const authorName = msg.author?.username || msg.author?.tag || "Unknown User";
    const isBot = Boolean(msg.author?.bot);
    const timeStr = formatShortTime(msg.createdTimestamp);

    const avImg = msg.author ? avatarMap.get(msg.author.id) : null;
    ctx.save();
    drawRoundedRect(ctx, paddingX + 6, y + 2, avatarSize, avatarSize, avatarSize / 2);
    ctx.clip();
    if (avImg) {
      ctx.drawImage(avImg, paddingX + 6, y + 2, avatarSize, avatarSize);
    } else {
      ctx.fillStyle = "#5865f2";
      ctx.fillRect(paddingX + 6, y + 2, avatarSize, avatarSize);
    }
    ctx.restore();

    ctx.font = "bold 14px sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(authorName, textStartX, y + 16);
    let cursorX = textStartX + ctx.measureText(authorName).width + 8;

    if (isBot) {
      ctx.font = "bold 10px sans-serif";
      const badgeW = ctx.measureText("APP").width + 10;
      drawRoundedRect(ctx, cursorX, y + 4, badgeW, 15, 4);
      ctx.fillStyle = "#5865f2";
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.fillText("APP", cursorX + 5, y + 15);
      cursorX += badgeW + 8;
    }

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#8894ab";
    ctx.fillText(timeStr, cursorX, y + 16);

    const msgTextY = y + 36;
    if (hasEmbedBox) {
      drawRoundedRect(ctx, textStartX, msgTextY - 12, 4, lines.length * 20 + 6, 2);
      ctx.fillStyle = "#23a559";
      ctx.fill();
    }

    ctx.font = "15px sans-serif";
    ctx.fillStyle = "#e4e8f0";
    const lineX = hasEmbedBox ? textStartX + 12 : textStartX;
    lines.forEach((line, idx) => {
      ctx.fillText(line, lineX, msgTextY + idx * 20);
    });

    y += rowHeight;
    if (y < chatTop + chatHeight - 16) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.beginPath();
      ctx.moveTo(paddingX + 6, y - 4);
      ctx.lineTo(width - paddingX - 6, y - 4);
      ctx.stroke();
    }
  }

  if (prepared.length === 0) {
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#8f9bb3";
    ctx.fillText("No messages recorded in this ticket.", paddingX + 12, chatTop + 36);
  }

  return canvas.toBuffer("image/png");
}

function buildClosedLogEmbed({
  ticketNumber,
  channelName,
  openerUser,
  openerTag,
  closedBy,
  claimedBy,
  createdAt,
  reason,
  method
}) {
  return new EmbedBuilder()
    .setTitle("Ticket Closed")
    .setColor(0x23a559)
    .addFields(
      { name: "# Ticket ID", value: `${ticketNumber || channelName}`, inline: false },
      {
        name: "✅ Opened By",
        value: openerUser ? `${openerUser}` : `\`${openerTag}\``,
        inline: false
      },
      { name: "🔒 Closed By", value: `${closedBy}`, inline: false },
      { name: "🕒 Open Time", value: formatFullDateTime(createdAt), inline: false },
      { name: "👤 Claimed By", value: claimedBy || "Unclaimed", inline: false },
      { name: "❓ Reason", value: `${reason.slice(0, 1020)} (${method})`, inline: false }
    )
    .setTimestamp();
}

// ================= UNIFIED CLOSE + LOG + DM PHOTO TRANSCRIPT =================
async function closeTicketChannel({
  channel,
  guild,
  closedBy,
  reason = "No reason provided",
  method = "Button"
}) {
  if (!channel || channel._isClosing) return;
  channel._isClosing = true;

  await channel
    .send("🔒 Closing ticket... Generating transcript image and sending logs.")
    .catch(() => null);

  const savedData = ticketStore.tickets[channel.id] || {};
  const openerId = resolveOpenerId(channel);
  const openerUser = openerId
    ? await guild.client.users.fetch(openerId).catch(() => null)
    : null;
  const openerTag = openerUser
    ? openerUser.username || openerUser.tag
    : savedData.openerTag || "Unknown User";

  const claimedByUser = savedData.claimedById
    ? await guild.client.users.fetch(savedData.claimedById).catch(() => null)
    : null;
  const claimedByDisplay = claimedByUser
    ? `${claimedByUser}`
    : savedData.claimedByTag || "Unclaimed";
  const claimedByPlain = claimedByUser
    ? claimedByUser.username || claimedByUser.tag
    : savedData.claimedByTag || "Unclaimed";

  const ticketNumber = savedData.ticketNumber || channel.name;
  const createdAt = savedData.createdAt || channel.createdTimestamp || Date.now();

  const messages = await fetchAllChannelMessages(channel);
  const pngBuffer = await renderTranscriptPng({
    channel,
    guild,
    ticketNumber,
    openerTag,
    claimedByTag: claimedByPlain,
    closedBy,
    reason,
    createdAt,
    messages
  });

  const fileName = `transcript-${channel.name}-${Date.now()}.png`;

  const logChannel = await guild.channels
    .fetch(TICKET_LOGS_CHANNEL_ID)
    .catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = buildClosedLogEmbed({
      ticketNumber,
      channelName: channel.name,
      openerUser,
      openerTag,
      closedBy,
      claimedBy: claimedByDisplay,
      createdAt,
      reason,
      method
    });

    const logAttachment = new AttachmentBuilder(pngBuffer, { name: fileName });
    await logChannel
      .send({ embeds: [logEmbed], files: [logAttachment] })
      .catch((err) => {
        console.error("❌ Failed to send ticket log:", err);
      });
  }

  if (openerUser) {
    const dmEmbed = buildClosedLogEmbed({
      ticketNumber,
      channelName: channel.name,
      openerUser,
      openerTag,
      closedBy,
      claimedBy: claimedByDisplay,
      createdAt,
      reason,
      method
    }).setTitle(`Ticket Closed — ${guild.name}`);

    const dmAttachment = new AttachmentBuilder(pngBuffer, { name: fileName });
    await openerUser
      .send({ embeds: [dmEmbed], files: [dmAttachment] })
      .catch(() => null);
  }

  delete ticketStore.tickets[channel.id];
  saveTickets();

  await channel
    .delete(`Ticket closed by ${closedBy.tag} (${method}): ${reason}`)
    .catch((err) => {
      console.error("❌ Failed to delete ticket channel:", err);
    });
}

// ================= TICKET CREATION & INTERACTION HANDLER =================
async function handleTicketInteraction(interaction) {
  const { guild, user, member } = interaction;
  if (!guild) return;

  if (
    interaction.isModalSubmit() &&
    interaction.customId === "tkt_close_reason_modal"
  ) {
    if (!isTicketStaff(member)) {
      return interaction.reply({
        content: "❌ Only staff members can close tickets.",
        ephemeral: true
      });
    }

    const reason =
      interaction.fields.getTextInputValue("close_reason").trim() ||
      "No reason provided";
    await interaction.deferUpdate().catch(() => null);

    return closeTicketChannel({
      channel: interaction.channel,
      guild,
      closedBy: user,
      reason,
      method: "Close With Reason"
    });
  }

  if (interaction.isButton() && interaction.customId.startsWith("tkt_")) {
    const id = interaction.customId.toLowerCase();

    if (id === "tkt_close") {
      if (!isTicketStaff(member)) {
        return interaction.reply({
          content: "❌ Only staff members can close tickets.",
          ephemeral: true
        });
      }

      return closeTicketChannel({
        channel: interaction.channel,
        guild,
        closedBy: user,
        reason: "Closed via Close button",
        method: "Close Button"
      });
    }

    if (id === "tkt_close_reason") {
      if (!isTicketStaff(member)) {
        return interaction.reply({
          content: "❌ Only staff members can close tickets.",
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("tkt_close_reason_modal")
        .setTitle("Close Ticket");

      const reasonInput = new TextInputBuilder()
        .setCustomId("close_reason")
        .setLabel("Reason for closing")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      return interaction.showModal(modal);
    }

    if (id === "tkt_claim") {
      if (!isTicketStaff(member)) {
        return interaction.reply({
          content: "❌ Only staff members can claim tickets.",
          ephemeral: true
        });
      }

      const existing = ticketStore.tickets[interaction.channel.id] || {
        channelId: interaction.channel.id,
        guildId: guild.id,
        openerId: resolveOpenerId(interaction.channel),
        createdAt: interaction.channel.createdTimestamp || Date.now()
      };

      const isSameClaimer = existing.claimedById === user.id;
      if (isSameClaimer) {
        existing.claimedById = null;
        existing.claimedByTag = null;
        ticketStore.tickets[interaction.channel.id] = existing;
        saveTickets();

        return interaction.reply({
          content: `Unclaimed ticket by ${user}.`
        });
      }

      existing.claimedById = user.id;
      existing.claimedByTag = user.username || user.tag;
      ticketStore.tickets[interaction.channel.id] = existing;
      saveTickets();

      const claimEmbed = new EmbedBuilder()
        .setTitle("Claimed Ticket")
        .setColor(0x23a559)
        .setDescription(`Your ticket will be handled by ${user}`)
        .setTimestamp();

      return interaction.reply({ embeds: [claimEmbed] });
    }

    let type = null;
    if (id.includes("support")) type = "support";
    else if (id.includes("claim")) type = "claim";
    else if (id.includes("purchase")) type = "purchases";

    if (!type) return;

    await interaction.deferReply({ ephemeral: true });

    const categoryId = TICKET_CATEGORIES[type];
    ticketStore.counter += 1;
    const ticketNum = String(ticketStore.counter).padStart(4, "0");
    const cleanUser =
      user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) ||
      "user";
    const channelName = `${type}-${cleanUser}-${ticketNum}`;

    const permissionOverwrites = [
      {
        id: guild.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: TICKET_PING_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages
        ]
      }
    ];

    if (STAFF_ROLE_ID && STAFF_ROLE_ID !== TICKET_PING_ROLE_ID) {
      permissionOverwrites.push({
        id: STAFF_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory
        ]
      });
    }

    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: categoryId,
      topic: `Ticket #${ticketNum} | Type: ${type.toUpperCase()} | Opener: ${user.id}`,
      permissionOverwrites
    });

    ticketStore.tickets[ticketChannel.id] = {
      channelId: ticketChannel.id,
      guildId: guild.id,
      openerId: user.id,
      openerTag: user.username || user.tag,
      claimedById: null,
      claimedByTag: null,
      addedUserIds: [],
      type,
      ticketNumber: ticketNum,
      createdAt: Date.now()
    };
    saveTickets();

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(
        `🎫 ${type.charAt(0).toUpperCase() + type.slice(1)} Ticket #${ticketNum}`
      )
      .setColor(0x23a559)
      .setDescription(
        `Thank you for contacting ${type}.\n` +
          `In the meantime, please share all relevant details so our team can assist you.\n\n` +
          `Staff can close this ticket anytime with \`?close [reason]\` or the buttons below.`
      )
      .setFooter({ text: "Ticket System" })
      .setTimestamp();

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tkt_close_reason")
        .setLabel("Close With Reason")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("tkt_claim")
        .setLabel("Claim")
        .setEmoji("🙋")
        .setStyle(ButtonStyle.Secondary)
    );

    await ticketChannel.send({
      content: `${user} <@&${TICKET_PING_ROLE_ID}>`,
      embeds: [welcomeEmbed],
      components: [controlRow],
      allowedMentions: {
        users: [user.id],
        roles: [TICKET_PING_ROLE_ID]
      }
    });

    return interaction.editReply({
      content: `✅ Your ticket has been created: ${ticketChannel}`
    });
  }
}

module.exports = {
  handleTicketInteraction,
  closeTicketChannel,
  addUserToTicket,
  canManageTicketMembers,
  isTicketChannel,
  ALLOWED_CATEGORY_IDS
};
