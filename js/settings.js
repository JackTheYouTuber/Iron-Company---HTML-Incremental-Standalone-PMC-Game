// =====================================================================
//  SETTINGS — user preferences and profile management
//  Loads from data/settings.json (defaults + presets).
//  Per-profile overrides are stored in localStorage under
//  'ironcompany_profiles' and 'ironcompany_active_profile'.
//
//  Public API:
//    SETTINGS          — merged live settings object (read-only)
//    applySettings()   — re-reads SETTINGS and applies to DOM / CSS
//    saveSettings(patch) — merge patch into active profile, persist, apply
//    listProfiles()    — returns array of profile objects
//    createProfile(displayName, saveSlot?) — creates & activates a profile
//    activateProfile(id) — switch active profile, apply its settings
//    deleteProfile(id)  — remove profile (cannot delete last one)
//    linkProfileToSave(saveSlotName) — update active profile's saveSlot
// =====================================================================

// ─── Runtime state ───────────────────────────────────────────────────
const SETTINGS = {};          // live merged settings — READ ONLY from outside
let   _settingsDefaults = {}; // from data/settings.json → defaults
let   _settingsData     = {}; // full data/settings.json object
let   _activeProfileId  = null;

const PROFILES_KEY        = 'ironcompany_profiles';
const ACTIVE_PROFILE_KEY  = 'ironcompany_active_profile';

// ─── Load & boot ─────────────────────────────────────────────────────
async function loadSettingsData() {
    _settingsData    = await (await fetch('data/settings.json')).json();
    _settingsDefaults = { ..._settingsData.defaults };
    _rebuildSettings();
    _applyFontPreset();
    applySettings();
}

// ─── Merge: defaults → active profile overrides → SETTINGS ──────────
function _rebuildSettings() {
    const active = _getActiveProfile();
    const overrides = active?.settings || {};
    Object.assign(SETTINGS, _settingsDefaults, overrides);
}

// ─── CSS variable application ─────────────────────────────────────────
function applySettings() {
    _rebuildSettings();
    _applyTheme();
    _applyDensity();
    _applyScanlines();
    _applyFontScale();
    // Notify any open settings panel to re-render
    if (typeof renderSettingsPanel === 'function') renderSettingsPanel();
}

function _applyTheme() {
    const theme = (_settingsData.themes || []).find(t => t.id === SETTINGS.theme);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
}

function _applyDensity() {
    const preset = (_settingsData.uiDensityPresets || []).find(d => d.id === SETTINGS.uiDensity);
    if (!preset) return;
    const root = document.documentElement;
    root.style.setProperty('--card-padding',  preset.cardPadding);
    root.style.setProperty('--card-margin',   preset.cardMargin);
    root.style.setProperty('--panel-padding', preset.panelPadding);
    root.style.setProperty('--font-scale',    preset.baseFontScale);
}

function _applyScanlines() {
    document.body.classList.toggle('no-scanlines', !SETTINGS.scanlines);
}

function _applyFontScale() {
    document.documentElement.style.setProperty(
        '--font-scale', SETTINGS.fontScale ?? 1.0
    );
}

