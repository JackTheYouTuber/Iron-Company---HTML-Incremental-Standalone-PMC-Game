// ── CombatWidget ──────────────────────────────────────────────────────
// Turn-based boss combat UI. Unlocked at Hero Class (level 15+).
// Lives in the Combat tab in the center panel.

class CombatWidget extends Widget {

    mount() {
        this.container.id = 'combat-tab-content';
        this._mounted = true;
        this.render();
    }

    render() {
        if (!GS.commander.heroClass && GS.commander.level < (DATA.config?.heroClassLevel ?? 15)) {
            this._renderLocked();
            return;
        }
        if (GS.combat) {
            this._renderActiveCombat();
        } else {
            this._renderBossSelect();
        }
    }

    _renderLocked() {
        const threshold = DATA.config?.heroClassLevel ?? 15;
        this.setHTML(`
            <div class="notice" style="margin-top:20px">
                <div style="font-size:1.1rem;color:var(--text);margin-bottom:8px">⚔ Combat Operations</div>
                <div style="font-size:0.8rem;color:var(--text2);font-style:italic;line-height:1.7">
                    Unlocks at commander level ${threshold} (Hero Class).<br>
                    At that threshold, you begin operating outside normal military parameters.<br>
                    Hero-Class entities are the only opponents that constitute a real threat.
                </div>
                <div style="margin-top:12px;font-size:0.72rem;color:var(--text2)">
                    Current level: ${GS.commander.level} / ${threshold}
                </div>
                <div style="margin-top:8px;height:6px;background:rgba(0,0,0,0.4);border:1px solid var(--border);overflow:hidden">
                    <div style="height:100%;width:${Math.min(100,(GS.commander.level/threshold)*100)}%;background:var(--gold);transition:width 0.3s"></div>
                </div>
            </div>`);
    }

    _renderBossSelect() {
        const available = DATA.bosses.filter(b =>
            GS.commander.level >= (b.minCommanderLevel ?? 1)
        );
        const defeated = DATA.bosses.filter(b =>
            GS.completedJobs?.[`boss_${b.id}`] > 0
        ).map(b => b.id);

        const heroLvl = GS.commander.heroLevel || 0;
        const heroMitPct = Math.round(Math.min(85, heroLvl * 5));

        this.setHTML(`
            <div style="padding:4px 0 12px">
                <div class="section-label">Hero Status</div>
                <div style="background:rgba(200,140,30,0.08);border:1px solid rgba(200,140,30,0.3);padding:12px;margin-bottom:14px">
                    <div style="font-family:var(--font-ui);font-size:0.72rem;color:var(--gold);letter-spacing:2px;margin-bottom:6px">HERO CLASS · LEVEL ${heroLvl}</div>
                    <div style="font-size:0.78rem;color:var(--text2);line-height:1.7">
                        Effective stat multiplier: <span style="color:var(--gold)">${Math.round((1 + heroLvl * 0.15) * 100)}%</span><br>
                        Incoming damage mitigation: <span style="color:var(--green2)">${heroMitPct}%</span><br>
                        Strategic Output: <span style="color:${GS.commander.level >= 15 ? '#a060d0' : 'var(--text2)'}">${GS.commander.level >= 15 ? 'Available' : 'Locked'}</span>
                    </div>
                </div>

                <div class="section-label">Available Engagements</div>
                ${available.length === 0 ? '<div class="notice">No engagements available at your current level.</div>' : ''}
                ${available.map(b => {
                    const done = defeated.includes(b.id);
                    const tierLabel = ['', '◆ Tier I', '◆◆ Tier II', '◆◆◆ Tier III'][b.tier] || '';
                    return `
                    <div class="job-card${done ? '' : ''}" style="margin-bottom:10px;border-left-color:${b.tier >= 3 ? '#a060d0' : b.tier >= 2 ? '#c04030' : 'var(--border2)'}">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                            <div style="flex:1">
                                <div class="job-name">${b.name}
                                    ${done ? '<span class="badge green">Defeated</span>' : ''}
                                </div>
                                <div style="font-size:0.68rem;color:var(--text2);margin-bottom:4px">${tierLabel} · Min Level ${b.minCommanderLevel}</div>
                                <div class="job-desc">${b.desc}</div>
                                <div class="job-flavour">"${b.flavour}"</div>
                                <div style="font-size:0.72rem;color:var(--text2);margin-top:4px">
                                    HP: ${b.maxHp.toLocaleString()} ·
                                    Reward: ⟁ ${formatMoney(b.rewards.bronze)} · ✦ ${b.rewards.xp} XP
                                </div>
                            </div>
                        </div>
                        <button onclick="startBossFight('${b.id}')"
                                style="margin-top:8px;padding:5px 16px;font-family:var(--font-ui);
                                       font-size:0.7rem;letter-spacing:1px;cursor:pointer;
                                       background:rgba(${b.tier >= 2 ? '120,20,20' : '90,60,10'},0.3);
                                       border:1px solid ${b.tier >= 2 ? '#6a2020' : 'var(--border2)'};
                                       color:${b.tier >= 2 ? '#e06040' : 'var(--gold2)'}"
                        >⚔ Initiate Engagement</button>
                    </div>`;
                }).join('')}

                ${GS.commander.weapon ? `
                <div class="section-label" style="margin-top:16px">Equipped Weapon</div>
                ${this._renderWeaponSlot()}` : ''}

                <div class="section-label" style="margin-top:16px">Weapon Loadout</div>
                ${this._renderWeaponShop()}
            </div>`);
    }

