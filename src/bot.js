const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events, 
    EmbedBuilder,
    AttachmentBuilder
} = require('discord.js');
const session = require('./session');
const sogni = require('./sogni');
const { COLORS, EMOJIS } = require('./constants');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

client.once(Events.ClientReady, (c) => {
    console.log(`${EMOJIS.SUCCESS} Ready! Logged in as ${c.user.tag}`);
    
    // Auto-cleanup sessions every 5 minutes
    setInterval(() => session.cleanup(), 5 * 60 * 1000);
});

// Helper to send the "Type" choice
async function startFlow(interaction) {
    // Defer the reply to give us 15 minutes of response time
    await interaction.deferReply({ ephemeral: true });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('choice_lyrics')
                .setLabel('Lyrics + Music')
                .setStyle(ButtonStyle.Primary)
                .setEmoji(EMOJIS.LYRICS),
            new ButtonBuilder()
                .setCustomId('choice_instrumental')
                .setLabel('Instrumental')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(EMOJIS.INSTRUMENTAL),
        );

    const embed = new EmbedBuilder()
        .setColor(COLORS.PRIMARY)
        .setTitle(`${EMOJIS.MUSIC} Sogni Music Generator`)
        .setDescription('Welcome to the future of AI music generation. \n\n**What would you like to create today?**')
        .addFields(
            { name: `${EMOJIS.LYRICS} Lyrics + Music`, value: 'Generate custom lyrics using Qwen 3.5 and then compose music.', inline: true },
            { name: `${EMOJIS.INSTRUMENTAL} Instrumental`, value: 'Generate high-quality background music based on your prompt.', inline: true }
        )
        .setFooter({ text: 'Powered by Sogni AI • Liquid Glass Edition', iconURL: 'https://i.imgur.com/your-sogni-icon.png' })
        .setTimestamp();

    await interaction.editReply({
        embeds: [embed],
        components: [row]
    });

    session.set(interaction.user.id, { step: 'CHOOSING_TYPE' });
}

