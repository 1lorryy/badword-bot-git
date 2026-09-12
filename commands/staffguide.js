const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const STAFF_GUIDE_FILE = process.env.STAFF_GUIDE_FILE || path.join(__dirname, "..", "staff-guide-data.json");

const defaultGuideData = {
  title: "🛡️ Don Don Complete Command & Staff Operations Guide",
  color: "#5865F2",
  intro: "Complete manual for all moderation, security, utility, auto-responder, and fun systems.\n═══════════════════════════════════",
  categories: [
    {
      name: "🛡️ Moderation & Punishments",
      commands: [
        "• `?warn @user [reason]` — Issue official warning",
        "• `?warnings [@user]` — Check warn history",
        "• `?unwarn @user [id]` — Remove specific warning",
        "• `?clearwarns @user` — Clear all warnings",
        "• `?mute @user [time] [reason]` — Timeout user",
        "• `?unmute @user` — Remove active timeout",
        "• `?kick @user [reason]` — Kick user from server",
        "• `?ban @user [reason]` — Ban user & purge messages",
        "• `?softban @user [reason]` — Kick & wipe 7 days",
        "• `?unban [user_id]` — Unban using Discord ID",
        "• `?modstats [@staff]` — Check action statistics",
        "• `?modlogs [@user]` — View recent mod logs"
      ]
    },
    {
      name: "🔒 Security & Verification Controls",
      commands: [
        "• `?verify settings` — Check anti-raid config",
        "• `?verify scan @user` — Scan risk score & age",
        "• `?verify massscan` — Scan unverified bulk",
        "• `?verify verifiedrole [role]` — Set verified role",
        "• `?verify unverifiedrole [role]` — Set quarantine role",
        "• `?verify trusteddays [days]` — Set min account age",
        "• `?verify autoban [on/off]` — Toggle auto-ban",
        "• `?verify autokick [on/off]` — Toggle auto-kick"
      ]
    },
    {
      name: "⚙️ Chat, Roles & Channel Management",
      commands: [
        "• `?purge [1-100]` — Bulk delete messages",
        "• `?purge @user [1-100]` — Delete user messages",
        "• `?purge bots [1-100]` — Clean bot messages",
        "• `?role @user [role]` — Add/remove role safely",
        "• `?temprole @user [time] [role]` — Temporary role",
        "• `?rolecreate [name] [color]` — Create new role",
        "• `?roleicon @role [icon]` — Set/update role icon",
        "• `?rename [name]` — Rename ticket channels",
        "• `?setnick @user [nick]` — Change nickname",
        "• `?slowmode [#channel] [time]` — Set slowmode"
      ]
    },
    {
      name: "🤖 Autoresponders & Blacklists",
      commands: [
        "• `?ar add [trigger] [response]` — Create response",
        "• `?ar remove [trigger]` — Delete response",
        "• `?ar list` — View all auto-responses",
        "• `?bl [word]` — Add word to blacklist",
        "• `?unbl [word]` — Remove word from blacklist",
        "• `?words` — View blacklisted words"
      ]
    },
    {
      name: "🛠️ Utilities & General Tools",
      commands: [
        "• `?help` — Interactive command center",
        "• `?afk [reason]` — Set AFK status",
        "• `?translate [lang] [text]` — Translate message",
        "• `?timer [time] [label]` — Set countdown timer",
        "• `?birthday` — Set your birthday",
        "• `?snipe` — View deleted messages",
        "• `?joininfo [@user]` — View join placement",
        "• `?tz [zone]` — Set personal timezone",
        "• `?status` — Check system performance"
      ]
    },
    {
      name: "🎮 Fun, Social & Games",
      commands: [
        "• `?marry @user [ring]` — Propose to member",
        "• `?divorce [@user]` — End a marriage",
        "• `?marriages` — View server marriages",
        "• `?ship @user1 [@user2]` — Love match test",
        "• `?adopt @user` / `?disown` — Family system",
        "• `?family [@user]` — Interactive family tree",
        "• `?8ball` / `?coinflip` / `?roll` — Minigames",
        "• `?rps` / `?auction` — Play games & bid",
        "• `?ai [prompt]` — Chat with OpenAI engine",
        "• `?customcolor` — Open hex color studio"
      ]
    }
  ]
};

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) return true;
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function loadStaffGuide() {
  try {
    ensureDirectoryExistence(STAFF_GUIDE_FILE);
    if (fs.existsSync(STAFF_GUIDE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STAFF_GUIDE_FILE, "utf8"));
      if (!data.categories) {
        data.categories = defaultGuideData.categories;
        data.intro = defaultGuideData.intro;
        fs.writeFileSync(STAFF_GUIDE_FILE, JSON.stringify(data, null, 2));
      }
      return data;
    } else {
      fs.writeFileSync(STAFF_GUIDE_FILE, JSON.stringify(defaultGuideData, null, 2));
      return defaultGuideData;
    }
  } catch (err) {
    ensureDirectoryExistence(STAFF_GUIDE_FILE);
    fs.writeFileSync(STAFF_GUIDE_FILE, JSON.stringify(defaultGuideData, null, 2));
    return defaultGuideData;
  }
}