    _renderWeaponSlot() {
        const wep = DATA.weapons.find(w => w.id === GS.commander.weapon);
        if (!wep) return '<div class="notice">No weapon equipped.</div>';
        return `
            <div class="job-card" style="border-left-color:var(--gold)">
                <div class="job-name">🔫 ${wep.name} <span class="badge" style="color:var(--gold);border-color:var(--border2)">${wep.category}</span></div>
                <div class="job-desc">${wep.desc}</div>
                <div style="font-size:0.72rem;color:var(--text2);margin-top:4px">
                    Base damage: ${wep.combatDamage.base} · Scaling: ${wep.combatDamage.scaling?.toUpperCase()}
                    ${wep.magicBonus > 0 ? ` · +${wep.magicBonus} MAG` : ''}
                </div>
                <button onclick="GS.commander.weapon=null;renderAll()"
                        style="margin-top:6px;padding:3px 10px;font-size:0.68rem;cursor:pointer;
                               background:rgba(0,0,0,0.2);border:1px solid var(--border);color:var(--text2)">
                    Unequip
                </button>
            </div>`;
    }

    _renderWeaponShop() {
        const heroLevel = DATA.config?.heroClassLevel ?? 15;
        const available = DATA.weapons.filter(w => {
            if (w.minHeroLevel && GS.commander.level < w.minHeroLevel) return false;
            return true;
        });

        if (!available.length) return '<div class="notice">No weapons available.</div>';

        return available.map(w => {
            const equipped = GS.commander.weapon === w.id;
            const canAffordIt = canAfford(w.cost);
            const rarityColor = { common: 'var(--text2)', uncommon: 'var(--gold)', rare: '#a060d0' }[w.rarity] || 'var(--text2)';
            return `
            <div class="job-card${equipped ? ' in-progress' : (!canAffordIt ? ' disabled' : '')}"
                 style="margin-bottom:8px;border-left-color:${rarityColor}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="flex:1">
                        <div class="job-name">🔫 ${w.name}
                            ${equipped ? '<span class="badge green">Equipped</span>' : ''}
                            <span class="badge" style="color:${rarityColor};border-color:${rarityColor}">${w.rarity}</span>
                        </div>
                        <div class="job-desc">${w.desc}</div>
                        <div style="font-size:0.7rem;color:var(--text2);margin-top:4px">
                            DMG: ${w.combatDamage.base}+${w.combatDamage.scaling}
                            ${w.magicBonus > 0 ? ` · +${w.magicBonus} MAG` : ''}
                            ${w.statBonus ? ` · ${Object.entries(w.statBonus).filter(([,v])=>v>0).map(([k,v])=>'+'+v+' '+k.toUpperCase()).join(' ')}` : ''}
                        </div>
                    </div>
                    <div style="text-align:right;flex-shrink:0;font-family:var(--font-ui);color:var(--gold)">
                        ${equipped ? '—' : formatMoney(w.cost)}
                    </div>
                </div>
                ${!equipped ? `<button onclick="equipWeapon('${w.id}')"
                    style="margin-top:6px;padding:4px 14px;font-size:0.7rem;cursor:pointer;
                           background:rgba(90,60,10,0.2);border:1px solid var(--border2);
                           color:var(--gold2);font-family:var(--font-ui)">
                    ${canAffordIt ? '⚙ Equip' : '✗ Cannot afford'}
                </button>` : ''}
            </div>`;
        }).join('');
    }

