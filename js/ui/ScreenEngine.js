// =====================================================================
//  ScreenEngine — reads data/ui/screens.json and builds the UI
//
//  Responsibilities:
//    1. Build the DOM skeleton (panels, tab bars, sub-tab bars, slots)
//    2. Instantiate the Widget described in each slot
//    3. Dispatch render() to all mounted widgets when state changes
//    4. Dispatch tick(dt) every animation frame to widgets that need it
//    5. Provide renderAll() and a tick hook compatible with the
//       existing gameTick in main.js
//
//  screens.json is loaded by data.js alongside all other game data.
//  Access it as DATA.screens after loadAllData() completes.
//
//  Public API:
//    ScreenEngine.build(app)    — called from loaderInit after buildDOM
//    ScreenEngine.renderAll()   — replaces the old renderAll() in index.js
//    ScreenEngine.tick(dt)      — called from gameTick every frame
//    ScreenEngine.getWidget(id) — look up a mounted widget by slot id
// =====================================================================

const ScreenEngine = (() => {

    // ── Internal state ───────────────────────────────────────────────

    /** @type {Map<string, Widget>} slot-id → widget instance */
    const _widgets = new Map();

    /** Widgets that implement tick(dt) */
    const _tickable = [];

    /** The root app element */
    let _app = null;

    // ── Public API ────────────────────────────────────────────────────

    function build(app) {
        _app = app;
        const screen = DATA.screens;
        if (!screen) {
            console.error('[ScreenEngine] DATA.screens not loaded — is data/ui/screens.json in the fetch list?');
            return;
        }

        // Clear previous widgets
        _widgets.clear();
        _tickable.length = 0;

        // Build header widget slots
        _buildHeader(screen.header, app);

        // Build overlay slots (char creation, save select, notif drawer)
        if (screen.overlays) {
            screen.overlays.forEach(ov => _buildOverlay(ov, app));
        }

        // Build main-wrap → game-area → panels
        const mainWrap = _make('div', 'main-wrap');
        const gameArea = _make('div', 'game-area');
        mainWrap.appendChild(gameArea);
        app.appendChild(mainWrap);

        (screen.panels || []).forEach(panelDef => {
            const panel = _buildPanel(panelDef);
            gameArea.appendChild(panel);
        });

        // Toast element
        const toast = _make('div');
        toast.id = 'toast';
        app.appendChild(toast);
    }

    function renderAll() {
        _widgets.forEach(w => {
            try { w.render(); }
            catch (e) { console.error('[ScreenEngine] render error in widget:', e); }
        });
    }

    function tick(dt) {
        _tickable.forEach(w => {
            try { w.tick(dt); }
            catch (e) { console.error('[ScreenEngine] tick error in widget:', e); }
        });
    }

    function getWidget(slotId) {
        return _widgets.get(slotId) ?? null;
    }

    // ── DOM builders ─────────────────────────────────────────────────

    function _buildHeader(headerDef, app) {
        if (!headerDef) return;
        const header = _make('header');
        app.appendChild(header);

        // Notification drawer sits just after the header in the DOM
        const notifPlaceholder = _make('div');
        notifPlaceholder.id = '_notif_placeholder';
        app.appendChild(notifPlaceholder);

        (headerDef.widgets || []).forEach(wDef => {
            const slot = _make('div', wDef.slot.includes('left')   ? 'header-left'
                                    : wDef.slot.includes('center') ? 'header-center'
                                    : 'header-right');
            slot.id = wDef.slot;
            header.appendChild(slot);
            _mountWidget(wDef, slot);
        });
    }

    function _buildOverlay(ovDef, app) {
        const wrap = _make('div', 'overlay');
        wrap.id = ovDef.id;
        app.appendChild(wrap);
        _mountWidget(ovDef, wrap);
    }

    function _buildPanel(panelDef) {
        const panel = _make('div', 'panel');
        panel.id = panelDef.id;

        if (panelDef.widgets) {
            // Simple widget list (left panel)
            panelDef.widgets.forEach(wDef => {
                const slot = _make('div');
                slot.id = wDef.config?.id || `slot-${panelDef.id}-${wDef.widget}`;
                panel.appendChild(slot);
                _mountWidget(wDef, slot);
            });
        }

        if (panelDef.tabs) {
            // Tab bar + tab content (center panel)
            _buildTabBar(panelDef.tabs, panel);
        }

        return panel;
    }

    function _buildTabBar(tabs, panel) {
        const tabBar = _make('div', 'tab-bar');
        tabBar.id = 'main-tab-bar';
        panel.appendChild(tabBar);

        tabs.forEach((tabDef, i) => {
            // Tab button
            const btn = _make('button', 'tab-btn uses-ui-font');
            btn.dataset.tab = tabDef.id;
            btn.textContent = tabDef.label;
            if (i === 0) btn.classList.add('active');
            btn.onclick = () => switchTab(tabDef.id);
            tabBar.appendChild(btn);

            // Tab content pane
            const pane = _make('div', `tab-content${i === 0 ? ' active' : ''}`);
            pane.id = `tab-${tabDef.id}`;
            panel.appendChild(pane);

            if (tabDef.subtabs) {
                _buildSubTabBar(tabDef.subtabs, pane, tabDef.id);
            } else if (tabDef.widgets) {
                tabDef.widgets.forEach(wDef => {
                    const slot = _make('div');
                    slot.id = wDef.config?.id || `slot-${tabDef.id}-${wDef.widget}`;
                    pane.appendChild(slot);
                    _mountWidget(wDef, slot);
                });
            }
        });
    }

    function _buildSubTabBar(subtabs, parent, parentTabId) {
        const bar = _make('div', 'sub-tab-bar');
        parent.appendChild(bar);

        subtabs.forEach((stDef, i) => {
            const isDefault = stDef.default === true || i === 0;

            // Sub-tab button
            const btn = _make('button', `sub-tab-btn uses-ui-font${isDefault ? ' active' : ''}`);
            btn.dataset.subtab = stDef.id;
            btn.onclick = () => switchSubTab(parentTabId, stDef.id);

            // Label + optional badge
            const labelSpan = _make('span');
            labelSpan.textContent = stDef.label;
            btn.appendChild(labelSpan);

            if (stDef.badgeId) {
                const badge = _make('span', `sub-tab-badge${stDef.badgeStyle === 'alert' ? ' sub-tab-badge--alert' : ''}`);
                badge.id = stDef.badgeId;
                badge.style.display = 'none';
                badge.textContent = '0';
                btn.appendChild(badge);
            }
            bar.appendChild(btn);

            // Sub-tab content
            const pane = _make('div', `sub-tab-content${isDefault ? ' active' : ''}`);
            pane.id = stDef.id;
            parent.appendChild(pane);

            if (stDef.subsubtabs) {
                _buildSubSubTabBar(stDef.subsubtabs, pane);
            } else if (stDef.widgets) {
                stDef.widgets.forEach(wDef => {
                    const slot = _make('div');
                    slot.id = wDef.config?.id || `slot-${stDef.id}-${wDef.widget}`;
                    pane.appendChild(slot);
                    _mountWidget(wDef, slot);
                });
            }
        });
    }

    function _buildSubSubTabBar(subsubtabs, parent) {
        const bar = _make('div', 'sub-sub-tab-bar');
        parent.appendChild(bar);

        subsubtabs.forEach((sstDef, i) => {
            const isDefault = sstDef.default === true || i === 0;

            const btn = _make('button', `sub-sub-tab-btn uses-ui-font${isDefault ? ' active' : ''}`);
            btn.dataset.subsubtab = sstDef.id;
            btn.onclick = () => switchSubSubTab(sstDef.id);

            const labelSpan = _make('span');
            labelSpan.textContent = sstDef.label;
            btn.appendChild(labelSpan);

            if (sstDef.badgeId) {
                const badge = _make('span', 'sub-tab-badge');
                badge.id = sstDef.badgeId;
                badge.style.display = 'none';
                badge.textContent = '0';
                btn.appendChild(badge);
            }
            bar.appendChild(btn);

            const pane = _make('div', `sub-sub-tab-content${isDefault ? ' active' : ''}`);
            pane.id = sstDef.id;
            parent.appendChild(pane);

            if (sstDef.widgets) {
                sstDef.widgets.forEach(wDef => {
                    const slot = _make('div');
                    slot.id = wDef.config?.id || `slot-${sstDef.id}-${wDef.widget}`;
                    pane.appendChild(slot);
                    _mountWidget(wDef, slot);
                });
            }
        });
    }

    // ── Widget instantiation ──────────────────────────────────────────

    function _mountWidget(wDef, container) {
        const Klass = WidgetRegistry.get(wDef.widget);
        if (!Klass) return; // error already logged by registry

        try {
            const instance = new Klass(container, wDef.config || {});
            instance.mount();

            // Store under config.id if given, otherwise widget type name
            const key = wDef.config?.id || wDef.slot || wDef.id || wDef.widget;
            _widgets.set(key, instance);

            // Register for tick if the widget overrides it
            if (instance.tick !== Widget.prototype.tick) {
                _tickable.push(instance);
            }
        } catch (e) {
            console.error(`[ScreenEngine] Failed to mount widget "${wDef.widget}":`, e);
        }
    }

    // ── Utility ──────────────────────────────────────────────────────

    function _make(tag, cls = '') {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        return el;
    }

    // ── Public export ─────────────────────────────────────────────────
    return { build, renderAll, tick, getWidget };

})();

window.ScreenEngine = ScreenEngine;
