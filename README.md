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

Follow these steps to get your own instance of the Sogni Music Generator up and running.

### 1. Prerequisites
Before you begin, ensure you have the following:
- **Node.js**: Version 18.0.0 or higher. [Download here](https://nodejs.org/).
- **Discord Bot Token**: Create an application on the [Discord Developer Portal](https://discord.com/developers/applications), add a bot, and copy the token.
- **Sogni API Key**: Sign up at [sogni.ai](https://sogni.ai) to obtain your API key for the Sogni Supernet.
- **Privileged Gateway Intents**: Ensure **Message Content Intent** is enabled in your Discord Developer Portal settings.

### 2. Installation
Clone the repository and install the required dependencies:
```bash
git clone https://github.com/Soft42111/slothi-song-generator.git
cd slothi-song-generator
npm install
```

### 3. Configuration
1. Rename the `.env.example` (if provided) or create a new `.env` file in the root directory.
2. Fill in your credentials:
```env
DISCORD_TOKEN=your_discord_token_here
SOGNI_API_KEY=your_sogni_api_key_here
SOGNI_APP_ID=music-bot-sogni
NETWORK=fast
```
*Note: `SOGNI_APP_ID` is used for internal tracking on the Sogni Supernet.*

### 4. Deployment & Execution
The bot uses a consolidated startup script that handles both slash command deployment and bot login.

**To start the bot:**
```bash
npm start
```

On first run, it will register the slash commands (`/music`, `/song`, etc.) globally for your bot.

## 🛠️ Commands

The bot supports both Slash Commands and traditional Prefix Commands (`!`).

| Slash Command | Prefix Command | Description |
| :--- | :--- | :--- |
| `/music` | `!music` | Starts the interactive generation flow. |
| `/song` | `!song` | Alias for music generation. |
| `/help` | `!help` | Displays the help menu and usage tips. |
| `/cancel` | `!cancel` | Aborts your current active session. |

## 📝 Usage Guide
1. **Initiate**: Type `/music` in any channel the bot has access to.
2. **Choose Type**: Select between **Lyrics + Music** or **Instrumental**.
3. **Input Content**:
   - For Lyrics: Choose to write your own or let the AI generate them based on a theme.
   - For Instrumental: Provide a descriptive prompt (e.g., "Deep House, 124 BPM, chill").
4. **Set Duration**: Adjust the track length (10s to 600s) or use "Auto" for the best fit.
5. **Receive**: Wait for the Sogni Supernet to compose your track. The bot will upload the final MP3 directly to the channel.

## 🛡️ Tech Stack
- **Engine**: [Node.js](https://nodejs.org/)
- **SDK**: [Sogni Client](https://www.npmjs.com/package/@sogni-ai/sogni-client)
- **API**: [Discord.js v14](https://discord.js.org/)
- **LLM**: Qwen 3.5 (via Sogni Supernet)
- **Audio Gen**: ACE-Step 1.5 (SFT & Turbo)

## 📜 License
This project is open source and available under the ISC License.
