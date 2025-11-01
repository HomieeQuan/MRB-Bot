// utils/rateLimiter.js - ENHANCED with user feedback
const cooldowns = new Map();

class RateLimiter {
    static checkCooldown(userId, commandName, seconds) {
        const key = `${userId}-${commandName}`;
        const now = Date.now();
        
        if (cooldowns.has(key)) {
            const expirationTime = cooldowns.get(key) + (seconds * 1000);
            
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return { 
                    allowed: false, 
                    timeLeft,
                    // 🔧 NEW: User-friendly message
                    message: `⏰ Please wait ${timeLeft} second${timeLeft > 1 ? 's' : ''} before using \`/${commandName}\` again.`
                };
            }
        }
        
        cooldowns.set(key, now);
        
        // Cleanup old entries periodically
        if (Math.random() < 0.01) {
            this.cleanup();
        }
        
        return { allowed: true };
    }
    
    static cleanup() {
        const now = Date.now();
        const maxAge = 300000; // 5 minutes
        
        let cleaned = 0;
        for (const [key, timestamp] of cooldowns.entries()) {
            if (now - timestamp > maxAge) {
                cooldowns.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            console.log(`🧹 Cleaned up ${cleaned} expired cooldowns`);
        }
    }
    
    static reset(userId, commandName) {
        const key = `${userId}-${commandName}`;
        cooldowns.delete(key);
    }
    
    // 🔧 NEW: Get remaining cooldown time for a user/command
    static getRemainingTime(userId, commandName) {
        const key = `${userId}-${commandName}`;
        
        if (!cooldowns.has(key)) {
            return 0;
        }
        
        const now = Date.now();
        const cooldownStart = cooldowns.get(key);
        const timeLeft = Math.max(0, Math.ceil((cooldownStart + 5000 - now) / 1000));
        
        return timeLeft;
    }
    
    // 🔧 NEW: Get cooldown stats (for debugging)
    static getStats() {
        return {
            activeCooldowns: cooldowns.size,
            oldestCooldown: cooldowns.size > 0 ? 
                Math.floor((Date.now() - Math.min(...cooldowns.values())) / 1000) : 0
        };
    }
}

module.exports = RateLimiter;