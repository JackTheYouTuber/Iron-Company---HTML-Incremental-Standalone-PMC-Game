// ===================== RENDER: HIRE TAB =====================
function renderHire() {
    document.getElementById('max-roster-disp').textContent = maxRoster();
    document.getElementById('cur-roster-disp').textContent = GS.roster.length;
    const el = document.getElementById('hire-list');
    if (!el) return;
    if (GS.recruitPool.length === 0) refreshRecruits();
    const showLore = typeof SETTINGS !== 'undefined' ? !!SETTINGS.showLoreText : false;

    el.innerHTML = GS.recruitPool.map(r => {
        const full   = GS.roster.length >= maxRoster();
        const canBuy = canAfford(r.cost) && !full;
        const rc     = rarityColor(r.rarity);
        let reason   = '';
        if (full)               reason = 'Company at full strength';
        else if (!canAfford(r.cost)) reason = 'Insufficient coin';

        return `
            <div class="hire-card${canBuy ? '' : ' disabled'}" onclick="hireRecruit('${r.id}')"
                 style="border-left:3px solid ${rc}">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div style="flex:1">
                        <div class="hire-name">${r.name}</div>
                        <div class="hire-class" style="color:${rc}">${r.cls}
                            ${r.rarity !== 'common' ? `<span class="badge" style="border-color:${rc};color:${rc}">${r.rarity}</span>` : ''}
                            ${r.magic > 0 ? `<span class="badge" style="border-color:#a060d0;color:#a060d0">MAG ${r.magic}</span>` : ''}
                        </div>
                    </div>
                    <span class="hire-cost">${formatMoney(r.cost)}</span>
                </div>
                <div style="font-style:italic;font-size:0.73rem;color:var(--text2);margin:2px 0 3px">${r.desc}</div>
                ${showLore && r.lore ? `<div style="font-size:0.68rem;color:var(--text2);opacity:0.5;font-style:italic;margin-bottom:4px;border-left:2px solid var(--border);padding-left:6px">${r.lore}</div>` : ''}
                ${r.specialDesc ? `<div style="font-size:0.7rem;color:var(--green2);font-style:italic;margin-bottom:5px">✦ ${r.specialDesc}</div>` : ''}
                <div class="hire-stat-row">
                    <span>STR </span><span>${r.str}</span>
                    <span style="margin-left:8px">END </span><span>${r.end}</span>
                    <span style="margin-left:8px">LEAD </span><span>${r.lead}</span>
                    <span style="margin-left:8px">CUN </span><span>${r.cun}</span>
                    ${r.magic > 0 ? `<span style="margin-left:8px;color:#a060d0">MAG </span><span style="color:#a060d0">${r.magic}</span>` : ''}
                </div>
                ${reason ? `<div style="color:var(--red);font-size:0.72rem;margin-top:4px;font-style:italic">${reason}</div>` : ''}
            </div>
        `;
    }).join('') || '<div class="notice">No wanderers seeking work at present.</div>';
}
