// ===================== RENDER: CONTRACTS TAB =====================

function dangerLabel(d) {
    const labels = ['','◆ Trivial','◆◆ Perilous','◆◆◆ Deadly','◆◆◆◆ Suicidal'];
    const cls    = ['','danger-1', 'danger-2',   'danger-3',  'danger-4'];
    return `<span class="${cls[d]}">${labels[d]}</span>`;
}

function categoryIcon(cat) {
    // Read from config first, fall back to built-ins
    const cfgIcons = DATA.config?.pmcTierCategoryIcons || {};
    const defaults = {
        scouting:'🔍', escort:'🛡', guard:'🗡',
        bounty:'💀',   combat:'⚔', siege:'🏰',
        dungeon:'🕳',  arcane:'✦'
    };
    return cfgIcons[cat] || defaults[cat] || '📜';
}

function categoryLabel(cat) {
    const labels = {
        scouting:'Scouting', escort:'Escort', guard:'Guard',
        bounty:'Bounty', combat:'Combat', siege:'Siege',
        dungeon:'Dungeon', arcane:'Arcane',
        intelligence:'Intelligence', political:'Political',
        territorial:'Territorial', suppression_counter:'Counter-Suppression',
        nation_pressure:'Nation Pressure', proxy_war:'Proxy War',
        nation_war:'Nation War', sovereign_ops:'Sovereign Ops',
        suppression:'Suppression', shadow_government:'Shadow Government',
        counter_intelligence:'Counter-Intelligence', endgame:'Endgame'
    };
    return labels[cat] || cat;
}

function categoryBorderColor(cat) {
    const colors = {
        arcane:'rgba(120,60,180,0.6)',
        intelligence:'rgba(40,100,180,0.6)',
        political:'rgba(180,140,40,0.6)',
        territorial:'rgba(60,140,60,0.6)',
        suppression_counter:'rgba(180,80,40,0.6)',
        nation_pressure:'rgba(200,60,30,0.6)',
        proxy_war:'rgba(140,40,140,0.6)',
        nation_war:'rgba(200,30,30,0.8)',
        sovereign_ops:'rgba(220,180,30,0.8)',
        suppression:'rgba(160,40,40,0.8)',
    };
    return colors[cat] || 'var(--border)';
}

function classifyRequirementReason(reason) {
    if (/magic|MAG|arcane/i.test(reason))          return 'req-magic';
    if (/STR|END|LEAD|CUN/i.test(reason))           return 'req-stat';
    if (/class|companion/i.test(reason))             return 'req-class';
    if (/fort improvement|upgrade/i.test(reason))    return 'req-upgrade';
    if (/renown/i.test(reason))                      return 'req-fame';
    if (/milestone|Tier/i.test(reason))              return 'req-milestone';
    if (/nation|threat/i.test(reason))               return 'req-nation';
    return '';
}

// Group jobs by category for organised display
const JOB_CATEGORY_ORDER = [
    'scouting','escort','guard','bounty','combat','siege','dungeon','arcane',
    'intelligence','political','territorial','suppression_counter',
    'nation_pressure','proxy_war','nation_war','sovereign_ops','shadow_government','endgame'
];

