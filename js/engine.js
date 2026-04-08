// =====================================================================
//  ENGINE — pure data interpreter
//  No upgrade IDs, class names, or category strings are hardcoded here.
//  All game behaviour is derived entirely from DATA (loaded JSON).
// =====================================================================

// ─── UPGRADE EFFECT ACCUMULATOR ──────────────────────────────────────
// Collects every active upgrade's effects into a lookup map.
// effectType → array of {value, categoryFilter?}
function getActiveUpgradeEffects() {
    const map = {};
    DATA.fortUpgrades.forEach(u => {
        if (!GS.upgrades[u.id]) return;
        (u.effects || []).forEach(eff => {
            if (!map[eff.type]) map[eff.type] = [];
            map[eff.type].push(eff);
        });
    });
    return map;
}

// Accumulate a multiplicative effect for all matching entries.
// If an effect has a categoryFilter it only applies when job.category matches.
function accumulateMult(effects, category) {
    let mult = 1.0;
    (effects || []).forEach(e => {
        if (!e.categoryFilter || e.categoryFilter === category) {
            mult *= (1 + e.value);
        }
    });
    return mult;
}

// Accumulate an additive (summed) effect.
function accumulateAdd(effects, category) {
    let sum = 0;
    (effects || []).forEach(e => {
        if (!e.categoryFilter || e.categoryFilter === category) {
            sum += e.value;
        }
    });
    return sum;
}

// ─── ROSTER BONUS ACCUMULATOR ─────────────────────────────────────────
// Collects every roster member's declarative bonuses.
function getActiveRosterEffects() {
    const map = {};
    GS.roster.forEach(member => {
        const cls = DATA.recruitClasses.find(c => c.cls === member.cls);
        if (!cls) return;
        (cls.bonuses || []).forEach(b => {
            if (!map[b.type]) map[b.type] = [];
            map[b.type].push(b);
        });
    });
    return map;
}

// ─── DERIVED BONUSES ─────────────────────────────────────────────────

function getCommanderStatBonus() {
    const efx = getActiveUpgradeEffects();
    return accumulateAdd(efx['commanderStatBonus']);
}

function getMagicFortBonus() {
    const efx    = getActiveUpgradeEffects();
    const raw    = accumulateAdd(efx['magicBonus']);
    // magicMultiplier stacks multiplicatively (e.g. leyline_tap doubles everything)
    const factor = accumulateMult(efx['magicMultiplier']);
    return raw * factor;
}

function getMagicBonus() {
    return getOriginMagicBonus() + getMagicFortBonus();
}

function maxRoster() {
    const efx  = getActiveUpgradeEffects();
    const base = DATA.config?.baseRosterSize ?? 3;
    return base + accumulateAdd(efx['rosterSlots']);
}

function isRareUnlocked() {
    const efx = getActiveUpgradeEffects();
    return (efx['unlockRareRecruits'] || []).some(e => e.value);
}

function isFortWarded() {
    const efx = getActiveUpgradeEffects();
    return (efx['fortWarded'] || []).some(e => e.value);
}

function getRecruitStatBonus(stat) {
    const efx = getActiveUpgradeEffects();
    return accumulateAdd((efx['recruitStatBonus'] || []).filter(e => e.stat === stat || !e.stat));
}

// ─── JOB CALCULATIONS ────────────────────────────────────────────────

function getJobDuration(job) {
    const cat    = job.category;
    const upfx   = getActiveUpgradeEffects();
    const rfx    = getActiveRosterEffects();

    let mult = 1.0;
    mult *= accumulateMult(upfx['durationMult'],  cat);
    mult *= accumulateMult(rfx['durationMult'],   cat);
    return Math.max(3, Math.floor(job.durationBase * mult));
}

function getJobReward(job) {
    const cat    = job.category;
    const upfx   = getActiveUpgradeEffects();
    const rfx    = getActiveRosterEffects();

    let mult = 1.0;
    mult *= accumulateMult(upfx['rewardMult'], cat);
    mult *= accumulateMult(rfx['rewardMult'],  cat);
    return Math.floor(job.rewardBase * mult);
}

