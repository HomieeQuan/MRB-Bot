// utils/pointCalculator.js - MRB event points with streak bonuses
class PointCalculator {
    // MRB event point values
    static eventPoints = {
        'mrb_mass_patrol': 4,
        'solo_patrol': 1,              // Per 30 min
        'combat_training': 2,
        'gang_deployment': 4,
        'vip_protection': 4,
        'warrant_execution': 10,
        'mrb_inspection': 3,
        'mrb_tryout_public': 4,
        'mrb_tryout_private': 3,
        'war': 20                      // NEW: War event
    };

    // Human-readable names for each event type
    static eventNames = {
        'mrb_mass_patrol': 'MRB Mass Patrol',
        'solo_patrol': 'Solo Patrol',
        'combat_training': 'Combat Training',
        'gang_deployment': 'Gang Deployment',
        'vip_protection': 'VIP Protection',
        'warrant_execution': 'Warrant Execution',
        'mrb_inspection': 'MRB Inspection',
        'mrb_tryout_public': 'MRB Tryout (Public)',
        'mrb_tryout_private': 'MRB Tryout (Private)',
        'war': 'War Event'             // NEW: War event name
    };

    // Calculate base points for an event (without streak bonus)
    static calculateBasePoints(eventType) {
        return this.eventPoints[eventType] || 0;
    }

    // Calculate points for an event with optional streak bonus
    static calculatePoints(eventType, streakBonus = 0) {
        const basePoints = this.calculateBasePoints(eventType);
        
        if (streakBonus > 0) {
            const bonusMultiplier = 1 + (streakBonus / 100);
            return Math.round(basePoints * bonusMultiplier);
        }
        
        return basePoints;
    }

    // Calculate total points with quantity multiplier
    static calculateTotalPoints(eventType, quantity = 1, streakBonus = 0) {
        const pointsPerEvent = this.calculatePoints(eventType, streakBonus);
        return pointsPerEvent * quantity;
    }

    // Get human-readable name for an event type
    static getEventName(eventType) {
        return this.eventNames[eventType] || eventType;
    }

    // Get all available event types (for command choices)
    static getAllEventTypes() {
        return Object.keys(this.eventPoints);
    }

    // Calculate detailed breakdown for display purposes
    static getPointsBreakdown(eventType, quantity = 1, streakBonus = 0) {
        const basePoints = this.calculateBasePoints(eventType);
        const bonusMultiplier = streakBonus > 0 ? (1 + (streakBonus / 100)) : 1;
        const pointsPerEvent = Math.round(basePoints * bonusMultiplier);
        const totalPoints = pointsPerEvent * quantity;
        
        return {
            basePoints,
            streakBonus,
            bonusMultiplier,
            pointsPerEvent,
            quantity,
            totalPoints,
            hasStreakBonus: streakBonus > 0
        };
    }

    // Format points breakdown for display
    static formatPointsBreakdown(breakdown) {
        let explanation = `${breakdown.basePoints} base`;
        
        if (breakdown.hasStreakBonus) {
            explanation += ` × ${breakdown.bonusMultiplier.toFixed(2)} (${breakdown.streakBonus}% streak bonus) = ${breakdown.pointsPerEvent} pts`;
        } else {
            explanation += ` = ${breakdown.pointsPerEvent} pts`;
        }
        
        if (breakdown.quantity > 1) {
            explanation += ` × ${breakdown.quantity} events = ${breakdown.totalPoints} total pts`;
        }
        
        return explanation;
    }

    // Get streak bonus display text
    static getStreakBonusText(streakBonus) {
        if (streakBonus === 0) return 'No streak bonus';
        return `🔥 ${streakBonus}% Streak Bonus Active!`;
    }
}

module.exports = PointCalculator;