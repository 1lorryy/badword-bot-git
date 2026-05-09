const { DEFAULT_PURCHASE_LINKS } = require("./commands/buy");
const express = require("express");
const session = require("express-session");
const fs = require("fs");
const path = require("path");
const { getClient } = require("./bot");

const app = express();
const PORT = Number(process.env.WEB_PORT || process.env.PORT || 3000);

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const CALLBACK_URL = process.env.CALLBACK_URL || "http://localhost:3000/callback";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-this-secret";

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, "guild-data.json");
const CSS_PATH = path.join(__dirname, "dashboard", "dashboard.css");

const DEFAULT_PREFIX = "?";
const ADMIN_PERMISSION = BigInt(0x8);

const CORE_BLACKLIST = [
  "ass", "nigga", "nigger", "nga", "idiot", "retard", "faggot", "fagot",
  "porn", "sex", "pussy", "boobs", "penis", "dick", "fuck", "idgaf",
  "motherfuck", "motherfucker", "mf", "asshole", "cunt", "possay",
  "sexcam", "bubs", "bitchass", "dumbass"
];

const BLOCKED_LINKS = [
  "discord.gg/",
  "discord.com/invite/",
  "onlyfans.com",
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com"
];

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

function cloneDefaultPurchaseLinks() {
  return JSON.parse(JSON.stringify(DEFAULT_PURCHASE_LINKS));
}

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function fixGuildData(cfg) {
  if (!cfg.prefix) cfg.prefix = DEFAULT_PREFIX;
  if (!Array.isArray(cfg.words)) cfg.words = [];
  if (!Array.isArray(cfg.blockedLinks)) cfg.blockedLinks = [];

  if (!cfg.customCommands || typeof cfg.customCommands !== "object") {
    cfg.customCommands = {};
  }

  if (!cfg.warnings || typeof cfg.warnings !== "object") {
    cfg.warnings = {};
  }

  if (!cfg.purchaseLinks || typeof cfg.purchaseLinks !== "object") {
    cfg.purchaseLinks = cloneDefaultPurchaseLinks();
  }

  for (const key of ["classes", "ads6h", "ads24h", "extras"]) {
    if (!Array.isArray(cfg.purchaseLinks[key])) {
      cfg.purchaseLinks[key] = cloneDefaultPurchaseLinks()[key] || [];
    }
  }
}

function getGuildData(guildId) {
  const data = loadData();

  if (!data[guildId]) {
    data[guildId] = {
      prefix: DEFAULT_PREFIX,
      words: [],
      blockedLinks: [],
      customCommands: {},
      purchaseLinks: cloneDefaultPurchaseLinks(),
      warnings: {}
    };
    saveData(data);
  }

  fixGuildData(data[guildId]);
  saveData(data);

  return data[guildId];
}