    _renderActiveCombat() {
        const cb   = GS.combat;
        const boss = DATA.bosses.find(b => b.id === cb.bossId);
        if (!boss) return;

        const bossHpPct   = Math.max(0, (cb.bossHp / cb.bossMaxHp) * 100);
        const playerHpPct = Math.max(0, (GS.commander.hp / GS.commander.maxHp) * 100);
        const isPlayerTurn = cb.phase === 'player';
        const isOver       = cb.phase === 'victory' || cb.phase === 'defeat';

        const effectSummary = (effects) => effects.length
            ? effects.map(e => `<span style="font-size:0.65rem;background:rgba(0,0,0,0.3);padding:1px 5px;border:1px solid var(--border)">${e.type.replace(/_/g,' ')} (${e.turnsLeft}t)</span>`).join(' ')
            : '';

        this.setHTML(`
            <div style="display:flex;flex-direction:column;gap:12px;padding:4px 0">

                <!-- BOSS -->
                <div style="background:rgba(120,20,20,0.1);border:1px solid rgba(160,40,30,0.4);padding:12px">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
                        <div>
                            <div style="font-family:var(--font-ui);color:#e06040;font-size:0.88rem">${boss.name}</div>
                            <div style="font-size:0.68rem;color:var(--text2)">Turn ${cb.turn}</div>
                        </div>
                        <div style="text-align:right;font-family:var(--font-ui);font-size:0.8rem;color:#e06040">
                            ${cb.bossHp.toLocaleString()} / ${cb.bossMaxHp.toLocaleString()}
                        </div>
                    </div>
                    <div style="height:8px;background:rgba(0,0,0,0.5);border:1px solid rgba(160,40,30,0.3);overflow:hidden">
                        <div style="height:100%;width:${bossHpPct}%;background:linear-gradient(90deg,#6a1810,#c03020);transition:width 0.3s"></div>
                    </div>
                    ${effectSummary(cb.bossEffects) ? `<div style="margin-top:5px">${effectSummary(cb.bossEffects)}</div>` : ''}
                    ${cb.lastBossAction ? `<div style="font-size:0.68rem;color:var(--text2);margin-top:4px;font-style:italic">Last action: ${boss.actions.find(a=>a.id===cb.lastBossAction)?.name ?? cb.lastBossAction}</div>` : ''}
                </div>

                <!-- PLAYER -->
                <div style="background:rgba(90,60,10,0.08);border:1px solid rgba(90,60,10,0.3);padding:12px">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px">
                        <div style="font-family:var(--font-ui);color:var(--gold2)">${GS.commander.name} · Hero Lv.${cb && GS.commander.heroLevel}</div>
                        <div style="font-family:var(--font-ui);font-size:0.8rem;color:var(--text)">${GS.commander.hp} / ${GS.commander.maxHp}</div>
                    </div>
                    <div style="height:8px;background:rgba(0,0,0,0.5);border:1px solid var(--border);overflow:hidden">
                        <div style="height:100%;width:${playerHpPct}%;background:linear-gradient(90deg,#3a7820,#6aaa40);transition:width 0.3s"></div>
                    </div>
                    ${effectSummary(cb.playerEffects) ? `<div style="margin-top:5px">${effectSummary(cb.playerEffects)}</div>` : ''}
                </div>

                <!-- ACTIONS -->
                ${!isOver ? `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    ${this._actionBtn('strike',          '⚔ Strike',           isPlayerTurn, '#c8922a')}
                    ${this._actionBtn('mana_blast',      '✦ Mana Blast',       isPlayerTurn, '#a060d0')}
                    ${this._actionBtn('defend',          '🛡 Defend',          isPlayerTurn, '#5878c8')}
                    ${this._actionBtn('strategic_output','🌟 Strategic Output',isPlayerTurn && GS.commander.heroClass, '#e8b84b')}
                </div>` : ''}

                ${cb.phase === 'victory' ? `
                <div style="text-align:center;padding:12px;border:1px solid var(--green2);background:rgba(40,100,20,0.1)">
                    <div style="color:var(--green2);font-family:var(--font-ui);font-size:0.88rem;margin-bottom:8px">✅ ENGAGEMENT COMPLETE</div>
                    <button onclick="endCombat()" style="padding:6px 20px;font-family:var(--font-ui);font-size:0.72rem;
                        letter-spacing:2px;cursor:pointer;background:rgba(40,100,20,0.3);border:1px solid var(--green2);color:var(--green2)">
                        Return to Operations
                    </button>
                </div>` : ''}

                ${cb.phase === 'defeat' ? `
                <div style="text-align:center;padding:12px;border:1px solid #c04030;background:rgba(120,20,10,0.1)">
                    <div style="color:#e06040;font-family:var(--font-ui);font-size:0.88rem">💀 OPERATIONAL FAILURE</div>
                </div>` : ''}

                <!-- COMBAT LOG -->
                <div style="border:1px solid var(--border);background:rgba(0,0,0,0.2);max-height:200px;overflow-y:auto;padding:8px 10px">
                    <div style="font-family:var(--font-ui);font-size:0.62rem;letter-spacing:2px;color:var(--text2);margin-bottom:5px">COMBAT LOG</div>
                    ${[...cb.log].reverse().map(entry =>
                        `<div style="font-size:0.75rem;color:var(--text);padding:2px 0;border-bottom:1px solid rgba(74,56,16,0.15)">${entry}</div>`
                    ).join('')}
                </div>
            </div>`);
    }

