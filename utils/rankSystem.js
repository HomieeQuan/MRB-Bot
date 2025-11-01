// utils/rankSystem.js - FIXED promotion eligibility to properly check rank locks
class RankSystem {
    // Complete 15-rank MRB progression
    static ranks = [
        // Enlisted Personnel (Levels 1-5)
        { 
            level: 1, 
            name: 'Private', 
            pointsRequired: 0, 
            rankLockDays: 3,  // Updated: 3 days
            emoji: ''
        },
        { 
            level: 2, 
            name: 'Private First Class', 
            pointsRequired: 35,  // UPDATED: was 25 (Option 1)
            rankLockDays: 3,  // Updated: 3 days
            emoji: ''
        },
        { 
            level: 3, 
            name: 'Lance Corporal', 
            pointsRequired: 45,  // UPDATED: was 30 (Option 1)
            rankLockDays: 5,  // Updated: 5 days
            emoji: ''
        },
        { 
            level: 4, 
            name: 'Corporal', 
            pointsRequired: 55,  // UPDATED: was 40 (Option 1)
            rankLockDays: 5,  // Updated: 5 days
            emoji: ''
        },
        { 
            level: 5, 
            name: 'Sergeant', 
            pointsRequired: 70,  // UPDATED: was 50 (Option 1)
            rankLockDays: 8,  // Updated: 8 days
            emoji: ''
        },
        
        // NCO Personnel (Levels 6-8)
        { 
            level: 6, 
            name: 'Staff Sergeant', 
            pointsRequired: 90,  // UPDATED: was 60 (Option 1)
            rankLockDays: 8,  // Updated: 8 days
            emoji: '⚡'
        },
        { 
            level: 7, 
            name: 'Gunnery Sergeant', 
            pointsRequired: 120,  // UPDATED: was 80 (Option 1)
            rankLockDays: 8,  // Updated: 8 days
            emoji: '⚡⚡'
        },
        { 
            level: 8, 
            name: 'Warrant Officer', 
            pointsRequired: 140,  // UPDATED: was 90 (Option 1)
            rankLockDays: 8,  // Updated: 8 days
            emoji: '⚡⚡⚡'
        },
        
        // Officer Personnel (Levels 9-11) - Hand-picked only
        { 
            level: 9, 
            name: 'Second Lieutenant', 
            pointsRequired: 0,  // Updated: Hand-picked, no points required
            rankLockDays: 0,    // Updated: Hand-picked, no rank lock
            emoji: '⭐'
        },
        { 
            level: 10, 
            name: 'First Lieutenant', 
            pointsRequired: 0,  // Updated: Hand-picked, no points required
            rankLockDays: 0,    // Updated: Hand-picked, no rank lock
            emoji: '⭐⭐'
        },
        { 
            level: 11, 
            name: 'Lieutenant Colonel', 
            pointsRequired: 0,  // Hand-picked, no points required
            rankLockDays: 0,    // Hand-picked, no rank lock
            emoji: '⭐⭐⭐'
        },
        
        // Commanding Officers (Levels 12-13)
        { 
            level: 12, 
            name: 'Commanding Captain', 
            pointsRequired: 0,  // No points needed - promotion by merit only
            rankLockDays: 0,
            emoji: '🎖️'
        },
        
        // Command Generals (Levels 13-15)
        { 
            level: 13, 
            name: 'Brigadier General', 
            pointsRequired: 0,  // No points needed - promotion by merit only
            rankLockDays: 0,
            emoji: '🎖️⚔️'
        },
        { 
            level: 14, 
            name: 'Major General', 
            pointsRequired: 0,  // No points needed - promotion by merit only
            rankLockDays: 0,
            emoji: '👑'
        },
        { 
            level: 15, 
            name: 'Chief of the Army', 
            pointsRequired: 0,  // No points needed - highest rank
            rankLockDays: 0,
            emoji: '⭐👑⭐'
        }
    ];

    // Get rank information by level
    static getRankByLevel(level) {
        return this.ranks.find(rank => rank.level === level) || this.ranks[0];
    }

    // Get rank information by name
    static getRankByName(name) {
        return this.ranks.find(rank => rank.name === name) || this.ranks[0];
    }

    // Get next rank for a user
    static getNextRank(currentLevel) {
        const nextLevel = currentLevel + 1;
        if (nextLevel > 15) return null; // Already at max rank
        return this.getRankByLevel(nextLevel);
    }

