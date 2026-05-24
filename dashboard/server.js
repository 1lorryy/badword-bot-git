const express = require("express");

const { getClient } = require("../bot");

const app = express();

app.use(express.json());

app.use(express.static(__dirname));

// ================= SEND EMBED =================

app.post("/api/send-embed", async (req, res) => {

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

    const embed = {
      color: parseInt(
        (color || "#5865F2").replace("#", ""),
        16
      ),

      description: description || ""
    };

    if (title?.trim()) {
      embed.title = title;
    }

    await channel.send({
      content: ping || "",
      embeds: [embed],
      allowedMentions: {
        parse: ["users", "roles", "everyone"]
      }
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Failed"
    });
  }
});

// ================= START =================

app.listen(3000, () => {
  console.log("Dashboard running on port 3000");
});