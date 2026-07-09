const { EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

const LANGUAGES = { 
  en: "English 🇬🇧", lt: "Lithuanian 🇱🇹", ru: "Russian 🇷🇺", uk: "Ukrainian 🇺🇦", 
  pl: "Polish 🇵🇱", de: "German 🇩🇪", fr: "French 🇫🇷", es: "Spanish 🇸🇪", 
  it: "Italian 🇮🇹", tr: "Turkish 🇹🇷", ja: "Japanese 🇯🇵", ko: "Korean 🇰🇷", zh: "Chinese 🇨🇳" 
};
const LANG_LIST = `\`${Object.keys(LANGUAGES).join(", ")}\``;

async function handleTranslateCommand(message, args) {
    const targetLang = args[0]?.toLowerCase();
    const textToTranslate = args.slice(1).join(" ");

    // Sleek Usage Help Embed
    if (args.length < 2 || !LANGUAGES[targetLang]) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b) // Clean Orange hex
                    .setDescription(
                        `**Usage:** \`?translate <lang> <text>\`\n` +
                        `**Example:** \`?translate en labas\`\n\n` +
                        `**Available Codes:**\n${LANG_LIST}`
                    )
            ]
        });
    }

    try {
        await message.channel.sendTyping();

        // Query with auto-correction for optimal precision
        const result = await translate(textToTranslate, { to: targetLang, autoCorrect: true });
        
        // Resolve the source language cleanly
        const fromIso = result.from?.language?.iso?.toLowerCase();
        const fromLang = LANGUAGES[fromIso] || "Detected Language";

        // Compact, professional success embed
        const responseEmbed = new EmbedBuilder()
            .setColor(0x22c55e) // Crisp Green hex
            .setAuthor({ name: `${fromLang} ➜ ${LANGUAGES[targetLang]}` })
            .setDescription(`> ${result.text}`);

        return message.reply({ embeds: [responseEmbed] });

    } catch (err) {
        console.error("Translation Error:", err);
        return message.reply({
            embeds: [new EmbedBuilder().setColor(0xef4444).setDescription("❌ Translation service failed to respond.")]
        });
    }
}

module.exports = { handleTranslateCommand };
