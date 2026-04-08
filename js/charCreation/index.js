// ===================== CHAR CREATION: INDEX =====================
// Modal lifecycle: open, close, keyboard navigation, name randomiser.
// Orchestrates the other charCreation/ modules.

function openCharCreation() {
    const overlay = document.getElementById('char-creation-overlay');
    if (overlay) overlay.style.display = 'flex';
    ccReset();
    renderOriginCards();
    renderStatPreview();
    // Pre-select the first origin
    if (DATA.origins.length > 0) selectOrigin(DATA.origins[0].id);
    // Focus the name input
    setTimeout(() => {
        const nameInput = document.getElementById('char-name-input');
        if (nameInput) nameInput.focus();
    }, 80);
}

function closeCharCreation() {
    const overlay = document.getElementById('char-creation-overlay');
    if (overlay) overlay.style.display = 'none';
}

function selectOrigin(id) {
    ccSelectOrigin(id);
    renderOriginCards();
    renderStatPreview();
}

function ccRandomiseName() {
    const nameInput = document.getElementById('char-name-input');
    if (!nameInput) return;
    nameInput.value = ccRandomName();
    // Briefly flash the input to acknowledge the roll
    nameInput.classList.add('flash');
    setTimeout(() => nameInput.classList.remove('flash'), 300);
}

// ── Keyboard navigation ──────────────────────────────────────
// Arrow keys cycle through origin cards; Enter confirms.
function ccHandleKeydown(e) {
    const overlay = document.getElementById('char-creation-overlay');
    if (!overlay || overlay.style.display === 'none') return;

    const origins = DATA.origins;
    if (!origins || !origins.length) return;

    const currentIdx = origins.findIndex(o => o.id === CC.selectedOriginId);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (currentIdx + 1) % origins.length;
        selectOrigin(origins[next].id);
        document.getElementById(`origin_card_${origins[next].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (currentIdx - 1 + origins.length) % origins.length;
        selectOrigin(origins[prev].id);
        document.getElementById(`origin_card_${origins[prev].id}`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
        // Only confirm if the focus is NOT on the name input (let Enter submit normally there)
        if (document.activeElement?.id !== 'char-name-input') {
            confirmCharCreation();
        }
    }
}

document.addEventListener('keydown', ccHandleKeydown);

// ── Shake helper (used by confirm.js and other modules) ──────
function shakeElement(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 500);
}
