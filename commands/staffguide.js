const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
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

      // Load all categories safely into single message fields
      if (guideData.categories && Array.isArray(guideData.categories)) {
        guideData.categories.forEach((category) => {
          embed.addFields({
            name: category.name,
            value: category.commands.join("\n"),
            inline: false
          });
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("edit_main_guide")
          .setLabel("✏️ Edit Guide Title/Intro")
          .setStyle(ButtonStyle.Primary)
      );

      return message.channel.send({ embeds: [embed], components: [row] });

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  },

  async handleInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    if (interaction.isButton() && interaction.customId === "edit_main_guide") {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ Administrator permission required.", ephemeral: true });
      }

      const guideData = loadStaffGuide();
      
      const modal = new ModalBuilder()
        .setCustomId("modal_edit_main_guide")
        .setTitle("Edit Guide Header");

      const titleInput = new TextInputBuilder()
        .setCustomId("guide_title")
        .setLabel("Main Guide Title")
        .setStyle(TextInputStyle.Short)
        .setValue(guideData.title || "")
        .setRequired(true);

      const introInput = new TextInputBuilder()
        .setCustomId("guide_intro")
        .setLabel("Introductory Description Text")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(guideData.intro || "")
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(titleInput),
        new ActionRowBuilder().addComponents(introInput)
      );

      await interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "modal_edit_main_guide") {
      const newTitle = interaction.fields.getTextInputValue("guide_title");
      const newIntro = interaction.fields.getTextInputValue("guide_intro");

      const guideData = loadStaffGuide();
      guideData.title = newTitle;
      guideData.intro = newIntro;
      saveStaffGuide(guideData);

      await interaction.reply({ 
        content: `✅ **Guide updated successfully!** Re-run \`?staffguide\` to refresh the embed.`, 
        ephemeral: true 
      });
    }
  }
};
