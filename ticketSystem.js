
const fs = require("fs");
const path = require("path");
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

const TICKET_CATEGORIES = {
  support: "1481939936964775946",
  claim: "1481937769612968038",
  purchases: "1481938314062725281"
};

const ALLOWED_CATEGORY_IDS = Object.values(TICKET_CATEGORIES);

// Store tickets in the same persistent folder as DATA_FILE (survives Railway redeploys)
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
    return STAFF_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
  }
  return false;
}

function resolveOpenerId(channel) {
  const saved = ticketStore.tickets[channel.id];
  if (saved?.openerId) return saved.openerId;

  // Fallback from channel topic (survives even if JSON was wiped)
  const topicMatch = channel.topic?.match(/Opener:\s*(\d{17,20})/i);
  if (topicMatch) return topicMatch[1];

  // Fallback from channel permission overwrites
  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    if (
      overwrite.type === 1 && // Member overwrite
      id !== channel.client.user.id &&
      overwrite.allow.has(PermissionFlagsBits.ViewChannel)
    ) {
      return id;
    }
  }
  return null;
}

// ================= HTML TRANSCRIPT BUILDER =================
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function buildHtmlTranscript({ channel, guild, openerTag, openerId, closedBy, reason, messages }) {
  const rows = messages
    .map((m) => {
      const time = new Date(m.createdTimestamp).toUTCString();
      const avatar =
        m.author?.displayAvatarURL?.({ extension: "png", size: 64 }) ||
        "https://cdn.discordapp.com/embed/avatars/0.png";
      const authorName = escapeHtml(m.author?.tag || "Unknown User");
      const content = escapeHtml(m.content || "").replace(/\n/g, "<br>");

      const attachmentsHtml = m.attachments?.size
        ? `<div class="attachments">${Array.from(m.attachments.values())
            .map((a) => `<a href="${escapeHtml(a.url)}" target="_blank">📎 ${escapeHtml(a.name || "attachment")}</a>`)
            .join("<br>")}</div>`
        : "";

      const embedsHtml = m.embeds?.length
        ? m.embeds
            .map(
              (e) =>
                `<div class="embed">${e.title ? `<strong>${escapeHtml(e.title)}</strong><br>` : ""}${
                  e.description ? escapeHtml(e.description).replace(/\n/g, "<br>") : ""
                }</div>`
            )
            .join("")
        : "";

      return `
        <div class="msg">
          <img class="avatar" src="${avatar}" alt="">
          <div class="body">
            <div class="meta">
              <span class="author">${authorName}</span>
              <span class="time">${escapeHtml(time)}</span>
            </div>
            <div class="content">${content || "<em>(no text)</em>"}</div>
            ${attachmentsHtml}
            ${embedsHtml}
          </div>
        </div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Transcript - #${escapeHtml(channel.name)}</title>
  <style>
    body { background: #313338; color: #dbdee1; font-family: "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 24px; }
    .header { background: #2b2d31; border-left: 4px solid #5865f2; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; }
    .header h1 { margin: 0 0 8px 0; font-size: 20px; color: #ffffff; }
    .header p { margin: 4px 0; font-size: 13px; color: #b5bac1; }
    .msg { display: flex; gap: 12px; padding: 10px 8px; border-bottom: 1px solid #2b2d31; }
    .avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; }
    .meta { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .author { font-weight: 600; color: #ffffff; font-size: 14px; }
    .time { font-size: 11px; color: #949ba4; }
    .content { font-size: 14px; line-height: 1.4; word-break: break-word; }
    .attachments, .embed { margin-top: 6px; background: #2b2d31; border-left: 3px solid #5865f2; padding: 8px 10px; border-radius: 4px; font-size: 13px; }
    a { color: #00a8fc; text-decoration: none; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎫 Ticket Transcript — #${escapeHtml(channel.name)}</h1>
    <p><strong>Server:</strong> ${escapeHtml(guild.name)}</p>
    <p><strong>Opened By:</strong> ${escapeHtml(openerTag)} (${escapeHtml(openerId || "Unknown")})</p>
    <p><strong>Closed By:</strong> ${escapeHtml(closedBy.tag)} (${escapeHtml(closedBy.id)})</p>
    <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p><strong>Total Messages:</strong> ${messages.length}</p>
  </div>
  ${rows}
</body>
</html>`;
}

// ================= UNIFIED CLOSE + LOG + DM TRANSCRIPT =================
async function closeTicketChannel({ channel, guild, closedBy, reason = "No reason provided", method = "Button" }) {
  if (!channel || channel._isClosing) return;
  channel._isClosing = true;

  await channel.send(`🔒 Closing ticket... Saving transcript and sending logs.`).catch(() => null);

  const savedData = ticketStore.tickets[channel.id] || {};
  const openerId = resolveOpenerId(channel);
  const openerUser = openerId ? await guild.client.users.fetch(openerId).catch(() => null) : null;
  const openerTag = openerUser ? openerUser.tag : savedData.openerTag || "Unknown User";

  // 1. Fetch messages & generate HTML transcript
  const messages = await fetchAllChannelMessages(channel);
  const htmlContent = buildHtmlTranscript({
    channel,
    guild,
    openerTag,
    openerId,
    closedBy,
    reason,
    messages
  });

  const fileName = `transcript-${channel.name}-${Date.now()}.html`;
  const htmlBuffer = Buffer.from(htmlContent, "utf8");

  // 2. Send log + HTML transcript to Ticket Logs Channel (1481370050597228661)
  const logChannel = await guild.channels.fetch(TICKET_LOGS_CHANNEL_ID).catch(() => null);
  if (logChannel && logChannel.isTextBased()) {
    const logEmbed = new EmbedBuilder()
      .setTitle("📕 Ticket Closed")
      .setColor(0xef4444)
      .addFields(
        { name: "🎫 Ticket", value: `\`#${channel.name}\``, inline: true },
        { name: "👤 Opened By", value: openerUser ? `${openerUser} (\`${openerUser.id}\`)` : `\`${openerTag}\``, inline: true },
        { name: "🔒 Closed By", value: `${closedBy} (\`${closedBy.id}\`)`, inline: true },
        { name: "⚙️ Closed Via", value: `\`${method}\``, inline: true },
        { name: "📝 Reason", value: reason.slice(0, 1024), inline: false }
      )
      .setTimestamp();

    const logAttachment = new AttachmentBuilder(htmlBuffer, { name: fileName });
    await logChannel.send({ embeds: [logEmbed], files: [logAttachment] }).catch((err) => {
      console.error("❌ Failed to send ticket log:", err);
    });
  }

  // 3. Send summary + HTML transcript to the Ticket Creator's DMs
  if (openerUser) {
    const dmEmbed = new EmbedBuilder()
      .setTitle(`🎫 Your Ticket in ${guild.name} Was Closed`)
      .setColor(0x5865f2)
      .setDescription("Here is a copy of your ticket details and full HTML transcript.")
      .addFields(
        { name: "Ticket Channel", value: `#${channel.name}`, inline: true },
        { name: "Closed By", value: closedBy.tag, inline: true },
        { name: "Reason", value: reason.slice(0, 1024), inline: false }
      )
      .setTimestamp();

    const dmAttachment = new AttachmentBuilder(htmlBuffer, { name: fileName });
    await openerUser.send({ embeds: [dmEmbed], files: [dmAttachment] }).catch(() => null);
  }

  // 4. Remove from active ticket store & auto-save immediately before deleting channel
  delete ticketStore.tickets[channel.id];
  saveTickets();

  await channel.delete(`Ticket closed by ${closedBy.tag} (${method}): ${reason}`).catch((err) => {
    console.error("❌ Failed to delete ticket channel:", err);
  });
}

// ================= TICKET CREATION & INTERACTION HANDLER =================
async function handleTicketInteraction(interaction) {
  const { guild, user, member } = interaction;
  if (!guild) return;

  // Close With Reason Modal Submit (Staff Only)
  if (interaction.isModalSubmit() && interaction.customId === "tkt_close_reason_modal") {
    if (!isTicketStaff(member)) {
      return interaction.reply({
        content: "❌ Only staff members can close tickets.",
        ephemeral: true
      });
    }

    const reason = interaction.fields.getTextInputValue("close_reason").trim() || "No reason provided";
    await interaction.deferUpdate().catch(() => null);

    return closeTicketChannel({
      channel: interaction.channel,
      guild,
      closedBy: user,
      reason,
      method: "Close With Reason"
    });
  }

  // Open new ticket or trigger close buttons
  if (interaction.isButton() && interaction.customId.startsWith("tkt_")) {
    const id = interaction.customId.toLowerCase();

    // Button Close (Staff Only)
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

    // Close With Reason Modal Trigger (Staff Only)
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

    // Determine category type for opening a ticket
    let type = null;
    if (id.includes("support")) type = "support";
    else if (id.includes("claim")) type = "claim";
    else if (id.includes("purchase")) type = "purchases";

    if (!type) return;

    await interaction.deferReply({ ephemeral: true });

    const categoryId = TICKET_CATEGORIES[type];
    ticketStore.counter += 1;
    const ticketNum = String(ticketStore.counter).padStart(4, "0");
    const cleanUser = user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12) || "user";
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

    // Save immediately to disk so redeploys/crashes never lose this ticket
    ticketStore.tickets[ticketChannel.id] = {
      channelId: ticketChannel.id,
      guildId: guild.id,
      openerId: user.id,
      openerTag: user.tag,
      type,
      ticketNumber: ticketNum,
      createdAt: Date.now()
    };
    saveTickets();

    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`🎫 ${type.charAt(0).toUpperCase() + type.slice(1)} Ticket #${ticketNum}`)
      .setColor(0x5865f2)
      .setDescription(
        `Welcome ${user}!\n` +
        `Please describe your request clearly while our ticket support team arrives.\n\n` +
        `Staff can close this ticket anytime with \`?close [reason]\` or the buttons below.`
      )
      .setTimestamp();

    const controlRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("tkt_close")
        .setLabel("Close")
        .setEmoji("🔒")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("tkt_close_reason")
        .setLabel("Close With Reason")
        .setEmoji("📝")
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
  isTicketChannel,
  ALLOWED_CATEGORY_IDS
};