// Helper to show help information
async function showHelp(interactionOrMessage) {
    const isInteraction = interactionOrMessage.reply === undefined || interactionOrMessage.editReply !== undefined;
    
    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${EMOJIS.MUSIC} Sogni Music Bot Help`)
        .setDescription('I can generate high-quality AI music and lyrics using the Sogni Supernet.')
        .addFields(
            { name: '🚀 Commands', value: '• `/music` or `!music`: Start generation\n• `/song` or `!song`: Alias for music\n• `/cancel` or `!cancel`: Stop current session\n• `/help` or `!help`: Show this message' },
            { name: '📝 How it works', value: '1. Select **Lyrics + Music** or **Instrumental**.\n2. Follow the interactive steps.\n3. Receive your downloadable audio file!' },
            { name: '💡 Tip', value: 'Use specific prompts like "Cyberpunk techno, 120BPM" for better results.' }
        )
        .setFooter({ text: 'Built on Sogni AI Supernet' });

    if (isInteraction) {
        if (interactionOrMessage.deferred || interactionOrMessage.replied) {
            await interactionOrMessage.editReply({ embeds: [embed] });
        } else {
            await interactionOrMessage.reply({ embeds: [embed], ephemeral: true });
        }
    } else {
        await interactionOrMessage.reply({ embeds: [embed] });
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'music' || commandName === 'song') {
            const duration = options.getInteger('duration');
            await startFlow(interaction);
            if (duration) {
                session.update(interaction.user.id, { duration });
            }
        } else if (commandName === 'help') {
            await showHelp(interaction);
        } else if (commandName === 'cancel') {
            session.delete(interaction.user.id);
            await interaction.reply({ content: `${EMOJIS.SUCCESS} Session cancelled.`, ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        const userId = interaction.user.id;
        const userSession = session.get(userId);

        if (!userSession) {
            return interaction.reply({ 
                content: `${EMOJIS.ERROR} Session expired. Please start over with \`/music\`.`, 
                ephemeral: true 
            });
        }

        if (interaction.customId === 'choice_lyrics') {
            session.update(userId, { step: 'CHOOSING_LYRICS_METHOD', type: 'lyrics' });
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lyrics_manual')
                        .setLabel('Write My Own')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⌨️'),
                    new ButtonBuilder()
                        .setCustomId('lyrics_generate')
                        .setLabel('AI Generate')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🤖'),
                );

            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.LYRICS} Step 2: Content Selection`)
                .setDescription('How would you like to handle the lyrics for your song?')
                .addFields(
                    { name: 'Write My Own', value: 'You provide the lyrics, and I\'ll compose the music around them.', inline: true },
                    { name: 'AI Generate', value: 'I\'ll use Qwen 3.5 to write a custom set of lyrics for you based on a theme.', inline: true }
                );

            await interaction.update({
                embeds: [embed],
                components: [row]
            });
        }

        if (interaction.customId === 'lyrics_manual') {
            session.update(userId, { step: 'AWAITING_LYRICS' });
            await interaction.update({
                content: `${EMOJIS.WAVE} Please **type your lyrics** below and send them in this chat.`,
                embeds: [],
                components: []
            });
        }

        if (interaction.customId === 'lyrics_generate') {
            session.update(userId, { step: 'AWAITING_THEME' });
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.THINKING} Lyric Generation`)
                .setDescription('What should the song be about? Enter a theme, mood, or specific topic (e.g., "A rainy night in Tokyo", "Lost love in a digital world").');
            
            await interaction.update({
                embeds: [embed],
                components: []
            });
        }

        if (interaction.customId === 'choice_instrumental') {
            session.update(userId, { step: 'AWAITING_PROMPT', type: 'instrumental' });
            
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.INSTRUMENTAL} Step 2: Musical Style`)
                .setDescription('Please enter a prompt describing the music style you want.')
                .addFields(
                    { name: 'Examples', value: '• "Lo-fi hip hop, chill vibe, 80 BPM"\n• "Cyberpunk techno, high energy, dark atmosphere"\n• "Acoustic folk, melancholic, guitar focused"' }
                );

            await interaction.update({
                embeds: [embed],
                components: []
            });
        }

        if (interaction.customId === 'lyrics_regenerate') {
            const theme = userSession.lastTheme;
            await generateLyricsProcess(interaction, theme);
        }

        // --- DURATION HANDLERS ---
        if (interaction.customId === 'dur_minus' || interaction.customId === 'dur_plus') {
            const currentDur = userSession.duration || 60;
            let nextDur = currentDur;

            if (interaction.customId === 'dur_minus') nextDur = Math.max(10, currentDur - 10);
            if (interaction.customId === 'dur_plus') nextDur = Math.min(600, currentDur + 10);

            session.update(userId, { duration: nextDur });
            await updateDurationEmbed(interaction, nextDur);
            return;
        }

        if (interaction.customId === 'dur_confirm') {
            const duration = userSession.duration || 60;
            const input = userSession.stylePrompt;
            await startMusicGeneration(interaction, input, userSession.lyrics, userSession.type === 'instrumental', duration);
            return;
        }

        if (interaction.customId === 'dur_auto') {
            const duration = userSession.type === 'instrumental' ? 60 : 120;
            const input = userSession.stylePrompt;
            await startMusicGeneration(interaction, input, userSession.lyrics, userSession.type === 'instrumental', duration);
            return;
        }
    }
});

// Helper to update the duration embed
async function updateDurationEmbed(interaction, duration) {
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('dur_minus').setLabel('-10s').setStyle(ButtonStyle.Secondary).setDisabled(duration <= 10),
            new ButtonBuilder().setCustomId('dur_confirm').setLabel(`Confirm (${duration}s)`).setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('dur_auto').setLabel('Auto (Best Fit)').setStyle(ButtonStyle.Primary).setEmoji('✨'),
            new ButtonBuilder().setCustomId('dur_plus').setLabel('+10s').setStyle(ButtonStyle.Secondary).setDisabled(duration >= 600),
        );

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${EMOJIS.GEAR} Final Step: Duration`)
        .setDescription(`How long should your track be?\n\n**Current Duration:** \`${duration} seconds\``)
        .setFooter({ text: 'Min: 10s | Max: 600s' });

    await interaction.update({
        embeds: [embed],
        components: [row]
    });
}

