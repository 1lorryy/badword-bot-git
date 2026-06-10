const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { EmbedBuilder, ChannelType } = require("discord.js");
const { getClient } = require("../bot");

const DATA_FILE = path.join(__dirname, "..", "guild-data.json");

// Helper Functions
function getGuildData(guildId) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return data[guildId] || {};
  } catch { return {}; }
}

function saveGuildData(guildId, guildSettings) {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    data[guildId] = guildSettings;
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) { console.error("Error saving data:", err); }
}

// 🛒 PURCHASE DASHBOARD ROUTE (Now includes Channel Selector)
router.get("/dashboard/:guildId/purchase", async (req, res) => {
  const { guildId } = req.params;
  const client = getClient();
  const guild = client.guilds.cache.get(guildId);
  const settings = getGuildData(guildId);

  if (!settings.purchaseLinks) {
    settings.purchaseLinks = { embedSettings: { title: "🛒 Purchase", description: "Links", color: "#5865f2" }, classes: [], ads6h: [], ads24h: [], extras: [] };
    saveGuildData(guildId, settings);
  }

  // Get Channel List
  let channelOptions = "";
  if (guild) {
    guild.channels.cache
      .filter(c => c.type === ChannelType.GuildText)
      .forEach(c => { channelOptions += `<option value="${c.id}">#${c.name}</option>`; });
  }

  const links = settings.purchaseLinks;
  let rows = "";
  ['classes', 'ads6h', 'ads24h', 'extras'].forEach(cat => {
    (links[cat] || []).forEach((item, i) => {
      rows += `<tr><td>${cat}</td><td>${item.name}</td><td><a href="${item.url}">Link</a></td><td><a href="/dashboard/${guildId}/purchase/delete/${cat}/${i}">❌</a></td></tr>`;
    });
  });

  res.send(`
    <html style="background:#2c2f33; color:white; font-family:sans-serif;">
      <body style="padding:20px;">
        <h1>Shop Editor</h1>
        
        <div style="background:#202225; padding:15px; border-radius:8px; margin-bottom:20px;">
          <h3>Send Shop Embed</h3>
          <form action="/send-embed" method="POST">
            <input type="hidden" name="guildId" value="${guildId}">
            <select name="channelId" style="width:100%; margin-bottom:10px;">${channelOptions}</select>
            <input name="title" placeholder="Embed Title" value="${links.embedSettings.title}" style="width:100%; margin-bottom:10px;">
            <textarea name="description" placeholder="Description" style="width:100%; margin-bottom:10px;">${links.embedSettings.description}</textarea>
            <input name="color" type="color" value="${links.embedSettings.color}">
            <button>Send to Discord</button>
          </form>
        </div>

        <form action="/dashboard/${guildId}/purchase/update-meta" method="POST">
          <input name="title" value="${links.embedSettings.title}">
          <textarea name="description">${links.embedSettings.description}</textarea>
          <button>Save Shop Config</button>
        </form>
        
        <table border="1" width="100%">${rows}</table>
        
        <form action="/dashboard/${guildId}/purchase/add-item" method="POST">
          <select name="category"><option value="classes">Classes</option><option value="ads6h">6H Ads</option><option value="ads24h">24H Ads</option><option value="extras">Extras</option></select>
          <input name="name" placeholder="Name"><input name="url" placeholder="URL"><button>Add Item</button>
        </form>
      </body>
    </html>`);
});

// ... (Keep your existing POST routes for update-meta, add-item, delete, and send-embed)
