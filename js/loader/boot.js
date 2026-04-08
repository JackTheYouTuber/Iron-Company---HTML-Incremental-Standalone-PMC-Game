// ===================== LOADER: BOOT =====================
// Shows a loading screen in #app immediately, replaced by buildDOM() once data loads.

function showBootScreen() {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div id="boot-screen" style="
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            height:100vh; background:#0d0b08; color:#c8922a;
            font-family:var(--font-ui); text-align:center; gap:18px;">
            <div style="font-family:var(--font-display); font-size:3rem;
                        text-shadow:0 0 30px rgba(200,140,30,0.5);">Iron Company</div>
            <div style="font-style:italic; color:#6a5020; font-size:0.9rem; letter-spacing:2px;">
                Loading chronicles…
            </div>
            <div id="boot-spinner" style="
                width:32px; height:32px; border:2px solid #4a3810;
                border-top-color:#c8922a; border-radius:50%;
                animation:bootSpin 0.9s linear infinite;">
            </div>
            <style>
                @keyframes bootSpin { to { transform:rotate(360deg); } }
            </style>
        </div>`;
}

function showBootError(message) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center;
                    height:100vh; background:#0d0b08; color:#c04040;
                    font-family:var(--font-body); text-align:center; padding:40px; gap:14px;">
            <div style="font-size:2rem;">⚠</div>
            <div style="font-size:1.1rem; color:#d4bc88;">Failed to raise the fort</div>
            <div style="font-size:0.85rem; color:#806848; max-width:480px; line-height:1.6;">${message}</div>
            <div style="font-size:0.78rem; color:#4a3810; margin-top:6px; font-style:italic;">
                This game requires a local HTTP server to load data files.<br>
                Use the <strong style="color:#c8922a">Iron Company Server Manager</strong> (server_manager.pyw),
                or run: <code style="color:#c8922a">python -m http.server 8000</code>
            </div>
            <button onclick="location.reload()" style="
                margin-top:10px; padding:8px 20px; background:transparent;
                border:1px solid #4a3810; color:#c8922a; cursor:pointer;
                font-family:var(--font-ui); font-size:0.8rem; letter-spacing:2px;">
                Retry
            </button>
        </div>`;
}