function saveStaffGuide(data) {
  ensureDirectoryExistence(STAFF_GUIDE_FILE);
  fs.writeFileSync(STAFF_GUIDE_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "staffguide",
  description: "Displays complete server guidelines and command manual",
  async execute(message, args) {
    try {
      await message.delete().catch(() => null);

      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.channel.send("❌ **Access Denied:** Administrator permission required.")
          .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
      }

      const guideData = loadStaffGuide();
      const hexColor = parseInt((guideData.color || "#5865F2").replace("#", ""), 16);
      const parsedColor = isNaN(hexColor) ? 0x5865f2 : hexColor;

      const embed = new EmbedBuilder()
        .setColor(parsedColor)
        .setTitle(guideData.title || "🛡️ Don Don Complete Command & Staff Operations Guide")
        .setDescription(guideData.intro || "")
        .setFooter({ text: "Don Don Staff Operations • Complete Command Manual" })
        .setTimestamp();

      if (guideData.categories && Array.isArray(guideData.categories)) {
        guideData.categories.forEach((category) => {
          embed.addFields({
            name: category.name,
            value: category.commands.join("\n"),
            inline: false
          });
        });
      }

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("reset_guide_default")
          .setLabel("🔄 Reset to Default")
          .setStyle(ButtonStyle.Secondary)
      );

      const options = guideData.categories.map((cat, idx) => ({
        label: cat.name.replace(/[*_]/g, "").substring(0, 25),
        description: `View category info & instructions`,
        value: `info_cat_${idx}`
      }));

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_category_info")
        .setPlaceholder("📂 Select a category to inspect...")
        .addOptions(options.slice(0, 25));

      const row2 = new ActionRowBuilder().addComponents(selectMenu);

      return message.channel.send({ embeds: [embed], components: [row1, row2] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  },

  async handleInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: "❌ Administrator permission required.", ephemeral: true });
    }

    // ⚡ INSTANT ACKNOWLEDGEMENT TO PREVENT TIMEOUT ERROR
    await interaction.deferReply({ ephemeral: true });

    if (interaction.isButton() && interaction.customId === "reset_guide_default") {
      saveStaffGuide(defaultGuideData);
      return interaction.editReply({ content: "✅ **Guide reset back to original default settings!** Re-run `?staffguide`." });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === "select_category_info") {
      const selectedValue = interaction.values[0];
      const index = parseInt(selectedValue.split("_")[2]);
      const guideData = loadStaffGuide();
      const category = guideData.categories[index];

      if (!category) {
        return interaction.editReply({ content: "❌ Category not found." });
      }

      const commandListText = category.commands.join("\n");
      return interaction.editReply({ 
        content: `📂 **Category [${index + 1}]: ${category.name}**\n\n**Commands contained here:**\n${commandListText}\n\n*(Tip: You can edit the \`staff-guide-data.json\` file directly in your project folder anytime to add or change commands instantly without button timeouts!)*` 
      });
    }
  }
};
