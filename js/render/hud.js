// ===================== HUD =====================
function renderCurrency() {
    const c = moneyToCoins(GS.bronze);
    const gd = document.getElementById('gold-disp');
    const sd = document.getElementById('silver-disp');
    const bd = document.getElementById('bronze-disp');
    const dc = document.getElementById('day-counter');
    if (gd) gd.textContent = c.g;
    if (sd) sd.textContent = c.s;
    if (bd) bd.textContent = c.b;
    if (dc) dc.textContent = GS.day;
}

function renderCommander() {
    const C     = GS.commander;
    const title = getCommanderTitle();
    const mag   = companyTotalMagic();

    const nameEl   = document.getElementById('cmd-name');
    const originEl = document.getElementById('cmd-origin');
    const symbolEl = document.getElementById('cmd-symbol');
    if (nameEl)   nameEl.textContent   = C.name || 'Unknown Blade';
    if (originEl) originEl.textContent = C.origin ? `${C.origin}` : '';
    if (symbolEl) symbolEl.textContent = C.portraitSymbol || '⚔';

    const lvl  = document.getElementById('cmd-level');
    const rank = document.getElementById('cmd-rank');
    const sstr = document.getElementById('stat-str');
    const send = document.getElementById('stat-end');
    const slead= document.getElementById('stat-lead');
    const scun = document.getElementById('stat-cun');
    const hptx = document.getElementById('hp-text');
    const hpfl = document.getElementById('hp-fill');
    const xpfl = document.getElementById('xp-fill');
    const xptx = document.getElementById('xp-text');

    if (lvl)   lvl.textContent        = C.level;
    if (rank)  rank.textContent       = title;
    if (sstr)  sstr.textContent       = C.str;
    if (send)  send.textContent       = C.end;
    if (slead) slead.textContent      = C.lead;
    if (scun)  scun.textContent       = C.cun;
    if (hptx)  hptx.textContent       = `${C.hp} / ${C.maxHp}`;
    if (hpfl)  hpfl.style.width       = `${(C.hp / C.maxHp) * 100}%`;
    if (xpfl)  xpfl.style.width       = `${(C.xp / C.xpNext) * 100}%`;
    if (xptx)  xptx.textContent       = `${C.xp} / ${C.xpNext} XP`;

    const itemEl = document.getElementById('cmd-item');
    if (itemEl) itemEl.textContent = C.startingItem ? `✦ ${C.startingItem}` : '';

    const magEl = document.getElementById('company-magic');
    if (magEl) {
        magEl.textContent   = mag > 0 ? `✦ ${mag} arcane` : '';
        magEl.style.display = mag > 0 ? '' : 'none';
    }
}
