// ===================== GAME LOOP =====================
let lastTick = Date.now();
let dayTimer = 0;
const DAY_DURATION = () => DATA.config?.dayDuration ?? 120;

function gameTick() {
    const now = Date.now();
    const dt  = (now - lastTick) / 1000;
    lastTick  = now;

    dayTimer += dt;
    if (dayTimer >= DAY_DURATION()) {
        dayTimer -= DAY_DURATION();
        GS.day++;

        // HP regen from engine
        const regenRate = getHpRegenRate();
        if (regenRate > 0 && GS.commander.hp < GS.commander.maxHp) {
            GS.commander.hp = Math.min(GS.commander.maxHp,
                GS.commander.hp + Math.floor(GS.commander.maxHp * regenRate));
        }

        // Decay nation threat each day
        decayNationThreat();

        // Check if suppression events should spawn
        checkAndSpawnSuppression();

        // Auto-save
        const saveEvery = DATA.config?.autoSaveIntervalDays ?? 5;
        if (GS.day % saveEvery === 0 && GS.commander.name) {
            const saves = getSaveIndex();
            if (saves.length > 0) saveGame(saves[0]);
        }
    }

    // Tick suppression events (run every frame like regular jobs)
    const suppressionChanged = tickSuppressionEvents(dt);

    // Live-update suppression card timers in the Contracts tab (same pattern as regular jobs)
    GS.suppressionEvents.forEach((se, idx) => {
        const timeEl = document.getElementById('suptime_' + idx);
        const progEl = document.getElementById('supprog_'  + idx);
        if (timeEl) timeEl.textContent = `⏳ ${Math.max(0, Math.ceil(se.timeLeft))}s to resolve`;
        if (progEl) progEl.style.width = `${Math.min(100, (1 - se.timeLeft / se.totalTime) * 100)}%`;
        // Also update the right-panel condensed cards
        const rpTimeEl = document.getElementById('rp_suptime_' + idx);
        const rpProgEl = document.getElementById('rp_supprog_'  + idx);
        if (rpTimeEl) rpTimeEl.textContent = `⏳ ${Math.max(0, Math.ceil(se.timeLeft))}s to resolve`;
        if (rpProgEl) rpProgEl.style.width = `${Math.min(100, (1 - se.timeLeft / se.totalTime) * 100)}%`;
        // Center panel active jobs sub-tab
        const ctTimeEl = document.getElementById('center_suptime_' + idx);
        const ctProgEl = document.getElementById('center_supprog_'  + idx);
        if (ctTimeEl) ctTimeEl.textContent = `⏳ ${Math.max(0, Math.ceil(se.timeLeft))}s to resolve`;
        if (ctProgEl) ctProgEl.style.width = `${Math.min(100, (1 - se.timeLeft / se.totalTime) * 100)}%`;
    });

    // Tick regular active jobs
    let completedAny = false;
    const _repeatRestarts = []; // collected here, processed AFTER filter so job is gone from activeJobs

    GS.activeJobs = GS.activeJobs.filter(aj => {
        aj.timeLeft -= dt;
        const prog   = document.getElementById('prog_'  + aj.jobId);
        const timeEl = document.getElementById('time_'  + aj.jobId);
        if (prog)   prog.style.width   = `${Math.min(100,(1 - aj.timeLeft / aj.totalTime)*100)}%`;
        if (timeEl) timeEl.textContent = `⏳ ${Math.max(0, Math.ceil(aj.timeLeft))}s remaining`;
        const cprog = document.getElementById('center_prog_' + aj.jobId);
        const ctime = document.getElementById('center_time_' + aj.jobId);
        if (cprog) cprog.style.width   = `${Math.min(100,(1 - aj.timeLeft / aj.totalTime)*100)}%`;
        if (ctime) ctime.textContent   = `⏳ ${Math.max(0, Math.ceil(aj.timeLeft))}s remaining`;

        if (aj.timeLeft <= 0) {
            const jobDef = DATA.jobs.find(j => j.id === aj.jobId);
            if (jobDef) {
                const reward = getJobReward(jobDef);
                const xp     = getJobXp(jobDef);
                const fame   = getFameReward(jobDef);
                addMoney(reward);
                gainXp(xp);
                gainFame(fame);
                GS.totalJobsDone++;
                GS.completedJobs[jobDef.id] = (GS.completedJobs[jobDef.id] ?? 0) + 1;
                if (jobDef.category) {
                    GS.completedCategories[jobDef.category] =
                        (GS.completedCategories[jobDef.category] ?? 0) + 1;
                }
                if (jobDef.category === 'territorial') GS.territoryClaimed++;
                applyNationThreatGains(jobDef);
                const catNote = getCategoryNote(jobDef.category);
                log(`✅ <em>${jobDef.name}</em> — ${formatMoney(reward)} earned, +${xp} XP, +${fame} renown.${catNote}`, 'good');
                refreshRecruits();
                completedAny = true;
                checkMilestones();
                checkPmcAdvancement();
                // Queue repeat-restarts — process AFTER filter so the job is out of activeJobs
                if (GS.repeatQueue.includes(jobDef.id)) _repeatRestarts.push(jobDef);
            }
            return false;
        }
        return true;
    });

    // Now the completed jobs are gone — safe to re-check requirements
    _repeatRestarts.forEach(jobDef => {
        const rechk = checkJobRequirements(jobDef);
        if (rechk.ok) {
            const dur = getJobDuration(jobDef);
            GS.activeJobs.push({ jobId: jobDef.id, timeLeft: dur, totalTime: dur });
            log(`🔁 <em>${jobDef.name}</em> restarted from repeat queue.`, 'info');
            completedAny = true; // trigger renderAll to show it immediately
        } else {
            GS.repeatQueue = GS.repeatQueue.filter(id => id !== jobDef.id);
            log(`⚠ <em>${jobDef.name}</em> removed from repeat queue — requirements no longer met.`, 'bad');
            showToastAndNotify(`Repeat stopped: ${jobDef.name}`, 'bad');
        }
    });

    renderCurrency();
    renderCommander();
    renderHeaderSummary();

    // Tick all widgets that need per-frame updates (progress bars, summaries)
    if (typeof ScreenEngine !== 'undefined' && ScreenEngine.tick) {
        ScreenEngine.tick(dt);
    }

    if (completedAny || suppressionChanged) renderAll();
    else {
        renderActiveJobsCenter();
        renderNationPanelCenter();
    }

    requestAnimationFrame(gameTick);
}

