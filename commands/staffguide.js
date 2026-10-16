const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const STAFF_GUIDE_FILE = process.env.STAFF_GUIDE_FILE || path.join(__dirname, "..", "staff-guide-data.json");

const defaultGuideData = {
  title: "🛡️ DonQuixote's Lounge • Giveaway & Operations Master Rules",
  color: "#5865F2",
  image: "https://media.discordapp.net/attachments/1453806812515008533/1491100480313622659/standard_1.gif?ex=6ad2ee49&is=6ad19cc9&hm=a47824643fca3c1ad179ebabf7b2a83eead9cb5dbe61d0330c5331a2d9866e6c&animated=true",
  intro: "★ **always** read the rules before joining giveaways\n★ **failing** to follow the requirements will get <@&1481370041260966067> and punishments\n═══════════════════════════════════",
  categories: [
    {
      name: "🚨 Giveaway ban RULES",
      commands: [
        "↳ ‼️ **spamming/message farming/didn't do requirement**",
        "🔒 Will receive a <@&1481370041260966067> for **2 days**",
        "• Typing more than 3 short messages such as \"hi\", \"hello\", \"hru\" and more will lead to a <@&1481370041260966067> and future punishments"
      ]
    },
    {
      name: "🎉 Quick Drops RULES",
      commands: [
        "↳ ‼️ Quick Drops will be rerolled **4 times** and if not claimed, it will be **voided**",
        "• You must claim it on time, hoster has the **last decision** whether it was claimed or not.",
        "• You have to send the gamepass in **24 hours**.",
        "⚠️ **BOOSTER CLAIMTIMES DO NOT AFFECT QUICKDROPS**"
      ]
    },
    {
      name: "⏳ Extra Claimtimes & Multipliers",
      commands: [
        "• <@&1482787743527604305> get **2x claimtime**",
        "• <@&1481370041382604874> get **3x claimtime**",
        "• Quick Drops claimtime ranges from **30 seconds to 5 minutes**",
        "• **Standard giveaways** will be **30 mins ct**. Special giveaways will be whatever the gw hoster suggests."
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
        data.image = defaultGuideData.image;
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
  description: "Displays complete server giveaway guidelines and manual",
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
        .setTitle(guideData.title || "🛡️ DonQuixote's Lounge • Giveaway & Operations Master Rules")
        .setDescription(guideData.intro || "")
        .setFooter({ text: "DonQuixote's Lounge • Giveaway Guidelines & Operations" })
        .setTimestamp();

      if (guideData.image) {
        embed.setImage(guideData.image);
      }

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
        content: `📂 **Category [${index + 1}]: ${category.name}**\n\n**Guidelines contained here:**\n${commandListText}\n\n*(Tip: You can edit the \`staff-guide-data.json\` file directly in your project folder anytime to change guidelines instantly without button timeouts!)*` 
      });
    }
  }
};
