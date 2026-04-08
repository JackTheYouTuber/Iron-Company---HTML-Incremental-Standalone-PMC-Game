// ===================== LOADER: INIT =====================
// Entry point. Called on DOMContentLoaded.
// Order: boot screen → inject assets → load JSON data → build DOM via
//        ScreenEngine → init settings → start game loop.

async function loaderInit() {
    // 1. Inject fonts + favicon
    injectAssets();

    // 2. Show loading screen immediately
    showBootScreen();

    // 3. Load all JSON data (game data + settings + screens.json)
    try {
        await Promise.all([
            loadAllData(),
            loadSettingsData(),
        ]);
    } catch (err) {
        showBootError(err.message || String(err));
        return;
    }

    // 4. Build the full DOM from screens.json via ScreenEngine
    const app = document.getElementById('app');
    app.innerHTML = '';           // clear the boot screen
    ScreenEngine.build(app);

    // 5. Init settings system (ensures default profile, applies fonts/theme/density)
    initSettings();

    // 6. Hand off to the game
    startGame();
}

window.addEventListener('DOMContentLoaded', loaderInit);
