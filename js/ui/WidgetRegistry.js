// =====================================================================
//  WidgetRegistry — maps widget type names → classes
//
//  ScreenEngine uses this to instantiate widgets from screens.json.
//  Every widget file registers itself here after defining its class.
//
//  Usage (at the bottom of each widget file):
//    WidgetRegistry.register('MyWidget', MyWidget);
//
//  ScreenEngine usage:
//    const W = WidgetRegistry.get('MyWidget');
//    const instance = new W(container, config);
// =====================================================================

const WidgetRegistry = (() => {
    const _registry = new Map();

    return {
        /**
         * Register a widget class under a type name.
         * @param {string}   name   The type name used in screens.json.
         * @param {Function} klass  The Widget subclass.
         */
        register(name, klass) {
            if (_registry.has(name)) {
                console.warn(`[WidgetRegistry] Overwriting existing widget: ${name}`);
            }
            _registry.set(name, klass);
        },

        /**
         * Look up a widget class by type name.
         * @param  {string}        name
         * @returns {Function|null} The class, or null if not found.
         */
        get(name) {
            const klass = _registry.get(name);
            if (!klass) {
                console.error(`[WidgetRegistry] Unknown widget type: "${name}"`);
                return null;
            }
            return klass;
        },

        /**
         * List all registered type names (for debug/inspection).
         * @returns {string[]}
         */
        list() {
            return [..._registry.keys()];
        },

        /**
         * Check if a type is registered.
         * @param  {string}  name
         * @returns {boolean}
         */
        has(name) {
            return _registry.has(name);
        },
    };
})();

window.WidgetRegistry = WidgetRegistry;
