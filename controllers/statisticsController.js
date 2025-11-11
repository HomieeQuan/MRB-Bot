// controllers/statisticsController.js
const MRBUser = require('../models/MRBUser');
const EventLog = require('../models/EventLog');

class StatisticsController {
    // Calculate enhanced statistics for leaderboard
    static async getEnhancedStatistics() {
        try {
            // Get all ACTIVE users only (exclude deleted/inactive)
            const allUsers = await MRBUser.find({ active: { $ne: false } });
            
            if (allUsers.length === 0) {
                return {
                    totalOperators: 0,
                    quotaCompleted: 0,
                    averagePoints: 0,
                    mostActive: null,
                    biggestGainer: null,
                    quotaRate: 0,
                    averageEvents: 0
                };
            }

            // Basic stats
            const totalOperators = allUsers.length;
            const quotaCompleted = allUsers.filter(u => u.quotaCompleted).length;
            const totalBiweeklyPoints = allUsers.reduce((sum, u) => sum + u.biweeklyPoints, 0);
            const averagePoints = (totalBiweeklyPoints / totalOperators).toFixed(1);
            const quotaRate = Math.floor((quotaCompleted / totalOperators) * 100);

            // Most active (most events this cycle)
            const mostActive = allUsers.reduce((max, user) => 
                user.biweeklyEvents > (max?.biweeklyEvents || 0) ? user : max, null);

            // Biggest gainer (most points gained today)
            const biggestGainer = allUsers.reduce((max, user) => 
                user.dailyPointsToday > (max?.dailyPointsToday || 0) ? user : max, null);

            // Average events per operator
            const totalBiWeeklyEvents = allUsers.reduce((sum, u) => sum + u.biweeklyEvents, 0);
            const averageEvents = (totalBiWeeklyEvents / totalOperators).toFixed(1);

            return {
                totalOperators,
                quotaCompleted,
                averagePoints,
                mostActive,
                biggestGainer,
                quotaRate,
                averageEvents
            };

        } catch (error) {
            console.error('Enhanced statistics error:', error);
            return null;
        }
    }

    // Calculate trend for a specific user
    static async calculateUserTrend(userId) {
        try {
            const user = await MRBUser.findOne({ discordId: userId });
            if (!user) return { direction: '', change: 0 };

            // Calculate rank change (only among ACTIVE users)
            const currentRank = await MRBUser.countDocuments({ 
                biweeklyPoints: { $gt: user.biweeklyPoints },
                active: { $ne: false }
            }) + 1;

            const rankChange = user.previousRank - currentRank; // Positive = rank improved
            
            let direction = '';
            if (rankChange > 0) direction = '⬆️';
            else if (rankChange < 0) direction = '⬇️';
            else direction = '➡️';

            return {
                direction,
                rankChange: Math.abs(rankChange),
                pointsToday: user.dailyPointsToday || 0
            };

        } catch (error) {
            console.error('User trend calculation error:', error);
            return { direction: '', change: 0 };
        }
    }

    // Reset daily statistics (call this daily)
    static async resetDailyStats() {
        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            // Reset daily points for ACTIVE users who haven't been reset today
            await MRBUser.updateMany(
                { 
                    lastDailyReset: { $lt: startOfDay },
                    active: { $ne: false }
                },
                { 
                    $set: { 
                        dailyPointsToday: 0,
                        lastDailyReset: now 
                    }
                }
            );

            console.log('✅ Daily statistics reset completed');
        } catch (error) {
            console.error('❌ Daily stats reset error:', error);
        }
    }
}

module.exports = StatisticsController;