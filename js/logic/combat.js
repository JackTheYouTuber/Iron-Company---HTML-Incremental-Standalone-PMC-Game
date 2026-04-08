// =====================================================================
//  COMBAT — Turn-based boss fights (Hero Class tab)
//
//  GS.combat structure when active:
//  {
//    bossId:        string,         // boss id from bosses.json
//    bossHp:        number,
//    bossMaxHp:     number,
//    bossEffects:   [],             // {type, value, turnsLeft}
//    playerEffects: [],             // {type, value, turnsLeft}
//    turn:          number,         // which turn we are on
//    log:           string[],       // combat log entries
//    phase:         'player'|'boss'|'victory'|'defeat',
//    cooldowns:     {},             // bossActionId → turnsLeft
//    lastBossAction:string|null,
//  }
// =====================================================================

// ─── Start a fight ───────────────────────────────────────────────────

function startBossFight(bossId) {
    const boss = DATA.bosses.find(b => b.id === bossId);
    if (!boss) { showToast('Boss not found.'); return; }

    if (GS.combat) { showToast('Already in combat.'); return; }

    const minLvl = boss.minCommanderLevel ?? 1;
    if (GS.commander.level < minLvl) {
        showToast(`Requires commander level ${minLvl}.`);
        return;
    }

    GS.combat = {
        bossId,
        bossHp:         boss.hp,
        bossMaxHp:      boss.maxHp,
        bossEffects:    [],
        playerEffects:  [],
        turn:           1,
        log:            [`⚔ Combat initiated: <strong>${boss.name}</strong>`],
        phase:          'player',
        cooldowns:      {},
        lastBossAction: null,
    };

    renderAll();
    switchTab('combat');
    log(`⚔ Combat initiated: <em>${boss.name}</em>`, 'bad');
}

// ─── Player action ───────────────────────────────────────────────────

function combatPlayerAction(actionType) {
    if (!GS.combat || GS.combat.phase !== 'player') return;
    const cb = GS.combat;

    let playerDmg = 0;
    let actionName = '';
    let actionLog  = '';

    // Calculate player damage output (Hero-class scaling)
    const baseStr  = GS.commander.str;
    const baseCun  = GS.commander.cun;
    const mag      = companyTotalMagic();
    const heroBoost= GS.commander.heroClass
        ? 1 + (GS.commander.heroLevel * (DATA.config?.heroClassStatMultPerLevel ?? 0.15))
        : 1.0;

    // Check for player debuffs
    const outputMult = _getCombatEffect(cb.playerEffects, 'output_mult', 1.0);
    const magDisabled= cb.playerEffects.some(e => e.type === 'disable_magic');

    switch (actionType) {
        case 'strike': {
            const wep = GS.commander.weapon
                ? DATA.weapons.find(w => w.id === GS.commander.weapon) : null;
            const wepDmg = wep
                ? (wep.combatDamage.base + (baseStr * (wep.combatDamage.scalingMult ?? 0.5))
                   + (mag * (wep.combatDamage.magicMult ?? 0)))
                : (10 + baseStr * 0.8);
            playerDmg  = Math.floor(wepDmg * heroBoost * outputMult * (0.85 + Math.random() * 0.3));
            actionName = wep ? `${wep.name} Strike` : 'Direct Strike';
            actionLog  = `You attack: <strong>${actionName}</strong> — ${playerDmg} damage.`;
            break;
        }
        case 'mana_blast': {
            if (magDisabled) {
                cb.log.push('⚠ Your mana channels are suppressed. Mana Blast unavailable.');
                renderAll(); return;
            }
            playerDmg  = Math.floor((20 + baseCun * 1.2 + mag * 2) * heroBoost * outputMult
                                    * (0.8 + Math.random() * 0.4));
            actionName = 'Mana Blast';
            actionLog  = `You channel: <strong>Mana Blast</strong> — ${playerDmg} damage.`;
            break;
        }
        case 'strategic_output': {
            if (!GS.commander.heroClass) {
                cb.log.push('⚠ Strategic Output requires Hero Class.');
                renderAll(); return;
            }
            if (magDisabled) {
                cb.log.push('⚠ Your mana channels are suppressed.');
                renderAll(); return;
            }
            // Strategic output — massive damage, based on heroLevel
            playerDmg  = Math.floor((100 + (GS.commander.heroLevel * 50) + mag * 5) * heroBoost
                                    * outputMult * (0.9 + Math.random() * 0.2));
            actionName = 'Strategic-Class Output';
            actionLog  = `You channel strategic-class mana: <strong>${actionName}</strong> — ${playerDmg} damage.`;
            break;
        }
        case 'defend': {
            // Add defence effect for 2 turns
            cb.playerEffects.push({ type: 'damage_reduce', value: 0.5, turnsLeft: 2 });
            actionLog  = `You take a defensive posture. Incoming damage halved for 2 turns.`;
            break;
        }
        default:
            return;
    }

    // Apply boss defence effects
    const bossDefReduce = _getCombatEffect(cb.bossEffects, 'damage_reduce', 1.0);
    const finalDmg = Math.floor(playerDmg * bossDefReduce);
    cb.bossHp = Math.max(0, cb.bossHp - finalDmg);
    if (finalDmg > 0) actionLog += ` (${finalDmg} after defences)`;
    cb.log.push(actionLog);

    // Check victory
    if (cb.bossHp <= 0) {
        _combatVictory();
        return;
    }

    // Boss turn
    cb.phase = 'boss';
    _tickCombatEffects(cb.playerEffects);
    _tickCombatEffects(cb.bossEffects);
    _tickCooldowns(cb);
    _bossTurn();
}

