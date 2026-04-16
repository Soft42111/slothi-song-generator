# 🦥 Slothi Song Guy
A high-fidelity Discord music generation bot powered by the **Sogni Supernet**. Generate professional-grade songs and instrumentals directly from your Discord server with interactive controls.

**Made by Basit**

## ✨ Features
- 🎵 **Song Generation**: Generate full lyrics and music using ACE-Step 1.5 SFT.
- 🎹 **Instrumentals**: Fast, high-quality background tracks via ACE-Step 1.5 Turbo.
- ✍️ **AI Lyricist**: Powered by Qwen 3.5 for deep, meaningful, and structured lyrics.
- ⏱️ **Interactive Duration**: Choose between 10s and 600s with real-time UI controls or "Auto" best-fit.
- 💬 **Hybrid Commands**: Full support for Slash Commands (`/music`) and Prefix Commands (`!music`).

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
```

### 4. Deployment
Deploy slash commands to your Discord server:
```bash
node src/deploy-commands.js
```

### 5. Start the Bot
```bash
npm start
```

## 🛠️ Commands
- `/music` / `!music`: Start the interactive music generation flow.
- `/song` / `!song`: Alias for music generation.
- `/help` / `!help`: View the help menu.
- `/cancel` / `!cancel`: Cancel a currently active session.

## 📜 License
This project is open source and available under the ISC License.
