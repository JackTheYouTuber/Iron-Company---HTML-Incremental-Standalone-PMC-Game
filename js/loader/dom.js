// =====================================================================
//  dom.js — SUPERSEDED BY ScreenEngine (Session 17)
//
//  This file is no longer called. buildDOM() was replaced by
//  ScreenEngine.build(app) in loader/init.js. The DOM is now
//  constructed from data/ui/screens.json via js/ui/ScreenEngine.js.
//
//  Kept on disk as a reference / fallback only.
//  Safe to delete once the widget system is confirmed stable.
// =====================================================================

// ===================== LOADER: DOM =====================
// Builds the complete game DOM into #app.
// index.html is a shell — no game markup lives there.

function buildDOM() {
    const app = document.getElementById('app');
    if (!app) { console.error('[loader/dom] #app not found'); return; }

    app.innerHTML = `

<!-- HEADER -->
<header>
  <div class="header-left">
    <h1 class="title uses-display-font">Iron Company</h1>
    <div class="subtitle uses-ui-font">— Chronicles of the Abandoned Fort —</div>
  </div>
  <div class="header-center" id="header-active-summary"></div>
  <div class="header-right">
    <div class="currency-bar">
      <div class="coin gold"   title="Gold coins (1g = 100s)"><div class="coin-dot">G</div><span id="gold-disp">0</span></div>
      <div class="coin silver" title="Silver coins (1s = 100b)"><div class="coin-dot">S</div><span id="silver-disp">0</span></div>
      <div class="coin bronze" title="Bronze coins"><div class="coin-dot">B</div><span id="bronze-disp">0</span></div>
    </div>
    <div class="day-badge uses-ui-font">Day <span id="day-counter">1</span></div>
    <button class="header-icon-btn" id="notif-btn" title="Notifications" onclick="toggleNotifPanel()">🔔<span class="notif-dot" id="notif-dot" style="display:none"></span></button>
  </div>
</header>

<!-- NOTIFICATION DRAWER -->
<div id="notif-panel" class="notif-panel" style="display:none">
  <div class="notif-panel-header">
    <span class="uses-ui-font">Dispatches</span>
    <button class="notif-clear-btn" onclick="clearNotifications()">Clear all</button>
  </div>
  <div id="notif-list" class="notif-list">
    <div class="notif-empty">No recent dispatches.</div>
  </div>
</div>

<!-- MAIN WRAP -->
<div class="main-wrap">
  <div class="game-area">

    <!-- LEFT: Commander + Roster -->
    <div class="panel" id="left-panel">

      <div class="commander-card">
        <div class="cmd-header">
          <div class="cmd-portrait" id="cmd-symbol">⚔</div>
          <div class="cmd-header-text">
            <div class="commander-name uses-display-font" id="cmd-name">—</div>
            <div class="commander-rank uses-ui-font" id="cmd-rank">Wandering Blade</div>
            <div class="commander-origin" id="cmd-origin"></div>
          </div>
        </div>
        <div class="hp-bar-wrap">
          <div class="hp-bar-label"><span>Vitality</span><span id="hp-text">100 / 100</span></div>
          <div class="hp-bar"><div class="hp-bar-fill" id="hp-fill" style="width:100%"></div></div>
        </div>
        <div class="xp-bar"><div class="xp-bar-fill" id="xp-fill"></div></div>
        <div class="xp-label">
          <span class="uses-ui-font">Lv.<span id="cmd-level">1</span></span>
          <span id="xp-text">0 / 100 XP</span>
        </div>
      </div>

      <div class="collapsible-section" id="cmd-details-section">
        <button class="collapsible-toggle uses-ui-font" onclick="toggleCollapsible('cmd-details-section')">
          <span>Stats &amp; Details</span><span class="collapse-arrow">▶</span>
        </button>
        <div class="collapsible-body" style="display:none">
          <div class="stat-grid">
            <div class="stat-row"><span class="stat-label">Strength</span>  <span class="stat-val" id="stat-str">10</span></div>
            <div class="stat-row"><span class="stat-label">Endurance</span> <span class="stat-val" id="stat-end">10</span></div>
            <div class="stat-row"><span class="stat-label">Leadership</span><span class="stat-val" id="stat-lead">4</span></div>
            <div class="stat-row"><span class="stat-label">Cunning</span>   <span class="stat-val" id="stat-cun">4</span></div>
          </div>
          <div id="cmd-item" class="cmd-item"></div>
          <div id="company-magic" style="font-size:0.7rem;color:#a060d0;margin-top:3px;font-style:italic;display:none"></div>
        </div>
      </div>

      <div class="collapsible-section open" id="roster-section">
        <button class="collapsible-toggle uses-ui-font" onclick="toggleCollapsible('roster-section')">
          <span>Warband <span id="roster-count-badge" class="collapse-count"></span></span><span class="collapse-arrow">▼</span>
        </button>
        <div class="collapsible-body">
          <div id="roster-list">
            <div class="notice">No souls under your banner.</div>
          </div>
        </div>
      </div>

    </div>

    <!-- CENTER: Main tabs -->
    <div class="panel" id="center-panel">
      <div class="tab-bar" id="main-tab-bar">
        <button class="tab-btn uses-ui-font active" data-tab="jobs"     onclick="switchTab('jobs')">Contracts</button>
        <button class="tab-btn uses-ui-font"        data-tab="hire"     onclick="switchTab('hire')">Hire</button>
        <button class="tab-btn uses-ui-font"        data-tab="fort"     onclick="switchTab('fort')">Fort</button>
        <button class="tab-btn uses-ui-font"        data-tab="company"  onclick="switchTab('company')">Company</button>
        <button class="tab-btn uses-ui-font"        data-tab="saves"    onclick="switchTab('saves')">Chronicle</button>
        <button class="tab-btn uses-ui-font"        data-tab="log"      onclick="switchTab('log')">Log</button>
        <button class="tab-btn uses-ui-font"        data-tab="settings" onclick="switchTab('settings')">⚙</button>
      </div>

      <!-- CONTRACTS -->
      <div class="tab-content active" id="tab-jobs">
        <div class="sub-tab-bar">
          <button class="sub-tab-btn uses-ui-font active" data-subtab="jobs-available" onclick="switchSubTab('jobs','jobs-available')">Available</button>
          <button class="sub-tab-btn uses-ui-font" data-subtab="jobs-active" onclick="switchSubTab('jobs','jobs-active')">
            Active <span id="active-jobs-badge" class="sub-tab-badge" style="display:none">0</span>
          </button>
        </div>
        <div class="sub-tab-content active" id="jobs-available">
          <div id="jobs-list"></div>
        </div>
        <div class="sub-tab-content" id="jobs-active">
          <div class="sub-sub-tab-bar">
            <button class="sub-sub-tab-btn uses-ui-font active" data-subsubtab="active-once" onclick="switchSubSubTab('active-once')">Once</button>
            <button class="sub-sub-tab-btn uses-ui-font" data-subsubtab="active-repeat" onclick="switchSubSubTab('active-repeat')">
              Repeating <span id="repeat-queue-badge" class="sub-tab-badge" style="display:none">0</span>
            </button>
          </div>
          <div class="sub-sub-tab-content active" id="active-once">
            <div id="active-jobs-center-panel">
              <div class="notice">Your company rests idle at the fort.</div>
            </div>
          </div>
          <div class="sub-sub-tab-content" id="active-repeat">
            <div id="repeat-queue-panel">
              <div class="notice">No contracts queued to repeat.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- HIRE -->
      <div class="tab-content" id="tab-hire">
        <div class="notice hire-notice">
          Warband: <span id="cur-roster-disp">0</span> / <span id="max-roster-disp">3</span>
          <span style="color:var(--text2);font-size:0.7rem;margin-left:8px">· Refreshes after each contract</span>
        </div>
        <div id="hire-list"></div>
      </div>

      <!-- FORT -->
      <div class="tab-content" id="tab-fort">
        <div class="sub-tab-bar">
          <button class="sub-tab-btn uses-ui-font active" data-subtab="fort-upgrades" onclick="switchSubTab('fort','fort-upgrades')">Improvements</button>
          <button class="sub-tab-btn uses-ui-font" data-subtab="fort-status-center" onclick="switchSubTab('fort','fort-status-center')">Status</button>
        </div>
        <div class="sub-tab-content active" id="fort-upgrades">
          <div id="fort-list"></div>
        </div>
        <div class="sub-tab-content" id="fort-status-center">
          <div id="fort-status-center-inner"></div>
        </div>
      </div>

      <!-- COMPANY -->
      <div class="tab-content" id="tab-company">
        <div class="sub-tab-bar">
          <button class="sub-tab-btn uses-ui-font active" data-subtab="company-overview"   onclick="switchSubTab('company','company-overview')">Overview</button>
          <button class="sub-tab-btn uses-ui-font"        data-subtab="company-nations"    onclick="switchSubTab('company','company-nations')">
            Nations <span id="nations-alert-badge" class="sub-tab-badge sub-tab-badge--alert" style="display:none">!</span>
          </button>
          <button class="sub-tab-btn uses-ui-font"        data-subtab="company-milestones" onclick="switchSubTab('company','company-milestones')">Deeds</button>
        </div>
        <div class="sub-tab-content active" id="company-overview">
          <div id="pmc-tier-display"></div>
          <div class="company-stats" id="company-stats"></div>
          <div id="magic-bar-section" style="display:none">
            <div class="magic-bar-wrap">
              <div class="magic-bar"><div class="magic-bar-fill" id="magic-bar-fill" style="width:0%"></div></div>
              <div class="magic-bar-label">
                <span id="magic-bar-label-left">Arcane Power</span>
                <span id="magic-bar-label-right">0 / 30</span>
              </div>
            </div>
          </div>
          <div class="section-label" style="margin-top:14px">Renown</div>
          <div class="fame-bar-wrap">
            <div class="fame-bar"><div class="fame-bar-fill" id="fame-fill" style="width:0%"></div></div>
            <div class="fame-label">
              <span id="fame-rank-label" class="uses-ui-font">Unheard Of</span>
              <span id="fame-val">0 / 50</span>
            </div>
          </div>
        </div>
        <div class="sub-tab-content" id="company-nations">
          <div id="nation-panel-center">
            <div class="notice" style="font-size:0.72rem">Rise to Iron Company tier before nations take notice.</div>
          </div>
        </div>
        <div class="sub-tab-content" id="company-milestones">
          <div id="milestone-list"></div>
        </div>
      </div>

      <!-- SAVES -->
      <div class="tab-content" id="tab-saves">
        <div class="section-label">Save Chronicle</div>
        <div class="save-input-row">
          <input type="text" id="save-slot-name" placeholder="Name this chronicle…" maxlength="40">
          <button onclick="handleSave()">Save</button>
        </div>
        <div class="section-label">Saved Chronicles</div>
        <div id="saves-list"></div>
        <div class="divider">· · ·</div>
        <div class="notice" style="font-size:0.7rem">Auto-saves every 5 days to your most recent slot.</div>
      </div>

      <!-- LOG -->
      <div class="tab-content" id="tab-log">
        <div class="log-inner" id="log-inner" style="height:100%;max-height:none;padding:8px 0;"></div>
      </div>

      <!-- SETTINGS -->
      <div class="tab-content" id="tab-settings">
        <!-- populated by renderSettingsPanel() on tab switch -->
      </div>

    </div>

  </div>

</div>

<div id="toast"></div>

<!-- CHARACTER CREATION OVERLAY -->
<div class="overlay" id="char-creation-overlay">
  <div class="modal modal--wide">
    <div class="modal-header">
      <div class="modal-title uses-display-font">The Wanderer's Chronicle</div>
      <div class="modal-subtitle">Name your commander and choose the life that brought you to this ruined fort.</div>
    </div>
    <div class="modal-body">
      <div class="name-input-row">
        <label class="name-input-label uses-ui-font" for="char-name-input">Commander's Name</label>
        <div class="name-input-group">
          <input type="text" id="char-name-input" placeholder="What name does the world know you by…" maxlength="40" autocomplete="off">
          <button class="name-random-btn" onclick="ccRandomiseName()" title="Roll a random name">⚄ Random</button>
        </div>
      </div>
      <div class="cc-section-label uses-ui-font">Choose Your Origin</div>
      <div class="cc-hint">Use arrow keys to cycle origins. Click ▼ More lore on any card to read its history.</div>
      <div class="origin-grid" id="origin-list"></div>
      <div class="stat-preview-box">
        <div class="stat-preview-title uses-ui-font">Starting Statistics</div>
        <div id="stat-preview"><span style="color:var(--text2);font-style:italic">Select an origin above.</span></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn uses-ui-font" onclick="confirmCharCreation()">Begin the Chronicle ⚔</button>
    </div>
  </div>
</div>

<!-- SAVE SELECT OVERLAY -->
<div class="overlay" id="save-select-overlay">
  <div class="modal save-select-modal">
    <div class="modal-header">
      <div class="modal-title uses-display-font">Saved Chronicles</div>
      <div class="modal-subtitle">Continue a past chronicle or begin anew.</div>
    </div>
    <div class="modal-body">
      <div class="save-select-list" id="save-select-list"></div>
    </div>
    <div class="modal-footer">
      <button class="modal-btn secondary uses-ui-font" onclick="startNewFromModal()">New Chronicle</button>
    </div>
  </div>
</div>
`;
}
