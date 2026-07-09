const { EmbedBuilder } = require("discord.js");
const translate = require("@vitalets/google-translate-api");

const languages = {
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

async function handleTranslateCommand(message, args) {

    if (args.length < 2) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Orange")
                    .setTitle("🌍 Translate")
                    .setDescription(
                        "**Usage:**\n`?translate <text> <language>`\n\nExample:\n`?translate hello lt`\n`?translate kaip sekasi en`"
                    )
                    .addFields({
                        name: "Supported Languages",
                        value: Object.keys(languages).join(", ")
                    })
            ]
        });
    }

    const target = args[args.length - 1].toLowerCase();

    if (!languages[target]) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription(
                        "❌ Unknown language.\nSupported:\n`" +
                        Object.keys(languages).join(", ") +
                        "`"
                    )
            ]
        });
    }

    const text = args.slice(0, -1).join(" ");

    try {

        const result = await translate(text, {
            to: target
        });

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("🌍 Translation")
                    .addFields(
                        {
                            name: "Detected",
                            value: languages[result.from.language.iso] || result.from.language.iso,
                            inline: true
                        },
                        {
                            name: "Translated To",
                            value: languages[target],
                            inline: true
                        },
                        {
                            name: "Result",
                            value: result.text
                        }
                    )
            ]
        });

    } catch (err) {

        console.error(err);

        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Red")
                    .setDescription("❌ Translation failed.")
            ]
        });

    }

}

module.exports = {
    handleTranslateCommand
};
