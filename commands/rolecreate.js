const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require("discord.js");
const chroma = require("chroma-js");

module.exports = {
  name: "rolecreate",
  description: "Interactive button menu for single & gradient roles",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.channel.send("❌ You need **Manage Roles** permissions.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Direct command usage: ?rolecreate #hex1 #hex2 RoleName
    if (args.length >= 3 && chroma.valid(args[0]) && chroma.valid(args[1])) {
      return createGradientStack(message.channel, message.author, args[0], args[1], args.slice(2).join(" "));
    }

    // Open Interactive Button Menu
    const embed = new EmbedBuilder()
      .setTitle("🎨 Interactive Role Creator")
      .setColor(0x8B5CF6)
      .setDescription(
        "Choose an option below to create single or gradient roles instantly:\n\n" +
        "• **🎨 Custom Hexes** — Pop up input fields for 2 custom Hex codes\n" +
        "• **🦄 Pastel Pink/Purple** — Quick 2-color gradient preset\n" +
        "• **🌊 Ocean Blue** — Quick 2-color gradient preset\n" +
        "• **✨ Soft Sunset** — Quick 2-color gradient preset"
      )
      .setFooter({ text: "Don Don Role Studio" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("role_custom_modal").setLabel("🎨 Custom Hexes").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("role_preset_pink").setLabel("🦄 Pink/Purple").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("role_preset_blue").setLabel("🌊 Ocean Blue").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("role_preset_sunset").setLabel("✨ Sunset").setStyle(ButtonStyle.Secondary)
    );

    const menuMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = menuMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      // 1. POPUP MODAL FOR CUSTOM HEX INPUTS
      if (interaction.customId === "role_custom_modal") {
        const modal = new ModalBuilder()
          .setCustomId("role_modal_submit")
          .setTitle("Create 2-Hex Gradient Role");

        const nameInput = new TextInputBuilder()
          .setCustomId("role_name")
          .setLabel("Role Name")
          .setPlaceholder("e.g. VIP, Admin, Cute")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex1Input = new TextInputBuilder()
          .setCustomId("hex_1")
          .setLabel("First Hex Color")
          .setPlaceholder("#ffffff")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex2Input = new TextInputBuilder()
          .setCustomId("hex_2")
          .setLabel("Second Hex Color")
          .setPlaceholder("#f860e4")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(nameInput),
          new ActionRowBuilder().addComponents(hex1Input),
          new ActionRowBuilder().addComponents(hex2Input)
        );

        await interaction.showModal(modal);

        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (!submitted) return;

        const roleName = submitted.fields.getTextInputValue("role_name");
        const hex1 = submitted.fields.getTextInputValue("hex_1");
        const hex2 = submitted.fields.getTextInputValue("hex_2");

        if (!chroma.valid(hex1) || !chroma.valid(hex2)) {
          return submitted.reply({ content: "❌ Invalid Hex color codes provided!", ephemeral: true });
        }

        await submitted.deferUpdate();
        await createGradientStack(message.channel, message.author, hex1, hex2, roleName);
        menuMsg.delete().catch(() => null);
      }

      // 2. QUICK PRESET BUTTONS
      if (interaction.customId.startsWith("role_preset_")) {
        let h1, h2, label;
        if (interaction.customId === "role_preset_pink") { h1 = "#f472b6"; h2 = "#c084fc"; label = "Pastel Pink/Purple"; }
        if (interaction.customId === "role_preset_blue") { h1 = "#38bdf8"; h2 = "#818cf8"; label = "Ocean Blue"; }
        if (interaction.customId === "role_preset_sunset") { h1 = "#fb7185"; h2 = "#fbbf24"; label = "Sunset Gold"; }

        await interaction.deferUpdate();
        await createGradientStack(message.channel, message.author, h1, h2, label);
        menuMsg.delete().catch(() => null);
      }
    });
  }
};

// Helper function to create the 5 gradient roles
async function createGradientStack(channel, author, hex1, hex2, roleName) {
  const colors = chroma.scale([hex1, hex2]).mode("lch").colors(5);
  const created = [];

  try {
    for (let i = 0; i < colors.length; i++) {
      const newRole = await channel.guild.roles.create({
        name: `${roleName} ${i + 1}`,
        color: colors[i],
        reason: `Gradient role by ${author.tag}`
      });
      created.push(`• **${newRole.name}** → \`${colors[i]}\``);
    }

    const embed = new EmbedBuilder()
      .setTitle("🎨 Gradient Roles Created")
      .setColor(colors[0])
      .setDescription(`Successfully created 5 gradient roles for **${roleName}**:\n\n${created.join("\n")}`)
      .setFooter({ text: `Requested by ${author.tag}` });

    return channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return channel.send("❌ Failed to create roles. Check bot hierarchy permissions.");
  }
}
