// ===================== RENDER: ROSTER =====================
function rarityColor(rarity) {
    return { common:'var(--text2)', uncommon:'var(--gold)', rare:'#a060d0' }[rarity] || 'var(--text2)';
}

function magicStars(mag) {
    if (!mag || mag === 0) return '';
    const filled = Math.min(5, Math.ceil(mag / 2));
    return `<span title="Magic ${mag}" style="color:#a060d0;font-size:0.68rem;letter-spacing:1px">${'✦'.repeat(filled)}</span>`;
}

function renderRoster() {
    const el = document.getElementById('roster-list');
    if (!el) return;
    if (GS.roster.length === 0) {
        el.innerHTML = '<div class="notice">No souls under your banner. You walk alone into the dark.</div>';
        return;
    }
    el.innerHTML = GS.roster.map(r => `
        <div class="recruit-card" style="border-left:3px solid ${rarityColor(r.rarity)}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <div class="recruit-name">${r.name}</div>
                    <div class="recruit-class" style="color:${rarityColor(r.rarity)}">${r.cls} ${magicStars(r.magic)}</div>
                </div>
                ${r.magic > 0 ? `<div style="font-size:0.7rem;color:#a060d0;text-align:right">MAG ${r.magic}</div>` : ''}
            </div>
            <div style="font-size:0.72rem;color:var(--text2);font-style:italic;margin:2px 0 4px">${r.desc}</div>
            ${r.lore ? `<div style="font-size:0.68rem;color:var(--text2);opacity:0.55;font-style:italic;margin-bottom:4px;border-left:2px solid var(--border);padding-left:6px">${r.lore}</div>` : ''}
            ${r.specialDesc ? `<div style="font-size:0.7rem;color:var(--green2);font-style:italic;margin-bottom:5px">✦ ${r.specialDesc}</div>` : ''}
            <div class="recruit-stats">
                <div class="recruit-stat"><span>STR </span><span>${r.str}</span></div>
                <div class="recruit-stat"><span>END </span><span>${r.end}</span></div>
                <div class="recruit-stat"><span>LEAD </span><span>${r.lead}</span></div>
                <div class="recruit-stat"><span>CUN </span><span>${r.cun}</span></div>
                ${r.magic > 0 ? `<div class="recruit-stat"><span style="color:#a060d0">MAG </span><span style="color:#a060d0">${r.magic}</span></div>` : ''}
            </div>
        </div>
    `).join('');
}
