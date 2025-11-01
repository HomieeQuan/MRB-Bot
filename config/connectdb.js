// config/connectdb.js - MongoDB connection with resilience
const mongoose = require('mongoose');

const connectdb = async () => {
    try {
        const conn = await mongoose.connect(process.env.URI, {
            // Recommended options for production
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        
        console.log('Database connected:');
        console.log(`           name: ${conn.connection.name}`);
        console.log(`           host: ${conn.connection.host}`);
        console.log('            ');

        // 🔧 NEW: Add reconnection event handlers
        mongoose.connection.on('disconnected', () => {
            console.log('❌ MongoDB disconnected! Will attempt automatic reconnection...');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('✅ MongoDB reconnected successfully!');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌ MongoDB connection error:', err.message);
            // Don't exit process - let mongoose handle reconnection
        });

        mongoose.connection.on('close', () => {
            console.log('🔌 MongoDB connection closed');
        });

    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        console.error('⚠️  Bot will continue running but database operations will fail!');
        console.error('⚠️  Please check your MongoDB URI and network connection.');
        // Don't exit - let the bot try to reconnect
        // process.exit(1);
    }
};

module.exports = connectdb;