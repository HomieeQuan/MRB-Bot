// utils/streakSystem.js - NEW: Streak tracking and bonus calculation
class StreakSystem {
    // Streak milestone bonuses (consecutive biweekly cycles)
    static STREAK_BONUSES = {
        3: 5,   // 3 cycles = +5% bonus
        6: 10,  // 6 cycles = +10% bonus
        9: 15   // 9+ cycles = +15% bonus
    };

    // Calculate current streak bonus percentage
    static getStreakBonus(quotaStreak) {
        if (quotaStreak >= 9) return 15;
        if (quotaStreak >= 6) return 10;
        if (quotaStreak >= 3) return 5;
        return 0;
    }

    // Get next milestone info
    static getNextMilestone(quotaStreak) {
        if (quotaStreak < 3) {
            return {
                cycles: 3,
                bonus: 5,
                remaining: 3 - quotaStreak
            };
        }
        if (quotaStreak < 6) {
            return {
                cycles: 6,
                bonus: 10,
                remaining: 6 - quotaStreak
            };
        }
        if (quotaStreak < 9) {
            return {
                cycles: 9,
                bonus: 15,
                remaining: 9 - quotaStreak
            };
        }
        return null; // Max milestone reached
    }

    // Update user's streak after quota completion
    static async updateStreakOnQuotaComplete(user) {
        const now = new Date();
        
        // Increment streak
        user.quotaStreak = (user.quotaStreak || 0) + 1;
        user.lastQuotaCompletion = now;
        
        // Update longest streak if necessary
        if (user.quotaStreak > (user.longestStreak || 0)) {
            user.longestStreak = user.quotaStreak;
        }
        
        // Calculate new bonus
        const newBonus = this.getStreakBonus(user.quotaStreak);
        const oldBonus = user.currentStreakBonus || 0;
        
        user.currentStreakBonus = newBonus;
        user.streakBonusActive = newBonus > 0;
        
        // Clear at-risk flag
        user.streakAtRisk = false;
        user.lastStreakWarning = null;
        
        await user.save();
        
        console.log(`🔥 Streak updated for ${user.username}: ${user.quotaStreak} cycles (${newBonus}% bonus)`);
        
        return {
            streakIncreased: true,
            oldStreak: user.quotaStreak - 1,
            newStreak: user.quotaStreak,
            oldBonus,
            newBonus,
            bonusIncreased: newBonus > oldBonus,
            isNewRecord: user.quotaStreak === user.longestStreak
        };
    }

    // Reset user's streak after missing quota
    static async resetStreak(user) {
        const oldStreak = user.quotaStreak || 0;
        const oldBonus = user.currentStreakBonus || 0;
        
        user.quotaStreak = 0;
        user.currentStreakBonus = 0;
        user.streakBonusActive = false;
        user.streakAtRisk = false;
        user.lastStreakWarning = null;
        
        await user.save();
        
        console.log(`❌ Streak reset for ${user.username}: ${oldStreak} → 0 cycles`);
        
        return {
            streakReset: true,
            oldStreak,
            oldBonus,
            longestStreak: user.longestStreak || 0
        };
    }

    // Check if user's streak is at risk (hasn't submitted anything this cycle)
    static isStreakAtRisk(user) {
        // No streak to risk
        if (!user.quotaStreak || user.quotaStreak === 0) return false;
        
        // Already completed quota this cycle
        if (user.quotaCompleted) return false;
        
        // Check if they have ANY points this cycle
        return user.biweeklyPoints === 0;
    }

    // Mark user's streak as at risk
    static async markStreakAtRisk(user) {
        const now = new Date();
        const lastWarning = user.lastStreakWarning;
        
        // Only warn once per cycle (don't spam)
        if (lastWarning) {
            const hoursSinceWarning = (now - lastWarning) / (1000 * 60 * 60);
            if (hoursSinceWarning < 24) {
                return { alreadyWarned: true };
            }
        }
        
        user.streakAtRisk = true;
        user.lastStreakWarning = now;
        await user.save();
        
        console.log(`⚠️ Streak at risk for ${user.username}: ${user.quotaStreak} cycle streak`);
        
        return {
            markedAtRisk: true,
            currentStreak: user.quotaStreak,
            currentBonus: user.currentStreakBonus
        };
    }

