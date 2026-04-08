// =====================================================================
//  DEATH — Roguelike permadeath system
//
//  Commander death:   save is deleted, profile is deleted, game-over
//                     screen shown. The run is permanently over.
//  Roster death:      member is moved to GS.deadRoster (tombstone),
//                     removed from GS.roster. They never come back.
//
//  Combat failure:    handled by combat.js which calls commanderDied()
//  Job failure risk:  handled by gameTick which can call rosterMemberDied()
// =====================================================================

// ─── COMMANDER DEATH ──────────────────────────────────────────────────

function commanderDied(causeOfDeath = 'Unknown cause') {
    // Stop the game loop — prevent further ticks
    GS._dead = true;

    const name     = GS.commander.name || 'The Commander';
    const level    = GS.commander.level;
    const daysRun  = GS.day;
    const jobsDone = GS.totalJobsDone;
    const pmcName  = DATA.pmcTiers?.[GS.pmcTier]?.name ?? 'Unknown';

    // Find and delete the active save and profile
    const activeSaves = getSaveIndex();
    let linkedSave = null;

    // Try to find which save slot this run corresponds to via profiles
    try {
        const profiles = JSON.parse(localStorage.getItem('ironcompany_profiles') || '[]');
        const activeId = localStorage.getItem('ironcompany_active_profile');
        const profile  = profiles.find(p => p.id === activeId);
        if (profile?.saveSlot) linkedSave = profile.saveSlot;
    } catch {}

    // Delete every save (this is a permadeath run — if they had multiple saves, all go)
    activeSaves.forEach(slot => deleteSave(slot));

    // Delete the active profile
    try {
        const profiles = JSON.parse(localStorage.getItem('ironcompany_profiles') || '[]');
        const activeId = localStorage.getItem('ironcompany_active_profile');
        const remaining = profiles.filter(p => p.id !== activeId);
        localStorage.setItem('ironcompany_profiles', JSON.stringify(remaining));
        // If there are other profiles, activate the first remaining one
        if (remaining.length > 0) {
            localStorage.setItem('ironcompany_active_profile', remaining[0].id);
        } else {
            localStorage.removeItem('ironcompany_active_profile');
        }
    } catch {}

    // Show game-over screen
    _showGameOverScreen(name, level, daysRun, jobsDone, pmcName, causeOfDeath);
}

function _showGameOverScreen(name, level, days, jobs, pmcName, cause) {
    const app = document.getElementById('app');
    if (!app) return;

    // Capture eulogy before wiping DOM
    const deadRosterNames = (GS.deadRoster || []).map(m => m.name).join(', ') || 'None';
    const surviving       = (GS.roster     || []).map(m => m.name).join(', ') || 'None';

    app.innerHTML = `
    <div style="
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        min-height:100vh; background:var(--bg); color:var(--text);
        padding:40px; text-align:center; gap:20px;
        background-image: radial-gradient(ellipse at 50% 40%, rgba(160,30,30,0.08) 0%, transparent 70%);
    ">
        <div style="font-family:var(--font-display); font-size:clamp(2rem,6vw,4rem); color:#c04030;
                    text-shadow:0 0 40px rgba(200,40,30,0.5);">
            KIA
        </div>
        <div style="font-size:0.75rem; letter-spacing:6px; color:var(--text2); font-family:var(--font-ui); text-transform:uppercase;">
            Operational Status: Terminated
        </div>

        <div style="background:rgba(0,0,0,0.3); border:1px solid #6a2020; padding:28px 36px; max-width:600px; width:100%; margin:10px 0;">
            <div style="font-family:var(--font-display); font-size:1.6rem; color:#e8b84b; margin-bottom:6px;">${name}</div>
            <div style="font-family:var(--font-ui); color:var(--text2); font-size:0.82rem; letter-spacing:2px; margin-bottom:18px;">
                Level ${level} · ${pmcName} · Day ${days}
            </div>
            <div style="font-size:0.78rem; color:#c06050; font-style:italic; margin-bottom:16px;">
                Cause of termination: ${cause}
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; text-align:left;">
                <div>
                    <div style="font-family:var(--font-ui); font-size:0.66rem; letter-spacing:2px; color:var(--text2); margin-bottom:4px;">OPERATIONS FILED</div>
                    <div style="font-size:1.1rem; color:var(--text);">${jobs}</div>
                </div>
                <div>
                    <div style="font-family:var(--font-ui); font-size:0.66rem; letter-spacing:2px; color:var(--text2); margin-bottom:4px;">DAYS OPERATIONAL</div>
                    <div style="font-size:1.1rem; color:var(--text);">${days}</div>
                </div>
            </div>
            ${deadRosterNames !== 'None' ? `
            <div style="margin-top:16px; padding-top:14px; border-top:1px solid rgba(100,30,20,0.4); text-align:left;">
                <div style="font-family:var(--font-ui); font-size:0.66rem; letter-spacing:2px; color:#804040; margin-bottom:4px;">PERSONNEL LOST IN SERVICE</div>
                <div style="font-size:0.78rem; color:var(--text2); font-style:italic;">${deadRosterNames}</div>
            </div>` : ''}
            ${surviving !== 'None' ? `
            <div style="margin-top:10px; text-align:left;">
                <div style="font-family:var(--font-ui); font-size:0.66rem; letter-spacing:2px; color:var(--text2); margin-bottom:4px;">PERSONNEL: STATUS UNKNOWN</div>
                <div style="font-size:0.78rem; color:var(--text2); font-style:italic;">${surviving}</div>
            </div>` : ''}
        </div>

        <div style="font-size:0.78rem; color:var(--text2); font-style:italic; max-width:480px; line-height:1.7;">
            The Iron Company's operational records have been sealed. All associated save data has been purged from the archive.
        </div>

        <button onclick="location.reload()" style="
            margin-top:16px; padding:10px 32px;
            background:transparent; border:1px solid #6a2020;
            color:#c04030; cursor:pointer; letter-spacing:3px;
            font-family:var(--font-ui); font-size:0.8rem; text-transform:uppercase;
            transition:background 0.2s, border-color 0.2s;
        " onmouseover="this.style.background='rgba(100,20,20,0.3)';this.style.borderColor='#c04030'"
           onmouseout="this.style.background='transparent';this.style.borderColor='#6a2020'">
            Begin New Chronicle
        </button>
    </div>`;
}

// ─── ROSTER MEMBER DEATH ──────────────────────────────────────────────

function rosterMemberDied(memberId, causeOfDeath = 'Killed in action') {
    const idx = GS.roster.findIndex(m => m.id === memberId);
    if (idx === -1) return;

    const member = GS.roster[idx];

    // Move to dead roster (tombstone)
    GS.deadRoster.push({
        ...member,
        dead:         true,
        causeOfDeath: causeOfDeath,
        dayDied:      GS.day,
    });

    // Remove from active roster
    GS.roster.splice(idx, 1);

    log(`💀 <strong>${member.name}</strong> (${member.cls}) — KIA. Day ${GS.day}. ${causeOfDeath}`, 'bad');
    showToastAndNotify(`KIA: ${member.name}`, 'bad');

    // Pull them off the contract they were on (jobs continue without them)
    // Their bonuses are removed automatically since getActiveRosterEffects() reads GS.roster

    checkMilestones();
    renderAll();
}

// ─── HP DAMAGE ────────────────────────────────────────────────────────

function damageCommander(amount, source = 'Unknown') {
    if (GS._dead) return;
    GS.commander.hp = Math.max(0, GS.commander.hp - Math.floor(amount));
    if (GS.commander.hp <= 0) {
        commanderDied(source);
    }
}
