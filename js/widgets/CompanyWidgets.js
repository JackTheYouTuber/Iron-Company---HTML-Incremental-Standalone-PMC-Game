// ── PmcTierWidget ─────────────────────────────────────────────────────
// PMC tier card with progression bars toward the next tier.

class PmcTierWidget extends Widget {
    mount() {
        this.container.id = 'pmc-tier-display';
        this._mounted = true;
        this.render();
    }
    render() { renderPmcTierDisplay(); }
}

WidgetRegistry.register('PmcTierWidget', PmcTierWidget);


// ── CompanyStatsWidget ────────────────────────────────────────────────
// Company overview stats grid (size, contracts, combined stats, treasury).

class CompanyStatsWidget extends Widget {
    mount() {
        this.container.innerHTML = `<div class="company-stats" id="company-stats"></div>`;
        this._mounted = true;
        this.render();
    }
    render() { renderCompany(); }
}

WidgetRegistry.register('CompanyStatsWidget', CompanyStatsWidget);


// ── MagicBarWidget ────────────────────────────────────────────────────
// Arcane power bar; hidden when company has no magic.

class MagicBarWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div id="magic-bar-section" style="display:none">
                <div class="magic-bar-wrap">
                    <div class="magic-bar">
                        <div class="magic-bar-fill" id="magic-bar-fill" style="width:0%"></div>
                    </div>
                    <div class="magic-bar-label">
                        <span id="magic-bar-label-left">Arcane Power</span>
                        <span id="magic-bar-label-right">0 / 30</span>
                    </div>
                </div>
            </div>`;
        this._mounted = true;
        this.render();
    }

    render() {
        const totalMag  = companyTotalMagic();
        const maxMag    = DATA.config?.magicBarMax ?? 30;
        const section   = document.getElementById('magic-bar-section');
        if (!section) return;
        if (totalMag <= 0) { section.style.display = 'none'; return; }
        section.style.display = '';
        const fill = document.getElementById('magic-bar-fill');
        const lbl  = document.getElementById('magic-bar-label-right');
        if (fill) fill.style.width = `${Math.min(100, (totalMag / maxMag) * 100)}%`;
        if (lbl)  lbl.textContent  = `${totalMag} / ${maxMag}`;
    }
}

WidgetRegistry.register('MagicBarWidget', MagicBarWidget);


// ── FameBarWidget ─────────────────────────────────────────────────────
// Renown / fame progress bar with rank label.

class FameBarWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="section-label" style="margin-top:14px">Renown</div>
            <div class="fame-bar-wrap">
                <div class="fame-bar">
                    <div class="fame-bar-fill" id="fame-fill" style="width:0%"></div>
                </div>
                <div class="fame-label">
                    <span id="fame-rank-label" class="uses-ui-font">Unheard Of</span>
                    <span id="fame-val">0 / 50</span>
                </div>
            </div>`;
        this._mounted = true;
        this.render();
    }

    render() {
        const fRank    = getCurrentFameRank();
        const nextRank = getNextFameRank();
        const pct = !nextRank ? 100
            : ((GS.fame - fRank.threshold) / (nextRank.threshold - fRank.threshold)) * 100;
        const fill = document.getElementById('fame-fill');
        const lbl  = document.getElementById('fame-rank-label');
        const val  = document.getElementById('fame-val');
        if (fill) fill.style.width = `${Math.min(100, Math.max(0, pct))}%`;
        if (lbl)  lbl.textContent  = fRank.label;
        if (val)  val.textContent  = nextRank
            ? `${GS.fame} / ${nextRank.threshold}`
            : `${GS.fame} — Pinnacle`;
    }
}

WidgetRegistry.register('FameBarWidget', FameBarWidget);


// ── NationPanelWidget ─────────────────────────────────────────────────
// Company → Nations sub-tab: threat bars for each nation.

class NationPanelWidget extends Widget {
    mount() {
        this.container.id = 'nation-panel-center';
        this.container.innerHTML = '<div class="notice" style="font-size:0.72rem">Rise to Iron Company tier before nations take notice.</div>';
        this._mounted = true;
        this.render();
    }
    render() { renderNationPanelCenter(); }
}

WidgetRegistry.register('NationPanelWidget', NationPanelWidget);


// ── MilestonesWidget ──────────────────────────────────────────────────
// Company → Deeds sub-tab: achieved and in-progress milestones.

class MilestonesWidget extends Widget {
    mount() {
        this.container.id = 'milestone-list';
        this._mounted = true;
        this.render();
    }
    render() { renderMilestonesPanel(); }
}

WidgetRegistry.register('MilestonesWidget', MilestonesWidget);
