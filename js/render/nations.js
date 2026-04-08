// ===================== RENDER: NATION THREAT PANEL =====================

const RELATION_ICONS = {
    indifferent: '◦',
    neutral:     '◦',
    wary:        '◉',
    suspicious:  '◉',
    notice:      '◉',
    concern:     '⚠',
    alarm:       '⚠',
    hostile:     '☠',
    war:         '⚔'
};

const RELATION_COLORS = {
    indifferent: 'var(--text2)',
    neutral:     'var(--text2)',
    wary:        '#8a8040',
    suspicious:  '#9a7030',
    notice:      '#9a7030',
    concern:     '#c08020',
    alarm:       '#c05020',
    hostile:     '#c03020',
    war:         '#e02020'
};

function _buildNationPanelHTML() {
    return DATA.nations.map(nation => {
        const threat  = GS.nationThreat[nation.id] || 0;
        const rel     = getNationRelation(nation.id);
        const relColor = RELATION_COLORS[rel] || 'var(--text2)';
        const icon    = RELATION_ICONS[rel] || '◦';
        const thresholds = nation.toleranceThresholds;
        const maxThreat  = thresholds.war * 1.2;
        const pct        = Math.min(100, (threat / maxThreat) * 100);
        let barColor = '#4a7820';
        if (threat >= thresholds.war)     barColor = '#c02020';
        else if (threat >= thresholds.hostile) barColor = '#c04020';
        else if (threat >= thresholds.alarm)   barColor = '#c07020';
        else if (threat >= thresholds.concern) barColor = '#a08020';
        else if (threat >= thresholds.notice)  barColor = '#608020';
        const activeSuppression = GS.suppressionEvents.filter(se => se.nationId === nation.id);
        return `
        <div class="nation-card" style="border-left:3px solid ${relColor}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <div class="nation-name">${nation.flag} ${nation.name}</div>
                    <div class="nation-type">${nation.type}</div>
                </div>
                <div style="text-align:right">
                    <div style="color:${relColor};font-size:0.8rem;font-family:var(--font-ui,var(--font-ui))">
                        ${icon} ${rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </div>
                    <div style="font-size:0.68rem;color:var(--text2)">${Math.floor(threat)} threat</div>
                </div>
            </div>
            <div class="nation-threat-bar-wrap">
                <div class="nation-threat-bar">
                    <div class="nation-threat-fill" style="width:${pct}%;background:${barColor}"></div>
                    ${buildThresholdMarkers(nation.toleranceThresholds, maxThreat)}
                </div>
            </div>
            ${activeSuppression.length ? `
            <div style="font-size:0.7rem;color:#e06040;margin-top:4px;font-style:italic">
                ⚠ ${activeSuppression.length} suppression operation active
            </div>` : ''}
        </div>`;
    }).join('');
}

function renderNationPanel() {
    const el = document.getElementById('nation-panel');
    if (!el) return;
    const tier = DATA.pmcTiers?.[GS.pmcTier];
    if (!tier || GS.pmcTier < 1) {
        el.innerHTML = '<div class="notice" style="font-size:0.72rem">Rise to Iron Company tier before nations take notice.</div>';
        return;
    }
    el.innerHTML = _buildNationPanelHTML();
}

function buildThresholdMarkers(thresholds, maxThreat) {
    const levels = ['notice','concern','alarm','hostile','war'];
    return levels.map(lvl => {
        const pct = (thresholds[lvl] / maxThreat) * 100;
        if (pct > 95) return '';
        return `<div style="position:absolute;left:${pct}%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.15)"></div>`;
    }).join('');
}