// Font presets require injecting a new <link> — done at boot and on change
function _applyFontPreset(presetId) {
    const id = presetId || SETTINGS.fontPreset || 'medieval';
    const preset = (_settingsData.fontPresets || []).find(p => p.id === id);
    if (!preset) return;

    // Remove old font links injected by settings
    document.querySelectorAll('link[data-settings-font]').forEach(l => l.remove());

    // Inject new Google Fonts link
    if (preset.googleFonts) {
        const link = document.createElement('link');
        link.rel  = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?${preset.googleFonts}&display=swap`;
        link.dataset.settingsFont = id;
        document.head.appendChild(link);
    }

    // Apply CSS variables
    const root = document.documentElement;
    root.style.setProperty('--font-display', preset.displayFont);
    root.style.setProperty('--font-ui',      preset.uiFont);
    root.style.setProperty('--font-body',    preset.bodyFont);

    // Inline style on body so it overrides the stylesheet
    document.body.style.fontFamily = preset.bodyFont;

    // Update all elements that use the display / ui font classes
    document.querySelectorAll('.uses-display-font').forEach(el => {
        el.style.fontFamily = preset.displayFont;
    });
    document.querySelectorAll('.uses-ui-font').forEach(el => {
        el.style.fontFamily = preset.uiFont;
    });
}

// ─── Save settings ────────────────────────────────────────────────────
function saveSettings(patch) {
    const profiles = _loadProfiles();
    const active   = profiles.find(p => p.id === _activeProfileId);
    if (!active) return;
    active.settings = { ...(active.settings || {}), ...patch };
    _saveProfiles(profiles);
    applySettings();
    // Font preset change needs extra work
    if (patch.fontPreset) _applyFontPreset(patch.fontPreset);
}

// ─── Profile management ───────────────────────────────────────────────
function listProfiles() {
    return _loadProfiles();
}

function getActiveProfile() {
    return _getActiveProfile();
}

function createProfile(displayName, saveSlot = null) {
    const profiles = _loadProfiles();
    const id = 'profile_' + Date.now();
    const now = new Date().toISOString();
    profiles.push({
        id,
        displayName,
        saveSlot,
        createdAt:  now,
        lastPlayed: now,
        settings:   {},
    });
    _saveProfiles(profiles);
    activateProfile(id);
    return id;
}

function activateProfile(id) {
    const profiles = _loadProfiles();
    const p = profiles.find(pr => pr.id === id);
    if (!p) return false;
    p.lastPlayed = new Date().toISOString();
    _saveProfiles(profiles);
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    _activeProfileId = id;
    applySettings();
    return true;
}

function deleteProfile(id) {
    let profiles = _loadProfiles();
    if (profiles.length <= 1) return false; // keep at least one
    profiles = profiles.filter(p => p.id !== id);
    _saveProfiles(profiles);
    if (_activeProfileId === id) {
        activateProfile(profiles[0].id);
    }
    return true;
}

function renameProfile(id, newName) {
    const profiles = _loadProfiles();
    const p = profiles.find(pr => pr.id === id);
    if (!p) return false;
    p.displayName = newName.trim().slice(0, 40) || p.displayName;
    _saveProfiles(profiles);
    return true;
}

function linkProfileToSave(saveSlotName) {
    const profiles = _loadProfiles();
    const active   = profiles.find(p => p.id === _activeProfileId);
    if (!active) return;
    active.saveSlot    = saveSlotName;
    active.lastPlayed  = new Date().toISOString();
    _saveProfiles(profiles);
}

// ─── Internal helpers ─────────────────────────────────────────────────
function _loadProfiles() {
    try { return JSON.parse(localStorage.getItem(PROFILES_KEY)) || []; }
    catch { return []; }
}

function _saveProfiles(profiles) {
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function _getActiveProfile() {
    if (!_activeProfileId) {
        _activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY);
    }
    const profiles = _loadProfiles();
    if (!profiles.length) return null;
    return profiles.find(p => p.id === _activeProfileId) || profiles[0];
}

// ─── Bootstrap: ensure at least one profile exists ───────────────────
function _ensureDefaultProfile() {
    const profiles = _loadProfiles();
    if (!profiles.length) {
        const id  = 'profile_default';
        const now = new Date().toISOString();
        profiles.push({ id, displayName: 'Commander', saveSlot: null, createdAt: now, lastPlayed: now, settings: {} });
        _saveProfiles(profiles);
    }
    _activeProfileId = localStorage.getItem(ACTIVE_PROFILE_KEY) || _loadProfiles()[0].id;
    localStorage.setItem(ACTIVE_PROFILE_KEY, _activeProfileId);
}

// Called from loaderInit after loadSettingsData()
function initSettings() {
    _ensureDefaultProfile();
    _rebuildSettings();
    applySettings();
}