function updateGuildData(guildId, updater) {
  const data = loadData();

  if (!data[guildId]) {
    data[guildId] = {
      prefix: DEFAULT_PREFIX,
      words: [],
      blockedLinks: [],
      customCommands: {},
      purchaseLinks: cloneDefaultPurchaseLinks(),
      warnings: {}
    };
  }

  fixGuildData(data[guildId]);
  updater(data[guildId]);
  fixGuildData(data[guildId]);
  saveData(data);
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isAdminGuild(guild) {
  try {
    return (BigInt(guild.permissions) & ADMIN_PERMISSION) === ADMIN_PERMISSION;
  } catch {
    return false;
  }
}

function getAllowedGuilds(req) {
  const client = getClient();
  const userGuilds = req.session.guilds || [];

  return userGuilds.filter(g => {
    const botInGuild = client?.guilds?.cache?.has(g.id);
    return botInGuild && isAdminGuild(g);
  });
}

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireGuildAdmin(req, res, next) {
  const allowed = getAllowedGuilds(req);
  const ok = allowed.some(g => g.id === req.params.guildId);

  if (!ok) {
    return res.status(403).send(renderPage({
      req,
      guildId: null,
      tab: "",
      title: "No Access",
      content: `
        <div class="card">
          <h2>❌ No access</h2>
          <p>You need Administrator permission in this server to manage the dashboard.</p>
          <a class="guild-link" href="/">Back to servers</a>
        </div>
      `
    }));
  }

  next();
}

app.get("/dashboard.css", (req, res) => {
  if (!fs.existsSync(CSS_PATH)) return res.type("text/css").send("");
  res.type("text/css").send(fs.readFileSync(CSS_PATH, "utf8"));
});

// ================= AUTH =================
app.get("/login", (req, res) => {
  const url =
    `https://discord.com/api/oauth2/authorize` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(CALLBACK_URL)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("identify guilds")}`;

  res.redirect(url);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("/login");

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: CALLBACK_URL
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("OAuth token error:", tokenData);
      return res.status(500).send("OAuth failed.");
    }

    const [userRes, guildsRes] = await Promise.all([
      fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      }),
      fetch("https://discord.com/api/users/@me/guilds", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })
    ]);

    req.session.user = await userRes.json();
    req.session.guilds = await guildsRes.json();

    res.redirect("/");
  } catch (err) {
    console.error("OAuth callback error:", err);
    res.status(500).send("Login failed.");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/login"));
});

// ================= LAYOUT =================
function renderPage({ req, guildId, tab, title, content }) {
  const sidebarBase = guildId ? `/dashboard/${guildId}` : "#";
  const user = req?.session?.user;

  return `
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <link rel="stylesheet" href="/dashboard.css" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body>
      <div class="layout">
        <aside class="sidebar">
          <div class="brand">⚙️ DonQuixote Bot</div>
          ${guildId ? `
            <a class="nav ${tab === "words" ? "active" : ""}" href="${sidebarBase}/words">🚫 AutoMod Words</a>
            <a class="nav ${tab === "links" ? "active" : ""}" href="${sidebarBase}/links">🔗 Blocked Links</a>
            <a class="nav ${tab === "prefix" ? "active" : ""}" href="${sidebarBase}/prefix">⚙️ Prefix</a>
            <a class="nav ${tab === "warnings" ? "active" : ""}" href="${sidebarBase}/warnings">⚠️ Warnings</a>
            <a class="nav ${tab === "custom" ? "active" : ""}" href="${sidebarBase}/custom">💬 Custom Commands</a>
            <a class="nav ${tab === "purchase" ? "active" : ""}" href="${sidebarBase}/purchase">🛒 Purchase Links</a>
            <a class="nav ${tab === "info" ? "active" : ""}" href="${sidebarBase}/info">📊 Info</a>
          ` : ""}
          <a class="nav" href="/">Servers</a>
          <a class="nav" href="/logout">Logout</a>
        </aside>

        <main class="content">
          <div class="topbar">
            <div class="title">${escapeHtml(title)}</div>
            <div>${user ? `Logged in as ${escapeHtml(user.username)}` : ""}</div>
          </div>
          ${content}
        </main>
      </div>
    </body>
  </html>
  `;
}

function renderGuildSelect(req) {
  const guilds = getAllowedGuilds(req);

  const items = guilds
    .map(g => `<a class="guild-link" href="/dashboard/${g.id}/words">${escapeHtml(g.name)}</a>`)
    .join("");

  return `
    <div class="card">
      <h2>Select a server</h2>
      <p>Only servers where you have Administrator permission are shown.</p>
      <div class="guild-list">
        ${items || "<div>No manageable servers found.</div>"}
      </div>
    </div>
  `;
}

app.get("/", requireLogin, (req, res) => {
  res.send(renderPage({
    req,
    guildId: null,
    tab: "",
    title: "Dashboard",
    content: renderGuildSelect(req)
  }));
});

// ================= WORDS =================
app.get("/dashboard/:guildId/words", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);

  const protectedWords = CORE_BLACKLIST.map(w => `<span class="pill protected">${escapeHtml(w)}</span>`).join("");
  const customWords = cfg.words.map(w => `<span class="pill">${escapeHtml(w)}</span>`).join("");

  res.send(renderPage({
    req,
    guildId,
    tab: "words",
    title: "AutoMod Words",
    content: `
      <div class="card">
        <h2>Protected words</h2>
        <p>These stay forever and cannot be removed.</p>
        <div class="pill-wrap">${protectedWords}</div>
      </div>

      <div class="card">
        <h2>Custom words</h2>
        <div class="pill-wrap">${customWords || "<div>No custom words yet.</div>"}</div>
      </div>

      <div class="card">
        <h3>Add word</h3>
        <form method="POST" action="/dashboard/${guildId}/words/add" class="row">
          <input type="text" name="word" placeholder="Enter word" required />
          <button type="submit">Add</button>
        </form>
      </div>

      <div class="card">
        <h3>Remove custom word</h3>
        <form method="POST" action="/dashboard/${guildId}/words/remove" class="row">
          <input type="text" name="word" placeholder="Enter word" required />
          <button type="submit">Remove</button>
        </form>
      </div>
    `
  }));
});

app.post("/dashboard/:guildId/words/add", requireLogin, requireGuildAdmin, (req, res) => {
  const word = String(req.body.word || "").trim().toLowerCase();

  if (word && !CORE_BLACKLIST.includes(word)) {
    updateGuildData(req.params.guildId, cfg => {
      if (!cfg.words.includes(word)) cfg.words.push(word);
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/words`);
});