function getFameReward(job) {
    const cat    = job.category;
    const upfx   = getActiveUpgradeEffects();
    const rfx    = getActiveRosterEffects();
    const dfaults = DATA.config?.dangerFameDefaults ?? {};
    const base   = job.fameBase ?? (dfaults[String(job.danger)] ?? 5);

    let mult = 1.0;
    mult *= accumulateMult(upfx['fameMult'], cat);
    mult *= accumulateMult(rfx['fameMult'],  cat);
    return Math.floor(base * mult);
}

function getJobXp(job) {
    const cat  = job.category;
    const upfx = getActiveUpgradeEffects();
    const base = Math.floor(job.xpBase * (0.8 + GS.commander.level * 0.1));

    let mult = 1.0;
    mult *= accumulateMult(upfx['xpMult'], cat);
    return Math.floor(base * mult);
}

function getXpRequirementMult() {
    const efx  = getActiveUpgradeEffects();
    // xpReqMult values are negative (reductions), so sum them
    const reduction = accumulateAdd(efx['xpReqMult']);
    return Math.max(0.5, 1.0 + reduction);  // floor at 50% reduction
}

function getHpRegenRate() {
    const upfx  = getActiveUpgradeEffects();
    const rfx   = getActiveRosterEffects();
    const base  = accumulateAdd(upfx['hpRegen']);
    if (base === 0) return 0;  // no regen if infirmary not built
    const bonus = accumulateAdd(upfx['hpRegenMult']) + accumulateAdd(rfx['hpRegenBonus']);
    return base + bonus;
}

function getActiveJobCap() {
    const efx = getActiveUpgradeEffects();
    return 1 + accumulateAdd(efx['activeJobCap']);   // base 1, bonuses stack
}

// ─── COMPANY STATS ────────────────────────────────────────────────────

function companyTotalStr() {
    return GS.commander.str + GS.roster.reduce((a, r) => a + r.str, 0);
}

function companyTotalCun() {
    return GS.commander.cun + GS.roster.reduce((a, r) => a + r.cun, 0);
}

function companyTotalEnd() {
    return GS.commander.end + GS.roster.reduce((a, r) => a + r.end, 0);
}

function companyTotalMagic() {
    return GS.roster.reduce((a, r) => a + (r.magic || 0), 0) + getMagicBonus();
}

function hasMagicUser() {
    // "magic user" threshold defined by a roster member having magic >= 2
    const threshold = DATA.config?.magicUserThreshold ?? 2;
    return GS.roster.some(r => (r.magic || 0) >= threshold);
}

// ─── JOB REQUIREMENTS CHECK ───────────────────────────────────────────

