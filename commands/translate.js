const { EmbedBuilder } = require("discord.js");
const { translate } = require("@vitalets/google-translate-api");

const LANGUAGES = { en: "English 🇬🇧", lt: "Lithuanian 🇱🇹", ru: "Russian 🇷🇺", uk: "Ukrainian 🇺🇦", pl: "Polish 🇵🇱", de: "German 🇩🇪", fr: "French 🇫🇷", es: "Spanish 🇪🇸", it: "Italian 🇮🇹", tr: "Turkish 🇹🇷", ja: "Japanese 🇯🇵", ko: "Korean 🇰🇷", zh: "Chinese 🇨🇳" };
const LANG_LIST = `\`${Object.keys(LANGUAGES).join(", ")}\``;

async function handleTranslateCommand(message, args) {
    const targetLang = args[0]?.toLowerCase();
    const textToTranslate = args.slice(1).join(" ");

    // Usage help / invalid language embed
    if (args.length < 2 || !LANGUAGES[targetLang]) {
        return message.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor("Orange")
                    .setDescription(
                        `**Usage:** \`?translate <lang> <text>\`\n` +
                        `**Example:** \`?translate en labas\`\n` +
                        `**Codes:** ${LANG_LIST}`
                    )
            ]
        });
    }

    try {
        await message.channel.sendTyping();

        const result = await translate(textToTranslate, { to: targetLang });
        const fromIso = result.from?.language?.iso;
        const fromLang = LANGUAGES[fromIso] || fromIso || "Auto";

        // Compact success embed
        const responseEmbed = new EmbedBuilder()
            .setColor("Green")
            .setAuthor({ name: `Translation (${fromLang} ➡️ ${LANGUAGES[targetLang]})` })
            .setDescription(`**${textToTranslate}**\n⬇️\n**${result.text}**`);

        return message.reply({ embeds: [responseEmbed] });

    } catch (err) {
        console.error("Translation Error:", err);
        return message.reply({
            embeds: [new EmbedBuilder().setColor("Red").setDescription("❌ Translation failed.")]
        });
    }
}

module.exports = { handleTranslateCommand };
