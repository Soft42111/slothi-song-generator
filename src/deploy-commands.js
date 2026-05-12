const { REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

const commands = [
    new SlashCommandBuilder()
        .setName('music')
        .setDescription('Start the AI Music Generation process')
        .addIntegerOption(option => 
            option.setName('duration')
                .setDescription('Optional track duration in seconds (10-600)')
                .setMinValue(10)
                .setMaxValue(600)),
    new SlashCommandBuilder()
        .setName('song')
        .setDescription('Alias for /music - Start the AI Music Generation process')
        .addIntegerOption(option => 
            option.setName('duration')
                .setDescription('Optional track duration in seconds (10-600)')
                .setMinValue(10)
                .setMaxValue(600)),
    new SlashCommandBuilder()
        .setName('cancel')
        .setDescription('Cancel your current active session'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help and instructions for the Sogni Music Bot')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

async function deploy() {
    try {
        console.log('Started refreshing application (/) commands.');

        const userData = await rest.get(Routes.user());
        const clientId = userData.id;

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
}

module.exports = { deploy };
