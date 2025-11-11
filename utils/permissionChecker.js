// utils/permissionChecker.js - MRB permission system
const ROLES = {
    // ADMIN LEVEL (Generals) - TOP TIER
    GENERALS: 'MRB | GENERALS',
    ADMIN: '.', // Period role - legacy admin access
    
    // HR LEVEL (Commanding Officers) - LIMITED ADMIN
    COMMANDING_OFFICER: 'MRB | COMMANDING OFFICER',
    
    // OPERATOR LEVEL (All MRB Members)
    MRB_MEMBER: '[ Motorized Rifle Brigade ]'
};

// Role hierarchy levels (higher number = more permissions)
const ROLE_LEVELS = {
    // ADMIN LEVEL (GENERALS - Full Access)
    [ROLES.GENERALS]: 100,
    [ROLES.ADMIN]: 100, // Period role same level as GENERALS
    
    // HR LEVEL (Commanding Officers - Limited Admin)
    [ROLES.COMMANDING_OFFICER]: 50,
    
    // OPERATOR LEVEL
    [ROLES.MRB_MEMBER]: 10
};

class PermissionChecker {
    // ===== CORE PERMISSION FUNCTIONS =====
    
    // Get user's highest role level
    static getUserRoleLevel(member) {
        if (!member || !member.roles) return 0;
        
        let highestLevel = 0;
        member.roles.cache.forEach(role => {
            const level = ROLE_LEVELS[role.name] || 0;
            if (level > highestLevel) {
                highestLevel = level;
            }
        });
        
        return highestLevel;
    }

    // Check if user has a specific role
    static hasRole(member, roleName) {
        if (!member || !member.roles) return false;
        return member.roles.cache.some(role => role.name === roleName);
    }

    // Get user's highest role name (for display purposes)
    static getUserHighestRoleName(member) {
        if (!member || !member.roles) return 'No Role';
        
        let highestLevel = 0;
        let highestRoleName = 'No Role';
        
        member.roles.cache.forEach(role => {
            const level = ROLE_LEVELS[role.name] || 0;
            if (level > highestLevel) {
                highestLevel = level;
                highestRoleName = role.name;
            }
        });
        
        return highestRoleName;
    }

    // ===== PERMISSION LEVEL CHECKS =====

    // Check if user is GENERALS (top-tier admin - full access)
    static isGenerals(member) {
        return this.hasRole(member, ROLES.GENERALS) || this.hasRole(member, ROLES.ADMIN);
    }

    // Check if user is Admin (GENERALS level - for backward compatibility)
    static isAdmin(member) {
        return this.isGenerals(member);
    }

    // Check if user is HR+ (Commanding Officer+)
    static isHRPlus(member) {
        return this.getUserRoleLevel(member) >= 50;
    }
    
    // Check if user is Commanding Officer (not GENERALS)
    static isCommandingOfficer(member) {
        return this.hasRole(member, ROLES.COMMANDING_OFFICER) && !this.isGenerals(member);
    }

    // Check if user is MRB Member
    static isMRBMember(member) {
        return this.getUserRoleLevel(member) >= 10;
    }

    // ===== COMMAND PERMISSION CHECKS =====

    // BASIC PERMISSIONS (All MRB members)
    static canSubmitLogs(member) {
        return this.isMRBMember(member);
    }

    static canViewOwnStats(member) {
        return this.isMRBMember(member);
    }

    static canViewLeaderboard(member) {
        return this.isMRBMember(member);
    }

    // HR+ PERMISSIONS (Commanding Officers+ - with limits)
    static canManagePoints(member) {
        return this.isHRPlus(member);
    }

    static canViewLogs(member) {
        return this.isHRPlus(member);
    }

    static canViewScreenshots(member) {
        return this.isHRPlus(member);
    }

    static canViewOtherStats(member) {
        return this.isHRPlus(member);
    }
    
    // Commanding Officers can promote up to Warrant Officer (Level 8)
    static canPromoteToRank(member, targetRankLevel) {
        if (this.isGenerals(member)) {
            return true; // GENERALS can promote to any rank
        }
        if (this.isCommandingOfficer(member)) {
            return targetRankLevel <= 8; // COs can only promote up to Warrant Officer
        }
        return false;
    }

