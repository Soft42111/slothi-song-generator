const { 
    Client, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    Events, 
    EmbedBuilder,
    AttachmentBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const session = require('./session');
const sogni = require('./sogni');
const { COLORS, EMOJIS, STYLES } = require('./constants');
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
            { name: `${EMOJIS.LYRICS} Lyrics + Music`, value: 'Generate custom lyrics using Qwen 3.6 and then compose music.', inline: true },
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
            await interactionOrMessage.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        }
    } else {
        await interactionOrMessage.reply({ embeds: [embed] });
    }
}

// Helper to generate lyrics via AI
async function generateLyricsProcess(interactionOrMessage, theme) {
    const userId = (interactionOrMessage.user || interactionOrMessage.author).id;
    const isInteraction = typeof interactionOrMessage.editReply === 'function';
    
    const statusEmbed = new EmbedBuilder()
        .setColor(COLORS.SECONDARY)
        .setTitle(`${EMOJIS.THINKING} Writing Lyrics`)
        .setDescription(`${EMOJIS.LOADING} Qwen 3.6 is crafting your masterpiece about: *"${theme}"*...`);

    let statusMsg;
    if (isInteraction) {
        if (interactionOrMessage.deferred || interactionOrMessage.replied) {
            statusMsg = await interactionOrMessage.editReply({ 
                embeds: [statusEmbed], 
                components: [] 
            });
        } else {
            statusMsg = await interactionOrMessage.update({ 
                embeds: [statusEmbed], 
                components: [], 
                withResponse: true 
            });
        }
    } else {
        statusMsg = await interactionOrMessage.reply({ embeds: [statusEmbed] });
    }

    try {
        const lyrics = await sogni.generateLyrics(theme);
        session.update(userId, { step: 'AWAITING_STYLE', lyrics, lastTheme: theme });
        
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('lyrics_regenerate')
                    .setLabel('Regenerate')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
            );

        const lyricsEmbed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle(`${EMOJIS.LYRICS} Lyrics Crafted`)
            .setDescription(`\`\`\`\n${lyrics.substring(0, 1800)}\n\`\`\``)
            .addFields({ name: 'Next Step', value: 'Enter the **music style** (e.g., "90s Rock", "Synthwave Pop").' });

        if (isInteraction) {
            await interactionOrMessage.editReply({ 
                embeds: [lyricsEmbed], 
                components: [row] 
            });
        } else {
            await statusMsg.edit({ 
                embeds: [lyricsEmbed], 
                components: [row] 
            });
        }
    } catch (err) {
        console.error('[Bot] Lyric Generation Error:', err);
        const errorEmbed = new EmbedBuilder()
            .setColor(COLORS.ERROR)
            .setTitle(`${EMOJIS.ERROR} Lyric Generation Failed`)
            .setDescription('Unable to generate lyrics. Please try again.');
        
        if (isInteraction) {
            await interactionOrMessage.editReply({ embeds: [errorEmbed], components: [] });
        } else {
            await statusMsg.edit({ embeds: [errorEmbed] });
        }
    }
}

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'music' || commandName === 'song') {
            const { options } = interaction;
            const duration = options.getInteger('duration');
            await startFlow(interaction);
            if (duration) {
                session.update(interaction.user.id, { duration });
            }
        } else if (commandName === 'help') {
            await showHelp(interaction);
        } else if (commandName === 'cancel') {
            session.delete(interaction.user.id);
            await interaction.reply({ content: `${EMOJIS.SUCCESS} Session cancelled.`, flags: MessageFlags.Ephemeral });
        }
    }


    if (interaction.isButton()) {
        const userId = interaction.user.id;
        const userSession = session.get(userId);

        if (!userSession) {
            return interaction.reply({ 
                content: `${EMOJIS.ERROR} Session expired. Please start over with \`/music\`.`, 
                flags: MessageFlags.Ephemeral 
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
                    { name: 'AI Generate', value: 'I\'ll use Qwen 3.6 to write a custom set of lyrics for you based on a theme.', inline: true }
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
            session.update(userId, { step: 'CHOOSING_LYRICS_PROMPT_METHOD' });
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('lyrics_prompt_manual')
                        .setLabel('Write My Own Theme')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('⌨️'),
                    new ButtonBuilder()
                        .setCustomId('lyrics_prompt_auto')
                        .setLabel('AI Generate Theme')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🧠'),
                );

            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.THINKING} Step 3: Define Lyrics Theme`)
                .setDescription('Would you like to write your own theme/prompt for the lyrics, or let the AI brainstorm a creative one for you?');

            await interaction.update({
                embeds: [embed],
                components: [row]
            });
        }

        if (interaction.customId === 'lyrics_prompt_manual') {
            session.update(userId, { step: 'AWAITING_THEME' });
            const embed = new EmbedBuilder()
                .setColor(COLORS.INFO)
                .setTitle(`${EMOJIS.THINKING} Lyric Theme Input`)
                .setDescription('Please **type the theme, mood, or topic** for the song in this chat (e.g., "A rainy night in Tokyo", "Lost love in a digital world").');

            await interaction.update({
                embeds: [embed],
                components: []
            });
        }

        if (interaction.customId === 'lyrics_prompt_auto') {
            await interaction.deferUpdate();
            
            try {
                // Generate a creative theme using Qwen 3.6
                const theme = await sogni.generateLyricsPrompt();
                session.update(userId, { lastTheme: theme });
                
                // Proceed to generate lyrics based on this theme
                await generateLyricsProcess(interaction, theme);
            } catch (err) {
                console.error('[Bot] Theme Generation Error:', err);
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle(`${EMOJIS.ERROR} Brainstorming Failed`)
                    .setDescription('Unable to brainstorm a theme. Please start over or try typing your own.');
                
                await interaction.editReply({ embeds: [errorEmbed], components: [] });
            }
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
            withResponse: true
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
        
        // Save to generation database
        try {
            const stats = fs.statSync(filePath);
            sogni.saveGeneration(path.basename(filePath), stats.size, {
                style,
                lyrics,
                isInstrumental,
                duration,
                bpm: 120,
                keyscale: 'Auto'
            });
        } catch (dbErr) {
            console.error('[Bot] Failed to save generation details to registry:', dbErr);
        }
        
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

// Helper to fetch a message from a Discord message link URL
async function fetchMessageFromLink(client, url) {
    const regex = /channels\/(\d+)\/(\d+)\/(\d+)/;
    const match = url.match(regex);
    if (!match) return null;

    const [_, guildId, channelId, messageId] = match;
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) return null;
        const msg = await channel.messages.fetch(messageId);
        return msg;
    } catch (error) {
        console.error('[Bot] Failed to fetch message from link:', error);
        return null;
    }
}

// --- CONVERSATIONAL AI MUSIC ASSISTANT ---

const MUSIC_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'generate_music',
            description: 'Generates a music track or song using the Sogni ACE-Step engine. Call this when you have gathered the user\'s musical style (genre, mood, etc.) and other preferences (like lyrics if they want a vocal track). If some parameters (like duration, bpm, key) are not explicitly specified, defaults can be used, but you should extract them if the user specifies them.',
            parameters: {
                type: 'object',
                properties: {
                    style: {
                        type: 'string',
                        description: 'Description of the musical style, genre, instruments, and mood. E.g., "Afro-Cuban", "Synthwave", "heavy metal with roaring guitars". Always check if the style matches any of the curated styles and extract its name.'
                    },
                    is_instrumental: {
                        type: 'boolean',
                        description: 'Set to true for a purely instrumental track without vocals, or false for a vocal song containing singing.'
                    },
                    lyrics: {
                        type: 'string',
                        description: 'The lyrics to sing. Mandatory if is_instrumental is false. Can be user-provided or generated via generate_lyrics.'
                    },
                    duration: {
                        type: 'integer',
                        description: 'The length of the music track in seconds. Must be between 10 and 600. Defaults to 60.'
                    },
                    bpm: {
                        type: 'integer',
                        description: 'Tempo in beats per minute (30-300). Defaults to 120.'
                    },
                    keyscale: {
                        type: 'string',
                        description: 'Musical key/scale (e.g. "C major", "A minor", "F# major"). Defaults to "C major". Use "Auto" if the user wants it auto-detected.'
                    },
                    timesignature: {
                        type: 'string',
                        enum: ['2/4', '3/4', '4/4', '6/8'],
                        description: 'Time signature of the track. Must be one of: "2/4", "3/4", "4/4", "6/8". Defaults to "4/4".'
                    },
                    creativity: {
                        type: 'number',
                        description: 'Unpredictability of the melody (0.0 to 2.0). Defaults to 0.85.'
                    },
                    steps: {
                        type: 'integer',
                        description: 'Inference steps (4 to 16). Defaults to 8.'
                    },
                    shift: {
                        type: 'number',
                        description: 'Motion intensity or prompt drift factor (1.0 to 8.0). Defaults to 3.'
                    },
                    output_format: {
                        type: 'string',
                        enum: ['mp3', 'wav', 'flac'],
                        description: 'The audio output file format. Must be "mp3", "wav", or "flac". Defaults to "mp3".'
                    }
                },
                required: ['style', 'is_instrumental']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'generate_lyrics',
            description: 'Generates custom song lyrics based on a theme, mood, or topic using Qwen 3.6.',
            parameters: {
                type: 'object',
                properties: {
                    theme: {
                        type: 'string',
                        description: 'The theme, topic, or mood for the lyrics (e.g., "rainy night in Seattle", "lost in space").'
                    }
                },
                required: ['theme']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_help',
            description: 'Displays the help and usage menu for the Sogni Music Bot, listing commands and available styles.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'cancel_session',
            description: 'Resets and cancels the current conversation and session context.',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'view_message_link',
            description: 'Fetches the content, author, and embed descriptions of a Discord message using its URL/link. Use this when the user shares a Discord message link and asks you to read it, use its lyrics, or base a song on it.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The full Discord message link/URL (e.g., https://discord.com/channels/123/456/789).'
                    }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'analyze_audio',
            description: 'Analyzes an audio file attachment (from its URL) to retrieve its musical properties (like style, lyrics, BPM, key, duration) if it was previously generated by this bot, or basic file properties if it is an external track.',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'The URL of the audio file attachment.'
                    }
                },
                required: ['url']
            }
        }
    }
];

const CONVERSATIONAL_SYSTEM_PROMPT = `You are the Sogni Music Assistant, a premium AI agent powered by Qwen 3.6 on the Sogni Supernet.
Your goal is to guide the user in generating high-quality music or lyrics through natural conversation.

We have two primary modes of generation:
1. **Lyrics + Music**: Vocal track. Requires style description and lyrics.
2. **Instrumental**: Music track only. Requires style description.

When talking to the user:
- Ask them if they want a song with lyrics (vocal track) or an instrumental track.
- If they want a vocal song:
  - Check if they have their own lyrics or want you to generate some.
  - If they want you to generate them, ask for a theme/mood, then call the "generate_lyrics" tool. Do NOT try to write lyrics yourself inside this chat unless they specifically ask you to tweak some existing ones; instead, use the dedicated "generate_lyrics" tool because it runs a specialized lyric-writing pass.
  - Once lyrics are ready, ask them for the musical style/genre.
- If they want an instrumental:
  - Ask them to describe the musical style (genre, mood, speed, etc.).
- Inform them they can customize musical parameters: tempo/BPM (default 120), time signature (2/4, 3/4, 4/4, 6/8), key (e.g. A minor, C major), creativity (default 0.85), steps (default 8), shift (default 3), and output format (mp3, wav, flac).
- Once you have gathered the style and if it is an instrumental or has lyrics, call the "generate_music" tool with the collected parameters.
- If the user asks to cancel, start over, or clear history, call "cancel_session".
- If the user asks for help or how to use the bot, call "get_help".

Be friendly, concise, creative, and professional. Do not output markdown code blocks containing the tools or internal details.`;

async function runConversationalAgent(message, cleanedContent, originalSongContext = null, originalLyrics = null) {
    const userId = message.author.id;
    let userSession = session.get(userId);

    // Initialize session if not active or if in another mode
    if (!userSession || userSession.step !== 'conversational') {
        userSession = session.initConversational(userId, CONVERSATIONAL_SYSTEM_PROMPT);
    }

    if (originalSongContext) {
        // Reset message history to clear older state and seed the edit context
        userSession.messages = [{ role: 'system', content: CONVERSATIONAL_SYSTEM_PROMPT }];
        userSession.messages.push({ role: 'system', content: originalSongContext });
        if (originalLyrics) {
            userSession.lyrics = originalLyrics;
        }
    }

    userSession.messages.push({ role: 'user', content: cleanedContent });
    session.pruneMessages(userId, 20);

    let loopCount = 0;
    const maxLoops = 5;
    let responseMessage = null;
    let shouldBreak = false;

    // Send a typing indicator while talking to Qwen
    await message.channel.sendTyping();

    while (loopCount < maxLoops && !shouldBreak) {
        loopCount++;
        // Refresh typing indicator each turn
        await message.channel.sendTyping().catch(() => {});
        console.log(`[Bot] Calling Qwen for chat completion (turn ${loopCount})...`);
        const response = await sogni.chatCompletion(userSession.messages, MUSIC_TOOLS);
        
        const aiMessage = response.choices[0].message;
        // Add AI message to session history
        userSession.messages.push(aiMessage);

        if (aiMessage.tool_calls && aiMessage.tool_calls.length > 0) {
            for (const toolCall of aiMessage.tool_calls) {
                const functionName = toolCall.function.name;
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch (e) {
                    console.error('[Bot] Failed to parse tool arguments:', e);
                }

                console.log(`[Bot] Executing tool: ${functionName}`, args);
                let toolResultContent = '';

                try {
                    if (functionName === 'cancel_session') {
                        session.delete(userId);
                        await message.reply(`${EMOJIS.SUCCESS} Session cancelled and reset.`);
                        toolResultContent = 'Session cancelled and reset successfully.';
                        shouldBreak = true;
                    } 
                    else if (functionName === 'get_help') {
                        await showHelp(message);
                        toolResultContent = 'Help information displayed successfully.';
                    } 
                    else if (functionName === 'analyze_audio') {
                        const url = args.url;
                        if (!url) {
                            toolResultContent = 'Error: Missing URL parameter.';
                        } else {
                            try {
                                const analysis = await sogni.analyzeAudioFile(url);
                                toolResultContent = JSON.stringify(analysis);
                            } catch (err) {
                                toolResultContent = `Error analyzing audio: ${err.message}`;
                            }
                        }
                    }
                    else if (functionName === 'view_message_link') {
                        const url = args.url;
                        if (!url) {
                            toolResultContent = 'Error: Missing URL parameter.';
                        } else {
                            const fetchedMsg = await fetchMessageFromLink(client, url);
                            if (!fetchedMsg) {
                                toolResultContent = 'Error: Could not fetch message from that link. Make sure the link is correct and the bot has access to that channel.';
                            } else {
                                let content = fetchedMsg.content || '';
                                if (fetchedMsg.embeds && fetchedMsg.embeds.length > 0) {
                                    content += '\n[Embed content: ' + fetchedMsg.embeds.map(e => e.description || e.title || '').join('; ') + ']';
                                }
                                toolResultContent = JSON.stringify({
                                    author: fetchedMsg.author.username,
                                    content: content,
                                    timestamp: fetchedMsg.createdAt
                                });
                            }
                        }
                    }
                    else if (functionName === 'generate_lyrics') {
                        const theme = args.theme || 'a beautiful theme';
                        const statusEmbed = new EmbedBuilder()
                            .setColor(COLORS.SECONDARY)
                            .setTitle(`${EMOJIS.THINKING} Writing Lyrics`)
                            .setDescription(`${EMOJIS.LOADING} Qwen 3.6 is crafting your masterpiece about: *"${theme}"*...`);

                        const statusMsg = await message.reply({ embeds: [statusEmbed] });

                        const lyrics = await sogni.generateLyrics(theme);

                        // Store lyrics in the session
                        userSession.lyrics = lyrics;
                        userSession.lastTheme = theme;

                        const lyricsEmbed = new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle(`${EMOJIS.LYRICS} Lyrics Crafted`)
                            .setDescription(`\`\`\`\n${lyrics.substring(0, 1800)}\n\`\`\``)
                            .addFields({ name: 'Next Step', value: 'Tell me the musical style or confirm you want to proceed with this.' });

                        await statusMsg.edit({ embeds: [lyricsEmbed] });

                        toolResultContent = `Lyrics generated successfully and displayed to the user. First 300 characters of lyrics: "${lyrics.substring(0, 300)}...". Tell the user they can proceed to compose music with these lyrics.`;
                    } 
                    else if (functionName === 'generate_music') {
                        const styleInput = args.style || 'acoustic folk';
                        const isInstrumental = args.is_instrumental === undefined ? true : args.is_instrumental;
                        const lyricsContent = isInstrumental ? null : (args.lyrics || userSession.lyrics);
                        const duration = args.duration || 60;

                        // Check if style matches any curated styles
                        let stylePrompt = styleInput;
                        const normalizedStyle = styleInput.toLowerCase().trim();
                        if (STYLES && STYLES[normalizedStyle]) {
                            stylePrompt = STYLES[normalizedStyle];
                            console.log(`[Bot] Resolved style name "${styleInput}" to curated prompt: "${stylePrompt}"`);
                        }

                        // Gather options
                        const options = {
                            bpm: args.bpm,
                            keyscale: args.keyscale,
                            timesignature: args.timesignature,
                            creativity: args.creativity,
                            steps: args.steps,
                            shift: args.shift,
                            outputFormat: args.output_format
                        };

                        const statusEmbed = new EmbedBuilder()
                            .setColor(COLORS.SECONDARY)
                            .setTitle(`${EMOJIS.SPARKLES} Composing Music`)
                            .setDescription(`${EMOJIS.LOADING} Processing your request...\n\n**Style:** *"${styleInput}"*\n**Duration:** \`${duration}s\`\n**Vocals:** \`${isInstrumental ? 'No (Instrumental)' : 'Yes'}\`\n**BPM:** \`${options.bpm || 120}\`\n**Key:** \`${options.keyscale || 'Auto'}\`\n\n*This usually takes about 60-120 seconds.*`);

                        const statusMsg = await message.reply({ embeds: [statusEmbed] });

                        // Delete session so next starts fresh
                        session.delete(userId);

                        console.log(`[Bot] Requesting music from Sogni SDK via tool...`);
                        const url = await sogni.generateMusic(stylePrompt, lyricsContent, isInstrumental, duration, options);

                        console.log(`[Bot] Music generated at: ${url}. Downloading...`);
                        const ext = options.outputFormat || 'mp3';
                        const filePath = await sogni.downloadFile(url, `music_${Date.now()}.${ext}`);

                        // Save to generation database
                        try {
                            const stats = fs.statSync(filePath);
                            sogni.saveGeneration(path.basename(filePath), stats.size, {
                                style: styleInput,
                                lyrics: lyricsContent,
                                isInstrumental,
                                duration,
                                bpm: options.bpm || 120,
                                keyscale: options.keyscale || 'Auto',
                                timesignature: options.timesignature || '4/4'
                            });
                        } catch (dbErr) {
                            console.error('[Bot] Failed to save generation details to registry:', dbErr);
                        }

                        console.log(`[Bot] Downloaded to: ${filePath}. Uploading to Discord...`);
                        const attachment = new AttachmentBuilder(filePath);

                        const finalEmbed = new EmbedBuilder()
                            .setColor(COLORS.SUCCESS)
                            .setTitle(`${EMOJIS.MUSIC} Generation Complete!`)
                            .setDescription(`Your ${isInstrumental ? 'instrumental' : 'song'} is ready.`)
                            .addFields(
                                { name: 'Style', value: styleInput, inline: true },
                                { name: 'Duration', value: `${duration}s`, inline: true }
                            );

                        if (options.bpm) finalEmbed.addFields({ name: 'BPM', value: String(options.bpm), inline: true });
                        if (options.keyscale) finalEmbed.addFields({ name: 'Key', value: options.keyscale, inline: true });

                        finalEmbed.setFooter({ text: 'Sogni AI • High Fidelity' });

                        await message.channel.send({
                            content: `<@${userId}>`,
                            embeds: [finalEmbed],
                            files: [attachment]
                        });

                        try {
                            await statusMsg.edit({
                                content: `${EMOJIS.SUCCESS} Composition delivered!`,
                                embeds: [],
                                components: []
                            });
                        } catch (e) {}

                        sogni.cleanup(filePath);
                        toolResultContent = 'Music generated and delivered successfully to the user.';
                        shouldBreak = true;
                    }
                } catch (err) {
                    console.error(`[Bot] Error in tool execution (${functionName}):`, err);
                    toolResultContent = `Error executing tool: ${err.message}`;
                    await message.reply(`${EMOJIS.ERROR} Tool execution failed: \`${err.message}\``);
                }

                userSession.messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResultContent
                });
            }
        } else {
            responseMessage = aiMessage.content;
            break;
        }
    }

    if (responseMessage) {
        let cleanMessage = responseMessage.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
        if (cleanMessage) {
            await message.reply(cleanMessage);
        }
    }
}

