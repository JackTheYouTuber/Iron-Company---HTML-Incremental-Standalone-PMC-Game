// ===================== CURRENCY =====================
function setMoney(b)   { GS.bronze = Math.max(0, Math.floor(b)); }
function addMoney(b)   { GS.bronze += Math.floor(b); }
function canAfford(b)  { return GS.bronze >= b; }

function formatMoney(b) {
    b = Math.floor(b);
    const g  = Math.floor(b / 10000);
    const s  = Math.floor((b % 10000) / 100);
    const br = b % 100;
    const parts = [];
    if (g)  parts.push(`${g}g`);
    if (s)  parts.push(`${s}s`);
    if (br || parts.length === 0) parts.push(`${br}b`);
    return parts.join(' ');
}

function moneyToCoins(b) {
    b = Math.floor(b);
    return {
        g: Math.floor(b / 10000),
        s: Math.floor((b % 10000) / 100),
        b: b % 100,
    };
}

// ===================== ORIGIN MAGIC =====================
function getOriginMagicBonus() {
    if (!GS.commander.origin) return 0;
    const origin = DATA.origins.find(o => o.name === GS.commander.origin);
    return origin?.magicBonus || 0;
}

// ===================== DATA LOOKUPS =====================
function getCommanderTitle() {
    const ranks = [...DATA.commanderRanks].sort((a, b) => b.minLevel - a.minLevel);
    for (const r of ranks) {
        if (GS.commander.level >= r.minLevel) return r.title;
    }
    return DATA.commanderRanks[0]?.title || 'Wandering Blade';
}

function getCurrentFameRank() {
    let rank = DATA.fameRanks[0];
    for (const fr of DATA.fameRanks) {
        if (GS.fame >= fr.threshold) rank = fr;
    }
    return rank;
}

function getNextFameRank() {
    const sorted = [...DATA.fameRanks].sort((a, b) => a.threshold - b.threshold);
    for (const fr of sorted) {
        if (GS.fame < fr.threshold) return fr;
    }
    return null;
}

// ===================== LOG =====================
function log(msg, type = 'info') {
    const el = document.createElement('div');
    el.className = `log-entry ${type}`;
    el.innerHTML = `<span class="log-time">Day ${GS.day}</span>${msg}`;
    const inner = document.getElementById('log-inner');
    if (!inner) return;
    inner.prepend(el);
    const maxEntries = (typeof SETTINGS !== 'undefined' && SETTINGS.logMaxEntries) ? SETTINGS.logMaxEntries : 120;
    while (inner.children.length > maxEntries) inner.removeChild(inner.lastChild);
    // Pulse the Log tab button if it's not currently active
    const logTabBtn = document.querySelector('.tab-btn[data-tab="log"]');
    if (logTabBtn && !logTabBtn.classList.contains('active')) {
        logTabBtn.classList.remove('log-tab-pulse');
        void logTabBtn.offsetWidth; // force reflow to restart animation
        logTabBtn.classList.add('log-tab-pulse');
    }
}

// ===================== TOAST =====================
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2600);
}

// ===================== TAB SWITCHER =====================
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === 'tab-' + tab);
    });
    if (tab === 'hire')     renderHire();
    if (tab === 'fort')     renderFort();
    if (tab === 'company')  renderCompany();
    if (tab === 'saves')    renderSavesPanel();
    if (tab === 'settings') renderSettingsPanel();
    if (tab === 'log') {
        // Clear the new-entry pulse and scroll to top (newest)
        const logTabBtn = document.querySelector('.tab-btn[data-tab="log"]');
        if (logTabBtn) logTabBtn.classList.remove('log-tab-pulse');
        const logEl = document.getElementById('log-inner');
        if (logEl) logEl.scrollTop = 0;
    }
}
