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

module.exports = {
  name: "rolecreate",
  description: "Creates 1 role and gives hex codes for mobile gradient setup",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.channel.send("❌ You need **Manage Roles** permissions.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Direct usage: ?rolecreate #Hex1 #Hex2 RoleName
    if (args.length >= 3 && args[0].startsWith("#") && args[1].startsWith("#")) {
      return createSingleRole(message.channel, message.author, args[0], args[1], args.slice(2).join(" "));
    }

    // Interactive Button
    const embed = new EmbedBuilder()
      .setTitle("🎨 Single Role Creator")
      .setColor(0x8B5CF6)
      .setDescription("Click below to set up a role with 2 gradient hex codes.")
      .setFooter({ text: "Don Don Role Studio" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("role_single_modal").setLabel("🎨 Create 2-Hex Role").setStyle(ButtonStyle.Primary)
    );

    const menuMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = menuMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "role_single_modal") {
        const modal = new ModalBuilder()
          .setCustomId("role_modal_single")
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
          .setPlaceholder("#FFB7B2")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex2Input = new TextInputBuilder()
          .setCustomId("hex_2")
          .setLabel("Secondary Gradient Hex")
          .setPlaceholder("#C7CEEA")
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
    // Creates ONLY 1 role with the primary color
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
        `**To set the 2-color gradient on mobile:**\n` +
        `1. Open **Server Settings ➔ Roles ➔ ${roleName}**\n` +
        `2. Tap **Role Style ➔ Gradient**\n` +
        `3. Paste these two hex codes:\n` +
        `• **Color 1:** \`${hex1}\`\n` +
        `• **Color 2:** \`${hex2}\``
      )
      .setFooter({ text: `Requested by ${author.tag}` });

    return channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return channel.send("❌ Failed to create role. Check bot hierarchy permissions.");
  }
}
