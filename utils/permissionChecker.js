// utils/permissionChecker.js - MRB permission system
const ROLES = {
    // ADMIN LEVEL (Generals)
    ADMIN: '.', // Period role - full access
    
    // HR LEVEL (Commanding Officers)
    COMMANDING_OFFICER: 'MRB | COMMANDING OFFICER',
    
    // OPERATOR LEVEL (All MRB Members)
    MRB_MEMBER: '[ Motorized Rifle Brigade ]'
};

// Role hierarchy levels (higher number = more permissions)
const ROLE_LEVELS = {
    // ADMIN LEVEL
    [ROLES.ADMIN]: 100,
    
    // HR LEVEL
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

    // Check if user is Admin (General)
    static isAdmin(member) {
        return this.getUserRoleLevel(member) >= 100;
    }

    // Check if user is HR+ (Commanding Officer+)
    static isHRPlus(member) {
        return this.getUserRoleLevel(member) >= 50;
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

    // HR+ PERMISSIONS (Commanding Officers)
    static canManagePoints(member) {
        return this.isHRPlus(member);
    }

    static canViewLogs(member) {
        return this.isHRPlus(member);
    }

    static canViewScreenshots(member) {
        return this.isHRPlus(member);
    }

    static canResetCycle(member) {
        return this.isHRPlus(member);
    }

    static canManageUsers(member) {
        return this.isHRPlus(member);
    }

    static canManagePromotions(member) {
        return this.isHRPlus(member);
    }

    static canForcePromotions(member) {
        return this.isHRPlus(member);
    }

    static canViewOtherStats(member) {
        return this.isHRPlus(member);
    }

    // ADMIN PERMISSIONS (Generals only)
    static canUseAdminCommands(member) {
        return this.isAdmin(member);
    }

    static canManageAutomation(member) {
        return this.isAdmin(member);
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
            case 'admin':
                return '🚫 Only **Generals** (.) can use this command!';
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
                    isAdmin: false,
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
                isAdmin: this.isAdmin(member),
                isHRPlus: this.isHRPlus(member),
                isMRBMember: this.isMRBMember(member)
            }
        };
    }

    static getRoleHierarchy() {
        return {
            'ADMIN LEVEL (Generals)': {
                roles: [ROLES.ADMIN],
                level: 100,
                access: 'ALL commands including admin tools and automation'
            },
            'HR LEVEL (Commanding Officers)': {
                roles: [ROLES.COMMANDING_OFFICER],
                level: 50,
                access: 'HR functions, point management, user management, promotions'
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