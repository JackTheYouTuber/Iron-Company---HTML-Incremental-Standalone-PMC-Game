// ── NotificationDrawerWidget ──────────────────────────────────────────
// The notification bell drawer that slides in from the header.

class NotificationDrawerWidget extends Widget {
    mount() {
        this.container.style.display = 'none';
        this.container.innerHTML = `
            <div class="notif-panel-header">
                <span class="uses-ui-font">Dispatches</span>
                <button class="notif-clear-btn" onclick="clearNotifications()">Clear all</button>
            </div>
            <div id="notif-list" class="notif-list">
                <div class="notif-empty">No recent dispatches.</div>
            </div>`;
        this._mounted = true;
        // Swap the placeholder that ScreenEngine put in for the real drawer
        const ph = document.getElementById('_notif_placeholder');
        if (ph) ph.replaceWith(this.container);
        else document.querySelector('header')?.after(this.container);
    }
    render() {} // updated by pushNotification / clearNotifications
}

WidgetRegistry.register('NotificationDrawerWidget', NotificationDrawerWidget);


// ── CharCreationWidget ────────────────────────────────────────────────
// Character creation modal overlay.

class CharCreationWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="modal modal--wide">
                <div class="modal-header">
                    <div class="modal-title uses-display-font">The Wanderer's Chronicle</div>
                    <div class="modal-subtitle">Name your commander and choose the life that brought you to this ruined fort.</div>
                </div>
                <div class="modal-body">
                    <div class="name-input-row">
                        <label class="name-input-label uses-ui-font" for="char-name-input">Commander's Name</label>
                        <div class="name-input-group">
                            <input type="text" id="char-name-input" placeholder="What name does the world know you by…" maxlength="40" autocomplete="off">
                            <button class="name-random-btn" onclick="ccRandomiseName()" title="Roll a random name">⚄ Random</button>
                        </div>
                    </div>
                    <div class="cc-section-label uses-ui-font">Choose Your Origin</div>
                    <div class="cc-hint">Use arrow keys to cycle origins. Click ▼ More lore on any card to read its history.</div>
                    <div class="origin-grid" id="origin-list"></div>
                    <div class="stat-preview-box">
                        <div class="stat-preview-title uses-ui-font">Starting Statistics</div>
                        <div id="stat-preview"><span style="color:var(--text2);font-style:italic">Select an origin above.</span></div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn uses-ui-font" onclick="confirmCharCreation()">Begin the Chronicle ⚔</button>
                </div>
            </div>`;
        this._mounted = true;
    }
    render() {} // managed by openCharCreation / closeCharCreation
}

WidgetRegistry.register('CharCreationWidget', CharCreationWidget);


// ── SaveSelectWidget ──────────────────────────────────────────────────
// "Continue or New Chronicle" modal shown on load when saves exist.

class SaveSelectWidget extends Widget {
    mount() {
        this.container.innerHTML = `
            <div class="modal save-select-modal">
                <div class="modal-header">
                    <div class="modal-title uses-display-font">Saved Chronicles</div>
                    <div class="modal-subtitle">Continue a past chronicle or begin anew.</div>
                </div>
                <div class="modal-body">
                    <div class="save-select-list" id="save-select-list"></div>
                </div>
                <div class="modal-footer">
                    <button class="modal-btn secondary uses-ui-font" onclick="startNewFromModal()">New Chronicle</button>
                </div>
            </div>`;
        this._mounted = true;
    }
    render() {} // managed by openSaveSelectModal / renderSaveSelectList
}

WidgetRegistry.register('SaveSelectWidget', SaveSelectWidget);
