// commands/ping.js - Simple test command
// const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// module.exports = {
//     data: new SlashCommandBuilder()
//         .setName('ping')
//         .setDescription('Test if the MRB Bot is working')
//         .setDMPermission(false),

//     async execute(interaction) {
//         const embed = new EmbedBuilder()
//             .setColor('#00ff00')
//             .setTitle('🏓 Pong!')
//             .setDescription('MRB Bot is online and working!')
//             .addFields(
//                 { name: 'Latency', value: `${Date.now() - interaction.createdTimestamp}ms`, inline: true },
//                 { name: 'API Latency', value: `${Math.round(interaction.client.ws.ping)}ms`, inline: true }
//             )
//             .setTimestamp();

//         await interaction.reply({ embeds: [embed] });
//     },
// };