function getCategoryNote(cat) {
    const notes = {
        arcane:           ' The arcane veil shifts.',
        intelligence:     ' Information has value.',
        territorial:      ' The map changes.',
        nation_war:       ' Nations take notice.',
        nation_pressure:  ' The balance shifts.',
        sovereign_ops:    ' History is being made.',
    };
    return notes[cat] || '';
}

// ─── COLLAPSIBLE SECTIONS ─────────────────────────────────────────────
function toggleCollapsible(id) {
    const section = document.getElementById(id);
    if (!section) return;
    const body  = section.querySelector('.collapsible-body');
    const arrow = section.querySelector('.collapse-arrow');
    if (!body) return;
    const isOpen = body.style.display !== 'none';
    body.style.display  = isOpen ? 'none' : '';
    if (arrow) arrow.textContent = isOpen ? '▶' : '▼';
    section.classList.toggle('open', !isOpen);
}

// ─── SUB-TABS ─────────────────────────────────────────────────────────
function switchSubTab(group, subtabId) {
    // Deactivate all sub-tabs in same group
    document.querySelectorAll(`.sub-tab-btn[data-subtab]`).forEach(btn => {
        if (btn.closest(`#tab-${group}`)) {
            btn.classList.toggle('active', btn.dataset.subtab === subtabId);
        }
    });
    document.querySelectorAll(`.sub-tab-content`).forEach(c => {
        if (c.closest(`#tab-${group}`)) {
            c.classList.toggle('active', c.id === subtabId);
        }
    });
    // Trigger render for sub-tabs that need it
    if (subtabId === 'company-nations')    renderNationPanelCenter();
    if (subtabId === 'company-milestones') renderMilestonesPanel();
    if (subtabId === 'fort-status-center') renderFortStatusCenter();
    if (subtabId === 'jobs-active')        renderActiveJobsCenter();
}