app.post("/dashboard/:guildId/words/remove", requireLogin, requireGuildAdmin, (req, res) => {
  const word = String(req.body.word || "").trim().toLowerCase();

  if (!CORE_BLACKLIST.includes(word)) {
    updateGuildData(req.params.guildId, cfg => {
      cfg.words = cfg.words.filter(w => w !== word);
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/words`);
});

// ================= LINKS =================
app.get("/dashboard/:guildId/links", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);

  const protectedLinks = BLOCKED_LINKS.map(l => `<span class="pill protected">${escapeHtml(l)}</span>`).join("");
  const customLinks = cfg.blockedLinks.map(l => `<span class="pill">${escapeHtml(l)}</span>`).join("");

  res.send(renderPage({
    req,
    guildId,
    tab: "links",
    title: "Blocked Links",
    content: `
      <div class="card">
        <h2>Protected links</h2>
        <div class="pill-wrap">${protectedLinks}</div>
      </div>

      <div class="card">
        <h2>Custom links</h2>
        <div class="pill-wrap">${customLinks || "<div>No custom links yet.</div>"}</div>
      </div>

      <div class="card">
        <h3>Add link/domain</h3>
        <form method="POST" action="/dashboard/${guildId}/links/add" class="row">
          <input type="text" name="link" placeholder="example.com" required />
          <button type="submit">Add</button>
        </form>
      </div>

      <div class="card">
        <h3>Remove custom link/domain</h3>
        <form method="POST" action="/dashboard/${guildId}/links/remove" class="row">
          <input type="text" name="link" placeholder="example.com" required />
          <button type="submit">Remove</button>
        </form>
      </div>
    `
  }));
});

app.post("/dashboard/:guildId/links/add", requireLogin, requireGuildAdmin, (req, res) => {
  const link = String(req.body.link || "").trim().toLowerCase();

  if (link && !BLOCKED_LINKS.includes(link)) {
    updateGuildData(req.params.guildId, cfg => {
      if (!cfg.blockedLinks.includes(link)) cfg.blockedLinks.push(link);
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/links`);
});

app.post("/dashboard/:guildId/links/remove", requireLogin, requireGuildAdmin, (req, res) => {
  const link = String(req.body.link || "").trim().toLowerCase();

  if (!BLOCKED_LINKS.includes(link)) {
    updateGuildData(req.params.guildId, cfg => {
      cfg.blockedLinks = cfg.blockedLinks.filter(l => l !== link);
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/links`);
});

// ================= PREFIX =================
app.get("/dashboard/:guildId/prefix", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);

  res.send(renderPage({
    req,
    guildId,
    tab: "prefix",
    title: "Prefix",
    content: `
      <div class="card">
        <h2>Current prefix</h2>
        <div class="big-pill">${escapeHtml(cfg.prefix)}</div>
      </div>

      <div class="card">
        <h3>Change prefix</h3>
        <form method="POST" action="/dashboard/${guildId}/prefix" class="row">
          <input type="text" name="prefix" maxlength="3" placeholder="?" required />
          <button type="submit">Update</button>
        </form>
      </div>
    `
  }));
});

app.post("/dashboard/:guildId/prefix", requireLogin, requireGuildAdmin, (req, res) => {
  const prefix = String(req.body.prefix || "").trim();

  if (prefix && prefix.length <= 3) {
    updateGuildData(req.params.guildId, cfg => {
      cfg.prefix = prefix;
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/prefix`);
});

// ================= WARNINGS =================
app.get("/dashboard/:guildId/warnings", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);

  const warningCards = Object.entries(cfg.warnings || {}).map(([userId, warnings]) => {
    const warns = Array.isArray(warnings) ? warnings : [];

    const list = warns.map(w => `
      <div class="warn-box">
        <b>ID:</b> ${escapeHtml(w.id)}<br/>
        <b>Reason:</b> ${escapeHtml(w.reason || "No reason")}<br/>
        <b>Moderator:</b> ${escapeHtml(w.mod || "Unknown")}<br/>
        <b>Date:</b> ${escapeHtml(w.date || "Unknown")}
      </div>
    `).join("");

    return `<div class="card"><h3>User ID: ${escapeHtml(userId)}</h3>${list}</div>`;
  }).join("");

  res.send(renderPage({
    req,
    guildId,
    tab: "warnings",
    title: "Warnings",
    content: warningCards || `<div class="card"><h2>No warnings saved.</h2></div>`
  }));
});

// ================= CUSTOM COMMANDS =================
app.get("/dashboard/:guildId/custom", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);

  const commands = Object.entries(cfg.customCommands)
    .map(([cmd, data]) => {
      const response = typeof data === "string" ? data : data.response;
      const allowPings = typeof data === "object" && data.allowPings;

      return `
        <div class="warn-box">
          <b>Command:</b> ${escapeHtml(cmd)}<br/>
          <b>Response:</b> ${escapeHtml(response)}<br/>
          <b>Pings:</b> ${allowPings ? "Allowed" : "Disabled"}
        </div>
      `;
    })
    .join("");

  res.send(renderPage({
    req,
    guildId,
    tab: "custom",
    title: "Custom Commands",
    content: `
      <div class="card">
        <h2>Current custom commands</h2>
        ${commands || "<div>No custom commands yet.</div>"}
      </div>

      <div class="card">
        <h3>Add custom command</h3>
        <form method="POST" action="/dashboard/${guildId}/custom/add">
          <div class="row">
            <input type="text" name="command" placeholder="hi" required />
          </div>
          <br/>
          <div class="row">
            <input type="text" name="response" placeholder="Hello there!" required />
            <button type="submit">Add</button>
          </div>
          <br/>
          <label class="check">
            <input type="checkbox" name="allowPings" />
            Allow pings in response
          </label>
        </form>
      </div>

      <div class="card">
        <h3>Remove custom command</h3>
        <form method="POST" action="/dashboard/${guildId}/custom/remove" class="row">
          <input type="text" name="command" placeholder="hi" required />
          <button type="submit">Remove</button>
        </form>
      </div>
    `
  }));
});