    // Get streak statistics for leaderboard
    static async getStreakLeaderboard(limit = 10) {
        try {
            const MRBUser = require('../models/MRBUser');
            
            // Current longest streaks
            const currentStreaks = await MRBUser.find({
                quotaStreak: { $gt: 0 }
            })
            .sort({ quotaStreak: -1, biweeklyPoints: -1 })
            .limit(limit);
            
            // All-time longest streaks
            const longestStreaks = await MRBUser.find({
                longestStreak: { $gt: 0 }
            })
            .sort({ longestStreak: -1, allTimePoints: -1 })
            .limit(limit);
            
            return {
                currentStreaks,
                longestStreaks
            };
            
        } catch (error) {
            console.error('❌ Streak leaderboard error:', error);
            return {
                currentStreaks: [],
                longestStreaks: []
            };
        }
    }

    // Get streak statistics for all users
    static async getStreakStatistics() {
        try {
            const MRBUser = require('../models/MRBUser');
            
            const users = await MRBUser.find({});
            
            const stats = {
                totalUsers: users.length,
                activeStreaks: users.filter(u => u.quotaStreak > 0).length,
                atRiskStreaks: users.filter(u => u.streakAtRisk).length,
                withBonuses: users.filter(u => u.streakBonusActive).length,
                averageStreak: 0,
                longestCurrentStreak: 0,
                longestAllTimeStreak: 0,
                bonusDistribution: {
                    none: 0,
                    five: 0,
                    ten: 0,
                    fifteen: 0
                }
            };
            
            let totalStreak = 0;
            
            users.forEach(user => {
                totalStreak += user.quotaStreak || 0;
                
                if (user.quotaStreak > stats.longestCurrentStreak) {
                    stats.longestCurrentStreak = user.quotaStreak;
                }
                
                if ((user.longestStreak || 0) > stats.longestAllTimeStreak) {
                    stats.longestAllTimeStreak = user.longestStreak;
                }
                
                const bonus = user.currentStreakBonus || 0;
                if (bonus === 0) stats.bonusDistribution.none++;
                else if (bonus === 5) stats.bonusDistribution.five++;
                else if (bonus === 10) stats.bonusDistribution.ten++;
                else if (bonus === 15) stats.bonusDistribution.fifteen++;
            });
            
            stats.averageStreak = users.length > 0 ? (totalStreak / users.length).toFixed(1) : 0;
            
            return stats;
            
        } catch (error) {
            console.error('❌ Streak statistics error:', error);
            return null;
        }
    }

    // Format streak display text
    static formatStreakDisplay(quotaStreak, currentBonus) {
        if (quotaStreak === 0) return 'No active streak';
        
        const emoji = currentBonus > 0 ? '🔥' : '📊';
        let text = `${emoji} ${quotaStreak} cycle${quotaStreak > 1 ? 's' : ''}`;
        
        if (currentBonus > 0) {
            text += ` (+${currentBonus}% bonus)`;
        }
        
        return text;
    }

    // Format streak milestone notification
    static formatMilestoneNotification(quotaStreak, newBonus) {
        if (newBonus === 5) {
            return `🎉 **3-Cycle Streak Achieved!** You now earn +5% bonus on all events!`;
        }
        if (newBonus === 10) {
            return `🔥 **6-Cycle Streak!** Your bonus increased to +10% on all events!`;
        }
        if (newBonus === 15) {
            return `⚡ **9-Cycle Streak - MAXIMUM BONUS!** You now earn +15% on all events!`;
        }
        return '';
    }
}

module.exports = StreakSystem;
