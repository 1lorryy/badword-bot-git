const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  StringSelectMenuBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require("discord.js");

// Format custom added commands into exact bullet style automatically
function formatCustoms(cat, data, currentPrefix) {
  const list = data?.guideCommands?.[cat];
  if (!list || !Array.isArray(list) || list.length === 0) return "";
  return "\n" + list.map(c => `• \`${currentPrefix}${c.cmd}\` — ${c.desc}`).join("\n");
}

function getEmbedForCategory(cat, data, currentPrefix) {
  const mainEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🛡️ Don Don Complete Command & Staff Operations Guide")
    .setDescription(
      "Complete manual for all moderation, security, utility, auto-responder, and fun systems.\n\n" +
      "👇 **Select a category from the dropdown menu below** to inspect specific commands."
    )
    .addFields(
      { name: "🛡️ Moderation & Punishments", value: "Warnings, mutes, kicks, bans, softbans, and staff logs.", inline: true },
      { name: "🔒 Security & Verification", value: "Verification settings, member scans, and trust filters.", inline: true },
      { name: "⚙️ Chat, Roles & Tools", value: "Purging, temporary roles, nicking, channel tools, and slowmode.", inline: true },
      { name: "🤖 Autoresponders & Blacklists", value: "Custom word filters, auto-replies, and blacklists.", inline: true },
      { name: "🎮 Fun, Family & Mini-Games", value: "Marriage, adoption, pet crates, trading, leaderboards, and AI.", inline: true }
    )
    .setFooter({ text: "Don Don Staff Operations • Complete Command Manual" })
    .setTimestamp();

  if (cat === "mod") {
    return new EmbedBuilder()
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
        formatCustoms("mod", data, currentPrefix)
      )
      .setFooter({ text: "Moderation Category" })
      .setTimestamp();
  }

  if (cat === "security") {
    return new EmbedBuilder()
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
        formatCustoms("security", data, currentPrefix)
      )
      .setFooter({ text: "Security Category" })
      .setTimestamp();
  }

  if (cat === "utility") {
    return new EmbedBuilder()
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
        formatCustoms("utility", data, currentPrefix)
      )
      .setFooter({ text: "Utility Category" })
      .setTimestamp();
  }

  if (cat === "auto") {
    return new EmbedBuilder()
      .setColor(0xeb459e)
      .setTitle("🤖 Autoresponders & Blacklists")
      .setDescription(
        `• \`${currentPrefix}ar add [trigger] [response]\` — Create response\n` +
        `• \`${currentPrefix}ar remove [trigger]\` — Delete response\n` +
        `• \`${currentPrefix}ar list\` — View all auto-responses\n` +
        `• \`${currentPrefix}bl [word]\` — Add word to blacklist\n` +
        `• \`${currentPrefix}unbl [word]\` — Remove word from blacklist\n` +
        `• \`${currentPrefix}words\` — View blacklisted words` +
        formatCustoms("auto", data, currentPrefix)
      )
      .setFooter({ text: "Autoresponders Category" })
      .setTimestamp();
  }

  if (cat === "fun") {
    return new EmbedBuilder()
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
        formatCustoms("fun", data, currentPrefix)
      )
      .setFooter({ text: "Fun & Games Category" })
      .setTimestamp();
  }

  return mainEmbed;
}

function getComponents(currentCategory = "main") {
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
      .setCustomId(`cmdinfo_edit_${currentCategory}`)
      .setLabel("✏️ Add New Command Here")
      .setStyle(ButtonStyle.Primary)
  );

  return [selectMenu, buttonsRow];
}

module.exports = {
  name: "commandinfo",
  description: "Displays the interactive Command & Staff Operations Guide",
  getEmbedForCategory,
  getComponents,
  async execute(message, args, prefix, getGuildData) {
    try {
      await message.delete().catch(() => null);

      const data = getGuildData(message.guild.id);
      const currentPrefix = prefix || data.prefix || "?";

      if (!data.guideCommands) {
        data.guideCommands = { mod: [], security: [], utility: [], auto: [], fun: [] };
      }

      await message.channel.send({
        embeds: [getEmbedForCategory("main", data, currentPrefix)],
        components: getComponents("main")
      });
    } catch (err) {
      console.error("Error executing commandinfo:", err);
    }
  }
};
