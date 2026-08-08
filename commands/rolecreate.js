const { 
  EmbedBuilder, 
  PermissionFlagsBits, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  StringSelectMenuBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require("discord.js");

module.exports = {
  name: "rolecreate",
  description: "Interactive role creator with color pickers and presets",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.channel.send("❌ You need **Manage Roles** permissions.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Direct command usage: ?rolecreate #Hex1 #Hex2 RoleName
    if (args.length >= 3 && args[0].startsWith("#") && args[1].startsWith("#")) {
      return createSingleRole(message.channel, message.author, args[0], args[1], args.slice(2).join(" "));
    }

    // Interactive Menu Embed
    const embed = new EmbedBuilder()
      .setTitle("🎨 Interactive Role & Gradient Studio")
      .setColor(0xA855F7)
      .setDescription(
        "Select a color theme from the dropdown menu below, or click **Custom Hexes** to enter your own 2-color gradient hexes."
      )
      .setFooter({ text: "Don Don Role Studio • Easy Setup" });

    // Dropdown Palette Picker
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("role_color_select")
      .setPlaceholder("✨ Choose a Gradient Color Palette...")
      .addOptions([
        { label: "🦄 Pastel Pink & Purple", value: "#f472b6_#c084fc", description: "#f472b6 ➔ #c084fc", emoji: "🌸" },
        { label: "🌊 Ocean Sky & Indigo", value: "#38bdf8_#818cf8", description: "#38bdf8 ➔ #818cf8", emoji: "💧" },
        { label: "✨ Sunset Gold & Rose", value: "#fb7185_#fbbf24", description: "#fb7185 ➔ #fbbf24", emoji: "🌅" },
        { label: "🍃 Mint & Emerald", value: "#34d399_#059669", description: "#34d399 ➔ #059669", emoji: "🌿" },
        { label: "👾 Cyber Neon & Violet", value: "#a855f7_#ec4899", description: "#a855f7 ➔ #ec4899", emoji: "🔮" }
      ]);

    const rowSelect = new ActionRowBuilder().addComponents(selectMenu);

    const rowButtons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("role_custom_hex").setLabel("✏️ Custom Hex Input").setStyle(ButtonStyle.Primary)
    );

    const menuMsg = await message.channel.send({ embeds: [embed], components: [rowSelect, rowButtons] });

    const collector = menuMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      // 1. SELECT MENU COLOR PICKER
      if (interaction.customId === "role_color_select") {
        const [hex1, hex2] = interaction.values[0].split("_");

        const modal = new ModalBuilder()
          .setCustomId(`modal_preset_${hex1}_${hex2}`)
          .setTitle("Set Role Name");

        const nameInput = new TextInputBuilder()
          .setCustomId("preset_role_name")
          .setLabel("Role Name")
          .setPlaceholder("e.g. VIP, Admin, Cute")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
        await interaction.showModal(modal);

        const submitted = await interaction.awaitModalSubmit({ time: 60000 }).catch(() => null);
        if (!submitted) return;

        const roleName = submitted.fields.getTextInputValue("preset_role_name");
        await submitted.deferUpdate();
        await createSingleRole(message.channel, message.author, hex1, hex2, roleName);
        menuMsg.delete().catch(() => null);
      }

      // 2. CUSTOM HEX INPUT POPUP
      if (interaction.customId === "role_custom_hex") {
        const modal = new ModalBuilder()
          .setCustomId("modal_custom_hex_submit")
          .setTitle("Create Role with 2 Hexes");

        const nameInput = new TextInputBuilder()
          .setCustomId("role_name")
          .setLabel("Role Name")
          .setPlaceholder("e.g. Admin")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex1Input = new TextInputBuilder()
          .setCustomId("hex_1")
          .setLabel("Primary Hex Color")
          .setPlaceholder("#9FC1FF")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex2Input = new TextInputBuilder()
          .setCustomId("hex_2")
          .setLabel("Gradient End Color")
          .setPlaceholder("#F860E4")
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

        await submitted.deferUpdate();
        await createSingleRole(message.channel, message.author, hex1, hex2, roleName);
        menuMsg.delete().catch(() => null);
      }
    });
  }
};

async function createSingleRole(channel, author, hex1, hex2, roleName) {
  try {
    const newRole = await channel.guild.roles.create({
      name: roleName,
      color: hex1,
      reason: `Role created by ${author.tag}`
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Single Role Created")
      .setColor(hex1)
      .setDescription(
        `Created **1 role**: <@&${newRole.id}>\n\n` +
        `**To set the gradient background:**\n` +
        `1. Open **Server Settings ➔ Roles ➔ ${roleName}**\n` +
        `2. Select **Gradient** under Role Style\n` +
        `3. Paste these hex codes into the color fields:\n` +
        `• **Start Color:** \`${hex1}\`\n` +
        `• **End Color:** \`${hex2}\``
      )
      .setFooter({ text: `Requested by ${author.tag}` });

    return channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return channel.send("❌ Failed to create role. Check bot hierarchy permissions.");
  }
}