client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Exclude Direct Messages (No DMs)
    if (!message.guild) return;

    // Plain-text session cancellation check
    const lowerContent = message.content.trim().toLowerCase();
    const isCancelKeyword = lowerContent === 'cancel' || lowerContent === 'stop' || lowerContent === 'exit';
    const isCancelCommand = lowerContent === '!cancel';
    
    if (isCancelCommand || (isCancelKeyword && session.get(message.author.id))) {
        session.delete(message.author.id);
        await message.reply(`${EMOJIS.SUCCESS} Session cancelled and reset.`);
        return;
    }

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

    // If they have an active traditional session, route to the traditional handlers
    if (userSession && userSession.step !== 'conversational') {
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
                await generateLyricsProcess(message, input);
            }

            // --- LYRICS FLOW: Style -> Duration Transition ---
            else if (userSession.step === 'AWAITING_STYLE') {
                await showDurationStep(message, input);
            }
        } catch (error) {
            console.error('Error in message handler:', error);
            await message.reply(`${EMOJIS.ERROR} An unexpected error occurred. Please try \`/music\` again.`);
        }
        return;
    }

    // Conversational trigger checks
    const isMentioned = message.mentions.has(client.user.id);
    let isReplyToBot = false;
    let originalSongContext = null;
    let originalLyrics = null;

    if (message.reference && message.reference.messageId) {
        try {
            const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (referencedMsg.author.id === client.user.id) {
                isReplyToBot = true;

                // Check if the referenced message is a completed song/instrumental message
                const embed = referencedMsg.embeds[0];
                if (embed && embed.title && embed.title.includes('Generation Complete!')) {
                    console.log(`[Bot] Detected reply to completed song message: ${referencedMsg.id}`);
                    
                    // Extract metadata from the embed fields
                    const styleField = embed.fields.find(f => f.name === 'Style');
                    const durationField = embed.fields.find(f => f.name === 'Duration');
                    const bpmField = embed.fields.find(f => f.name === 'BPM');
                    const keyField = embed.fields.find(f => f.name === 'Key');

                    const style = styleField ? styleField.value : 'Unknown';
                    const durationRaw = durationField ? durationField.value : '60s';
                    const duration = parseInt(durationRaw) || 60;
                    const bpm = bpmField ? parseInt(bpmField.value) : null;
                    const keyscale = keyField ? keyField.value : null;

                    const description = embed.description || '';
                    const isInstrumental = description.toLowerCase().includes('instrumental');

                    // If it's a song (vocals), search channel history for lyrics
                    let lyrics = null;
                    if (!isInstrumental) {
                        try {
                            const recentMessages = await message.channel.messages.fetch({ limit: 30 });
                            const lyricsMsg = recentMessages.find(m => 
                                m.author.id === client.user.id && 
                                m.embeds[0] && 
                                m.embeds[0].title && 
                                m.embeds[0].title.includes('Lyrics Crafted')
                            );
                            if (lyricsMsg) {
                                const lyricsDesc = lyricsMsg.embeds[0].description || '';
                                const match = lyricsDesc.match(/```(?:\w+)?\n([\s\S]+?)\n```/);
                                if (match) {
                                    lyrics = match[1].trim();
                                } else {
                                    lyrics = lyricsDesc.replace(/```/g, '').trim();
                                }
                                console.log('[Bot] Successfully retrieved original lyrics from channel history.');
                            }
                        } catch (err) {
                            console.error('[Bot] Failed to retrieve lyrics from history:', err);
                        }
                    }

                    originalLyrics = lyrics;

                    // Build context message for LLM
                    originalSongContext = `The user is replying to a song/instrumental they previously generated. 
Here are the details of the original generation:
- **Type**: ${isInstrumental ? 'Instrumental (no lyrics)' : 'Vocal Song (with lyrics)'}
- **Style/Description**: "${style}"
- **Duration**: ${duration} seconds
- **BPM**: ${bpm || 'Auto/Default'}
- **Key**: ${keyscale || 'Auto/Default'}`;

                    if (lyrics) {
                        originalSongContext += `\n- **Lyrics**:\n${lyrics}`;
                    }

                    originalSongContext += `\n\nYour task is to interpret the user's edit/remix request, modify the appropriate parameters, and regenerate the song by calling the "generate_music" tool with the updated parameters.
IMPORTANT: Since the user is editing/remixing an existing song, you MUST pass the lyrics (either the original lyrics below, or the modified lyrics if the user requested lyric changes) in the "lyrics" parameter of the "generate_music" tool call. If you do not pass the "lyrics" parameter, the regenerated song will be an instrumental without vocals!`;
                }
            }
        } catch (e) {
            console.error('[Bot] Error parsing reply reference message:', e);
        }
    }

    if (isMentioned || isReplyToBot) {
        // Clean mention
        let cleanedContent = message.content;
        const botMentionRegex = new RegExp(`<@!?${client.user.id}>`, 'g');
        cleanedContent = cleanedContent.replace(botMentionRegex, '').trim();

        if (cleanedContent === '') {
            cleanedContent = 'hello';
        }

        // Detect and detail audio file attachments (either on this message or the referenced reply message)
        let attachmentInfo = '';
        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('audio/')) {
                attachmentInfo = `\n\n[Attachment: name="${attachment.name}", size=${attachment.size} bytes, url="${attachment.url}"]\nThe user attached an audio file. You must call the "analyze_audio" tool with the URL to retrieve its details (lyrics, style, duration, BPM, etc.) before proceeding or proposing edits.`;
            }
        } else if (message.reference && message.reference.messageId) {
            try {
                const referencedMsg = await message.channel.messages.fetch(message.reference.messageId);
                if (referencedMsg.attachments && referencedMsg.attachments.size > 0) {
                    const attachment = referencedMsg.attachments.first();
                    if (attachment.contentType && attachment.contentType.startsWith('audio/')) {
                        attachmentInfo = `\n\n[Attachment from Replied Message: name="${attachment.name}", size=${attachment.size} bytes, url="${attachment.url}"]\nThe message you replied to has an audio file attached. You must call the "analyze_audio" tool with the URL to retrieve its details (lyrics, style, duration, BPM, etc.) before proposing edits.`;
                    }
                }
            } catch (err) {
                console.error('[Bot] Error checking referenced message attachments:', err);
            }
        }

        if (attachmentInfo) {
            cleanedContent += attachmentInfo;
        }

        try {
            await runConversationalAgent(message, cleanedContent, originalSongContext, originalLyrics);
        } catch (error) {
            console.error('[Bot] Conversational Agent Error:', error);
            await message.reply(`${EMOJIS.ERROR} I had trouble processing your request. Please try again.`);
        }
    }
});

module.exports = client;
