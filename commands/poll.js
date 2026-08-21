  const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "poll",
  aliases: ["vote", "voting"],
  description: "Create an interactive poll with custom expiration that works across bot restarts.",

  async execute(message, args, prefix, getGuildData, saveData) {
    const argsText = args.join(" ");

    const isMulti = argsText.includes("--multi") || argsText.includes("-m");

    // Parse time flag e.g. --time 12h, --time 2d, --time 30m (Default: 24h)
    let durationMs = 24 * 60 * 60 * 1000; 
    const timeMatch = argsText.match(/--(?:time|t)\s+(\d+)([hdm])/i);
    if (timeMatch) {
      const value = parseInt(timeMatch[1]);
      const unit = timeMatch[2].toLowerCase();
      if (unit === 'm') durationMs = value * 60 * 1000;
      else if (unit === 'h') durationMs = value * 60 * 60 * 1000;
      else if (unit === 'd') durationMs = value * 24 * 60 * 60 * 1000;
    }

    // Clean text for parsing question and options
    const cleanedArgs = argsText
      .replace(/(--multi|-m)/g, "")
      .replace(/--(?:time|t)\s+\d+[hdm]/gi, "")
      .trim();

    let question = "";
    let options = [];

    const matches = [...cleanedArgs.matchAll(/"([^"]+)"/g)].map(m => m[1]);

    if (matches.length >= 3) {
      question = matches[0];
      options = matches.slice(1);
    } else {
      const qIndex = cleanedArgs.indexOf("?");
      if (qIndex !== -1) {
        let rawQ = cleanedArgs.substring(0, qIndex + 1).trim();
        question = rawQ;

        let remainder = cleanedArgs.substring(qIndex + 1).trim();
        if (remainder.includes(",")) {
          options = remainder.split(",").map(opt => opt.trim()).filter(opt => opt.length > 0);
        }
      }
    }

    if (!question || options.length < 2) {
      const usageEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📊 Poll Command Usage")
        .setDescription(
          `Create a permanent interactive poll with a timer!\n\n` +
          `**Shorthand with Time:**\n` +
          `\`${prefix}poll Favorite game? Valorant, Roblox, Minecraft --time 12h\`\n\n` +
          `**Quotes Style:**\n` +
          `\`${prefix}poll "Question?" "Opt 1" "Opt 2" --multi --time 2d\`\n\n` +
          `**Flags:** \`--multi\` / \`-m\` (multiple choice) | \`--time\` or \`-t\` ([number]h/d/m)`
        )
        .setFooter({ text: "Tip: Time units are h (hours), d (days), m (minutes). Default is 24h." });

      const reply = await message.reply({ embeds: [usageEmbed] });
      setTimeout(() => reply.delete().catch(() => {}), 20000);
      return;
    }

    if (options.length > 10) {
      return message.reply("❌ You can add a maximum of 10 options for a poll.");
    }

    await message.delete().catch(() => {});

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    const pollId = Date.now().toString();
    const data = getGuildData(message.guild.id);
    if (!data.polls) data.polls = {};

    const now = Date.now();
    data.polls[pollId] = {
      question,
      options,
      votes: {},
      isMulti,
      authorTag: message.author.tag,
      createdAt: now,
      expiresAt: now + durationMs
    };
    saveData(message.guild.id, data);

    const poll = data.polls[pollId];

    function generatePollEmbed() {
      const totalVotes = Object.keys(poll.votes).length;
      const counts = new Array(poll.options.length).fill(0);
      
      for (const userId in poll.votes) {
        const userVotes = poll.votes[userId];
        if (Array.isArray(userVotes)) {
          userVotes.forEach(idx => {
            if (counts[idx] !== undefined) counts[idx]++;
          });
        }
      }

      const isExpired = Date.now() > poll.expiresAt;

      let description = `**Question:** ${poll.question}\n\n`;
      if (totalVotes === 0) {
        description += `*No votes cast yet. Be the first to vote below!*\n\n`;
      }

      poll.options.forEach((opt, idx) => {
        const count = counts[idx];
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        
        const filledBlocks = Math.round((percentage / 100) * 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = "🟩".repeat(filledBlocks) + "⬛".repeat(emptyBlocks);

        description += `${numberEmojis[idx]} **${opt}**\n`;
        description += `${progressBar} \`${count} vote${count === 1 ? "" : "s"} (${percentage}%)\`\n\n`;
      });

      if (isExpired) {
        description += `🔒 **This poll has ended.**`;
      } else {
        const unixTimestamp = Math.floor(poll.expiresAt / 1000);
        description += `⏳ **Expires:** <t:${unixTimestamp}:R>`;
      }

      return new EmbedBuilder()
        .setColor(isExpired ? 0xED4245 : 0x5865F2)
        .setTitle(`📊 Interactive Poll ${isExpired ? "(Closed)" : ""}`)
        .setDescription(description)
        .addFields(
          { name: "📋 Vote Type", value: poll.isMulti ? "🔀 Multiple Choice" : "📌 Single Choice", inline: true },
          { name: "👥 Total Voters", value: `${totalVotes}`, inline: true }
        )
        .setFooter({ text: `Poll ID: ${pollId} • Created by ${poll.authorTag}` })
        .setTimestamp();
    }

    function generateComponents() {
      const isExpired = Date.now() > poll.expiresAt;
      const rows = [];
      let currentRow = new ActionRowBuilder();

      poll.options.forEach((opt, idx) => {
        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        const label = opt.length > 25 ? opt.substring(0, 22) + "..." : opt;

        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`poll_${pollId}_${idx}`)
            .setLabel(`${idx + 1}. ${label}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(isExpired)
        );
      });

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      return rows;
    }

    await message.channel.send({
      embeds: [generatePollEmbed()],
      components: generateComponents()
    });
  }
};
