// ===================== LOADER: ASSETS =====================
// Called by loader/init.js before data loads.
// Injects Google Fonts, favicon, and sets the page title.

function injectAssets() {
    const head = document.head;

    // Google Fonts
    if (!document.querySelector('link[href*="googleapis"]')) {
        const fonts = document.createElement('link');
        fonts.rel  = 'stylesheet';
        fonts.href = 'https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=IM+Fell+English+SC&display=swap';
        head.appendChild(fonts);
    }

    // Inline SVG favicon
    const favicon = document.createElement('link');
    favicon.rel  = 'icon';
    favicon.type = 'image/svg+xml';
    favicon.href = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='85'>⚔️</text></svg>";
    head.appendChild(favicon);

    // Title
    document.title = 'Iron Company — A Mercenary Tale';
}
