// controllers/leaderboardController.js
const MRBUser = require('../models/MRBUser');
const MRBEmbeds = require('../views/embedBuilder');
const { EmbedBuilder } = require('discord.js');

class LeaderboardController {
    // Enhanced biweekly leaderboard with Phase 1 features
    static async getBiWeeklyLeaderboard(interaction) {
        try {
            console.log('🔍 Starting enhanced biweekly leaderboard...');
            
            // Get all users sorted by biweekly points
            const users = await MRBUser.find({})
                .sort({ biweeklyPoints: -1 })
                .limit(50);

            if (users.length === 0) {
                const emptyEmbed = MRBEmbeds.createEmptyLeaderboardEmbed('biweekly');
                return await interaction.reply({ embeds: [emptyEmbed] });
            }

            // Get enhanced statistics
            const StatisticsController = require('./statisticsController');
            const enhancedStats = await StatisticsController.getEnhancedStatistics();

            // Create enhanced leaderboard embed
            const leaderboardEmbed = await MRBEmbeds.createEnhancedLeaderboardEmbed(
                users, 
                'biweekly', 
                enhancedStats
            );

            await interaction.reply({ embeds: [leaderboardEmbed] });

        } catch (error) {
            console.error('❌ Enhanced biweekly leaderboard error:', error);
            const errorEmbed = MRBEmbeds.createErrorEmbed('Failed to retrieve biweekly leaderboard. Please try again later.');
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }

    // Enhanced all-time leaderboard
    static async getAllTimeLeaderboard(interaction) {
        try {
            console.log('🔍 Starting enhanced all-time leaderboard...');
            
            // Get all users sorted by all-time points
            const users = await MRBUser.find({})
                .sort({ allTimePoints: -1 })
                .limit(50);

            if (users.length === 0) {
                const emptyEmbed = MRBEmbeds.createEmptyLeaderboardEmbed('alltime');
                return await interaction.reply({ embeds: [emptyEmbed] });
            }

            // Create enhanced leaderboard embed (no enhanced stats for all-time)
            const leaderboardEmbed = await MRBEmbeds.createEnhancedLeaderboardEmbed(
                users, 
                'alltime'
            );

            await interaction.reply({ embeds: [leaderboardEmbed] });

        } catch (error) {
            console.error('❌ All-time leaderboard error:', error);
            const errorEmbed = MRBEmbeds.createErrorEmbed('Failed to retrieve all-time leaderboard. Please try again later.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    // Enhanced user position with progress bars
    static async getUserPosition(interaction, targetUser) {
        try {
            const user = await MRBUser.findOne({ discordId: targetUser.id });
            
            if (!user) {
                const errorEmbed = MRBEmbeds.createErrorEmbed(`${targetUser.username} hasn't submitted any events yet.`);
                return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Calculate positions
            const biweeklyRank = await MRBUser.countDocuments({ 
                biweeklyPoints: { $gt: user.biweeklyPoints } 
            }) + 1;

            const allTimeRank = await MRBUser.countDocuments({ 
                allTimePoints: { $gt: user.allTimePoints } 
            }) + 1;

            // Get trend information
            const StatisticsController = require('./statisticsController');
            const trend = await StatisticsController.calculateUserTrend(user.discordId);

            // Create progress bar
            const ProgressBarGenerator = require('../utils/progressBar');
            const quotaProgress = ProgressBarGenerator.createQuotaProgressBar(user.biweeklyPoints, user.biweeklyQuota);

            const embed = new EmbedBuilder()
                .setColor(user.quotaCompleted ? '#00ff00' : '#ffa500')
                .setTitle(`📊 ${targetUser.username}'s Leaderboard Position`)
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    { 
                        name: '🎯 Biweekly Quota Progress', 
                        value: quotaProgress, 
                        inline: false 
                    },
                    { 
                        name: '🏆 Biweekly Rank', 
                        value: `#${biweeklyRank} ${trend.direction} ${trend.rankChange > 0 ? `(${trend.direction === '⬆️' ? '+' : '-'}${trend.rankChange})` : ''}`, 
                        inline: true 
                    },
                    { 
                        name: '🏅 All-Time Rank', 
                        value: `#${allTimeRank} (${user.allTimePoints} points)`, 
                        inline: true 
                    },
                    { 
                        name: '🔥 Points Today', 
                        value: `${user.dailyPointsToday || 0} points`, 
                        inline: true 
                    },
                    { 
                        name: '📈 Biweekly Performance', 
                        value: `${user.biweeklyPoints} points • ${user.biweeklyEvents} events`, 
                        inline: true 
                    },
                    { 
                        name: '🎯 Quota Status', 
                        value: user.quotaCompleted ? '✅ Completed!' : '⏳ In Progress', 
                        inline: true 
                    }
                )
                .setFooter({ 
                    text: 'MRB Points System' 
                })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('❌ User position error:', error);
            const errorEmbed = MRBEmbeds.createErrorEmbed('Failed to retrieve user position. Please try again later.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }
}

module.exports = LeaderboardController;