function checkJobRequirements(job) {
    const req     = job.requirements;
    const C       = GS.commander;
    const sBon    = getCommanderStatBonus();
    const reasons = [];

    // Level
    if (C.level < req.minLevel)
        reasons.push(`Commander level ${req.minLevel} required (you are level ${C.level})`);

    // Commander stats
    const statChecks = [
        ['str',  'STR',  req.minStr],
        ['end',  'END',  req.minEnd],
        ['lead', 'LEAD', req.minLead],
        ['cun',  'CUN',  req.minCun],
    ];
    statChecks.forEach(([key, label, min]) => {
        if ((min || 0) > 0 && (C[key] + sBon) < min)
            reasons.push(`Commander ${label} ${min} required (yours: ${C[key]}${sBon ? '+' + sBon : ''})`);
    });

    // Company magic
    if ((req.minMagic || 0) > 0) {
        const mag = companyTotalMagic();
        if (mag < req.minMagic)
            reasons.push(`Company magic ${req.minMagic} required (yours: ${mag})`);
    }

    // Requires a magic user
    if (req.requiresMagicUser && !hasMagicUser())
        reasons.push(`A magic-capable companion must be in your company`);

    // Roster size
    if (GS.roster.length < (req.minRoster || 0))
        reasons.push(`At least ${req.minRoster} companion${req.minRoster !== 1 ? 's' : ''} required (you have ${GS.roster.length})`);

    // Company size
    const companySize = 1 + GS.roster.length;
    if ((req.minCompanySize || 0) > 1 && companySize < req.minCompanySize)
        reasons.push(`Company must have ${req.minCompanySize}+ members total (you have ${companySize})`);

    // Total stats
    const totalStr = companyTotalStr() + sBon * companySize;
    if ((req.minTotalStr || 0) > 0 && totalStr < req.minTotalStr)
        reasons.push(`Combined company STR ${req.minTotalStr} needed (yours: ${totalStr})`);

    const totalCun = companyTotalCun() + sBon * companySize;
    if ((req.minTotalCun || 0) > 0 && totalCun < req.minTotalCun)
        reasons.push(`Combined company CUN ${req.minTotalCun} needed (yours: ${totalCun})`);

    const totalEnd = companyTotalEnd() + sBon * companySize;
    if ((req.minTotalEnd || 0) > 0 && totalEnd < req.minTotalEnd)
        reasons.push(`Combined company END ${req.minTotalEnd} needed (yours: ${totalEnd})`);

    // Fame
    if (GS.fame < (req.minFame || 0))
        reasons.push(`Requires ${req.minFame} renown (you have ${GS.fame})`);

    // Required classes
    const rosterClasses = GS.roster.map(r => r.cls);
    (req.requiredClasses || []).forEach(cls => {
        if (!rosterClasses.includes(cls))
            reasons.push(`A ${cls} must be in your company`);
    });

    // Forbidden classes
    (req.forbiddenClasses || []).forEach(cls => {
        if (rosterClasses.includes(cls))
            reasons.push(`A ${cls} cannot be taken on this contract`);
    });

    // Already running
    if (GS.activeJobs.some(a => a.jobId === job.id))
        reasons.push(`This contract is already underway`);

    // Conflicting active jobs
    (req.forbiddenIfActiveJobs || []).forEach(forbidId => {
        if (GS.activeJobs.some(a => a.jobId === forbidId)) {
            const conflict = DATA.jobs.find(j => j.id === forbidId);
            reasons.push(`Cannot run alongside "${conflict?.name ?? forbidId}"`);
        }
    });

    // Required upgrades
    (req.requiredUpgrades || []).forEach(upId => {
        if (!GS.upgrades[upId]) {
            const up = DATA.fortUpgrades.find(u => u.id === upId);
            reasons.push(`Requires fort improvement: ${up?.name ?? upId}`);
        }
    });

    // Required milestones
    (req.requiredMilestones || []).forEach(msId => {
        if (!GS.milestones[msId]) {
            const ms = DATA.milestones.find(m => m.id === msId);
            reasons.push(`Requires milestone: "${ms?.label ?? msId}"`);
        }
    });

    // Non-repeatable
    if (job.repeatable === false && GS.completedJobs?.[job.id])
        reasons.push(`This contract cannot be repeated`);

    // Active job cap — global cap from upgrades, but per-job maxActiveJobs acts as a hard ceiling.
    // effectiveCap: the global upgrade cap applies normally; per-job cap is a separate ceiling.
    const globalCap    = getActiveJobCap();
    const jobCap       = req.maxActiveJobs ?? 99;
    const effectiveCap = jobCap < 99 ? jobCap : globalCap;
    if (GS.activeJobs.length >= effectiveCap)
        reasons.push(`Too many active contracts (max ${effectiveCap} at once)`);

    return { ok: reasons.length === 0, reasons };
}

function canTakeJob(job) {
    const r = checkJobRequirements(job);
    return { ok: r.ok, reason: r.reasons[0] ?? '', reasons: r.reasons };
}

// ─── SUPPRESSION RESISTANCE ────────────────────────────────────────
function getSuppressionResist() {
    const upfx = getActiveUpgradeEffects();
    const rfx  = getActiveRosterEffects();
    return accumulateAdd(upfx['suppressionResist']) + accumulateAdd(rfx['suppressionResist']);
}

function getNationThreatMult() {
    const upfx = getActiveUpgradeEffects();
    const rfx  = getActiveRosterEffects();
    // Values are negative (reductions). 1.0 = normal, 0.75 = 25% less threat
    const reduction = accumulateAdd(upfx['nationThreatMult']) + accumulateAdd(rfx['nationThreatMult']);
    return Math.max(0.1, 1.0 + reduction);
}

