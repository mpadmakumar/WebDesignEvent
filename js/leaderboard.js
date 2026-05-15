const Leaderboard = {
    calculate() {
        const participants = Storage.getParticipants();
        const challenges = Storage.getPushedDesigns();
        const settings = Storage.getSettings();
        const results = [];

        participants.forEach(p => {
            const subs = Storage.getSubmissionsByParticipant(p.id).filter(s => s.submitted);
            const logs = Storage.getActivityLogs().filter(l => l.participantId === p.id);

            let rawScore = 0;
            let totalTime = 0;
            let tabSwitches = 0, copies = 0, pastes = 0;

            subs.forEach(s => {
                rawScore += (s.adminScore !== undefined ? s.adminScore : s.score) || 0;
            });

            logs.forEach(l => {
                totalTime += l.timeSpent || 0;
                tabSwitches += l.tabSwitches || 0;
                copies += l.copyCount || 0;
                pastes += l.pasteCount || 0;
            });

            const penalty =
                tabSwitches * (settings.penaltyTabSwitch || 2) +
                copies * (settings.penaltyCopy || 5) +
                pastes * (settings.penaltyPaste || 1);

            const finalScore = Math.max(0, rawScore - penalty);

            const pData = {
                participantId: p.id,
                lotNumber: p.lotNumber,
                completedChallenges: subs.length,
                totalChallenges: challenges.length,
                rawScore, penalty, finalScore, totalTime,
                tabSwitches, copies, pastes
            };
            results.push(pData);
        });

        results.sort((a, b) => b.finalScore - a.finalScore || a.totalTime - b.totalTime);
        results.forEach((r, i) => r.rank = i + 1);
        Storage.saveResults(results);
        return results;
    },

    getTop3() {
        return this.calculate().slice(0, 3);
    },

    renderTable(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const results = this.calculate();

        if (!results.length) {
            el.innerHTML = '<p style="padding:24px;text-align:center;color:var(--text-muted)">No results yet.</p>';
            return;
        }

        el.innerHTML = `<div class="table-wrapper"><table>
            <thead><tr>
                <th>Rank</th><th>Lot #</th>
                <th>Completed</th><th>Raw Score</th>
                <th>Penalty</th><th>Final Score</th><th>Time</th>
            </tr></thead>
            <tbody>${results.map(r => `<tr class="${r.rank <= 3 ? 'top-row rank-' + r.rank : ''}">
                <td><span class="rank-badge rank-${r.rank}">${r.rank <= 3 ? ['🥇','🥈','🥉'][r.rank-1] : '#' + r.rank}</span></td>
                <td><strong>${r.lotNumber}</strong></td>
                <td>${r.completedChallenges}/${r.totalChallenges}</td>
                <td>${r.rawScore}</td>
                <td style="color:var(--danger)">-${r.penalty}</td>
                <td><strong style="color:var(--success)">${r.finalScore}</strong></td>
                <td>${Math.floor(r.totalTime/60)}m ${r.totalTime%60}s</td>
            </tr>`).join('')}
            </tbody>
        </table></div>`;
    },

    renderPodium(containerId) {
        const el = document.getElementById(containerId);
        if (!el) return;
        const top3 = this.getTop3();
        const medals = ['🥇','🥈','🥉'];
        const heights = ['140px','110px','90px'];
        const order = [1, 0, 2]; // 2nd, 1st, 3rd podium display order

        el.innerHTML = `<div class="podium-wrap">
            ${order.map(i => {
                const r = top3[i];
                if (!r) return `<div class="podium-slot empty"><div class="podium-block" style="height:${heights[i]}">—</div></div>`;
                return `<div class="podium-slot rank-${i+1}">
                    <div class="podium-medal">${medals[i]}</div>
                    <div class="podium-name">${r.lotNumber}</div>
                    <div class="podium-score">${r.finalScore} pts</div>
                    <div class="podium-block" style="height:${heights[i]}">#${i+1}</div>
                </div>`;
            }).join('')}
        </div>`;
    }
};
