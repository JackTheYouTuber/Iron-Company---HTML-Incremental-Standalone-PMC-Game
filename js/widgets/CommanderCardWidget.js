// ── CommanderCardWidget ───────────────────────────────────────────────
// Renders the always-visible commander card: portrait, name, rank,
// origin, HP bar, XP bar.
//
// Tick: updates HP/XP bars every frame for smooth animation.

class CommanderCardWidget extends Widget {

    mount() {
        this.container.innerHTML = `
            <div class="commander-card">
                <div class="cmd-header">
                    <div class="cmd-portrait" id="cmd-symbol">⚔</div>
                    <div class="cmd-header-text">
                        <div class="commander-name uses-display-font" id="cmd-name">—</div>
                        <div class="commander-rank uses-ui-font" id="cmd-rank">Wandering Blade</div>
                        <div class="commander-origin" id="cmd-origin"></div>
                    </div>
                </div>
                <div class="hp-bar-wrap">
                    <div class="hp-bar-label">
                        <span>Vitality</span>
                        <span id="hp-text">100 / 100</span>
                    </div>
                    <div class="hp-bar">
                        <div class="hp-bar-fill" id="hp-fill" style="width:100%"></div>
                    </div>
                </div>
                <div class="xp-bar">
                    <div class="xp-bar-fill" id="xp-fill"></div>
                </div>
                <div class="xp-label">
                    <span class="uses-ui-font">Lv.<span id="cmd-level">1</span></span>
                    <span id="xp-text">0 / 100 XP</span>
                </div>
            </div>`;
        this._mounted = true;
    }

    render() {
        const C     = GS.commander;
        const title = getCommanderTitle();
        const mag   = companyTotalMagic();

        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val;
        };
        const setStyle = (id, prop, val) => {
            const el = document.getElementById(id);
            if (el) el.style[prop] = val;
        };

        set('cmd-name',   C.name || 'Unknown Blade');
        set('cmd-rank',   title);
        set('cmd-origin', C.origin || '');
        set('cmd-symbol', C.portraitSymbol || '⚔');
        set('cmd-level',  C.level);
        set('hp-text',    `${C.hp} / ${C.maxHp}`);
        set('xp-text',    `${C.xp} / ${C.xpNext} XP`);
        setStyle('hp-fill', 'width', `${(C.hp / C.maxHp) * 100}%`);
        setStyle('xp-fill', 'width', `${(C.xp / C.xpNext) * 100}%`);
    }

    tick(_dt) {
        // Bars are set directly in render(); render is called from gameTick
        // every frame via renderCurrency/renderCommander. Nothing extra needed.
    }
}

WidgetRegistry.register('CommanderCardWidget', CommanderCardWidget);
