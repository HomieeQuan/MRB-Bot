const mongoose = require('mongoose')

// MRB User model with complete rank progression system and streak tracking
const mrbUserSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true
    },
    
    // EXISTING POINT SYSTEM (for leaderboards and quota)
    biweeklyPoints: {
        type: Number,
        default: 0
    },
    allTimePoints: {
        type: Number,
        default: 0
    },
    biweeklyQuota: {
        type: Number,
        default: 24  // Default to Enlisted quota
    },
    quotaCompleted: {
        type: Boolean,
        default: false
    },
    totalEvents: {
        type: Number,
        default: 0
    },
    biweeklyEvents: {
        type: Number,
        default: 0
    },
    
    // TREND TRACKING
    previousBiweeklyPoints: {
        type: Number,
        default: 0
    },
    previousRank: {
        type: Number,
        default: 0
    },
    lastPointsUpdate: {
        type: Date,
        default: Date.now
    },
    dailyPointsToday: {
        type: Number,
        default: 0
    },
    lastDailyReset: {
        type: Date,
        default: Date.now
    },

    // USER LIFECYCLE
    active: {
        type: Boolean,
        default: true
    },
    deletedAt: {
        type: Date,
        default: null
    },
    deletedBy: {
        type: String,
        default: null
    },
    deletionReason: {
        type: String,
        default: null
    },
    
    // RANK PROGRESSION SYSTEM
    rankName: {
        type: String,
        default: 'Private'  // Starting rank (MRB Rank 1)
    },
    rankLevel: {
        type: Number,
        default: 1  // Level 1 = Private
    },
    rankPoints: {
        type: Number,
        default: 0  // Points toward NEXT rank (resets on promotion)
    },
    
    // RANK LOCK SYSTEM
    rankLockUntil: {
        type: Date,
        default: null  // When rank lock expires
    },
    rankLockNotified: {
        type: Boolean,
        default: false  // Has user been notified that lock expired?
    },
    
    // PROMOTION TRACKING
    promotionEligible: {
        type: Boolean,
        default: false  // Is user currently eligible for promotion?
    },
    lastPromotionCheck: {
        type: Date,
        default: Date.now
    },
    
    // PROMOTION HISTORY - Complete career tracking
    promotionHistory: [{
        fromRank: {
            name: String,
            level: Number
        },
        toRank: {
            name: String,
            level: Number
        },
        promotedAt: {
            type: Date,
            default: Date.now
        },
        promotedBy: {
            hrUserId: String,
            hrUsername: String
        },
        promotionType: {
            type: String,
            enum: ['standard', 'force', 'bypass_lock'],
            default: 'standard'
        },
        reason: String,
        rankPointsAtPromotion: Number,
        allTimePointsAtPromotion: Number,
        rankLockApplied: {
            days: Number,
            until: Date
        }
    }],
    
    // ✨ NEW: STREAK SYSTEM
    quotaStreak: {
        type: Number,
        default: 0  // Consecutive bi-weekly cycles completed
    },
    lastQuotaCompletion: {
        type: Date,
        default: null  // Last time quota was completed
    },
    longestStreak: {
        type: Number,
        default: 0  // Personal best streak record
    },
    streakBonusActive: {
        type: Boolean,
        default: false  // Is user currently getting streak bonus?
    },
    currentStreakBonus: {
        type: Number,
        default: 0  // Current bonus percentage (0, 5, 10, or 15)
    },
    streakAtRisk: {
        type: Boolean,
        default: false  // Flag for automation to warn user
    },
    lastStreakWarning: {
        type: Date,
        default: null  // Last time we warned about at-risk streak
    },
    
    // USER LIFECYCLE
    joinedMRBAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// 🚀 PERFORMANCE INDEXES
console.log('📊 Adding MRBUser database indexes...');

// Existing indexes
mrbUserSchema.index({ biweeklyPoints: -1 }, { 
    name: 'biweekly_leaderboard_idx',
    background: true 
});

mrbUserSchema.index({ allTimePoints: -1 }, { 
    name: 'alltime_leaderboard_idx',
    background: true 
});

mrbUserSchema.index({ discordId: 1 }, { 
    name: 'discord_lookup_idx',
    background: true 
});

mrbUserSchema.index({ quotaCompleted: 1 }, { 
    name: 'quota_stats_idx',
    background: true 
});

// Rank system indexes
mrbUserSchema.index({ rankLevel: -1 }, { 
    name: 'rank_level_idx',
    background: true 
});

mrbUserSchema.index({ promotionEligible: 1 }, { 
    name: 'promotion_eligible_idx',
    background: true 
});

mrbUserSchema.index({ rankLockUntil: 1 }, { 
    name: 'rank_lock_idx',
    background: true,
    sparse: true
});

// ✨ NEW: Streak system indexes
mrbUserSchema.index({ quotaStreak: -1 }, { 
    name: 'streak_leaderboard_idx',
    background: true 
});

mrbUserSchema.index({ longestStreak: -1 }, { 
    name: 'longest_streak_idx',
    background: true 
});

mrbUserSchema.index({ streakAtRisk: 1 }, { 
    name: 'at_risk_streaks_idx',
    background: true,
    sparse: true
});

// Compound indexes for advanced queries
mrbUserSchema.index({ rankLevel: -1, allTimePoints: -1 }, { 
    name: 'rank_performance_idx',
    background: true 
});

mrbUserSchema.index({ promotionEligible: 1, rankLevel: 1 }, { 
    name: 'promotion_management_idx',
    background: true 
});

mrbUserSchema.index({ active: 1, biweeklyPoints: -1 }, { 
    name: 'active_users_idx',
    background: true 
});

console.log('✅ MRBUser indexes configured successfully');

module.exports = mongoose.model('MRBUser', mrbUserSchema);