const express = require("express");
const router = express.Router();

const {
  EmbedBuilder,
  PermissionsBitField
} = require("discord.js");

const { getClient } = require("../bot");

router.post("/send-embed", async (req, res) => {

  try {

    const {
      guildId,
      channelId,
      title,
      description,
      color,
      ping
    } = req.body;

    const client = getClient();

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      return res.status(404).json({
        error: "Guild not found"
      });
    }

    const channel = guild.channels.cache.get(channelId);

    if (!channel || !channel.isTextBased()) {
      return res.status(404).json({
        error: "Channel not found"
      });
    }

    const embed = new EmbedBuilder()
      .setColor(color || "#5865F2")
      .setDescription(description || "");

    if (title?.trim()) {
      embed.setTitle(title);
    }

    await channel.send({
      content: ping || "",
      embeds: [embed],
      allowedMentions: {
        parse: ["roles", "users", "everyone"]
      }
    });

    return res.json({
      success: true
    });

  } catch (err) {
    console.error(err);

    return res.status(500).json({
      error: "Failed to send embed"
    });
  }
});

module.exports = router;