// ===================== RECRUITS =====================
// All pool rules come from recruit_classes.json (rarityWeight, bonuses[]).
// No class names or upgrade IDs hardcoded here.

function generateRecruit() {
    // Build weighted pool from JSON rarityWeight field
    const pool = [];
    DATA.recruitClasses.forEach(cls => {
        // Rare classes only enter pool when unlockRareRecruits upgrade is active
        if (cls.rarity === 'rare' && !isRareUnlocked()) return;
        const weight = cls.rarityWeight ?? 10;
        for (let i = 0; i < weight; i++) pool.push(cls);
    });
    if (!pool.length) return null;

    const cls      = pool[Math.floor(Math.random() * pool.length)];
    const adj      = cls.adj[Math.floor(Math.random() * cls.adj.length)];
    const given    = cls.givenNames[Math.floor(Math.random() * cls.givenNames.length)];
    const sur      = cls.surnames[Math.floor(Math.random() * cls.surnames.length)];
    const roll     = ([lo, hi]) => lo + Math.floor(Math.random() * (hi - lo + 1));
    const [cLo, cHi] = DATA.config?.recruitCostRange ?? [200, 400];
    const baseCost = cLo + Math.floor(Math.random() * (cHi - cLo));

    const r = {
        id:      'r_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        name:    `${adj} ${given} ${sur}`,
        cls:     cls.cls,
        desc:    cls.desc,
        lore:    cls.lore || '',
        bonuses: cls.bonuses || [],
        rarity:  cls.rarity,
        magic:   cls.magic || 0,
        cost:    Math.floor(baseCost * (cls.hireCostMult || 1)),
        str:     roll(cls.stats.str)  + getRecruitStatBonus('str'),
        end:     roll(cls.stats.end)  + getRecruitStatBonus('end'),
        lead:    roll(cls.stats.lead) + getRecruitStatBonus('lead'),
        cun:     roll(cls.stats.cun)  + getRecruitStatBonus('cun'),
        hp:      80 + Math.floor(Math.random() * 40),
    };
    r.maxHp = r.hp;
    return r;
}

function refreshRecruits() {
    GS.recruitPool = [];
    const base  = DATA.config?.recruitPoolBase ?? 3;
    const perN  = DATA.config?.recruitPoolPerJobsDone ?? 4;
    const maxB  = DATA.config?.recruitPoolMax ?? 6;
    const count = base + Math.min(maxB - base, Math.floor(GS.totalJobsDone / perN));
    for (let i = 0; i < count; i++) {
        const r = generateRecruit();
        if (r) GS.recruitPool.push(r);
    }
}
