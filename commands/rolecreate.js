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

function isValidHex(hex) {
  return /^#?([0-9A-F]{3}){1,2}$/i.test(hex);
}

module.exports = {
  name: "rolecreate",
  description: "Creates a role and provides hex codes for gradient configuration",
  async execute(message, args) {
    message.delete().catch(() => null);

    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return message.channel.send("❌ You need **Manage Roles** permissions.")
        .then(m => setTimeout(() => m.delete().catch(() => null), 5000));
    }

    // Direct command usage: ?rolecreate #Hex1 #Hex2 RoleName
    if (args.length >= 3 && isValidHex(args[0]) && isValidHex(args[1])) {
      return createRoleWithInstructions(message.channel, message.author, args[0], args[1], args.slice(2).join(" "));
    }

    // Interactive Button Menu
    const embed = new EmbedBuilder()
      .setTitle("🎨 Interactive Role Creator")
      .setColor(0x8B5CF6)
      .setDescription("Click the button below to enter your role name and 2 gradient hex colors.")
      .setFooter({ text: "Don Don Role Studio" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("role_modal_trigger")
        .setLabel("🎨 Create 2-Hex Role")
        .setStyle(ButtonStyle.Primary)
    );

    const menuMsg = await message.channel.send({ embeds: [embed], components: [row] });

    const collector = menuMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 60000
    });

    collector.on("collect", async (interaction) => {
      if (interaction.customId === "role_modal_trigger") {
        const modal = new ModalBuilder()
          .setCustomId("role_gradient_modal")
          .setTitle("Create Role with 2 Hex Colors");

        const nameInput = new TextInputBuilder()
          .setCustomId("role_name")
          .setLabel("Role Name")
          .setPlaceholder("e.g. Admin, VIP, Cute")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex1Input = new TextInputBuilder()
          .setCustomId("hex_1")
          .setLabel("Primary Hex Color (Start)")
          .setPlaceholder("#9FC1FF")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const hex2Input = new TextInputBuilder()
          .setCustomId("hex_2")
          .setLabel("Secondary Hex Color (End)")
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

        if (!isValidHex(hex1) || !isValidHex(hex2)) {
          return submitted.reply({ content: "❌ Invalid Hex color codes provided!", ephemeral: true });
        }

        await submitted.deferUpdate();
        await createRoleWithInstructions(message.channel, message.author, hex1, hex2, roleName);
        menuMsg.delete().catch(() => null);
      }
    });
  }
};

async function createRoleWithInstructions(channel, author, hex1, hex2, roleName) {
  try {
    const formattedHex1 = hex1.startsWith("#") ? hex1 : `#${hex1}`;
    const formattedHex2 = hex2.startsWith("#") ? hex2 : `#${hex2}`;

    const newRole = await channel.guild.roles.create({
      name: roleName,
      color: formattedHex1,
      reason: `Role created by ${author.tag}`
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Role Created Successfully")
      .setColor(formattedHex1)
      .setDescription(
        `Created role: <@&${newRole.id}>\n\n` +
        `**To activate the 2-color gradient background:**\n` +
        `1. Go to **Server Settings ➔ Roles ➔ ${roleName}**\n` +
        `2. Select **Gradient** under Role Style\n` +
        `3. Apply these Hex colors:\n` +
        `• **Start Color:** \`${formattedHex1}\`\n` +
        `• **End Color:** \`${formattedHex2}\``
      )
      .setFooter({ text: `Requested by ${author.tag}` })
      .setTimestamp();

    return channel.send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
    return channel.send("❌ Failed to create role. Check the bot's role hierarchy permissions.");
  }
}
