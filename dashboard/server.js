const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const { EmbedBuilder } = require("discord.js");

const { getClient } = require("../bot");

const app = express();

app.use(bodyParser.json());

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "embed.html"));
});

app.post("/send-embed", async (req, res) => {

  try {

    const client = getClient();

    const {
      channelId,
      title,
      description,
      color,
      footer,
      image,
      thumbnail,
      content
    } = req.body;

    const channel = await client.channels.fetch(channelId);

    const embed = new EmbedBuilder()
      .setColor(color || "#5865F2");

    if (title) embed.setTitle(title);
    if (description) embed.setDescription(description);
    if (footer) embed.setFooter({ text: footer });
    if (image) embed.setImage(image);
    if (thumbnail) embed.setThumbnail(thumbnail);

    await channel.send({
      content: content || "",
      embeds: [embed]
    });

    res.json({
      success: true
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "failed"
    });
  }
});

app.listen(3000, () => {
  console.log("Dashboard running on port 3000");
});