// ─── Boss AI turn ─────────────────────────────────────────────────────

function _bossTurn() {
    const cb   = GS.combat;
    const boss = DATA.bosses.find(b => b.id === cb.bossId);
    if (!boss) return;

    // Pick an available action (not on cooldown, prefer high-damage when below 30% HP)
    const lowHp = (cb.bossHp / cb.bossMaxHp) < 0.3;
    const available = boss.actions.filter(a => !(cb.cooldowns[a.id] > 0));
    if (!available.length) {
        cb.log.push(`${boss.name} hesitates — no actions available.`);
        _endBossTurn();
        return;
    }

    // Weight toward damage actions when boss is low HP
    let chosen;
    if (lowHp) {
        const damaging = available.filter(a => a.damage && a.damage[1] > 0);
        chosen = damaging.length ? damaging[Math.floor(Math.random() * damaging.length)]
                                 : available[Math.floor(Math.random() * available.length)];
    } else {
        chosen = available[Math.floor(Math.random() * available.length)];
    }

    cb.lastBossAction = chosen.id;

    // Set cooldown if applicable
    if (chosen.cooldown) cb.cooldowns[chosen.id] = chosen.cooldown;

    // Calculate boss damage
    let bossDmg = 0;
    if (chosen.damage && chosen.damage[1] > 0) {
        const [dMin, dMax] = chosen.damage;
        bossDmg = dMin + Math.floor(Math.random() * (dMax - dMin));
    }

    // Apply player defence reduction
    const playerDefReduce = _getCombatEffect(cb.playerEffects, 'damage_reduce', 1.0);

    // Check accuracy
    const hits = Math.random() * 100 < (chosen.accuracy ?? 85);
    if (!hits) {
        cb.log.push(`${boss.name} uses <strong>${chosen.name}</strong> — miss.`);
        _applyBossEffect(chosen, cb, 0);
        _endBossTurn();
        return;
    }

    let finalPlayerDmg = Math.floor(bossDmg * playerDefReduce);

    // Hero Class dramatically reduces incoming damage at higher levels
    if (GS.commander.heroClass) {
        const heroMitigation = Math.min(0.85, GS.commander.heroLevel * 0.05);
        finalPlayerDmg = Math.floor(finalPlayerDmg * (1 - heroMitigation));
    }

    let bossLog = `${boss.name}: <strong>${chosen.name}</strong> — `;
    if (finalPlayerDmg > 0) {
        GS.commander.hp = Math.max(0, GS.commander.hp - finalPlayerDmg);
        bossLog += `${finalPlayerDmg} damage dealt.`;
    }

    // Apply special effects
    _applyBossEffect(chosen, cb, finalPlayerDmg);
    cb.log.push(bossLog);

    // Check if commander died
    if (GS.commander.hp <= 0) {
        cb.phase = 'defeat';
        cb.log.push(`💀 You have been defeated by <strong>${boss.name}</strong>.`);
        cb.log.push('Operational status: Terminated.');
        renderAll();
        setTimeout(() => commanderDied(`Defeated in combat by ${boss.name}`), 2500);
        return;
    }

    _endBossTurn();
}

function _applyBossEffect(action, cb, dmg) {
    if (!action.effect) return;
    const e = action.effect;
    if (e === 'buff_next_30')       cb.bossEffects.push({ type: 'output_mult', value: 1.3, turnsLeft: 1 });
    if (e === 'self_defend_40_2t')  cb.bossEffects.push({ type: 'damage_reduce', value: 0.6, turnsLeft: 2 });
    if (e === 'self_defend_50_3t')  cb.bossEffects.push({ type: 'damage_reduce', value: 0.5, turnsLeft: 3 });
    if (e === 'disable_magic_1t')   cb.playerEffects.push({ type: 'disable_magic', value: 1, turnsLeft: 1 });
    if (e === 'debuff_output_25_2t')cb.playerEffects.push({ type: 'output_mult', value: 0.75, turnsLeft: 2 });
    if (e === 'defend_counter') {
        cb.bossEffects.push({ type: 'damage_reduce', value: 0.4, turnsLeft: 1 });
        // Counter hit
        const counterDmg = Math.floor(30 + Math.random() * 30);
        GS.commander.hp = Math.max(0, GS.commander.hp - counterDmg);
        cb.log.push(`Counter-strike: ${counterDmg} additional damage.`);
    }
    if (e === 'double_hit' && dmg > 0) {
        const secondDmg = Math.floor(dmg * 0.6);
        GS.commander.hp = Math.max(0, GS.commander.hp - secondDmg);
        cb.log.push(`Reality fold strikes twice — ${secondDmg} additional damage.`);
    }
    if (e === 'dot_30_3t')  cb.playerEffects.push({ type: 'dot', value: 30, turnsLeft: 3 });
}

