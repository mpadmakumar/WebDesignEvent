const firebaseConfig = {
  apiKey: "AIzaSyAaL-8irplV8IGwjbJAEtoi1hb2NMpfnfg",
  authDomain: "webdesign-cf98c.firebaseapp.com",
  projectId: "webdesign-cf98c",
  storageBucket: "webdesign-cf98c.firebasestorage.app",
  messagingSenderId: "1068078467605",
  appId: "1:1068078467605:web:07302e4babc30f1a941c1c",
  measurementId: "G-Q9J2WM3WWN"
};

// Initialize Firebase only once
let db;
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
} else if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
}

const StorageKeys = {
    PARTICIPANTS: 'participants',
    ADMIN_USERS: 'adminUsers',
    CHALLENGES: 'challenges',
    SUBMISSIONS: 'submissions',
    ACTIVITY_LOGS: 'activityLogs',
    RESULTS: 'results',
    SETTINGS: 'appSettings',
    ADMIN_NOTES: 'adminNotes',
    PUSHED_DESIGNS: 'pushedDesigns'
};

// Flag to prevent infinite loops when sync updates local storage
let isSyncingFromFirebase = false;

const Storage = {
    get(key) {
        try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; }
        catch(e) { return null; }
    },
    set(key, value) {
        try { 
            localStorage.setItem(key, JSON.stringify(value)); 
            
            // Sync to Firebase
            if (db && !isSyncingFromFirebase) {
                db.collection('competition').doc('globalState').set({
                    [key]: value
                }, { merge: true }).catch(err => console.error("Firebase sync error:", err));
            }
            
            return true; 
        }
        catch(e) { return false; }
    },
    remove(key) { localStorage.removeItem(key); },

    startFirebaseSync() {
        if (!db) return;
        db.collection('competition').doc('globalState').onSnapshot(doc => {
            if (doc.exists) {
                isSyncingFromFirebase = true;
                const data = doc.data();
                for (const key in data) {
                    if (data.hasOwnProperty(key)) {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                }
                isSyncingFromFirebase = false;
                window.dispatchEvent(new Event('firebase-synced'));
            }
        });
    },

    initDefaults() {
        this.startFirebaseSync();
        if (!this.get(StorageKeys.ADMIN_USERS)) {
            this.set(StorageKeys.ADMIN_USERS, [
                { id: 'admin1', username: 'admin', password: 'admin123', role: 'super' }
            ]);
        }
        if (!this.get(StorageKeys.PARTICIPANTS)) {
            this.set(StorageKeys.PARTICIPANTS, [
                { id: 'p1', username: 'Alice Johnson', lotNumber: 'LOT001', registeredAt: new Date().toISOString() },
                { id: 'p2', username: 'Bob Smith', lotNumber: 'LOT002', registeredAt: new Date().toISOString() },
                { id: 'p3', username: 'Carol Davis', lotNumber: 'LOT003', registeredAt: new Date().toISOString() },
                { id: 'p4', username: 'David Lee', lotNumber: 'LOT004', registeredAt: new Date().toISOString() },
                { id: 'p5', username: 'Eve Martinez', lotNumber: 'LOT005', registeredAt: new Date().toISOString() }
            ]);
        }
        if (!this.get(StorageKeys.CHALLENGES)) {
            this.set(StorageKeys.CHALLENGES, [
                {
                    id: 'ch1', title: 'Hero Section Design', type: 'code', order: 1, active: true,
                    description: 'Create a stunning hero section with gradient background, heading, subtitle, and CTA button.',
                    instructions: '1. Full-viewport hero section\n2. Gradient background (purple → blue)\n3. Centered h1 heading\n4. Subtitle paragraph\n5. CTA button with hover effect\n6. Fade-in animation',
                    referenceImage: '', timeLimit: 1800, maxScore: 100,
                    criteria: { htmlRequired: true, cssRequired: true, minLines: 10 },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'ch2', title: 'Responsive Card Grid', type: 'code', order: 2, active: true,
                    description: 'Design a responsive 3-column card grid. Each card: icon, title, description, link.',
                    instructions: '1. 3-column responsive grid\n2. Card: icon, title, description, link\n3. Box-shadow on hover\n4. Mobile-friendly stacking\n5. CSS Grid or Flexbox\n6. Smooth transitions',
                    referenceImage: '', timeLimit: 1500, maxScore: 100,
                    criteria: { htmlRequired: true, cssRequired: true, minLines: 15 },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'ch3', title: 'Navigation Bar', type: 'code', order: 3, active: true,
                    description: 'Build a modern sticky navigation bar with logo, links, and a CTA button.',
                    instructions: '1. Sticky top navbar\n2. Logo on left\n3. Nav links (Home, About, Services, Contact)\n4. CTA button on right\n5. Hamburger menu for mobile\n6. Active state styles',
                    referenceImage: '', timeLimit: 1200, maxScore: 100,
                    criteria: { htmlRequired: true, cssRequired: true, minLines: 12 },
                    createdAt: new Date().toISOString()
                }
            ]);
        }
        if (!this.get(StorageKeys.SUBMISSIONS)) this.set(StorageKeys.SUBMISSIONS, []);
        if (!this.get(StorageKeys.ACTIVITY_LOGS)) this.set(StorageKeys.ACTIVITY_LOGS, []);
        if (!this.get(StorageKeys.RESULTS)) this.set(StorageKeys.RESULTS, []);
        if (!this.get(StorageKeys.ADMIN_NOTES)) this.set(StorageKeys.ADMIN_NOTES, []);
        if (!this.get(StorageKeys.PUSHED_DESIGNS)) this.set(StorageKeys.PUSHED_DESIGNS, []);
        if (!this.get(StorageKeys.SETTINGS)) {
            this.set(StorageKeys.SETTINGS, {
                penaltyTabSwitch: 2, penaltyCopy: 5, penaltyPaste: 1,
                bonusPerMinuteEarly: 1, competitionActive: true
            });
        }
    },

    // Participants
    getParticipants() { return this.get(StorageKeys.PARTICIPANTS) || []; },
    getParticipantById(id) { return this.getParticipants().find(p => p.id === id); },
    getParticipantByLot(lot) { return this.getParticipants().find(p => p.lotNumber === lot); },
    addParticipant(p) {
        const all = this.getParticipants();
        p.id = 'p' + Date.now(); p.registeredAt = new Date().toISOString();
        all.push(p); return this.set(StorageKeys.PARTICIPANTS, all);
    },
    updateParticipant(id, updates) {
        const all = this.getParticipants();
        const i = all.findIndex(p => p.id === id);
        if (i !== -1) { all[i] = { ...all[i], ...updates }; return this.set(StorageKeys.PARTICIPANTS, all); }
        return false;
    },
    deleteParticipant(id) {
        return this.set(StorageKeys.PARTICIPANTS, this.getParticipants().filter(p => p.id !== id));
    },
    validateParticipant(username, lotNumber) {
        return this.getParticipants().find(p =>
            p.username.toLowerCase() === username.toLowerCase() &&
            p.lotNumber.toUpperCase() === lotNumber.toUpperCase()
        );
    },

    // Challenges
    getChallenges() { return (this.get(StorageKeys.CHALLENGES) || []).sort((a, b) => a.order - b.order); },
    getActiveChallenges() { return this.getChallenges().filter(c => c.active); },
    getChallengeById(id) { return this.getChallenges().find(c => c.id === id); },
    addChallenge(ch) {
        const all = this.getChallenges();
        ch.id = 'ch' + Date.now(); ch.createdAt = new Date().toISOString();
        all.push(ch); return this.set(StorageKeys.CHALLENGES, all);
    },
    updateChallenge(id, updates) {
        const all = this.getChallenges();
        const i = all.findIndex(c => c.id === id);
        if (i !== -1) { all[i] = { ...all[i], ...updates }; return this.set(StorageKeys.CHALLENGES, all); }
        return false;
    },
    deleteChallenge(id) {
        return this.set(StorageKeys.CHALLENGES, this.getChallenges().filter(c => c.id !== id));
    },

    // Submissions
    getSubmissions() { return this.get(StorageKeys.SUBMISSIONS) || []; },
    getSubmissionsByParticipant(pid) { return this.getSubmissions().filter(s => s.participantId === pid); },
    getSubmission(pid, chid) {
        return this.getSubmissions().find(s => s.participantId === pid && s.challengeId === chid);
    },
    saveSubmission(sub) {
        const all = this.getSubmissions();
        const i = all.findIndex(s => s.participantId === sub.participantId && s.challengeId === sub.challengeId);
        if (i !== -1) { all[i] = { ...all[i], ...sub, updatedAt: new Date().toISOString() }; }
        else { sub.id = 'sub' + Date.now(); sub.createdAt = new Date().toISOString(); sub.updatedAt = sub.createdAt; all.push(sub); }
        return this.set(StorageKeys.SUBMISSIONS, all);
    },

    // Activity Logs
    getActivityLogs() { return this.get(StorageKeys.ACTIVITY_LOGS) || []; },
    getActivityLog(pid, chid) {
        return this.getActivityLogs().find(a => a.participantId === pid && a.challengeId === chid)
            || { participantId: pid, challengeId: chid, tabSwitches: 0, copyCount: 0, pasteCount: 0, timeSpent: 0, events: [] };
    },
    saveActivityLog(log) {
        const all = this.getActivityLogs();
        const i = all.findIndex(a => a.participantId === log.participantId && a.challengeId === log.challengeId);
        if (i !== -1) all[i] = log; else all.push(log);
        return this.set(StorageKeys.ACTIVITY_LOGS, all);
    },

    // Results
    getResults() { return this.get(StorageKeys.RESULTS) || []; },
    saveResults(r) { return this.set(StorageKeys.RESULTS, r); },

    // Settings
    getSettings() { return this.get(StorageKeys.SETTINGS) || {}; },
    updateSettings(u) { return this.set(StorageKeys.SETTINGS, { ...this.getSettings(), ...u }); },

    // Admin Users
    getAdminUsers() { return this.get(StorageKeys.ADMIN_USERS) || []; },
    validateAdmin(username, password) {
        return this.getAdminUsers().find(a => a.username === username && a.password === password);
    },

    // Admin Notes
    getNotes() { return this.get(StorageKeys.ADMIN_NOTES) || []; },
    addNote(note) {
        const all = this.getNotes();
        note.id = 'note' + Date.now(); note.createdAt = new Date().toISOString();
        all.unshift(note); return this.set(StorageKeys.ADMIN_NOTES, all);
    },
    deleteNote(id) { return this.set(StorageKeys.ADMIN_NOTES, this.getNotes().filter(n => n.id !== id)); },

    // Pushed Designs (admin pushes a design challenge to users)
    getPushedDesigns() { return this.get(StorageKeys.PUSHED_DESIGNS) || []; },
    pushDesign(design) {
        const all = this.getPushedDesigns();
        design.id = 'pd' + Date.now(); design.pushedAt = new Date().toISOString();
        all.unshift(design); return this.set(StorageKeys.PUSHED_DESIGNS, all);
    },
    deletePushedDesign(id) { return this.set(StorageKeys.PUSHED_DESIGNS, this.getPushedDesigns().filter(d => d.id !== id)); },

    // Backup
    exportBackup() {
        const b = {};
        Object.values(StorageKeys).forEach(k => { b[k] = this.get(k); });
        return JSON.stringify(b, null, 2);
    },
    importBackup(json) {
        try { const b = JSON.parse(json); Object.keys(b).forEach(k => this.set(k, b[k])); return true; }
        catch(e) { return false; }
    },
    generateId(prefix = 'id') { return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5); }
};

Storage.initDefaults();
