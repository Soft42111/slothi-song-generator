# 🎵 Discord AI Music Bot (Sogni + A-step)

## 🧠 Objective
Build a Discord bot that generates music using:
- Sogni SDK
- A-step model (music generation)
- Qwen 3.5 (lyrics generation)

Bot should guide users through a **Q&A flow** and return a **.mp3/.wav file**.

---

## ⚙️ Core Command

/music OR !music

---

## 🔁 Interaction Flow

### Step 1: Ask Type
"Do you want lyrics or instrumental?"

Options:
- Lyrics
- Instrumental

---

### 🎧 IF Instrumental

Step 2:
Ask → "Enter prompt (genre, mood, tempo, vibe)"

Step 3:
→ Generate music using A-step model

Step 4:
→ Return .mp3/.wav file in Discord chat

---

### ✍️ IF Lyrics

Step 2:
Ask → "Provide lyrics OR type 'generate'"

---

#### Case A: User Provides Lyrics

Step 3:
Ask → "Enter music style (genre, mood)"

Step 4:
→ Generate music using A-step + lyrics

Step 5:
→ Return .mp3/.wav

---

#### Case B: User Types "generate"

Step 3:
Ask → "Enter theme/mood/topic"

Step 4:
→ Generate lyrics using Qwen 3.5 (Sogni SDK)

Step 5:
Ask → "Enter music style"

Step 6:
→ Generate music using A-step + generated lyrics

Step 7:
→ Return .mp3/.wav

---

## 🧱 Architecture

Discord Bot (discord.js)
↓
Interaction Handler (slash command + buttons)
↓
Session Manager (per user state)
↓
AI Layer:
  - Lyrics → Qwen 3.5 (Sogni SDK)
  - Music → A-step (Sogni SDK)
↓
File Processor (convert to .mp3/.wav)
↓
Discord Upload

---

## 📦 Tech Stack

- Node.js
- discord.js v14
- axios / fetch
- fs (file handling)
- ffmpeg (optional for conversion)
- Sogni SDK

---

## 💻 Core Implementation

### 1. Setup Bot

- Create Discord bot
- Enable intents
- Install deps:

```bash
npm init -y
npm install discord.js axios