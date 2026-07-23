const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");

module.exports = {
  name: "vip",
  description: "Displays or edits the VIP ranks and perks",
  async execute(message, args) {
    const isEdit = message.content.toLowerCase().includes("vipedit");

    if (isEdit) {
      if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply("❌ **Access Denied:** Administrator permission required.");
      }

      const newGuideText = args.join(" ");
      if (!newGuideText) {
        return message.reply("⚠️ **Usage:** `?vipedit <new info>`");
      }

      return message.reply("✅ **VIP info updated successfully!**");
    }

    const vipEmbed = new EmbedBuilder()
      .setColor(0x2B2D31) // Sleek dark aesthetic
      .setAuthor({ name: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊", iconURL: message.guild.iconURL({ dynamic: true }) })
      .setTitle("👑 VIP RANKS & EXCLUSIVE PERKS")
      .setDescription(
        "```ansi\n\u001b[1;33m✦ EXCLUSIVE SERVER PASSES & BENEFITS ✦\u001b[0m\n```\n" +

        "🌟 **Economy Rank** ┃ ` 250 ` <:robux:1499543065608716328>\n" +
        "> ╰┈➤ +1 Extra Entry\n" +
        "> ╰┈➤ Custom Role\n" +
        "> ╰┈➤ Access to VIP-only Giveaways\n" +
        "> ╰┈➤ GIF & Image Perms\n\n" +

        "⭐ **Premium Economy Rank** ┃ ` 450 ` <:robux:1499543065608716328>\n" +
        "> ╰┈➤ +1 Extra Entry\n" +
        "> ╰┈➤ Custom Role\n" +
        "> ╰┈➤ Access to VIP & Booster Giveaways\n" +
        "> ╰┈➤ GIF & Image Perms\n\n" +

        "💎 **Business Class Rank** ┃ ` 900 ` <:robux:1499543065608716328>\n" +
        "> ╰┈➤ +1 Extra Entry\n" +
        "> ╰┈➤ Custom Role\n" +
        "> ╰┈➤ Access to ALL Giveaways\n" +
        "> ╰┈➤ GIF & Image Perms\n" +
        "> ╰┈➤ 2x Claim Time in Giveaways\n" +
        "> ╰┈➤ Bypass Messages Req & Role\n\n" +

        "👑 **First Class** ┃ ` 1600 ` <:robux:1499543065608716328>\n" +
        "> ╰┈➤ +1 Extra Entry\n" +
        "> ╰┈➤ Custom Role\n" +
        "> ╰┈➤ Access to ALL Giveaways\n" +
        "> ╰┈➤ GIF & Image Perms\n" +
        "> ╰┈➤ Bypass ALL Requirements\n" +
        "> ╰┈➤ INF Claim Time in Giveaways *(Quick drops not included)*\n" +
        "> ╰┈➤ Voice Note Perms\n" +
        "> ╰┈➤ Commands Perms in <#1481561361044607047>\n" +
        "> ╰┈➤ Receive <@&1492630307650666546> *(Taken away if misused)*\n\n" +

        "🛒 **Claim a <#1481370042892550220> (purchase) if you wanna purchase it!**"
      )
      .setFooter({ text: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊 • VIP Store" });

    return message.reply({ embeds: [vipEmbed] });
  }
};
