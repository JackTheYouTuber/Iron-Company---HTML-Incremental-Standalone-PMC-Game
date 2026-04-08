// ── StatGridWidget ────────────────────────────────────────────────────
// The four commander stats (STR/END/LEAD/CUN) displayed in a 2×2 grid.

class StatGridWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="stat-grid">
                <div class="stat-row"><span class="stat-label">Strength</span>  <span class="stat-val" id="stat-str">10</span></div>
                <div class="stat-row"><span class="stat-label">Endurance</span> <span class="stat-val" id="stat-end">10</span></div>
                <div class="stat-row"><span class="stat-label">Leadership</span><span class="stat-val" id="stat-lead">4</span></div>
                <div class="stat-row"><span class="stat-label">Cunning</span>   <span class="stat-val" id="stat-cun">4</span></div>
            </div>`;
        this._mounted = true;
    }

    render() {
        const C = GS.commander;
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('stat-str',  C.str);
        set('stat-end',  C.end);
        set('stat-lead', C.lead);
        set('stat-cun',  C.cun);
    }
}

WidgetRegistry.register('StatGridWidget', StatGridWidget);


// ── CommanderItemWidget ───────────────────────────────────────────────
// Shows the commander's starting item (from their origin).

class CommanderItemWidget extends Widget {
    mount() {
        this.container.innerHTML = `<div id="cmd-item" class="cmd-item"></div>`;
        this._mounted = true;
    }

    render() {
        const el = document.getElementById('cmd-item');
        if (el) el.textContent = GS.commander.startingItem ? `✦ ${GS.commander.startingItem}` : '';
    }
}

WidgetRegistry.register('CommanderItemWidget', CommanderItemWidget);


// ── CompanyMagicWidget ────────────────────────────────────────────────
// Shows the company's total arcane power; hidden when magic is 0.

class CompanyMagicWidget extends Widget {
    mount() {
        this.container.innerHTML = `<div id="company-magic" style="font-size:0.7rem;color:#a060d0;margin-top:3px;font-style:italic;display:none"></div>`;
        this._mounted = true;
    }

    render() {
        const mag = companyTotalMagic();
        const el  = document.getElementById('company-magic');
        if (!el) return;
        el.textContent   = mag > 0 ? `✦ ${mag} arcane` : '';
        el.style.display = mag > 0 ? '' : 'none';
    }
}

WidgetRegistry.register('CompanyMagicWidget', CompanyMagicWidget);
