const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "poll",
  aliases: ["vote", "voting"],
  description: "Create an interactive poll with single or multiple choice voting, live progress bars, and numbered options.",

  async execute(message, args, prefix, getGuildData, saveData) {
    const argsText = args.join(" ");

    // Check for multi-choice flag
    const isMulti = argsText.includes("--multi") || argsText.includes("-m");

    let question = "";
    let options = [];

    // 1. Try extracting quoted strings first (Classic Style)
    const matches = [...argsText.matchAll(/"([^"]+)"/g)].map(m => m[1]);

    if (matches.length >= 3) {
      question = matches[0];
      options = matches.slice(1);
    } else {
      // 2. Fallback to Super Easy Comma Style: ?poll Question? Option 1, Option 2, Option 3
      const qIndex = argsText.indexOf("?");
      if (qIndex !== -1) {
        let rawQ = argsText.substring(0, qIndex + 1).trim();
        question = rawQ.replace(/(--multi|-m)/g, "").trim();

        let remainder = argsText.substring(qIndex + 1).trim();
        remainder = remainder.replace(/(--multi|-m)/g, "").trim();

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
          `Create a gorgeous interactive poll instantly!\n\n` +
          `**Super Easy (Comma Shorthand):**\n` +
          `\`${prefix}poll Favorite game? Fortnite, Roblox, Minecraft\`\n\n` +
          `**Classic Quotes Style:**\n` +
          `\`${prefix}poll "Question?" "Option 1" "Option 2" [--multi]\`\n\n` +
          `**Optional Flag:** \`--multi\` or \`-m\` for multiple choice`
        )
        .setFooter({ text: "Tip: Just use a question mark after your question and commas for options!" });

      const reply = await message.reply({ embeds: [usageEmbed] });
      setTimeout(() => reply.delete().catch(() => {}), 15000);
      return;
    }

    if (options.length > 10) {
      return message.reply("❌ You can add a maximum of 10 options for a poll.");
    }

    // Number emojis for options
    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    // Initialize poll data structure
    const pollId = Date.now().toString();
    const data = getGuildData(message.guild.id);
    if (!data.polls) data.polls = {};

    data.polls[pollId] = {
      question,
      options,
      votes: {}, // userId: [array of option indices]
      isMulti,
      authorTag: message.author.tag,
      createdAt: Date.now()
    };
    saveData(message.guild.id, data);

    // Helper function to generate progress bar & embed
    function generatePollEmbed() {
      const poll = data.polls[pollId];
      const totalVotes = Object.keys(poll.votes).length;

      // Count votes per option
      const counts = new Array(poll.options.length).fill(0);
      for (const userId in poll.votes) {
        const userVotes = poll.votes[userId];
        if (Array.isArray(userVotes)) {
          userVotes.forEach(idx => {
            if (counts[idx] !== undefined) counts[idx]++;
          });
        }
      }

      let description = `**Question:** ${poll.question}\n\n`;
      if (totalVotes === 0) {
        description += `*No votes cast yet. Be the first to vote below!*\n\n`;
      }

      poll.options.forEach((opt, idx) => {
        const count = counts[idx];
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        
        // Generate visual progress bar (10 blocks)
        const filledBlocks = Math.round((percentage / 100) * 10);
        const emptyBlocks = 10 - filledBlocks;
        const progressBar = "🟩".repeat(filledBlocks) + "⬛".repeat(emptyBlocks);

        description += `${numberEmojis[idx]} **${opt}**\n`;
        description += `${progressBar} \`${count} vote${count === 1 ? "" : "s"} (${percentage}%)\`\n\n`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 Interactive Poll`)
        .setDescription(description)
        .addFields(
          { name: "📋 Vote Type", value: poll.isMulti ? "🔀 Multiple Choice" : "📌 Single Choice", inline: true },
          { name: "👥 Total Voters", value: `${totalVotes}`, inline: true }
        )
        .setFooter({ text: `Poll ID: ${pollId} • Created by ${poll.authorTag}` })
        .setTimestamp();

      return embed;
    }

    // Generate action rows (max 5 buttons per row)
    function generateComponents() {
      const poll = data.polls[pollId];
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
        );
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

    // Create a component collector for voting (active for 7 days)
    const collector = pollMessage.createMessageComponentCollector({
      time: 7 * 24 * 60 * 60 * 1000 
    });

    collector.on('collect', async interaction => {
      const customId = interaction.customId;
      if (!customId.startsWith(`poll_${pollId}_`)) return;

      const optionIndex = parseInt(customId.split("_")[2]);
      const userId = interaction.user.id;

      const guildData = getGuildData(message.guild.id);
      if (!guildData.polls || !guildData.polls[pollId]) {
        return interaction.reply({ content: "❌ This poll no longer exists.", ephemeral: true });
      }

      const poll = guildData.polls[pollId];
      if (!poll.votes[userId]) {
        poll.votes[userId] = [];
      }

      if (poll.isMulti) {
        // Toggle vote for this option in multi-choice mode
        const voteIdx = poll.votes[userId].indexOf(optionIndex);
        if (voteIdx > -1) {
          poll.votes[userId].splice(voteIdx, 1);
        } else {
          poll.votes[userId].push(optionIndex);
        }
      } else {
        // Single choice mode: switch or toggle off
        if (poll.votes[userId].length === 1 && poll.votes[userId][0] === optionIndex) {
          poll.votes[userId] = [];
        } else {
          poll.votes[userId] = [optionIndex];
        }
      }

      saveData(message.guild.id, guildData);

      await interaction.update({
        embeds: [generatePollEmbed()],
        components: generateComponents()
      });
    });

    collector.on('end', () => {
      const disabledRows = generateComponents().map(row => {
        row.components.forEach(button => button.setDisabled(true));
        return row;
      });
      pollMessage.edit({ components: disabledRows }).catch(() => {});
    });
  }
};