function renderPmcTierDisplay() {
    const el = document.getElementById('pmc-tier-display');
    if (!el) return;
    const tier     = DATA.pmcTiers?.[GS.pmcTier];
    const nextTier = DATA.pmcTiers?.[GS.pmcTier + 1];
    if (!tier) return;

    let progressHtml = '';
    if (nextTier) {
        const checks = [
            { label:'Fame',     cur: GS.fame,           req: nextTier.thresholdFame,     suffix:'' },
            { label:'Treasury', cur: GS.bronze,          req: nextTier.thresholdBronze,   suffix:' b', isMoney:true },
            { label:'Roster',   cur: GS.roster.length,   req: nextTier.thresholdRoster,   suffix:'' },
            { label:'Jobs',     cur: GS.totalJobsDone,   req: nextTier.thresholdJobsDone, suffix:'' },
        ];
        const bars = checks.map(c => {
            const pct = Math.min(100, c.req > 0 ? (c.cur / c.req) * 100 : 100);
            const met = c.cur >= c.req;
            const curDisplay = c.isMoney ? formatMoney(c.cur) : c.cur;
            const reqDisplay = c.isMoney ? formatMoney(c.req) : c.req + c.suffix;
            return `
            <div style="margin-bottom:5px">
                <div style="display:flex;justify-content:space-between;font-size:0.68rem;color:${met?'var(--green2)':'var(--text2)'}">
                    <span>${c.label}</span>
                    <span>${curDisplay} / ${reqDisplay} ${met?'✔':''}</span>
                </div>
                <div style="height:4px;background:rgba(0,0,0,0.4);border:1px solid var(--border);overflow:hidden">
                    <div style="height:100%;width:${pct}%;background:${met?'var(--green2)':'var(--gold)'};transition:width 0.3s"></div>
                </div>
            </div>`;
        }).join('');

        progressHtml = `
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid var(--border)">
            <div style="font-size:0.68rem;color:var(--text2);font-style:italic;margin-bottom:5px">
                Progress to: <strong style="color:var(--gold)">${nextTier.name}</strong>
            </div>
            ${bars}
        </div>`;
    }

    el.innerHTML = `
        <div class="pmc-tier-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <div style="font-family:var(--font-ui);font-size:0.72rem;color:var(--text2);letter-spacing:2px">
                        PMC TIER ${GS.pmcTier}
                    </div>
                    <div style="font-family:var(--font-display);font-size:1.3rem;color:var(--gold2);line-height:1.2">
                        ${tier.name}
                    </div>
                </div>
                <div style="font-size:2rem;opacity:0.5">${GS.pmcTier < 6 ? '⚔' : '👑'}</div>
            </div>
            <div style="font-size:0.73rem;color:var(--text2);font-style:italic;margin-top:4px">${tier.desc}</div>
            ${progressHtml}
        </div>`;
}

function renderFortStatusPanel() {
    const el    = document.getElementById('fort-status-panel');
    if (!el) return;
    const built = DATA.fortUpgrades.filter(u => GS.upgrades[u.id]);
    if (built.length === 0) {
        el.innerHTML = '<div class="notice" style="font-size:0.72rem">No improvements made yet.</div>';
        return;
    }
    const byCategory = {};
    built.forEach(u => {
        if (!byCategory[u.category]) byCategory[u.category] = [];
        byCategory[u.category].push(u);
    });
    el.innerHTML = Object.entries(byCategory).map(([cat, ups]) => `
        <div style="margin-bottom:8px">
            <div style="font-size:0.62rem;color:var(--text2);letter-spacing:2px;text-transform:uppercase;margin-bottom:3px">${cat}</div>
            ${ups.map(u => `
            <div style="font-size:0.73rem;margin-bottom:3px;display:flex;gap:5px;align-items:flex-start">
                <span style="color:${u.category==='arcane'?'#a060d0':'var(--green2)'};margin-top:1px">${u.category==='arcane'?'✦':'✔'}</span>
                <div>
                    <div style="color:var(--text)">${u.name}</div>
                    <div style="color:var(--text2);font-style:italic;font-size:0.66rem">${u.effect}</div>
                </div>
            </div>`).join('')}
        </div>`).join('');
}
