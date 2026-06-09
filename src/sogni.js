const { SogniClient } = require('@sogni-ai/sogni-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const mm = require('music-metadata');
require('dotenv').config();

class SogniService {
    constructor() {
        this.globalClient = null;
    }


    async init() {
        if (!this.globalClient) {
            this.globalClient = await SogniClient.createInstance({
                appId: process.env.SOGNI_APP_ID || `discord-music-bot-${uuidv4()}`,
                apiKey: process.env.SOGNI_API_KEY,
                network: process.env.NETWORK || 'fast'
            });
            console.log('Sogni SDK global initialized.');
        }
        return this.globalClient;
    }

    /**
     * Generate lyrics using Qwen 3.6
     */
    async generateLyrics(theme) {
        const client = await this.init();
        
        const prompt = `Write high-quality, structured song lyrics about: ${theme}. 
        Use structure tags like [Verse 1], [Chorus], [Bridge], [Outro]. 
        Ensure the lyrics are expressive, emotional, and follow the theme strictly.
        IMPORTANT: Output ONLY the lyrics. Do not include thinking tags, introductions, or explanations.`;

        const response = await client.chat.completions.create({
            model: 'qwen3.6-35b-a3b-gguf-iq4xs',
            messages: [
                { 
                    role: 'system', 
                    content: 'You are an award-winning songwriter and poet. Your specialty is writing lyrics with perfect rhythm, strong rhyme schemes (AABB, ABAB, etc.), and deep emotional resonance. You always structure your songs with clear tags like [Verse 1], [Chorus], [Bridge], and [Outro]. Output ONLY the lyrics themselves.' 
                },
                { role: 'user', content: prompt }
            ],
            max_tokens: 2048,
            temperature: 0.8 // Slightly higher for more creative rhymes
        });

        let content = response.content || '';
        
        // Aggressively strip <think> tags and anything inside them, even if not closed
        let cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
        
        return cleanContent || 'Error: Could not generate clean lyrics. Please try again.';
    }

    /**
     * Generate a creative lyrics prompt/theme using Qwen 3.6
     */
    async generateLyricsPrompt() {
        const client = await this.init();
        
        const systemPrompt = `You are a creative brainstorming assistant for songwriters. Your task is to generate a unique, emotionally resonant, and detailed song theme or prompt.
        IMPORTANT: Output ONLY the song prompt/theme itself in a single sentence (e.g., "A story about a time traveler who visits their childhood home but cannot change the past"). Do not include any introduction, explanations, quotes, or thinking tags.`;

        console.log(`[Sogni] Generating lyrics prompt with Qwen 3.6...`);
        const response = await client.chat.completions.create({
            model: 'qwen3.6-35b-a3b-gguf-iq4xs',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Generate a creative song theme.' }
            ],
            max_tokens: 256,
            temperature: 0.9
        });

        let content = response.content || '';
        let cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
        cleanContent = cleanContent.replace(/^["']|["']$/g, '').trim();
        console.log(`[Sogni] Generated theme: "${cleanContent}"`);
        return cleanContent;
    }

    /**
     * Enhance style prompt using Qwen 3.6 prompt harness
     */
    async enhanceStylePrompt(style, duration, isInstrumental = false) {
        const client = await this.init();

        const systemPrompt = `You are a professional music prompt enhancer for AI music generation models (like ACE-Step 1.5). 
Your task is to expand the user's simple music style description into a highly descriptive, cohesive, and detailed prompt.
The output must be a single, descriptive paragraph (50-100 words) containing:
1. Genre and musical sub-genres.
2. Core instrumentation (e.g. warm acoustic guitar, layered analog synths, acoustic piano, clear drum machine beats).
3. Mood, tempo (BPM), and atmosphere.
${isInstrumental ? 
`4. Explicitly state that it is an instrumental track with NO vocals.` : 
`4. Describe the lead vocalist's voice in a natural, human way (e.g., 'warm, expressive female lead vocals with clear pronunciation and natural delivery', 'passionate male tenor vocals with clear diction').
5. Describe a well-balanced studio mix where the vocal performance sits beautifully and naturally alongside the backing instruments, ensuring clean production without overwhelming the music.`
}

CRITICAL RULES:
- Output ONLY the final enhanced prompt. Do NOT include any intro, conversational filler, markdown formatting (like quotes), or thinking tags in your final answer.
- DO NOT use dry, technical engineering commands or symbols in the prompt (e.g., avoid terms like 'compression', 'limiting', '-3dB', 'mix rule', 'mixing note'). Instead, use evocative, musical descriptions of a 'clean, spacious, well-balanced, high-fidelity studio mix'.
- Ensure the prompt flows naturally and describes a single cohesive piece of music.`;

        const userPrompt = `Style / Description: ${style}\nDuration: ${duration} seconds`;

        console.log(`[Sogni] Enhancing style prompt using harness (model: qwen3.6-35b-a3b-gguf-iq4xs, instrumental: ${isInstrumental})...`);

        const response = await client.chat.completions.create({
            model: 'qwen3.6-35b-a3b-gguf-iq4xs',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            max_tokens: 1024,
            temperature: 0.7
        });

        let content = response.content || '';
        let cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '').trim();
        cleanContent = cleanContent.replace(/^["']|["']$/g, '').trim();
        
        console.log(`[Sogni] Harness enhanced style prompt: "${cleanContent}"`);
        return cleanContent || style;
    }

    /**
     * Generate music using ACE-Step 1.5
     */
    async generateMusic(style, lyrics = null, isInstrumental = false, duration = 60, options = {}) {
        const client = await this.init();

        console.log(`[Sogni] Starting ${isInstrumental ? 'instrumental' : 'song'} generation:`, { style, duration, options });

        // Enhance the style prompt using the Qwen prompt harness
        let enhancedStyle = style;
        try {
            enhancedStyle = await this.enhanceStylePrompt(style, duration, isInstrumental);
        } catch (err) {
            console.error('[Sogni] Harness prompt enhancement failed, falling back to original style:', err.message);
        }

        // For vocal tracks, append natural, artistic vocal descriptors instead of dry mixing instructions
        let finalPrompt = enhancedStyle;
        if (!isInstrumental) {
            finalPrompt += ', clear and expressive lead vocals, natural human singing voice, well-balanced spacious mix, high-fidelity production';
        }

        // Parse keyscale/key
        let keyscale = options.keyscale || options.key || 'C major';
        if (keyscale === 'Auto' || keyscale === 'auto') {
            keyscale = 'C major';
        }

        // Convert user-friendly time signature (e.g. '4/4', '3/4', '6/8') to SDK format (just numerator)
        let timesig = options.timesignature || options.time_signature || '4';
        if (timesig.includes('/')) {
            timesig = timesig.split('/')[0];
        }

        const params = {
            type: 'audio',
            modelId: options.modelId || (isInstrumental ? 'ace_step_1.5_turbo' : 'ace_step_1.5_sft'),
            positivePrompt: finalPrompt,
            duration: duration,
            bpm: options.bpm || options.tempo || 120, // default to 120 per user request
            keyscale: keyscale,
            timesignature: timesig,
            steps: options.steps || (isInstrumental ? 8 : 12), // Higher steps for vocal SFT model
            outputFormat: options.outputFormat || options.output_format || 'mp3',
            composerMode: options.composerMode !== undefined ? options.composerMode : true,
            promptStrength: options.promptStrength !== undefined ? options.promptStrength : (options.prompt_strength !== undefined ? options.prompt_strength : 3.5)
        };

        if (options.creativity !== undefined) {
            params.creativity = options.creativity;
        } else {
            params.creativity = 0.85; // default to 0.85 per user request
        }

        if (options.shift !== undefined) {
            params.shift = options.shift;
        } else {
            params.shift = 3; // default to 3 per user request
        }

        if (lyrics) {
            params.lyrics = lyrics;
            params.language = options.language || 'en'; // Default to English
        }

        const project = await client.projects.create(params);
        
        // Bypass the built-in REST sync timeout check that triggers false failures due to 404 REST status during processing
        if (project._timeout) {
            clearInterval(project._timeout);
            project._timeout = null;
        }

        project.on('progress', (progress) => {
            const displayProgress = isNaN(progress) ? 'Processing' : `${progress}%`;
            console.log(`[Sogni] Generation Progress: ${displayProgress}`);
        });

        // Wait for completion with resilient monitoring
        console.log(`[Sogni] Monitoring job resolution (ID: ${project.id})...`);
        
        const timeoutMs = 12 * 60 * 1000; // 12 minutes
        const startTime = Date.now();
        let urls = [];

        while (Date.now() - startTime < timeoutMs) {
            // Check status and urls (updated automatically by SDK internal listeners)
            if (project.resultUrls && project.resultUrls.length > 0) {
                urls = project.resultUrls;
                break;
            }

            if (project.status === 'completed' && project.resultUrls && project.resultUrls.length > 0) {
                urls = project.resultUrls;
                break;
            }

            if (project.status === 'failed') {
                const errMsg = project.error
                    ? (typeof project.error === 'object' ? (project.error.message || JSON.stringify(project.error)) : project.error)
                    : 'Unknown server error';
                throw new Error(`Sogni Job Failed: ${errMsg}`);
            }

            // Wait a bit before checking again
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        console.log('[Sogni] Final resolution check:', { status: project.status, urlsCount: urls.length });
        
        if (!urls || urls.length === 0) {
            // Use native waiter as last resort
            try {
                urls = await Promise.race([
                    project.waitForCompletion(),
                    new Promise((_, r) => setTimeout(() => r(new Error('Final timeout')), 30000))
                ]);
            } catch (e) {
                // Return whatever we have if wait failed
                urls = project.resultUrls || [];
            }
        }

        if (!urls || urls.length === 0) {
            console.error('[Sogni] Fatal: All retrieval methods exhausted.');
            throw new Error(`Music generation failed - No URLs received. Status: ${project.status}`);
        }

        return urls[0];
    }

    /**
     * Download file from URL to local temp storage
     */
    async downloadFile(url, filename) {
        if (!url || typeof url !== 'string') {
            throw new Error(`Invalid download URL: ${typeof url} received instead of string`);
        }
        console.log(`[Sogni] Downloading from: ${url}`);
        
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, filename);
        const writer = fs.createWriteStream(filePath);

        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 60000 // 60s for download
            });

            response.data.pipe(writer);

            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    console.log(`[Sogni] Download successful: ${filePath}`);
                    resolve(filePath);
                });
                writer.on('error', (err) => {
                    console.error('[Sogni] Pipe error:', err);
                    reject(err);
                });
            });
        } catch (err) {
            console.error(`[Sogni] Axios download failed: ${err.message}`);
            throw err;
        }
    }

    /**
     * Chat completion using Qwen 3.6
     */
    async chatCompletion(messages, tools = null) {
        const client = await this.init();
        const params = {
            model: 'qwen3.6-35b-a3b-gguf-iq4xs',
            messages: messages,
            max_tokens: 1024,
            temperature: 0.7
        };
        if (tools) {
            params.tools = tools;
            params.tool_choice = 'auto';
        }
        const response = await client.chat.completions.create(params);

        // Normalize response to OpenAI-standard { choices: [{ message }] } format.
        // The Sogni SDK may return the message object directly (with .content, .tool_calls)
        // or the full { choices: [{ message }] } wrapper — handle both gracefully.
        if (response && response.choices && Array.isArray(response.choices)) {
            return response; // Already in standard format
        }
        // SDK returned the message object directly
        return {
            choices: [{
                message: response,
                finish_reason: response.tool_calls ? 'tool_calls' : 'stop'
            }]
        };
    }

    /**
     * Save details of a generated song to a local registry
     */
    saveGeneration(filename, fileSize, details) {
        try {
            const dbPath = path.join(process.cwd(), 'temp', 'generations.json');
            let data = [];
            if (fs.existsSync(dbPath)) {
                data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            } else {
                const tempDir = path.dirname(dbPath);
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }
            }
            data.push({
                filename,
                fileSize,
                ...details,
                timestamp: Date.now()
            });
            // Keep the registry size bounded to last 200 items
            if (data.length > 200) {
                data.shift();
            }
            fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`[Sogni] Registered generation: ${filename} (${fileSize} bytes)`);
        } catch (err) {
            console.error('[Sogni] Failed to save generation details:', err);
        }
    }

    /**
     * Search the local registry for a matching generation
     */
    lookupGeneration(filename, fileSize) {
        try {
            const dbPath = path.join(process.cwd(), 'temp', 'generations.json');
            if (!fs.existsSync(dbPath)) return null;
            const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
            
            // Try matching by exact file size first
            let match = data.find(g => g.fileSize === fileSize);
            if (match) return match;
            
            // Fallback to filename match
            match = data.find(g => g.filename === filename);
            return match || null;
        } catch (err) {
            console.error('[Sogni] Failed to lookup generation:', err);
            return null;
        }
    }

    /**
     * Download and analyze an audio file (using local registry match or metadata parser)
     */
    async analyzeAudioFile(url) {
        console.log(`[Sogni] Analyzing audio from: ${url}`);
        
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, `analyze_${Date.now()}.mp3`);
        const writer = fs.createWriteStream(tempPath);
        
        try {
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                timeout: 30000
            });
            
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            const stats = fs.statSync(tempPath);
            const fileSize = stats.size;
            const parsedUrl = new URL(url);
            const originalName = path.basename(parsedUrl.pathname);
            
            console.log(`[Sogni] Downloaded for analysis: ${originalName} (${fileSize} bytes)`);
            
            // Check in generations database
            const match = this.lookupGeneration(originalName, fileSize);
            if (match) {
                console.log('[Sogni] Match found in local generations history database.');
                try { fs.unlinkSync(tempPath); } catch (e) {}
                return {
                    source: 'Bot Generation History',
                    matched: true,
                    filename: match.filename,
                    style: match.style,
                    lyrics: match.lyrics,
                    duration: match.duration,
                    bpm: match.bpm,
                    keyscale: match.keyscale,
                    isInstrumental: match.isInstrumental
                };
            }
            
            // Parse using music-metadata
            let metadataInfo = {
                source: 'Metadata Extraction',
                matched: false,
                filename: originalName,
                fileSize: fileSize,
                duration: null,
                format: null,
                title: null,
                artist: null,
                comment: null,
                lyrics: null
            };
            
            try {
                const metadata = await mm.parseFile(tempPath);
                metadataInfo.duration = metadata.format.duration ? Math.round(metadata.format.duration) : null;
                metadataInfo.format = metadata.format.container || null;
                metadataInfo.title = metadata.common.title || null;
                metadataInfo.artist = metadata.common.artist || null;
                metadataInfo.comment = metadata.common.comment ? metadata.common.comment.join(', ') : null;
                
                if (metadata.common.lyrics) {
                    metadataInfo.lyrics = metadata.common.lyrics.join('\n');
                }
            } catch (err) {
                console.warn('[Sogni] music-metadata failed to parse:', err.message);
            }
            
            try { fs.unlinkSync(tempPath); } catch (e) {}
            return metadataInfo;
        } catch (err) {
            console.error('[Sogni] Error in analyzeAudioFile:', err);
            try { fs.unlinkSync(tempPath); } catch (e) {}
            throw err;
        }
    }

    /**
     * Clean up temp file
     */
    cleanup(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = new SogniService();
