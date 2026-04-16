/**
 * Session Manager
 * Keeps track of user progress through the multi-step music generation flow.
 */

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes timeout
    }

    get(userId) {
        return this.sessions.get(userId);
    }

    set(userId, data) {
        const session = {
            ...data,
            lastUpdate: Date.now()
        };
        this.sessions.set(userId, session);
        return session;
    }

    update(userId, data) {
        const existing = this.sessions.get(userId) || {};
        const updated = {
            ...existing,
            ...data,
            lastUpdate: Date.now()
        };
        this.sessions.set(userId, updated);
        return updated;
    }

    delete(userId) {
        this.sessions.delete(userId);
    }

    // Cleanup inactive sessions
    cleanup() {
        const now = Date.now();
        for (const [userId, session] of this.sessions.entries()) {
            if (now - session.lastUpdate > this.TIMEOUT_MS) {
                this.sessions.delete(userId);
            }
        }
    }
}

module.exports = new SessionManager();