function renderJobs() {
    const el = document.getElementById('jobs-list');
    if (!el) return;
    el.innerHTML = '';

    // Check if PMC-tier categories should even be shown
    const currentTier = GS.pmcTier;

    // Group by category
    const grouped = {};
    DATA.jobs.forEach(job => {
        if (!grouped[job.category]) grouped[job.category] = [];
        grouped[job.category].push(job);
    });

    const orderedCats = JOB_CATEGORY_ORDER.filter(c => grouped[c]);
    // Add any category not in the order list
    Object.keys(grouped).forEach(c => { if (!orderedCats.includes(c)) orderedCats.push(c); });

    orderedCats.forEach(cat => {
        const jobs = grouped[cat];
        const isPmcCat = ['intelligence','political','territorial','suppression_counter',
                          'nation_pressure','proxy_war','nation_war','sovereign_ops',
                          'shadow_government','endgame'].includes(cat);

        // PMC categories hidden until tier 1
        if (isPmcCat && currentTier < 1) return;

        const tierData = DATA.pmcTiers[currentTier];
        if (isPmcCat && tierData && !tierData.unlocks?.includes(cat)) {
            // Show locked category header
            const lockDiv = document.createElement('div');
            lockDiv.className = 'job-category-header locked';
            lockDiv.innerHTML = `${categoryIcon(cat)} ${categoryLabel(cat)} <span style="color:var(--text2);font-size:0.68rem;font-style:italic">— unlocks at higher PMC tier</span>`;
            el.appendChild(lockDiv);
            return;
        }

        // Category header
        const hdr = document.createElement('div');
        hdr.className = 'job-category-header';
        hdr.style.borderLeftColor = categoryBorderColor(cat);
        hdr.innerHTML = `${categoryIcon(cat)} ${categoryLabel(cat)}`;
        el.appendChild(hdr);

        jobs.forEach(job => {
            const chk        = checkJobRequirements(job);
            const inProgress = GS.activeJobs.some(a => a.jobId === job.id);
            const dur        = getJobDuration(job);
            const rew        = getJobReward(job);
            const xp         = getJobXp(job);
            const fame       = getFameReward(job);
            const doneCount  = GS.completedJobs?.[job.id] ?? 0;

            const div     = document.createElement('div');
            div.className = `job-card${!chk.ok && !inProgress ? ' disabled' : ''}${inProgress ? ' in-progress' : ''}`;
            div.style.borderLeftColor = categoryBorderColor(cat);

            const showFlavour = typeof SETTINGS === 'undefined' || SETTINGS.showFlavourText !== false;
            const showThreat  = typeof SETTINGS === 'undefined' || SETTINGS.showThreatPreview !== false;
            const showReqs    = typeof SETTINGS === 'undefined' || SETTINGS.showReqDetails !== false;
            const showRisk    = typeof SETTINGS === 'undefined' || SETTINGS.showFailureRisk !== false;

            // Threat gain preview
            const threatHtml = showThreat ? buildThreatPreview(job.nationThreatGain) : '';

            // Requirement failures
            let reqHtml = '';
            if (showReqs && !chk.ok && !inProgress && chk.reasons.length > 0) {
                reqHtml = `<div class="job-req-list">${chk.reasons.map(r =>
                    `<div class="job-req-item ${classifyRequirementReason(r)}">✗ ${r}</div>`
                ).join('')}</div>`;
            }

            const magReq = (job.requirements?.minMagic > 0)
                ? `<div style="font-size:0.7rem;color:#a060d0;margin-bottom:3px">✦ Requires ${job.requirements.minMagic} arcane power</div>` : '';

            const nonRepNote = (job.repeatable === false && doneCount > 0)
                ? `<div style="font-size:0.7rem;color:var(--green2);margin-top:3px;font-style:italic">✔ Completed — cannot be repeated</div>` : '';
            const repeatNote = (doneCount > 0 && job.repeatable !== false)
                ? `<div style="font-size:0.68rem;color:var(--text2);margin-top:2px;font-style:italic">Completed ${doneCount}×</div>` : '';

            const isQueued = GS.repeatQueue.includes(job.id);
            // Repeat button — only for repeatable jobs that are available
            const repeatBtn = (job.repeatable !== false && (chk.ok || inProgress || isQueued))
                ? `<button class="repeat-queue-btn${isQueued ? ' queued' : ''}"
                       onclick="event.stopPropagation();${isQueued ? `removeFromRepeatQueue('${job.id}')` : `addToRepeatQueue('${job.id}')`}"
                       title="${isQueued ? 'Remove from repeat queue' : 'Add to repeat queue'}">
                       ${isQueued ? '🔁 Repeating' : '🔁'}
                   </button>`
                : '';

            div.innerHTML = `
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:6px">
                    <div style="flex:1">
                        <div class="job-name">${job.name}
                            ${inProgress ? '<span class="badge green">Underway</span>' : ''}
                            ${job.repeatable === false ? '<span class="badge" style="color:#a060d0;border-color:#6a3090">One-time</span>' : ''}
                        </div>
                        <div class="job-desc">${job.desc}</div>
                        ${showFlavour ? `<div class="job-flavour">"${job.flavour}"</div>` : ''}
                    </div>
                    <div style="text-align:right;flex-shrink:0;display:flex;flex-direction:column;align-items:flex-end;gap:4px">
                        ${dangerLabel(job.danger)}
                        ${repeatBtn}
                    </div>
                </div>
                ${magReq}
                <div class="job-meta">
                    ${rew > 0 ? `<span class="job-reward">⟁ ${formatMoney(rew)}</span>` : ''}
                    <span class="job-xp">✦ ${xp} xp</span>
                    <span style="color:#c08060;font-size:0.73rem">☆ +${fame} renown</span>
                    <span style="color:var(--text2);font-size:0.73rem">⏳ ~${dur}s</span>
                </div>
                ${threatHtml}
                ${nonRepNote}${repeatNote}
                ${reqHtml}
                ${showRisk && job.failureRisk > 0 ? `<div style="font-size:0.7rem;color:var(--text2);margin-top:3px;font-style:italic">Risk: ${Math.round(job.failureRisk*100)}%</div>` : ''}
            `;

            if (chk.ok && !inProgress) {
                div.style.cursor = 'pointer';
                div.onclick = () => startJob(job);
            }
            el.appendChild(div);
        });
    });

    // Render active suppression events as special cards
    renderSuppressionContracts(el);
}

