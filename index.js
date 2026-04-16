const client = require('./src/bot');
const { deploy } = require('./src/deploy-commands');
require('dotenv').config();

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
