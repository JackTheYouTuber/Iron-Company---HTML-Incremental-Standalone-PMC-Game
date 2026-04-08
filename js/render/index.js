// ===================== RENDER ALL =====================
// Delegates to ScreenEngine, which calls render() on every mounted widget.
// Falls back to direct calls if ScreenEngine is not yet initialised (boot race).
function renderAll() {
    if (typeof ScreenEngine !== 'undefined' && ScreenEngine.renderAll) {
        ScreenEngine.renderAll();
    }
}

// ─── Repeat queue panel (Contracts > Active > Repeating) ─────────────
function renderRepeatQueuePanel() {
    const el = document.getElementById('repeat-queue-panel');
    if (!el) return;

    // Update badge
    const badge = document.getElementById('repeat-queue-badge');
    if (badge) {
        badge.textContent = GS.repeatQueue.length;
        badge.style.display = GS.repeatQueue.length > 0 ? '' : 'none';
    }

    if (GS.repeatQueue.length === 0) {
        el.innerHTML = `<div class="notice">No contracts queued to repeat.<br>
            <span style="font-size:0.7rem;color:var(--text2)">Add repeatable contracts using the 🔁 button on any available contract.</span></div>`;
        return;
    }

    el.innerHTML = GS.repeatQueue.map(jobId => {
        const job = DATA.jobs.find(j => j.id === jobId);
        if (!job) return '';
        const isActive = GS.activeJobs.some(aj => aj.jobId === jobId);
        const chk      = checkJobRequirements(job);
        const dur      = getJobDuration(job);
        const rew      = getJobReward(job);

        return `<div class="job-card${isActive ? ' in-progress' : (!chk.ok ? ' disabled' : '')}"
                     style="border-left-color:${categoryBorderColor(job.category)}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                <div style="flex:1">
                    <div class="job-name">${categoryIcon(job.category)} ${job.name}
                        ${isActive ? '<span class="badge green">Running</span>' : ''}
                        ${!chk.ok && !isActive ? '<span class="badge" style="color:#c04040;border-color:#802020">Paused</span>' : ''}
                    </div>
                    <div style="font-size:0.72rem;color:var(--text2);margin-top:2px">
                        ⟁ ${formatMoney(rew)} · ⏳ ~${dur}s per run · Done ${GS.completedJobs?.[jobId] ?? 0}×
                    </div>
                    ${!chk.ok && !isActive ? `<div style="font-size:0.68rem;color:#b05040;font-style:italic;margin-top:3px">✗ ${chk.reasons[0]}</div>` : ''}
                </div>
                <button onclick="removeFromRepeatQueue('${jobId}')"
                        title="Remove from repeat queue"
                        style="padding:3px 9px;font-size:0.7rem;background:rgba(100,20,10,0.25);
                               border:1px solid rgba(160,40,30,0.5);color:#e06040;cursor:pointer;flex-shrink:0">
                    ✕ Remove
                </button>
            </div>
        </div>`;
    }).join('');
}
function renderActiveJobsCenter() {
    const el = document.getElementById('active-jobs-center-panel');
    if (!el) return;
    const all = [...GS.activeJobs, ...GS.suppressionEvents];
    if (all.length === 0) {
        el.innerHTML = '<div class="notice">Your company rests idle at the fort.</div>';
        return;
    }
    let html = '';
    GS.activeJobs.forEach(aj => {
        const job = DATA.jobs.find(j => j.id === aj.jobId);
        if (!job) return;
        const pct = Math.min(100, (1 - aj.timeLeft / aj.totalTime) * 100);
        html += `<div class="job-card in-progress" style="border-left-color:${categoryBorderColor(job.category)}">
            <div class="job-name">${categoryIcon(job.category)} ${job.name}</div>
            <div class="active-job-time" id="center_time_${aj.jobId}">⏳ ${Math.ceil(aj.timeLeft)}s remaining</div>
            <div class="job-progress"><div class="job-progress-fill" id="center_prog_${aj.jobId}" style="width:${pct}%"></div></div>
        </div>`;
    });
    GS.suppressionEvents.forEach((se, idx) => {
        const ev = DATA.suppressionEvents.find(e => e.id === se.eventId);
        const nation = DATA.nations.find(n => n.id === se.nationId);
        if (!ev || !nation) return;
        const pct = Math.min(100, (1 - se.timeLeft / se.totalTime) * 100);
        html += `<div class="job-card in-progress suppression-card">
            <div class="job-name" style="color:#e06040">⚠ ${ev.name} <span style="font-size:0.7rem;color:#c08060">${nation.flag} ${nation.name}</span></div>
            <div class="active-job-time" id="center_suptime_${idx}">⏳ ${Math.ceil(se.timeLeft)}s to resolve</div>
            <div class="job-progress"><div class="job-progress-fill" id="center_supprog_${idx}" style="width:${pct}%;background:linear-gradient(90deg,#6a1810,#c03020)"></div></div>
            <button onclick="handleResolveSuppressionContract(${idx})" style="margin-top:6px;padding:3px 12px;font-size:0.7rem;background:rgba(120,30,20,0.3);border:1px solid #6a2010;color:#e06040;cursor:pointer">⚔ Resolve</button>
        </div>`;
    });
    el.innerHTML = html;
}