// Helper to show duration step
async function showDurationStep(message, stylePrompt) {
    const userId = message.author.id;
    const userSession = session.get(userId);
    
    // If duration was already specified via slash command params, skip this step
    if (userSession.duration) {
        return startMusicGeneration(message, stylePrompt, userSession.lyrics, userSession.type === 'instrumental', userSession.duration);
    }

    session.update(userId, { step: 'CHOOSING_DURATION', stylePrompt, duration: 60 });

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder().setCustomId('dur_minus').setLabel('-10s').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('dur_confirm').setLabel('Confirm (60s)').setStyle(ButtonStyle.Success).setEmoji('✅'),
            new ButtonBuilder().setCustomId('dur_auto').setLabel('Auto (Best Fit)').setStyle(ButtonStyle.Primary).setEmoji('✨'),
            new ButtonBuilder().setCustomId('dur_plus').setLabel('+10s').setStyle(ButtonStyle.Secondary),
        );

    const embed = new EmbedBuilder()
        .setColor(COLORS.INFO)
        .setTitle(`${EMOJIS.GEAR} Final Step: Duration`)
        .setDescription('How long should your track be?\n\n**Current Duration:** `60 seconds`')
        .setFooter({ text: 'Min: 10s | Max: 600s' });

    await message.reply({
        embeds: [embed],
        components: [row]
    });
}

