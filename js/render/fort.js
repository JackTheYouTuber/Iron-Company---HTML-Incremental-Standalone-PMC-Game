// ===================== RENDER: FORT TAB =====================
function upgradeCategoryClass(cat) {
    return `upgrade-category-${cat}` || '';
}

function renderFort() {
    const el = document.getElementById('fort-list');
    if (!el) return;

    // isFortWarded() reads from engine — no ID hardcoded here
    const wardedBadge = isFortWarded()
        ? `<div class="fort-warded-badge">✦ Fort Warded — the gate is inscribed</div>`
        : '';

    // Group by category for display
    const categories = ['infrastructure', 'military', 'welfare', 'economy', 'reputation', 'arcane'];
    const catLabels  = {
        infrastructure: 'Infrastructure',
        military:       'Military Works',
        welfare:        'Welfare & Healing',
        economy:        'Economy',
        reputation:     'Reputation & Knowledge',
        arcane:         'Arcane Works',
    };

    let html = wardedBadge;

    categories.forEach(cat => {
        const upgrades = DATA.fortUpgrades.filter(u => u.category === cat);
        if (!upgrades.length) return;

        html += `<div class="section-label" style="${cat==='arcane'?'color:#a060d0':''}">${catLabels[cat]}</div>`;

        html += upgrades.map(u => {
            const bought  = !!GS.upgrades[u.id];
            const preOk   = !u.requiresUpgrade || !!GS.upgrades[u.requiresUpgrade];
            const canBuy  = canAfford(u.cost) && !bought && preOk;
            const preText = u.requiresUpgrade && !preOk
                ? `<div style="font-size:0.7rem;color:var(--red);margin-top:3px;font-style:italic">
                     Requires: ${DATA.fortUpgrades.find(x=>x.id===u.requiresUpgrade)?.name || u.requiresUpgrade}
                   </div>` : '';

            const borderAccent = cat === 'arcane' ? (bought ? '#6a3090' : (canBuy ? '#4a2080' : 'var(--border)')) : '';
            const styleExtra   = borderAccent ? `border-left:3px solid ${borderAccent};` : '';

            return `
                <div class="upgrade-card${bought?' bought':(!canBuy?' disabled':'')}"
                     onclick="buyUpgrade('${u.id}')"
                     style="${styleExtra}">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
                        <div>
                            <div class="upgrade-name">${u.name}
                                ${bought ? '<span class="badge green">Raised</span>' : ''}
                                ${u.requiresUpgrade && !bought ? `<span class="badge" style="font-size:0.6rem">needs prereq</span>` : ''}
                            </div>
                            <div class="upgrade-desc">${u.desc}</div>
                            <div class="lore-text">"${u.flavour}"</div>
                        </div>
                        <div style="text-align:right;flex-shrink:0">
                            <div class="upgrade-effect ${upgradeCategoryClass(cat)}">${u.effect}</div>
                            <div class="upgrade-cost" style="margin-top:4px">${bought ? '—' : formatMoney(u.cost)}</div>
                        </div>
                    </div>
                    ${preText}
                </div>`;
        }).join('');
    });

    el.innerHTML = html;
}

// renderFortStatusPanel() lives in render/nations.js and is called by renderAll().
