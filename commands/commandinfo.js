const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");

module.exports = {
  name: "commandinfo",
  description: "Displays the interactive Command & Staff Operations Guide",
  async execute(message, args, prefix, getGuildData, saveData) {
    try {
      await message.delete().catch(() => null);

      const data = getGuildData(message.guild.id);
      const currentPrefix = prefix || data.prefix || "?";
      
      if (!data.guideCommands) {
        data.guideCommands = { mod: [], security: [], utility: [], auto: [], fun: [] };
      }

      // Format custom added commands into exact screenshot style automatically
      const formatCustoms = (cat) => {
        const list = data.guideCommands[cat];
        if (!list || !Array.isArray(list) || list.length === 0) return "";
        return "\n" + list.map(c => `• \`${currentPrefix}${c.cmd}\` — ${c.desc}`).join("\n");
      };

      // ================= EMBEDS =================
      const mainEmbed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🛡️ Don Don Complete Command & Staff Operations Guide")
        .setDescription(
          "Complete manual for all moderation, security, utility, auto-responder, and fun systems.\n\n" +
          "👇 **Select a category from the dropdown menu below** to inspect specific commands."
        )
        .addFields(
          { name: "🛡️ Moderation & Punishments", value: "Warnings, mutes, kicks, bans, softbans, and staff logs.", inline: true },
          { name: "🔒 Security & Verification", value: "Anti-raid, account scanning, trust rules, and auto-actions.", inline: true },
          { name: "⚙️ Chat, Roles & Tools", value: "Purging, temporary roles, nicking, channel tools, and slowmode.", inline: true },
          { name: "🤖 Autoresponders & Blacklists", value: "Custom word filters, auto-replies, and blacklists.", inline: true },
          { name: "🎮 Fun, Family & Mini-Games", value: "Marriage, adoption, pet crates, trading, leaderboards, and AI.", inline: true }
        )
        .setFooter({ text: "Don Don Staff Operations • Complete Command Manual" })
        .setTimestamp();

      const getModEmbed = () => new EmbedBuilder()
        .setColor(0xed4245)
        .setTitle("🛡️ Moderation & Punishments")
        .setDescription(
          `• \`${currentPrefix}warn @user [reason]\` — Issue official warning\n` +
          `• \`${currentPrefix}warnings [@user]\` — Check warn history & edit cases\n` +
          `• \`${currentPrefix}unwarn @user [id]\` — Clear specific warning by ID\n` +
          `• \`${currentPrefix}clearwarns @user\` — Clear all warnings\n` +
          `• \`${currentPrefix}mute @user [time] [reason]\` — Timeout user\n` +
          `• \`${currentPrefix}unmute @user\` — Remove active timeout\n` +
          `• \`${currentPrefix}kick @user [reason]\` — Kick member from server\n` +
          `• \`${currentPrefix}ban @user [reason]\` — Ban member & purge messages\n` +
          `• \`${currentPrefix}softban @user [reason]\` — Kick & wipe 7 days\n` +
          `• \`${currentPrefix}unban [user_id]\` — Unban using Discord ID\n` +
          `• \`${currentPrefix}modstats [@staff]\` — Check staff action statistics\n` +
          `• \`${currentPrefix}modlogs [@user]\` — View recent moderation logs` +
          formatCustoms("mod")
        )
        .setFooter({ text: "Moderation Category" })
        .setTimestamp();

      const getSecurityEmbed = () => new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle("🔒 Security & Verification Controls")
        .setDescription(
          `• \`${currentPrefix}verify settings\` — Check anti-raid config\n` +
          `• \`${currentPrefix}verify scan @user\` — Scan account risk score & age\n` +
          `• \`${currentPrefix}verify massscan\` — Bulk scan unverified members\n` +
          `• \`${currentPrefix}verify verifiedrole [role]\` — Set verified role\n` +
          `• \`${currentPrefix}verify unverifiedrole [role]\` — Set quarantine role\n` +
          `• \`${currentPrefix}verify trusteddays [days]\` — Set minimum account age\n` +
          `• \`${currentPrefix}verify autoban [on/off]\` — Toggle auto-ban on join\n` +
          `• \`${currentPrefix}verify autokick [on/off]\` — Toggle auto-kick on join` +
          formatCustoms("security")
        )
        .setFooter({ text: "Security Category" })
        .setTimestamp();

      const getUtilEmbed = () => new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("⚙️ Chat, Roles & Channel Management")
        .setDescription(
          `• \`${currentPrefix}purge [1-100]\` — Bulk delete messages\n` +
          `• \`${currentPrefix}purge @user [1-100]\` — Delete user messages\n` +
          `• \`${currentPrefix}purge bots [1-100]\` — Clean bot messages\n` +
          `• \`${currentPrefix}role @user [role]\` — Add/remove role safely\n` +
          `• \`${currentPrefix}temprole @user [time] [role]\` — Temporary role\n` +
          `• \`${currentPrefix}rolecreate [name] [color]\` — Create new role\n` +
          `• \`${currentPrefix}roleicon @role [icon]\` — Set/update role icon\n` +
          `• \`${currentPrefix}rename [name]\` — Rename ticket channels\n` +
          `• \`${currentPrefix}setnick @user [nick]\` — Change nickname\n` +
          `• \`${currentPrefix}slowmode [#channel] [time]\` — Set slowmode\n` +
          `• \`${currentPrefix}afk [reason]\` — Set AFK status\n` +
          `• \`${currentPrefix}translate [lang] [text]\` — Translate message\n` +
          `• \`${currentPrefix}timer [time] [label]\` — Set countdown timer\n` +
          `• \`${currentPrefix}birthday\` — Set your birthday\n` +
          `• \`${currentPrefix}snipe\` / \`${currentPrefix}snipes\` — View deleted messages\n` +
          `• \`${currentPrefix}joininfo [@user]\` — View join placement\n` +
          `• \`${currentPrefix}tz [zone]\` — Set personal timezone\n` +
          `• \`${currentPrefix}status\` — Check system performance` +
          formatCustoms("utility")
        )
        .setFooter({ text: "Utility Category" })
        .setTimestamp();

      const getAutoEmbed = () => new EmbedBuilder()
        .setColor(0xeb459e)
        .setTitle("🤖 Autoresponders & Blacklists")
        .setDescription(
          `• \`${currentPrefix}ar add [trigger] [response]\` — Create response\n` +
          `• \`${currentPrefix}ar remove [trigger]\` — Delete response\n` +
          `• \`${currentPrefix}ar list\` — View all auto-responses\n` +
          `• \`${currentPrefix}bl [word]\` — Add word to blacklist\n` +
          `• \`${currentPrefix}unbl [word]\` — Remove word from blacklist\n` +
          `• \`${currentPrefix}words\` — View blacklisted words` +
          formatCustoms("auto")
        )
        .setFooter({ text: "Autoresponders Category" })
        .setTimestamp();

      const getFunEmbed = () => new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("🎮 Fun Social & Mini-Games")
        .setDescription(
          `• \`${currentPrefix}crates\` — Open crate shop & spin pets\n` +
          `• \`${currentPrefix}pets\` / \`${currentPrefix}inventory\` — View collected pets\n` +
          `• \`${currentPrefix}sell [pet#]\` — Sell pets for DON cash\n` +
          `• \`${currentPrefix}trade @user\` — Securely trade pets\n` +
          `• \`${currentPrefix}lb\` / \`${currentPrefix}leaderboard\` — Top DON & pet worth\n` +
          `• \`${currentPrefix}msg\` — Check mini-game balance & stats\n` +
          `• \`${currentPrefix}marry @user [ring]\` — Propose to member\n` +
          `• \`${currentPrefix}divorce [@user]\` — End a marriage\n` +
          `• \`${currentPrefix}marriages\` — View server marriages\n` +
          `• \`${currentPrefix}ship @user1 [@user2]\` — Love match test\n` +
          `• \`${currentPrefix}adopt @user\` / \`${currentPrefix}disown\` — Family system\n` +
          `• \`${currentPrefix}family [@user]\` — Interactive family tree\n` +
          `• \`${currentPrefix}8ball\` / \`${currentPrefix}coinflip\` / \`${currentPrefix}roll\` — Minigames\n` +
          `• \`${currentPrefix}rps\` / \`${currentPrefix}auction\` — Play games & bid\n` +
          `• \`${currentPrefix}poll\` — Create interactive polls\n` +
          `• \`${currentPrefix}ai [prompt]\` — Chat with OpenAI engine\n` +
          `• \`${currentPrefix}customcolor\` — Open hex color studio` +
          formatCustoms("fun")
        )
        .setFooter({ text: "Fun & Games Category" })
        .setTimestamp();

      const getEmbedForCategory = (cat) => {
        switch(cat) {
          case "mod": return getModEmbed();
          case "security": return getSecurityEmbed();
          case "utility": return getUtilEmbed();
          case "auto": return getAutoEmbed();
          case "fun": return getFunEmbed();
          default: return mainEmbed;
        }
      };

      let currentSelectedCategory = "main";

      // ================= COMPONENTS =================
      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("cmdinfo_select")
          .setPlaceholder("📂 Select a category to inspect...")
          .addOptions([
            { label: "Main Overview", value: "main", emoji: "🏠" },
            { label: "Moderation & Punishments", value: "mod", emoji: "🛡️" },
            { label: "Security & Verification", value: "security", emoji: "🔒" },
            { label: "Chat, Roles & Tools", value: "utility", emoji: "⚙️" },
            { label: "Autoresponders & Blacklists", value: "auto", emoji: "🤖" },
            { label: "Fun & Mini-Games", value: "fun", emoji: "🎮" }
          ])
      );

      const buttonsRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("cmdinfo_reset")
          .setLabel("🔄 Reset View")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId("cmdinfo_edit")
          .setLabel("✏️ Add New Command Here")
          .setStyle(ButtonStyle.Primary)
      );

      const guideMessage = await message.channel.send({
        embeds: [mainEmbed],
        components: [selectMenu, buttonsRow]
      });

      const collector = guideMessage.createMessageComponentCollector({
        time: 86400000 
      });

      collector.on("collect", async (interaction) => {
        try {
          if (interaction.isStringSelectMenu() && interaction.customId === "cmdinfo_select") {
            currentSelectedCategory = interaction.values[0];
            await interaction.update({
              embeds: [getEmbedForCategory(currentSelectedCategory)],
              components: [selectMenu, buttonsRow]
            });
          } 
          else if (interaction.isButton() && interaction.customId === "cmdinfo_reset") {
            currentSelectedCategory = "main";
            await interaction.update({
              embeds: [mainEmbed],
              components: [selectMenu, buttonsRow]
            });
          }
          else if (interaction.isButton() && interaction.customId === "cmdinfo_edit") {
            if (currentSelectedCategory === "main") {
              return interaction.reply({ content: "⚠️ Please select a specific category from the dropdown first before adding a command!", flags: 64 });
            }

            const modal = new ModalBuilder()
              .setCustomId(`cmdinfo_modal_${currentSelectedCategory}`)
              .setTitle(`Add Command to ${currentSelectedCategory.toUpperCase()}`);

            const cmdInput = new TextInputBuilder()
              .setCustomId("cmd_name")
              .setLabel("Command Name & Usage")
              .setPlaceholder("e.g. daily or daily @user")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            const descInput = new TextInputBuilder()
              .setCustomId("cmd_desc")
              .setLabel("Description / What it does")
              .setPlaceholder("e.g. Claim your daily DON wallet reward")
              .setStyle(TextInputStyle.Short)
              .setRequired(true);

            modal.addComponents(
              new ActionRowBuilder().addComponents(cmdInput),
              new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);

            const submitted = await interaction.awaitModalSubmit({
              filter: (i) => i.customId === `cmdinfo_modal_${currentSelectedCategory}` && i.user.id === interaction.user.id,
              time: 60000
            }).catch(() => null);

            if (submitted) {
              const cmdVal = submitted.fields.getTextInputValue("cmd_name").replace(/^\?/, '').trim();
              const descVal = submitted.fields.getTextInputValue("cmd_desc").trim();

              if (!data.guideCommands[currentSelectedCategory]) {
                data.guideCommands[currentSelectedCategory] = [];
              }

              // Store command in persistent json object
              data.guideCommands[currentSelectedCategory].push({ cmd: cmdVal, desc: descVal });
              
              // Direct save call to Railway persistent volume (/data/guild-data.json)
              if (typeof saveData === "function") saveData();

              await submitted.update({
                embeds: [getEmbedForCategory(currentSelectedCategory)],
                components: [selectMenu, buttonsRow]
              });
            }
          }
        } catch (err) {
          console.error("Error handling commandinfo interaction:", err);
        }
      });

    } catch (err) {
      console.error("Error executing commandinfo:", err);
    }
  }
};
