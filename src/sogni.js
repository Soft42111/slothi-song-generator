const { SogniClient } = require('@sogni-ai/sogni-client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

class SogniService {
    constructor() {
        this.client = null;
    }

    async init() {
        if (!this.client) {
            this.client = await SogniClient.createInstance({
                appId: process.env.SOGNI_APP_ID || `discord-music-bot-${uuidv4()}`,
                apiKey: process.env.SOGNI_API_KEY,
                network: process.env.NETWORK || 'fast'
            });
            console.log('Sogni SDK initialized.');
        }
        return this.client;
    }

    /**
     * Generate lyrics using Qwen 3.5
     */
    async generateLyrics(theme) {
        await this.init();
        
        const prompt = `Write high-quality, structured song lyrics about: ${theme}. 
        Use structure tags like [Verse 1], [Chorus], [Bridge], [Outro]. 
        Ensure the lyrics are expressive, emotional, and follow the theme strictly.
        IMPORTANT: Output ONLY the lyrics. Do not include thinking tags, introductions, or explanations.`;

        const response = await this.client.chat.completions.create({
            model: 'qwen3.5-35b-a3b-gguf-q4km',
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
     * Generate music using ACE-Step 1.5
     */
    async generateMusic(style, lyrics = null, isInstrumental = false, duration = 60) {
        await this.init();

        console.log(`[Sogni] Starting ${isInstrumental ? 'instrumental' : 'song'} generation:`, { style, duration });

        const params = {
            type: 'audio',
            modelId: isInstrumental ? 'ace_step_1.5_turbo' : 'ace_step_1.5_sft',
            positivePrompt: style,
            duration: duration,
            bpm: 128,
            keyscale: 'C major',
            timesignature: '4',
            steps: 8,
            outputFormat: 'mp3'
        };

        if (lyrics) {
            params.lyrics = lyrics;
            params.language = 'en'; // Default to English
        }

        const project = await this.client.projects.create(params);
        
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
                throw new Error(`Sogni Job Failed: ${project.error || 'Unknown server error'}`);
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
     * Clean up temp file
     */
    cleanup(filePath) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}

module.exports = new SogniService();
