const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const { EmbedBuilder } = require("discord.js");
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

// 🛒 PURCHASE DASHBOARD ROUTE
router.get("/dashboard/:guildId/purchase", async (req, res) => {
  const { guildId } = req.params;
  const settings = getGuildData(guildId);
  if (!settings.purchaseLinks) {
    settings.purchaseLinks = { embedSettings: { title: "🛒 Purchase", description: "Links", color: "#5865f2" }, classes: [], ads6h: [], ads24h: [], extras: [] };
    saveGuildData(guildId, settings);
  }
  const links = settings.purchaseLinks;
  let rows = "";
  ['classes', 'ads6h', 'ads24h', 'extras'].forEach(cat => {
    (links[cat] || []).forEach((item, i) => {
      rows += `<tr><td>${cat}</td><td>${item.name}</td><td><a href="${item.url}">Link</a></td><td><a href="/dashboard/${guildId}/purchase/delete/${cat}/${i}">❌</a></td></tr>`;
    });
  });
  res.send(`<html><body style="background:#2c2f33; color:white; padding:20px;"><h1>Shop Editor</h1><form action="/dashboard/${guildId}/purchase/update-meta" method="POST"><input name="title" value="${links.embedSettings.title}"><textarea name="description">${links.embedSettings.description}</textarea><button>Save</button></form><table border="1" width="100%">${rows}</table><form action="/dashboard/${guildId}/purchase/add-item" method="POST"><select name="category"><option value="classes">Classes</option><option value="ads6h">6H Ads</option><option value="ads24h">24H Ads</option><option value="extras">Extras</option></select><input name="name" placeholder="Name"><input name="url" placeholder="URL"><button>Add</button></form></body></html>`);
});

router.post("/dashboard/:guildId/purchase/update-meta", (req, res) => {
  const settings = getGuildData(req.params.guildId);
  settings.purchaseLinks.embedSettings = req.body;
  saveGuildData(req.params.guildId, settings);
  res.redirect(`/dashboard/${req.params.guildId}/purchase`);
});

router.post("/dashboard/:guildId/purchase/add-item", (req, res) => {
  const settings = getGuildData(req.params.guildId);
  if (!settings.purchaseLinks[req.body.category]) settings.purchaseLinks[req.body.category] = [];
  settings.purchaseLinks[req.body.category].push({ name: req.body.name, url: req.body.url });
  saveGuildData(req.params.guildId, settings);
  res.redirect(`/dashboard/${req.params.guildId}/purchase`);
});

router.get("/dashboard/:guildId/purchase/delete/:cat/:idx", (req, res) => {
  const settings = getGuildData(req.params.guildId);
  settings.purchaseLinks[req.params.cat].splice(req.params.idx, 1);
  saveGuildData(req.params.guildId, settings);
  res.redirect(`/dashboard/${req.params.guildId}/purchase`);
});

// Original Embed Route
router.post("/send-embed", async (req, res) => {
  try {
    const { guildId, channelId, title, description, color, ping } = req.body;
    const client = getClient();
    const guild = client.guilds.cache.get(guildId);
    const channel = guild?.channels.cache.get(channelId);
    if (!channel?.isTextBased()) return res.status(404).json({ error: "Channel not found" });
    const embed = new EmbedBuilder().setColor(color || "#5865F2").setDescription(description || "");
    if (title?.trim()) embed.setTitle(title);
    await channel.send({ content: ping || "", embeds: [embed] });
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: "Failed" }); }
});

module.exports = router;