    // 🔧 NEW: Check if user meets point requirements (regardless of rank lock)
    static checkPointRequirements(user) {
        const currentRank = this.getRankByLevel(user.rankLevel || 1);
        const nextRank = this.getNextRank(user.rankLevel || 1);
        
        if (!nextRank) {
            return {
                pointsMet: false,
                reason: 'Already at maximum rank',
                maxRank: true,
                currentRank,
                nextRank: null
            };
        }

        // For Executive+ ranks (hand-picked only)
        if (nextRank.level >= 11) {
            return {
                pointsMet: false,
                reason: 'Executive ranks are hand-picked only',
                handPickedOnly: true,
                currentRank,
                nextRank
            };
        }

        // Check rank points regardless of rank lock
        const rankPoints = user.rankPoints || 0;
        const pointsRequired = nextRank.pointsRequired;
        const hasEnoughPoints = rankPoints >= pointsRequired;
        
        console.log(`📊 Point requirements check for ${user.username}: ${rankPoints}/${pointsRequired} rank points, met: ${hasEnoughPoints}`);
        
        return {
            pointsMet: hasEnoughPoints,
            rankPoints,
            pointsRequired,
            currentRank,
            nextRank,
            reason: hasEnoughPoints ? 'Point requirements met!' : `Need ${pointsRequired - rankPoints} more rank points`
        };
    }

    // 🔧 FIXED: Check promotion eligibility with corrected rank lock logic
    static checkPromotionEligibility(user) {
        const currentRank = this.getRankByLevel(user.rankLevel || 1);
        const nextRank = this.getNextRank(user.rankLevel || 1);
        
        if (!nextRank) {
            return {
                eligible: false,
                reason: 'Already at maximum rank',
                maxRank: true,
                currentRank,
                nextRank: null
            };
        }
    
        // ALWAYS calculate requirements for progress bar display
        const rankPoints = user.rankPoints || 0;
        const pointsRequired = nextRank.pointsRequired;
        const hasEnoughPoints = rankPoints >= pointsRequired;
        
        const requirements = {
            pointsRequired,
            currentPoints: rankPoints,
            pointsRemaining: Math.max(0, pointsRequired - rankPoints),
            met: hasEnoughPoints
        };
    
        // 🔧 CRITICAL FIX: Check if user is actually rank locked
        const isRankLocked = this.isUserRankLocked(user);
        
        if (isRankLocked) {
            const lockStatus = this.checkRankLockExpiry(user);
            const lockExpiry = new Date(user.rankLockUntil);
            const estTime = lockExpiry.toLocaleString('en-US', { 
                timeZone: 'America/New_York',
                cycleday: 'short',
                month: 'short', 
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short'
            });
            
            console.log(`🔒 User ${user.username} is rank locked until ${estTime}`);
            
            return {
                eligible: false,
                reason: `Rank locked until ${estTime}`,
                rankLocked: true,
                daysRemaining: lockStatus.daysRemaining,
                hoursRemaining: lockStatus.hoursRemaining,
                lockExpiryFormatted: estTime,
                discordTimestamp: lockStatus.discordTimestamp,
                currentRank,
                nextRank,
                requirements
            };
        }
    
        // For Executive+ ranks (hand-picked only)
        if (nextRank.level >= 11) {
            return {
                eligible: false,
                reason: 'Executive ranks are hand-picked only',
                handPickedOnly: true,
                currentRank,
                nextRank,
                requirements
            };
        }
        
        console.log(`📊 Eligibility check for ${user.username}: ${rankPoints}/${pointsRequired} rank points, locked: false, eligible: ${hasEnoughPoints}`);
        
        return {
            eligible: hasEnoughPoints,
            reason: hasEnoughPoints ? 'Ready for promotion!' : `Need ${pointsRequired - rankPoints} more rank points`,
            currentRank,
            nextRank,
            requirements
        };
    }

    // 🔧 NEW: Simple check if user is currently rank locked
    static isUserRankLocked(user) {
        // No rank lock set = not locked
        if (!user.rankLockUntil) {
            return false;
        }
        
        // Check if lock has expired
        const nowUTC = new Date();
        const lockExpiryUTC = new Date(user.rankLockUntil);
        
        // If lock expiry is in the future, user is locked
        return lockExpiryUTC > nowUTC;
    }

    // Format rank display with emoji
    static formatRank(user) {
        const rank = this.getRankByLevel(user.rankLevel || 1);
        return rank.emoji ? `${rank.emoji} ${rank.name}` : rank.name;
    }

    // Get just the emoji for a rank level
    static getRankEmoji(level) {
        const rank = this.getRankByLevel(level);
        return rank.emoji || '';
    }

    // Get all ranks (for display/reference)
    static getAllRanks() {
        return this.ranks;
    }

    // Check if rank is elite or higher (has emoji)
    static isEliteOrHigher(level) {
        return level >= 6; // Elite Operator and above
    }

    // Check if rank is executive or higher (hand-picked)
    static isExecutiveOrHigher(level) {
        return level >= 11; // Commanding Officer and above
    }