function buildThreatPreview(gains) {
    if (!gains || Object.keys(gains).length === 0) return '';
    const parts = Object.entries(gains).map(([nId, delta]) => {
        const nation = DATA.nations.find(n => n.id === nId);
        if (!nation) return '';
        const sign  = delta > 0 ? '+' : '';
        const color = delta > 0 ? '#c06040' : 'var(--green2)';
        return `<span style="color:${color};font-size:0.68rem">${nation.flag} ${nation.name}: ${sign}${Math.floor(delta * getNationThreatMult())} threat</span>`;
    }).filter(Boolean);
    if (!parts.length) return '';
    return `<div style="margin-top:4px;display:flex;gap:10px;flex-wrap:wrap">${parts.join('')}</div>`;
}

function renderSuppressionContracts(container) {
    if (!GS.suppressionEvents.length) return;

    const hdr = document.createElement('div');
    hdr.className = 'job-category-header';
    hdr.style.borderLeftColor = '#c04030';
    hdr.style.color = '#e06040';
    hdr.innerHTML = `⚠ Active Suppression Operations`;
    container.appendChild(hdr);

    GS.suppressionEvents.forEach((se, idx) => {
        const ev     = DATA.suppressionEvents.find(e => e.id === se.eventId);
        const nation = DATA.nations.find(n => n.id === se.nationId);
        if (!ev || !nation) return;
        const pct = (1 - se.timeLeft / se.totalTime) * 100;

        const div = document.createElement('div');
        div.className = 'job-card suppression-card';
        div.id = `supcard_${idx}`;
        div.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
                <div>
                    <div class="job-name" style="color:#e06040">${nation.flag} ${ev.name}
                        <span class="badge" style="color:#e06040;border-color:#8a2020">Suppression</span>
                    </div>
                    <div style="font-size:0.72rem;color:#c08060;margin-bottom:2px">Commissioned by: ${nation.name}</div>
                    <div class="job-desc">${ev.desc}</div>
                    <div class="job-flavour">"${ev.flavour}"</div>
                </div>
            </div>
            <div class="job-meta" style="margin-top:5px">
                ${ev.rewardBase > 0 ? `<span class="job-reward">⟁ ${formatMoney(ev.rewardBase)}</span>` : ''}
                <span class="job-xp">✦ ${ev.xpBase} xp</span>
                <span style="color:#c08060;font-size:0.73rem">☆ +${ev.fameBase} renown</span>
                <span style="font-size:0.72rem;color:#e06040" id="suptime_${idx}">⏳ ${Math.ceil(se.timeLeft)}s to resolve</span>
            </div>
            <div style="font-size:0.7rem;color:#a04030;margin-top:3px;font-style:italic">
                If ignored: ${ev.penaltyIfIgnored ? ev.penaltyIfIgnored.type + ' penalty' : 'unknown consequence'}
            </div>
            <div class="job-progress" style="margin-top:6px;border-color:rgba(160,40,30,0.3)">
                <div class="job-progress-fill" id="supprog_${idx}"
                     style="width:${pct}%;background:linear-gradient(90deg,#6a1810,#c03020)"></div>
            </div>
            <div style="margin-top:8px">
                <button onclick="handleResolveSuppressionContract(${idx})"
                        style="padding:4px 14px;font-family:var(--font-ui);font-size:0.72rem;
                               letter-spacing:1px;background:rgba(120,30,20,0.3);border:1px solid #6a2010;
                               color:#e06040;cursor:pointer">
                    ⚔ Resolve Now
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

// ===================== ACTIVE JOBS (right panel) =====================
function renderActiveJobs() {
    const panel = document.getElementById('active-jobs-panel');
    const noMsg = document.getElementById('no-active-msg');
    if (!panel) return;

    const allActive = GS.activeJobs.length + GS.suppressionEvents.length;
    if (allActive === 0) {
        if (noMsg) noMsg.style.display = '';
        panel.querySelectorAll('.active-job-card').forEach(e => e.remove());
        return;
    }
    if (noMsg) noMsg.style.display = 'none';
    panel.querySelectorAll('.active-job-card').forEach(e => e.remove());

    // Regular active jobs
    GS.activeJobs.forEach(aj => {
        const jobDef = DATA.jobs.find(j => j.id === aj.jobId);
        if (!jobDef) return;
        const pct    = (1 - aj.timeLeft / aj.totalTime) * 100;
        const border = categoryBorderColor(jobDef.category);
        const div    = document.createElement('div');
        div.className = 'job-card in-progress active-job-card';
        div.id        = 'ajcard_' + aj.jobId;
        div.style.borderLeftColor = border;
        div.innerHTML = `
            <div class="job-name" style="font-size:0.82rem">${categoryIcon(jobDef.category)} ${jobDef.name}</div>
            <div class="active-job-time" id="time_${aj.jobId}">⏳ ${Math.ceil(aj.timeLeft)}s remaining</div>
            <div class="job-progress">
                <div class="job-progress-fill" id="prog_${aj.jobId}"
                     style="width:${pct}%;background:${getCategoryProgressColor(jobDef.category)}"></div>
            </div>`;
        panel.appendChild(div);
    });

    // Suppression events (condensed)
    GS.suppressionEvents.forEach((se, idx) => {
        const ev     = DATA.suppressionEvents.find(e => e.id === se.eventId);
        const nation = DATA.nations.find(n => n.id === se.nationId);
        if (!ev || !nation) return;
        const pct = (1 - se.timeLeft / se.totalTime) * 100;
        const div = document.createElement('div');
        div.className = 'job-card in-progress active-job-card';
        div.id        = `ajsupp_${idx}`;
        div.style.borderLeftColor = '#c03020';
        div.innerHTML = `
            <div class="job-name" style="font-size:0.82rem;color:#e06040">⚠ ${ev.name}</div>
            <div style="font-size:0.68rem;color:#c08060;margin-bottom:3px">${nation.flag} ${nation.name}</div>
            <div class="active-job-time" id="rp_suptime_${idx}">⏳ ${Math.ceil(se.timeLeft)}s to resolve</div>
            <div class="job-progress">
                <div class="job-progress-fill" id="rp_supprog_${idx}"
                     style="width:${pct}%;background:linear-gradient(90deg,#6a1810,#c03020)"></div>
            </div>`;
        panel.appendChild(div);
    });
}

function getCategoryProgressColor(cat) {
    const colors = {
        arcane:           'linear-gradient(90deg,#4a2080,#a060d0)',
        intelligence:     'linear-gradient(90deg,#1a4080,#4080c0)',
        political:        'linear-gradient(90deg,#806020,#c09030)',
        territorial:      'linear-gradient(90deg,#206020,#60a040)',
        nation_war:       'linear-gradient(90deg,#801010,#c02020)',
        sovereign_ops:    'linear-gradient(90deg,#806000,#c09000)',
    };
    return colors[cat] || 'var(--gold)';
}

// ─── Suppression contract handler ────────────────────────────────────
function handleResolveSuppressionContract(idx) {
    completeSuppressionContract(idx);
}
