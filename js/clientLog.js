// ════════════════════════════════════════════════════════════════
//  IRON COMPANY — CLIENT LOGGING
//  Adapted from grimveil/js/clientLog.js.
//
//  Captures all console output, uncaught errors, unhandled promise
//  rejections, and forwards them to the server manager via POST.
//
//  On every JS error it automatically sends a full snapshot of GS,
//  visible DOM state, and a function inventory so the server manager
//  can show exactly what was loaded and what was missing at the time.
//
//  The server polls /api/debug/status every 2 s so the server manager
//  can request a live snapshot via the "Request State" button without
//  reloading the page.
//
//  ENDPOINTS (handled by server_manager.pyw):
//    POST /api/log           — individual log entries
//    POST /api/debug         — full debug snapshots
//    GET  /api/debug/status  — { request: bool } polling
//
//  USAGE: loaded as the FIRST script in index.html (before all others)
//  so it can catch errors that occur during the boot sequence.
// ════════════════════════════════════════════════════════════════

(function () {
    if (window.__icClientLogInitialized) return;
    window.__icClientLogInitialized = true;

    var LOG_ENDPOINT          = '/api/log';
    var DEBUG_ENDPOINT        = '/api/debug';
    var DEBUG_STATUS_ENDPOINT = '/api/debug/status';

    // ── Core sender ───────────────────────────────────────────────────

    function sendToServer(level, message, extra) {
        if (typeof fetch === 'undefined') return;
        fetch(LOG_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                level:     level,
                message:   String(message),
                timestamp: Date.now(),
                extra:     extra != null ? JSON.stringify(extra) : null,
            }),
        }).catch(function () {});
    }

    // ── Game-state snapshot ───────────────────────────────────────────
    // Sent automatically on every JS error and on server request.

    function captureSnapshot(context) {
        // Game state — GS is Iron Company's runtime state object
        var state = { unavailable: true };
        try {
            if (typeof GS !== 'undefined' && GS && typeof GS === 'object') {
                state = JSON.parse(JSON.stringify(GS, function (key, value) {
                    // recruitPool can be large; truncate
                    if (key === 'recruitPool') return '[' + (value && value.length) + ' recruits]';
                    return value;
                }));
            }
        } catch (e) {
            state = { snapshotError: String(e) };
        }

        // DOM state — Iron Company's key elements
        var dom = {};
        try {
            var app    = document.getElementById('app');
            var charCC = document.getElementById('char-creation-overlay');
            var saveOv = document.getElementById('save-select-overlay');
            var logEl  = document.getElementById('log-inner');
            var activeTab = document.querySelector('.tab-btn.active');

            dom = {
                appPresent:            !!app,
                charCreationVisible:   charCC ? charCC.style.display !== 'none' : 'missing',
                saveSelectVisible:     saveOv ? saveOv.style.display !== 'none' : 'missing',
                activeTab:             activeTab ? (activeTab.dataset.tab || activeTab.textContent.trim()) : 'none',
                tabBtns:               document.querySelectorAll('.tab-btn').length,
                tabContents:           document.querySelectorAll('.tab-content').length,
                jobCards:              document.querySelectorAll('.job-card').length,
                rosterCards:           document.querySelectorAll('.recruit-card').length,
                activeJobCards:        document.querySelectorAll('.active-job-card').length,
                logEntries:            logEl ? logEl.children.length : 'missing',
                toastVisible:          (function () {
                    var t = document.getElementById('toast');
                    return t ? t.classList.contains('show') : false;
                }()),
                notifPanelVisible:     (function () {
                    var n = document.getElementById('notif-panel');
                    return n ? n.style.display !== 'none' : false;
                }()),
                bootScreenPresent:     !!document.getElementById('boot-screen'),
            };
        } catch (e) {
            dom = { domSnapshotError: String(e) };
        }

        // Critical function inventory — every public function Iron Company needs
        var expectedFunctions = [
            // Data loading
            'loadAllData', 'loadJSON', 'loadSettingsData',
            // State
            'saveGame', 'loadGame', 'deleteSave', 'listSaves', 'getSaveIndex',
            // Engine
            'getActiveUpgradeEffects', 'getActiveRosterEffects',
            'accumulateMult', 'accumulateAdd',
            'getJobDuration', 'getJobReward', 'getFameReward', 'getJobXp',
            'getHpRegenRate', 'maxRoster', 'isRareUnlocked', 'isFortWarded',
            'checkJobRequirements', 'canTakeJob',
            'getSuppressionResist', 'getNationThreatMult', 'hasBlockadeImmunity',
            'getActivePenaltyMult', 'getCurrentPmcTier', 'checkPmcTierAdvance',
            'companyTotalStr', 'companyTotalCun', 'companyTotalEnd', 'companyTotalMagic',
            'hasMagicUser', 'getCommanderStatBonus',
            // Logic
            'startJob', 'hireRecruit', 'buyUpgrade',
            'gainXp', 'gainFame', 'checkMilestones', 'evaluateMilestoneCheck',
            'generateRecruit', 'refreshRecruits',
            'checkAndSpawnSuppression', 'tickSuppressionEvents',
            'resolveSuppressionEvent', 'applySuppressionPenalty',
            'completeSuppressionContract', 'acceptSuppressionContract',
            'checkPmcAdvancement', 'applyNationThreatGains', 'decayNationThreat',
            'addToRepeatQueue', 'removeFromRepeatQueue',
            // Render
            'renderAll', 'renderCurrency', 'renderCommander', 'renderRoster',
            'renderJobs', 'renderHire', 'renderFort', 'renderCompany',
            'renderActiveJobsCenter', 'renderRepeatQueuePanel',
            'renderNationPanelCenter', 'renderFortStatusCenter',
            'renderMilestonesPanel', 'renderPmcTierDisplay',
            'renderHeaderSummary', 'renderSavesPanel', 'renderSettingsPanel',
            // Main/UI
            'startGame', 'switchTab', 'switchSubTab', 'switchSubSubTab',
            'toggleCollapsible', 'toggleNotifPanel', 'clearNotifications',
            'pushNotification', 'showToast', 'showToastAndNotify', 'log',
            // Settings
            'loadSettingsData', 'initSettings', 'applySettings', 'saveSettings',
            'listProfiles', 'createProfile', 'activateProfile', 'deleteProfile',
            // Char creation
            'openCharCreation', 'closeCharCreation', 'confirmCharCreation',
            'selectOrigin', 'ccRandomiseName', 'renderOriginCards', 'renderStatPreview',
            // Utils
            'formatMoney', 'moneyToCoins', 'setMoney', 'addMoney', 'canAfford',
            'getCommanderTitle', 'getCurrentFameRank', 'getNextFameRank',
        ];

        var missing = expectedFunctions.filter(function (f) {
            return typeof window[f] !== 'function';
        });

        return {
            context:   context || 'manual',
            timestamp: new Date().toISOString(),
            url:       window.location.href,
            gameState: state,
            dom:       dom,
            functions: {
                expected: expectedFunctions.length,
                present:  expectedFunctions.length - missing.length,
                missing:  missing,
            },
        };
    }

    function sendSnapshot(context) {
        var snap = captureSnapshot(context);
        fetch(DEBUG_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(snap),
        }).catch(function () {});
    }

    // ── Console overrides ─────────────────────────────────────────────

    var _orig = {
        log:   console.log.bind(console),
        warn:  console.warn.bind(console),
        error: console.error.bind(console),
    };

    function fmtArgs(args) {
        return Array.prototype.map.call(args, function (a) {
            if (a instanceof Error) return a.stack || a.message;
            if (a !== null && typeof a === 'object') {
                try { return JSON.stringify(a); } catch (e) { return String(a); }
            }
            return String(a);
        }).join(' ');
    }

    console.log = function () {
        sendToServer('log', fmtArgs(arguments));
        _orig.log.apply(console, arguments);
    };

    console.warn = function () {
        var msg = fmtArgs(arguments);
        sendToServer('warn', msg);
        _orig.warn.apply(console, arguments);
    };

    console.error = function () {
        var msg = fmtArgs(arguments);
        sendToServer('error', msg);
        // Every console.error auto-ships a full snapshot
        sendSnapshot('console.error: ' + msg.substring(0, 120));
        _orig.error.apply(console, arguments);
    };

    // ── Uncaught errors ───────────────────────────────────────────────

    window.onerror = function (message, source, lineno, colno, error) {
        var stack = error ? (error.stack || '') : '';
        var msg   = 'UNCAUGHT ERROR: ' + message
                  + '\n  at ' + source + ':' + lineno + ':' + colno
                  + '\n' + stack;
        sendToServer('error', msg);
        sendSnapshot('window.onerror: ' + String(message).substring(0, 80));
        return false; // don't suppress the browser's own error display
    };

    window.addEventListener('unhandledrejection', function (event) {
        var reason = event.reason;
        var msg    = 'UNHANDLED REJECTION: '
                   + (reason instanceof Error ? reason.stack : String(reason));
        sendToServer('error', msg);
        sendSnapshot('unhandledrejection');
    });

    // ── errorLog global ───────────────────────────────────────────────
    // Convenience function for verbose error logging from game code.
    // Usage: errorLog('Something went wrong', contextObject)

    window.errorLog = function () {
        var msg = fmtArgs(arguments);
        sendToServer('error', msg);
        sendSnapshot('errorLog: ' + msg.substring(0, 120));
        _orig.error.apply(console, arguments);
    };

    // ── Startup verification ──────────────────────────────────────────
    // After all scripts have loaded, log which expected functions are
    // missing. This makes it trivial to spot broken load-order bugs.

    function verifyFunctionsLoaded() {
        var snap    = captureSnapshot('startup-verification');
        var missing = snap.functions.missing;

        if (missing.length === 0) {
            sendToServer('info',
                '[boot] All ' + snap.functions.expected + ' expected functions loaded OK.');
        } else {
            var msg = '[boot] MISSING FUNCTIONS ('
                    + missing.length + '/' + snap.functions.expected + '):\n  '
                    + missing.join(', ');
            sendToServer('error', msg);
            sendSnapshot('startup-verification: missing functions');
        }

        // Also log DATA availability
        var dataStatus = {
            DATA:       typeof DATA          !== 'undefined' ? Object.keys(DATA).length + ' keys' : 'MISSING',
            GS:         typeof GS            !== 'undefined' ? 'present' : 'MISSING',
            SETTINGS:   typeof SETTINGS      !== 'undefined' ? Object.keys(SETTINGS).length + ' keys' : 'MISSING',
            jobs:       typeof DATA          !== 'undefined' && DATA.jobs       ? DATA.jobs.length       + ' jobs'       : 'MISSING',
            recruitClasses: typeof DATA      !== 'undefined' && DATA.recruitClasses ? DATA.recruitClasses.length + ' classes' : 'MISSING',
            fortUpgrades:   typeof DATA      !== 'undefined' && DATA.fortUpgrades   ? DATA.fortUpgrades.length   + ' upgrades' : 'MISSING',
        };
        sendToServer('info', '[boot] Data availability: ' + JSON.stringify(dataStatus));
    }

    // Delay so all deferred scripts finish first
    window.addEventListener('DOMContentLoaded', function () {
        setTimeout(verifyFunctionsLoaded, 1800);
    });

    // ── Page load timing ──────────────────────────────────────────────

    window.addEventListener('load', function () {
        sendToServer('info', '[boot] Client fully loaded.');
        try {
            var nav      = performance.getEntriesByType('navigation')[0];
            var loadTime = nav ? Math.round(nav.loadEventEnd - nav.startTime) : -1;
            sendToServer('info', '[boot] Page load time: ' + loadTime + 'ms');
        } catch (e) {
            sendToServer('info', '[boot] Page load time: (unavailable)');
        }
    });

    // ── Debug polling ─────────────────────────────────────────────────
    // Ask the server every 2 s whether it wants a fresh snapshot.

    function pollDebugRequest() {
        fetch(DEBUG_STATUS_ENDPOINT)
            .then(function (r) { return r.json(); })
            .then(function (data) {
                if (data && data.request) {
                    sendSnapshot('server-requested');
                }
            })
            .catch(function () {})
            .finally(function () {
                setTimeout(pollDebugRequest, 2000);
            });
    }

    pollDebugRequest();

    // ── Public API ────────────────────────────────────────────────────

    window.sendLogToServer  = sendToServer;
    window.requestDebugInfo = function () { sendSnapshot('manual'); return true; };

}());