function hasBlockadeImmunity() {
    const efx = getActiveUpgradeEffects();
    return (efx['blockadeImmunity'] || []).some(e => e.value);
}

// ─── ACTIVE PENALTY MODIFIER ─────────────────────────────────────────
// Suppression penalties are temporary debuffs stored in GS.suppressionPenalties
function getActivePenaltyMult(effectType, category) {
    let mult = 1.0;
    Object.values(GS.suppressionPenalties || {}).forEach(p => {
        if (p.type === effectType) {
            if (!p.categoryFilter || p.categoryFilter === category) {
                if (!p.expiresDay || GS.day <= p.expiresDay) {
                    mult *= (1 + p.value);
                }
            }
        }
    });
    return mult;
}

// ─── PMC TIER ────────────────────────────────────────────────────────
function getCurrentPmcTier() {
    return DATA.pmcTiers.find(t => t.tier === GS.pmcTier) || DATA.pmcTiers[0];
}

function checkPmcTierAdvance() {
    const current = DATA.pmcTiers[GS.pmcTier] || DATA.pmcTiers[0];
    const next    = DATA.pmcTiers[GS.pmcTier + 1];
    if (!next) return false;
    const meets =
        GS.fame          >= next.thresholdFame     &&
        GS.bronze        >= next.thresholdBronze    &&
        GS.roster.length >= next.thresholdRoster    &&
        GS.totalJobsDone >= next.thresholdJobsDone;
    return meets;
}

// ─── NATION THREAT ────────────────────────────────────────────────────
const RELATION_LEVELS = ['indifferent','neutral','wary','suspicious','notice','concern','alarm','hostile','war'];

function getNationRelation(nationId) {
    return GS.nationRelations[nationId] || DATA.nations.find(n=>n.id===nationId)?.startRelation || 'indifferent';
}

function getNationThreat(nationId) {
    return GS.nationThreat[nationId] || 0;
}

function getRelationFromThreat(nation, threat) {
    const t = nation.toleranceThresholds;
    if (threat >= t.war)     return 'war';
    if (threat >= t.hostile) return 'hostile';
    if (threat >= t.alarm)   return 'alarm';
    if (threat >= t.concern) return 'concern';
    if (threat >= t.notice)  return 'notice';
    return nation.startRelation || 'indifferent';
}

function applyNationThreatGains(job) {
    const gains = job.nationThreatGain || {};
    const mult  = getNationThreatMult();
    Object.entries(gains).forEach(([nationId, delta]) => {
        const nation = DATA.nations.find(n => n.id === nationId);
        if (!nation) return;
        if (GS.pmcTier < (nation.pmcTierNotice || 0)) return; // too small to register

        const scaled = Math.floor(delta * mult);
        GS.nationThreat[nationId] = Math.max(0, (GS.nationThreat[nationId] || 0) + scaled);

        const oldRel = getNationRelation(nationId);
        const newRel = getRelationFromThreat(nation, GS.nationThreat[nationId]);
        GS.nationRelations[nationId] = newRel;

        const oldIdx = RELATION_LEVELS.indexOf(oldRel);
        const newIdx = RELATION_LEVELS.indexOf(newRel);

        if (newIdx > oldIdx && delta > 0) {
            log(`⚠ <strong>${nation.name}</strong>: ${nation.responses[newRel]}`, 'bad');
            showToast(`⚠ ${nation.name} — ${newRel}`);
        } else if (newIdx < oldIdx && delta < 0) {
            log(`📜 <strong>${nation.name}</strong> threat reduced. Relation: <em>${newRel}</em>.`, 'good');
        }
    });
}

function decayNationThreat() {
    const decay = DATA.config?.nationThreatDecayPerDay ?? 0.5;
    DATA.nations.forEach(nation => {
        if (!GS.nationThreat[nation.id]) return;
        GS.nationThreat[nation.id] = Math.max(0, GS.nationThreat[nation.id] - decay);
        // Recalculate relation after decay
        const rel = getRelationFromThreat(nation, GS.nationThreat[nation.id]);
        GS.nationRelations[nation.id] = rel;
    });
}
