# Master Memory: Sogni Song-Music Generator

This is the consolidated memory file for the Sogni Song-Music Generator project. It is updated at the end of each working day/session to keep a continuous record of the project state, goals, and history.

---

## 1. Project Profile
- **Project Name**: Sogni Song-Music Generator
- **Description**: A Discord bot that integrates with the Sogni API to generate music/songs based on user requests.
- **Tech Stack**:
  - Node.js (JavaScript)
  - discord.js (Discord API)
  - Sogni SDK/API (music generation)
  - GitHub Actions (for deployment to Kerit Cloud Pterodactyl panel)

---

## 2. User Preferences & Configuration
- **OS**: Windows (Local development)
- **Deployment**: Kerit Cloud (using Pterodactyl Client API power actions for automated redeploys on pushes to `main`).
- **Secrets Management**: Configured via local `.env` and GitHub repository secrets (`PTERODACTYL_URL`, `PTERODACTYL_API_KEY`, `PTERODACTYL_SERVER_ID`).
- **Memory Retention**: Temp daily files should be manually deleted after 30 days.

---

## 3. Chronological Progress Summary

### 2026-06-09
- **Actions**:
  - Replaced the broken Pterodactyl auto-deployment action in `.github/workflows/deploy.yml` with a direct `curl`-based client API trigger (console update signal + server power restart).
  - Started the bot locally to verify its initial runtime and connection status.
  - Implemented the persistent memory system (`memory/` directory containing `SOUL.md`, `Memory.md`, and today's daily log `memory_jun9.md`).
- **Status**: Bot deployment and memory structures are functional.

---

## 4. Current Project Status & Next Steps
- **Active Goals**:
  - Maintain the memory system daily.
  - Monitor bot execution logs.
- **Key Files**:
  - [index.js](file:///C:/Users/Dell/Desktop/Sogni%20Song-Music%20Generator/index.js) (Bot main script)
  - [.github/workflows/deploy.yml](file:///C:/Users/Dell/Desktop/Sogni%20Song-Music%20Generator/.github/workflows/deploy.yml) (Deployment workflow)
  - [.env](file:///C:/Users/Dell/Desktop/Sogni%20Song-Music%20Generator/.env) (Local configuration)
