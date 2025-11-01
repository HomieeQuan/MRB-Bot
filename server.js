// server.js - MRB Bot main entry point - ENHANCED VERSION
require('dotenv').config();
const EnvValidator = require('./config/validateEnv');

// Validate environment before starting
EnvValidator.validate();

// Start the bot
const app = require('./app');

const PORT = process.env.PORT || 6001;

// 🔧 NEW: Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'MRB Bot'
    });
});

// 🔧 NEW: Status endpoint (more detailed)
app.get('/status', (req, res) => {
    const mongoose = require('mongoose');
    const dbState = mongoose.connection.readyState;
    const stateNames = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    res.json({
        status: 'online',
        uptime: Math.floor(process.uptime()),
        memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
        },
        database: {
            state: stateNames[dbState],
            connected: dbState === 1
        },
        timestamp: new Date().toISOString()
    });
});

// 🔧 NEW: Root endpoint
app.get('/', (req, res) => {
    res.send('MRB Bot is running! ✅');
});

app.listen(PORT, () => {
    console.log(`🌐 Express server running on port ${PORT}`);
    console.log(`📊 Health check available at: http://localhost:${PORT}/health`);
    console.log(`📈 Status available at: http://localhost:${PORT}/status`);
});