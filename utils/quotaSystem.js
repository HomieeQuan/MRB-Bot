// utils/quotaSystem.js - UPDATED with new reduced quota requirements
const RankSystem = require('./rankSystem');

class QuotaSystem {
    // UPDATED: Doubled quota requirements for all ranks
    static quotaByRankLevel = {
        // Enlisted Personnel
        1: 20,   // Private: 20 points (doubled from 10)
        
        // Enlisted ranks
        2: 24,   // Private First Class: 24 points (doubled from 12)
        3: 24,   // Lance Corporal: 24 points (doubled from 12)
        4: 24,   // Corporal: 24 points (doubled from 12)
        
        // NCO ranks
        5: 30,   // Sergeant: 30 points (doubled from 15)
        6: 30,   // Staff Sergeant: 30 points (doubled from 15)
        
        // Elite NCO ranks
        7: 36,   // Gunnery Sergeant: 36 points (doubled from 18)
        8: 36,   // Warrant Officer: 36 points (doubled from 18)
        
        // Officer ranks (hand-picked - no quota)
        9: 0,    // Second Lieutenant: No quota (hand-picked)
        10: 0,   // First Lieutenant: No quota (hand-picked)
        
        // Executive+ ranks (no quota - unchanged)
        11: 0,   // Lieutenant Colonel: No quota
        12: 0,   // Commanding Captain: No quota
        13: 0,   // Brigadier General: No quota
        14: 0,   // Major General: No quota
        15: 0,   // General: No quota
        16: 0    // Chief of the Army: No quota
    };

    // Get quota for a specific rank level
    static getQuotaForRank(rankLevel) {
        return this.quotaByRankLevel[rankLevel] || 10; // Default to 10 if rank not found
    }

    // Get quota for a user based on their current rank
    static getUserQuota(user) {
        const rankLevel = user.rankLevel || 1;
        return this.getQuotaForRank(rankLevel);
    }

    // Check if user has completed their quota
    static isQuotaCompleted(user) {
        const userQuota = this.getUserQuota(user);
        
        // Executive+ ranks have no quota requirement
        if (userQuota === 0) return true;
        
        return user.biweeklyPoints >= userQuota;
    }

    // Update user's quota based on their current rank
    static updateUserQuota(user) {
        const newQuota = this.getUserQuota(user);
        const oldQuota = user.biweeklyQuota;
        
        user.biweeklyQuota = newQuota;
        user.quotaCompleted = this.isQuotaCompleted(user);
        
        return {
            updated: oldQuota !== newQuota,
            oldQuota,
            newQuota,
            completed: user.quotaCompleted
        };
    }

