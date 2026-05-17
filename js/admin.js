/**
 * ADMIN MODULE
 */
const AdminApp = {
    setupRealtimeSync(renderFunc) {
        window.addEventListener('firebase-synced', () => {
            if (typeof renderFunc === 'function') renderFunc.call(this);
        });
    },
    initDashboard() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderDashboardStats(); this.renderRecentActivity(); this.setActiveNav('dashboard');
        this.setupRealtimeSync(() => { this.renderDashboardStats(); this.renderRecentActivity(); });
    },
    initParticipants() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderParticipants(); this.setActiveNav('participants');
        this.setupRealtimeSync(this.renderParticipants);
    },
    initMonitoring() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderMonitoring(); this.setActiveNav('monitoring');
        this.setupRealtimeSync(this.renderMonitoring);
    },
    initSubmissions() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderSubmissions(); this.setActiveNav('submissions');
        this.setupRealtimeSync(this.renderSubmissions);
    },
    initResults() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderResults(); this.setActiveNav('results');
        this.setupRealtimeSync(this.renderResults);
    },
    initNotes() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderNotes(); this.setActiveNav('notes');
    },
    initDesigns() {
        if (!Auth.requireAdmin()) return;
        this.initTheme(); this.renderPushedDesigns(); this.setActiveNav('designs');
    },

    setActiveNav(page) {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
        const admin = Auth.getCurrentAdmin();
        const el = document.getElementById('admin-name');
        if (el && admin) el.textContent = admin.username;
    },

    // ── Dashboard ──
    renderDashboardStats() {
        const p = Storage.getParticipants();
        const ch = Storage.getPushedDesigns();
        const subs = Storage.getSubmissions().filter(s => s.submitted);
        const logs = Storage.getActivityLogs();
        document.getElementById('stat-participants').textContent = p.length;
        document.getElementById('stat-challenges').textContent = ch.length;
        document.getElementById('stat-submissions').textContent = subs.length;
        const totalSwitches = logs.reduce((a, l) => a + (l.tabSwitches || 0), 0);
        document.getElementById('stat-tabswitches').textContent = totalSwitches;
        const totalCopies = logs.reduce((a, l) => a + (l.copyCount || 0), 0);
        const elCopies = document.getElementById('stat-copies');
        if (elCopies) elCopies.textContent = totalCopies;

        const settings = Storage.getSettings();
        const btnStart = document.getElementById('btn-start-event');
        if (btnStart) {
            if (settings && settings.eventStarted) {
                btnStart.className = 'btn btn-danger btn-sm';
                btnStart.innerHTML = '⏹ Stop Event';
            } else {
                btnStart.className = 'btn btn-success btn-sm';
                btnStart.innerHTML = '▶ Start Event';
            }
        }
    },

    toggleEventState() {
        const settings = Storage.getSettings();
        if (settings.eventEnded) {
            if (!confirm('The event was previously ended. Do you want to reopen it?')) return;
            settings.eventEnded = false;
        }
        settings.eventStarted = !settings.eventStarted;
        Storage.updateSettings({ eventStarted: settings.eventStarted, eventEnded: settings.eventEnded });
        this.renderDashboardStats();
        this.notify(settings.eventStarted ? 'Event Started! Participants are now unblocked.' : 'Event Stopped! Participants moved to waiting room.', settings.eventStarted ? 'success' : 'warning');
    },

    endEvent() {
        if (confirm("🛑 Are you sure you want to END the event? This will lock out all participants and send them to the Thank You page.")) {
            const settings = Storage.getSettings();
            settings.eventEnded = true;
            settings.eventStarted = false; 
            Storage.updateSettings({ eventEnded: true, eventStarted: false });
            this.renderDashboardStats();
            this.notify("Event officially ended. All users locked out.", "success");
        }
    },

    renderRecentActivity() {
        const subs = Storage.getSubmissions().filter(s => s.submitted).slice(-5).reverse();
        const el = document.getElementById('recent-activity');
        if (!el) return;
        if (!subs.length) { el.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">No submissions yet</p>'; return; }
        el.innerHTML = `<div class="table-wrapper"><table>
            <thead><tr><th>Participant</th><th>Challenge</th><th>Score</th><th>Time</th></tr></thead>
            <tbody>${subs.map(s => {
                const p = Storage.getParticipantById(s.participantId);
                const ch = Storage.getChallengeById(s.challengeId);
                return `<tr><td>${p?p.lotNumber:'Unknown'}</td><td>${ch?ch.title:'Unknown'}</td><td><strong>${s.adminScore!==undefined?s.adminScore:s.score}</strong></td><td>${s.submittedAt?new Date(s.submittedAt).toLocaleTimeString():'-'}</td></tr>`;
            }).join('')}</tbody></table></div>`;
    },

    // ── Participants ──
    renderParticipants(filter = '') {
        const participants = Storage.getParticipants().filter(p =>
            !filter || p.lotNumber.toLowerCase().includes(filter.toLowerCase())
        );
        const el = document.getElementById('participants-table');
        if (!el) return;
        el.innerHTML = `<div class="table-wrapper"><table>
            <thead><tr><th>#</th><th>Lot #</th><th>Registered</th><th>Actions</th></tr></thead>
            <tbody>${participants.map((p, i) => `<tr>
                <td>${i+1}</td>
                <td><span class="badge badge-info">${p.lotNumber}</span></td>
                <td>${new Date(p.registeredAt).toLocaleDateString()}</td>
                <td><div class="action-btns">
                    <button class="action-btn edit" onclick="AdminApp.editParticipant('${p.id}')">✏️</button>
                    <button class="action-btn delete" onclick="AdminApp.deleteParticipant('${p.id}')">🗑️</button>
                </div></td>
            </tr>`).join('')}</tbody></table></div>`;
        const cnt = document.getElementById('participant-count');
        if (cnt) cnt.textContent = participants.length;
    },

    showAddParticipant() {
        document.getElementById('modal-title').textContent = 'Add Participant';
        document.getElementById('p-form').reset();
        document.getElementById('p-id').value = '';
        this.openModal('participant-modal');
    },

    editParticipant(id) {
        const p = Storage.getParticipantById(id);
        if (!p) return;
        document.getElementById('modal-title').textContent = 'Edit Participant';
        document.getElementById('p-id').value = p.id;
        document.getElementById('p-lot').value = p.lotNumber;
        this.openModal('participant-modal');
    },

    saveParticipant() {
        const id = document.getElementById('p-id').value;
        const data = {
            username: 'Participant ' + document.getElementById('p-lot').value.trim().toUpperCase(),
            lotNumber: document.getElementById('p-lot').value.trim().toUpperCase()
        };
        if (!data.lotNumber) { this.notify('Lot Number required!', 'error'); return; }
        const existing = Storage.getParticipantByLot(data.lotNumber);
        if (existing && existing.id !== id) { this.notify('Lot number already exists!', 'error'); return; }
        if (id) { Storage.updateParticipant(id, data); this.notify('Updated!', 'success'); }
        else { Storage.addParticipant(data); this.notify('Participant added!', 'success'); }
        this.closeModal('participant-modal');
        this.renderParticipants();
    },

    deleteParticipant(id) {
        if (confirm('Delete this participant? This cannot be undone.')) {
            Storage.deleteParticipant(id); this.renderParticipants(); this.notify('Deleted!', 'success');
        }
    },

    // ── Monitoring ──
    renderMonitoring(userId) {
        if (userId) this.selectedMonitorUser = userId;
        const participants = Storage.getParticipants();
        const designs = Storage.getPushedDesigns().slice().reverse();
        
        const tabsContainer = document.getElementById('user-tabs');
        const contentContainer = document.getElementById('live-monitor-content');
        if (!tabsContainer || !contentContainer) return;

        if (!this.selectedMonitorUser && participants.length > 0) {
            this.selectedMonitorUser = participants[0].id;
        }

        tabsContainer.innerHTML = participants.map(p => {
            const isActive = this.selectedMonitorUser === p.id ? 'btn-primary' : 'btn-secondary';
            return `<button class="btn btn-sm ${isActive}" onclick="AdminApp.renderMonitoring('${p.id}')">Lot: ${p.lotNumber}</button>`;
        }).join('');

        const selectedP = participants.find(p => p.id === this.selectedMonitorUser);
        if (!selectedP) {
            contentContainer.innerHTML = `<p style="color:var(--text-muted);text-align:center;">No participant selected.</p>`;
            return;
        }

        const userSubs = Storage.getSubmissionsByParticipant(selectedP.id);
        
        let roundsHtml = designs.map((d, index) => {
            const sub = userSubs.find(s => s.challengeId === d.id);
            const userCode = sub && sub.code ? sub.code : '<html><body><h3 style="color:#666;font-family:sans-serif;text-align:center;margin-top:40px;">No code written yet</h3></body></html>';
            const isSubmitted = sub && sub.submitted;
            const escapedCode = userCode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

            return `
            <div style="background:var(--surface); border:1px solid var(--border); border-radius:var(--radius); margin-bottom:20px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid var(--border); padding-bottom:10px;">
                    <h3 style="color:var(--primary-light); font-size:1.1rem; margin:0;">Round ${index + 1}: ${d.title}</h3>
                    ${isSubmitted ? '<span class="badge badge-success">✅ Submitted</span>' : '<span class="badge badge-warning">⚡ Live Typing...</span>'}
                </div>
                <div style="display:flex; gap:16px; height: 350px;">
                    <!-- Admin Design -->
                    <div style="flex:1; border:1px solid var(--border); border-radius:8px; display:flex; flex-direction:column; overflow:hidden;">
                        <div style="background:var(--surface2); padding:6px 10px; font-size:.8rem; font-weight:bold; text-align:center; border-bottom:1px solid var(--border);">Admin Reference Design</div>
                        <div style="flex:1; overflow:auto; display:flex; align-items:center; justify-content:center; background:#050505;">
                            ${d.imageData ? `<img src="${d.imageData}" style="max-width:100%; max-height:100%; object-fit:contain;">` : '<span style="color:#666">No Image</span>'}
                        </div>
                    </div>
                    <!-- User Live Code -->
                    <div style="flex:1; border:1px solid var(--border); border-radius:8px; display:flex; flex-direction:column; overflow:hidden;">
                        <div style="background:var(--surface2); padding:6px 10px; font-size:.8rem; font-weight:bold; text-align:center; border-bottom:1px solid var(--border);">User's Live Preview</div>
                        <iframe style="flex:1; border:none; background:#fff;" srcdoc="${escapedCode}" sandbox="allow-scripts"></iframe>
                    </div>
                </div>
            </div>`;
        }).join('');

        if (designs.length === 0) {
            roundsHtml = `<p style="color:var(--text-muted);text-align:center;">No rounds pushed yet.</p>`;
        }

        contentContainer.innerHTML = roundsHtml;
    },

    selectMonitorUser(id) {
        this.selectedMonitorUser = id;
        this.renderMonitoring();
    },

    // ── Submissions ──
    renderSubmissions(filter = '') {
        let subs = Storage.getSubmissions().filter(s => s.submitted);
        const filtered = subs.filter(s => {
            const p = Storage.getParticipantById(s.participantId);
            return p && p.lotNumber.toLowerCase().includes(filter.toLowerCase());
        });
        const el = document.getElementById('submissions-table');
        if (!el) return;
        if (!subs.length) { el.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-muted)">No submissions yet</p>'; return; }
        el.innerHTML = `<div class="table-wrapper"><table>
            <thead><tr><th>Lot</th><th>Challenge</th><th>Type</th><th>Auto Score</th><th>Admin Score</th><th>Reviewed</th><th>Actions</th></tr></thead>
            <tbody>${filtered.map(s => {
                const p = Storage.getParticipantById(s.participantId);
                const ch = Storage.getChallengeById(s.challengeId);
                return `<tr>
                    <td><strong>${p?p.lotNumber:'Unknown'}</strong></td>
                    <td><span class="badge badge-info">${ch?ch.title:'Unknown'}</span></td>
                    <td><span class="badge badge-primary">${s.type||'code'}</span></td>
                    <td>${s.score||0}</td>
                    <td><input type="number" class="score-input" value="${s.adminScore!==undefined?s.adminScore:s.score||0}" min="0" max="100"
                        onchange="AdminApp.updateAdminScore('${s.participantId}','${s.challengeId}',this.value)"></td>
                    <td>${s.reviewed?'<span class="badge badge-success">Yes</span>':'<span class="badge badge-danger">No</span>'}</td>
                    <td><div class="action-btns">
                        <button class="action-btn view" onclick="AdminApp.reviewSubmission('${s.participantId}','${s.challengeId}')">👁️</button>
                    </div></td>
                </tr>`;
            }).join('')}</tbody></table></div>`;
    },

    updateAdminScore(pid, chid, score) {
        const sub = Storage.getSubmission(pid, chid);
        if (sub) { sub.adminScore = parseInt(score)||0; sub.reviewed = true; Storage.saveSubmission(sub); this.notify('Score updated!', 'success'); }
    },

    reviewSubmission(pid, chid) {
        const sub = Storage.getSubmission(pid, chid);
        const p = Storage.getParticipantById(pid);
        const ch = Storage.getChallengeById(chid);
        if (!sub) return;

        const log = Storage.getActivityLog(pid, chid);
        document.getElementById('review-participant').textContent = p ? p.lotNumber : 'Unknown';
        document.getElementById('review-challenge').textContent = ch ? ch.title : 'Unknown';
        document.getElementById('review-stats').innerHTML = `
            <span class="badge badge-danger">Tab Switches: ${log.tabSwitches}</span>
            <span class="badge badge-warning">Copies: ${log.copyCount}</span>
            <span class="badge badge-info">Pastes: ${log.pasteCount}</span>
            <span class="badge badge-success">Time: ${Math.floor(log.timeSpent/60)}m ${log.timeSpent%60}s</span>`;

        const codeEl = document.getElementById('review-code');
        const imgEl = document.getElementById('review-design-img');
        const frameEl = document.getElementById('review-preview-frame');
        const qEl = document.getElementById('review-questions');

        if (codeEl) codeEl.style.display = 'none';
        if (imgEl) imgEl.style.display = 'none';
        if (frameEl) { frameEl.style.display = 'none'; }
        if (qEl) qEl.style.display = 'none';

        if (sub.type === 'code' || sub.code) {
            if (codeEl) { codeEl.textContent = sub.code || ''; codeEl.style.display = 'block'; }
            if (frameEl) {
                frameEl.style.display = 'block';
                const doc = frameEl.contentDocument || frameEl.contentWindow.document;
                doc.open(); doc.write(sub.code || ''); doc.close();
            }
        } else if (sub.type === 'design' && sub.designData) {
            if (imgEl) { imgEl.src = sub.designData; imgEl.style.display = 'block'; }
        } else if (sub.type === 'question' && sub.answers) {
            if (qEl) {
                qEl.style.display = 'block';
                const qData = ch && ch.questions ? ch.questions.map((q, i) => {
                    const userAns = sub.answers[i];
                    const isCorrect = userAns === q.answer;
                    return `<div style="margin-bottom:10px;padding:10px;background:var(--surface2);border-radius:8px;border-left:3px solid ${isCorrect?'var(--success)':'var(--danger)'}">
                        <div style="font-size:.85rem;font-weight:600;margin-bottom:4px">Q${i+1}: ${q.q}</div>
                        <div style="font-size:.8rem">User: <strong>${q.options[userAns]||'No answer'}</strong> ${isCorrect?'✅':'❌'}</div>
                        ${!isCorrect?`<div style="font-size:.78rem;color:var(--success)">Correct: ${q.options[q.answer]}</div>`:''}
                    </div>`;
                }).join('') : 'No question data';
                qEl.innerHTML = qData;
            }
        }

        const scoreInput = document.getElementById('review-score-input');
        if (scoreInput) scoreInput.value = sub.adminScore !== undefined ? sub.adminScore : sub.score || 0;

        sub.reviewed = true; Storage.saveSubmission(sub);
        this.openModal('review-modal');
    },

    saveReviewScore() {
        // find current review context from modal
        const scoreEl = document.getElementById('review-score-input');
        if (!scoreEl) return;
        this.notify('Score saved!', 'success');
        this.closeModal('review-modal');
        this.renderSubmissions();
    },

    // ── Results ──
    renderResults() {
        if (typeof Leaderboard !== 'undefined') {
            Leaderboard.renderPodium('podium-preview');
            Leaderboard.renderTable('results-table');
        }
    },

    // ── Notes ──
    renderNotes() {
        const notes = Storage.getNotes();
        const el = document.getElementById('notes-list');
        if (!el) return;
        if (!notes.length) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">No notes yet. Add your first note!</p>'; return; }
        el.innerHTML = notes.map(n => `
            <div class="note-item">
                <div class="note-meta">${new Date(n.createdAt).toLocaleString()} ${n.participant?`· <span class="badge badge-info">${n.participant}</span>`:''}</div>
                <div class="note-text">${n.text}</div>
                <button class="note-delete" onclick="AdminApp.deleteNote('${n.id}')">✕</button>
            </div>`).join('');
    },

    addNote() {
        const textEl = document.getElementById('note-text');
        const participantEl = document.getElementById('note-participant');
        if (!textEl || !textEl.value.trim()) { this.notify('Write something first!', 'error'); return; }
        Storage.addNote({
            text: textEl.value.trim(),
            participant: participantEl ? participantEl.value : ''
        });
        textEl.value = '';
        this.renderNotes();
        this.notify('Note saved!', 'success');
    },

    deleteNote(id) {
        Storage.deleteNote(id);
        this.renderNotes();
        this.notify('Note deleted!', 'info');
    },

    // ── Push Designs ──
    renderPushedDesigns() {
        const designs = Storage.getPushedDesigns();
        const el = document.getElementById('pushed-designs-list');
        if (!el) return;
        if (!designs.length) { el.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px">No designs pushed yet.</p>'; return; }
        el.innerHTML = designs.map(d => `
            <div class="pushed-item">
                ${d.imageData ? `<img class="pushed-img" src="${d.imageData}" alt="${d.title}">` : '<div style="width:80px;height:60px;background:var(--surface2);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">🖼️</div>'}
                <div class="pushed-info">
                    <div class="pushed-title">${d.title}</div>
                    <div class="pushed-time">${new Date(d.pushedAt).toLocaleString()}</div>
                    ${d.description?`<div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">${d.description}</div>`:''}
                </div>
                <button class="action-btn delete" onclick="AdminApp.deletePushedDesign('${d.id}')">🗑️</button>
            </div>`).join('');
    },

    pushDesign() {
        const title = document.getElementById('push-title').value.trim();
        const desc = document.getElementById('push-desc').value.trim();
        if (!title) { this.notify('Title required!', 'error'); return; }
        const design = { title, description: desc, imageData: this._pendingDesignImage || '' };
        Storage.pushDesign(design);
        document.getElementById('push-title').value = '';
        document.getElementById('push-desc').value = '';
        this._pendingDesignImage = null;
        document.getElementById('push-preview').innerHTML = '';
        this.renderPushedDesigns();
        this.notify('Design pushed to all participants!', 'success');
    },

    handlePushImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2*1024*1024) { this.notify('Image too large! Max 2MB', 'error'); return; }
        const reader = new FileReader();
        reader.onload = ev => {
            this._pendingDesignImage = ev.target.result;
            const prev = document.getElementById('push-preview');
            if (prev) prev.innerHTML = `<img src="${ev.target.result}" style="max-height:120px;border-radius:8px;border:1px solid var(--border);margin-top:8px">`;
            this.notify('Image ready!', 'success');
        };
        reader.readAsDataURL(file);
    },

    deletePushedDesign(id) {
        if (confirm('Remove this pushed design?')) {
            Storage.deletePushedDesign(id);
            this.renderPushedDesigns();
            this.notify('Removed!', 'info');
        }
    },

    // ── Export ──
    exportCSV() {
        const results = Leaderboard.getResults();
        let csv = 'Rank,Lot Number,Completed,Raw Score,Penalty,Final Score,Time(s),Tab Switches,Copies\n';
        results.forEach(r => {
            csv += `${r.rank},${r.lotNumber},${r.completedChallenges}/${r.totalChallenges},${r.rawScore},${r.penalty},${r.finalScore},${r.totalTime},${r.tabSwitches||0},${r.copies||0}\n`;
        });
        const blob = new Blob([csv], { type:'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'results.csv'; a.click();
        URL.revokeObjectURL(url);
        this.notify('CSV exported!', 'success');
    },

    exportPDF() {
        const results = Leaderboard.getResults();
        if (!results.length) { this.notify('No results! Publish first.', 'error'); return; }
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html><head><title>Results</title><style>
            body{font-family:Arial;padding:40px}h1{color:#7c3aed;text-align:center}
            table{width:100%;border-collapse:collapse;margin-top:20px}
            th,td{border:1px solid #ddd;padding:10px;text-align:left}
            th{background:#7c3aed;color:#fff}tr:nth-child(even){background:#f9f9f9}
            .gold{background:#fef3c7!important}.silver{background:#f1f5f9!important}.bronze{background:#fef3c7!important}
        </style></head><body>
        <h1>🏆 Web Design Competition Results</h1>
        <p style="text-align:center;color:#666">Generated: ${new Date().toLocaleString()}</p>
        <table><thead><tr><th>Rank</th><th>Lot#</th><th>Done</th><th>Raw</th><th>Penalty</th><th>Final</th><th>Time</th><th>Tab Sw.</th><th>Copies</th></tr></thead>
        <tbody>${results.map(r => `<tr>
            <td><strong>#${r.rank}</strong></td>
            <td><strong>${r.lotNumber}</strong></td>
            <td>${r.completedChallenges}/${r.totalChallenges}</td>
            <td>${r.rawScore}</td><td>-${r.penalty}</td>
            <td><strong>${r.finalScore}</strong></td>
            <td>${Math.floor(r.totalTime/60)}m ${r.totalTime%60}s</td>
            <td>${r.tabSwitches||0}</td><td>${r.copies||0}</td>
        </tr>`).join('')}</tbody></table></body></html>`);
        w.document.close();
        setTimeout(() => w.print(), 500);
    },

    backupData() {
        const data = Storage.exportBackup();
        const blob = new Blob([data], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
        URL.revokeObjectURL(url);
        this.notify('Backup downloaded!', 'success');
    },

    restoreData() {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                if (Storage.importBackup(ev.target.result)) { this.notify('Restored! Refreshing...', 'success'); setTimeout(() => location.reload(), 1500); }
                else this.notify('Invalid backup!', 'error');
            };
            reader.readAsText(file);
        };
        input.click();
    },

    loadSettings() {
        const s = Storage.getSettings();
        if (document.getElementById('set-event-time')) document.getElementById('set-event-time').value = s.eventTimeLimitMinutes || 60;
        if (document.getElementById('set-tab-penalty')) document.getElementById('set-tab-penalty').value = s.penaltyTabSwitch || 2;
        if (document.getElementById('set-copy-penalty')) document.getElementById('set-copy-penalty').value = s.penaltyCopy || 5;
        if (document.getElementById('set-paste-penalty')) document.getElementById('set-paste-penalty').value = s.penaltyPaste || 1;
        
        const admins = Storage.get('adminUsers') || [];
        if (admins.length > 0 && document.getElementById('set-admin-user')) {
            document.getElementById('set-admin-user').value = admins[0].username;
            document.getElementById('set-admin-pass').value = admins[0].password;
        }
    },

    saveSettings() {
        const s = Storage.getSettings();
        s.eventTimeLimitMinutes = parseInt(document.getElementById('set-event-time').value) || 60;
        s.penaltyTabSwitch = parseInt(document.getElementById('set-tab-penalty').value) || 2;
        s.penaltyCopy = parseInt(document.getElementById('set-copy-penalty').value) || 5;
        s.penaltyPaste = parseInt(document.getElementById('set-paste-penalty').value) || 1;
        Storage.saveSettings(s);

        const adminUser = document.getElementById('set-admin-user');
        const adminPass = document.getElementById('set-admin-pass');
        if (adminUser && adminPass && adminUser.value && adminPass.value) {
            const admins = Storage.get('adminUsers') || [];
            if (admins.length > 0) {
                admins[0].username = adminUser.value.trim();
                admins[0].password = adminPass.value;
                Storage.set('adminUsers', admins);
            }
        }

        this.notify('Settings & Credentials saved successfully', 'success');
    },

    openModal(id) { const m = document.getElementById(id); if(m) m.classList.add('active'); },
    closeModal(id) { const m = document.getElementById(id); if(m) m.classList.remove('active'); },
    toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); },
    initTheme() { document.documentElement.setAttribute('data-theme', localStorage.getItem('appTheme')||'dark'); },
    toggleTheme() {
        const c = document.documentElement.getAttribute('data-theme');
        const n = c==='dark'?'light':'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('appTheme', n);
    },
    logout() { Auth.logoutAdmin(); window.location.href='login.html'; },
    notify(msg, type='info') {
        let el = document.getElementById('app-notification');
        if (!el) { el = document.createElement('div'); el.id='app-notification'; el.className='notification'; document.body.appendChild(el); }
        el.textContent = msg; el.className = `notification ${type} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }
};
