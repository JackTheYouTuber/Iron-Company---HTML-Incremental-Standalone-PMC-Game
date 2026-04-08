// ===================== CHAR CREATION: RENDER =====================
// Renders origin cards, stat preview, and comparison bars.
// Reads from CC state; never writes to GS.

// ── Stat bar width helper ─────────────────────────────────────
// Returns a percentage for a stat bar fill given a value and a ceiling.
function ccStatBarPct(val, max) {
    return Math.min(100, Math.round((val / max) * 100));
}

// Max plausible starting stat values (base + highest possible bonus)
const CC_STAT_MAX = { str: 16, end: 16, lead: 10, cun: 10, hp: 120 };

// ── Origin cards ─────────────────────────────────────────────
function renderOriginCards() {
    const el = document.getElementById('origin-list');
    if (!el) return;
    const base = DATA.config?.startingStats ?? { str: 10, end: 10, lead: 4, cun: 4, hp: 100 };

    el.innerHTML = DATA.origins.map(o => {
        const isSelected = CC.selectedOriginId === o.id;
        const showLore   = !!CC.showLore[o.id];
        const hasMagic   = (o.magicBonus || 0) > 0;

        // Stat bonus summary for the card
        const bonusTags = Object.entries(o.statBonus)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => `<span class="origin-bonus">+${v} ${k.toUpperCase()}</span>`)
            .join('');
        const magTag = hasMagic
            ? `<span class="origin-bonus origin-bonus--magic">+${o.magicBonus} MAG</span>` : '';
        const coinTag = `<span class="origin-bonus origin-bonus--coin">+${formatMoney(o.startingBronze)}</span>`;

        // Stat bars (only shown when card is selected)
        const statBars = isSelected ? `
            <div class="origin-stat-bars">
                ${['str','end','lead','cun'].map(k => {
                    const bonus = o.statBonus[k] || 0;
                    const total = base[k] + bonus;
                    const basePct  = ccStatBarPct(base[k], CC_STAT_MAX[k]);
                    const bonusPct = ccStatBarPct(total,   CC_STAT_MAX[k]);
                    return `<div class="origin-bar-row">
                        <span class="origin-bar-label">${k.toUpperCase()}</span>
                        <div class="origin-bar-track">
                            <div class="origin-bar-base"  style="width:${basePct}%"></div>
                            ${bonus > 0 ? `<div class="origin-bar-bonus" style="width:${bonusPct}%;"></div>` : ''}
                        </div>
                        <span class="origin-bar-val">${total}${bonus > 0 ? `<em class="origin-bar-gain"> +${bonus}</em>` : ''}</span>
                    </div>`;
                }).join('')}
                ${hasMagic ? `<div class="origin-bar-row origin-bar-row--magic">
                    <span class="origin-bar-label" style="color:#a060d0">MAG</span>
                    <div class="origin-bar-track">
                        <div class="origin-bar-bonus" style="width:${ccStatBarPct(o.magicBonus, 6)}%;background:#7030b0"></div>
                    </div>
                    <span class="origin-bar-val" style="color:#a060d0">+${o.magicBonus}</span>
                </div>` : ''}
            </div>` : '';

        // Lore panel
        const lorePanel = o.lore ? `
            <div class="origin-lore-toggle" onclick="ccToggleLoreAndRender('${o.id}')">
                ${showLore ? '▲ Hide lore' : '▼ More lore'}
            </div>
            ${showLore ? `<div class="origin-lore">${o.lore}</div>` : ''}` : '';

        return `<div class="origin-card${isSelected ? ' selected' : ''}"
                      id="origin_card_${o.id}"
                      onclick="selectOrigin('${o.id}')">
            <div class="origin-card-top">
                <div class="origin-symbol">${o.portraitSymbol}</div>
                <div class="origin-card-heading">
                    <div class="origin-name">${o.name}</div>
                    ${hasMagic ? '<div class="origin-magic-badge">✦ Arcane</div>' : ''}
                </div>
            </div>
            <div class="origin-desc">${o.desc}</div>
            <div class="origin-flavour">${o.flavour}</div>
            <div class="origin-bonuses">${bonusTags}${magTag}${coinTag}</div>
            <div class="origin-item">✦ Starts with: ${o.startingItem}</div>
            ${statBars}
            ${lorePanel}
        </div>`;
    }).join('');
}

function ccToggleLoreAndRender(id) {
    // Stop the click from also triggering selectOrigin
    event.stopPropagation();
    ccToggleLore(id);
    renderOriginCards();
}

// ── Stat preview panel ───────────────────────────────────────
function renderStatPreview() {
    const origin  = DATA.origins.find(o => o.id === CC.selectedOriginId);
    const preview = document.getElementById('stat-preview');
    if (!preview) return;
    if (!origin) { preview.innerHTML = '<span style="color:var(--text2);font-style:italic">Select an origin to see your starting statistics.</span>'; return; }

    const base = DATA.config?.startingStats ?? { str: 10, end: 10, lead: 4, cun: 4, hp: 100 };
    const hasMagic = (origin.magicBonus || 0) > 0;

    const rows = ['str','end','lead','cun'].map(k => {
        const bonus = origin.statBonus[k] || 0;
        const total = base[k] + bonus;
        return `<div class="preview-stat">
            <span class="preview-stat-label">${k.toUpperCase()}</span>
            <span class="preview-stat-val">${total}${bonus > 0
                ? ` <span class="preview-bonus">(+${bonus})</span>` : ''}</span>
        </div>`;
    }).join('');

    preview.innerHTML = rows + `
        <div class="preview-stat">
            <span class="preview-stat-label">HP</span>
            <span class="preview-stat-val">${base.hp ?? 100}</span>
        </div>
        <div class="preview-stat">
            <span class="preview-stat-label">COIN</span>
            <span class="preview-stat-val">${formatMoney(origin.startingBronze)}</span>
        </div>
        ${hasMagic ? `<div class="preview-stat">
            <span class="preview-stat-label" style="color:#a060d0">MAG</span>
            <span class="preview-stat-val" style="color:#a060d0">+${origin.magicBonus}</span>
        </div>` : ''}
    `;
}
