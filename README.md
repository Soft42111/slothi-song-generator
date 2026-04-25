# 🎵 Sogni Music Generator

A premium, high-fidelity Discord music generation bot powered by the **Sogni Supernet**. Create professional-grade songs and instrumentals directly from your Discord server with an interactive, "Liquid Glass" themed interface.

**Developed by Basit**

## ✨ Features

- 🎵 **Full Song Generation**: Generate lyrics and music in one flow using ACE-Step 1.5 SFT.
- 🎹 **Pro Instrumentals**: High-quality background tracks via ACE-Step 1.5 Turbo.
- ✍️ **AI Lyricist**: Deep, meaningful lyrics powered by Qwen 3.5.
- ⏱️ **Flexible Duration**: Choose between 10s and 600s with real-time UI controls or "Auto" best-fit.
- 💬 **Hybrid Commands**: Seamless support for Slash Commands (`/music`) and Prefix Commands (`!music`).
- 💎 **Liquid Glass UI**: Beautifully crafted embeds and interactive buttons for a premium experience.

## 🚀 Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- A Sogni API Key from [sogni.ai](https://sogni.ai)
- A Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/Soft42111/slothi-song-generator.git
cd slothi-song-generator
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
DISCORD_TOKEN=your_discord_token_here
SOGNI_API_KEY=your_sogni_api_key_here
SOGNI_APP_ID=music-bot-sogni
NETWORK=fast
```

### 4. Start the Bot
The bot will automatically deploy slash commands on startup.
```bash
npm start
```

## 🛠️ Commands

- `/music` | `!music`: Start the interactive music generation flow.
- `/song` | `!song`: Alias for music generation.
- `/help` | `!help`: View the help menu and instructions.
- `/cancel` | `!cancel`: Cancel a currently active session.

## 🛡️ Tech Stack
- **Engine**: [Node.js](https://nodejs.org/)
- **SDK**: [Sogni Client](https://www.npmjs.com/package/@sogni-ai/sogni-client)
- **API**: [Discord.js v14](https://discord.js.org/)
- **LLM**: Qwen 3.5 (via Sogni Supernet)

## 📜 License
This project is open source and available under the ISC License.