// ─── Nation panel in Company > Nations sub-tab ─────────────────────
function renderNationPanelCenter() {
    const el = document.getElementById('nation-panel-center');
    if (!el) return;
    // Re-use the same render logic as the right panel
    const tier = DATA.pmcTiers?.[GS.pmcTier];
    if (!tier || GS.pmcTier < 1) {
        el.innerHTML = '<div class="notice" style="font-size:0.72rem">Rise to Iron Company tier before nations take notice.</div>';
        return;
    }
    el.innerHTML = _buildNationPanelHTML();
}

// ─── Fort status in Fort > Status sub-tab ─────────────────────────
function renderFortStatusCenter() {
    const el = document.getElementById('fort-status-center-inner');
    if (!el) return;
    const built = DATA.fortUpgrades.filter(u => GS.upgrades[u.id]);
    if (built.length === 0) {
        el.innerHTML = '<div class="notice">No improvements made yet.</div>';
        return;
    }
    const byCategory = {};
    built.forEach(u => {
        if (!byCategory[u.category]) byCategory[u.category] = [];
        byCategory[u.category].push(u);
    });
    el.innerHTML = Object.entries(byCategory).map(([cat, ups]) => `
        <div style="margin-bottom:12px">
            <div class="section-label">${cat}</div>
            ${ups.map(u => `
            <div style="font-size:0.78rem;margin-bottom:6px;display:flex;gap:8px;align-items:flex-start">
                <span style="color:${u.category==='arcane'?'#a060d0':'var(--green2)'};margin-top:1px">${u.category==='arcane'?'✦':'✔'}</span>
                <div>
                    <div style="color:var(--text)">${u.name}</div>
                    <div style="color:var(--text2);font-style:italic;font-size:0.7rem">${u.effect}</div>
                </div>
            </div>`).join('')}
        </div>`).join('');
}

// ─── Milestones in Company > Deeds sub-tab ────────────────────────
function renderMilestonesPanel() {
    const mel = document.getElementById('milestone-list');
    if (!mel) return;
    const done    = DATA.milestones.filter(m =>  GS.milestones[m.id]);
    const pending = DATA.milestones.filter(m => !GS.milestones[m.id]);
    const renderMs = list => list.map(m => {
        const isDone = !!GS.milestones[m.id];
        return `<div class="milestone-row${isDone ? ' done' : ''}">
            <span class="milestone-icon">${isDone ? '🏆' : '○'}</span>
            <div>
                <div class="milestone-label">${m.label}</div>
                <div class="milestone-desc">${m.desc}</div>
                ${isDone ? `<div class="milestone-flavour">"${m.flavour}"</div>` : ''}
            </div>
        </div>`;
    }).join('');
    mel.innerHTML = `
        ${done.length    ? `<div class="section-label" style="margin-top:0">Achieved</div>${renderMs(done)}`    : ''}
        ${pending.length ? `<div class="section-label">In Pursuit</div>${renderMs(pending)}` : ''}`;
}
