// ===================== RENDER: SAVES PANEL =====================
function renderSavesPanel() {
    const el    = document.getElementById('saves-list');
    const saves = listSaves();

    if (saves.length === 0) {
        el.innerHTML = '<div class="notice">No saved chronicles found.</div>';
    } else {
        el.innerHTML = saves.map(s => {
            const p = s.preview;
            return `
            <div class="save-card">
                <div style="display:flex;justify-content:space-between;align-items:flex-start">
                    <div>
                        <div class="save-name">${s.slotName}</div>
                        ${p ? `<div class="save-preview">${p.name} · Lv.${p.level} · Day ${p.day} · ${p.fame} renown</div>` : '<div class="save-preview" style="color:var(--red)">Corrupted</div>'}
                    </div>
                    <div style="display:flex;gap:6px">
                        <button class="save-btn load-btn" onclick="handleLoadSave('${s.slotName}')">Load</button>
                        <button class="save-btn del-btn"  onclick="handleDeleteSave('${s.slotName}')">✕</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
}

function handleSave() {
    const nameEl = document.getElementById('save-slot-name');
    const name   = (nameEl.value || '').trim();
    if (!name) { showToast('Enter a save name first.'); return; }
    if (name.length > 40) { showToast('Save name too long.'); return; }
    saveGame(name);
    nameEl.value = '';
    renderSavesPanel();
}

function handleLoadSave(slotName) {
    if (!confirm(`Load "${slotName}"? Unsaved progress will be lost.`)) return;
    const ok = loadGame(slotName);
    if (ok) renderSavesPanel();
}

function handleDeleteSave(slotName) {
    if (!confirm(`Delete save "${slotName}"? This cannot be undone.`)) return;
    deleteSave(slotName);
    log(`🗑 Chronicle "${slotName}" erased.`, 'bad');
    renderSavesPanel();
}
