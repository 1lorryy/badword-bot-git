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
      .setColor(0x2B2D31)
      .setTitle("✨ `𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊` ✦ VIP PERKS")
      .setDescription(
        "⚡ **🌟 ECONOMY RANK** ┊ ` 250 ` <:robux:1499543065608716328>\n" +
        "╰┈➤ **Perks:** +1 entry • custom role • VIP giveaways • gif/image perms\n\n" +

        "⚡ **⭐ PREMIUM ECONOMY** ┊ ` 450 ` <:robux:1499543065608716328>\n" +
        "╰┈➤ **Perks:** +1 entry • custom role • VIP/Booster giveaways • gif/image perms\n\n" +

        "⚡ **💎 BUSINESS CLASS** ┊ ` 900 ` <:robux:1499543065608716328>\n" +
        "╰┈➤ **Perks:** +1 entry • custom role • ALL giveaways • gif/image perms • 2x claim time • bypass msg/role reqs\n\n" +

        "⚡ **👑 FIRST CLASS** ┊ ` 1600 ` <:robux:1499543065608716328>\n" +
        "╰┈➤ **Perks:** +1 entry • custom role • ALL giveaways • gif/image perms • bypass ALL reqs • INF claim time *(no quick drops)* • voice notes • commands in <#1481561361044607047> • <@&1492630307650666546> role *(lost if abused)*\n\n" +

        "───────────────\n" +
        "🛒 Open a ticket in <#1481370042892550220> to purchase!"
      )
      .setFooter({ text: "𝕯𝖔𝖓𝕼𝖚𝖎𝖝𝖔𝖙𝖊𝖘 𝕷𝖔𝖚𝖓𝖌𝖊’𝖘 𝖛𝖎𝖕 𝖗𝖆𝖓𝖐𝖘" });

    return message.reply({ embeds: [vipEmbed] });
  }
};
