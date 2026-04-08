// =====================================================================
//  Widget — base class for all Iron Company UI widgets
//
//  Every widget follows this contract:
//    mount(container)   — called once; builds initial DOM into container
//    render()           — idempotent; updates DOM to reflect current state
//    tick(dt)           — called every rAF frame (optional; for live timers)
//    destroy()          — cleanup (remove listeners, cancel timers)
//
//  Widgets are instantiated by ScreenEngine from screens.json.
//  They must never reach outside their own container element.
//  All game state comes from the globals GS, DATA, SETTINGS.
// =====================================================================

class Widget {
    /**
     * @param {HTMLElement} container  The DOM node this widget owns.
     * @param {object}      config     Config from screens.json.
     */
    constructor(container, config = {}) {
        this.container = container;
        this.config    = config;
        this._mounted  = false;
    }

    // ── Lifecycle ────────────────────────────────────────────────────

    /**
     * Build initial DOM. Called once by ScreenEngine after the slot
     * element exists in the document.  Subclasses must call super.mount()
     * if they override this, then do their own DOM building.
     */
    mount() {
        this._mounted = true;
        this.render();
    }

    /**
     * Idempotent state sync. Called whenever game state changes.
     * Override in every subclass.
     */
    render() {}

    /**
     * Called every animation frame with delta time in seconds.
     * Only implement in widgets that need live animation (progress bars,
     * countdown timers). Keep work here minimal — it runs 60× per second.
     * @param {number} dt  Seconds since last frame.
     */
    tick(dt) {}    // eslint-disable-line no-unused-vars

    /**
     * Remove event listeners, cancel any setInterval/setTimeout, etc.
     * ScreenEngine calls this before unmounting a widget.
     */
    destroy() {
        this._mounted = false;
    }

    // ── Helpers available to all widgets ────────────────────────────

    /**
     * Create a DOM element with className and optional innerHTML.
     * @param {string} tag
     * @param {string} [cls]
     * @param {string} [html]
     * @returns {HTMLElement}
     */
    el(tag, cls = '', html = '') {
        const e = document.createElement(tag);
        if (cls)  e.className = cls;
        if (html) e.innerHTML = html;
        return e;
    }

    /**
     * Set container innerHTML — shorthand for full re-renders.
     * @param {string} html
     */
    setHTML(html) {
        this.container.innerHTML = html;
    }

    /**
     * Safely get a child element by ID within the container.
     * Falls back to document.getElementById for IDs that are unique
     * across the app (progress bars addressed by gameTick, etc.)
     * @param {string} id
     * @returns {HTMLElement|null}
     */
    byId(id) {
        return this.container.querySelector(`#${id}`) ?? document.getElementById(id);
    }

    /**
     * Emit a named DOM custom event from the container.
     * Used for inter-widget communication without coupling.
     * @param {string} name
     * @param {*}      detail
     */
    emit(name, detail = null) {
        this.container.dispatchEvent(new CustomEvent(`ic:${name}`, {
            bubbles: true,
            detail,
        }));
    }
}

// Export to global scope — no module system, keeps parity with the
// rest of the codebase.
window.Widget = Widget;
