const { EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

const LANGUAGES = { 
  en: "English 🇬🇧", lt: "Lithuanian 🇱🇹", ru: "Russian 🇷🇺", uk: "Ukrainian 🇺🇦", 
  pl: "Polish 🇵🇱", de: "German 🇩🇪", fr: "French 🇫🇷", es: "Spanish 🇪🇸", 
  it: "Italian 🇮🇹", tr: "Turkish 🇹🇷", ja: "Japanese 🇯🇵", ko: "Korean 🇰🇷", zh: "Chinese 🇨🇳" 
};
const LANG_LIST = `\`${Object.keys(LANGUAGES).join(", ")}\``;

async function handleTranslateCommand(message, args) {
    const targetLang = args[0]?.toLowerCase();
    const textToTranslate = args.slice(1).join(" ");

    if (args.length < 2 || !LANGUAGES[targetLang]) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor(0xf59e0b)
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

        // Request translation with auto-correct enabled
        const result = await translate(textToTranslate, { to: targetLang, autoCorrect: true });
        
        const fromIso = result.from?.language?.iso?.toLowerCase();
        const fromLang = LANGUAGES[fromIso] || "Detected Language";

        // Extract phonetic/romanized text if available (e.g., Romaji for Japanese)
        const pronunciation = result.pronunciation || result.raw?.pronunciation;

        // Construct the compact description
        let embedDescription = `> ${result.text}`;
        
        // If there are special letters (JA/KO/ZH/RU) and an English reading exists, append it cleanly
        if (pronunciation && pronunciation.toLowerCase() !== result.text.toLowerCase()) {
            embedDescription += `\n*📖 Pronunciation: ${pronunciation}*`;
        }

        const responseEmbed = new EmbedBuilder()
            .setColor(0x22c55e)
            .setAuthor({ name: `${fromLang} ➜ ${LANGUAGES[targetLang]}` })
            .setDescription(embedDescription);

        return message.reply({ embeds: [responseEmbed] });

    } catch (err) {
        console.error("Translation Error:", err);
        return message.reply({
            embeds: [new EmbedBuilder().setColor(0xef4444).setDescription("❌ Translation service failed to respond.")]
        });
    }
}

module.exports = { handleTranslateCommand };
