/**
 * USER MODULE - Competition Workspace
 */
const UserApp = {
    currentUser: null,
    currentChallenge: null,
    currentChallengeIndex: 0,
    challenges: [],
    timerInterval: null,
    autoSaveInterval: null,
    timeRemaining: 0,
    selectedAnswers: {},
    uploadedDesign: null,

    init() {
        if (!Auth.requireParticipant()) return;
        this.currentUser = Auth.getCurrentUser();
        
        const lotDisplay = document.getElementById('lot-display');
        if (lotDisplay) lotDisplay.textContent = this.currentUser.lotNumber;
        
        this.checkPushedDesigns();
        
        window.addEventListener('firebase-synced', () => {
            this.checkPushedDesigns();
        });
        
        this.startAutoSave();
        this.setupBeforeUnload();
        this.checkPushedDesigns();
    },

    determineCurrentChallenge() {
        const subs = Storage.getSubmissionsByParticipant(this.currentUser.id);
        this.currentChallengeIndex = 0;
        for (let i = 0; i < this.challenges.length; i++) {
            const sub = subs.find(s => s.challengeId === this.challenges[i].id && s.submitted);
            if (sub) this.currentChallengeIndex = i + 1;
            else break;
        }
        if (this.currentChallengeIndex >= this.challenges.length)
            this.currentChallengeIndex = this.challenges.length - 1;
    },

    checkPushedDesigns() {
        // Reverse the designs so that the first pushed design appears first
        const designs = Storage.getPushedDesigns().slice().reverse();
        const listContainer = document.getElementById('pushed-rounds-list');
        const bannerContainer = document.getElementById('pushed-design-banner');
        if (!listContainer || !bannerContainer) return;
        
        if (designs.length > 0) {
            listContainer.innerHTML = designs.map(d => `
                <div class="round-item ${this.currentChallenge && this.currentChallenge.id === d.id ? 'active' : ''}" onclick="UserApp.selectPushedRound('${d.id}')">
                    <div class="round-title">${d.title}</div>
                    <div class="round-time">${new Date(d.pushedAt).toLocaleTimeString()}</div>
                </div>
            `).join('');
            
            if (!this.currentChallenge) {
                this.selectPushedRound(designs[0].id, true);
            }
        } else {
            listContainer.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;">Waiting for Admin...</p>`;
            bannerContainer.innerHTML = `<h3 style="color:var(--text-muted);text-align:center;margin-top:20px;font-weight:500;">No rounds available</h3>`;
            document.getElementById('challenge-title').textContent = 'Waiting...';
        }
    },

    selectPushedRound(id, skipSwitchView = false) {
        if (this.currentChallenge && this.currentChallenge.id === id && !skipSwitchView) {
            document.getElementById('rounds-list-view').classList.add('hidden');
            document.getElementById('round-detail-view').classList.remove('hidden');
            return;
        }

        const d = Storage.getPushedDesigns().find(x => x.id === id);
        if (!d) return;

        if (this.currentChallenge && this.currentChallenge.id !== id) {
            this.saveCurrentWork();
        }

        const listContainer = document.getElementById('pushed-rounds-list');
        if(listContainer) {
            Array.from(listContainer.children).forEach(el => el.classList.remove('active'));
            const activeEl = Array.from(listContainer.children).find(el => el.textContent.includes(d.title));
            if(activeEl) activeEl.classList.add('active');
        }

        const bannerContainer = document.getElementById('pushed-design-banner');
        bannerContainer.innerHTML = `
            ${d.description ? `<p style="font-size:.85rem; color:var(--text-secondary); margin-bottom:12px; width:100%;">${d.description}</p>` : ''}
            ${d.imageData ? `<img src="${d.imageData}" style="width:100%; max-height:400px; object-fit:contain; border-radius:8px; border:1px solid var(--border); cursor:pointer;" onclick="UserApp.showPushedDesign('${d.id}')">` : '<p style="color:var(--text-muted)">No image.</p>'}
        `;

        const titleEl = document.getElementById('detail-round-title');
        if(titleEl) titleEl.textContent = d.title;
        document.getElementById('challenge-title').textContent = d.title;

        if (!skipSwitchView) {
            document.getElementById('rounds-list-view').classList.add('hidden');
            document.getElementById('round-detail-view').classList.remove('hidden');
        }

        if (!this.currentChallenge || this.currentChallenge.id !== id) {
            this.currentChallenge = { id: d.id, title: d.title, type: 'code', timeLimit: d.timeLimit || 1800 };
            this.initCodeEditorForPushed();
        }
    },
    
    closeRoundDetail() {
        document.getElementById('round-detail-view').classList.add('hidden');
        document.getElementById('rounds-list-view').classList.remove('hidden');
    },
    
    switchTab(tab) {
        ['html', 'css', 'js'].forEach(t => {
            const btn = document.getElementById(`tab-${t}`);
            const editor = document.getElementById(`editor-${t}`);
            if(btn) btn.classList.toggle('active', t === tab);
            if(editor) editor.classList.toggle('hidden', t !== tab);
        });
    },

    injectFramework(framework) {
        const edHtml = document.getElementById('editor-html');
        if (!edHtml || edHtml.disabled) {
            this.notify('Cannot edit HTML right now.', 'error');
            return;
        }

        let code = edHtml.value;
        let cdnString = '';

        if (framework === 'tailwind') {
            if (code.includes('bootstrap.min.css')) { this.notify('You cannot use Tailwind and Bootstrap together!', 'error'); return; }
            if (code.includes('tailwindcss.com')) { this.notify('Tailwind is already included!', 'info'); return; }
            cdnString = `  <script src="https://cdn.tailwindcss.com"></script>\n`;
        } else if (framework === 'bootstrap') {
            if (code.includes('tailwindcss.com')) { this.notify('You cannot use Bootstrap and Tailwind together!', 'error'); return; }
            if (code.includes('bootstrap.min.css')) { this.notify('Bootstrap is already included!', 'info'); return; }
            cdnString = `  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">\n  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>\n`;
        }

        if (code.match(/<\/head>/i)) {
            code = code.replace(/<\/head>/i, cdnString + '</head>');
        } else if (code.match(/<head.*?>/i)) {
            code = code.replace(/(<head.*?>)/i, '$1\n' + cdnString);
        } else if (code.match(/<html.*?>/i)) {
            code = code.replace(/(<html.*?>)/i, '$1\n<head>\n' + cdnString + '</head>\n');
        } else {
            code = cdnString + code;
        }

        edHtml.value = code;
        this.updatePreview();
        this.notify(`${framework.charAt(0).toUpperCase() + framework.slice(1)} added successfully!`, 'success');
        this.switchTab('html');
    },
    
    initCodeEditorForPushed() {
        const existing = Storage.getSubmission(this.currentUser.id, this.currentChallenge.id);
        const edHtml = document.getElementById('editor-html');
        const edCss = document.getElementById('editor-css');
        const edJs = document.getElementById('editor-js');
        
        if (edHtml) edHtml.value = existing && existing.codeHtml !== undefined ? existing.codeHtml : `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Design</title>\n</head>\n<body>\n  \n</body>\n</html>`;
        if (edCss) edCss.value = existing && existing.codeCss !== undefined ? existing.codeCss : '';
        if (edJs) edJs.value = existing && existing.codeJs !== undefined ? existing.codeJs : '';
        
        const isSubmitted = existing && existing.submitted;
        const allLogs = Storage.getActivityLogs().filter(l => l.participantId === this.currentUser.id);
        const totalTimeSpent = allLogs.reduce((sum, l) => sum + (l.timeSpent || 0), 0);
        const eventTimeLimitMinutes = Storage.getSettings().eventTimeLimitMinutes || 60;
        const eventTimeLimitSeconds = eventTimeLimitMinutes * 60;
        const isEventOver = totalTimeSpent >= eventTimeLimitSeconds;

        const isLocked = isSubmitted || isEventOver;

        if(edHtml) edHtml.disabled = isLocked;
        if(edCss) edCss.disabled = isLocked;
        if(edJs) edJs.disabled = isLocked;
        
        const submitBtn = document.getElementById('btn-submit');
        const finishedOverlay = document.getElementById('finished-overlay');

        if (isSubmitted) {
            submitBtn.disabled = true; submitBtn.textContent = '✅ Submitted';
            if (finishedOverlay) {
                finishedOverlay.classList.remove('hidden');
                const titleEl = document.getElementById('finished-overlay-title');
                const textEl = document.getElementById('finished-overlay-text');
                if (titleEl) titleEl.textContent = '> TIME_IS_UP';
                if (textEl) textEl.textContent = 'Event will end soon. Please wait for the administrator';
            }
        } else if (isEventOver) {
            submitBtn.disabled = true; submitBtn.textContent = '⏰ Event Over';
            this.notify('Global event time has expired!', 'error');
            if (finishedOverlay) {
                finishedOverlay.classList.remove('hidden');
                const titleEl = document.getElementById('finished-overlay-title');
                const textEl = document.getElementById('finished-overlay-text');
                if (titleEl) titleEl.textContent = '> TIME_IS_UP';
                if (textEl) textEl.textContent = 'Event will end soon. Please wait for the administrator';
            }
        } else {
            submitBtn.disabled = false; submitBtn.textContent = '📤 Submit';
            Tracker.start(this.currentUser.id, this.currentChallenge.id);
            if (finishedOverlay) finishedOverlay.classList.add('hidden');
        }

        // Timer applies to the global event
        this.timeRemaining = Math.max(0, eventTimeLimitSeconds - totalTimeSpent);
        if (this.timeRemaining > 0 && !isSubmitted) {
            this.startTimer();
        } else {
            this.stopTimer(); this.updateTimerDisplay();
        }

        this.updatePreview();
    },

    showPushedDesign(id) {
        const d = Storage.getPushedDesigns().find(x => x.id === id);
        if (!d) return;
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(6px)';
        overlay.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:24px;max-width:700px;width:100%;max-height:90vh;overflow-y:auto">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3 style="font-size:1rem;font-weight:700">${d.title}</h3>
                <button onclick="this.closest('div[style]').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.4rem;cursor:pointer">✕</button>
            </div>
            ${d.description ? `<p style="font-size:.875rem;color:var(--text-secondary);margin-bottom:14px">${d.description}</p>` : ''}
            ${d.imageData ? `<img src="${d.imageData}" style="width:100%;border-radius:8px;border:1px solid var(--border)">` : '<p style="color:var(--text-muted)">No image attached.</p>'}
        </div>`;
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    },

    renderChallengeList() {
        const cnt = document.getElementById('challenges-count');
        if (cnt) {
            const done = Storage.getSubmissionsByParticipant(this.currentUser.id).filter(s => s.submitted).length;
            cnt.textContent = `(${done}/${this.challenges.length} done)`;
        }
        const list = document.getElementById('challenge-list');
        if (!list) return;
        const subs = Storage.getSubmissionsByParticipant(this.currentUser.id);
        list.innerHTML = this.challenges.map((ch, i) => {
            const sub = subs.find(s => s.challengeId === ch.id && s.submitted);
            let cls = '';
            if (sub) cls = 'completed';
            else if (i === this.currentChallengeIndex) cls = 'active';
            else if (i > this.currentChallengeIndex) cls = 'locked';
            const icon = ch.type === 'question' ? '❓' : ch.type === 'design' ? '🖼️' : '💻';
            const typeLabel = ch.type === 'question' ? 'Quiz' : ch.type === 'design' ? 'Upload' : 'Code';
            return `<div class="challenge-item ${cls}" onclick="UserApp.selectChallenge(${i})">
                <div class="ch-number">${sub ? '✓' : i + 1}</div>
                <div style="flex:1">
                    <div style="font-weight:600;font-size:.85rem">${ch.title}</div>
                    <div style="font-size:.7rem;color:var(--text-muted);display:flex;gap:6px;align-items:center;margin-top:2px">
                        <span class="ch-type-badge ch-type-${ch.type}">${icon} ${typeLabel}</span>
                        <span>${Math.floor(ch.timeLimit/60)}m</span>
                    </div>
                </div>
                ${i > this.currentChallengeIndex && !sub ? '<span>🔒</span>' : ''}
            </div>`;
        }).join('');
    },

    selectChallenge(index) {
        if (index > this.currentChallengeIndex) {
            this.notify('🔒 Complete the current challenge first!', 'error'); return;
        }
        this.saveCurrentWork(); this.stopTimer(); this.loadChallenge(index);
    },

    loadChallenge(index) {
        if (index >= this.challenges.length) { this.showCompletion(); return; }
        const ch = this.challenges[index];
        this.currentChallenge = ch; this.currentChallengeIndex = index;
        this.selectedAnswers = {}; this.uploadedDesign = null;

        const icon = ch.type === 'question' ? '❓' : ch.type === 'design' ? '🖼️' : '💻';
        document.getElementById('challenge-title').textContent = `${icon} ${ch.title}`;
        document.getElementById('challenge-instructions').innerHTML =
            `<h3>📋 Instructions</h3><p style="margin-top:6px">${ch.description}</p><pre>${ch.instructions}</pre>`;

        const subs = Storage.getSubmissionsByParticipant(this.currentUser.id);
        const done = subs.filter(s => s.submitted).length;
        const pct = Math.round((done / this.challenges.length) * 100);
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-text').textContent = `${done}/${this.challenges.length} Completed`;

        ['code-panel','question-panel','design-panel','preview-panel'].forEach(id => document.getElementById(id).classList.add('hidden'));

        const sub = subs.find(s => s.challengeId === ch.id && s.submitted);
        const submitBtn = document.getElementById('btn-submit');
        const nextBtn = document.getElementById('btn-next');

        if (ch.type === 'code') {
            document.getElementById('code-panel').classList.remove('hidden');
            document.getElementById('preview-panel').classList.remove('hidden');
            const editor = document.getElementById('code-editor');
            const existing = Storage.getSubmission(this.currentUser.id, ch.id);
            editor.value = existing ? existing.code : `<!DOCTYPE html>\n<html>\n<head>\n  <style>\n    /* CSS here */\n  </style>\n</head>\n<body>\n  <!-- HTML here -->\n</body>\n</html>`;
            editor.disabled = !!sub;
            this.updatePreview();
        } else if (ch.type === 'question') {
            document.getElementById('question-panel').classList.remove('hidden');
            this.renderQuestions(ch, sub);
        } else if (ch.type === 'design') {
            document.getElementById('design-panel').classList.remove('hidden');
            this.renderDesignUpload(ch, sub);
        }

        if (sub) {
            submitBtn.disabled = true; submitBtn.textContent = '✅ Submitted';
            nextBtn.disabled = false;
        } else {
            submitBtn.disabled = false; submitBtn.textContent = '📤 Submit';
            nextBtn.disabled = true;
        }

        if (!sub) {
            const log = Storage.getActivityLog(this.currentUser.id, ch.id);
            this.timeRemaining = Math.max(0, ch.timeLimit - (log.timeSpent || 0));
            this.startTimer();
            Tracker.start(this.currentUser.id, ch.id);
        } else {
            this.timeRemaining = 0; this.updateTimerDisplay();
        }
        this.renderChallengeList();
    },

    renderQuestions(ch, sub) {
        const panel = document.getElementById('question-panel');
        const existingSub = Storage.getSubmission(this.currentUser.id, ch.id);
        const savedAnswers = existingSub ? (existingSub.answers || {}) : {};
        this.selectedAnswers = savedAnswers;
        panel.innerHTML = `<div class="questions-container">
            <div class="question-header"><h3>📝 Answer All Questions</h3><div class="question-progress"><span id="q-answered">${Object.keys(savedAnswers).length}</span>/${ch.questions.length} answered</div></div>
            ${ch.questions.map((q, qi) => `
            <div class="question-card" id="q-card-${qi}">
                <div class="q-number">Q${qi+1}</div>
                <div class="q-text">${q.q}</div>
                <div class="q-options">
                    ${q.options.map((opt, oi) => `
                    <label class="q-option ${sub ? (oi===q.answer?'correct':(savedAnswers[qi]===oi&&oi!==q.answer?'wrong':'')) : (savedAnswers[qi]===oi?'selected':'')}"
                        ${sub ? '' : `onclick="UserApp.selectAnswer(${qi},${oi})"`}>
                        <input type="radio" name="q${qi}" value="${oi}" ${savedAnswers[qi]===oi?'checked':''} ${sub?'disabled':''}>
                        <span class="q-option-marker">${String.fromCharCode(65+oi)}</span>
                        <span class="q-option-text">${opt}</span>
                        ${sub&&oi===q.answer?'<span class="q-correct-badge">✓</span>':''}
                    </label>`).join('')}
                </div>
            </div>`).join('')}
            ${sub && existingSub ? `<div class="question-result ${existingSub.score>=80?'pass':'fail'}">
                <span>${existingSub.score>=80?'🎉':'📝'}</span>
                <span>Score: ${existingSub.score}/100 — ${existingSub.score>=80?'Passed!':'Submitted'}</span>
            </div>` : ''}
        </div>`;
    },

    selectAnswer(qi, oi) {
        this.selectedAnswers[qi] = oi;
        document.querySelectorAll(`input[name="q${qi}"]`).forEach((r,i) => {
            r.checked = i === oi;
            r.closest('.q-option').classList.toggle('selected', i === oi);
        });
        const el = document.getElementById('q-answered');
        if (el) el.textContent = Object.keys(this.selectedAnswers).length;
    },

    renderDesignUpload(ch, sub) {
        const panel = document.getElementById('design-panel');
        const existingSub = Storage.getSubmission(this.currentUser.id, ch.id);
        if (sub && existingSub && existingSub.designData) {
            panel.innerHTML = `<div class="design-upload-area submitted">
                <h3>🖼️ Your Submitted Design</h3>
                <div class="design-preview-container" style="margin-top:10px">
                    <img src="${existingSub.designData}" alt="Submitted" class="design-preview-img">
                </div>
                <p class="design-status success" style="margin-top:10px">✅ Submitted successfully!</p>
            </div>`;
            return;
        }
        panel.innerHTML = `<div class="design-upload-area">
            <h3>🖼️ Upload Your Design</h3>
            <div class="upload-dropzone" id="upload-dropzone"
                ondragover="event.preventDefault();this.classList.add('dragover')"
                ondragleave="this.classList.remove('dragover')"
                ondrop="UserApp.handleDrop(event)"
                onclick="document.getElementById('design-file-input').click()">
                <div class="upload-icon">📁</div>
                <p class="upload-text">Drag & drop or click to browse</p>
                <p class="upload-subtext">PNG, JPG, WEBP — Max 2MB</p>
                <input type="file" id="design-file-input" accept="image/*" style="display:none" onchange="UserApp.handleFileSelect(event)">
            </div>
            <div id="design-preview-area" class="hidden" style="margin-top:12px">
                <div class="design-preview-container"><img id="uploaded-preview" src="" alt="Preview" class="design-preview-img"></div>
                <div class="design-actions">
                    <button class="btn btn-sm btn-danger" onclick="UserApp.removeDesign()">🗑️ Remove</button>
                    <span id="file-info" class="file-info"></span>
                </div>
            </div>
        </div>`;
    },

    handleDrop(e) {
        e.preventDefault(); e.currentTarget.classList.remove('dragover');
        const f = e.dataTransfer.files[0]; if (f) this.processDesignFile(f);
    },
    handleFileSelect(e) { const f = e.target.files[0]; if (f) this.processDesignFile(f); },
    processDesignFile(file) {
        if (!file.type.startsWith('image/')) { this.notify('Please upload an image!', 'error'); return; }
        if (file.size > 2*1024*1024) { this.notify('File too large! Max 2MB.', 'error'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            this.uploadedDesign = e.target.result;
            document.getElementById('upload-dropzone').classList.add('hidden');
            document.getElementById('design-preview-area').classList.remove('hidden');
            document.getElementById('uploaded-preview').src = this.uploadedDesign;
            document.getElementById('file-info').textContent = `${file.name} (${(file.size/1024).toFixed(1)} KB)`;
            this.notify('Design ready! Click Submit.', 'success');
        };
        reader.readAsDataURL(file);
    },
    removeDesign() {
        this.uploadedDesign = null;
        document.getElementById('upload-dropzone').classList.remove('hidden');
        document.getElementById('design-preview-area').classList.add('hidden');
        document.getElementById('design-file-input').value = '';
    },

    startTimer() {
        this.stopTimer(); this.updateTimerDisplay();
        this.timerInterval = setInterval(() => {
            this.timeRemaining--;
            this.updateTimerDisplay();
            if (this.timeRemaining <= 0) { this.stopTimer(); this.autoSubmit(); }
        }, 1000);
    },
    stopTimer() { if (this.timerInterval) { clearInterval(this.timerInterval); this.timerInterval = null; } },
    updateTimerDisplay() {
        const el = document.getElementById('timer'); if (!el) return;
        const m = Math.floor(Math.max(0, this.timeRemaining) / 60);
        const s = Math.max(0, this.timeRemaining) % 60;
        el.textContent = `⏱ ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        el.className = 'timer' + (this.timeRemaining <= 60 ? ' danger' : this.timeRemaining <= 300 ? ' warning' : '');
    },

    autoSubmit() { this.notify('⏰ Time up! Auto-submitting...', 'info'); this.submitChallenge(true); },

    submitChallenge(auto = false) {
        if (!this.currentChallenge) return;
        const ch = this.currentChallenge;
        let score = 0;
        let submission = {
            participantId: this.currentUser.id, challengeId: ch.id,
            type: ch.type, submitted: true, submittedAt: new Date().toISOString(),
            autoSubmitted: auto, reviewed: false
        };

        if (ch.type === 'code') {
            const codeHtml = document.getElementById('editor-html').value || '';
            const codeCss = document.getElementById('editor-css').value || '';
            const codeJs = document.getElementById('editor-js').value || '';
            
            const combined = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${codeCss}\n</style>\n</head>\n<body>\n${codeHtml}\n<script>\n${codeJs}\n</script>\n</body>\n</html>`;
            if (!auto && combined.length < 50) { this.notify('Write some code first!', 'error'); return; }
            
            const lines = combined.split('\n').length;
            if (codeHtml.length > 5) score += 30; 
            if (codeCss.length > 5) score += 30;
            if (codeJs.length > 5) score += 20;
            if (lines >= 10) score += 10;
            if (combined.length > 200) score += 10;
            
            submission.code = combined;
            submission.codeHtml = codeHtml;
            submission.codeCss = codeCss;
            submission.codeJs = codeJs;
            submission.score = score;

        } else if (ch.type === 'question') {
            const totalQ = ch.questions.length;
            const answered = Object.keys(this.selectedAnswers).length;
            if (!auto && answered < totalQ) { this.notify(`Answer all ${totalQ} questions! (${answered}/${totalQ})`, 'error'); return; }
            let correct = 0;
            ch.questions.forEach((q, i) => { if (this.selectedAnswers[i] === q.answer) correct++; });
            score = Math.round((correct / totalQ) * 100);
            submission.answers = { ...this.selectedAnswers };
            submission.correctCount = correct; submission.totalQuestions = totalQ; submission.score = score;

        } else if (ch.type === 'design') {
            if (!auto && !this.uploadedDesign) { this.notify('Upload a design first!', 'error'); return; }
            score = this.uploadedDesign ? 70 : 0;
            submission.designData = this.uploadedDesign || ''; submission.score = score;
        }

        Tracker.stop(); this.stopTimer();
        Storage.saveSubmission(submission);
        this.initCodeEditorForPushed();
        this.notify(auto ? '⏰ Auto-submitted!' : '🎉 Challenge submitted!', 'success');
    },

    nextChallenge() {
        const next = this.challenges.indexOf(this.currentChallenge) + 1;
        if (next < this.challenges.length) this.loadChallenge(next);
        else this.showCompletion();
    },

    showCompletion() {
        document.getElementById('challenge-title').textContent = '🎉 All Challenges Done!';
        document.getElementById('challenge-instructions').innerHTML = `
            <div class="completion-screen">
                <div class="trophy">🏆</div>
                <h2>Congratulations!</h2>
                <p style="color:var(--text-secondary);margin-bottom:20px">You completed all challenges! Check the leaderboard for your ranking.</p>
                <a href="leaderboard.html" class="btn btn-primary">🏆 View Leaderboard</a>
            </div>`;
        ['code-panel','question-panel','design-panel','preview-panel'].forEach(id => document.getElementById(id).classList.add('hidden'));
        document.getElementById('btn-submit').disabled = true;
        document.getElementById('btn-next').disabled = true;
        this.stopTimer();
        document.getElementById('timer').textContent = '✅ Done';
    },

    updatePreview() {
        const html = document.getElementById('editor-html') ? document.getElementById('editor-html').value : '';
        const css = document.getElementById('editor-css') ? document.getElementById('editor-css').value : '';
        const js = document.getElementById('editor-js') ? document.getElementById('editor-js').value : '';
        const frame = document.getElementById('preview-frame');
        if (!frame) return;
        
        const combinedCode = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${css}\n</style>\n</head>\n<body>\n${html}\n<script>\n${js}\n</script>\n</body>\n</html>`;
        
        frame.srcdoc = combinedCode;
    },

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => this.saveCurrentWork(), 5000);
    },

    saveCurrentWork() {
        if (!this.currentChallenge || !this.currentUser) return;
        const ch = this.currentChallenge;
        const existing = Storage.getSubmission(this.currentUser.id, ch.id);
        if (existing && existing.submitted) return;
        let data = { participantId: this.currentUser.id, challengeId: ch.id, type: ch.type, score: 0, submitted: false };
        if (ch.type === 'code') {
            data.codeHtml = document.getElementById('editor-html').value;
            data.codeCss = document.getElementById('editor-css').value;
            data.codeJs = document.getElementById('editor-js').value;
            data.code = `<!DOCTYPE html>\n<html>\n<head>\n<style>\n${data.codeCss}\n</style>\n</head>\n<body>\n${data.codeHtml}\n<script>\n${data.codeJs}\n</script>\n</body>\n</html>`;
        }
        else if (ch.type === 'question') data.answers = { ...this.selectedAnswers };
        else if (ch.type === 'design' && this.uploadedDesign) data.designData = this.uploadedDesign;
        Storage.saveSubmission(data);
    },

    setupBeforeUnload() {
        window.addEventListener('beforeunload', e => { this.saveCurrentWork(); e.preventDefault(); e.returnValue = ''; });
    },

    toggleFullscreen() {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
        else document.exitFullscreen();
    },

    logout() {
        this.saveCurrentWork(); Tracker.stop(); this.stopTimer();
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        Auth.logoutParticipant(); window.location.href = 'login.html';
    },

    toggleTheme() {
        const c = document.documentElement.getAttribute('data-theme');
        const n = c === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem('appTheme', n);
    },

    notify(msg, type = 'info') {
        let el = document.getElementById('app-notification');
        if (!el) { el = document.createElement('div'); el.id = 'app-notification'; el.className = 'notification'; document.body.appendChild(el); }
        el.textContent = msg; el.className = `notification ${type} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }
};
