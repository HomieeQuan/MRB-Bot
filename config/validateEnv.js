// config/validateEnv.js - Validate all required environment variables
require('dotenv').config();

class EnvValidator {
    static validate() {
        console.log('🔍 Validating environment configuration...');
        
        const required = {
            BOT_TOKEN: process.env.BOT_TOKEN,
            CLIENT_ID: process.env.CLIENT_ID,
            GUILD_ID: process.env.GUILD_ID,
            URI: process.env.URI,
            CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
            CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
            CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET
        };

        const missing = [];
        for (const [key, value] of Object.entries(required)) {
            if (!value) {
                missing.push(key);
            }
        }

        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:');
            missing.forEach(key => console.error(`   - ${key}`));
            console.error('\n💡 Please check your .env file');
            process.exit(1);
        }

        // Validate token format
        if (!required.BOT_TOKEN.includes('.')) {
            console.error('❌ Invalid BOT_TOKEN format');
            console.error('💡 Bot token should look like: MTxxxxx.xxxxxx.xxxxxxxxxxxxxxx');
            process.exit(1);
        }

        // Validate MongoDB URI format
        if (!required.URI.startsWith('mongodb')) {
            console.error('❌ Invalid MongoDB URI format');
            console.error('💡 URI should start with mongodb:// or mongodb+srv://');
            process.exit(1);
        }

        console.log('✅ Environment variables validated successfully');
        console.log(`   🤖 Bot Token: ${required.BOT_TOKEN.substring(0, 10)}...`);
        console.log(`   🆔 Client ID: ${required.CLIENT_ID}`);
        console.log(`   🏠 Guild ID: ${required.GUILD_ID}`);
        console.log(`   🗄️ Database: ${required.URI.includes('localhost') ? 'Local MongoDB' : 'Remote MongoDB'}`);
        console.log(`   🌐 Port: ${process.env.PORT || 6001}`);

        return true;
    }
}

module.exports = EnvValidator;
