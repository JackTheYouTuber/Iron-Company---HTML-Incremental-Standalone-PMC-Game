// =====================================================================
//  IRREGULAR JOB BOARD
//
//  Irregular jobs (jobType: "irregular" in jobs.json) are NOT always
//  visible. They appear randomly on a timer, have a limited window to
//  accept, then disappear until the next spawn cycle.
//
//  GS.irregularBoard: [{jobId, expiresDay}]
//
//  Called from gameTick daily loop.
// =====================================================================

function tickIrregularBoard() {
    const cfg           = DATA.config || {};
    const checkInterval = cfg.irregularJobCheckIntervalDays ?? 3;
    const maxActive     = cfg.irregularJobMaxActive          ?? 2;
    const windowDays    = cfg.irregularJobWindowDays         ?? 7;

    if (GS.day - GS.lastIrregularCheck < checkInterval) return;
    GS.lastIrregularCheck = GS.day;

    // 1. Expire any that have passed their window
    const before = GS.irregularBoard.length;
    GS.irregularBoard = GS.irregularBoard.filter(entry => {
        if (GS.day > entry.expiresDay) {
            const job = DATA.jobs.find(j => j.id === entry.jobId);
            if (job) log(`⏱ <em>${job.name}</em> — irregular contract window closed.`, 'info');
            return false;
        }
        return true;
    });

    // 2. Try to spawn new irregular jobs if slots available
    const slotsAvailable = maxActive - GS.irregularBoard.length;
    if (slotsAvailable <= 0) return;

    // Candidate pool: irregular jobs not currently on the board,
    // not already active, and whose PMC tier unlocks are met
    const currentTierUnlocks = DATA.pmcTiers
        .filter(t => t.tier <= GS.pmcTier)
        .flatMap(t => t.unlocks || []);

    const onBoard   = new Set(GS.irregularBoard.map(e => e.jobId));
    const inProgress= new Set(GS.activeJobs.map(a => a.jobId));

    const candidates = DATA.jobs.filter(j => {
        if (j.jobType !== 'irregular')     return false;
        if (onBoard.has(j.id))             return false;
        if (inProgress.has(j.id))          return false;
        if (GS.completedJobs?.[j.id] && j.repeatable === false) return false;
        // Category unlock check
        const cat = j.category;
        const pmcGated = [
            'intelligence','political','territorial','suppression_counter',
            'nation_pressure','proxy_war','nation_war','sovereign_ops',
            'shadow_government','endgame'
        ];
        if (pmcGated.includes(cat) && !currentTierUnlocks.includes(cat)) return false;
        // Basic level requirement
        if ((j.requirements?.minLevel ?? 0) > GS.commander.level + 3) return false;
        return true;
    });

    if (!candidates.length) return;

    // Spawn up to slotsAvailable, randomly
    const toSpawn = Math.min(slotsAvailable, Math.ceil(Math.random() * slotsAvailable));
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    for (let i = 0; i < toSpawn && i < shuffled.length; i++) {
        const job = shuffled[i];
        GS.irregularBoard.push({
            jobId:      job.id,
            expiresDay: GS.day + windowDays,
        });
        log(`📋 <strong>Irregular contract available:</strong> <em>${job.name}</em> — ${windowDays} days to accept.`, 'gold');
        showToastAndNotify(`New contract: ${job.name}`, 'gold');
    }
}

// ─── Check if a job is currently visible on the irregular board ───────
function isIrregularJobVisible(jobId) {
    return GS.irregularBoard.some(e => e.jobId === jobId);
}

// ─── Get expiry day for a board job ──────────────────────────────────
function getIrregularJobExpiry(jobId) {
    return GS.irregularBoard.find(e => e.jobId === jobId)?.expiresDay ?? null;
}

// ─── Remove from board when accepted ─────────────────────────────────
function acceptIrregularJob(jobId) {
    GS.irregularBoard = GS.irregularBoard.filter(e => e.jobId !== jobId);
}