function _endBossTurn() {
    const cb = GS.combat;

    // Tick DoT effects on player
    cb.playerEffects.forEach(e => {
        if (e.type === 'dot' && e.turnsLeft > 0) {
            GS.commander.hp = Math.max(0, GS.commander.hp - e.value);
            cb.log.push(`Void resonance: ${e.value} damage.`);
        }
    });

    cb.turn++;
    cb.phase = 'player';
    renderAll();
}

// ─── Victory ─────────────────────────────────────────────────────────

function _combatVictory() {
    const cb   = GS.combat;
    const boss = DATA.bosses.find(b => b.id === cb.bossId);
    if (!boss) return;

    cb.phase = 'victory';
    cb.log.push(`✅ <strong>${boss.name}</strong> — Defeated.`);

    // Rewards
    addMoney(boss.rewards.bronze);
    gainXp(boss.rewards.xp);
    gainFame(boss.rewards.fame);

    // Loot
    if (boss.lootTable?.length) {
        const lootId  = boss.lootTable[Math.floor(Math.random() * boss.lootTable.length)];
        const weapon  = DATA.weapons.find(w => w.id === lootId);
        if (weapon) {
            cb.log.push(`🔫 Recovered: <strong>${weapon.name}</strong>`);
            // Auto-equip if better than current or commander has nothing
            if (!GS.commander.weapon) GS.commander.weapon = weapon.id;
        }
    }

    cb.log.push(`⟁ ${formatMoney(boss.rewards.bronze)} · ✦ ${boss.rewards.xp} XP · ☆ +${boss.rewards.fame} renown`);

    // Mark boss as defeated in milestones-style tracker
    if (!GS.completedJobs) GS.completedJobs = {};
    GS.completedJobs[`boss_${boss.id}`] = (GS.completedJobs[`boss_${boss.id}`] ?? 0) + 1;

    checkMilestones();
    renderAll();

    log(`✅ Boss defeated: <em>${boss.name}</em> — ${formatMoney(boss.rewards.bronze)} recovered.`, 'gold');
}

function endCombat() {
    GS.combat = null;
    renderAll();
}

// ─── Hero Class check (called on level-up) ───────────────────────────

function checkHeroClass() {
    const heroThreshold = DATA.config?.heroClassLevel ?? 15;
    const statMult      = DATA.config?.heroClassStatMultPerLevel ?? 0.15;
    const hpMult        = DATA.config?.heroClassHpMultPerLevel   ?? 0.20;

    const prevHeroClass = GS.commander.heroClass;
    const prevHeroLevel = GS.commander.heroLevel;

    if (GS.commander.level >= heroThreshold) {
        GS.commander.heroClass = true;
        GS.commander.heroLevel = GS.commander.level - heroThreshold + 1;

        if (!prevHeroClass) {
            // First time achieving Hero Class
            log(`🌟 <strong>HERO CLASS ACHIEVED.</strong> Level ${GS.commander.level}. You are no longer operating within normal parameters.`, 'gold');
            showToastAndNotify('🌟 Hero Class Achieved', 'gold');
        } else if (GS.commander.heroLevel > prevHeroLevel) {
            // Hero level increased
            const boost = Math.round(statMult * 100);
            log(`🌟 Hero Level ${GS.commander.heroLevel} — all stats +${boost}% effective output.`, 'gold');
        }
    }
}

// ─── Utility helpers ──────────────────────────────────────────────────

function _getCombatEffect(effects, type, defaultVal) {
    let val = defaultVal;
    effects.forEach(e => { if (e.type === type && e.turnsLeft > 0) val *= e.value; });
    return val;
}

function _tickCombatEffects(effects) {
    for (let i = effects.length - 1; i >= 0; i--) {
        effects[i].turnsLeft--;
        if (effects[i].turnsLeft <= 0) effects.splice(i, 1);
    }
}

function _tickCooldowns(cb) {
    Object.keys(cb.cooldowns).forEach(k => {
        cb.cooldowns[k]--;
        if (cb.cooldowns[k] <= 0) delete cb.cooldowns[k];
    });
}

// ─── Get effective hero-class stats for display ───────────────────────
function getHeroEffectiveStat(stat) {
    if (!GS.commander.heroClass) return GS.commander[stat] ?? 0;
    const mult = 1 + (GS.commander.heroLevel * (DATA.config?.heroClassStatMultPerLevel ?? 0.15));
    return Math.floor((GS.commander[stat] ?? 0) * mult);
}
