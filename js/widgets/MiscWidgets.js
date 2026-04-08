// ── SavePanelWidget ───────────────────────────────────────────────────
// Chronicle tab: save/load/delete saved games.

class SavePanelWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="section-label">Save Chronicle</div>
            <div class="save-input-row">
                <input type="text" id="save-slot-name" placeholder="Name this chronicle…" maxlength="40">
                <button onclick="handleSave()">Save</button>
            </div>
            <div class="section-label">Saved Chronicles</div>
            <div id="saves-list"></div>
            <div class="divider">· · ·</div>
            <div class="notice" style="font-size:0.7rem">Auto-saves every 5 days to your most recent slot.</div>`;
        this._mounted = true;
        this.render();
    }
    render() { renderSavesPanel(); }
}

WidgetRegistry.register('SavePanelWidget', SavePanelWidget);


// ── LogWidget ─────────────────────────────────────────────────────────
// Log tab: scrollable chronicle of all game events.

class LogWidget extends Widget {
    mount() {
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'column';
        this.container.style.height = '100%';
        this.container.style.overflow = 'hidden';

        const inner = document.createElement('div');
        inner.id          = 'log-inner';
        inner.style.flex  = '1';
        inner.style.overflowY = 'auto';
        inner.style.padding   = '8px 0';
        inner.style.display   = 'flex';
        inner.style.flexDirection = 'column-reverse';
        inner.style.scrollbarWidth = 'thin';
        this.container.appendChild(inner);
        this._mounted = true;
    }
    render() {} // log() in utils.js writes directly to #log-inner
}

WidgetRegistry.register('LogWidget', LogWidget);


// ── SettingsPanelWidget ───────────────────────────────────────────────
// Settings tab: font, theme, density, toggles, profiles.

class SettingsPanelWidget extends Widget {
    mount() {
        // tab-settings id needed by renderSettingsPanel
        this.container.closest('[id^="tab-"]')?.setAttribute('id', 'tab-settings');
        this._mounted = true;
        // populated lazily when the tab is opened
    }
    render() {
        const tab = document.getElementById('tab-settings');
        if (tab && tab.classList.contains('active')) {
            renderSettingsPanel();
        }
    }
}

WidgetRegistry.register('SettingsPanelWidget', SettingsPanelWidget);
