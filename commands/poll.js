const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

module.exports = {
  name: "poll",
  aliases: ["vote", "voting"],
  description: "Create an interactive poll that never expires and works across bot restarts.",

  async execute(message, args, prefix, getGuildData, saveData) {
    const argsText = args.join(" ");

    const isMulti = argsText.includes("--multi") || argsText.includes("-m");

    let question = "";
    let options = [];

    const matches = [...argsText.matchAll(/"([^"]+)"/g)].map(m => m[1]);

    if (matches.length >= 3) {
      question = matches[0];
      options = matches.slice(1);
    } else {
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
          `Create a permanent interactive poll instantly!\n\n` +
          `**Super Easy (Comma Shorthand):**\n` +
          `\`${prefix}poll Favorite game? Pet Simulator 99, Roblox, Minecraft\`\n\n` +
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

    await message.delete().catch(() => {});

    const numberEmojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

    const pollId = Date.now().toString();
    const data = getGuildData(message.guild.id);
    if (!data.polls) data.polls = {};

    data.polls[pollId] = {
      question,
      options,
      votes: {},
      isMulti,
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

      rows;
      return rows;
    }

    await message.channel.send({
      embeds: [generatePollEmbed()],
      components: generateComponents()
    });
  }
};
