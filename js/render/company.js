// ===================== RENDER: COMPANY TAB =====================
function renderCompany() {
    const el = document.getElementById('company-stats');
    if (!el) return;
    const totalStr = companyTotalStr();
    const totalCun = companyTotalCun();
    const totalEnd = companyTotalEnd();
    const totalMag = companyTotalMagic();
    const fRank    = getCurrentFameRank();

    el.innerHTML = `
        <div class="cstat"><div class="cstat-label">Company Size</div>    <div class="cstat-val">${1 + GS.roster.length} swords</div></div>
        <div class="cstat"><div class="cstat-label">Contracts Done</div>  <div class="cstat-val">${GS.totalJobsDone}</div></div>
        <div class="cstat"><div class="cstat-label">Combined STR</div>    <div class="cstat-val">${totalStr}</div></div>
        <div class="cstat"><div class="cstat-label">Combined END</div>    <div class="cstat-val">${totalEnd}</div></div>
        <div class="cstat"><div class="cstat-label">Combined CUN</div>    <div class="cstat-val">${totalCun}</div></div>
        <div class="cstat"><div class="cstat-label">Treasury</div>        <div class="cstat-val">${formatMoney(GS.bronze)}</div></div>
        <div class="cstat"><div class="cstat-label">Fort Works</div>      <div class="cstat-val">${Object.keys(GS.upgrades).length} / ${DATA.fortUpgrades.length}</div></div>
        <div class="cstat"><div class="cstat-label">Standing</div>        <div class="cstat-val">${fRank.label}</div></div>
        <div class="cstat"><div class="cstat-label">Arcane Power</div>    <div class="cstat-val stat-magic">${totalMag > 0 ? totalMag + ' MAG' : '—'}</div></div>
        <div class="cstat"><div class="cstat-label">Day</div>             <div class="cstat-val">${GS.day}</div></div>
    `;

    // Arcane power bar
    const maxMag = DATA.config?.magicBarMax ?? 30;
    const magSection = document.getElementById('magic-bar-section');
    if (magSection) {
        if (totalMag > 0) {
            magSection.style.display = '';
            const magPct = Math.min(100, (totalMag / maxMag) * 100);
            const mf = document.getElementById('magic-bar-fill');
            const ml = document.getElementById('magic-bar-label-left');
            const mr = document.getElementById('magic-bar-label-right');
            if (mf) mf.style.width = `${magPct}%`;
            if (ml) ml.textContent = 'Arcane Strength';
            if (mr) mr.textContent = `${totalMag} / ${maxMag}`;
        } else {
            magSection.style.display = 'none';
        }
    }

    // Fame bar
    const nextRank = getNextFameRank();
    const pct = !nextRank ? 100
        : ((GS.fame - fRank.threshold) / (nextRank.threshold - fRank.threshold)) * 100;
    const ff  = document.getElementById('fame-fill');
    const frl = document.getElementById('fame-rank-label');
    const fv  = document.getElementById('fame-val');
    if (ff)  ff.style.width      = `${Math.min(100, Math.max(0, pct))}%`;
    if (frl) frl.textContent     = fRank.label;
    if (fv)  fv.textContent      = nextRank ? `${GS.fame} / ${nextRank.threshold}` : `${GS.fame} — Pinnacle`;

    // Milestones now live in their own sub-tab — render if that sub-tab is visible
    renderMilestonesPanel();
}
