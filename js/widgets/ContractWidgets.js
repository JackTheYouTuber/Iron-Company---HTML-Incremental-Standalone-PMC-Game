// ── JobListWidget ─────────────────────────────────────────────────────
// Available contracts list. Wraps renderJobs().

class JobListWidget extends Widget {
    mount() {
        this.container.id = 'jobs-list';
        this._mounted = true;
        this.render();
    }
    render() { renderJobs(); }
}

WidgetRegistry.register('JobListWidget', JobListWidget);


// ── ActiveJobsWidget ──────────────────────────────────────────────────
// Active once-off contracts with live progress bars. Has a tick()
// implementation so progress updates every frame without a full render.

class ActiveJobsWidget extends Widget {
    mount() {
        this.container.id = 'active-jobs-center-panel';
        this.container.innerHTML = '<div class="notice">Your company rests idle at the fort.</div>';
        this._mounted = true;
        this.render();
    }

    render() { renderActiveJobsCenter(); }

    tick(_dt) {
        // Live-update progress bar widths and countdowns in-place.
        // gameTick does this directly by element ID; the widget
        // does not need to duplicate that work. render() rebuilds
        // when completedAny or suppressionChanged fires.
    }
}

WidgetRegistry.register('ActiveJobsWidget', ActiveJobsWidget);


// ── RepeatQueueWidget ─────────────────────────────────────────────────
// Queue of repeating contracts (auto-restart on completion).

class RepeatQueueWidget extends Widget {
    mount() {
        this.container.id = 'repeat-queue-panel';
        this.container.innerHTML = '<div class="notice">No contracts queued to repeat.</div>';
        this._mounted = true;
        this.render();
    }
    render() { renderRepeatQueuePanel(); }
}

WidgetRegistry.register('RepeatQueueWidget', RepeatQueueWidget);
