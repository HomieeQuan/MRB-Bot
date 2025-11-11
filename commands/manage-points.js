// commands/manage-points.js - 🛡️ PHASE 3: Enhanced with safeguards
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const HRController = require('../controllers/hrController');
const PermissionChecker = require('../utils/permissionChecker');
const MRBUser = require('../models/MRBUser');

// 🛡️ PHASE 3 CONFIGURATION
const APPROVAL_THRESHOLD = 50; // Points requiring approval
const RATE_LIMIT_MAX = 10; // Max actions per hour for COs
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// In-memory rate limiting (simple approach)
const rateLimitMap = new Map(); // userId -> [timestamps]

// Pending approval requests (simple in-memory)
const pendingApprovals = new Map(); // messageId -> { interaction, targetUser, action, amount, reason }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage-points')
        .setDescription('HR command to manage user points')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to manage points for')
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName('action')
                .setDescription('Action to perform')
                .setRequired(true)
                .addChoices(
                    { name: 'Add Points', value: 'add' },
                    { name: 'Remove Points', value: 'remove' },
                    { name: 'Set Points', value: 'set' },
                    { name: '🚨 Remove ALL Points', value: 'remove_all' }
                )
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Reason for the point adjustment')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of points (not needed for remove_all)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(1000)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const action = interaction.options.getString('action');
        const reason = interaction.options.getString('reason');
        const amount = interaction.options.getInteger('amount');

        // Validate amount for actions that need it
        if (action !== 'remove_all' && !amount) {
            return await interaction.reply({
                content: '❌ **Error:** Amount is required for add, remove, and set actions.',
                ephemeral: true
            });
        }

        const finalAmount = action === 'remove_all' ? 0 : amount;

        // 🛡️ PHASE 3: Permission checks
        if (!PermissionChecker.canManageSystem(interaction.member)) {
            return await interaction.reply({
                content: '🚫 **Error:** You need HR permissions to manage points!',
                ephemeral: true
            });
        }

        // 🛡️ PHASE 3: Rate limiting for Commanding Officers
        const isGenerals = PermissionChecker.isGenerals(interaction.member);
        const isPeriod = interaction.member.roles.cache.some(role => role.name === '.');
        
        if (!isGenerals && !isPeriod) {
            const rateLimitResult = this.checkRateLimit(interaction.user.id);
            if (rateLimitResult.limited) {
                // Send alert about rate limit hit
                await this.sendRateLimitAlert(interaction, rateLimitResult.count);
                
                return await interaction.reply({
                    content: `⏱️ **Rate Limit Exceeded**\n\nYou've made ${rateLimitResult.count} point adjustments in the last hour.\n**Limit:** ${RATE_LIMIT_MAX} per hour\n**Try again in:** ${Math.ceil(rateLimitResult.waitMinutes)} minutes`,
                    ephemeral: true
                });
            }
            
            // Record this action
            this.recordAction(interaction.user.id);
        }

        // 🛡️ PHASE 3: Approval system for large changes
        const requiresApproval = Math.abs(finalAmount) > APPROVAL_THRESHOLD && !isGenerals && !isPeriod;
        
        if (requiresApproval) {
            await this.createApprovalRequest(interaction, targetUser, action, finalAmount, reason);
            return;
        }

        // 🛡️ PHASE 3: Send alert for large changes (GENERALS/Period)
        if (Math.abs(finalAmount) > APPROVAL_THRESHOLD || action === 'remove_all') {
            await this.sendAlert(interaction, targetUser, action, finalAmount, reason);
        }

        // Execute the point management
        await HRController.managePoints(interaction, targetUser, action, finalAmount, reason);
    },

    // 🛡️ RATE LIMITING SYSTEM
    checkRateLimit(userId) {
        const now = Date.now();
        const userActions = rateLimitMap.get(userId) || [];
        
        // Remove old actions outside the window
        const recentActions = userActions.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
        rateLimitMap.set(userId, recentActions);
        
        if (recentActions.length >= RATE_LIMIT_MAX) {
            const oldestAction = Math.min(...recentActions);
            const waitTime = (oldestAction + RATE_LIMIT_WINDOW) - now;
            return {
                limited: true,
                count: recentActions.length,
                waitMinutes: waitTime / (60 * 1000)
            };
        }
        
        return { limited: false, count: recentActions.length };
    },

    recordAction(userId) {
        const now = Date.now();
        const userActions = rateLimitMap.get(userId) || [];
        userActions.push(now);
        rateLimitMap.set(userId, userActions);
    },

    // 🛡️ APPROVAL REQUEST SYSTEM
    async createApprovalRequest(interaction, targetUser, action, amount, reason) {
        // Respond immediately to avoid timeout
        await interaction.reply({
            content: `⏳ **Creating approval request...**`,
            ephemeral: true
        });

        try {
            // Get target user's current points
            const dbUser = await MRBUser.findOne({ discordId: targetUser.id });
            const currentPoints = dbUser ? dbUser.biweeklyPoints : 0;

            // Create approval request embed
            const approvalEmbed = new EmbedBuilder()
                .setColor('#ffa500')
                .setTitle('📝 Approval Request - Large Point Adjustment')
                .setDescription('A Commanding Officer has requested a large point adjustment that requires GENERALS approval.')
                .addFields(
                    { name: '👤 Requested By', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                    { name: '🎯 Target User', value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
                    { name: '⚡ Action', value: this.getActionName(action), inline: true },
                    { name: '💰 Amount', value: `${amount} points`, inline: true },
                    { name: '📊 Current Points', value: `${currentPoints} points`, inline: true },
                    { name: '📈 After Change', value: this.calculateNewPoints(action, currentPoints, amount), inline: true },
                    { name: '📋 Reason', value: reason, inline: false }
                )
                .setFooter({ text: '✅ React to approve | ❌ React to deny | Expires in 24 hours' })
                .setTimestamp();

            // Send to generals-alerts channel
            const channelId = process.env.GENERALS_ALERT_CHANNEL_ID;
            const channel = await interaction.client.channels.fetch(channelId);
            
            if (!channel) {
                return await interaction.editReply({
                    content: '❌ **Error:** Generals alert channel not configured!',
                    ephemeral: true
                });
            }

            const approvalMessage = await channel.send({ embeds: [approvalEmbed] });
            
            // Add reactions
            await approvalMessage.react('✅');
            await approvalMessage.react('❌');

            // Store pending approval
            pendingApprovals.set(approvalMessage.id, {
                requesterId: interaction.user.id,
                requesterUsername: interaction.user.username,
                targetUser,
                action,
                amount,
                reason,
                timestamp: Date.now()
            });

            // Set up reaction collector
            const filter = (reaction, user) => {
                console.log(`🔍 Reaction detected: ${reaction.emoji.name} from ${user.username} (bot: ${user.bot})`);
                
                if (user.bot) {
                    console.log('   ❌ Filtered out: user is a bot');
                    return false;
                }
                
                if (!['✅', '❌'].includes(reaction.emoji.name)) {
                    console.log(`   ❌ Filtered out: emoji ${reaction.emoji.name} not in allowed list`);
                    return false;
                }
                
                const member = interaction.guild.members.cache.get(user.id);
                if (!member) {
                    console.log('   ❌ Filtered out: member not found in cache');
                    return false;
                }
                
                console.log(`   📋 Member roles: ${member.roles.cache.map(r => r.name).join(', ')}`);
                
                // Check if user is GENERALS or Period role
                const isGenerals = PermissionChecker.isGenerals(member);
                const isPeriod = member.roles.cache.some(role => role.name === '.');
                
                const canApprove = isGenerals || isPeriod;
                console.log(`   🔍 isGenerals=${isGenerals}, isPeriod=${isPeriod}, canApprove=${canApprove}`);
                
                if (!canApprove) {
                    console.log('   ❌ Filtered out: user does not have GENERALS or Period role');
                }
                
                return canApprove;
            };

            const collector = approvalMessage.createReactionCollector({ 
                filter, 
                time: 24 * 60 * 60 * 1000, // 24 hours
                max: 1 
            });
            
            console.log(`📝 Approval request created, waiting for reactions...`);

            collector.on('collect', async (reaction, user) => {
                console.log(`✅ Reaction collected: ${reaction.emoji.name} from ${user.username}`);
                
                const approval = pendingApprovals.get(approvalMessage.id);
                if (!approval) {
                    console.log('❌ No approval found in pending map');
                    return;
                }
                
                // Get action name for display
                const actionNames = {
                    'add': '➕ Add Points',
                    'remove': '➖ Remove Points',
                    'set': '🔧 Set Points',
                    'remove_all': '🚨 REMOVE ALL POINTS'
                };
                const actionName = actionNames[approval.action] || approval.action;

                if (reaction.emoji.name === '✅') {
                    console.log('✅ Processing APPROVAL...');
                    
                    // Approved - execute the action
                    const updatedEmbed = EmbedBuilder.from(approvalEmbed)
                        .setColor('#00ff00')
                        .setTitle('✅ Approval Request - APPROVED')
                        .addFields({ name: '✅ Approved By', value: `<@${user.id}> (${user.username})`, inline: false });
                    
                    await approvalMessage.edit({ embeds: [updatedEmbed] });
                    console.log('✅ Updated approval message');
                    
                    // Notify the requester via DM
                    try {
                        const requester = await interaction.client.users.fetch(approval.requesterId);
                        await requester.send({
                            embeds: [new EmbedBuilder()
                                .setColor('#00ff00')
                                .setTitle('✅ Your Approval Request Was Approved!')
                                .setDescription(`Your request for **${approval.amount} points** (${actionName}) for <@${approval.targetUser.id}> has been approved and executed.`)
                                .addFields(
                                    { name: '✅ Approved By', value: `${user.username}`, inline: true },
                                    { name: '📋 Reason', value: approval.reason, inline: false }
                                )
                                .setTimestamp()
                            ]
                        });
                        console.log(`✅ Sent approval DM to ${approval.requesterUsername}`);
                    } catch (dmError) {
                        console.log('❌ Could not DM requester about approval:', dmError.message);
                    }
                    
                    console.log('🔄 Executing point management...');
                    
                    // Create a mock interaction to pass to HRController
                    const mockInteraction = {
                        ...interaction,
                        user: interaction.client.users.cache.get(approval.requesterId),
                        member: interaction.guild.members.cache.get(approval.requesterId),
                        reply: async (options) => {
                            // Send confirmation to channel
                            await channel.send({
                                content: `✅ **Action Executed:** <@${approval.requesterId}>'s request was approved by <@${user.id}>`,
                                embeds: options.embeds || []
                            });
                        }
                    };

                    await HRController.managePoints(mockInteraction, approval.targetUser, approval.action, approval.amount, approval.reason);
                    console.log('✅ Point management completed');
                    
                } else if (reaction.emoji.name === '❌') {
                    console.log('❌ Processing DENIAL...');
                    
                    // Denied
                    const updatedEmbed = EmbedBuilder.from(approvalEmbed)
                        .setColor('#ff0000')
                        .setTitle('❌ Approval Request - DENIED')
                        .addFields({ name: '❌ Denied By', value: `<@${user.id}> (${user.username})`, inline: false });
                    
                    await approvalMessage.edit({ embeds: [updatedEmbed] });
                    await channel.send(`❌ **Request Denied:** <@${approval.requesterId}>'s point adjustment was denied by <@${user.id}>`);
                    console.log('❌ Updated denial message and sent channel notification');
                    
                    // Notify the requester via DM
                    try {
                        console.log(`📬 Attempting to send denial DM to ${approval.requesterId}...`);
                        const requester = await interaction.client.users.fetch(approval.requesterId);
                        await requester.send({
                            embeds: [new EmbedBuilder()
                                .setColor('#ff0000')
                                .setTitle('❌ Your Approval Request Was Denied')
                                .setDescription(`Your request for **${approval.amount} points** (${actionName}) for <@${approval.targetUser.id}> was denied.`)
                                .addFields(
                                    { name: '❌ Denied By', value: `${user.username}`, inline: true },
                                    { name: '📋 Original Reason', value: approval.reason, inline: false }
                                )
                                .setTimestamp()
                            ]
                        });
                        console.log(`✅ Sent denial DM to ${approval.requesterUsername}`);
                    } catch (dmError) {
                        console.log('❌ Could not DM requester about denial:', dmError.message);
                    }
                }

                pendingApprovals.delete(approvalMessage.id);
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    const approval = pendingApprovals.get(approvalMessage.id);
                    if (approval) {
                        const expiredEmbed = EmbedBuilder.from(approvalEmbed)
                            .setColor('#808080')
                            .setTitle('⏰ Approval Request - EXPIRED')
                            .setFooter({ text: 'This request expired after 24 hours' });
                        
                        approvalMessage.edit({ embeds: [expiredEmbed] }).catch(() => {});
                        
                        // Get action name
                        const actionNames = {
                            'add': '➕ Add Points',
                            'remove': '➖ Remove Points',
                            'set': '🔧 Set Points',
                            'remove_all': '🚨 REMOVE ALL POINTS'
                        };
                        const actionName = actionNames[approval.action] || approval.action;
                        
                        // Notify the requester via DM
                        interaction.client.users.fetch(approval.requesterId).then(requester => {
                            requester.send({
                                embeds: [new EmbedBuilder()
                                    .setColor('#808080')
                                    .setTitle('⏰ Your Approval Request Expired')
                                    .setDescription(`Your request for **${approval.amount} points** (${actionName}) for <@${approval.targetUser.id}> expired after 24 hours without a response.`)
                                    .addFields(
                                        { name: '📋 Original Reason', value: approval.reason, inline: false },
                                        { name: '💡 Next Steps', value: 'You can submit a new request if still needed.', inline: false }
                                    )
                                    .setTimestamp()
                                ]
                            }).then(() => {
                                console.log(`✅ Sent expiration DM to ${approval.requesterUsername}`);
                            }).catch((err) => {
                                console.log('❌ Could not DM requester about expiration:', err.message);
                            });
                        }).catch(() => {});
                        
                        pendingApprovals.delete(approvalMessage.id);
                    }
                }
            });

            await interaction.editReply({
                content: `📝 **Approval Request Created**\n\nYour request for a ${amount} point ${action} has been sent to GENERALS for approval.\n\n**Request sent to:** <#${channelId}>\n**Expires in:** 24 hours\n\nYou'll be notified once it's reviewed.`
            });

        } catch (error) {
            console.error('❌ Error creating approval request:', error);
            await interaction.editReply({
                content: '❌ **Error:** Failed to create approval request. Please try again.'
            });
        }
    },

    // 🛡️ ALERT SYSTEM
    async sendAlert(interaction, targetUser, action, amount, reason) {
        try {
            const channelId = process.env.GENERALS_ALERT_CHANNEL_ID;
            if (!channelId) {
                console.log('⚠️ GENERALS_ALERT_CHANNEL_ID not configured - alert not sent');
                return;
            }

            console.log(`🔔 Sending alert to channel: ${channelId}`);
            const channel = await interaction.client.channels.fetch(channelId);
            if (!channel) {
                console.log('❌ Alert channel not found');
                return;
            }

            // Get current points
            const dbUser = await MRBUser.findOne({ discordId: targetUser.id });
            const currentPoints = dbUser ? dbUser.biweeklyPoints : 0;

            const severity = Math.abs(amount) > 100 || action === 'remove_all' ? '#ff0000' : '#ffa500';

            const alertEmbed = new EmbedBuilder()
                .setColor(severity)
                .setTitle('🔔 Large Point Adjustment Alert')
                .addFields(
                    { name: '👤 Performed By', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                    { name: '🎯 Target User', value: `<@${targetUser.id}> (${targetUser.username})`, inline: true },
                    { name: '⚡ Action', value: this.getActionName(action), inline: true },
                    { name: '💰 Amount', value: action === 'remove_all' ? 'ALL POINTS' : `${amount} points`, inline: true },
                    { name: '📊 Before', value: `${currentPoints} points`, inline: true },
                    { name: '📈 After', value: this.calculateNewPoints(action, currentPoints, amount), inline: true },
                    { name: '📋 Reason', value: reason, inline: false }
                )
                .setFooter({ text: 'Automated security alert from MRB-Bot' })
                .setTimestamp();

            await channel.send({ embeds: [alertEmbed] });
            console.log('✅ Alert sent successfully');
        } catch (error) {
            console.error('❌ Error sending alert:', error);
            // Don't fail the main operation if alert fails
        }
    },

    async sendRateLimitAlert(interaction, actionCount) {
        try {
            const channelId = process.env.GENERALS_ALERT_CHANNEL_ID;
            if (!channelId) return;

            const channel = await interaction.client.channels.fetch(channelId);
            if (!channel) return;

            const alertEmbed = new EmbedBuilder()
                .setColor('#ff6600')
                .setTitle('⏱️ Rate Limit Triggered')
                .setDescription('A Commanding Officer has exceeded the hourly rate limit for point adjustments.')
                .addFields(
                    { name: '👤 User', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                    { name: '📊 Actions', value: `${actionCount}/${RATE_LIMIT_MAX}`, inline: true },
                    { name: '⏰ Time Window', value: '1 hour', inline: true }
                )
                .setFooter({ text: 'Rate limiting helps prevent abuse' })
                .setTimestamp();

            await channel.send({ embeds: [alertEmbed] });
        } catch (error) {
            console.error('❌ Error sending rate limit alert:', error);
        }
    },

    // 🛡️ HELPER FUNCTIONS
    getActionName(action) {
        const names = {
            'add': '➕ Add Points',
            'remove': '➖ Remove Points',
            'set': '🔧 Set Points',
            'remove_all': '🚨 REMOVE ALL POINTS'
        };
        return names[action] || action;
    },

    calculateNewPoints(action, currentPoints, amount) {
        switch(action) {
            case 'add':
                return `${currentPoints + amount} points`;
            case 'remove':
                return `${Math.max(0, currentPoints - amount)} points`;
            case 'set':
                return `${amount} points`;
            case 'remove_all':
                return '0 points';
            default:
                return 'Unknown';
        }
    }
};