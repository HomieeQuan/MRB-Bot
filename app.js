// app.js - MRB Bot application setup - FIXED VERSION
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const client = require('./config/discordClient');
const connectdb = require('./config/connectdb');

const app = express();

// Middleware
app.use(express.json());

console.log('🚀 Starting MRB Bot...');

// Connect to MongoDB
connectdb();

// Load commands
client.commands.clear();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`✅ Loaded command: ${command.data.name}`);
        } else {
            console.log(`⚠️  [WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
        }
    }
} else {
    console.log('⚠️  No commands folder found. Bot will start without commands.');
}

// Discord bot event handlers
const AutomationScheduler = require('./utils/automationScheduler');
const scheduler = new AutomationScheduler(client);

client.once('ready', async () => {
    console.log('✅ Discord bot connected successfully');
    console.log('🎉 Bot started successfully!');
    console.log(`✅ Bot is online! Logged in as ${client.user.tag}`);
    console.log(`🎯 Bot is in ${client.guilds.cache.size} server(s)`);
    
    // 🔧 FIXED: AUTOMATION NOW ENABLED
    console.log('🤖 Starting daily automation scheduler...');
    scheduler.start();
    console.log('✅ Daily automation scheduler started successfully');
    console.log('⏰ Next automation run scheduled for 6:00 AM');
});


client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`❌ Error executing ${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: '❌ There was an error executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Login to Discord
client.login(process.env.BOT_TOKEN);

module.exports = app;