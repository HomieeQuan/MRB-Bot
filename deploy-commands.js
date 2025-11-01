// deploy-commands.js - Deploy slash commands to Discord
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Check if commands folder exists
if (!fs.existsSync(commandsPath)) {
    console.log('⚠️  No commands folder found. Please create the commands folder and add command files.');
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

if (commandFiles.length === 0) {
    console.log('⚠️  No command files found in commands folder.');
    process.exit(1);
}

// Load all command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️  [WARNING] The command at ${filePath} is missing "data" or "execute" property.`);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.BOT_TOKEN);

// Deploy commands
(async () => {
    try {
        console.log(`\n🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Register commands
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`✅ Successfully reloaded ${data.length} application (/) commands.`);
        console.log('\n📋 Deployed commands:');
        data.forEach(cmd => console.log(`   - /${cmd.name}`));
        
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();