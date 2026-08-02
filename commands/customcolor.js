const { 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle 
} = require("discord.js");

module.exports = {
  name: "customcolor",
  description: "Open custom hex color picker modal",
  async execute(message) {
    message.delete().catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle("🎨 Custom Role Color Studio")
      .setColor(0x5865F2)
      .setDescription(
        "Want a custom display name color?\n\n" +
        "Click the button below to enter any **Hex Code** (e.g. `#656565`, `#FFB7C5`, `#00FFFF`).\n" +
        "The bot will automatically create and equip your personal color role!"
      )
      .setFooter({ text: "Don Don Operations • Color Studio" });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("open_hex_modal")
        .setLabel("Pick Custom Color")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎨"),
      new ButtonBuilder()
        .setCustomId("clear_hex_color")
        .setLabel("Remove Color")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🗑️")
    );

    return message.channel.send({ embeds: [embed], components: [row] });
  },

  // Handle Button & Modal Interactions
  async handleInteraction(interaction) {
    if (!interaction.guild) return;
    const member = interaction.member;

    // 1. OPEN MODAL WHEN BUTTON IS CLICKED
    if (interaction.customId === "open_hex_modal") {
      const modal = new ModalBuilder()
        .setCustomId("hex_color_modal")
        .setTitle("Custom Role Color");

      const hexInput = new TextInputBuilder()
        .setCustomId("hex_code_input")
        .setLabel("Enter Hex Code")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("#656565 or FF5733")
        .setMinLength(6)
        .setMaxLength(7)
        .setRequired(true);

      const firstActionRow = new ActionRowBuilder().addComponents(hexInput);
      modal.addComponents(firstActionRow);

      return interaction.showModal(modal);
    }

    // 2. PROCESS MODAL SUBMISSION
    if (interaction.customId === "hex_color_modal") {
      await interaction.deferReply({ ephemeral: true });

      let hex = interaction.fields.getTextInputValue("hex_code_input").trim();
      if (!hex.startsWith("#")) hex = `#${hex}`;

      // Validate Hex Format
      const hexRegex = /^#([0-9A-F]{6})$/i;
      if (!hexRegex.test(hex)) {
        return interaction.editReply({ 
          content: "❌ Invalid Hex code! Please use a valid format like `#656565` or `FF5733`." 
        });
      }

      const roleName = `Color-${hex.toUpperCase()}`;

      try {
        // Find or create the hex role
        let targetRole = interaction.guild.roles.cache.find(r => r.name === roleName);
        if (!targetRole) {
          targetRole = await interaction.guild.roles.create({
            name: roleName,
            color: hex,
            reason: `Custom Hex Color selected by ${interaction.user.tag}`
          });
        }

        // Clean up old color roles from user
        const oldColorRoles = member.roles.cache.filter(r => r.name.startsWith("Color-#"));
        if (oldColorRoles.size > 0) {
          await member.roles.remove(oldColorRoles);
        }

        // Assign new role
        await member.roles.add(targetRole);

        const successEmbed = new EmbedBuilder()
          .setTitle("✅ Custom Color Applied")
          .setColor(parseInt(hex.replace("#", ""), 16))
          .setDescription(`Your name color has been updated to **\`${hex.toUpperCase()}\`**!`);

        return interaction.editReply({ embeds: [successEmbed] });

      } catch (err) {
        console.error("Hex Modal Error:", err);
        return interaction.editReply({ 
          content: "❌ Failed to set custom color. Make sure my bot role is higher than user roles!" 
        });
      }
    }

    // 3. REMOVE CUSTOM COLOR
    if (interaction.customId === "clear_hex_color") {
      await interaction.deferReply({ ephemeral: true });
      const oldColorRoles = member.roles.cache.filter(r => r.name.startsWith("Color-#"));

      if (!oldColorRoles.size) {
        return interaction.editReply({ content: "ℹ️ You don't have an active custom color role!" });
      }

      await member.roles.remove(oldColorRoles);
      return interaction.editReply({ content: "✅ Removed your custom color role!" });
    }
  }
};
