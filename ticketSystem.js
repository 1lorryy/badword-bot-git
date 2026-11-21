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

// ================= HTML TRANSCRIPT RENDERER =================
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function attachmentToSafeDataUrl(att, maxBytes = 2.5 * 1024 * 1024) {
  const isImage =
    Boolean(att.contentType && att.contentType.startsWith("image/")) ||
    /\.(png|jpe?g|gif|webp)$/i.test(att.name || "");
  if (!isImage || !att.url) return null;
  if (typeof att.size === "number" && att.size > maxBytes) return null;

  try {
    const res = await fetch(att.url);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > maxBytes) return null;

    const mime =
      att.contentType && att.contentType.startsWith("image/")
        ? att.contentType.split(";")[0]
        : "image/png";
    const b64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

function classifyParticipant(userId, openerId, addedUserIds, isBot, guild) {
  if (isBot) return { label: "BOT", cls: "role-bot" };
  if (openerId && userId === openerId) return { label: "OPENER", cls: "role-opener" };

  const member = guild?.members?.cache?.get(userId);
  const isStaff =
    member &&
    (member.permissions?.has(PermissionFlagsBits.Administrator) ||
      TICKET_MANAGER_ROLE_IDS.some((rid) => member.roles?.cache?.has(rid)));

  if (isStaff) return { label: "STAFF", cls: "role-staff" };
  if (Array.isArray(addedUserIds) && addedUserIds.includes(userId)) {
    return { label: "ADDED", cls: "role-added" };
  }
  return { label: "MEMBER", cls: "role-member" };
}

async function renderTranscriptHtml({
  channel,
  guild,
  ticketNumber,
  openerId,
  openerTag,
  addedUserIds = [],
  claimedByTag,
  closedBy,
  reason,
  createdAt,
  messages
}) {
  const participantMap = new Map();
  const rowsList = [];

  for (const m of messages) {
    const authorId = m.author?.id || "0";
    const authorName = m.author?.username || m.author?.tag || "Unknown User";
    const isBot = Boolean(m.author?.bot);
    const avatarUrl =
      m.author?.displayAvatarURL({ extension: "png", size: 128 }) ||
      "https://cdn.discordapp.com/embed/avatars/0.png";

    const roleInfo = classifyParticipant(authorId, openerId, addedUserIds, isBot, guild);
    if (!participantMap.has(authorId)) {
      participantMap.set(authorId, {
        id: authorId,
        name: authorName,
        roleLabel: roleInfo.label,
        roleCls: roleInfo.cls,
        count: 0
      });
    }
    participantMap.get(authorId).count += 1;

    const timeStr = formatFullDateTime(m.createdTimestamp);
    const contentHtml = m.content
      ? `<div class="msg-text">${escapeHtml(m.content).replace(/\n/g, "<br>")}</div>`
      : "";

    let attachmentsHtml = "";
    if (m.attachments?.size) {
      const items = await Promise.all(
        Array.from(m.attachments.values()).map(async (att) => {
          const safeUrl = escapeHtml(att.url || "");
          const safeName = escapeHtml(att.name || "attachment");
          const sizeText =
            typeof att.size === "number"
              ? ` (${(att.size / 1024).toFixed(1)} KB)`
              : "";
          const embeddedSrc = await attachmentToSafeDataUrl(att);

          if (embeddedSrc) {
            return `
              <div class="attachment">
                <a href="${embeddedSrc}" target="_blank" rel="noopener">
                  <img src="${embeddedSrc}" alt="${safeName}" loading="lazy">
                </a>
                <div class="att-caption">Saved image: <strong>${safeName}</strong>${sizeText}${safeUrl ? ` &bull; <a href="${safeUrl}" target="_blank" rel="noopener">Original URL</a>` : ""}</div>
              </div>
            `;
          }

          const imgFallbackNote =
            att.contentType && att.contentType.startsWith("image/")
              ? " (image too large to embed—kept link)"
              : "";

          return `
            <div class="attachment file-card">
              <a href="${safeUrl}" target="_blank" rel="noopener">📎 ${safeName}</a>
              <span class="muted">${sizeText}${escapeHtml(imgFallbackNote)}</span>
            </div>
          `;
        })
      );
      attachmentsHtml = items.join("");
    }

    const embedsHtml = m.embeds?.length
      ? m.embeds
          .map((emb) => {
            const accent = emb.color
              ? `#${emb.color.toString(16).padStart(6, "0")}`
              : "#23a559";
            const title = emb.title
              ? `<div class="embed-title">${escapeHtml(emb.title)}</div>`
              : "";
            const desc = emb.description
              ? `<div class="embed-desc">${escapeHtml(emb.description).replace(/\n/g, "<br>")}</div>`
              : "";
            const fields = emb.fields?.length
              ? `<div class="embed-fields">${emb.fields
                  .map(
                    (f) =>
                      `<div class="embed-field"><div class="field-name">${escapeHtml(f.name)}</div><div class="field-val">${escapeHtml(f.value).replace(/\n/g, "<br>")}</div></div>`
                  )
                  .join("")}</div>`
              : "";
            return `<div class="embed" style="border-left-color:${accent}">${title}${desc}${fields}</div>`;
          })
          .join("")
      : "";

    const fallbackEmpty =
      !contentHtml && !attachmentsHtml && !embedsHtml
        ? `<div class="msg-text muted"><em>(empty message)</em></div>`
        : "";

    rowsList.push(`
      <div class="msg-row" data-role="${escapeHtml(roleInfo.label.toLowerCase())}" data-author-id="${escapeHtml(authorId)}">
        <img class="avatar" src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(authorName)}" loading="lazy">
        <div class="msg-body">
          <div class="msg-meta">
            <span class="author">${escapeHtml(authorName)}</span>
            <span class="role-pill ${escapeHtml(roleInfo.cls)}">${escapeHtml(roleInfo.label)}</span>
            <span class="user-id">ID: ${escapeHtml(authorId)}</span>
            <span class="timestamp">${escapeHtml(timeStr)}</span>
          </div>
          ${contentHtml}
          ${embedsHtml}
          ${attachmentsHtml}
          ${fallbackEmpty}
        </div>
      </div>
    `);
  }

  const rosterHtml = Array.from(participantMap.values())
    .map(
      (p) =>
        `<span class="roster-chip"><span class="role-pill ${escapeHtml(p.roleCls)}">${escapeHtml(p.roleLabel)}</span> <strong>${escapeHtml(p.name)}</strong> <span class="muted">(${p.count})</span></span>`
    )
    .join("");

  const rowsHtml = rowsList.join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transcript #${escapeHtml(ticketNumber || channel.name)} — ${escapeHtml(guild.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 48px;
      background: #141821;
      color: #e4e8f0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.45;
    }
    .container { max-width: 940px; margin: 0 auto; }
    .header {
      background: #1b202c;
      border: 1px solid #293142;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 16px;
    }
    .breadcrumb { font-size: 12px; color: #8f9bb3; margin-bottom: 6px; }
    h1 { margin: 0 0 14px; font-size: 22px; color: #ffffff; }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px 18px;
      font-size: 13px;
      color: #b8c2d6;
      margin-bottom: 16px;
    }
    .meta-item strong {
      color: #8f9bb3;
      font-weight: 600;
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .roster {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding-top: 12px;
      border-top: 1px solid #293142;
      margin-bottom: 14px;
    }
    .roster-chip {
      background: #141821;
      border: 1px solid #293142;
      border-radius: 8px;
      padding: 4px 10px;
      font-size: 12.5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; }
    .filter-btn {
      background: #252c3d;
      color: #dce3f0;
      border: 1px solid #354059;
      border-radius: 6px;
      padding: 5px 11px;
      font-size: 12px;
      cursor: pointer;
    }
    .filter-btn.active {
      background: #5865f2;
      border-color: #5865f2;
      color: #fff;
    }
    .chat-box {
      background: #1b202c;
      border: 1px solid #293142;
      border-radius: 12px;
      padding: 10px 0;
    }
    .msg-row {
      display: flex;
      gap: 14px;
      padding: 10px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
    }
    .msg-row:last-child { border-bottom: none; }
    .msg-row:hover { background: rgba(255, 255, 255, 0.025); }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
      margin-top: 2px;
      background: #5865f2;
    }
    .msg-body { min-width: 0; flex: 1; }
    .msg-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .author { font-weight: 600; font-size: 14.5px; color: #ffffff; }
    .user-id { font-size: 11px; color: #6e7a94; font-family: monospace; }
    .timestamp { font-size: 11.5px; color: #8894ab; margin-left: auto; }
    .role-pill {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }
    .role-opener { background: rgba(35, 165, 89, 0.2); color: #57f287; border: 1px solid rgba(35, 165, 89, 0.45); }
    .role-staff { background: rgba(237, 66, 69, 0.2); color: #ff8789; border: 1px solid rgba(237, 66, 69, 0.45); }
    .role-added { background: rgba(250, 166, 26, 0.2); color: #ffd166; border: 1px solid rgba(250, 166, 26, 0.45); }
    .role-member { background: rgba(143, 155, 179, 0.16); color: #c7d0e0; border: 1px solid rgba(143, 155, 179, 0.3); }
    .role-bot { background: rgba(88, 101, 242, 0.22); color: #9aa4ff; border: 1px solid rgba(88, 101, 242, 0.45); }
    .msg-text { font-size: 14.5px; color: #e4e8f0; word-wrap: break-word; overflow-wrap: anywhere; }
    .muted { color: #8f9bb3; }
    .embed {
      margin-top: 8px;
      background: #141821;
      border-left: 4px solid #23a559;
      border-radius: 6px;
      padding: 10px 14px;
      max-width: 560px;
    }
    .embed-title { font-weight: 600; font-size: 14px; color: #ffffff; margin-bottom: 4px; }
    .embed-desc { font-size: 13.5px; color: #cdd5e6; word-wrap: break-word; }
    .embed-fields { margin-top: 8px; display: grid; gap: 6px; }
    .field-name { font-size: 12px; font-weight: 600; color: #b8c2d6; }
    .field-val { font-size: 13px; color: #e4e8f0; }
    .attachment { margin-top: 8px; }
    .attachment img {
      max-width: min(460px, 100%);
      max-height: 380px;
      border-radius: 8px;
      display: block;
      border: 1px solid #293142;
    }
    .att-caption { font-size: 11.5px; color: #8f9bb3; margin-top: 4px; }
    .file-card {
      background: #141821;
      border: 1px solid #293142;
      border-radius: 8px;
      padding: 8px 12px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }
    .attachment a { color: #6ea8fe; text-decoration: none; }
    .attachment a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="breadcrumb">${escapeHtml(guild.name)} &rsaquo; #${escapeHtml(channel.name)}</div>
      <h1>Ticket Transcript #${escapeHtml(ticketNumber || channel.name)}</h1>
      <div class="meta-grid">
        <div class="meta-item"><strong>Opened By</strong>${escapeHtml(openerTag)}</div>
        <div class="meta-item"><strong>Claimed By</strong>${escapeHtml(claimedByTag || "Unclaimed")}</div>
        <div class="meta-item"><strong>Closed By</strong>${escapeHtml(closedBy.username || closedBy.tag)}</div>
        <div class="meta-item"><strong>Opened At</strong>${escapeHtml(formatFullDateTime(createdAt))}</div>
        <div class="meta-item"><strong>Messages</strong>${messages.length}</div>
        <div class="meta-item"><strong>Close Reason</strong>${escapeHtml(reason)}</div>
      </div>
      <div class="roster">${rosterHtml}</div>
      <div class="filters">
        <button class="filter-btn active" onclick="filterRole('all', this)">All</button>
        <button class="filter-btn" onclick="filterRole('opener', this)">Opener</button>
        <button class="filter-btn" onclick="filterRole('staff', this)">Staff</button>
        <button class="filter-btn" onclick="filterRole('added', this)">Added</button>
        <button class="filter-btn" onclick="filterRole('bot', this)">Bot</button>
      </div>
    </div>
    <div class="chat-box">
      ${rowsHtml || `<div class="msg-row"><div class="msg-body"><div class="msg-text muted">No messages recorded in this ticket.</div></div></div>`}
    </div>
  </div>
  <script>
    function filterRole(role, btn) {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      document.querySelectorAll('.msg-row').forEach(row => {
        row.style.display = (role === 'all' || row.dataset.role === role) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;
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

// ================= UNIFIED CLOSE + LOG + DM HTML TRANSCRIPT =================
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
    .send("🔒 Closing ticket... Generating HTML transcript and sending logs.")
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
  const htmlString = await renderTranscriptHtml({
    channel,
    guild,
    ticketNumber,
    openerId,
    openerTag,
    addedUserIds: savedData.addedUserIds || [],
    claimedByTag: claimedByPlain,
    closedBy,
    reason,
    createdAt,
    messages
  });
  const htmlBuffer = Buffer.from(htmlString, "utf8");
  const fileName = `transcript-${channel.name}-${Date.now()}.html`;

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

    const logAttachment = new AttachmentBuilder(htmlBuffer, { name: fileName });
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

    const dmAttachment = new AttachmentBuilder(htmlBuffer, { name: fileName });
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
