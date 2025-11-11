// config/discordClient.js - Discord.js client configuration - FIXED FOR REACTIONS
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions  // ✅ ADDED - CRITICAL FOR REACTION COLLECTORS!
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,    // ✅ ADDED - CRITICAL FOR REACTIONS ON OLD MESSAGES!
        Partials.User,
        Partials.GuildMember
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Add debug logging to verify intents are working (remove in production)
client.once('ready', () => {
    console.log('📊 Discord Client Intents & Partials Check:');
    
    // Check for critical intents
    if (client.options.intents.has(GatewayIntentBits.GuildMessageReactions)) {
        console.log('   ✅ GuildMessageReactions intent is ENABLED');
    } else {
        console.error('   ❌ GuildMessageReactions intent is MISSING - Reactions won\'t work!');
    }
    
    if (client.options.partials && client.options.partials.includes(Partials.Reaction)) {
        console.log('   ✅ Reaction partial is ENABLED');
    } else {
        console.error('   ❌ Reaction partial is MISSING - Old message reactions won\'t work!');
    }
    
    console.log(`   📝 All intents: ${client.options.intents.toArray().join(', ')}`);
    console.log(`   📦 All partials: ${client.options.partials ? client.options.partials.join(', ') : 'None'}`);
});

module.exports = client;