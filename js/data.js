const DATA = {
    jobs:               [],
    recruitClasses:     [],
    fortUpgrades:       [],
    milestones:         [],
    fameRanks:          [],
    commanderRanks:     [],
    origins:            [],
    nations:            [],
    pmcTiers:           [],
    suppressionEvents:  [],
    config:             {},
    levelUpGains:       null,
    screens:            null,  // data/ui/screens.json — loaded by ScreenEngine
    weapons:            [],    // data/weapons.json — mana weapons
    bosses:             [],    // data/bosses.json — Hero-class combat encounters
};

async function loadJSON(path) {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
    return res.json();
}

async function loadAllData() {
    const [jobs, recruitClasses, fortUpgrades, milestones, fameRanks,
           commanderRanks, origins, nations, pmcTiers, suppressionEvents,
           config, screens, weapons, bosses] =
        await Promise.all([
            loadJSON('data/jobs.json'),
            loadJSON('data/recruit_classes.json'),
            loadJSON('data/fort_upgrades.json'),
            loadJSON('data/milestones.json'),
            loadJSON('data/fame_ranks.json'),
            loadJSON('data/commander_ranks.json'),
            loadJSON('data/origins.json'),
            loadJSON('data/nations.json'),
            loadJSON('data/pmc_tiers.json'),
            loadJSON('data/suppression_events.json'),
            loadJSON('data/game_config.json'),
            loadJSON('data/ui/screens.json'),
            loadJSON('data/weapons.json'),
            loadJSON('data/bosses.json'),
        ]);

    DATA.jobs              = jobs;
    DATA.recruitClasses    = recruitClasses;
    DATA.fortUpgrades      = fortUpgrades;
    DATA.milestones        = milestones;
    DATA.fameRanks         = fameRanks;
    DATA.commanderRanks    = commanderRanks;
    DATA.origins           = origins;
    DATA.nations           = nations;
    DATA.pmcTiers          = pmcTiers;
    DATA.suppressionEvents = suppressionEvents;
    DATA.config            = config;
    DATA.levelUpGains      = config.levelUpGains ?? null;
    DATA.screens           = screens;
    DATA.weapons           = weapons;
    DATA.bosses            = bosses;
}
