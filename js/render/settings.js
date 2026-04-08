// ===================== RENDER: SETTINGS TAB =====================
// Reads from SETTINGS and _settingsData (both in js/settings.js).
// All changes go through saveSettings(patch).

function renderSettingsPanel() {
    const el = document.getElementById('tab-settings');
    if (!el || !el.classList.contains('active')) return; // only render when visible

    const sd = _settingsData;
    if (!sd || !sd.fontPresets) return;

    const profiles    = listProfiles();
    const activeProf  = getActiveProfile();

    el.innerHTML = `
    <div class="settings-wrap">

      <!-- ── PROFILES ── -->
      <div class="settings-section">
        <div class="settings-section-title">⚔ Profiles</div>
        <div class="settings-hint">Each profile keeps its own settings. Link a profile to a save slot to auto-load on selection.</div>
        <div class="settings-profile-list">
          ${profiles.map(p => `
            <div class="settings-profile-row${p.id === activeProf?.id ? ' active' : ''}">
              <div class="settings-profile-info">
                <span class="settings-profile-name">${escapeHtml(p.displayName)}</span>
                ${p.saveSlot ? `<span class="settings-profile-save">⟁ ${escapeHtml(p.saveSlot)}</span>` : '<span class="settings-profile-save muted">No save linked</span>'}
              </div>
              <div class="settings-profile-actions">
                ${p.id !== activeProf?.id ? `<button class="settings-btn small" onclick="activateProfile('${p.id}');renderAll()">Activate</button>` : '<span class="settings-badge-active">Active</span>'}
                <button class="settings-btn small danger" onclick="handleDeleteProfile('${p.id}')" ${profiles.length <= 1 ? 'disabled' : ''}>✕</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div class="settings-profile-new">
          <input type="text" id="new-profile-name" placeholder="New profile name…" maxlength="40" class="settings-input">
          <button class="settings-btn" onclick="handleCreateProfile()">+ Create</button>
        </div>
        ${activeProf ? `
        <div class="settings-profile-link" style="margin-top:8px">
          <span class="settings-label">Link active profile to save slot:</span>
          <select class="settings-select" onchange="handleLinkProfileSave(this.value)">
            <option value="">— none —</option>
            ${listSaves().map(s => `<option value="${escapeHtml(s.slotName)}"${activeProf.saveSlot === s.slotName ? ' selected' : ''}>${escapeHtml(s.slotName)}</option>`).join('')}
          </select>
        </div>` : ''}
      </div>

      <!-- ── FONT ── -->
      <div class="settings-section">
        <div class="settings-section-title">✦ Font Style</div>
        <div class="settings-preset-grid">
          ${sd.fontPresets.map(fp => `
            <div class="settings-preset-card${SETTINGS.fontPreset === fp.id ? ' selected' : ''}"
                 onclick="applyAndSave('fontPreset','${fp.id}')"
                 style="font-family:${fp.bodyFont}">
              <div class="settings-preset-name" style="font-family:${fp.displayFont}">${fp.label}</div>
              <div class="settings-preset-desc">${fp.description}</div>
              <div class="settings-preset-sample" style="font-family:${fp.displayFont};font-size:1.1rem">Iron Company</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ── THEME ── -->
      <div class="settings-section">
        <div class="settings-section-title">◈ Colour Theme</div>
        <div class="settings-preset-grid settings-preset-grid--themes">
          ${sd.themes.map(th => `
            <div class="settings-preset-card settings-theme-swatch${SETTINGS.theme === th.id ? ' selected' : ''}"
                 onclick="applyAndSave('theme','${th.id}')">
              <div class="theme-swatch-dots">
                <span style="background:${th.vars['--bg']}"></span>
                <span style="background:${th.vars['--gold2']}"></span>
                <span style="background:${th.vars['--text']}"></span>
                <span style="background:${th.vars['--green2']}"></span>
                <span style="background:${th.vars['--red']}"></span>
              </div>
              <div class="settings-preset-name">${th.label}</div>
              <div class="settings-preset-desc">${th.description}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ── UI DENSITY ── -->
      <div class="settings-section">
        <div class="settings-section-title">⊞ UI Density</div>
        <div class="settings-preset-grid settings-preset-grid--density">
          ${sd.uiDensityPresets.map(d => `
            <div class="settings-preset-card${SETTINGS.uiDensity === d.id ? ' selected' : ''}"
                 onclick="applyAndSave('uiDensity','${d.id}')">
              <div class="settings-preset-name">${d.label}</div>
              <div class="settings-preset-desc">${d.description}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- ── DISPLAY TOGGLES ── -->
      <div class="settings-section">
        <div class="settings-section-title">◉ Display</div>
        <div class="settings-toggle-list">
          ${renderToggle('scanlines',        'Scanline overlay',         'Subtle CRT scanline effect over the UI.')}
          ${renderToggle('animationsEnabled','Animations',               'Card fade-ins and UI transitions.')}
          ${renderToggle('showFlavourText',  'Flavour text on cards',    'Italic quote shown below job descriptions.')}
          ${renderToggle('showLoreText',     'Lore text on recruit cards','Show the longer lore blurb on hire/roster cards by default.')}
          ${renderToggle('showFailureRisk',  'Failure risk indicator',   'Show the % failure risk on contract cards.')}
          ${renderToggle('showThreatPreview','Threat preview on jobs',   'Show nation threat delta on contract cards.')}
          ${renderToggle('showReqDetails',   'Show requirement failures', 'List unmet requirements under locked contracts.')}
        </div>
      </div>

      <!-- ── NOTIFICATIONS ── -->
      <div class="settings-section">
        <div class="settings-section-title">🔔 Notifications</div>
        <div class="settings-hint">Toast pop-ups and log highlights. Disable types you find distracting.</div>
        <div class="settings-toggle-list">
          ${renderToggle('notifyJobDone',    'Contract completed',  'Toast + log entry when a job finishes.')}
          ${renderToggle('notifyLevelUp',    'Level up',            'Toast when your commander gains a level.')}
          ${renderToggle('notifyMilestone',  'Milestone achieved',  'Toast when a deed is unlocked.')}
          ${renderToggle('notifyNation',     'Nation relation change', 'Toast when a nation escalates or de-escalates.')}
          ${renderToggle('notifySuppression','Suppression spawned', 'Toast when a nation deploys a suppression operation.')}
          ${renderToggle('notifyPmcTier',    'PMC tier advance',    'Toast when your company advances to a new tier.')}
        </div>
      </div>

      <!-- ── LOG ── -->
      <div class="settings-section">
        <div class="settings-section-title">📜 Chronicle Log</div>
        <div class="settings-row">
          <label class="settings-label">Max log entries</label>
          <select class="settings-select" onchange="applyAndSave('logMaxEntries', parseInt(this.value))">
            ${[40,80,120,200,400].map(n => `<option value="${n}"${SETTINGS.logMaxEntries == n ? ' selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        ${renderToggle('logExpanded', 'Log visible by default', 'Show the Chronicle log at the bottom on load.')}
      </div>

      <!-- ── RESET ── -->
      <div class="settings-section settings-section--danger">
        <div class="settings-section-title">⚠ Reset</div>
        <div class="settings-hint">Reset all settings for the active profile back to defaults. Does not affect save data.</div>
        <button class="settings-btn danger" onclick="handleResetSettings()">Reset to Defaults</button>
      </div>

    </div>`;
}

// ── Sub-helpers ───────────────────────────────────────────────────────
function renderToggle(key, label, hint) {
    const on = !!SETTINGS[key];
    return `
    <div class="settings-toggle-row" onclick="applyAndSave('${key}', ${!on})">
      <div class="settings-toggle-text">
        <span class="settings-label">${label}</span>
        <span class="settings-hint-inline">${hint}</span>
      </div>
      <div class="settings-toggle${on ? ' on' : ''}">
        <div class="settings-toggle-knob"></div>
      </div>
    </div>`;
}

function escapeHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Action handlers called from inline onclick ─────────────────────
function applyAndSave(key, value) {
    saveSettings({ [key]: value });
    renderSettingsPanel();
    // Density and display changes need a full re-render
    if (['uiDensity','showFlavourText','showLoreText','showFailureRisk',
         'showThreatPreview','showReqDetails','logExpanded'].includes(key)) {
        renderAll();
    }
}

function handleCreateProfile() {
    const inp = document.getElementById('new-profile-name');
    const name = (inp?.value || '').trim();
    if (!name) { showToast('Enter a profile name.'); return; }
    createProfile(name);
    renderSettingsPanel();
    renderAll();
    if (inp) inp.value = '';
    showToast(`Profile "${name}" created.`);
}

function handleDeleteProfile(id) {
    const profiles = listProfiles();
    const p = profiles.find(pr => pr.id === id);
    if (!p) return;
    if (!confirm(`Delete profile "${p.displayName}"? Settings for this profile will be lost.`)) return;
    deleteProfile(id);
    renderSettingsPanel();
    renderAll();
}

function handleLinkProfileSave(slotName) {
    linkProfileToSave(slotName || null);
    renderSettingsPanel();
    showToast(slotName ? `Profile linked to "${slotName}".` : 'Profile unlinked from save.');
}

function handleResetSettings() {
    if (!confirm('Reset all settings for this profile to defaults?')) return;
    saveSettings({ ..._settingsData.defaults });
    renderSettingsPanel();
    renderAll();
    showToast('Settings reset to defaults.');
}
