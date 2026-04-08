// ===================== NATION & SUPPRESSION LOGIC =====================

function checkAndSpawnSuppression() {
    const interval = DATA.config?.suppressionCheckIntervalDays ?? 8;
    if (GS.day - GS.lastSuppressionCheck < interval) return;
    GS.lastSuppressionCheck = GS.day;

    DATA.nations.forEach(nation => {
        const rel = getNationRelation(nation.id);
        if (!['alarm','hostile','war'].includes(rel)) return;

        // Already has an active suppression from this nation?
        if (GS.suppressionEvents.some(e => e.nationId === nation.id)) return;

        // Find eligible events for this nation's type and relation level
        const eligible = DATA.suppressionEvents.filter(ev => {
            if (ev.triggersAtRelation && RELATION_LEVELS.indexOf(rel) < RELATION_LEVELS.indexOf(ev.triggersAtRelation)) return false;
            if (!ev.sourceNationTypes.includes('all') && !ev.sourceNationTypes.includes(nation.type)) return false;
            // Already active?
            if (GS.suppressionEvents.some(ae => ae.eventId === ev.id && ae.nationId === nation.id)) return false;
            return true;
        });

        if (!eligible.length) return;

        // Pick one randomly, weighted toward severity
        const ev = eligible[Math.floor(Math.random() * eligible.length)];
        const dur = ev.durationBase;

        GS.suppressionEvents.push({
            eventId:   ev.id,
            nationId:  nation.id,
            timeLeft:  dur,
            totalTime: dur,
            ignored:   false,
        });

        log(`⚠ <strong>${nation.name}</strong> has deployed: <em>${ev.name}</em>. Address it from the Contracts tab.`, 'bad');
        showToast(`⚠ Suppression: ${ev.name}`);
    });
}

function resolveSuppressionEvent(se) {
    const ev     = DATA.suppressionEvents.find(e => e.id === se.eventId);
    const nation = DATA.nations.find(n => n.id === se.nationId);
    if (!ev || !nation) return;

    // Apply threat reduction from effect
    if (ev.effect?.type === 'threatReduction') {
        const target = ev.effect.nation === 'source' ? se.nationId : ev.effect.nation;
        GS.nationThreat[target] = Math.max(0, (GS.nationThreat[target] || 0) - ev.effect.value);
        const rel = getRelationFromThreat(nation, GS.nationThreat[target]);
        GS.nationRelations[target] = rel;
    }

    GS.suppressionSurvived++;
    log(`✅ Suppression resolved: <em>${ev.name}</em>. ${ev.flavourResolved}`, 'good');
    gainFame(ev.fameBase || 10);
    gainXp(ev.xpBase || 30);
    if ((ev.rewardBase || 0) > 0) {
        addMoney(ev.rewardBase);
        log(`⟁ Recovered ${formatMoney(ev.rewardBase)} from the engagement.`, 'good');
    }
    checkMilestones();
}

function applySuppressionPenalty(se) {
    const ev = DATA.suppressionEvents.find(e => e.id === se.eventId);
    if (!ev?.penaltyIfIgnored) return;
    const p = ev.penaltyIfIgnored;
    const dur = DATA.config?.suppressionPenaltyDurationDays ?? 7;
    const key = `${se.eventId}_${se.nationId}`;

    // Skip blockade if immune — only applies to the economic blockade event
    if (se.eventId === 'economic_blockade' && hasBlockadeImmunity()) {
        log(`🛡 Supply line negates the blockade penalty from <em>${DATA.suppressionEvents.find(e=>e.id===se.eventId)?.name}</em>.`, 'good');
        return;
    }

    GS.suppressionPenalties[key] = {
        type:          p.type,
        value:         p.value,
        categoryFilter:p.categoryFilter || null,
        expiresDay:    GS.day + (p.duration || dur),
    };

    const nation = DATA.nations.find(n=>n.id===se.nationId);
    log(`📛 Suppression ignored: ${nation?.name} penalty applied — ${ev.penaltyIfIgnored.type}.`, 'bad');
}

function tickSuppressionEvents(dt) {
    let changed = false;
    GS.suppressionEvents = GS.suppressionEvents.filter(se => {
        se.timeLeft -= dt;
        if (se.timeLeft <= 0) {
            if (!se.resolved) {
                applySuppressionPenalty(se);
            }
            changed = true;
            return false;
        }
        return true;
    });

    // Clean expired penalties
    Object.keys(GS.suppressionPenalties).forEach(k => {
        const p = GS.suppressionPenalties[k];
        if (p.expiresDay && GS.day > p.expiresDay) delete GS.suppressionPenalties[k];
    });

    return changed;
}

function acceptSuppressionContract(se) {
    se.accepted = true;
    const ev = DATA.suppressionEvents.find(e => e.id === se.eventId);
    if (!ev) return;
    log(`📜 Suppression contract accepted: <em>${ev.name}</em>.`, 'info');
}

function completeSuppressionContract(seIndex) {
    const se = GS.suppressionEvents[seIndex];
    if (!se) return;
    se.resolved = true;
    se.timeLeft = 0;
    resolveSuppressionEvent(se);
    GS.suppressionEvents.splice(seIndex, 1);
    renderAll();
}

// ─── PMC TIER ADVANCEMENT ─────────────────────────────────────────────
function checkPmcAdvancement() {
    while (checkPmcTierAdvance()) {
        GS.pmcTier++;
        const tier = DATA.pmcTiers[GS.pmcTier];
        if (!tier) break;
        log(`🏛 <strong>${tier.name}</strong> — ${tier.flavour}`, 'gold');
        showToast(`🏛 ${tier.name}`);
        // Apply threat multiplier scaling to all nations
        DATA.nations.forEach(nation => {
            if (GS.pmcTier >= (nation.pmcTierNotice || 0)) {
                // Nation becomes aware
                if (!GS.nationRelations[nation.id]) {
                    GS.nationRelations[nation.id] = nation.startRelation;
                    log(`📜 <strong>${nation.name}</strong> has taken notice of the Iron Company.`, 'bad');
                }
            }
        });
        checkMilestones();
    }
}