    _actionBtn(action, label, enabled, color = 'var(--gold2)') {
        const disStyle = enabled ? '' : 'opacity:0.4;cursor:not-allowed;';
        return `<button onclick="${enabled ? `combatPlayerAction('${action}')` : ''}"
                        style="padding:8px;font-family:var(--font-ui);font-size:0.72rem;letter-spacing:1px;
                               cursor:${enabled ? 'pointer' : 'not-allowed'};${disStyle}
                               background:rgba(0,0,0,0.25);border:1px solid ${enabled ? color : 'var(--border)'};
                               color:${enabled ? color : 'var(--text2)'}">
                    ${label}
                </button>`;
    }
}

WidgetRegistry.register('CombatWidget', CombatWidget);

// ─── Weapon equip action (called from inline onclick) ─────────────────
function equipWeapon(weaponId) {
    const w = DATA.weapons.find(x => x.id === weaponId);
    if (!w) return;
    if (!canAfford(w.cost) && GS.commander.weapon !== weaponId) {
        showToast('Not enough mana-credit.');
        return;
    }
    if (GS.commander.weapon !== weaponId) {
        setMoney(GS.bronze - w.cost);
        log(`🔫 Equipped: <em>${w.name}</em> — ${formatMoney(w.cost)}.`, 'good');
    }
    GS.commander.weapon = weaponId;
    renderAll();
}
