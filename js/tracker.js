/**
 * ============================================================
 * TRACKER MODULE - Monitors participant activity
 * ============================================================
 * Tracks tab switches, copy/paste, keyboard shortcuts,
 * and time spent per challenge.
 * ============================================================
 */

const Tracker = {
    _active: false,
    _participantId: null,
    _challengeId: null,
    _startTime: null,
    _log: null,

    // ── Start Tracking ────────────────────────────────────
    start(participantId, challengeId) {
        this._active = true;
        this._participantId = participantId;
        this._challengeId = challengeId;
        this._startTime = Date.now();
        this._log = Storage.getActivityLog(participantId, challengeId);

        this._bindEvents();
    },

    // ── Stop Tracking ─────────────────────────────────────
    stop() {
        this._active = false;
        this._updateTimeSpent();
        this._save();
        this._unbindEvents();
    },

    // ── Event Binding ─────────────────────────────────────
    _bindEvents() {
        this._onVisibilityChange = () => {
            if (!this._active) return;
            if (document.hidden) {
                this._log.tabSwitches++;
                this._log.events.push({
                    type: 'tab_switch',
                    timestamp: new Date().toISOString()
                });
                this._save();
                Tracker._showWarning('Tab switch detected! (-2 marks)');
            }
        };

        this._onCopy = (e) => {
            if (!this._active) return;
            this._log.copyCount++;
            this._log.events.push({
                type: 'copy',
                timestamp: new Date().toISOString()
            });
            this._save();
            Tracker._showWarning('Copy action detected! (-5 marks)');
        };

        this._onPaste = (e) => {
            if (!this._active) return;
            this._log.pasteCount++;
            this._log.events.push({
                type: 'paste',
                timestamp: new Date().toISOString()
            });
            this._save();
            Tracker._showWarning('Paste action detected! (-1 mark)');
        };

        this._onKeyDown = (e) => {
            if (!this._active) return;
            // Track Ctrl shortcuts (except normal typing)
            if (e.ctrlKey && ['c', 'v', 'x', 'z', 'a', 's'].includes(e.key.toLowerCase())) {
                this._log.keyShortcuts++;
                this._log.events.push({
                    type: 'shortcut',
                    key: `Ctrl+${e.key.toUpperCase()}`,
                    timestamp: new Date().toISOString()
                });
                this._save();
            }
        };

        document.addEventListener('visibilitychange', this._onVisibilityChange);
        document.addEventListener('copy', this._onCopy);
        document.addEventListener('paste', this._onPaste);
        document.addEventListener('keydown', this._onKeyDown);
    },

    _unbindEvents() {
        document.removeEventListener('visibilitychange', this._onVisibilityChange);
        document.removeEventListener('copy', this._onCopy);
        document.removeEventListener('paste', this._onPaste);
        document.removeEventListener('keydown', this._onKeyDown);
    },

    // ── Internal Helpers ──────────────────────────────────
    _updateTimeSpent() {
        if (this._startTime) {
            this._log.timeSpent += Math.floor((Date.now() - this._startTime) / 1000);
            this._startTime = Date.now();
        }
    },

    _save() {
        this._updateTimeSpent();
        Storage.saveActivityLog(this._log);
    },

    _showWarning(message) {
        const warn = document.getElementById('tracker-warning');
        if (warn) {
            warn.textContent = message;
            warn.classList.add('show');
            setTimeout(() => warn.classList.remove('show'), 3000);
        }
    },

    // ── Get Current Stats ─────────────────────────────────
    getStats() {
        if (!this._log) return null;
        this._updateTimeSpent();
        return {
            tabSwitches: this._log.tabSwitches,
            copyCount: this._log.copyCount,
            pasteCount: this._log.pasteCount,
            keyShortcuts: this._log.keyShortcuts,
            timeSpent: this._log.timeSpent
        };
    }
};
