// ===================== CHAR CREATION: CONFIRM =====================
// Validates input and applies the chosen origin to GS.
// The only file in charCreation/ that writes to GS.

function confirmCharCreation() {
    const nameInput = document.getElementById('char-name-input');
    const name      = (nameInput?.value || '').trim();

    if (!name) {
        shakeElement('char-name-input');
        showToast('Your commander needs a name.');
        return;
    }
    if (name.length > 40) {
        showToast('Name is too long — even legend has its limits.');
        return;
    }
    if (!CC.selectedOriginId) {
        showToast('Choose an origin before beginning.');
        // Briefly highlight the origin grid
        shakeElement('origin-list');
        return;
    }

    const origin = DATA.origins.find(o => o.id === CC.selectedOriginId);
    if (!origin) return;

    const ss = DATA.config?.startingStats ?? { str: 10, end: 10, lead: 4, cun: 4, hp: 100 };

    // ── Apply to GS ──────────────────────────────
    GS.commander.name           = name;
    GS.commander.origin         = origin.name;
    GS.commander.portraitSymbol = origin.portraitSymbol;
    GS.commander.startingItem   = origin.startingItem;
    GS.commander.str            = (ss.str  ?? 10) + (origin.statBonus.str  || 0);
    GS.commander.end            = (ss.end  ?? 10) + (origin.statBonus.end  || 0);
    GS.commander.lead           = (ss.lead ??  4) + (origin.statBonus.lead || 0);
    GS.commander.cun            = (ss.cun  ??  4) + (origin.statBonus.cun  || 0);
    GS.commander.level          = 1;
    GS.commander.xp             = 0;
    GS.commander.xpNext         = 100;
    GS.commander.hp             = ss.hp ?? 100;
    GS.commander.maxHp          = ss.hp ?? 100;
    GS.bronze                   = origin.startingBronze;
    GS.day                      = 1;
    GS.roster                   = [];
    GS.activeJobs               = [];
    GS.fame                     = 0;
    GS.fameRank                 = 0;
    GS.upgrades                 = {};
    GS.milestones               = {};
    GS.totalJobsDone            = 0;
    GS.completedJobs            = {};
    GS.completedCategories      = {};
    GS.pmcTier                  = 0;
    GS.recruitPool              = [];
    GS.nationThreat             = {};
    GS.nationRelations          = {};
    GS.suppressionEvents        = [];
    GS.suppressionSurvived      = 0;
    GS.suppressionPenalties     = {};
    GS.lastSuppressionCheck     = 0;
    GS.territoryClaimed         = 0;
    GS.repeatQueue              = [];

    // Re-initialise nation relations from starting values
    DATA.nations.forEach(n => {
        GS.nationRelations[n.id] = n.startRelation;
    });

    refreshRecruits();
    closeCharCreation();
    renderAll();

    // ── Opening log entries ──────────────────────
    const magLine = (origin.magicBonus || 0) > 0
        ? ` The air around you hums with an old familiar weight. Magic remembers its own.`
        : '';
    log(`The gate of the abandoned fort groans open. <strong>${name}</strong> steps inside — ${origin.name.toLowerCase()}, alone, and already planning.${magLine}`, 'gold');
    log(`You carry: ${origin.startingItem}. That, and the will to make this ruin mean something.`, 'info');
    log(`Take a contract from the <em>Contracts</em> tab to draw first blood.`, 'info');
}
