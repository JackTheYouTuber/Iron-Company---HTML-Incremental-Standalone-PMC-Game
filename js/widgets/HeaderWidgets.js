// ── BrandWidget ───────────────────────────────────────────────────────
// The game title and subtitle in the header left slot.

class BrandWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <h1 class="title uses-display-font">Iron Company</h1>
            <div class="subtitle uses-ui-font">— Chronicles of the Abandoned Fort —</div>`;
        this._mounted = true;
    }
    render() {} // static — no updates needed
}

WidgetRegistry.register('BrandWidget', BrandWidget);


// ── CurrencyHudWidget ─────────────────────────────────────────────────
// Currency bar (G / S / B coins), day counter, notification bell.

class CurrencyHudWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="currency-bar">
                <div class="coin gold"   title="Gold coins (1g = 100s)"><div class="coin-dot">G</div><span id="gold-disp">0</span></div>
                <div class="coin silver" title="Silver coins (1s = 100b)"><div class="coin-dot">S</div><span id="silver-disp">0</span></div>
                <div class="coin bronze" title="Bronze coins"><div class="coin-dot">B</div><span id="bronze-disp">0</span></div>
            </div>
            <div class="day-badge uses-ui-font">Day <span id="day-counter">1</span></div>
            <button class="header-icon-btn" id="notif-btn" title="Notifications" onclick="toggleNotifPanel()">
                🔔<span class="notif-dot" id="notif-dot" style="display:none"></span>
            </button>`;
        this._mounted = true;
    }

    render() {
        const c  = moneyToCoins(GS.bronze);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('gold-disp',   c.g);
        set('silver-disp', c.s);
        set('bronze-disp', c.b);
        set('day-counter', GS.day);
    }

    tick(_dt) {
        // Currency updates every frame from gameTick — render() handles it
    }
}

WidgetRegistry.register('CurrencyHudWidget', CurrencyHudWidget);


// ── ActiveSummaryWidget ───────────────────────────────────────────────
// Live active-contract pills in the header centre.
// Clicking navigates to Contracts → Active.

class ActiveSummaryWidget extends Widget {
    mount() {
        this.container.id = 'header-active-summary';
        this._mounted = true;
    }

    render() {
        renderHeaderSummary();
    }

    tick(_dt) {
        this.render();
    }
}

WidgetRegistry.register('ActiveSummaryWidget', ActiveSummaryWidget);