    // GENERALS-ONLY PERMISSIONS (Full admin access)
    static canDeleteUsers(member) {
        return this.isGenerals(member); // Only GENERALS can delete
    }
    
    static canPromoteOfficers(member) {
        return this.isGenerals(member); // Only GENERALS can promote to officer ranks (9+)
    }
    
    static canOverrideLimits(member) {
        return this.isGenerals(member); // Only GENERALS can bypass safeguards
    }
    
    static canViewAllAudits(member) {
        return this.isGenerals(member); // Only GENERALS see all audit logs
    }
    
    static canUndoActions(member) {
        return this.isGenerals(member); // Only GENERALS can undo HR actions
    }

    static canResetCycle(member) {
        return this.isGenerals(member); // Only GENERALS can reset cycles
    }

    static canManageUsers(member) {
        return this.isGenerals(member); // Only GENERALS can manage users (delete, etc)
    }

    static canManagePromotions(member) {
        return this.isHRPlus(member); // Both can promote (but COs have limits)
    }

    static canForcePromotions(member) {
        return this.isGenerals(member); // Only GENERALS can force promote
    }

    // ADMIN PERMISSIONS (GENERALS only)
    static canUseAdminCommands(member) {
        return this.isGenerals(member);
    }

    static canManageAutomation(member) {
        return this.isGenerals(member);
    }

    // ===== LEGACY COMPATIBILITY =====
    
    static canManageSystem(member) {
        return this.isHRPlus(member);
    }

    static isHR(member) {
        return this.isHRPlus(member);
    }

    // ===== ERROR MESSAGE GENERATORS =====

    static getPermissionErrorMessage(requiredLevel) {
        switch (requiredLevel) {
            case 'generals':
                return '🚫 Only **MRB | GENERALS** can use this command!';
            case 'admin':
                return '🚫 Only **Generals** (MRB | GENERALS or .) can use this command!';
            case 'hr':
                return '🚫 Only **Commanding Officers** or higher can use this command!';
            case 'member':
                return '🚫 You need to be an **MRB Member** to use this command!';
            default:
                return '🚫 You don\'t have permission to use this command!';
        }
    }

    // ===== DEBUGGING/ADMIN FUNCTIONS =====

    static getUserPermissionInfo(member) {
        if (!member || !member.roles) {
            return {
                hasPermissions: false,
                roleLevel: 0,
                highestRole: 'No Role',
                permissions: {
                    isGenerals: false,
                    isAdmin: false,
                    isCommandingOfficer: false,
                    isHRPlus: false,
                    isMRBMember: false
                }
            };
        }

        const roleLevel = this.getUserRoleLevel(member);
        const highestRole = this.getUserHighestRoleName(member);
        
        return {
            hasPermissions: roleLevel > 0,
            roleLevel,
            highestRole,
            permissions: {
                isGenerals: this.isGenerals(member),
                isAdmin: this.isAdmin(member),
                isCommandingOfficer: this.isCommandingOfficer(member),
                isHRPlus: this.isHRPlus(member),
                isMRBMember: this.isMRBMember(member)
            }
        };
    }

    static getRoleHierarchy() {
        return {
            'GENERALS LEVEL (Full Admin)': {
                roles: [ROLES.GENERALS, ROLES.ADMIN],
                level: 100,
                access: 'ALL commands - delete users, promote officers, manage automation, override limits'
            },
            'COMMANDING OFFICER LEVEL (Limited Admin)': {
                roles: [ROLES.COMMANDING_OFFICER],
                level: 50,
                access: 'Manage points (with limits), promote up to Warrant Officer, view audits (own actions)'
            },
            'OPERATOR LEVEL (MRB Members)': {
                roles: [ROLES.MRB_MEMBER],
                level: 10,
                access: 'Submit events, view stats, view leaderboard'
            }
        };
    }

    static validateRoles(guild) {
        const requiredRoles = Object.values(ROLES);
        const existingRoles = guild.roles.cache.map(role => role.name);
        const missingRoles = requiredRoles.filter(role => !existingRoles.includes(role));
        
        return {
            valid: missingRoles.length === 0,
            missingRoles,
            existingRoles: requiredRoles.filter(role => existingRoles.includes(role))
        };
    }
}

module.exports = PermissionChecker;