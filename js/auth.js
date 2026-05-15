/**
 * ============================================================
 * AUTH MODULE - Handles login/logout for both panels
 * ============================================================
 */

const Auth = {
    // ── Participant Auth ──────────────────────────────────
    loginParticipant(lotNumber) {
        let participant = Storage.getParticipantByLot(lotNumber);
        
        if (!participant) {
            return { success: false, message: 'Invalid Lot Number. Please ask admin to add your lot number.' };
        }

        sessionStorage.setItem('currentUser', JSON.stringify({
            id: participant.id,
            username: participant.username,
            lotNumber: participant.lotNumber,
            role: 'participant'
        }));
        return { success: true, user: participant };
    },

    // ── Admin Auth ────────────────────────────────────────
    loginAdmin(username, password) {
        const admin = Storage.validateAdmin(username, password);
        if (admin) {
            sessionStorage.setItem('currentAdmin', JSON.stringify({
                id: admin.id,
                username: admin.username,
                role: 'admin'
            }));
            return { success: true, user: admin };
        }
        return { success: false, message: 'Invalid admin credentials.' };
    },

    // ── Session Checks ───────────────────────────────────
    getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem('currentUser'));
        } catch { return null; }
    },

    getCurrentAdmin() {
        try {
            return JSON.parse(sessionStorage.getItem('currentAdmin'));
        } catch { return null; }
    },

    isParticipantLoggedIn() {
        return !!this.getCurrentUser();
    },

    isAdminLoggedIn() {
        return !!this.getCurrentAdmin();
    },

    // ── Logout ────────────────────────────────────────────
    logoutParticipant() {
        sessionStorage.removeItem('currentUser');
    },

    logoutAdmin() {
        sessionStorage.removeItem('currentAdmin');
    },

    // ── Route Guards ──────────────────────────────────────
    requireParticipant() {
        if (!this.isParticipantLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },

    requireAdmin() {
        if (!this.isAdminLoggedIn()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }
};
