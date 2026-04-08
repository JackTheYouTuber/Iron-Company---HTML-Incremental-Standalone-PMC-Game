// ── CollapsibleWidget ─────────────────────────────────────────────────
// A generic collapsible section. Reads children from config and mounts
// them as sub-widgets inside the body when opened.
//
// config:
//   id       {string}   DOM id for the section element
//   label    {string}   Header label text
//   badgeId  {string?}  Optional id for a count badge in the header
//   open     {boolean}  Default open state
//   children {array}    Array of widget defs (same format as screens.json)

class CollapsibleWidget extends Widget {

    mount() {
        const { id, label, badgeId, open = false, children = [] } = this.config;

        const section = this.el('div', `collapsible-section${open ? ' open' : ''}`);
        section.id = id || `collapsible-${label}`;

        const toggle = this.el('button', 'collapsible-toggle uses-ui-font');
        toggle.onclick = () => toggleCollapsible(section.id);

        const labelSpan = this.el('span');
        labelSpan.textContent = label || '';
        toggle.appendChild(labelSpan);

        if (badgeId) {
            const badge = this.el('span', 'collapse-count');
            badge.id = badgeId;
            labelSpan.appendChild(badge);
        }

        const arrow = this.el('span', 'collapse-arrow');
        arrow.textContent = open ? '▼' : '▶';
        toggle.appendChild(arrow);

        const body = this.el('div', 'collapsible-body');
        if (!open) body.style.display = 'none';

        // Mount child widgets into the body
        this._childWidgets = [];
        children.forEach(wDef => {
            const slot = this.el('div');
            slot.id = wDef.config?.id || `slot-${id}-${wDef.widget}`;
            body.appendChild(slot);
            const Klass = WidgetRegistry.get(wDef.widget);
            if (Klass) {
                const child = new Klass(slot, wDef.config || {});
                child.mount();
                this._childWidgets.push(child);
            }
        });

        section.appendChild(toggle);
        section.appendChild(body);
        this.container.appendChild(section);
        this._mounted = true;
    }

    render() {
        // Update badge if configured
        const { badgeId } = this.config;
        if (badgeId) {
            const badge = document.getElementById(badgeId);
            if (badge && this.config.badgeValue !== undefined) {
                badge.textContent = this.config.badgeValue;
            }
        }
        // Propagate render to children
        (this._childWidgets || []).forEach(w => {
            try { w.render(); } catch (e) { console.error('[CollapsibleWidget] child render error:', e); }
        });
    }

    tick(dt) {
        (this._childWidgets || []).forEach(w => {
            try { w.tick(dt); } catch (e) {}
        });
    }

    destroy() {
        (this._childWidgets || []).forEach(w => w.destroy());
        super.destroy();
    }
}

WidgetRegistry.register('CollapsibleWidget', CollapsibleWidget);