app.post("/dashboard/:guildId/custom/add", requireLogin, requireGuildAdmin, (req, res) => {
  const command = String(req.body.command || "")
    .trim()
    .toLowerCase()
    .replace(/^\?+/, "");

  const response = String(req.body.response || "").trim();

  if (command && response) {
    updateGuildData(req.params.guildId, cfg => {
      cfg.customCommands[command] = {
        response,
        allowPings: !!req.body.allowPings
      };
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/custom`);
});

app.post("/dashboard/:guildId/custom/remove", requireLogin, requireGuildAdmin, (req, res) => {
  const command = String(req.body.command || "")
    .trim()
    .toLowerCase()
    .replace(/^\?+/, "");

  updateGuildData(req.params.guildId, cfg => {
    delete cfg.customCommands[command];
  });

  res.redirect(`/dashboard/${req.params.guildId}/custom`);
});

// ================= PURCHASE LINKS =================
app.get("/dashboard/:guildId/purchase", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const cfg = getGuildData(guildId);
  const links = cfg.purchaseLinks || cloneDefaultPurchaseLinks();

  function renderGroup(key, title) {
    const items = links[key] || [];

    return `
      <div class="card">
        <h2>${title}</h2>
        ${
          items.length
            ? items.map((item, index) => `
              <div class="warn-box">
                <b>${escapeHtml(item.name)}</b><br/>
                <a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.url)}</a>
                <form method="POST" action="/dashboard/${guildId}/purchase/remove" style="margin-top:10px;">
                  <input type="hidden" name="group" value="${key}" />
                  <input type="hidden" name="index" value="${index}" />
                  <button type="submit">Remove</button>
                </form>
              </div>
            `).join("")
            : "<p>No links added.</p>"
        }

        <h3>Add link</h3>
        <form method="POST" action="/dashboard/${guildId}/purchase/add" class="row">
          <input type="hidden" name="group" value="${key}" />
          <input type="text" name="name" placeholder="Name" required />
          <input type="text" name="url" placeholder="https://www.roblox.com/game-pass/..." required />
          <button type="submit">Add</button>
        </form>
      </div>
    `;
  }

  res.send(renderPage({
    req,
    guildId,
    tab: "purchase",
    title: "Purchase Links",
    content: `
      ${renderGroup("classes", "✈️ Classes")}
      ${renderGroup("ads6h", "⏱️ 10M–6H Ads")}
      ${renderGroup("ads24h", "🕒 6H–24H Ads")}
      ${renderGroup("extras", "➕ Extras")}
    `
  }));
});

app.post("/dashboard/:guildId/purchase/add", requireLogin, requireGuildAdmin, (req, res) => {
  const group = String(req.body.group || "");
  const name = String(req.body.name || "").trim();
  const url = String(req.body.url || "").trim();

  if (["classes", "ads6h", "ads24h", "extras"].includes(group) && name && url) {
    updateGuildData(req.params.guildId, cfg => {
      if (!Array.isArray(cfg.purchaseLinks[group])) cfg.purchaseLinks[group] = [];
      cfg.purchaseLinks[group].push({ name, url });
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/purchase`);
});

app.post("/dashboard/:guildId/purchase/remove", requireLogin, requireGuildAdmin, (req, res) => {
  const group = String(req.body.group || "");
  const index = Number(req.body.index);

  if (["classes", "ads6h", "ads24h", "extras"].includes(group) && Number.isInteger(index)) {
    updateGuildData(req.params.guildId, cfg => {
      if (Array.isArray(cfg.purchaseLinks[group])) {
        cfg.purchaseLinks[group].splice(index, 1);
      }
    });
  }

  res.redirect(`/dashboard/${req.params.guildId}/purchase`);
});

// ================= INFO =================
app.get("/dashboard/:guildId/info", requireLogin, requireGuildAdmin, (req, res) => {
  const { guildId } = req.params;
  const client = getClient();
  const guild = client?.guilds?.cache?.get(guildId);

  res.send(renderPage({
    req,
    guildId,
    tab: "info",
    title: "Info",
    content: `
      <div class="card">
        <h2>Server Info</h2>
        <p><b>Server:</b> ${escapeHtml(guild?.name || guildId)}</p>
        <p><b>Server ID:</b> ${escapeHtml(guildId)}</p>
        <p><b>Members:</b> ${guild?.memberCount ?? "Unknown"}</p>
      </div>
    `
  }));
});

function startWeb() {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dashboard running at http://localhost:${PORT}`);
  });
}

module.exports = { startWeb };