    // Bulk update all users' quotas (for system-wide quota fixes)
    static async updateAllUserQuotas() {
        try {
            const MRBUser = require('../models/MRBUser');
            
            console.log('🔧 Starting bulk quota update with NEW quota requirements...');
            
            const users = await MRBUser.find({});
            let updatedCount = 0;
            let completionChanges = 0;
            const updateResults = [];
            
            for (const user of users) {
                const result = this.updateUserQuota(user);
                
                if (result.updated) {
                    updatedCount++;
                    updateResults.push({
                        username: user.username,
                        rankLevel: user.rankLevel,
                        oldQuota: result.oldQuota,
                        newQuota: result.newQuota,
                        wasCompleted: user.biweeklyPoints >= result.oldQuota,
                        nowCompleted: result.completed
                    });
                    
                    // Check if completion status changed
                    const wasCompleted = user.biweeklyPoints >= result.oldQuota;
                    if (wasCompleted !== result.completed) {
                        completionChanges++;
                    }
                }
                
                await user.save();
            }
            
            console.log(`✅ Bulk quota update complete with NEW requirements:`);
            console.log(`   - Total users: ${users.length}`);
            console.log(`   - Quotas updated: ${updatedCount}`);
            console.log(`   - Completion status changes: ${completionChanges}`);
            
            if (updateResults.length > 0) {
                console.log('📊 NEW Quota changes:');
                updateResults.forEach(result => {
                    console.log(`   - ${result.username}: ${result.oldQuota} → ${result.newQuota} points`);
                });
            }
            
            return {
                success: true,
                totalUsers: users.length,
                updated: updatedCount,
                completionChanges,
                updateResults
            };
            
        } catch (error) {
            console.error('❌ Bulk quota update error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get quota statistics for all ranks
    static getQuotaStatistics() {
        const stats = {
            byRank: {},
            totalRanks: 15,
            ranksWithQuota: 0,
            ranksWithoutQuota: 0,
            averageQuota: 0
        };

        let totalQuota = 0;
        let ranksWithQuota = 0;

        for (let level = 1; level <= 15; level++) {
            const rank = RankSystem.getRankByLevel(level);
            const quota = this.getQuotaForRank(level);
            
            stats.byRank[rank.name] = {
                level,
                quota,
                hasQuota: quota > 0
            };
            
            if (quota > 0) {
                totalQuota += quota;
                ranksWithQuota++;
                stats.ranksWithQuota++;
            } else {
                stats.ranksWithoutQuota++;
            }
        }

        stats.averageQuota = ranksWithQuota > 0 ? Math.round(totalQuota / ranksWithQuota) : 0;

        return stats;
    }

    // Get human-readable quota description for a rank
    static getQuotaDescription(rankLevel) {
        const quota = this.getQuotaForRank(rankLevel);
        const rank = RankSystem.getRankByLevel(rankLevel);
        
        if (quota === 0) {
            return `${RankSystem.formatRank({ rankLevel, rankName: rank.name })} - No quota required (Executive+)`;
        }
        
        return `${RankSystem.formatRank({ rankLevel, rankName: rank.name })} - ${quota} points required`;
    }

    // Check if a user needs quota recalculation (after rank change)
    static needsQuotaRecalculation(user) {
        const expectedQuota = this.getUserQuota(user);
        return user.biweeklyQuota !== expectedQuota;
    }

    // Get all users who need quota updates
    static async getUsersNeedingQuotaUpdate() {
        try {
            const MRBUser = require('../models/MRBUser');
            
            const users = await MRBUser.find({});
            const needingUpdate = [];
            
            for (const user of users) {
                if (this.needsQuotaRecalculation(user)) {
                    const expectedQuota = this.getUserQuota(user);
                    needingUpdate.push({
                        username: user.username,
                        currentQuota: user.biweeklyQuota,
                        expectedQuota,
                        rankLevel: user.rankLevel
                    });
                }
            }
            
            return needingUpdate;
            
        } catch (error) {
            console.error('❌ Error checking users needing quota update:', error);
            return [];
        }
    }

    // Apply quota update for biweekly reset with rank-based quotas
    static async applyBiWeeklyQuotaReset() {
        try {
            const MRBUser = require('../models/MRBUser');
            
            console.log('🔄 Applying biweekly quota reset with UPDATED rank-based quotas...');
            
            // Update all users with current rank-based quotas
            const users = await MRBUser.find({});
            let updatedCount = 0;
            
            for (const user of users) {
                const newQuota = this.getUserQuota(user); // Uses NEW quota requirements
                
                // Update quota and reset biweekly stats
                user.biweeklyQuota = newQuota;
                user.biweeklyPoints = 0;
                user.biweeklyEvents = 0;
                user.quotaCompleted = false;
                user.dailyPointsToday = 0;
                user.lastDailyReset = new Date();
                user.previousBiWeeklyPoints = 0;
                
                await user.save();
                updatedCount++;
            }
            
            console.log(`✅ biweekly quota reset complete: ${updatedCount} users updated with DOUBLED rank-based quotas`);
            console.log(`📊 DOUBLED Quota structure: Enlisted=20-24, NCO=30, Elite NCO/Officer=36, Executive+=0`);
            
            return {
                success: true,
                usersUpdated: updatedCount
            };
            
        } catch (error) {
            console.error('❌ biweekly quota reset error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = QuotaSystem;