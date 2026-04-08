// ===================== PLAYER ACTIONS =====================

function startJob(job) {
    const chk = checkJobRequirements(job);
    if (!chk.ok) { showToast(chk.reasons[0]); return; }
    const dur     = getJobDuration(job);
    GS.activeJobs.push({ jobId: job.id, timeLeft: dur, totalTime: dur });
    const catNote = job.category === 'arcane' ? ' ✦ The unseen stirs.' : '';
    log(`📜 Contract taken: <em>${job.name}</em>. Estimated ${dur}s afield.${catNote}`, 'info');
    renderAll();
}

function hireRecruit(id) {
    const r = GS.recruitPool.find(rc => rc.id === id);
    if (!r) return;
    if (GS.roster.length >= maxRoster()) {
        showToast('Company is at full strength. Expand the Barracks for more room.');
        return;
    }
    if (!canAfford(r.cost)) {
        showToast('Not enough coin in the treasury.');
        return;
    }
    setMoney(GS.bronze - r.cost);
    GS.roster.push({ ...r });
    GS.recruitPool = GS.recruitPool.filter(rc => rc.id !== id);
    const magNote = (r.magic || 0) > 0
        ? ` A faint shimmer settles over the fort. The arcane stirs in recognition.` : '';
    log(`⚔ <strong>${r.name}</strong> (${r.cls}) swears to the Iron Company's banner.${magNote} Cost: ${formatMoney(r.cost)}.`, 'good');
    checkMilestones();
    renderAll();
}

function buyUpgrade(id) {
    if (GS.upgrades[id]) return;
    const u = DATA.fortUpgrades.find(u => u.id === id);
    if (!u) return;
    if (u.requiresUpgrade && !GS.upgrades[u.requiresUpgrade]) {
        const pre = DATA.fortUpgrades.find(x => x.id === u.requiresUpgrade);
        showToast(`Requires "${pre?.name ?? u.requiresUpgrade}" first.`);
        return;
    }
    if (!canAfford(u.cost)) { showToast('Not enough coin in the treasury.'); return; }
    setMoney(GS.bronze - u.cost);
    GS.upgrades[id] = true;
    const arcaneNote = u.category === 'arcane' ? ` The fort's unseen nature deepens.` : '';
    log(`🔨 <em>${u.name}</em> — <span style="color:var(--text2);font-style:italic">"${u.flavour}"</span>${arcaneNote}`, 'good');
    checkMilestones();
    renderAll();
}
