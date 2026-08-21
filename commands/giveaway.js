const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

// Helper to convert time strings (e.g., "1m", "1h", "1d") into milliseconds
function parseMs(timeStr) {
    const regex = /^(\d+)([smhd])$/;
    const match = timeStr.match(regex);
    if (!match) return null;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

function setupGiveawaySystem(client, prefix = '?') {
    client.on('messageCreate', async message => {
        if (message.author.bot || !message.guild) return;

        // Check for ?g or ?gcreate prefixes
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift().toLowerCase();

        if (command === 'g' || command === 'gcreate') {
            // Permission check: requires Manage Messages
            if (!message.member.permissions.has('ManageMessages')) {
                return message.reply({ content: '❌ You need **Manage Messages** permission to create giveaways.', allowedMentions: { repliedUser: false } });
            }

            // Usage: ?g <duration> <winners> <prize>  (e.g., ?g 1h 1 Nitro)
            const durationStr = args[0];
            const winnerCount = parseInt(args[1]);
            const prize = args.slice(2).join(' ');

            if (!durationStr || isNaN(winnerCount) || !prize) {
                return message.reply({ 
                    content: `❌ **Invalid usage!**\nCorrect format: \`${prefix}${command} <duration> <winners> <prize>\`\nExample: \`${prefix}${command} 10m 1 Discord Nitro\``,
                    allowedMentions: { repliedUser: false }
                });
            }

            const durationMs = parseMs(durationStr);
            if (!durationMs) {
                return message.reply({ content: '❌ Invalid time format! Use **s** (seconds), **m** (minutes), **h** (hours), or **d** (days). Example: `30m`', allowedMentions: { repliedUser: false } });
            }

            const endsAt = Date.now() + durationMs;
            const discordTimestamp = Math.floor(endsAt / 1000);

            // Build the giveaway embed
            const embed = new EmbedBuilder()
                .setTitle('🎉 **GIVEAWAY** 🎉')
                .setDescription(`React with the button below to enter!\n\n🎁 **Prize:** ${prize}\n👑 **Winners:** ${winnerCount}\n⏰ **Ends:** <t:${discordTimestamp}:R> (<t:${discordTimestamp}:F>)\nHosted by: ${message.author}`)
                .setColor('#5865F2')
                .setTimestamp(endsAt);

            // Build entry button
            const enterButton = new ButtonBuilder()
                .setCustomId('giveaway_enter')
                .setLabel('Join Giveaway')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎉');

            const row = new ActionRowBuilder().addComponents(enterButton);

            // Send giveaway message
            const giveawayMsg = await message.channel.send({ embeds: [embed], components: [row] });
            
            // Delete the command trigger message to keep channel clean
            await message.delete().catch(() => {});

            // Track entrants
            const entrants = new Set();

            // Button collector for entries
            const collector = giveawayMsg.createMessageComponentCollector({ time: durationMs });

            collector.on('collect', async interaction => {
                if (interaction.customId === 'giveaway_enter') {
                    if (entrants.has(interaction.user.id)) {
                        return interaction.reply({ content: '⚠️ You are already entered into this giveaway!', ephemeral: true });
                    }
                    entrants.add(interaction.user.id);
                    return interaction.reply({ content: '✅ Successfully entered the giveaway! Good luck! 🍀', ephemeral: true });
                }
            });

            // Handle giveaway conclusion
            collector.on('end', async () => {
                const fetchedMsg = await message.channel.messages.fetch(giveawayMsg.id).catch(() => null);
                if (!fetchedMsg) return;

                const entrantsArray = Array.from(entrants);
                
                const disabledButton = new ButtonBuilder()
                    .setCustomId('giveaway_ended')
                    .setLabel('Giveaway Ended')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const endedRow = new ActionRowBuilder().addComponents(disabledButton);

                if (entrantsArray.length === 0) {
                    const endedEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
                        .setDescription(`🎁 **Prize:** ${prize}\n❌ **Winner:** No valid entries recorded!`)
                        .setColor('#ED4245');

                    return fetchedMsg.edit({ embeds: [endedEmbed], components: [endedRow] });
                }

                // Pick random winner(s)
                const winners = [];
                const actualWinnerCount = Math.min(winnerCount, entrantsArray.length);
                
                for (let i = 0; i < actualWinnerCount; i++) {
                    const randomIndex = Math.floor(Math.random() * entrantsArray.length);
                    winners.push(entrantsArray.splice(randomIndex, 1)[0]);
                }

                const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

                const endedEmbed = EmbedBuilder.from(fetchedMsg.embeds[0])
                    .setDescription(`🎁 **Prize:** ${prize}\n👑 **Winner(s):** ${winnerMentions}\nHosted by: ${message.author}`)
                    .setColor('#57F287');

                await fetchedMsg.edit({ embeds: [endedEmbed], components: [endedRow] });
                
                // Announce winner in chat
                message.channel.send(`🎉 Congratulations ${winnerMentions}! You won the **${prize}**!`);
            });
        }
    });
}

module.exports = setupGiveawaySystem;
