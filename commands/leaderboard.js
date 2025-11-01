// SIMPLIFIED: Remove position lookup from leaderboard command
// Replace the entire leaderboard.js command file

const { SlashCommandBuilder } = require('discord.js');
const LeaderboardController = require('../controllers/leaderboardController');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View MRB performance leaderboards')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Leaderboard type')
                .setRequired(false)
                .addChoices(
                    { name: 'biweekly Rankings', value: 'biweekly' },
                    { name: 'All-Time Rankings', value: 'alltime' }
                ))
        .setDMPermission(false),

    async execute(interaction) {
        const type = interaction.options.getString('type') || 'biweekly';

        switch (type) {
            case 'biweekly':
                await LeaderboardController.getBiWeeklyLeaderboard(interaction);
                break;
                
            case 'alltime':
                await LeaderboardController.getAllTimeLeaderboard(interaction);
                break;
                
            default:
                await LeaderboardController.getBiWeeklyLeaderboard(interaction);
                break;
        }
    },
};