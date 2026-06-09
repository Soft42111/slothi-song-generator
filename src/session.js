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

    initConversational(userId, systemPrompt) {
        return this.set(userId, {
            step: 'conversational',
            messages: [{ role: 'system', content: systemPrompt }]
        });
    }

    pruneMessages(userId, maxMessages = 20) {
        const session = this.get(userId);
        if (!session || !session.messages || session.messages.length <= maxMessages) return;

        const systemPrompt = session.messages[0];
        const recentMessages = session.messages.slice(-maxMessages);
        
        // Ensure system prompt is preserved at index 0
        if (systemPrompt && systemPrompt.role === 'system') {
            session.messages = [systemPrompt, ...recentMessages.filter(m => m.role !== 'system')];
        } else {
            session.messages = recentMessages;
        }
        
        session.lastUpdate = Date.now();
        this.sessions.set(userId, session);
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
