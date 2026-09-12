const { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require("discord.js");
const fs = require("fs");
const path = require("path");

const STAFF_GUIDE_FILE = process.env.STAFF_GUIDE_FILE || path.join(__dirname, "..", "staff-guide-data.json");

const defaultGuideData = {
  title: "🛡️ Don Don Complete Command & Staff Operations Guide",
  color: "#5865F2",
  intro: "Complete manual for all moderation, security, utility, auto-responder, and fun systems.\n═══════════════════════════════════\n",
  categories: [
    {
      name: "🛡️ **Moderation & Punishments**",
      commands: [
        "• `?warn @user [reason]` — Issue an official warning",
        "• `?warnings [@user]` — Check warn history with dynamic timestamps & page jump",
        "• `?unwarn @user [warn_id]` — Remove a specific warning",
        "• `?clearwarns @user` — Clear all warnings for a user",
        "• `?mute @user [time] [reason]` — Timeout user (e.g. `5m`, `30m`, `12h`)",
        "• `?unmute @user` — Remove an active timeout",
        "• `?kick @user [reason]` — Kick user from server",
        "• `?ban @user [reason]` — Ban user & purge recent messages",
        "• `?softban @user [reason]` — Kick user & wipe 7 days of message history",
        "• `?unban [user_id]` — Unban user using their Discord ID",
        "• `?modstats [@staff]` — Check moderator action statistics",
        "• `?modlogs [@user]` — View recent moderation log entries"
      ]
    },
    {
      name: "🔒 **Security & Verification Controls**",
      commands: [
        "• `?verify settings` — Check current anti-raid security configuration",
        "• `?verify scan @user` — Scan an account's risk score and creation age",
        "• `?verify massscan` — Scan all unverified members in bulk",
        "• `?verify verifiedrole [role]` — Set the server's official verified role",
        "• `?verify unverifiedrole [role]` — Set the unverified quarantine role",
        "• `?verify trusteddays [days]` — Set minimum account creation age threshold",
        "• `?verify autoban [on/off]` — Toggle automatic ban on join for risky accounts",
        "• `?verify autokick [on/off]` — Toggle automatic kick on join"
      ]
    },
    {
      name: "⚙️ **Chat, Roles & Channel Management**",
      commands: [
        "• `?purge [1-100]` — Bulk delete recent messages",
        "• `?purge @user [1-100]` — Delete messages from a specific user",
        "• `?purge bots [1-100]` — Clean up bot messages",
        "• `?purge links [1-100]` — Delete messages containing links",
        "• `?role @user [role]` — Add or remove a role from a user (No Pings)",
        "• `?temprole @user [time] [role]` — Give temporary role (Auto-removes across restarts)",
        "• `?rolecreate [role_name] [color_hex]` — Create a new server role",
        "• `?roleicon @role <image/URL/emoji>` — Set or update a role's icon",
        "• `?rename <new-name>` — Rename ticket channels",
        "• `?setnick @user [new_nickname]` — Change a user's server nickname",
        "• `?slowmode [#channel] [time]` — Set channel slowmode (e.g. `5s` or `off`)"
      ]
    },
    {
      name: "🤖 **Autoresponders & Blacklist Automation**",
      commands: [
        "• `?ar add [trigger] [response] + [image]` — Create custom text, emoji, or GIF auto-response",
        "• `?ar remove [trigger]` — Delete an active auto-response trigger",
        "• `?ar list` — View all active server auto-responses",
        "• `?bl [word]` — Add a word to auto-blacklist",
        "• `?unbl [word]` — Remove a word from blacklist",
        "• `?words` — View all blacklisted words"
      ]
    },
    {
      name: "🛠️ **Utilities & General Tools**",
      commands: [
        "• `?help` — Open interactive button command center",
        "• `?afk [reason]` / `?afk global` — Set AFK status (Survives redeploys)",
        "• `?translate [lang] [text]` — Translate message content",
        "• `?timer [time] [label]` — Set a countdown timer",
        "• `?birthday` / `?bday` — Set your birthday (`#commands` only)",
        "• `?snipe` / `?snipes` — View recently deleted messages",
        "• `?joininfo [@user]` — View join placement, milestone tier, and timezone",
        "• `?tz [zone]` — Set or view personal timezone (e.g. `EST`, `UTC+2`)"
      ]
    },
    {
      name: "🎮 **Fun, Social & Games**",
      commands: [
        "• `?marry @user [ring]` — Propose to a member with custom rings from inventory",
        "• `?divorce [@user]` — End a marriage (30-day cooldown applies)",
        "• `?marriages` — View server marriage records",
        "• `?ship @user1 [@user2]` — Calculate love match compatibility",
        "• `?adopt @user` — Adopt a child into your family tree",
        "• `?disown @user` — Disown a family child",
        "• `?family [@user]` — View full interactive family tree",
        "• `?8ball [question]` — Ask the magic 8-ball",
        "• `?coinflip` — Flip a coin (Heads or Tails)",
        "• `?roll [max]` — Roll a random number (1-100)",
        "• `?rps [rock/paper/scissors]` — Play Rock Paper Scissors",
        "• `?auction` / `?bid` — Server auction & bidding engine",
        "• `?ai [prompt]` — Chat with the OpenAI bot engine",
        "• `?customcolor` / `?color` — Open interactive custom hex color studio",
        "• `?staffguide` — Show this command manual",
        "• `?staffguidedit <message_id> [new_text]` — Edit guide content"
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
  description: "Displays complete server guidelines and command manual edited from the dashboard",
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

      let embeds = [];
      let components = [];

      if (guideData.categories && Array.isArray(guideData.categories)) {
        guideData.categories.forEach((category, index) => {
          let categoryDesc = "";
          if (index === 0 && guideData.intro) {
            categoryDesc += guideData.intro + "\n";
          }
          categoryDesc += `${category.name}\n` + category.commands.join("\n");

          const embed = new EmbedBuilder()
            .setColor(parsedColor)
            .setTitle(index === 0 ? (guideData.title || "🛡️ Don Don Guide") : `${guideData.title || "🛡️ Don Don Guide"} (${category.name.replace(/[*_]/g, "").trim()})`)
            .setDescription(categoryDesc)
            .setFooter({ text: `Don Don Staff Operations • Category ${index + 1} of ${guideData.categories.length}` })
            .setTimestamp();

          embeds.push(embed);

          // Add an "Edit Category" button directly beneath its respective embed card!
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`edit_guide_${index}`)
              .setLabel(`✏️ Edit Category ${index + 1}`)
              .setStyle(ButtonStyle.Primary)
          );
          components.push(row);
        });
      }

      // Send each category embed with its own edit button row
      for (let i = 0; i < embeds.length; i++) {
        await message.channel.send({ embeds: [embeds[i]], components: [components[i]] });
      }

    } catch (error) {
      console.error("Error executing staffguide command:", error);
      return message.channel.send(`❌ **An error occurred:** \`${error.message}\``);
    }
  },

  // Handle interaction events for buttons and modals
  async handleInteraction(interaction) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return;

    // Check if it's an edit button click
    if (interaction.isButton() && interaction.customId.startsWith("edit_guide_")) {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({ content: "❌ Administrator permission required.", ephemeral: true });
      }

      const index = parseInt(interaction.customId.split("_")[2]);
      const guideData = loadStaffGuide();
      const category = guideData.categories[index];

      if (!category) {
        return interaction.reply({ content: "❌ Category not found.", ephemeral: true });
      }

      // Create a pop-up form (Modal) with two distinct boards/fields: 
      // Field 1: Category Name (the title board)
      // Field 2: Command List (the explanation/content board)
      const modal = new ModalBuilder()
        .setCustomId(`modal_edit_guide_${index}`)
        .setTitle(`Editing: Category ${index + 1}`);

      const nameInput = new TextInputBuilder()
        .setCustomId("category_name")
        .setLabel("Category Title / Header")
        .setStyle(TextInputStyle.Short)
        .setValue(category.name)
        .setRequired(true);

      const commandsInput = new TextInputBuilder()
        .setCustomId("category_commands")
        .setLabel("Commands / Explanation List (One per line)")
        .setStyle(TextInputStyle.Paragraph)
        .setValue(category.commands.join("\n"))
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(commandsInput)
      );

      await interaction.showModal(modal);
    }

    // Handle when they click Save/Submit on the form popup
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal_edit_guide_")) {
      const index = parseInt(interaction.customId.split("_")[3]);
      const newName = interaction.fields.getTextInputValue("category_name");
      const newCommandsRaw = interaction.fields.getTextInputValue("category_commands");

      const guideData = loadStaffGuide();
      if (guideData.categories[index]) {
        guideData.categories[index].name = newName;
        // Split text block back into an array by lines, filtering out empty lines
        guideData.categories.updateCommands = true; 
        guideData.categories[index].commands = newCommandsRaw.split("\n").filter(c => c.trim().length > 0);
        
        saveStaffGuide(guideData);

        await interaction.reply({ 
          content: `✅ **Successfully updated Category ${index + 1}!** Re-run \`?staffguide\` to refresh the manual.`, 
          ephemeral: true 
        });
      } else {
        await interaction.reply({ content: "❌ Error: Category index mismatch.", ephemeral: true });
      }
    }
  }
};
