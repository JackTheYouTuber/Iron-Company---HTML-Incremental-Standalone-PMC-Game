// ===================== XP & LEVELING =====================
// XP reduction comes from the engine (xpReqMult effects in fort_upgrades.json).
// Level-up stat gains are read from game_config.json → levelUpGains.

function gainXp(amount) {
    GS.commander.xp += amount;
    while (GS.commander.xp >= Math.floor(GS.commander.xpNext * getXpRequirementMult())) {
        GS.commander.xp    -= Math.floor(GS.commander.xpNext * getXpRequirementMult());
        GS.commander.level++;
        const xpCfg = DATA.config?.xpBaseFormula ?? {base:100, exponent:1.6};
        GS.commander.xpNext = Math.floor(xpCfg.base * Math.pow(xpCfg.exponent, GS.commander.level - 1));

        // Read level-up gains from data if present, else use defaults
        const gains = DATA.levelUpGains || { str:2, end:1, lead:1, cun:1, hp:15 };
        GS.commander.str   += gains.str   ?? 2;
        GS.commander.end   += gains.end   ?? 1;
        GS.commander.lead  += gains.lead  ?? 1;
        GS.commander.cun   += gains.cun   ?? 1;
        GS.commander.maxHp += gains.hp    ?? 15;
        GS.commander.hp     = GS.commander.maxHp;

        const title = getCommanderTitle();
        log(`⚡ Level ${GS.commander.level} — <em>${title}</em>. Your legend grows.`, 'gold');
        showToast(`⚔ Level ${GS.commander.level}: ${title}`);
    }
}

// ===================== FAME =====================
function gainFame(amount) {
    const before = getCurrentFameRank();
    GS.fame += amount;
    const after = getCurrentFameRank();
    GS.fameRank = DATA.fameRanks.findIndex(fr => fr.threshold === after.threshold);
    if (after.rank > before.rank) {
        log(`📜 Renown reached: <em>${after.label}</em>. Word spreads further into the dark.`, 'gold');
        showToast(`☆ ${after.label}`);
    }
}

// ===================== MILESTONES =====================
// Milestone check types are evaluated generically.
// Add new check types here to support new milestone JSON entries.

function evaluateMilestoneCheck(check) {
    switch (check.type) {
        case 'totalJobsDone':          return GS.totalJobsDone >= check.value;
        case 'rosterLength':           return GS.roster.length >= check.value;
        case 'rosterFull':             return GS.roster.length >= maxRoster();
        case 'bronze':                 return GS.bronze >= check.value;
        case 'fame':                   return GS.fame >= check.value;
        case 'commanderLevel':         return GS.commander.level >= check.value;
        case 'upgradeCount':           return Object.keys(GS.upgrades).length >= check.value;
        case 'allUpgrades':            return Object.keys(GS.upgrades).length >= DATA.fortUpgrades.length;
        case 'upgradeBuilt':           return !!GS.upgrades[check.value];
        case 'fortWarded':             return isFortWarded();
        case 'rosterHasClass':         return GS.roster.some(r => r.cls === check.value);
        case 'rosterHasRarity':        return GS.roster.some(r => r.rarity === check.value);
        case 'hasRareRecruit':         return GS.roster.some(r => r.rarity === 'rare');
        case 'hasMagicUser':           return hasMagicUser();
        case 'totalMagicStat':         return companyTotalMagic() >= check.value;
        case 'completedJobCategory':   return !!(GS.completedCategories?.[check.value]);
        case 'categoryJobsDone':       return (GS.completedCategories?.[check.category] ?? 0) >= check.value;
        case 'categoryJobsDoneMulti':  return (check.categories ?? []).reduce(
                                           (s, c) => s + (GS.completedCategories?.[c] ?? 0), 0
                                       ) >= check.value;
        case 'totalStr':               return companyTotalStr() >= check.value;
        case 'totalCun':               return companyTotalCun() >= check.value;
        case 'totalEnd':               return companyTotalEnd() >= check.value;
        case 'specificJobDone':        return !!(GS.completedJobs?.[check.value]);
        case 'specificJobDoneCount':   return (GS.completedJobs?.[check.job] ?? 0) >= check.value;
        case 'pmcTier':                return GS.pmcTier >= check.value;
        case 'suppressionSurvived':    return GS.suppressionSurvived >= check.value;
        case 'nationAtRelation': {
            // Must match RELATION_LEVELS in engine.js exactly — 'notice' sits between 'suspicious' and 'concern'
            const levels = ['indifferent','neutral','wary','suspicious','notice','concern','alarm','hostile','war'];
            return DATA.nations.some(n => levels.indexOf(getNationRelation(n.id)) >= levels.indexOf(check.value));
        }
        case 'nationThreatReduced':
            return Object.values(GS.nationThreat || {}).some(t => t === 0);
        default: return false;
    }
}

function checkMilestones() {
    DATA.milestones.forEach(m => {
        if (!GS.milestones[m.id] && evaluateMilestoneCheck(m.check)) {
            GS.milestones[m.id] = true;
            log(`🏆 <strong>${m.label}</strong> — ${m.flavour}`, 'gold');
            showToast(`🏆 ${m.label}`);
        }
    });
}