    // Calculate rank progress percentage
    static getRankProgress(user) {
        const eligibility = this.checkPromotionEligibility(user);
        
        if (eligibility.maxRank) return { percentage: 100, isMaxRank: true };
        if (eligibility.handPickedOnly) return { percentage: 100, isHandPicked: true };
        
        // 🔧 FIXED: Always return requirements if they exist
        if (!eligibility.requirements) {
            // Fallback for edge cases
            return { 
                percentage: 0,
                current: 0,
                required: 0,
                remaining: 0
            };
        }
        
        const percentage = Math.min(100, 
            (eligibility.requirements.currentPoints / eligibility.requirements.pointsRequired) * 100
        );
        
        return { 
            percentage: Math.round(percentage),
            current: eligibility.requirements.currentPoints,
            required: eligibility.requirements.pointsRequired,
            remaining: eligibility.requirements.pointsRemaining
        };
    }
    

    // Create progress bar for rank progression
    static createRankProgressBar(user, length = 10) {
        const progress = this.getRankProgress(user);
        
        if (progress.isMaxRank) return '[████████████] MAX RANK';
        if (progress.isHandPicked) return '[████████████] HAND-PICKED';
        
        // 🔧 FIXED: Ensure we have valid numbers
        const currentPoints = progress.current || 0;
        const requiredPoints = progress.required || 1; // Avoid division by zero
        const percentage = progress.percentage || 0;
        
        const filledLength = Math.floor((percentage / 100) * length);
        const emptyLength = length - filledLength;
        
        const filledBar = '█'.repeat(Math.max(0, filledLength));
        const emptyBar = '░'.repeat(Math.max(0, emptyLength));
        
        return `[${filledBar}${emptyBar}] ${currentPoints}/${requiredPoints} pts (${percentage}%)`;
    }

    // Apply rank lock when user gets promoted
    static applyRankLock(user, newRankLevel) {
        const newRank = this.getRankByLevel(newRankLevel);
        
        if (newRank.rankLockDays > 0) {
            // FIXED: Use UTC and set to a specific time (6 AM UTC) for consistency
            const lockDate = new Date();
            lockDate.setUTCDate(lockDate.getUTCDate() + newRank.rankLockDays);
            lockDate.setUTCHours(6, 0, 0, 0); // 6 AM UTC for consistency with automation
            
            console.log(`🔒 TIMEZONE: Applied ${newRank.rankLockDays} day lock until ${lockDate.toISOString()} (${lockDate.toLocaleString('en-US', { timeZone: 'America/New_York' })} EST)`);
            
            return {
                locked: true,
                lockUntil: lockDate,
                lockDays: newRank.rankLockDays
            };
        }
        
        return { locked: false };
    }

    // 🔧 FIXED: Check if user's rank lock has expired (for automation/notifications)
    static checkRankLockExpiry(user) {
        if (!user.rankLockUntil) {
            console.log(`🔓 User ${user.username} has no rank lock set`);
            return { 
                expired: true,  // 🔧 FIXED: No lock = considered expired (available)
                needsNotification: false  // No notification needed
            };
        }
        
        // FIXED: Use UTC for consistent timezone handling
        const nowUTC = new Date();
        const lockExpiryUTC = new Date(user.rankLockUntil);
        
        console.log(`🕒 TIMEZONE DEBUG: ${user.username} - Now: ${nowUTC.toISOString()}, Lock expires: ${lockExpiryUTC.toISOString()}`);
        
        const hasExpired = lockExpiryUTC <= nowUTC;
        
        if (hasExpired) {
            const wasNotified = user.rankLockNotified;
            console.log(`🔓 User ${user.username} rank lock has EXPIRED, notified: ${wasNotified}`);
            return {
                expired: true,
                needsNotification: !wasNotified
            };
        }
        
        // Lock is still active
        const timeDiffMs = lockExpiryUTC.getTime() - nowUTC.getTime();
        const hoursRemaining = Math.ceil(timeDiffMs / (1000 * 60 * 60));
        const daysRemaining = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
        
        // Discord timestamp for user display
        const discordTimestamp = Math.floor(lockExpiryUTC.getTime() / 1000);
        
        // Formatted EST time for notifications/logs
        const estTime = lockExpiryUTC.toLocaleString('en-US', { 
            timeZone: 'America/New_York',
            cycleday: 'short',
            month: 'short', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
        });
        
        console.log(`🔒 User ${user.username} rank lock active for ${daysRemaining} more days (${hoursRemaining} hours) - Expires: ${estTime}`);
        
        return {
            expired: false,
            daysRemaining,
            hoursRemaining,
            exactExpiryTime: lockExpiryUTC,
            discordTimestamp,
            estTimeFormatted: estTime
        };
    }
}

module.exports = RankSystem;