// Helper to start the actual generation process
async function startMusicGeneration(interactionOrMessage, style, lyrics, isInstrumental, duration) {
    const userId = (interactionOrMessage.user || interactionOrMessage.author).id;
    const isInteraction = interactionOrMessage.update !== undefined;
    
    const statusEmbed = new EmbedBuilder()
        .setColor(COLORS.SECONDARY)
        .setTitle(`${EMOJIS.SPARKLES} Composing Music`)
        .setDescription(`${EMOJIS.LOADING} Processing your request...\n\n**Style:** *"${style}"*\n**Duration:** \`${duration}s\`\n\n*This usually takes about 60-120 seconds.*`);

    let statusMsg;
    if (isInteraction) {
        statusMsg = await interactionOrMessage.update({
            embeds: [statusEmbed],
            components: [],
            fetchReply: true
        });
    } else {
        statusMsg = await interactionOrMessage.reply({ embeds: [statusEmbed] });
    }

    session.delete(userId);

    try {
        console.log(`[Bot] Requesting music from Sogni SDK (Duration: ${duration}s)...`);
        const url = await sogni.generateMusic(style, lyrics, isInstrumental, duration);
        
        console.log(`[Bot] Music generated at: ${url}. Downloading...`);
        const filePath = await sogni.downloadFile(url, `music_${Date.now()}.mp3`);
        
        console.log(`[Bot] Downloaded to: ${filePath}. Uploading to Discord...`);
        const attachment = new AttachmentBuilder(filePath);

        const finalEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${EMOJIS.MUSIC} Generation Complete!`)
            .setDescription(`Your ${isInstrumental ? 'instrumental' : 'song'} is ready.`)
            .addFields(
                { name: 'Style', value: style, inline: true },
                { name: 'Duration', value: `${duration}s`, inline: true }
            )
            .setFooter({ text: 'Sogni AI • High Fidelity' });

        // Send a NEW message for the file to ensure stability
        await interactionOrMessage.channel.send({
            content: `<@${userId}>`,
            embeds: [finalEmbed],
            files: [attachment]
        });
        
        // Finalize the processing message
        try {
            await statusMsg.edit({ 
                content: `${EMOJIS.SUCCESS} Composition delivered!`, 
                embeds: [], 
                components: [] 
            });
        } catch (e) { /* ignore cleanup errors */ }
        
        console.log(`[Bot] Final song delivered via new message.`);
        sogni.cleanup(filePath);
    } catch (err) {
        console.error('[Bot] Generation Error Detail:', err);
        if (err.stack) console.error(err.stack);
        
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`${EMOJIS.ERROR} Generation Failed`)
            .setDescription(`**Error:** \`${err.message}\`\n\nPlease try again or contact support.`);
        
        try {
            await statusMsg.edit({ embeds: [errorEmbed], components: [] });
        } catch (e) {
            await interactionOrMessage.channel.send({ embeds: [errorEmbed] });
        }
    }
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Handle prefix commands
    const content = message.content.toLowerCase();
    
    if (content.startsWith('!help')) {
        await showHelp(message);
        return;
    }

    if (content.startsWith('!cancel')) {
        session.delete(message.author.id);
        await message.reply(`${EMOJIS.SUCCESS} Session cancelled.`);
        return;
    }

    if (content.startsWith('!music') || content.startsWith('!song')) {
        // Mocking an interaction for startFlow
        const mockInteraction = {
            user: message.author,
            deferReply: async () => message.channel.send(`${EMOJIS.WAVE} Initializing session...`),
            editReply: async (data) => message.reply(data)
        };
        await startFlow(mockInteraction);
        return;
    }

    const userId = message.author.id;
    const userSession = session.get(userId);

    if (!userSession) return;

    const input = message.content.trim();

    try {
        // --- INSTRUMENTAL FLOW ---
        if (userSession.step === 'AWAITING_PROMPT' && userSession.type === 'instrumental') {
            await showDurationStep(message, input);
        }

        // --- LYRICS FLOW: Manual Input ---
        else if (userSession.step === 'AWAITING_LYRICS') {
            session.update(userId, { step: 'AWAITING_STYLE', lyrics: input });
            
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.WAVE} Style Selection`)
                .setDescription('Got the lyrics! Now, enter the **music style** (genre, mood, etc.) you want for this composition.');
            
            await message.reply({ embeds: [embed] });
        }

        // --- LYRICS FLOW: Generate Lyrics ---
        else if (userSession.step === 'AWAITING_THEME') {
            const statusEmbed = new EmbedBuilder()
                .setColor(COLORS.SECONDARY)
                .setTitle(`${EMOJIS.THINKING} Writing Lyrics`)
                .setDescription(`${EMOJIS.LOADING} Qwen 3.5 is crafting your masterpiece about: *"${input}"*...`);

            const statusMsg = await message.reply({ embeds: [statusEmbed] });
            
            try {
                const lyrics = await sogni.generateLyrics(input);
                session.update(userId, { step: 'AWAITING_STYLE', lyrics });
                
                const lyricsEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle(`${EMOJIS.LYRICS} Lyrics Crafted`)
                    .setDescription(`\`\`\`\n${lyrics.substring(0, 1800)}\n\`\`\``)
                    .addFields({ name: 'Next Step', value: 'Enter the **music style** (e.g., "90s Rock", "Synthwave Pop").' });

                await statusMsg.edit({ embeds: [lyricsEmbed] });
            } catch (err) {
                console.error(err);
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle(`${EMOJIS.ERROR} Lyric Generation Failed`)
                    .setDescription('Unable to generate lyrics. Please try again.');
                await statusMsg.edit({ embeds: [errorEmbed] });
            }
        }

        // --- LYRICS FLOW: Style -> Duration Transition ---
        else if (userSession.step === 'AWAITING_STYLE') {
            await showDurationStep(message, input);
        }
    } catch (error) {
        console.error('Error in message handler:', error);
        await message.reply(`${EMOJIS.ERROR} An unexpected error occurred. Please try \`/music\` again.`);
    }
});

module.exports = client;