// ─── HEADER SUMMARY ───────────────────────────────────────────────────
function renderHeaderSummary() {
    const el = document.getElementById('header-active-summary');
    if (!el) return;
    const count = GS.activeJobs.length + GS.suppressionEvents.length;
    if (count === 0) { el.innerHTML = ''; return; }
    const suppCount = GS.suppressionEvents.length;
    el.innerHTML = `<div class="header-active-pills" onclick="switchTab('jobs');switchSubTab('jobs','jobs-active')" style="cursor:pointer" title="Click to view active contracts">
        ${GS.activeJobs.slice(0,3).map(aj => {
            const job = DATA.jobs.find(j => j.id === aj.jobId);
            if (!job) return '';
            const pct = Math.min(100, (1 - aj.timeLeft / aj.totalTime) * 100);
            return `<div class="header-active-pill" title="${job.name}">
                <span>${job.name.slice(0,18)}</span>
                <div class="header-pill-bar"><div style="width:${pct}%"></div></div>
            </div>`;
        }).join('')}
        ${suppCount > 0 ? `<div class="header-active-pill header-active-pill--threat">⚠ ${suppCount} suppression</div>` : ''}
        ${count > 3 ? `<div class="header-active-pill header-active-pill--more">+${count-3} more</div>` : ''}
    </div>`;

    // Update active badge in sub-tab
    const badge = document.getElementById('active-jobs-badge');
    if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }
    // Nations alert badge (on Company tab sub-tab)
    const hasAlarm = Object.values(GS.nationRelations || {}).some(r =>
        ['alarm','hostile','war'].includes(r));
    const natBadge = document.getElementById('nations-alert-badge');
    if (natBadge) natBadge.style.display = (hasAlarm || GS.suppressionEvents.length > 0) ? '' : 'none';

    // Roster count badge
    const rosterBadge = document.getElementById('roster-count-badge');
    if (rosterBadge) rosterBadge.textContent = GS.roster.length > 0 ? `${GS.roster.length}/${maxRoster()}` : '';
}

// ─── NOTIFICATION SYSTEM ─────────────────────────────────────────────
const _notifications = [];
const MAX_NOTIFS = 40;

function pushNotification(msg, type = 'info') {
    _notifications.unshift({ msg, type, day: GS.day, ts: Date.now() });
    if (_notifications.length > MAX_NOTIFS) _notifications.pop();
    const dot = document.getElementById('notif-dot');
    if (dot) dot.style.display = '';
    _renderNotifList();
}

function toggleNotifPanel() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    const open = panel.style.display !== 'none';
    panel.style.display = open ? 'none' : '';
    if (!open) {
        // Mark as seen — hide dot
        const dot = document.getElementById('notif-dot');
        if (dot) dot.style.display = 'none';
    }
}

function clearNotifications() {
    _notifications.length = 0;
    _renderNotifList();
}

function _renderNotifList() {
    const el = document.getElementById('notif-list');
    if (!el) return;
    if (!_notifications.length) {
        el.innerHTML = '<div class="notif-empty">No recent dispatches.</div>';
        return;
    }
    el.innerHTML = _notifications.map(n => `
        <div class="notif-entry notif-${n.type}">
            <span class="notif-day">Day ${n.day}</span>
            <span class="notif-msg">${n.msg}</span>
        </div>`).join('');
}

