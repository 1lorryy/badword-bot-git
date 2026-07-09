const { EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

// Supported languages mapping
const LANGUAGES = {
  en: "English 🇬🇧",
  lt: "Lithuanian 🇱🇹",
  ru: "Russian 🇷🇺",
  uk: "Ukrainian 🇺🇦",
  pl: "Polish 🇵🇱",
  de: "German 🇩🇪",
  fr: "French 🇫🇷",
  es: "Spanish 🇪🇸",
  it: "Italian 🇮🇹",
  tr: "Turkish 🇹🇷",
  ja: "Japanese 🇯🇵",
  ko: "Korean 🇰🇷",
  zh: "Chinese 🇨🇳"
};

// Helper to generate a code-blocked list of available languages
const SUPPORTED_LANG_LIST = `\`${Object.keys(LANGUAGES).join(", ")}\``;

async function handleTranslateCommand(message, args) {
    // 1. Validation: Ensure we have at least a language code and one word of text
    if (args.length < 2) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("🌍 Translation Tool")
                    .setDescription("**Usage:** `?translate <language_code> <text>`")
                    .addFields(
                        { name: "💡 Examples", value: "`?translate lt Hello world`\n`?translate en Kaip sekasi?`" },
                        { name: "📋 Supported Languages", value: SUPPORTED_LANG_LIST }
                    )
                    .setTimestamp()
            ]
        });
    }

    // 2. Extract target language and text
    // Format is now: ?translate <lang> <text...> 
    const targetLang = args[0].toLowerCase();
    const textToTranslate = args.slice(1).join(" ");

    // 3. Validation: Check if the language is supported
    if (!LANGUAGES[targetLang]) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("❌ Unsupported Language")
                    .setDescription(`\`${targetLang}\` is not a valid language code.`)
                    .addFields({ name: "Available Codes", value: SUPPORTED_LANG_LIST })
            ]
        });
    }

    // 4. Execute Translation
    try {
        // Show a "typing..." or processing state if the API takes time
        await message.channel.sendTyping();

        const result = await translate(textToTranslate, { to: targetLang });
        const detectedIso = result.from?.language?.iso;
        const detectedLang = LANGUAGES[detectedIso] || detectedIso || "Unknown";

        const responseEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("🌍 Translation Successful")
            .addFields(
                { name: "📥 Original Text", value: `\`\`\`${textToTranslate}\`\`\`` },
                { name: "📤 Translated Text", value: `\`\`\`${result.text}\`\`\`` },
                { name: "🌐 Details", value: `**From:** ${detectedLang}\n**To:** ${LANGUAGES[targetLang]}` }
            )
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();

        return message.reply({ embeds: [responseEmbed] });

    } catch (err) {
        console.error("Translation Error:", err);

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setTitle("⚠️ Error")
                    .setDescription("An error occurred while trying to translate your text. Please try again later.")
            ]
        });
    }
}

module.exports = {
    handleTranslateCommand
};
