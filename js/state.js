// ===================== GAME STATE =====================
const GS = {
    bronze: 0,
    day: 1,
    commander: {
        name:"", origin:"", portraitSymbol:"⚔", startingItem:"",
        level:1, xp:0, xpNext:100,
        hp:100, maxHp:100,
        str:10, end:10, lead:4, cun:4,
        weapon:    null,   // equipped weapon id (from weapons.json)
        heroClass: false,  // true when level >= config.heroClassLevel
        heroLevel: 0,      // levels above heroClassLevel threshold
    },
    roster:              [],
    deadRoster:          [],   // permanently dead roster members (tombstone records)
    activeJobs:          [],
    fame:                0,
    fameRank:            0,
    pmcTier:             0,
    upgrades:            {},
    milestones:          {},
    totalJobsDone:       0,
    completedJobs:       {},
    completedCategories: {},
    recruitPool:         [],

    // Irregular job board — randomly appearing/expiring contracts
    irregularBoard:      [],   // [{jobId, expiresDay}] currently visible irregular jobs
    lastIrregularCheck:  0,

    // Nation system
    nationThreat:        {},
    nationRelations:     {},
    suppressionEvents:   [],
    suppressionSurvived: 0,
    suppressionPenalties:{},
    lastSuppressionCheck: 0,
    territoryClaimed:    0,
    repeatQueue:         [],

    // Combat (turn-based boss fights — null when no fight active)
    combat: null,
};

// ===================== SAVE / LOAD =====================
const SAVE_KEY_PREFIX = 'ironcompany_save_';
const SAVE_INDEX_KEY  = 'ironcompany_saves';

function getSaveIndex() {
    try { return JSON.parse(localStorage.getItem(SAVE_INDEX_KEY)) || []; }
    catch { return []; }
}

function saveGame(slotName) {
    localStorage.setItem(SAVE_KEY_PREFIX + slotName, JSON.stringify(GS));
    const index = getSaveIndex();
    if (!index.includes(slotName)) {
        index.push(slotName);
        localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
    }
    log(`📦 Progress saved to "<em>${slotName}</em>".`, 'good');
}

function loadGame(slotName) {
    const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotName);
    if (!raw) { showToast('Save not found!'); return false; }
    try {
        const data = JSON.parse(raw);
        Object.assign(GS, {
            completedJobs:       {},
            completedCategories: {},
            nationThreat:        {},
            nationRelations:     {},
            suppressionEvents:   [],
            suppressionSurvived: 0,
            suppressionPenalties:{},
            lastSuppressionCheck:0,
            pmcTier:             0,
            territoryClaimed:    0,
            repeatQueue:         [],
            deadRoster:          [],
            irregularBoard:      [],
            lastIrregularCheck:  0,
            combat:              null,
            ...data
        });
        renderAll();
        log(`📂 Loaded chronicle: "<em>${slotName}</em>".`, 'good');
        return true;
    } catch {
        showToast('Corrupted save!');
        return false;
    }
}

function deleteSave(slotName) {
    localStorage.removeItem(SAVE_KEY_PREFIX + slotName);
    const index = getSaveIndex().filter(s => s !== slotName);
    localStorage.setItem(SAVE_INDEX_KEY, JSON.stringify(index));
}

function listSaves() {
    return getSaveIndex().map(slotName => {
        const raw = localStorage.getItem(SAVE_KEY_PREFIX + slotName);
        let preview = null;
        try {
            const d = JSON.parse(raw);
            preview = {
                name:    d.commander?.name   || '???',
                origin:  d.commander?.origin || '',
                level:   d.commander?.level  || 1,
                day:     d.day    || 1,
                fame:    d.fame   || 0,
                pmcTier: d.pmcTier || 0,
            };
        } catch {}
        return { slotName, preview };
    });
}
