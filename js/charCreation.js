// ===================== CHARACTER CREATION =====================
let CC = {
    selectedOriginId: null,
};

function openCharCreation() {
    const overlay = document.getElementById('char-creation-overlay');
    if (overlay) overlay.style.display = 'flex';
    CC.selectedOriginId = null;
    renderOriginCards();
    if (DATA.origins.length > 0) selectOrigin(DATA.origins[0].id);
}

function closeCharCreation() {
    const overlay = document.getElementById('char-creation-overlay');
    if (overlay) overlay.style.display = 'none';
}

function renderOriginCards() {
    const el = document.getElementById('origin-list');
    if (!el) return;
    el.innerHTML = DATA.origins.map(o => `
        <div class="origin-card${CC.selectedOriginId === o.id ? ' selected' : ''}"
             id="origin_card_${o.id}"
             onclick="selectOrigin('${o.id}')">
            <div class="origin-symbol">${o.portraitSymbol}</div>
            <div class="origin-name">${o.name}</div>
            <div class="origin-desc">${o.desc}</div>
            <div class="origin-flavour">${o.flavour}</div>
            <div class="origin-bonuses">
                ${Object.entries(o.statBonus).filter(([,v])=>v>0).map(([k,v])=>
                    `<span class="origin-bonus">+${v} ${k.toUpperCase()}</span>`
                ).join('')}
                ${(o.magicBonus||0) > 0
                    ? `<span class="origin-bonus" style="border-color:#6a3090;color:#b070e0">+${o.magicBonus} MAG</span>`
                    : ''}
                <span class="origin-bonus gold-bonus">+${formatMoney(o.startingBronze)}</span>
            </div>
            <div class="origin-item">✦ Starts with: ${o.startingItem}</div>
            ${(o.magicBonus||0) > 0
                ? `<div style="font-size:0.68rem;color:#a060d0;margin-top:4px;font-style:italic">✦ Arcane lineage — this origin carries innate magic</div>`
                : ''}
        </div>
    `).join('');
}

function selectOrigin(id) {
    CC.selectedOriginId = id;
    document.querySelectorAll('.origin-card').forEach(c => c.classList.remove('selected'));
    const card = document.getElementById(`origin_card_${id}`);
    if (card) card.classList.add('selected');
    renderStatPreview();
}

function renderStatPreview() {
    const origin  = DATA.origins.find(o => o.id === CC.selectedOriginId);
    if (!origin) return;
    const preview = document.getElementById('stat-preview');
    if (!preview) return;

    const base = DATA.config?.startingStats ?? { str:10, end:10, lead:4, cun:4 };
    const stats = [
        { key: 'str',  label: 'STR'  },
        { key: 'end',  label: 'END'  },
        { key: 'lead', label: 'LEAD' },
        { key: 'cun',  label: 'CUN'  },
    ];

    preview.innerHTML = stats.map(s => {
        const bonus = origin.statBonus[s.key] || 0;
        const total = base[s.key] + bonus;
        return `<div class="preview-stat">
            <span class="preview-stat-label">${s.label}</span>
            <span class="preview-stat-val">${total}${bonus > 0
                ? ` <span style="color:var(--green2);font-size:0.7rem">(+${bonus})</span>` : ''}</span>
        </div>`;
    }).join('') + `
        <div class="preview-stat">
            <span class="preview-stat-label">COIN</span>
            <span class="preview-stat-val">${formatMoney(origin.startingBronze)}</span>
        </div>
        ${(origin.magicBonus||0) > 0 ? `
        <div class="preview-stat">
            <span class="preview-stat-label" style="color:#a060d0">MAG</span>
            <span class="preview-stat-val" style="color:#a060d0">+${origin.magicBonus}</span>
        </div>` : ''}
    `;
}

function confirmCharCreation() {
    const nameInput = document.getElementById('char-name-input');
    const name      = (nameInput?.value || '').trim();
    if (!name)          { shakeElement('char-name-input'); showToast('Your commander needs a name.'); return; }
    if (name.length > 36) { showToast('Name is too long — even legend has its limits.'); return; }
    if (!CC.selectedOriginId) { showToast('Choose an origin before beginning.'); return; }

    const origin = DATA.origins.find(o => o.id === CC.selectedOriginId);
    if (!origin) return;

    // Apply to GS
    GS.commander.name          = name;
    GS.commander.origin        = origin.name;
    GS.commander.portraitSymbol = origin.portraitSymbol;
    GS.commander.startingItem  = origin.startingItem;
    const ss = DATA.config?.startingStats ?? {str:10,end:10,lead:4,cun:4};
    GS.commander.str           = (ss.str  ?? 10) + (origin.statBonus.str  || 0);
    GS.commander.end           = (ss.end  ?? 10) + (origin.statBonus.end  || 0);
    GS.commander.lead          = (ss.lead ??  4) + (origin.statBonus.lead || 0);
    GS.commander.cun           = (ss.cun  ??  4) + (origin.statBonus.cun  || 0);
    GS.commander.level         = 1;
    GS.commander.xp            = 0;
    GS.commander.xpNext        = 100;
    GS.commander.hp            = ss.hp ?? 100;
    GS.commander.maxHp         = ss.hp ?? 100;
    GS.bronze                  = origin.startingBronze;
    GS.day                     = 1;
    GS.roster                  = [];
    GS.activeJobs              = [];
    GS.fame                    = 0;
    GS.fameRank                = 0;
    GS.upgrades                = {};
    GS.milestones              = {};
    GS.totalJobsDone           = 0;
    GS.completedJobs           = {};
    GS.completedCategories     = {};

    refreshRecruits();
    closeCharCreation();
    renderAll();

    const magLine = (origin.magicBonus||0) > 0
        ? ` The air around you hums with an old familiar weight. Magic remembers its own.`
        : '';
    log(`The gate of the abandoned fort groans open. <strong>${name}</strong> steps inside — ${origin.name.toLowerCase()}, alone, and already planning.${magLine}`, 'gold');
    log(`You carry: ${origin.startingItem}. That, and the will to make this ruin mean something.`, 'info');
    log(`Take a contract from the <em>Contracts</em> tab to draw first blood.`, 'info');
}

function shakeElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
}
