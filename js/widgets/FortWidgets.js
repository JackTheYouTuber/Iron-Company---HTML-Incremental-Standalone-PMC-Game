// ── FortUpgradesWidget ────────────────────────────────────────────────
// Fort improvements list grouped by category. Wraps renderFort().

class FortUpgradesWidget extends Widget {
    mount() {
        this.container.id = 'fort-list';
        this._mounted = true;
        this.render();
    }
    render() { renderFort(); }
}

WidgetRegistry.register('FortUpgradesWidget', FortUpgradesWidget);


// ── FortStatusWidget ──────────────────────────────────────────────────
// Fort > Status sub-tab: built improvements grouped by category.

class FortStatusWidget extends Widget {
    mount() {
        this.container.id = 'fort-status-center-inner';
        this._mounted = true;
        this.render();
    }
    render() { renderFortStatusCenter(); }
}

WidgetRegistry.register('FortStatusWidget', FortStatusWidget);
