const client = require('./src/bot');
const { deploy } = require('./src/deploy-commands');
require('dotenv').config();

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Anti-Crash] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    if (error.message && error.message.includes('WebSocket was closed before the connection was established')) {
        console.warn('[Anti-Crash] Ignored benign WebSocket closure error.');
        return;
    }
    console.error('[Anti-Crash] Uncaught Exception:', error);
});
async function start() {
    if (!process.env.DISCORD_TOKEN) {
        console.error('Error: DISCORD_TOKEN is missing in .env');
        process.exit(1);
    }

    if (!process.env.SOGNI_API_KEY) {
        console.error('Error: SOGNI_API_KEY is missing in .env');
        process.exit(1);
    }

    try {
        // Deploy commands first
        await deploy();

        // Login to Discord
        await client.login(process.env.DISCORD_TOKEN);
    } catch (error) {
        console.error('Failed to start the bot:', error);
    }
}

start();