// Patched showToast — also pushes to notification panel based on SETTINGS
const _origShowToast = typeof showToast === 'function' ? showToast : null;
function showToastAndNotify(msg, type = 'info') {
    showToast(msg);
    // Route to notification panel based on type/content
    const s = typeof SETTINGS !== 'undefined' ? SETTINGS : {};
    const shouldPush = (
        (s.notifyJobDone    !== false && /contract|completed|✅/i.test(msg))  ||
        (s.notifyLevelUp    !== false && /level/i.test(msg))                    ||
        (s.notifyMilestone  !== false && /milestone|deed|🏆/i.test(msg))        ||
        (s.notifyNation     !== false && /nation|relation|threat/i.test(msg))   ||
        (s.notifySuppression!== false && /suppression|⚠/i.test(msg))           ||
        (s.notifyPmcTier    !== false && /tier|pmc|sovereign/i.test(msg))
    );
    if (shouldPush) pushNotification(msg, type);
}

// ─── REPEAT QUEUE ─────────────────────────────────────────────────────
function addToRepeatQueue(jobId) {
    if (GS.repeatQueue.includes(jobId)) return;
    GS.repeatQueue.push(jobId);
    const job = DATA.jobs.find(j => j.id === jobId);
    showToastAndNotify(`🔁 ${job?.name ?? jobId} added to repeat queue.`, 'info');

    // Auto-start immediately if the job isn't already running
    const alreadyRunning = GS.activeJobs.some(aj => aj.jobId === jobId);
    if (!alreadyRunning && job) {
        const chk = checkJobRequirements(job);
        if (chk.ok) {
            const dur = getJobDuration(job);
            GS.activeJobs.push({ jobId: job.id, timeLeft: dur, totalTime: dur });
            log(`📜 Contract taken (repeat queue): <em>${job.name}</em>.`, 'info');
        }
    }

    renderRepeatQueuePanel();
    renderAll();
}

function removeFromRepeatQueue(jobId) {
    GS.repeatQueue = GS.repeatQueue.filter(id => id !== jobId);
    renderRepeatQueuePanel();
    renderAll();
}

// ─── SUB-SUB-TABS (inside Contracts > Active) ─────────────────────────
function switchSubSubTab(subsubtabId) {
    document.querySelectorAll('.sub-sub-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subsubtab === subsubtabId);
    });
    document.querySelectorAll('.sub-sub-tab-content').forEach(c => {
        c.classList.toggle('active', c.id === subsubtabId);
    });
}

// ─── START GAME ───────────────────────────────────────────────────────
function startGame() {
    // Initialise nation relations from starting values
    DATA.nations.forEach(n => {
        if (!GS.nationRelations[n.id]) GS.nationRelations[n.id] = n.startRelation;
    });
    lastTick = Date.now();
    requestAnimationFrame(gameTick);
    const saves = listSaves();
    if (saves.length > 0) openSaveSelectModal();
    else                  openCharCreation();
}

// ─── MODAL HELPERS ────────────────────────────────────────────────────
function openSaveSelectModal() {
    const ov = document.getElementById('save-select-overlay');
    if (ov) ov.style.display = 'flex';
    renderSaveSelectList();
}
function closeSaveSelectModal() {
    const ov = document.getElementById('save-select-overlay');
    if (ov) ov.style.display = 'none';
}
function renderSaveSelectList() {
    const el = document.getElementById('save-select-list');
    if (!el) return;
    el.innerHTML = listSaves().map(s => {
        const p = s.preview;
        const tierName = p?.pmcTier != null
            ? (DATA.pmcTiers?.[p.pmcTier]?.name ?? '') : '';
        return `<div class="save-card" style="cursor:pointer" onclick="pickSave('${s.slotName}')">
            <div class="save-name">${s.slotName}</div>
            ${p ? `<div class="save-preview">${p.name}${p.origin ? ' · '+p.origin : ''} · Lv.${p.level} · Day ${p.day}${tierName ? ' · <em>'+tierName+'</em>' : ''}</div>` : ''}
        </div>`;
    }).join('');
}
function pickSave(slotName)  { closeSaveSelectModal(); loadGame(slotName); }
function startNewFromModal() { closeSaveSelectModal(); openCharCreation(); }
