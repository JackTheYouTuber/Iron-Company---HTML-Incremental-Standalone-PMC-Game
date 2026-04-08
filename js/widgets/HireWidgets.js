// ── RosterCapWidget ───────────────────────────────────────────────────
// "Warband: N / M" notice at the top of the Hire tab.

class RosterCapWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="notice hire-notice">
                Warband: <span id="cur-roster-disp">0</span> / <span id="max-roster-disp">3</span>
                <span style="color:var(--text2);font-size:0.7rem;margin-left:8px">· Refreshes after each contract</span>
            </div>`;
        this._mounted = true;
    }

    render() {
        const cur = document.getElementById('cur-roster-disp');
        const max = document.getElementById('max-roster-disp');
        if (cur) cur.textContent = GS.roster.length;
        if (max) max.textContent = maxRoster();
    }
}

WidgetRegistry.register('RosterCapWidget', RosterCapWidget);


// ── HireListWidget ────────────────────────────────────────────────────
// The recruit pool cards. Wraps renderHire().

class HireListWidget extends Widget {
    mount() {
        this.container.id = 'hire-list';
        this._mounted = true;
        this.render();
    }
    render() { renderHire(); }
}

WidgetRegistry.register('HireListWidget', HireListWidget);
