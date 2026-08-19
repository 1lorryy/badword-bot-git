const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "poll",
  aliases: ["vote", "voting"],
  description: "Create an instant, easy poll.",

  async execute(message, args, prefix, getGuildData, saveData) {
    const argsText = args.join(" ");

    const isMulti = argsText.includes("--multi") || argsText.includes("-m");
    const isAnon = argsText.includes("--anon") || argsText.includes("-a");

    let hours = 168;
    const timeMatch = argsText.match(/(?:--time|-t)\s+(\d+)/);
    if (timeMatch) hours = parseInt(timeMatch[1]);
    const durationMs = hours * 60 * 60 * 1000;
    const expiresAt = Date.now() + durationMs;

    let question = "";
    let rawOptions = [];

    const matches = [...argsText.matchAll(/"([^"]+)"/g)].map(m => m[1]);

    if (matches.length >= 3) {
      question = matches[0];
      rawOptions = matches.slice(1);
    } else {
      const qIndex = argsText.indexOf("?");
      if (qIndex !== -1) {
        let rawQ = argsText.substring(0, qIndex + 1).trim();
        rawQ = rawQ.replace(/(--multi|-m|--anon|-a|(--time|-t)\s+\d+)/g, "").trim();
        question = rawQ;

        let remainder = argsText.substring(qIndex + 1).trim();
        remainder = remainder.replace(/(--multi|-m|--anon|-a|(--time|-t)\s+\d+)/g, "").trim();
        
        if (remainder.includes(",")) {
          rawOptions = remainder.split(",").map(opt => opt.trim()).filter(opt => opt.length > 0);
        }
      }
    }

    if (!question || rawOptions.length < 2) {
      const usageEmbed = new EmbedBuilder()
        .setColor(0x2b2d31)
        .setTitle("📊 Quick Poll Help")
        .setDescription(
          `Make a poll instantly just by typing your question with a \`?\` and comma-separated options!\n\n` +
          `**Example:**\n` +
          `\`${prefix}poll Best game? Roblox, Minecraft, Fortnite\`\n\n` +
          `**Optional Flags:**\n` +
          `• \`--multi\` or \`-m\` — Pick multiple choices\n` +
          `• \`--anon\` or \`-a\` — Keep votes secret`
        );

      const reply = await message.reply({ embeds: [usageEmbed] });
      setTimeout(() => reply.delete().catch(() => {}), 15000);
      return;
    }

    if (rawOptions.length > 10) {
      return message.reply("❌ Maximum limit is 10 options.");
    }

    const options = [];
    const customEmojis = [];

    rawOptions.forEach(opt => {
      const splitMatch = opt.match(/^<?(a)?:?(\w{2,32}|[\u{1f300}-\u{1f5ff}\u{1f900}-\u{1f9ff}\u{1f600}-\u{1f64f}\u{1f680}-\u{1f6ff}\u{2600}-\u{26ff}\u{2700}-\u{27bf}])>?[:\s]+(.+)$/u);
      if (splitMatch) {
        customEmojis.push(splitMatch[2] || splitMatch[0].split(/[:\s]/)[0]);
        options.push(splitMatch[3]);
      } else {
        customEmojis.push(null);
        options.push(opt);
      }
    });

    const fallbackEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const pollId = Date.now().toString();
    const data = getGuildData(message.guild.id);
    if (!data.polls) data.polls = {};

    data.polls[pollId] = {
      question,
      options,
      customEmojis,
      votes: {},
      isMulti,
      isAnon,
      expiresAt,
      authorTag: message.author.tag,
      createdAt: Date.now()
    };
    saveData(message.guild.id, data);

    function generatePollEmbed() {
      const poll = data.polls[pollId];
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

      let description = `> ## 📌 ${poll.question}\n\n`;
      if (totalVotes === 0) {
        description += `*No votes yet. Tap a button below to vote!*\n\n`;
      } else {
        description += `────────────────────────\n\n`;
      }

      poll.options.forEach((opt, idx) => {
        const count = counts[idx];
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        
        const filledBlocks = Math.round((percentage / 100) * 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = "🟩".repeat(filledBlocks) + "⬛".repeat(emptyBlocks);

        const displayEmoji = poll.customEmojis[idx] || fallbackEmojis[idx];
        description += `${displayEmoji} **${opt}**\n`;
        description += `${progressBar} \`${count} vote${count === 1 ? "" : "s"} (${percentage}%)\`\n\n`;
      });

      const modeTab = poll.isMulti ? "🔀 Multiple Choice" : "📌 Single Choice";
      const privacyTab = poll.isAnon ? "🕵️ Anonymous" : "👁️ Public";

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setDescription(description)
        .addFields(
          { name: "🗳️ Mode", value: `\` ${modeTab} \``, inline: true },
          { name: "🔒 Privacy", value: `\` ${privacyTab} \``, inline: true },
          { name: "👥 Votes", value: `\` ${totalVotes} \``, inline: true }
        )
        .setFooter({ text: `Poll ID: ${pollId} • Ends` })
        .setTimestamp(poll.expiresAt);

      return embed;
    }

    function generateComponents(disabled = false) {
      const poll = data.polls[pollId];
      const rows = [];
      let currentRow = new ActionRowBuilder();

      poll.options.forEach((opt, idx) => {
        if (currentRow.components.length === 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }

        const label = opt.length > 20 ? opt.substring(0, 17) + "..." : opt;
        const button = new ButtonBuilder()
          .setCustomId(`poll_${pollId}_${idx}`)
          .setLabel(`${idx + 1}. ${label}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled);

        const assignedEmoji = poll.customEmojis[idx];
        if (assignedEmoji) {
          try {
            button.setEmoji(assignedEmoji);
          } catch (e) {}
        }

        currentRow.addComponents(button);
      });

      if (currentRow.components.length > 0) {
        rows.push(currentRow);
      }

      return rows;
    }

    const pollMessage = await message.reply({
      embeds: [generatePollEmbed()],
      components: generateComponents()
    });

    const collector = pollMessage.createMessageComponentCollector({
      time: durationMs
    });

    collector.on('collect', async interaction => {
      const customId = interaction.customId;
      if (!customId.startsWith(`poll_${pollId}_`)) return;

      const optionIndex = parseInt(customId.split("_")[2]);
      const userId = interaction.user.id;

      const guildData = getGuildData(message.guild.id);
      if (!guildData.polls || !guildData.polls[pollId]) {
        return interaction.reply({ content: "❌ This poll has expired.", ephemeral: true });
      }

      const poll = guildData.polls[pollId];
      if (!poll.votes[userId]) {
        poll.votes[userId] = [];
      }

      if (poll.isMulti) {
        const voteIdx = poll.votes[userId].indexOf(optionIndex);
        if (voteIdx > -1) {
          poll.votes[userId].splice(voteIdx, 1);
        } else {
          poll.votes[userId].push(optionIndex);
        }
      } else {
        if (poll.votes[userId].length === 1 && poll.votes[userId][0] === optionIndex) {
          poll.votes[userId] = [];
        } else {
          poll.votes[userId] = [optionIndex];
        }
      }

      saveData(message.guild.id, guildData);

      await interaction.update({
        embeds: [generatePollEmbed()],
        components: generateComponents(false)
      });
    });

    collector.on('end', () => {
      pollMessage.edit({ components: generateComponents(true) }).catch(() => {});
    });
  }
};
